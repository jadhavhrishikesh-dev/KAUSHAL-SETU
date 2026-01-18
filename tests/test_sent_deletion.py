
import requests
import sys

BASE_URL = "http://localhost:8000/api"
AUTH_URL = f"{BASE_URL}/auth/login"

def login(username, password):
    res = requests.post(AUTH_URL, json={"username": username, "password": password})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        sys.exit(1)
    return res.json()["access_token"]

def test_sent_deletion():
    print("--- 1. Login ---")
    token = login("admin", "admin")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Send an Email
    print("\n--- 2. Sending Email ---")
    res = requests.post(f"{BASE_URL}/mail/send", json={
        "subject": "Sent Deletion Test",
        "body": "Body",
        "priority": "Normal",
        "recipient_ids": [1] # Admin
    }, headers=headers)
    if res.status_code != 200:
        sys.exit(1)

    # 2. Verify it is in Sent Box
    print("\n--- 3. Checking Sent Box ---")
    res = requests.get(f"{BASE_URL}/mail/sent", headers=headers)
    sent_list = res.json()
    my_msg = next((m for m in sent_list if m['subject'] == "Sent Deletion Test"), None)
    if not my_msg:
        print("Failed: Message not in sent box.")
        sys.exit(1)
    print(f"Found ID: {my_msg['id']}")

    # 3. Delete it (Bulk or Single - let's try single first as it calls soft_delete)
    # Actually, frontend calls DELETE /api/mail/{id} for single.
    # Bulk calls POST /api/mail/bulk-delete
    
    # 3a. Single Delete (Simulating frontend on Sent tab)
    # Note: Frontend handles this via delete endpoint.
    # We must ensure DELETE /api/mail/{id} handles Sent items too if logic is shared?
    # Wait, `main.py` DELETE /api/mail/{id} calls `soft_delete_email` with `folder`???
    # `soft_delete_email` doesn't take folder param in `main.py` call usually?
    # Let's check `main.py`.
    
    # Actually, let's test BULK DELETE first as user mentioned "click delete... selecting".
    # User said "click delete", could be single or bulk.
    # Let's test Bulk Delete with folder='sent'.
    
    print("\n--- 4. Bulk Deleting from Sent ---")
    
    # Check stats before delete
    res = requests.get(f"{BASE_URL}/mail/stats", headers=headers)
    stats_before = res.json()
    print(f"Stats Before: {stats_before}")
    
    res = requests.post(f"{BASE_URL}/mail/bulk-delete", json={
        "ids": [my_msg['id']],
        "folder": "sent"
    }, headers=headers)
    if res.status_code != 200:
        print(f"Delete failed: {res.text}")
        sys.exit(1)
        
    # Check stats after delete
    res = requests.get(f"{BASE_URL}/mail/stats", headers=headers)
    stats_after = res.json()
    print(f"Stats After: {stats_after}")
    
    if stats_after['sent_total'] != stats_before['sent_total'] - 1:
        print(f"FAILED: Sent counter mismatch. Expected {stats_before['sent_total'] - 1}, Got {stats_after['sent_total']}")
        sys.exit(1)
        
    # 4. Check Sent Box Again - Should be GONE
    print("\n--- 5. Verifying Disappearance ---")
    res = requests.get(f"{BASE_URL}/mail/sent", headers=headers)
    sent_list_new = res.json()
    if any(m['id'] == my_msg['id'] for m in sent_list_new):
        print("FAILED: Message reappeared in Sent Box!")
        sys.exit(1)
        
    print("SUCCESS: Message is gone from Sent Box.")

if __name__ == "__main__":
    test_sent_deletion()
