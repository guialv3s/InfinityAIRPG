// --- Constants ---
const API_BASE_URL = ''; // Relative path for same-origin

// --- Auth State ---
let authToken = localStorage.getItem('rpg_auth_token');
let currentUser = null;

// --- Auth Functions ---
async function checkAuth(redirectIfAuthenticated = false) {
    if (!authToken) {
        if (!redirectIfAuthenticated) {
            // If we require auth (Dashboard/Game) and don't have it, go to landing
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
        }
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;

            // If we are on landing page and authenticated, go to dashboard
            if (redirectIfAuthenticated) {
                window.location.href = 'dashboard.html';
            }

            return currentUser;
        } else {
            // Invalid token
            logout();
            return null;
        }
    } catch (e) {
        console.error("Auth check failed:", e);
        // If critical auth failure on protected pages, logout/redirect
        if (!redirectIfAuthenticated) {
            window.location.href = 'index.html';
        }
        return null;
    }
}

function logout() {
    if (authToken) {
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    }
    authToken = null;
    localStorage.removeItem('rpg_auth_token');
    localStorage.removeItem('last_campaign_id');
    window.location.href = 'index.html';
}

function getAuthToken() {
    return authToken;
}

function setAuthToken(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('rpg_auth_token', token);
}

// Export functions if using modules, but for simple include:
// (Functions are global)
