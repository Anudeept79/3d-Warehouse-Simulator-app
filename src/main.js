/**
 * WarePro Digital Twin — application entry point.
 * Boot order: stage (renderer/lights) → static environment → entities (via data source)
 * → CCTV → HUD → director → controls → render loop.
 */
import { renderer, scene, camera, composer } from './core/stage.js';
import { updateCameraModes } from './core/cameraModes.js';
import { layers, sim } from './state.js';
import { buildEnvironment } from './world/environment.js';
import { buildCCTV, FEEDS } from './world/cctv.js';
import { updateHeatmap } from './world/heatmap.js';
import { updateTrail } from './world/trail.js';
import { SimulatedDataSource } from './data/datasource.js';
import { addAlert, pushInsight, tickInsights } from './hud/alerts.js';
import { updateClock, updateKPIs, initOccupancy, updateOccupancy } from './hud/dashboard.js';
import { initTwinMap, drawTwin } from './hud/twinmap.js';
import { drawDetections, feedEls } from './hud/detections.js';
import { initInspector, updateSelection } from './hud/inspector.js';
import { initDirector, gotoScene, updateDirector } from './director/director.js';
import { initControls } from './ui/controls.js';

/* ---------------- build world ---------------- */
buildEnvironment();
buildCCTV();

const dataSource = new SimulatedDataSource(); // swap for LiveDataSource(url) in production
dataSource.start();

/* ---------------- HUD + UI ---------------- */
initOccupancy();
initTwinMap();
initInspector();
initDirector();
initControls();

/* ---------------- adaptive quality ---------------- */
let perfMode = false, lowFpsStreak = 0;
function checkPerf(fps) {
  if (perfMode) return;
  lowFpsStreak = fps < 26 ? lowFpsStreak + 1 : 0;
  if (lowFpsStreak >= 8) { // ~4s sustained low fps
    perfMode = true;
    renderer.setPixelRatio(1); composer.setPixelRatio(1);
    if (layers.fx) document.getElementById('layerFx').click();
    addAlert('info', 'Performance mode enabled — effects reduced for smooth playback');
  }
}

/* ---------------- main loop ---------------- */
let last = performance.now(), fpsFrames = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const time = now / 1000;
  const sdt = dt * sim.speed; // simulation time (user-scalable)

  dataSource.update(sdt, time);
  updateHeatmap(dt);
  updateTrail(dt);
  updateDirector(dt);
  updateCameraModes(dt);
  updateSelection(dt, time);

  updateClock(sdt);
  updateKPIs(dt);
  updateOccupancy(dt);
  drawTwin(dt, time);
  drawDetections(dt);
  tickInsights(dt);

  // fps meter + adaptive quality
  fpsFrames++; fpsT += dt;
  if (fpsT >= .5) {
    const fps = Math.round(fpsFrames / fpsT);
    document.getElementById('fpsVal').textContent = fps + ' FPS';
    checkPerf(fps); fpsFrames = 0; fpsT = 0;
  }

  // ---- main render ----
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  if (layers.fx) composer.render(); else renderer.render(scene, camera);
  renderer.autoClear = true;

  // ---- CCTV feed renders (scissored into feed frames) ----
  FEEDS.forEach((feed, fi) => {
    const r = feedEls[fi].getBoundingClientRect();
    const x = r.left, y = innerHeight - r.bottom;
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, r.width, r.height);
    renderer.setScissor(x, y, r.width, r.height);
    feed.cam.aspect = r.width / r.height; feed.cam.updateProjectionMatrix();
    renderer.render(scene, feed.cam);
  });
  renderer.setScissorTest(false);
}

/* ---------------- boot ---------------- */
gotoScene(0, true);
addAlert('info', 'WarePro digital twin online — 1,742 assets synced');
addAlert('info', 'Shift A clock-in complete — 12 associates on floor');
pushInsight(); pushInsight();
requestAnimationFrame(frame);
setTimeout(() => document.getElementById('splash').classList.add('gone'), 700);
