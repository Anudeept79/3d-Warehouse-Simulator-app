/**
 * 2D digital-twin minimap: zones, racks, every tracked asset, camera nodes,
 * sync pulses, incident flash — plus click-to-fly navigation.
 */
import { trackables, incident } from '../state.js';
import { ZONES, RACK_ROWS } from '../config.js';
import { cctv } from '../world/cctv.js';
import { flyToView } from '../core/cameraModes.js';
import { V3 } from '../utils.js';

const twinC = document.getElementById('twinMap');
const twinG = twinC.getContext('2d');

/** Expanding sync rings (e.g. when an LPN is scanned into the twin). */
export const twinPulses = [];

export function initTwinMap() {
  twinC.style.cursor = 'crosshair';
  twinC.addEventListener('click', e => {
    const r = twinC.getBoundingClientRect();
    const wx = (e.clientX - r.left) / r.width * 240 - 120,
      wz = (e.clientY - r.top) / r.height * 130 - 65;
    flyToView(V3(wx + 26, 38, wz + 26), V3(wx, 0, wz));
  });
}

export function drawTwin(dt, time) {
  const W = twinC.width, H = twinC.height;
  const X = x => (x + 120) / 240 * W, Z = z => (z + 65) / 130 * H;
  twinG.fillStyle = '#070b12'; twinG.fillRect(0, 0, W, H);
  // grid
  twinG.strokeStyle = 'rgba(56,189,248,.07)'; twinG.lineWidth = 1;
  for (let x = -120; x <= 120; x += 20) { twinG.beginPath(); twinG.moveTo(X(x), 0); twinG.lineTo(X(x), H); twinG.stroke(); }
  for (let z = -65; z <= 65; z += 20) { twinG.beginPath(); twinG.moveTo(0, Z(z)); twinG.lineTo(W, Z(z)); twinG.stroke(); }
  // zones
  for (const [k, Zo] of Object.entries(ZONES)) {
    if (k === 'STORAGE') continue;
    twinG.fillStyle = Zo.color + '14'; twinG.strokeStyle = Zo.color + '66'; twinG.lineWidth = 1.5;
    twinG.fillRect(X(Zo.x1), Z(Zo.z1), X(Zo.x2) - X(Zo.x1), Z(Zo.z2) - Z(Zo.z1));
    twinG.strokeRect(X(Zo.x1), Z(Zo.z1), X(Zo.x2) - X(Zo.x1), Z(Zo.z2) - Z(Zo.z1));
  }
  if (incident.active) {
    const Zo = ZONES.RESTRICTED;
    twinG.fillStyle = `rgba(248,113,113,${.15 + .2 * Math.abs(Math.sin(time * 5))})`;
    twinG.fillRect(X(Zo.x1), Z(Zo.z1), X(Zo.x2) - X(Zo.x1), Z(Zo.z2) - Z(Zo.z1));
  }
  // racks
  twinG.fillStyle = 'rgba(148,163,184,.35)';
  for (const z of RACK_ROWS) twinG.fillRect(X(-65), Z(z - 1.4), X(35) - X(-65), Z(z + 1.4) - Z(z - 1.4));
  // sync pulses
  for (let i = twinPulses.length - 1; i >= 0; i--) {
    const p = twinPulses[i]; p.t += dt;
    if (p.t > 1.6) { twinPulses.splice(i, 1); continue; }
    twinG.strokeStyle = `rgba(34,211,238,${1 - p.t / 1.6})`; twinG.lineWidth = 2;
    twinG.beginPath(); twinG.arc(X(p.x), Z(p.z), p.t * 22, 0, 7); twinG.stroke();
  }
  // entities
  for (const t of trackables) {
    const p = t.obj.position; const x = X(p.x), y = Z(p.z);
    if (t.type === 'truck') {
      if (Math.abs(p.x) > 150) continue;
      twinG.fillStyle = '#94a3b8'; twinG.fillRect(x - 7, y - 3, 14, 6);
    } else if (t.type === 'forklift') {
      twinG.fillStyle = '#fbbf24';
      twinG.beginPath(); twinG.arc(x, y, 4, 0, 7); twinG.fill();
    } else if (t.type === 'pallet') {
      twinG.fillStyle = '#38bdf8'; twinG.fillRect(x - 2, y - 2, 4, 4);
    } else if (t.type === 'intruder') {
      twinG.fillStyle = '#f87171'; twinG.beginPath(); twinG.arc(x, y, 5, 0, 7); twinG.fill();
      twinG.strokeStyle = `rgba(248,113,113,${.9 - .8 * (time % 1)})`; twinG.lineWidth = 2;
      twinG.beginPath(); twinG.arc(x, y, 5 + (time % 1) * 14, 0, 7); twinG.stroke();
    } else {
      twinG.fillStyle = '#4ade80'; twinG.beginPath(); twinG.arc(x, y, 3, 0, 7); twinG.fill();
    }
  }
  // camera nodes
  twinG.fillStyle = '#22d3ee';
  for (const c of cctv) {
    twinG.beginPath(); twinG.moveTo(X(c.pos.x), Z(c.pos.z) - 4);
    twinG.lineTo(X(c.pos.x) - 4, Z(c.pos.z) + 3); twinG.lineTo(X(c.pos.x) + 4, Z(c.pos.z) + 3); twinG.fill();
  }
}
