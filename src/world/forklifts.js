/**
 * Forklift fleet: waypoint loops, smooth heading, beacons, periodic pallet carry.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { trackables } from '../state.js';
import { rand } from '../utils.js';
import { FL_PATHS } from '../config.js';
import { makePalletMesh } from './pallets.js';

export const forklifts = [];

function makeForklift() {
  const gr = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xe8950c, roughness: .45, metalness: .3 }));
  body.position.y = 1.1; body.castShadow = true; gr.add(body);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x222831, roughness: .6, metalness: .4, transparent: true, opacity: .85 }));
  cage.position.set(-.3, 2.4, 0); gr.add(cage);
  const mastM = new THREE.MeshStandardMaterial({ color: 0x39404a, roughness: .5, metalness: .6 });
  for (const dz of [-.5, .5]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.16, 3.4, .16), mastM);
    m.position.set(1.35, 1.9, dz); gr.add(m);
  }
  const fork = new THREE.Mesh(new THREE.BoxGeometry(1.5, .1, 1.2), mastM);
  fork.position.set(2.2, .35, 0); gr.add(fork); gr.userData.fork = fork;
  const wGeo = new THREE.CylinderGeometry(.42, .42, .4, 12);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x14171c });
  for (const [x, z] of [[.8, .85], [.8, -.85], [-.8, .85], [-.8, -.85]]) {
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.x = Math.PI / 2; w.position.set(x, .42, z); gr.add(w);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff8800, emissiveIntensity: 3 }));
  beacon.position.set(-.3, 3.25, 0); gr.add(beacon); gr.userData.beacon = beacon;
  scene.add(gr); return gr;
}

export function buildForklifts() {
  FL_PATHS.forEach((path, i) => {
    const g = makeForklift();
    const f = { g, path, seg: 0, segT: rand(0, 1), speed: rand(5, 7), id: 'FL-0' + (i + 1), carry: null, carryT: rand(4, 10) };
    g.position.set(path[0][0], 0, path[0][1]);
    forklifts.push(f);
    trackables.push({ obj: g, type: 'forklift', label: f.id, y: 1.6 });
  });
}

export function updateForklifts(dt, time) {
  for (const f of forklifts) {
    const a = f.path[f.seg], b = f.path[(f.seg + 1) % f.path.length];
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    f.segT += f.speed * dt / segLen;
    if (f.segT >= 1) { f.segT = 0; f.seg = (f.seg + 1) % f.path.length; }
    const a2 = f.path[f.seg], b2 = f.path[(f.seg + 1) % f.path.length];
    const x = a2[0] + (b2[0] - a2[0]) * f.segT, z = a2[1] + (b2[1] - a2[1]) * f.segT;
    f.g.position.set(x, 0, z);
    const ang = Math.atan2(b2[0] - a2[0], b2[1] - a2[1]) - Math.PI / 2;
    let d = ang - f.g.rotation.y;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    f.g.rotation.y += d * Math.min(1, dt * 5);
    f.g.userData.beacon.material.emissiveIntensity = 2 + Math.sin(time * 9 + f.seg) * 1.8;
    // periodically pick up / drop a pallet on the forks
    f.carryT -= dt;
    if (f.carryT < 0) {
      if (f.carry) { f.g.remove(f.carry); f.carry = null; f.carryT = rand(5, 12); }
      else { f.carry = makePalletMesh(); f.carry.position.set(2.2, .45, 0); f.g.add(f.carry); f.carryT = rand(8, 16); }
    }
  }
}
