'use strict';
/*
 * Row-partition regression test.
 *
 * The main thread splits the image into one horizontal band per worker and the
 * worker walks `for (y = startY; y < endY; y++)`, posting one 'setRow' per y.
 * The main thread then writes that row at byte offset `y * width * 4`.
 *
 * A fractional startY therefore does NOT just shift a band vertically — it
 * shifts every row of that band sideways by `frac * width` pixels and wraps the
 * remainder into the next scanline. At 800x600 with 16 workers the old
 * `height / maxWorkers` gave startY = 37.5, i.e. a 400px (half-width) shear on
 * every odd band: a hard vertical seam down the middle of the image.
 *
 * These assertions pin the partition to integer, contiguous, gap-free,
 * overlap-free bands and confirm the worker emits integer scanlines.
 */
import assert from 'assert';
import { Partrace } from '../partrace.js';
import { createWorkerScope } from './loader.js';

const CASES = [
  [600, 16], // the shipped default scene: 600/16 = 37.5, the reported bug
  [600, 1],
  [600, 7],
  [600, 600],
  [90, 4],
  [12, 5],
  [1, 3]     // more workers than rows
];

for (const [height, workers] of CASES) {
  const label = height + 'x' + workers;
  const bands = Partrace.partitionRows(height, workers);

  // Worker count is clamped to the row count so no band is empty.
  const expected = Math.max(1, Math.min(workers, height));
  assert.strictEqual(bands.length, expected, label + ': expected ' + expected + ' bands');

  let covered = 0;
  for (let w = 0; w < bands.length; w++) {
    const { startY, endY } = bands[w];
    assert.ok(Number.isInteger(startY), label + ': band ' + w + ' startY not an integer: ' + startY);
    assert.ok(Number.isInteger(endY), label + ': band ' + w + ' endY not an integer: ' + endY);
    assert.ok(endY >= startY, label + ': band ' + w + ' ends before it starts');
    if (w === 0) {
      assert.strictEqual(startY, 0, label + ': first band must start at row 0');
    } else {
      assert.strictEqual(startY, bands[w - 1].endY,
        label + ': band ' + w + ' overlaps or leaves a gap after band ' + (w - 1));
    }
    covered += endY - startY;
  }
  assert.strictEqual(bands[bands.length - 1].endY, height, label + ': last band must end at the last row');
  assert.strictEqual(covered, height, label + ': bands must cover every row exactly once');
}

// End to end: drive the real worker renderer over a partition whose naive
// division would be fractional (12 / 5 = 2.4) and confirm every scanline it
// posts is an integer and every row lands exactly once.
const WIDTH = 24;
const HEIGHT = 12;
const WORKERS = 5;

const { Partrace: WorkerPartrace, messages } = createWorkerScope();
const bands = Partrace.partitionRows(HEIGHT, WORKERS);
const rowHits = new Array(HEIGHT).fill(0);

for (let w = 0; w < WORKERS; w++) {
  messages.length = 0;
  const renderer = new WorkerPartrace();
  renderer.setPropsFromJson({
    id: w,
    width: WIDTH,
    height: HEIGHT,
    startY: bands[w].startY,
    endY: bands[w].endY,
    scene: {
      bg_color: [0, 0, 0],
      camera: { position: [0, 0, -2.5], fov: 90 },
      lights: [{ type: 'point', position: [5, 5, -3], shader: 'phong' }],
      materials: [{ name: 'm', type: 'basic', diffuse: [0, 0, 1] }],
      objects: [{ name: 's', type: 'sphere', material: 'm', radius: 1, position: [0, 0, 0] }]
    }
  });
  renderer.render();

  for (const msg of messages) {
    if (msg.status !== 'setRow') continue;
    assert.ok(Number.isInteger(msg.y), 'worker ' + w + ' posted a fractional scanline: ' + msg.y);
    assert.ok(msg.y >= 0 && msg.y < HEIGHT, 'worker ' + w + ' posted an out-of-range scanline: ' + msg.y);
    rowHits[msg.y]++;
  }
}

for (let y = 0; y < HEIGHT; y++) {
  assert.strictEqual(rowHits[y], 1, 'row ' + y + ' was written ' + rowHits[y] + ' times, expected exactly 1');
}

console.log('row-partition: OK (%d partition cases, %d rows written exactly once)', CASES.length, HEIGHT);
