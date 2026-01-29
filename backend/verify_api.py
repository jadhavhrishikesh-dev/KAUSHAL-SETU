import requests

BASE_URL = "http://localhost:8000"

def verify_api():
    # 1. Login
    try:
        data = {"username": "Alpha", "password": "Alpha"}
        print("Logging in as Alpha...")
        res = requests.post(f"{BASE_URL}/api/auth/login", json=data)
        if res.status_code != 200:
            print(f"Login failed: {res.status_code} {res.text}")
            return
        
        token = res.json()["access_token"]
        print("Login successful. Token obtained.")

        # 2. Fetch Agniveers
        headers = {"Authorization": f"Bearer {token}"}
        print("Fetching /api/admin/agniveers...")
        res = requests.get(f"{BASE_URL}/api/admin/agniveers", headers=headers)
        
        if res.status_code == 200:
            agniveers = res.json()
            print(f"Success! Found {len(agniveers)} Agniveers.")
            if len(agniveers) > 0:
                print(f"First: {agniveers[0]}")
        else:
             print(f"Fetch failed: {res.status_code} {res.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_api()
