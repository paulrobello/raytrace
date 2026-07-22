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
const assert = require('assert');
const { createWorkerScope } = require('./loader');

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

const { scope } = createWorkerScope();
const Partrace = scope.Partrace;

const renderer = new Partrace(scope);
renderer.id = 0;
renderer.width = 8;
renderer.height = 8;
renderer.startY = 0;
renderer.endY = 8;
renderer.scene.setPropsFromJson(SCENE);

assert.strictEqual(renderer.scene.lights.length, 1, 'point light not registered');
assert.strictEqual(renderer.scene.materials.length, 5, 'expected all 5 material types registered (basic, checker, checkermat, rainbow, combiner)');
assert.strictEqual(renderer.scene.objects.length, 2, 'expected sphere + plane registered');

console.log('smoke-types: OK (1 light, 5 materials, 2 objects all instantiated)');
