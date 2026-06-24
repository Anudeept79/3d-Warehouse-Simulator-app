/**
 * Pallet flow simulation: inbound (dock → staging → racking) and
 * outbound (racking → packing → shipping dock), with tracking rings and LPN labels.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { trackables, stats } from '../state.js';
import { rand, V3, makeTextSprite } from '../utils.js';
import { DOCKS, STORAGE_AISLES } from '../config.js';
import { trucks } from './trucks.js';
import { addAlert } from '../hud/alerts.js';
import { twinPulses } from '../hud/twinmap.js';

const palletGeo = new THREE.BoxGeometry(1.7, .16, 1.4);
const palletMat = new THREE.MeshStandardMaterial({ color: 0x9a7344, roughness: .85 });
const crateGeo = new THREE.BoxGeometry(1.5, 1.15, 1.25);
const crateMats = [0x8a6a42, 0x3e6e8e, 0x4a7a64, 0x96764e]
  .map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
const ringGeo = new THREE.RingGeometry(1.1, 1.32, 32);

/** Plain pallet+crate mesh — also used as forklift cargo. */
export function makePalletMesh() {
  const gr = new THREE.Group();
  const p = new THREE.Mesh(palletGeo, palletMat); p.position.y = .08; p.castShadow = true; gr.add(p);
  const c = new THREE.Mesh(crateGeo, crateMats[Math.random() * crateMats.length | 0]);
  c.position.y = .74; c.castShadow = true; gr.add(c);
  return gr;
}

export const pallets = [];

function spawnPallet(dir, dockZ) {
  const g = makePalletMesh();
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: dir === 'in' ? 0x22d3ee : 0xfbbf24,
    transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false,
  }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .06; g.add(ring);
  let path, waits;
  if (dir === 'in') {
    const aisle = STORAGE_AISLES[Math.random() * STORAGE_AISLES.length | 0];
    const stage = V3(rand(-98, -88), 0, dockZ + rand(-6, 6));
    path = [V3(-114, 0, dockZ), stage, V3(-75, 0, aisle > 0 ? 11 : -11),
      V3(rand(-60, 30), 0, aisle > 0 ? 11 : -11), V3(rand(-60, 30), 0, aisle)];
    waits = [0, 8, 0, 0, 2];
    g.position.copy(path[0]);
  } else {
    const aisle = STORAGE_AISLES[Math.random() * STORAGE_AISLES.length | 0];
    const start = V3(rand(-55, 30), 0, aisle);
    path = [start, V3(38, 0, aisle > 0 ? 11 : -11), V3(58, 0, -11),
      V3(rand(58, 78), 0, rand(-30, -22)), V3(96, 0, dockZ + rand(-4, 4)), V3(112, 0, dockZ)];
    waits = [1, 0, 0, 6, 4, 0];
    g.position.copy(start);
  }
  scene.add(g);
  const p = { g, path, waits, seg: 0, segT: 0, wait: waits[0], speed: rand(3.5, 4.6), dir, life: 0, tagged: false };
  pallets.push(p);
  trackables.push({ obj: g, type: 'pallet', label: 'LPN-' + (Math.random() * 9e5 + 1e5 | 0), y: .9 });
  return p;
}

let inSpawnT = 0, outSpawnT = 3;

export function updatePallets(dt) {
  inSpawnT -= dt; outSpawnT -= dt;
  const docked = trucks.find(t => t.side < 0 && t.state === 'docked');
  if (docked && inSpawnT < 0 && pallets.length < 26) { spawnPallet('in', docked.dock); inSpawnT = 4; }
  const dockedE = trucks.find(t => t.side > 0 && t.state === 'docked');
  if (outSpawnT < 0 && pallets.length < 26) {
    spawnPallet('out', dockedE ? dockedE.dock : DOCKS[Math.random() * 4 | 0]); outSpawnT = 6.5;
  }
  for (let i = pallets.length - 1; i >= 0; i--) {
    const p = pallets[i]; p.life += dt;
    if (p.wait > 0) { p.wait -= dt; continue; }
    if (p.seg >= p.path.length - 1) {
      p.g.scale.multiplyScalar(1 - dt * 2.5);
      if (p.g.scale.x < .06) {
        scene.remove(p.g); pallets.splice(i, 1);
        const ti = trackables.findIndex(t => t.obj === p.g); if (ti >= 0) trackables.splice(ti, 1);
        if (p.dir === 'in') stats.received += rand(18, 32) | 0; else stats.shipped += rand(18, 32) | 0;
      }
      continue;
    }
    const a = p.path[p.seg], b = p.path[p.seg + 1];
    const L = a.distanceTo(b) || .001;
    p.segT += p.speed * dt / L;
    if (p.segT >= 1) { p.seg++; p.segT = 0; p.wait = p.waits[p.seg] || 0; continue; }
    p.g.position.lerpVectors(a, b, p.segT);
    p.g.position.y = Math.sin(p.life * 2) * .03;
  }
}

/** Scene 3: attach holographic SKU tags to staged inbound pallets + pulse the twin map. */
export function tagStagedPallets() {
  let n = 0;
  for (const p of pallets) {
    if (p.dir === 'in' && !p.tagged && p.g.position.x < -78 && n < 4) {
      p.tagged = true; n++;
      const sku = `SKU ${1000 + Math.random() * 9000 | 0} · QTY ${12 + Math.random() * 36 | 0}`;
      const tag = makeTextSprite(sku, { size: 42, color: '#22d3ee' });
      tag.position.y = 3.1; tag.scale.multiplyScalar(.8); p.g.add(tag);
      setTimeout(() => p.g.remove(tag), 9000);
      twinPulses.push({ x: p.g.position.x, z: p.g.position.z, t: 0 });
    }
  }
  addAlert('info', `${Math.max(n, 2)} LPNs scanned — synced to digital twin`);
}
