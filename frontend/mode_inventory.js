// Mode-aware inventory modal rendering
// Add this script AFTER game.js loads

// Override status button to use custom rendering
document.addEventListener('DOMContentLoaded', function () {
    const statusBtn = document.getElementById('status-btn');
    const statusModal = document.getElementById('status-modal');
    const statusContent = document.getElementById('status-content');

    if (!statusBtn || !statusContent) return;

    // Remove existing listeners and add new one
    const newStatusBtn = statusBtn.cloneNode(true);
    statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);

    newStatusBtn.addEventListener('click', async function () {
        // Open modal
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) modalOverlay.classList.remove('hidden');
        if (statusModal) statusModal.classList.remove('hidden');

        statusContent.innerHTML = '<div style="text-align: center; color: #aaa;">Carregando...</div>';

        try {
            // Get campaign ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const campaignId = urlParams.get('campaign_id');
            const userId = currentUser.user_id;

            // Fetch player data
            const response = await fetch(`/player/${userId}/${campaignId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const player = await response.json();

            // Render based on mode
            const modo = (player.modo || 'Narrativo').toLowerCase();
            let html = '';

            // Header
            html += `<div style="text-align: center; margin-bottom: 20px;">`;
            html += `<h2 style="margin: 0 0 5px 0; color: var(--secondary-color);">${player.nome}</h2>`;
            html += `<p style="color: #aaa; margin: 0;">${player.raca} ${player.classe} | ${player.modo}</p>`;
            html += `</div>`;

            // MODO NARRATIVO
            if (modo.includes('narrativo')) {
                html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">`;
                html += `<h3 style="margin: 0 0 10px 0;">📖 História</h3>`;
                html += `<p style="font-style: italic; color: #ddd; line-height: 1.6;">${player.historia || 'Sem história registrada.'}</p>`;
                html += `</div>`;

                // MODO ROLAGEM DE DADOS
            } else if (modo.includes('dados') || modo.includes('rolagem')) {
                html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">`;
                html += `<div style="background: linear-gradient(135deg, rgba(255,77,77,0.3), rgba(255,77,77,0.1)); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,77,77,0.3);">`;
                html += `<div style="font-size: 0.9rem; color: #ff4d4d;">❤️ Vida</div>`;
                html += `<div style="font-size: 2rem; font-weight: bold;">${player.inventario?.vida_atual || 0}/${player.inventario?.vida_maxima || 0}</div>`;
                html += `</div>`;
                html += `<div style="background: linear-gradient(135deg, rgba(255,207,51,0.3), rgba(255,207,51,0.1)); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,207,51,0.3);">`;
                html += `<div style="font-size: 0.9rem; color: #ffcf33;">💰 Ouro</div>`;
                html += `<div style="font-size: 2rem; font-weight: bold;">${player.inventario?.ouro || 0}</div>`;
                html += `</div>`;
                html += `</div>`;

                // MODO D&D 5E
            } else {
                html += `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">`;
                html += `<div style="background: linear-gradient(135deg, rgba(255,77,77,0.3), rgba(255,77,77,0.1)); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,77,77,0.3);">`;
                html += `<div style="font-size: 0.8rem; color: #ff4d4d;">❤️ HP</div>`;
                html += `<div style="font-size: 1.5rem; font-weight: bold;">${player.inventario?.vida_atual || 0}/${player.inventario?.vida_maxima || 0}</div>`;
                html += `</div>`;
                html += `<div style="background: linear-gradient(135deg, rgba(157,78,221,0.3), rgba(157,78,221,0.1)); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(157,78,221,0.3);">`;
                html += `<div style="font-size: 0.8rem; color: var(--secondary-color);">🛡️ AC</div>`;
                const dexMod = Math.floor(((player.atributos?.destreza || 10) - 10) / 2);
                html += `<div style="font-size: 1.5rem; font-weight: bold;">${10 + dexMod}</div>`;
                html += `</div>`;
                html += `<div style="background: linear-gradient(135deg, rgba(255,207,51,0.3), rgba(255,207,51,0.1)); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,207,51,0.3);">`;
                html += `<div style="font-size: 0.8rem; color: #ffcf33;">💰 Ouro</div>`;
                html += `<div style="font-size: 1.5rem; font-weight: bold;">${player.inventario?.ouro || 0}</div>`;
                html += `</div>`;
                html += `</div>`;

                // Spell Slots
                if (player.spell_slots && Object.keys(player.spell_slots).length > 0) {
                    html += `<div style="background: linear-gradient(135deg, rgba(157,78,221,0.2), rgba(157,78,221,0.05)); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(157,78,221,0.3);">`;
                    html += `<h3 style="margin: 0 0 15px 0; font-size: 1.1rem; color: var(--secondary-color);">🔮 Espaços de Magia</h3>`;
                    const sortedSlots = Object.entries(player.spell_slots).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
                    for (const [nivel, slots] of sortedSlots) {
                        const usado = slots.usado || 0;
                        const total = slots.total || 0;
                        const disponiveis = total - usado;
                        html += `<div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">`;
                        html += `<span style="font-weight: 500;">Círculo ${nivel}º</span>`;
                        html += `<div style="display: flex; align-items: center; gap: 8px;">`;
                        html += `<span style="font-size: 1.2rem; letter-spacing: 3px;">`;
                        for (let i = 0; i < total; i++) {
                            html += `<span style="color: ${i < disponiveis ? 'var(--secondary-color)' : '#555'};">${i < disponiveis ? '●' : '○'}</span>`;
                        }
                        html += `</span>`;
                        html += `<span style="color: #aaa; font-size: 0.9rem;">(${disponiveis}/${total})</span>`;
                        html += `</div>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
                }
            }

            // Atributos (todos menos narrativo)
            if (!modo.includes('narrativo') && player.atributos) {
                html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">`;
                html += `<h3 style="margin: 0 0 10px 0; font-size: 1rem;">📊 Atributos</h3>`;
                html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">`;
                ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma'].forEach(attr => {
                    const value = player.atributos[attr] || 10;
                    const mod = Math.floor((value - 10) / 2);
                    const modStr = mod >= 0 ? `+${mod}` : mod;
                    const label = attr.charAt(0).toUpperCase() + attr.slice(1, 3).toUpperCase();
                    html += `<div style="text-align: center; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">`;
                    html += `<div style="font-size: 0.75rem; color: #aaa;">${label}</div>`;
                    html += `<div style="font-size: 1.3rem; font-weight: bold;">${value}</div>`;
                    html += `<div style="font-size: 0.85rem; color: var(--secondary-color);">${modStr}</div>`;
                    html += `</div>`;
                });
                html += `</div>`;
                html += `</div>`;
            }

            // Itens (todos os modos)

            // Magias (Grimório) - Display for all modes if magias exist
            if (player.magias && player.magias.length > 0) {
                html += `<div style="background: rgba(157,78,221,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid rgba(157,78,221,0.2);">`;
                html += `<h3 style="margin: 0 0 10px 0; font-size: 1rem; color: var(--accent-color);">📜 Grimório (Magias Conhecidas)</h3>`;
                player.magias.forEach(magia => {
                    const nome = magia.nome || 'Magia Desconhecida';
                    const custo = magia.custo_mana ? `(Mana: ${magia.custo_mana})` : '';
                    const desc = magia.descricao || '';

                    html += `<div style="margin-bottom: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">`;
                    html += `<div style="display: flex; justify-content: space-between;">`;
                    html += `<span style="font-weight: bold; color: #fff;">${nome}</span>`;
                    html += `<span style="font-size: 0.8rem; color: var(--secondary-color);">${custo}</span>`;
                    html += `</div>`;
                    if (desc) html += `<div style="font-size: 0.85rem; color: #aaa; margin-top: 2px;">${desc}</div>`;
                    html += `</div>`;
                });
                html += `</div>`;
            }

            if (player.inventario?.itens && player.inventario.itens.length > 0) {
                html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">`;
                html += `<h3 style="margin: 0 0 10px 0; font-size: 1rem;">🎒 Inventário</h3>`;
                player.inventario.itens.forEach(item => {
                    const itemNome = typeof item === 'string' ? item : (item.nome || item.item || 'Item');
                    const itemDesc = typeof item === 'object' ? item.descricao : '';
                    html += `<div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">`;
                    html += `<div style="font-weight: bold; color: var(--accent-color);">${itemNome}</div>`;
                    if (itemDesc) html += `<div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">${itemDesc}</div>`;

                    // Show buffs
                    if (item.buffs && Object.keys(item.buffs).length > 0) {
                        html += `<div style="font-size: 0.8rem; color: var(--secondary-color); margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">`;
                        Object.entries(item.buffs).forEach(([stat, value]) => {
                            html += `<span style="background: rgba(157,78,221,0.2); padding: 2px 8px; border-radius: 4px;">+${value} ${stat}</span>`;
                        });
                        html += `</div>`;
                    }
                    html += `</div>`;
                });
                html += `</div>`;
            }

            statusContent.innerHTML = html;
        } catch (e) {
            console.error('Erro ao carregar status:', e);
            statusContent.innerHTML = `<div style="color: #ff4d4d; text-align: center; padding: 20px;">
                Erro ao carregar dados do personagem.<br>
                <span style="font-size: 0.8rem; color: #aaa;">${e.message}</span>
            </div>`;
        }
    });
});
