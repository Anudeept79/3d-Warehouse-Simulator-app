/**
 * Security event simulation: scripted intruder, guard dispatch, incident lifecycle
 * (trigger → critical alert → containment → resolution → cleanup on loop reset).
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { trackables, incident } from '../state.js';
import { makeTextSprite } from '../utils.js';
import { makeWorker, workers } from './workers.js';
import { addAlert } from '../hud/alerts.js';

export const security = { intruder: null, guard: null, groundRing: null, intruderTag: null };

export function spawnIntruder() {
  if (security.intruder) return;
  const g = makeWorker(0x303540);
  g.position.set(112, 0, 58);
  security.intruder = {
    g, path: [[112, 58], [92, 56], [84.8, 52], [70, 44], [66, 38]],
    seg: 0, segT: 0, speed: 2.6, inZone: false, dwell: 0, escort: false,
  };
  trackables.push({ obj: g, type: 'intruder', label: 'UNKNOWN', y: 1.4 });
  security.groundRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.7, 40),
    new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  security.groundRing.rotation.x = -Math.PI / 2;
  security.groundRing.position.y = .08;
  security.groundRing.visible = false;
  scene.add(security.groundRing);
}

export function showLocationLock() {
  if (security.groundRing) security.groundRing.visible = true;
  if (security.intruder && !security.intruderTag) {
    security.intruderTag = makeTextSprite('TARGET · X 66.2  Z 38.4', { size: 44, color: '#f87171' });
    security.intruderTag.scale.multiplyScalar(.85);
    scene.add(security.intruderTag);
  }
}

export function dispatchGuard() {
  if (security.guard || !security.intruder) return;
  const w = workers.find(x => x.zone === 'SHIPPING');
  w.scripted = true; security.guard = w;
  security.guard.gPath = { pts: [[w.g.position.x, w.g.position.z], [94, 30], [84.8, 28], [70, 36]], seg: 0, segT: 0, speed: 3.4 };
  addAlert('info', 'Security dispatched — S. Reyes en route to R-1');
}

export function updateScripted(dt, time) {
  const I = security.intruder;
  if (I && !I.done) {
    if (I.seg < I.path.length - 1) {
      const a = I.path[I.seg], b = I.path[I.seg + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); I.segT += I.speed * dt / L;
      if (I.segT >= 1) { I.segT = 0; I.seg++; }
      else {
        I.g.position.set(a[0] + (b[0] - a[0]) * I.segT, Math.abs(Math.sin(time * 7)) * .05, a[1] + (b[1] - a[1]) * I.segT);
        I.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
      }
      if (!I.inZone && I.g.position.x < 84 && I.g.position.z > 20 && I.g.position.z < 58) I.inZone = true;
    } else {
      I.dwell += dt;
      if (I.inZone) document.getElementById('acDwell').textContent =
        '00:' + String(Math.min(59, (I.dwell | 0) + 4)).padStart(2, '0');
    }
    if (security.groundRing) {
      security.groundRing.position.x = I.g.position.x;
      security.groundRing.position.z = I.g.position.z;
      const s = 1 + (time % 1) * 1.6;
      security.groundRing.scale.set(s, s, 1);
      security.groundRing.material.opacity = .95 - (time % 1) * .85;
    }
    if (security.intruderTag) security.intruderTag.position.set(I.g.position.x, 4, I.g.position.z);
  }
  const G = security.guard;
  if (G && G.gPath) {
    const P = G.gPath;
    if (P.seg < P.pts.length - 1) {
      const a = P.pts[P.seg], b = P.pts[P.seg + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); P.segT += P.speed * dt / L;
      if (P.segT >= 1) { P.segT = 0; P.seg++; }
      else {
        G.g.position.set(a[0] + (b[0] - a[0]) * P.segT, 0, a[1] + (b[1] - a[1]) * P.segT);
        G.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
      }
    } else if (I && !I.escort) {
      I.escort = true;
      addAlert('info', 'Subject contained — escorting to exit');
      setTimeout(() => resolveIncident(), 3500);
    }
  }
}

export function triggerCritical() {
  incident.active = true;
  document.getElementById('banner').classList.add('show');
  document.getElementById('sysStatus').classList.add('alarm');
  document.getElementById('sysDot').classList.add('crit');
  document.getElementById('sysVal').textContent = 'CRITICAL ALERT';
  document.getElementById('feed1').classList.add('hl');
  document.getElementById('acId').textContent = 'EVT-2841 · CRITICAL · OPEN';
  addAlert('crit', 'UNAUTHORIZED ACCESS — High-Value Cage R-1');
  addAlert('warn', 'Asset anomaly: HV-crate motion without work order');
  setTimeout(() => {
    if (incident.active) addAlert('warn', 'Inventory discrepancy flagged — cage R-1 snapshot diff');
  }, 2500);
}

export function resolveIncident() {
  if (!incident.active) return;
  incident.active = false; incident.resolved = true;
  document.getElementById('banner').classList.remove('show');
  document.getElementById('sysStatus').classList.remove('alarm');
  document.getElementById('sysDot').classList.remove('crit');
  document.getElementById('sysVal').textContent = 'ALL OPERATIONAL';
  document.getElementById('acId').textContent = 'EVT-2841 · CRITICAL · RESOLVED';
  document.getElementById('statsPanel').classList.remove('hl');
  document.getElementById('alertPanel').classList.remove('hl');
  document.getElementById('feed1').classList.remove('hl');
  addAlert('info', 'EVT-2841 resolved — zone secure, cycle count queued');
}

export function clearIncident() {
  if (security.intruder) {
    scene.remove(security.intruder.g);
    const i = trackables.findIndex(t => t.type === 'intruder'); if (i >= 0) trackables.splice(i, 1);
    security.intruder = null;
  }
  if (security.groundRing) { scene.remove(security.groundRing); security.groundRing = null; }
  if (security.intruderTag) { scene.remove(security.intruderTag); security.intruderTag = null; }
  if (security.guard) {
    security.guard.scripted = false; security.guard.gPath = null;
    security.guard.target = null; security.guard = null;
  }
  document.getElementById('alertCard').classList.remove('show');
  resolveIncident();
  incident.resolved = false;
}
