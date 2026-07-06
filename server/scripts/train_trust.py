# scripts/train_trust.py
"""
Train trust/reliability model only.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error
import joblib
from pathlib import Path

DATA_DIR = Path('data')
MODELS_DIR = Path('models')


def train():
    print("\n" + "="*60)
    print("TRAINING TRUST MODEL")
    print("="*60)
    
    # Load data
    telemetry_df = pd.read_csv(DATA_DIR / 'link_telemetry.csv')
    print(f"Data: {len(telemetry_df)} rows, {telemetry_df['link_id'].nunique()} links")
    
    # Prepare features
    features = telemetry_df.copy()
    features['latency_diff'] = features['self_reported_latency_ms'] - features['measured_latency_ms']
    features['latency_diff_abs'] = np.abs(features['latency_diff'])
    features['latency_ratio'] = features['self_reported_latency_ms'] / features['measured_latency_ms']
    
    link_stats = features.groupby('link_id').agg({
        'latency_diff': ['mean', 'std'],
        'latency_ratio': ['mean', 'std']
    }).reset_index()
    link_stats.columns = ['link_id'] + ['_'.join(col).strip() for col in link_stats.columns[1:]]
    features = features.merge(link_stats, on='link_id')
    
    for lag in [1, 3]:
        features[f'latency_diff_lag_{lag}'] = features.groupby('link_id')['latency_diff'].shift(lag)
    
    features_clean = features.dropna()
    features_clean['trust_score'] = np.clip(1.0 - (features_clean['latency_ratio'] - 1).abs() * 0.5, 0, 1)
    
    feature_cols = [
        'latency_diff_abs', 'latency_ratio', 
        'latency_diff_mean', 'latency_diff_std',
        'latency_ratio_mean', 'latency_ratio_std',
        'latency_diff_lag_1', 'latency_diff_lag_3'
    ]
    
    X = features_clean[feature_cols]
    y = features_clean['trust_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        min_samples_split=5,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    print(f"R² Score: {r2_score(y_test, y_pred):.4f}")
    print(f"MSE: {mean_squared_error(y_test, y_pred):.4f}")
    
    # Save
    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODELS_DIR / 'trust_model.pkl')
    joblib.dump(feature_cols, MODELS_DIR / 'trust_features.pkl')
    
    print(f"✅ Model saved to {MODELS_DIR / 'trust_model.pkl'}")


if __name__ == "__main__":
    train()