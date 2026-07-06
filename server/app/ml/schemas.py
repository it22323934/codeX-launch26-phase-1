# # app/models/schemas.py
# from pydantic import BaseModel
# from typing import Optional

# class CongestionPrediction(BaseModel):
#     link_id: str
#     tick: int
#     saturation_probability: float
#     predicted_status: str
#     current_load_ratio: float

# class TrustScore(BaseModel):
#     link_id: str
#     tick: int
#     trust_score: float
#     reliability_rating: str
#     anomaly_detected: bool

# class TargetingRisk(BaseModel):
#     link_id: str
#     tick: int
#     risk_probability: float
#     risk_level: str
#     traffic_share: float

# class LinkAnalysis(BaseModel):
#     link_id: str
#     tick: int
#     congestion: CongestionPrediction
#     trust: TrustScore
#     targeting_risk: TargetingRisk
#     overall_status: str

# app/models/schemas.py
"""
Pydantic schemas for ML predictions.
"""

from pydantic import BaseModel, Field
from typing import Optional


class CongestionPrediction(BaseModel):
    """Congestion prediction result."""
    link_id: str = Field(..., description="Link identifier")
    tick: int = Field(..., description="Tick index")
    saturation_probability: float = Field(..., ge=0, le=1, description="Probability of saturation (0-1)")
    predicted_status: str = Field(..., description="Predicted status: 'ok' or 'saturated'")
    current_load_ratio: float = Field(..., description="Current load ratio")


class TrustScore(BaseModel):
    """Trust score result."""
    link_id: str = Field(..., description="Link identifier")
    tick: int = Field(..., description="Tick index")
    trust_score: float = Field(..., ge=0, le=1, description="Trust score (0-1)")
    reliability_rating: str = Field(..., description="Rating: 'high', 'medium', or 'low'")
    anomaly_detected: bool = Field(..., description="Whether an anomaly was detected")


class TargetingRisk(BaseModel):
    """Targeting risk prediction result."""
    link_id: str = Field(..., description="Link identifier")
    tick: int = Field(..., description="Tick index")
    risk_probability: float = Field(..., ge=0, le=1, description="Risk probability (0-1)")
    risk_level: str = Field(..., description="Level: 'low', 'medium', or 'high'")
    traffic_share: float = Field(..., description="Current traffic share")


class LinkAnalysis(BaseModel):
    """Comprehensive link analysis."""
    link_id: str
    tick: int
    congestion: CongestionPrediction
    trust: TrustScore
    targeting_risk: TargetingRisk
    overall_status: str = Field(..., description="Overall status: 'stable', 'warning', or 'critical'")