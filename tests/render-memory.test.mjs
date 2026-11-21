import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../src/fusion/github_core/kit/kit.js';

function fixture() {
  const live = new Set();
  const resource = (w, h, kind) => {
    const r = { width: w, height: h, kind, canvas: { width: w, height: h },
      drawingContext: {}, pixelDensity() {}, draw(fn) { fn(); },
      remove() { live.delete(r); } };
    live.add(r);
    return r;
  };
  const p = { createGraphics: (w, h) => resource(w, h, '2d'),
    createFramebuffer: ({ width, height }) => resource(width, height, 'fb'),
    randomSeed() {}, noiseSeed() {}, push() {}, pop() {}, clear() {}, translate() {} };
  const brush = new Proxy({}, { get: () => () => {} });
  return { kit: createKit(p, brush), live };
}

test('successive scene bakes release old canvases and completed brush framebuffers', () => {
  const { kit, live } = fixture();
  for (let scene = 0; scene < 20; scene++) {
    kit.beginFrame?.();
    kit.bake2D(`scene-${scene}`, () => {
      kit.bakeBrush(`wash-${scene}`, () => {});
      kit.bake2D(`paper-${scene}`, () => {});
    });
    kit.endFrame?.();
  }
  assert.equal([...live].filter(r => r.kind === 'fb').length, 0, 'completed brush buffers released; unused pool stays unallocated');
  const bytes = [...live].filter(r => r.kind === '2d').reduce((n, r) => n + r.width * r.height * 4, 0);
  assert.ok(bytes <= 16e6 + 32 * 1024 ** 2, `retained ${bytes} canvas bytes`);
});

test('a panel framebuffer is created only on demand and reused', () => {
  const { kit, live } = fixture();
  const slot = kit.getSlot(0);
  assert.equal([...live].filter(r => r.kind === 'fb').length, 0);
  const fb = slot.fb;
  assert.equal(kit.getSlot(4).fb, fb);
  assert.equal([...live].filter(r => r.kind === 'fb').length, 1);
});

test('current-frame textures remain valid, including nested bakes; released textures rebake deterministically', () => {
  const { kit } = fixture();
  kit.beginFrame?.();
  let firstSeed;
  const first = kit.bake2D('first', (_g, _ctx, rng) => { firstSeed = rng(); });
  for (let i = 0; i < 12; i++) kit.bake2D(`large-${i}`, () => {});
  kit.endFrame?.();
  assert.equal(first.canvas.width, 1000);
  kit.beginFrame?.();
  kit.bake2D('new-frame', () => {});
  kit.endFrame?.();
  assert.equal(first.canvas.width, 0, 'old bitmap explicitly released');
  kit.beginFrame?.();
  let secondSeed;
  kit.bake2D('first', (_g, _ctx, rng) => { secondSeed = rng(); });
  assert.equal(firstSeed, secondSeed);
  kit.endFrame?.();
});
