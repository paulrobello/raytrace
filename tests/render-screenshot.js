// Renders the default scene headlessly and writes images/screenshot.png.
//
// Uses the same worker-scope shim as the other tests, but overrides postMessage
// to COPY each setRow's color buffer immediately: the renderer reuses a single
// row buffer across all rows, so capturing references after render() returns
// would yield only the last row. PNG is encoded with Node's zlib (no deps).
import { createWorkerScope } from './loader.js';
import { deflateSync, crc32 } from 'zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// Pull the default scene straight out of index.html's textarea (single source),
// stripping the `#` comment lines exactly the way the Render click handler does.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/<textarea id="script"[^>]*>([\s\S]*?)<\/textarea>/);
if (!m) throw new Error('could not find default scene textarea in index.html');
const ta = m[1];
const setup = JSON.parse(ta.replace(/(\#.*)/g, ''));

const W = Number(process.env.PARTRACE_SS_W || setup.width || 800);
const H = Number(process.env.PARTRACE_SS_H || setup.height || 600);
setup.width = W;
setup.height = H;
setup.startY = 0;
setup.endY = H;
setup.id = 0;

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

const renderer = new Partrace();
renderer.setPropsFromJson(setup);

const t0 = Date.now();
renderer.render();
const ms = Date.now() - t0;

const stats = messages.find((m) => m && m.status === 'stats');
const rays = stats && stats.stats && stats.stats.rays ? stats.stats.rays.total : 0;

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
