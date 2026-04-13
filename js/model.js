// =============================================================================
// model.js — Parametric 3D construction model for the corrected shed upgrade.
// =============================================================================

import * as THREE from "three";
import {
  BUILDING, ROOF_PLAN, STRUCTURE, FOUNDATION, OPENINGS, MATERIALS,
  roomStartX, roofOutline, roofFrontZAtX, roofBounds,
} from "./params.js";

const _mats = {};
export function mat(key) {
  if (_mats[key]) return _mats[key];
  const c = MATERIALS[key];
  let m;
  if (key === "glass") {
    m = new THREE.MeshPhysicalMaterial({
      color: c.color,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.82,
      transparent: true,
      opacity: 0.55,
    });
  } else if (key === "roofMetal") {
    m = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 0.35,
      metalness: 0.55,
      side: THREE.DoubleSide,
    });
  } else if (key === "fascia") {
    m = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 0.45,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
  } else if (key === "cladding") {
    m = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  } else {
    m = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 0.85,
      metalness: 0.02,
    });
  }
  m.name = key;
  _mats[key] = m;
  return m;
}

const ROOM_X1 = roomStartX();
const ROOM_X2 = BUILDING.totalLength;
const ROOM_Z1 = 0;
const ROOM_Z2 = BUILDING.roomDepth;
const OUTLINE = roofOutline();
const [A, B, C, D, E] = OUTLINE;
const EXISTING_FRONT_LEFT = { x: A.x, z: C.z };
const BOUNDS = roofBounds();
const ROOM_BACK_LEFT = { x: ROOM_X1, z: A.z };

function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
function lerpPlan(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function roofY(z) {
  const t = (z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ);
  return BUILDING.wallHeightBack + t * (BUILDING.wallHeightFront - BUILDING.wallHeightBack);
}

function member(a, b, bMM, hMM, matKey, tag) {
  const bM = bMM / 1000;
  const hM = hMM / 1000;
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-3) return null;
  const geo = new THREE.BoxGeometry(bM, hM, len);
  const mesh = new THREE.Mesh(geo, mat(matKey));
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(v3(0, 0, 1), dir.clone().normalize());
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData = { bMM, hMM, len: len.toFixed(3), tag: tag || matKey };
  return mesh;
}

function polygonSurface(points, yOffset, matKey, reverse = false) {
  const shapePts = points.map((p) => new THREE.Vector2(p.x, p.z));
  const triangles = THREE.ShapeUtils.triangulateShape(shapePts, []);
  const positions = [];
  points.forEach((p) => positions.push(p.x, roofY(p.z) + yOffset, p.z));
  const indices = [];
  triangles.forEach((tri) => {
    if (reverse) indices.push(tri[0], tri[2], tri[1]);
    else indices.push(tri[0], tri[1], tri[2]);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat(matKey));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function postLocations() {
  // Perimeter-only support layout:
  // the enclosed room corners carry the right side, while only four open-bay
  // posts remain to keep a clean two-car parking zone.
  return [
    A,
    EXISTING_FRONT_LEFT,
    E,
    lerpPlan(D, E, 0.52),
  ];
}

function screenPanel(a, b, height, matKey = "cladding", tag = "screen") {
  return member(
    v3(a.x, height / 2, a.z),
    v3(b.x, height / 2, b.z),
    30,
    height * 1000,
    matKey,
    tag
  );
}

function addRectStrip(group, x1, z1, x2, z2, centerY) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const geo = new THREE.BoxGeometry(FOUNDATION.stripWidth, FOUNDATION.stripDepth, len + FOUNDATION.stripWidth);
  const mesh = new THREE.Mesh(geo, mat("foundation"));
  mesh.position.set((x1 + x2) / 2, centerY, (z1 + z2) / 2);
  const dir = new THREE.Vector3(x2 - x1, 0, z2 - z1).normalize();
  mesh.quaternion.setFromUnitVectors(v3(0, 0, 1), dir);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildRoomSideWall(xPos, outward = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(BUILDING.roomDepth, 0);
  shape.lineTo(BUILDING.roomDepth, roofY(BUILDING.roomDepth));
  shape.lineTo(0, roofY(0));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false });
  const mesh = new THREE.Mesh(geo, mat("cladding"));
  mesh.rotation.y = outward > 0 ? -Math.PI / 2 : Math.PI / 2;
  mesh.position.set(xPos, 0, outward > 0 ? 0 : BUILDING.roomDepth);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function buildModel() {
  const root = new THREE.Group();
  root.name = "ShedUpgrade";
  root.add(buildFoundation());
  root.add(buildStructure());
  root.add(buildRoofCover());
  root.add(buildCladding());
  root.add(buildContext());
  return root;
}

function buildFoundation() {
  const g = new THREE.Group();
  g.name = "foundation";
  const topY = -0.10;
  const centerY = topY - FOUNDATION.stripDepth / 2;

  addRectStrip(g, ROOM_X1, ROOM_Z1, ROOM_X2, ROOM_Z1, centerY);
  addRectStrip(g, ROOM_X1, ROOM_Z2, ROOM_X2, ROOM_Z2, centerY);
  addRectStrip(g, ROOM_X1, ROOM_Z1, ROOM_X1, ROOM_Z2, centerY);
  addRectStrip(g, ROOM_X2, ROOM_Z1, ROOM_X2, ROOM_Z2, centerY);

  const roomSlab = new THREE.Mesh(
    new THREE.BoxGeometry(BUILDING.roomWidth, 0.18, BUILDING.roomDepth),
    mat("foundation")
  );
  roomSlab.position.set((ROOM_X1 + ROOM_X2) / 2, 0.01, BUILDING.roomDepth / 2);
  roomSlab.receiveShadow = true;
  g.add(roomSlab);

  postLocations().forEach(({ x, z }) => {
    const geo = new THREE.CylinderGeometry(
      FOUNDATION.pierDiameter / 2,
      FOUNDATION.pierDiameter / 2,
      FOUNDATION.pierDepth,
      18
    );
    const pier = new THREE.Mesh(geo, mat("foundation"));
    pier.position.set(x, topY - FOUNDATION.pierDepth / 2, z);
    pier.receiveShadow = true;
    g.add(pier);
  });

  return g;
}

function buildStructure() {
  const g = new THREE.Group();
  g.name = "structure";

  const ySill = BUILDING.floorLevel;
  const add = (a, b, bMM, hMM, key, tag) => {
    const m = member(a, b, bMM, hMM, key, tag);
    if (m) g.add(m);
  };

  // Enclosed room frame
  add(v3(ROOM_X1, ySill, ROOM_Z1), v3(ROOM_X2, ySill, ROOM_Z1), 145, 45, "sillPT", "room-sill-back");
  add(v3(ROOM_X1, ySill, ROOM_Z2), v3(ROOM_X2, ySill, ROOM_Z2), 145, 45, "sillPT", "room-sill-front");
  add(v3(ROOM_X1, ySill, ROOM_Z1), v3(ROOM_X1, ySill, ROOM_Z2), 145, 45, "sillPT", "room-sill-left");
  add(v3(ROOM_X2, ySill, ROOM_Z1), v3(ROOM_X2, ySill, ROOM_Z2), 145, 45, "sillPT", "room-sill-right");

  const stepStud = STRUCTURE.stud.spacing / 1000;
  const addStud = (x, z) => {
    const m = member(
      v3(x, ySill + 0.0225, z),
      v3(x, roofY(z) - 0.045, z),
      45,
      145,
      "timberFrame",
      "stud"
    );
    if (m) g.add(m);
  };
  const roomEdges = [
    [ROOM_X1, ROOM_Z1, ROOM_X2, ROOM_Z1],
    [ROOM_X1, ROOM_Z2, ROOM_X2, ROOM_Z2],
    [ROOM_X1, ROOM_Z1, ROOM_X1, ROOM_Z2],
    [ROOM_X2, ROOM_Z1, ROOM_X2, ROOM_Z2],
  ];
  roomEdges.forEach(([x1, z1, x2, z2]) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.floor(len / stepStud) + 1;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(1, len < 1e-6 ? 0 : (i * stepStud) / len);
      addStud(x1 + t * (x2 - x1), z1 + t * (z2 - z1));
    }
  });

  add(v3(ROOM_X1, roofY(ROOM_Z1), ROOM_Z1), v3(ROOM_X2, roofY(ROOM_Z1), ROOM_Z1), 145, 45, "timberFrame", "room-top-back");
  add(v3(ROOM_X1, roofY(ROOM_Z2), ROOM_Z2), v3(ROOM_X2, roofY(ROOM_Z2), ROOM_Z2), 145, 45, "timberFrame", "room-top-front");
  add(v3(ROOM_X1, roofY(ROOM_Z1), ROOM_Z1), v3(ROOM_X1, roofY(ROOM_Z2), ROOM_Z2), 145, 45, "timberFrame", "room-top-left");
  add(v3(ROOM_X2, roofY(ROOM_Z1), ROOM_Z1), v3(ROOM_X2, roofY(ROOM_Z2), ROOM_Z2), 145, 45, "timberFrame", "room-top-right");

  // Perimeter beams following the upgraded roof
  const top = (p) => v3(p.x, roofY(p.z), p.z);
  add(top(A), top(B), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-back");
  add(top(B), top(C), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-right");
  add(top(C), top(D), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-room-front");
  add(top(D), top(E), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-diagonal");
  add(top(E), top(A), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-left");
  add(top(EXISTING_FRONT_LEFT), top(D), STRUCTURE.beam.b, STRUCTURE.beam.h, "glulam", "beam-existing-front");

  postLocations().forEach(({ x, z }) => {
    add(v3(x, 0, z), v3(x, roofY(z) - 0.12, z), 140, 140, "post", "post");
  });

  // Existing roof rectangle rafters
  const stepRaf = STRUCTURE.rafter.spacing / 1000;
  const yOffset = -0.12;
  for (let x = A.x; x <= B.x + 1e-6; x += stepRaf) {
    const a = v3(x, roofY(A.z) + yOffset, A.z);
    const b = v3(x, roofY(C.z) + yOffset, C.z);
    const r = member(a, b, 45, 195, "timberFrame", "rafter-existing");
    if (r) g.add(r);
  }
  // Upgrade extension jack rafters
  for (let x = A.x; x <= D.x + 1e-6; x += stepRaf) {
    const zEnd = roofFrontZAtX(x);
    if (zEnd - C.z < 0.6) continue;
    const a = v3(x, roofY(C.z) + yOffset, C.z);
    const b = v3(x, roofY(zEnd) + yOffset, zEnd);
    const r = member(a, b, 45, 195, "timberFrame", "rafter-upgrade");
    if (r) g.add(r);
  }

  // Room wall bracing
  add(v3(ROOM_X1, ySill + 0.05, ROOM_Z1), v3(ROOM_X1 + 1.8, roofY(ROOM_Z1) - 0.05, ROOM_Z1), 45, 95, "timberFrame", "brace");
  add(v3(ROOM_X2 - 1.8, ySill + 0.05, ROOM_Z2), v3(ROOM_X2, roofY(ROOM_Z2) - 0.05, ROOM_Z2), 45, 95, "timberFrame", "brace");

  return g;
}

function buildCladding() {
  const g = new THREE.Group();
  g.name = "cladding";
  const outOff = 0.045;
  const partialSideScreenEnd = lerpPlan(D, E, STRUCTURE.sideScreenFraction);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(BUILDING.roomWidth + 0.09, roofY(ROOM_Z1), 0.022),
    mat("cladding")
  );
  backWall.position.set((ROOM_X1 + ROOM_X2) / 2, roofY(ROOM_Z1) / 2, ROOM_Z1 - outOff - 0.011);
  backWall.castShadow = backWall.receiveShadow = true;
  g.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(BUILDING.roomWidth + 0.09, roofY(ROOM_Z2), 0.022),
    mat("cladding")
  );
  frontWall.position.set((ROOM_X1 + ROOM_X2) / 2, roofY(ROOM_Z2) / 2, ROOM_Z2 + outOff + 0.011);
  frontWall.castShadow = frontWall.receiveShadow = true;
  g.add(frontWall);

  g.add(buildRoomSideWall(ROOM_X1 - outOff - 0.011, 1));
  g.add(buildRoomSideWall(ROOM_X2 + outOff + 0.011, -1));

  const pd = OPENINGS.pedestrianDoor;
  const doorCenterX = ROOM_X1 + BUILDING.partitionThickness + pd.w / 2;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(pd.w, pd.h, 0.05),
    mat("door")
  );
  door.position.set(doorCenterX, pd.h / 2, ROOM_Z2 + outOff + 0.04);
  door.castShadow = true;
  g.add(door);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 10, 8),
    mat("fascia")
  );
  handle.position.set(doorCenterX + pd.w / 2 - 0.08, 1.02, ROOM_Z2 + outOff + 0.07);
  g.add(handle);

  const backScreen = screenPanel(A, ROOM_BACK_LEFT, STRUCTURE.screenHeightBack, "cladding", "screen-back");
  if (backScreen) g.add(backScreen);

  const sideScreen = screenPanel(D, partialSideScreenEnd, STRUCTURE.screenHeightSide, "cladding", "screen-side");
  if (sideScreen) g.add(sideScreen);

  const fasciaPairs = [
    [A, B], [B, C], [C, D], [D, E], [E, A],
  ];
  fasciaPairs.forEach(([p, q]) => {
    const m = member(
      v3(p.x, roofY(p.z) - 0.11, p.z),
      v3(q.x, roofY(q.z) - 0.11, q.z),
      22,
      220,
      "fascia",
      "fascia"
    );
    if (m) g.add(m);
  });

  const gutterSegments = [
    [C, D],
    [D, E],
  ];
  gutterSegments.forEach(([p, q]) => {
    const gutter = member(
      v3(p.x, roofY(p.z) - 0.27, p.z),
      v3(q.x, roofY(q.z) - 0.27, q.z),
      100,
      100,
      "fascia",
      "gutter"
    );
    if (gutter) g.add(gutter);
  });

  [C, E].forEach((p) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, roofY(p.z) - 0.30, 12),
      mat("fascia")
    );
    pipe.position.set(p.x, (roofY(p.z) - 0.30) / 2, p.z);
    g.add(pipe);
  });

  return g;
}

function buildRoofCover() {
  const g = new THREE.Group();
  g.name = "roofCover";

  const roofTop = polygonSurface(OUTLINE, 0.012, "roofMetal");
  roofTop.userData.tag = "roof-metal";
  g.add(roofTop);

  const soffit = polygonSurface(OUTLINE, -0.18, "fascia", true);
  soffit.userData.tag = "roof-soffit";
  g.add(soffit);

  for (let x = A.x + STRUCTURE.seamSpacing / 2; x <= B.x - 0.05; x += STRUCTURE.seamSpacing) {
    const zEnd = roofFrontZAtX(x);
    if (zEnd - A.z < 0.8) continue;
    const seam = member(
      v3(x, roofY(A.z) + 0.022, A.z + 0.03),
      v3(x, roofY(zEnd) + 0.022, zEnd - 0.06),
      18,
      14,
      "roofMetal",
      "standing-seam"
    );
    if (seam) g.add(seam);
  }

  return g;
}

function buildContext() {
  const g = new THREE.Group();
  g.name = "context";

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat("ground"));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(5, -0.11, 6);
  grass.receiveShadow = true;
  g.add(grass);

  const pave = new THREE.Mesh(new THREE.PlaneGeometry(18, 13), mat("paving"));
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(6, -0.10, 5.5);
  pave.receiveShadow = true;
  g.add(pave);

  const bark = new THREE.MeshStandardMaterial({ color: 0xe7e0d2, roughness: 0.95 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x4a6a3c, roughness: 0.9 });
  const tree = (x, z, h = 8) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h, 10), bark);
    trunk.position.set(x, h / 2, z);
    trunk.castShadow = true;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), foliage);
    crown.position.set(x, h + 0.9, z);
    crown.castShadow = true;
    g.add(crown);
  };
  tree(-3, -2, 9);
  tree(-4, 6, 8);
  tree(16, 2, 9);
  tree(14, 13, 8);
  tree(2, 13, 7);

  const house = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xc8c2b0, roughness: 0.9 })
  );
  house.position.set(-9, 2.25, 3);
  g.add(house);

  const houseRoof = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 0.2, 8.6),
    new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.7 })
  );
  houseRoof.position.set(-9, 4.6, 3);
  g.add(houseRoof);

  const buildCar = (color) => {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.84, 1.50, 4.55),
      new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.72 })
    );
    body.position.y = 0.84;
    car.add(body);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.68, 2.10),
      mat("glass")
    );
    glass.position.set(0, 1.32, -0.15);
    car.add(glass);

    for (const [dx, dz] of [[-0.82, -1.56], [0.82, -1.56], [-0.82, 1.56], [0.82, 1.56]]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16),
        new THREE.MeshStandardMaterial({ color: 0x101214 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(dx, 0.33, dz);
      car.add(wheel);
    }

    return car;
  };

  const carA = buildCar(0xe3e7ec);
  carA.position.set(1.55, 0, 2.05);
  carA.rotation.y = -0.46;
  g.add(carA);

  const carB = buildCar(0x7a8794);
  carB.position.set(2.85, 0, 5.00);
  carB.rotation.y = -0.36;
  g.add(carB);

  return g;
}
