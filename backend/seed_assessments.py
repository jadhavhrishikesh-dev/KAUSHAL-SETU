import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from backend.rri_engine import calculate_rri

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def seed_assessments():
    db = SessionLocal()
    try:
        agniveers = db.query(models.Agniveer).all()
        print(f"Found {len(agniveers)} Agniveers. Starting seeding...")

        count = 0
        for agniveer in agniveers:
            # 1. Create Behavioral Assessment (Q1 2025)
            # Check if one exists to avoid duplicates if run multiple times
            existing_behav = db.query(models.BehavioralAssessment).filter(
                models.BehavioralAssessment.agniveer_id == agniveer.id,
                models.BehavioralAssessment.quarter == "Q1 2025"
            ).first()

            if not existing_behav:
                behav = models.BehavioralAssessment(
                    agniveer_id=agniveer.id,
                    assessment_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    quarter="Q1 2025",
                    initiative=round(random.uniform(5.0, 10.0), 1),
                    dedication=round(random.uniform(5.0, 10.0), 1),
                    team_spirit=round(random.uniform(5.0, 10.0), 1),
                    courage=round(random.uniform(5.0, 10.0), 1),
                    motivation=round(random.uniform(5.0, 10.0), 1),
                    adaptability=round(random.uniform(5.0, 10.0), 1),
                    communication=round(random.uniform(5.0, 10.0), 1)
                )
                db.add(behav)

            # 2. Create Random Achievement (30% chance)
            if random.random() < 0.3:
                ach_type = random.choice([
                    models.AchievementType.SPORTS,
                    models.AchievementType.TECHNICAL,
                    models.AchievementType.LEADERSHIP,
                    models.AchievementType.BRAVERY
                ])
                titles = {
                    models.AchievementType.SPORTS: ["Best Boxer", "Marathon Winner", "Swimming Champion"],
                    models.AchievementType.TECHNICAL: ["Best Range Scorer", "Radio Ops Expert", "Weapon Master"],
                    models.AchievementType.LEADERSHIP: ["Best Section Commander", "Platoon Lead"],
                    models.AchievementType.BRAVERY: ["Acts of Valor", "Rescue Op Lead"]
                }
                
                ach = models.Achievement(
                    agniveer_id=agniveer.id,
                    title=random.choice(titles.get(ach_type, ["Achievement"])),
                    type=ach_type,
                    points=random.randint(10, 50),
                    date_earned=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
                    validity_months=24
                )
                db.add(ach)

            db.commit() # Commit to save assessments first

            # 3. Recalculate RRI
            # We calculate RRI after adding data so the score updates
            calculate_rri(db, agniveer.id)
            
            count += 1
            if count % 10 == 0:
                print(f"Processed {count} Agniveers...")

        print("✅ Seeding Complete. All Agniveers updated.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_assessments()
