
import requests
import pytest

def test_get_all_users(base_url, auth_headers):
    response = requests.get(f"{base_url}/admin/users", headers=auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) > 0

def test_user_search(base_url, auth_headers):
    response = requests.get(f"{base_url}/users/search?q=admin", headers=auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) > 0
    assert users[0]['username'] == 'admin'

def test_broadcast_lists(base_url, auth_headers):
    response = requests.get(f"{base_url}/admin/broadcast-lists", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "batches" in data
    assert "companies" in data
