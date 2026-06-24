/**
 * Operations dashboard: simulated shift clock, drifting KPIs, environment readouts,
 * and live zone occupancy computed from actual worker positions.
 */
import { stats } from '../state.js';
import { ZONES } from '../config.js';
import { rand, clamp } from '../utils.js';
import { workers, zoneOf } from '../world/workers.js';
import { security } from '../world/security.js';

/* ---------------- simulated shift clock ---------------- */
let simMin = 6 * 60 + 40, simSec = 0;

export function updateClock(dt) {
  simSec += dt * 40; // 40x time-lapse
  while (simSec >= 60) { simSec -= 60; simMin++; }
  if (simMin >= 24 * 60) simMin = 0;
  const h = String(simMin / 60 | 0).padStart(2, '0'),
    m = String(simMin % 60).padStart(2, '0'),
    s = String(simSec | 0).padStart(2, '0');
  document.getElementById('clockVal').textContent = `${h}:${m}:${s}`;
  document.getElementById('fft0').textContent = `${h}:${m}:${s} · DC-WEST-01`;
  document.getElementById('fft1').textContent = `${h}:${m}:${s} · DC-WEST-01`;
}

/* ---------------- KPIs ---------------- */
let kpiT = 0;

export function updateKPIs(dt) {
  kpiT -= dt; if (kpiT > 0) return; kpiT = 2;
  stats.acc = clamp(stats.acc + rand(-.04, .05), 98.6, 99.8);
  stats.dock = clamp(stats.dock + rand(-2, 2) | 0, 62, 94);
  stats.occ = clamp(stats.occ + rand(-1, 1.2) | 0, 58, 72);
  stats.pick = clamp(stats.pick + rand(-3, 3.5) | 0, 128, 158);
  document.getElementById('kAcc').innerHTML = stats.acc.toFixed(1) + '<small>%</small>';
  document.getElementById('kDock').innerHTML = stats.dock + '<small>%</small>';
  document.getElementById('kOcc').innerHTML = stats.occ + '<small>%</small>';
  document.getElementById('kPick').innerHTML = stats.pick + '<small>/hr</small>';
  document.getElementById('kIn').textContent = stats.received.toLocaleString();
  document.getElementById('kOut').textContent = stats.shipped.toLocaleString();
  document.getElementById('envT').textContent = (21.4 + rand(-.3, .3)).toFixed(1) + '°C';
  document.getElementById('envH').textContent = (47 + rand(-2, 2) | 0) + '%';
  document.getElementById('envC').textContent = (512 + rand(-15, 15) | 0) + ' ppm';
}

/* ---------------- zone occupancy ---------------- */
export function initOccupancy() {
  const occEl = document.getElementById('zoneOcc');
  for (const k of Object.keys(ZONES)) {
    const r = document.createElement('div'); r.className = 'zrow'; r.id = 'z_' + k;
    r.innerHTML = `<span class="zn">${k}</span><span class="zbar"><i style="width:0%;background:${ZONES[k].color}"></i></span><span class="zv">0</span>`;
    occEl.appendChild(r);
  }
}

let occT = 0;

export function updateOccupancy(dt) {
  occT -= dt; if (occT > 0) return; occT = 1;
  const counts = {}; for (const k of Object.keys(ZONES)) counts[k] = 0;
  for (const w of workers) counts[zoneOf(w.g.position)]++;
  if (security.intruder && security.intruder.inZone) counts.RESTRICTED++;
  for (const k of Object.keys(ZONES)) {
    const r = document.getElementById('z_' + k);
    r.querySelector('i').style.width = Math.min(100, counts[k] * 22) + '%';
    r.querySelector('.zv').textContent = counts[k];
    r.querySelector('.zv').style.color = (k === 'RESTRICTED' && counts[k] > 0) ? 'var(--crit)' : '';
  }
}
