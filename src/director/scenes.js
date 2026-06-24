/**
 * The 10-scene presentation script. Each scene: { title, sub, dur, onEnter?, onExit?, run(t, st) }
 * run() receives normalized progress t ∈ [0,1] and raw scene time st (seconds).
 */
import { camera, camTarget, scene } from '../core/stage.js';
import { V3, lerpV, ease, makeTextSprite } from '../utils.js';
import { incident } from '../state.js';
import { trucks } from '../world/trucks.js';
import { forklifts } from '../world/forklifts.js';
import { tagStagedPallets } from '../world/pallets.js';
import { trailState, applyTrail, resetTrail } from '../world/trail.js';
import { heat } from '../world/heatmap.js';
import { setFrustums } from '../world/cctv.js';
import {
  security, spawnIntruder, dispatchGuard, showLocationLock, triggerCritical, clearIncident,
} from '../world/security.js';
import { addAlert } from '../hud/alerts.js';
import { feedEls } from '../hud/detections.js';
import { CAGE_CENTER } from '../config.js';

function camPath(t, from, to, lookFrom, lookTo) {
  const k = ease(t);
  lerpV(from, to, k, camera.position);
  lerpV(lookFrom, lookTo, k, camTarget);
  camera.lookAt(camTarget);
}

let flLabel = null;

export const SCENES = [
  {
    title: 'AERIAL OVERVIEW', sub: 'DC-WEST-01 · 412,000 sq ft · live digital twin', dur: 11,
    run(t) {
      const a = -2.4 + t * 1.9, r = 300 - t * 130, h = 150 - t * 70;
      camera.position.set(Math.cos(a) * r, h, Math.sin(a) * r * .62);
      camTarget.set(0, 0, 0); camera.lookAt(camTarget);
    },
  },
  {
    title: 'RECEIVING OPERATIONS', sub: 'Inbound trailers · automated dock assignment', dur: 9,
    onEnter() {
      const t = trucks[0]; if (t.state === 'away') { t.state = 'arrive'; t.t = 2.5; }
      addAlert('info', 'ASN matched — PO-77812 expected: 26 pallets');
    },
    run(t) { camPath(t, V3(-160, 22, 62), V3(-96, 7, 28), V3(-118, 3, -10), V3(-108, 2, -22)); },
  },
  {
    title: 'DIGITAL TWIN SYNC', sub: 'Every pallet scanned · instantly mirrored in the twin', dur: 8,
    onEnter() {
      tagStagedPallets();
      const twin = document.getElementById('twinPanel');
      twin.style.boxShadow = '0 0 30px rgba(34,211,238,.45)';
      setTimeout(() => twin.style.boxShadow = '', 6000);
    },
    run(t) { camPath(t, V3(-72, 14, 30), V3(-80, 5, 2), V3(-95, 1, 8), V3(-92, 1.5, 4)); },
  },
  {
    title: 'FORKLIFT TELEMETRY', sub: 'Real-time location · speed · load state · route history', dur: 9,
    onEnter() {
      trailState.scene = true; applyTrail(); resetTrail();
      flLabel = makeTextSprite('FL-01 · 5.8 km/h · LOADED', { size: 40 });
      flLabel.scale.multiplyScalar(.9); scene.add(flLabel);
    },
    onExit() {
      trailState.scene = false; applyTrail();
      if (flLabel) { scene.remove(flLabel); flLabel = null; }
    },
    run(t) {
      const f = forklifts[0], p = f.g.position;
      const back = 11 - t * 3;
      camera.position.lerp(V3(p.x - back * Math.sin(f.g.rotation.y + .6), 6.5 - t * 2, p.z - back * Math.cos(f.g.rotation.y + .6)), .06);
      camTarget.lerp(V3(p.x, 1.4, p.z), .15); camera.lookAt(camTarget);
      if (flLabel) flLabel.position.set(p.x, 4.6, p.z);
    },
  },
  {
    title: 'WORKFORCE ACTIVITY', sub: 'Anonymous position heatmap · zone occupancy · flow analysis', dur: 9,
    onEnter() { heat.on = true; },
    run(t) { camPath(t, V3(-20, 85, 75), V3(5, 108, 8), V3(-10, 0, 10), V3(0, 0, 0)); },
  },
  {
    title: 'AI CAMERA NETWORK', sub: '7 vision nodes · person / vehicle / pallet detection at the edge', dur: 9,
    onEnter() {
      setFrustums(true); heat.on = false;
      feedEls.forEach(f => f.style.boxShadow = '0 0 24px rgba(34,211,238,.45)');
      setTimeout(() => feedEls.forEach(f => f.style.boxShadow = ''), 5500);
    },
    run(t) { camPath(t, V3(60, 34, 86), V3(-42, 26, 64), V3(20, 4, 20), V3(-20, 4, 0)); },
  },
  {
    title: 'SECURITY EVENT DETECTED', sub: 'CAM-07 · person without credential entering restricted zone', dur: 12,
    onEnter() { spawnIntruder(); },
    run(t, st) {
      const I = security.intruder;
      if (I) {
        const p = I.g.position;
        if (t < .55) { camera.position.lerp(V3(p.x + 13, 7, p.z + 11), .05); camTarget.lerp(V3(p.x, 1.5, p.z), .1); }
        else { camera.position.lerp(V3(p.x + 9, 17, p.z + 15), .04); camTarget.lerp(V3(p.x, 1, p.z), .1); }
        camera.lookAt(camTarget);
      }
      if (st > 4.6 && !incident.active && !incident.resolved) {
        triggerCritical();
        document.getElementById('statsPanel').classList.add('hl');
        document.getElementById('alertPanel').classList.add('hl');
      }
    },
  },
  {
    title: 'WAREPRO RESPONDS', sub: 'Alert triaged · context assembled · action recommended', dur: 9,
    onEnter() { document.getElementById('alertCard').classList.add('show'); },
    run(t) { camPath(t, V3(80, 55, 95), V3(45, 68, 70), V3(40, 0, 20), V3(50, 0, 30)); },
  },
  {
    title: 'PRECISE LOCATION LOCK', sub: 'Asset-level coordinates · 30 cm RTLS accuracy', dur: 8,
    onEnter() {
      document.getElementById('alertCard').classList.remove('show');
      showLocationLock();
      dispatchGuard();
    },
    run(t) {
      const p = security.intruder ? security.intruder.g.position : CAGE_CENTER;
      camPath(t, V3(p.x + 34, 30, p.z + 30), V3(p.x + 10, 9, p.z + 13), V3(p.x, 0, p.z), V3(p.x, 1, p.z));
    },
  },
  {
    title: 'COMMAND CENTER · FULL VISIBILITY', sub: 'One platform — inventory, people, vehicles, security, insight', dur: 13,
    onEnter() { setFrustums(true); heat.on = true; },
    onExit() { setFrustums(false); heat.on = false; clearIncident(); },
    run(t) { camPath(t, V3(-115, 26, -58), V3(-55, 52, -25), V3(-60, 6, -20), V3(10, 0, 5)); },
  },
];
