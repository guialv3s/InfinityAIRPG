// Complete validation override - MUST load after character_creation.js
console.log('Validation fix loaded');

// Store original function
const _originalGetData = window.getCharacterData;

// Override the function
window.getCharacterData = function () {
    console.log('=== VALIDATION STARTING ===');

    const name = document.getElementById('char-name').value || '';
    const charClass = document.getElementById('char-class').value || '';
    const theme = document.getElementById('char-theme').value || '';
    const backstory = document.getElementById('char-backstory').value || '';

    console.log('Name:', name);
    console.log('Class:', charClass);
    console.log('Theme:', theme);
    console.log('Backstory:', backstory);

    // Check for empty fields
    const missing = [];
    if (!name.trim()) missing.push({ id: 'char-name', tab: 'tab-basic', name: 'Nome' });
    if (!charClass.trim()) missing.push({ id: 'char-class', tab: 'tab-basic', name: 'Classe' });
    if (!theme.trim()) missing.push({ id: 'char-theme', tab: 'tab-basic', name: 'Tema' });
    if (!backstory.trim()) missing.push({ id: 'char-backstory', tab: 'tab-story', name: 'História' });

    console.log('Missing fields:', missing);

    if (missing.length > 0) {
        // Switch to first missing field's tab
        const firstTab = document.querySelector('[data-tab="' + missing[0].tab + '"]');
        console.log('Switching to tab:', missing[0].tab, firstTab);
        if (firstTab) firstTab.click();

        // Highlight first field
        const firstField = document.getElementById(missing[0].id);
        console.log('Highlighting field:', missing[0].id, firstField);
        if (firstField) {
            firstField.style.border = '2px solid #ff4d4d';
            firstField.style.animation = 'shake 0.5s, flash-red 1.5s';
            setTimeout(function () { firstField.focus(); }, 100);
            setTimeout(function () {
                firstField.style.animation = '';
                firstField.style.border = '';
            }, 1500);
        }

        // Build message
        const fieldNames = missing.map(function (m) { return m.name; }).join(', ');
        const message = missing.length === 1
            ? 'Por favor, preencha: ' + fieldNames
            : 'Campos obrigatórios: ' + fieldNames;

        console.log('Showing toast:', message);

        // Show toast
        if (typeof showValidationToast === 'function') {
            showValidationToast('ℹ️', message);
        } else {
            alert(message);
        }

        return null;
    }

    // If validation passes, call original function
    console.log('Validation passed, calling original function');
    return _originalGetData ? _originalGetData() : null;
};

console.log('Validation override complete');
