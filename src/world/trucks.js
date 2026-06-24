/**
 * Trailer fleet: arrive → dock (door opens) → dwell → depart state machine.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { trackables } from '../state.js';
import { rand, ease, clamp } from '../utils.js';
import { DOCKS, TRUCK_CFGS, TRUCK_COLORS } from '../config.js';
import { dockDoors } from './environment.js';
import { addAlert } from '../hud/alerts.js';

export const trucks = [];

function makeTruck(color) {
  const gr = new THREE.Group();
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(13, 3.6, 2.9),
    new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: .5, metalness: .3 }));
  trailer.position.set(-2.5, 2.8, 0); trailer.castShadow = true; gr.add(trailer);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.7),
    new THREE.MeshStandardMaterial({ color, roughness: .4, metalness: .5 }));
  cab.position.set(6.6, 2.0, 0); cab.castShadow = true; gr.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(.3, 1, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x16202c, roughness: .1, metalness: .8 }));
  win.position.set(8.1, 2.5, 0); gr.add(win);
  const wGeo = new THREE.CylinderGeometry(.65, .65, .5, 14);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: .9 });
  for (const [x, z] of [[6.6, 1.3], [6.6, -1.3], [-6.5, 1.3], [-6.5, -1.3], [-4.6, 1.3], [-4.6, -1.3]]) {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.x = Math.PI / 2; w.position.set(x, .65, z); gr.add(w);
  }
  scene.add(gr); return gr;
}

export function buildTrucks() {
  TRUCK_CFGS.forEach((c, i) => {
    const g = makeTruck(TRUCK_COLORS[i]);
    const t = { g, side: c.side, dock: c.dock, state: 'away', t: -c.phase, dwell: rand(18, 26) };
    g.position.set(c.side * 230, 0, c.dock);
    g.rotation.y = c.side < 0 ? 0 : Math.PI;
    trucks.push(t);
    trackables.push({ obj: g, type: 'truck', label: 'TRUCK', y: 3 });
  });
}

export function updateTrucks(dt) {
  for (const t of trucks) {
    t.t += dt;
    const dockX = t.side * 134.5, awayX = t.side * 235;
    const door = dockDoors.find(d => d.side === t.side && d.z === t.dock);
    if (t.state === 'away') { if (t.t > 0) { t.state = 'arrive'; t.t = 0; } }
    else if (t.state === 'arrive') {
      const k = ease(clamp(t.t / 7, 0, 1));
      t.g.position.x = awayX + (dockX - awayX) * k;
      if (k >= 1) {
        t.state = 'docked'; t.t = 0; door.target = 1;
        if (t.side < 0) addAlert('info', `Trailer docked R${DOCKS.indexOf(t.dock) + 1} — receiving started`);
        else addAlert('info', `Trailer docked D${DOCKS.indexOf(t.dock) + 1} — loading started`);
      }
    } else if (t.state === 'docked') {
      if (t.t > t.dwell) { t.state = 'depart'; t.t = 0; door.target = 0; }
    } else if (t.state === 'depart') {
      const k = ease(clamp(t.t / 8, 0, 1));
      t.g.position.x = dockX + (awayX - dockX) * k;
      if (k >= 1) { t.state = 'away'; t.t = -rand(10, 30); t.dwell = rand(18, 26); }
    }
  }
  for (const d of dockDoors) {
    d.open += (d.target - d.open) * Math.min(1, dt * 2);
    d.mesh.position.y = 3.25 + d.open * 5.6;
    d.mesh.scale.y = 1 - d.open * .85;
  }
}
