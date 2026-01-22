// Character Creation Logic

const RACES = {
    "Humano": { for: 1, des: 1, con: 1, int: 1, sab: 1, car: 1 },
    "Elfo": { des: 2, int: 1 },
    "Anão": { con: 2, for: 1 },
    "Orc": { for: 2, con: 1 },
    "Draconato": { for: 2, car: 1 },
    "Halfling": { des: 2 },
    "Gnomo": { int: 2 },
    "Tiefling": { car: 2, int: 1 }
};

const ATTRIBUTES = [
    { id: "for", name: "Força", desc: "Poder físico, capacidade de combate corpo a corpo, carregar peso e atletismo." },
    { id: "des", name: "Destreza", desc: "Agilidade, reflexos, precisão com armas à distância e furtividade." },
    { id: "con", name: "Constituição", desc: "Resistência, pontos de vida, stamina e imunidade a doenças." },
    { id: "int", name: "Inteligência", desc: "Raciocínio lógico, conhecimento arcano, memória e investigação." },
    { id: "sab", name: "Sabedoria", desc: "Percepção, intuição, conexão com a natureza e magias divinas." },
    { id: "car", name: "Carisma", desc: "Presença, persuasão, liderança e magias baseadas em força de vontade." }
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Point Buy State
let pbValues = { for: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 };
let pointsRemaining = 27;

// Standard Array State
let saValues = { for: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 };
let saSelections = { for: null, des: null, con: null, int: null, sab: null, car: null };

document.addEventListener('DOMContentLoaded', () => {
    initCreationTabs();
    initAttributeSystem();
});

// --- Tabs ---
function initCreationTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const nextBtns = document.querySelectorAll('.next-tab');
    const prevBtns = document.querySelectorAll('.prev-tab');

    function switchTab(targetId) {
        // Update Buttons
        tabs.forEach(t => {
            if (t.dataset.tab === targetId) {
                t.classList.add('active');
                t.style.borderBottom = "2px solid var(--primary-color)";
                t.style.color = "white";
            } else {
                t.classList.remove('active');
                t.style.borderBottom = "none";
                t.style.color = "#aaa";
            }
        });

        // Update Content
        contents.forEach(c => {
            if (c.id === targetId) c.classList.remove('hidden');
            else c.classList.add('hidden');
        });
    }

    tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    nextBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.target)));
    prevBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.target)));
}

// --- Attribute System ---
function initAttributeSystem() {
    const methodSelect = document.getElementById('attr-method');
    const pbContainer = document.getElementById('point-buy-container');
    const saContainer = document.getElementById('standard-array-container');
    const raceSelect = document.getElementById('char-race');

    // Method Switch
    methodSelect.addEventListener('change', () => {
        if (methodSelect.value === 'pointBuy') {
            pbContainer.classList.remove('hidden');
            saContainer.classList.add('hidden');
            renderPointBuy();
        } else {
            pbContainer.classList.add('hidden');
            saContainer.classList.remove('hidden');
            renderStandardArray();
        }
    });

    // Race Change (Updates modifiers)
    raceSelect.addEventListener('change', () => {
        if (methodSelect.value === 'pointBuy') renderPointBuy();
        else renderStandardArray();
    });

    // Initial Render
    renderPointBuy();
    renderStandardArray();
}

function calculateCost(currentVal, targetVal) {
    let cost = 0;
    // Going UP
    if (targetVal > currentVal) {
        for (let i = currentVal + 1; i <= targetVal; i++) {
            if (i <= 13) cost += 1;
            else if (i <= 15) cost += 2;
        }
    }
    // Going DOWN
    else {
        for (let i = currentVal; i > targetVal; i--) {
            if (i <= 13) cost -= 1;
            else if (i <= 15) cost -= 2;
        }
    }
    return cost;
}

function getRacialBonus(attrId) {
    const race = document.getElementById('char-race').value;
    const bonuses = RACES[race] || {};
    return bonuses[attrId] || 0;
}

function calcMod(val) {
    return Math.floor((val - 10) / 2);
}

function renderPointBuy() {
    const grid = document.getElementById('pb-grid');
    grid.innerHTML = '';
    const spanPoints = document.getElementById('points-remaining');
    spanPoints.innerText = pointsRemaining;

    ATTRIBUTES.forEach(attr => {
        const val = pbValues[attr.id];
        const raceBonus = getRacialBonus(attr.id);
        const finalVal = val + raceBonus;
        const mod = calcMod(finalVal);
        const modStr = mod >= 0 ? `+${mod}` : mod;

        // Can increment?
        const canInc = val < 15 && pointsRemaining >= calculateCost(val, val + 1);
        const canDec = val > 8;

        const row = document.createElement('div');
        row.className = 'attr-row';
        row.style.background = 'rgba(255,255,255,0.05)';
        row.style.padding = '10px';
        row.style.borderRadius = '8px';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';

        row.innerHTML = `
            <div>
                <div style="font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 4px;">
                    ${attr.name} 
                    <span class="attr-info-icon" data-tooltip="${attr.desc}">ⓘ</span>
                </div>
                <div style="font-size: 0.8rem; color: #aaa;">Base: ${val} | Bonus: +${raceBonus}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="icon-btn dec-btn" ${!canDec ? 'disabled style="opacity:0.3"' : ''}>-</button>
                <div style="text-align: center; width: 40px;">
                    <div style="font-size: 1.2rem; font-weight: bold;">${finalVal}</div>
                    <div style="font-size: 0.8rem; color: var(--secondary-color);">${modStr}</div>
                </div>
                <button class="icon-btn inc-btn" ${!canInc ? 'disabled style="opacity:0.3"' : ''}>+</button>
            </div>
        `;

        // Handlers
        row.querySelector('.dec-btn').addEventListener('click', () => {
            const cost = calculateCost(val, val - 1); // Negative cost (returns points)
            pointsRemaining -= cost; // Minus negative = plus
            pbValues[attr.id]--;
            renderPointBuy();
        });

        row.querySelector('.inc-btn').addEventListener('click', () => {
            const cost = calculateCost(val, val + 1);
            pointsRemaining -= cost;
            pbValues[attr.id]++;
            renderPointBuy();
        });

        grid.appendChild(row);
    });
}

function renderStandardArray() {
    const grid = document.getElementById('sa-grid');
    grid.innerHTML = '';

    ATTRIBUTES.forEach(attr => {
        const selectedVal = saSelections[attr.id]; // 15, 14, etc or null
        const raceBonus = getRacialBonus(attr.id);
        const finalVal = (selectedVal || 8) + raceBonus;
        const mod = calcMod(finalVal);
        const modStr = mod >= 0 ? `+${mod}` : mod;

        const row = document.createElement('div');
        row.className = 'attr-row';
        row.style.background = 'rgba(255,255,255,0.05)';
        row.style.padding = '10px';
        row.style.borderRadius = '8px';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';

        // Select Options
        let optionsHtml = '<option value="">--</option>';
        STANDARD_ARRAY.forEach(num => {
            // Disable if selected by OTHER attribute
            const isUsed = Object.entries(saSelections).some(([k, v]) => v == num && k !== attr.id);
            const isSelected = selectedVal == num;
            optionsHtml += `<option value="${num}" ${isSelected ? 'selected' : ''} ${isUsed ? 'disabled' : ''}>${num}</option>`;
        });

        row.innerHTML = `
            <div>
                <div style="font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 4px;">
                    ${attr.name}
                    <span class="attr-info-icon" data-tooltip="${attr.desc}">ⓘ</span>
                </div>
                <div style="font-size: 0.8rem; color: #aaa;">Bonus: +${raceBonus}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <select class="sa-select" style="background:#333; color:white; border:1px solid #555; border-radius:4px; padding:5px;">
                    ${optionsHtml}
                </select>
                <div style="text-align: center; width: 40px;">
                    <div style="font-size: 1.2rem; font-weight: bold;">${finalVal}</div>
                    <div style="font-size: 0.8rem; color: var(--secondary-color);">${modStr}</div>
                </div>
            </div>
        `;

        row.querySelector('.sa-select').addEventListener('change', (e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            saSelections[attr.id] = val;
            renderStandardArray(); // Re-render to update disabled states
        });

        grid.appendChild(row);
    });
}

// Data Collector for Submission
window.getCharacterData = function () {
    const name = document.getElementById('char-name').value;
    const race = document.getElementById('char-race').value;
    const charClass = document.getElementById('char-class').value;
    const theme = document.getElementById('char-theme').value;
    const mode = document.getElementById('char-mode-select').value;
    const backstory = document.getElementById('char-backstory').value;
    const method = document.getElementById('attr-method').value;

    // Validate basic fields first
    console.log('Validating Name:', name);
    if (!name || name.trim() === '') {
        const basicTab = document.querySelector('[data-tab="tab-basic"]');
        if (basicTab) basicTab.click();
        const nameField = document.getElementById('char-name');
        nameField.style.border = '2px solid #ff4d4d';
        nameField.style.animation = 'shake 0.5s, flash-red 1.5s';
        nameField.focus();
        showValidationToast('ℹ️', 'Por favor, preencha o Nome do Personagem.');
        setTimeout(() => {
            nameField.style.animation = '';
            nameField.style.border = '';
        }, 1500);
        return null;
    }

    if (!charClass || charClass.trim() === '') {
        const basicTab = document.querySelector('[data-tab="tab-basic"]');
        if (basicTab) basicTab.click();
        const classField = document.getElementById('char-class');
        classField.style.border = '2px solid #ff4d4d';
        classField.style.animation = 'shake 0.5s, flash-red 1.5s';
        classField.focus();
        showValidationToast('ℹ️', 'Por favor, preencha a Classe do Personagem.');
        setTimeout(() => {
            classField.style.animation = '';
            classField.style.border = '';
        }, 1500);
        return null;
    }

    if (!theme || theme.trim() === '') {
        const basicTab = document.querySelector('[data-tab="tab-basic"]');
        if (basicTab) basicTab.click();
        const themeField = document.getElementById('char-theme');
        themeField.style.border = '2px solid #ff4d4d';
        themeField.style.animation = 'shake 0.5s, flash-red 1.5s';
        themeField.focus();
        showValidationToast('ℹ️', 'Por favor, preencha o Tema da Campanha.');
        setTimeout(() => {
            themeField.style.animation = '';
            themeField.style.border = '';
        }, 1500);
        return null;
    }

    // Validate backstory field
    if (!backstory || backstory.trim() === '') {
        // Switch to story tab
        const storyTab = document.querySelector('[data-tab="tab-story"]');
        if (storyTab) storyTab.click();

        // Get backstory textarea
        const backstoryField = document.getElementById('char-backstory');

        // Add red flash animation
        backstoryField.style.border = '2px solid #ff4d4d';
        backstoryField.style.animation = 'shake 0.5s, flash-red 1.5s';

        // Focus the field
        backstoryField.focus();

        showValidationToast('ℹ️', 'Por favor, preencha a História do Personagem. Este campo é obrigatório!');

        // Remove animation after it completes
        setTimeout(() => {
            backstoryField.style.animation = '';
            backstoryField.style.border = '';
        }, 1500);

        return null;
    }

    let finalStats = {};
    if (method === 'pointBuy') {
        ATTRIBUTES.forEach(attr => {
            finalStats[attr.id] = pbValues[attr.id] + getRacialBonus(attr.id);
        });
    } else {
        // Validate Standard Array
        const allSelected = Object.values(saSelections).every(v => v !== null);
        if (!allSelected) {
            alert("Por favor, distribua todos os valores do Array Padrão.");
            return null;
        }
        ATTRIBUTES.forEach(attr => {
            finalStats[attr.id] = saSelections[attr.id] + getRacialBonus(attr.id);
        });
    }

    // Map to full names for backend
    const backendStats = {
        forca: finalStats.for,
        destreza: finalStats.des,
        constituicao: finalStats.con,
        inteligencia: finalStats.int,
        sabedoria: finalStats.sab,
        carisma: finalStats.car
    };

    return {
        nome: name,
        raca: race,
        classe: charClass,
        tema: theme,
        modo: mode,
        historia: backstory, // New Field
        atributos: backendStats
    };
};

// Show Validation Toast
function showValidationToast(icon, message) {
    const toast = document.getElementById('validation-toast');
    if (!toast) return;

    const iconEl = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    if (iconEl) iconEl.textContent = icon || 'ℹ️';
    if (messageEl) messageEl.textContent = message || 'Campo obrigatório não preenchido.';

    // Reset animations
    toast.classList.remove('hidden', 'hiding');
    const progressBar = toast.querySelector('.toast-progress');
    if (progressBar) {
        progressBar.style.animation = 'none';
        setTimeout(() => {
            progressBar.style.animation = 'shrinkProgress 5s linear forwards';
        }, 10);
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('hiding');
        }, 300);
    }, 5000);
}
