from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
from .normalization import normalize_to_0_100, calculate_recency_weight

# Constants
WEIGHT_FIRING = 0.25
WEIGHT_WEAPON = 0.20
WEIGHT_TACTICAL = 0.30
WEIGHT_COGNITIVE = 0.25

class TechnicalScoreResult(BaseModel):
    total_score: float
    completeness: float # 0.0 to 1.0 (based on categories present)
    status: str # COMPLETE, PARTIAL, INCOMPLETE
    categories_present: int
    breakdown: Dict[str, float]

def calculate_technical_score(
    firing_score: Optional[float],
    firing_date: Optional[datetime],
    weapon_score: Optional[float],
    weapon_date: Optional[datetime],
    tactical_score: Optional[float],
    tactical_date: Optional[datetime],
    cognitive_score: Optional[float],
    cognitive_date: Optional[datetime]
) -> TechnicalScoreResult:
    
    breakdown = {}
    weighted_sum = 0.0
    categories_present = 0
    
    # 1. Firing
    if firing_score is not None:
        recency = calculate_recency_weight(firing_date)
        norm_score = normalize_to_0_100(firing_score, 100) # Assuming input is 0-100
        val = norm_score * recency * WEIGHT_FIRING
        breakdown["firing"] = val
        weighted_sum += val
        categories_present += 1
        
    # 2. Weapon Handling
    if weapon_score is not None:
        recency = calculate_recency_weight(weapon_date)
        norm_score = normalize_to_0_100(weapon_score, 100)
        val = norm_score * recency * WEIGHT_WEAPON
        breakdown["weapon"] = val
        weighted_sum += val
        categories_present += 1

    # 3. Tactical
    if tactical_score is not None:
        recency = calculate_recency_weight(tactical_date)
        norm_score = normalize_to_0_100(tactical_score, 100)
        val = norm_score * recency * WEIGHT_TACTICAL
        breakdown["tactical"] = val
        weighted_sum += val
        categories_present += 1

    # 4. Cognitive
    if cognitive_score is not None:
        recency = calculate_recency_weight(cognitive_date)
        norm_score = normalize_to_0_100(cognitive_score, 100)
        val = norm_score * recency * WEIGHT_COGNITIVE
        breakdown["cognitive"] = val
        weighted_sum += val
        categories_present += 1
        
    # Status Determination
    if categories_present == 4:
        status = "COMPLETE"
    elif categories_present == 3:
        status = "PARTIAL"
    else:
        status = "INCOMPLETE"
        
    # Completeness Score
    completeness = categories_present / 4.0
    
    return TechnicalScoreResult(
        total_score=round(weighted_sum, 2),
        completeness=completeness,
        status=status,
        categories_present=categories_present,
        breakdown=breakdown
    )
