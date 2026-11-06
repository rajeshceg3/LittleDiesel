# Playback ownership

Verify playback ownership through actual browser events.

## Sub-features
- Continuous playback, pending note, step return.

## How to get to it (user POV)
Make it go! → More → Let it run.

## Driving it with Playwright
Preconditions: fresh context and initialized app.
- Run the state-browser helper described in the parent skill.
- Wait for BOOM!, press Step it, wait3.2s. Require no secret card and Next idea held.
- Require no page errors; retain the named screenshot/JSON.

## Gotchas
- Do not shorten the wait below the2.6s callback delay.
