/**
 * Shared mutable runtime state. Modules import these singletons rather than
 * passing them through call chains. Nothing here touches the DOM or THREE.
 */

/**
 * Every trackable asset registers itself here: { obj: THREE.Object3D, type, label, y }.
 * type ∈ person | forklift | pallet | truck | intruder.
 * The twin map, AI detection, inspector and follow-cam all consume this registry —
 * a live data backend only needs to keep this array in sync (see data/datasource.js).
 */
export const trackables = [];

/** User-controlled visualization layers (LAYERS menu). */
export const layers = { heat: false, fov: false, trail: false, det: true, bars: true, fx: true };

/** Operational KPIs surfaced in the analytics panel. */
export const stats = { received: 1240, shipped: 1180, acc: 99.2, dock: 78, occ: 64, pick: 142 };

/** Active security incident flags (drives banner, twin map flash, alert card). */
export const incident = { active: false, resolved: false };

/** Simulation clock multiplier (speed button). */
export const sim = { speed: 1 };
