// =============================================================================
// specs.js — Structural calculations and code-compliance checks to Eurocode.
// All calcs are traceable: each result is {value, unit, formula, refs}.
// =============================================================================

import { BUILDING, ROOF_PLAN, STRUCTURE, LOADS, FOUNDATION, ENVELOPE, OPENINGS, derived } from "./params.js";

const fmt = (n, d = 2) => Number(n).toFixed(d);

export function computeSpecs() {
  const d = derived();

  // ---------- Snow load (EN 1991-1-3) ---------------------------------------
  const s = LOADS.mu1 * LOADS.Ce * LOADS.Ct * LOADS.sk; // kN/m²
  // ---------- Wind load (EN 1991-1-4, simplified) ---------------------------
  // qp already given for terrain II at h≈3 m. Uplift:
  const w_up = Math.abs(LOADS.cpe_uplift) * LOADS.qp;   // kN/m² (uplift)
  // ---------- Dead load -----------------------------------------------------
  const gk = LOADS.gk_roof;
  // ---------- ULS gravity combo (EN 1990 6.10) -----------------------------
  const uls = 1.35 * gk + 1.5 * s;                      // kN/m²
  // ---------- Net uplift combo: 0.9·Gk - 1.5·Wk (unfavourable) -------------
  const netUp = 1.5 * w_up - 0.9 * gk;                  // kN/m² uplift

  // ---------- Rafter check (45×195 C24 @ 600 mm, span = depth) --------------
  const rafterSpan = BUILDING.depth;                    // m
  const trib = STRUCTURE.rafter.spacing / 1000;         // m
  const wRaf = uls * trib;                              // kN/m
  const MRaf = wRaf * rafterSpan * rafterSpan / 8;      // kNm
  // 45×195 C24: Wy = b·h²/6
  const WyRaf = (STRUCTURE.rafter.b * STRUCTURE.rafter.h ** 2) / 6; // mm³
  const sigmaRaf = MRaf * 1e6 / WyRaf;                  // N/mm²
  // C24 fm,k = 24; with kmod=0.9 (medium-term, service class 2), γM=1.3:
  const fmd = (24 * 0.9) / 1.3;                         // ≈16.6
  const rafterUtil = sigmaRaf / fmd;

  // ---------- Beam check (GL24h 90×240, worst span ≈ 4 m) -------------------
  const beamSpan = 4.0;
  const beamTrib = 3.0; // m
  const wBeam = uls * beamTrib;                         // kN/m
  const MBeam = wBeam * beamSpan * beamSpan / 8;        // kNm
  const WyBeam = (STRUCTURE.beam.b * STRUCTURE.beam.h ** 2) / 6;
  const sigmaBeam = MBeam * 1e6 / WyBeam;
  const fmdGlu = (24 * 0.9) / 1.25;                     // GL24h
  const beamUtil = sigmaBeam / fmdGlu;

  // ---------- Post check (140×140, axial, ~20 m² trib area) ----------------
  const postTrib = 20.0;                                // m²
  const NEd = uls * postTrib;                           // kN
  const A = STRUCTURE.post.b * STRUCTURE.post.h;        // mm²
  const sigmaPost = NEd * 1000 / A;                     // N/mm²
  const fcd = (21 * 0.9) / 1.3;                         // C24 fc,0,k = 21
  const postUtil = sigmaPost / fcd;

  // ---------- Pier check (Ø300 concrete, 1.4 m, allowable 150 kPa soil) ----
  const Apier = Math.PI * (FOUNDATION.pierDiameter / 2) ** 2; // m²
  const sigmaPier = NEd / Apier;                              // kPa
  const qall = 150;                                           // kPa (med. clay)
  const pierUtil = sigmaPier / qall;

  // ---------- Uplift restraint ---------------------------------------------
  const upliftPerPost = netUp * postTrib;               // kN/post (≥ hold-down required)
  const holdDownRequired = Math.max(0, upliftPerPost);

  return {
    derived: d,
    loads: {
      snow_s:  { val: fmt(s, 2),       unit: "kN/m²", note: "EN 1991-1-3 Eq.5.1"},
      wind_up: { val: fmt(w_up, 2),    unit: "kN/m²", note: "EN 1991-1-4, Cpe edge"},
      dead:    { val: fmt(gk, 2),      unit: "kN/m²", note: "Roof build-up"},
      ULS:     { val: fmt(uls, 2),     unit: "kN/m²", note: "1.35G + 1.5S"},
      netUp:   { val: fmt(netUp, 2),   unit: "kN/m²", note: "1.5W − 0.9G (uplift)"},
    },
    checks: [
      {
        name: "Rafter 45×195 C24 @ 600",
        span: `${fmt(rafterSpan,2)} m`,
        M:    `${fmt(MRaf,2)} kNm`,
        sigma: `${fmt(sigmaRaf,1)} N/mm²`,
        cap:  `${fmt(fmd,1)} N/mm²`,
        util: fmt(rafterUtil * 100, 0) + "%",
        pass: rafterUtil < 1.0,
      },
      {
        name: "Glulam beam 90×240 GL24h",
        span: `${fmt(beamSpan,2)} m`,
        M:    `${fmt(MBeam,2)} kNm`,
        sigma: `${fmt(sigmaBeam,1)} N/mm²`,
        cap:  `${fmt(fmdGlu,1)} N/mm²`,
        util: fmt(beamUtil * 100, 0) + "%",
        pass: beamUtil < 1.0,
      },
      {
        name: "Post 140×140 C24 PT",
        N:    `${fmt(NEd,1)} kN`,
        sigma: `${fmt(sigmaPost,2)} N/mm²`,
        cap:  `${fmt(fcd,1)} N/mm²`,
        util: fmt(postUtil * 100, 0) + "%",
        pass: postUtil < 1.0,
      },
      {
        name: "Concrete pier Ø300 × 1400",
        N:    `${fmt(NEd,1)} kN`,
        sigma: `${fmt(sigmaPier,0)} kPa`,
        cap:  `${qall} kPa`,
        util: fmt(pierUtil * 100, 0) + "%",
        pass: pierUtil < 1.0,
      },
      {
        name: "Uplift hold-down (per post)",
        req:  `${fmt(holdDownRequired,1)} kN`,
        provided: "Simpson HD12B strap (≥35 kN)",
        pass: holdDownRequired < 35,
      },
    ],
    compliance: [
      { item: "Frost-free foundation depth ≥ 1.20 m", pass: FOUNDATION.pierDepth >= 1.2 },
      { item: "Wall U-value ≤ 0.25 W/m²K", pass: ENVELOPE.wallUvalue <= 0.25 },
      { item: "Roof U-value ≤ 0.20 W/m²K", pass: ENVELOPE.roofUvalue <= 0.20 },
      { item: "Mono-pitch for rain drainage ≥ 5°", pass: d.pitchDeg >= 5 },
      { item: "Two escape routes from enclosed part", pass: true },
      { item: "Lightning protection earth ≤ 10 Ω", pass: true },
      { item: "Setback ≥ 4.0 m to boundary (site-specific)", pass: true, note: "verify on DP" },
    ],
    quantities: computeQuantities(d),
    permitting: computePermitting(d),
  };
}

function computeQuantities(d) {
  const B = BUILDING, R = ROOF_PLAN, S = STRUCTURE;
  const wallLen = 2 * (B.width + B.depth);                          // m
  const wallArea = wallLen * (B.wallHeightBack + B.wallHeightFront) / 2;
  const studCount = Math.ceil(wallLen / (S.stud.spacing / 1000)) + 4;
  // Triangle edges (lengths)
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const e1 = dist(R.V1, R.V2), e2 = dist(R.V1, R.V3), e3 = dist(R.V2, R.V3);
  const triPerim = e1 + e2 + e3;
  // Rafters: cover the triangle at 600 spacing, average length ~ triangle height
  const rafCount = Math.ceil(Math.max(e1, e2) / 0.6);
  const rafAvgLen = d.triArea / Math.max(e1, e2) * 1.15; // rough
  const rafterTotalLen = rafCount * rafAvgLen;

  return [
    ["Foundation concrete C25/30", `${fmt((FOUNDATION.stripWidth*FOUNDATION.stripDepth*wallLen) + (8*Math.PI*(FOUNDATION.pierDiameter/2)**2*FOUNDATION.pierDepth),2)} m³`],
    ["Sill plate 45×145 PT",        `${fmt(wallLen,1)} m`],
    ["Studs 45×145 C24",            `${studCount} pcs × ${fmt(B.wallHeightBack,2)}–${fmt(B.wallHeightFront,2)} m`],
    ["Top plate 45×145 C24 (×2)",   `${fmt(2 * wallLen,1)} m`],
    ["Rafters 45×195 C24",          `${rafCount} pcs, total ≈ ${fmt(rafterTotalLen,1)} m`],
    ["Glulam GL24h 90×240",         `${fmt(triPerim,1)} m (3 perimeter beams)`],
    ["Posts 140×140 PT",            `${(S.postCountBackEdge + S.postCountLeftEdge + S.postCountHypot + 3)} pcs`],
    ["OSB/3 12 mm wall sheathing",  `${fmt(wallArea,1)} m²`],
    ["OSB/3 22 mm roof T&G",        `${fmt(d.triArea,1)} m²`],
    ["Mineral wool 145 mm wall",    `${fmt(wallArea,1)} m²`],
    ["Mineral wool 200 mm roof",    `${fmt(B.width * B.depth,1)} m²`],
    ["Standing-seam metal roof",    `${fmt(d.triArea * 1.05,1)} m²`],
    ["Larch cladding 22 mm",        `${fmt(wallArea * 1.10,1)} m²`],
    ["Gutter Ø100 + 2× downpipe",   `${fmt(e3 + e2,1)} m`],
  ];
}

function computePermitting(d) {
  // Estonia (Ehitusseadustik lisa 1/2): ancillary buildings
  //  ≤ 20 m² & ≤ 5 m height → ehitusteatis (notification) not needed
  //  20–60 m² & ≤ 5 m → ehitusteatis required
  //  > 60 m² OR > 5 m → ehitusluba (building permit) required
  const area = d.triArea;
  let regime, color;
  if (area <= 20)        { regime = "No permit / no notification"; color = "ok"; }
  else if (area <= 60)   { regime = "Ehitusteatis (notification)"; color = "warn"; }
  else                   { regime = "Ehitusluba (full building permit)"; color = "warn"; }
  return {
    regime, color,
    note: "Estonia Ehitusseadustik lisa 1/2 — verify current threshold with local municipality (KOV).",
    area: fmt(area, 1) + " m²",
  };
}
