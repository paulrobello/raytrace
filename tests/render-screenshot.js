// Renders the default scene headlessly and writes images/screenshot.png.
//
// Uses the same worker-scope shim as the other tests, but overrides postMessage
// to COPY each setRow's color buffer immediately: the renderer reuses a single
// row buffer across all rows, so capturing references after render() returns
// would yield only the last row. PNG is encoded with Node's zlib (no deps).
//
// The render runs through the REAL row partition (Partrace.partitionRows), one
// sequential pass per band, so the output reflects what the browser's worker
// pool actually produces — including any band-boundary seam.
import { createWorkerScope } from './loader.js';
import { Partrace as Controller } from '../partrace.js';
import { DEFAULT_SCENE } from '../src/default-scene.js';
import { deflateSync, crc32 } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

// The default scene lives in src/default-scene.js — the same single source the
// UI loads into the editor. Strip `#` comment lines the way main.js does.
const setup = JSON.parse(DEFAULT_SCENE.replace(/#.*$/gm, ''));

const W = Number(process.env.PARTRACE_SS_W || setup.width || 800);
const H = Number(process.env.PARTRACE_SS_H || setup.height || 600);
// Fixed default so the image is deterministic, and 600/16 = 37.5 exercises a
// non-integer naive split — the case that used to shear alternating bands.
const WORKERS = Number(process.env.PARTRACE_SS_WORKERS || setup.maxWorkers || 16);
setup.width = W;
setup.height = H;

const { Partrace } = createWorkerScope();

// Override postMessage AFTER createWorkerScope (which sets its own shim) so we
// COPY each row's color buffer as it arrives — the renderer reuses one row
// buffer across all rows, so capturing references after render() returns would
// yield only the last row.
const rows = new Array(H);
const messages = [];
globalThis.postMessage = function (msg) {
  if (msg && msg.status === 'setRow') rows[msg.y] = Buffer.from(msg.cData);
  messages.push(msg);
};

const bands = Controller.partitionRows(H, WORKERS);
const t0 = Date.now();
for (let w = 0; w < bands.length; w++) {
  const renderer = new Partrace();
  renderer.setPropsFromJson(Object.assign({}, setup, {
    id: w,
    startY: bands[w].startY,
    endY: bands[w].endY
  }));
  renderer.render();
}
const ms = Date.now() - t0;

const rays = messages
  .filter((m) => m && m.status === 'stats')
  .reduce((sum, m) => sum + ((m.stats && m.stats.rays && m.stats.rays.total) || 0), 0);

// Assemble into an RGB buffer (alpha discarded — the rendered RGB is final).
const rgb = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const row = rows[y];
  if (!row) continue;
  for (let x = 0; x < W; x++) {
    rgb[(y * W + x) * 3 + 0] = row[x * 4 + 0];
    rgb[(y * W + x) * 3 + 1] = row[x * 4 + 1];
    rgb[(y * W + x) * 3 + 2] = row[x * 4 + 2];
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type 2 = truecolor RGB
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

mkdirSync(new URL('../images', import.meta.url), { recursive: true });
writeFileSync(new URL('../images/screenshot.png', import.meta.url), png);
console.log('screenshot: wrote images/screenshot.png (%dx%d, %d bytes, %d rays, %dms)', W, H, png.length, rays, ms);
