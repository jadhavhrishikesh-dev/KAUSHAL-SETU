from sqlalchemy.orm import Session
from datetime import datetime
from . import models
from .rri import rri_calculator, behavioral_competencies, achievements

def calculate_rri(db: Session, agniveer_id: int):
    # 1. Fetch Technical Data
    # Retrieves the most recent technical assessment for the Agniveer.
    # Scores (Firing, Weapon, Tactical, Cognitive) are extracted for the calculator.
    tech_assessment = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.agniveer_id == agniveer_id
    ).order_by(models.TechnicalAssessment.assessment_date.desc()).first()
    
    # Handle missing data gracefully by setting scores to None (calculator handles None)
    firing_score = tech_assessment.firing_score if tech_assessment else None
    firing_date = tech_assessment.assessment_date if tech_assessment else None
    weapon_score = tech_assessment.weapon_handling_score if tech_assessment else None
    weapon_date = tech_assessment.assessment_date if tech_assessment else None
    tactical_score = tech_assessment.tactical_score if tech_assessment else None
    tactical_date = tech_assessment.assessment_date if tech_assessment else None
    cognitive_score = tech_assessment.cognitive_score if tech_assessment else None
    cognitive_date = tech_assessment.assessment_date if tech_assessment else None

    # 2. Fetch Behavioral Data
    # Retrieves ALL behavioral assessments to analyze trends (handled by calculator).
    # Maps DB model to Domain input object.
    behav_rows = db.query(models.BehavioralAssessment).filter(
        models.BehavioralAssessment.agniveer_id == agniveer_id
    ).all()
    
    behav_inputs = []
    for b in behav_rows:
        behav_inputs.append(behavioral_competencies.BehavioralAssessmentInput(
            quarter=b.quarter,
            assessment_date=b.assessment_date,
            initiative=b.initiative,
            dedication=b.dedication,
            team_spirit=b.team_spirit,
            courage=b.courage,
            motivation=b.motivation,
            adaptability=b.adaptability
        ))
        
    # 3. Fetch Achievements
    # Retrieves awards/achievements. The calculator will sum points based on type and validity.
    ach_rows = db.query(models.Achievement).filter(
        models.Achievement.agniveer_id == agniveer_id
    ).all()
    
    ach_inputs = []
    for a in ach_rows:
        ach_inputs.append(achievements.AchievementInput(
            title=a.title,
            type=a.type.value, # Enum to string
            points=a.points,
            date_earned=a.date_earned,
            validity_months=a.validity_months
        ))
        
    # 4. Calculate
    # Passes all raw inputs to the core domain logic (rri_calculator).
    # This separates data fetching (Infrastructure) from calculation (Domain).
    result = rri_calculator.calculate_rri_score(
        firing_score, firing_date,
        weapon_score, weapon_date,
        tactical_score, tactical_date,
        cognitive_score, cognitive_date,
        behav_inputs,
        ach_inputs
    )
    
    # 5. Save Record
    # Persist the calculated RRI score, band, and component breakdowns.
    # Convert string band to Enum before saving.
    band_enum = models.RRIBand(result.retention_band)
    
    rri_record = models.RetentionReadiness(
        agniveer_id=agniveer_id,
        rri_score=result.rri_score,
        retention_band=band_enum,
        technical_component=result.technical.total_score,
        behavioral_component=result.behavioral.total_score,
        achievement_component=result.achievement.total_score,
        technical_completeness=result.technical.completeness,
        behavioral_completeness=result.behavioral.completeness,
        overall_data_quality=result.overall_data_quality,
        # Flatten audit notes list to a single string for storage
        audit_notes=" | ".join(result.audit_notes) if result.audit_notes else None
    )
    
    db.add(rri_record)
    db.commit()
    db.refresh(rri_record)
    
    return rri_record
