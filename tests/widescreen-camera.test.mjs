import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEW_W, getCameraState, getVisiblePanelIndices } from '../src/fusion/github_core/beat/camera.js';
import { PANEL_SIZE } from '../src/fusion/github_core/beat/timeline.js';

test('wider camera covers both visible edges without exceeding or aliasing the four panel buffers', () => {
  for (let t = 0; t <= 125; t += 0.025) {
    const cam = getCameraState(t);
    const panels = getVisiblePanelIndices(cam);
    const extraEdge = cam.camX < 1200 || cam.camX > 18800;
    assert.ok(panels.length + Number(extraEdge) <= 4, 'pool overflow at ' + t);
    if (extraEdge) assert.ok(panels.length <= 3, 'edge extension aliases slot 3 at ' + t);
    for (const edge of [-1, 1]) {
      const worldX = cam.camX + edge * VIEW_W / (2 * cam.scale);
      if (worldX >= 0 && worldX < 20 * PANEL_SIZE) {
        assert.ok(panels.includes(Math.floor(worldX / PANEL_SIZE)), 'unrendered edge at ' + t);
      }
    }
  }
});
