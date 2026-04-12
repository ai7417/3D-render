// =============================================================================
// params.js — Single source of truth for every dimension, material, and load.
// Change a number here and both the 3D model and the spec sheet update.
// Units: metres (m) and millimetres (mm) as labelled. Loads: kN, kN/m^2.
// =============================================================================

export const PROJECT = {
  id: "SHED-UPG-01",
  title: "Shed Upgrade — Triangular-Roof Storage + Carport",
  owner: "Private client",
  location: "Estonia",
  designCode: "EN 1990 / EN 1991 / EN 1995 (Eurocode) + Ehitusseadustik",
  snowZone: "II",            // Tallinn / most of mainland EE
  terrainCat: "II",
  rev: "A",
};

// ---------- Building footprint (rectangular enclosed part) ------------------
// Local coords: X = width (along back wall), Z = depth (back→front), Y = up.
export const BUILDING = {
  width:  7.0,   // m, along back wall  (X)
  depth:  5.0,   // m, back to front    (Z)
  wallHeightBack:  2.80, // m, lower eave
  wallHeightFront: 3.30, // m, higher eave (mono-pitch for drainage)
  floorLevel: 0.15,      // m, finished floor above grade (damp-proof)
};

// ---------- Triangular roof plan (3 vertices in X,Z meters) -----------------
// V1 = back-left, V2 = back-right (extended), V3 = front-left (extended).
// The hypotenuse V2→V3 sweeps over the open carport area in front/right.
// The rectangular building sits in the back-left corner of this triangle.
export const ROOF_PLAN = {
  V1: { x: -0.30, z: -0.30 },                        // back-left overhang corner
  V2: { x: 14.30, z: -0.30 },                        // back-right extended (=~2x building width)
  V3: { x: -0.30, z: 10.30 },                        // front-left extended (=~2x building depth)
  thickness: 0.30,   // m, roof build-up (rafters + sheathing + battens + metal sheet)
  fasciaDepth: 0.22, // m
};

// ---------- Structural members ----------------------------------------------
// All timber C24 unless noted. Glulam = GL24h. Pressure-treated below DPM.
export const STRUCTURE = {
  // Sill plate + studs
  sill:   { b: 45,  h: 145, spacing: null, grade: "C24 PT" },
  stud:   { b: 45,  h: 145, spacing: 600,  grade: "C24" },
  topPlate:{b: 45,  h: 145, spacing: null, grade: "C24" },

  // Rafters span between perimeter beams
  rafter: { b: 45,  h: 195, spacing: 600,  grade: "C24" },

  // Perimeter triangular beams: 3 edges of the triangle
  beam:   { b: 90,  h: 240, grade: "GL24h" },

  // Posts supporting beam at V2 and V3 (+ intermediate posts)
  post:   { b: 140, h: 140, grade: "C24 PT" },
  postCountBackEdge:  3,   // back edge has 3 intermediate posts
  postCountLeftEdge:  2,   // left edge has 2 intermediate posts
  postCountHypot:     3,   // hypotenuse has 3 intermediate posts

  // Diagonal bracing in enclosed shed walls (wind load resistance)
  braceCount: 4,
};

// ---------- Foundation -------------------------------------------------------
// Estonia: frost depth ~1.2 m. Concrete piers for posts + strip footing under walls.
export const FOUNDATION = {
  frostDepth:     1.20,   // m
  pierDiameter:   0.30,   // m
  pierDepth:      1.40,   // m
  stripWidth:     0.40,   // m
  stripDepth:     0.80,   // m (below finished grade, top of strip at −0.10)
  gravelBed:      0.15,   // m
  concreteClass:  "C25/30 XC2/XF1",
  rebar:          "2×Ø12 top & bottom, Ø8 stirrups @ 200",
};

// ---------- Envelope (walls + roof build-up, enclosed part) -----------------
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
  wallUvalue: 0.22, // W/m²K — well below EE NZEB threshold for ancillary
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
  roofPitchDeg: null, // computed later
};

// ---------- Openings --------------------------------------------------------
export const OPENINGS = {
  pedestrianDoor: { w: 0.90, h: 2.10, frame: 0.10, position: "front-left wall", rating: "RC2" },
  garageDoor:     { w: 2.50, h: 2.10, type: "sectional insulated", position: "front-right of enclosed shed" },
  window:         { w: 0.80, h: 1.00, count: 2, glazing: "3-pane Ug=0.7" },
};

// ---------- Loads (Eurocode) ------------------------------------------------
export const LOADS = {
  // Snow EN 1991-1-3, Estonia zone II
  sk:        1.50,  // kN/m² ground snow
  Ce:        1.00,  // exposure factor (normal)
  Ct:        1.00,  // thermal factor
  mu1:       0.80,  // shape coefficient mono-pitch 0°–30°
  // Wind EN 1991-1-4, terrain cat II, coastal/inland mainland
  vb:        21.0,  // m/s basic wind velocity
  rho_air:   1.25,  // kg/m³
  qp:        0.65,  // kN/m² peak velocity pressure at ~3 m
  cpe_uplift: -1.20,// edge zone suction
  // Dead load
  gk_roof:   0.55,  // kN/m² roof build-up self weight
  gk_wall:   0.45,  // kN/m²
};

// ---------- Safety / services ----------------------------------------------
export const SAFETY = {
  lightning:   "Ø8 galv. steel rod, 2.5 m earth electrode, 10 Ω max",
  electrical:  "TN-C-S, RCD 30 mA, 16 A radial, IP54 fittings, surge protector",
  fire:        "2 escape routes from enclosed part, 6 kg CO₂ extinguisher, smoke + CO detectors",
  setback:     "≥ 4.0 m to property line (Estonia default; verify DP)",
  corrosion:   "All fasteners A4 stainless or hot-dip galv. (C4 env.)",
  timberClass: "Use class 3 (exterior, sheltered); UC4 for ground contact",
  ventilation: "Roof cavity ventilated 1/300 of ceiling area, eaves+ridge",
  drainage:    "Ø100 PVC gutter + 2× Ø80 downpipes to soakaway",
};

// ---------- Materials / colour swatches -------------------------------------
export const MATERIALS = {
  foundation:  { color: 0x7a7d82, label: "Concrete C25/30" },
  sillPT:      { color: 0x5b4a33, label: "Sill plate (PT)" },
  timberFrame: { color: 0xc9a263, label: "Timber frame C24" },
  glulam:      { color: 0xd9b27a, label: "Glulam GL24h beam" },
  post:        { color: 0x8b6b3d, label: "Post 140×140 PT" },
  cladding:    { color: 0x4f6a4c, label: "Larch cladding (stained)" },
  roofMetal:   { color: 0x2b2f33, label: "Standing-seam metal RAL 7024" },
  fascia:      { color: 0x3a3f47, label: "Steel fascia" },
  glass:       { color: 0x8fb7d4, label: "Triple glazing" },
  door:        { color: 0x2c2f36, label: "Insulated door" },
  ground:      { color: 0x6b7a58, label: "Grass / soil" },
  paving:      { color: 0x8a8578, label: "Clay paver" },
};

// ---------- Derived helpers (do not edit) -----------------------------------
export function derived() {
  const B = BUILDING, R = ROOF_PLAN;
  // Triangle area (plan), by shoelace:
  const triArea = Math.abs(
    (R.V1.x*(R.V2.z-R.V3.z) + R.V2.x*(R.V3.z-R.V1.z) + R.V3.x*(R.V1.z-R.V2.z)) / 2
  );
  const buildingArea = B.width * B.depth;
  const carportArea  = triArea - buildingArea;
  // Mono-pitch angle from back→front over building depth
  const pitchRad = Math.atan((B.wallHeightFront - B.wallHeightBack) / B.depth);
  const pitchDeg = pitchRad * 180 / Math.PI;
  return { triArea, buildingArea, carportArea, pitchRad, pitchDeg };
}
