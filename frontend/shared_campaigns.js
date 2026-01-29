// shared_campaigns.js - Campaign Management

/**
 * Fetch all campaigns for current user
 */
async function fetchCampaigns() {
    try {
        const data = await apiGet('/campaigns');
        return data.campaigns || [];
    } catch (error) {
        console.error('Failed to fetch campaigns:', error);
        return [];
    }
}

/**
 * Delete a campaign
 */
async function deleteCampaign(campaignId) {
    try {
        await apiDelete(`/campaigns/${campaignId}`);
        return true;
    } catch (error) {
        console.error('Failed to delete campaign:', error);
        alert('Erro ao excluir campanha.');
        return false;
    }
}

/**
 * Navigate to a campaign
 */
function navigateToCampaign(campaignId) {
    window.location.href = `game.html?campaign_id=${campaignId}`;
}

/**
 * Render campaign list in a container
 * @param {HTMLElement} container - Container element
 * @param {Array} campaigns - Array of campaign objects
 * @param {Object} options - Rendering options
 */
function renderCampaignList(container, campaigns, options = {}) {
    const {
        showDelete = true,
        onCampaignClick = navigateToCampaign,
        onDeleteClick = null
    } = options;

    container.innerHTML = '';

    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<div style="color: #aaa; padding: 10px; text-align: center;">Nenhuma campanha encontrada.</div>';
        return;
    }

    campaigns.forEach(campaign => {
        const el = document.createElement('div');
        el.className = 'campaign-item';
        el.style.cursor = 'pointer';

        el.innerHTML = `
            <div class="campaign-info">
                <div class="campaign-name">${campaign.name}</div>
                <div class="campaign-meta">${new Date(campaign.last_played).toLocaleDateString()}</div>
            </div>
            ${showDelete ? `<button class="delete-btn" title="Excluir Campanha" data-id="${campaign.id}">🗑️</button>` : ''}
        `;

        // Campaign click handler
        el.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            onCampaignClick(campaign.id);
        });

        // Delete button handler
        if (showDelete) {
            const deleteBtn = el.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();

                const confirmed = await confirmDialog(
                    `Tem certeza que deseja excluir "${campaign.name}"? Esta ação é irreversível.`,
                    'Sim, Excluir',
                    'Cancelar'
                );

                if (confirmed) {
                    const success = await deleteCampaign(campaign.id);
                    if (success && onDeleteClick) {
                        onDeleteClick(campaign.id);
                    }
                }
            });
        }

        container.appendChild(el);
    });
}

/**
 * Load and render campaigns in a container
 */
async function loadAndRenderCampaigns(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return [];
    }

    container.innerHTML = '<div style="color: #aaa; padding: 10px; text-align: center;">Carregando...</div>';

    const campaigns = await fetchCampaigns();
    renderCampaignList(container, campaigns, options);

    return campaigns;
}

// Export to window
window.fetchCampaigns = fetchCampaigns;
window.deleteCampaign = deleteCampaign;
window.navigateToCampaign = navigateToCampaign;
window.renderCampaignList = renderCampaignList;
window.loadAndRenderCampaigns = loadAndRenderCampaigns;
