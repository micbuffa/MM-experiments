# Actual Trackball Port Reads

Measurements from November 9, 2026, in the project's distributed and frozen
core. This diagnostic observes the handler called by the emulated CPU; it does
not reconstruct its returns from mouse deltas alone. No gain or physics changes.

## Verified Bridge

Public sources for revision `3a72dae33dfae65871158f03dbc1e849d74b4060`:

- [atarisy1.c](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/drivers/atarisy1.c): `main_readmem` maps `0xF20000–0xF20007` to `trakball_r`. It returns `cur[player][which]`, a byte derived from `posx+posy` or `posx-posy`.
- [memory.h](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/memory.h): `Memory_ReadAddress16` contains start, end, handler; two-argument `READ16_HANDLER` signature, integer return.

Inspection of the **ROM-less** core archive: a single data pattern contains
the F20000/F20007 range. WASM data segment 43696, linear address 9849616,
function index 17927. Five neighboring 12-byte entries are verified:

| Offset | Start  | End    | Index |
| ------ | ------ | ------ | ----- |
| -12    | F00000 | F00FFF | 17926 |
| 0      | F20000 | F20007 | 17927 |
| +12    | F40000 | F4001F | 17928 |
| +24    | F60000 | F60003 | 17929 |
| +36    | FC0000 | FC0001 | 17930 |

The script captures real exports `Eh` (table) and `Ch` (memory), verifies the
WASM bytes' SHA-256, then rejects any map or signature mismatch.
A small WASM trampoline `(i32,i32)→i32` temporarily replaces entry 17927.
It calls the original handler **once** with the same arguments, records its
return, and returns that same value. No synthetic calls to this handler.
No access to RAM or arcade program instructions; only core metadata and values
returned by its real calls are observed.

Logs are bounded, measurement errors isolated, native returns/exceptions
preserved. Teardown restores the entry only if it still belongs to the tracer.
Third-party files and WASM bytes are not modified.
This bridge is **strictly a voluntary diagnostic tool**, absent from the
compiled app and gameplay controls. It is not a public core API.

## Real Trials and Values

Same protocol as [INPUT_RESPONSE.md](INPUT_RESPONSE.md): fresh runtime per
trial, fixed Credit/Start, native X impulse before iteration 1200, Y=0.
Five prototype trials: neutral, 64, 256, 416, 768 over a single iteration.
Tracer check preserved: neutral, 256, neutral, identical starts and positions
to previous results, hash and map verified, no lost logs/JS errors.

Player 1 counters start at zero. For this X-only input, both ports of this
player return the same bytes:

| Native Delta X | First Modified Bytes | Corresponding Signed 8-bit Steps | Final Byte                | Observed Marble ΔX at 1212 |
| -------------- | -------------------- | -------------------------------- | ------------------------- | -------------------------- |
| 0              | 0 then 0             | 0 then 0                         | 0                         | 0.000 px                   |
| 64             | 239 then 237         | -17 then -2                      | 237 (−19 modulo 256)      | +2.931 px                  |
| 256            | 188 then 179         | -68 then -9                      | 179 (−77 modulo 256)      | +9.728 px                  |
| 416            | 146 then 131         | -110 then -15                    | 131 (−125 modulo 256)     | −23.213 px                 |
| 768            | 53 then 26           | +53 then -27                     | 26 (also −230 modulo 256) | −10.139 px                 |

X sign is inverted by the driver, its sensitivity is 30%. Final values are
consistent with these settings. Signed differences in the table are a
**diagnostic convention**, not proof of the program's algorithm. Once the real
step exceeds half-range, the counter alone can no longer reliably reconstruct
the requested displacement.

In the observed window: 64 calls per trial, 4 per frame label, offsets 0, 1, 2,
3, and received mask 65280. The other player's ports also evolve in these
trials; they are logged without equating them to a second active game.

## Timing

The script keeps two different labels:

- `iterationFrame`: counter recorded before the iteration by the harness;
- `frame`: `getFrameNum()` export queried on handler return.

For the 256 impulse:

| Before Iteration | Counter at Read | Port 0/1 Values |
| ---------------- | --------------- | --------------- |
| 1199             | 1200            | 0 / 0           |
| 1200 — impulse   | 1201            | 0 / 0           |
| 1201             | 1202            | 188 / 188       |
| 1202             | 1203            | 179 / 179       |
| 1203             | 1204            | 179 / 179       |

A single-iteration native command thus appears in two successive reads of these
counters. This progression is consistent with the core's analog interpolation.
These are not CPU cycle timestamps, nor a measurement of physical trackpad
latency; confusing the two counters would create an artificial offset.

## What This Establishes and What Remains Open

- At 416, ports reach the expected value −125 modulo 256, with steps observed
  within the signed half-range. Yet the visible horizontal response is opposite
  to that of small peaks. Loss before these ports or their wrap-around alone
  therefore does not explain this trial. **The responsible internal algorithm
  remains unknown.**
- At 768, steps become ambiguous modulo 256. This documents a real risk of
  large peaks, without making the rejected 416 limiter a fix.
- Level 1 lateral jump, fidelity of strong accelerations, and human comfort
  remain unvalidated. No boost, inertia, or new setting shipped.

The relevant next step is a reference comparison of the same port sequences
or an examination of their interpretation and timing on the emulation side,
from public sources. This tracking does not disassemble the ROM and does not
by itself prove a core bug rather than a property of the game.

## Reproducing

Local dev server already running, authorized archives in `roms/`:

```sh
npm run measure:ports -- --quick
# Full harness series, longer:
npm run measure:ports
```

Isolated browser profile; normal player controls unchanged. Numeric report
in `test-results/trackball-ports.json`, ignored by Git. No ROM, image, or save
in this file. The script rejects missing reads, lost logs, a different
map/version, or non-comparable starts. No automatic launch in CI.

Numeric evidence without game data:
[trackball-port-evidence.json](../third_party/trackball-port-evidence.json).
