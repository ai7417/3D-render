// =============================================================================
// model.js — Parametric 3D construction model.
// Consumes params.js and produces a THREE.Group hierarchy:
//   ShedUpgrade
//     ├─ foundation  (strip footings + Ø300 piers)
//     ├─ structure   (sill, studs, top plates, glulam beams, posts, rafters)
//     ├─ cladding    (wall skin, roof skin, doors, windows, fascia, gutter)
//     └─ context     (ground, paving, trees)
// Each child is named so ui.js can toggle its visibility.
// Coordinates: X = along back wall, Y = up, Z = back → front.
// =============================================================================

import * as THREE from "three";
import {
  BUILDING, ROOF_PLAN, STRUCTURE, FOUNDATION, OPENINGS, MATERIALS,
} from "./params.js";

// ---- Material cache --------------------------------------------------------
const _mats = {};
export function mat(key) {
  if (_mats[key]) return _mats[key];
  const c = MATERIALS[key];
  let m;
  if (key === "glass") {
    m = new THREE.MeshPhysicalMaterial({
      color: c.color, roughness: 0.05, metalness: 0,
      transmission: 0.82, transparent: true, opacity: 0.55,
    });
  } else if (key === "roofMetal") {
    m = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide });
  } else if (key === "fascia") {
    m = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide });
  } else if (key === "cladding") {
    m = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide });
  } else {
    m = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.85, metalness: 0.02 });
  }
  m.name = key;
  _mats[key] = m;
  return m;
}

// ---- Geometry helpers ------------------------------------------------------
export function roofY(z) {
  const B = BUILDING;
  return B.wallHeightBack + z * (B.wallHeightFront - B.wallHeightBack) / B.depth;
}
function zOnHypot(x) {
  const { V2, V3 } = ROOF_PLAN;
  return V2.z + (x - V2.x) * (V3.z - V2.z) / (V3.x - V2.x);
}
function v3(x, y, z) { return new THREE.Vector3(x, y, z); }

/** Create a rectangular-section prismatic member from point A to point B. */
function member(a, b, bMM, hMM, matKey, tag) {
  const bM = bMM / 1000, hM = hMM / 1000;
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

// ---- Top-level build --------------------------------------------------------
export function buildModel() {
  const root = new THREE.Group();
  root.name = "ShedUpgrade";
  root.add(buildFoundation());
  root.add(buildStructure());
  root.add(buildCladding());
  root.add(buildContext());
  return root;
}

// ---- Foundation ------------------------------------------------------------
function buildFoundation() {
  const g = new THREE.Group();
  g.name = "foundation";
  const B = BUILDING;
  const s = FOUNDATION.stripWidth;
  const h = FOUNDATION.stripDepth;
  const topY = -0.10;           // top of strip, 100 mm below grade (grade = y=0)
  const centerY = topY - h / 2;

  const mkStrip = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g1 = new THREE.BoxGeometry(s, h, len + s);
    const mesh = new THREE.Mesh(g1, mat("foundation"));
    mesh.position.set((x1 + x2) / 2, centerY, (z1 + z2) / 2);
    const d = new THREE.Vector3(x2 - x1, 0, z2 - z1).normalize();
    mesh.quaternion.setFromUnitVectors(v3(0, 0, 1), d);
    mesh.receiveShadow = true;
    return mesh;
  };
  g.add(mkStrip(0, 0, B.width, 0));
  g.add(mkStrip(0, B.depth, B.width, B.depth));
  g.add(mkStrip(0, 0, 0, B.depth));
  g.add(mkStrip(B.width, 0, B.width, B.depth));

  const mkPier = (x, z) => {
    const g2 = new THREE.CylinderGeometry(FOUNDATION.pierDiameter / 2,
      FOUNDATION.pierDiameter / 2, FOUNDATION.pierDepth, 18);
    const p = new THREE.Mesh(g2, mat("foundation"));
    p.position.set(x, topY - FOUNDATION.pierDepth / 2, z);
    p.receiveShadow = true;
    return p;
  };
  postLocations().forEach(([x, z]) => g.add(mkPier(x, z)));
  return g;
}

/** Coordinates (x, z) of every post supporting the roof in the open area. */
function postLocations() {
  const B = BUILDING, R = ROOF_PLAN;
  const list = [];
  // Corners of the triangle that aren't at the building
  list.push([R.V2.x, R.V2.z]);
  list.push([R.V3.x, R.V3.z]);
  // Back edge (between building right-back corner and V2)
  const backGap = R.V2.x - B.width;
  for (let i = 1; i <= STRUCTURE.postCountBackEdge - 1; i++) {
    list.push([B.width + i * backGap / STRUCTURE.postCountBackEdge, R.V1.z + 0.05]);
  }
  // Left edge (between building front-left corner and V3)
  const leftGap = R.V3.z - B.depth;
  for (let i = 1; i <= STRUCTURE.postCountLeftEdge - 1; i++) {
    list.push([R.V1.x + 0.05, B.depth + i * leftGap / STRUCTURE.postCountLeftEdge]);
  }
  // Hypotenuse: intermediate posts
  for (let i = 1; i <= STRUCTURE.postCountHypot; i++) {
    const t = i / (STRUCTURE.postCountHypot + 1);
    const px = R.V2.x + t * (R.V3.x - R.V2.x);
    const pz = R.V2.z + t * (R.V3.z - R.V2.z);
    list.push([px, pz]);
  }
  // Corner post at building outer corner
  list.push([B.width + 0.15, B.depth + 0.15]);
  return list;
}

// ---- Structural frame ------------------------------------------------------
function buildStructure() {
  const g = new THREE.Group();
  g.name = "structure";
  const B = BUILDING;

  // --- Sill plates (PT) ---
  const ySill = BUILDING.floorLevel;
  const addHoriz = (a, b, bMM, hMM, key, tag) => {
    const m = member(a, b, bMM, hMM, key, tag);
    if (m) g.add(m);
  };
  addHoriz(v3(0, ySill, 0), v3(B.width, ySill, 0), 145, 45, "sillPT", "sill-back");
  addHoriz(v3(0, ySill, B.depth), v3(B.width, ySill, B.depth), 145, 45, "sillPT", "sill-front");
  addHoriz(v3(0, ySill, 0), v3(0, ySill, B.depth), 145, 45, "sillPT", "sill-left");
  addHoriz(v3(B.width, ySill, 0), v3(B.width, ySill, B.depth), 145, 45, "sillPT", "sill-right");

  // --- Studs @ 600 c/c around the 4 walls ---
  const stepStud = STRUCTURE.stud.spacing / 1000;
  const mkStud = (x, z) => {
    const a = v3(x, ySill + 0.0225, z);
    const b = v3(x, roofY(z) - 0.045, z);
    const m = member(a, b, 45, 145, "timberFrame", "stud");
    if (m) g.add(m);
  };
  const iterEdge = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.floor(len / stepStud) + 1;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(1, i * stepStud / len);
      mkStud(x1 + t * (x2 - x1), z1 + t * (z2 - z1));
    }
  };
  iterEdge(0, 0, B.width, 0);
  iterEdge(0, B.depth, B.width, B.depth);
  iterEdge(0, 0, 0, B.depth);
  iterEdge(B.width, 0, B.width, B.depth);

  // --- Top plates (follow wall tops, sloped on sides) ---
  addHoriz(v3(0, roofY(0), 0), v3(B.width, roofY(0), 0), 145, 45, "timberFrame", "top-back");
  addHoriz(v3(0, roofY(B.depth), B.depth), v3(B.width, roofY(B.depth), B.depth), 145, 45, "timberFrame", "top-front");
  addHoriz(v3(0, roofY(0), 0), v3(0, roofY(B.depth), B.depth), 145, 45, "timberFrame", "top-left");
  addHoriz(v3(B.width, roofY(0), 0), v3(B.width, roofY(B.depth), B.depth), 145, 45, "timberFrame", "top-right");

  // --- Glulam triangular perimeter beams (GL24h 90×240) ---
  const Vtop = (v) => v3(v.x, roofY(v.z), v.z);
  const V1 = Vtop(ROOF_PLAN.V1), V2 = Vtop(ROOF_PLAN.V2), V3 = Vtop(ROOF_PLAN.V3);
  g.add(member(V1, V2, 90, 240, "glulam", "beam-back"));
  g.add(member(V1, V3, 90, 240, "glulam", "beam-left"));
  g.add(member(V2, V3, 90, 240, "glulam", "beam-hypot"));

  // --- Posts (140×140 PT) in the open carport area ---
  postLocations().forEach(([x, z]) => {
    const a = v3(x, 0, z);
    const b = v3(x, roofY(z) - 0.12, z);
    g.add(member(a, b, 140, 140, "post", "post"));
  });

  // --- Rafters 45×195 @ 600 c/c, parallel to Z, span back beam → hypotenuse ---
  const stepRaf = STRUCTURE.rafter.spacing / 1000;
  const yOffset = -0.12;  // rafter top aligns under roof skin
  for (let x = ROOF_PLAN.V1.x; x <= ROOF_PLAN.V2.x + 1e-6; x += stepRaf) {
    const zStart = ROOF_PLAN.V1.z;
    const zEnd = zOnHypot(x);
    if (zEnd - zStart < 0.6) continue;
    const a = v3(x, roofY(zStart) + yOffset, zStart);
    const b = v3(x, roofY(zEnd) + yOffset, zEnd);
    const r = member(a, b, 45, 195, "timberFrame", "rafter");
    if (r) g.add(r);
  }

  // --- Diagonal wall bracing (2 per long wall, for racking resistance) ---
  const brace = (x1, z1, x2, z2, wallHeight) => {
    const a = v3(x1, ySill + 0.05, z1);
    const b = v3(x2, wallHeight - 0.05, z2);
    const m = member(a, b, 45, 95, "timberFrame", "brace");
    if (m) g.add(m);
  };
  brace(0, 0, B.width * 0.5, 0, roofY(0));
  brace(B.width * 0.5, 0, B.width, 0, roofY(0));

  return g;
}

// ---- Cladding / envelope ---------------------------------------------------
function buildCladding() {
  const g = new THREE.Group();
  g.name = "cladding";
  const B = BUILDING;
  const outOff = 0.045;                 // cladding outer-face offset from stud centreline

  // --- Back wall (rectangle) ---
  const hBack = roofY(0);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(B.width + 0.09, hBack, 0.022),
    mat("cladding")
  );
  back.position.set(B.width / 2, hBack / 2, -outOff - 0.011);
  back.castShadow = back.receiveShadow = true;
  g.add(back);

  // --- Front wall (rectangle), sized to front eave height ---
  const hFront = roofY(B.depth);
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(B.width + 0.09, hFront, 0.022),
    mat("cladding")
  );
  front.position.set(B.width / 2, hFront / 2, B.depth + outOff + 0.011);
  front.castShadow = front.receiveShadow = true;
  g.add(front);

  // --- Side walls (trapezoidal, via Shape → Extrude) ---
  const sideShape = new THREE.Shape();
  sideShape.moveTo(0, 0);
  sideShape.lineTo(B.depth, 0);
  sideShape.lineTo(B.depth, roofY(B.depth));
  sideShape.lineTo(0, roofY(0));
  sideShape.closePath();
  const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: 0.022, bevelEnabled: false });
  const mkSide = (xPos) => {
    const s = new THREE.Mesh(sideGeo, mat("cladding"));
    s.rotation.y = -Math.PI / 2;
    s.position.set(xPos, 0, 0);
    s.castShadow = s.receiveShadow = true;
    return s;
  };
  g.add(mkSide(-outOff - 0.011));
  g.add(mkSide(B.width + outOff + 0.011));

  // --- Pedestrian door (RC2 insulated) ---
  const pd = OPENINGS.pedestrianDoor;
  const pDoor = new THREE.Mesh(
    new THREE.BoxGeometry(pd.w, pd.h, 0.05),
    mat("door")
  );
  pDoor.position.set(1.2, pd.h / 2, B.depth + outOff + 0.04);
  g.add(pDoor);
  // Door handle dot
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    mat("fascia")
  );
  handle.position.set(1.2 + pd.w/2 - 0.08, 1.05, B.depth + outOff + 0.07);
  g.add(handle);

  // --- Garage (sectional) door ---
  const gd = OPENINGS.garageDoor;
  const gDoor = new THREE.Mesh(
    new THREE.BoxGeometry(gd.w, gd.h, 0.04),
    mat("door")
  );
  gDoor.position.set(B.width - gd.w / 2 - 0.4, gd.h / 2, B.depth + outOff + 0.03);
  g.add(gDoor);
  // Sectional door horizontal lines
  for (let i = 1; i < 5; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(gd.w, 0.008, 0.005),
      mat("fascia")
    );
    line.position.set(B.width - gd.w / 2 - 0.4, i * gd.h / 5, B.depth + outOff + 0.052);
    g.add(line);
  }

  // --- Windows (2 on right wall facing SE for daylight) ---
  const win = OPENINGS.window;
  for (let i = 0; i < win.count; i++) {
    const wm = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, win.h, win.w),
      mat("glass")
    );
    wm.position.set(B.width + outOff + 0.04, 1.3, 1.4 + i * 2.0);
    g.add(wm);
    // window frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, win.h + 0.1, win.w + 0.1),
      mat("fascia")
    );
    frame.position.set(B.width + outOff + 0.03, 1.3, 1.4 + i * 2.0);
    g.add(frame);
  }

  // --- Triangular roof skin (top metal + underside soffit) ---
  const yTop = { v1: roofY(ROOF_PLAN.V1.z), v2: roofY(ROOF_PLAN.V2.z), v3: roofY(ROOF_PLAN.V3.z) };
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    ROOF_PLAN.V1.x, yTop.v1, ROOF_PLAN.V1.z,
    ROOF_PLAN.V2.x, yTop.v2, ROOF_PLAN.V2.z,
    ROOF_PLAN.V3.x, yTop.v3, ROOF_PLAN.V3.z,
  ]), 3));
  topGeo.setIndex([0, 2, 1]);
  topGeo.computeVertexNormals();
  const topSkin = new THREE.Mesh(topGeo, mat("roofMetal"));
  topSkin.castShadow = topSkin.receiveShadow = true;
  topSkin.userData.tag = "roof-metal";
  g.add(topSkin);

  // Soffit (underside of rafters) — slightly below the top skin
  const soffitThickness = 0.22;
  const botGeo = new THREE.BufferGeometry();
  botGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    ROOF_PLAN.V1.x, yTop.v1 - soffitThickness, ROOF_PLAN.V1.z,
    ROOF_PLAN.V2.x, yTop.v2 - soffitThickness, ROOF_PLAN.V2.z,
    ROOF_PLAN.V3.x, yTop.v3 - soffitThickness, ROOF_PLAN.V3.z,
  ]), 3));
  botGeo.setIndex([0, 1, 2]);
  botGeo.computeVertexNormals();
  const soffit = new THREE.Mesh(botGeo, mat("fascia"));
  g.add(soffit);

  // --- Fascia boards on all 3 triangle edges ---
  const fascia = (ax, az, bx, bz) => {
    const ay = roofY(az), by = roofY(bz);
    const a = v3(ax, ay - soffitThickness / 2, az);
    const b = v3(bx, by - soffitThickness / 2, bz);
    const m = member(a, b, 22, soffitThickness, "fascia", "fascia");
    if (m) g.add(m);
  };
  fascia(ROOF_PLAN.V1.x, ROOF_PLAN.V1.z, ROOF_PLAN.V2.x, ROOF_PLAN.V2.z);
  fascia(ROOF_PLAN.V1.x, ROOF_PLAN.V1.z, ROOF_PLAN.V3.x, ROOF_PLAN.V3.z);
  fascia(ROOF_PLAN.V2.x, ROOF_PLAN.V2.z, ROOF_PLAN.V3.x, ROOF_PLAN.V3.z);

  // --- Gutter along the hypotenuse (front drip edge) ---
  const gutter = (() => {
    const a = v3(ROOF_PLAN.V2.x, roofY(ROOF_PLAN.V2.z) - soffitThickness - 0.05, ROOF_PLAN.V2.z);
    const b = v3(ROOF_PLAN.V3.x, roofY(ROOF_PLAN.V3.z) - soffitThickness - 0.05, ROOF_PLAN.V3.z);
    return member(a, b, 100, 100, "fascia", "gutter");
  })();
  if (gutter) g.add(gutter);
  // Downpipes at V2 and V3
  [ROOF_PLAN.V2, ROOF_PLAN.V3].forEach((V) => {
    const dp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, roofY(V.z) - soffitThickness - 0.1, 12),
      mat("fascia")
    );
    dp.position.set(V.x, (roofY(V.z) - soffitThickness - 0.1) / 2, V.z);
    g.add(dp);
  });

  return g;
}

// ---- Site context -----------------------------------------------------------
function buildContext() {
  const g = new THREE.Group();
  g.name = "context";
  // Grass
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    mat("ground")
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(6, -0.11, 6);
  grass.receiveShadow = true;
  g.add(grass);
  // Paved car-parking slab under carport
  const pave = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 13),
    mat("paving")
  );
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(8, -0.10, 6);
  pave.receiveShadow = true;
  g.add(pave);
  // Birch trees (matching photos)
  const bark = new THREE.MeshStandardMaterial({ color: 0xe7e0d2, roughness: 0.95 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x4a6a3c, roughness: 0.9 });
  const tree = (x, z, h = 8) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h, 10), bark);
    t.position.set(x, h / 2, z);
    t.castShadow = true;
    g.add(t);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), foliage);
    c.position.set(x, h + 0.9, z);
    c.castShadow = true;
    g.add(c);
  };
  tree(-3, -2, 9); tree(-4, 6, 8); tree(16, 2, 9);
  tree(14, 13, 8); tree(2, 13, 7);
  // Simplified neighbour house (context only)
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
  // Stylised car under carport (Toyota C-HR proxy)
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
  car.position.set(10, 0, 6);
  g.add(car);

  return g;
}
