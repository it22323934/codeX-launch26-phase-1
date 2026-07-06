# app/models/targeting_model.py
"""
Targeting risk model.
"""

import pandas as pd
import numpy as np
from .base import BaseModel
from .schemas import TargetingRisk
import joblib


class TargetingModel(BaseModel):
    """Predict targeting/jamming risk."""
    
    def __init__(self, models_dir: str = 'models'):
        super().__init__('targeting', models_dir)
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for targeting risk prediction."""
        df = data.copy()
        
        # Convert jammed_flag to numeric
        if 'jammed_flag' in df.columns:
            df['jammed_numeric'] = df['jammed_flag'].astype(int)
        
        # Lag features
        for lag in [1, 3, 5]:
            df[f'traffic_share_lag_{lag}'] = df['traffic_share'].shift(lag)
        
        # Rolling features
        df['traffic_share_rolling_mean_3'] = df['traffic_share'].rolling(window=3, min_periods=1).mean()
        df['traffic_share_rolling_std_3'] = df['traffic_share'].rolling(window=3, min_periods=1).std()
        
        # Per-link statistics
        for stat in ['mean', 'std', 'max']:
            df[f'traffic_share_{stat}'] = df['traffic_share'].expanding().mean()
        
        df['jammed_numeric_mean'] = df['jammed_numeric'].expanding().mean()
        df['jammed_numeric_sum'] = df['jammed_numeric'].expanding().sum()
        
        return df.dropna()
    
    def predict(self, link_id: str, tick: int, data: pd.DataFrame) -> TargetingRisk:
        """
        Predict targeting risk for a link.
        
        Args:
            link_id: Link identifier
            tick: Tick index
            data: Prepared features DataFrame
            
        Returns:
            TargetingRisk object
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Train the model first.")
        
        features = data[self.features].iloc[-1:].values.reshape(1, -1)
        risk_prob = self.model.predict_proba(features)[0, 1]
        
        # Determine risk level
        if risk_prob >= 0.7:
            level = 'high'
        elif risk_prob >= 0.4:
            level = 'medium'
        else:
            level = 'low'
        
        return TargetingRisk(
            link_id=link_id,
            tick=tick,
            risk_probability=float(risk_prob),
            risk_level=level,
            traffic_share=float(data['traffic_share'].iloc[-1])
        )


# Singleton instance
targeting_model = TargetingModel()