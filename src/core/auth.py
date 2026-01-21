import bcrypt
import json
from pathlib import Path
from datetime import datetime

# Base directory for user data
BASE_DIR = Path(__file__).resolve().parent.parent.parent
USERS_FILE = BASE_DIR / "data" / "users.json"

def ensure_users_file():
    """Ensure users.json exists"""
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text("{}")

def load_users():
    """Load all users from users.json"""
    ensure_users_file()
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_users(users):
    """Save users to users.json"""
    ensure_users_file()
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_user(username: str, email: str, password: str) -> dict:
    """Create a new user"""
    users = load_users()
    
    # Check if username or email already exists
    for user_id, user_data in users.items():
        if user_data['username'].lower() == username.lower():
            raise ValueError("Username already exists")
        if user_data['email'].lower() == email.lower():
            raise ValueError("Email already exists")
    
    # Generate new user ID
    user_id = str(len(users) + 1)
    
    # Create user object
    user = {
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "created_at": datetime.now().isoformat()
    }
    
    users[user_id] = user
    save_users(users)
    
    return {"user_id": user_id, "username": username, "email": email}

def authenticate_user(username: str, password: str) -> dict:
    """Authenticate a user and return user info"""
    users = load_users()
    
    for user_id, user_data in users.items():
        if user_data['username'].lower() == username.lower():
            if verify_password(password, user_data['password_hash']):
                return {
                    "user_id": user_id,
                    "username": user_data['username'],
                    "email": user_data['email']
                }
            else:
                raise ValueError("Invalid password")
    
    raise ValueError("User not found")

def get_user_by_id(user_id: str) -> dict:
    """Get user info by ID"""
    users = load_users()
    
    if user_id in users:
        user = users[user_id]
        return {
            "user_id": user_id,
            "username": user['username'],
            "email": user['email']
        }
    
    raise ValueError("User not found")
