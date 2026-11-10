# Engine visual fidelity, 10 November 2026

Preserves the guided predict/watch/hold/transfer journey and optional nine parts. No new dependencies, storage or account changes.

## Changes

- Retained teaching bounds shared by initial camera fit, view reset and journey reset. Model controls have their own dock outside the canvas; phone stage gets 48% of player height on tall phones.
- Head front section removed so the valves and injector remain visible; inlet and exhaust spread apart, injector behind their plane. This is a schematic section, not a production head shape.
- Larger valve stems/faces, coils and injector; warm ink/clay model retained. Cylinder opaque inverted hull removed; thin glass edge retained.
- Contact shadow, crank rotation cue and piston travel arrow. Arrows show motion, not force. Every move still stops and waits. Rod length remains 1.25 model units.
- System dark theme with manual toggle, lighter dark body/rod/crank, cool rim light and visible context at 38% opacity. No shared stylesheet or token changes.
- Primary CTA white-on-coral contrast was below WCAG text minimum; app-local terracotta CTA now passes.

## Evidence and limits

Real Chromium: complete four-stroke journey, nine connectors, zoom, resume, transfer, pause/reset/fullscreen at 320x568, 390x844, 844x390 and 1320x900 with motion enabled. Edge suite covers reset during movement, constant rod length, paused pose, piston hit test, orbit/zoom/reset, fullscreen fallback and resize. Reducer exhaustiveness: 23,296 states. No page errors.

190 visible text samples per theme at 390px and 180 per theme at 1320px pass body 4.5:1 / large 3:1 thresholds; disabled controls excluded. Pixel record in model-pixels.json samples actual rendered unoccluded inlet stem, head-fin face and flywheel, not material colors. Dark samples: 6.06, 7.60, 7.04 against scene background. Light: 4.19, 6.38, 4.42. Not a claim that every model face meets 4.5:1; shaded color and high-contrast ink contours work together. Physical iPhone/Safari remains untested.

Content source rechecked: https://www.energy.gov/cmei/vehicles/articles/internal-combustion-engine-basics supports diesel air-only intake, compression, fuel injection into hot compressed air, combustion expansion and piston/crank work. No performance/pressure/temperature numbers added. Copy round is separate.

Final pre-release regression found and fixed: OrbitControls damping retained angular inertia after a real drag, so Reset drifted away from the canonical pose. Camera fit now consumes pending orbit inertia before setting the pose. Added actual drag + reset + delayed position equivalence assertions; normal-motion light/dark 390/1320 suite passes.
