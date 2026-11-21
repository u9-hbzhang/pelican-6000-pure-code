// src/kit/kit.js
// Shared deterministic PRNG, pooled 1000x1000 Framebuffer + 2D Graphics layers,
// static texture baking cache, and p5.brush flush helpers.

import { PANEL_SIZE, ROAD_EDGE_Y } from '../beat/timeline.js';

/**
 * Deterministic fast Mulberry32 PRNG returning floats in [0, 1).
 */
export function makePRNG(seed = 1) {
  let s = (Number(seed) ^ 0x9e3779b9) >>> 0;
  if (s === 0) s = 1;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) * 2.3283064365386963e-10;
  };
}

export function hashSeed(strOrNum) {
  const str = String(strOrNum);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

/**
 * Invokes p5.brush's registered lifecycle flush (`predraw` + `postdraw`) while the
 * target `p5.Framebuffer` is still bound, cleanly compositing BOTH pending stroke/hatch
 * (`Pt.glMask`) and watercolor fill/wash (`Pt.mask`) into the active framebuffer and
 * clearing all internal masks so zero state bleeds across scenes or into main `postdraw`.
 */
function runBrushLifecycleFlush(p) {
  const hooks = p?.constructor?.lifecycleHooks;
  if (hooks?.predraw && hooks?.postdraw) {
    for (const fn of hooks.predraw) fn.call(p);
    for (const fn of hooks.postdraw) fn.call(p);
  }
}

export function flushBrushTarget(brush, p = window?.p5?.instance) {
  if (!brush || !p) return;
  runBrushLifecycleFlush(p);
}

/**
 * Creates the shared Kit manager bound to the active p5 WEBGL sketch instance `p`
 * and global `brush` module.
 */
export function createKit(p, brush) {
  // Four panel slots. Current scenes composite into g2d; allocate a GPU target
  // only if a scene actually requests it, rather than reserving four unused FBOs.
  const slots = [];
  for (let i = 0; i < 4; i++) {
    let fb;
    const g2d = p.createGraphics(PANEL_SIZE, PANEL_SIZE);
    g2d.pixelDensity(1);
    slots.push({ get fb() {
      return fb ??= p.createFramebuffer({ width: PANEL_SIZE, height: PANEL_SIZE, density: 1, antialias: true });
    }, g2d, inUse: false });
  }

  // Static baked 2D canvases (zero WebGL context overhead, instant drawImage/image reuse)
  const static2DCache = new Map();
  // Transient WebGL brush layers, copied to baked 2D artwork before endFrame.
  const staticBrushCache = new Map();
  // Outro frozen 20-era thumbnails cache (512x512 each)
  const outroTileCache = new Map();
  const usedThisFrame = new Set();
  const cacheBudget = 32 * 1024 * 1024;
  let canvasBytes = 0;

  function disposeGraphic(g) {
    const canvas = g.canvas;
    // p5's main WebGL renderer can retain a texture of a separate Graphics.
    // This vendored p5 texture map is not cleaned by Graphics.remove().
    for (const source of [g, canvas]) {
      const texture = p._renderer?.textures?.get(source);
      if (texture) {
        texture.remove();
        p._renderer.textures.delete(source);
      }
    }
    g.remove();
    // Removing the DOM node alone does not release its backing store.
    if (canvas) canvas.width = canvas.height = 0;
  }

  function beginFrame() {
    usedThisFrame.clear();
  }

  function endFrame() {
    // Brush bakes are copied into 2D artwork by their callers in the same pass.
    for (const fb of staticBrushCache.values()) fb.remove();
    staticBrushCache.clear();
    for (const [key, g] of static2DCache) {
      if (canvasBytes <= cacheBudget) break;
      if (usedThisFrame.has(key)) continue;
      canvasBytes -= g.width * g.height * 4;
      disposeGraphic(g);
      static2DCache.delete(key);
    }
  }

  function cacheStats() {
    return { canvasBytes, canvases: static2DCache.size, brushBuffers: staticBrushCache.size };
  }

  function clearOutroTiles() {
    for (const g of outroTileCache.values()) disposeGraphic(g);
    outroTileCache.clear();
  }

  function getSlot(slotIndex) {
    return slots[slotIndex % slots.length];
  }

  /**
   * Bakes a static 1000x1000 (or custom w x h) 2D canvas texture once by `key`.
   */
  function bake2D(key, drawFn, w = PANEL_SIZE, h = PANEL_SIZE) {
    usedThisFrame.add(key);
    if (static2DCache.has(key)) {
      const cached = static2DCache.get(key);
      static2DCache.delete(key);
      static2DCache.set(key, cached);
      return cached;
    }
    const g = p.createGraphics(w, h);
    g.pixelDensity(1);
    const rng = makePRNG(hashSeed(key));
    try {
      drawFn(g, g.drawingContext, rng, w, h);
    } catch (error) {
      disposeGraphic(g);
      throw error;
    }
    static2DCache.set(key, g);
    canvasBytes += w * h * 4;
    return g;
  }

  /**
   * Bakes a static 1000x1000 p5.brush artwork once into a reusable p5.Framebuffer.
   */
  function bakeBrush(key, drawFn) {
    if (staticBrushCache.has(key)) return staticBrushCache.get(key);
    runBrushLifecycleFlush(p);
    const fb = p.createFramebuffer({
      width: PANEL_SIZE,
      height: PANEL_SIZE,
      density: 1,
      antialias: true,
    });
    const seed = hashSeed(key);
    p.randomSeed(seed);
    p.noiseSeed(seed);
    const gl = p.drawingContext;
    const origEnable = gl?.enable;
    if (gl && typeof origEnable === 'function') {
      // Bypass p5.brush v2's Y-flipped dirtyRect scissor optimization on p5.Framebuffer targets
      // so offscreen Kubelka-Munk watercolor fills/washes composite & clear across the full 1000x1000 FBO.
      gl.enable = function patchedEnable(cap) {
        if (cap === gl.SCISSOR_TEST) return;
        return origEnable.call(this, cap);
      };
    }
    try {
      fb.draw(() => {
        p.push();
        p.clear();
        brush.load(fb);
        brush.noClip();
        brush.noField();
        brush.noFill();
        brush.noWash();
        brush.noHatch();
        brush.noMass();
        brush.noStroke();
        p.translate(-PANEL_SIZE / 2, -PANEL_SIZE / 2);
        drawFn(p, brush, makePRNG(seed));
        p.pop();
        runBrushLifecycleFlush(p);
      });
    } catch (error) {
      fb.remove();
      throw error;
    } finally {
      if (gl && typeof origEnable === 'function') {
        gl.enable = origEnable;
        gl.disable(gl.SCISSOR_TEST);
      }
      brush.load();
    }
    staticBrushCache.set(key, fb);
    return fb;
  }

  /**
   * Evaluates canonical road Y(x) & tangent slope(x) inside a [0..1000] panel,
   * anchored at ROAD_EDGE_Y (680) at both x=0 and x=1000 with horizontal edge tangents
   * so adjacent panels join with C1 smoothness!
   */
  function sampleRoad(x, archHeight = 0) {
    const u = Math.max(0, Math.min(1, x / PANEL_SIZE));
    if (!archHeight) {
      return { y: ROAD_EDGE_Y, slope: 0 };
    }
    // Smooth raised bell-arch: h(u) = archHeight * sin^2(pi * u) -> h(0)=0, h(1)=0, h'(0)=0, h'(1)=0!
    const s = Math.sin(Math.PI * u);
    const y = ROAD_EDGE_Y - archHeight * s * s;
    const dydx = (-archHeight * Math.PI * Math.sin(2 * Math.PI * u)) / PANEL_SIZE;
    return { y, slope: Math.atan(dydx) };
  }

  return {
    p,
    brush,
    PANEL_SIZE,
    ROAD_EDGE_Y,
    getSlot,
    bake2D,
    bakeBrush,
    beginFrame,
    endFrame,
    cacheStats,
    disposeGraphic,
    clearOutroTiles,
    sampleRoad,
    outroTileCache,
    makePRNG,
    hashSeed,
    flushBrushTarget: () => flushBrushTarget(brush, p),
  };
}
