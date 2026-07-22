'use strict';
/*
 * Shared headless loader.
 *
 * The worker renderer (partrace-threaded.js) is written for a Web Worker
 * scope: it is fed by importScripts(...) and talks back over postMessage(...).
 * This module reconstructs just enough of that scope in Node — no browser, no
 * DOM, no Web Worker — so the renderer can be driven directly for tests.
 *
 * Two Worker-scope globals are shimmed:
 *   importScripts(path...) : read each root-relative script and evaluate it in
 *                            the shared context, so globals (Partrace, Class,
 *                            vec4, ...) accumulate exactly as in a real worker.
 *   postMessage(msg)       : the renderer's only outbound channel; captured to
 *                            an array the caller inspects.
 * `self` is pointed at the scope itself (parmath.js reads self.Math).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// Mirrors the importScripts(...) list in partrace-worker.js, in load order.
// Load-order constraints (gl-matrix -> globals shim -> parmath) are baked in.
const WORKER_SCRIPTS = [
  '/js/gl-matrix-min.js',
  '/js/gl-matrix-globals.js',
  '/js/class.js',
  '/js/par.js',
  '/utils.js',
  '/parmath.js',
  '/partrace-threaded.js',
  '/scene.js',
  '/fog.js',
  '/baseobj.js',
  '/ray.js',
  '/camera.js',
  '/lights.js',
  '/materials.js',
  '/objects.js',
];

function createWorkerScope() {
  const messages = [];
  let ctx;
  const scope = {
    console,
    navigator: { hardwareConcurrency: 4 },
    postMessage: function (msg) { messages.push(msg); },
    addEventListener: function () {},
    removeEventListener: function () {},
    onmessage: null,
    onerror: null,
  };
  scope.self = scope;
  scope.importScripts = function importScripts() {
    const paths = Array.prototype.slice.call(arguments);
    for (const p of paths) {
      const rel = String(p).replace(/^\/+/, '');
      const full = path.join(ROOT, rel);
      const code = fs.readFileSync(full, 'utf8');
      vm.runInContext(code, ctx, { filename: rel });
    }
  };
  ctx = vm.createContext(scope);
  scope.importScripts.apply(scope, WORKER_SCRIPTS);
  return { scope, messages };
}

module.exports = { createWorkerScope, WORKER_SCRIPTS, ROOT };
