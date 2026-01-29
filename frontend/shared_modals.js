// shared_modals.js - Unified Modal Management

/**
 * Opens a modal by ID
 */
function openModal(modalId) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;

    if (modalOverlay) modalOverlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Closes all modals
 */
function closeAllModals() {
    const modalOverlay = document.getElementById('modal-overlay');
    const allModals = document.querySelectorAll('.modal');
    const sidebar = document.getElementById('app-sidebar');
    const mainContent = document.getElementById('main-content');

    if (modalOverlay) modalOverlay.classList.add('hidden');
    allModals.forEach(modal => modal.classList.add('hidden'));
    if (sidebar) sidebar.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('sidebar-open');
}

/**
 * Initialize modal overlay if it doesn't exist
 */
function ensureModalOverlay() {
    if (!document.getElementById('modal-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.addEventListener('click', closeAllModals);
        document.body.appendChild(overlay);
    }
}

/**
 * Initialize modal system
 * - Ensures overlay exists
 * - Binds close buttons
 */
function initModalSystem() {
    ensureModalOverlay();

    // Bind all close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
}

/**
 * Confirm dialog - returns Promise<boolean>
 */
function confirmDialog(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h2>⚠️ Confirmação</h2>
            </div>
            <div class="modal-body">
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel confirm-cancel">${cancelText}</button>
                    <button class="btn-primary confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        openModal(modal);

        const cleanup = () => {
            closeAllModals();
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.confirm-ok').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });

        modal.querySelector('.confirm-cancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
    });
}

// Export to window
window.openModal = openModal;
window.closeAllModals = closeAllModals;
window.initModalSystem = initModalSystem;
window.confirmDialog = confirmDialog;
