# Calibration from Recorded Gesture

**Initial conclusion invalidated by Michel in gameplay: 0.50× is not playable.**
The trial button has been removed; normal control returns to 1.70× and the Space
boost is now an explicit assist (see COMFORT_AND_3D.md). The measurements below
remain a diagnostic history, not a current recommendation or proof of human comfort.

The harness preserves player controls and preferences. The gains below are
applied only to diagnostic sequences replayed in isolated sessions. No new
physics, inertia, turbo, or limiter.

## Reproducing

Loopback dev server already running, user archives in roms/,
frontend/core prepared, and Chrome installed:

```sh
npm run measure:calibration
npm run measure:calibration -- --phase-check
npm run measure:calibration -- --refine
```

The `--quick` subset compares 0.425/0.85/1.70× in about three minutes.
The main series takes about five minutes (12 cases), the phase check
about two minutes (5 cases), and refinement about three minutes (8 cases).
Ignored reports: `test-results/capture-calibration.json`,
`capture-calibration-phase.json`, `capture-calibration-refined.json`.
These commands do not run in CI. Reports may be cleaned up by
Playwright; retained results are kept in third_party.

The source profile is numeric and frozen in `captured-motion-evidence.json`:
95 native X/Y pairs, original gain 1.70×. The pure module captureCalibration
validates structure, types, int16 bounds, and maximum length 128,
without executing the diagnostic text. No ROM download/upload.

## Method

Two comparisons, without conflating their interpretation:

- Full 95-iteration gesture, including its small preparatory movements.
- Fixed eight-iteration window around the largest L1 peak: indices 62..69,
  i.e., three before the peak, the peak, and four after. This window is chosen once
  from the original recording, identical for all gains. It is not a new method
  for processing player gestures.

Factors 0.25/0.50/0.75/1/1.25 yield equivalent diagnostic gains
0.425/0.85/1.275/1.70/2.125×. Quantized sub-counts are preserved by
quantizing cumulative prefixes: error under one count per axis at each
prefix, pauses and duration preserved. At factor 1, the profile is identical.
These equivalent gains do not reconstruct every individual trackpad event,
which are unavailable; no claim of identity with a new physical capture at
another gain. Saturation would reject the case rather than silently dropping counts.

Fresh runtime per case, Credit 700..707, Start 710..717. Input at 1200, then
independent check at 1201 with observations shifted by the same number of
iterations. Same duration from profile start to compare phases.
Read bounds and native handler SHA are verified; no observed poll may differ
from the setpoint. Neutrals at start and end. No use of Michel's trackpad or
saved gain in this injection path.

Control region far from trajectory, (900,250)–(1000,650), 40000 RGBA pixels.
Modified pixel counts are preserved. These are still screen positions; neither
physical velocity nor jump success is measured. Late points of the full profile
may include terrain response: do not select a gain based solely on its final
displacement.

## Initial Results

Isolated stroke, marker displacement 36 iterations after input start,
normalized to 336×240, in native pixels:

| Equivalent Gain |      ΔX |     ΔY |
| --------------: | ------: | -----: |
|           0.425 |  −8.039 | +2.934 |
|            0.85 | −15.981 | +7.802 |
|           1.275 |  +8.959 | −6.167 |
|            1.70 |  +2.985 | −3.136 |
|           2.125 |  −3.051 | −0.141 |

The response is not monotonic. The 0.85× result looked favorable, but the
check with a single-iteration shift gives only (−2.052; −0.136),
versus roughly (−10.076; +3.775) at 0.425× and (−5.061; +0.889) at 1.70×.
It would therefore be premature to recommend 0.85× from the first table alone.
Timestamps are aligned relative to the start of each stimulation.

The in-game slider uses a 0.05 step: intermediate gains 0.425/1.275/2.125
are diagnostic values, not user presets. Refinement compares 0.40/0.45/0.50×,
each at both phases. This check targets consistency, not the largest favorable
result obtained on a chosen timing.

## Refinement and Proposed Candidate

Isolated stroke, same 36-iteration delay, UI-selectable gains.
The two columns correspond to the two tested arrival times:

| Gain | ΔX/ΔY, input at 1200 | ΔX/ΔY, input at 1201 |
| ---: | -------------------- | -------------------- |
| 0.40 | −7.107 / +1.904      | −10.093 / +3.793     |
| 0.45 | −8.061 / +2.854      | −11.049 / +3.774     |
| 0.50 | −9.141 / +2.788      | −12.115 / +4.804     |

0.50× is retained as the **candidate to try**, among these refined values:
preserved direction and stronger response at both timings than the lower
gains tested. It is not a universal optimum. At 1.70×, the same stroke gives
(+2.985 / −3.136) in the first phase, then (−5.061 / +0.889) in the other:
simply increasing gain does not solve large accelerations.
Quantization and sprite animation limit optical precision; table decimals
are not physical precision.

25 trials completed (12 main, 5 phase, 8 refined): conforming polls,
no JS errors or lost traces, comparable starts and motionless neutrals,
control region unchanged at all points. Full replay at 1.70× reproduces
exact positions from the previous investigation. Legacy port check in quick
mode: neutral/256/neutral passed, 64 reads per case.
Numeric evidence: `third_party/capture-calibration-evidence.json`.

The **Try 0.50× for accelerations** button selects the existing linear gain
and saves it only after clicking. It does not resume a paused session.
Startup gain and Michel's setting remain unchanged before this action.
No filter, limiter, or command duration is added.
The slider allows returning to 1.70×; Reset keeps its historical behavior
of returning to 1×. The next capture starts automatic recording.

Button check in the real runtime: 1.70× before click, 0.50× after, measurement
captured at the right gain and frozen after Escape, zero JS errors. Automated
Chrome mouse events, not a physical trackpad test. 0.50× was not replayed
on the full 95-iteration profile in this refinement matrix; its selection relies
on the isolated stroke at both phases. Comfort of small movements, level 1 jump,
and level 3 braking remain to be validated by a human. A play session at this
setting is now needed, not another capture of the same gesture to continue the harness.
