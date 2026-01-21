
import requests
import json

BASE_URL = "http://localhost:8000"

def debug_creation():
    print("--- Debugging Campaign Creation ---")
    
    # 1. Login to get token
    username = "testuser_campaign"
    password = "password123"
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    
    if auth_resp.status_code != 200:
        print("Login failed, trying to register...")
        auth_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "username": "debug_user", 
            "password": "password123", 
            "confirm_password": "password123",
            "email": "debug@example.com",
            "confirm_email": "debug@example.com"
        })
    
    if auth_resp.status_code != 200:
        print(f"Auth failed: {auth_resp.text}")
        return

    token = auth_resp.json().get("token")
    user_id = auth_resp.json().get("user")["user_id"]
    print(f"Authenticated as User {user_id}")
    
    # 2. Try Create Campaign
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "user_id": user_id,
        "nome": "Debug Hero",
        "classe": "Mago",
        "tema": "High Fantasy",
        "modo": "Normal"
    }
    
    print(f"Sending POST /campaigns with payload: {payload}")
    try:
        resp = requests.post(f"{BASE_URL}/campaigns", json=payload, headers=headers)
        
        print(f"\nResponse Status: {resp.status_code}")
        print(f"Response Headers: {resp.headers}")
        print(f"Response Body: {resp.text}")
        
        try:
            data = resp.json()
            if "campaign_id" in data:
                print("SUCCESS: Campaign Created")
            else:
                print(f"FAILURE: Missing campaign_id. Error: {data.get('error')}")
        except:
            print("FAILURE: Could not parse JSON")
            
    except Exception as e:
        print(f"Exception sending request: {e}")

if __name__ == "__main__":
    debug_creation()
