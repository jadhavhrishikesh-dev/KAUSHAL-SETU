from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# (Min, Max, ValidityMonths)
# For Bravery, validity is 999 (infinite for practical purposes)
# For Disciplinary, points are negative
ACHIEVEMENT_LIMITS = {
    "SPORTS":       (3.0, 5.0, 24),
    "TECHNICAL":    (5.0, 8.0, 36),
    "LEADERSHIP":   (8.0, 12.0, 36),
    "BRAVERY":      (12.0, 15.0, 999), 
    "INNOVATION":   (4.0, 6.0, 24),
    "TRAINING":     (3.0, 5.0, 24),
    "DISCIPLINARY": (-5.0, -3.0, 12)
}

class AchievementInput(BaseModel):
    title: str
    type: str 
    points: float
    date_earned: datetime
    validity_months: int # Kept for compatibility but we enforce spec in logic

class AchievementScoreResult(BaseModel):
    total_score: float # Scaled 0-100
    raw_points_sum: float # Capped at 50, floored at 0
    achievements_count: int
    flags: List[str]

def calculate_achievement_score(achievements: List[AchievementInput]) -> AchievementScoreResult:
    if not achievements:
        return AchievementScoreResult(total_score=0.0, raw_points_sum=0.0, achievements_count=0, flags=[])
    
    total_weighted_points = 0.0
    flags = []
    
    for ach in achievements:
        limits = ACHIEVEMENT_LIMITS.get(ach.type)
        
        # 1. Validation & Clamping
        safe_points = ach.points
        if limits:
            min_p, max_p, valid_m = limits
            
            # Clamp points
            if safe_points < min_p:
               # If it's disciplinary (negative), min_p is -5 (lower number) and max_p is -3
               # So -10 < -5 -> Clamp to -5? Or is -10 worse?
               # Usually ranges mean valid scope. 
               # Let's assume standard clamping logic: min(max(val, min), max)
               # Ex: Disciplinary -10. min=-5, max=-3. max(-10, -5) -> -5. min(-5, -3) -> -5. Correct.
               # Ex: Disciplinary -1. max(-1, -5) -> -1. min(-1, -3) -> -3. Correct.
               pass 
               
            # Standard clamp
            if safe_points < min_p:
                safe_points = min_p
                flags.append(f"CLAMPED_{ach.type}_LOW")
            elif safe_points > max_p:
                safe_points = max_p
                flags.append(f"CLAMPED_{ach.type}_HIGH")
                
            # Override validity for calculation purposes (User input might be wrong)
            # kept `valid_m` for logic
        else:
            # Unknown type? Fallback or ignore. Let's keep raw points but flag.
            flags.append(f"UNKNOWN_TYPE_{ach.type}")
            valid_m = 24 # Default fallback
            
        is_bravery = (ach.type == "BRAVERY")
        is_disciplinary = (ach.type == "DISCIPLINARY")

        # 2. Expiry Check
        if not is_bravery:
            # Using limits' validity instead of input validity for strictness?
            # User request: "Validity | 24 months"
            # Let's use the Spec's validity.
            limit_validity = limits[2] if limits else 24
            
            expiry_date = ach.date_earned.timestamp() + (limit_validity * 30 * 24 * 3600)
            if datetime.utcnow().timestamp() > expiry_date:
                continue # Expired
        
        # 3. Time Decay
        # Spec: 0-6m (1.0), 6-12m (0.85), 12-24m (0.60), >24m (0.0)
        # Exception: BRAVERY (No decay)
        # Exception: DISCIPLINARY (No decay specified? Usually negative points stick for their valid duration)
        # Let's assume DISCIPLINARY is 1.0 until it expires (12 months).
        
        days_old = (datetime.utcnow() - ach.date_earned).days
        multiplier = 0.0
        
        if is_bravery or is_disciplinary:
            multiplier = 1.0
        else:
            if days_old <= 180: # 0-6 months
                multiplier = 1.0
            elif days_old <= 365: # 6-12 months
                multiplier = 0.85
            elif days_old <= 730: # 12-24 months
                multiplier = 0.60
            else:
                multiplier = 0.0
            
        weighted_points = safe_points * multiplier
        total_weighted_points += weighted_points
        
    # 4. Final Sum handling
    raw_sum = total_weighted_points
    
    # Cap at 50 (Positive only)
    if raw_sum > 50:
        raw_sum = 50.0
        flags.append("CAPPED_AT_50")
        
    # Floor at 0 (If negative points outweigh positive)
    if raw_sum < 0:
        raw_sum = 0.0
        
    # 5. Scale to 0-100
    final_score = (raw_sum / 50.0) * 100.0
    
    return AchievementScoreResult(
        total_score=round(final_score, 2),
        raw_points_sum=round(raw_sum, 2),
        achievements_count=len(achievements),
        flags=list(set(flags)) # Unique flags
    )

