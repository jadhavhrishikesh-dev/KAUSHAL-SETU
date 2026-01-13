from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel
import statistics

# Weights
WEIGHT_INITIATIVE = 0.20
WEIGHT_DEDICATION = 0.20
WEIGHT_TEAM = 0.18
WEIGHT_COURAGE = 0.18
WEIGHT_MOTIVATION = 0.12
WEIGHT_ADAPTABILITY = 0.12

class BehavioralAssessmentInput(BaseModel):
    quarter: str
    assessment_date: datetime
    initiative: float
    dedication: float
    team_spirit: float
    courage: float
    motivation: float
    adaptability: float
    communication: Optional[float] = None
    # Communication tracked but not weighted

class BehavioralScoreResult(BaseModel):
    total_score: float
    completeness: float
    status: str
    trend: str # IMPROVING, STABLE, DECLINING
    quarters_count: int

def remove_outliers(values: List[float]) -> List[float]:
    if len(values) < 3: return values # Need at least 3 for meaningful std dev
    
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)
    
    if stdev == 0: return values
    
    filtered = [x for x in values if (mean - 2*stdev) <= x <= (mean + 2*stdev)]
    return filtered

def calculate_behavioral_score(assessments: List[BehavioralAssessmentInput]) -> BehavioralScoreResult:
    if not assessments:
        return BehavioralScoreResult(total_score=0.0, completeness=0.0, status="INSUFFICIENT", trend="STABLE", quarters_count=0)
    
    count = len(assessments)
    
    # 1. Average Parameters (with Outlier Removal)
    # Collect all values per parameter
    initiatives = [a.initiative for a in assessments]
    dedications = [a.dedication for a in assessments]
    teams = [a.team_spirit for a in assessments]
    courages = [a.courage for a in assessments]
    motivations = [a.motivation for a in assessments]
    adapts = [a.adaptability for a in assessments]
    
    # Calculate means after removing outliers
    avg_init = statistics.mean(remove_outliers(initiatives))
    avg_ded = statistics.mean(remove_outliers(dedications))
    avg_team = statistics.mean(remove_outliers(teams))
    avg_courage = statistics.mean(remove_outliers(courages))
    avg_mot = statistics.mean(remove_outliers(motivations))
    avg_adapt = statistics.mean(remove_outliers(adapts))
    
    # 2. Apply Weights & Scale to 100 (Inputs are 1-10)
    raw_weighted_sum = (
        avg_init * WEIGHT_INITIATIVE +
        avg_ded * WEIGHT_DEDICATION +
        avg_team * WEIGHT_TEAM +
        avg_courage * WEIGHT_COURAGE +
        avg_mot * WEIGHT_MOTIVATION +
        avg_adapt * WEIGHT_ADAPTABILITY
    )
    
    final_score = raw_weighted_sum * 10.0 # Scale 10 to 100
    
    # 3. Status
    if count >= 4: status = "COMPLETE"
    elif count >= 2: status = "PARTIAL"
    else: status = "INSUFFICIENT"
    
    completeness = min(count / 4.0, 1.0)
    
    # 4. Trend Detection (Compare 2nd half vs 1st half averages)
    # Sort by date
    sorted_assessments = sorted(assessments, key=lambda x: x.assessment_date)
    mid_point = count // 2
    
    if count < 2:
        trend = "STABLE"
    else:
        first_half = sorted_assessments[:mid_point]
        second_half = sorted_assessments[mid_point:]
        
        def get_avg_total(sub_list):
            if not sub_list: return 0.0
            totals = []
            for a in sub_list:
                t = (a.initiative + a.dedication + a.team_spirit + a.courage + a.motivation + a.adaptability) / 6.0
                totals.append(t)
            return statistics.mean(totals)

        avg_first = get_avg_total(first_half)
        avg_second = get_avg_total(second_half)
        
        diff = avg_second - avg_first
        if diff > 1.0: trend = "IMPROVING"
        elif diff < -1.0: trend = "DECLINING"
        else: trend = "STABLE"

    return BehavioralScoreResult(
        total_score=round(final_score, 2),
        completeness=completeness,
        status=status,
        trend=trend,
        quarters_count=count
    )
