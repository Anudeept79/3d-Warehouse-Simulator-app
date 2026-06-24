/**
 * Camera mode state machine: director (default) | free orbit | fly-to | follow asset.
 * Owned here so the director, controls and inspector can coordinate without cycles.
 */
import { camera, camTarget, orbit } from './stage.js';
import { V3 } from '../utils.js';

export const camMode = {
  free: false,
  flyTo: null,   // { pos: V3, target: V3 } — consumed while free
  follow: null,  // a trackable entry, camera chases it
};

/** UI hooks — controls/inspector subscribe to reflect state on buttons. */
export const camHooks = { onFreeChange: () => {}, onFollowChange: () => {} };

const FOLLOW_DIST = { truck: 20, forklift: 10, person: 8, intruder: 8, pallet: 7 };

export function setFree(v) {
  camMode.free = v;
  orbit.enabled = v;
  if (v) orbit.target.copy(camTarget);
  else camMode.flyTo = null;
  camHooks.onFreeChange(v);
}

export function setFollow(t) {
  camMode.follow = t;
  camHooks.onFollowChange(t);
}

export function flyToView(pos, target) {
  setFree(true);
  camMode.flyTo = { pos, target };
}

/** Per-frame camera handling for free / fly-to / follow modes. */
export function updateCameraModes(dt) {
  if (camMode.free) {
    if (camMode.flyTo) {
      camera.position.lerp(camMode.flyTo.pos, Math.min(1, dt * 3.2));
      orbit.target.lerp(camMode.flyTo.target, Math.min(1, dt * 3.2));
      if (camera.position.distanceTo(camMode.flyTo.pos) < 1.2) camMode.flyTo = null;
    }
    orbit.update();
  }
  if (camMode.follow) {
    const t = camMode.follow;
    if (!t.obj.parent) { setFollow(null); return; }
    const p = t.obj.position, d = FOLLOW_DIST[t.type] || 9;
    camera.position.lerp(V3(p.x + d * .75, d * .62, p.z + d * .75), Math.min(1, dt * 2.6));
    camTarget.lerp(V3(p.x, 1.3, p.z), Math.min(1, dt * 6));
    camera.lookAt(camTarget);
  }
}
