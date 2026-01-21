import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta

# Base directory for session data
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SESSIONS_FILE = BASE_DIR / "data" / "sessions.json"

def ensure_sessions_file():
    """Ensure sessions.json exists"""
    SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not SESSIONS_FILE.exists():
        SESSIONS_FILE.write_text("{}")

def load_sessions():
    """Load all sessions from sessions.json"""
    ensure_sessions_file()
    with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_sessions(sessions):
    """Save sessions to sessions.json"""
    ensure_sessions_file()
    with open(SESSIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(sessions, f, indent=2)

def create_session(user_id: str) -> str:
    """Create a new session and return token"""
    sessions = load_sessions()
    
    # Generate unique token
    token = str(uuid.uuid4())
    
    # Create session with expiration (30 days)
    session = {
        "user_id": user_id,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
    }
    
    sessions[token] = session
    save_sessions(sessions)
    
    return token

def validate_session(token: str) -> str:
    """Validate session token and return user_id, or None if invalid"""
    sessions = load_sessions()
    
    if token not in sessions:
        return None
    
    session = sessions[token]
    
    # Check if expired
    expires_at = datetime.fromisoformat(session['expires_at'])
    if datetime.now() > expires_at:
        # Clean up expired session
        delete_session(token)
        return None
    
    return session['user_id']

def delete_session(token: str):
    """Delete a session (logout)"""
    sessions = load_sessions()
    
    if token in sessions:
        del sessions[token]
        save_sessions(sessions)
