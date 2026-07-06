# app/models/base.py
"""
Base model class for all ML models.
"""

import joblib
import pandas as pd
from pathlib import Path
from typing import Optional, Any


class BaseModel:
    """Base class for all ML models."""
    
    def __init__(self, model_name: str, models_dir: str = 'models'):
        self.model_name = model_name
        self.models_dir = Path(models_dir)
        self.model = None
        self.features = None
        self._load()
    
    def _load(self):
        """Load the model from disk."""
        model_path = self.models_dir / f'{self.model_name}_model.pkl'
        features_path = self.models_dir / f'{self.model_name}_features.pkl'
        
        if model_path.exists():
            self.model = joblib.load(model_path)
            self.features = joblib.load(features_path)
            print(f"✅ {self.model_name.title()} model loaded from {model_path}")
        else:
            print(f"⚠️ {self.model_name.title()} model not found at {model_path}")
            print(f"   Run the training script first.")
    
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model is not None
    
    def predict(self, data: pd.DataFrame) -> Any:
        """Make prediction - to be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement predict()")
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features - to be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement _prepare_features()")