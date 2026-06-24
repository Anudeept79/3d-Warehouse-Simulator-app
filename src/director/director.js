/**
 * Cinematic director: drives the scene timeline, lower-third titles, progress bar,
 * scene dots, and dip-to-black cuts. Yields the camera to free/follow modes.
 */
import { clamp } from '../utils.js';
import { incident } from '../state.js';
import { camMode, setFree, setFollow } from '../core/cameraModes.js';
import { heat } from '../world/heatmap.js';
import { setFrustums } from '../world/cctv.js';
import { clearIncident } from '../world/security.js';
import { SCENES } from './scenes.js';

export const director = { idx: 0, time: 0, playing: true };

const fadeEl = document.getElementById('fade');
const dotsEl = document.getElementById('dots');
const lt = {
  el: document.getElementById('lowerThird'),
  n: document.getElementById('ltN'),
  t: document.getElementById('ltT'),
  s: document.getElementById('ltS'),
  timer: null,
};

export function initDirector() {
  SCENES.forEach((s, i) => {
    const d = document.createElement('button'); d.className = 'sdot'; d.textContent = i + 1;
    d.title = s.title; d.onclick = () => gotoScene(i); dotsEl.appendChild(d);
  });
}

function refreshDots() {
  [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === director.idx));
}

function showLowerThird() {
  const s = SCENES[director.idx];
  lt.n.textContent = 'SCENE ' + String(director.idx + 1).padStart(2, '0');
  lt.t.textContent = s.title; lt.s.textContent = s.sub;
  lt.el.classList.add('show');
  clearTimeout(lt.timer);
  lt.timer = setTimeout(() => lt.el.classList.remove('show'), 5200);
}

export function setPlaying(v) {
  director.playing = v;
  const b = document.getElementById('btnPlay');
  b.textContent = v ? '⏸ PAUSE' : '▶ PLAY';
  b.classList.toggle('on', !v);
}

export function gotoScene(i, fromLoop) {
  if (!camMode.free && !camMode.follow) {
    fadeEl.style.opacity = .85;
    setTimeout(() => fadeEl.style.opacity = 0, 230);
  }
  if (!fromLoop) { setFree(false); setFollow(null); }
  const prev = SCENES[director.idx];
  if (prev.onExit) prev.onExit();
  if (!fromLoop && i <= 6) { // jumping backwards past the event — clean up
    if (director.idx >= 6 || incident.active || incident.resolved) clearIncident();
    document.getElementById('statsPanel').classList.remove('hl');
    document.getElementById('alertPanel').classList.remove('hl');
  }
  if (i < 5) setFrustums(false);
  if (i !== 4 && i !== 9) heat.on = heat.lock;
  director.idx = (i + SCENES.length) % SCENES.length;
  director.time = 0;
  const s = SCENES[director.idx];
  if (s.onEnter) s.onEnter();
  refreshDots(); showLowerThird();
}

export function updateDirector(dt) {
  if (!director.playing || camMode.free || camMode.follow) return;
  const s = SCENES[director.idx];
  director.time += dt;
  const t = clamp(director.time / s.dur, 0, 1);
  s.run(t, director.time);
  document.getElementById('progress').style.width = ((director.idx + t) / SCENES.length * 100) + '%';
  if (director.time >= s.dur) gotoScene(director.idx + 1, true);
}
