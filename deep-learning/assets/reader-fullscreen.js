export function setupFullscreen(button, root = document.body) {
  let fallback = false;
  const active = () => fallback || Boolean(document.fullscreenElement);
  const sync = () => {
    const isActive = active();
    root.dataset.immersive = String(isActive);
    button.textContent = isActive ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه';
    button.setAttribute('aria-pressed', String(isActive));
    button.setAttribute('aria-label', isActive ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه');
  };
  button.addEventListener('click', async () => {
    if (fallback) {
      fallback = false;
    } else if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    } else if (typeof document.documentElement.requestFullscreen === 'function') {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        fallback = true;
      }
    } else {
      fallback = true;
    }
    sync();
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && fallback) {
      fallback = false;
      sync();
      button.focus();
    }
  });
  sync();
}
