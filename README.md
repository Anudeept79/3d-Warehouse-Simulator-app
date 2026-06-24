# WarePro Digital Twin

Cinematic 3D warehouse digital twin: live asset tracking, AI camera surveillance,
security event simulation, operations analytics, and a 10-scene guided demo —
built on **Three.js + Vite**, plain ES modules, no framework lock-in.

## Quick start

```bash
npm install
npm run dev        # dev server with HMR → http://localhost:5173
npm run build      # production bundle → dist/ (static files, host anywhere)
npm run preview    # serve the production build locally
```

## Architecture

```
index.html            HUD markup (panels, feeds, controls)
styles.css            dark enterprise theme
src/
  main.js             entry point: boot order + render loop
  config.js           ★ facility layout, routes, cameras, viewpoints, demo content
  state.js            ★ shared runtime state: trackables registry, layers, stats, incident
  utils.js            math helpers, text sprites
  core/
    stage.js          renderer, scene, camera, lights, bloom composer
    cameraModes.js    director / free-orbit / fly-to / follow camera state machine
  world/              3D content + behavior sims
    environment.js    floor, walls, docks, racking, cage, control room (static)
    trucks.js  forklifts.js  workers.js  pallets.js   entity fleets
    security.js       intruder/guard scripted event + incident lifecycle
    cctv.js           camera network, frustums, feed cameras
    heatmap.js  trail.js                  visualization layers
  hud/                2D overlays (DOM + canvas)
    dashboard.js  alerts.js  twinmap.js  detections.js  inspector.js
  director/
    scenes.js         ★ the 10-scene demo script (titles, durations, camera paths)
    director.js       timeline engine, scene dots, lower thirds
  ui/
    controls.js       playback bar, VIEWS/LAYERS menus, keyboard map
  data/
    datasource.js     ★ INTEGRATION SEAM — see below
```

★ = the files you'll touch most.

## Connecting real data

Everything visual reads from `state.js` (`trackables`, `stats`, `incident`) and the
entity arrays — nothing cares where the data originates. `data/datasource.js` defines
the seam:

- **`SimulatedDataSource`** (default): local behavior simulation, used for demos.
- **`LiveDataSource`** (skeleton provided): subscribe to a WebSocket / MQTT / SSE feed
  and map messages onto the same state:
  - RTLS / UWB positions → entity `position` per asset id (lerp between updates)
  - WMS events (ASN / putaway / pick / ship) → pallet spawns + `stats`
  - Camera-AI detections → `trackables` + `addAlert()`
  - Dock management → truck states + door targets

Swap one line in `main.js`:

```js
const dataSource = new LiveDataSource('wss://api.yoursite/twin'); // was SimulatedDataSource
```

## Customizing the facility

`config.js` is the single source of truth: floor size, zones, dock positions, rack
grid, forklift routes, truck schedule, CCTV placement, saved viewpoints, demo insights.
Reshaping the warehouse for a customer demo does not require touching engine code.

## Controls

| Input | Action |
|---|---|
| Space | play / pause the demo |
| ← → or 1–0 | jump scenes |
| Click asset | inspect (live telemetry) → Follow |
| F | free orbit camera |
| Tab | immersive mode (hide UI) |
| H | activity heatmap |
| VIEWS / LAYERS | saved viewpoints / visualization toggles |
| Click minimap | fly camera to location |

## Production notes

- `npm run build` emits a fully static `dist/` — deploy to any CDN, S3, nginx, or
  embed in an existing app (the HUD is plain DOM; the canvas is self-contained).
- Adaptive quality: sustained low FPS automatically drops pixel ratio + bloom.
- Embedding in React/Vue/Angular: mount `dist` in an iframe for zero-conflict embed,
  or import `src/` modules directly and call the same boot sequence from a component
  (the modules have no global side effects besides DOM ids they own).

## Suggested roadmap

1. **Live data adapter** — implement `LiveDataSource` against your WMS/RTLS gateway.
2. **Asset fidelity** — swap primitive meshes for GLTF models (racking, forklifts,
   trucks); `three/addons/loaders/GLTFLoader.js` drops in per entity factory.
3. **Multi-facility** — load `config.js` per site from an API; everything else scales.
4. **Auth + tenancy** — wrap in your product shell; the twin is a self-contained view.
