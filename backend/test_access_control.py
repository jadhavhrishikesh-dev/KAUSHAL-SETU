
import unittest
import os
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.main import app, get_db, get_current_user
from backend import models

# Config
TEST_DB_FILE = "./test.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mock Data
mock_agniveers = [
    models.Agniveer(id=1, service_id="AG001", name="Alpha Soldier", company="Alpha", batch_no="Jan-2026"),
    models.Agniveer(id=2, service_id="AG002", name="Bravo Soldier", company="Bravo", batch_no="Jan-2026"),
    models.Agniveer(id=3, service_id="AG003", name="Charlie Soldier", company="Charlie", batch_no="Jan-2026")
]

class TestAccessControlIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Clean up old db if exists
        if os.path.exists(TEST_DB_FILE):
            os.remove(TEST_DB_FILE)
            
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        # Seed Data
        for ag in mock_agniveers:
            db.add(ag)
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_FILE):
            os.remove(TEST_DB_FILE)

    def setUp(self):
        self.client = TestClient(app)
        def override_get_db():
            try:
                db = TestingSessionLocal()
                yield db
            finally:
                db.close()
        app.dependency_overrides[get_db] = override_get_db

    def test_admin_access_all(self):
        mock_user = models.User(username="admin", role=models.UserRole.ADMIN)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        response = self.client.get("/api/admin/agniveers")
        data = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 3)

    def test_alpha_clerk_access(self):
        mock_user = models.User(username="clerk_alpha", role=models.UserRole.COY_CLK, assigned_company="Alpha")
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        response = self.client.get("/api/admin/agniveers")
        data = response.json()
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['company'], "Alpha")

    def test_bravo_commander_access(self):
        mock_user = models.User(username="cdr_bravo", role=models.UserRole.COY_CDR, assigned_company="Bravo")
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        response = self.client.get("/api/admin/agniveers")
        data = response.json()
        
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['company'], "Bravo")

    def test_unassigned_clerk_failsafe(self):
        mock_user = models.User(username="clerk_orphan", role=models.UserRole.COY_CLK, assigned_company=None)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        response = self.client.get("/api/admin/agniveers")
        data = response.json()
        
        self.assertEqual(len(data), 0)

    def test_officer_global_access(self):
        # Officer currently sees all (Global Read for scoring)
        mock_user = models.User(username="officer", role=models.UserRole.OFFICER)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        response = self.client.get("/api/admin/agniveers")
        self.assertEqual(len(response.json()), 3)

if __name__ == '__main__':
    unittest.main()
