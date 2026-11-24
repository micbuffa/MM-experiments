# Real Recording and Replay of Michel's Gesture

The recording received on November 9, 2026 is now complete and usable. No
new gesture is needed to repeat this investigation: the numeric profile
is preserved in `third_party/captured-motion-evidence.json`.
The jump remains unfixed; player control and gain are not modified.

## What the Recording Shows

Gain 1.70×, capture ended with Escape, one segment of 95 lines, 96 non-zero
events over 1.391 seconds. 52 non-zero native samples spread across 85 iterations.
Transmitted sums are −5737 on X and +6257 on Y. For **each of the 95 lines**,
the transmitted deltas equal the last observed native poll. No clipping
reported and no unsampled pending events at the end of the segment.
This is an observation at the bridge, not of all polls or marble speed.
The global counter also includes one event with zero contribution to the sums,
consistent with zero-movement rejection by the timeline.

Main diagonal peaks, times relative to the segment:

|    Time | Native X | Native Y | Sum of Absolute Values |
| ------: | -------: | -------: | ---------------------: |
| 0.832 s |     −624 |     +527 |                   1151 |
| 1.085 s |     −608 |     +574 |                   1182 |
| 1.335 s |     −515 |     +539 |                   1054 |

The retained maximum peak therefore corresponds to a strong command in the
recording. The bridge's int16 limit is not reached. This does not certify
downstream processing or jump success.

## Controlled Replay in the Real Web Core

One-off probe derived from `scripts/measure-impulses.mjs`, outside the repo:
numeric X/Y profile injected before iterations 1200..1294, with no extra gain.
Each line is replayed over one iteration; macOS callback temporal jitter is not
replayed. Fresh runtime per case, Credit 700..707, Start 710..717.
Neutral / captured profile / neutral series. All observed polls match,
starts are identical, and neutrals are motionless. Zero JavaScript errors.
These are not the same game state or Michel's position in his run.

`trakball_r` handler instrumented by the existing module, hash/map/signature
verified; native calls and returns preserved. 488 reads per trial over
counter window 1198..1319, no observation loss or error. For peak (−608,+574),
injected before 1265, port 0 transitions around that time from 212 to 27 then 190.
Bytes alone do not resolve wrap-around ambiguity: 212→27 can notably represent
+71 or +327 modulo 256. Do not present an arbitrary signed decoding as the
arcade program's algorithm.

The frozen public driver combines positions via posx+posy and posx−posy, X inverted,
30% sensitivity, 8-bit counters (sources and ABI: TRACKBALL_PORTS.md).
Large diagonal commands must therefore be studied downstream of the bridge,
but these bytes alone do not demonstrate the exact cause of missed jumps.

## Check in Native MAME 0.271

Replay of the same observed bytes, with the **fixed −1 offset already calibrated
before this recording**, without per-point adjustment. One neutral case and one
captured case, fresh processes, ttl BIOS, isolated and unsaved config/states/NVRAM.
Two independent taps each verify 488 reads. After the window, the last byte is
held: do not reset counters to zero and invent an impulse.

At each of the seven instants 1199/1212/1248/1264/1294/1306/1318, Web optical
displacements normalized to 336×240 and native displacements agree within **0.158
pixel maximum per axis**. At the last point: Web (−75.987; +73.868), reference
(−75.980; +73.896). These are screen displacements, not physical coordinates.
The control region is no longer static when the marble enters its zone; no proof
of world-space displacement is inferred from this check.

This result extends earlier observations on isolated impulses to a human profile.
It does not show a defect specific to 2003-Plus, nor does it prove equality of
internal states or fidelity to a physical cabinet. Bytes alone and this replay
do not support claiming a jump fix.

Future work can build on this preserved profile to compare amplitudes and their
downstream effects, keeping per-iteration timing. No new limiter, boost, or
gain imposed based on this single test. Do not ask Michel to repeat the same
procedure: the data now exists.
