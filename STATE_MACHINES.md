# Little Diesel: living state-machine audit

Status: two confirmed bugs fixed and verified on production main96a070caeeddc91a2c9d5b47f342f88b53349bc3 via PR16. Updated 6 November 2026. Baseline main424e78e. This is the single maintained audit file: keep findings, tables and evidence current when behavior changes. It describes reachable app behavior, not every theoretical reducer input as a user bug.

## Findings, ranked by impact

| Group | Confirmed reachable failure | Impact | Evidence before | Fix and regression | Status |
|---|---|---|---|---|---|
| [#14](https://github.com/rajeshceg3/LittleDiesel/issues/14) | Old continuous-play timer opens a secret card after Step it has returned to learner-paced playback | P1: unsolicited reading surface interrupts a held learning state | Hosted390: Explore moving engine → BOOM! → Step it → wait3.2s: Next idea plus secret show. New browser test fails1 versus0 | Cancel note and increment playback epoch when ownership changes; callback also requires continuous playback and matching epoch. Browser stale-secret test | Fixed and hosted390/844 regression passed |
| [#15](https://github.com/rajeshceg3/LittleDiesel/issues/15) | Repeated Compare with the explanation appends duplicate paragraphs | P2: repeated content and growing scroll obscure the takeaway | Hosted390: finish4strokes → Think aloud → Compare4times: actual paragraph count4. New browser test fails4 versus1 | One marked explanation per rendered teach-back surface; retries scroll to existing paragraph. Browser repeat-reveal test | Fixed and hosted390/844 regression passed |

Priorities are relative within this app, not claims of data loss or security severity. No money, account, storage, backend, network-write or multi-user state exists in this app. No invalid reducer state found in exhaustive exploration below. No other suspected behavior is promoted to a confirmed bug.

## State inventory and invariants

| Machine | Explicit or implicit state | Invariant | Ownership/concurrency |
|---|---|---|---|
| Startup | module fetching/renderer initialization → veil visible → ready | usable modes survive delayed veil removal | 1.9s startup timer and0.8s hint timer; startup must not reset selected mode |
| View mode | Meet it / Peek inside / Make it go | exactly one selected mode; cycle advances only in Make it go | mode button synchronously owns scene, part-card dismissal, pending-note cancellation and lesson reset |
| Lesson | orient / predict / feedback / ready / moving / held / transfer / transferFeedback / teachback; stroke0..3; answer history | feedback has valid answer; stroke range0..3; transfer only after exhaust; one move then held | synchronous reducer plus animation finish; UI guards prevent duplicate move while already moving |
| Playback | continuous / stepped-moving / stepped-held or reading | entering step playback finishes current stroke, then waits; no old continuous note may reopen | animation frames, mode changes, epoch-owned timeout |
| Model limits | closed / open with underlying lesson retained | opening pauses the cycle; closing returns to same underlying phase | moving may be paused by overlay; Previous/Restart remain disabled until move finishes |
| Explanation reveal | absent / shown within current teachback render | repeated activation creates at most one explanation | UI event is synchronous; same-surface retries reuse node; a fresh render clears it |
| Detail surface | closed / part detail in Peek inside / secret note in continuous playback | scene is not rendered behind active detail; stale callbacks cannot change surface owner | part picking synchronous; scale-bounce reset at450ms; note timer2.6s |
| Foreground | active / suspended | cycle time does not advance while blurred/hidden | blur/focus/visibility handlers; resume discards elapsed clock gap |
| Chrome | awake / idle | functional modes/step/card remain available; idle only fades incidental chrome | one replaceable6s timer; modes/step/card excluded from fading list |
| Annotation | selected named part; visible/hidden/occluded connector | available part selection persists; labels hidden during reading/detail; no dishonest connector | selection event and frame projection; no network retries |
| Camera/layout | fitted mode, outward zoom1..1.7, responsive stage, current orbit | model stays in reserved stage in annotated modes | resize + orbit + animation frame; last fitted mode invalidates fit; bounded separately by spatial tests |
| X-ray/springs | current values + target values per object/key | one active spring per object/key; latest target wins | repeated mode selections retarget existing spring, not additive writers |
| Pointer pick | pointerdown/movement accumulation/pointerup | a drag above14px is not a part tap; part picks only in Peek stage | UI events serial on main thread; simultaneous fingers share gesture variables (not claimed multi-touch picking support) |

## Transition tables

### View mode

| From | Event | To / side effects |
|---|---|---|
| any | Meet it | mode0, assembled pose, non-reduced-motion auto orbit; hide detail and stop cycle advancement |
| any | Peek inside | mode1, exploded/x-ray targets, part picker visible after reading closes |
| any, including Make it go | Make it go! | mode2, fresh orient lesson, first pose, stepped mode, old note canceled; this is a restart, not resume |
| Peek inside | tap actual part without drag | part detail open, small temporary scale bounce (except rod) |
| part detail / secret | Got it! | closed, wake chrome |

### Learner-controlled lesson

| From | Event / guard | To / side effects |
|---|---|---|
| orient | Think through first move | predict0 |
| predict i | valid choice0..2 | feedback i; record choice |
| predict i | Show me this move first | ready i; skip is supported |
| feedback i | Watch it | continue→ready→moving i within one UI handler |
| ready i | Watch it | moving i; set end boundary; repeated Watch while moving ignored |
| moving i | frame reaches boundary | held i; clamp cycle time; no automatic next idea |
| held i<3 | Next idea | predict i+1 |
| held3 | Try a new case | transfer |
| transfer | valid answer | transferFeedback; record transfer answer |
| transfer | Think aloud | teachback without answer (supported, not invalid) |
| transferFeedback | Explain in own words | teachback |
| teachback | Compare | show one explanation; repeat reuses it |
| predict/feedback/ready/held i>0 | Previous | held i-1 |
| predict/feedback/ready/held0 | Previous | orient |
| transfer/transferFeedback/teachback | Previous | held3 |
| any stepped phase except moving | Start over / Try lesson again | orient; clear answer history, note and overlay |
| moving | Previous / Restart | disabled at UI; Previous handler also guards running; reducer ignores Previous |
| unsupported reducer action | any | same state except start/reset are permissive helpers; UI does not expose start outside orient |

### Playback, overlays and delayed work

| From | Event | To / guard |
|---|---|---|
| stepped lesson | Let it run, Explore moving engine instead, Explore full cycle | continuous playback; reasoning hidden |
| continuous | Step it | invalidate old note; set current stroke moving until its boundary; fresh answer history |
| stepped moving | Let it run | continuous from current position; no artificial rewind |
| stepped phase | Model limits | overlay open; cycle pauses, same underlying phase |
| model limits | Back to lesson | overlay closed; previous phase resumes |
| continuous at first power stroke | schedule secret | epoch-owned2.6s callback |
| scheduled note | Step it / mode change / reset / Previous | cancel and invalidate pending work |
| scheduled note | callback | open only if mode2 AND continuous AND matching epoch |
| active cycle | blur or document hidden | suspended, frame draws but cycle clock stops |
| suspended | focus / visible | resume, discard background elapsed gap |
| awake chrome |6s idle | incidental chrome faded; critical controls excluded |
| idle chrome | canvas pointer / mode / picker / step activity | awake and replace idle deadline |

## Evidence and reproducibility

Baseline served main.js SHA256 eb048392ccfc02c52c740867e010f581265fbaeb3d30d7dd140c4e84e1bcdb5f matched inspected code. Live app: https://littlediesel.vercel.app/?layout=spatial-1 .

`node --test tests/state-machines.cjs` explores23,296 reachable concrete lesson states across repeated actions, invalid choice bounds and reset/Previous, checking stroke range, answer validity and transfer ordering. All passed before and after fixes. This covers the reducer, not animation or DOM concurrency.

`PLAYWRIGHT_PATH=/path/to/playwright node tests/state-browser.cjs` launches an isolated local server and browser contexts. Before fixes: stale-secret fails1/0; repeat-reveal fails4/1; rapid-controls passes. After fixes: all3pass. Actual actions, not internal state setters. Evidence directory defaults to `/downloads/diesel-state-evidence` and can be set with EVIDENCE_DIR. TARGET_URL runs identical tests against a hosted build. Cleanup closes only its browser/server and retains evidence.

Rapid-controls covers4repeated mode pairs, duplicate Enter during motion, model-limits open/return, boundary hold and restart. These are interleavings of single-threaded handlers, requestAnimationFrame and timers, not parallel database transactions. No app network requests mutate state, so transport retries are not a separate machine. Repeated activations and stale callbacks are the applicable retry/concurrency cases.

Earlier pstack/TLC diagrams checked two abstractions (35states/94steps and8states/32steps). They omitted pending timer ownership and reveal duplication, so they did not detect these bugs. Do not cite those charts as proof of the full app. Current audit explicitly includes these implicit machines.

## Final hosted verification

PR: https://github.com/rajeshceg3/LittleDiesel/pull/16 . Production: https://littlediesel.vercel.app/?layout=state-1 . Served index/main/learning bytes exactly matched source a3e8e64; main SHA256530f805f6c783c913ebf0c99bfa7636ffc1a7d9eebcd9e0e4a35ea2a9cce51b8, index20ba721c0b5cfd20c547ab4add8d80d9e7c106c143cd0e76fd4fc4365d9d24d3. Source-linked query was changed to state-1 for runtime cache invalidation; CSS unchanged.

Hosted390portrait and844landscape: stale-secret, repeat-reveal, rapid-controls all passed. Hosted390 also passed normal-autoplay (secret still appears/dismisses, then step return holds) and pause-limits (wait2.6s while overlay open, then resume to boundary). Actual hosted portrait held/teachback and landscape teachback pixels inspected; no duplicate explanation or stale card. Browser emulation, not physical-device proof. Existing spatial regression passed320/390/1320/844 locally. An initial60s run stopped after three widths; only subsequent complete fourwidth pass counted. No CSS/model geometry changed.

The generated .agents/skills/verify-little-diesel workflow and3feature map were executed end to end after generation; all3initial paths passed, browser/server cleaned up, screenshots/JSON survived. Additional normal-autoplay/pause-limits checks extend the helper without changing runtime source.

## Unconfirmed risks and exclusions

- Shared pointer accumulator is not a multi-finger gesture state machine. No confirmed false part pick from physical multi-touch; do not claim a bug without a real reproduction.
- Startup import/renderer failure has no designed retry screen. A missing network dependency can prevent initialization; no new confirmed runtime failure observed in this audit.
- Hidden-tab event ordering, physical-device suspension, full accessibility audit and GPU performance remain outside this bounded run. Browser focus/visibility uses standard events, not true device background certification.
- Reducer start is permissive outside orient, but the only UI start button exists in orient and is replaced synchronously. This is not currently a reachable user bug.
- Previous retains prior choice history; deliberate skip can leave that history present. This is recorded interaction history, not a mastery score. No new persistence or learning assessment is inferred.
- Repeated mode selection resets lesson by design. The audit records that behavior rather than changing it silently.

## Maintenance gate

For a behavior change, update the matching table/invariant first, reproduce any claimed failure through a user path, add a failing-before check, fix, rerun regression plus affected spatial/reading checks, then record exact hosted revision and evidence. Keep unverified claims and invalid model-only inputs out of confirmed issues.

## Focused controls (production5498459, verified)

The persistent three-mode row is shown only outside the lesson. Within it: introduction has Start learning, Explore engine and More (3buttons, previously8); prediction keeps3answers+skip+Back+More (6, previously10); feedback/held have Watch it or Next idea plus Back+More (3, previously8). The named-part select is an additional model control, not counted as a button. Continuous playback keeps Step it visible with Back+More. No learning step auto-advances.

More is a modal dialog, closed/open with the underlying phase retained. It pauses the cycle, traps Tab/Shift-Tab, closes on Escape, and returns focus to its opener. It contains Close, Let it run (only stepped), Restart lesson (not at introduction, disabled while a stroke moves), What this model leaves out, Explore engine. All visible menu actions are44px minimum. A narrow/short viewport can scroll the menu. Closing More happens before opening another reading surface.

| Current state | Action | Result |
|---|---|---|
| intro | Start learning / Explore engine | predict0 / Peek inside |
| any lesson | More / Close or Escape | pause behind modal / return to previous phase |
| stepped lesson | More → Let it run | continuous playback from current position |
| continuous | Step it | finish current stroke and hold |
| prior lesson phase | Back | prior phase via Previous semantics |
| moving or continuous | Back | exit to Peek inside, no trapped animation |
| stepped intro | Back | hidden because there is nothing to go back through; Explore engine remains visible |
| More | Restart lesson | fresh introduction; unavailable while moving |
| More | What this model leaves out | model-limits surface; returns to underlying phase |
| teachback | Compare | one explanation, primary changes to Explore engine |
| revealed teachback | Explore engine | Peek inside; Try again lives under More → Restart |

Legacy hidden Previous/Restart/Model limits elements are compatibility handlers, not exposed competing controls. Model limits is now labeled What this model leaves out in More. Earlier tables use those action semantics, not current placement. Focused-controls regression verifies actual current routes.

`tests/focused-controls.cjs` locally passed320/390/1320/844: counts, complete4stroke journey (wrong answer and skips), transfer/teachback, More Tab containment/Escape/focus return,44px menu targets/last item reachable, autoplay visible pause, restart state, moving Back exit. Five state regressions locally390 pass through updated paths. Prior spatial part/bounds regression passes all4widths; full4stroke+wheel journey passed all4widths in two batches (the initial combined120s run stopped after320/390, not counted beyond those). Browser emulation, not physical devices.

## Committed diagrams and supporting artifacts

[docs/statecharts/README.md](docs/statecharts/README.md) indexes editable TLA+/config/view models, generated Mermaid/SVG, chat-ready PNGs, bounded model-result summaries and safe actual hosted screenshots. Includes separate post-fix note-ownership and idempotent-reveal charts so the implicit machines are not hidden by the original overview. Keep these synchronized with this living file and regression tests. No internal operational material belongs in the public repo.

Focused-controls final hosted evidence: PR19 https://github.com/rajeshceg3/LittleDiesel/pull/19 merged54984596e9cef09c3e465dcdbcd203f025bc6291. Live https://littlediesel.vercel.app/?layout=focused-1 . Served index/main/styles exactly match source11f14a9: JS c083e682eea617e8cac7d3e6bc9b8c27c2063d5e9653b4d379bfc5f8f2b1efb3; CSS dd69d2efd4c0cd1ac82217fb4ba37c3ae46e4c43a63f466484928ff3567fc15d. Full focused-control tests passed hosted320/390/1320/844, five state-regression paths passed hosted390, reducer23296states passed. Actual hosted phone intro/prediction/held and landscape menu pixels inspected. No physical-device claim. A discovered menu Tab escape in the local prototype was fixed with explicit first/last wrapping, then all fourwidth focus/Escape/return checks passed.
