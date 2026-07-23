// MAIN-THREAD controller (canvas + Worker pool). A separate worker-realm
// renderer also named Partrace lives in partrace-threaded.js; they are
// realm-separated by the Worker boundary (audit A2).
//
// Framework-agnostic: the controller owns the canvas and worker pool and
// reports render lifecycle events through optional hooks the UI subscribes to:
//   partrace.onProgress(percent)        // 0..100, throttled during render
//   partrace.onDone(elapsedMs, stats)   // once the full render completes
//   Partrace.onLog(line)                // every log line (stats, errors, timing)
import { Class } from './js/class.js';
import { vec4 } from './js/vecmath.js';

export const Partrace = Class.extend({
  init: function (canvas) {
    this.element = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    this.width = this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.allocateBuffers();
    this.maxWorkers = 1;
    this.workersDone = 0;
    this.workers = [];
    this.stats = {
      rays: {}
    };
    this.start_render = 0;
    this._lastProgressRedraw = -1;
    // UI hooks (assigned by the UI layer); no-op until wired.
    this.onProgress = null;
    this.onDone = null;
    // Bound once so each render's listeners share the same references.
    this._onMessage = this.onMessage.bind(this);
    this._onError = this.onError.bind(this);
  },
  allocateBuffers: function () {
    this.colorBuffer = this.ctx.createImageData(this.width, this.height);
    this.zColorBuffer = this.ctx.createImageData(this.width, this.height);
    this.zBuffer = Float32Array ? new Float32Array(this.width * this.height) : new Array(this.width * this.height);
  },
  createBuffer: function (width, height) {
    var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    return buffer.getContext("2d");
  },
  setPixel: function (data, x, y, r, g, b, a) {
    var index = (x + y * this.width) * 4;
    data.data[index + 0] = r;
    data.data[index + 1] = g;
    data.data[index + 2] = b;
    data.data[index + 3] = a;
    return this;
  },
  getPixel: function (data, x, y) {
    var index = (x + y * this.width) * 4;
    var p = vec4.fromValues(
      data.data[index + 0],
      data.data[index + 1],
      data.data[index + 2],
      data.data[index + 3]
    );
    return p;
  },
  clearBuffer: function (buffer) {
    for (var i = 0, l = this.width * this.height * 4; i < l; i++) {
      buffer.data[i] = ((i + 1) % 4 === 0) ? 255 : 0;
    }
    return this;
  },
  copyBufferToScreen: function (buffer) {
    this.ctx.putImageData(buffer, 0, 0);
    return this;
  },
  copyColorToScreen: function () {
    this.copyBufferToScreen(this.colorBuffer);
    return this;
  },
  copyZToScreen: function () {
    this.copyBufferToScreen(this.zColorBuffer);
    return this;
  },
  normalizeZBuffer: function () {
    var buffer = this.zBuffer;
    var hv = -10000,
      lv = 10000;
    for (var i = 0, l = buffer.length; i < l; i++) {
      if (buffer[i] === -10000) continue;
      if (buffer[i] > hv) hv = buffer[i];
      if (buffer[i] < lv) lv = buffer[i];
    }
    var r = hv - lv;
    if (r === 0) r = 1;
    for (i = 0, l = buffer.length; i < l; i++) {
      if (buffer[i] === -10000) {
        //buffer[i]=0;
      } else {
        buffer[i] = 1.0 - Math.saturate((buffer[i] + (-lv)) / r);
      }
    }
    return this;
  },
  zBufferToColor: function () {
    var o;
    var zColor = this.zColorBuffer;
    var zBuffer = this.zBuffer;
    for (var x = 0, l = zBuffer.length; x < l; x++) {
      o = x * 4;
      if (zBuffer[x] === -10000) {
        zColor.data[o] = 0;
        zColor.data[o + 1] = 0;
        zColor.data[o + 2] = 0;
        zColor.data[o + 3] = 0;
      } else {
        zColor.data[o] = zBuffer[x] * 255;
        zColor.data[o + 1] = zBuffer[x] * 255;
        zColor.data[o + 2] = zBuffer[x] * 255;
        zColor.data[o + 3] = 255;
      }
    }
    return this;
  },
  render: function (setup) {
    this.start_render = (new Date()).getTime();
    this.workers = [];
    this.workersDone = 0;
    this._lastProgressRedraw = -1;
    this.stats = { rays: {} };
    this.element.width = setup.width || this.element.width;
    this.element.height = setup.height || this.element.height;

    this.width = this.element.width;
    this.height = this.element.height;
    this.ctx = this.element.getContext("2d");
    this.allocateBuffers();

    var height = this.height;

    setup.width = this.width;
    setup.height = this.height;
    var requested = setup.maxWorkers ? setup.maxWorkers : navigator.hardwareConcurrency || 2;

    var workerSetup = Object.assign({}, setup);

    var bands = Partrace.partitionRows(height, requested);
    this.maxWorkers = bands.length;
    for (var w = 0; w < bands.length; w++) {
      var worker = new Worker(new URL('./partrace-worker.js', import.meta.url), { type: 'module' });
      worker.postMessage = worker.webkitPostMessage || worker.postMessage;
      worker.progress = 0;
      worker.stats = {};
      worker.done = false;
      worker.addEventListener('message', this._onMessage, false);
      worker.addEventListener('error', this._onError, false);
      workerSetup.startY = bands[w].startY;
      workerSetup.endY = bands[w].endY;
      workerSetup.id = w;
      worker.postMessage({
        action: 'init',
        setup: workerSetup
      });
      this.workers.push(worker);
    }
    if (this.onProgress) this.onProgress(0);
  },
  // Worker message protocol reference (audit D4). The main thread and the worker
  // realm (partrace-threaded.js) communicate ONLY by postMessage. See the
  // matching summary in docs/ARCHITECTURE.md.
  //
  // Main -> Worker (sent once, immediately after spawn, from render() above):
  //   { action: 'init',
  //     setup: { id, width, height, startY, endY,      // this worker's row-slice
  //              maxWorkers, antiAlias, aaThreshold,    // render config
  //              doReflect, doRefract, doShadows,
  //              scene: { bg_color, camera, fog, lights[], materials[], objects[] } } }
  //
  // Worker -> Main (every message carries a `status` tag, dispatched below):
  //   'start'    { id }                          posted once at the start of render()
  //   'setRow'   { id, x:0, y, cData, zData }    posted at the end of every scan row;
  //                                              cData = Uint8ClampedArray(width*4) RGBA,
  //                                              zData = Float32Array(width) depths
  //   'progress' { id, progress }                0-100 integer for this worker's slice,
  //                                              posted every other row
  //   'stats'    { id, stats }                   posted once near render end; the worker's
  //                                              Scene.stats object (ray counts, render time)
  //   'log'      { msg }                         forwarded worker-side Partrace.log output
  //   'end'      { id }                          final message; we terminate the worker here
  //   'setPixel' { parms:{x,y,r,g,b,a} }        legacy per-pixel path, STILL HANDLED below but
  //                                              not emitted by the current worker (it posts
  //                                              whole rows via 'setRow')
  //
  // Error path: a worker throw fires onError (below), which terminates the failing
  // worker, marks it done, and aborts the render once all workers have settled
  // (audit C4) — so a single worker crash no longer leaves the progress bar hung.
  onMessage: function (evt) {
    var data = evt.data;
    var cData, zData;
    switch (data.status) {
    case 'setPixel':
      data = data.parms;
      this.setPixel(this.colorBuffer, data.x, data.y, data.r, data.g, data.b, data.a);
      break;
    case 'setRow':
      var index = data.y * this.width * 4;
      var zindex = data.y * this.width;
      zData = data.zData;
      cData = data.cData;
      for (var x = 0, l = this.width * 4; x < l; x += 4) {
        this.colorBuffer.data[index + x] = cData[x];
        this.colorBuffer.data[index + x + 1] = cData[x + 1];
        this.colorBuffer.data[index + x + 2] = cData[x + 2];
        this.colorBuffer.data[index + x + 3] = cData[x + 3];
        this.zBuffer[zindex + x / 4] = zData[x / 4];
      }
      break;
    case 'stats':
      this.workers[data.id].stats = data.stats;
      data.msg = data.stats;
      // falls through
    case 'log':
      Partrace.log(data.msg);
      break;
    case 'progress':
      this.workers[data.id].progress = data.progress;
      this.doProgress();
      break;
    case 'end':
      this.workers[data.id].terminate();
      this.workers[data.id].done = true;
      this.workersDone++;
      this.copyColorToScreen();
      if (this.workersDone === this.workers.length) {
        this.normalizeZBuffer();
        this.zBufferToColor();
        this.start_render = (new Date()).getTime() - this.start_render;
        for (var i = 0; i < this.workers.length; i++) this.mergeStats(i);
        this.computeStats();
        Partrace.log(this.stats);
        Partrace.log('Total render time ' + this.start_render.toFixed(0) + ' ms');
        if (this.onProgress) this.onProgress(100);
        if (this.onDone) this.onDone(this.start_render, this.stats);
      }
      break;
    case 'start':
      Partrace.log('Worker started ' + data.id);
      break;
    default:
      console.log('Unknown event', evt);
    };
  },
  onError: function (e) {
    var worker = e.target;
    var idx = this.workers.indexOf(worker);
    Partrace.log('Worker ' + (idx >= 0 ? idx : '?') + ' error: ' +
      (e.message || 'unknown error') +
      (e.filename ? (' (' + e.filename + ':' + e.lineno + ')') : ''));
    if (idx >= 0 && !this.workers[idx].done) {
      try { this.workers[idx].terminate(); } catch (te) {}
      this.workers[idx].done = true;
      this.workersDone++;
      if (this.workersDone === this.workers.length) {
        this.copyColorToScreen();
        if (this.onProgress) this.onProgress(100);
        if (this.onDone) this.onDone((new Date()).getTime() - this.start_render, this.stats);
        Partrace.log('Render aborted: a worker failed.');
      }
    }
  },
  doProgress: function () {
    var p = 0;
    for (var i = 0, l = this.workers.length; i < l; i++) {
      p += this.workers[i].progress / this.workers.length;
    }
    if (this.onProgress) this.onProgress(p);
    if (Math.floor(p / 20) > this._lastProgressRedraw) {
      this._lastProgressRedraw = Math.floor(p / 20);
      this.copyColorToScreen();
    }
  },
  computeStats: function () {
    var stats = this.stats.rays;
    if (!stats.total) return;
    for (var key in stats) {
      if (key === "total" || key.indexOf('_percent') > -1) continue;
      var new_key = key + "_percent";
      var total = 0;
      if (key.match(/(_hit|_miss)/)) {
        total = stats[key.replace(/(_hit|_miss)/, '')] || 0;
      } else {
        total = stats['total'];
      }
      if (total) stats[new_key] = (stats[key] / total * 100).toFixed(1);
    }
  },
  mergeStats: function (w) {
    w = this.workers[w];
    // objects/lights are scene-global counts identical across workers; take them once.
    // All other top-level numeric stats accumulate across workers.
    for (var key in w.stats) {
      if (key === "rays" || key === "renderTime" || key === "id") continue;
      if (key === "objects" || key === "lights") {
        if (this.stats[key] === undefined) this.stats[key] = parseInt(w.stats[key]);
        continue;
      }
      if (this.stats[key] === undefined) this.stats[key] = 0;
      if (key.indexOf("percent") > 0) {
        this.stats[key] += parseFloat(w.stats[key]);
      } else {
        this.stats[key] += parseFloat(w.stats[key]) || 0;
      }
    }
    for (key in w.stats.rays) {
      if (key.indexOf("percent") > 0) continue;
      if (!this.stats.rays[key]) this.stats.rays[key] = 0;
      this.stats.rays[key] += parseInt(w.stats.rays[key]);
    }
  }
});
// Splits `height` scanlines into one contiguous band per worker.
//
// Bands MUST be integer-aligned: a posted row is written at byte offset
// y * width * 4, so a fractional startY shears that band sideways by
// frac * width pixels and wraps the remainder into the next scanline rather
// than shifting it vertically. Worker count is clamped to the row count so no
// worker gets an empty band (which would make its progress fraction NaN).
Partrace.partitionRows = function (height, workers) {
  var n = Math.max(1, Math.min(Math.floor(workers), height));
  var bands = [];
  for (var w = 0; w < n; w++) {
    bands.push({
      startY: Math.round(height * w / n),
      endY: Math.round(height * (w + 1) / n)
    });
  }
  return bands;
};
Partrace.log = function (msg) {
  var line = (typeof msg === 'object') ? JSON.stringify(msg, null, 2) : String(msg);
  console.log(msg);
  if (Partrace.onLog) Partrace.onLog(line);
};
