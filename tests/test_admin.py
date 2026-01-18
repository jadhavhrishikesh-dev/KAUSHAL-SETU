
import requests
import pytest

def test_get_policies(base_url, auth_headers):
    response = requests.get(f"{base_url}/policies", headers=auth_headers)
    assert response.status_code == 200

def test_get_audit_logs(base_url, auth_headers):
    response = requests.get(f"{base_url}/admin/audit-logs", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_system_stats(base_url, auth_headers):
    response = requests.get(f"{base_url}/admin/stats", headers=auth_headers)
    assert response.status_code in [200, 404]
