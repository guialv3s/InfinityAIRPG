import json
from pathlib import Path
import shutil

# Adjust path since this file is now in src/core/
# src/core/storage.py -> parent=src/core -> parent=src -> parent=root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

def get_user_dir(user_id: int) -> Path:
    user_path = DATA_DIR / str(user_id)
    user_path.mkdir(exist_ok=True)
    return user_path

def get_campaign_dir(user_id: int, campaign_id: str) -> Path:
    campaign_path = get_user_dir(user_id) / "campaigns" / campaign_id
    campaign_path.mkdir(parents=True, exist_ok=True)
    return campaign_path

def get_file_path(user_id: int, filename: str, campaign_id: str = None) -> Path:
    if campaign_id:
        return get_campaign_dir(user_id, campaign_id) / filename
    return get_user_dir(user_id) / filename

def load_json(user_id: int, filename: str, default=None, campaign_id: str = None):
    path = get_file_path(user_id, filename, campaign_id)
    if path.exists():
        try:
            with open(path, "r") as f:
                return json.load(f)
        except:
            return default
    return default

def save_json(user_id: int, filename: str, data, campaign_id: str = None):
    with open(get_file_path(user_id, filename, campaign_id), "w") as f:
        json.dump(data, f, indent=4)

def delete_file(user_id: int, filename: str, campaign_id: str = None):
    path = get_file_path(user_id, filename, campaign_id)
    if path.exists():
        path.unlink()
        
def reset_history(user_id: int, campaign_id: str = None):
    save_json(user_id, "history.json", [], campaign_id)

def delete_campaign_folder(user_id: int, campaign_id: str):
    path = get_campaign_dir(user_id, campaign_id)
    if path.exists():
        shutil.rmtree(path)
