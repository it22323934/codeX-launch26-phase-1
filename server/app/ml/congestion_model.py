# app/models/congestion_model.py
"""
Congestion prediction model.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
import joblib

from .base import BaseModel
from .schemas import CongestionPrediction


class CongestionModel(BaseModel):
    """Predict link congestion/saturation."""
    
    def __init__(self, models_dir: str = 'models'):
        super().__init__('congestion', models_dir)
        self.status_encoder = None
        
        # Load status encoder if available
        encoder_path = self.models_dir / 'status_encoder.pkl'
        if encoder_path.exists():
            self.status_encoder = joblib.load(encoder_path)
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for congestion prediction."""
        df = data.copy()
        
        # Status encoding
        if 'status' in df.columns:
            if self.status_encoder is not None:
                df['status_encoded'] = self.status_encoder.transform(df['status'])
            else:
                df['status_encoded'] = (df['status'] == 'saturated').astype(int)
        
        # Lag features
        for lag in [1, 3, 5]:
            df[f'load_ratio_lag_{lag}'] = df['load_ratio'].shift(lag)
        
        # Rolling features
        df['load_ratio_rolling_mean_3'] = df['load_ratio'].rolling(window=3, min_periods=1).mean()
        df['load_ratio_rolling_std_3'] = df['load_ratio'].rolling(window=3, min_periods=1).std()
        
        return df.dropna()
    
    def predict(self, link_id: str, tick: int, data: pd.DataFrame) -> CongestionPrediction:
        """
        Predict congestion for a link at a given tick.
        
        Args:
            link_id: Link identifier
            tick: Tick index
            data: Prepared features DataFrame
            
        Returns:
            CongestionPrediction object
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Train the model first.")
        
        # Get the last row for prediction
        features = data[self.features].iloc[-1:].values.reshape(1, -1)
        prob = self.model.predict_proba(features)[0, 1]
        
        return CongestionPrediction(
            link_id=link_id,
            tick=tick,
            saturation_probability=float(prob),
            predicted_status='saturated' if prob > 0.5 else 'ok',
            current_load_ratio=float(data['load_ratio'].iloc[-1])
        )


# Singleton instance
congestion_model = CongestionModel()