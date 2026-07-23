'use strict';
/*
 * Headless render test.
 *
 * Drives ONE worker renderer of the default-class scene through a full render
 * in Node and asserts it (a) does not throw, (b) emits row data, (c) reports a
 * non-zero ray count, and (d) posts 'end'. This is the regression net for
 * every renderer logic change: C1 ray aliasing, C2 Combiner, C4 worker-error
 * recovery (the throw path), C5/C6 parsing, etc.
 *
 * The scene deliberately uses TWO lights with reflect + refract enabled so the
 * multi-light shading loop in scene.raytrace — the C1 regression surface —
 * actually runs end to end.
 */
import assert from 'assert';
import { createWorkerScope } from './loader.js';

const SCENE = {
  width: 120,
  height: 90,
  antiAlias: 0,
  aaThreshold: 0,
  doReflect: true,
  doRefract: true,
  doShadows: true,
  startY: 0,
  endY: 90,
  id: 0,
  scene: {
    bg_color: [0, 0, 0],
    camera: { position: [0, 0, -2.5], fov: 90 },
    fog: { disabled: true, type: 'linear', near: 1, far: 9 },
    lights: [
      { type: 'point', position: [5, 5, -3], shader: 'phong', attenuationType: 'squared', fallOffRadius: 12 },
      { type: 'point', position: [-5, 3, -2], shader: 'blinn', attenuationType: 'squared', fallOffRadius: 12 }
    ],
    materials: [
      { name: 'm_blue', type: 'basic', diffuse: [0, 0, 1], shiny: 16, reflect: 0.9, metallic: true },
      { name: 'm_glass', type: 'basic', diffuse: [1, 0, 0, 0.75], refract: 1.2, shiny: 128 },
      { name: 'm_checker', type: 'checker', scale: [0.1, 0.1, 0.05], specular: [1, 1, 1], shiny: 128 }
    ],
    objects: [
      { name: 'left', type: 'sphere', material: 'm_blue', radius: 1, position: [-1.25, 0, 0] },
      { name: 'right', type: 'sphere', material: 'm_glass', radius: 0.5, position: [0.75, -0.5, -1.25] },
      { name: 'floor', type: 'plane', material: 'm_checker', position: [0, -1, 0] }
    ]
  }
};

const { Partrace, messages } = createWorkerScope();

const renderer = new Partrace();
renderer.setPropsFromJson(SCENE);

let threw = null;
try {
  renderer.render();
} catch (e) {
  threw = e;
}
assert.ifError(threw);

const statuses = messages.map(function (m) { return m && m.status; });
const rows = messages.filter(function (m) { return m.status === 'setRow'; }).length;
const statsMsg = messages.find(function (m) { return m.status === 'stats'; });
const ended = statuses.indexOf('end') !== -1;

assert.ok(rows > 0, 'expected at least one setRow message, got ' + rows);
assert.ok(ended, 'render did not post an end message');
assert.ok(statsMsg, 'render did not post stats');
const totalRays = statsMsg.stats && statsMsg.stats.rays && statsMsg.stats.rays.total;
assert.ok(typeof totalRays === 'number' && totalRays > 0, 'expected rays.total > 0, got ' + totalRays);

console.log('headless-render: OK (%d rows, %d rays)', rows, totalRays);
