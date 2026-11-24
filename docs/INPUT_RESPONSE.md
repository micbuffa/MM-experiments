# Game Response to Controlled Impulses

Measurements from November 9, 2026. Question: why do strong trackpad impulses
not allow the level 1 lateral jump described by Michel?
The 416 clamping trial was rejected by human feedback and removed from the frontend.

## Protocol and Comparability Proof

Headless Chrome 157.0.8103.38, EmulatorJS 4.2.3, same frozen MAME glue/WASM.
Each trial starts a **new document and a new runtime** with local ZIPs.
No program state is read or modified directly. Credit is held on frames
700..707, Start 710..717. A native X input is sent before the poll at 1200,
for 1 or 6 frames; Y=0. Observation at frames 1199, 1206, 1212.
These deltas are **after gain** in the pipeline: gain and trackpad are
intentionally bypassed to isolate the core, without synthetic DOM events.

The blue marker centroid is measured in the 1110 × 832 canvas. Identical start
for all 11 trials: (525.493847; 168.015587). Two neutral trials, before/after the
series, remain motionless. Non-zero native polls match the setpoints exactly:
no inversion or loss detected at this level. No JavaScript errors.

The marker was visually verified on temporary captures. A fixed scenery region
(100,300)→(1000,700), i.e., 360000 pixels, is byte-for-byte identical across
neutral, 64× 1, 416× 1, and 64× 6: no camera translation on these observations.
Coordinates remain **screen** measurements, not internal program positions or
velocities. The animated pattern can shift the centroid slightly, so do not
interpret hundredths of a pixel as physical precision.

The first attempt via in-memory snapshot restoration was **rejected**:
starting positions differed. It is excluded from conclusions.
The cause of this non-comparability is not established. No snapshot persisted.

## Results at Frame 1212

Displacements in pixels relative to 1199; repetitions shown separately.

| Native Delta X | Command Frames | Screen ΔX | Screen ΔY | Screen Distance |
| -------------- | -------------- | --------- | --------- | --------------- |
| 0              | 1              | +0.000    | +0.000    | 0.000           |
| 16             | 1              | +2.931    | -4.056    | 5.004           |
| 64             | 1              | +2.931    | -4.056    | 5.004           |
| 128            | 1              | +2.931    | -4.056    | 5.004           |
| 256            | 1              | +9.728    | -3.887    | 10.476          |
| 416            | 1              | -23.213   | -3.718    | 23.509          |
| 768            | 1              | -10.139   | -3.925    | 10.872          |
| 1536           | 1              | -16.722   | -3.821    | 17.153          |
| 0              | 1              | +0.000    | +0.000    | 0.000           |
| 64             | 6              | +9.728    | -3.887    | 10.476          |
| 256            | 6              | +29.665   | -3.810    | 29.908          |

The detailed series also checks early frames: for 64× 1, the first marker
variation appears at 1203, then stays nearly fixed until 1212.
At 416× 1, the observed horizontal displacement is opposite to that of 64× 1.
This confirms non-monotonicity in the visible response after the native driver,
not its exact cause. The program may apply its own transforms, quantizations,
constraints, and collisions; do not automatically attribute these results to
the 8-bit mask alone or conclude a core bug versus the original game.

Duration matters: 256× 6 produces about 29.91 pixels of displacement, versus
10.48 for 256× 1; 64× 6 produces 10.48 versus 5.00 for 64× 1. This does not
prove that adding inertia would be faithful to a physical trackball: its free
spin was not measured and the jump was not achieved by this protocol. No command
spreading or new gain is shipped based on these numbers.

## Reproducing Intentionally

Dev server already active on 127.0.0.1:5173 and authorized archives in roms/:

```sh
npm run measure:impulses -- --quick
npm run measure:impulses
```

The short series takes about one minute, the full one about four. An isolated
Chrome profile is used, without touching Michel's settings. For installed
Playwright Chromium: `PLAYWRIGHT_CHANNEL=chromium npm run measure:impulses`.
`MARBLE_TEST_URL` can target another loopback dev HTTP server.
The harness refuses a remote address. It is not intended for the preview server.

Numeric report: `test-results/impulse-response.json`, ignored by Git.
No ROM, image, or game state is written there. The script rejects starts
offset by more than one pixel, missing images, differing native setpoints,
or a JS error. Do not interpret a rejected series or ambiguous tracking.

Reference evidence without ROM data:
[impulse-response-evidence.json](../third_party/impulse-response-evidence.json).
Control images remain in /tmp only and are not distributed.

## Next: Now-Observed Reads

The [trackball ports tracer](TRACKBALL_PORTS.md) now observes the actual
returns from the core handler. It distinguishes the two frame labels and shows
that at 416 the ports reach −125 modulo 256, while the visible response flips
sign. At 768 large steps become ambiguous modulo 256. These observations
do not prove the program's internal algorithm or a fixed jump. The sequences
are preserved for comparison against a reference, with no new gain, boost,
or inertia setting.
