import unittest
from datetime import datetime, timedelta
from backend.rri.normalization import normalize_to_0_100, calculate_recency_weight
from backend.rri.technical_skills import calculate_technical_score
from backend.rri.behavioral_competencies import calculate_behavioral_score, BehavioralAssessmentInput
from backend.rri.achievements import calculate_achievement_score, AchievementInput
from backend.rri.rri_calculator import calculate_rri_score

class TestRRI(unittest.TestCase):
    
    def test_normalization(self):
        self.assertEqual(normalize_to_0_100(50, 100), 50.0)
        self.assertEqual(normalize_to_0_100(80, 200), 40.0)
        self.assertEqual(normalize_to_0_100(-10, 100), 0.0) # Negative cap
        self.assertEqual(normalize_to_0_100(150, 100), 100.0) # Overflow cap
        
    def test_recency(self):
        now = datetime.utcnow()
        self.assertEqual(calculate_recency_weight(now), 1.0)
        self.assertEqual(calculate_recency_weight(now - timedelta(days=30)), 1.0)
        self.assertEqual(calculate_recency_weight(now - timedelta(days=90)), 0.95)
        self.assertEqual(calculate_recency_weight(now - timedelta(days=400)), 0.25)
        self.assertEqual(calculate_recency_weight(now - timedelta(days=800)), 0.0)

    def test_technical_logic(self):
        now = datetime.utcnow()
        # All present perfect
        res = calculate_technical_score(
            100, now, 100, now, 100, now, 100, now
        )
        self.assertEqual(res.status, "COMPLETE")
        self.assertEqual(res.completeness, 1.0)
        
        # Missing one
        res2 = calculate_technical_score(
            100, now, None, None, 100, now, 100, now
        )
        self.assertEqual(res2.status, "PARTIAL")
        self.assertEqual(res2.completeness, 0.75)
        
    def test_behavioral_logic(self):
        now = datetime.utcnow()
        # 4 identical assessments
        assessments = []
        for i in range(4):
            assessments.append(BehavioralAssessmentInput(
                quarter=f"Q{i}", assessment_date=now,
                initiative=8, dedication=8, team_spirit=8,
                courage=8, motivation=8, adaptability=8, communication=8
            ))
            
        res = calculate_behavioral_score(assessments)
        self.assertEqual(res.status, "COMPLETE")
        self.assertEqual(res.total_score, 80.0)
        self.assertEqual(res.trend, "STABLE")
        
    def test_achievement_logic(self):
        now = datetime.utcnow()
        achievements = [
            AchievementInput(title="A1", type="SPORTS", points=10, date_earned=now, validity_months=24),
            AchievementInput(title="A2", type="TECHNICAL", points=10, date_earned=now, validity_months=36)
        ]
        res = calculate_achievement_score(achievements)
        # SPORTS (10 -> 5) + TECHNICAL (10 -> 8) = 13
        self.assertEqual(res.total_score, 26.0) # (13 / 50) * 100
        
        # Cap check
        achievements.append(AchievementInput(title="Big", type="BRAVERY", points=100, date_earned=now, validity_months=999))
        res2 = calculate_achievement_score(achievements)
        # BRAVERY capped at 15 (Max allowed)
        # Sum targets: (3~5->5) + (5~8->8) + 15 = 28
        # Wait, previous inputs: 
        # A1: SPORTS (3-5), input 10 => clamped to 5
        # A2: TECHNICAL (5-8), input 10 => clamped to 8
        # A3: BRAVERY (12-15), input 100 => clamped to 15
        # Total Raw: 5 + 8 + 15 = 28.0
        self.assertEqual(res2.raw_points_sum, 28.0) 
        self.assertEqual(res2.total_score, 56.0) # (28/50)*100
        self.assertIn("CLAMPED_BRAVERY_HIGH", res2.flags)

    def test_disciplinary_and_clamping(self):
        now = datetime.utcnow()
        achievements = [
            AchievementInput(title="Bad", type="DISCIPLINARY", points=-10, date_earned=now, validity_months=12),
            AchievementInput(title="Good", type="SPORTS", points=5, date_earned=now, validity_months=24)
        ]
        # Disciplinary -10 clamped to -5 (range -5 to -3)
        # Sports 5 is valid (range 3-5)
        # Total: 5 - 5 = 0
        res = calculate_achievement_score(achievements)
        self.assertEqual(res.raw_points_sum, 0.0)
        self.assertEqual(res.total_score, 0.0)
        self.assertIn("CLAMPED_DISCIPLINARY_LOW", res.flags)
        
    def test_rri_integration(self):
        # Smoke test full calc
        now = datetime.utcnow()
        res = calculate_rri_score(
            80, now, 80, now, 80, now, 80, now,
            [], # No behavioral
            [] # No achievement
        )
        # Tech: 80 * 1.0 * (0.25+0.2+0.3+0.25) -> 80
        # RRI: 80 * 0.5 + 0 + 0 = 40
        self.assertEqual(res.rri_score, 40.0)
        self.assertEqual(res.retention_band, "RED")

if __name__ == '__main__':
    unittest.main()
