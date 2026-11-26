# Level 2 black marble: 68010 AI reverse-engineering (issue #1)

For Michel Buffa. Branch `remaster-l2-black-marble-ai`. Pure TypeScript port in
`src/remaster/level2/`. The integration guide for the Level 2 scene is in
[level2-black-marble-integration.md](level2-black-marble-integration.md).

All addresses refer to the 68010 program image built from `roms/marble.zip`
using the layout in `src/emulation/marble-roms.json` (`136033.623..630` at
`0x10000..0x2ffff`, `136033.107/108` at `0x80000`). The analysis is static
disassembly (Capstone, M68K_010). No ROM bytes or dumps are committed.

Legend: **[D]** = decoded from ROM (address given). **[I]** = inferred or
guessed, still needs checking in MAME.

## 1. Where the black marble lives

- **[D]** Object table `0x1eff6`: P1 `0x400018`, P2 `0x4000fa`, enemy marble
  slots `0x4009a4` and `0x400a20` (stride `0x7c`), worms `0x401302..`. The four
  "marbles" that collide with each other are listed at `0x24ac6`.
- **[D]** Enemy record fields (same layout as players for `+0x00..+0x1a`):

| Offset              | Meaning                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `+0x00/+0x04/+0x08` | velocity X/Z/Y, 16.16 arcade units per tick                        |
| `+0x0c/+0x10/+0x14` | position X/Z/height, 16.16 arcade units (`>>19` = cell)            |
| `+0x18`             | 0 free, 1 active, 2 dying                                          |
| `+0x1a`             | AI mode: `0x20` patrol, `0x21` attack, `0x22` chase, `0x23` return |
| `+0x1b`             | enemy zone (from the spawn table, never updated for enemies)       |
| `+0x36`             | ground state (`!= 0` in the air, `2` = falling)                    |
| `+0x68`             | desired speed (16.16 units/tick)                                   |
| `+0x6c`             | give-up timer (word): `-1` disarmed, counts down to 0              |
| `+0x6e` / `+0x72`   | current node pointer / node graph base                             |
| `+0x76` / `+0x78`   | scroll rows that keep the enemy alive                              |
| `+0x7a`             | targeted player index                                              |

- **[D]** Timing: the main loop (`0x11804..0x118ce`) waits for two VBLANKs
  per iteration (`0x28dea`), so **the game logic runs at 30 Hz**. Speeds below
  are "units per tick". 1 cell = 8 units, so 1 unit/tick = 3.75 cells/s.
- **[I]** `intermediateActors.ts` only reads `0x400a20` as "black". The
  spawner fills `0x400a20` first, then `0x4009a4` (`0x1599a`). On Level 2 the
  second enemy (section 3) therefore probably lands in `0x4009a4`, which the
  emulator reader ignores.

## 2. Per-frame call chain

`0x10fe0 → 0x158cc` loops over both enemy slots and calls `0x158f6`:

1. **[D]** `0x15904..0x1592e`: if `$6c > 0`, decrement. When it reaches 0 in
   attack or chase mode, call `0x160d4` (return mode).
2. **[D]** `0x15954`: a dying enemy (`$18 == 2`) only plays its death script
   (`0x25fc2`, `0x1b9cc`, `0x1281c`).
3. **[D]** Otherwise `0x253bc` (animation), **`0x182ba` (AI + steering)**,
   then `0x121b8` (shared marble physics, terrain, collisions, integration
   `pos += vel` at `0x122ac`).

## 3. Spawn, activation and despawn (scroll band)

- **[D]** `0x15a12(oldRow, newRow)` runs each time the screen scroll
  `0x40097c` changes (`0x14460`). Row = `(scroll - descriptor.$10) >> 4`
  (`0x144e4`), stored in a signed byte. Level 2 descriptor `0x2c54c` gives
  `$10 = -16152`.
- **[D]** Per-level table `0x22706`, 8-byte records `{A, B, graph.l, zone, 0}`.
  Level 2 has two (`0x22726`, `0x2272e`):

| Enemy         | Graph     | Zone | Spawns when the row enters   | Removed when the row leaves |
| ------------- | --------- | ---- | ---------------------------- | --------------------------- |
| Black marble  | `0x2276e` | 1    | 0 or 31 from outside 0..31   | below 0 or above **15**     |
| Second marble | `0x227c2` | 7    | 15 or 40 from outside 15..40 | below 15 or above 40        |

The `0x2276e` graph is special-cased (`0x15a9a..0x15aa6`: `$78 = B - 16`).

- **[D]** At level start `0x105dc` calls `0x15a12(scroll - 25, scroll)`, so the
  black marble **spawns immediately** at node 0. Spawn (`0x15a74..0x15b2a`):
  position = node 0 cell centre (`cell << 19 + 0x40000`), height = ground
  (`0x1cc62`), velocity 0, mode `0x20`, `$6c = -1`.
- **[D]** A spawn needs a free slot (two slots) and a graph not already in use
  (`0x159d8`). Removal by scroll gives no points (`0x15bd0(.., 0, 1)`).
- **[I]** Row 16 (black marble removal) is reached roughly when the leading
  player reaches the bottom of the descent corridor (about cell x = 43). This
  comes from `estimateLevel2Scroll`, which assumes a fixed screen height for
  the player. The real camera has a dead zone (`0x1f1d0 = 0x48`,
  `0x1f1d2 = 0xa8`), so allow about ±3 rows.

## 4. Course zones: the "lower descent boundary"

- **[D]** Zone tracker `0x1365c`, players only (`0x123be` skips it for
  enemies). Table pointer `0x1eb16[level]`; Level 2 = `0x239fa`. The records
  are 6 bytes long. `b0 ≥ 0`: a column `x = b0`, `z = |b1|..b2`. `b0 < 0`: a
  row `z = |b1|`, `x = |b0|..b2`. When a marble **leaves** a segment cell, it
  takes zone `b4` if the new cell is beyond the line, otherwise `b3`. Zone
  `0xff` is the GOAL (`0x1379a`).
- **[D]** Level 2: the start area is zone 0. It becomes zone 1 across `z = 25`
  (x 15..18 and 25..28). **Zone 1 becomes zone 2 when the marble leaves the
  column `x = 30`, `z = 34..37`, toward +x**, i.e. going down the slope
  corridor. The full table is `LEVEL2_ZONE_BOUNDARIES`.
- **[D]** The black marble only targets players in its own zone, zone 1
  (`0x15e58..0x15e60`). This is the behaviour the issue calls the "lower
  descent boundary". As soon as the player passes x = 30 → 31, the black
  marble loses its target. It goes to return mode and climbs back to its
  plateau loop. It never targets a player in zone 2. If the player climbs
  back above x = 30, the black marble engages again (until it gives up, see
  section 6).

## 5. Node graph of the black marble (`0x2276e`)

**[D]** Records `{x, z, link0..link3}` in cells, terminated by `0xff 0xff`. The
steering target is the cell centre (`+0.5`).

| #     | Cell        | Links   | Role                                        |
| ----- | ----------- | ------- | ------------------------------------------- |
| 0     | (40,35)     | 1 1 1 1 | spawn, bottom of corridor                   |
| 1     | (36,35)     | 8 8 8 8 | corridor                                    |
| 8     | (28,35)     | 7 7 7 7 | corridor                                    |
| 7     | (25,35)     | 6 6 6 6 | top of corridor                             |
| 6     | (22,35)     | 5 4 4 4 | plateau entry                               |
| 2     | (25,31)     | 3 5 4 6 | patrol loop                                 |
| 3     | (22,30)     | 4 2 5 5 | patrol loop                                 |
| 4     | (19,31)     | 5 2 3 6 | patrol loop                                 |
| 5     | (22,32)     | 2 3 4 6 | patrol loop                                 |
| 9..12 | (26..23,34) | → 7 / 6 | re-entry points used only by "nearest node" |

The patrol path follows `link0`: 0 → 1 → 8 → 7 → 6 → 5 → 2 → 3 → 4 → 5 → 2 …
**The whole climb uses row z = 35, the middle of the 3-cell corridor
z = 34..36.** No link leads from the plateau back down past node 6, so in
chase mode the black marble never goes back down the corridor. Only attack
mode (a player within 5 cells) can pull it below node 6.

## 6. State machine (`0x15db6`, `0x15e24`, `0x1605c`, `0x160d4`)

**[D]** Each tick:

1. **Arrival** means the enemy cell equals the current node cell. Arrival in
   `0x23` switches to `0x20`. While in `0x23` the AI only re-selects the
   nearest node every tick (`0x15d10`).
2. **Eligible players**: active, same zone, not falling (`$36 != 2`), state
   0/1/5. With two eligible players, it targets P2 only if `x + z` (in cells)
   is strictly larger, i.e. further along the course (`0x15fe6`).
3. **Mode decision** uses the octagonal distance `max + 3·(min >> 3)` to the
   target:
   - no eligible player → `0x20` patrol (`0x23` is kept);
   - distance < 40 units (5 cells) and the enemy is on the ground and
     (`$6c != 0` or zone 7/9) → `0x21` **attack**;
   - otherwise if `$6c != 0` → `0x22` **chase**;
   - otherwise → `0x20` patrol.
4. **Mode change**: leaving `0x21` calls `0x160d4` (→ `0x23`, nearest node,
   speed 7). Any other change forces a re-plan.
5. **Re-plan** (on arrival or after a change): speed `$68` = 7 patrol,
   12 attack, 8 chase, 7 return. Next node = `link0` in patrol, and in chase
   the link whose node is closest to the player (`0x15c46`). Attack and return
   keep the current node.

**[D] Give-up timer.** The first marble-to-marble contact (`0x1bf4c`) sets
`$6c = 150` ticks (5 s). Every contact sends the enemy to `0x23`. (The ROM
writes `0x24` first, but `0x160d4` overwrites it right away, so the `0x24`
branches at `0x15930` and `0x183e2` look unreachable from these writers.)
When the timer reaches 0 in attack or chase mode, the enemy returns. After
that, `$6c == 0`: **the Level 2 black marble (zone 1) only patrols for the
rest of its life.** The zone 7 marble (and the Level 6 zone 9 marble) still
attack inside 5 cells.

## 7. Steering, speed and acceleration (`0x182ba`, `0x26196`)

- **[D]** Target: the player in attack mode (if still active, in the same zone
  and in state 0/1/5), otherwise the current node centre.
- **[D]** Direction = `delta / octagonal(delta)`. Closer than 4 units (half a
  cell) → `$68 = 1.0`. This value persists until the next re-plan.
- **[D]** Desired velocity = `$68 · direction`. Each tick
  `vel += (desired - vel) / 32` (first-order tracking, time constant 32 ticks
  ≈ 1.07 s). No steering while `$36 == 2`. In the air, gravity is
  `-0x6000/tick`, clamped at `-5`.
- **[D]** Speed clamp `0x26196`: octagonal norm ≤ 5.0 units/tick for enemies
  (4.0 for state-0 players). The desired speeds (7/8/12) are **above** the
  clamp, so mostly the acceleration differs between modes:
  7/32 ≈ 0.22, 8/32 = 0.25, 12/32 ≈ 0.375 units/tick² from rest.

| Quantity                      | Arcade               | Remaster units |
| ----------------------------- | -------------------- | -------------- |
| Patrol / return desired speed | 7 u/tick             | 26.25 cells/s  |
| Chase                         | 8 u/tick             | 30 cells/s     |
| Attack                        | 12 u/tick            | 45 cells/s     |
| Near target                   | 1 u/tick             | 3.75 cells/s   |
| Speed clamp                   | 5 u/tick (octagonal) | 18.75 cells/s  |
| Tracking gain                 | 1/32 per tick        | 0.9375 s⁻¹     |
| Attack radius                 | 40 units             | 5 cells        |
| Give-up timer                 | 150 ticks            | 5 s            |

## 8. Collisions, death and score

- **[D]** Marble contact `0x1bc88` (4 marbles on Levels 2/4/6): `|dx|,|dz| ≤ 7`,
  `|dh| ≤ 14`, octagonal distance < 7 units, ignoring states 2/4/0x0b. The two
  marbles swap their horizontal velocities. Then each one gets a per-axis push
  away from the other, `table0x24ad6[|v|] / 16` units/tick (8,8,9,9,10,11,12,13).
  The push is ×4 when one marble is a player and the other an enemy.
- **[D]** Squash (`0x1bfba..0x1bff0`): if the processed marble is in the air
  and its height is ≥ the other one's, an enemy underneath dies (`$18 = 2`,
  1000 points to every active player). A player underneath is crushed.
- **[D]** Fall: ground − enemy height > 16 units (`0x1225a`) → the enemy is
  removed and every active player gets 1000 points (score table `0x23cd4[3]`).

## 9. Why the Remaster black marble stalls on the left wall (recommendation)

I could not reproduce this here (the Level 2 scene is not on this branch).
This is an analysis of the terrain and of the ROM behaviour.

**[D] Terrain** (`intermediate-terrain.json`, rows z = 33..37): the corridor
covers z = 34..36. It goes from x = 24 (height 16340) down to x = 43 (16280),
4 units per cell. On the **−z side (screen left, since screen x = z − x)**,
cells z = 33 are the plateau at 16348, with a face going down to the corridor.
That wall grows from about 4 units at x = 24 to 44 units at x = 34. On the +z
side the corridor ends in a drop (no tile for x ≤ 33).

**Probable causes [I]:**

1. **Steering straight toward the patrol zone.** Aiming from (40,35) at the
   patrol zone (z ≈ 30..32) puts a constant −z component into the force. That
   component presses the marble into the z = 33 wall over the whole climb. The
   ROM never does this: it follows nodes 0 → 1 → 8 → 7 → 6 exactly on the
   corridor centreline z = 35.5 and only turns toward −z at node 6, where the
   wall has disappeared (x ≤ 23).
2. **Friction.** The arcade has no Coulomb friction against walls. Havok
   friction (stone `0.22`) times the into-wall force gives a drag that, added
   to the downhill gravity, can cancel a small uphill force.
3. **Too weak a force.** In the arcade the AI is a velocity-tracking
   controller with a desired speed (7) above the clamp (5), so it keeps
   pushing even at full speed (`(7 − 5)/32` units/tick²). A fixed small force
   or a force that tends to 0 near the target speed cannot hold a slope plus
   wall friction.
4. **Half-cell offset.** Using node cells without `+0.5` moves the path
   0.5 cell toward the wall. The smoothed slope/wall seams of
   `buildCollisionMesh` can then reach the body.

**How the controller handles it:**

- Follow the ROM node graph (built in). The climb stays on z = 35.5.
- `wallSlide` (default on): when the scene passes `wallNormal`, the into-wall
  component of the steering is removed, so the marble slides along the wall
  instead of pressing into it.
- Stall watchdog: after `stallTicks` AI ticks below `stallSpeed` while
  steering, `stalled = true` and a release push (`stallPush`) is added along
  the wall normal and toward the target.
- `slopeCompensation` (0..1, default 0 = arcade): cancels part of the
  downhill pull that the scene reports in `slopeAcceleration`.
- Recommended physics setup (scene side): a black-marble body material with
  **friction 0 and `PhysicsMaterialCombineMode.MINIMUM`** against walls. Apply
  `desiredForce` at the centre of mass, and clamp the velocity with
  `clampEnemyVelocity` / `maxSpeed`.

## 10. Sound cues (for Peter Salomonsen's review)

These are the sound commands I came across in the routines above. They are
listed only; nothing is implemented on this branch (`remaster-sfx-rom-extraction`
owns playback). All commands go through `0x158ac(cmd)` → BIOS `0x23c`. The
command is dropped while the word `0x4003b8 != 0` (boot mute timer, set to
`0x12c` at `0x10100`). Timing is the 30 Hz tick in which the event is
detected. The meaning of each command on the sound CPU is **not** decoded
here.

| Call site             | Command                                                                                        | Trigger                                                                                        | Timing / notes                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `0x1bf9c`             | `0x32`                                                                                         | marble contact where at least one marble is an enemy (player ↔ black marble, or enemy ↔ enemy) | each tick the overlap test in `0x1bce0` passes; velocities are swapped in the same tick, so usually a single tick |
| `0x1bfac`             | `0x37`                                                                                         | player ↔ player contact                                                                        | same test as above                                                                                                |
| `0x1bfe4` → `0x15884` | `0x3a`, then `0x3b` (`0x3b` skipped only when level index `0x400394 == 2`, so sent on Level 2) | a falling marble lands on a **player** (squash by the black marble)                            | same tick, followed by `0x25bae(player, 2)`                                                                       |
| `0x12268` → `0x15884` | `0x3a`, `0x3b`                                                                                 | player falls more than 16 units (not the enemy)                                                | same tick as `0x46` below                                                                                         |
| `0x12274`             | `0x46`                                                                                         | player fall/break (shared physics routine, players only)                                       | right after `0x3a/0x3b`                                                                                           |
| `0x137fe` → `0x15884` | `0x3a`, `0x3b`                                                                                 | player enters zone `0xff` (GOAL)                                                               | followed by `0x158ac(table 0x1ef72[player])` at `0x13874`                                                         |
| —                     | none                                                                                           | enemy destroyed by falling (`0x1229e`) or squashed (`0x1bfd2`)                                 | these paths only award score. The death script `0x25fc2/0x1281c` was not analysed for sound                       |
| —                     | none                                                                                           | spawn, despawn, mode changes, give-up timer                                                    | no sound command in `0x15a12`, `0x15bd0`, `0x15e24`, `0x182ba`                                                    |

## 11. Open points

- **[I]** Check the scroll ↔ world approximation (section 3) against a MAME
  probe of `0x40097c` while descending the corridor.
- **[I]** Check in MAME whether the second Level 2 enemy lands in slot
  `0x4009a4` and whether it is visible (it is not read by
  `intermediateActors.ts`).
- The arcade "ground state" `$36` has more values than the two booleans
  exposed (`airborne` for self = `$36 != 0`, for players = `$36 == 2`).
- The death animation scripts (`0x25fc2`, `0x1281c`) were not decoded.
