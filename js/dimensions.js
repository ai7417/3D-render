// =============================================================================
// dimensions.js — Dimension lines + text labels as a toggleable 3D overlay.
// Uses canvas-textured sprites for text so it stays crisp at any zoom.
// =============================================================================

import * as THREE from "three";
import { BUILDING, ROOF_PLAN } from "./params.js";
import { roofY } from "./model.js";

const LINE_MAT = new THREE.LineBasicMaterial({ color: 0xffcb6e });
const TICK_MAT = new THREE.LineBasicMaterial({ color: 0xffcb6e });

function textSprite(text) {
  const canvas = document.createElement("canvas");
  const pad = 10;
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "600 32px ui-monospace, Menlo, monospace";
  const w = ctx.measureText(text).width + pad * 2;
  canvas.width = Math.ceil(w);
  ctx.font = "600 32px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(15,17,21,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffcb6e";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.fillStyle = "#ffcb6e";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(0.75 * aspect, 0.75, 1);
  return sprite;
}

function dimLine(a, b, label, offsetDir, offsetAmt = 0.4) {
  const group = new THREE.Group();
  const o = offsetDir.clone().multiplyScalar(offsetAmt);
  const a2 = a.clone().add(o);
  const b2 = b.clone().add(o);

  // Main line
  const geo = new THREE.BufferGeometry().setFromPoints([a2, b2]);
  group.add(new THREE.Line(geo, LINE_MAT));

  // Extension lines
  const ext1 = new THREE.BufferGeometry().setFromPoints([a, a2]);
  const ext2 = new THREE.BufferGeometry().setFromPoints([b, b2]);
  group.add(new THREE.Line(ext1, LINE_MAT));
  group.add(new THREE.Line(ext2, LINE_MAT));

  // Tick arrows at each end
  const tickLen = 0.12;
  const dir = new THREE.Vector3().subVectors(b2, a2).normalize();
  const perp = new THREE.Vector3().crossVectors(dir, offsetDir).normalize().multiplyScalar(tickLen);
  [a2, b2].forEach((p) => {
    const t = new THREE.BufferGeometry().setFromPoints([p.clone().sub(perp), p.clone().add(perp)]);
    group.add(new THREE.Line(t, TICK_MAT));
  });

  // Label
  const lbl = textSprite(label);
  lbl.position.copy(a2).lerp(b2, 0.5).add(offsetDir.clone().multiplyScalar(0.15));
  group.add(lbl);

  return group;
}

export function buildDimensions() {
  const g = new THREE.Group();
  g.name = "dimensions";
  g.visible = false; // off by default — toggleable from UI

  const B = BUILDING;
  const OUT = 0.8;

  // --- Plan dimensions (at ground level) ---
  // Building width (back wall)
  g.add(dimLine(
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(B.width, 0.02, 0),
    `${B.width.toFixed(2)} m — shed width`,
    new THREE.Vector3(0, 0, -1), OUT
  ));
  // Building depth (left wall)
  g.add(dimLine(
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(0, 0.02, B.depth),
    `${B.depth.toFixed(2)} m — shed depth`,
    new THREE.Vector3(-1, 0, 0), OUT
  ));
  // Triangle back edge V1→V2
  g.add(dimLine(
    new THREE.Vector3(ROOF_PLAN.V1.x, 0.02, ROOF_PLAN.V1.z),
    new THREE.Vector3(ROOF_PLAN.V2.x, 0.02, ROOF_PLAN.V2.z),
    `${(ROOF_PLAN.V2.x - ROOF_PLAN.V1.x).toFixed(2)} m — roof back edge`,
    new THREE.Vector3(0, 0, -1), OUT + 0.7
  ));
  // Triangle left edge V1→V3
  g.add(dimLine(
    new THREE.Vector3(ROOF_PLAN.V1.x, 0.02, ROOF_PLAN.V1.z),
    new THREE.Vector3(ROOF_PLAN.V3.x, 0.02, ROOF_PLAN.V3.z),
    `${(ROOF_PLAN.V3.z - ROOF_PLAN.V1.z).toFixed(2)} m — roof left edge`,
    new THREE.Vector3(-1, 0, 0), OUT + 0.7
  ));
  // Triangle hypotenuse V2→V3
  const hypLen = Math.hypot(ROOF_PLAN.V3.x - ROOF_PLAN.V2.x, ROOF_PLAN.V3.z - ROOF_PLAN.V2.z);
  const hypDir = new THREE.Vector3(-(ROOF_PLAN.V3.z - ROOF_PLAN.V2.z), 0, (ROOF_PLAN.V3.x - ROOF_PLAN.V2.x)).normalize();
  g.add(dimLine(
    new THREE.Vector3(ROOF_PLAN.V2.x, 0.02, ROOF_PLAN.V2.z),
    new THREE.Vector3(ROOF_PLAN.V3.x, 0.02, ROOF_PLAN.V3.z),
    `${hypLen.toFixed(2)} m — hypotenuse`,
    hypDir.negate(), OUT
  ));

  // --- Height dimensions ---
  // Back eave
  g.add(dimLine(
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(-0.5, roofY(0), 0),
    `${roofY(0).toFixed(2)} m — back eave`,
    new THREE.Vector3(-1, 0, 0), 0.5
  ));
  // Front eave
  g.add(dimLine(
    new THREE.Vector3(B.width + 0.5, 0, B.depth),
    new THREE.Vector3(B.width + 0.5, roofY(B.depth), B.depth),
    `${roofY(B.depth).toFixed(2)} m — front eave`,
    new THREE.Vector3(1, 0, 0), 0.5
  ));
  // V3 post height (highest roof point)
  g.add(dimLine(
    new THREE.Vector3(ROOF_PLAN.V3.x - 0.3, 0, ROOF_PLAN.V3.z),
    new THREE.Vector3(ROOF_PLAN.V3.x - 0.3, roofY(ROOF_PLAN.V3.z), ROOF_PLAN.V3.z),
    `${roofY(ROOF_PLAN.V3.z).toFixed(2)} m — max ridge`,
    new THREE.Vector3(-1, 0, 0), 0.5
  ));

  // --- North arrow ---
  const north = new THREE.Group();
  const arrowGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.02, -1),
    new THREE.Vector3(0, 0.02, 1),
    new THREE.Vector3(-0.3, 0.02, 0.4),
    new THREE.Vector3(0, 0.02, 1),
    new THREE.Vector3(0.3, 0.02, 0.4),
  ]);
  const arrowLine = new THREE.Line(arrowGeo, LINE_MAT);
  north.add(arrowLine);
  const nLabel = textSprite("N");
  nLabel.position.set(0, 0.02, -1.4);
  north.add(nLabel);
  north.position.set(ROOF_PLAN.V2.x + 1.5, 0, ROOF_PLAN.V2.z - 1.5);
  g.add(north);

  return g;
}
