/**
 * Asset Inspector: click-to-select via raycast, hover tooltips, selection ring,
 * live telemetry readout, and follow-camera handoff.
 */
import * as THREE from 'three';
import { renderer, scene, camera } from '../core/stage.js';
import { camMode, camHooks, setFollow } from '../core/cameraModes.js';
import { trackables } from '../state.js';
import { V3 } from '../utils.js';
import { forklifts } from '../world/forklifts.js';
import { workers, zoneOf } from '../world/workers.js';
import { trucks } from '../world/trucks.js';
import { pallets } from '../world/pallets.js';

const inspector = document.getElementById('inspector');
const btnFollow = document.getElementById('btnFollow');
const tip = document.getElementById('tip');
const glEl = renderer.domElement;

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let selected = null, downX = 0, downY = 0;

const selRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.85, 40),
  new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false }));
selRing.rotation.x = -Math.PI / 2; selRing.visible = false;
scene.add(selRing);

const TYPE_NAMES = {
  person: 'ASSOCIATE', forklift: 'FORKLIFT · MHE', pallet: 'PALLET · LPN',
  truck: 'TRAILER', intruder: 'UNIDENTIFIED PERSON',
};

function pickAt(cx, cy) {
  ptr.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const objs = trackables.map(t => t.obj);
  const hits = ray.intersectObjects(objs, true);
  if (!hits.length) return null;
  let o = hits[0].object; while (o && !objs.includes(o)) o = o.parent;
  return trackables.find(t => t.obj === o) || null;
}

function statusOf(t) {
  if (t.type === 'forklift') { const f = forklifts.find(f => f.g === t.obj); return f && f.carry ? 'LOADED' : 'EMPTY · IN ROUTE'; }
  if (t.type === 'person') { const w = workers.find(w => w.g === t.obj); return w && w.idle > 0 ? 'IDLE' : 'ACTIVE'; }
  if (t.type === 'truck') { const tr = trucks.find(x => x.g === t.obj); return tr ? tr.state.toUpperCase() : '—'; }
  if (t.type === 'pallet') { const p = pallets.find(x => x.g === t.obj); return p ? (p.dir === 'in' ? 'PUTAWAY FLOW' : 'OUTBOUND FLOW') : '—'; }
  if (t.type === 'intruder') return '⚠ NO CREDENTIAL';
  return '—';
}

function refreshFollowBtn() {
  btnFollow.textContent = camMode.follow ? '◉ FOLLOWING' : '◉ FOLLOW';
  btnFollow.classList.toggle('live', !!camMode.follow);
}
camHooks.onFollowChange = refreshFollowBtn;

function select(t) {
  selected = t; selected._lp = t.obj.position.clone(); selected._spd = 0;
  inspector.classList.add('show'); selRing.visible = true;
  refreshFollowBtn(); writeInspector(true);
}

export function deselect() {
  selected = null; setFollow(null);
  inspector.classList.remove('show'); selRing.visible = false;
}

let insUpd = 0;
function writeInspector(force) {
  if (!selected) return;
  insUpd -= 1 / 60; if (!force && insUpd > 0) return; insUpd = .15;
  const p = selected.obj.position;
  document.getElementById('iId').textContent = selected.label;
  document.getElementById('iType').textContent = TYPE_NAMES[selected.type] || selected.type.toUpperCase();
  document.getElementById('iZone').textContent = Math.abs(p.x) > 120 ? 'YARD' : zoneOf(p);
  document.getElementById('iPos').textContent = `X ${p.x.toFixed(1)} · Z ${p.z.toFixed(1)}`;
  document.getElementById('iSpd').textContent = selected._spd.toFixed(1) + ' km/h';
  const st = document.getElementById('iStat'); st.textContent = statusOf(selected);
  st.style.color = selected.type === 'intruder' ? 'var(--crit)' : '';
}

export function initInspector() {
  glEl.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  glEl.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // drag, not click
    const t = pickAt(e.clientX, e.clientY);
    if (t) select(t); else if (selected) deselect();
  });
  glEl.addEventListener('pointermove', e => { lastMove = e; });
  btnFollow.onclick = () => setFollow(camMode.follow ? null : selected);
  document.getElementById('btnDeselect').onclick = deselect;
}

let hoverTimer = 0, lastMove = null;
function updateHover(dt) {
  hoverTimer -= dt; if (hoverTimer > 0 || !lastMove) return; hoverTimer = .12;
  const t = pickAt(lastMove.clientX, lastMove.clientY);
  if (t) {
    tip.style.display = 'block';
    tip.style.left = lastMove.clientX + 'px'; tip.style.top = lastMove.clientY + 'px';
    tip.textContent = `${t.label} · ${TYPE_NAMES[t.type] || t.type.toUpperCase()}`;
    tip.style.color = t.type === 'intruder' ? 'var(--crit)' : '';
    glEl.style.cursor = 'pointer';
  } else { tip.style.display = 'none'; glEl.style.cursor = ''; }
}

/** Per-frame: selection ring, live speed estimate, inspector refresh, hover. */
export function updateSelection(dt, time) {
  if (selected) {
    if (!selected.obj.parent) deselect();
    else {
      const p = selected.obj.position;
      selRing.position.set(p.x, .1, p.z);
      const s = 1 + Math.sin(time * 5) * .12; selRing.scale.set(s, s, 1);
      selected._spd = selected._lp ? p.distanceTo(selected._lp) / Math.max(dt, .001) * 3.6 : 0;
      selected._lp.copy(p);
      writeInspector();
    }
  }
  updateHover(dt);
}
