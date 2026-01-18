
import requests
import pytest

def test_company_overview(base_url, auth_headers):
    response = requests.get(f"{base_url}/analytics/company/all", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_technical_gaps(base_url, auth_headers):
    response = requests.get(f"{base_url}/analytics/gaps/all", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_retention_risk(base_url, auth_headers):
    response = requests.get(f"{base_url}/analytics/retention-risk/all", headers=auth_headers)
    assert response.status_code in [200, 404]
