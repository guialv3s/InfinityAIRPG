// Permanent Inventory Sidebar Controller
// Populates and manages the always-visible inventory sidebar

let currentGameMode = 'narrativo';

// Will be called by game.js after auth is ready
// Don't auto-initialize on DOMContentLoaded

// Tab Switching Logic
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.sidebar-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Update active tab button
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Show corresponding content
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.add('hidden');
            });
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
        });
    });
}

// Load player data and populate sidebar
async function loadSidebarData() {
    console.log('[SIDEBAR] Starting loadSidebarData...');

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get('campaign_id');

        // currentUser is defined in auth.js which loads before this script
        if (!currentUser) {
            console.error('[SIDEBAR] currentUser not available');
            return;
        }

        const userId = currentUser.user_id;
        console.log('[SIDEBAR] Campaign ID:', campaignId, 'User ID:', userId);

        if (!campaignId || !userId) {
            console.warn('[SIDEBAR] Missing campaign_id or user_id');
            return;
        }

        const response = await fetch(`/player/${userId}/${campaignId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        console.log('[SIDEBAR] API Response status:', response.status);

        if (!response.ok) {
            console.error('[SIDEBAR] Failed to load player data:', response.status);
            return;
        }

        const player = await response.json();
        console.log('[SIDEBAR] Player data loaded:', player);

        currentGameMode = (player.modo || 'narrativo').toLowerCase();
        console.log('[SIDEBAR] Game mode:', currentGameMode);

        updateUIMode(currentGameMode); // Apply UI Fixes

        populateSidebar(player);
    } catch (error) {
        console.error('[SIDEBAR] Error loading sidebar data:', error);
    }
}

// Initialize function to be called from game.js
function initSidebar() {
    console.log('[SIDEBAR] Initializing sidebar...');
    setupTabSwitching();
    loadSidebarData();
}

// Export for game.js to call
window.initSidebar = initSidebar;

// Main population function
function populateSidebar(player) {
    console.log('[SIDEBAR] Populating sidebar with player data:', player);
    populateStats(player);
    populateAttributes(player);
    populateGrimorio(player);
    populateEquipment(player);
    populateInventory(player);
    console.log('[SIDEBAR] Sidebar population complete');
}

// Populate Stats (HP, AC, Gold, etc.)
function populateStats(player) {
    const statsDisplay = document.getElementById('stats-display');
    const inv = player.inventario || {};
    const modo = currentGameMode;

    let statsHTML = '';

    // ALWAYS SHOW HP + GOLD (User Request)
    statsHTML += createStatBox('❤️ HP', `${inv.vida_atual || 0}/${inv.vida_maxima || 0}`, 'hp');

    if (modo.includes('narrativo')) {
        // Narrativo: Just HP and Gold
        statsHTML += createStatBox('💰 Ouro', inv.ouro || 0);
    } else if (modo.includes('dados') || modo.includes('rolagem')) {
        // Rolagem de Dados: Vida e Ouro
        statsHTML += createStatBox('💰 Ouro', inv.ouro || 0);
    } else {
        // D&D 5E: HP, AC, Ouro
        const dexMod = Math.floor(((player.atributos?.destreza || 10) - 10) / 2);
        const ac = 10 + dexMod;
        statsHTML += createStatBox('🛡️ AC', ac);
        statsHTML += createStatBox('💰 Ouro', inv.ouro || 0, 'gold');
    }

    // Spell Slots (D&D only)
    if (modo.includes('dnd') || modo.includes('5e')) {
        if (player.spell_slots && Object.keys(player.spell_slots).length > 0) {
            statsHTML += '<div style="grid-column: 1 / -1; margin-top: 10px;">';
            statsHTML += '<h4 style="font-size: 0.9rem; color: var(--secondary-color); margin-bottom: 8px;">🔮 Espaços de Magia</h4>';

            const sortedSlots = Object.entries(player.spell_slots).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            for (const [nivel, slots] of sortedSlots) {
                const usado = slots.usado || 0;
                const total = slots.total || 0;
                const disponiveis = total - usado;

                statsHTML += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 6px;">';
                statsHTML += `<span style="font-size: 0.85rem;">Círculo ${nivel}º</span>`;
                statsHTML += '<div style="display: flex; gap: 4px;">';
                for (let i = 0; i < total; i++) {
                    const filled = i < disponiveis;
                    statsHTML += `<span style="color: ${filled ? 'var(--secondary-color)' : '#555'}; font-size: 1rem;">${filled ? '●' : '○'}</span>`;
                }
                statsHTML += `<span style="font-size: 0.8rem; color: #aaa; margin-left: 6px;">${disponiveis}/${total}</span>`;
                statsHTML += '</div></div>';
            }
            statsHTML += '</div>';
        }
    }

    statsDisplay.innerHTML = statsHTML;
}

function updateUIMode(modo) {
    // UI Cleanup for Narrative Mode (Hide Grimoire & Footer Space)
    const grimoireTabBtn = document.querySelector('.sidebar-tab[data-tab="grimorio"]');
    // FIX: Target only the inventory sidebar footer, avoiding the app-sidebar footer (logout/profile)
    const footerSpace = document.querySelector('#inventory-sidebar .sidebar-footer');

    if (modo.includes('narrativo')) {
        if (grimoireTabBtn) grimoireTabBtn.style.display = 'none';
        if (footerSpace) footerSpace.style.display = 'none';

        // Also ensure we are not on the masked tab
        const activeTab = document.querySelector('.sidebar-tab.active');
        if (activeTab && activeTab.dataset.tab === 'grimorio') {
            document.querySelector('.sidebar-tab[data-tab="inventory"]').click();
        }
    } else {
        if (grimoireTabBtn) grimoireTabBtn.style.display = 'flex'; // or block/flex
        if (footerSpace) footerSpace.style.display = 'block';
    }
}

function createStatBox(label, value, type = '') {
    let colorClass = '';
    if (type === 'hp') colorClass = 'linear-gradient(135deg, rgba(255,77,77,0.3), rgba(255,77,77,0.1))';
    else if (type === 'gold') colorClass = 'linear-gradient(135deg, rgba(255,207,51,0.3), rgba(255,207,51,0.1))';
    else colorClass = 'linear-gradient(135deg, rgba(157,78,221,0.2), rgba(157,78,221,0.05))';

    return `
        <div class="stat-box" style="background: ${colorClass};">
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
        </div>
    `;
}

// Populate Attributes
function populateAttributes(player) {
    const attrsDisplay = document.getElementById('attributes-display');

    if (currentGameMode.includes('narrativo')) {
        attrsDisplay.innerHTML = '<p style="text-align: center; color: #888; font-size: 0.85rem;">Modo Narrativo</p>';
        return;
    }

    const attrs = player.atributos || {};
    const attrNames = ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma'];

    let html = '';
    attrNames.forEach(attr => {
        const value = attrs[attr] || 10;
        const mod = Math.floor((value - 10) / 2);
        const modStr = mod >= 0 ? `+${mod}` : mod;
        const label = attr.substring(0, 3).toUpperCase();

        html += `
            <div class="attr-box">
                <div class="attr-name">${label}</div>
                <div class="attr-value">${value}</div>
                <div class="attr-mod">${modStr}</div>
            </div>
        `;
    });

    attrsDisplay.innerHTML = html;
}

// Populate Grimório (Spells)
function populateGrimorio(player) {
    console.log('[SIDEBAR] Populating Grimório...');
    const grimorioPane = document.getElementById('tab-grimorio');

    if (!grimorioPane) {
        console.error('[SIDEBAR] tab-grimorio element not found!');
        return;
    }

    const magias = player.magias || [];
    console.log('[SIDEBAR] Spells found:', magias.length, magias);

    if (magias.length === 0) {
        grimorioPane.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Nenhuma magia aprendida</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    magias.forEach(magia => {
        const nome = magia.nome || 'Magia Desconhecida';
        const nivel = magia.nivel ? `Nível ${magia.nivel}` : '';
        const custo = magia.custo_mana ? `Custo: ${magia.custo_mana} mana` : '';
        const desc = magia.descricao || '';

        html += `
            <div style="background: rgba(157,78,221,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(157,78,221,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                    <span style="font-weight: bold; color: var(--accent-color);">${nome}</span>
                    <span style="font-size: 0.75rem; color: var(--secondary-color);">${nivel}</span>
                </div>
                ${custo ? `<div style="font-size: 0.8rem; color: #888; margin-bottom: 4px;">${custo}</div>` : ''}
                ${desc ? `<div style="font-size: 0.85rem; color: #aaa; margin-top: 6px;">${desc}</div>` : ''}
            </div>
        `;
    });

    html += '</div>';
    grimorioPane.innerHTML = html;
    console.log('[SIDEBAR] Grimório populated with', magias.length, 'spells');
}

// Populate Equipment (items with buffs or equipment keywords)
function populateEquipment(player) {
    const equipmentPane = document.getElementById('tab-equipment');
    const items = player.inventario?.itens || [];

    const equipment = items.filter(item => {
        if (typeof item === 'string') return false;
        if (item.buffs && Object.keys(item.buffs).length > 0) return true;

        const nome = (item.nome || item.item || '').toLowerCase();
        const keywords = ['cajado', 'espada', 'machado', 'armadura', 'escudo', 'anel', 'amuleto', 'manto', 'arco', 'adaga', 'veste', 'robe'];
        return keywords.some(kw => nome.includes(kw));
    });

    if (equipment.length === 0) {
        equipmentPane.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Nenhum equipamento</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    equipment.forEach(item => {
        html += renderItem(item, true);
    });

    html += '</div>';
    equipmentPane.innerHTML = html;
}

// Populate Inventory (regular items)
function populateInventory(player) {
    const inventoryPane = document.getElementById('tab-inventory');
    const items = player.inventario?.itens || [];

    const regularItems = items.filter(item => {
        if (typeof item === 'string') return true;
        if (item.buffs && Object.keys(item.buffs).length > 0) return false;

        const nome = (item.nome || item.item || '').toLowerCase();
        const keywords = ['cajado', 'espada', 'machado', 'armadura', 'escudo', 'anel', 'amuleto', 'manto', 'arco', 'adaga', 'veste', 'robe'];
        return !keywords.some(kw => nome.includes(kw));
    });

    if (regularItems.length === 0) {
        inventoryPane.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Inventário vazio</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

    regularItems.forEach(item => {
        html += renderItem(item, false);
    });

    html += '</div>';
    inventoryPane.innerHTML = html;
}

// Render a single item
function renderItem(item, isEquipment) {
    if (typeof item === 'string') {
        return `<div style="padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; color: #ddd;">${item}</div>`;
    }

    const nome = item.nome || item.item || 'Item';
    const desc = item.descricao || '';
    const quantidade = item.quantidade || 1;

    let html = `
        <div style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <span style="font-weight: bold; color: ${isEquipment ? 'var(--accent-color)' : '#fff'};">${nome}</span>
                ${quantidade > 1 ? `<span style="font-size: 0.8rem; color: #888;">x${quantidade}</span>` : ''}
            </div>
    `;

    if (desc) {
        html += `<div style="font-size: 0.85rem; color: #aaa; margin-top: 6px;">${desc}</div>`;
    }

    // Show buffs if equipped
    if (item.buffs && Object.keys(item.buffs).length > 0) {
        html += '<div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">';
        Object.entries(item.buffs).forEach(([stat, value]) => {
            html += `<span style="background: rgba(157,78,221,0.2); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--secondary-color);">+${value} ${stat}</span>`;
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// Call this after each message to refresh sidebar
function refreshSidebar() {
    loadSidebarData();
}

// Export for use in game.js
window.refreshSidebar = refreshSidebar;
