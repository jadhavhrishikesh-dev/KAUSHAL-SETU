
import requests

def test_admin_login(base_url):
    payload = {"username": "admin", "password": "admin"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_invalid_login(base_url):
    payload = {"username": "admin", "password": "wrongpassword"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    assert response.status_code in [401, 400]
