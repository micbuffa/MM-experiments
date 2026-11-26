# Level 2 Drawbridge and Pipes: 68010 ROM Findings (Issues #4 and #5)

Audience: Michel Buffa (gameplay review). Sound cues are listed separately at
the end for Peter Salomonsen.

Method: static disassembly of the `marble` program ROMs (MAME layout: BIOS
`136032.205/.206` at `0x00000`, `136033.623..630` and `.229` at
`0x10000..0x2ffff`, slapstic `136033.107/.108` at `0x80000`) with Capstone
(68010 mode). RAM offsets were cross-checked on `local-roms/intermediate-web.state`
(the level descriptor pointer `0x400474 = 0x2c54c` is at state offset `0x15b3`).
No emulator run was made for this work: everything below is either **DECODED**
(read from code or data at the given address) or **INFERRED** (deduction,
interpolation or cross-reference with earlier MAME observations). No ROM bytes
or disassembly dumps are committed.

## 0. Timing base (DECODED, important for everything below)

The main loop `0x11804..0x118ce` calls the game tick `0x1101e -> 0x10fce`
(marbles `0x251de`, objects `0x12fd0`) once, then waits for VBLANK twice via
`0x28dea` (the second wait is skipped only if a VBLANK already happened during
the tick, counter `0x400016` incremented by the IRQ at `0x10120`). **One ROM
tick = 2 video frames = 1/30 s.** All counts below are ROM ticks. This explains
the earlier MAME observation of a "144-frame" bridge cycle (73 ticks = 146
frames). The remaster simulation runs at 60 Hz, so the modules convert with
`ROM_TICK_HZ = 30` (`src/remaster/level2/romUnits.ts`).

## 1. Course objects of Level 2 (DECODED)

Course object lists: table `0x1dec0` (one pointer per course, indexed by the
course number at `0x400394`). Level 2 list `0x1df7a`, entries
`(scroll-window bytes, script pointer)`; scripts use the interpreter `0x12896`
(opcode `0` = spawn `x cell, z cell, height, kind, type`).

| Script    | Type   | Cell (x, z) | Height   | Role                                 |
| --------- | ------ | ----------- | -------- | ------------------------------------ |
| `0x1db12` | `0x03` | (61, 56)    | `0x3f88` | drawbridge (kind 2, animated script) |
| `0x1dd44` | `0x12` | (64, 78)    | `0x3f88` | drop-pipe mouth (entry)              |
| `0x1dd8c` | `0x15` | (67, 78)    | `0x3f30` | drop-pipe outlet body (collision)    |
| `0x1dd5c` | `0x13` | (81, 86)    | `0x3f30` | Y-pipe west arm (entry)              |
| `0x1dd74` | `0x14` | (87, 86)    | `0x3f30` | Y-pipe east arm (entry)              |
| `0x1dda4` | `0x16` | (84, 94)    | `0x3f00` | Y-pipe outlet body (collision)       |
| `0x1db94` | `0x10` | (105, 107)  | —        | area zone (cues `0x43`/`0x44`)       |
| `0x1d8ca` | `0x05` | (110, 109)  | `0x3ef4` | wall object (bump `0x42`)            |
| `0x1d8e2` | `0x05` | (114, 109)  | `0x3ef4` | wall object (bump `0x42`)            |

Zone objects live in 25 slots at `0x400a9c + n * 0x56` (`$c` x, `$10` z, `$14`
height, `$18` active, `$1f` type), the same layout as the Level 4 work. Each
tick, `0x29cce` tests every marble against every zone through the jump table
`0x29db4` (types `0x05..0x3b`). Type 3 (the bridge) is below that range: **the
bridge has no dedicated collision code**, it is pure terrain (section 2).

## 2. Drawbridge

### 2.1 Cycle (DECODED)

Script `0x1db1e` (after the spawn record):

```
loop forever                       op 4
  sequence = 0x21156 (raise)       op c
  play once, 2 ticks per entry     op 2  ($1c = 1, $23 = 2)
  sequence = 0x21192 (lower)       op c
  wait 15 ticks                    op 3
  play once, 2 ticks per entry     op 2
  sequence = 0x21156               op c
  wait 30 ticks                    op 3
end loop                           op 5
```

Playback (`0x13224`, advance `0x132e0`): each entry is shown for 2 ticks; each
sequence has 7 entries (steps 0..6, `0x21192` is the reverse of `0x21156`). The
script continues on the tick the sequence wraps. Resulting step per tick
`t` in the 73-tick cycle (`t = 0` = start of the raise, i.e. when the object
spawns):

| Ticks  | Phase    | Step                          |
| ------ | -------- | ----------------------------- |
| 0..14  | raising  | 0,0,0,1,1,2,2,3,3,4,4,5,5,6,6 |
| 15..28 | raised   | 6                             |
| 29..43 | lowering | 6,6,6,5,5,4,4,3,3,2,2,1,1,0,0 |
| 44..72 | lowered  | 0                             |

Period **73 ticks = 2.433 s**. Step 6 lasts 19 ticks (0.63 s), step 0 lasts
34 ticks (1.13 s) counting the 3 first ticks of the next raise.

The same object also animates the under-bridge mechanism tiles
(`0x40044a/0x400456`: list `0x211fe` 7 entries every 2 ticks, then reverse list
`0x2121e`, extra holds 15/30 ticks, same 73-tick period; `0x40044e`: 4 entries
every 3 ticks; `0x400452`: 6 entries every 3 ticks) and queues a palette shade
per step (`0x13402`: table `0x1df18` = `0,1,1,2,2,3,3` raise / `3,2,2,1,1,0,0`
lower, consumed by `0x26b88`). Presentation only.

### 2.2 Geometry per step (DECODED except where noted)

Each sequence entry is a (sprite frame, height patch) pair. Sprite frames
`0x21126/32/3e/4a` (4 poses, steps 0 / 1-2 / 3-4 / 5-6). Height patches
`0x1b908 + 0x1c * step` write 12 words to the terrain-code override table
`0x40076e..0x400785`, which `sampleCell` follows for codes `0x800..0xfff`
(already known: `0x772/0x774` are the `bridgeStep` words read by
`practicePose.ts`). Decoding the 0x1000+ codes (height = row base + `(code &
0x7f) - 0x40`, corner mask = bits 12..15, slope table `0x1ed62`) gives a deck
that tilts linearly about a hinge:

| Step | Row 1 cell (`0x77e`) | Row 2 (`0x778`) | Row 3 (`0x774`) | Free edge, row 4 (`0x770`) |
| ---- | -------------------- | --------------- | --------------- | -------------------------- |
| 0    | 0                    | 0               | 0               | 0                          |
| 1    | 1                    | 1               | 2               | 3                          |
| 2    | 1                    | 2               | 4               | 5                          |
| 3    | 2                    | 4               | 6               | 8                          |
| 4    | 3                    | 5               | 8               | 10                         |
| 5    | 4                    | 7               | 10              | **13 (INFERRED)**          |
| 6    | 4                    | 8               | 12              | 16                         |

(arcade height units above the hinge level; step 5 of the free edge uses a
level record code `0x0088` in the banked slapstic area, not resolvable
statically, so 13 is interpolated.) At step 6 the slope is 4 units per cell:
**max lip 16 units** (matches the earlier MAME observation), tilt about
**22.2°** in remaster world proportions (26.6° in raw arcade units).

Static parts of the patch (DECODED): override codes `0xefc8` / `0x6fxx` carry
**void corners** (no ground) on one long side of the deck at every step, and
`0x9axx/0x9bxx` codes carry a **44-unit cliff** on the other side. Which side
is which in world space is INFERRED from the existing survey
(`local-roms/intermediate-terrain.json`: void for x < 61, `-44` recess for
x ≥ 65) and from `createIntermediateBridge` (deck x 61..65, z 56..60, pivot
z = 60, so the free edge faces the approach at z = 56).

### 2.3 Crossing, rebound and fall rules (DECODED generic marble rules)

The ROM applies its ordinary terrain rules to the deck:

- **Wall / rebound** (`0x1c676` builds edge heights relative to the marble,
  `0x1b5c2` tests them): a vertical terrain edge whose top is **≥ 4 units**
  above the marble forces the velocity component away from it (`0x1b5a6` abs,
  `0x1b5b4` -abs: sign flipped, magnitude kept by this routine).
- **Take-off**: ground more than **8 units** below the marble while not in a
  pipe and not rising → airborne (`$36 = 2`), initial vertical speed
  `-0x6000` (16.16), cue `0x45` (`0x12450..0x12488`).
- **Void fall / vanish**: once the marble is more than **128 units** below its
  take-off height (`$2a - $14 > 0x800000`, `0x1269e`) → cues `0x3a/0x3b`,
  `0x46`, then vanish (`0x25bae` kind 4, cue `0x3d`), `$57 = 0x64` → respawn
  reassembly of **48 ticks (1.6 s)** (`0x13afc`).
- **Embedded**: ground more than **16 units** above the marble
  (`0x12250..0x1225a`) → cues `0x3a/0x3b`, `0x46`, vanish with cue `0x3c`,
  `$57 = 0x65` → **24-tick** reassembly.
- **Landing** after a fall: cues `0x46` then `0x5d`; the shatter decision is in
  `0x25c74` (not decoded here).

INFERRED application to the bridge (what `decideBridgeCrossing` implements):
the free-edge lip blocks when its rise above the marble is ≥ 4 units, so a
marble coming from the approach **can cross at steps 0 and 1 only** (lip 0 or
3 units): ticks 0..4 and 40..72 of the cycle (38 of 73 ticks). From step 2 (5
units) on it rebounds. Caveat: in the ROM the lip row is a steep slope tile
(`[h, h, 8, 8]`), not a vertical edge, so a fast marble might climb a little
before rolling back; the remaster can tune this with `wallStepUnits`. Leaving
the deck sideways is a fall: void side → vanish rule (no landing), cliff side
→ 44 units plus the deck rise, then the landing rule. Fall duration: the
marble's own gravity increment was not located; enemy actors use
`-0x6000` per tick with a `-5.0` units/tick cap (`0x18094`). If the marble uses
the same values (INFERRED), the 128-unit vanish drop takes about 32 ticks
(≈ 1.07 s).

## 3. Pipes

### 3.1 State machine (DECODED, extends `0x2a450..0x2a95c`, `0x2552c..0x255c2`)

At the trigger tick the handler, in this order: sets `$59 = 18`, writes the
exit velocity, chooses the exit (`0x17cb8`), **writes the exit position
immediately**, recomputes the cell (`0x1bab2`), sets the height to the terrain
height at the exit (`0x1cc62`), sets `$58` = zone type and `$1a = 3`, sends
cue `0x3a/0x3b` (`0x15884`) then `0x35`.

While `$1a = 3` (`0x25514`): no movement routine runs (only sprite projection
`0x1b9cc`, roll frame `0x1c014` and draw `0x1281c`); the draw routine `0x264aa`
**hides the marble** while `$58 != 0` and `$59 != 0xff`. `$59` is decremented
each tick; at 0 the score `0x285b0(table 0x23cd4[index])` is awarded, `$58`,
`$22`, `$26` and `$1a` are cleared, and normal physics resumes next tick with
the stored exit velocity. Timeline: hidden on the trigger tick plus 18 ticks,
**release after 19 ticks = 0.633 s**, physics frozen at the exit meanwhile.

Exit occupancy (`0x17cb8`, radius `0x70`): another marble or actor at less than
32 units on each axis with `16 * max + 3 * (2 * min) < 112` (units) → use the
alternate exit.

### 3.2 Per-pipe data (DECODED)

|                       | Drop pipe (zone `0x12`)                                              | Y-pipe (zones `0x13`, `0x14`)                                          |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Zone code             | `0x2a360..0x2a4b0`                                                   | `0x2a492..0x2a564`                                                     |
| Outer gate            | cells x 62..66, z 74..79 and height > `0x3f40`                       | units x ∈ [ox·8−31, ox·8+24], z ∈ [86·8−23, 86·8+16]                   |
| Solid part            | rim when height ≥ `0x3f78` (shape 0)                                 | pipe body anywhere else in the gate (shape 2)                          |
| Mouth                 | `0x3f60` ≤ height < `0x3f78`: horizontal speed zeroed, marble drops  | —                                                                      |
| Teleport trigger      | cells x 62..64, z 74..79, `0x3f40` < height < `0x3f60`, players only | z cell = 86 and x cells 79..81 (`0x13`) or 85..87 (`0x14`), any height |
| Exit position         | (524, 612) units = cell (65.5, 76.5); alternate (516, 612)           | (668, 740) = cell (83.5, 92.5); alternate (668, 732)                   |
| Exit height           | terrain height at exit (`0x1cc62`)                                   | same                                                                   |
| Exit velocity         | (+4.0, 0) units/tick = **15 cells/s along +X**                       | (0, +4.0) units/tick = **15 cells/s along +Z**                         |
| Extra                 | clears airborne byte `$36`                                           | —                                                                      |
| Hidden / frozen       | 19 ticks (0.633 s)                                                   | 19 ticks                                                               |
| Score at exit         | index 9 → 4000                                                       | index 5 → 2000                                                         |
| Outlet collision zone | `0x15` at (67, 78), shape 1 when height < `0x3f40`                   | `0x16` at (84, 94), shape 3                                            |
| Non-player actors     | `0x15bd0(actor, 1, 1)` instead of teleport                           | teleported like players                                                |

Collision shapes are box lists at `0x24c5e` (pointer per shape, boxes relative
to the zone position + 8); only their first boxes were read, the outer mesh
collider in the remaster is assumed to replace them. The score values are the
raw table words; that `$bc` is the score total is INFERRED from `0x28608`
(adds to `$bc`, sets the player's bit in `0x40039c`).

### 3.3 Approach B (real physics traversal) evaluation

Geometry checked: `local-roms/intermediate-terrain-pipes.json` (`pipes` block
parsed by `intermediatePipeGeometry.ts`), raw positions before
`fitIntermediatePipeHoods`. Remaster marble radius: 0.675 cells.

- The mesh is a **closed visual shell** (540 triangles) plus 12 "interior"
  triangles that are dark mouth caps, not a tube lining. A physics traversal
  needs a separate inner collider (inverted tube) with open mouths; the caps
  must not be colliders.
- **Drop pipe**: the vertical section has a median radius ≈ **0.60** cells
  (0.28..0.90), smaller than the marble radius. It does **not** fit without
  scaling the marble to ≈ 0.45 cells or widening the tube.
- **Y-pipe**: arms ≈ **0.9..1.1** cells radius, outlet ≈ 1.1: fits the
  0.675 marble with 0.2..0.4 cells of clearance (tight at the junction).
- Heights: drop-pipe top ≈ `0x3f88` (world y −12.25), bottom ≈ `0x3f30`
  (y −21.3): an 88-unit drop (≈ 9 cells of world Y). Y-pipe from ≈ `0x3f40`
  down to ≈ `0x3f00` at the outlet.
- A physics version must still **exit at 15 cells/s** (4 units/tick) along +X
  (drop pipe) and +Z (Y-pipe), from (65.5, 76.5) and (83.5, 92.5), after about
  0.63 s. Free fall through 9 cells of drop gives far more than 15 cells/s at
  the bottom, so the inner path would need damping or an exit speed clamp to
  match the arcade; the Y-pipe has almost no drop and would need a push.

Recommendation (INFERRED): keep Approach A (timed teleport) as the default; it
is exact, cheap and needs no new collider. Approach B is viable only for the
Y-pipe without changes to the marble scale.

## 4. Sound cues (for Peter Salomonsen's review)

All sent through `0x158ac(cmd)` (→ BIOS `0x23c`, skipped while `0x4003b8` ≠ 0).
Numbers are raw command bytes; their sample/effect identity is not decoded
here. Not implemented in this branch (owned by `remaster-sfx-rom-extraction`).

| Cmd             | Site(s)                                                                     | Trigger                                                                                                        | Timing                          |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `0x35`          | `0x2a46a`, `0x2a538`                                                        | marble swallowed by a pipe                                                                                     | trigger tick, after `0x3a/0x3b` |
| `0x3a`          | `0x15884`                                                                   | sent before pipe, embedded and void-fall cues                                                                  | same tick, first                |
| `0x3b`          | `0x15884`                                                                   | same, skipped when course index (`0x400394`) = 2                                                               | same tick, second               |
| `0x45`          | `0x12482`                                                                   | ground drops > 8 units: marble airborne                                                                        | take-off tick                   |
| `0x45`          | `0x255a4`                                                                   | catapult zone (`$58 = 0x0a`) countdown ends                                                                    | release tick (not Level 2)      |
| `0x46`          | `0x124ce`, `0x126b8`, `0x1226e`, `0x1cf6a`                                  | fall ends: landing, void vanish, embedded; `0x1cf6a` is a zone-collision path whose condition was not decoded  | that tick                       |
| `0x5d`          | `0x124da`                                                                   | landing (after `0x46`)                                                                                         | landing tick                    |
| `0x3d`          | `0x25c54`                                                                   | vanish (kind 4) after a void fall (`$57 = 0x64`)                                                               | same tick as `0x46`             |
| `0x3c`          | `0x25c44`                                                                   | vanish (kind 4) when embedded (`$57 = 0x65`)                                                                   | same tick as `0x46`             |
| `0x38`          | `0x25bdc`                                                                   | shatter (kind 2)                                                                                               | impact tick                     |
| `0x42`          | `0x29f96`, `0x29ff6`, `0x2a056`, `0x2a0b8`, `0x2a116`, `0x2a174`, `0x2a1d6` | bump on a wall object (types 5, `0x1a..0x1f`; Level 2 has two at (110,109), (114,109))                         | contact tick                    |
| `0x43` / `0x44` | `0x2b19c` / `0x2b1ee`                                                       | entering / leaving an area zone (types `0x10`, `0x17`, `0x18`, `0x32..0x37`; Level 2 type `0x10` at (105,107)) | transition tick                 |
| `0x10`          | `0x124fc`                                                                   | landing when course index = 3 and `$1b` = 4                                                                    | landing tick                    |
| `0x31`          | `0x12b2e`                                                                   | script op 8: marble within 3 cells of an object (not used by Level 2 scripts read here)                        | —                               |
| `0x60`          | `0x12a78`                                                                   | script op 2 on a catapult (type `0x0a`)                                                                        | —                               |

The drawbridge script sends **no** sound command (no op 8 / op 2 on a catapult).
Pipe exit sends **no** cue (only the catapult exit does, `0x45`).
