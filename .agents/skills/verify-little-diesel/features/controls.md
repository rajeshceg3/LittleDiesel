# Rapid controls

Verify rapid controls through actual browser events.

## Sub-features
- Repeated modes, duplicate move, limits overlay, restart.

## How to get to it (user POV)
Make it go! after repeated Peek inside / Make it go! selections.

## Driving it with Playwright
Preconditions: fresh context and initialized app.
- Run the state-browser helper described in the parent skill.
- Start → skip → press #next Enter twice → More → About this model → Back to lesson → require held Next idea → More → Restart lesson → introduction.
- Require no page errors; retain the named screenshot/JSON.

## Gotchas
- More → About this model pauses an underway move; close it before waiting for the boundary.
