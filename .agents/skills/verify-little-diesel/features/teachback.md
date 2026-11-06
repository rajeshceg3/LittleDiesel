# Teach-back reveal

Verify teach-back reveal through actual browser events.

## Sub-features
- Four-stroke completion, transfer skip, repeat reveal.

## How to get to it (user POV)
Make it go! → Start learning.

## Driving it with Playwright
Preconditions: fresh context and initialized app.
- Run the state-browser helper described in the parent skill.
- For each of4strokes: Show me this move first → Watch it → held Next idea / Try a new case. Choose Think aloud, then Compare, then confirm one explanation and Explore engine. Require one explanation.
- Require no page errors; retain the named screenshot/JSON.

## Gotchas
- Use Enter on animated #next; click stability waiting can time out on its intentional pulse.
