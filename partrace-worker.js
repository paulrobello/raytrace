// Module worker entry. Browsers load via `new Worker('partrace-worker.js', {type:'module'})`.
//
// Importing Partrace plus the registry attaches every scene-graph class to the
// shared namespace and builds the JSON type registries (audit A1) as side
// effects. The render path runs only after this module has fully evaluated, so
// every Partrace.* reference resolves.
//
// In a browser module worker `self` is the worker global scope. Node — used by
// the graph-resolution and headless-render tests — has no `self`, so the worker
// global is resolved defensively without changing browser behavior.
import { Partrace } from './partrace-threaded.js';
import './js/registry.js';

var workerScope = (typeof self !== 'undefined') ? self : globalThis;

workerScope.onmessage = function (event) {
  var partrace = new Partrace(workerScope);
  partrace.setPropsFromJson(event.data.setup);
  partrace.render();
};
