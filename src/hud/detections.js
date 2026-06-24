/**
 * AI detection overlays: projects tracked assets into each CCTV feed camera and
 * draws labeled bounding boxes (the "computer vision" layer of the demo).
 */
import * as THREE from 'three';
import { trackables, layers } from '../state.js';
import { rand, clamp } from '../utils.js';
import { FEEDS } from '../world/cctv.js';

export const feedEls = [document.getElementById('feed0'), document.getElementById('feed1')];
const ovCtx = feedEls.map(f => {
  const c = f.querySelector('canvas.ov'); c.width = 252 * 2; c.height = 150 * 2;
  return c.getContext('2d');
});

const DET_COLORS = { person: '#4ade80', forklift: '#fbbf24', pallet: '#38bdf8', intruder: '#f87171', truck: '#94a3b8' };
const tmpV = new THREE.Vector3();
let detT = 0;

export function clearDetections() {
  ovCtx.forEach(g => g.clearRect(0, 0, 504, 300));
}

export function drawDetections(dt) {
  if (!layers.det) return;
  detT -= dt; if (detT > 0) return; detT = .12;
  FEEDS.forEach((feed, fi) => {
    const g = ovCtx[fi], W = 504, H = 300;
    g.clearRect(0, 0, W, H);
    feed.cam.updateMatrixWorld();
    for (const t of trackables) {
      if (t.type === 'truck') continue;
      tmpV.copy(t.obj.position); tmpV.y += t.y || 1;
      const dist = tmpV.distanceTo(feed.cam.position);
      if (dist > 90) continue;
      tmpV.project(feed.cam);
      if (tmpV.z > 1 || Math.abs(tmpV.x) > 0.95 || Math.abs(tmpV.y) > 0.95) continue;
      const x = (tmpV.x + 1) / 2 * W, y = (1 - (tmpV.y + 1) / 2) * H;
      const s = clamp(2600 / dist / (t.type === 'pallet' ? 1.6 : 1), 18, 110);
      const col = DET_COLORS[t.type];
      g.strokeStyle = col; g.lineWidth = 2.5;
      const bh = t.type === 'person' || t.type === 'intruder' ? s * 1.5 : s * .8;
      g.strokeRect(x - s / 2, y - bh / 2, s, bh);
      g.fillStyle = col;
      const conf = (t.type === 'intruder' ? .97 : rand(.88, .99)).toFixed(2);
      const lbl = (t.type === 'intruder' ? '⚠ PERSON · NO BADGE' : t.type.toUpperCase()) + ' ' + conf;
      g.font = '600 15px Consolas,monospace';
      const tw = g.measureText(lbl).width;
      g.fillRect(x - s / 2, y - bh / 2 - 20, tw + 10, 18);
      g.fillStyle = '#06090f'; g.fillText(lbl, x - s / 2 + 5, y - bh / 2 - 6);
    }
  });
}
