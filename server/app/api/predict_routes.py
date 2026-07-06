# # app/api/predict_routes.py
# """
# Phase 2: ML Prediction Routes for Relic Ring Protocol.

# These routes are mounted separately from the main universe routes.
# Endpoints:
# - POST /api/predict/congestion     - Predict link congestion
# - POST /api/predict/trust          - Calculate trust score
# - POST /api/predict/targeting      - Predict targeting risk
# - POST /api/predict/analyze        - Comprehensive link analysis
# """

# from fastapi import APIRouter, HTTPException, UploadFile, File, Query
# import pandas as pd
# import numpy as np
# from typing import Optional

# from app.models import (
#     congestion_model, trust_model, targeting_model,
#     CongestionPrediction, TrustScore, TargetingRisk, LinkAnalysis
# )

# # Create a separate router for prediction endpoints
# predict_router = APIRouter(prefix="/api/predict", tags=["predictions"])


# def prepare_congestion_features(data: pd.DataFrame) -> pd.DataFrame:
#     """Prepare features for congestion prediction."""
#     df = data.copy()
    
#     # Create lag features
#     for lag in [1, 3, 5]:
#         df[f'load_ratio_lag_{lag}'] = df['load_ratio'].shift(lag)
    
#     df['load_ratio_rolling_mean_3'] = df['load_ratio'].rolling(window=3, min_periods=1).mean()
#     df['load_ratio_rolling_std_3'] = df['load_ratio'].rolling(window=3, min_periods=1).std()
    
#     # Status encoding (simplified - in production you'd use the saved encoder)
#     df['status_encoded'] = (df['status'] == 'saturated').astype(int)
    
#     return df.dropna()


# def prepare_trust_features(data: pd.DataFrame) -> pd.DataFrame:
#     """Prepare features for trust prediction."""
#     df = data.copy()
    
#     df['latency_diff'] = df['self_reported_latency_ms'] - df['measured_latency_ms']
#     df['latency_diff_abs'] = np.abs(df['latency_diff'])
#     df['latency_ratio'] = df['self_reported_latency_ms'] / df['measured_latency_ms']
    
#     # Per-link statistics (use all data for stats, not just rolling)
#     for stat in ['mean', 'std']:
#         df[f'latency_diff_{stat}'] = df['latency_diff'].expanding().mean()
#         df[f'latency_ratio_{stat}'] = df['latency_ratio'].expanding().mean()
    
#     # Lag features
#     for lag in [1, 3]:
#         df[f'latency_diff_lag_{lag}'] = df['latency_diff'].shift(lag)
    
#     return df.dropna()


# def prepare_targeting_features(data: pd.DataFrame) -> pd.DataFrame:
#     """Prepare features for targeting risk prediction."""
#     df = data.copy()
    
#     df['jammed_numeric'] = df['jammed_flag'].astype(int)
    
#     # Lag features
#     for lag in [1, 3, 5]:
#         df[f'traffic_share_lag_{lag}'] = df['traffic_share'].shift(lag)
    
#     df['traffic_share_rolling_mean_3'] = df['traffic_share'].rolling(window=3, min_periods=1).mean()
#     df['traffic_share_rolling_std_3'] = df['traffic_share'].rolling(window=3, min_periods=1).std()
    
#     # Per-link statistics
#     for stat in ['mean', 'std', 'max']:
#         df[f'traffic_share_{stat}'] = df['traffic_share'].expanding().mean()
    
#     # Jammed history
#     df['jammed_numeric_mean'] = df['jammed_numeric'].expanding().mean()
#     df['jammed_numeric_sum'] = df['jammed_numeric'].expanding().sum()
    
#     return df.dropna()


# @predict_router.post("/congestion", response_model=CongestionPrediction)
# async def predict_congestion(
#     link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
#     tick: int = Query(..., description="Tick index to predict for"),
#     file: UploadFile = File(..., description="Traffic history CSV file")
# ):
#     """
#     Predict congestion probability for a specific link at a given tick.
    
#     Uses historical traffic data to predict if the link will become saturated.
#     Returns a probability between 0 and 1.
#     """
#     try:
#         # Read and validate data
#         df = pd.read_csv(file.file)
        
#         # Filter for the specific link
#         link_data = df[df['link_id'] == link_id].sort_values('tick')
#         if link_data.empty:
#             raise HTTPException(
#                 status_code=404, 
#                 detail=f"Link '{link_id}' not found in the provided data"
#             )
        
#         # Get data up to the specified tick
#         data_up_to_tick = link_data[link_data['tick'] <= tick]
#         if data_up_to_tick.empty:
#             raise HTTPException(
#                 status_code=400, 
#                 detail=f"No data available up to tick {tick} for link {link_id}"
#             )
        
#         # Prepare features
#         features_df = prepare_congestion_features(data_up_to_tick)
#         if len(features_df) < 2:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Insufficient data for prediction. Need at least 2 data points, got {len(features_df)}"
#             )
        
#         # Make prediction
#         prediction = congestion_model.predict(link_id, tick, features_df)
#         return prediction
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Prediction failed: {str(e)}"
#         )


# @predict_router.post("/trust", response_model=TrustScore)
# async def predict_trust(
#     link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
#     tick: int = Query(..., description="Tick index to evaluate"),
#     file: UploadFile = File(..., description="Telemetry CSV file")
# ):
#     """
#     Calculate trust score for a link based on telemetry data.
    
#     Compares self-reported latency against measured latency to detect anomalies.
#     Score ranges from 0 (untrustworthy) to 1 (fully trustworthy).
#     """
#     try:
#         df = pd.read_csv(file.file)
        
#         link_data = df[df['link_id'] == link_id].sort_values('tick')
#         if link_data.empty:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Link '{link_id}' not found in the provided data"
#             )
        
#         data_up_to_tick = link_data[link_data['tick'] <= tick]
#         if data_up_to_tick.empty:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"No data available up to tick {tick} for link {link_id}"
#             )
        
#         features_df = prepare_trust_features(data_up_to_tick)
#         if len(features_df) < 2:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Insufficient data for trust prediction. Need at least 2 data points, got {len(features_df)}"
#             )
        
#         prediction = trust_model.predict(link_id, tick, features_df)
#         return prediction
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Trust prediction failed: {str(e)}"
#         )


# @predict_router.post("/targeting", response_model=TargetingRisk)
# async def predict_targeting_risk(
#     link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
#     tick: int = Query(..., description="Tick index to predict for"),
#     file: UploadFile = File(..., description="Incident history CSV file")
# ):
#     """
#     Predict targeting risk for a link based on traffic patterns.
    
#     Analyzes traffic share patterns to predict likelihood of being jammed.
#     Returns a risk probability between 0 and 1.
#     """
#     try:
#         df = pd.read_csv(file.file)
        
#         link_data = df[df['link_id'] == link_id].sort_values('tick')
#         if link_data.empty:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Link '{link_id}' not found in the provided data"
#             )
        
#         data_up_to_tick = link_data[link_data['tick'] <= tick]
#         if data_up_to_tick.empty:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"No data available up to tick {tick} for link {link_id}"
#             )
        
#         features_df = prepare_targeting_features(data_up_to_tick)
#         if len(features_df) < 2:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Insufficient data for targeting risk prediction. Need at least 2 data points, got {len(features_df)}"
#             )
        
#         prediction = targeting_model.predict(link_id, tick, features_df)
#         return prediction
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Targeting risk prediction failed: {str(e)}"
#         )


# @predict_router.post("/analyze", response_model=LinkAnalysis)
# async def analyze_link_comprehensive(
#     link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
#     tick: int = Query(..., description="Tick index to analyze"),
#     traffic_file: UploadFile = File(..., description="Traffic history CSV"),
#     telemetry_file: UploadFile = File(..., description="Telemetry CSV"),
#     incident_file: UploadFile = File(..., description="Incident history CSV")
# ):
#     """
#     Comprehensive link analysis using all three models.
    
#     Returns congestion prediction, trust score, and targeting risk
#     in a single response with an overall status assessment.
#     """
#     try:
#         # Read all three files
#         traffic_df = pd.read_csv(traffic_file.file)
#         telemetry_df = pd.read_csv(telemetry_file.file)
#         incident_df = pd.read_csv(incident_file.file)
        
#         # Filter for specific link
#         traffic_link = traffic_df[traffic_df['link_id'] == link_id].sort_values('tick')
#         telemetry_link = telemetry_df[telemetry_df['link_id'] == link_id].sort_values('tick')
#         incident_link = incident_df[incident_df['link_id'] == link_id].sort_values('tick')
        
#         if traffic_link.empty or telemetry_link.empty or incident_link.empty:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Incomplete data for link '{link_id}'. Missing one or more datasets."
#             )
        
#         # Get data up to tick
#         traffic_up_to = traffic_link[traffic_link['tick'] <= tick]
#         telemetry_up_to = telemetry_link[telemetry_link['tick'] <= tick]
#         incident_up_to = incident_link[incident_link['tick'] <= tick]
        
#         if traffic_up_to.empty or telemetry_up_to.empty or incident_up_to.empty:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Insufficient data up to tick {tick} for link {link_id}"
#             )
        
#         # Prepare features
#         traffic_features = prepare_congestion_features(traffic_up_to)
#         telemetry_features = prepare_trust_features(telemetry_up_to)
#         incident_features = prepare_targeting_features(incident_up_to)
        
#         # Make predictions
#         congestion_pred = congestion_model.predict(link_id, tick, traffic_features)
#         trust_pred = trust_model.predict(link_id, tick, telemetry_features)
#         targeting_pred = targeting_model.predict(link_id, tick, incident_features)
        
#         # Calculate overall status
#         overall_status = "stable"
#         if congestion_pred.saturation_probability > 0.8:
#             overall_status = "critical"
#         elif congestion_pred.saturation_probability > 0.5:
#             overall_status = "warning"
#         elif trust_pred.trust_score < 0.4:
#             overall_status = "warning"
#         elif targeting_pred.risk_probability > 0.6:
#             overall_status = "warning"
#         elif trust_pred.anomaly_detected:
#             overall_status = "warning"
        
#         return LinkAnalysis(
#             link_id=link_id,
#             tick=tick,
#             congestion=congestion_pred,
#             trust=trust_pred,
#             targeting_risk=targeting_pred,
#             overall_status=overall_status
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Comprehensive analysis failed: {str(e)}"
#         )

# app/api/predict_routes.py
"""
Phase 2: ML Prediction Routes for Relic Ring Protocol.

These routes are mounted separately from the main universe routes.
Endpoints:
- POST /api/predict/congestion     - Predict link congestion
- POST /api/predict/trust          - Calculate trust score
- POST /api/predict/targeting      - Predict targeting risk
- POST /api/predict/analyze        - Comprehensive link analysis
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
import pandas as pd
import numpy as np

from app.ml import (
    congestion_model, 
    trust_model, 
    targeting_model,
    CongestionPrediction, 
    TrustScore, 
    TargetingRisk, 
    LinkAnalysis
)

predict_router = APIRouter(prefix="/api/predict", tags=["predictions"])


@predict_router.post("/congestion", response_model=CongestionPrediction)
async def predict_congestion(
    link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
    tick: int = Query(..., description="Tick index to predict for"),
    file: UploadFile = File(..., description="Traffic history CSV file")
):
    """
    Predict congestion probability for a specific link at a given tick.
    
    Uses historical traffic data to predict if the link will become saturated.
    Returns a probability between 0 and 1.
    """
    try:
        # Read and validate data
        df = pd.read_csv(file.file)
        
        # Filter for the specific link
        link_data = df[df['link_id'] == link_id].sort_values('tick')
        if link_data.empty:
            raise HTTPException(
                status_code=404, 
                detail=f"Link '{link_id}' not found in the provided data"
            )
        
        # Get data up to the specified tick
        data_up_to_tick = link_data[link_data['tick'] <= tick]
        if data_up_to_tick.empty:
            raise HTTPException(
                status_code=400, 
                detail=f"No data available up to tick {tick} for link {link_id}"
            )
        
        # Prepare features
        features_df = congestion_model._prepare_features(data_up_to_tick)
        if len(features_df) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for prediction. Need at least 2 data points, got {len(features_df)}"
            )
        
        if not congestion_model.is_loaded():
            raise HTTPException(
                status_code=503,
                detail="Congestion model not loaded. Please train the model first."
            )
        
        # Make prediction
        prediction = congestion_model.predict(link_id, tick, features_df)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@predict_router.post("/trust", response_model=TrustScore)
async def predict_trust(
    link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
    tick: int = Query(..., description="Tick index to evaluate"),
    file: UploadFile = File(..., description="Telemetry CSV file")
):
    """
    Calculate trust score for a link based on telemetry data.
    
    Compares self-reported latency against measured latency to detect anomalies.
    Score ranges from 0 (untrustworthy) to 1 (fully trustworthy).
    """
    try:
        df = pd.read_csv(file.file)
        
        link_data = df[df['link_id'] == link_id].sort_values('tick')
        if link_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Link '{link_id}' not found in the provided data"
            )
        
        data_up_to_tick = link_data[link_data['tick'] <= tick]
        if data_up_to_tick.empty:
            raise HTTPException(
                status_code=400,
                detail=f"No data available up to tick {tick} for link {link_id}"
            )
        
        features_df = trust_model._prepare_features(data_up_to_tick)
        if len(features_df) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for trust prediction. Need at least 2 data points, got {len(features_df)}"
            )
        
        if not trust_model.is_loaded():
            raise HTTPException(
                status_code=503,
                detail="Trust model not loaded. Please train the model first."
            )
        
        prediction = trust_model.predict(link_id, tick, features_df)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Trust prediction failed: {str(e)}"
        )


@predict_router.post("/targeting", response_model=TargetingRisk)
async def predict_targeting_risk(
    link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
    tick: int = Query(..., description="Tick index to predict for"),
    file: UploadFile = File(..., description="Incident history CSV file")
):
    """
    Predict targeting risk for a link based on traffic patterns.
    
    Analyzes traffic share patterns to predict likelihood of being jammed.
    Returns a risk probability between 0 and 1.
    """
    try:
        df = pd.read_csv(file.file)
        
        link_data = df[df['link_id'] == link_id].sort_values('tick')
        if link_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Link '{link_id}' not found in the provided data"
            )
        
        data_up_to_tick = link_data[link_data['tick'] <= tick]
        if data_up_to_tick.empty:
            raise HTTPException(
                status_code=400,
                detail=f"No data available up to tick {tick} for link {link_id}"
            )
        
        features_df = targeting_model._prepare_features(data_up_to_tick)
        if len(features_df) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for targeting risk prediction. Need at least 2 data points, got {len(features_df)}"
            )
        
        if not targeting_model.is_loaded():
            raise HTTPException(
                status_code=503,
                detail="Targeting model not loaded. Please train the model first."
            )
        
        prediction = targeting_model.predict(link_id, tick, features_df)
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Targeting risk prediction failed: {str(e)}"
        )


@predict_router.post("/analyze", response_model=LinkAnalysis)
async def analyze_link_comprehensive(
    link_id: str = Query(..., description="Link identifier (e.g., Aegis-Boreas)"),
    tick: int = Query(..., description="Tick index to analyze"),
    traffic_file: UploadFile = File(..., description="Traffic history CSV"),
    telemetry_file: UploadFile = File(..., description="Telemetry CSV"),
    incident_file: UploadFile = File(..., description="Incident history CSV")
):
    """
    Comprehensive link analysis using all three models.
    
    Returns congestion prediction, trust score, and targeting risk
    in a single response with an overall status assessment.
    """
    try:
        # Read all three files
        traffic_df = pd.read_csv(traffic_file.file)
        telemetry_df = pd.read_csv(telemetry_file.file)
        incident_df = pd.read_csv(incident_file.file)
        
        # Filter for specific link
        traffic_link = traffic_df[traffic_df['link_id'] == link_id].sort_values('tick')
        telemetry_link = telemetry_df[telemetry_df['link_id'] == link_id].sort_values('tick')
        incident_link = incident_df[incident_df['link_id'] == link_id].sort_values('tick')
        
        if traffic_link.empty or telemetry_link.empty or incident_link.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Incomplete data for link '{link_id}'. Missing one or more datasets."
            )
        
        # Get data up to tick
        traffic_up_to = traffic_link[traffic_link['tick'] <= tick]
        telemetry_up_to = telemetry_link[telemetry_link['tick'] <= tick]
        incident_up_to = incident_link[incident_link['tick'] <= tick]
        
        if traffic_up_to.empty or telemetry_up_to.empty or incident_up_to.empty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data up to tick {tick} for link {link_id}"
            )
        
        # Check if all models are loaded
        if not congestion_model.is_loaded():
            raise HTTPException(503, "Congestion model not loaded")
        if not trust_model.is_loaded():
            raise HTTPException(503, "Trust model not loaded")
        if not targeting_model.is_loaded():
            raise HTTPException(503, "Targeting model not loaded")
        
        # Prepare features
        traffic_features = congestion_model._prepare_features(traffic_up_to)
        telemetry_features = trust_model._prepare_features(telemetry_up_to)
        incident_features = targeting_model._prepare_features(incident_up_to)
        
        # Make predictions
        congestion_pred = congestion_model.predict(link_id, tick, traffic_features)
        trust_pred = trust_model.predict(link_id, tick, telemetry_features)
        targeting_pred = targeting_model.predict(link_id, tick, incident_features)
        
        # Calculate overall status
        overall_status = "stable"
        if congestion_pred.saturation_probability > 0.8:
            overall_status = "critical"
        elif congestion_pred.saturation_probability > 0.5:
            overall_status = "warning"
        elif trust_pred.trust_score < 0.4:
            overall_status = "warning"
        elif targeting_pred.risk_probability > 0.6:
            overall_status = "warning"
        elif trust_pred.anomaly_detected:
            overall_status = "warning"
        
        return LinkAnalysis(
            link_id=link_id,
            tick=tick,
            congestion=congestion_pred,
            trust=trust_pred,
            targeting_risk=targeting_pred,
            overall_status=overall_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Comprehensive analysis failed: {str(e)}"
        )