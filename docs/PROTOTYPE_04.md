# Prototype 04 — Modern Rendering of Marble Madness

The existing arcade game serves as the reference. The second presentation will
display the course itself in BabylonJS with textured and lit surfaces.
The first goal is the start of Practice Race, with a flat area, a slope, and
the terrain breaks measured in the original game.

## Sources and Method

- [Marble Love](https://github.com/magno73/marble-love/tree/113cf5de969ff62cb1d7b901340206f30122f658)
  documents the descriptor format and terrain consumers.
  The TypeScript project is under MIT. Its classic renderer combines tiles,
  sprites, and HUD. Elevation data passes through other routines, notably
  `FUN_1CABA`. No code or asset from that repository is incorporated at this stage.
- [REA](https://github.com/morluto/rea) and Ghidra form the static analysis
  track. "Gandry" is interpreted as Ghidra. REA and Ghidra were not found
  among the verified local tools.
- MAME 0.271 already allows testing these hypotheses against the arcade. The
  `scripts/reference/terrain-probe.lua` probe reads the active descriptor and
  the sixteen samples around the starting point after a Credit/Start.
  At frame 1199, the descriptor is `0x2bee2`, the observed cell is
  `(17, 17)`, and all sixteen words equal `0x4000`. This confirms access to
  the terrain block. Axes, scale, and slope or void cases still need to be
  correlated at different positions. Use existing local ZIPs and compare
  results locally.

## First Deliverable

`/terrain.html` shows a ramp and two independent test platforms,
with procedural texture, normals, lighting, and orbital camera.
`terrainMesh` turns a grid of four heights per cell into triangles.
Empty cells emit no faces.

## Next Increments

1. Observe the arcade terrain on flat positions, on the ramp, and near an edge.
   Verify sample ordering, axis directions, vertical scale, and void
   representation against the arcade video.
2. Produce an initial Practice Race mesh from these measurements.
   Compare framing, slopes, and edges under a reference camera.
3. Connect the rendering to the marble position and arcade session scrolling.
   Add objects and HUD as their state is documented.

## Flat, Slope, and Edge Replay

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs
```

The harness launches four isolated MAME 0.271 sessions with the `marble` set
and `ttl` BIOS. Credit on frames 700–707, Start on frames 710–717. After
measuring at the start on 1199, port 0 or 1 counter advances by 12 per
iteration, modulo 256. The Lua script acts on trackball port reads.
Terrain observations are read-only. The printed temporary path contains
the traces and PPM images.

| Replay | Frame | Cell     | Raw Plane Position | Observed Heights           | Reference              |
| ------ | ----: | -------- | ------------------ | -------------------------- | ---------------------- |
| Both   |  1199 | (17, 17) | (140, 140)         | `4000` everywhere          | Flat start             |
| Port 0 |  1260 | (20, 17) | (164, 140)         | `3ffe`, `3ffc`             | Slope down-left        |
| Port 1 |  1280 | (17, 13) | (140, 110)         | `4004`, `4006`, and `0000` | Upper-left edge        |
| Port 1 |  1320 | (17, 11) | (140, 94)          | `0000` everywhere          | Marble beyond the edge |

On both axes, the observed cell corresponds to raw coordinates divided by eight
and floored at the measured points. Increasing X projects down-left.
Increasing Y projects down-right. Non-zero words vary in steps of two on the
studied segments. Zero coincides with the absence of surface on this off-track exit.

[Marble Love's projection routine](https://github.com/magno73/marble-love/blob/113cf5de969ff62cb1d7b901340206f30122f658/packages/engine/src/sprite-project-1cc62.ts)
identifies four indices among the sixteen words. With X and Y in the arcade
plane and origin at the cell corner, interpolation uses index 13 for the
origin, 8 for the X neighbor, 4 for the Y neighbor, and 7 for the opposite
corner. Indices are zero-based. The diagonal used connects the origin to the
opposite corner. This reading gives a precise hypothesis for generating the
mesh. Cell-to-cell continuity, transitions between zero and non-zero corners,
and vertical scale remain to be verified.

REA and Ghidra are absent from the verified local tools. Java 8 was found.
The results of this replay come from MAME and reading Marble Love's public code.

## Practice Race Section in BabylonJS

The harness now exports `practice-terrain.json` for arcade area X 10–29,
Y 11–24 at iteration 1199. The read-only decoder follows the tables used by
`FUN_1CABA`. At each replay check, its sixteen words are compared against those
produced by the game at the observed position. All four runs generate the same
starting recording.

In `terrain.html`, select `local-roms/practice-terrain.json`.
This file is ignored and excluded from Vite routes. To regenerate it, run
the replay command above and select the JSON from the printed folder.
The test scene remains visible while the recording is absent.

The mesh preserves holes and places vertical faces under exposed edges
inside the recording. Two-unit gaps between shared vertices are averaged to
close small seams. Larger breaks and zero samples are preserved. Vertical
scale is derived from the projection below. Cliff face depth is a visual
choice. Openings with fewer than three populated vertices leave the cell empty.
The section represents the relief. Guardrails, marble, and other objects from
the arcade video await their own integration.

## Comparison in Arcade Framing

After loading `local-roms/practice-terrain.json`, choose **Arcade framing**
to match the starting projection. To compare, load `local-roms/practice-reference.png`
in the second selector and adjust **Capture opacity**. **Free view** restores
the orbital camera. The local capture can be regenerated by converting
`x-1/1199.ppm` from the folder reported by the harness into PNG, keeping its
336 × 240 pixels.

The fixed view uses 45° azimuth and 30° elevation.
The projection in native pixels is `u = 159 + z − x` and
`v = (x + z)/2 − (h − 0x4000) − 92`. Screen origin is aligned on the marble
at the start. Display aspect ratio is 4:3. The vertical mesh coefficient is
`sqrt(2/3)` relative to the two ground axes. This projection reproduces the
measured axis directions and height contribution. The harness checks positions
at frames 1199, 1250, and 1260 on both trajectories and obtains a maximum
deviation of 2.14 native pixels from the optical center of the marble.

The overlay shows the grid and void in the same frame of reference. Irregular
boundaries and cliff depth remain approximate. The capture also contains
guardrails and other game elements awaiting their own integration. Marble
state was read from desktop MAME during measurements.

## Live Marble in the Game Page

The main page accepts the same local recording. **Modern 3D · Practice Race**
mode uses P1's X, Z, and height coordinates read after one Web MAME iteration.
The player controls the usual session. The camera starts with the framing
validated above. The marble pattern rotates according to displacement and its
shadow is cast to the right, slightly downward.

## First Scroll

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --scroll
```

This replay applies +12 and −8 units per iteration to the two counters after
the start. It measures background shift between the reference image and five
frames where the camera moves down. Comparison matches the increase of word
`0x40097e` within 2–3 pixels. Relief export is identical at five replay points.
The `practice-scroll-terrain.json` file contains 38 × 37 cells, X 10–47 and
Z 11–47, with the same origin as the initial recording. Select this file on
the game page.

The orthographic camera moves down the course. The terrain rises on screen
just like in the arcade. The native canvas resumes display when framing or
position leaves the covered area. See [the tests](VALIDATION.md).

## From Start to Finish of Practice Race

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --finish
```

This replay reads position and velocity to steer P1 via the two trackball
counters. It verifies Intermediate Race loading and compares five samples of
the same relief through the finish crossing. The printed path contains
`practice-complete-terrain.json`. Copy this file to `local-roms/`, then
select it on the game page.

The 91 × 91 cell recording has its origin at (0, 0). Cells more than 21
columns from the diagonal correspond to repetitions outside the viable
screen area and are left empty. The finish strip bears a gray GOAL banner
that takes the color of the first player to cross the finish. Two checkered
flags wave at the edge of the ramp. The view stays in 3D until the crossing
ends. The arcade image resumes for the summary and for Intermediate Race.

## Intermediate Race Terrain Study

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate
```

The two-player replay finishes Practice Race, exports the grid at the start
of Intermediate Race, and continues the race to the first plateau after the
descent. The reported folder contains the JSON, PPM captures, and poses in
CSV. Load `intermediate-terrain.json` in `terrain.html`.
Arcade framing covers the 306 pixels observed in the replay. Free view allows
inspecting the terrain further ahead.

### Intermediate Race Pipes

The Rolling Madness 3D installer found in the provided folder contains
`model/lev2.ase.mesh`. The pipes occupy 540 triangles associated with
`lev2_tube_out.png` and 12 with `lev2_tube_in.png`. Local slicing uses only
these faces. The decoder follows the
[public ASE Mesh format schema](https://api.github.com/repos/MeltyPlayer/MeltyTool/git/blobs/ae5d07da82cb71ab9635355816f6dba1782f1ada).
The remake's connections to the arcade platforms correspond to
`x = zRemake / 10 + 60` and `z = xRemake / 10 + 65` in tiles.
Planes at 305, 195, 135, and 120 in the remake correspond to arcade heights
16264, 16176, 16128, and 16116.

After extracting `lev2.ase.mesh` from the local installer with an Inno Setup
extractor (`xtinno` 0.11.3 was used):

```sh
node scripts/add-intermediate-pipes.mjs "/path/lev2.ase.mesh" \
  local-roms/intermediate-terrain.json local-roms/intermediate-terrain-pipes.json
```

Load the copy in `terrain.html` then choose **Pipes and ramps**.
Luca Elia's license is included in the installer. Extracted triangles remain
in the project's ignored local recording. The converter also transposes model
normals. BabylonJS materials give shells white highlights, draw seams, and
dress exits in gray. The turquoise bridge flank and purple mechanism are
recreated from arcade captures, with a telescopic piston and spoked wheel.

### Animations Observed in Intermediate Race

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate
MAME_BINARY=/Applications/mame0271-arm64/mame node scripts/measure-terrain.mjs --intermediate-impact
```

The first replay shows P1's dizzy stars (state 5, frames 3077 to 3177).
The worm swells above the marble, which disappears beneath it (state 7, frames
3205 to 3264). State 4 starts reconstruction at 3265. The second replay lets
P2 fall off the ramp onto the plateau, with a 40-unit offset. State 2 starts
at 3085. Red shards scatter on the ground, a spark precedes the yellow broom
visible around 3145–3185. Reconstruction starts at 3213.

## First Section Scenery

Nine native captures between start and finish (frames 1199 to 1923 of the
`--finish` replay) have visible pixels in columns 24 to 311.
The orthographic camera narrows its viewport and horizontal frustum together.
The 24-pixel strips remain black and course coordinate projection keeps its
position within the 4:3 surface.

Arcade-coordinate positions of guardrails and the two towers come from frame
1199 and the recording around the start. The towers have flat faces, and the
recess between steps receives vertical faces. Tiles, grout, and striped walls
use textures generated at scene load. Openings come from the recorded cells.
The final turns and their props remain to be refined.

Close comparison of the central pit led to matching tile grays, dark grout,
yellow and orange faces, and light towers. Color bands follow the recording's
cells along each wall. Both red arrows follow the ramp triangles.
Textures are generated by the renderer from a palette sampled from arcade
captures.

Paving grays use a shared material lit by a directional sun. In native
coordinates of frame 1199, the left guardrail corners cast a shadow about
22 pixels right and 3 down. The drop from the top of the post is about 6
pixels in projection. Subtracting this vertical component and inverting the
ground projection yields an elevation near 17°. This calculation assumes a
comparable ground height at the post base and shadow tip. Each side pit uses
its own color profile and a cutout aligned to the arcade image. The visible
lip extends tiles to this cutout.

The central pit uses flat steps taken from recorded heights. Its floor is
darkened and thickened posts descend into the ground. At bottom-right,
missing corners along the outer edge caused the sawtooth seam. The mesh
extends each tile's plane and uses a continuous orange band on this wall.
The three walls under the central guardrails receive zone-selected bands.
The three tiles behind the left branch of the central railing are completed
to form a continuous seam with the wall. Both towers have a flared base and
a tapered tip. The ramps bear a red arrow and two separate spikes of decreasing
size.

The three tiles under the front-left railing are also completed to form a
continuous ledge. The upper post follows this ledge. The wall matches the
dark orange sampled in the capture, with an orange and yellow return toward
the steps. Both towers rest on their landing and the base material draws the
shoulder seam as well as stone separation.
