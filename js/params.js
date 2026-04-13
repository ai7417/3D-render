// =============================================================================
// params.js — Single source of truth for the corrected measured shed upgrade.
// Units: metres (m) and millimetres (mm) as labelled. Loads: kN, kN/m².
// =============================================================================

export const PROJECT = {
  id: "SHED-UPG-01",
  title: "Shed Upgrade — Measured Mono-Pitch Carport + Store",
  owner: "Private client",
  location: "Estonia",
  designCode: "EN 1990 / EN 1991 / EN 1995 (Eurocode) + Ehitusseadustik",
  snowZone: "II",
  terrainCat: "II",
  rev: "B",
};

// ---------- Existing measured building --------------------------------------
// Local coords: X = left → right along the shed, Z = back → front, Y = up.
// The white-background drawing is treated as the existing measured building.
export const BUILDING = {
  totalLength: 9.286,  // m, measured existing roof support line
  depth: 2.420,        // m, measured existing shed depth
  carportWidth: 5.646, // m, open left bay
  roomWidth: 3.640,    // m, enclosed right room
  roomDepth: 2.420,    // m
  partitionThickness: 0.150,
  doorWidth: 0.600,
  doorHeight: 2.100,
  roomUsableArea: 7.1, // m² from the reference drawing
  wallHeightBack: 2.80,
  wallHeightFront: 3.30, // max upgraded front edge
  floorLevel: 0.15,
};

// ---------- Upgraded roof plan ----------------------------------------------
// The red sketch is interpreted as a new front-left extension while the
// measured right-side room stays where it is today.
export const ROOF_PLAN = {
  overhangLeft: 0.300,
  overhangRight: 0.300,
  overhangBack: 0.300,
  frontOverhang: 0.500,
  extensionFrontZ: 6.800, // overall upgraded front-left roof corner depth
  thickness: 0.30,
  fasciaDepth: 0.22,
};

export const STRUCTURE = {
  sill:   { b: 45,  h: 145, spacing: null, grade: "C24 PT" },
  stud:   { b: 45,  h: 145, spacing: 600,  grade: "C24" },
  topPlate:{b: 45,  h: 145, spacing: null, grade: "C24" },
  rafter: { b: 45,  h: 195, spacing: 600,  grade: "C24" },
  beam:   { b: 90,  h: 240, grade: "GL24h" },
  post:   { b: 140, h: 140, grade: "C24 PT" },
  backPosts: 3,
  frontPosts: 4,
  leftPosts: 3,
  diagonalPosts: 4,
};

export const FOUNDATION = {
  frostDepth:     1.20,
  pierDiameter:   0.30,
  pierDepth:      1.40,
  stripWidth:     0.40,
  stripDepth:     0.80,
  gravelBed:      0.15,
  concreteClass:  "C25/30 XC2/XF1",
  rebar:          "2×Ø12 top & bottom, Ø8 stirrups @ 200",
};

export const ENVELOPE = {
  wall: [
    "Exterior larch cladding 22mm, horiz., brushed",
    "Ventilated cavity 25mm on 25×45 battens",
    "Windproof membrane (Sd ≤ 0.2 m)",
    "Sheathing OSB/3 12mm",
    "Studs 45×145 @ 600 c/c",
    "Mineral wool 145mm (λ=0.036)",
    "Vapour control layer (Sd ≥ 30 m)",
    "Service cavity 45mm",
    "Interior OSB/3 12mm (paintable)",
  ],
  wallUvalue: 0.22,
  roof: [
    "Standing-seam metal sheet, PVDF coated, RAL 7024",
    "Battens 25×50 + counter-battens 25×50",
    "Roof underlay membrane (diffusion-open)",
    "Sheathing OSB/3 22mm T&G",
    "Rafters 45×195 @ 600 c/c",
    "Mineral wool 200mm between rafters (λ=0.036)",
    "Vapour control layer",
    "Service cavity / interior lining 12mm OSB",
  ],
  roofUvalue: 0.17,
};

export const OPENINGS = {
  pedestrianDoor: {
    w: BUILDING.doorWidth,
    h: BUILDING.doorHeight,
    frame: 0.10,
    position: "front face of enclosed room",
    rating: "RC2",
  },
};

export const LOADS = {
  sk:        1.50,
  Ce:        1.00,
  Ct:        1.00,
  mu1:       0.80,
  vb:        21.0,
  rho_air:   1.25,
  qp:        0.65,
  cpe_uplift: -1.20,
  gk_roof:   0.55,
  gk_wall:   0.45,
};

export const SAFETY = {
  lightning:   "Ø8 galv. steel rod, 2.5 m earth electrode, 10 Ω max",
  electrical:  "TN-C-S, RCD 30 mA, 16 A radial, IP54 fittings, surge protector",
  fire:        "6 kg CO₂ extinguisher, smoke detector, lockable RC2 room door",
  setback:     "≥ 4.0 m to property line (verify local municipality)",
  corrosion:   "All fasteners A4 stainless or hot-dip galv. (C4 env.)",
  timberClass: "Use class 3 (exterior, sheltered); UC4 for ground contact",
  ventilation: "Ventilated roof cavity and cross-vented storage room",
  drainage:    "Continuous gutter on the front drip edge to soakaway",
};

export const MATERIALS = {
  foundation:  { color: 0x7a7d82, label: "Concrete C25/30" },
  sillPT:      { color: 0x5b4a33, label: "Sill plate (PT)" },
  timberFrame: { color: 0xc9a263, label: "Timber frame C24" },
  glulam:      { color: 0xd9b27a, label: "Glulam GL24h beam" },
  post:        { color: 0x8b6b3d, label: "Post 140×140 PT" },
  cladding:    { color: 0x4f6a4c, label: "Larch cladding (stained)" },
  roofMetal:   { color: 0x2b2f33, label: "Standing-seam metal RAL 7024" },
  fascia:      { color: 0x3a3f47, label: "Steel fascia" },
  glass:       { color: 0x8fb7d4, label: "Glazing" },
  door:        { color: 0x2c2f36, label: "Insulated door" },
  ground:      { color: 0x6b7a58, label: "Grass / soil" },
  paving:      { color: 0x8a8578, label: "Clay paver" },
};

export function roomStartX() {
  return BUILDING.totalLength - BUILDING.roomWidth;
}

export function roofOutline() {
  const xLeft = -ROOF_PLAN.overhangLeft;
  const xRight = BUILDING.totalLength + ROOF_PLAN.overhangRight;
  const zBack = -ROOF_PLAN.overhangBack;
  const zFront = BUILDING.depth + ROOF_PLAN.frontOverhang;
  const xShoulder = roomStartX();

  return [
    { name: "A", x: xLeft,     z: zBack },
    { name: "B", x: xRight,    z: zBack },
    { name: "C", x: xRight,    z: zFront },
    { name: "D", x: xShoulder, z: zFront },
    { name: "E", x: xLeft,     z: ROOF_PLAN.extensionFrontZ },
  ];
}

export function roofBounds() {
  const pts = roofOutline();
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
  };
}

export function roofFrontZAtX(x) {
  const [A, , , D, E] = roofOutline();
  if (x >= D.x) return D.z;
  if (x <= E.x) return E.z;
  const t = (x - E.x) / (D.x - E.x);
  return E.z + t * (D.z - E.z);
}

export function roofPitchRun() {
  const bounds = roofBounds();
  return bounds.maxZ - bounds.minZ;
}

export function roofArea(points = roofOutline()) {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += p.x * q.z - q.x * p.z;
  });
  return Math.abs(sum) / 2;
}

export function roofPerimeter(points = roofOutline()) {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    sum += Math.hypot(q.x - p.x, q.z - p.z);
  });
  return sum;
}

export function derived() {
  const roofPts = roofOutline();
  const roofedArea = roofArea(roofPts);
  const existingRectArea =
    (BUILDING.totalLength + ROOF_PLAN.overhangLeft + ROOF_PLAN.overhangRight)
    * (BUILDING.depth + ROOF_PLAN.overhangBack + ROOF_PLAN.frontOverhang);
  const enclosedArea = BUILDING.roomWidth * BUILDING.roomDepth;
  const openArea = roofedArea - enclosedArea;
  const addedArea = roofedArea - existingRectArea;
  const pitchRad = Math.atan(
    (BUILDING.wallHeightFront - BUILDING.wallHeightBack) / roofPitchRun()
  );
  const diagonal = Math.hypot(
    roofPts[4].x - roofPts[3].x,
    roofPts[4].z - roofPts[3].z
  );

  return {
    roofedArea,
    existingRectArea,
    addedArea,
    enclosedArea,
    openArea,
    roomUsableArea: BUILDING.roomUsableArea,
    pitchRad,
    pitchDeg: pitchRad * 180 / Math.PI,
    diagonal,
    roofPerimeter: roofPerimeter(roofPts),
  };
}
