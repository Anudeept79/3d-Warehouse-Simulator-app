import * as THREE from 'three';

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, t, out) => out.copy(a).lerp(b, t);

/** Canvas-rendered text label as a billboard sprite (holo tags, signs, telemetry labels). */
export function makeTextSprite(text, { size = 48, color = '#22d3ee', bg = 'rgba(8,13,22,.78)' } = {}) {
  const pad = 26, c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `600 ${size}px Consolas,monospace`;
  const w = g.measureText(text).width;
  c.width = w + pad * 2; c.height = size + pad * 1.4;
  g.font = `600 ${size}px Consolas,monospace`;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(0, 0, c.width, c.height, 14); g.fill();
  g.strokeStyle = color; g.lineWidth = 3;
  g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 4, 12); g.stroke();
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, pad, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(c.width / 30, c.height / 30, 1); s.renderOrder = 10;
  return s;
}
