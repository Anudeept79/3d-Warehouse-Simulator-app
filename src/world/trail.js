/**
 * Forklift route trail (telemetry breadcrumb line for FL-01).
 * trailState.scene = director wants it (scene 4); layers.trail = user pinned it.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { layers } from '../state.js';
import { forklifts } from './forklifts.js';

const trailMax = 160;
const trailGeo = new THREE.BufferGeometry();
const trailPos = new Float32Array(trailMax * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setDrawRange(0, 0);
export const trail = new THREE.Line(trailGeo,
  new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: .8 }));
trail.visible = false;
scene.add(trail);

export const trailState = { scene: false };
let trailCount = 0, trailTimer = 0;

export function applyTrail() { trail.visible = trailState.scene || layers.trail; }

export function resetTrail() { trailCount = 0; trailGeo.setDrawRange(0, 0); }

export function updateTrail(dt) {
  if (!trail.visible || !forklifts.length) return;
  trailTimer -= dt;
  if (trailTimer <= 0) {
    trailTimer = .08;
    const p = forklifts[0].g.position;
    if (trailCount < trailMax) { trailPos.set([p.x, .4, p.z], trailCount * 3); trailCount++; }
    else { trailPos.copyWithin(0, 3); trailPos.set([p.x, .4, p.z], (trailMax - 1) * 3); }
    trailGeo.setDrawRange(0, trailCount);
    trailGeo.attributes.position.needsUpdate = true;
  }
}
