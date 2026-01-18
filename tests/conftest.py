
import pytest
import requests
import os

BASE_URL = "http://localhost:8000/api"

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

@pytest.fixture(scope="session")
def admin_token(base_url):
    """Logs in as admin and returns the access token."""
    payload = {"username": "admin", "password": "admin"}
    response = requests.post(f"{base_url}/auth/login", json=payload)
    if response.status_code != 200:
        pytest.fail(f"Admin login failed: {response.text}")
    return response.json().get("access_token")

@pytest.fixture(scope="session")
def auth_headers(admin_token):
    """Returns headers with the admin token."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
