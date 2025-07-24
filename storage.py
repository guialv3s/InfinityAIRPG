import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

def get_user_dir(user_id: int) -> Path:
    user_path = DATA_DIR / str(user_id)
    user_path.mkdir(exist_ok=True)
    return user_path

def get_file_path(user_id: int, filename: str) -> Path:
    return get_user_dir(user_id) / filename

def load_json(user_id: int, filename: str, default=None):
    path = get_file_path(user_id, filename)
    if path.exists():
        try:
            with open(path, "r") as f:
                return json.load(f)
        except:
            return default
    return default

def save_json(user_id: int, filename: str, data):
    with open(get_file_path(user_id, filename), "w") as f:
        json.dump(data, f, indent=4)

def delete_file(user_id: int, filename: str):
    path = get_file_path(user_id, filename)
    if path.exists():
        path.unlink()
        
def reset_history(user_id: int):
    save_json(user_id, "history.json", [])