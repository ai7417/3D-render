# SHED-UPG-01 — Triangular-Roof Storage + Carport

A parametric 3D construction model and technical spec sheet for upgrading an
existing timber shed/carport (Estonia) with a larger enclosed storage area
and a triangular-plan mono-pitch roof that doubles as a covered carport.

Built as a static Three.js viewer — no build step, no server required.
Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).

## How to view

```
# From the repo root, either:
open index.html               # macOS
xdg-open index.html            # Linux
# ...or just double-click index.html in your file manager.
```

The ES-module `importmap` pulls Three.js r160 from unpkg. You need an
internet connection on first load; after that the browser caches it.

If your browser blocks `file://` module imports (some Chrome setups do),
serve the folder with any static server:

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What you can do in the viewer

- **Orbit** the model — left-drag to rotate, right-drag to pan, wheel to zoom.
- **Camera presets**: Iso / Front / Back / Left / Right / Top (plan).
- **Layer toggles** (left panel):
  - Cladding & roof skin (wall boards, metal roof, doors, windows)
  - Structural frame (sill, studs, top plates, glulam beams, posts, rafters)
  - Foundation (strip footings + Ø300 piers)
  - Dimension lines (plan + elevation dims + north arrow)
  - Ground & grid
  - Site context (trees, neighbour house, paving, car)
  - Wireframe overlay
  - Exploded view (separates foundation / frame / envelope vertically)
- **Specification panel** (right side): live Eurocode calculations,
  structural member checks, U-values, bill of quantities, permitting status.

## Project parameters

Every dimension in the model is driven from `js/params.js`. Change a number
there and both the 3D geometry and the spec sheet update next reload.

Defaults (override as needed):

| | |
|---|---|
| Enclosed shed footprint | 7.0 × 5.0 m |
| Back eave / front eave | 2.80 m / 3.30 m |
| Mono-pitch | 5.7° (10 % fall, drainage OK) |
| Triangular roof plan (3 vertices, X×Z m) | V1 (−0.3, −0.3), V2 (14.3, −0.3), V3 (−0.3, 10.3) |
| Total roofed area | ≈ 74 m² |
| Enclosed storage area | 35 m² |
| Open carport area (under roof) | ≈ 39 m² |

The rectangular enclosed shed sits in the back-left corner of the triangle.
The remaining triangular area is an open carport fitting two cars, covered
by the same roof. This matches the *function* of the existing building
(back = locked storage, front = open parking) but scales it up.

## Design code

- **EN 1990** — Basis of structural design
- **EN 1991-1-1** — Densities, self-weight, imposed loads
- **EN 1991-1-3** — Snow (Estonia Zone II, sk = 1.5 kN/m²)
- **EN 1991-1-4** — Wind (terrain cat. II, vb = 21 m/s)
- **EN 1995-1-1** — Timber design (Eurocode 5)
- **Ehitusseadustik** — Estonian Building Act
- **KOV detailplaneering** — verify local municipality setback / height limits

## Structural concept (summary)

1. **Foundation**: perimeter strip footing 400×800 mm under enclosed shed
   walls + Ø300 × 1400 mm concrete piers under each carport post. All below
   the 1.20 m frost line. Concrete C25/30 XC2/XF1, A4 stainless hold-downs.

2. **Ground floor**: 150 mm reinforced slab on 150 mm compacted gravel,
   PE damp-proof membrane, insulation optional if heated.

3. **Enclosed shed**: platform-framed 45 × 145 C24 timber studs @ 600 mm c/c,
   double top plate, diagonally braced for racking. Wall build-up achieves
   U = 0.22 W/m²K (larch cladding on vented cavity, wind membrane, 12 mm OSB,
   145 mm mineral wool, VCL, service void, interior lining).

4. **Roof structure**: triangular-plan GL24h 90×240 glulam perimeter beams
   along the three triangle edges, supported by 140×140 PT posts at corners
   and intermediate points. C24 rafters 45×195 @ 600 mm c/c span from the
   back beam to the hypotenuse. Roof build-up: 22 mm OSB T&G, diffusion-open
   underlay, 25+25 mm counter/batten, PVDF-coated standing-seam metal sheet.
   Roof U = 0.17 W/m²K (200 mm mineral wool between rafters, VCL, service
   cavity). Snow load s = 1.20 kN/m², ULS 1.35 G + 1.5 S = 2.48 kN/m².

5. **Drainage**: mono-pitch slope drains to Ø100 mm gutter on the hypotenuse
   (the front/outer edge); two Ø80 PVC downpipes at V2 and V3 discharge to
   a gravel soakaway at least 3 m from the foundation.

6. **Safety**:
   - Two independent escape routes from the enclosed shed (pedestrian door +
     sectional garage door).
   - 6 kg CO₂ fire extinguisher by the pedestrian door.
   - Smoke detector + CO detector (interconnected if storage heats).
   - Lightning: Ø8 mm galvanised rod, 2.5 m earth electrode, ≤ 10 Ω.
   - Electrical: TN-C-S, 30 mA RCD, IP54 fittings, surge protection (SPD),
     LED exterior lamp above pedestrian door.
   - Weather: C4 corrosion class fasteners (A4 stainless or hot-dip galv.);
     all timber pressure-treated in Use Class 3 (UC4 below DPM).
   - Seismicity: N/A (Estonia low-seismic).
   - Ventilation: roof cavity 1/300 of ceiling area via continuous eaves +
     ridge vents; enclosed shed cross-ventilation via two windows.

7. **Wind uplift**: Net uplift ≈ 1.47 − 0.5 × 0.9 = 1.02 kN/m². Each post
   resists ~20 kN uplift via Simpson HD12B (or equivalent) strap embedded in
   the pier with M12 stainless through-bolts. All purlin-to-rafter and
   rafter-to-beam connections use 2 × 5 × 120 mm SFS or equivalent hurricane
   clips / angle brackets.

## Permitting (Estonia)

Under *Ehitusseadustik* lisa 1/2, for a detached ancillary building:

| Area | Height | Regime |
|---|---|---|
| ≤ 20 m² | ≤ 5 m | No permit / no notification |
| 20 – 60 m² | ≤ 5 m | *Ehitusteatis* (notification only) |
| > 60 m² **or** > 5 m | — | *Ehitusluba* (full building permit) |

The default configuration (~74 m² total roofed) falls into **ehitusluba**
territory. The spec panel will show this live and update if you reduce the
triangle size below 60 m² in `params.js`.

**Always verify current thresholds with the local municipality (KOV) before
submission — local *detailplaneering* may impose stricter limits on height,
setback, cladding materials, and roof colour (RAL).**

## File layout

```
/
├── index.html          — Viewer page + import map
├── css/styles.css      — Panel styling
├── js/
│   ├── params.js       — Every dimension / material / load (edit here!)
│   ├── specs.js        — Eurocode calculations and compliance checks
│   ├── model.js        — Parametric 3D construction of the building
│   ├── dimensions.js   — Dimension lines + labels as 3D overlay
│   ├── ui.js           — Spec panel + layer toggle wiring
│   └── main.js         — Scene, camera presets, lights, render loop
└── README.md           — This file
```

## Disclaimers

This model is a **design intent / feasibility** deliverable. Before
construction you still need:

- A licensed civil/structural engineer's stamped calculation package
  (including connection design, ground-condition-specific foundation design,
  and seismic/snow-drift recalculation per the final site).
- A qualified architect's stamped submittal drawings for the *ehitusluba*
  application (plans, sections, elevations, site plan, services).
- A geotechnical investigation (or at minimum a soil description) to confirm
  the 150 kPa allowable bearing pressure assumed here.
- Electrical design by a licensed electrician (A-type RCD, SPD, earthing).

The parameters, U-values, and loads above are best-effort defaults for
mainland Estonia and should be reviewed for your exact site and use.
