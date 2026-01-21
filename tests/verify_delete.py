
import requests

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- Verifying Delete Campaign ---")
    
    # 1. Login
    username = "testuser_campaign"
    password = "password123"
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    
    if auth_resp.status_code != 200:
        print("Login failed, please run verify_campaigns.py first to ensure user exists.")
        return

    data = auth_resp.json()
    token = data.get("token")
    user_id = data.get("user")["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Campaign to Delete
    print("Creating campaign to delete...")
    camp_payload = {
        "user_id": user_id,
        "nome": "Delete Me",
        "classe": "Rogue",
        "tema": "Cyberpunk",
        "modo": "Easy"
    }
    create_resp = requests.post(f"{BASE_URL}/campaigns", json=camp_payload, headers=headers)
    camp_id = create_resp.json().get("campaign_id")
    print(f"Created campaign {camp_id}")
    
    # 3. Verify it exists
    print("Verifying existence...")
    list_resp = requests.get(f"{BASE_URL}/campaigns", headers=headers)
    campaigns = list_resp.json().get("campaigns", [])
    if not any(c["id"] == camp_id for c in campaigns):
        print("FATAL: Created campaign not found.")
        return
        
    # 4. Delete it
    print(f"Deleting campaign {camp_id}...")
    del_resp = requests.delete(f"{BASE_URL}/campaigns/{camp_id}", headers=headers)
    
    if del_resp.status_code == 200:
        print("Delete request successful.")
    else:
        print(f"FATAL: Delete request failed: {del_resp.text}")
        return
        
    # 5. Verify it is GONE
    print("Verifying deletion...")
    list_resp_2 = requests.get(f"{BASE_URL}/campaigns", headers=headers)
    campaigns_2 = list_resp_2.json().get("campaigns", [])
    
    if any(c["id"] == camp_id for c in campaigns_2):
        print("FATAL: Campaign STILL exists after deletion!")
    else:
        print("SUCCESS: Campaign successfully deleted from list.")

if __name__ == "__main__":
    run_test()
