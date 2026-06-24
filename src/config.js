/**
 * Facility configuration — single source of truth for layout, routes and content.
 * Reshape the warehouse, paths, cameras or demo script here without touching engine code.
 * World space: x ∈ [-FLOOR_W/2, FLOOR_W/2], z ∈ [-FLOOR_D/2, FLOOR_D/2], y up.
 */

export const FLOOR_W = 240, FLOOR_D = 130;
export const WALL_H = 18;

/** Dock door z-positions, mirrored on the west (receiving) and east (dispatch) walls. */
export const DOCKS = [-30, -10, 10, 30];

/* Racking grid */
export const RACK_ROWS = [-51, -33, -15, 15, 33, 51];
export const RACK_X0 = -65, RACK_LEN = 100, BAY = 4;
export const RACK_LEVELS = [1.25, 4.25, 7.25, 10.25];

/** Operational zones (also painted on the floor + used for occupancy/zone lookup). */
export const ZONES = {
  RECEIVING:  { x1: -114, z1: -40, x2: -80, z2: 40, color: '#38bdf8' },
  QC:         { x1: -114, z1: 45,  x2: -80, z2: 62, color: '#a78bfa' },
  STORAGE:    { x1: -65,  z1: -55, x2: 40,  z2: 55, color: '#94a3b8' },
  PACKING:    { x1: 52,   z1: -60, x2: 84,  z2: -16, color: '#4ade80' },
  SHIPPING:   { x1: 92,   z1: -50, x2: 114, z2: 50, color: '#fbbf24' },
  RESTRICTED: { x1: 52,   z1: 20,  x2: 84,  z2: 58, color: '#f87171' },
};
export const STORAGE_AISLES = [-42, -24, 0, 24, 42];
export const CAGE_CENTER = { x: 68, z: 39 };

/** Forklift patrol loops as [x, z] waypoints. */
export const FL_PATHS = [
  [[-90, 0], [40, 0], [40, -24], [-70, -24], [-70, 0]],
  [[-90, 6], [-90, 42], [30, 42], [30, 24], [-70, 24], [-70, 6]],
  [[45, -6], [45, -42], [-60, -42], [-60, -24], [38, -24], [38, -6]],
  [[-100, 22], [-100, -22], [-84, -22], [-84, 22]],
];

/** Trailer schedule: side -1 = west/receiving, +1 = east/dispatch. phase staggers arrivals. */
export const TRUCK_CFGS = [
  { side: -1, dock: -30, phase: 2 },
  { side: -1, dock: -10, phase: 24 },
  { side: -1, dock: 30,  phase: 50 },
  { side: 1,  dock: 10,  phase: 12 },
  { side: 1,  dock: -30, phase: 38 },
];
export const TRUCK_COLORS = [0x2563eb, 0xb91c1c, 0xd97706, 0x0d9488, 0x4b5563];

/** CCTV nodes: mount position, look-at target, name. Feed indices below. */
export const CCTV_DEFS = [
  { pos: [-78, 13, 0],  look: [-106, 0, 8],  name: 'CAM-01' },
  { pos: [-78, 13, 52], look: [-100, 0, 53], name: 'CAM-02' },
  { pos: [0, 15, -12],  look: [-30, 0, 0],   name: 'CAM-03' },
  { pos: [48, 13, -30], look: [68, 0, -38],  name: 'CAM-04' },
  { pos: [96, 13, 0],   look: [110, 0, 10],  name: 'CAM-05' },
  { pos: [20, 15, 30],  look: [0, 0, 33],    name: 'CAM-06' },
  { pos: [86, 13, 56],  look: [66, 0, 36],   name: 'CAM-07' },
];
export const FEED_CAMS = [0, 6]; // CAM-01 receiving, CAM-07 restricted

/** Saved viewpoints for the VIEWS menu: name, camera pos, look target. */
export const VIEWPOINTS = [
  ['⬡ Overview',       -140, 110, 120,    0, 0, 0],
  ['⇣ Receiving',      -158, 36, 42,   -102, 0, 5],
  ['▦ Storage Aisles',  -15, 55, 82,    -15, 0, 8],
  ['📦 Packing',         98, 34, -76,    67, 0, -35],
  ['⛔ Restricted',     106, 38, 74,     68, 0, 39],
  ['⇡ Shipping Docks',  166, 42, 32,    106, 0, 5],
  ['◳ Control Room',   -126, 20, -18,  -100, 7, -50],
];

/** Rotating AI-insight feed content. */
export const INSIGHTS = [
  ['🧠', 'Predicted congestion in <b>Aisle A-3</b> at 09:40 — reroute FL-02 via cross-aisle C.'],
  ['📦', 'Slotting: move 14 fast-moving SKUs to golden zone — est. <b>-11% travel time</b>.'],
  ['🗜️', 'Rack rows 5–6 at 91% capacity. Recommend overflow to row 2 (<b>+340 slots</b>).'],
  ['⚡', 'Pick path optimization available for wave W-118: <b>-8 min</b> per picker.'],
  ['🛡️', 'Risk: forklift/pedestrian proximity events trending up near Packing — add floor beacon.'],
  ['🌡️', 'Cold-aisle temp drift +0.8°C — HVAC zone 3 inspection suggested.'],
  ['🚛', 'Dock D2 turnaround 12% slower than fleet avg — check leveler hydraulics.'],
  ['📊', 'Cycle-count drift detected in bin B-214 — auto-count scheduled tonight.'],
];

export const SIM_SPEEDS = [1, 2, 4, 0.5];
