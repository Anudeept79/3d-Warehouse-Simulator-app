/**
 * User controls: playback bar, sim speed, VIEWS / LAYERS popovers,
 * immersive (hide-UI) mode, and the keyboard map.
 */
import { layers, sim } from '../state.js';
import { SIM_SPEEDS, VIEWPOINTS } from '../config.js';
import { V3 } from '../utils.js';
import { camMode, camHooks, setFree, setFollow, flyToView } from '../core/cameraModes.js';
import { heat } from '../world/heatmap.js';
import { applyFrustums } from '../world/cctv.js';
import { applyTrail } from '../world/trail.js';
import { clearDetections } from '../hud/detections.js';
import { deselect } from '../hud/inspector.js';
import { dispatchGuard } from '../world/security.js';
import { director, gotoScene, setPlaying } from '../director/director.js';

export function initControls() {
  /* ---------- playback ---------- */
  document.getElementById('btnPlay').onclick = () => setPlaying(!director.playing);
  document.getElementById('btnPrev').onclick = () => gotoScene(director.idx - 1);
  document.getElementById('btnNext').onclick = () => gotoScene(director.idx + 1);
  const btnFree = document.getElementById('btnFree');
  btnFree.onclick = () => setFree(!camMode.free);
  camHooks.onFreeChange = v => btnFree.classList.toggle('on', v);

  /* ---------- alert card actions ---------- */
  document.getElementById('btnAck').onclick = () =>
    document.getElementById('alertCard').classList.remove('show');
  document.getElementById('btnDispatch').onclick = () => {
    dispatchGuard();
    document.getElementById('alertCard').classList.remove('show');
  };

  /* ---------- simulation speed ---------- */
  let speedI = 0;
  const btnSpeed = document.getElementById('btnSpeed');
  btnSpeed.onclick = () => {
    speedI = (speedI + 1) % SIM_SPEEDS.length;
    sim.speed = SIM_SPEEDS[speedI];
    btnSpeed.textContent = (sim.speed + '×').replace('0.5', '½');
    btnSpeed.classList.toggle('on', sim.speed !== 1);
  };

  /* ---------- popovers ---------- */
  const popViews = document.getElementById('popViews');
  const popLayers = document.getElementById('popLayers');
  const togglePop = (p, other) => { other.classList.remove('show'); p.classList.toggle('show'); };
  document.getElementById('btnViews').onclick = e => { e.stopPropagation(); togglePop(popViews, popLayers); };
  document.getElementById('btnLayers').onclick = e => { e.stopPropagation(); togglePop(popLayers, popViews); };
  addEventListener('pointerdown', e => {
    if (!e.target.closest('.pop') && !e.target.closest('#btnViews') && !e.target.closest('#btnLayers')) {
      popViews.classList.remove('show'); popLayers.classList.remove('show');
    }
  });

  /* saved viewpoints */
  for (const [name, px, py, pz, tx, ty, tz] of VIEWPOINTS) {
    const el = document.createElement('div'); el.className = 'pi';
    el.innerHTML = `<span>${name}</span>`;
    el.onclick = () => { flyToView(V3(px, py, pz), V3(tx, ty, tz)); popViews.classList.remove('show'); };
    popViews.appendChild(el);
  }

  /* visualization layers */
  const LAYER_DEFS = [
    ['heat', 'Activity Heatmap', v => { heat.lock = v; heat.on = v; }],
    ['fov', 'Camera Coverage', () => applyFrustums()],
    ['trail', 'Forklift Trails', () => applyTrail()],
    ['det', 'AI Detection Boxes', v => { if (!v) clearDetections(); }],
    ['bars', 'Cinematic Bars', v => {
      document.querySelectorAll('.letterbox,.vignette').forEach(e => e.style.display = v ? '' : 'none');
    }],
    ['fx', 'Bloom / Glow FX', () => {}], // read directly by the render loop
  ];
  for (const [key, name, fn] of LAYER_DEFS) {
    const el = document.createElement('div');
    el.className = 'pi' + (layers[key] ? ' on' : '');
    el.innerHTML = `<span class="ck"></span><span>${name}</span>`;
    el.onclick = () => { layers[key] = !layers[key]; el.classList.toggle('on', layers[key]); fn(layers[key]); };
    popLayers.appendChild(el);
    if (key === 'heat') el.id = 'layerHeat';
    if (key === 'fx') el.id = 'layerFx';
  }

  /* ---------- immersive mode ---------- */
  const btnUI = document.getElementById('btnUI');
  const toggleUI = () => {
    const h = document.body.classList.toggle('hideui');
    btnUI.textContent = h ? 'SHOW UI' : 'HIDE UI';
    btnUI.classList.toggle('on', h);
  };
  btnUI.onclick = toggleUI;

  /* ---------- keyboard ---------- */
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!director.playing); }
    if (e.code === 'ArrowRight') gotoScene(director.idx + 1);
    if (e.code === 'ArrowLeft') gotoScene(director.idx - 1);
    if (e.code === 'KeyF') setFree(!camMode.free);
    if (e.code === 'Tab') { e.preventDefault(); toggleUI(); }
    if (e.code === 'Escape') {
      if (camMode.follow) setFollow(null);
      else deselect();
    }
    if (e.code === 'KeyH') { const el = document.getElementById('layerHeat'); if (el) el.click(); }
    if (/^Digit[0-9]$/.test(e.code)) { const n = +e.code.slice(5); gotoScene((n === 0 ? 10 : n) - 1); }
  });
}
