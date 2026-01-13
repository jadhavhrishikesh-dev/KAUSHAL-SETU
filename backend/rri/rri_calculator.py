from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from .technical_skills import calculate_technical_score, TechnicalScoreResult
from .behavioral_competencies import calculate_behavioral_score, BehavioralScoreResult, BehavioralAssessmentInput
from .achievements import calculate_achievement_score, AchievementScoreResult, AchievementInput

# RRI Weights
RRI_WEIGHT_TECH = 0.50
RRI_WEIGHT_BEHAV = 0.30
RRI_WEIGHT_ACHIEVE = 0.20

class RRIResult(BaseModel):
    rri_score: float
    retention_band: str # GREEN, AMBER, RED
    technical: TechnicalScoreResult
    behavioral: BehavioralScoreResult
    achievement: AchievementScoreResult
    overall_data_quality: float
    quality_status: str # GOOD, WARNING, INSUFFICIENT
    calculation_date: datetime
    audit_notes: List[str]

def calculate_rri_score(
    # Technical Inputs
    firing_score: Optional[float], firing_date: Optional[datetime],
    weapon_score: Optional[float], weapon_date: Optional[datetime],
    tactical_score: Optional[float], tactical_date: Optional[datetime],
    cognitive_score: Optional[float], cognitive_date: Optional[datetime],
    
    # Behavioral Inputs
    behavioral_assessments: List[BehavioralAssessmentInput],
    
    # Achievement Inputs
    achievements: List[AchievementInput]
) -> RRIResult:
    
    audit_notes = []
    
    # 1. Calculate Component Scores
    tech_result = calculate_technical_score(
        firing_score, firing_date,
        weapon_score, weapon_date,
        tactical_score, tactical_date,
        cognitive_score, cognitive_date
    )
    
    behav_result = calculate_behavioral_score(behavioral_assessments)
    
    ach_result = calculate_achievement_score(achievements)
    
    # 2. Calculate Final RRI
    rri_score = (
        (tech_result.total_score * RRI_WEIGHT_TECH) +
        (behav_result.total_score * RRI_WEIGHT_BEHAV) +
        (ach_result.total_score * RRI_WEIGHT_ACHIEVE)
    )
    rri_score = round(rri_score, 2)
    
    # 3. Determine Band
    if rri_score >= 80:
        band = "GREEN"
    elif rri_score >= 65:
        band = "AMBER"
    else:
        band = "RED"
        
    # 4. Data Quality
    overall_quality = (tech_result.completeness + behav_result.completeness) / 2.0
    
    if overall_quality >= 0.75:
        q_status = "GOOD"
    elif overall_quality >= 0.50:
        q_status = "WARNING"
    else:
        q_status = "INSUFFICIENT"
        audit_notes.append("Data quality insufficient for reliable prediction")

    if ach_result.flags:
        audit_notes.extend(ach_result.flags)
        
    return RRIResult(
        rri_score=rri_score,
        retention_band=band,
        technical=tech_result,
        behavioral=behav_result,
        achievement=ach_result,
        overall_data_quality=round(overall_quality, 2),
        quality_status=q_status,
        calculation_date=datetime.utcnow(),
        audit_notes=audit_notes
    )
