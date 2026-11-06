# Little Diesel state charts

These project-authored charts live with the code. Read [the single living audit](../../STATE_MACHINES.md) for transition tables, confirmed issues and proof boundaries. Last checked against runtime main96a070c (documentation/tests current75e8813),6November2026.

| Diagram | Editable Mermaid | Rendered SVG | Model |
|---|---|---|---|
| Learning journey | [learning](generated/learning.mmd) | [learning](generated/learning.svg) | [Journey](models/Journey.tla) |
| App overview | [app](generated/app.mmd) | [app](generated/app.svg) | [Explore](models/Explore.tla) |
| Autoplay-note ownership after fix | [ownership](generated/ownership.mmd) | [ownership](generated/ownership.svg) | [Ownership](models/Ownership.tla) |
| Idempotent explanation reveal | [reveal](generated/reveal.mmd) | [reveal](generated/reveal.svg) | [Reveal](models/Reveal.tla) |

The first two PNGs are the chat-ready annotated charts. The SVGs are fresh renders of the committed Mermaid. Ownership and Reveal cover the implicit machines omitted from the first diagrams. Ownership projects cancellation/generation checks into one owner-valid transition; it is not a line-for-line implementation model. Reveal self-loops are not drawn: pressing Compare again stays at one explanation. No invariant breaks were found in these bounded models; that does not prove all app behavior.

## Regenerate
Use public pstack source e388616361ac78eeb2da66c148d882534aca4cb9, its statechart script, TLC1.7.4 and Pele1.9.0. Outside the repo, provide the pstack checkout and TLC jar. Example from repo root:

```sh
TLA2TOOLS=/path/to/tla2tools.jar /path/to/pstack/skills/statechart/scripts/statechart docs/statecharts/models/Ownership.tla --view docs/statecharts/models/ownership-view.mjs --out /new/empty/output
```

Repeat for Journey/journey-view, Explore/explore-view and Reveal/reveal-view. Copy generated chart.mmd and report.md to their matching generated names. Render with `pele@1.9.0` using `{limit:1000000,outputLimit:8000000,maxEdges:10000}`. Do not bundle the public skill implementation or downloaded Java/TLC into this project.

## Safe evidence
The evidence folder contains actual hosted390 screenshots: held power stroke without the stale note, single teach-back explanation after4activations, and reset introduction after rapid controls. Their assertions are in tests/state-browser.cjs. The living audit records failing-before and passing-after observations and exact runtime source hashes. Screenshots contain only the app, no user data. No internal transcripts, prompts, credentials, private paths or raw operational logs are retained here.

For future changes update the living audit, models, Mermaid, renders and regression tests together; rerun model checks and affected real browser paths. A copied file is not execution evidence. The model reports record what actually ran.
