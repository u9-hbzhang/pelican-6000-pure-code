export function finishStartup() {
  const screen = document.querySelector('#startup-screen');
  if (!screen) return;
  // Allow the initialized canvas to be painted before revealing it.
  requestAnimationFrame(() => {
    screen.classList.add('is-ready');
    screen.setAttribute('aria-hidden', 'true');
    screen.addEventListener('transitionend', () => screen.remove(), { once: true });
    // Also handles reduced-motion and embedded browsers without transition events.
    setTimeout(() => screen.remove(), 500);
  });
}

export function failStartup() {
  const screen = document.querySelector('#startup-screen');
  if (!screen) return;
  screen.classList.add('is-error');
  screen.querySelector('p').textContent = '启动未完成，请刷新重试';
}
