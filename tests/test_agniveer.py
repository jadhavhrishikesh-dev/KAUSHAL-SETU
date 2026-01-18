
import requests
import pytest

def test_get_all_agniveers(base_url, auth_headers):
    response = requests.get(f"{base_url}/admin/agniveers", headers=auth_headers)
    assert response.status_code == 200
    agniveers = response.json()
    assert isinstance(agniveers, list)
    # Check structure of first item if exists
    if agniveers:
        assert "id" in agniveers[0]
        assert "name" in agniveers[0]
        assert "service_id" in agniveers[0]

def test_get_single_agniveer(base_url, auth_headers):
    # First get list to find an ID
    list_res = requests.get(f"{base_url}/admin/agniveers", headers=auth_headers)
    agniveers = list_res.json()
    
    if not agniveers:
        pytest.skip("No Agniveers found to test retrieval")
    
    agniveer_id = agniveers[0]['id']
    response = requests.get(f"{base_url}/agniveers/{agniveer_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['id'] == agniveer_id
