'use strict';
/*
 * Scene-type smoke test (the audit's A1-class bug catcher).
 *
 * Instantiates EVERY registered scene-graph type from its JSON name through the
 * real factory path (Scene.setPropsFromJson). This is the exact code path that
 * hid the `new new Partrace.Materials.Combiner()` crash (Bug #2 / C2): a
 * hand-typed factory switch that lint and tests never touched. If any
 * registered type fails to construct, this test fails.
 */
import assert from 'assert';
import { createWorkerScope } from './loader.js';

const SCENE = {
  bg_color: [0, 0, 0],
  camera: { position: [0, 0, -2.5], fov: 90 },
  lights: [
    { type: 'point', position: [5, 5, -3], shader: 'phong', attenuationType: 'squared', fallOffRadius: 12 }
  ],
  materials: [
    { name: 'm_basic', type: 'basic', diffuse: [0, 0, 1] },
    { name: 'm_checker', type: 'checker', scale: [0.1, 0.1, 0.05] },
    { name: 'm_checkermat', type: 'checkermat', diffuse1: 'm_basic', diffuse2: 'm_checker', scale: [0.1, 0.1, 0.05] },
    { name: 'm_rainbow', type: 'rainbow', offset: [2, -3, 3] },
    { name: 'm_combiner', type: 'combiner', diffuse1: 'm_checker', diffuse2: 'm_rainbow' }
  ],
  objects: [
    { name: 's', type: 'sphere', material: 'm_basic', radius: 1, position: [0, 0, 0] },
    { name: 'p', type: 'plane', material: 'm_checker', position: [0, -1, 0] }
  ]
};

const { Partrace } = createWorkerScope();

const renderer = new Partrace();
renderer.id = 0;
renderer.width = 8;
renderer.height = 8;
renderer.startY = 0;
renderer.endY = 8;
renderer.scene.setPropsFromJson(SCENE);

assert.strictEqual(renderer.scene.lights.length, 1, 'point light not registered');
assert.strictEqual(renderer.scene.materials.length, 5, 'expected all 5 material types registered (basic, checker, checkermat, rainbow, combiner)');
assert.strictEqual(renderer.scene.objects.length, 2, 'expected sphere + plane registered');

// Audit A8: named material references must resolve via the post-parse linking
// pass (Scene → resolveRefs), not the removed Partrace.scene singleton. This
// also guards the latent reverse-iteration bug: parse-time lookup ran before
// referenced materials were registered, so checkermat/combiner here ended up
// with null refs under the old code.
function objectByName(name) {
  var k = renderer.scene.objects.length;
  while (k--) if (renderer.scene.objects[k].name === name) return renderer.scene.objects[k];
  return null;
}
var checkermat = renderer.scene.materialByName('m_checkermat');
assert.ok(checkermat.d1 && checkermat.d1.name === 'm_basic', 'checkermat.diffuse1 did not resolve to m_basic');
assert.ok(checkermat.d2 && checkermat.d2.name === 'm_checker', 'checkermat.diffuse2 did not resolve to m_checker');
var combiner = renderer.scene.materialByName('m_combiner');
assert.ok(combiner.d1 && combiner.d1.name === 'm_checker', 'combiner.diffuse1 did not resolve to m_checker');
assert.ok(combiner.d2 && combiner.d2.name === 'm_rainbow', 'combiner.diffuse2 did not resolve to m_rainbow');
assert.ok(objectByName('s').material.name === 'm_basic', 'sphere material did not resolve to m_basic');
assert.ok(objectByName('p').material.name === 'm_checker', 'plane material did not resolve to m_checker');

// Regression for the latent string-form-vector bug: Partrace.vToVec4 called
// String.prototype.explode (defined nowhere) on the string branch, so any scene
// using "r,g,b" vector strings threw. Now uses native split.
var sv = Partrace.vToVec4('1,2,3', 1);
assert.ok(
  sv && sv.length === 4 && sv[0] === 1 && sv[1] === 2 && sv[2] === 3 && sv[3] === 1,
  'vToVec4 string-form parse failed: got ' + JSON.stringify(Array.from(sv))
);

console.log('smoke-types: OK (1 light, 5 materials, 2 objects, string-form vectors)');
