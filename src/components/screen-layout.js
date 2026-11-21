// Follow the actual viewport. Never rotate or swap dimensions in CSS.
export function cinemaLayout(width, height) {
  return { width, height, landscape: width > height };
}

export function bindScreenLayout(shell, {
  onHint = () => {},
  view = window,
  doc = document,
} = {}) {
  let landscape = false;
  let started = false;
  let pendingGesture = false;
  let requesting = false;
  let autoFullscreen = false;
  let unsupportedHintShown = false;
  const mobile = view.matchMedia('(pointer: coarse)').matches;
  const fullscreenElement = () => doc.fullscreenElement || doc.webkitFullscreenElement;
  const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
  const supported = () => Boolean(request)
    && (shell.requestFullscreen ? doc.fullscreenEnabled : doc.webkitFullscreenEnabled) !== false;

  const exit = async () => {
    autoFullscreen = false;
    if (fullscreenElement() !== shell) return;
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    } catch { /* The browser may already have exited during rotation. */ }
  };

  const enter = async (automatic, fromGesture = false) => {
    if (requesting || fullscreenElement()) return;
    pendingGesture = false;
    if (!supported()) {
      if (!unsupportedHintShown) {
        unsupportedHintShown = true;
        onHint('当前浏览器不支持网页全屏，已按可用区域最大显示');
      }
      return;
    }
    requesting = true;
    try {
      // Invoke synchronously so a tap's transient user activation is preserved.
      await request.call(shell);
      autoFullscreen = automatic;
      // Rotation can finish before the fullscreen request does.
      if (automatic && !landscape) await exit();
    } catch {
      // An orientation event is not a user gesture. Retry only on the next tap.
      pendingGesture = automatic && landscape && !fromGesture;
      if (pendingGesture) onHint('轻点画面进入全屏');
    } finally {
      requesting = false;
    }
  };

  const refresh = () => {
    const viewport = view.visualViewport;
    const layout = cinemaLayout(viewport?.width || view.innerWidth, viewport?.height || view.innerHeight);
    const wasLandscape = landscape;
    landscape = layout.landscape;
    shell.style.setProperty('--cinema-width', layout.width + 'px');
    shell.style.setProperty('--cinema-height', layout.height + 'px');
    shell.classList.toggle('is-landscape', landscape);
    if (!landscape) {
      pendingGesture = false;
      if (autoFullscreen) void exit();
    } else if (!wasLandscape && started && mobile) {
      void enter(true);
    }
  };
  view.addEventListener('resize', refresh);
  view.visualViewport?.addEventListener('resize', refresh);
  view.screen?.orientation?.addEventListener('change', refresh);
  doc.addEventListener('fullscreenchange', refresh);
  doc.addEventListener('webkitfullscreenchange', refresh);
  refresh();

  return {
    // Returns true when a playing film should keep playing while this tap enters fullscreen.
    handleGesture(playing) {
      const firstGesture = !started;
      const consume = Boolean(playing && pendingGesture && landscape && mobile);
      started = true;
      if (mobile && landscape && (firstGesture || pendingGesture)) void enter(true, true);
      return consume;
    },
    toggleFullscreen() {
      if (fullscreenElement()) void exit();
      else void enter(false, true);
    },
  };
}
