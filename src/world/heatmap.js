/**
 * Worker activity heatmap: accumulating canvas texture blended onto the floor.
 * heat.on = currently displayed; heat.lock = user pinned it via LAYERS/H key.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { FLOOR_W, FLOOR_D } from '../config.js';
import { workers } from './workers.js';

export const heat = { on: false, lock: false };

const heatC = document.createElement('canvas'); heatC.width = 512; heatC.height = 278;
const heatG = heatC.getContext('2d');
const heatTex = new THREE.CanvasTexture(heatC);
const heatPlane = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D),
  new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
heatPlane.rotation.x = -Math.PI / 2; heatPlane.position.y = .12;
scene.add(heatPlane);

let heatOpacity = 0;

export function updateHeatmap(dt) {
  heatG.globalCompositeOperation = 'destination-out';
  heatG.fillStyle = 'rgba(0,0,0,0.015)'; heatG.fillRect(0, 0, 512, 278);
  heatG.globalCompositeOperation = 'lighter';
  for (const w of workers) {
    const x = (w.g.position.x + 120) / 240 * 512, y = (w.g.position.z + 65) / 130 * 278;
    const r = 10;
    const grd = heatG.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,120,40,0.05)');
    grd.addColorStop(.5, 'rgba(255,40,90,0.02)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    heatG.fillStyle = grd; heatG.beginPath(); heatG.arc(x, y, r, 0, 7); heatG.fill();
  }
  heatTex.needsUpdate = true;
  heatOpacity += ((heat.on ? 0.85 : 0) - heatOpacity) * Math.min(1, dt * 2.5);
  heatPlane.material.opacity = heatOpacity;
}
