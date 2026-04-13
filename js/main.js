// =============================================================================
// main.js — Three.js scene bootstrap, camera presets, lighting, render loop.
// =============================================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildModel } from "./model.js";
import { buildDimensions } from "./dimensions.js";
import { populateSpecs, wireLayerToggles } from "./ui.js";
import { PROJECT, BUILDING, roofBounds, derived } from "./params.js";

const canvas = document.getElementById("canvas3d");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb4d0);
scene.fog = new THREE.Fog(0x9bb4d0, 40, 120);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
const bounds = roofBounds();
const centerX = (bounds.minX + bounds.maxX) / 2;
const centerZ = (bounds.minZ + bounds.maxZ) / 2;
camera.position.set(centerX + 16, 10, centerZ - 14);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.target.set(centerX, 1.25, centerZ);

const hemi = new THREE.HemisphereLight(0xc0d8ff, 0x5c6a52, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe8c8, 1.25);
sun.position.set(18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.bias = -0.0001;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x9bb4d0, 0.25);
fill.position.set(-10, 8, -15);
scene.add(fill);

const grid = new THREE.GridHelper(40, 40, 0x555c6a, 0x2a303c);
grid.name = "gridHelper";
grid.position.set(centerX, -0.099, centerZ);
scene.add(grid);

const model = buildModel();
scene.add(model);

const dims = buildDimensions();
scene.add(dims);

populateSpecs();
wireLayerToggles(scene, model, dims);
wireViewButtons();
document.querySelector('#panel-left [data-view="iso"]').click();
document.getElementById("meta-date").textContent = new Date().toISOString().slice(0, 10);

const hudDims = document.getElementById("hud-dims");
const d = derived();
hudDims.textContent = `${PROJECT.id} · ${BUILDING.totalLength.toFixed(3)} m measured shed · 2-car open bay ${d.openArea.toFixed(1)} m² · roof ${d.roofedArea.toFixed(1)} m² · EE zone ${PROJECT.snowZone}`;

function wireViewButtons() {
  const views = {
    iso: [centerX + 16, 10, centerZ - 14, centerX, 1.25, centerZ],
    front: [centerX, 4.5, bounds.maxZ + 18, centerX, 1.8, centerZ],
    back: [centerX, 4.5, bounds.minZ - 18, centerX, 1.8, centerZ],
    left: [bounds.minX - 18, 4.5, centerZ, centerX, 1.8, centerZ],
    right: [bounds.maxX + 18, 4.5, centerZ, centerX, 1.8, centerZ],
    top: [centerX + 0.01, 38, centerZ, centerX, 0, centerZ],
  };

  document.querySelectorAll("#panel-left [data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = views[btn.dataset.view];
      if (!v) return;
      const [px, py, pz, tx, ty, tz] = v;
      camera.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
      document.querySelectorAll("#panel-left [data-view]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function resize() {
  const { clientWidth, clientHeight } = canvas.parentElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
