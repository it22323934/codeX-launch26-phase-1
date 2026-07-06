# app/models/trust_model.py
"""
Trust/reliability model.
"""

import pandas as pd
import numpy as np
from .base import BaseModel
from .schemas import TrustScore
import joblib


class TrustModel(BaseModel):
    """Calculate trust scores for links."""
    
    def __init__(self, models_dir: str = 'models'):
        super().__init__('trust', models_dir)
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for trust prediction."""
        df = data.copy()
        
        # Calculate latency metrics
        df['latency_diff'] = df['self_reported_latency_ms'] - df['measured_latency_ms']
        df['latency_diff_abs'] = np.abs(df['latency_diff'])
        df['latency_ratio'] = df['self_reported_latency_ms'] / df['measured_latency_ms']
        
        # Per-link statistics (expanding window)
        for stat in ['mean', 'std']:
            df[f'latency_diff_{stat}'] = df['latency_diff'].expanding().mean()
            df[f'latency_ratio_{stat}'] = df['latency_ratio'].expanding().mean()
        
        # Lag features
        for lag in [1, 3]:
            df[f'latency_diff_lag_{lag}'] = df['latency_diff'].shift(lag)
        
        return df.dropna()
    
    def predict(self, link_id: str, tick: int, data: pd.DataFrame) -> TrustScore:
        """
        Calculate trust score for a link.
        
        Args:
            link_id: Link identifier
            tick: Tick index
            data: Prepared features DataFrame
            
        Returns:
            TrustScore object
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Train the model first.")
        
        features = data[self.features].iloc[-1:].values.reshape(1, -1)
        trust_score = max(0, min(1, self.model.predict(features)[0]))
        
        # Determine rating
        if trust_score >= 0.7:
            rating = 'high'
        elif trust_score >= 0.4:
            rating = 'medium'
        else:
            rating = 'low'
        
        # Detect anomaly
        latency_ratio = data['latency_ratio'].iloc[-1]
        anomaly_detected = abs(latency_ratio - 1.0) > 0.2
        
        return TrustScore(
            link_id=link_id,
            tick=tick,
            trust_score=trust_score,
            reliability_rating=rating,
            anomaly_detected=anomaly_detected
        )


# Singleton instance
trust_model = TrustModel()