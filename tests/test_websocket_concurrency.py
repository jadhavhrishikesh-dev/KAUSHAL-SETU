
import asyncio
import websockets
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/mail"
USERNAME = "admin"
PASSWORD = "admin"

def get_auth_token():
    try:
        # KAUSHAL-SETU uses /api/auth/login with JSON body
        payload = {"username": USERNAME, "password": PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

import pytest

@pytest.mark.asyncio
async def test_websocket_broadcast():
    print("1. Authenticating...")
    token = get_auth_token()
    user_id = 1 # Admin ID is usually 1
    
    uri = f"{WS_URL}/{user_id}"
    
    print(f"2. Connecting Client A (Navbar)...")
    async with websockets.connect(uri) as ws_a:
        print("   Client A Connected.")
        
        print(f"3. Connecting Client B (MailModal)...")
        async with websockets.connect(uri) as ws_b:
            print("   Client B Connected.")
            
            # 4. Trigger Event (Send Email to Self)
            print("4. Triggering New Mail Event via API...")
            headers = {"Authorization": f"Bearer {token}"}
            payload = {
                "subject": "WebSocket Test",
                "body": "Testing broadcast",
                "recipient_ids": [user_id], # Self send
                "priority": "Normal"
            }
            
            # Send in a separate thread/sync call or just simple requests
            # We do it after connection is established
            requests.post(f"{BASE_URL}/api/mail/send", json=payload, headers=headers)
            
            print("5. Waiting for messages on both clients...")
            
            # Wait for messages with timeout
            try:
                msg_a = await asyncio.wait_for(ws_a.recv(), timeout=5.0)
                print(f"   ✅ Client A received: {msg_a}")
            except asyncio.TimeoutError:
                print("   ❌ Client A Timed Out!")
                sys.exit(1)

            try:
                msg_b = await asyncio.wait_for(ws_b.recv(), timeout=5.0)
                print(f"   ✅ Client B received: {msg_b}")
            except asyncio.TimeoutError:
                print("   ❌ Client B Timed Out!")
                sys.exit(1)
                
            print("\nSUCCESS: Both clients received the notification simultaneously!")

if __name__ == "__main__":
    asyncio.run(test_websocket_broadcast())
