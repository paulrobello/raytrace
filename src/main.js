// PARTrace UI entry. Framework-free: wires DOM controls to the Partrace
// controller and surfaces live render telemetry. The renderer math lives in
// the root modules; only this file and ui.css form the UI shell.
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './ui.css';

import { Partrace } from '../partrace.js';
import { DEFAULT_SCENE } from './default-scene.js';

const qs = (sel, root) => (root || document).querySelector(sel);

const els = {
  canvas: qs('#canvas'),
  scene: qs('#scene'),
  renderBtn: qs('#renderBtn'),
  resetBtn: qs('#resetBtn'),
  saveBtn: qs('#saveBtn'),
  clearLog: qs('#clearLog'),
  coreCount: qs('#coreCount'),
  sweep: qs('#sweep'),
  emptyState: qs('#emptyState'),
  progressBar: qs('#progressBar'),
  progressPct: qs('#progressPct'),
  mRays: qs('#mRays'),
  mRaysSec: qs('#mRaysSec'),
  mTime: qs('#mTime'),
  rayBreak: qs('#rayBreak'),
  log: qs('#log')
};

const partrace = new Partrace(els.canvas);
let renderStart = 0;

const RAY_LABELS = { camera: 'Primary', shadow: 'Shadow', reflect: 'Reflect', refract: 'Refract' };

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtMs = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(2) + 's' : Math.round(ms) + 'ms');
const stripComments = (src) => src.replace(/#.*$/gm, '');

function setProgress(p) {
  const pct = Math.max(0, Math.min(100, p));
  els.progressBar.style.setProperty('--progress', pct + '%');
  els.progressPct.textContent = Math.round(pct) + '%';
  els.sweep.style.setProperty('--sweep', pct + '%');
  if (renderStart) els.mTime.textContent = fmtMs(Date.now() - renderStart);
}

function resetTelemetry() {
  els.mRays.textContent = '0';
  els.mRaysSec.textContent = '—';
  els.mTime.textContent = '—';
  els.rayBreak.innerHTML = '';
  setProgress(0);
}

function renderBreakdown(rays) {
  if (!rays || !rays.total) {
    els.rayBreak.innerHTML = '';
    return;
  }
  const chips = ['camera', 'shadow', 'reflect', 'refract'].map((k) => {
    const v = rays[k];
    if (typeof v !== 'number') return '';
    return '<span class="chip"><span class="chip__k">' + RAY_LABELS[k] +
      '</span><span class="chip__v">' + fmtInt(v) + '</span></span>';
  }).filter(Boolean);
  els.rayBreak.innerHTML = chips.join('');
}

function appendLog(line) {
  const stamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const row = document.createElement('div');
  row.className = 'log__row';
  row.textContent = stamp + '  ' + line;
  els.log.appendChild(row);
  while (els.log.childElementCount > 200) els.log.firstElementChild.remove();
  els.log.scrollTop = els.log.scrollHeight;
}

// controller hooks
Partrace.onLog = appendLog;
partrace.onProgress = setProgress;
partrace.onDone = function (ms, stats) {
  setProgress(100);
  els.mTime.textContent = fmtMs(ms);
  els.sweep.classList.add('is-idle');
  els.emptyState.classList.add('is-hidden');
  const rays = stats && stats.rays;
  if (rays && rays.total) {
    els.mRays.textContent = fmtInt(rays.total);
    const sec = ms / 1000;
    els.mRaysSec.textContent = sec > 0 ? fmtInt(rays.total / sec) : '—';
    renderBreakdown(rays);
  }
};

function doRender() {
  let setup;
  try {
    setup = JSON.parse(stripComments(els.scene.value));
  } catch (e) {
    appendLog('Scene JSON error: ' + (e && e.message ? e.message : e));
    return;
  }
  localStorage.setItem('partrace.scene', els.scene.value);
  els.log.innerHTML = '';
  resetTelemetry();
  els.emptyState.classList.add('is-hidden');
  els.sweep.classList.remove('is-idle');
  renderStart = Date.now();
  partrace.render(setup);
}

function doReset() {
  els.scene.value = DEFAULT_SCENE;
  localStorage.setItem('partrace.scene', DEFAULT_SCENE);
  els.scene.focus();
}

function doSave() {
  const link = document.createElement('a');
  link.download = 'partrace.png';
  link.href = els.canvas.toDataURL('image/png');
  link.click();
}

// wire up
els.coreCount.textContent = (navigator.hardwareConcurrency || '?') + ' cores';
els.renderBtn.addEventListener('click', doRender);
els.resetBtn.addEventListener('click', doReset);
els.saveBtn.addEventListener('click', doSave);
els.clearLog.addEventListener('click', function () { els.log.innerHTML = ''; });

document.querySelectorAll('input[name="buffer"]').forEach(function (radio) {
  radio.addEventListener('change', function () {
    if (radio.value === 'color') partrace.copyColorToScreen();
    else partrace.copyZToScreen();
  });
});

document.addEventListener('keydown', function (e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    doRender();
  }
});

// restore last-edited scene, else default
els.scene.value = localStorage.getItem('partrace.scene') || DEFAULT_SCENE;
