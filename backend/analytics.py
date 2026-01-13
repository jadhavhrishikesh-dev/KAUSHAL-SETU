from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models

def get_company_overview(db: Session, unit: str):
    # 1. Total Agniveers in Unit
    total_agniveers = db.query(models.Agniveer).filter(models.Agniveer.unit == unit).count()
    
    # 2. RRI Band Distribution
    # Identify the LATEST retention_readiness record for each Agniveer.
    # This prevents counting historical/stale scores in current stats.
    
    # Subquery: Get (agniveer_id, max_calculation_date) for all records
    subquery = db.query(
        models.RetentionReadiness.agniveer_id,
        func.max(models.RetentionReadiness.calculation_date).label('max_date')
    ).group_by(models.RetentionReadiness.agniveer_id).subquery()
    
    # Main Query: Join RetentionReadiness with the Subquery to filter only the latest records.
    # Also Join with Agniveer table to filter by Unit.
    rri_data = db.query(models.RetentionReadiness).join(
        subquery,
        (models.RetentionReadiness.agniveer_id == subquery.c.agniveer_id) &
        (models.RetentionReadiness.calculation_date == subquery.c.max_date)
    ).join(models.Agniveer).filter(models.Agniveer.unit == unit).all()
    
    green_count = sum(1 for r in rri_data if r.retention_band == models.RRIBand.GREEN)
    amber_count = sum(1 for r in rri_data if r.retention_band == models.RRIBand.AMBER)
    red_count = sum(1 for r in rri_data if r.retention_band == models.RRIBand.RED)
    
    avg_rri = 0
    if rri_data:
        avg_rri = sum(r.rri_score for r in rri_data) / len(rri_data)
        
    return {
        "unit": unit,
        "total_agniveers": total_agniveers,
        "assessed_count": len(rri_data),
        "average_rri": round(avg_rri, 2),
        "band_distribution": {
            "green": green_count,
            "amber": amber_count,
            "red": red_count
        }
    }

def get_technical_gaps(db: Session, unit: str):
    # Analyze Technical Assessments to find weak areas
    # Get latest tech assessment for each agniveer in unit
    
    # Fetch all latest tech assessments
    subquery = db.query(
        models.TechnicalAssessment.agniveer_id,
        func.max(models.TechnicalAssessment.assessment_date).label('max_date')
    ).group_by(models.TechnicalAssessment.agniveer_id).subquery()
    
    tech_data = db.query(models.TechnicalAssessment).join(
        subquery,
        (models.TechnicalAssessment.agniveer_id == subquery.c.agniveer_id) &
        (models.TechnicalAssessment.assessment_date == subquery.c.max_date)
    ).join(models.Agniveer).filter(models.Agniveer.unit == unit).all()
    
    if not tech_data:
        return {"firing": 0, "weapon": 0, "tactical": 0, "cognitive": 0}

    # Calculate average scores
    avg_firing = sum(t.firing_score or 0 for t in tech_data) / len(tech_data)
    avg_weapon = sum(t.weapon_handling_score or 0 for t in tech_data) / len(tech_data)
    avg_tactical = sum(t.tactical_score or 0 for t in tech_data) / len(tech_data)
    avg_cognitive = sum(t.cognitive_score or 0 for t in tech_data) / len(tech_data)
    
    return {
        "firing": round(avg_firing, 2),
        "weapon": round(avg_weapon, 2),
        "tactical": round(avg_tactical, 2),
        "cognitive": round(avg_cognitive, 2)
    }

def get_retention_risk(db: Session, unit: str):
    # Retrieve a list of Agniveers currently in the 'RED' (Low Retention) band.
    # Uses the same "Latest Record" subquery pattern to ensure current status.
    
    # Subquery: Find latest assessment date for each person
    subquery = db.query(
        models.RetentionReadiness.agniveer_id,
        func.max(models.RetentionReadiness.calculation_date).label('max_date')
    ).group_by(models.RetentionReadiness.agniveer_id).subquery()
    
    # Main Query:
    # 1. Join with Subquery (Latest only)
    # 2. Join with Agniveer (Filter by Unit)
    # 3. Filter by Band == RED
    risk_data = db.query(models.RetentionReadiness).join(
        subquery,
        (models.RetentionReadiness.agniveer_id == subquery.c.agniveer_id) &
        (models.RetentionReadiness.calculation_date == subquery.c.max_date)
    ).join(models.Agniveer).filter(models.Agniveer.unit == unit)\
    .filter(models.RetentionReadiness.retention_band == models.RRIBand.RED).all()
    
    result = []
    for r in risk_data:
        result.append({
            "agniveer_id": r.agniveer_id,
            "name": r.agniveer.name,
            "rri_score": r.rri_score,
            "technical": r.technical_component,
            "behavioral": r.behavioral_component
        })
        
    return result
