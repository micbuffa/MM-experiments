# Gesture Duration and Impulse Profiles

On November 9, 2026, the harness compares the same total native displacement
across several iterations. **The result varies strongly with distribution,
including its direction.** Increasing the peak therefore does not guarantee
better acceleration. The level 1 jump remains unfixed; no new control setting
is applied.

## Recording an Acceleration

The first version recorded only the first gesture after capture.
Michel's recording thus showed 300 ms and an L1 native peak of 319, whereas
trial statistics contained an X peak of 916 absent from that first segment.
The instructions were ambiguous: Michel had indeed performed an acceleration,
then Escape and Copy. Selection is now automatic across the entire trial.

1. Fully reload the page, start a game, and keep the usual gain.
2. Click **Capture**: measurement starts automatically at the current gain.
3. Perform an acceleration, then **Escape**. No waiting or duration to meet.
4. Click **Copy diagnostics** and paste the text into the discussion.

A visible message shows "Trial ready", "Measuring", then "Measurement complete".
No second average trial needs to be identified to use this recording.
Small preparatory movements may precede the acceleration.

## Recording Selection and Limits

Each capture resets measurements and arms the recording, without clicking New
Trial beforehand. Recording remains active until Escape, focus/capture loss,
or gain change. Silence closes a segment, **not the trial**: a stronger
movement occurring afterward replaces the previous one. Selection uses the
largest L1 peak (|X|+|Y|) between the accumulated command before read and the
last observed native poll. It does not measure physical marble acceleration.
On ties, the first segment is kept. `selection` exposes the criterion, segment
count, chosen ID, its peak, and its end cause. Global status transitions to
complete on explicit interruption; reason indicates this end.

Each segment contains at most 128 lines, ending on the first callback after
two seconds or after 0.18 seconds of silence with a zero last poll. A limit
closes the segment and allows continuing the trial. A truncated segment is
flagged by selectedReason=limit. Only the best completed segment and the current
one are retained, at most 256 internal lines; the copy contains only the
chosen segment. New Trial remains optional to clear and re-arm. Resuming without
movement does not disarm the trial; changing gain ends it and requires re-arming
for another measurement. No storage, upload, listener, or timer added.

Lines group non-zero events between callbacks: count, pre/post-gain sums,
first/last event time relative to segment, intermediate transmitted peak
`peakSentL1`, internal frame, and last X/Y poll. Opposite events can cancel
in the sums without erasing their peak. `unsampledEvents` separately preserves
events from the selected segment interrupted before its next callback: do not
present them as polls. An acceleration immediately followed by Escape can thus
be preserved even if the last batch has not yet been read. Other segments are
not exported.

Times in seconds from performance.now at receipt, not hardware timestamps.
The last poll may omit intermediate reads; do not sum these samples as an
exhaustive counter. No access to touch coordinates or guaranteed device
identification. The command pipeline and physics are not modified by this
diagnostic selection.

## Synthetic Profile Harness

Loopback dev server already running and local ZIPs available:

```sh
npm run measure:profiles
# Subset with scenery check:
npm run measure:profiles -- --quick
```

Ignored reports: `test-results/impulse-profiles.json` for the full series,
`test-results/impulse-profiles-quick.json` for the subset. The harness does
not run in CI. Isolated browser process, fresh document/runtime for each
trial, without modifying Michel's preferences. No ROM/image/state in delivered
evidence. About 4 minutes for 11 trials, 2 minutes for 6 checks.

Credit before iterations 700..707, Start 710..717, input starting at 1200,
video measurements 1199/1206/1212/1224/1236. Native X deltas only, Y=0, gain
and host events intentionally bypassed. Each actually polled value is checked
against the setpoint; identical starts within one pixel and zero JS errors
required. `profile` contains per-iteration values and `total` their sum.
In profile mode, the historical `amplitude` field is the requested total,
**not** the peak; use `profile` to interpret values. The legacy `measure:impulses`
mode keeps its meaning and frames.

Profiles are diagnostic setpoints. They never smooth, spread, or amplify
gestures in normal gameplay.

## Observed Results

Eleven complete trials: identical start (525.494; 168.016), 1110×832 canvas,
motionless neutrals at start and end, every poll conforming, zero JS errors.
Horizontal marker displacement in presentation pixels, from 1199:

| Total X | Profile   | ΔX at 1212 | ΔX at 1236 |
| ------: | --------- | ---------: | ---------: |
|   1 536 | 1 × 1 536 |     −16.72 |     −53.12 |
|   1 536 | 2 × 768   |      −3.22 |      −9.92 |
|   1 536 | 4 × 384   |     −36.35 |    −112.22 |
|   1 536 | 6 × 256   |     +29.66 |    +105.71 |
|   1 536 | 12 × 128  |     +16.31 |     +95.79 |
|     416 | 1 × 416   |     −23.21 |     −63.04 |
|     416 | 2 × 208   |      +9.73 |     +29.66 |
|     416 | 4 × 104   |      +9.73 |     +29.66 |
|     416 | 8 × 52    |      +9.73 |     +26.15 |

Six check trials repeat neutrals and the 1536 profiles over 1/4/6/12
iterations: same centroids at each frame, zero JS errors. On region
(100,300)–(1000,700), all 360000 RGBA pixels remain strictly identical to
the initial image across the 24 subsequent comparisons; no scroll detected
on these checks. The initial eleven-trial series did not have this built-in
check; do not retroactively attribute it to the other cases.

This does not define a universal optimal duration: 4 × 384 remains inverted,
and stimulation frame counts differ. Measurements at 1236 are after all
stimulations; they are not internal velocities or coordinates. No jump trials
toward platforms.

Bridge check in the real runtime, automated Chrome: three browser-trusted
mouse events, three non-zero native samples over three iterations, silent stop,
14 lines, zero JS errors. This test **is not a physical trackpad movement** and
does not validate Michel's comfort.
Numeric evidence: `third_party/impulse-profile-evidence.json`.

The previous native MAME comparison already reproduced the behavior after
phase alignment: do not conclude a defect specific to 2003-Plus from these
results alone. The useful next step now depends on automatic recording of a real
acceleration: check its duration, packets, and large polls before considering
a documented fix.

## First Human Recording Analyzed

The following recording is usable and was replayed in both cores:
[CAPTURED_MOTION.md](CAPTURED_MOTION.md). All 95 lines match the observed
native commands; the measured trajectory agrees with the native reference.
The profile is preserved for future trials, without asking Michel to repeat
the capture. This result does not declare the jump fixed.
