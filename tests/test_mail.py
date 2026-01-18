
import requests
import pytest

def test_send_email(base_url, auth_headers):
    # Need an Agniveer ID to send to. Using 1 as default/hack for now or better, get one.
    # Ideally should create a user in a fixture, but relying on seeded data for now.
    payload = {
        "subject": "Pytest Email",
        "body": "This is a test from pytest.",
        "priority": "Normal",
        "recipient_ids": [1] # Assuming ID 1 exists (admin or seeded agniveer)
    }
    response = requests.post(f"{base_url}/mail/send", json=payload, headers=auth_headers)
    assert response.status_code == 200

def test_get_inbox(base_url, auth_headers):
    response = requests.get(f"{base_url}/mail/inbox", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_sent(base_url, auth_headers):
    response = requests.get(f"{base_url}/mail/sent", headers=auth_headers)
    assert response.status_code == 200

def test_get_trash(base_url, auth_headers):
    response = requests.get(f"{base_url}/mail/trash", headers=auth_headers)
    assert response.status_code == 200

def test_get_drafts(base_url, auth_headers):
    response = requests.get(f"{base_url}/mail/drafts", headers=auth_headers)
    assert response.status_code == 200

def test_mail_stats(base_url, auth_headers):
    response = requests.get(f"{base_url}/mail/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "inbox_unread" in data

def test_star_message(base_url, auth_headers):
    # Get inbox to find a message
    inbox_res = requests.get(f"{base_url}/mail/inbox", headers=auth_headers)
    inbox = inbox_res.json()
    
    if not inbox:
        pytest.skip("No messages in inbox to star")
    
    msg_id = inbox[0]['id']
    response = requests.post(f"{base_url}/mail/star/{msg_id}", headers=auth_headers)
    assert response.status_code == 200
