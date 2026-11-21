// Local-only measurements. No telemetry or network reporting.
export function createDiagnostics() {
  const key = 'pelican-last-run-v1';
  let previous = null;
  try { previous = JSON.parse(sessionStorage.getItem(key)); } catch {}
  const state = { version: 'memory-20261121', started: Date.now(), stages: {}, lastFrame: null, event: 'startup' };
  let lastSecond = -1;
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const diagnostics = {
    state, previous,
    mark(name) { state.stages[name] = Math.round(performance.now()); save(); },
    event(name) { state.event = name; save(); },
    frame(time, renderer) {
      const second = Math.floor(time);
      if (lastSecond === second) return;
      lastSecond = second;
      state.lastFrame = { seconds: Number(time.toFixed(2)), scene: renderer.sceneIndex(time) + 1,
        cache: renderer.kit?.cacheStats(), width: renderer.canvas.width, height: renderer.canvas.height };
      state.event = 'render';
      save(); // Before rendering: survives a WebView process restart if session storage survives.
    },
  };
  save();
  if (new URLSearchParams(location.search).has('diagnostics')) {
    const panel = document.createElement('pre');
    panel.style.cssText = 'position:fixed;bottom:0;left:0;z-index:10001;pointer-events:none;color:white;background:#000c;font:11px monospace;max-width:100vw;white-space:pre-wrap;margin:0;padding:6px';
    document.body.append(panel);
    const update = () => {
      const last = state.lastFrame;
      panel.textContent = [state.version,
        ...Object.entries(state.stages).map(([name, ms]) => `${name}: ${(ms / 1000).toFixed(2)}s`),
        last ? `scene ${last.scene} @ ${last.seconds}s / ${last.width}x${last.height}` : 'preparing',
        last?.cache ? `2D cache: ${(last.cache.canvasBytes / 1048576).toFixed(1)} MiB (not total memory)` : '',
        `event: ${state.event}`,
        previous ? `previous: ${previous.event}, scene ${previous.lastFrame?.scene ?? '-'} @ ${previous.lastFrame?.seconds ?? '-'}s` : 'previous: none',
      ].filter(Boolean).join('\n');
    };
    update();
    setInterval(update, 1000);
  }
  return diagnostics;
}
