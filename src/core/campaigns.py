from datetime import datetime
import uuid
from .storage import load_json, save_json

MANIFEST_FILE = "campaigns.json"

def get_campaigns(user_id: int):
    """List all campaigns for a user"""
    return load_json(user_id, MANIFEST_FILE, default=[])

def create_campaign(user_id: int, name: str, theme: str, class_name: str, mode: str):
    """Create a new campaign and return its ID"""
    campaigns = get_campaigns(user_id)
    
    campaign_id = str(uuid.uuid4())[:8] # Short UUID for ID
    
    new_campaign = {
        "id": campaign_id,
        "name": name, # Usually "Character Name - Theme"
        "theme": theme,
        "class": class_name,
        "mode": mode,
        "created_at": datetime.now().isoformat(),
        "last_played": datetime.now().isoformat()
    }
    
    campaigns.append(new_campaign)
    save_json(user_id, MANIFEST_FILE, campaigns)
    
    return campaign_id

def update_campaign_activity(user_id: int, campaign_id: str):
    """Update last_played timestamp"""
    campaigns = get_campaigns(user_id)
    for camp in campaigns:
        if camp["id"] == campaign_id:
            camp["last_played"] = datetime.now().isoformat()
            save_json(user_id, MANIFEST_FILE, campaigns)
            break

def get_campaign_details(user_id: int, campaign_id: str):
    """Get metadata for a specific campaign"""
    campaigns = get_campaigns(user_id)
    for camp in campaigns:
        if camp["id"] == campaign_id:
            return camp
    return None

def delete_campaign(user_id: int, campaign_id: str):
    """Delete a campaign entirely"""
    campaigns = get_campaigns(user_id)
    
    # Filter out the campaign to delete
    new_campaigns = [c for c in campaigns if c["id"] != campaign_id]
    
    if len(new_campaigns) == len(campaigns):
        return False # Not found
        
    save_json(user_id, MANIFEST_FILE, new_campaigns)
    
    from .storage import delete_campaign_folder
    delete_campaign_folder(user_id, campaign_id)
    
    return True
