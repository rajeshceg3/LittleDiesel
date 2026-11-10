---
name: verify-little-diesel
description: Verify the guided engine journey, mechanical continuity, camera, themes and repeated actions.
---
# Verify Little Diesel

The former three-mode scripts remain historical. Current controls are the single guided journey in main.js and learning.js.

## Run

`npm ci`; serve the repo with `python3 -m http.server 8795`.

- `npm test`: syntax + current guided.cjs journey at 390/1320. Use VIEWPORTS for 320x568 and 844x390 too; split long local batches as needed.
- `node --test tests/state-machines.cjs`: 23,296 reducer states.
- `node tests/guided-edge.cjs`: movement reset, rod continuity, paused pose, piston tap, camera reset, fullscreen fallback, resize.
- `node tests/fidelity.cjs`: light/dark at 390/1320, visible text contrast, initial/view/journey reset camera equivalence, held pose, theme toggle and nine parts.

BASE_URL selects hosted source in guided.cjs/fidelity.cjs. OUT selects evidence directory. Before hosted verification compare served main.js, learning.js and styles.css with the tested revision. Browser helpers exercise real buttons and selectors. Screenshots and numeric outcomes complement actual pixel inspection; neither alone proves every visual is good. Source measurements and caveats live in docs/fidelity/REVIEW.md. Physical-device coverage is not claimed.
