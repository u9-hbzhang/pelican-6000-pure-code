import test from 'node:test';
import assert from 'node:assert/strict';
import { cinemaLayout } from '../src/components/screen-layout.js';

test('portrait iPhone can view a landscape page without native rotation or fullscreen', () => {
  assert.deepEqual(cinemaLayout(390, 744, true), { width: 744, height: 390, rotated: true });
});
test('physical landscape does not get double-rotated', () => {
  assert.deepEqual(cinemaLayout(744, 390, true), { width: 744, height: 390, rotated: false });
});
test('exit landscape restores the portrait viewport and adjusts to browser chrome', () => {
  assert.deepEqual(cinemaLayout(390, 620, false), { width: 390, height: 620, rotated: false });
});
