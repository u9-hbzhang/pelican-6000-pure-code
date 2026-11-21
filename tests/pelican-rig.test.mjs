import test from 'node:test';
import assert from 'node:assert/strict';
import { computePelicanRig, solveTwoBoneIK } from '../src/fusion/github_core/rig/pelican.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-7, `${label}: ${a} != ${b}`);
const joints = ['bb', 'leftPedal', 'rightPedal', 'rearWheel', 'frontWheel', 'hip', 'bodyCenter',
  'tailTip', 'chest', 'neckC1', 'neckC2', 'head', 'beakUpperBase', 'beakLowerBase', 'beakTip',
  'pouchBelly', 'crest1', 'crest2', 'wingShoulder', 'wingElbow', 'wingTip',
  'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftFoot', 'rightFoot'];

test('every pedal phase preserves leg lengths, crank opposition and hand/foot contact', () => {
  for (const scale of [0.16, 1, 1.375]) {
    for (const speedScale of [0, 0.25, 1, 1.2]) {
      for (let step = 0; step < 360; step++) {
        const r = computePelicanRig({ pedalAngle: step * Math.PI / 180, scale, slope: 0.27, speedScale });
        for (const side of ['left', 'right']) {
          close(distance(r[side + 'Hip'], r[side + 'Knee']), 52 * scale, 'thigh');
          close(distance(r[side + 'Knee'], r[side + 'Foot']), 54 * scale, 'shin');
          close(distance(r[side + 'Foot'], r[side + 'Pedal']), 5 * scale, 'foot contact');
          close(distance(r.bb, r[side + 'Pedal']), 21 * scale, 'crank');
        }
        close((r.leftPedal.x + r.rightPedal.x) / 2, r.bb.x, 'opposed cranks x');
        close((r.leftPedal.y + r.rightPedal.y) / 2, r.bb.y, 'opposed cranks y');
        close(distance(r.wingShoulder, r.wingElbow), 34 * scale, 'upper wing');
        close(distance(r.wingElbow, r.wingTip), 32 * scale, 'lower wing');
        close(distance(r.wingTip, r.handleGrip), 2 * scale, 'bar contact');
        close(distance(r.rearWheel, r.frontWheel), 172 * scale, 'wheelbase');
      }
    }
  }
});

test('cycling poses are continuous over a complete revolution, including negative phases', () => {
  for (const phase of [-6.3, -0.001, 0, 1.9, 6.28]) {
    const a = computePelicanRig({ pedalAngle: phase });
    const b = computePelicanRig({ pedalAngle: phase + 2 * Math.PI });
    for (const key of joints) {
      close(a[key].x, b[key].x, key + '.x');
      close(a[key].y, b[key].y, key + '.y');
    }
  }
});

test('power and recovery poses have visibly distinct silhouettes at normal riding speed', () => {
  const cycle = Array.from({ length: 360 }, (_, i) => computePelicanRig({ pedalAngle: i * Math.PI / 180 }));
  const travel = (joint, axis) => {
    const values = cycle.map(r => r[joint][axis]);
    return Math.max(...values) - Math.min(...values);
  };
  assert.ok(travel('head', 'x') > 45, 'head needs a readable forward/recovery gesture');
  assert.ok(travel('head', 'y') > 30, 'neck needs visible compression and extension');
  assert.ok(travel('tailTip', 'y') > 20, 'tail should follow the torso gesture');
});

test('stopped secondary motion and Egyptian tableaux do not drift with time', () => {
  for (const opts of [{ speedScale: 0 }, { poseMode: 'egypt_freeze' }]) {
    const a = computePelicanRig({ ...opts, pedalAngle: 0.8, time: 0 });
    const b = computePelicanRig({ ...opts, pedalAngle: 0.8, time: 50 });
    for (const key of joints) assert.deepEqual(a[key], b[key]);
  }
});

test('seeking and out-of-order thumbnail renders have no effect on a pose', () => {
  const opts = { pedalAngle: 2.3, time: 88, x: 320, y: 675, scale: 0.22, slope: -0.2 };
  const expected = computePelicanRig(opts);
  computePelicanRig({ pedalAngle: 0, time: 0 });
  computePelicanRig({ pedalAngle: 1800, time: 174 });
  assert.deepEqual(computePelicanRig(opts), expected);
});

test('scene pose modes and oscilloscope distortion keep all coordinates finite', () => {
  for (const poseMode of ['normal', 'egypt_freeze', 'bada_eye', 'jump', 'lissajous']) {
    for (const lissajousMix of [0, 0.5, 1]) {
      const r = computePelicanRig({ poseMode, lissajousMix, time: 43, pedalAngle: 18 });
      for (const key of joints) assert.ok(Number.isFinite(r[key].x) && Number.isFinite(r[key].y), key);
      assert.equal(r.poseMode, poseMode);
    }
  }
});

test('IK remains finite at coincident, folded and unreachable endpoints', () => {
  for (const [x, y] of [[0, 0], [0.001, 0], [106, 0], [1000, 0], [-1000, 500]]) {
    for (const bend of [-1, 1]) {
      const knee = solveTwoBoneIK(0, 0, x, y, 52, 54, bend);
      assert.ok(Number.isFinite(knee.x) && Number.isFinite(knee.y));
      close(Math.hypot(knee.x, knee.y), 52, 'upper limb invariant');
    }
  }
});
