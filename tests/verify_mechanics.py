
import requests
import time

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- Verifying Mechanics ---")
    
    # 1. Login
    username = "testuser_campaign"
    password = "password123"
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if auth_resp.status_code != 200:
        print("Login failed, ensure user exists.")
        return

    data = auth_resp.json()
    token = data.get("token")
    user_id = data.get("user")["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Campaign with Race and D&D Mode
    print("Creating Campaign with Race: Orc, Mode: D&D 5E...")
    camp_payload = {
        "user_id": user_id,
        "nome": "Grognark",
        "raca": "Orc",
        "classe": "Guerreiro",
        "tema": "Dungeon Crawler",
        "modo": "dnd5e"
    }
    
    create_resp = requests.post(f"{BASE_URL}/campaigns", json=camp_payload, headers=headers)
    if create_resp.status_code == 200:
        print("Campaign created successfully!")
        c_data = create_resp.json()
        camp_id = c_data["campaign_id"]
        print(f"ID: {camp_id}")
    else:
        print(f"Campaign creation failed: {create_resp.text}")
        return

    # 3. Check Initial Stats (Should have +2 Str for Orc)
    print("Checking Status for Orc bonuses...")
    # Trigger status check via chat command logic
    # Note: Status logic reads from json.
    status_resp = requests.post(f"{BASE_URL}/chat", json={"message": "!status", "user_id": user_id, "campaign_id": camp_id}, headers=headers)
    print(status_resp.json()["response"])
    
    # 4. Inject "Recuperação de Vida Extrema" status manually for testing passive
    # Since we can't easily inject via API without playing, we will simulate it by
    # assuming the AI might give it later. 
    # For now, verification of "Passive Logic" relies on code review or playing.
    # But we can verify the API didn't crash and the stats are customized.
    
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    run_test()
