// =============================================================================
// dimensions.js — Dimension lines + text labels as a toggleable 3D overlay.
// =============================================================================

import * as THREE from "three";
import { BUILDING, roofOutline, roofBounds, roomStartX, derived } from "./params.js";
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

  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a2, b2]),
    LINE_MAT
  ));
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a, a2]),
    LINE_MAT
  ));
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([b, b2]),
    LINE_MAT
  ));

  const tickLen = 0.12;
  const dir = new THREE.Vector3().subVectors(b2, a2).normalize();
  const perp = new THREE.Vector3().crossVectors(dir, offsetDir).normalize().multiplyScalar(tickLen);
  [a2, b2].forEach((p) => {
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([p.clone().sub(perp), p.clone().add(perp)]),
      TICK_MAT
    ));
  });

  const lbl = textSprite(label);
  lbl.position.copy(a2).lerp(b2, 0.5).add(offsetDir.clone().multiplyScalar(0.15));
  group.add(lbl);

  return group;
}

export function buildDimensions() {
  const g = new THREE.Group();
  g.name = "dimensions";
  g.visible = false;

  const d = derived();
  const [A, B, C, D, E] = roofOutline();
  const bounds = roofBounds();
  const roomX1 = roomStartX();
  const out = 0.85;

  g.add(dimLine(
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(BUILDING.totalLength, 0.02, 0),
    `${BUILDING.totalLength.toFixed(3)} m — measured existing length`,
    new THREE.Vector3(0, 0, -1),
    out
  ));

  g.add(dimLine(
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(roomX1, 0.02, 0),
    `${BUILDING.carportWidth.toFixed(3)} m — open bay`,
    new THREE.Vector3(0, 0, -1),
    out + 0.65
  ));

  g.add(dimLine(
    new THREE.Vector3(roomX1, 0.02, 0),
    new THREE.Vector3(BUILDING.totalLength, 0.02, 0),
    `${BUILDING.roomWidth.toFixed(3)} m — enclosed room`,
    new THREE.Vector3(0, 0, -1),
    out + 1.30
  ));

  g.add(dimLine(
    new THREE.Vector3(roomX1, 0.02, 0),
    new THREE.Vector3(roomX1, 0.02, BUILDING.roomDepth),
    `${BUILDING.roomDepth.toFixed(3)} m — room depth`,
    new THREE.Vector3(1, 0, 0),
    0.9
  ));

  g.add(dimLine(
    new THREE.Vector3(A.x, 0.02, A.z),
    new THREE.Vector3(B.x, 0.02, B.z),
    `${(B.x - A.x).toFixed(3)} m — roof back edge`,
    new THREE.Vector3(0, 0, -1),
    out + 2.05
  ));

  g.add(dimLine(
    new THREE.Vector3(A.x, 0.02, A.z),
    new THREE.Vector3(E.x, 0.02, E.z),
    `${(E.z - A.z).toFixed(3)} m — upgraded left depth`,
    new THREE.Vector3(-1, 0, 0),
    out + 0.6
  ));

  g.add(dimLine(
    new THREE.Vector3(C.x, 0.02, C.z),
    new THREE.Vector3(D.x, 0.02, D.z),
    `${(C.x - D.x).toFixed(3)} m — room front edge`,
    new THREE.Vector3(0, 0, 1),
    out * 0.9
  ));

  const diagDir = new THREE.Vector3(-(E.z - D.z), 0, E.x - D.x).normalize();
  g.add(dimLine(
    new THREE.Vector3(D.x, 0.02, D.z),
    new THREE.Vector3(E.x, 0.02, E.z),
    `${d.diagonal.toFixed(3)} m — upgrade edge`,
    diagDir,
    0.8
  ));

  g.add(dimLine(
    new THREE.Vector3(roomX1 + BUILDING.partitionThickness, 0.02, BUILDING.roomDepth),
    new THREE.Vector3(roomX1 + BUILDING.partitionThickness + BUILDING.doorWidth, 0.02, BUILDING.roomDepth),
    `${BUILDING.doorWidth.toFixed(3)} m — room door`,
    new THREE.Vector3(0, 0, 1),
    1.55
  ));

  g.add(dimLine(
    new THREE.Vector3(bounds.minX - 0.4, 0, A.z),
    new THREE.Vector3(bounds.minX - 0.4, roofY(A.z), A.z),
    `${roofY(A.z).toFixed(2)} m — back eave`,
    new THREE.Vector3(-1, 0, 0),
    0.45
  ));

  g.add(dimLine(
    new THREE.Vector3(C.x + 0.4, 0, C.z),
    new THREE.Vector3(C.x + 0.4, roofY(C.z), C.z),
    `${roofY(C.z).toFixed(2)} m — room front eave`,
    new THREE.Vector3(1, 0, 0),
    0.45
  ));

  g.add(dimLine(
    new THREE.Vector3(E.x - 0.4, 0, E.z),
    new THREE.Vector3(E.x - 0.4, roofY(E.z), E.z),
    `${roofY(E.z).toFixed(2)} m — max front edge`,
    new THREE.Vector3(-1, 0, 0),
    0.45
  ));

  const north = new THREE.Group();
  north.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, -1),
      new THREE.Vector3(0, 0.02, 1),
      new THREE.Vector3(-0.3, 0.02, 0.4),
      new THREE.Vector3(0, 0.02, 1),
      new THREE.Vector3(0.3, 0.02, 0.4),
    ]),
    LINE_MAT
  ));
  const nLabel = textSprite("N");
  nLabel.position.set(0, 0.02, -1.4);
  north.add(nLabel);
  north.position.set(B.x + 1.5, 0, B.z - 1.5);
  g.add(north);

  return g;
}
