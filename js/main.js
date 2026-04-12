// =============================================================================
// main.js — Three.js scene bootstrap, camera presets, lighting, render loop.
// =============================================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildModel } from "./model.js";
import { buildDimensions } from "./dimensions.js";
import { populateSpecs, wireLayerToggles } from "./ui.js";
import { BUILDING, ROOF_PLAN, PROJECT } from "./params.js";

// ---- Renderer --------------------------------------------------------------
const canvas = document.getElementById("canvas3d");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---- Scene -----------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb4d0);
scene.fog = new THREE.Fog(0x9bb4d0, 40, 120);

// ---- Camera ----------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
camera.position.set(22, 14, 20);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.target.set(BUILDING.width / 2 + 2, 1.2, BUILDING.depth / 2 + 1);

// ---- Lighting --------------------------------------------------------------
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

// ---- Grid helper -----------------------------------------------------------
const grid = new THREE.GridHelper(40, 40, 0x555c6a, 0x2a303c);
grid.name = "gridHelper";
grid.position.set(6, -0.099, 6);
scene.add(grid);

// ---- Model + dimensions ---------------------------------------------------
const model = buildModel();
scene.add(model);

const dims = buildDimensions();
scene.add(dims);

// ---- UI hook-up -----------------------------------------------------------
populateSpecs();
wireLayerToggles(scene, model, dims);
wireViewButtons();
document.querySelector('#panel-left [data-view="iso"]').classList.add("active");
document.getElementById("meta-date").textContent = new Date().toISOString().slice(0, 10);

// HUD dimensions summary
const hudDims = document.getElementById("hud-dims");
const triArea = Math.abs((ROOF_PLAN.V1.x*(ROOF_PLAN.V2.z-ROOF_PLAN.V3.z)
  + ROOF_PLAN.V2.x*(ROOF_PLAN.V3.z-ROOF_PLAN.V1.z)
  + ROOF_PLAN.V3.x*(ROOF_PLAN.V1.z-ROOF_PLAN.V2.z)) / 2);
hudDims.textContent = `${PROJECT.id} · ${BUILDING.width}×${BUILDING.depth} m shed + triangular roof ${triArea.toFixed(1)} m² · EE zone ${PROJECT.snowZone}`;

// ---- Camera presets -------------------------------------------------------
function wireViewButtons() {
  const B = BUILDING;
  const cx = B.width / 2 + 2;
  const cz = B.depth / 2 + 1;
  const views = {
    iso:   [22, 14, 20,  cx, 1.2, cz],
    front: [cx, 4, 26,   cx, 2.0, cz],
    back:  [cx, 4, -20,  cx, 2.0, cz],
    left:  [-20, 4, cz,  cx, 2.0, cz],
    right: [28, 4, cz,   cx, 2.0, cz],
    top:   [cx + 0.01, 38, cz,  cx, 0, cz],
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

// ---- Resize + render loop -------------------------------------------------
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
