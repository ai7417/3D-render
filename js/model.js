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

function v3(x, y, z) { return new THREE.Vector3(x, y, z); }

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

function sampleEdge(a, b, count, includeStart = true, includeEnd = true) {
  const pts = [];
  const steps = count + (includeStart ? 1 : 0) + (includeEnd ? 1 : 0) - 1;
  const start = includeStart ? 0 : 1;
  const end = includeEnd ? steps : steps - 1;
  for (let i = start; i <= end; i++) {
    const t = steps <= 0 ? 0 : i / steps;
    pts.push({
      x: a.x + t * (b.x - a.x),
      z: a.z + t * (b.z - a.z),
    });
  }
  return pts;
}

function uniquePoints(points) {
  const seen = new Map();
  points.forEach((p) => {
    const key = `${p.x.toFixed(3)}:${p.z.toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, p);
  });
  return [...seen.values()];
}

function postLocations() {
  const backOpenEnd = { x: ROOM_X1, z: A.z };
  const pts = [
    ...sampleEdge(A, backOpenEnd, STRUCTURE.backPosts, true, false),
    ...sampleEdge(EXISTING_FRONT_LEFT, D, STRUCTURE.frontPosts, true, true),
    ...sampleEdge(A, E, STRUCTURE.leftPosts, true, true),
    ...sampleEdge(D, E, STRUCTURE.diagonalPosts, false, true),
  ];
  return uniquePoints(pts);
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
  add(top(A), top(B), 90, 240, "glulam", "beam-back");
  add(top(B), top(C), 90, 240, "glulam", "beam-right");
  add(top(C), top(D), 90, 240, "glulam", "beam-room-front");
  add(top(D), top(E), 90, 240, "glulam", "beam-diagonal");
  add(top(E), top(A), 90, 240, "glulam", "beam-left");
  add(top(EXISTING_FRONT_LEFT), top(D), 90, 240, "glulam", "beam-existing-front");

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

  const roofTop = polygonSurface(OUTLINE, 0, "roofMetal");
  roofTop.userData.tag = "roof-metal";
  g.add(roofTop);

  const soffit = polygonSurface(OUTLINE, -0.22, "fascia", true);
  g.add(soffit);

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

  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.55, 4.4),
    new THREE.MeshStandardMaterial({ color: 0x3e4146, roughness: 0.55, metalness: 0.7 })
  );
  body.position.y = 0.85;
  car.add(body);
  for (const [dx, dz] of [[-0.8, -1.5], [0.8, -1.5], [-0.8, 1.5], [0.8, 1.5]]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x101214 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(dx, 0.33, dz);
    car.add(wheel);
  }
  car.position.set(2.8, 0, 4.3);
  g.add(car);

  return g;
}
