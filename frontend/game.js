// --- Elements ---
const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

const statusBtn = document.getElementById('status-btn');
const statusModal = document.getElementById('status-modal');
const statusContent = document.getElementById('status-content');

// User Profile (Now triggered from Sidebar)
const userProfileTrigger = document.getElementById('user-profile-trigger');
const userModal = document.getElementById('user-modal');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');

const resetModal = document.getElementById('reset-modal');
const confirmResetBtn = document.getElementById('confirm-reset');
const cancelResetBtn = document.getElementById('cancel-reset');

// Delete Modal (Sidebar)
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
let campaignToDeleteId = null;

// Sidebar & Creation
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('app-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const backToDashboardBtn = document.getElementById('back-dashboard-btn');
const sidebarUsername = document.getElementById('sidebar-username');
const sidebarNewCampaignBtn = document.getElementById('sidebar-new-campaign-btn');
const sidebarCampaignList = document.getElementById('sidebar-campaign-list');
const creationModal = document.getElementById('creation-modal');
const creationForm = document.getElementById('creation-form');

const mainContent = document.getElementById('main-content');
const modalOverlay = document.getElementById('modal-overlay');
const closeButtons = document.querySelectorAll('.close-modal');

let currentCampaignId = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return; // checkAuth handles redirect

    sidebarUsername.innerText = user.username;

    // Get Campaign ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentCampaignId = urlParams.get('campaign_id');

    if (!currentCampaignId) {
        alert("Campanha não especificada!");
        window.location.href = 'dashboard.html';
        return;
    }

    loadHistory();
    loadSidebarCampaigns(); // Load campaigns for the sidebar list

    // Initialize inventory sidebar after auth is ready
    if (window.initSidebar) {
        window.initSidebar();
    }
});

// --- View Functions ---
function openModal(modal) {
    if (modalOverlay) modalOverlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.add('hidden');
    if (statusModal) statusModal.classList.add('hidden');
    if (resetModal) resetModal.classList.add('hidden');
    if (userModal) userModal.classList.add('hidden');
    if (creationModal) creationModal.classList.add('hidden');
    if (deleteModal) deleteModal.classList.add('hidden');
    if (sidebar) sidebar.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('sidebar-open');
}

if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

// --- Logic ---

async function loadSidebarCampaigns() {
    try {
        sidebarCampaignList.innerHTML = '<div style="color: #aaa; padding: 10px;">Carregando...</div>';
        const response = await fetch('/campaigns', {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        const campaigns = data.campaigns;

        sidebarCampaignList.innerHTML = '';
        if (campaigns && campaigns.length > 0) {
            campaigns.forEach(camp => {
                const el = document.createElement('div');
                el.className = 'campaign-item';
                el.style.padding = '8px';
                el.style.marginBottom = '5px';
                el.style.backgroundColor = (camp.id == currentCampaignId) ? 'rgba(187, 134, 252, 0.2)' : 'rgba(255,255,255,0.05)';
                el.innerHTML = `
                    <div class="campaign-name" style="font-size: 0.9rem;">${camp.name}</div>
                    <button class="delete-btn-mini" title="Excluir" style="background:none; border:none; color: #ff4d4d; cursor: pointer; opacity: 0.6;">🗑️</button>
                `;

                // Click to Open (delegated)
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-btn-mini')) return;
                    if (camp.id != currentCampaignId) {
                        window.location.href = `game.html?campaign_id=${camp.id}`;
                    }
                });

                // Delete Action
                const delBtn = el.querySelector('.delete-btn-mini');
                delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    campaignToDeleteId = camp.id; // Store ID
                    openModal(deleteModal); // Open Modal
                });

                sidebarCampaignList.appendChild(el);
            });
        } else {
            sidebarCampaignList.innerHTML = '<div style="color: #aaa; padding: 10px;">Nenhuma campanha.</div>';
        }
    } catch (e) {
        console.error("Failed to load campaigns", e);
    }
}

async function loadHistory() {
    messagesDiv.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.innerHTML = `<div class="bubble">Carregando histórico...</div>`;
    messagesDiv.appendChild(loadingDiv);

    try {
        const response = await fetch(`/campaigns/${currentCampaignId}/history`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();

        messagesDiv.removeChild(loadingDiv);

        if (data.history && data.history.length > 0) {
            for (const msg of data.history) {
                if (msg.role === 'user') await appendMessage(msg.content, 'user', false);
                if (msg.role === 'assistant') await appendMessage(msg.content, 'bot', false);
            }
        } else {
            await appendMessage("Campanha carregada. Histórico vazio.", 'system');
        }
        scrollToBottom();
    } catch (e) {
        messagesDiv.innerHTML = '';
        await appendMessage("Erro ao carregar histórico.", 'system');
    }
}

async function sendMessage() {
    try {
        const text = userInput.value.trim();
        if (!text) return;

        // VERIFY DOM
        if (!messagesDiv) {
            alert("ERRO FATAL: Elemento 'messagesDiv' não encontrado!");
            return;
        }

        // DEBUG STEPS
        // alert("Passo 1: appendMessage");
        await appendMessage(text, 'user');

        userInput.value = '';
        userInput.disabled = true;
        userInput.placeholder = " Aguardando a ação do mestre... ";

        if (!currentUser) {
            alert("ERRO: Usuário perdido/null.");
            userInput.disabled = false;
            return;
        }

        // alert("Passo 2: Criando loading");
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot');
        loadingDiv.innerHTML = `<div class="bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
        messagesDiv.appendChild(loadingDiv);
        scrollToBottom();

        // alert("Passo 3: Fetching...");
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: text,
                user_id: parseInt(currentUser.user_id),
                campaign_id: currentCampaignId
            })
        });

        // alert("Passo 4: Response status " + response.status);
        const data = await response.json();

        if (messagesDiv.contains(loadingDiv)) messagesDiv.removeChild(loadingDiv);

        if (data.response) {
            await appendMessage(data.response, 'bot', true);

            // Refresh sidebar AFTER message is fully displayed
            // Add delay to ensure backend has processed the JSON
            setTimeout(() => {
                if (window.refreshSidebar) {
                    console.log('[GAME] Refreshing sidebar after AI response');
                    window.refreshSidebar();
                }
            }, 500);
        } else if (data.error) {
            await appendMessage("Erro do Servidor: " + data.error, 'bot');
            const msg = Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail);
            await appendMessage("Erro de Validação: " + msg, 'bot');
        }
    } catch (error) {
        if (messagesDiv.contains(loadingDiv)) messagesDiv.removeChild(loadingDiv);
        alert("Erro no chat: " + error.message);
    } finally {
        userInput.disabled = false;
        userInput.placeholder = "Digite sua ação...";
        userInput.focus();
    }
}

// --- Helper Functions ---
function scrollToBottom() { messagesDiv.scrollTop = messagesDiv.scrollHeight; }

function stripJsonBlocks(text) {
    return text.replace(/```json[\s\S]*?```/gi, '').trim();
}

function parseMarkdown(text) {
    let md = text;
    md = md.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
    md = md.replace(/_(.*?)_/g, '<em>$1</em>');
    md = md.replace(/(?:^|\n)- (.*)/g, '<br>• $1');
    md = md.replace(/\n/g, '<br>');
    return md;
}

function appendMessage(text, sender, typewriter = false) {
    return new Promise((resolve) => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);

        let displayText = text;
        if (sender === 'bot') {
            displayText = stripJsonBlocks(text);
        }

        const htmlContent = parseMarkdown(displayText);

        const bubble = document.createElement('div');
        bubble.classList.add('bubble');

        if (sender === 'bot' && typewriter) {
            // Typing Effect Logic
            let i = 0;
            const speed = 10; // ms per char

            // Regex to match HTML tags
            const tagRegex = /<[^>]*>/g;
            let tags = [];
            let match;
            while ((match = tagRegex.exec(htmlContent)) !== null) {
                tags.push({ index: match.index, content: match[0], length: match[0].length });
            }

            msgDiv.appendChild(bubble);
            messagesDiv.appendChild(msgDiv);

            function typeWriter() {
                if (i < htmlContent.length) {
                    // Check if current position starts a tag
                    const tag = tags.find(t => t.index === i);
                    if (tag) {
                        bubble.innerHTML += tag.content;
                        i += tag.length;
                    } else {
                        // Safe char append
                        bubble.innerHTML += htmlContent.charAt(i);
                        i++;
                    }
                    scrollToBottom();
                    setTimeout(typeWriter, speed);
                } else {
                    resolve();
                }
            }
            typeWriter();
        } else {
            bubble.innerHTML = htmlContent;
            msgDiv.appendChild(bubble);
            messagesDiv.appendChild(msgDiv);
            scrollToBottom();
            resolve();
        }
    });
}

// --- Event Listeners ---

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// Status button removed - inventory is now always visible in sidebar
// statusBtn.addEventListener('click', async () => {
//     openModal(statusModal);
//     statusContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

//     try {
//         const response = await fetch('/chat', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 message: "!status",
//                 user_id: parseInt(currentUser.user_id),
//                 campaign_id: currentCampaignId
//             })
//         });
//         const data = await response.json();
//         statusContent.innerText = data.response || "Erro.";
//     } catch (e) {
//         statusContent.innerText = "Erro de conexão.";
//     }
// });

resetBtn.addEventListener('click', () => {
    openModal(resetModal);
});

if (cancelResetBtn) cancelResetBtn.addEventListener('click', closeModal);
if (confirmResetBtn) confirmResetBtn.addEventListener('click', async () => {
    try {
        // Updated Logic: Delete campaign and open new campaign modal
        await fetch(`/campaigns/${currentCampaignId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        closeModal();
        messagesDiv.innerHTML = '';

        // Remove campaign_id from URL without refreshing
        const url = new URL(window.location);
        url.searchParams.delete('campaign_id');
        window.history.pushState({}, '', url);

        // Open Creation Modal
        openModal(creationModal);

        // Prevent closing sidebar if it acts as background
        // ...

    } catch (e) {
        alert("Erro ao resetar: " + e);
    }
});

// Sidebar & Menus
menuBtn.addEventListener('click', () => {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('active'); // Ensure CSS handles this if needed, or just remove hidden
    mainContent.classList.toggle('sidebar-open');
    if (modalOverlay) modalOverlay.classList.remove('hidden'); // Use overlay for focus
});

if (closeSidebar) closeSidebar.addEventListener('click', closeModal);

if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
}

// Sidebar New Campaign
if (sidebarNewCampaignBtn) {
    sidebarNewCampaignBtn.addEventListener('click', () => {
        // If on sidebar on mobile, maybe close sidebar or keep it?
        // Let's close sidebar on mobile but overlay is needed for modal.
        // Actually, just opening modal over sidebar works because of z-index.
        openModal(creationModal);
    });
}

// Creation Form Logic (Copied from dashboard.js)
if (creationForm) {
    creationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = creationForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        // Use new helper
        const charData = window.getCharacterData();
        if (!charData) return;

        // Loading State
        submitBtn.innerHTML = '<div class="typing-indicator" style="display: flex; justify-content: center; align-items: center;"><span></span><span></span><span></span></div>';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    user_id: parseInt(currentUser.user_id),
                    ...charData
                })
            });

            const data = await response.json();

            if (data.campaign_id) {
                // Reload to load the new campaign
                window.location.search = `?campaign_id=${data.campaign_id}`;
            } else {
                console.error("Erro na criação:", data);
                let msg = "Erro desconhecido";
                if (data.error) msg = data.error;
                else if (data.detail) msg = JSON.stringify(data.detail);

                alert("Erro ao criar campanha: " + msg);
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            alert("Erro ao conectar ao servidor.");
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// User Profile Trigger
if (userProfileTrigger) {
    userProfileTrigger.addEventListener('click', () => {
        profileUsername.value = currentUser.username;
        profileEmail.value = currentUser.email;
        openModal(userModal);
    });
}

if (logoutBtn) logoutBtn.addEventListener('click', () => { logout(); });

// Delete Modal Actions
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!campaignToDeleteId) return;

        try {
            await fetch(`/campaigns/${campaignToDeleteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            closeModal();

            // If we deleted the current campaign, go to dashboard
            if (campaignToDeleteId == currentCampaignId) {
                window.location.href = 'dashboard.html';
            } else {
                // Otherwise reload the sidebar list
                loadSidebarCampaigns();
            }
        } catch (e) {
            alert("Erro ao excluir campanha.");
        }
    });
}

if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
