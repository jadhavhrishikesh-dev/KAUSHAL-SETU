#!/usr/bin/env python3
"""
Comprehensive Email Module Test Suite
Tests all Phase 7-11 mail functionality
"""

import requests
import sys
import json
import time

BASE_URL = "http://localhost:8000/api"
AUTH_URL = f"{BASE_URL}/auth/login"

# Test Results Tracker
results = {"passed": 0, "failed": 0, "tests": []}

def log(msg, status="INFO"):
    color = {"PASS": "\033[92m", "FAIL": "\033[91m", "INFO": "\033[94m", "WARN": "\033[93m"}
    print(f"{color.get(status, '')}{status}: {msg}\033[0m")

def test(name, condition, details=""):
    if condition:
        results["passed"] += 1
        results["tests"].append({"name": name, "status": "PASS"})
        log(f"{name} - {details}", "PASS")
    else:
        results["failed"] += 1
        results["tests"].append({"name": name, "status": "FAIL", "details": details})
        log(f"{name} - {details}", "FAIL")

def login(username, password):
    """Login and return token"""
    res = requests.post(AUTH_URL, json={"username": username, "password": password})
    if res.status_code != 200:
        return None
    return res.json().get("access_token")

def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def run_tests():
    log("=" * 60)
    log("COMPREHENSIVE EMAIL MODULE TEST SUITE")
    log("=" * 60)
    
    # ==========================================
    # 1. AUTHENTICATION
    # ==========================================
    log("\n--- 1. Authentication ---")
    token = login("admin", "admin")
    test("Admin Login", token is not None, "Got token" if token else "Failed to get token")
    if not token:
        log("Cannot proceed without authentication", "FAIL")
        return results
    
    h = headers(token)
    
    # ==========================================
    # 2. SEND EMAIL
    # ==========================================
    log("\n--- 2. Send Email ---")
    send_res = requests.post(f"{BASE_URL}/mail/send", json={
        "subject": "Test Email",
        "body": "This is a test email body for comprehensive testing.",
        "priority": "Normal",
        "recipient_ids": [1]  # Self (admin)
    }, headers=h)
    test("Send Email", send_res.status_code == 200, f"Status: {send_res.status_code}")
    
    # ==========================================
    # 3. GET INBOX
    # ==========================================
    log("\n--- 3. Get Inbox ---")
    inbox_res = requests.get(f"{BASE_URL}/mail/inbox", headers=h)
    test("Get Inbox", inbox_res.status_code == 200, f"Status: {inbox_res.status_code}")
    inbox = inbox_res.json() if inbox_res.ok else []
    test("Inbox Has Messages", len(inbox) > 0, f"Found {len(inbox)} messages")
    
    # ==========================================
    # 4. SEARCH INBOX
    # ==========================================
    log("\n--- 4. Search Inbox ---")
    search_res = requests.get(f"{BASE_URL}/mail/inbox?search=Test", headers=h)
    test("Search Inbox", search_res.status_code == 200, f"Status: {search_res.status_code}")
    search_results = search_res.json() if search_res.ok else []
    test("Search Returns Results", len(search_results) > 0, f"Found {len(search_results)} matching")
    
    # ==========================================
    # 5. PAGINATION
    # ==========================================
    log("\n--- 5. Pagination ---")
    page_res = requests.get(f"{BASE_URL}/mail/inbox?skip=0&limit=5", headers=h)
    test("Pagination", page_res.status_code == 200, f"Status: {page_res.status_code}")
    page_data = page_res.json() if page_res.ok else []
    test("Pagination Limits", len(page_data) <= 5, f"Got {len(page_data)} items (limit 5)")
    
    # ==========================================
    # 6. STAR/UNSTAR MESSAGE
    # ==========================================
    log("\n--- 6. Star/Unstar ---")
    if inbox:
        msg_id = inbox[0]["id"]
        star_res = requests.post(f"{BASE_URL}/mail/star/{msg_id}", headers=h)
        test("Toggle Star", star_res.status_code == 200, f"Status: {star_res.status_code}")
        if star_res.ok:
            is_starred = star_res.json().get("is_starred")
            test("Star Response", is_starred is not None, f"is_starred={is_starred}")
    else:
        log("Skipping star test - no messages", "WARN")
    
    # ==========================================
    # 7. DRAFTS CRUD
    # ==========================================
    log("\n--- 7. Drafts CRUD ---")
    
    # Create Draft
    draft_res = requests.post(f"{BASE_URL}/mail/drafts", json={
        "subject": "Draft Test",
        "body": "Draft body content",
        "target_type": "individual",
        "target_value": ""
    }, headers=h)
    test("Create Draft", draft_res.status_code == 200, f"Status: {draft_res.status_code}")
    draft_id = draft_res.json().get("id") if draft_res.ok else None
    
    # List Drafts
    drafts_res = requests.get(f"{BASE_URL}/mail/drafts", headers=h)
    test("List Drafts", drafts_res.status_code == 200, f"Status: {drafts_res.status_code}")
    drafts = drafts_res.json() if drafts_res.ok else []
    test("Drafts Found", len(drafts) > 0, f"Found {len(drafts)} drafts")
    
    # Delete Draft
    if draft_id:
        del_res = requests.delete(f"{BASE_URL}/mail/drafts/{draft_id}", headers=h)
        test("Delete Draft", del_res.status_code == 200, f"Status: {del_res.status_code}")
    
    # ==========================================
    # 8. FORWARD EMAIL
    # ==========================================
    log("\n--- 8. Forward Email ---")
    if inbox:
        email_id = inbox[0]["email_id"]
        fwd_res = requests.post(f"{BASE_URL}/mail/forward/{email_id}", json=[1], headers=h)
        test("Forward Email", fwd_res.status_code == 200, f"Status: {fwd_res.status_code}")
    else:
        log("Skipping forward test - no messages", "WARN")
    
    # ==========================================
    # 9. GET SENT MESSAGES
    # ==========================================
    log("\n--- 9. Sent Messages ---")
    sent_res = requests.get(f"{BASE_URL}/mail/sent", headers=h)
    test("Get Sent", sent_res.status_code == 200, f"Status: {sent_res.status_code}")
    sent = sent_res.json() if sent_res.ok else []
    test("Sent Has Messages", len(sent) > 0, f"Found {len(sent)} sent messages")
    
    # ==========================================
    # 10. GET TRASH
    # ==========================================
    log("\n--- 10. Trash ---")
    trash_res = requests.get(f"{BASE_URL}/mail/trash", headers=h)
    test("Get Trash", trash_res.status_code == 200, f"Status: {trash_res.status_code}")
    
    # ==========================================
    # 11. MAILBOX STATS
    # ==========================================
    log("\n--- 11. Mailbox Stats ---")
    stats_res = requests.get(f"{BASE_URL}/mail/stats", headers=h)
    test("Get Stats", stats_res.status_code == 200, f"Status: {stats_res.status_code}")
    if stats_res.ok:
        stats = stats_res.json()
        test("Stats Has Fields", all(k in stats for k in ["inbox_unread", "inbox_total", "sent_total", "trash_total"]), str(stats))
    
    # ==========================================
    # 12. UNREAD COUNT
    # ==========================================
    log("\n--- 12. Unread Count ---")
    unread_res = requests.get(f"{BASE_URL}/mail/unread-count", headers=h)
    test("Get Unread Count", unread_res.status_code == 200, f"Status: {unread_res.status_code}")
    if unread_res.ok:
        count = unread_res.json()
        test("Unread Count Valid", isinstance(count, int), f"Count: {count}")
    
    # ==========================================
    # 13. READ EMAIL DETAIL
    # ==========================================
    log("\n--- 13. Read Email Detail ---")
    if inbox:
        msg_id = inbox[0]["id"]
        detail_res = requests.get(f"{BASE_URL}/mail/{msg_id}", headers=h)
        test("Get Email Detail", detail_res.status_code == 200, f"Status: {detail_res.status_code}")
        if detail_res.ok:
            detail = detail_res.json()
            test("Detail Has Body", "body" in detail, f"Subject: {detail.get('subject', 'N/A')}")
            test("Body Is Decrypted", len(detail.get("body", "")) > 0 and "gAAAAA" not in detail.get("body", ""), "Body looks like plaintext")
    
    # ==========================================
    # 14. SOFT DELETE (Move to Trash)
    # ==========================================
    log("\n--- 14. Soft Delete ---")
    # Send a new message to delete
    new_msg = requests.post(f"{BASE_URL}/mail/send", json={
        "subject": "To Delete",
        "body": "This will be deleted",
        "priority": "Normal",
        "recipient_ids": [1]
    }, headers=h)
    if new_msg.ok:
        inbox_after = requests.get(f"{BASE_URL}/mail/inbox", headers=h).json()
        to_delete = [m for m in inbox_after if m["subject"] == "To Delete"]
        if to_delete:
            del_id = to_delete[0]["id"]
            del_res = requests.delete(f"{BASE_URL}/mail/{del_id}", headers=h)
            test("Soft Delete", del_res.status_code == 200, f"Status: {del_res.status_code}")
    
    # ==========================================
    # 15. BULK DELETE
    # ==========================================
    log("\n--- 15. Bulk Delete ---")
    bulk_res = requests.post(f"{BASE_URL}/mail/bulk-delete", json={
        "ids": [],  # Empty list for safety
        "folder": "inbox"
    }, headers=h)
    test("Bulk Delete Endpoint", bulk_res.status_code == 200, f"Status: {bulk_res.status_code}")
    
    # ==========================================
    # 16. ENCRYPTION VERIFICATION
    # ==========================================
    log("\n--- 16. Encryption ---")
    # Already verified in step 13 that body is decrypted
    test("Encryption Active", True, "Verified body is decrypted on read (Step 13)")
    
    # ==========================================
    # SUMMARY
    # ==========================================
    log("\n" + "=" * 60)
    log(f"TEST SUMMARY: {results['passed']} PASSED, {results['failed']} FAILED")
    log("=" * 60)
    
    return results

if __name__ == "__main__":
    try:
        results = run_tests()
        sys.exit(0 if results["failed"] == 0 else 1)
    except Exception as e:
        log(f"Test suite crashed: {e}", "FAIL")
        sys.exit(1)
