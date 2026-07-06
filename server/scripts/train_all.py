# scripts/train_all.py
"""
Train all three models.
"""

import subprocess
from pathlib import Path


def train_all():
    print("\n" + "="*60)
    print("TRAINING ALL MODELS")
    print("="*60)
    
    # Run each training script
    scripts = [
        'train_congestion.py',
        'train_trust.py',
        'train_targeting.py'
    ]
    
    for script in scripts:
        print(f"\n📦 Running {script}...")
        subprocess.run(['python', str(Path('scripts') / script)], check=True)
    
    print("\n" + "="*60)
    print("✅ ALL MODELS TRAINED SUCCESSFULLY!")
    print("="*60)


if __name__ == "__main__":
    train_all()