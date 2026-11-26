# Level 2 Green Worms: ROM Findings (GitHub issue #3)

Audience: Michel Buffa (gameplay and rendering review). The sound commands
are listed in a separate section at the end for Peter Salomonsen.

Status, 2026-11-26: this is a static 68010 disassembly of the local
`roms/marble.zip` (set 1, program ROM layout from `src/emulation/marble-roms.json`).
I did **not** check it against a live MAME run in this session. The tags below mean:

- **[DECODED]**: read directly from code or tables, with the address given.
- **[INFERRED]**: my interpretation or an adaptation. Treat it as a hypothesis to check in MAME.

Port: `src/remaster/level2/greenWorms/` (pure TypeScript, Vitest).
Integration note: [level2-green-worms-integration.md](level2-green-worms-integration.md).

## 1. How the worms are drawn today on `main`

- The worms are **procedural meshes**. They use no model files.
  - `src/rendering/createWorm.ts` builds a 32×12 tube with dynamic vertex
    buffers (a quadratic Bezier spine between the tail and the head). It adds
    two yellow end caps, a red mouth disc and a red tongue box.
  - `src/game/modern/wormPose.ts` turns the native state, script, frame and
    sub-frame values into a `WormPose` (tail and head offsets, arch, mouth,
    tongue, flare). This drives the mesh.
- `src/emulation/intermediateActors.ts` reads the emulator RAM. The black
  marble is at `0x400a20`, and the four worm slots are at
  `0x401302 + n × 0x60`. The reader uses `+0x0c/+0x10/+0x14` for position,
  `+0x1a` for state, `+0x58/+0x5c` for the frame pointer and script base,
  `+0x24/+0x25` for the sub-frame, and `+0x00/+0x04` for velocity.
  `src/rendering/createIntermediateActors.ts` renders them.
- The Rolling Madness `stick_*` models were used for worms earlier. The
  November 19 handoff replaced them with the procedural tube. On `main` they
  are still referenced only for the Level 5 squashed mini worm
  (`stick_squashed_mini`). They are gitignored and the remaster does not need them.
- So the remaster can reuse `createWorm.ts` and `wormPose.ts` as they are, if
  it feeds them from the module below instead of RAM (see the integration note).

## 2. Worm record (slot at `0x401302`, stride `0x60`, 4 slots) [DECODED]

| Offset | Meaning                                                               |
| ------ | --------------------------------------------------------------------- |
| `+00`  | vx, 16.16 units per tick                                              |
| `+04`  | vz                                                                    |
| `+0c`  | x, 16.16 (8 units per cell)                                           |
| `+10`  | z                                                                     |
| `+14`  | height, 16.16                                                         |
| `+18`  | active flag                                                           |
| `+19`  | slot id (0..3, set at `0x103fe`)                                      |
| `+1a`  | state (table below)                                                   |
| `+1b`  | terrain layer (from the spawn table)                                  |
| `+1c`  | marble vx saved at the bump (`+20` = vz)                              |
| `+24`  | tick counter inside the current pose                                  |
| `+25`  | ticks per pose (2 for patrol and brake, otherwise 1)                  |
| `+26`  | frame step (+1 or −1)                                                 |
| `+27`  | lunge clock (signed byte)                                             |
| `+28`  | projected sprite position (screen X high word, Y low word, `0x150d0`) |
| `+4a`  | current waypoint pointer                                              |
| `+4e`  | waypoint list base (also identifies the spawn entry)                  |
| `+52`  | band min row (`+54` = band max row)                                   |
| `+56`  | targeted player index (index into `0x1eff6`; 0 = P1, 1 = P2)          |
| `+58`  | current pose pointer (`+5c` = script base)                            |

## 3. Routines [DECODED]

| Address   | Role                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `0x11804` | Main loop: `0x1101e` → `0x10fce` → `0x1493c` (at `0x10fe6`) once per pass, then two VBLANK waits (30 Hz).       |
| `0x1493c` | Loops over the 4 slots and calls `0x14966`.                                                                     |
| `0x14966` | Per-tick update: animation clock, step on cycle end, lunge arc and homing.                                      |
| `0x144e4` | Turns scroll into a row, `(scroll − level[+0x10]) >> 4` as a signed byte, then calls `0x14c46(oldRow, newRow)`. |
| `0x14c46` | Spawns from table `0x2257a[levelIndex]`, then despawns.                                                         |
| `0x14bce` | Returns the free slot (the **last** free slot wins).                                                            |
| `0x14c0c` | Checks whether the spawn entry is already used by an active worm.                                               |
| `0x15148` | State machine, run at the end of an animation cycle (every tick in state 2).                                    |
| `0x15460` | Sets the script, velocity and ticks per pose for the state.                                                     |
| `0x15670` | Player detection, which starts the lunge.                                                                       |
| `0x15fe6` | In 2P, picks the leading marble.                                                                                |
| `0x14dec` | Finds the nearest waypoint after a lunge.                                                                       |
| `0x14e92` | Marble/worm contact. Called by the player update `0x123c8`, only on level index 1, 2 and 5.                     |
| `0x25e7c` | Friction from a speed table (mode 2 for a sliding worm, table `0x1eef8`).                                       |
| `0x25bae` | Player "lose marble" routine. The worm calls it with mode 4 after eating.                                       |
| `0x158ac` | Sends a sound command (see the last section).                                                                   |

## 4. Spawn points and activation [DECODED]

Each spawn entry is 8 bytes: `minRow, maxRow, path pointer, layer, pad`.
Level index 1 is Level 2. Its table is at `0x2259a`:

| Entry | Rows  | Layer | Path      | Spawn cell (x, z) | Waypoints                                      |
| ----- | ----- | ----- | --------- | ----------------- | ---------------------------------------------- |
| 0     | 5..30 | 3     | `0x2260a` | (51, 45)          | 13 (loop 1→2→3→4→5→0; 6..12 are return routes) |
| 1     | 5..31 | 3     | `0x22642` | (45, 51)          | 13 (mirror of entry 0 across x = z)            |
| 2     | 6..34 | 4     | `0x2267a` | (61, 51)          | 6 (loop 1→2→3→4→5→0)                           |

Each waypoint is 4 bytes: `cellX, cellZ, nextIndex, 0`. A worm stands at
`cell × 8 + 4` units, which is the cell center. Every waypoint of the three
paths falls on the flat `16264` plateau in `local-roms/intermediate-terrain.json`.
This independently confirms the cell coordinates. The same routines and
format serve Level 3 (`0x225ba`, 2 mini worms) and Level 6 (`0x225e2`,
4 worms). Both are exported too.

- **Activation is tied to the camera, not to marble distance.** A worm spawns
  when the scroll row becomes exactly `minRow` or `maxRow` and the previous
  row was outside the band. It despawns when the row leaves the band through
  the same edge (old row = min and new row < min, or old row = max and new
  row > max). On Level 2, row 0 is scroll −16152 (`0x2c54c + 0x10`, which
  equals `intermediateOpeningScroll` on `main`). Each row is 16 scroll lines.
- On spawn: state 0 (patrol), idle script, ticks per pose = 2, velocity 0,
  height = ground height, waypoint = entry 0.

## 5. States and timing [DECODED, 1 tick = 1 main-loop pass = 2 video frames = 1/30 s]

| State | Name           | Script (poses × ticks)                  | Exit                                                                                                                         |
| ----- | -------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0     | patrol         | idle `0x20c18` 11×2 = 22, walk 8×2 = 16 | Steps one cell at the end of each walk cycle. Then picks the next script and runs detection.                                 |
| 1     | attack/lunge   | `0x20cd8` 34×1                          | At the end: swallow, knockback or miss (see §7).                                                                             |
| 2     | bumped/sliding | `0x20d64` 1 pose, logic every tick      | Friction until stopped → 4. Higher ground ahead → 1. Lower ground (ledge) ahead → 4. The position is reverted in both cases. |
| 3     | returning      | walk scripts 8×**1** (twice as fast)    | Turns back to 0 when it reaches a waypoint.                                                                                  |
| 4     | brake          | `0x20dd8/dec/e00/e14` 4×2 = 8           | → 1. The script follows the dominant axis of the bump velocity.                                                              |
| 5     | eat            | `0x20e28` 30×1                          | Snaps to the cell center, kills the marble, → 3.                                                                             |
| 6     | recover        | `0x20d6c` 26×1                          | Snaps to the cell center, → 3.                                                                                               |

**Walking (`0x154a8`).** The worm moves one cell toward the current waypoint.
If its last vx was 0, it tries the X axis first, otherwise the Z axis first.
This gives the staircase path. Walk scripts: +X `0x20c48`, +Z `0x20c6c`,
−Z `0x20c90`, −X `0x20cb4`, none = idle. The velocity is ±8 units, and it is
added **once, at the end of the 8-pose cycle**. The sprite does the
inchworm motion and the position jumps by one cell when the cycle ends.
Patrol speed is 8 units per 16 ticks (15 units/s, or 1.875 cells/s at 30 Hz).
Durations at 30 Hz: idle 22 ticks = 0.73 s, walk step 0.53 s (0.27 s when
returning), brake 0.27 s, lunge 1.13 s, eat 1.0 s, recover 0.87 s.
When the worm returns to its spawn cell while walking, it plays the idle
script once (22 ticks).

**Inchworm geometry [DECODED].** Bytes 4..7 of each pose record give a hitbox
`(offset, size)` that stretches with the body. For +X, the hitbox x-span per
frame is: [−4,4] [−4,5] [−4,8] [−4,11] [−4,12] [−3,12] [0,12] [3,12], then
[−4,4] around the new cell (= [4,12] in the old frame). The front grows for
4 poses and the rear then catches up. This gives exact head and tail
positions, and `readWormPose` exposes them as `rear` and `front`.

## 6. Detection: when a worm attacks (`0x15670`) [DECODED]

The detection runs only in state 0, and only at the end of an animation cycle
(every 16 or 22 ticks). A marble is a candidate when all of these hold:

- It is active and on the same layer.
- It is **fast**: `|vx| + |vz| > 0xc000` (0.75 units/tick = 22.5 units/s = 2.8 cells/s).
- It is not falling (`$36 ≠ 2`).
- Its player state is 0, 1 or 5.
- No other worm is already in state 1 targeting it.

In 2P with two candidates, `0x15fe6` picks the leader: the larger
`cellX + cellZ`, or the higher layer. The target (`$56`) is stored even when
the marble is out of range. The lunge starts if the octagonal distance
`max + 3·(min >> 3)` (in 1/16 units) is in `(0x180, 0x280)`, which is
**between 3 and 5 cells**.

The speed condition is surprising: slow marbles do not trigger a lunge. I
re-checked the branch (`cmpi.l #$c000; ble skip`). This needs a MAME check.
Code at `0x157ba..0x15802` compares the marble and worm `x + z`, but its
result is overwritten at `0x15804`, so it has no effect.

## 7. The lunge [DECODED]

- `$27` counts ticks in states 1, 5 and 6. While `6 ≤ $27 ≤ 37`, the height is
  `ground + arc[$27 − 6]`, with arc `0x2255a` = 0, 5, 10 … 32 (peak at ticks
  20–21) … 2, −6, 0, 0 units. The arc lasts 32 ticks and continues into the
  eat or recover script.
- **Homing.** The worm homes only when the target is grounded (`$36 = 0`), at
  exactly the worm's ground height, and in player state 0, 1, 5 or 7. Each
  tick: `v = d/16`, then `v += (8·dir − v)/32`, where `d` is the vector to the
  marble. In effect the worm closes about 6% of the gap plus 0.25 units per
  tick. A move that would change the ground height is cancelled. Otherwise
  the velocity is 0 and the worm leaps in place.
- **End of the 34-pose script (`0x15316`)**, with distance L (octagonal, 1/16 units):
  - L > 2 cells on either axis → state 6 (miss).
  - L < 7 units → **swallow**. The marble moves to the worm, player state
    = 7 (hidden), worm state = 5.
  - 7 ≤ L < 12 units → **knockback**. The marble velocity becomes 4 units/tick (120 units/s)
    directed away from the worm. Worm state = 6.
  - Otherwise → 6.
- **End of eat (`0x153ea`).** The marble record gets `$57 = 0x65`, then
  `0x25bae(player, 4)`: velocity 0, player state 4 (rebuild/respawn, safe
  spot chosen by `0x2591a`), and the player's `$d2` counter is incremented.
  The worm snaps to its cell center, takes the nearest waypoint (`0x14dec`)
  and returns at double speed.

## 8. Contact with the marble (`0x14e92`) [DECODED]

- Boxes: the marble is `x ± 3`, `z ± 3`, `h .. h + 14` (integer units). The
  worm uses the current pose hitbox (or `(−4, −4, 8, 8)`) and `h .. h + 16`.
  A contact counts when one endpoint of the marble interval lies inside the
  worm interval, on each axis.
- Effects, for the first touching worm only:
  1. A worm in state 0 or 3 becomes **2 (bumped)**. It takes the marble's
     velocity, slides under friction (`0x25e7c` mode 2), brakes and then lunges.
  2. A worm in state 1 or 6 ignores its own target.
  3. Otherwise:
     - The marble's position goes back to its pre-move position and its
       velocity becomes 0 (the worm is solid).
     - If neither the marble (state 5) nor the worm (state 5) is busy, the
       worm targets this marble.
     - The marble becomes **dizzy**: player state 5, `$56 = 0x32` = 50 ticks (1.67 s),
       animation `0x20faa`. A marble already in player state 1 gets
       animation `0x20fb6` with no sound.

## 9. Despawn

Despawn happens only through the scroll band (§4). The worms are never
destroyed by the player.

## 10. What a renderer needs (`readWormPose`)

- `x`, `z`, `height` in arcade units, and `lift` (lunge height above ground).
- `heading` (same convention as `main`: +X = π/2, +Z = 0) and `rear`/`front`
  along the heading. These give the exact inchworm tail and head positions.
- `script`, `frame`, `frameCount`, `phase` (0..1 with sub-tick interpolation),
  `poseId` (ROM pose address, which identifies the arcade sprite) and `state`.
  `wormPose.ts` on `main` already maps state, script, frame and phase to mouth,
  tongue and flare. Its script constants are the same addresses
  (`WORM_SCRIPT_ADDRESS`).
- `vx`/`vz` (lunge direction) and `target`.

## 11. Inferred or adapted

- **Tick rate (now DECODED, corrected 2026-11-26).** The worm update runs once
  per pass of the main loop `0x11804`, and each pass waits for two VBLANKs
  (`0x28dea` at `0x118ba` and `0x118c8`; `0x400016` is incremented by the
  video interrupt handler `0x10116`, which acknowledges `0x8a0000`). So the
  logic runs at **30 Hz**, the same rate as the black-marble analysis. My first
  version assumed 60 Hz and was wrong. It can drop below 30 Hz only if a pass
  overruns two frames.
- **Player state names.** 1 = "dazed" (set by `0x25c74`), 4 = rebuilding,
  5 = dizzy, 7 = swallowed. Only 5 and 7 are set by worm code. The others
  come from `practicePose.ts` and need confirmation. `$36 = 2` is set when a
  drop makes the marble fall (`0x12464`).
- **Contact skip.** The module skips contact for a swallowed marble (state 7).
  The ROM gate in `0x123c8` (register `d3`) is not decoded.
- **Ground height.** The ROM compares 16.16 heights exactly. The module rounds
  ground heights to 16.16 and compares them exactly. For the marble's height
  it uses a tolerance (`playerGroundTolerance`, default 0.5 unit), because a
  physics marble never matches exactly.
- **Order within a tick.** Bands, then contacts, then worm updates. In the
  ROM the player update and the worm update are separate calls; I did not
  check their exact order.
- **Camera mapping.** The free 3D camera has no arcade scroll.
  `arcadeScrollForPoint` uses the projection decoded at `0x150d0`
  (`line = h + scroll + 0x54 − (x + z)/2`). Which screen line the arcade
  camera keeps the marble on is not decoded, so the default 120 is a guess.
- **Layer.** If the caller does not know a marble's `$1b` layer, it is treated
  as the same layer as every worm.

## 12. Sound cues (for Peter Salomonsen's review)

The module only reports these cues as `{ type: 'sound', command }` events. No
playback is implemented here; the `remaster-sfx-rom-extraction` branch owns
playback. All cues go through `0x158ac`, which drops the command when word
`0x4003b8 ≠ 0` (probably attract or silent mode, inferred) and otherwise
calls `0x23c`.

| Call site | Command | Trigger                                                                           | Timing                                                                                    |
| --------- | ------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `0x15076` | `0x39`  | The marble touches a worm and was not already dazed (state 1) or dizzy (state 5). | Same tick as the contact.                                                                 |
| `0x153a2` | `0x33`  | The lunge ends with the marble swallowed.                                         | 34 ticks (1.13 s) after the lunge starts.                                                 |
| `0x15884` | `0x3a`  | The eat script ends.                                                              | 30 ticks (1.0 s) after `0x33`.                                                            |
| `0x1589c` | `0x3b`  | Same moment as `0x3a`, skipped on level index 2 (Level 3).                        | Same tick as `0x3a`.                                                                      |
| `0x25c44` | `0x3c`  | Marble respawn after being eaten (`0x25bae` mode 4 with `$57 = 0x65`).            | Same tick as `0x3a`. The normal respawn sends `0x3d` instead (`0x25c54`, not a worm cue). |
