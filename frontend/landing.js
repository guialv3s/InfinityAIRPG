// --- Landing Page Logic ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Landing Page Script Loaded");

    // --- Elements ---
    const landingPage = document.getElementById('landing-page');
    const landingPlayBtn = document.getElementById('landing-play-btn');
    const landingLoginBtn = document.getElementById('landing-login-btn');

    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const showRegisterLink = document.getElementById('show-register');

    const registerModal = document.getElementById('register-modal');
    const registerForm = document.getElementById('register-form');
    const registerError = document.getElementById('register-error');
    const showLoginLink = document.getElementById('show-login');

    const overlay = document.getElementById('modal-overlay');
    const closeButtons = document.querySelectorAll('.close-modal');

    // --- Helpers ---
    function openModal(modal) {
        if (overlay) overlay.classList.remove('hidden');
        if (modal) modal.classList.remove('hidden');
    }

    function closeModal() {
        if (overlay) overlay.classList.add('hidden');
        if (loginModal) loginModal.classList.add('hidden');
        if (registerModal) registerModal.classList.add('hidden');
    }

    // --- Init ---
    // Check Auth is defined in auth.js (make sure auth.js is loaded first or defer handles order)
    if (typeof checkAuth === 'function') {
        checkAuth(true);
    } else {
        console.error("checkAuth function not found. verify auth.js loading.");
    }

    if (landingPage) {
        landingPage.classList.remove('hidden');
    } else {
        console.error("Landing page element #landing-page not found!");
    }

    // --- Event Listeners ---

    // Modals
    if (overlay) overlay.addEventListener('click', closeModal);
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

    // Play Button
    if (landingPlayBtn) {
        landingPlayBtn.addEventListener('click', () => {
            console.log("Play Button Clicked");
            openModal(loginModal);
        });
    } else {
        console.error("#landing-play-btn not found");
    }

    // Login (Nav) Button
    if (landingLoginBtn) {
        landingLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Nav Login Button Clicked");
            openModal(loginModal);
        });
    }

    // Switch to Register
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(); // Hide all
            openModal(registerModal);
        });
    }

    // Switch to Login
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(); // Hide all
            openModal(loginModal);
        });
    }

    // --- Form Handlers ---

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginError) loginError.classList.add('hidden');

            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const username = usernameInput ? usernameInput.value : '';
            const password = passwordInput ? passwordInput.value : '';

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    if (typeof setAuthToken === 'function') {
                        setAuthToken(data.token, data.user);
                        window.location.href = 'dashboard.html';
                    } else {
                        console.error("setAuthToken not found");
                        // Fallback
                        localStorage.setItem('rpg_auth_token', data.token);
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    if (loginError) {
                        loginError.innerText = data.error || "Erro ao fazer login";
                        loginError.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error("Login Error:", error);
                if (loginError) {
                    loginError.innerText = "Erro de conexão";
                    loginError.classList.remove('hidden');
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (registerError) registerError.classList.add('hidden');

            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const confirmEmail = document.getElementById('register-email-confirm').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;

            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, confirm_email: confirmEmail, password, confirm_password: confirmPassword })
                });

                const data = await response.json();

                if (response.ok) {
                    if (typeof setAuthToken === 'function') {
                        setAuthToken(data.token, data.user);
                        window.location.href = 'dashboard.html';
                    } else {
                        localStorage.setItem('rpg_auth_token', data.token);
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    if (registerError) {
                        registerError.innerText = data.error || "Erro ao cadastrar";
                        registerError.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error("Register Error:", error);
                if (registerError) {
                    registerError.innerText = "Erro de conexão";
                    registerError.classList.remove('hidden');
                }
            }
        });
    }

});
