const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

// --- Elements ---
// --- Elements ---
const statusBtn = document.getElementById('status-btn');
const statusModal = document.getElementById('status-modal');
const statusContent = document.getElementById('status-content');

const userBtn = document.getElementById('user-btn');
const userModal = document.getElementById('user-modal');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');

const resetModal = document.getElementById('reset-modal');
const confirmResetBtn = document.getElementById('confirm-reset');
const cancelResetBtn = document.getElementById('cancel-reset');

// Creator
const creationModal = document.getElementById('creation-modal');
const creationForm = document.getElementById('creation-form');

// Sidebar
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('app-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const newCampaignBtn = document.getElementById('new-campaign-btn');
const campaignList = document.getElementById('campaign-list');
const sidebarUsername = document.getElementById('sidebar-username');

// Auth Elements
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

// Dashboard Elements
const dashboardContainer = document.getElementById('campaign-dashboard');
const dashboardNewBtn = document.getElementById('dashboard-new-campaign');
const dashboardContinueBtn = document.getElementById('dashboard-continue-campaign');

// Landing Page Elements
const landingPage = document.getElementById('landing-page');
const landingPlayBtn = document.getElementById('landing-play-btn');
const landingLoginBtn = document.getElementById('landing-login-btn');

// --- State ---
let authToken = localStorage.getItem('rpg_auth_token');
let currentUser = null;
let currentCampaignId = null;
let cachedCampaigns = [];

const chatContainer = document.querySelector('.chat-container');

// --- Auth Functions ---
async function checkAuth() {
    if (!authToken) {
        showLanding();
        return;
    }

    try {
        const response = await fetch('/auth/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            sidebarUsername.innerText = currentUser.username;

            // Auth Success

            // Check persistence (F5 reload logic)
            const lastCampaignId = localStorage.getItem('last_campaign_id');

            if (lastCampaignId) {
                // Return to last campaign
                showDashboard(); // Init dashboard in background
                dashboardContainer.classList.add('hidden'); // Hide it immediately
                if (chatContainer) chatContainer.classList.remove('hidden');

                await loadCampaigns(false); // Load data

                // Find and switch
                const target = cachedCampaigns.find(c => c.id === lastCampaignId);
                if (target) {
                    switchCampaign(target.id, null);
                } else {
                    // Invalid ID? Show dashboard
                    showDashboard();
                }
            } else {
                // Normal Login / No persistence
                showDashboard();
                loadCampaigns(false);
            }
        } else {
            logout();
        }
    } catch (e) {
        console.error("Auth check failed:", e);
        showLogin();
    }
}

// --- View Functions ---
function showLanding() {
    authToken = null;
    localStorage.removeItem('rpg_auth_token');
    localStorage.removeItem('last_campaign_id');

    if (chatContainer) chatContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
    if (landingPage) landingPage.classList.remove('hidden');

    closeModal();
}

function showLogin() {
    // Note: showLogin is now called when user clicks buttons on landing page
    if (landingPage) landingPage.classList.remove('hidden'); // Keep landing as bg if needed, or hide? 
    // Usually, login modal is shown over landing.

    openModal(loginModal);
    overlay.removeEventListener('click', closeModal);
}

function logout() {
    if (authToken) {
        fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    }
    authToken = null;
    localStorage.removeItem('rpg_auth_token');
    localStorage.removeItem('last_campaign_id'); // Clear persistence
    location.reload();
}

// --- Dashboard Logic ---
function showDashboard() {
    if (landingPage) landingPage.classList.add('hidden');
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.add('hidden');
    if (chatContainer) chatContainer.classList.add('hidden');

    dashboardContainer.classList.remove('hidden');

    // Update Continue Button State - Logic moved to loadCampaigns to prevent race conditions
    // But we init it here just in case
    if (!cachedCampaigns || cachedCampaigns.length === 0) {
        dashboardContinueBtn.disabled = true;
        dashboardContinueBtn.innerText = "Continuar Campanha";
    } else {
        dashboardContinueBtn.disabled = false;
        dashboardContinueBtn.innerText = `Continuar Campanha (${cachedCampaigns.length})`;
    }
}

if (dashboardNewBtn) {
    dashboardNewBtn.addEventListener('click', () => {
        openModal(creationModal);
    });
}

if (dashboardContinueBtn) {
    dashboardContinueBtn.addEventListener('click', async () => {
        // Refresh list first to be sure
        await loadCampaigns(false);

        if (cachedCampaigns.length === 0) {
            // No campaigns, redirect to new
            alert("Você ainda não tem campanhas. Vamos criar uma!");
            openModal(creationModal);
        } else {
            // Open Sidebar list (or a specific modal if preferred, but sidebar works as list)
            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden'); // Use overlay for sidebar focus if desired?
            // Actually sidebar usually slides in. Let's just open sidebar.
            // For better UX, let's open sidebar and hide dashboard? No, dashboard is background.
            // Let's create a "Select Campaign" modal logic or reuse sidebar. 
            // User requested: "clicar em continuar... deve aparecer um modal com as campanhas"
            // Since sidebar ACTS as that list, let's open it.
            // Or better: Let's reuse the sidebar as a "Modal" effect here.
            sidebar.classList.remove('hidden');
        }
    });
}


// --- Landing Page Interaction ---
if (landingPlayBtn) {
    landingPlayBtn.addEventListener('click', () => {
        showLogin();
    });
}

if (landingLoginBtn) {
    landingLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });
}

// --- Login / Register Handlers ---
async function handleLogin(e) {
    e.preventDefault();
    loginError.classList.add('hidden');

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('rpg_auth_token', authToken);

            overlay.addEventListener('click', closeModal);
            closeModal();

            // SUCCESS -> Dashboard
            localStorage.removeItem('last_campaign_id'); // Ensure fresh login does not auto-resume
            showDashboard();
            loadCampaigns(false);
        } else {
            loginError.innerText = data.error || "Erro ao fazer login";
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        loginError.innerText = "Erro de conexão";
        loginError.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    registerError.classList.add('hidden');

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
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('rpg_auth_token', authToken);

            overlay.addEventListener('click', closeModal);
            closeModal();

            // SUCCESS -> Dashboard
            showDashboard();
            loadCampaigns(false);
        } else {
            registerError.innerText = data.error || "Erro ao cadastrar";
            registerError.classList.remove('hidden');
        }
    } catch (error) {
        registerError.innerText = "Erro de conexão";
        registerError.classList.remove('hidden');
    }
}

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('hidden'); openModal(registerModal); });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerModal.classList.add('hidden'); openModal(loginModal); });

// --- Campaign Logic ---

const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

let campaignToDeleteId = null;

// --- Campaign Logic ---

async function loadCampaigns(autoSelect = true) {
    try {
        const response = await fetch('/campaigns', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        const campaigns = data.campaigns;
        cachedCampaigns = campaigns; // Cache it

        campaignList.innerHTML = '';

        // Update Continue Button State
        if (dashboardContinueBtn) {
            dashboardContinueBtn.disabled = (!campaigns || campaigns.length === 0);
            if (campaigns && campaigns.length > 0) {
                dashboardContinueBtn.innerText = `Continuar Campanha (${campaigns.length})`;
            } else {
                dashboardContinueBtn.innerText = "Continuar Campanha";
            }
        }

        if (!campaigns || campaigns.length === 0) {
            // No campaigns
            if (autoSelect) {
                // openModal(creationModal); // No longer auto-open
            }
        } else {
            campaigns.forEach(camp => {
                const el = document.createElement('div');
                el.className = 'campaign-item';
                // HTML structure change for button
                el.innerHTML = `
                    <div class="campaign-info">
                        <div class="campaign-name">${camp.name}</div>
                        <div class="campaign-meta">${new Date(camp.last_played).toLocaleDateString()}</div>
                    </div>
                    <button class="delete-btn" title="Excluir Campanha" data-id="${camp.id}">🗑️</button>
                `;

                // Click on item switches campaign
                el.addEventListener('click', (e) => {
                    // Ignore clicks on the delete button
                    if (e.target.closest('.delete-btn')) return;
                    switchCampaign(camp.id, el);
                });

                // Delete Button Logic
                const delBtn = el.querySelector('.delete-btn');
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Stop bubbling to item click
                    campaignToDeleteId = camp.id;
                    openModal(deleteModal);
                });

                campaignList.appendChild(el);
            });

            // Auto select logic - REMOVED to keep user on Dashboard
            /*
            if (!currentCampaignId && campaigns.length > 0) {
                switchCampaign(campaigns[0].id, campaignList.firstChild);
            }
            */
        }
    } catch (e) {
        console.error("Failed to load campaigns", e);
    }
}

async function switchCampaign(id, element) {
    currentCampaignId = id;
    localStorage.setItem('last_campaign_id', id); // Persist selection

    // Switch View: Dashboard -> Chat
    dashboardContainer.classList.add('hidden');
    sidebar.classList.add('hidden'); // Close sidebar if open
    overlay.classList.add('hidden'); // FIX: Hide overlay (blur) explicitly
    chatContainer.classList.remove('hidden');

    // UI Active State
    document.querySelectorAll('.campaign-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Load History
    messagesDiv.innerHTML = ''; // Clear chat
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = `<div class="bubble">Carregando histórico...</div>`;
    messagesDiv.appendChild(loadingDiv);

    try {
        const response = await fetch(`/campaigns/${id}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        messagesDiv.removeChild(loadingDiv);

        if (data.history && data.history.length > 0) {
            for (const msg of data.history) {
                if (msg.role === 'user') await appendMessage(msg.content, 'user', false);
                if (msg.role === 'assistant') await appendMessage(msg.content, 'bot', false);
            }
        } else {
            // Should not happen for existing campaigns, but just in case
            await appendMessage("Campanha carregada. Histórico vazio.", 'system');
        }
        scrollToBottom();

        // Hide sidebar on mobile after selection
        if (window.innerWidth < 768) {
            sidebar.classList.add('hidden');
            if (chatContainer) {
                chatContainer.classList.remove('sidebar-open');
            }
        }

    } catch (e) {
        messagesDiv.innerHTML = '';
        await appendMessage("Erro ao carregar histórico.", 'system');
    }
}


// --- Sidebar ---
const mainContent = document.getElementById('main-content'); // Add this selector

// --- Sidebar ---
menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    // Adjust layout wrapper
    if (mainContent) {
        mainContent.classList.toggle('sidebar-open');
    }
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    if (mainContent) {
        mainContent.classList.remove('sidebar-open');
    }
});

newCampaignBtn.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    if (mainContent) {
        mainContent.classList.remove('sidebar-open');
    }
    openModal(creationModal);
});


// --- Delete Logic ---
cancelDeleteBtn.addEventListener('click', () => {
    closeModal();
    campaignToDeleteId = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!campaignToDeleteId) return;

    try {
        const response = await fetch(`/campaigns/${campaignToDeleteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            // If we deleted the current campaign, clear context
            if (currentCampaignId === campaignToDeleteId) {
                currentCampaignId = null;
                messagesDiv.innerHTML = '';
            }
            closeModal();
            loadCampaigns(); // Refresh list
        } else {
            alert("Erro ao excluir campanha.");
        }
    } catch (e) {
        alert("Erro de conexão.");
    }
});


// --- Helper Functions ---
function scrollToBottom() { messagesDiv.scrollTop = messagesDiv.scrollHeight; }

// Remove JSON code blocks from text (they're only for the LLM)
function stripJsonBlocks(text) {
    // Remove ```json ... ``` blocks
    return text.replace(/```json[\s\S]*?```/gi, '').trim();
}

// Custom Markdown Parser to avoid CDN issues
function parseMarkdown(text) {
    let md = text;

    // 1. Code Blocks (```code```)
    md = md.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // 2. Bold (**text**)
    md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Italic (*text*)
    md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 4. Underscore Italic (_text_)
    md = md.replace(/_(.*?)_/g, '<em>$1</em>');

    // 5. Unordered Lists (- item) - handle start of line or newline
    md = md.replace(/(?:^|\n)- (.*)/g, '<br>• $1');

    // 6. Line Breaks (convert remaining \n to <br>)
    // Be careful not to double break inside pre/code if we were advanced, 
    // but for simple chat, just converting is usually fine or we do it last.
    // However, pre-blocks usually preserve whitespace.
    // Let's do a safe <br> conversion for non-pre blocks? 
    // For simplicity: Replace \n with <br> everywhere EXCEPT if we are smart. 
    // The previous implementation used replace(\n, <br>).
    // Let's keep it simple.
    md = md.replace(/\n/g, '<br>');

    return md;
}

function appendMessage(text, sender, typewriter = false) {
    return new Promise((resolve) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);

        // Strip JSON blocks from bot messages before displaying
        let displayText = text;
        if (sender === 'bot') {
            displayText = stripJsonBlocks(text);
        }

        const htmlContent = parseMarkdown(displayText);

        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        bubble.innerHTML = htmlContent;

        msgDiv.appendChild(bubble);
        messagesDiv.appendChild(msgDiv);
        scrollToBottom();
        resolve();
    });
}

function openModal(modal) { overlay.classList.remove('hidden'); modal.classList.remove('hidden'); }
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const statusModal = document.getElementById('status-modal');
    const resetModal = document.getElementById('reset-modal');
    const deleteModal = document.getElementById('delete-modal');
    const creationModal = document.getElementById('creation-modal');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const userModal = document.getElementById('user-modal');

    if (overlay) overlay.classList.add('hidden');
    if (statusModal) statusModal.classList.add('hidden');
    if (resetModal) resetModal.classList.add('hidden');
    if (deleteModal) deleteModal.classList.add('hidden');
    if (creationModal) creationModal.classList.add('hidden');
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.add('hidden');
    if (userModal) userModal.classList.add('hidden');
}
overlay.addEventListener('click', closeModal);
closeButtons.forEach(btn => btn.addEventListener('click', closeModal));


// --- User Profile ---
userBtn.addEventListener('click', () => {
    if (!currentUser) return showLogin();
    profileUsername.value = currentUser.username;
    profileEmail.value = currentUser.email;
    openModal(userModal);
});
logoutBtn.addEventListener('click', logout);


// --- Game Logic ---

checkAuth(); // Initial Load

// Create Campaign
creationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('char-name').value;
    const race = document.getElementById('char-race').value;
    const charClass = document.getElementById('char-class').value;
    const theme = document.getElementById('char-theme').value;
    const mode = document.getElementById('char-mode').value;

    const submitBtn = creationForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Criando mundo...";
    submitBtn.disabled = true;

    // Do NOT hide modal yet. Wait for success.
    // Do NOT clear messagesDiv yet.

    try {
        const response = await fetch('/campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                user_id: parseInt(currentUser.user_id),
                nome: name,
                raca: race,
                classe: charClass,
                tema: theme,
                modo: mode
            })
        });

        const data = await response.json();

        if (data.campaign_id) {
            currentCampaignId = data.campaign_id;

            // Success! NOW switch views.
            creationModal.classList.add('hidden');
            overlay.classList.add('hidden');

            // Switch View: Dashboard -> Chat
            dashboardContainer.classList.add('hidden');
            if (mainContent) mainContent.classList.toggle('sidebar-open', false); // Ensure sidebar state is clean
            chatContainer.classList.remove('hidden');

            messagesDiv.innerHTML = '';
            await appendMessage(data.response, 'bot', true);
            loadCampaigns(false); // Refresh list in background
        } else {
            alert("Erro ao criar campanha: " + (data.error || "Desconhecido"));
        }

    } catch (error) {
        alert("Erro ao conectar ao servidor.");
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});


async function sendMessage() {
    if (!currentUser) return showLogin();
    if (!currentCampaignId) return alert("Crie ou selecione uma campanha!");

    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    userInput.disabled = true;

    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'bot');
    loadingDiv.innerHTML = `<div class="bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    messagesDiv.appendChild(loadingDiv);
    scrollToBottom();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: we're not sending Bearer token to chat endpoint yet based on previous code
                // But we ARE sending campaign_id now
            },
            body: JSON.stringify({
                message: text,
                user_id: parseInt(currentUser.user_id),
                campaign_id: currentCampaignId
            })
        });

        const data = await response.json();
        messagesDiv.removeChild(loadingDiv);

        if (data.response) {
            await appendMessage(data.response, 'bot', true);
        } else if (data.error) {
            await appendMessage("Erro arcano: " + data.error, 'bot');
        }
    } catch (error) {
        messagesDiv.removeChild(loadingDiv);
        await appendMessage("Erro de conexão.", 'bot');
    }
    userInput.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });


// Status
statusBtn.addEventListener('click', async () => {
    if (!currentUser || !currentCampaignId) return;
    openModal(statusModal);
    statusContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "!status",
                user_id: parseInt(currentUser.user_id),
                campaign_id: currentCampaignId
            })
        });
        const data = await response.json();
        statusContent.innerText = data.response || "Erro.";
    } catch (e) {
        statusContent.innerText = "Erro de conexão.";
    }
});

// Reset
resetBtn.addEventListener('click', () => {
    if (!currentUser || !currentCampaignId) return;
    openModal(resetModal);
});

cancelResetBtn.addEventListener('click', closeModal);
confirmResetBtn.addEventListener('click', async () => {
    try {
        await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "!resetar",
                user_id: parseInt(currentUser.user_id),
                campaign_id: currentCampaignId
            })
        });
        closeModal();
        messagesDiv.innerHTML = '';
        openModal(creationModal); // Ask to create new char on reset
        document.getElementById('creation-form').reset();
    } catch (e) {
        alert("Erro ao resetar: " + e);
    }
});
