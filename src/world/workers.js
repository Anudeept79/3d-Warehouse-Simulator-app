/**
 * Warehouse associates: zone-assigned wander behavior with idle pauses.
 * Also exports zoneOf() — point-in-zone lookup used across the HUD.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { trackables } from '../state.js';
import { rand, V3 } from '../utils.js';
import { ZONES, STORAGE_AISLES } from '../config.js';

export const workers = [];

export function zoneOf(p) {
  for (const [k, Z] of Object.entries(ZONES)) {
    if (k === 'STORAGE') continue;
    if (p.x >= Z.x1 && p.x <= Z.x2 && p.z >= Z.z1 && p.z <= Z.z2) return k;
  }
  return 'STORAGE';
}

export function makeWorker(vest = 0xffd23a, isGuard = false) {
  const gr = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .85, 4, 10),
    new THREE.MeshStandardMaterial({ color: isGuard ? 0x1e3a5f : 0x32404e, roughness: .8 }));
  body.position.y = 1.1; body.castShadow = true; gr.add(body);
  const vestM = new THREE.Mesh(new THREE.BoxGeometry(.95, .8, .62),
    new THREE.MeshStandardMaterial({ color: vest, emissive: vest, emissiveIntensity: .25, roughness: .7 }));
  vestM.position.y = 1.25; gr.add(vestM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xc99a72, roughness: .8 }));
  head.position.y = 2.05; gr.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: isGuard ? 0x16243a : 0xffd23a, roughness: .5 }));
  helm.position.y = 2.1; gr.add(helm);
  scene.add(gr); return gr;
}

export function buildWorkers() {
  const assign = [['RECEIVING', 3], ['PACKING', 3], ['QC', 2], ['STORAGE', 3], ['SHIPPING', 1]];
  let n = 1;
  for (const [zone, count] of assign) for (let i = 0; i < count; i++) {
    const g = makeWorker();
    const w = { g, zone, id: 'W-' + String(n++).padStart(2, '0'), target: null, idle: rand(0, 2), speed: rand(1.5, 2.1), bob: rand(0, 9) };
    const Z = ZONES[zone]; g.position.set(rand(Z.x1, Z.x2), 0, rand(Z.z1, Z.z2));
    workers.push(w);
    trackables.push({ obj: g, type: 'person', label: w.id, y: 1.4 });
  }
}

function pickTarget(w) {
  const Z = ZONES[w.zone];
  if (w.zone === 'STORAGE') {
    const aisle = STORAGE_AISLES[Math.random() * STORAGE_AISLES.length | 0];
    return V3(rand(-62, 38), 0, aisle + rand(-2.5, 2.5));
  }
  return V3(rand(Z.x1, Z.x2), 0, rand(Z.z1, Z.z2));
}

export function updateWorker(w, dt, time) {
  if (w.scripted) return; // scripted workers (security guard) handled by security.js
  if (w.idle > 0) { w.idle -= dt; return; }
  if (!w.target) w.target = pickTarget(w);
  const p = w.g.position, d = V3(w.target.x - p.x, 0, w.target.z - p.z), dist = d.length();
  if (dist < .5) { w.target = null; w.idle = rand(.5, 3); return; }
  d.normalize();
  p.x += d.x * w.speed * dt; p.z += d.z * w.speed * dt;
  w.g.rotation.y = Math.atan2(d.x, d.z);
  w.g.position.y = Math.abs(Math.sin(time * 7 + w.bob)) * .05;
}
