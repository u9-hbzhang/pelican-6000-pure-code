import { bindScreenLayout } from './screen-layout.js';

export function bindPlayer({ renderer, clock, features }) {
  const shell = document.querySelector('#cinema-shell');
  const notice = document.createElement('p');
  notice.className = 'player-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  shell.append(notice);

  let frame = 0;
  let lastRenderedT = -1;
  let busy = false;
  let noticeTimer = 0;
  let idleTimer = 0;
  let firstPlayback = true;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const message = (text) => {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    notice.hidden = !text;
    if (text) noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 2500);
  };
  const layout = bindScreenLayout(shell, { onHint: message });
  const draw = (force = false) => {
    const nowT = clock.time;
    if (!force && clock.playing && Math.abs(nowT - lastRenderedT) < 0.0005) return;
    lastRenderedT = nowT;
    renderer.renderAt(nowT);
  };
  const tick = () => {
    draw(false);
    if (clock.playing) frame = requestAnimationFrame(tick);
  };
  const bumpActivity = () => {
    shell.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (clock.playing) idleTimer = window.setTimeout(() => shell.classList.add('is-idle'), 2000);
  };
  const togglePlay = async () => {
    if (busy) return;
    busy = true;
    try {
      await clock.toggle();
      cancelAnimationFrame(frame);
      draw(true);
      bumpActivity();
      if (clock.playing) {
        frame = requestAnimationFrame(tick);
        if (firstPlayback) {
          firstPlayback = false;
          // Websites cannot read the iPhone hardware Silent switch or system volume.
          // Phrase this as troubleshooting, never as a detected mute state.
          if (isIOS) message('若没有声音，请关闭 iPhone 静音模式并调高音量');
        }
      }
    } catch (err) {
      message(err.message || '播放失败，请刷新页面重试。');
    } finally {
      busy = false;
    }
  };

  let clickTimer = 0;
  shell.addEventListener('click', () => {
    // Audio and native fullscreen must be unlocked directly within the same tap.
    clock.unlockAudio().catch((err) => message(err.message));
    clearTimeout(clickTimer);
    if (layout.handleGesture(clock.playing)) return;
    clickTimer = window.setTimeout(togglePlay, 180);
  });
  shell.addEventListener('dblclick', (event) => {
    event.preventDefault();
    clearTimeout(clickTimer);
    layout.toggleFullscreen();
  });
  shell.addEventListener('mousemove', bumpActivity, { passive: true });
  clock.addEventListener('ended', () => {
    cancelAnimationFrame(frame);
    clearTimeout(idleTimer);
    shell.classList.remove('is-idle');
    draw(true);
  });
  clock.addEventListener('seeked', () => draw(true));
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      clock.unlockAudio().catch((err) => message(err.message));
      if (!layout.handleGesture(clock.playing)) togglePlay();
    } else if (event.code === 'KeyF') {
      event.preventDefault();
      layout.toggleFullscreen();
    } else if (event.code === 'KeyM') clock.muted = !clock.muted;
    else if (event.code === 'KeyR') { clock.seek(0); draw(true); }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault();
      clock.seek(clock.time + (event.code === 'ArrowRight' ? 5 : -5));
      draw(true);
    }
  });
  draw(true);
  message('轻点画面播放');
  return {
    draw: () => draw(true),
    seekToScene: (i) => { clock.seek(features.transitions[i] + 0.1); draw(true); },
  };
}
