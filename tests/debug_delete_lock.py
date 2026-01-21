
import requests
import time

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- Debugging Delete Lock ---")
    
    # Login
    username = "testuser_campaign"
    password = "password123"
    auth_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if auth_resp.status_code != 200:
        print("Login failed")
        return

    data = auth_resp.json()
    token = data.get("token")
    user_id = data.get("user")["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create
    print("Creating campaign...")
    camp_payload = {
        "user_id": user_id,
        "nome": "Lock Test",
        "classe": "Rogue",
        "tema": "Cyberpunk",
        "modo": "Easy"
    }
    create_resp = requests.post(f"{BASE_URL}/campaigns", json=camp_payload, headers=headers)
    camp_id = create_resp.json().get("campaign_id")
    print(f"Created {camp_id}")
    
    # Interact (Load History) to potentially open files
    print("Loading history (accessing files)...")
    requests.get(f"{BASE_URL}/campaigns/{camp_id}/history", headers=headers)
    
    # Interact (Chat) to write files
    print("Sending message (writing files)...")
    requests.post(f"{BASE_URL}/chat", json={
        "message": "Hello", 
        "user_id": user_id, 
        "campaign_id": camp_id
    }, headers=headers)
    
    # Try Delete Immediately
    print(f"Deleting campaign {camp_id} immediately...")
    del_resp = requests.delete(f"{BASE_URL}/campaigns/{camp_id}", headers=headers)
    
    if del_resp.status_code == 200:
        print("Delete successful!")
    else:
        print(f"Delete FAILED: {del_resp.status_code}")
        print(f"Error: {del_resp.text}")

if __name__ == "__main__":
    run_test()
