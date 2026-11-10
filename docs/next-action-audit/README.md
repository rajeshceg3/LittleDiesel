# Contextual next-action audit - November 10, 2026

Baseline ac8496b, live https://littlediesel.vercel.app . Existing four-width focused-control journey passed before changes. Its three-control learning flow and model are retained, not replaced by a universal dock.

Two bounded fixes: the final Explore engine action now follows the takeaway instead of preceding it; quiet reasoning alternatives have at least44px height (previously42.1px). No lesson text, model, state transitions, persistence or hosting changes.

The expanded next-action browser harness checks visible controls for44px height and real center-point hit testing after scrolling; checks final action ordering; retains the existing four-stroke journey, keyboard Enter, prediction/skip, transfer, single explanation, More dialog focus trap, autoplay/Step it, exit/re-enter and Back regressions. It checks page errors and horizontal overflow. Hidden opacity-zero chrome is excluded. Four viewports pass locally, run separately via VIEWPORTS to bound runtime. Node model test visits23,296states. Actual390/844/1320final-action pixels inspected. Landscape reading scroll is expected and the action is clear of Back/More.

Reproduce: npm install --no-save playwright@1.56.1; VIEWPORTS='[[390,844]]' node tests/next-action-audit.cjs. Set TARGET_URL for hosted verification, EVIDENCE_DIR for screenshots. Script uses system Chrome. Production acceptance requires exact served bytes and hosted journeys after merge.

Scope: no claim of physical-device/Safari timing, fresh whole-model fidelity or full-app learning effectiveness.
