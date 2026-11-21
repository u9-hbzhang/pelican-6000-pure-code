import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioController } from '../src/audio/audio-controller.js';

test('successful worklet handoff releases the main-thread parameter buffers', async (t) => {
  const old = globalThis.AudioWorkletNode;
  let handedOff;
  globalThis.AudioWorkletNode = class {
    constructor(_context, _name, options) { handedOff = options.processorOptions.payloads; this.port = { postMessage() {} }; }
    connect() {}
  };
  t.after(() => { if (old) globalThis.AudioWorkletNode = old; else delete globalThis.AudioWorkletNode; });
  const controller = new AudioController({ duration: 10 }, () => {});
  controller.payloads = { vocal: new ArrayBuffer(1024) };
  controller.payloadsPromise = Promise.resolve(controller.payloads);
  await controller.ensureSynth();
  assert.equal(handedOff.vocal.byteLength, 1024);
  assert.equal(controller.payloads, null);
  assert.equal(controller.payloadsPromise, null);
  assert.equal(await controller.preload(), null, 'playing worklet must not decode another copy');
});

// Policy seam isolated by the iPhone reproduction: turning off Silent restores sound.
// This verifies the requested media category; actual speaker output still needs device QA.
test('request the playback audio category before starting Web Audio on iPhone', async (t) => {
  const session = { type: 'auto' };
  t.mock.getter(globalThis, 'navigator', () => ({ audioSession: session }));
  const observed = [];
  class Context {
    constructor() {
      observed.push(session.type);
      this.destination = {};
      this.state = 'suspended';
      this.audioWorklet = { addModule: async () => {} };
    }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  const old = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  t.after(() => { if (old) globalThis.AudioContext = old; else delete globalThis.AudioContext; });
  const controller = new AudioController({ duration: 10 }, () => {});
  await controller.ensureContext();
  assert.equal(observed[0], 'playback', 'ambient output is silenced by the iPhone Ring/Silent switch');
  assert.equal(session.type, 'playback');
});

test('browsers without AudioSession still start Web Audio', async (t) => {
  t.mock.getter(globalThis, 'navigator', () => ({}));
  class Context {
    constructor() { this.destination = {}; this.state = 'suspended'; this.audioWorklet = { addModule: async () => {} }; }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  const old = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  t.after(() => { if (old) globalThis.AudioContext = old; else delete globalThis.AudioContext; });
  const controller = new AudioController({ duration: 10 }, () => {});
  await controller.ensureContext();
  assert.equal(controller.context.state, 'running');
});
