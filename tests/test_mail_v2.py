
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"
AUTH_URL = f"{BASE_URL}/auth/login"

def login(username, password):
    res = requests.post(AUTH_URL, json={"username": username, "password": password})
    if res.status_code != 200:
        print(f"Login failed for {username}: {res.text}")
        sys.exit(1)
    return res.json()["access_token"]

def test_v2_features():
    print("--- 1. Login ---")
    token = login("admin", "admin")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Send 3 Emails to Self
    print("\n--- 2. Sending 3 Emails ---")
    ids = []
    for i in range(3):
        res = requests.post(f"{BASE_URL}/mail/send", json={
            "subject": f"Bulk Test {i}",
            "body": "Body",
            "priority": "Normal",
            "recipient_ids": [1] # Admin ID
        }, headers=headers)
        if res.status_code != 200:
            print(f"Send failed: {res.text}")
            sys.exit(1)
            
    # 2. Check Inbox and Get IDs
    print("\n--- 3. Checking Inbox ---")
    res = requests.get(f"{BASE_URL}/mail/inbox", headers=headers)
    inbox = res.json()
    target_ids = [m['id'] for m in inbox if m['subject'].startswith("Bulk Test")]
    if len(target_ids) < 3:
        print(f"Failed to find 3 test emails. Found: {len(target_ids)}")
        sys.exit(1)
    print(f"Found IDs to delete: {target_ids}")

    # 3. Check Stats (Should be at least 3 unread, 3 sent)
    print("\n--- 4. Checking Stats ---")
    res = requests.get(f"{BASE_URL}/mail/stats", headers=headers)
    stats = res.json()
    print(f"Stats: {stats}")
    if stats['inbox_unread'] < 3:
        print("Stats Failed: Expected at least 3 unread.")
        sys.exit(1)

    # 4. Check Sent View (Specific Fix)
    print("\n--- 5. Checking Sent Detail (Fix verification) ---")
    res = requests.get(f"{BASE_URL}/mail/sent", headers=headers)
    if res.status_code != 200:
        print(f"Failed to get sent list: {res.status_code} {res.text}")
        sys.exit(1)
    try:
        sent_list = res.json()
    except json.JSONDecodeError:
        print(f"Failed to decode JSON. Body: {res.text}")
        sys.exit(1)
    sent_msg = next((m for m in sent_list if m['subject'] == "Bulk Test 0"), None)
    if not sent_msg:
        print("Failed to find sent message.")
        sys.exit(1)
    
    # Try fetching detail using InternalID (Fix)
    print(f"Fetching Sent Detail for ID {sent_msg['id']}")
    res = requests.get(f"{BASE_URL}/mail/sent/{sent_msg['id']}", headers=headers)
    if res.status_code != 200:
        print(f"Failed to fetch sent detail: {res.text}")
        sys.exit(1)
    detail = res.json()
    if detail['body'] != "Body":
         print("Failed: Body mismatch.")
         sys.exit(1)
    print("Sent Detail fetched successfully.")

    # 5. Bulk Delete
    print(f"\n--- 6. Bulk Deleting {len(target_ids)} items ---")
    res = requests.post(f"{BASE_URL}/mail/bulk-delete", json={
        "ids": target_ids,
        "folder": "inbox"
    }, headers=headers)
    if res.status_code != 200:
        print(f"Bulk delete failed: {res.text}")
        sys.exit(1)
        
    # Verify Inbox Count Decreased
    res = requests.get(f"{BASE_URL}/mail/stats", headers=headers)
    new_stats = res.json()
    print(f"New Stats: {new_stats}")
    
    # Expected: Inbox Total decreased by 3, Trash Total increased by 3
    expected_inbox = stats['inbox_total'] - 3
    expected_trash = stats['trash_total'] + 3
    
    if new_stats['inbox_total'] != expected_inbox:
        print(f"Stats Mismatch! Inbox Total: {new_stats['inbox_total']} Expected: {expected_inbox}")
        sys.exit(1)
        
    if new_stats['trash_total'] != expected_trash:
        print(f"Stats Mismatch! Trash Total: {new_stats['trash_total']} Expected: {expected_trash}")
        sys.exit(1)
            
    # Verify Inbox doesn't have them
    res = requests.get(f"{BASE_URL}/mail/inbox", headers=headers)
    inbox_now = res.json()
    if any(m['id'] in target_ids for m in inbox_now):
        print("Failed: Deleted items still in inbox.")
        sys.exit(1)
        
    print("\n=== TEST PASSED: V2 FEATURES VERIFIED ===")

if __name__ == "__main__":
    test_v2_features()
