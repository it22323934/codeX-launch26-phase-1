# scripts/train_congestion.py
"""
Train congestion prediction model only.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path

DATA_DIR = Path('data')
MODELS_DIR = Path('models')


def train():
    print("\n" + "="*60)
    print("TRAINING CONGESTION MODEL")
    print("="*60)
    
    # Load data
    traffic_df = pd.read_csv(DATA_DIR / 'link_traffic_history.csv')
    print(f"Data: {len(traffic_df)} rows, {traffic_df['link_id'].nunique()} links")
    
    # Prepare features
    features = traffic_df.copy()
    le_status = LabelEncoder()
    features['status_encoded'] = le_status.fit_transform(features['status'])
    
    for lag in [1, 3, 5]:
        features[f'load_ratio_lag_{lag}'] = features.groupby('link_id')['load_ratio'].shift(lag)
    
    features['load_ratio_rolling_mean_3'] = features.groupby('link_id')['load_ratio'].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )
    features['load_ratio_rolling_std_3'] = features.groupby('link_id')['load_ratio'].transform(
        lambda x: x.rolling(window=3, min_periods=1).std()
    )
    
    features_clean = features.dropna()
    
    feature_cols = ['load_ratio', 'status_encoded', 'load_ratio_lag_1', 'load_ratio_lag_3', 
                    'load_ratio_lag_5', 'load_ratio_rolling_mean_3', 'load_ratio_rolling_std_3']
    
    X = features_clean[feature_cols]
    y = (features_clean['status'] == 'saturated').astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Train
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=5,
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    print(f"Accuracy: {model.score(X_test, y_test):.4f}")
    print(classification_report(y_test, model.predict(X_test)))
    
    # Save
    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODELS_DIR / 'congestion_model.pkl')
    joblib.dump(le_status, MODELS_DIR / 'status_encoder.pkl')
    joblib.dump(feature_cols, MODELS_DIR / 'congestion_features.pkl')
    
    print(f"✅ Model saved to {MODELS_DIR / 'congestion_model.pkl'}")


if __name__ == "__main__":
    train()