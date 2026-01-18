
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

def test_mail_flow():
    # 1. Login as Sender (admin) and Recipient (ag_test)
    # Ensure ag_test exists (created in previous tests) or just use admin sending to admin for simplicity?
    # Sending self-email is easiest for single-user test, but let's try Admin -> Agniveer.
    
    print("--- 1. Logging in ---")
    admin_token = login("admin", "admin")
    try:
        ag_token = login("ag_test", "password") # Assuming ag_test exists from previous runs
    except:
        print("Skipping ag_test login, testing with admin self-send if needed, but creating user first.")
        # Create a temp user if needed, but let's rely on admin self-send for Folder Logic verification
        # Self-send is sufficient to test Folders for a single user.
        ag_token = admin_token 
        print("Using Admin for sender and receiver (Self-Send)")

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Send Email
    print("\n--- 2. Sending Email ---")
    payload = {
        "subject": "Folder Test Email",
        "body": "Testing Sent and Trash folders.",
        "priority": "Normal",
        "recipient_ids": [], # Will use self-send logic via target_role or simple ID if allowed. 
        # MailService allows recipient_ids. Admin user ID is likely 1.
        # Let's verify admin user id.
        # Check /me? No endpoint. Assume ID 1.
        # But wait, send_email in frontend allows selecting user.
        # Let's just send to self (Admin ID 1).
        "recipient_ids": [1] 
    }
    
    res = requests.post(f"{BASE_URL}/mail/send", json=payload, headers=headers)
    if res.status_code != 200:
        print(f"Send failed: {res.text}")
        sys.exit(1)
    print("Email sent!")

    # 3. Check Sent Folder
    print("\n--- 3. Checking Sent Folder ---")
    res = requests.get(f"{BASE_URL}/mail/sent", headers=headers)
    print(f"Sent Items Resp: {res.status_code}")
    if res.status_code != 200:
        print(f"Error: {res.text}")
        sys.exit(1)
        
    sent_items = res.json()
    if not isinstance(sent_items, list):
        print(f"Expected list, got {type(sent_items)}: {sent_items}")
        sys.exit(1)
        
    if not any(m['subject'] == "Folder Test Email" for m in sent_items):
        print("Failed: Email not found in Sent items.")
        print(sent_items)
        sys.exit(1)
    print("Email found in Sent items.")

    # 4. Check Inbox (Receiver)
    print("\n--- 4. Checking Inbox ---")
    res = requests.get(f"{BASE_URL}/mail/inbox", headers=headers)
    inbox_items = res.json()
    target_email = next((m for m in inbox_items if m['subject'] == "Folder Test Email"), None)
    if not target_email:
        print("Failed: Email not found in Inbox.")
        sys.exit(1)
    print("Email found in Inbox.")
    email_id = target_email['id'] # Recipient Entry ID

    # 5. Soft Delete (Move to Trash)
    print(f"\n--- 5. Soft Deleting Email (ID: {email_id}) ---")
    res = requests.delete(f"{BASE_URL}/mail/{email_id}", headers=headers)
    if res.status_code != 200:
        print(f"Delete failed: {res.text}")
        sys.exit(1)
    print("Email moved to trash.")

    # 6. Verify in Trash and NOT in Inbox
    print("\n--- 6. Verifying Trash ---")
    res = requests.get(f"{BASE_URL}/mail/trash", headers=headers)
    trash_items = res.json()
    if not any(m['id'] == email_id for m in trash_items):
        print("Failed: Email not found in Trash.")
        sys.exit(1)
    
    res = requests.get(f"{BASE_URL}/mail/inbox", headers=headers)
    inbox_now = res.json()
    if any(m['id'] == email_id for m in inbox_now):
         print("Failed: Email still in Inbox.")
         sys.exit(1)
    print("Verification Successful: Email in Trash, not in Inbox.")

    # 7. Restore
    print("\n--- 7. Restoring Email ---")
    res = requests.post(f"{BASE_URL}/mail/restore/{email_id}", headers=headers)
    if res.status_code != 200:
        print(f"Restore failed: {res.text}")
        sys.exit(1)
        
    res = requests.get(f"{BASE_URL}/mail/inbox", headers=headers)
    if not any(m['id'] == email_id for m in res.json()):
        print("Failed: Email not restored to Inbox.")
        sys.exit(1)
    print("Email restored successfully.")

    # 8. Permanent Delete
    print("\n--- 8. Permanent Delete ---")
    # First move to trash again
    requests.delete(f"{BASE_URL}/mail/{email_id}", headers=headers)
    # Then delete forever
    res = requests.delete(f"{BASE_URL}/mail/trash/{email_id}", headers=headers)
    if res.status_code != 200:
        print(f"Permanent delete failed: {res.text}")
        sys.exit(1)
        
    res = requests.get(f"{BASE_URL}/mail/trash", headers=headers)
    if any(m['id'] == email_id for m in res.json()):
        print("Failed: Email still in Trash after permanent delete.")
        sys.exit(1)
    print("Email permanently deleted.")
    
    print("\n\n=== TEST PASSED: ALL FOLDER LOGIC VERIFIED ===")

if __name__ == "__main__":
    test_mail_flow()
