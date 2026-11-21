import test from 'node:test';
import assert from 'node:assert/strict';
import { cinemaLayout, bindScreenLayout } from '../src/components/screen-layout.js';

const settled = () => new Promise((resolve) => setImmediate(resolve));

function environment({ mobile = true, supported = true } = {}) {
  const view = new EventTarget();
  view.innerWidth = 390;
  view.innerHeight = 744;
  view.matchMedia = () => ({ matches: mobile });
  const doc = new EventTarget();
  doc.fullscreenEnabled = supported;
  doc.fullscreenElement = null;
  const hints = [];
  const values = new Map();
  const classes = new Map();
  let requests = 0;
  let exits = 0;
  let allow = true;
  const shell = {
    style: { setProperty: (name, value) => values.set(name, value) },
    classList: { toggle: (name, value) => classes.set(name, value) },
    async requestFullscreen() {
      requests++;
      if (!allow) throw new Error('User activation required');
      doc.fullscreenElement = shell;
      doc.dispatchEvent(new Event('fullscreenchange'));
    },
  };
  doc.exitFullscreen = async () => {
    exits++;
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event('fullscreenchange'));
  };
  const controller = bindScreenLayout(shell, { view, doc, onHint: (text) => hints.push(text) });
  return {
    controller, doc, shell, values, classes, hints,
    get requests() { return requests; },
    get exits() { return exits; },
    set allow(value) { allow = value; },
    resize(width, height) {
      view.innerWidth = width;
      view.innerHeight = height;
      view.dispatchEvent(new Event('resize'));
    },
  };
}

test('orientation always follows viewport dimensions, without synthetic rotation', () => {
  assert.deepEqual(cinemaLayout(390, 744), { width: 390, height: 744, landscape: false });
  assert.deepEqual(cinemaLayout(744, 390), { width: 744, height: 390, landscape: true });
});

test('portrait playback stays portrait; turning the phone requests fullscreen and turning back exits', async () => {
  const env = environment();
  env.controller.handleGesture(false);
  assert.equal(env.requests, 0);
  assert.equal(env.values.get('--cinema-width'), '390px');
  env.resize(744, 390);
  await settled();
  assert.equal(env.requests, 1);
  assert.equal(env.doc.fullscreenElement, env.shell);
  assert.equal(env.classes.get('is-landscape'), true);
  assert.equal(env.values.get('--cinema-width'), '744px');
  env.resize(390, 744);
  await settled();
  assert.equal(env.exits, 1);
  assert.equal(env.doc.fullscreenElement, null);
});

test('landscape initial load waits for the first play gesture', async () => {
  const env = environment();
  env.resize(744, 390);
  assert.equal(env.requests, 0);
  assert.equal(env.controller.handleGesture(false), false);
  await settled();
  assert.equal(env.requests, 1);
});

test('a rejected orientation request retries on tap without pausing the playing film', async () => {
  const env = environment();
  env.controller.handleGesture(false);
  env.allow = false;
  env.resize(744, 390);
  await settled();
  assert.equal(env.doc.fullscreenElement, null);
  assert.equal(env.hints.at(-1), '轻点画面进入全屏');
  env.allow = true;
  assert.equal(env.controller.handleGesture(true), true);
  await settled();
  assert.equal(env.doc.fullscreenElement, env.shell);
  assert.equal(env.controller.handleGesture(true), false, 'normal playback taps work again');
});

test('unsupported iPhone fullscreen does not fake rotation or repeatedly swallow playback taps', async () => {
  const env = environment({ supported: false });
  env.resize(744, 390);
  assert.equal(env.controller.handleGesture(false), false);
  await settled();
  assert.equal(env.requests, 0);
  assert.equal(env.doc.fullscreenElement, null);
  assert.equal(env.values.get('--cinema-width'), '744px');
  assert.equal(env.controller.handleGesture(true), false);
  assert.equal(env.hints.length, 1);
});

test('desktop resize and manually exiting fullscreen do not force re-entry', async () => {
  const desktop = environment({ mobile: false });
  desktop.controller.handleGesture(false);
  desktop.resize(1200, 800);
  await settled();
  assert.equal(desktop.requests, 0);
  const phone = environment();
  phone.resize(744, 390);
  phone.controller.handleGesture(false);
  await settled();
  await phone.doc.exitFullscreen();
  phone.resize(740, 390);
  await settled();
  assert.equal(phone.requests, 1);
});

test('turning back to portrait during an in-flight fullscreen request leaves fullscreen', async () => {
  const env = environment();
  let finish;
  env.shell.requestFullscreen = () => new Promise((resolve) => {
    finish = () => { env.doc.fullscreenElement = env.shell; resolve(); };
  });
  // bind again so the controller captures the delayed browser request.
  const view = new EventTarget();
  view.innerWidth = 744; view.innerHeight = 390;
  view.matchMedia = () => ({ matches: true });
  const controller = bindScreenLayout(env.shell, { view, doc: env.doc });
  controller.handleGesture(false);
  view.innerWidth = 390; view.innerHeight = 744;
  view.dispatchEvent(new Event('resize'));
  finish();
  await settled();
  assert.equal(env.doc.fullscreenElement, null);
});
