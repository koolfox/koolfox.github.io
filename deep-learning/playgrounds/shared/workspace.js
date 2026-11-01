(() => {
    let codeMode = false;
    try {
        codeMode = new URL(window.parent.location.href).searchParams.get('_danna-code') === '1';
    } catch { /* The standalone application remains usable. */ }
    if (!codeMode) return;
    document.documentElement.classList.add('code-result');
    function collapseControls() {
        document.querySelectorAll('[data-code-controls]').forEach(panel => { panel.open = false; });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', collapseControls, { once: true });
    else collapseControls();
})();
