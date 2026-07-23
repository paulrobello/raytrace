// Shared headless loader (ESM).
//
// The worker renderer (partrace-threaded.js) is written for a Web Worker scope:
// it talks back over a bare postMessage(...). This module reconstructs just
// enough of that scope in Node — no browser, no DOM, no Web Worker — so the
// renderer can be driven directly for tests.
//
// Importing partrace-threaded.js + registry.js attaches every Partrace.* class
// to the shared namespace and builds the JSON type registries (audit A1) as
// side effects. The renderer's only outbound channel is bare postMessage, which
// we shim onto globalThis so it resolves inside module code; captured messages
// are returned for the caller to inspect.
import { Partrace } from '../partrace-threaded.js';
import '../js/registry.js';
import { vec4 } from '../js/vecmath.js';

export function createWorkerScope() {
  const messages = [];
  globalThis.postMessage = function (msg) { messages.push(msg); };
  return { Partrace, vec4, messages };
}
