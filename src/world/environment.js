/**
 * Static facility geometry: floor with painted zones, walls, dock doors, racking,
 * restricted cage, control room, QC/packing furniture, roof structure, yard lighting.
 */
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { rand, makeTextSprite } from '../utils.js';
import {
  FLOOR_W, FLOOR_D, WALL_H, DOCKS,
  RACK_ROWS, RACK_X0, RACK_LEN, BAY, RACK_LEVELS,
} from '../config.js';

/** Animated dock doors: { mesh, z, side, open, target } — trucks.js drives them. */
export const dockDoors = [];

/* ---------------- floor with painted zones ---------------- */
function buildFloorTexture() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1110;
  const g = c.getContext('2d');
  const X = x => (x + 120) / 240 * 2048, Z = z => (z + 65) / 130 * 1110;
  g.fillStyle = '#191d23'; g.fillRect(0, 0, 2048, 1110);
  // subtle concrete noise
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${120 + Math.random() * 40 | 0},${125 + Math.random() * 40 | 0},${135 + Math.random() * 40 | 0},${Math.random() * .045})`;
    g.fillRect(Math.random() * 2048, Math.random() * 1110, 2, 2);
  }
  // expansion joints
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
  for (let x = -120; x <= 120; x += 24) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), 1110); g.stroke(); }
  for (let z = -65; z <= 65; z += 26) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(2048, Z(z)); g.stroke(); }
  const zone = (x1, z1, x2, z2, fill, stroke, label, lc) => {
    g.fillStyle = fill; g.fillRect(X(x1), Z(z1), X(x2) - X(x1), Z(z2) - Z(z1));
    g.strokeStyle = stroke; g.lineWidth = 4; g.setLineDash([18, 12]);
    g.strokeRect(X(x1), Z(z1), X(x2) - X(x1), Z(z2) - Z(z1)); g.setLineDash([]);
    if (label) {
      g.fillStyle = lc || 'rgba(148,163,184,.5)'; g.font = '600 34px Segoe UI'; g.textAlign = 'center';
      g.fillText(label, (X(x1) + X(x2)) / 2, (Z(z1) + Z(z2)) / 2 + 10);
    }
  };
  zone(-116, -42, -78, 42, 'rgba(56,189,248,.045)', 'rgba(56,189,248,.35)', 'RECEIVING');
  zone(-116, 44, -78, 63, 'rgba(167,139,250,.05)', 'rgba(167,139,250,.4)', 'QC AREA');
  zone(50, -62, 86, -14, 'rgba(74,222,128,.045)', 'rgba(74,222,128,.35)', 'PACKING');
  zone(50, 18, 86, 60, 'rgba(248,113,113,.06)', 'rgba(248,113,113,.55)', 'RESTRICTED', 'rgba(248,113,113,.65)');
  zone(90, -52, 116, 52, 'rgba(251,191,36,.04)', 'rgba(251,191,36,.35)', 'SHIPPING');
  // main travel lanes
  g.strokeStyle = 'rgba(250,204,21,.5)'; g.lineWidth = 5;
  const lane = (x1, z1, x2, z2) => { g.beginPath(); g.moveTo(X(x1), Z(z1)); g.lineTo(X(x2), Z(z2)); g.stroke(); };
  for (const z of [-11, 11]) lane(-116, z, 116, z);
  for (const z of [-46, -20, 20, 46]) lane(-75, z, 46, z);
  // hazard stripes at dock walls
  const hz = (x1, z1, x2, z2) => {
    const w = X(x2) - X(x1);
    g.save(); g.beginPath(); g.rect(X(x1), Z(z1), w, Z(z2) - Z(z1)); g.clip();
    for (let i = -30; i < 60; i++) {
      g.fillStyle = i % 2 ? '#caa53d' : '#23262b'; g.beginPath();
      g.moveTo(X(x1) + i * 26, Z(z1)); g.lineTo(X(x1) + i * 26 + 26, Z(z1));
      g.lineTo(X(x1) + i * 26 + 6, Z(z2)); g.lineTo(X(x1) + i * 26 - 20, Z(z2)); g.fill();
    }
    g.restore();
  };
  hz(-120, -40, -116, 40); hz(116, -40, 120, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: .85, metalness: .2 });
const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x343a44, roughness: .85, metalness: .2 });
function wall(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wallMat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}

export function buildEnvironment() {
  /* floor + outer apron */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D),
    new THREE.MeshStandardMaterial({ map: buildFloorTexture(), roughness: .92, metalness: .05 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(700, 400),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2; apron.position.y = -.05; apron.receiveShadow = true; scene.add(apron);

  /* perimeter walls — north & south solid, east & west with dock openings */
  wall(FLOOR_W, WALL_H, 1.2, 0, WALL_H / 2, -65);
  wall(FLOOR_W, WALL_H, 1.2, 0, WALL_H / 2, 65);
  const dockWall = x => {
    const segs = [[-65, -34], [-26, -14], [-6, 6], [14, 26], [34, 65]];
    for (const [a, b] of segs) wall(1.2, WALL_H, b - a, x, WALL_H / 2, (a + b) / 2);
    for (const z of DOCKS) wall(1.2, WALL_H - 6.5, 8, x, 6.5 + (WALL_H - 6.5) / 2, z);
  };
  dockWall(-120); dockWall(120);

  /* columns, roof trusses, hanging luminaires (instanced) */
  {
    const cGeo = new THREE.BoxGeometry(1, WALL_H, 1);
    const cMat = new THREE.MeshStandardMaterial({ color: 0x3d4350, roughness: .7, metalness: .4 });
    const cols = []; for (let x = -96; x <= 96; x += 48) for (const z of [-64, 64]) cols.push([x, z]);
    const colMesh = new THREE.InstancedMesh(cGeo, cMat, cols.length);
    cols.forEach(([x, z], i) => colMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(x, WALL_H / 2, z)));
    colMesh.castShadow = true; scene.add(colMesh);
    const tGeo = new THREE.BoxGeometry(.8, 1.6, FLOOR_D);
    const tMesh = new THREE.InstancedMesh(tGeo, cMat, 11);
    for (let i = 0; i < 11; i++) tMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(-110 + i * 22, WALL_H - 1, 0));
    scene.add(tMesh);
    const lGeo = new THREE.BoxGeometry(6, .4, 1.6);
    const lMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, emissive: 0xbfd9ff, emissiveIntensity: 2.2 });
    const lights = []; for (let x = -100; x <= 100; x += 25) for (let z = -48; z <= 48; z += 24) lights.push([x, z]);
    const lMesh = new THREE.InstancedMesh(lGeo, lMat, lights.length);
    lights.forEach(([x, z], i) => lMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(x, WALL_H - 2.2, z)));
    scene.add(lMesh);
  }

  /* dock doors + number plates */
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a5564, roughness: .6, metalness: .5 });
  for (const side of [-1, 1]) for (const z of DOCKS) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(.6, 6.5, 7.6), doorMat.clone());
    door.position.set(side * 119.4, 3.25, z); scene.add(door);
    dockDoors.push({ mesh: door, z, side, open: 0, target: 0 });
    const num = makeTextSprite((side < 0 ? 'R' : 'D') + (DOCKS.indexOf(z) + 1),
      { size: 90, color: '#fbbf24', bg: 'rgba(10,14,20,.85)' });
    num.position.set(side * 118.4, 8.6, z); num.scale.multiplyScalar(.65); scene.add(num);
  }

  /* yard light poles with warm pools */
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x39404a, roughness: .6, metalness: .5 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe9b0, emissiveIntensity: 3.2 });
    const poolGeo = new THREE.CircleGeometry(9, 24);
    const poolMat = new THREE.MeshBasicMaterial({ color: 0xffedc2, transparent: true, opacity: .05,
      blending: THREE.AdditiveBlending, depthWrite: false });
    for (const side of [-1, 1]) for (const z of [-42, 0, 42]) {
      const x = side * 152;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 14, 8), poleMat);
      pole.position.set(x, 7, z); pole.castShadow = true; scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(2.6, .5, 1), headMat);
      head.position.set(x, 14, z); scene.add(head);
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(x, .02, z); scene.add(pool);
    }
  }

  /* high-bay racking — instanced uprights, beams, crates */
  {
    const oMat = new THREE.MeshStandardMaterial({ color: 0xd97b2a, roughness: .55, metalness: .35 });
    const posts = []; for (const z of RACK_ROWS) for (let b = 0; b <= RACK_LEN / BAY; b++) for (const dz of [-1, 1])
      posts.push([RACK_X0 + b * BAY, z + dz]);
    const pGeo = new THREE.BoxGeometry(.28, 11.5, .28);
    const pMesh = new THREE.InstancedMesh(pGeo, oMat, posts.length);
    posts.forEach(([x, z], i) => pMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(x, 5.75, z)));
    pMesh.castShadow = true; scene.add(pMesh);
    const bGeo = new THREE.BoxGeometry(RACK_LEN, .3, .18);
    const beams = []; for (const z of RACK_ROWS) for (const y of [3, 6, 9]) for (const dz of [-1.02, 1.02]) beams.push([z, y, dz]);
    const bMesh = new THREE.InstancedMesh(bGeo, oMat, beams.length);
    beams.forEach(([z, y, dz], i) => bMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(RACK_X0 + RACK_LEN / 2, y, z + dz)));
    scene.add(bMesh);
    const crateCols = [0x8a6a42, 0x96764e, 0x7b6038, 0x3e6e8e, 0x4a7a64, 0x6e6e7a];
    const cGeo = new THREE.BoxGeometry(3.3, 2.1, 1.75);
    const slots = [];
    for (const z of RACK_ROWS) for (let b = 0; b < RACK_LEN / BAY; b++) for (const y of RACK_LEVELS)
      if (Math.random() < .72) slots.push([RACK_X0 + b * BAY + BAY / 2, y, z]);
    const cMesh = new THREE.InstancedMesh(cGeo, new THREE.MeshStandardMaterial({ roughness: .8 }), slots.length);
    const col = new THREE.Color();
    slots.forEach(([x, y, z], i) => {
      cMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(x, y, z));
      col.setHex(crateCols[Math.random() * crateCols.length | 0]).multiplyScalar(rand(.8, 1.15));
      cMesh.setColorAt(i, col);
    });
    cMesh.castShadow = cMesh.receiveShadow = true; scene.add(cMesh);
  }

  /* restricted high-value cage */
  {
    const fMat = new THREE.MeshStandardMaterial({ color: 0xf87171, transparent: true, opacity: .10, side: THREE.DoubleSide, depthWrite: false });
    const frame = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: .5, metalness: .4 });
    const x1 = 52, x2 = 84, z1 = 20, z2 = 58, h = 5;
    for (const [x, z, w, d] of [[x1, (z1 + z2) / 2, .3, z2 - z1], [x2, (z1 + z2) / 2, .3, z2 - z1]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fMat); m.position.set(x, h / 2, z); scene.add(m);
    }
    for (const z of [z1, z2]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, h, .3), fMat); m.position.set((x1 + x2) / 2, h / 2, z); scene.add(m);
    }
    for (const [x, z] of [[x1, z1], [x1, z2], [x2, z1], [x2, z2]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(.4, h + .6, .4), frame);
      p.position.set(x, (h + .6) / 2, z); p.castShadow = true; scene.add(p);
    }
    const hv = new THREE.MeshStandardMaterial({ color: 0x556070, roughness: .4, metalness: .6 });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 2), hv);
      m.position.set(rand(58, 80), 1.2, rand(26, 52)); m.rotation.y = rand(0, Math.PI); m.castShadow = true; scene.add(m);
    }
    const sign = makeTextSprite('⛔ RESTRICTED', { size: 64, color: '#f87171', bg: 'rgba(20,5,5,.85)' });
    sign.position.set(68, 7, 39); scene.add(sign);
  }

  /* control room */
  {
    wall(30, 6, 19, -100, 3, -53.5, wallMat2);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(30, 4, .4),
      new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: .22, roughness: .05, metalness: .6, emissive: 0x224a66, emissiveIntensity: .4 }));
    glass.position.set(-100, 8, -44); scene.add(glass);
    wall(30, .6, 19, -100, 10.2, -53.5, wallMat2);
    wall(30, 4, .6, -100, 8, -63.5, wallMat2);
    for (const x of [-114.7, -85.3]) wall(.6, 4, 19, x, 8, -53.5, wallMat2);
    const scr = new THREE.MeshStandardMaterial({ color: 0x081420, emissive: 0x22d3ee, emissiveIntensity: 1.6 });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.6, .2), scr);
      s.position.set(-111 + i * 7.4, 8, -58); scene.add(s);
    }
    const lab = makeTextSprite('CONTROL ROOM', { size: 54, color: '#22d3ee', bg: 'rgba(8,13,22,.85)' });
    lab.position.set(-100, 12.4, -50); scene.add(lab);
  }

  /* QC benches + packing conveyor & stations */
  {
    const tMat = new THREE.MeshStandardMaterial({ color: 0x46505e, roughness: .6, metalness: .3 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x22282f, roughness: .5 });
    for (let i = 0; i < 3; i++) {
      const t = wall(8, .5, 2.6, -108 + i * 12, 2.2, 52, tMat); t.castShadow = true;
      for (const leg of [[-3.6, -1], [3.6, -1], [-3.6, 1], [3.6, 1]])
        wall(.3, 2, .3, -108 + i * 12 + leg[0], 1, 52 + leg[1], tMat);
    }
    wall(30, 1, 3, 67, 1.4, -38, beltMat);
    for (let i = 0; i < 6; i++) wall(.4, 1.4, 3.4, 54 + i * 5.5, 0.7, -38, tMat);
    for (let i = 0; i < 3; i++) wall(5, .5, 5, 56 + i * 10, 2, -24, tMat);
  }
}
