# Little Diesel state verification map

No auth or saved data. Each feature starts in a fresh browser context, then selects Make it go!. Run the helper from the repo root with Playwright available. Read STATE_MACHINES.md for the full machine inventory and unsupported/unverified areas.

- [Playback ownership](playback.md): stale-secret.
- [Teach-back reveal](teachback.md): repeat-reveal.
- [Rapid controls](controls.md): rapid-controls.

Proof requires real controls, outcome assertions, page-error check and retained screenshot. Tests do not claim full app or physical-device coverage. Existing spatial tests cover separate model layout paths.

Additional helper checks: normal-autoplay verifies the legitimate note appears/dismisses and step return holds; pause-limits verifies an underway stroke remains paused under the overlay and resumes to its boundary.
