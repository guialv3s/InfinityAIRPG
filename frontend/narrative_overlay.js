document.addEventListener('DOMContentLoaded', function () {
    // Narrative Mode Overlay Handler
    const modeSelect = document.getElementById('char-mode-select');
    const narrativeOverlay = document.getElementById('narrative-overlay');

    function updateModeUI() {
        if (!modeSelect) return;

        const isNarrative = modeSelect.value === 'narrativo';
        if (narrativeOverlay) {
            if (isNarrative) {
                narrativeOverlay.classList.remove('hidden');
                narrativeOverlay.style.display = 'flex'; // Force flex for centering
            } else {
                narrativeOverlay.classList.add('hidden');
                narrativeOverlay.style.display = 'none';
            }
        }
    }

    if (modeSelect) {
        modeSelect.addEventListener('change', updateModeUI);
        // Run once on init
        setTimeout(updateModeUI, 100); // Small delay to ensure DOM is ready
    }
});
