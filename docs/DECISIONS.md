# Decisions and Evidence

## Remaster SFX from the Sound ROM, ymfm OPM — November 26, 2026

### SFX source

Issue #2 asks for the original Marble Madness effects. The issue text
mentions "POKEY sound effects", but the ROM tells a different story.

- **Chip usage.** Most gameplay effects are YM2151 FM programs; only four are
  POKEY (0x5D landing, 0x5E acid, 0x5F broom, 0x60 catapult).
- **No useful parameters on the 68010.** The 68010 program only sends a
  command byte, so it holds no sound parameters to extract.
- **Decision.** Capture each effect by running the 6502 sound program, and
  store tick-quantized register streams (`rom-sfx.json`). The alternative,
  reimplementing the sound driver's bytecode interpreter, was not chosen.

Evidence and addresses are in `docs/ROM_SFX.md`.

### FM core

The clean-room FM core had linear-amplitude envelopes and no DT1/DT2 or LFO,
all of which the ROM programs use. It is replaced by ymfm (pinned commit
`81aec25`, BSD-3), the FM core used by MAME. POKEY stays clean-room and now
implements AUDCTL (clock select, 16-bit joins, high-pass) and the eight AUDC
distortions.

### Rolling rumble

The arcade has no rolling sound. The remaster rumble therefore moves to a
third, low-passed POKEY so it never alters the ROM-faithful SFX POKEY.

### Two layers

Cue mapping (`soundCues.ts`) is kept separate from rendering
(`SoundCueBackend`), so that Peter Salomonsen's WebAssembly-music backend can
replace the ROM backend later.

## Level 5: Bird Death and Squashes — November 22, 2026

The official [MAME Atari System I driver](https://github.com/mamedev/mame/blob/master/src/mame/atari/atarisy1.cpp)
configures the hardware; the `marble` function notably configures Slapstic 103.
Gameplay sequences are studied in the local 68010 program:
contact `0x19e14`, player state 11, counter 102; dispatcher `0x254ba`,
handler `0x25876`, fragments `0x13ade`. Glyph positions are read
from the player's MO groups, without simulating a new explosion.
Their clipping remains that of the core. The rotation of 3D fragments is fixed per
ID; no Babylon timer is added.

The native probe also confirms the squash lists: black marble 0x21f7a/7e/82
then 0x21f8a, worm 0x21a62, amoeba 0x21efe. The presentation uses two compression
stages for the black marble then the final mesh; the other two squashed models
remain fixed like their native sprites. The palette, positions,
collisions, delays, and reconstruction remain in the core.

## Level 5: Native Pools and Reference Patterns — November 22, 2026

The 68010 routines `0x19024..0x19244` initialize/update nine miniatures
at `0x401890`, stride `0x28`, types 7/8/9. `0x19a40..0x19d8e` manages ten birds
at `0x4019f8`, stride `0x38`. A Chrome probe on the pinned core confirms these
bases, movements, and states. The lists `0x224ca`, `0x224d6`,
`0x224e2`, and `0x22546` govern their phases; the display does not replay them
with an independent clock. The MAME driver is not presented as
the gameplay rules code.

Michel explicitly requests the original position of the circles/ellipses.
The repeating pattern from Rolling Madness is therefore not suitable as the primary
source. A mask of the pigments from the original PNG is projected into the
isometric coordinates verified on the start and GOAL; the hues are
taken from the core's palette. The reference does not provide information on hidden
faces. The towers keep two facets per pyramid quarter, including
at the NE/SW corners which require the other diagonal.

## Preserving Y-Pipe Topology — November 22, 2026

The original local Y-pipe is closed (352 triangles, each edge shared by two
faces); splitting and then replacing the caps created open edges.
The rendering now uses a subdivision with protected lips, followed by a
continuous deformation of the whole mesh. The two skins are no longer flattened
separately. Normals are averaged on coincident vertices, without
changing the arcade core or the extracted file. Geometry checks and
internal views complement the rendering tests; see the new local audit
`scripts/audit-intermediate-pipe.mjs` and `docs/VALIDATION.md`.

## Procedural Vacuum Tremor — November 21, 2026

Michel explicitly preferred a procedural reconstruction over the
`hoover_on` / `hoover_down` meshes from Rolling Madness. Their files remain local
references and are not added to the rendering library.

The active table for type 0x0b uses two entries at `0x22016` / `0x2201a`
(pointing to two distinct sprites), then the sentinel; the one for type
0x0d is at `0x220a6` / `0x220aa`. `readLevel4VacuumMouthFrames` recognizes
these entries in the emitted image field object+0x42, rather than in the next
field object+0x3e. Openings and retractions do not select this
small head deformation. The frequency, pause, and transitions remain
those of the core. The 3D amplitudes are a presentation adaptation,
without claiming identity between every vertex and every pixel of a sprite.

## Hammers: Displayed Image and Exact Table — November 21, 2026, 18:35

The table `0x22346..0x2237e` contains 15 pointers for 9 distinct sprites.
Their relative order is `0,1,2,3,3,4,5,6,7,7,7,7,8,1,0`; the repetition of
the strike is intentional. This sequence is shared by the imported mesh
and the procedural fallback in `level4HammerSpriteSequence`.

The scripts `0x1d40c`, `0x1d43e`, etc. run this table once with a
cadence of two native updates per entry. `0x12a86..0x12ab2` initializes
the counter and stride; `0x13224..0x132a2` waits for the counter, emits the image
via `0x13334`, then advances the pointer via `0x132e0`.
**`0x13440` stores the pointer actually emitted at object+0x42**: reading
object+0x3e after this update already selects the next entry.
The hammer reader is fixed and its test explicitly differentiates
these two fields.

Retracted wait times depend on the chosen group: 30/60 updates for
the first group, 25 for the second, 90 with initial offsets for the
following ones. Neither this cadence nor zone-based triggering is recreated in
BabylonJS. Scroll-based creation and waking objects in zone 10,
via `0x13966..0x13a7e`, remain those of the original program. The audit is done
on the local 68010 disassembly; it does not assume that the MAME driver
implements these gameplay rules. The new probes do not add full
played-traversal proof to the creation proof already recorded below.

## Level 4 Hammers: Native Sources — November 21, 2026

Rendering follows the core's objects; no BabylonJS clock triggers a
strike in gameplay mode, including with procedural fallback meshes.

Evidence in the local 68010 program:

- `0x144e4..0x14572` converts the old and new scroll into 16-pixel
  slices and calls `0x12dfa`. The Level 4 table at `0x1dfd4`
  contains an entry `40..64` with no single script. `0x12e4a..0x12ea6`
  then selects one of four groups of four scripts, via the native
  generator `0x13a98` and table `0x1ded8`. Creation therefore follows scrolling,
  and not directly the Euclidean distance of the marble.
- The scripts initialize X=105 and Z=102/104/106/108. Opcode `0x11`,
  interpreted at `0x12c84`, puts the object on wait (state 4) with zone 10.
  On a player zone change, `0x13966`, then
  `0x13a24..0x13a7e`, resumes waiting objects whose zone matches.
- Then the native loops alternate the strike table `0x22346..0x2237e`
  and the retracted image `0x20c14`, with the wait times specific to the chosen group.
  Objects are not put back on wait simply because the renderer
  moves away: their lifetime remains that of the arcade core.
- `0x12904..0x12920` shifts script coordinates by 19 bits: integer
  positions in RAM are equal to eight times the tile number. The previous
  reader looked for 102/104/106/108 directly and missed the real slots.

Local probe MAME 0.271, TTL BIOS, on November 21: after controlled scroll
movement, four objects of type `0x0c`, zone `0x0a`, image `0x20c14`
were observed. Integer X=840 for all four; Z=864,848,832,816, i.e.
tiles 108,106,104,102. This probe confirms creation and units.
Zone activation and loops were verified in the disassembly;
the probe that wrote the player zone directly bypassed the transition
routine and did not constitute a native traversal test.

Matching the 15 arcade frames to the Rolling Madness model poses
remains a visual adaptation; the schedule and activation are read from RAM.
A full game played by Michel remains necessary to evaluate the strike
and collisions together.

## November 19, 2026 — Broom, Synchronized Bridge, Pipe Shadows, and Visual Feedback

- **Intermediate Race Articulated Bridge**: MAME RAM dumps (`/tmp/mm-worm-reference/ram-*.bin`,
  frames 2450–3296) show that `word(0x772)` is `0x6fc8 + 2 * step` and `word(0x774)`
  is `0xf048 + 2 * step` for `step = 0..6` (7 native steps from 0 to 16 arcade units,
  `0xf040` before activation at frame 3054). Live mode drives `createIntermediateBridge`
  via `setIntermediateBridgeStep` without an autonomous loop.
- **Broom (`player_broken`)**: dumps `/tmp/mm-animation-review/broken/ram-*.bin`
  confirm `long(base + 0x72)` (`0x20fde + 4 * primaryIdx`, 0..31), `byte(base + 0x7f) === 1`
  from `primaryIdx === 9`, and `long(base + 0x7a)` (`0x215f6 + 4 * broomIdx`, 0..43).
  The `broom.jpg` group is aligned to `y = -5.67` (model ground) and scaled to `0.84`.
- **Pipe Shadows on Blue Walls**: the main sun (`intermediateSunDirection`)
  has `toSun.z = -0.372 < 0` (behind the `+Z` walls located behind the two pipes).
  A static directional light (`intermediate-pipe-wall-light`, `includedOnlyMeshes = [cliffs]`,
  `REFRESHRATE_RENDER_ONCE`) projects shadows from `intermediate-pipes-shell` to the right
  onto the blue walls without altering the measured pyramid shadows or self-shadowing the cliffs.
- **Out of Time / Game Over in 3D**: `mode === 4` is maintained in `readModernPhase` /
  `readPracticePose` and the `OUT OF TIME` / `GAME OVER` banners are read from alpha-RAM
  `$A03000` (rows 4..27) for overlay display on the 3D HUD.

## November 19, 2026 — Marble Paint and Visibility

Shared paint for normal/dizzy/broken states is generated in code.
The private model UVs go up to V=2; WRAP is required on albedo
and emissive marks. The normal model is converted by the same local
script as the morphs. No material is created per frame.

Walls remain grouped for rendering. A dithered fragment corridor avoids
splitting the cliff into thousands of meshes or making the entire
race transparent. It modifies neither geometry nor collisions. API verified in
local BabylonJS 9.33.2 sources: `MaterialPluginBase`,
`getUniforms().externalUniforms`, `registerForExtraEvents`,
`hardBindForSubMesh`, `getCustomCode`. Activation must follow registration
of extra events. The Chrome test checks rendered pixels,
including restoration outside the corridor. The shader short-circuits computation
when its weight is zero.

Score/time messages are decoded from the native auxiliary notice:
0x223aa = 1000 points, 0x2243a = −5 SEC, 0x22446 = +10 SEC.
They are never inferred from a counter variation. The wand is
reconstructed in thin geometry, driven by the native script; its triggering
and the actual time addition belong to the original core.

## Ice Finishing Touches and Rolling Madness 3D Models

The bowl survey and arcade projection allow connecting the
light and dark reflections to their silhouette on the capture. Seams
remain on top of these patterns. The flat area adds a
diagonal dither. Physical reflection is attenuated to avoid
flat light patches that followed triangles vertically. On the
cliffs, the edges of the drips and the blue wall share the same
vertices and vertical seams are textured.

In the Rolling Madness 3D installer, `actor/bridge.txt` calls
`lev2_bridge.ase.mesh` in a loop. Its 6,032 vertices are distributed across
16 poses for a UV set of 377 vertices and 264 triangles. It
notably references `bridge_side.png` and `bridge_down.png`.
The `lev2.ase.mesh` mesh has 88 triangles with the
`lev2_tile_glass.png` material. The installer also contains
`lev2_glass_env.png`, a reflection texture. The study rendering
uses the arcade surveys and patterns recreated from the captures.

Perspective framing behind the marble follows the direction of
recent movements. It keeps its heading when stopped and rises if the
surveyed terrain passes too close to the lens.

## Intermediate Race Ice and Finish

The ice boundaries are X 90–105 and Z 95–106. The GOAL marking
occupies tiles X 110–113 and Z 109–118. These boundaries come from
re-aligning the surface groups of Rolling Madness 3D, visually checked
against the arcade capture. The ice material combines a traced turquoise
texture, a stylized reflection, and specular lighting. The marking and the
blue-and-black checkerboard of the flags adapt the Practice Race functions.

The bottom of the pipes now follows the paving geometry at its joints.
Only the shell casts a shadow inside the pipe. The piston is recentered on
the purple tile and the turquoise edge is entirely under the deck.

## Intermediate Race Shadow Direction and Pipe Exits

In the native capture at 306 px scroll, the apex of the central
pyramid projects to (159,65) and the tip of its shadow to
(238,84). The ground under the shadow is 34 arcade units below the apex,
including 8 for the base. Inverting the isometric projection gives
a horizontal offset of about −54.5 units in X and +24.5 in Z.
The Level 2 directional light uses this vector. Cliffs
receive shadows and the map remains unblurred. The bias is tuned
after comparing four settings in Chrome.

The terrain paving passed above the imported gray floor in both
mouths. A matte coating now follows the ground slopes
under the mouths and stops at their threshold. The pyramid cap
keeps its seams and rounds its profile near the apex.

## Bridge and Pipe Finishes, Final Bowl Seam

The normals of the Rolling Madness 3D mesh are continuous along
the cylinders. Local preparation transforms them by the inverse
transpose of the alignment and normalizes them. The welds are narrow
strips cut onto the shell. The floor of both exits is gray.
The turquoise bridge texture is generated with a light border and
rivets. The piston, collars, wheel, and linkages use
the same pose as the deck.

At the landing near the first pipe, the isolated corner of three tiles took
the height of the neighboring level. All four corners now follow the
landing. On the final descent and around its bowl, the shared
vertex is used to join the tiles while preserving their openings.

## Direct Race Access via Web State

The pinned MAME 2003-Plus core advertises state support.
In Chrome, `gameManager.getState()` produced 1,106,168 bytes at the
start of Practice Race. After an injected position offset in an
isolated test, `loadState()` restored the position and descriptor
on the next pass of the core. A synchronous check immediately
after the call had failed. The race selector needs states
produced by this same core at the start of each race and a check
of the descriptor after restoration.

## Wave Seams and Bridge Volume

On the waves, the north corners give the measured longitudinal profile.
The south corners of some tiles kept another height,
producing cliff triangles between lanes. The presentation
extends the measured profile across the full width of these lanes and joins
their low exit while preserving the gaps. The deck now has
thickness and its purple base, wheel, and piston are in 3D volume.
The piston remains readable in a dedicated low framing.

## Intermediate Race Articulated Bridge and Shadows

Frame-by-frame surveying under MAME 0.271 identifies a four-by-four-tile
deck, from X 61 to 64 and Z 56 to 59. The hinge at Z 60
remains at 16264. The free edge rises 16 units, pauses, then
lowers. The pose repeats after 144 frames. Adjacent cells
confirm the gap at X 60 and the low platform at 16220 at X 65.
The BabylonJS version reconstructs the purple mechanism visible on the
capture with a piston, a wheel, and a textured base.

The directional shadow generator includes cliffs in addition to
towers. The paving receives shadows from pits and slopes.

## Continuous Junctions on Intermediate Race Cliffs

The lateral boundary of the survey keeps cells according to their origin
up to a difference of 21 between X and Z. Full cells at the boundary
formed a staircase. `intermediateRims` cuts their outer corner
along the common diagonal. The wall rising from this edge follows the same path
at the foot of the cliff. Series of three-corner tiles along
straight ledges restore their fourth corner in their plane.

## Intermediate Race Pyramids

The three footprints in the survey follow four rows of 3, 4, 4, and
3 tiles. The last row starts one tile further than the first.
The top of the bases is at 16272. The stone model uses two
beveled corners to match the footprint and taller lower faces.
The cap seam is placed 17 units above the base and the
tip at 26, according to the proportions of the arcade capture.

## Intermediate Race 2 × 2 Blocks

The four groups of isolated blocks around the ramps follow
2 × 2 tile footprints. In the survey, the front row is missing one
corner per tile. At block (63,42), the lateral boundary of the survey also
cuts a column. The study recreates each top at the height of its
first tile, then the cliff generator closes its perimeter.

## Intermediate Race Pit and Cliff Ledges

The survey crosses some ledges diagonally. Mixed heights
within a tile cut the tops of the five pits and the edges of the
platform into triangles. The surveyed dimensions give five rectangular
ledges of 6 × 4 tiles on the periphery. Their interior follows
the sloped ground profile. Straight cliff sections and
isolated platforms recover their corners before vertical extrusion.
The seam at the first row of the large ramp uses its measured profile.

## First Survey of Intermediate Race

MAME 0.271 switches to descriptor `0x2c54c`. Its relative field `0x18`
gives 216 diagonals. The Practice Race height decoder provides
a 130 × 130 cell grid for Level 2. The scroll word
ranges from −16152 to −15846 during replay. The same coordinate frame as Practice Race
projects the blue marble at the start and during the descent. Vertical
data reaches 16097, i.e. 287 units below the reference plane.

The presentation recreates the three lanes of the cross ramp with the
profile read on their edges and places pyramids on the surveyed bases
around (45,45), (54,43), and (43,54). Raw data remains in
`local-roms/` and terrain edits are limited to rendering.

In P1's state block, byte `0x400032` is 5 at frames 3077–3177
during interaction with a green creature. It is 7 at frames
3205–3264 during the marble's disappearance, then 4 during its
reconstruction. Frame 3060 displays "1000" points. Extended replay
until timer expiration did not reproduce the wand or allow
isolating the broom. The time-bonus trigger remains to be surveyed.

## Two-Player Catch-Up Message

In MAME 0.271, P1 scrolls the course and P2 stays behind.
At frame 1468, the core deducts five seconds from P2 and prepares its
respawn. In P2's block, relative word `0x88` stays at
`0x00ff` during reconstruction, then its high byte increases
up to 40 after returning at frame 1516. It returns to `0xffff` at
frame 1684. A fall into the void keeps `0xffff`. Signed relative
byte `0x80` provides the horizontal motion of the "−5 SEC" text.
The modern view displays the bitmap in the player's color during
this window, once the marble is visible. The core state sets the duration,
about 2.8 seconds in this replay.

The timer reserves one column at the end of each 16-pixel cell
to separate the black borders of adjacent digits.

## Two-Player Finish and Retro Paving

Under MAME 0.271, the P1-then-P2 replay crosses the finish at frames
1863 and 1919. With the reverse order, P2 then P1 arrive at frames
1891 and 1941. Captures show a blue GOAL in the first case and
red in the second, including after the second pass. In both
replays, 68010 byte `0x4003a4` is `0xff` before the finish, then
stores the first player's index `0` or `1`. The modern view reads this
index to recover the palette even after the first marble disappears
or when entering 3D view mid-race.

In the framing of the final descent, the bottom of the orange walls
remains below the arcade image. The mesh extends the exposed cliffs
in this area, keeping their top edge and the steps from the
survey. The retro grain is baked into a 16 × 16 tile texture, with nearest-neighbor filtering on magnification and interpolation of
mipmap levels at a distance.

## 3D Pose Precision at Low Speed

An impulse followed by a release in MAME 0.271 gives Z values
174.211 → 173.649 → 174.093 while the marble settles. Reading
only the integer word caused a 174 → 173 → 174 back-and-forth. The adapter
now keeps the fractional word on all three axes for both
marbles. Reconstruction receives the same precision for its anchor.
Full coordinates feed the marble and the follow camera
with no filtering delay. Scrolling keeps its independent word.

## Marble Reconstruction and Practice Race Shadows

In the MAME 0.271 replay, animation state `4` prepares the marble at the
respawn point. When the draw flag turns to 1, relative word
`0x6e` counts down from 47 to 1, then becomes 0 upon returning to the rolling state.
For P2, this phase lasts from frame 1457 to 1550. The scene keeps
the core's respawn point. Frame-by-frame solo replay shows eight
shards orbiting counterclockwise. At counter 16, their ellipse measures about
100 × 50 native pixels, and its center is about 16 pixels above
the respawn point. The 3D view approximates the measured positions in the
camera plane. Both radii and the vertical offset decrease
with the counter. Shards are displayed starting at counter 45,
when they begin to be visible in the solo replay.
Solo replay confirms the same relative counter for P1, with 47 at
frame 1452 and return to the rolling state at frame 1546.

Both pyramids use the same builder. In the survey,
tiles `(25,30)` and `(26,30)` of the right landing are missing a corner.
Paving reconstruction fills in the missing corners of tiles
sampled over the shared footprint of both landings.

The sun keeps the previous azimuth and goes from about 17° to 24°.
On a horizontal surface, the ray reach is about 32%
shorter. The generator uses `FILTER_NONE` for crisp edges.
Marbles are added to its list only when the option is
enabled in the modern view.

## Two Players and Rendering Continuity After a Jump

In MAME 0.271, the player count at `0x400396` is 2 in two-player mode.
The second record starts `0xe2` bytes after the first.
P2's X, Z, and height are at words `0x400106`, `0x40010a`, and
`0x40010e`. P2's ID is 1 at `0x400113`. Visibility and
animation bytes remain relative to this record.
A P2 fall followed by reconstruction (`4`) was observed
with the first slot still active.

On the two-player alpha layer, scores start at columns 3 and 32
and timers at columns 13 and 25. P2's tiles carry a palette
offset of `0x0400`. Tests use different values for
the two players.

In Michel's video, around 22.5 s, the arcade continues while the
3D panel displays the fallback message. The video does not contain the
RAM words that would isolate the exact rejection. The full survey
now bounds framing to the measured range and allows a six-tile
margin for airborne marbles. A marble's visibility flags and
coordinates drive its own mesh. The descriptor and
global mode determine course availability.

## Practice Race Start Flyover

In the MAME 0.271 replay, global mode `5` starts at frame 712.
Start framing and P1's first active slot meet
at frame 778, then global mode switches to `0` at frame 1030. Between these
two states, 68010 byte `0x400014` advances from `0x42` to `0x3d` with
a pass through zero. `practicePose` exposes a 0-to-1 progress
during this solo countdown.

The perspective trajectory starts from an overview framing, sweeps the
terrain, and joins the marble. Follow and top-down views keep the
same horizontal direction as the arcade framing during gameplay.
The 35° to 85° setting changes the vertical field of view of perspective views
and the scale of the orthographic projection. The central value of 55°
preserves the reference arcade framing.

## Practice Race Start Lift

In the MAME 0.271 replay with no input after Start, 68010 terrain entries
`0x40076e` and `0x400774` are at `0xf040` on flat ground. The five
codes of the first word are `0x20c2`, `0x2245`, `0x244a`, `0x254e`, and
`0x25d0`. The second word repeats the same code with bit `0x4000` set.
The rise is observed at frames 1339, 1343, 1347, 1351, and 1355, then
the tile returns flat at frame 1565. The view reads this pair in memory
on every Practice Race snapshot.

Measured profiles along X on tiles 16 to 18 are
`[2,0,0,0]`, `[5,0,0,0]`, `[10,0,0,0]`, `[14,4,0,0]`, and
`[16,6,2,0]` in arcade height units. The presentation mesh
extends this profile over three tiles along Z to achieve a continuous
slope and closes exposed edges. MAME advances the marble and
chooses the duration of each phase.

## Practice Race Score and Timer

The MAME 0.271 memory map exposes the `alpha` tile layer at 68010
addresses `0xa03000–0xa03fff`. The same block starts at `0x1fc3650` in the
`HEAPU8` of the Web core validated by `CORE_WASM_SHA256`. Comparing the
word sequence of the SCORE label, the score, and the timer confirmed this
match. The grid has 64 words per row and words are little-endian
in WASM.

In the solo UI, score characters are below the SCORE label,
starting at column 3 of row 2 (zero-based indices). The two
timer digits each occupy 2 × 2 tiles starting at columns 19 and 21,
on rows 1 and 2. The four codes of a digit range from
`0x2900 + 4 × digit` to that same code plus 3. The value change
every 60 frames, finish, and expiration at 00 were observed
in native replays. In the modern view, the value already produced by
the arcade is displayed read-only. An unknown tile sequence is
hidden. The score preserves the game's thousands separator.

## P1 Pose in the Web Core

In the binary validated by `CORE_WASM_SHA256`, 68010 RAM words
start at `0x1d99478` in `HEAPU8`. Words are little-endian. 68010
longs keep the high word first. The descriptor at `0x474` is
`0x2bee2` for Practice Race. The high words of P1 object fields
at `0x24`, `0x28`, and `0x2c` give X, Z, and height. The probe only
exposes the pose in the gameplay mode observed in solo, with the expected
object counter and the first slot active. Reading happens after a
core iteration from the existing video path.

The signed word at `0x97e` is `-16144` (`0xc0f0`) at the start. Replaying
the first scroll under MAME 0.271 shows the image shifting up
by one native pixel per unit, with an apparent 2 to 3 pixel gap
between RAM and video rendering on compared frames. The 3D view
frames each pose from the word of the same iteration. The range
used goes from `-16144` to `-16069`, bounds observed in replays.

Shadows of posts and pyramids on the starting arcade capture
stretch to the right and slightly downward. The directional light
of the modern view adopts this direction, with soft filtering
and moderate intensity for the marble.

## P1 Fall and Respawn

68010 byte addresses `0x400032` and `0x400034` correspond to
indices `0x33` and `0x35` from the WASM base. During normal play,
the pair is `(0, 1)`. Switching to `(0, 0)` coincides with the
disappearance observed in the arcade. Reconstruction takes place in
`(4, 0)` then `(4, 1)`, at the respawn point coordinates. The
full sphere and its shadow reappear upon returning to `(0, 1)`.
The 3D view represents this animation as a marble-free interval.
It continues reading the scroll across the four observed states.
An active pose outside the survey or an unknown state restores
the arcade display.

## Practice Race Finish

Under MAME 0.271, the scroll word reaches `-15784`, i.e. 360 pixels
from the start. In Chrome with the pinned Web core, the validated
trajectory reaches `-15785`. The byte at `0x400032` is 6 upon entering
the finish zone. The marble pose remains available in global mode 0 during this pass.
Global mode 3 opens the summary. The view then hands control back to the arcade,
which continues when `0x2c54c` (Intermediate Race) becomes active.

The full survey uses `practice-terrain-v2` with origin (0, 0),
91 × 91 cells, and framing range up to `-15784`. The v1 format
keeps origin (10, 11) and its range up to `-16069`. Both
formats use the same units and terrain conversion rules.

## P2 Controls

In the pinned build, the RetroArch Web driver answers the mouse query
with the same state for every port. However, the MAME core accepts each port's
D-pad for its digital trackball inputs. Local testing measured
a step of nine counter units per frame for a held direction
(digital step of 30 with sensitivity at 30%).

The glue installs a filter in the WASM table at slot 490, identified as
`rwebinput_input_state` from RetroArch 6dd4353 in the SHA-256 verified binary.
The filter restricts `RETRO_DEVICE_MOUSE` queries to port 0 and relays
other calls to the driver. The P2 keyboard sends D-pad directions to port 1.
Animation uses the digital step configured by the Atari driver for P2
and the deltas sampled by the Web driver for P1.

## Atari System I Cabinet — November 13, 2026

The SketchUp model provided by Michel identifies Gozer as author and matches
the [3D Warehouse Marble Madness cabinet](https://embed-3dwarehouse-classic.sketchup.com/model/0a8f07a9-4747-47e3-84c9-9c2b81f99cd5/Marble-Madness-arcade-game).
OpenSKP 1.3.0 read the geometry and UVs of the SketchUp 2021 file and produced
an intermediate GLB. Final parts use VertexData, with four
local WebP textures and cabinet actions attached to clickable zones.
The marquee material is emissive. Artwork includes the blue trim, the
two blue and red marbles, and the circular grilles from the reference photos.
The live core texture fills the monitor opening tilted at 11.2°.
Source details are listed in [the asset registry](../public/assets/README.md).

## 3D Trackball Rotation Direction — November 10, 2026

Euler rotation accumulated two angles of the mesh. A prior rotation
could therefore tilt the apparent axis of the next gesture. The vertical sign
also rolled the top toward the screen when the finger moved toward the
bottom of the trackpad. The quaternion composes each increment in the
cabinet's axes. The top follows the lateral gesture, and rolls toward the player when
the finger moves down. The visual cap of 45° per sample prevents a large
delta from making nearly a full turn between two displayed orientations.

The arcade driver already converts pointer coordinates to the two
trackball counters of the program with a sum and a difference. See
the [port readings](TRACKBALL_PORTS.md). The fix acts on the mesh,
after native sampling. Deltas sent to the core keep their
coordinate frame and amplitude.

## Prototype 03 — Positional Audio and Cadence

The pinned local archive `mame2003_plus-wasm.data` contains the wrapper
`mame2003_plus_libretro.js`. Inspection of the wrapper shows that creating
the OpenAL context calls `ac.createGain()` then
`gain.connect(ac.destination)`, and stores this node in `AL.currentCtx.gain`.
OpenAL sources converge to this master. The positional branch replaces
this link during exploration, in the original context. The Chrome
OfflineAudioContext test compares both channels before, during, and after
routing. The real core produced a measurable signal on this branch.

Capped DPR reduces the 3D canvas area. The video texture, trackpad
gain, and core cadence remain independent of this choice. Shadows
of main furniture use an on-demand shadow map. Rendering
timing uses BabylonJS 9.33.2 instrumentation APIs
and reports GPU timestamp availability.

## Foundation — November 4, 2026

Strict TypeScript, Vite, npm, exact versions and lockfile. BabylonJS ES modules.
Vitest for application rules; NullEngine for the scene; Playwright for
real browser checks. `fflate` reads local ZIP archives.

## Increment A — Candidate Selection

### Stable FBNeo ruled out for this first attempt

The official stable release consulted is [EmulatorJS 4.2.3](https://github.com/EmulatorJS/EmulatorJS/releases/tag/v4.2.3),
commit `e150dc0491ae747028919fb82d6598954976ede6`. The arcade documentation explicitly
accepts `fbneo`, but that does not guarantee the presence of all current
FBNeo drivers in the distributed binary.

The package report `4.2.3/data/cores/reports/fbneo.json` indicates a build on
June 14, 2025 at 18:50 UTC. FBNeo's Atari System 1 driver was added on
[April 26, 2026](https://github.com/finalburnneo/FBNeo/commit/abffa67a8c48)
(after this build). Inspecting the distributed WASM finds neither `136033.623`, nor
`136032.205`, nor `atarisy1`, nor `Marble Madness (set 1)`. Some other
Marble Madness strings refer to console versions or Marble Madness II: they do not
prove support for the original arcade game.

Decision: use the fallback specified in the spec, **`mame2003_plus`**. Do not
compile MAME or pursue an integration on the current FBNeo driver alone.
This decision applies to the inspected stable distribution, not all possible
versions of FBNeo.

### MAME 2003-Plus selected as candidate, not yet validated in-game

- Frontend: EmulatorJS 4.2.3.
- Core: explicit name `mame2003_plus`, WebGL2 variant without threads.
- Report: build from June 14, 2025, 19:09:40–19:14:42 UTC.
- `build.json`: wrapper 2.0.2, minimal frontend 4.2.2. **This number is not the MAME version.**
- WASM: 27,858,472 bytes, compiled successfully by WebAssembly in Node during investigation.
- The archive and WASM have their SHA-256 hashes in `third_party/core-evidence.json`.
- All four searched identifiers are present in this WASM. Real gameplay remains to be observed.
- Real runtime launch in Chrome announces **RetroArch 1.21.0 (Git 6dd4353)**
  and **MAME Git Version 3a72dae**. It recognizes the `marble` driver, reports a
  trackball, and requests the exact 30 ROM names from the manifest, then fails
  as expected without ROMs. See `third_party/runtime-evidence.json`.
- The source commit announced by the core was resolved and its driver reviewed:
  `3a72dae33dfae65871158f03dbc1e849d74b4060`. The 30 names, sizes, and hashes
  match the prepared list. The build report alone did not provide
  this revision; it is now captured at runtime.

## Expected Archives

Since November 5, 2026, the workbench accepts the complete **`marble` (set 1)**
parent set in one ZIP, or split between **game + optional BIOS**. Reference names, sizes,
CRCs, and SHA-1 hashes are in `src/emulation/marble-roms.json`, taken from the
[driver of the revision announced by the core](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/drivers/atarisy1.c).

The archives provided by Michel contain the 27 expected game dumps and the
3 system dumps in `atarisy1.zip`, with Atari socket suffixes. The
initial loader only read a single complete ZIP and wrongly rejected them as
incomplete. Matches verified on actual bytes:

| MAME Name    | Accepted BIOS Names (size and SHA-1 required) |
| ------------ | --------------------------------------------- |
| `136032.205` | `136032.205.l13`                              |
| `136032.206` | `136032.206.l12`                              |
| `136032.107` | `136032.107.b2` or `136032.104.f5`            |

Decision: extract only the required entries, verify each candidate,
then produce a canonical ZIP **in memory only**, with the 30 MAME names.
This matches the structure actually expected by the core: game bytes are
not modified, original ZIPs are not rewritten, and no dump is
persisted. Extra entries (including clones in subfolders) are
ignored without decompression. Clones do not thereby become supported.
A correct redundant copy is accepted; a conflicting copy is rejected.
Limit: 16 MiB per ZIP, declared size checked before decompression, actual SHA-1
after decompression. BIOS errors allow fixing the selection while
keeping the chosen game.

## Frontend APIs Verified in Tag v4.2.3

References: [loader.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/loader.js),
[emulator.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/src/emulator.js),
[GameManager.js](https://github.com/EmulatorJS/EmulatorJS/blob/v4.2.3/data/src/GameManager.js).
All internal APIs used are confined to `src/emulation/emulatorjs.ts`.

| Need           | Actually Observed API/File                           | Usage and Limit                                                                              |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Creation       | `new EmulatorJS(selector, config)` as in loader.js   | Used after loading local bundle; versioned internal adaptation                               |
| Local file     | `config.gameUrl` accepts Blob/File via `toData`      | Verified working ZIP, assembled in memory; `gameName: 'marble.zip'` preserves set name in FS |
| Explicit start | `startOnLoad: false`, `startBtnName`, `start` event  | Native button; `start` is not enough to guarantee the arcade program is running              |
| Pause          | `instance.pause()` → `gameManager.toggleMainLoop(0)` | Used by the workbench; full resume will be handled in C                                      |
| Volume         | `instance.setVolume(0)`                              | Mutes known OpenAL sources; verify actual silence with the game                              |
| Reset          | `gameManager.restart()`                              | Observed, not exposed as a validated function in this workbench                              |
| Video          | `instance.canvas` and `Module.canvas`                | Reference available; dimensions observable after launch, GPU copy not validated              |
| Extra archives | `config.externalFiles`, `loadExternalFiles()`        | Explicit file path preserves bytes; not yet used                                             |
| Session end    | `exit` event, partial cleanup in GameManager         | No invented public `destroy()`; new session via full document reload                         |

Local adaptations kept in the module:

1. Disable `checkForUpdates` to avoid the unversioned `stable` request.
2. `disableDatabases` and `disableLocalStorage`, replace `window.EJS_STORAGE`
   with `EJS_DUMMYSTORAGE` for states, mount saves on MEMFS instead
   of IDBFS. The frontend's `beforeunload` can still unmount this memory FS.
3. `noAutoFocus: true` and explicit focus with `preventScroll` at startup:
   native focus on mousedown moved the button during the click in Chrome.
4. French translation of the tag (upstream name `af-FR.json`) and workbench labels.

Downloaded files remain intact. Local files are installed by
`scripts/setup-emulator.mjs`, with hashes in `third_party/emulatorjs-assets.json`.
The page's network policy blocks external services at runtime. Vite
development network accesses remain allowed locally.

## Relative Inputs: Initial Finding Before Increment B

The runtime reports the **`emulatorjs`** input driver, not `rwebinput`.
The code of the [`emulatorjs` driver, derived from rwebinput](https://github.com/EmulatorJS/RetroArch/blob/6dd4353/input/drivers/emulatorjs_input.c)
receives `movementX/Y`, accumulates pending deltas, then consumes and resets
them to zero during poll. On the MAME side, the
[libretro module](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/mame2003/mame2003.c)
exposes a mouse input; the `mame2003-plus_xy_device` option offers `mouse`.
These sources are not proof that the distributed binary actually delivers
the right deltas to the game. Revision IDs are now captured at runtime; the
actual path to the marble remains to be tested with the game.

`core.json.options` in the package is empty: the frontend does not automatically
enable its mouse capture via `supportsMouse`. Increment B will therefore need to
verify explicit Pointer Lock, core options, accumulation, and cleanup without
duplicating the native mechanism. No synthetic event injection is retained as a
control solution; current synthetic data is used only for tests.

## Status as of November 5, 2026

User archives are now available outside the project. Selection of both ZIPs,
their validation, in-memory assembly, and launch were tried in headless
Chrome 157.0.8103.38: attract mode displays the marble and the level.
No JavaScript errors observed. Audio and inputs are not certified;
increments B, C, and D remain to be pursued. Permanent tests only use
synthetic data. See `VALIDATION.md`.

## Increment B — November 5, 2026

### Controls and Real Path

- Credit: `gameManager.simulateInput(0, 2, 1)` then release `0`; Start: index
  `3`. These IDs are those of SELECT/START in the `emulatorjs` driver and
  the EmulatorJS arcade mapping, not assumed keyboard keycodes. 120 ms
  pulses, no repeat during the same press, canceled on pause.
- MAME explicitly configured with `mame2003-plus_xy_device=mouse` and
  `mame2003-plus_input_interface=retropad`. Native keyboard controls are
  neutralized; only relative control is offered for the marble.
- Standard Pointer Lock capture, requested directly on the canvas by a user
  click. Returning focus does not resume the game. Esc, blur, hidden tab,
  and loss of capture pause and purge. An interruption also cancels a
  pending capture request that has not yet resolved.

The native driver already accumulates deltas and resets them during its poll:
no `requestAnimationFrame`-driven accumulator is added.

### Maintained and Controlled Patch in the Emscripten Glue

The driver does not provide an exported API to purge mouse state. To allow
real purging and gain, a patch limited to the Emscripten callback is installed
by `coreInputPatch.ts` during `initGameCore`. Both SHA-256 hashes (glue JS and WASM)
are verified before transformation, then a unique marker must match.
No downloaded file is rewritten, no WASM is recompiled. The glue executed in
memory is adapted; its version and ABI are intentionally strict.

ABI source:
[emulatorjs_input.c, revision 6dd4353](https://github.com/EmulatorJS/RetroArch/blob/6dd4353/input/drivers/emulatorjs_input.c).
The mouse is the first member of userdata. Its structure occupies 64 bytes:
four scroll doubles, then x/y at 32/36, pending at 40/44, poll at 48/52, buttons
at 56. The patch bounds and aligns the pointer. Purge only writes those 64 bytes.
Tests verify that a neighboring byte remains intact. Any version bump
requires re-verifying the ABI, never just changing the hash.

Original events are received by the already-registered callback. The patch
only modifies the movement X/Y fields packed by Emscripten before the native
call; it dispatches no synthetic MouseEvent. The filter rejects untrusted
events, events outside capture, or during pause. Mouse clicks, wheel, and
touch do not control the marble. Shared gain preserves fractions and
respects the int16 limits of the native pending total; a saturated excess is flagged
and dropped, with no wrap-around or deferred impulse.

Provisional gain 1×, UI bounds 0.25–4×, resettable; these are not calibrated
fidelity values. The MAME driver keeps its trackball sensitivities of 30
on X and Y and its original X inversion (`PORT_ANALOG` in the `atarisy1.c` driver).
No isometric rotation, inertia, dead zone, or acceleration is added.
macOS acceleration and browser-exposed units remain possible.

### Audio and Validation

The existing OpenAL context (`Module.AL.currentCtx.audioCtx`) is resumed from
Credit/Start, capture, or Resume gestures. Volume is applied to existing
gains. Pause: zero volume and suspended context; a `statechange` listener
re-suspends any automatic Emscripten reactivation while the game is paused.
Resuming restores the chosen volume. No second AudioContext or double routing
to speakers. A zero-output analyzer provides a diagnostic RMS,
which may be zero during silence and does not certify audibility.

Local Chrome tests with user archives: the race starts after
Credit/Start; marble movement observed after the countdown;
X/Y values seen in the native poll after Chrome pointer movements; non-zero
audio signal (observed RMS 0.06412). After Esc: stable frame, pending/poll/buttons
at zero, AudioContext suspended; explicit resume works. This does not replace
precision testing on the Apple trackpad by Michel.

Only `marble.gain` and `marble.volume` are saved. The native frontend keeps its
caches disabled; ROMs/BIOS and saves remain in memory. Native menus
that could bypass our session controls are hidden.

## November 6, 2026 — Preloading for the Local Workbench

Michel placed his archives in `roms/` and requested preloading them. This
authorization replaces mandatory manual selection for the local test server
only. Use a Vite `configureServer` plugin (API verified in
installed types) and two fixed names; no archive import into the bundle,
no copy to `public/`, and no serving in production/preview. The browser retains
SHA-1 validation and explicit audio/Pointer Lock gestures. ZIPs are
provided by Michel, with no external download or inclusion in tests.

## November 8, 2026 — Braking and Inversion Diagnostics

Human measurements received: Chrome 155 on Mac, gain 1.70×, 6582 events,
`peakRaw=199`, `peakSent=338`, `peakPending=765`, `saturated=0`. No clipping
in the patch; no proof regarding the game's physical response. Michel reports
difficult braking at the end of Level 3, on the slope exiting the waves.

The glue extracted locally from the versioned archive has the expected SHA-256.
`MainLoop.runIter(func)` calls `callUserCallback(func)` then its post-hooks.
Add an observation between these two operations, via a unique marker, without
modifying the WASM or its cadence. The pinned driver (`rwebinput_input_poll`, verified
local source of RetroArch 6dd4353) copies pending to delta then clears pending.
The observation reads poll fields 48/52 after the iteration; no access or hook
into the C poll itself. The metrics are therefore named `nativeSampling`, with no
claimed exhaustive total or poll count. Extrema and inversions persist
after Esc. No modification of gain, rules, or physics.

## November 8, 2026 — Video Copy onto a BabylonJS Plane

D is requested by Michel, while C's braking comfort remains open.
No cabinet/bar. A single instance and a single audio chain are kept.

APIs verified in installed BabylonJS 9.33.2 sources:
`HtmlElementTexture` accepts an HTMLCanvasElement and calls
`engine.updateDynamicTexture`/`texImage2D` directly, without a 2D context. Its
constructors register the engine dynamic/video texture extensions.
`StandardMaterial` adds `emissiveColor` to the emissive texel: choose black,
otherwise the image is white (detected by browser test, fixed).

Real source WebGL2 uses `preserveDrawingBuffer:false`. Copying in the synchronous
hook after the already-pinned `callUserCallback(func)` keeps this setting,
without periodic screenshots or CPU readback. Synthetic tests and the
real runtime verify the copy. No extra emulation loop.

The frontend has `GameManager.getVideoDimensions(key)` which calls `get_video_dimensions`
via cwrap. Real test: native width 336, height 240, advertised
aspect 1.333333373; presentation canvas resolution depends on the frame.
Do not infer displayed aspect from the 336/240 ratio alone. Frames adopt
the advertised aspect; the texture keeps the entire canvas, borders included.

The displayed cost is the CPU time for copy+render submission, not GPU time or
an emulation speed indicator. The core advances independently of rendering;
direct mode disables copies. The source is hidden via visibility in BabylonJS-only
mode, without being detached. No new dependency.

## November 8, 2026 — Video Flicker Fix

Michel reports rapid flickering in comparison mode and slight shimmer
during scrolls in single view. The copy was triggered after every iteration,
including without drawing, while the visible source canvas is not preserved.
Spot probe of the real runtime in headless Chrome 157: before fix,
3 copies without draw out of 331, and those 3 buffers were transparent; after,
0 copies without draw / 0 transparent out of 338 in comparison, then 579 cumulative
after hidden-source mode. These measurements identify a real defect, without
claiming to reproduce the full frequency experienced on Michel's Mac.

`coreVideoPatch.ts` instruments two unique calls verified in the glue at the
existing SHA-256: `GLctx.drawArrays(mode,first,count)` and
`GLctx.drawElements(mode,count,type,indices)`. A flag is raised only
for the Module canvas and the default framebuffer; reset before each
iteration. After input diagnostics, at most one video notification is
emitted if a draw occurred. No CPU pixel readback in production or
heuristic black-sample suppression. Intermediate FBOs are ignored.
Instanced/blit calls of other renderers are not covered by this
targeted patch: re-verify if the binary or renderer changes.
WASM and third-party files on disk remain unchanged.

The BabylonJS texture switches from nearest to bilinear: the source canvas is already
scaled by the frontend, and a second nearest at a fractional scale
causes abrupt edge variations during scroll. GPU test on red/green edge
at odd width: interpolation verified, interior colors preserved.
This choice slightly softens pixels; scroll comfort remains to be
compared by Michel, with no change to gain or core cadence.

## November 8, 2026 — Summary E and Build Check

Michel confirms the visual fix then requests the next task:
prepare E without inferring global human validation. Add a Playwright
preview suite separate from the dev server: 4173, `tests/preview`, prior
build, and automatic server shutdown. CI now includes these tests.
Tests load the build, check selection/errors, SHA-256 and runtime
notices, absence of archives and dev preloading. No dependency added
and no ROMs in permanent tests.

Rebuild proof: source copy without ROMs or initial node_modules,
offline `npm ci` from cache, pre-existing runtime verified by manifest, then
check and comparison of the 49 identical SHA-256 outputs, same environment.
Current summary is `docs/RELEASE.md`; HANDOFF is condensed around the real
state, chronological evidence remains in VALIDATION/DECISIONS.

## November 8, 2026 — Large Impulses and Level 1 Jump

Michel specifies that he cannot reproduce the trackball impulses allowing
to leave the standard path toward the side platforms in Level 1.
Braking and this jump remain unvalidated functional criteria. The absence
of int16 bridge clipping was not proof of input fidelity to the game.

Re-read pinned sources: `src/mame2003/mame2003.c::osd_xy_device_read` forwards
mouse inputs; `src/inptport.c::scale_analog_port` applies sensitivity
and mask; `src/drivers/atarisy1.c::trakball_r` transforms posx/posy to
cur[0]=posx+posy and cur[1]=posx-posy on UINT8. `marble` ports: mask ff and
sensitivity 30. Exact reference:
https://github.com/EmulatorJS/mame2003-plus-libretro/tree/3a72dae33dfae65871158f03dbc1e849d74b4060/src
Consulted sources are kept in /tmp/marble-feasibility, without ROMs.

A large counter difference on 8 bits can wrap movement modulo
256: 927×0.30 ≈278, so a difference between endpoints of about 22 instead of 278.
This is a hypothesis on the symptom, not an observation of the program's actual
reads: MAME interpolates its ports and the game may read them several times
per frame. Do not conclude actual overflow from peaks alone.

Add an off-by-default test mode rather than a silent control
change: joint L1=416 bound before poll (floor((127-2)×100/30)), direction
preserved, rounding margin, excess dropped without temporal spreading.
Small movements and gain are unchanged; no physics or game rules
modified. Before/after statistics are distinguished. The mode is not
persisted, so as not to turn this test into an established fidelity value.
The right limit and usefulness of this mode remain to be confirmed on the jump.

## November 9, 2026 — Reject Limiter, Measure Response

Explicit feedback from Michel: no improvement despite 20 clampings confirmed
by his diagnostics. Remove this setting and its dedicated modules/tests, keep
linear control and a large-impulse test. This removal is not a
reduction in coverage requirements; the new optical tracking is covered
and thresholds are preserved. The native pre/post sequence and private writing
of pending only serve the workbench, without exposing synthetic commands
in the game UI.

Temporary saving `GameManager.getState/loadState` was verified in the
installed frontend then tried; starts were not comparable. Series
rejected without attributed cause, with no persistent file. The retained workbench reloads
the entire runtime on each trial and sets Credit/Start/impulse per frame. It
uses actually existing internal APIs, an isolated profile, and only
a loopback server; no ROMs, snapshots, or images in the report.

Results recorded in INPUT_RESPONSE and the JSON evidence: identical starts,
exact native commands received, non-monotonic visible response to large
peaks, and duration effect. Unchanged background across 360000 pixels rules out
camera movement on the performed checks. Do not confuse screen centroid with
internal coordinates; neither the cause nor a successful jump is demonstrated.
The final script and tested pure tracking are kept to avoid returning
to successive empirical adjustments without measuring the game.

## November 9, 2026 — Read Actual Ports Without Modifying the Program

The pinned binary does not export readinputport/trakball_r names and contains no
name section. Inspection of the ROMless archive reveals a single F20000/F20007
association in data, at address 9849616, table handler 17927.
Memory_ReadAddress16 structures and the five neighboring lines match
the pinned public sources atarisy1.c and memory.h. Real exports Eh/Ch and
signature (i32,i32)→i32 verified. The script captures bytes at instantiation
for their SHA-256, then the module rejects any mismatch.

Do not add a fake read API to the frontend: the opt-in diagnostic
interposes a WASM trampoline in the real table, calls the original once,
observes and preserves its values/arguments/exceptions, then restores. No WASM
byte or ROM code/RAM modified. Bounded logs and isolated observation errors.
The workbench in normal mode remains identical; the tracer is imported only with
--ports and absent from the application bundle.

Result at 416: ports consistent with −125 modulo 256 despite inverted screen
movement; result at 768: ambiguous modulo wrap. This distinguishes the two cases and
invalidates the single explanation via the port mask. Program interpretation
remains unknown; no physics or gain fix based on these
readings alone. The internal counter phase differs by +1 from the workbench's:
keep both labels and do not invent CPU cycle measurements.
Evidence and limits: TRACKBALL_PORTS.md and trackball-port-evidence.json.

## November 9, 2026 — Native Reference and Phase Control

Use MAME 0.271 ARM64 already present on the Mac as a newer reference
than 2003, without presenting it as the latest version. Returned version and
binary hash recorded in `third_party/mame-reference-evidence.json`.
`-verifyroms marble -bios ttl` accepts original archives without modification.
The 30 SHA-1 hashes used by the frontend are present in the selected native
declaration, which also contains three board PROMs; no dump downloaded.

APIs verified in 0.271 sources/docs and at runtime:
`space:install_read_tap` can substitute the entire return; a second
independent tap observes the actually modified bytes. Active mask 255 in native,
versus inactive convention 65280 in the old handler. `screen:pixels()` returns
32-bit RGB colors here, despite an available palette; do not convert
these values with pen_color. `screen:frame_number()` is a method in this
binary. `field:set_value`/`clear_value` drive Credit/Start; no synthetic
SDL analog movement. A fresh process replaces any state restoration.

The naive phase showed a large difference; timing checks call it into
question. A single −1 offset for all amplitudes reproduces
Web displacements within one native pixel. The inversion at 416 is also
present in this reference. No evidence of a 2003-Plus-specific bug,
nor reason to replace the core or add turbo/inertia/limiter from this result.
This is not proof of identical internal states or jump fidelity.
Protocol, figures, and limits: `REFERENCE_COMPARISON.md`.

## November 9, 2026 — Gesture Duration Observed Before Any Tuning

Extrema alone do not allow reconstructing a gesture. Add an
opt-in observer armed by the existing measurement button, capped at 128 lines
and two seconds verified at callbacks, stopped after 0.18 seconds of silence
and last null poll. It aggregates accepted events between existing callbacks,
keeps their time bounds and post-gain deltas, then observes the last
native poll. No new event listener, timer, persistence, or command
transformation. Explicitly keep interrupted events before sampling.
The internal counter after iteration keeps its convention; do not confuse it
with the pre-iteration number of the workbenches. `performance.now` measures reception
in the browser, not trackpad hardware time. This last poll remains
a partial observation, not all polls of the program.

Controlled profiles of the same total: 1536 in 1/2/4/6/12 iterations and 416 in 1/2/4/8,
plus neutrals. All polls match the commands, responses change
strongly and can reverse direction. Background check extended up to 1236 on
repeated cases, so as not to confuse displacement and scroll. No smoothing added,
no turbo, no new limiter or gain change. Choice of a fix
awaits Michel's real gestures; a universal optimal profile is not demonstrated.
Results and limits: `MOTION_PROFILES.md`.

## November 9, 2026 — Make Startup Playable Without Prior Capture

Defect reproduced in Chrome: "Copyright Warning" screen still displayed after
Credit/Start. Capture/movement then Esc paused and grayed out the
buttons, leaving an unclear procedure. Resuming re-enabled them, but this
workaround is not needed for startup.

Option actually available in the installed WASM and verified in
[core_options.c of the announced commit](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/mame2003/core_options.c#L117):
`mame2003-plus_skip_disclaimer`, values disabled/enabled, default disabled.
Configure enabled via defaultOptions. Do not enable skip_warnings, a separate
option that hides compatibility issues. Real verification
confirms attract mode then a game launched by Credit/Start with no
prior movement. No simulated click/key to acknowledge the screen, no
binary or archive change. Notices and file rules remain
unchanged.

Explicit policy: Credit and Start are accessible while paused and clicking them
resumes before the press. The pure helper `arcadeCommand` is tested for this order
and for no resume/purge when the core is already running. Esc, loss of
focus/visibility keep pause/mute/purge; no focus return resumes.
Capture is no longer required to unblock startup. Still wait for
the game screen: the frontend start signal arrives during boot.

## November 9, 2026 — Make Measurement Understandable

Feedback from Michel: he did an acceleration, Esc then Copy, and cannot
classify the reading as medium/fast. The first version only measured the
first segment: 35 events / 300 ms / peak L1 319, while the cumulative X peak 916
was outside the segment. Do not attribute this discrepancy to a faulty human
procedure or certify no loss on the uncaptured strong gesture.

Replace stopping on the first silence with selecting the largest command
peak until interruption. Bounded segments, best and candidate only,
ranked by max of intermediate transmitted L1 peaks and last poll; first
segment kept on a tie. Keep interrupted events without poll
and document the criterion. No modification to controls or their gain.
A single procedure in the UI: New trial → Capture → acceleration →
Esc → Copy. Display measurement status in French. No request to recognize
two gestures, no imposed wait. Tests: small first movement,
subsequent acceleration, weak return, immediate Esc, bounds/re-arming.

## November 9, 2026 — No Manual Arming Needed

Michel's next reading again has commands (native X peak 1189, no
clipping), but motionTimeline idle/gain 1 while player gain is 1.70×.
The observer had never been armed; those two fields do not describe a
command actually sent at gain 1. Do not blame a missing click:
manual arming remains a source of error in the procedure.

From now on, any successful capture from the uncaptured state calls the same
reset as the button: global/native counters then timeline at current
gain. Pointer capture refused: nothing is cleared, since `setCaptured(true)`
is not called. Pause/resume without capture preserves measurements, Esc freezes
the best segment, re-capture starts another trial. The command chain,
saved gain, and existing fractions/purges remain unchanged.
Single procedure: Capture → acceleration → Esc → Copy. New trial
remains an optional shortcut, no medium/fast classification required.

## November 9, 2026 — Calibration and Phase Check Before Recommendation

Compare the full profile then a window of eight iterations fixed around the
human peak, at several equivalent gains. Reuse the workbench, keep
X/Y commands and their timing; reject int16 overflows, quantize
prefixes to <1 count error. Do not pick a gain based on the final distance of a
long trajectory exposed to collisions. No gain re-applied to the source capture.

0.85× seemed to improve the isolated impulse, but a single-iteration offset
makes this result nearly zero: candidate rejected as a recommendation on that
measurement alone. Refined checks 0.40/0.45/0.50× at both phases; 0.50× keeps
direction and a larger response at both timings among these values.
These gains respect the 0.05 slider step, unlike the fine values of the
exploratory sweep. The 25 trials and their limits are in CALIBRATION.md.

Add an explicit 0.50× test button, without changing `DEFAULT_GAIN` or
existing preferences on load. Same linear gain/persistence as the
slider, no extra saturation, inertia, turbo, or implicit resume.
Return to 1.70× via slider; reset remains at 1×. Human candidate, not a certified
jump fix. Physical verification of comfort and gameplay remains
the next step; the captured profile is kept to avoid asking for it again.

## November 9, 2026 — Priority on Comfort Control and 3D

Priority human feedback: 0.50× makes normal control insufficient and does not
solve accelerations. Invalidate the playability recommendation derived from
the isolated impulse; keep measurements as history, not as a recipe.
Michel explicitly authorizes a Space boost and asks to move forward on 3D.
Section 15 of the spec and AGENTS document this evolution of the initial scope.

Comfort choice: linear normal control 1.70×, 0.50× candidate removed and
restored to 1.70× if still saved; other valid gains preserved.
Holding Space provides continuous native deltas of L1 norm 128 per iteration,
steered with the trackpad. This avoids the single instantaneous multiplier that would
inflate large packets that are already ineffective. No native jump assumed or
physics/ROM modification. The generator emits nothing without a recent/new direction
and purges on any interruption. Normal gain is ignored for these assisted
commands, which have their own counters; releasing returns to normal control.
Generated commands are distinguished from mouse events in the timeline.

Already-verified native pre-hook reused, same ABI and hashes. Emission only
if the native bridge exists and session is captured/active, once before its iteration.
BabylonJS rendering does not advance the core or the boost. Test hold,
release, invalid command, direction freshness, focus, and destruction.
Human comfort and jump success remain open; do not block 3D rendering
on a new calibration campaign.

Added presentation: procedural screen/stand/pedestal, fixed perspective camera,
lighting, and floor. Same texture and same video scene, scenery lazily created,
reused/disabled when returning to the plane, cleaned up with the scene. No external asset,
bar, detailed cabinet, level reconstruction, or other engine. Reference
modes remain available, with GPU color and single-subscription tests.
The real render capture was inspected in /tmp, without adding it to assets.
Details and visual follow-up: COMFORT_AND_3D.md.

## November 9, 2026 — Fullscreen of the Same Session

The next authorized task is fullscreen 3D presentation with compact HUD.
Use the Fullscreen API of the wrapping element, verified in local DOM types
and Chrome 157, with an immersive CSS fallback if the call is missing or denied. The HUD
delegates to existing controls to keep a single owner of inputs.
Entering and exiting pause; no automatic resume or implicit capture
after a fullscreen transition. Resuming remains a gameplay gesture.
Focus returns after `fullscreenchange`, because the outer button cannot
receive focus before fullscreen actually ends (regression reproduced
and fixed in the Chrome test). The same canvas/texture remains in use.

## November 10, 2026 — Two Fixed Framings of the Same Scene

Michel confirms fullscreen works then authorizes the proposed front and
perspective cameras. Keep the initial perspective and add
an orthographic front view centered on the screen for readability. A single
camera object, no navigation attached to the trackpad or animation likely
to hijack game inputs. Reuse the tested frustum for source/viewport
aspects and a frame margin. Page and HUD selectors have the same
`videoComparison` owner, with no extra persistent preference.
Installed BabylonJS 9.33.2: `TargetCamera.setTarget/rotation` and `Camera.mode/ortho*`
verified in types and tested in real Chrome WebGL2.

## November 10, 2026 — Captured Shortcuts and Second Port Start

Explicit request: 5/(, 1/&, 2/é. Resolution via `event.key` for the requested aliases,
Shift allowed; system/composition shortcuts ignored. Require active capture and
non-paused session so a residual key does not resume a pause.
A 120 ms pulse, same generator as the buttons; no extra native keyboard
input.

Local frontend 4.2.3 sends player/button/value arguments to
`functions.simulateInput`; its controls iterate over players by index.
Start P2 uses `simulateInput(1,3,value)`, verified in the real runtime by
observing the original call and its release. The six aliases produce
exactly twelve calls (six presses/releases) on the expected ports.
`Playwright.keyboard.press` does not know `é`: the test uses the native
Chrome `Input.dispatchKeyEvent` API for `é/Digit2`, an event recognized as trusted,
rather than a synthetic DOM event assumed to be accepted by the core.
The second port has its own timers, purged along with those of the first. Relative
controls remain those of player 1; no new multiplayer mode implemented.

## November 10, 2026 — Prototype 02 Authorized, Steps 1 to 5

Michel explicitly authorized full cabinet, overview/transition view,
3D controls, materials/lighting, and first bar room. New spec02,
reference added in AGENTS, old historical exclusions lifted for
this scope. Physics and emulation remain those of prototype01.

Original procedural modeling, with no dependency or external asset: local
toolbox for volumes and marquees, separate cabinet/bar modules. Labels
use a real typed DOM canvas before constructing `DynamicTexture`;
BabylonJS `ICanvasRenderingContext` is a partial interface that does not declare
`textAlign`/`textBaseline`. `DynamicTexture.update(true)` upload orientation
was visually verified after fixing a vertical flip.

BabylonJS 9.33.2: classic Culling/ray module calls `RegisterRay` and installs
`Scene.pick/createPickingRay`, verified in local sources. Actions are
resolved solely from our metadata and forwarded to the existing UI. No
ActionManager or camera input interfering with the trackpad. Click preserves
its user gesture up to PointerLock; proven in the real runtime.
Hover explicitly uses logical button 0, because `PointerEvent.button`
is −1 for a movement without press. Right clicks remain ignored.

0.65 s transitions with rAF clock in seconds, reused vectors, single camera.
An equivalent perspective projection bridges the orthographic front view.
HUD resizing recalculates the target without interrupting the trajectory.
No deferred capture request at the end, which would lose user activation.
rAF callbacks never advance the core; the last video frame may
be redrawn during a pause. Any interruption/destruction cancels the task.

## 3D Monitor CRT Filter

The tube uses a BabylonJS 9.33.2 `ShaderMaterial` with local GLSL sources
and shares the `HtmlElementTexture` of the standard material. The tube
has a 4:3 aspect ratio and the material centers the image without altering its proportions
when the source canvas has another ratio. Monitor vertices protrude
up to 58 mm at the center and 29 mm at the midpoint of each edge. The shader curves
raster lines on both axes, rounds corners,
and modulates the image based on the video line count advertised by the core.
Filtering uses fragment derivatives if the WebGL context exposes them.
Interference is a low-amplitude local horizontal displacement,
indexed by received frames. Direct view and the comparison plane
serve as references. Effect selection is done in options and the HUD.

## Local Startup and Graphics Context Loss

Game and BIOS reads, hashes of each ZIP, and both frontend
requests can overlap. Each input remains checked.
Diagnostics time ZIPs, frontend preparation, and the delay between
the start click and EmulatorJS's `start` event separately.
The core remains loaded by EmulatorJS 4.2.3 with its verified local archive.

The 3D renderer listens to BabylonJS 9.33.2 context observables. On loss,
it detaches the video texture and restores direct view. After restoration by
BabylonJS, selecting 3D recreates the texture on the next core draw.
The core canvas reports its own loss, with the usual pause.

## Safari Capture and Audio Buffer Trial

`requestPointerCapture` registers events on the document before
calling Pointer Lock. A non-promise response awaits confirmation
by event. Gameplay and exploration share this patch. Controls
keep their focus checks and cancellation on interruption.

EmulatorJS 4.2.3 writes the RetroArch configuration via
`EJS_GameManager.prototype.getRetroArchCfg`. For Safari, the patch
replaces `audio_latency` entries with 128 ms, versus 64 ms by default.
Diagnostics report the requested value and the AudioContext sample rate.
Listening on Safari must confirm the effect on crackling.

### Fullscreen and Pointer Lock

Safari earlier than 18.2 opens the CSS immersive presentation directly.
This avoids the Fullscreen API and Pointer Lock combination affected by
[WebKit 272136](https://bugs.webkit.org/show_bug.cgi?id=272136).
[Safari 18.2](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/)
includes the fix. The policy uses the Safari product version,
also read for the audio setting. The HUD remains that of other browsers.

## Prototype 04 — Origin of Terrain Data

Marble Love at revision `113cf5d` distinguishes the tiled background from terrain
data resolved by the game. The second presentation starts from terrain
data to be compared against MAME and uses locally generated textures.
The starting probe reads the Level 1 descriptor and height block.
The test mesh uses synthetic heights while awaiting verified
correspondence between arcade samples and the 3D coordinate frame.

## First Mesh from Practice Race

The Lua decoder reuses information from the routines documented by
Marble Love at `113cf5d`. The workbench requires equality with the 16 core words
at every checkpoint and equality of the initial survey across replays.
The local JSON contains the four raw words per cell and no image
or ROM. BabylonJS receives the validated grid after file selection.
Small discrepancies between cells are smoothed on display.

## Direct Start in Intermediate Race

The browser's resume point is produced by the same Web core as the
game. The script sends credits, a P1 start, and trackball movements
to finish Practice Race. It serializes the first playable frame
of Intermediate Race (descriptor `0x2c54c`, mode 0, position 220 × 108,
scroll −16152). Reading back this pose confirms
restoration. Both views still use the collisions, timer,
score, and physics of the arcade session. The study page frame
prepares local archives in memory before the browser start gesture.
The resume point and surveys are served only in development on
loopback.

## Full Atari Hardware Resume and Camera-Relative Controls

The F2 defect was reproduced without mouse movement. The native controller
reported zero delta while the marble started from (220,108) and died.
The analog arrays of the pinned WASM are at 0x1018a40 and 0x1018ac0.
Restoring them eliminates most of the drift, but the resting height
remains wrong. Inspecting WASM with WABT and the pinned C code
then identifies the Slapstic fields. Restoring chip state (9 bytes at 24554108),
the bank at 24509408, and its content via pointers 24509228/24509232
restores collisions and an exact motionless start.

The local MM2 version 2 format appends this data to the native state.
Reconstruction uses the same already-loaded ROM banks as
`update_bank` in the core. The hash verified before patching ensures
these addresses match the binary in use.
See [atarigen.c of the pinned core](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/machine/atarigen.c)
and [slapstic.c](https://github.com/EmulatorJS/mame2003-plus-libretro/blob/3a72dae33dfae65871158f03dbc1e849d74b4060/src/machine/slapstic.c).

Follow framing passes its horizontal axis to `cameraRelativeMotion`.
Camera forward/right axes are transformed into trackball axes.
Boost observes deltas in this frame. Switching cameras
injects no movement by itself.

## Local Actor Library from Rolling Madness 3D

The provided installer contains `stick_idle` (12 poses), `stick_bend` (10),
`stick_jump_start` (23), `stick_jump` (41), `player_dizzy` (8),
`player_broken` (17), `player_melt` (12), and `blacky`.
`player_broken` includes the pieces and the textured `broom.jpg` group.
Triangles are converted with UVs and normals. Assets
remain in `local-roms/rolling-actors.json`.

The MAME 0.271 survey and consumers documented by Marble Love
(revision 113cf5de969ff62cb1d7b901340206f30122f658) identify the black marble
in record 0x400a20 and the four creature slots at
0x401302, spaced by 0x60. Positions are at offsets 0xc/0x10/0x14,
activation at 0x18, state at 0x1a, and scripts at 0x58/0x5c.
Rendering consumes these observations in the Web session. Models and
their durations come from the remake. Fine timings remain to be compared against
the various interactions of the original game. Stars and tongue
are geometric additions of the project.

## November 21, 2026 — Level 4 Graphical Palette

The full PNG and the Web core do not have the same palette values.
Michel's live comparison is retained as color truth.
The [MAME2003-Plus Atari System I map](https://github.com/libretro/mame2003-plus-libretro/blob/master/src/drivers/atarisy1.c)
describes B00000..B007ff and playfield entries B00400..B005ff.
The pinned local binary confirms read lines at 9849592 (handler 25)
and write at 9849960 (handler 17939, base variable 16958436). At the Level 4
checkpoint, the pointer is 31044848. Only this dynamic pointer is read by
the code; no global heap search or ROM read is added.
Terrain words 13..15 F721/FB32/FF43 give 119/34/17, 187/51/34,
255/68/51 and match the pixels of the local video; 29..31 give
153/102/0, 221/136/0, 255/187/0. Addresses are specific to the WASM already
verified by the adapter; a different table gives a fallback without reading.

The shadow complement on the X=90 end facade is a local restoration
measured in the source image. It does not claim to prove an obstacle in
the reconstructed geometry and does not alter the already-validated sun angle.

## November 22, 2026 — Same Color Source for Levels 1 to 3

The verified Level 4 reader becomes `terrainPalette`, without changing its
addresses or broadening its read. The other three starts confirm the same
layout: gray/sand at indices 0..12, walls at indices 13..15; bank
16..31 notably describes Level 2 ice and Level 3 green.
Study fallback values are measured in the live core.
Full PNGs remain useful for architecture and silhouettes;
they are not retained as colorimetric truth.

The shader sets native orientation hues and uses the existing shadow map
for their blending. Floors keep their grain texture but
cancel the second vertex-color factor before this alignment. White
highlights on stone and ice are removed. PCF keeps existing
maps and directions with normal bias 0.02; the Poisson fallback
without shadow sampler is verified in BabylonJS 9.33.2 sources and the
NullEngine check explicitly expects it. GPU tests measure visible
colors: the NullEngine check alone is not enough.
