from datetime import datetime, timedelta
from typing import Optional

def calculate_recency_weight(test_date: datetime, reference_date: Optional[datetime] = None) -> float:
    """
    Calculates recency weight based on:
    - 0-60 days: 1.0 (full weight)
    - 60-120 days: 0.95
    - 120-180 days: 0.85
    - 180-270 days: 0.70
    - 270-365 days: 0.50
    - 365-730 days: 0.25
    - >730 days: 0.0 (excluded)
    """
    if reference_date is None:
        reference_date = datetime.utcnow()
        
    if test_date is None:
        return 0.0
        
    # Ensure no future dates (Blind Spot #5)
    if test_date > reference_date:
        # Log warning here in production
        return 0.0 # Treat future dates as invalid
        
    delta = (reference_date - test_date).days
    
    if delta < 0: return 0.0 # Should be caught by reference check, but safety net
    if delta <= 60: return 1.0
    if delta <= 120: return 0.95
    if delta <= 180: return 0.85
    if delta <= 270: return 0.70
    if delta <= 365: return 0.50
    if delta <= 730: return 0.25
    return 0.0

def normalize_to_0_100(raw_score: float, max_possible: float) -> float:
    """
    Normalizes a raw score to 0-100 scale.
    Handles: Division by Zero, None values, Cap > 100.
    """
    if raw_score is None or max_possible is None:
        return 0.0
        
    if max_possible == 0:
        return 0.0
        
    if raw_score < 0: # Blind Spot #2: Negative scores
        raw_score = 0
        
    normalized = (raw_score / max_possible) * 100.0
    
    if normalized > 100: # Blind Spot #3: Capping
        return 100.0
        
    return normalized
