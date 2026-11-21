// Layout rotation is independent of device orientation/fullscreen APIs (not universal in WebViews).
export function cinemaLayout(width, height, landscapeRequested) {
  const rotated = Boolean(landscapeRequested && height > width);
  return { width: rotated ? height : width, height: rotated ? width : height, rotated };
}

export function bindScreenLayout(shell, button) {
  let requested = false;
  const refresh = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const layout = cinemaLayout(width, height, requested);
    shell.style.setProperty('--cinema-width', `${layout.width}px`);
    shell.style.setProperty('--cinema-height', `${layout.height}px`);
    shell.classList.toggle('is-rotated', layout.rotated);
    button.setAttribute('aria-pressed', String(requested));
    button.textContent = requested ? '退出横屏' : '横屏观看';
  };
  button.addEventListener('click', () => { requested = !requested; refresh(); });
  window.addEventListener('resize', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  refresh();
  return { refresh };
}
