/**
 * AI camera network: physical camera models, translucent view frustums,
 * and the PerspectiveCameras used to render the live HUD feeds.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { layers } from '../state.js';
import { V3 } from '../utils.js';
import { CCTV_DEFS, FEED_CAMS } from '../config.js';

export const cctv = [];
export const FEEDS = [];

let sceneFov = false; // director-driven visibility (scene 6/10)

function makeCCTV(pos, look, name) {
  const gr = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .5),
    new THREE.MeshStandardMaterial({ color: 0xd5dae2, roughness: .4, metalness: .5 }));
  gr.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .3, 10),
    new THREE.MeshStandardMaterial({ color: 0x111722, roughness: .2, metalness: .8 }));
  lens.rotation.z = Math.PI / 2; lens.position.x = .55; gr.add(lens);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 6),
    new THREE.MeshStandardMaterial({ emissive: 0xff3344, emissiveIntensity: 4, color: 0x000000 }));
  led.position.set(.2, .3, .2); gr.add(led);
  gr.position.copy(pos); gr.lookAt(look); gr.rotateY(-Math.PI / 2);
  scene.add(gr);
  const dir = look.clone().sub(pos);
  const L = dir.length();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(L * .42, L, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: .06, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.geometry.translate(0, -L / 2, 0);
  cone.position.copy(pos);
  cone.quaternion.setFromUnitVectors(V3(0, -1, 0), dir.normalize());
  cone.visible = false; scene.add(cone);
  const cam = new THREE.PerspectiveCamera(58, 252 / 150, .5, 400);
  cam.position.copy(pos); cam.lookAt(look);
  cctv.push({ gr, cone, cam, name, pos, look });
}

export function buildCCTV() {
  for (const d of CCTV_DEFS) makeCCTV(V3(...d.pos), V3(...d.look), d.name);
  for (const i of FEED_CAMS) FEEDS.push(cctv[i]);
}

export function setFrustums(v) { sceneFov = v; applyFrustums(); }
export function applyFrustums() {
  const vis = sceneFov || layers.fov;
  for (const c of cctv) c.cone.visible = vis;
}
