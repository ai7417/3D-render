// =============================================================================
// specs.js — Structural calculations and code-compliance checks to Eurocode.
// =============================================================================

import {
  BUILDING, ROOF_PLAN, STRUCTURE, LOADS, FOUNDATION, ENVELOPE, SAFETY,
  derived, roofOutline,
} from "./params.js";

const fmt = (n, d = 2) => Number(n).toFixed(d);

export function computeSpecs() {
  const d = derived();
  const [A, , C, D, E] = roofOutline();

  const s = LOADS.mu1 * LOADS.Ce * LOADS.Ct * LOADS.sk;
  const wUp = Math.abs(LOADS.cpe_uplift) * LOADS.qp;
  const gk = LOADS.gk_roof;
  const uls = 1.35 * gk + 1.5 * s;
  const netUp = 1.5 * wUp - 0.9 * gk;

  const existingRafterSpan = C.z - A.z;
  const upgradeRafterSpan = E.z - C.z;
  const worstRafterSpan = Math.max(existingRafterSpan, upgradeRafterSpan);
  const trib = STRUCTURE.rafter.spacing / 1000;
  const wRaf = uls * trib;
  const MRaf = wRaf * worstRafterSpan * worstRafterSpan / 8;
  const WyRaf = (STRUCTURE.rafter.b * STRUCTURE.rafter.h ** 2) / 6;
  const sigmaRaf = MRaf * 1e6 / WyRaf;
  const fmd = (24 * 0.9) / 1.3;
  const rafterUtil = sigmaRaf / fmd;

  const diagonalSpan = d.diagonal / 2;
  const backSpan = ROOMLESS_BACK_SPAN();
  const worstBeamSpan = Math.max(diagonalSpan, backSpan);
  const beamTrib = 2.4;
  const wBeam = uls * beamTrib;
  const MBeam = wBeam * worstBeamSpan * worstBeamSpan / 8;
  const WyBeam = (STRUCTURE.beam.b * STRUCTURE.beam.h ** 2) / 6;
  const sigmaBeam = MBeam * 1e6 / WyBeam;
  const beamStrength = STRUCTURE.beam.grade.startsWith("GL32") ? 32 : 24;
  const fmdGlu = (beamStrength * 0.9) / 1.25;
  const beamUtil = sigmaBeam / fmdGlu;

  const openPosts = STRUCTURE.postCount;
  const postTrib = d.openArea / openPosts;
  const NEd = uls * postTrib;
  const APost = STRUCTURE.post.b * STRUCTURE.post.h;
  const sigmaPost = NEd * 1000 / APost;
  const fcd = (21 * 0.9) / 1.3;
  const postUtil = sigmaPost / fcd;

  const Apier = Math.PI * (FOUNDATION.pierDiameter / 2) ** 2;
  const sigmaPier = NEd / Apier;
  const qall = 150;
  const pierUtil = sigmaPier / qall;

  const upliftPerPost = netUp * postTrib;

  return {
    derived: d,
    support: {
      primaryPosts: openPosts,
      worstBeamSpan: fmt(worstBeamSpan, 2),
      concept: "4 perimeter posts + enclosed room corners + transfer beams",
    },
    loads: {
      snow_s:  { val: fmt(s, 2), unit: "kN/m²", note: "EN 1991-1-3 Eq.5.1" },
      wind_up: { val: fmt(wUp, 2), unit: "kN/m²", note: "EN 1991-1-4, Cpe edge" },
      dead:    { val: fmt(gk, 2), unit: "kN/m²", note: "Roof build-up" },
      ULS:     { val: fmt(uls, 2), unit: "kN/m²", note: "1.35G + 1.5S" },
      netUp:   { val: fmt(netUp, 2), unit: "kN/m²", note: "1.5W − 0.9G (uplift)" },
    },
    checks: [
      {
        name: "45×195 C24 rafters (worst span)",
        span: `${fmt(worstRafterSpan, 2)} m`,
        sigma: `${fmt(sigmaRaf, 1)} N/mm²`,
        cap: `${fmt(fmd, 1)} N/mm²`,
        util: `${fmt(rafterUtil * 100, 0)}%`,
        pass: rafterUtil < 1.0,
      },
      {
        name: `${STRUCTURE.beam.b}×${STRUCTURE.beam.h} ${STRUCTURE.beam.grade}`,
        span: `${fmt(worstBeamSpan, 2)} m`,
        sigma: `${fmt(sigmaBeam, 1)} N/mm²`,
        cap: `${fmt(fmdGlu, 1)} N/mm²`,
        util: `${fmt(beamUtil * 100, 0)}%`,
        pass: beamUtil < 1.0,
      },
      {
        name: "140×140 C24 PT post",
        span: `${fmt(postTrib, 1)} m² trib.`,
        sigma: `${fmt(sigmaPost, 2)} N/mm²`,
        cap: `${fmt(fcd, 1)} N/mm²`,
        util: `${fmt(postUtil * 100, 0)}%`,
        pass: postUtil < 1.0,
      },
      {
        name: "Concrete pier Ø300 × 1400",
        span: `${fmt(NEd, 1)} kN`,
        sigma: `${fmt(sigmaPier, 0)} kPa`,
        cap: `${qall} kPa`,
        util: `${fmt(pierUtil * 100, 0)}%`,
        pass: pierUtil < 1.0,
      },
      {
        name: "Uplift restraint (per post)",
        req: `${fmt(Math.max(0, upliftPerPost), 1)} kN`,
        provided: "HD hold-down / strap ≥ 20 kN",
        pass: upliftPerPost < 20,
      },
    ],
    compliance: [
      { item: "Frost-free foundation depth ≥ 1.20 m", pass: FOUNDATION.pierDepth >= FOUNDATION.frostDepth },
      { item: "Wall U-value ≤ 0.25 W/m²K", pass: ENVELOPE.wallUvalue <= 0.25 },
      { item: "Roof U-value ≤ 0.20 W/m²K", pass: ENVELOPE.roofUvalue <= 0.20 },
      { item: "Roof pitch for drainage ≥ 4°", pass: d.pitchDeg >= 4.0 },
      { item: "Open bay width fits two cars (≥ 5.50 m)", pass: BUILDING.carportWidth >= 5.5 },
      { item: "Primary open-bay supports limited to 4 perimeter posts", pass: openPosts <= 4 },
      { item: "Left-side open bay depth ≥ 6.5 m", pass: E.z - A.z >= 6.5 },
      { item: "Continuous gutter to soakaway", pass: SAFETY.drainage.length > 0 },
    ],
    quantities: computeQuantities(d),
    permitting: computePermitting(d),
  };
}

function ROOMLESS_BACK_SPAN() {
  return BUILDING.carportWidth + ROOF_PLAN.overhangLeft;
}

function computeQuantities(d) {
  const roomPerimeter = 2 * (BUILDING.roomWidth + BUILDING.roomDepth);
  const avgRoomHeight = (BUILDING.wallHeightBack + BUILDING.wallHeightFront) / 2;
  const wallArea = roomPerimeter * avgRoomHeight;
  const studCount = Math.ceil(roomPerimeter / (STRUCTURE.stud.spacing / 1000)) + 6;
  const postCount = STRUCTURE.postCount;

  return [
    ["Strip footing concrete to enclosed room", `${fmt(FOUNDATION.stripWidth * FOUNDATION.stripDepth * roomPerimeter, 2)} m³`],
    ["Concrete piers to open bay posts", `${postCount} pcs Ø${FOUNDATION.pierDiameter * 1000}×${FOUNDATION.pierDepth * 1000} mm`],
    ["Sill plate 45×145 PT", `${fmt(roomPerimeter, 1)} m`],
    ["Studs 45×145 C24", `${studCount} pcs`],
    ["Posts 140×140 PT", `${postCount} pcs, perimeter only`],
    ["Rafters 45×195 C24", `existing + upgrade zones, total ≈ ${fmt(d.roofedArea / 0.6, 1)} m`],
    [`${STRUCTURE.beam.grade} ${STRUCTURE.beam.b}×${STRUCTURE.beam.h}`, `${fmt(d.roofPerimeter + (BUILDING.carportWidth + ROOF_PLAN.overhangLeft), 1)} m`],
    ["OSB/3 wall sheathing", `${fmt(wallArea, 1)} m²`],
    ["OSB/3 roof sheathing", `${fmt(d.roofedArea, 1)} m²`],
    ["Mineral wool 145 mm wall", `${fmt(wallArea, 1)} m²`],
    ["Mineral wool 200 mm roof", `${fmt(d.roofedArea, 1)} m²`],
    ["Standing-seam metal roof", `${fmt(d.roofedArea * 1.05, 1)} m²`],
    ["Larch cladding 22 mm", `${fmt(wallArea * 1.10, 1)} m²`],
  ];
}

function computePermitting(d) {
  const area = d.roofedArea;
  let regime;
  let color;
  if (area <= 20) {
    regime = "No permit / no notification";
    color = "ok";
  } else if (area <= 60) {
    regime = "Ehitusteatis (notification)";
    color = "warn";
  } else {
    regime = "Ehitusluba (full building permit)";
    color = "warn";
  }
  return {
    regime,
    color,
    note: "Estonia Ehitusseadustik lisa 1/2 — verify current thresholds with the local municipality.",
    area: `${fmt(area, 1)} m²`,
  };
}
