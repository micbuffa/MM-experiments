# Ice Zones (Level 2 and Level 6): ROM Decode and Remaster Rules

Issue #6. Written for Michel Buffa (physics review) and, for the
"Sound cues" section only, Peter Salomonsen.

All addresses refer to the 68010 program space of the `marble` set
(`roms/marble.zip`, layout in `src/emulation/marble-roms.json`; program ROMs
interleaved as in MAME: `136033.623/624` at `0x10000`, `625/626` at `0x18000`,
`627/628` at `0x20000`, `229/630` at `0x28000`). The ROM was disassembled
statically with Capstone (68010 mode). Marble Love
(`magno73/marble-love@113cf5d`, already cited in `docs/PROTOTYPE_04.md`)
was used as a map to find routines. Every claim marked **decoded** was checked
against our own disassembly. Claims marked **inferred** were not.

## Summary

| Question                         | Answer                                                                             | Status                                      |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| How does the ROM know about ice? | Not from tiles or heights. Ice is a rectangular **zone object** with a type tag.   | decoded                                     |
| Level 2 ice cells                | One zone, tag `0x10`: arcade cells **x 90..105, z 94..107** (16 × 14 = 224 cells). | decoded                                     |
| Player input on ice              | **Fully ignored** (not scaled).                                                    | decoded                                     |
| Friction / drag on ice           | **None at all.** The friction routine is skipped.                                  | decoded                                     |
| Slope gravity on ice             | **Still applies.**                                                                 | decoded                                     |
| Wall bounces on ice              | Unchanged (same code path as normal ground).                                       | decoded                                     |
| Sound                            | Command `0x43` on entering, `0x44` on leaving.                                     | decoded (what they sound like: not checked) |
| Same routine for Level 6?        | Yes. Level 6 has six ice zones (tags `0x32..0x37`), same code.                     | decoded                                     |
| Control recovery                 | Next frame after the marble's cell leaves the zone (1/60 s).                       | decoded                                     |

## 1. How the ROM identifies ice

The height map (`local-roms/intermediate-terrain*.json`, read with the
terrain lookup at `0x24B3A`) holds only heights. The playfield tiles only
draw the cyan ice. The physics never reads them for ice.

Instead, each course has a **spawn list** of zone and actor scripts
(**decoded**):

- `FUN_00012DFA` reads the course word `0x400394` (0 = Practice ... 5 =
  Ultimate) and picks a list from the pointer table at `0x1DEC0`
  (`0x12E06..0x12E14`).
- A list entry is 6 bytes: two scroll-row bytes (spawn/despawn window) and a
  script pointer. The script is bound to a free slot of the 25-slot table at
  `0x400A9C` (stride `0x56`) by `FUN_00012F44`.
- Script opcode 0 (`0x128FC..0x1294E`) loads the slot: x cell (word,
  `<< 19`), y cell (word, `<< 19`), z (word, `<< 16`), a flag byte into `+0x1E`
  and the **type tag** into `+0x1F`.

Every frame, for each moving object, `FUN_00029CCE` (called from
`FUN_000121B8` at `0x12368`) does the zone test (**decoded**):

1. Saves the old zone byte `+0x58` in D3 and clears it (`0x29D32..0x29D36`).
2. For each active slot: `D1 = (slot.x >> 3) - marbleCellX`,
   `D2 = (slot.y >> 3) - marbleCellY`. The marble cell words `0x400696/698`
   are `position >> 3`, written by `FUN_0001BB50` through `FUN_0001BAB2`
   (`0x12324`, `0x12354`), so they are up to date for this frame.
3. Jumps on the tag through the table at `0x29DB4`. The ice handlers copy
   the tag into `+0x58` and write `0xFF` into `+0x59` when the marble is
   inside.

The ice handlers and their shapes (**decoded**):

| Tag    | Handler   | Test                           | Shape                |
| ------ | --------- | ------------------------------ | -------------------- |
| `0x10` | `0x2A1E4` | `0 <= D1 < 16`, `0 <= D2 < 14` | 16 × 14 rectangle    |
| `0x17` | `0x2A210` | `D1 == 0`, `-18 < D2 <= 0`     | line, 1 × 18 along z |
| `0x18` | `0x2A234` | `-18 < D1 <= 0`, `D2 == 0`     | line, 18 × 1 along x |
| `0x32` | `0x2A258` | `0 <= D1 < 4`, `0 <= D2 < 2`   | 4 × 2                |
| `0x33` | `0x2A284` | `0 <= D1 < 2`, `0 <= D2 < 4`   | 2 × 4                |
| `0x34` | `0x2A2B0` | `0 <= D1 < 8`, `0 <= D2 < 11`  | 8 × 11               |
| `0x35` | `0x2A2DC` | `0 <= D1 < 3`, `0 <= D2 < 8`   | 3 × 8                |
| `0x36` | `0x2A308` | `0 <= D1 < 6`, `0 <= D2 < 3`   | 6 × 3                |
| `0x37` | `0x2A334` | `0 <= D1 < 2`, `0 <= D2 < 3`   | 2 × 3                |

Because `D = slot - marble`, the script's cell is the **maximum** corner of
the rectangle.

### Exact cells (arcade cells; x = column, z = row of the terrain JSON)

Arcade cell x = position x `>> 3`; arcade cell z = position y `>> 3`. On
Level 2 and Level 6 the terrain JSON has origin (0, 0), so these are the
row/column indices of `local-roms/intermediate-terrain*.json`. A cross-check:
the Level 2 GOAL flag zones of the same list (tag `0x05` at (110, 109) and
(114, 109)) match `intermediateGoal` (`x = 110, z = 109`) in
`src/rendering/intermediateFinish.ts`.

| Course     | Tag    | Script    | Spawn rows | Cells (inclusive)    |
| ---------- | ------ | --------- | ---------- | -------------------- |
| 2 Beginner | `0x10` | `0x1DB94` | 41..64     | x 90..105, z 94..107 |
| 4 Aerial   | `0x17` | `0x1DBAC` | 0..3       | x 22, z 9..26        |
| 4 Aerial   | `0x18` | `0x1DBC4` | 0..3       | x 10..27, z 23       |
| 6 Ultimate | `0x32` | `0x1DBDC` | 0..16      | x 40..43, z 33..34   |
| 6 Ultimate | `0x33` | `0x1DBF4` | 0..20      | x 40..41, z 41..44   |
| 6 Ultimate | `0x34` | `0x1DC0C` | 16..48     | x 69..76, z 71..81   |
| 6 Ultimate | `0x35` | `0x1DC24` | 16..48     | x 77..79, z 71..78   |
| 6 Ultimate | `0x36` | `0x1DC3C` | 25..48     | x 88..93, z 104..106 |
| 6 Ultimate | `0x37` | `0x1DC54` | 25..48     | x 84..85, z 93..95   |

Courses 1, 3 and 5 have no ice zone.

Notes:

- **Level 2**: the painted ice in the current scene
  (`intermediateIce`: x 90..105, z 95..106) is the floor of the ROM zone. The
  ROM zone adds row z 94 and row z 107, which have no complete floor cell in
  the survey. They only matter for a marble in the air above the rim.
- **Level 6**: zones `0x34` + `0x35` together cover the ice diamond plateau
  (x 69..79, z 71..81) except its lower-right corner x 77..79, z 79..81. The
  hand-mapped visual ice in `level6DisplayTerrain.ts` (strips x 42..45,
  z 33..34 and x 40..41, z 42..45) is offset by 1 to 2 cells from the ROM
  strips; the ROM values above should win for physics. The `0x36` block matches exactly.
- **Level 4 (Aerial)**: tags `0x17`/`0x18` get the same no-input,
  no-friction treatment, at the start of the course (two crossing lines of
  18 cells). What they look like on screen was not checked (**inferred**:
  probably the narrow start beams, not visible ice).
- Zones exist only while their slot is active. The spawn rows (first column
  of the list entry) are scroll rows. **Inferred**: the zone is always active
  when the marble can reach it, because the screen follows the marble.

## 2. What the 68010 physics does on ice

Per frame, a player marble runs (player state dispatch near `0x25730`):
`FUN_000253BC`, then the input routine `FUN_00017F66`, then the object update
`FUN_000121B8` (pointer loaded at `0x25402`). Inside `FUN_000121B8`:
integrate velocity, update the cell (`FUN_0001BAB2`), zone scan
(`FUN_00029CCE`), friction, slope gravity.

### Input: fully ignored (decoded)

`FUN_00017F66` reads the zone byte `+0x58` (`0x17F9A`). It adds the trackball
delta (`+0xC6/+0xC7`, times `0x160`, `0x18018..0x1808C`) only when the byte is
0 or one of the Level 6 friction tags `0x3B, 0x2D, 0x2E, 0x38, 0x39, 0x3A,
0x2F, 0x30, 0x31` (`0x17FA8..0x17FF2`). Any other tag, including all ice
tags, branches to `0x1808E`, which adds nothing to the horizontal velocity.
Input is not scaled; it is skipped.

### Friction: none (decoded)

`0x12744..0x127EA` maps the zone byte to a friction mode for `FUN_00025E7C`:

| Zone byte                               | Mode   | Effect in `FUN_00025E7C`                     |
| --------------------------------------- | ------ | -------------------------------------------- |
| 0 and any other tag                     | 0      | speed -= f(speed)                            |
| `0x2D, 0x2E, 0x3B`                      | 2      | speed -= 4 × f(speed)                        |
| `0x2F, 0x30, 0x31`                      | 3      | x: 5 × f, y: 1 × f (ribbed slopes, inferred) |
| `0x38, 0x39, 0x3A`                      | 4      | speed += f / 4                               |
| **ice: `0x10, 0x17, 0x18, 0x32..0x37`** | `0xFF` | **call skipped (`0x127EA`)**                 |

`f(speed)` is a speed-dependent amount read from the table at `0x1EEF8`
(`0x200, 0x400, 0x700, 0xC00, 0x1000, 0x2000, 0x3000, 0x4000, 0x5000...`,
indexed by speed `>> 15`, interpolated). On ice nothing is removed, so speed
and direction stay as they were when the marble entered.

This friction skip does not test the player flag, so it also applies to
enemy objects that run `FUN_000121B8` (for example the black marble on the
Level 6 ice diamond).

### Slope gravity: still applies (decoded)

`0x127FE..0x12814` calls `FUN_00025DF6` for players whatever the zone byte.
`FUN_00025DF6` subtracts the terrain gradient `0x4006A4/0x4006A6` (height
differences computed by `FUN_0001CC62`, `0x1CC98..0x1CCD0`) shifted left by 11
from the velocity, × 4 when the gradient is 12 or more. On Silly Race
(`0x400394 == 4`) it adds instead. Note: Marble Love calls this routine
"trackball apply"; our disassembly shows that its inputs are height
differences, not trackball counts.

So on the Level 2 basin the marble keeps sliding, and the slope of the bowl
still bends its path.

### Walls (decoded)

The bounce at the end of `FUN_00029CCE` (`0x2B1F8..0x2B226`: restore x or y
and negate vx or vy) does not depend on the zone byte.

### Timing of entry and exit (decoded)

Input (`FUN_00017F66`) runs **before** the zone scan of the same frame, so it
uses the zone byte of the previous frame. Friction runs **after** the scan.

- Entering: on the frame where the marble's cell enters the zone, that
  frame's input is still applied, and friction already stops. From the next
  frame, input is ignored.
- Leaving: on the frame where the cell leaves, friction is back and input is
  still ignored for that frame. Control returns on the next frame (1/60 s).

### Same routine for Level 6 (decoded)

Yes. Every check above lists the Level 6 tags `0x32..0x37` next to `0x10`.

## 3. Remaster module

New pure files (no BabylonJS, no Havok), covered by the `engine/**`
coverage gate:

- `src/remaster/engine/romSurfaceZones.ts`
  - `ROM_ICE_ZONES`: the table above, with tag, script address, anchor and
    inclusive bounds.
  - `isIceCell(course, cellX, cellZ)`, `iceZoneAt(course, cellX, cellZ)`.
    `course` is 1..6 (Practice = 1), as in `RemasterLevelV1.courseIndex`.
  - `arcadeCellAt(layer, worldX, worldZ)`: Remaster world position to arcade
    cell, using the layer's `columns`, `rows` and `origin`.
  - `isIceAtWorld(level, worldX, worldZ)`: uses `level.courseIndex` and
    `level.heightLayers[0]`.
- `src/remaster/engine/surfaceRules.ts`
  - `resolveSurfaceRules({ surface, force, grounded })` returns
    `{ steering, force, linearDamping, angularDamping }`. Normal ground:
    force unchanged, `stone.linearDamping` (grounded) or `airLinearDamping`
    (air), angular damping 2.0, which are the values Level 1 used before. Ice:
    `steering: false`, zero force, zero linear and angular damping.
  - `surfaceLinearDamping`, `surfaceAngularDamping`: allocation-free
    versions for the per-step loop.
  - `surfaceTransition(previous, next)`: `'enterIce'`, `'leaveIce'` or
    `undefined`, for effects such as the sound cue.

The function does not take the velocity: the decoded rule does not depend
on it. Velocity is kept because nothing removes it (no damping, no input),
while Havok gravity on the slope and wall contacts still act, as in the ROM.

### Hooks already added (small, isolated)

- `remasterSimulation.ts`: before `applyPlayerForce`, the simulation calls
  `resolveSurfaceRules` with `isIceAtWorld(level, p.position...)` and skips the
  force on ice. `p.position` is the previous step's position, so this matches
  the ROM order (input uses the previous frame's zone).
- `createHavokBackend.ts`: after each step, linear and angular damping come
  from `surfaceLinearDamping` / `surfaceAngularDamping` for the new position
  (ROM: friction uses the current frame's zone). On normal ground the values
  are the same as before, so Level 1 is unchanged.

### Tests

- `romSurfaceZones.test.ts`: exact Level 2 bounds (corners in, neighbours
  out, 224 cells), no ice on courses 1/3/5, Level 6 and Level 4 zones, world to
  cell conversion.
- `surfaceRules.test.ts`: normal values, ice values (grounded and in the air),
  transitions.
- `iceSurface.integration.test.ts`: the simulation with a point-mass backend
  on a 130 × 130 course-2 level: steering before the ice; on ice the force is
  zero and the velocity stays exactly the same under constant input; the
  crossing step still takes the input, the next one does not; control and
  damping come back on the first step after leaving.

## 4. Integration note for the Level 2 scene

1. Build the Level 2 `RemasterLevelV1` with `courseIndex: 2` and, as
   `heightLayers[0]`, the intermediate terrain grid with origin
   `{ x: 0, z: 0 }` (`practiceCompleteOrigin`), 130 columns and rows. Then
   nothing else is needed: the simulation and Havok backend hooks pick the
   ice up through `isIceAtWorld`.
2. If the level uses another `courseIndex` or a cropped/offset layer, call
   `isIceCell(2, cellX, cellZ)` with arcade cells yourself.
3. Optional, visual only: the floor collider is one aggregate with stone
   friction (0.22). With zero damping the marble keeps rolling at constant
   speed on flat ice. If you want it to slide rather than roll, give the ice
   cells (x 90..105, z 95..106) their own floor aggregate with
   `REMASTER_PHYSICS.surfaces.ice.friction`.
4. Sound: call `surfaceTransition(previous, current)` once per step per
   player and forward `'enterIce'` / `'leaveIce'` to the audio side. Playback
   is owned by the `remaster-sfx-rom-extraction` branch.
5. The ice rule does not cap speed (the speed cap is inside
   `applyPlayerForce`, which is not called on ice). This matches the ROM,
   which has no friction there.

## 5. Sound cues (for Peter Salomonsen's review)

All commands go through `FUN_000158AC` (sends the byte to the sound CPU
through the BIOS routine at `0x23C`, unless the mute word `0x4003B8` is set).
Playback is not implemented in this branch.

| Address   | Command | Trigger                                                                                                                                                                                        | Timing                                                                                                                                              | Status                                 |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `0x2B19C` | `0x43`  | Object's zone byte becomes an ice tag (`0x10, 0x17, 0x18, 0x32..0x37`) and was not one before.                                                                                                 | Once, on the frame the cell enters the zone. Moving between two ice zones (Level 6 `0x34`/`0x35`) plays nothing. Per object (P1 and P2 separately). | decoded                                |
| `0x2B1EE` | `0x44`  | Zone byte was an ice tag and no longer is.                                                                                                                                                     | Once, on the frame the cell leaves.                                                                                                                 | decoded                                |
| `0x17698` | `0x5E`  | Marble box overlaps an active slot of the `0x401482` table in `FUN_000175C8`, only on courses 3 and 6 (`0x400394` = 2 or 5). That table holds the acid/amoeba pools (`intermediateActors.ts`). | First overlapping slot, on the frame of the hit.                                                                                                    | decoded call; meaning inferred         |
| `0x12A78` | `0x60`  | Script opcode 2 on a slot whose tag is `0x0A` (Aerial catapult).                                                                                                                               | When the script reaches the opcode.                                                                                                                 | decoded call; meaning from Marble Love |
| `0x2571A` | `0x53`  | Player state set to 8 (`0x25708`; magic wand bonus per `docs/ANIMATION_AUDIT.md`).                                                                                                             | Once on entry to state 8.                                                                                                                           | decoded call; meaning inferred         |

What `0x43` and `0x44` sound like was not checked (the 6502 sound program was
not decoded). These are the only sound commands tied to ice.
