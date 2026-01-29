// shared_modal.js - Single Source of Truth for Character Creation

const CHARACTER_CREATION_MODAL_HTML = `
    <div id="modal-overlay" class="modal-overlay hidden"></div>
    <div id="creation-modal" class="modal hidden" style="max-width: 800px; width: 95%;">
        <div class="modal-header">
            <h2>✨ Criar Personagem</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0;">
            <!-- Tabs -->
            <div class="creation-tabs"
                style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
                <button class="tab-btn active" data-tab="tab-basic"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: white; cursor: pointer; border-bottom: 2px solid var(--primary-color);">1.
                    Básico</button>
                <button class="tab-btn" data-tab="tab-story"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: #aaa; cursor: pointer;">2.
                    Passado / História</button>
                <button class="tab-btn" data-tab="tab-attributes"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: #aaa; cursor: pointer;">3.
                    Atributos</button>
            </div>

            <form id="creation-form" style="padding: 20px;">
                <!-- Step 1: Basic Info -->
                <div id="tab-basic" class="tab-content">
                    <div class="row">
                        <div class="form-group half">
                            <label>Nome do Personagem</label>
                            <input type="text" id="char-name" placeholder="Ex: Gandalf...">
                        </div>
                        <div class="form-group half">
                            <label>Raça</label>
                            <select id="char-race"
                                style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
                                <option value="Humano">Humano (+1 em tudo)</option>
                                <option value="Elfo">Elfo (+2 Des, +1 Int)</option>
                                <option value="Anão">Anão (+2 Con, +1 For)</option>
                                <option value="Orc">Orc (+2 For, +1 Con)</option>
                                <option value="Draconato">Draconato (+2 For, +1 Car)</option>
                                <option value="Halfling">Halfling (+2 Des)</option>
                                <option value="Gnomo">Gnomo (+2 Int)</option>
                                <option value="Tiefling">Tiefling (+2 Car, +1 Int)</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group half">
                            <label>Classe</label>
                            <input type="text" id="char-class" placeholder="Ex: Mago, Guerreiro...">
                        </div>
                        <div class="form-group half">
                            <label>Modo de Jogo</label>
                            <select id="char-mode-select"
                                style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
                                <option value="narrativo">Narrativo</option>
                                <option value="rolagem de dados">Rolagem de Dados</option>
                                <option value="dnd5e">D&D 5E Rules</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tema da Campanha</label>
                        <input type="text" id="char-theme" placeholder="Ex: Dark Fantasy, Cyberpunk, Medieval...">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-primary next-tab" data-target="tab-story">Próximo</button>
                    </div>
                </div>

                <!-- Step 2: Backstory -->
                <div id="tab-story" class="tab-content hidden">
                    <div class="form-group">
                        <label>História & Descrição</label>
                        <textarea id="char-backstory"
                            placeholder="Descreva a aparência, personalidade e o passado do seu personagem..."
                            style="width: 100%; height: 200px; padding: 15px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); resize: vertical;"></textarea>
                    </div>
                    <div class="modal-actions" style="justify-content: space-between;">
                        <button type="button" class="btn-cancel prev-tab" data-target="tab-basic">Voltar</button>
                        <button type="button" class="btn-primary next-tab" data-target="tab-attributes">Próximo</button>
                    </div>
                </div>

                <!-- Step 3: Attributes -->
                <div id="tab-attributes" class="tab-content hidden" style="position: relative;">
                    <!-- Overlay for Narrative Mode -->
                    <div id="narrative-overlay" class="hidden"
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 8px;">
                        <span style="font-size: 3rem; margin-bottom: 10px;">🎭</span>
                        <h3 style="color: white; text-align: center; max-width: 80%;">Atributos desnecessários para o
                            modo de jogo Narrativo</h3>
                        <p style="color: #aaa; margin-top: 10px;">O sistema cuidará da história para você.</p>
                        <button type="button" class="btn-primary" style="margin-top: 20px;"
                            onclick="document.querySelector('#creation-form button[type=submit]').click()">Iniciar
                            Aventura Agora</button>
                    </div>

                    <div class="attr-method-selector" style="margin-bottom: 20px; text-align: center;">
                        <label style="margin-right: 15px;">Método de Distribuição:</label>
                        <select id="attr-method"
                            style="padding: 5px 10px; border-radius: 5px; background: #333; color: white; border: 1px solid #555;">
                            <option value="pointBuy">Compra de Pontos (Point Buy)</option>
                            <option value="standardArray">Array Padrão (Standard Array)</option>
                        </select>
                    </div>

                    <div id="point-buy-container">
                        <div
                            style="text-align: center; margin-bottom: 15px; font-size: 1.1rem; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
                            Pontos Restantes: <span id="points-remaining"
                                style="color: var(--premium-gold); font-weight: bold;">27</span> / 27
                        </div>
                        <div class="attributes-grid" id="pb-grid"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <!-- Generated via JS -->
                        </div>
                    </div>

                    <div id="standard-array-container" class="hidden">
                        <p style="text-align: center; color: #aaa; margin-bottom: 15px;">Distribua os valores: 15, 14,
                            13, 12, 10, 8</p>
                        <div class="attributes-grid" id="sa-grid"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <!-- Generated via JS -->
                        </div>
                    </div>

                    <div class="modal-actions" style="justify-content: space-between; margin-top: 20px;">
                        <button type="button" class="btn-cancel prev-tab" data-target="tab-story">Voltar</button>
                        <button type="submit" class="btn-primary">Iniciar Aventura</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    <div id="validation-toast" class="validation-toast hidden">
        <div class="toast-content">
            <span class="toast-icon">ℹ️</span>
            <span class="toast-message">Por favor, preencha a História do Personagem. Este campo é obrigatório!</span>
        </div>
        <div class="toast-progress"></div>
    </div>
`;

window.openCharacterCreationModal = function (submitCallback) {
    // 1. Check for existing overlay (managed by shared_modals.js)
    let modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) {
        // Fallback if shared_modals.js hasn't run or something is wrong
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'modal-overlay';
        modalOverlay.className = 'modal-overlay hidden';
        document.body.appendChild(modalOverlay);
    }

    // 2. Remove existing creation modal if any (to ensure fresh state)
    const existingModal = document.querySelector('#creation-modal');
    const existingToast = document.querySelector('#validation-toast');
    if (existingModal) existingModal.remove();
    if (existingToast) existingToast.remove();

    // 3. Inject Modal HTML (Only the modal dialog, not the overlay)
    const wrapper = document.createElement('div');
    // Extract strictly the modal content from the template, ensuring we don't inject another overlay
    // The template includes the overlay div, so we need to be careful. 
    // We will manually construct the HTML to be safe and cleaner.
    wrapper.innerHTML = `
    <div id="creation-modal" class="modal hidden" style="max-width: 800px; width: 95%;">
        <div class="modal-header">
            <h2>✨ Criar Personagem</h2>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0;">
            <!-- Tabs -->
            <div class="creation-tabs"
                style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
                <button class="tab-btn active" data-tab="tab-basic"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: white; cursor: pointer; border-bottom: 2px solid var(--primary-color);">1.
                    Básico</button>
                <button class="tab-btn" data-tab="tab-story"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: #aaa; cursor: pointer;">2.
                    Passado / História</button>
                <button class="tab-btn" data-tab="tab-attributes"
                    style="flex: 1; padding: 15px; border: none; background: transparent; color: #aaa; cursor: pointer;">3.
                    Atributos</button>
            </div>

            <form id="creation-form" style="padding: 20px;">
                <!-- Step 1: Basic Info -->
                <div id="tab-basic" class="tab-content">
                    <div class="row">
                        <div class="form-group half">
                            <label>Nome do Personagem</label>
                            <input type="text" id="char-name" placeholder="Ex: Gandalf...">
                        </div>
                        <div class="form-group half">
                            <label>Raça</label>
                            <select id="char-race"
                                style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
                                <option value="Humano">Humano (+1 em tudo)</option>
                                <option value="Elfo">Elfo (+2 Des, +1 Int)</option>
                                <option value="Anão">Anão (+2 Con, +1 For)</option>
                                <option value="Orc">Orc (+2 For, +1 Con)</option>
                                <option value="Draconato">Draconato (+2 For, +1 Car)</option>
                                <option value="Halfling">Halfling (+2 Des)</option>
                                <option value="Gnomo">Gnomo (+2 Int)</option>
                                <option value="Tiefling">Tiefling (+2 Car, +1 Int)</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="form-group half">
                            <label>Classe</label>
                            <input type="text" id="char-class" placeholder="Ex: Mago, Guerreiro...">
                        </div>
                        <div class="form-group half">
                            <label>Modo de Jogo</label>
                            <select id="char-mode-select"
                                style="width: 100%; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">
                                <option value="narrativo">Narrativo</option>
                                <option value="rolagem de dados">Rolagem de Dados</option>
                                <option value="dnd5e">D&D 5E Rules</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tema da Campanha</label>
                        <input type="text" id="char-theme" placeholder="Ex: Dark Fantasy, Cyberpunk, Medieval...">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-primary next-tab" data-target="tab-story">Próximo</button>
                    </div>
                </div>

                <!-- Step 2: Backstory -->
                <div id="tab-story" class="tab-content hidden">
                    <div class="form-group">
                        <label>História & Descrição</label>
                        <textarea id="char-backstory"
                            placeholder="Descreva a aparência, personalidade e o passado do seu personagem..."
                            style="width: 100%; height: 200px; padding: 15px; border-radius: 8px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); resize: vertical;"></textarea>
                    </div>
                    <div class="modal-actions" style="justify-content: space-between;">
                        <button type="button" class="btn-cancel prev-tab" data-target="tab-basic">Voltar</button>
                        <button type="button" class="btn-primary next-tab" data-target="tab-attributes">Próximo</button>
                    </div>
                </div>

                <!-- Step 3: Attributes -->
                <div id="tab-attributes" class="tab-content hidden" style="position: relative;">
                    <!-- Overlay for Narrative Mode -->
                    <div id="narrative-overlay" class="hidden"
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 8px;">
                        <span style="font-size: 3rem; margin-bottom: 10px;">🎭</span>
                        <h3 style="color: white; text-align: center; max-width: 80%;">Atributos desnecessários para o
                            modo de jogo Narrativo</h3>
                        <p style="color: #aaa; margin-top: 10px;">O sistema cuidará da história para você.</p>
                        <button type="button" class="btn-primary" style="margin-top: 20px;"
                            onclick="document.querySelector('#creation-form button[type=submit]').click()">Iniciar
                            Aventura Agora</button>
                    </div>

                    <div class="attr-method-selector" style="margin-bottom: 20px; text-align: center;">
                        <label style="margin-right: 15px;">Método de Distribuição:</label>
                        <select id="attr-method"
                            style="padding: 5px 10px; border-radius: 5px; background: #333; color: white; border: 1px solid #555;">
                            <option value="pointBuy">Compra de Pontos (Point Buy)</option>
                            <option value="standardArray">Array Padrão (Standard Array)</option>
                        </select>
                    </div>

                    <div id="point-buy-container">
                        <div
                            style="text-align: center; margin-bottom: 15px; font-size: 1.1rem; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
                            Pontos Restantes: <span id="points-remaining"
                                style="color: var(--premium-gold); font-weight: bold;">27</span> / 27
                        </div>
                        <div class="attributes-grid" id="pb-grid"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <!-- Generated via JS -->
                        </div>
                    </div>

                    <div id="standard-array-container" class="hidden">
                        <p style="text-align: center; color: #aaa; margin-bottom: 15px;">Distribua os valores: 15, 14,
                            13, 12, 10, 8</p>
                        <div class="attributes-grid" id="sa-grid"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <!-- Generated via JS -->
                        </div>
                    </div>

                    <div class="modal-actions" style="justify-content: space-between; margin-top: 20px;">
                        <button type="button" class="btn-cancel prev-tab" data-target="tab-story">Voltar</button>
                        <button type="submit" class="btn-primary">Iniciar Aventura</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    <div id="validation-toast" class="validation-toast hidden">
        <div class="toast-content">
            <span class="toast-icon">ℹ️</span>
            <span class="toast-message">Por favor, preencha a História do Personagem. Este campo é obrigatório!</span>
        </div>
        <div class="toast-progress"></div>
    </div>
    `;

    document.body.appendChild(wrapper.firstElementChild); // creation-modal
    document.body.appendChild(wrapper.lastElementChild);  // validation-toast (from previous child, it's actually the second child)
    // Note: wrapper.firstElementChild is the modal. We need to append the toast too.
    // The previous innerHTML assignment put them as siblings.
    const newToast = wrapper.querySelector('#validation-toast');
    if (newToast) document.body.appendChild(newToast);

    // 4. Get References
    const creationModal = document.getElementById('creation-modal');
    const form = document.getElementById('creation-form');
    const closeBtn = creationModal.querySelector('.close-modal');

    // 5. Initialize Logic
    if (window.initCreationTabs) window.initCreationTabs();
    if (window.initAttributeSystem) window.initAttributeSystem();

    // Narrative Overlay Logic
    const modeSelect = document.getElementById('char-mode-select');
    const overlay = document.getElementById('narrative-overlay');
    if (modeSelect && overlay) {
        const checkMode = () => {
            if (modeSelect.value === 'narrativo') overlay.classList.remove('hidden');
            else overlay.classList.add('hidden');
        };
        modeSelect.addEventListener('change', checkMode);
        checkMode();
    }

    // 6. Open Modal - Use Shared System if possible, or manual class manipulation
    // We used shared_modals.js logic: openModal(id)
    if (window.openModal) {
        window.openModal('creation-modal');
    } else {
        // Fallback
        modalOverlay.classList.remove('hidden');
        creationModal.classList.remove('hidden');
    }

    // 7. Close Handler - CRITICAL: Do NOT remove overlay
    const closeModal = () => {
        // Use shared logic if available
        if (window.closeAllModals) {
            window.closeAllModals();
        } else {
            modalOverlay.classList.add('hidden');
            creationModal.classList.add('hidden');
        }

        // Remove the creation modal from DOM after delay to clean up, 
        // BUT keep the overlay which is shared.
        setTimeout(() => {
            if (creationModal) creationModal.remove();
            const toast = document.getElementById('validation-toast');
            if (toast) toast.remove();
        }, 300);
    };

    // Note: We don't need to add click listener to overlay here because shared_modals.js 
    // should have already attached it to closeAllModals. 
    // However, if we just created the overlay in fallback step 1, we might need it.
    if (!window.initModalSystem) {
        // Only if shared system isn't controlling it
        modalOverlay.addEventListener('click', closeModal);
    }

    // Bind the specific close button of this new modal
    closeBtn.addEventListener('click', closeModal);

    // 7. Submit Handler
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Use existing collector which does validation
            if (!window.getCharacterData) {
                console.error("Critical: window.getCharacterData not found!");
                return;
            }

            const charData = window.getCharacterData();
            if (!charData) return; // Validation failed (toast already shown by getCharacterData)

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;

            // Loading UI
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'creation-loading-overlay';
            loadingOverlay.style.position = 'fixed';
            loadingOverlay.style.top = '0';
            loadingOverlay.style.left = '0';
            loadingOverlay.style.width = '100%';
            loadingOverlay.style.height = '100%';
            loadingOverlay.style.background = 'rgba(0,0,0,0.85)';
            loadingOverlay.style.zIndex = '9999';
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.flexDirection = 'column';
            loadingOverlay.style.justifyContent = 'center';
            loadingOverlay.style.alignItems = 'center';
            loadingOverlay.style.backdropFilter = 'blur(5px)';

            loadingOverlay.innerHTML = `
                <div class="stars-wrapper">
                    <div class="stars"></div>
                    <div class="stars2"></div>
                </div>
                <div class="typing-indicator" style="transform: scale(1.5); margin-bottom: 20px;">
                    <span></span><span></span><span></span>
                </div>
                <h2 style="color: white; font-family: 'Outfit', sans-serif; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Criando sua campanha...</h2>
                <p style="color: #aaa; margin-top: 10px; font-size: 0.9rem;">O mestre está preparando o cenário.</p>
            `;
            document.body.appendChild(loadingOverlay);

            submitBtn.innerHTML = 'Aguarde...';
            submitBtn.disabled = true;

            try {
                await submitCallback(charData);
            } catch (err) {
                console.error(err);
                alert("Erro ao criar personagem: " + err.message);
                if (loadingOverlay) loadingOverlay.remove();
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
};
