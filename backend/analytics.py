from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models

def get_company_overview(db: Session, unit: str):
    # 1. Total Agniveers in Company (note: 'unit' param is actually company name)
    total_agniveers = db.query(models.Agniveer).filter(models.Agniveer.company == unit).count()
    
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
    ).join(models.Agniveer).filter(models.Agniveer.company == unit).all()
    
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
    ).join(models.Agniveer).filter(models.Agniveer.company == unit).all()
    
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
    ).join(models.Agniveer).filter(models.Agniveer.company == unit)\
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


def get_pending_assessments(db: Session, unit: str):
    """
    Count Agniveers missing assessments.
    - 'pending_technical': No TechnicalAssessment record at all.
    - 'pending_behavioral': No BehavioralAssessment for current quarter.
    """
    from datetime import datetime
    current_quarter = f"Q{(datetime.now().month - 1) // 3 + 1} {datetime.now().year}"
    
    # Get all Agniveers in unit
    agniveers = db.query(models.Agniveer).filter(models.Agniveer.company == unit).all()
    agniveer_ids = [a.id for a in agniveers]
    
    # Find those WITH technical assessments
    assessed_tech_ids = db.query(models.TechnicalAssessment.agniveer_id).filter(
        models.TechnicalAssessment.agniveer_id.in_(agniveer_ids)
    ).distinct().all()
    assessed_tech_ids = {r[0] for r in assessed_tech_ids}
    
    # Find those WITH behavioral for current quarter
    assessed_behav_ids = db.query(models.BehavioralAssessment.agniveer_id).filter(
        models.BehavioralAssessment.agniveer_id.in_(agniveer_ids),
        models.BehavioralAssessment.quarter == current_quarter
    ).distinct().all()
    assessed_behav_ids = {r[0] for r in assessed_behav_ids}
    
    pending_tech = len(set(agniveer_ids) - assessed_tech_ids)
    pending_behav = len(set(agniveer_ids) - assessed_behav_ids)
    
    return {
        "pending_technical": pending_tech,
        "pending_behavioral": pending_behav,
        "current_quarter": current_quarter
    }


def get_rri_trend(db: Session, unit: str, months: int = 6):
    """
    Returns monthly average RRI for the unit over the last N months.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import extract
    
    # Get Agniveer IDs for unit
    agniveer_ids = [a.id for a in db.query(models.Agniveer.id).filter(models.Agniveer.company == unit).all()]
    
    results = []
    today = datetime.now()
    
    for i in range(months - 1, -1, -1):
        # Calculate month boundaries
        target_date = today - timedelta(days=30 * i)
        year = target_date.year
        month = target_date.month
        
        # Query RRI scores for that month
        month_data = db.query(func.avg(models.RetentionReadiness.rri_score)).filter(
            models.RetentionReadiness.agniveer_id.in_(agniveer_ids),
            extract('year', models.RetentionReadiness.calculation_date) == year,
            extract('month', models.RetentionReadiness.calculation_date) == month
        ).scalar()
        
        results.append({
            "month": f"{year}-{str(month).zfill(2)}",
            "avg_rri": round(month_data, 2) if month_data else 0
        })
    
    return results


def get_technical_trend(db: Session, unit: str, months: int = 6):
    """
    Returns monthly averages for each technical competency.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import extract
    
    agniveer_ids = [a.id for a in db.query(models.Agniveer.id).filter(models.Agniveer.company == unit).all()]
    
    results = []
    today = datetime.now()
    
    for i in range(months - 1, -1, -1):
        target_date = today - timedelta(days=30 * i)
        year = target_date.year
        month = target_date.month
        
        data = db.query(
            func.avg(models.TechnicalAssessment.firing_score),
            func.avg(models.TechnicalAssessment.weapon_handling_score),
            func.avg(models.TechnicalAssessment.tactical_score),
            func.avg(models.TechnicalAssessment.cognitive_score)
        ).filter(
            models.TechnicalAssessment.agniveer_id.in_(agniveer_ids),
            extract('year', models.TechnicalAssessment.assessment_date) == year,
            extract('month', models.TechnicalAssessment.assessment_date) == month
        ).first()
        
        results.append({
            "month": f"{year}-{str(month).zfill(2)}",
            "firing": round(data[0], 2) if data[0] else 0,
            "weapon": round(data[1], 2) if data[1] else 0,
            "tactical": round(data[2], 2) if data[2] else 0,
            "cognitive": round(data[3], 2) if data[3] else 0
        })
    
    return results


def get_behavioral_trend(db: Session, unit: str):
    """
    Returns quarterly averages for behavioral competencies (last 4 quarters).
    """
    from datetime import datetime
    
    agniveer_ids = [a.id for a in db.query(models.Agniveer.id).filter(models.Agniveer.company == unit).all()]
    
    # Generate last 4 quarters
    today = datetime.now()
    current_q = (today.month - 1) // 3 + 1
    current_y = today.year
    
    quarters = []
    for i in range(4):
        q = current_q - i
        y = current_y
        if q <= 0:
            q += 4
            y -= 1
        quarters.append(f"Q{q} {y}")
    
    quarters = quarters[::-1]  # Chronological order
    
    results = []
    for quarter in quarters:
        data = db.query(
            func.avg(models.BehavioralAssessment.initiative),
            func.avg(models.BehavioralAssessment.dedication),
            func.avg(models.BehavioralAssessment.team_spirit),
            func.avg(models.BehavioralAssessment.courage),
            func.avg(models.BehavioralAssessment.motivation),
            func.avg(models.BehavioralAssessment.adaptability),
            func.avg(models.BehavioralAssessment.communication)
        ).filter(
            models.BehavioralAssessment.agniveer_id.in_(agniveer_ids),
            models.BehavioralAssessment.quarter == quarter
        ).first()
        
        # Calculate overall average
        scores = [s for s in data if s is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        results.append({
            "quarter": quarter,
            "initiative": round(data[0], 1) if data[0] else 0,
            "dedication": round(data[1], 1) if data[1] else 0,
            "team_spirit": round(data[2], 1) if data[2] else 0,
            "courage": round(data[3], 1) if data[3] else 0,
            "motivation": round(data[4], 1) if data[4] else 0,
            "adaptability": round(data[5], 1) if data[5] else 0,
            "communication": round(data[6], 1) if data[6] else 0,
            "average": round(avg_score, 1)
        })
    
    return results


def get_competency_insights(db: Session, unit: str):
    """
    Analyzes ALL competencies (Technical + Behavioral) to provide:
    1. Radar Chart Data (Average score per skill normalized to 100).
    2. Top 3 Weakest Areas (Training Priorities).
    """
    # 1. Fetch Technical Averages
    tech = get_technical_trend(db, unit, months=1) # Get latest month
    latest_tech = tech[0] if tech else {}
    
    # 2. Fetch Behavioral Averages
    behav = get_behavioral_trend(db, unit)
    latest_behav = behav[-1] if behav else {}
    
    # Normalize everything to 100 scale
    # Tech is already 0-100. Behav is 0-10.
    skills = [
        {"subject": "Firing", "A": latest_tech.get("firing", 0), "fullMark": 100},
        {"subject": "Weapon", "A": latest_tech.get("weapon", 0), "fullMark": 100},
        {"subject": "Tactical", "A": latest_tech.get("tactical", 0), "fullMark": 100},
        {"subject": "Cognitive", "A": latest_tech.get("cognitive", 0), "fullMark": 100},
        {"subject": "Initiative", "A": (latest_behav.get("initiative", 0) or 0) * 10, "fullMark": 100},
        {"subject": "Team Spirit", "A": (latest_behav.get("team_spirit", 0) or 0) * 10, "fullMark": 100},
        {"subject": "Courage", "A": (latest_behav.get("courage", 0) or 0) * 10, "fullMark": 100},
        {"subject": "Discipline", "A": (latest_behav.get("dedication", 0) or 0) * 10, "fullMark": 100}, # Mapping Dedication -> Discipline/Duty
    ]
    
    # Identify Weakest (Sort by score ascending)
    sorted_skills = sorted(skills, key=lambda x: x["A"])
    priorities = [s for s in sorted_skills if s["A"] > 0][:3] # Top 3 lowest, excluding zeros
    
    return {
        "radar_data": skills,
        "training_priorities": priorities
    }


def get_honor_board(db: Session, unit: str):
    """
    Returns lists for:
    1. Top Performers (Green Band, Highest RRI).
    2. Improvement Champions (Current RRI > Last RRI).
    3. Recent Achievements.
    """
    from sqlalchemy import desc
    
    # 1. Top Performers
    # Re-use company overview logic to find latest RRI
    rri_sub = db.query(
        models.RetentionReadiness.agniveer_id,
        func.max(models.RetentionReadiness.calculation_date).label('max_date')
    ).group_by(models.RetentionReadiness.agniveer_id).subquery()
    
    top_performers = db.query(models.RetentionReadiness).join(
        rri_sub,
        (models.RetentionReadiness.agniveer_id == rri_sub.c.agniveer_id) &
        (models.RetentionReadiness.calculation_date == rri_sub.c.max_date)
    ).join(models.Agniveer).filter(models.Agniveer.company == unit)\
    .order_by(desc(models.RetentionReadiness.rri_score)).limit(5).all()
    
    top_list = [{
        "name": r.agniveer.name,
        "score": r.rri_score,
        "agniveer_id": r.agniveer_id
    } for r in top_performers]
    
    # 2. Recent Achievements
    achievements = db.query(models.Achievement).join(models.Agniveer)\
        .filter(models.Agniveer.company == unit)\
        .order_by(desc(models.Achievement.date_earned)).limit(5).all()
        
    ach_list = [{
        "name": a.agniveer.name,
        "title": a.title,
        "type": a.type,
        "date": a.date_earned.strftime("%d %b")
    } for a in achievements]
    
    return {
        "top_performers": top_list,
        "recent_achievements": ach_list,
        "champions": [] 
    }


def get_command_hub_data(db: Session, unit: str):
    """
    Returns high-level 'Command at a Glance' metrics:
    1. Company Readiness Score (0-100).
    2. Status Badges (Manning, Training, Admin).
    3. Benchmarks (vs Battalion Avg).
    """
    # 1. Calculate Readiness Score (Composite of RRI + Training Completion)
    overview = get_company_overview(db, unit)
    avg_rri = overview["average_rri"] or 0
    pending = get_pending_assessments(db, unit)
    
    # Mock Calculation: 
    # Base is Average RRI. 
    # Penalty for pending assessments (0.5 per pending).
    total_pending = pending["pending_technical"] + pending["pending_behavioral"]
    penalty = min(total_pending * 0.5, 20) # Max 20 point penalty
    readiness_score = round(max(avg_rri - penalty, 0), 1)
    
    # 2. Benchmarks (Mocked for now)
    battalion_avg = 76.5
    prev_month_score = 71.2 # Mock
    
    # 3. Status Badges
    manning_status = "Good" if overview["total_agniveers"] > 10 else "Low" # Arbitrary threshold
    training_status = "Needs Attention" if total_pending > 5 else "On Track"
    
    return {
        "readiness_score": readiness_score,
        "battalion_avg": battalion_avg,
        "score_delta": round(readiness_score - prev_month_score, 1),
        "status": {
            "manning": manning_status,
            "training": training_status,
            "critical_actions": total_pending
        },
        "overview": overview, # Re-return overview data for convenience
        "pending": pending
    }


def get_action_center_items(db: Session, unit: str):
    """
    Returns a prioritized list of actionable items for the 'Action Center'.
    """
    items = []
    
    # Check Pending Assessments
    pending = get_pending_assessments(db, unit)
    if pending["pending_technical"] > 0:
        items.append({
            "id": "pending_tech",
            "type": "URGENT",
            "message": f"{pending['pending_technical']} Technical Assessments overdue",
            "action": "Schedule Now",
            "target": "process_assessments"
        })
        
    if pending["pending_behavioral"] > 0:
        items.append({
            "id": "pending_behav",
            "type": "WARNING",
            "message": f"{pending['pending_behavioral']} Behavioral Reports pending (Q1)",
            "action": "Complete Reports",
            "target": "process_assessments"
        })
        
    # Check Risks (Red Band)
    risk_data = get_retention_risk(db, unit)
    if risk_data:
        # Create an individual item for the most critical risk, or a group item
        # For AI demo, let's pick the highest risk individual
        top_risk = risk_data[0]
        items.append({
            "id": f"risk_alert_{top_risk['agniveer_id']}",
            "type": "CRITICAL",
            "message": f"High Retention Risk: {top_risk['name']} (RRI: {top_risk['rri_score']})",
            "action": "🧠 AI Analysis", # Changed action label
            "target": "ai_report",     # Changed target type
            "data": { "agniveer_id": top_risk['agniveer_id'] } # Added data payload
        })
        
        if len(risk_data) > 1:
             items.append({
                "id": "risk_group",
                "type": "CRITICAL",
                "message": f"{len(risk_data)-1} other Agniveers in Red Band",
                "action": "View Watchlist",
                "target": "view_risks"
            })
        
    # Check Achievements (Mock logic: "No awards in last 30 days")
    # In a real app, we'd query dates.
    honor_board = get_honor_board(db, unit)
    if not honor_board["recent_achievements"]:
         items.append({
            "id": "morale_alert",
            "type": "INFO",
            "message": "No achievements recorded recently. Boost morale!",
            "action": "Award Badge",
            "target": "award_achievement"
        })
        
    return items

