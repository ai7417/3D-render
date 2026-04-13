// =============================================================================
// ui.js — Populates the right-hand specification panel and wires up toggles.
// =============================================================================

import { PROJECT, BUILDING, ENVELOPE, SAFETY, MATERIALS, FOUNDATION, derived } from "./params.js";
import { computeSpecs } from "./specs.js";

export function populateSpecs() {
  const d = derived();
  const s = computeSpecs();
  const el = document.getElementById("specs-content");

  const checkRow = (c) => `
    <tr>
      <td>${c.name}</td>
      <td>${c.span || c.N || c.req || ""}</td>
      <td>${c.sigma || c.provided || ""}</td>
      <td>${c.util || ""}</td>
      <td class="${c.pass ? "ok" : "bad"}">${c.pass ? "OK" : "FAIL"}</td>
    </tr>`;

  el.innerHTML = `
    <h3>Project</h3>
    <dl>
      <dt>Project ID</dt><dd>${PROJECT.id}</dd>
      <dt>Owner</dt><dd>${PROJECT.owner}</dd>
      <dt>Location</dt><dd>${PROJECT.location}</dd>
      <dt>Code</dt><dd>${PROJECT.designCode}</dd>
      <dt>Snow / terrain</dt><dd>Zone ${PROJECT.snowZone} / cat ${PROJECT.terrainCat}</dd>
      <dt>Revision</dt><dd>${PROJECT.rev}</dd>
    </dl>

    <h3>Geometry</h3>
    <dl>
      <dt>Measured existing shed</dt><dd>${BUILDING.totalLength.toFixed(3)} × ${BUILDING.depth.toFixed(3)} m</dd>
      <dt>Open left bay</dt><dd>${BUILDING.carportWidth.toFixed(3)} m wide for 2 cars</dd>
      <dt>Enclosed right room</dt><dd>${BUILDING.roomWidth.toFixed(3)} × ${BUILDING.roomDepth.toFixed(3)} m</dd>
      <dt>Room usable area</dt><dd>${d.roomUsableArea.toFixed(1)} m²</dd>
      <dt>Existing roofed rectangle</dt><dd>${d.existingRectArea.toFixed(1)} m²</dd>
      <dt>Upgrade added roof</dt><dd>${d.addedArea.toFixed(1)} m²</dd>
      <dt>Total roofed area</dt><dd>${d.roofedArea.toFixed(1)} m²</dd>
      <dt>Open carport area</dt><dd>${d.openArea.toFixed(1)} m²</dd>
      <dt>Diagonal upgrade edge</dt><dd>${d.diagonal.toFixed(2)} m</dd>
      <dt>Mono-pitch</dt><dd>${d.pitchDeg.toFixed(1)}°</dd>
      <dt>Open-bay supports</dt><dd>${s.support.primaryPosts} perimeter posts + room walls</dd>
    </dl>

    <h3>Loads (Eurocode)</h3>
    <dl>
      <dt>Snow s (μ·Ce·Ct·sk)</dt><dd>${s.loads.snow_s.val} kN/m²</dd>
      <dt>Wind uplift</dt><dd>${s.loads.wind_up.val} kN/m²</dd>
      <dt>Dead (roof)</dt><dd>${s.loads.dead.val} kN/m²</dd>
      <dt>ULS gravity</dt><dd>${s.loads.ULS.val} kN/m²</dd>
      <dt>Net uplift</dt><dd>${s.loads.netUp.val} kN/m²</dd>
    </dl>

    <h3>Structural checks</h3>
    <table>
      <thead><tr><th>Member</th><th>Span / load</th><th>σ / prov.</th><th>Util</th><th>Result</th></tr></thead>
      <tbody>${s.checks.map(checkRow).join("")}</tbody>
    </table>

    <h3>Envelope</h3>
    <dl>
      <dt>Roof cover</dt><dd>Valtsplekk standing seam</dd>
      <dt>Wall U-value</dt><dd>${ENVELOPE.wallUvalue} W/m²K</dd>
      <dt>Roof U-value</dt><dd>${ENVELOPE.roofUvalue} W/m²K</dd>
    </dl>
    <div class="note">Wall: ${ENVELOPE.wall.slice(0, 3).join(" / ")}…</div>
    <div class="note">Roof: ${ENVELOPE.roof.slice(0, 3).join(" / ")}…</div>
    <div class="note">Support concept: oversized transfer beams and the enclosed room corners carry the roof so the two-car bay stays open.</div>

    <h3>Foundation</h3>
    <dl>
      <dt>Frost depth</dt><dd>${FOUNDATION.frostDepth.toFixed(2)} m</dd>
      <dt>Strip footing</dt><dd>${FOUNDATION.stripWidth * 1000}×${FOUNDATION.stripDepth * 1000} mm</dd>
      <dt>Open-bay piers</dt><dd>Ø${FOUNDATION.pierDiameter * 1000}×${FOUNDATION.pierDepth * 1000} mm</dd>
      <dt>Concrete</dt><dd>${FOUNDATION.concreteClass}</dd>
    </dl>

    <h3>Safety &amp; services</h3>
    <dl>
      <dt>Lightning</dt><dd>${SAFETY.lightning.split(",")[0]}</dd>
      <dt>Electrical</dt><dd>RCD 30 mA, IP54</dd>
      <dt>Fire</dt><dd>${SAFETY.fire}</dd>
      <dt>Setback</dt><dd>${SAFETY.setback}</dd>
      <dt>Corrosion</dt><dd>A4 / HDG (C4)</dd>
    </dl>

    <h3>Compliance</h3>
    <ul style="padding-left:16px;margin:4px 0;">
      ${s.compliance.map((c) => `<li class="${c.pass ? "ok" : "bad"}">${c.pass ? "✓" : "✗"} ${c.item}</li>`).join("")}
    </ul>

    <h3>Permitting (Estonia)</h3>
    <dl>
      <dt>Roofed area</dt><dd>${s.permitting.area}</dd>
      <dt>Regime</dt><dd class="${s.permitting.color}">${s.permitting.regime}</dd>
    </dl>
    <div class="note">${s.permitting.note}</div>

    <h3>Bill of quantities (indicative)</h3>
    <table>
      <tbody>
        ${s.quantities.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`).join("")}
      </tbody>
    </table>
  `;

  populateLegend();
}

function populateLegend() {
  const list = document.getElementById("legend-list");
  const keys = ["foundation", "sillPT", "timberFrame", "glulam", "post", "cladding", "roofMetal", "fascia", "door"];
  list.innerHTML = keys.map((k) => {
    const mm = MATERIALS[k];
    const hex = `#${mm.color.toString(16).padStart(6, "0")}`;
    return `<li><span class="swatch" style="background:${hex}"></span>${mm.label}</li>`;
  }).join("");
}

export function wireLayerToggles(scene, model, dims) {
  const checkboxes = document.querySelectorAll("#panel-left input[type=checkbox]");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", () => applyLayer(cb.dataset.layer, cb.checked, scene, model, dims));
  });
}

function applyLayer(layer, on, scene, model, dims) {
  const find = (name) => model.getObjectByName(name);
  switch (layer) {
    case "cladding":
      find("cladding").visible = on;
      break;
    case "roofCover":
      find("roofCover").visible = on;
      break;
    case "structure":
      find("structure").visible = on;
      break;
    case "foundation":
      find("foundation").visible = on;
      break;
    case "context":
      find("context").visible = on;
      break;
    case "dimensions":
      dims.visible = on;
      break;
    case "grid": {
      const grid = scene.getObjectByName("gridHelper");
      if (grid) grid.visible = on;
      break;
    }
    case "wireframe":
      model.traverse((o) => {
        if (o.isMesh && o.material && "wireframe" in o.material) {
          o.material.wireframe = on;
        }
      });
      break;
    case "exploded":
      explodeView(model, on ? 1.5 : 0);
      break;
  }
}

function explodeView(model, amount) {
  const groups = { foundation: -1.0, structure: 0.0, cladding: 0.9, roofCover: 1.4 };
  Object.entries(groups).forEach(([name, mult]) => {
    const g = model.getObjectByName(name);
    if (g) g.position.y = mult * amount;
  });
}
