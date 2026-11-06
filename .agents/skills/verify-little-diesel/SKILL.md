---
name: verify-little-diesel
description: Verify Little Diesel's browser learning journey, playback ownership and repeated actions after state-machine changes.
---
# Verify Little Diesel

## Launch
The executable `node tests/state-browser.cjs` starts its own static server on an OS-assigned loopback port, launches Chrome, waits for real mode buttons and runs isolated contexts. No data, auth or seeding needed. `PLAYWRIGHT_PATH` must point to an installed Playwright module; otherwise normal module resolution applies. Chrome defaults to `/usr/bin/google-chrome`.

## Doctor
Read STATE_MACHINES.md and `git rev-parse HEAD`, then `node --test tests/state-machines.cjs`. Browser helper rejects page errors and asserts actual app controls, not just an answering port. To check production run identical browser helper with TARGET_URL set to the intended live URL; first compare served main.js/learning.js with the selected source revision.

## Drive
Read features/README.md. Run `PLAYWRIGHT_PATH=/path/to/playwright EVIDENCE_DIR=/chosen/evidence node tests/state-browser.cjs`. It drives named buttons, #next Enter, More → About this model and More → Restart lesson. Real timer waits are needed to expose stale callbacks. No internal state setters. Do not substitute hidden DOM writes for actions.

## Evidence
The helper captures one screenshot and JSON outcome per feature under EVIDENCE_DIR (default `/downloads/diesel-state-evidence`). Keep stdout plus git revision beside these. A failing assertion is not a pass; a timeout remains unverified. The app has no persistent side effects. For spatial changes run existing spatial-regression.cjs and spatial-journey.cjs too. Inspect actual images; geometry tests do not prove readable text.

## Cleanup
The helper closes only its own browser/server in finally and preserves evidence. Each invocation owns its own random port/browser, so concurrent runs do not share sessions. Do not kill by process name. TARGET_URL mode still creates an unused local server owned and closed by this invocation.

## Helpers
`node --test tests/state-machines.cjs` checks reducer reachability; `node tests/state-browser.cjs` runs mapped state journeys. `node tests/focused-controls.cjs` checks fourwidth complete learning/menu/counts/focus/exit paths. Map maintenance follows /maintain-verification-skill when behavior changes.
