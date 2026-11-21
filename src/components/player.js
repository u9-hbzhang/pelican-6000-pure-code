import { bindScreenLayout } from './screen-layout.js';

export function bindPlayer({ renderer, clock, features }) {
  const shell = document.querySelector('#cinema-shell');
  const screenWrap = document.querySelector('.screen-wrap');
  const controls = document.createElement('nav');
  controls.className = 'player-controls';
  controls.setAttribute('aria-label', '播放控制');
  controls.innerHTML = `
    <button type="button" data-action="play">开始播放</button>
    <button type="button" data-action="mute" aria-pressed="false">静音</button>
    <button type="button" data-action="landscape" aria-pressed="false">横屏观看</button>
    <button type="button" data-action="restart">重播</button>
    <button type="button" data-action="help" aria-expanded="false">帮助</button>`;
  const notice = document.createElement('p');
  notice.className = 'player-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  const help = document.createElement('section');
  help.className = 'player-help';
  help.hidden = true;
  help.innerHTML = `
    <strong>声音与横屏</strong>
    <p>没有声音？先点“恢复声音”。iPhone 若仍无声，请关闭静音模式，并调高媒体音量。</p>
    <button type="button" data-action="sound">恢复声音</button>
    <p>点“横屏观看”，再把手机横着拿。网页会自行旋转，无需解锁系统方向；微信顶部栏可能仍保持竖向。</p>
    <p>微信没有“浏览器打开”选项？复制下方链接，粘贴到 Safari 地址栏即可。</p>
    <input readonly aria-label="观看链接">
    <button type="button" data-action="copy">复制链接</button>
    <button type="button" data-action="close">关闭帮助</button>`;
  shell.append(controls, notice, help);
  const button = (action) => controls.querySelector('[data-action="' + action + '"]');
  const link = help.querySelector('input');
  link.value = window.location.href;
  bindScreenLayout(shell, button('landscape'));

  let frame = 0;
  let lastRenderedT = -1;
  let busy = false;
  let noticeTimer = 0;
  const message = (text) => {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    notice.hidden = !text;
    if (text) noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 7000);
  };
  const updateControls = () => {
    button('play').textContent = busy ? '准备中…' : clock.playing ? '暂停' : '开始播放';
    button('play').disabled = busy;
    button('mute').textContent = clock.muted ? '开启声音' : '静音';
    button('mute').setAttribute('aria-pressed', String(clock.muted));
  };
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
  const togglePlay = async () => {
    if (busy) return;
    busy = true;
    updateControls();
    message('');
    try {
      await clock.toggle();
      cancelAnimationFrame(frame);
      draw(true);
      if (clock.playing) frame = requestAnimationFrame(tick);
    } catch (err) {
      message(err.message || '播放失败，请刷新页面重试。');
    } finally {
      busy = false;
      updateControls();
    }
  };
  const toggleMute = () => {
    clock.muted = !clock.muted;
    if (!clock.muted) clock.unlockAudio().catch((err) => message(err.message));
  };
  const restart = () => { clock.seek(0); draw(true); };
  const toggleHelp = (visible) => {
    help.hidden = !visible;
    button('help').setAttribute('aria-expanded', String(visible));
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen?.();
      } else if (shell.requestFullscreen) await shell.requestFullscreen();
      else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
      else message('此浏览器不支持全屏，请点“横屏观看”。');
    } catch {
      message('无法进入全屏，请点“横屏观看”。');
    }
  };
  button('play').addEventListener('click', togglePlay);
  button('mute').addEventListener('click', toggleMute);
  button('restart').addEventListener('click', restart);
  button('help').addEventListener('click', () => toggleHelp(help.hidden));
  help.querySelector('[data-action="close"]').addEventListener('click', () => toggleHelp(false));
  help.querySelector('[data-action="sound"]').addEventListener('click', () => {
    clock.muted = false;
    if (!clock.playing) togglePlay();
    else clock.unlockAudio().catch((err) => message(err.message));
  });
  help.querySelector('[data-action="copy"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link.value);
      message('链接已复制，可粘贴到 Safari 或微信。');
    } catch {
      link.focus();
      link.select();
      message('请长按链接并选择“复制”。');
    }
  });

  let clickTimer = 0;
  screenWrap.addEventListener('click', () => {
    // Resume within the original gesture, before waiting to distinguish a double click.
    clock.unlockAudio().catch((err) => message(err.message));
    clearTimeout(clickTimer);
    clickTimer = window.setTimeout(togglePlay, 180);
  });
  screenWrap.addEventListener('dblclick', (event) => {
    event.preventDefault();
    clearTimeout(clickTimer);
    toggleFullscreen();
  });
  clock.addEventListener('ended', () => { cancelAnimationFrame(frame); draw(true); updateControls(); });
  clock.addEventListener('seeked', () => draw(true));
  clock.addEventListener('statechange', updateControls);
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, button')) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
    else if (event.code === 'KeyF') { event.preventDefault(); toggleFullscreen(); }
    else if (event.code === 'KeyM') toggleMute();
    else if (event.code === 'KeyR') restart();
    else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault();
      clock.seek(clock.time + (event.code === 'ArrowRight' ? 5 : -5));
      draw(true);
    }
  });
  draw(true);
  updateControls();
  return {
    draw: () => draw(true),
    seekToScene: (i) => { clock.seek(features.transitions[i] + 0.1); draw(true); },
  };
}
