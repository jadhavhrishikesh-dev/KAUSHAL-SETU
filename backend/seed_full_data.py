import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from backend.rri_engine import calculate_rri

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def seed_full_data():
    db = SessionLocal()
    try:
        agniveers = db.query(models.Agniveer).all()
        print(f"Found {len(agniveers)} Agniveers. Starting FULL data population...")

        count = 0
        for agniveer in agniveers:
            # 1. Technical Assessment (CRITICAL for Dashboard Charts)
            # Check for existing technical assessment to avoid massive duplicates if run repeatedly
            existing_tech = db.query(models.TechnicalAssessment).filter(
                models.TechnicalAssessment.agniveer_id == agniveer.id
            ).first()

            if not existing_tech:
                # Generate random scores biased towards upper range (60-100) for realism
                tech = models.TechnicalAssessment(
                    agniveer_id=agniveer.id,
                    assessment_date=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
                    firing_score=round(random.uniform(60, 98), 1),
                    weapon_handling_score=round(random.uniform(65, 95), 1),
                    tactical_score=round(random.uniform(55, 99), 1),
                    cognitive_score=round(random.uniform(70, 100), 1)
                )
                db.add(tech)

            # 2. Behavioral Assessment (Q1 2025) - Ensure existence
            existing_behav = db.query(models.BehavioralAssessment).filter(
                models.BehavioralAssessment.agniveer_id == agniveer.id,
                models.BehavioralAssessment.quarter == "Q1 2025"
            ).first()

            if not existing_behav:
                behav = models.BehavioralAssessment(
                    agniveer_id=agniveer.id,
                    assessment_date=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
                    quarter="Q1 2025",
                    initiative=round(random.uniform(6.0, 10.0), 1),
                    dedication=round(random.uniform(6.0, 10.0), 1),
                    team_spirit=round(random.uniform(6.0, 10.0), 1),
                    courage=round(random.uniform(6.0, 10.0), 1),
                    motivation=round(random.uniform(6.0, 10.0), 1),
                    adaptability=round(random.uniform(6.0, 10.0), 1),
                    communication=round(random.uniform(6.0, 10.0), 1)
                )
                db.add(behav)

            # 3. Achievements (Random ~40% coverage)
            # Only add if user has NO achievements, to prevent piling up
            existing_ach = db.query(models.Achievement).filter(
                models.Achievement.agniveer_id == agniveer.id
            ).first()
            
            if not existing_ach and random.random() < 0.4:
                ach_type = random.choice(list(models.AchievementType))
                titles = {
                    models.AchievementType.SPORTS: ["Best Boxer", "Marathon Runner", "Swimming Gold"],
                    models.AchievementType.TECHNICAL: ["Best Shot", "Radio Expert", "Weapon Master"],
                    models.AchievementType.LEADERSHIP: ["Best Section Commander", "Platoon 2IC"],
                    models.AchievementType.BRAVERY: ["Field Gallantry", "Rescue Op Lead"],
                    models.AchievementType.INNOVATION: ["Process Improver", "Tech Fix"]
                }
                
                ach = models.Achievement(
                    agniveer_id=agniveer.id,
                    title=random.choice(titles.get(ach_type, ["Outstanding Performance"])),
                    type=ach_type,
                    points=random.randint(20, 50),
                    date_earned=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 120)),
                    validity_months=24
                )
                db.add(ach)

            db.commit()

            # 4. RRI Calculation (Updates the Dashboards)
            calculate_rri(db, agniveer.id)
            
            count += 1
            if count % 10 == 0:
                print(f"Updated {count}/{len(agniveers)} Agniveers...")

        print("✅ FULL Seeding Complete. Dashboards should now be populated.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_full_data()
