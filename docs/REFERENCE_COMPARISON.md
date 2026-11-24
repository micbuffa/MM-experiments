# Comparison with Native MAME

On November 9, 2026, MAME 0.271 ARM64 reproduces the non-monotonic response
of the Web core when replay phase is aligned. **These measurements do not
demonstrate a bug specific to MAME 2003-Plus and do not solve the level 1 jump.**

## Reproducing

Node 24+, MAME **0.271** already installed, original user archives in `roms/`.
No ROM download or engine installation by this script.
The path below corresponds to Michel's Mac; adapt elsewhere:

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

No HTTP server required. The runner checks version and archives with
`-verifyroms`, forces the `ttl` BIOS, then launches 20 fresh processes: five
amplitudes 0/64/256/416/768 and four phases −1/0/1/2. About one minute on the
reference Mac. Each trial has its directory under `test-results/reference/`,
ignored; user configs unread/unwritten, autosave and NVRAM write disabled.
ROMs read from original archives, no dump copied.
Maximum timeout is 45 seconds per process; no save or image is produced.
Result: `test-results/reference/comparison.json`.

MAME 0.271 is the reference **available on this Mac**, not the latest version.
Hash of the tested executable:
`8a6cf7131934f7d8dcfed60daeeb75276cca62e91ef734e1e713de263f15553d`.
Selected native declarations contain all 30 SHA-1s of the Web set,
plus three board PROMs; `-verifyroms` accepts the provided archives.

## Protocol

Replay uses the **actual bytes read** by the four ports F20000–F20007,
preserved in `third_party/trackball-port-evidence.json`. It intentionally
bypasses SDL host input and trackpad to compare downstream response from the
ports. This is not a comfort comparison or macOS event-handling test.

- Fresh process; credit on callbacks 700..707, Start 710..717.
- Read tap on CPU program space, preserving upper bits, replacing only the
  port byte; no access to ROM code or RAM.
- Second independent tap: checks bytes received after substitution.
- 64 reads per tap across the 16 source labels 1198..1213, error-free.
- Optical tracking of the blue marker at 1199/1206/1212, native 336×240 framebuffer.
- Tap removal, command release, stop at 1214. The two-callback margin
  verifies the entire window even at delayed phases.

The Web source counter is the one recorded in the handler. On the native side,
if `completed` is the number of already-finished frame_done callbacks, the
source is `completed + 1 − phaseShift`. This equation defines the harness
labels; it is not a CPU time measurement. Phase −1 is applied to **all**
cases in its series, without per-amplitude adjustment.

Web deltas are scaled from 1110×832 to 336×240 separately on both axes,
solely for image comparison. This calculation never changes player commands.
Interpretation tolerance: one native pixel; centroid decimals are not physical
precision.

## Results

Final marker displacement, in native pixels, fixed phase −1:

| Impulse X | Web ΔX | Reference ΔX | Web ΔY | Reference ΔY |
| --------- | -----: | -----------: | -----: | -----------: |
| 0         |      0 |            0 |      0 |            0 |
| 64        | +0.887 |       +0.950 | −1.170 |       −1.133 |
| 256       | +2.945 |       +2.950 | −1.121 |       −1.133 |
| 416       | −7.027 |       −7.026 | −1.072 |       −1.085 |
| 768       | −3.069 |       −3.055 | −1.132 |       −1.105 |

Maximum deviation per axis: 0.063 pixel. All five native starts are identical,
all four neutral trials remain motionless. At phase 0 or 2, all non-zero cases
reach only ΔX +0.950; at phase 1, the 416 case gives −5.026.
A naive phase-0 comparison would therefore have wrongly attributed the
difference to the old core alone. The shift acts on the temporal shape
received by the game; the exact algorithm producing this sensitivity is not
established here.

Exploratory check in the real Web core, Chrome 157.0.8103.38: no native
pending, substitution of the same port returns for 64/256/416. All three
outputs match the initial harness centroids exactly. This supports the
relevance of downstream replay. This one-off probe is not built into the
native command. A native 416 check at real speed with throttle also
reproduces the phase-0 result; the initial discrepancy is not simply due to
accelerated execution.

Numeric evidence, without ROM/image/state:
`third_party/mame-reference-evidence.json`. The report preserves all four
phases, not just the matching series. One-off captures examined outside the
repo: scenery unchanged on native region (40,90)–(300,210), neutral/256/416 cases.

## Limits and Next Steps

Visible initial position agrees within one pixel, but internal states are not
proven identical: the timer differs by about one second and the native driver
uses a video clock distinct from legacy 60 Hz. Replay validates neither
MAME's SDL bridge, nor real trackpad timing, nor a jump. It is not sufficient
to certify an original cabinet.

Next investigation: measure the **temporal shape of a real fast gesture**
at the native bridge, then compare profiles of equal total displacement spread
over several iterations. Previous tests already show the effect of duration;
it must be linked to received gestures before any fix. Preserve Michel's gain
and physics; no turbo, limiter, or arbitrary inertia.

APIs verified in documentation shipped with 0.271 and frozen public sources:
[Atari System 1 driver](https://github.com/mamedev/mame/blob/mame0271/src/mame/atari/atarisy1.cpp),
[Lua memory interface](https://github.com/mamedev/mame/blob/mame0271/src/frontend/mame/luaengine_mem.cpp).
The presence of a palette does not mean screen:pixels returns its indices:
here pixels are 32-bit RGB colors; screen:frame_number is a method.
