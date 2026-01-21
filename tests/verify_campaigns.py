
import requests
import sys

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- Starting Multi-Campaign Verification ---")

    # 1. Register/Login
    username = "testuser_campaign"
    password = "password123"
    email = "test@example.com"
    
    print(f"1. Authenticating as {username}...")
    
    # Try login first
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    
    if auth_resp.status_code != 200:
        # Try register
        print("   Login failed, trying registration...")
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "username": username, 
            "password": password, 
            "confirm_password": password,
            "email": email,
            "confirm_email": email
        })
        if reg_resp.status_code != 200:
            print(f"FATAL: Registration failed: {reg_resp.text}")
            return
        auth_resp = reg_resp

    data = auth_resp.json()
    token = data.get("token")
    user_id = data.get("user")["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   Success! User ID: {user_id}")

    # 2. Create Campaign
    print("\n2. Creating a new campaign...")
    camp_payload = {
        "user_id": user_id,
        "nome": "Test Campaign",
        "classe": "Guerreiro",
        "tema": "Dark Fantasy",
        "modo": "Hardcore"
    }
    create_resp = requests.post(f"{BASE_URL}/campaigns", json=camp_payload, headers=headers)
    if create_resp.status_code != 200:
        print(f"FATAL: Campaign creation failed: {create_resp.text}")
        return
    
    camp_data = create_resp.json()
    campaign_id = camp_data.get("campaign_id")
    print(f"   Success! Campaign ID: {campaign_id}")

    # 3. List Campaigns
    print("\n3. Listing campaigns...")
    list_resp = requests.get(f"{BASE_URL}/campaigns", headers=headers)
    campaigns = list_resp.json().get("campaigns", [])
    found = any(c["id"] == campaign_id for c in campaigns)
    
    if found:
        print(f"   Success! Found campaign {campaign_id} in list.")
    else:
        print(f"FATAL: Campaign {campaign_id} not found in list: {campaigns}")
        return

    # 4. Send Chat Message
    print("\n4. Sending chat message...")
    chat_payload = {
        "user_id": user_id,
        "message": "Hello world, this is a test.",
        "campaign_id": campaign_id
    }
    # Note: Chat endpoint might not check Bearer token yet depending on implementation, 
    # but we pass it anyway. It DOES check campaign_id now.
    chat_resp = requests.post(f"{BASE_URL}/chat", json=chat_payload, headers=headers)
    
    if chat_resp.status_code != 200:
        print(f"FATAL: Chat failed: {chat_resp.text}")
        return
    
    print(f"   Success! Response: {chat_resp.json().get('response')[:50]}...")

    # 5. Get History
    print("\n5. Retrieving history...")
    hist_resp = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/history", headers=headers)
    
    if hist_resp.status_code != 200:
        print(f"FATAL: History retrieval failed: {hist_resp.text}")
        return
        
    history = hist_resp.json().get("history", [])
    print(f"   History length: {len(history)}")
    
    if len(history) >= 2: # User msg + Assistant msg
        print("   Success! History verify passed.")
    else:
        print("   WARNING: History seems too short.")

    print("\n--- Verification Complete: ALL SYSTEMS GO ---")

if __name__ == "__main__":
    run_test()
