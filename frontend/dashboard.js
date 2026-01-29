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

const deleteModal = document.getElementById('delete-modal');

let cachedCampaigns = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    initModalSystem(); // Initialize modal system

    const user = await checkAuth();
    if (user) {
        sidebarUsername.innerText = user.username;
        await loadCampaigns();
    }
});

// --- Functions ---

async function loadCampaigns() {
    cachedCampaigns = await loadAndRenderCampaigns('campaign-list', {
        showDelete: true,
        onDeleteClick: () => loadCampaigns() // Reload on delete
    });

    // Update continue button
    if (dashboardContinueBtn) {
        dashboardContinueBtn.disabled = cachedCampaigns.length === 0;
        dashboardContinueBtn.innerText = cachedCampaigns.length > 0
            ? `Continuar Campanha (${cachedCampaigns.length})`
            : "Continuar Campanha";
    }
}

function openCreationFlow() {
    if (window.openCharacterCreationModal) {
        window.openCharacterCreationModal(handleCharacterCreationSubmit);
    } else {
        alert("Erro: Modal de criação não carregado.");
    }
}

async function handleCharacterCreationSubmit(charData) {
    try {
        const data = await apiPost('/campaigns', {
            user_id: parseInt(currentUser.user_id),
            ...charData
        });

        if (data.campaign_id) {
            window.location.href = `game.html?campaign_id=${data.campaign_id}`;
        } else {
            throw new Error(data.error || data.detail || "Erro desconhecido");
        }
    } catch (error) {
        throw error; // Re-throw to be caught by modal error handler
    }
}

// --- Event Listeners ---

if (dashboardNewBtn) dashboardNewBtn.addEventListener('click', openCreationFlow);
if (newCampaignBtn) newCampaignBtn.addEventListener('click', () => {
    closeAllModals();
    openCreationFlow();
});

if (dashboardContinueBtn) {
    dashboardContinueBtn.addEventListener('click', async () => {
        await loadCampaigns();
        if (cachedCampaigns.length === 0) {
            alert("Você ainda não tem campanhas. Vamos criar uma!");
            openCreationFlow();
        } else {
            openModal(sidebar);
        }
    });
}

if (closeSidebar) closeSidebar.addEventListener('click', closeAllModals);
if (logoutBtn) logoutBtn.addEventListener('click', logout);
