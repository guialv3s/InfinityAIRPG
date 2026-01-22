// --- Elements ---
const dashboardContainer = document.getElementById('campaign-dashboard');
const dashboardNewBtn = document.getElementById('dashboard-new-campaign');
const dashboardContinueBtn = document.getElementById('dashboard-continue-campaign');

const sidebar = document.getElementById('app-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const newCampaignBtn = document.getElementById('new-campaign-btn');
const campaignList = document.getElementById('campaign-list');
const sidebarUsername = document.getElementById('sidebar-username');
const logoutBtn = document.getElementById('logout-btn');

const modalOverlay = document.getElementById('modal-overlay');
const creationModal = document.getElementById('creation-modal');
const creationForm = document.getElementById('creation-form');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const closeButtons = document.querySelectorAll('.close-modal');

let cachedCampaigns = [];
let campaignToDeleteId = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (user) {
        sidebarUsername.innerText = user.username;
        loadCampaigns();
    }
});

// --- Functions ---

function openModal(modal) {
    if (modalOverlay) modalOverlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.add('hidden');
    if (creationModal) creationModal.classList.add('hidden');
    if (deleteModal) deleteModal.classList.add('hidden');
    if (sidebar) sidebar.classList.add('hidden');
}

if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

async function loadCampaigns() {
    try {
        const response = await fetch('/campaigns', {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        const campaigns = data.campaigns;
        cachedCampaigns = campaigns;

        campaignList.innerHTML = '';

        if (dashboardContinueBtn) {
            dashboardContinueBtn.disabled = (!campaigns || campaigns.length === 0);
            dashboardContinueBtn.innerText = (campaigns && campaigns.length > 0)
                ? `Continuar Campanha (${campaigns.length})`
                : "Continuar Campanha";
        }

        if (campaigns) {
            campaigns.forEach(camp => {
                const el = document.createElement('div');
                el.className = 'campaign-item';
                el.innerHTML = `
                    <div class="campaign-info">
                        <div class="campaign-name">${camp.name}</div>
                        <div class="campaign-meta">${new Date(camp.last_played).toLocaleDateString()}</div>
                    </div>
                    <button class="delete-btn" title="Excluir Campanha" data-id="${camp.id}">🗑️</button>
                `;

                el.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-btn')) return;
                    window.location.href = `game.html?campaign_id=${camp.id}`;
                });

                const delBtn = el.querySelector('.delete-btn');
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    campaignToDeleteId = camp.id;
                    openModal(deleteModal);
                });

                campaignList.appendChild(el);
            });
        }
    } catch (e) {
        console.error("Failed to load campaigns", e);
    }
}

// --- Event Listeners ---

if (dashboardNewBtn) dashboardNewBtn.addEventListener('click', () => openModal(creationModal));
if (newCampaignBtn) newCampaignBtn.addEventListener('click', () => { closeModal(); openModal(creationModal); });

if (dashboardContinueBtn) {
    dashboardContinueBtn.addEventListener('click', async () => {
        await loadCampaigns();
        if (cachedCampaigns.length === 0) {
            alert("Você ainda não tem campanhas. Vamos criar uma!");
            openModal(creationModal);
        } else {
            if (sidebar) {
                sidebar.classList.remove('hidden');
                if (modalOverlay) modalOverlay.classList.remove('hidden');
            }
        }
    });
}

if (closeSidebar) closeSidebar.addEventListener('click', closeModal);
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// Create Campaign
if (creationForm) {
    creationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = creationForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        // Use the new helper to get complex data
        const charData = window.getCharacterData();
        if (!charData) return; // Validation failed

        // Loading
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
                    ...charData // Spreads name, race, class, theme, mode, backstory, attributes
                })
            });

            const data = await response.json();

            if (data.campaign_id) {
                window.location.href = `game.html?campaign_id=${data.campaign_id}`;
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

// Delete Campaign
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!campaignToDeleteId) return;

        try {
            const response = await fetch(`/campaigns/${campaignToDeleteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                closeModal();
                loadCampaigns();
            } else {
                alert("Erro ao excluir campanha.");
            }
        } catch (e) {
            alert("Erro de conexão.");
        }
    });
}

if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
