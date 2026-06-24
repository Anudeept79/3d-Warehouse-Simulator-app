/**
 * Rendering stage: renderer, scene, main camera, orbit controls, lighting,
 * and the bloom post-processing chain. No simulation logic lives here.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { V3 } from '../utils.js';

export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080e);
scene.fog = new THREE.FogExp2(0x05080e, 0.0016);

export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .5, 1200);
camera.position.set(-180, 120, 160);
export const camTarget = V3(0, 0, 0);

export const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false;
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI * 0.49;
orbit.maxDistance = 420;

/* ---------------- post-processing (bloom) ---------------- */
export const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .45, .55, .82));
composer.addPass(new OutputPass());

/* ---------------- lighting ---------------- */
scene.add(new THREE.HemisphereLight(0x3a4c6e, 0x0c1016, 1.35));
const sun = new THREE.DirectionalLight(0xbfd6ff, 1.7);
sun.position.set(90, 160, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.camera.far = 420; sun.shadow.bias = -0.0005;
scene.add(sun);
const fillSpot = new THREE.SpotLight(0x86b6ff, 900, 300, Math.PI / 3.4, .6, 1.4);
fillSpot.position.set(-60, 90, -30);
fillSpot.target.position.set(0, 0, 0);
scene.add(fillSpot, fillSpot.target);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
