# scripts/train_targeting.py
"""
Train targeting risk model only.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
from pathlib import Path

DATA_DIR = Path('data')
MODELS_DIR = Path('models')


def train():
    print("\n" + "="*60)
    print("TRAINING TARGETING MODEL")
    print("="*60)
    
    # Load data
    incident_df = pd.read_csv(DATA_DIR / 'link_incident_history.csv')
    print(f"Data: {len(incident_df)} rows, {incident_df['link_id'].nunique()} links")
    
    # Prepare features
    features = incident_df.copy()
    features['jammed_numeric'] = features['jammed_flag'].astype(int)
    
    for lag in [1, 3, 5]:
        features[f'traffic_share_lag_{lag}'] = features.groupby('link_id')['traffic_share'].shift(lag)
    
    features['traffic_share_rolling_mean_3'] = features.groupby('link_id')['traffic_share'].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )
    features['traffic_share_rolling_std_3'] = features.groupby('link_id')['traffic_share'].transform(
        lambda x: x.rolling(window=3, min_periods=1).std()
    )
    
    link_stats = features.groupby('link_id').agg({
        'traffic_share': ['mean', 'std', 'max'],
        'jammed_numeric': ['sum', 'mean']
    }).reset_index()
    link_stats.columns = ['link_id'] + ['_'.join(col).strip() for col in link_stats.columns[1:]]
    features = features.merge(link_stats, on='link_id')
    
    features_clean = features.dropna()
    
    feature_cols = [
        'traffic_share', 
        'traffic_share_lag_1', 'traffic_share_lag_3', 'traffic_share_lag_5',
        'traffic_share_rolling_mean_3', 'traffic_share_rolling_std_3',
        'traffic_share_mean', 'traffic_share_std', 'traffic_share_max',
        'jammed_numeric_sum', 'jammed_numeric_mean'
    ]
    
    X = features_clean[feature_cols]
    y = features_clean['jammed_numeric']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Train
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
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
    joblib.dump(model, MODELS_DIR / 'targeting_model.pkl')
    joblib.dump(feature_cols, MODELS_DIR / 'targeting_features.pkl')
    
    print(f"✅ Model saved to {MODELS_DIR / 'targeting_model.pkl'}")


if __name__ == "__main__":
    train()