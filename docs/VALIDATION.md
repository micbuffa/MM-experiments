# Validation

## November 22, 2026 — Goal, tower symmetry, and walls (16:06–17:47 captures)

`npm run check`: **628 tests / 100 files passed**, formatting, lint, typing,
coverage, and build. Business logic coverage: 99.45 / 98.60 / 99.01 / 99.41%.
**Chrome: 10/10 terrain tests passed**. No dependencies or thresholds modified.

Relevant tests: 90°/180° rotations of roofs and walls, centering of the shared
apex on levels 1/5, clipping of both diagonal edges of the entire course,
toothless inner wall row, direct connection from GOAL to the slope, unchanged
projection after depth recalibration, P1/P2 marbles and preserved native poses,
bridge opening and three-cell profile shared with level 4 arches, with solid
supports at the ends.
The first full run revealed a test typing error and an old front joint
calibration; both were fixed and the full check above was then executed
successfully.

Real Chrome inspection: tops of towers on levels 1 and 5, opposite faces of the
fort, terrain boundary and straight inner wall, goal and slope in free and
arcade views. Final captures in HANDOFF. Materials remain lit: their hues may
differ depending on the face. Symmetry tests check vertices rather than capture
colors. No pixel-for-pixel identity or full played traversal is claimed.
Checking the circles hidden by the pipe remains open.

## November 22, 2026 — Towers, ramp, and silhouettes (15:26–15:31)

`npm run check`: **617 tests / 98 files**, formatting, lint, typing, coverage,
and build passed. Business logic coverage: 99.45% statements, 98.60% branches,
99.01% functions, 99.41% lines. Chunk size warning unchanged.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`:
**10/10 passed**.

Added/extended tests: closing volumes of the four corners, flatness and
connections of the small ramp, copying poses and adapting beak/feathers,
anchoring squashes to the ground and restoring the normal pose.
Chrome inspection of the three towers with shadows, the arena, the birds, and
the flattened poses after native contacts. Captures and limits in HANDOFF.
Silhouettes are visually adjusted; no pixel-for-pixel identity is claimed.
The contour of the circles masked by the pipe entrance remains to be verified:
the current native survey confirms the already visible pigments and does not
justify an addition.
No changes to the core, collisions, timings, or dependencies.

## November 22, 2026 — 14:49–14:53 fixes and Silly Race interactions

`npm run check`: **614 tests / 97 files passed**, formatting, lint, typing,
coverage, and build. Business logic coverage: 99.45% statements, 98.60%
branches, 99.01% functions, 99.41% lines. Usual chunk size warning, no
thresholds modified.

`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`:
**10/10 passed**. Chrome WebGL2/SwiftShader on real assets: native/3D
comparison of the arena and birds, then contact with each miniature type and a
bird. Positions are initialized in the test bench, but state transitions and
their delays are produced by the core.
The black marble emits the three frames 0x21f7a/7e/82 before holding; worm and
amoeba keep their squashed frame. Bird death emits state 11, counter 102 then
35..0, and glyphs 0x10b..0x112; return observed to player state 0, without
`birdDeath`. The safe point is out of frame after this teleportation: this does
not replace a played traversal.

Added tests: 2× density on arena floor AND blocks, absence of UV jumps,
continuity and height of both ridges, filling only the gray joints of the mask,
real beak separation (UV 0.0004/1.49), three squash levels, reset to normal
scale, bird orientation, independent P1/P2 reading, sentinel without old
fragments, fragment display and hiding.
The real close-up confirms **110 purple triangles + 4 yellow triangles**.

Captures and logs: see the new HANDOFF entry. No JS or shader errors in the
bench. No new Safari/audio/trackpad test pass or full game; 3D fragment shapes
and deformation correspondence visually adapted, positions and cadence read from
the core.

## November 22, 2026 — Level 5, ellipses, and towers

- `npm run check`: **605 tests / 93 files passed**, typing, lint, coverage, and
  build passed. `src/game/**` coverage: 99.45% statements, 98.60% branches,
  99.01% functions, 99.41% lines. Usual warning for chunks larger than 500 KB.
  No thresholds lowered.
- `PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`:
  **10/10 passed**. The first run without this variable could not open the
  missing Playwright Chromium; rerun with installed Chrome.
- New tests: parsing of the 141 × 141 survey, native level/descriptor, distinct
  pools of miniatures and birds, inactive/truncated slots, visibility and lack
  of autonomous advancement, decreasing scroll tracking, scene construction and
  destruction, two-facet pyramid quarters. The corner test includes a triangular
  cell before the towers to cover index shifting. The browser test verifies the
  Silly Race slider and the return to free view.
- Chrome WebGL2/SwiftShader: captures from the **same session** native and
  modern at the start, in the arena, near the birds, and at GOAL. No JS or
  shader error messages in the final bench. Bench movements are initialized in
  diagnostic RAM; this is not a full played traversal.
- Inspection of captures `/tmp/mm-level5-compare-{start,arena,birds,goal}.png`
  and `/tmp/mm-level5-fort.png`. Pigments are no longer distributed by a
  repeating texture: the mask extracted from the original map notably places
  the pink and orange ellipses of the GOAL facade at the corresponding positions
  of the native view. Hues come from native palette banks. The four tower
  corners have independent facets.
- Limits: Rolling Madness pose correspondence to sprites visually adapted;
  static decorative clock; hidden faces absent from the 2D reference. No new
  Safari/audio/trackpad test pass. Interactions remain handled by the core; no
  test certifies a full game.

## Closed and smoothed Y, interior/exterior — November 22, 2026, 11:40 capture

This entry replaces the cap-cutting reconstruction and point flattening of the
exit described previously. The audit shows that the Y extracted from Rolling
Madness is a closed surface; the spurious openings came from faces deleted and
then replaced without a complete seam.

- `refineIntermediatePipe` preserves the entire source surface and subdivides
  each triangle of the Y into four, with local relaxation of the branches.
  The thin lips of the three mouths are protected: their independent relaxation
  caused the inner/outer skins to intersect. Material boundaries and sharp edges
  are also preserved. A partial/unclosed surface is not subdivided. The separate
  J is neither moved nor subdivided.
- `fitIntermediatePipeHoods` compacts the hoods to 85% above their base and
  preserves the lowering of the junction (1.45 units maximum), via a continuous
  deformation applied identically to coincident vertices. No hood, underside,
  lip, or seam face is deleted anymore. Skin-classification flattening is
  removed: it also created degenerate triangles after subdivision.
- Normals recalculated on coincident vertices across different faces and
  materials; source normals of the J preserved. `createIntermediatePipes` also
  uses adjusted inner indices. Removed special flat normal calculation on the
  exit and the `normalW.z < -0.9` threshold which produced a sharp bright spot
  inside despite the matte material.
- No changes to local extracted data, core, collisions, or timings. No new
  dependency, scene, light, or loop. Copies and buffers are owned/disposed by
  existing meshes.

Reproducible audit, with Vite running:
`node scripts/audit-intermediate-pipe.mjs`.
It reads only the local pipe survey and prints numbers, without exporting
geometry, ROM, or heap. On the real **Y**: 352 source triangles, 1,408 after
subdivision; **0 open edges, 0 non-manifold edges, 0 degenerate triangles, 0
detected non-coplanar intersections between non-adjacent faces**, with an edge
tolerance of 0.000001 units. Smallest double area after adjustment:
0.0197808653. The separate J is outside this targeted audit; its model has
pre-existing intersections and remains unchanged.

Validation: **`npm run check` passed, 596 tests / 89 files**; coverage 99.45%
statements, 98.59% branches, 99.01% functions, 99.40% lines. The first pass
caught the use of `console` without import in the new script; replaced with
`stdout` imported from Node before passing.
Regression tests: hollow tube with lips, preservation of closure and
orientation, mouth openings, absence of degenerate triangles, unit/continuous
normals, duplicate vertices, and source immutability.
**Chrome: 9/9 terrain tests passed**. Usual large chunks warning.
Git not initialized.

WebGL2/SwiftShader inspection without JS or shader errors: three arcade framings
of level 2, four close-ups around the intakes, three around the exit, and views
actually inside the tube toward the intakes/exit.
For the latter only, the study camera distance limit is lowered in the bench,
without changing the game's navigation code.
Captures: `/tmp/mm-l2-pipe-wall-closed3-*.png`,
`/tmp/mm-y-sealed-intake-*.png`, `/tmp/mm-y-sealed-inside-*.png`.
The first arcade framings precede the removal of the light threshold; the
intake close-ups and interior views were retaken after it. No new full game,
Safari, audio, or trackpad pass.

Next action: reload and inspect the intake from the behind-the-marble view and
the exit in free view. Keep the closed source topology; do not reintroduce hood
cuts or skin flattening.

## Overhanging floor, Y roof, and false spikes — November 22, 2026, 11:24–11:27 captures

This entry replaces the shelf extension added in the previous intervention:
both alcove floors are completely recessed from the facade, each seven cells by
three. The lower shelf no longer overhangs three cells in front of the wall or
over the ice; its height is preserved. The construction test now explicitly
verifies its boundary at the x = 88 plane.

The streaks on the Y mouth roof were geometric z-fighting: both inner and outer
skins are part of `shell`, not two distinct materials. The old `interior`
criterion only recognized the interior floor, leaving both roof skins on the
same plane. `fitIntermediatePipeHoods` now uses source normals to preserve their
orientation and their 0.11-unit separation. A test covers both skins in the same
material, without an interior list. Imported source files remain unchanged.

The three small yellow/white spikes around the central tower of level 1 came
from the SW corners of three tiles (x = 28..30, z = 24) that copied the tower's
collision profile. `practiceDisplayTerrain` extends the plane defined by
NW/NE/SE when SW is abnormally raised. This removes the triangular facets and
walls above the tiling. Legitimate gray spikes and arcade rules/collisions are
preserved. Synthetic test for continuity, absence of raised wall, and
immutability.

Validation: `npm run check` passed, **591 tests / 88 files**, coverage 99.45%
statements, 98.59% branches, 99.01% functions, 99.40% lines.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`:
**9/9**. No dependency changes; usual large chunks warning. No Git repository
initialized.

Chrome WebGL2/SwiftShader, without JS exception or shader error: three arcade
framings of the end of level 2, three close-ups of the Y exit (front, top,
rear), then three views of the level 1 tower (rear, top, side).
Inspected captures: `/tmp/mm-l2-pipe-wall-inset-roof-fix-760.png`,
`/tmp/mm-spout-skins-fixed-{front,top,rear}.png`,
`/tmp/mm-opening-pits-after-{behind,top,side}.png`; before views available
under `/tmp/mm-opening-pits-before-*.png`. No new full game, Safari, audio, or
trackpad pass.

Next action: reload the application and check the three framings reported by
Michel. Do not reintroduce a platform in front of the lower alcove.

## Start pits, alcoves/Y, and vacuum backs — November 22, 2026, 10:24–10:28 captures

- **Level 1**: the black border around the pits came from transparent pixels in
  the wall atlas interpreted as opaque. BabylonJS 9.33.2 shader enables
  `ALPHATEST_AFTERALLALPHACOMPUTATIONS` with vertex colors:
  `useAlphaFromDiffuseTexture = true` is required to include the atlas alpha in
  this final test. The fix preserves existing joints and geometry. The initial
  diagnosis of a gap in the tiling is refuted by the GPU readout: the black
  pixels had the exact joint hue (24). After the fix, the tiles behind the
  cutout reappear.
- **Level 2**: both alcoves keep an identical width of seven cells, verified on
  their world coordinates. The recess remains three cells deep. The lower shelf
  is raised by 1.2 units and extended three cells forward to form the visible
  horizontal platform, instead of disappearing behind the ice. The vertical
  distance between shelves is now 9.
- The **Y** junction is lowered locally (maximum 1.45 world units) without
  moving its two hoods, its other pipe, or the outlet onto the terrain. Normals
  follow the deformation. The flared exit has a flat roof and cheeks, a distinct
  facet read from the rounded shaft, and preserves 0.11 units between
  inner/outer faces to avoid overlap. Imported source geometry remains intact;
  the adjustment is done on a copy.
- **Level 4 vacuums**: added a procedural 90° elbow between the vertical stem
  and the rear intake of the head, and closed the back of the head around this
  fitting. The elbow is parented to the support and protrudes slightly into the
  head to maintain a junction during shaking. The mouth goes from 1.70 × 0.62
  to 1.70 × 0.84 units; the shell is also taller (1.28 maximum). Native
  positions and triggers remain unchanged. No Rolling Madness asset added for
  the vacuums.

Validation: **`npm run check` passed, 589 tests / 88 files**, coverage 99.45%
statements, 98.59% branches, 99.01% functions, 99.40% lines.
The first full check flagged a forbidden type annotation in the browser test
and then an indexing to make explicit; both were fixed before the full pass.
Usual BabylonJS large chunks warning preserved. No dependency added; Git
repository not initialized.

**Chrome: 9/9 terrain tests passed**, including a GPU regression that projects
a transparent texel from the atlas onto an isolated surface: the near-black
background reappears (channels < 5), instead of the joint hue 24. Unit tests
also verify the elbow, the less flattened mouth, the seven-cell world width of
both shelves, the lower platform, the junction lowering, the exit thickness, and
the immutability of its source.

WebGL2/SwiftShader inspection: arcade framings of levels 1–3 and pipe/ice,
three close-up views of the alcoves, vacuums in front and rear close-ups.
No JS exceptions or shader errors in these inspections. Local captures:
`/tmp/mm-l1-followup3-0.png`, `/tmp/mm-l2-pipe-wall-followup6-{730,760,790}.png`,
`/tmp/mm-vacuum-followup-{front,rear}.png`. Michel's captures and the full level
2 PNG served as references. No new audio, Safari, or trackpad pass, nor a full
game; geometric adjustments remain 3D interpretations of the arcade views, not
pixel-for-pixel equality.

Next action: reload and compare the two alcoves/Y exit with the 10:24 capture,
then look at the vacuums from behind in free view.

## Level 2 recesses and level 3 green details — November 22, 2026

Fixes following the 05:04, 05:08, and 05:09 captures and clarifications on the
two niches:

- Level 2: two stacked openings, with two distinct shelves seven cells long by
  three deep, back and side returns. A solid strip separates the openings; the
  wall resumes below the second one. The Y keeps its imported branches and exit,
  but its two hoods are replaced by extruded quarter cylinders. Old triangles
  crossing the junction are clipped at the base plane. The source remains
  intact. Purples come from playfield 52/54/57, without white highlight.
- Level 3: removal of the wave height amplification (1.32×), corrected top
  normals, no shadows received on the water and its skirts, removal of the
  overlapping paved floor under its footprint. The living profile remains driven
  by arcade samples, with no new simulation; identical samples no longer
  rewrite buffers. Flat green is 63/126/99, reliefs use the wave sprite colors.
- Green borders no longer receive spurious cast shadows and remain matte; light
  hue 150/195/165. The small pyramidal cap of the V goes from 0.85 units to 16
  arcade units (1.633 world units). Its footprint is unchanged. Level 1/3 flags
  become pale yellow and black, like level 4's; level 2's remain cyan.
- Dark faces of level 3 walls now account for shadows: previously their color
  completely ignored the shadow term. A diagnostic ray confirms an occluding
  wall on the wall adjacent to the waves. Shadow contrast remains a
  presentation approximation.
- Vertical joints of levels 1–3: four pixels centered out of sixteen, instead of
  two. Measured in full PNGs: repetitions of 12 wall pixels then 4 joint pixels,
  notably level 2 line 1750 and level 3 line 2000.

Bounded graphics read: 64 playfield words at B00400, then 16 motion object
words at B002a0. Array indices 64–79 correspond to MO colors 80–95. No heap,
ROM, or state dump, no physics modified. Resources and plugins remain
owned/disposed by the existing scene.

Validation: `npm run check` passed, **587 tests / 88 files**, coverage 99.45%
statements, 98.59% branches, 99.01% functions, 99.40% lines.
Tests added for amplitude/normals/profile stability, cone height, local
replacement and pipe immutability, joint thickness; tests extended for both
shelves, flags, and palette banks.
`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`:
**9/9** passed. The first run without channel failed due to missing Chromium;
installed Chrome was used for the entire test pass. The GPU expectation for the
dark level 3 wall is updated for its new shadow (15 instead of 24).

Chrome WebGL2/SwiftShader: ten framings of levels 1–3, pipe/ice views, three
close-up views of the niches, then two comparisons with the living core at the
starts of levels 2 and 3; no JS exception or shader error observed.
Local captures: `/tmp/mm-l2-pipe-wall-revision6-{730,760,790}.png`,
`/tmp/mm-l{1,2,3}-corrected-*.png`,
`/tmp/mm-native-level{2,3}-details.png`. Animated waves are inspected on the
study page; a full human game up to the waves remains to be done. Depths are
exact as requested, but the height of the second recess and the hoods are
visual adjustments, not a full extraction of arcade geometry. No pixel-for-pixel
equality claimed. Safari and trackpad feel are not retested. No Git repository
initialized.

Concrete next action: reload the application and compare both niches from the
free view, then the waves in live play on the framings provided by Michel. Keep
the procedural vacuums of level 4.

## Native palettes for levels 1, 2, and 3 — November 22, 2026

The check requested after level 4 is applied to the three previous courses.
Colors come from the living core's palette, not from the full PNGs' palette.
Comparative captures in the same session, original on the left / 3D on the
right, for each start. The first level is reached with Credit/Start; the next
two with their local checkpoints. No heap export, ROM modification, or physics
change.

- Level 1: gray floor 180/180/180; yellow walls 255/238/0, orange 238/119/0,
  dark face 170/51/0. Existing pit and stripe patterns/UVs are preserved; dark-
  oriented faces regain their brown instead of turning yellow after the palette
  fix.
- Level 2: same gray floor; cyan walls 0/187/255, shadow 0/100/150, and dark
  face 0/54/90. Previously too-dark tiles are recalibrated. Ice keeps its basin
  atlas but uses the second bank hues: cyan 0/135/135, light 0/255/255, shadow
  0/45/45. Its white highlights are removed; highlights on blue pipes are
  reduced.
- Level 3: sand floor 210/182/140; dark gray walls 45/45/45, 36/36/36, 24/24/24,
  dark sand joints. Towers and arches keep their patterns, recalibrated to this
  palette. Waves and green borders use the second bank (99/143/121 flat,
  187/221/187 lit). The copper pipe keeps its model/position/diameter, with a
  weaker highlight.

`emulation/level4Palette.ts` becomes `terrainPalette.ts`: same bounded and
verified 32-word read, same reuse of the unchanged array, but available on all
courses. `practicePose` publishes the palette for each level and
`createLivePracticeView` transmits only its changes. `TerrainPalettePaint`
shares uniforms and their updates; `ArcadeTerrainPaint` distinguishes floor,
wall, tower stone, green, and ice. Level 4 keeps its own colors and local
shadow mask. Grain remains procedural; inherited vertex colors no longer double
floor lighting. Stones are matte. PCF filtering and a normal bias of 0.02 reduce
shadow artifacts without a new sun or map; NullEngine uses the Poisson fallback
provided by BabylonJS.

Validation: `npm run check` passed, 584 tests / 86 files, formatting, lint,
TypeScript, coverage, and build. Six new unit cases verify palette transport
for the three courses, its reuse/immutability, and uniform updates for both
banks without new resources. The terrain browser suite passes 9/9: three new
cases measure floor and dark face pixels (180/180/180 and 170/51/0; 180/180/180
and 0/54/90; 210/182/140 and 24/24/24), on synthetic terrains without ROM.
Level 4 shadow/palette regression remains included and passed.
An initial `check` hit concurrent recreation of `test-results` by Playwright;
the full check was then run separately.

GPU: Chrome WebGL2/SwiftShader; live comparisons at the three starts, then ten
study arcade framings and the two dedicated pipe/ice views of level 2, without
JS exception or shader error. Captures `/tmp/mm-native-level{1,2,3}-after.png`,
`/tmp/mm-l{1,2,3}-final-*.png`. Shadow silhouettes and material grain remain 3D
approximations; their complete equality with original tiles is not certified.
No new local shadow mask was added on these levels. Trackpad comfort and Safari
did not receive a new test pass.

Next action: human comparison after reload, notably level 3 anthracite walls,
level 1 brown faces, and cyan ice.

## Living core palette and left end shadow — November 21, 2026, 22:14/22:16 captures

This fix replaces the color calibration from the previous entry: the full PNG
remains a geometric and shadow-silhouette reference, but its palette is not that
of the Web core during gameplay. Michel's two views are indeed original on the
left / 3D on the right. A local core capture confirms coral walls 255/68/51,
their shadow 187/51/34, their dark face 119/34/17; end walls are amber
255/187/0, with shadow 221/136/0 and dark face 153/102/0. Light floor is 180
and vertical joints 70. The initial track goes from brown 75/70/60 to beige
165/143/110 and light pink 255/204/204 depending on its orientation, unlike the
uniform bronze used previously.

`level4Palette.ts` reads only the 32 useful entries of graphics RAM B00400, via
the verified pointer of the pinned binary. It checks both tables
B00000..B007ff, their handlers, the pointer, and its bounds. The
IIIIRRRRGGGGBBBB decoding reproduces native intensity. An unchanged palette
reuses its previous array. `practicePose` passes it to `createLivePracticeView`,
then to the uniforms of `Level4CliffPaint` and `Level4GoldPaint`, only on a
change. The study scene uses the same measured hues as fallback. Grays are
lightened toward the native floor 180. Stone and tracks remain matte. No ROM
byte, input, or arcade rule is modified.

The large left outer wall X=90, Z=72..90 meets no obstacle toward the sun in
the reconstructed geometry (rays verified). The shadow visible in the original
tiles is therefore supplemented by a local mask fixed to this wall's
coordinates. Its boundary is measured in the full PNG: H=16213/16203/16193 at
Z=72.5/73.5/74.5; plateau H≈16187 at Z=75.5..78.5; diagonal resumes at Z=79.5.
The mask combines via minimum with sun visibility; it removes no 3D shadows and
adds no invisible wall, texture, shadow map, observer, or GPU pass. It stops
before the posts of the second passage.

Validation: `npm run check` passed, 578 tests / 85 files, coverage, lint,
TypeScript, and build. Three new unit tests cover decoding, invalid memory,
palette change/resume, immutability, and passing to both materials' uniforms
without resource creation. The "large yellow wall" GPU test passes on a
synthetic grid without ROM and checks pixels 221/136/0 in shadow and 255/187/0
in the lit zone. The terrain browser suite passes all 6 tests, without personal
ROM.

Chrome WebGL2/SwiftShader: six study framings without JS exception and live
comparison at the start (same arcade session, arcade cameras, active capture).
Capture `/tmp/mm-live-native-comparison.png`; study
`/tmp/mm-l4-shadowpalette-{0,160,320,480,640,784}.png`. The real readout
confirms the start palette words F721/FB32/FF43. No heap export was performed.
The mask is a local restoration of the arcade shadow, not proof of missing
geometric occlusion. Other silhouettes and tile grain remain procedural
approximations.

Next human validation: reload the view and compare the start and then the large
left wall at the end. The color reference is now the living core, not the full
PNG with a different palette.

## Level 4 palette and materials — November 21, 2026

Comparison with `MM_original_levels_full_views/MarbleMadness_Level4.png` across
six arcade framings covering the level (scrolls 0, 160, 320, 480, 640, 784).
PNG color sampling, then comparison of pixel families after joint alignment and
arcade aspect correction (5/3 in X, 1.75 in Y). This diagnostic is not a
pixel-for-pixel equality: shadows, filtering, procedural joints, and some
silhouettes differ.

`Level4CliffPaint` now uses native colors: orange 204/68/0, shaded orange
153/34/0, dark red 102/0/0, yellow 255/255/0, ochre 187/153/0, and dark-face
yellow 136/102/0. Vertical joints remain gray 102. Existing friezes, low yellow
walls, and geometric fixes are preserved. The light/shadow mix uses the `key`
map, removing the unshadowed hemisphere contribution. The palette limits brown
drifts and blacks on dark faces; it is a presentation arcade treatment, not a
core modification or a new sun.

Tiles become neutral, slightly lighter and matte. Hemisphere fill for level 4
alone goes to 0.30 with a neutral ground. Golden ramps keep lit normals but
lose the vertex-color boost inherited from level 2, which washed out the right
slope. Their diffuse/emissive component limits contrast and keeps the bronze
look. Stone without specular; imported catapult fixed to pure red despite its
pink 255/68/68 source texture, with a very weak red highlight. Imported hammers
no longer have a white highlight. Procedural vacuums preserved; no asset
substitution, new texture, or new loop.

Automated validation: 16 targeted tests passed, then `npm run check` (575
tests / 83 files, formatting, lint, TypeScript, coverage, and build). Tests
notably check the absence of specular on stones, neutrality of grays, absence
of vertex over-lighting on golden ramps, and red material on imported catapult
poses.

GPU validation: Chrome WebGL2/SwiftShader, six framings, no JS exception.
Medians measured in comparable families: orange 190/80/32 → 204/68/0; red
93/14/7 → 102/0/0; yellow 241/218/36 → 255/255/0; dark yellow face 68/65/7 →
136/102/0; light tile 144/144/146 → 168/168/168 (target 170/170/170). These
numbers do not prove the match of every shadow. In particular, some large yellow
walls remain too bright compared to the reference's ochre: shadow distribution
still needs refinement. Attempts to adjust sun angle and add main tiles to
casters did not improve this enough and were not kept.

Local captures `/tmp/mm-l4-calibrated-{0,160,320,480,640,784}.png`; baseline
`/tmp/mm-l4-before-*.png`, diagnostic `/tmp/mm-color-audit.py`.
Next human validation: side-by-side comparison of deep yellow walls and
mechanisms in play. Palette calibration is complete; full fidelity of shadow
silhouettes is not claimed.

## Level 3 corridors without spurious triangles — November 21, 2026, 21:35

Implementation: 43 SW corners of the initial visual survey are recalibrated to
the plane of the other three low corners. They had picked up the plateau height
and created half a tile sloped up to the top of the walls. The fix is limited to
the initial sector and preserves NW/NE/SE heights, real slopes, and the exit
ramp. Emulation data remains unchanged.

Automated: `npm run check` passed, 575 tests / 83 files; formatting, lint,
TypeScript, business logic coverage, and build. Tests check continuity of two
floors, correct horizontal/vertical normals, absence of an inner cliff between
the two cells, and preservation of a gentle slope, the exit ramp, and cells
outside the sector.

Manual/GPU: Chrome WebGL2/SwiftShader, overview, close-up, and opposite free
views. The false white ramps and triangular notches from the captures are
reproduced before the fix and absent after. The real survey diagnostic confirms
43 cells repaired. No JS errors during rendering. Final lighting and shadow
settings remain those that were in place. The marble's path in these corridors
was not replayed in this intervention; validation covers the mesh and its
rendering from multiple angles.

## Pipe position and seven approach cells — November 21, 2026, 21:24

Implementation: pipe/block assembly shifted by one cell toward +Z. High block on
Z=76..78, opening on Z=79..82, right edge connected to platform Z=83. Old row
Z=75 and floor under the funnel flattened to the lower height. The shell and
lining keep the same offset and previous widening.

Automated: `npm run check` passed, 573 tests / 82 files; coverage, lint,
TypeScript, and build passed. The test verifies seven cells before the block,
three high rows, no gap before the right terrace, and a mesh footprint from Z=79
to Z=83, with the same transform for shell/interior. Source survey and geometry
are preserved.

Manual/GPU: Chrome WebGL2/SwiftShader at scroll 540 px, no JS errors. The seven
cells, block, and right connection are examined in
`/tmp/mm-2124-level3-pipe.png`. The marble's real path in the arcade core was
not replayed during this presentation fix.

## Pipe, tiles, and vacuums — November 21, 2026, 19:23/19:33

Implementation: level 3 vertical conduit widened by 22% with transitions,
imported source preserved; high row Z=75 restored in front of the funnel, i.e.
three tiles on Z=75..77; new fully procedural vacuums, with shallow rectangular
mouth, golden bottom, and conduit ribs. Head shaking driven by active frames
emitted from the 68010, without local time-based animation. The rest of the
conduit does not move.

Automated: `npm run check` passed, 572 tests / 82 files; formatting, lint,
TypeScript, business logic coverage, and build passed. Tests verify marble
clearance by the octagonal conduit's apothem, unwidened edges, preservation of
source data, all three full rows, both emitted frames for each orientation,
stopping of shaking on retract/reset, and signal passing through the live view
to the head.

Manual/GPU: Chrome WebGL2/SwiftShader, level 4 at 180/250 px and level 3 at
540 px, no JS errors. Both active phases are injected into the presentation
setter: mouth movement, fixed conduit, rectangular silhouettes, and golden
bottoms inspected. The 1.35-diameter test sphere is hidden in the widened
conduit (0 blue pixels) and visible if pipe meshes are disabled (2099 blue
pixels). The third row and its joints are visible to the left of the lip. This
is not a full replay of native pipe entry nor of native vacuum suction until
respawn; these two sequences remain for Michel to evaluate during a game.

## Arch contours — November 21, 2026, 19:12

Implementation: first pair thicker (intrados 16249..16255), second thinner
(16256..16262), simple sinusoid instead of a 0.55 power. Three-cell spans and
connections to platforms preserved. Horizontal edges revert to gray stone;
lighting and shadows maintained.

Automated: `npm run check` passed, 568 tests / 79 files. Seven measured points
of each pair's profile, within a one-arcade-unit tolerance of depths sampled
from the original raster contours. Existing tests for normals, dimensions,
preserved walls, and shadows remain.

Manual/GPU: Chrome WebGL2/SwiftShader at 570 px, no JavaScript errors.
Overlay aligned on joints: original image at 960 px wide and 3580.5 px high for
the 1120×840 framing; vertical stretching of the arcade view requires two
distinct factors. With local tile alignment, at the three check columns
75/95/115 of the cutout, the front contour of the first pair is 126/133/150 px
in the reference and 126/133/151 in the render, versus 106/115/129 before the
fix. These three measurements concern the contour, not all colors or raster
reproduction.
For the second pair, columns 252/272 give 457/451 px in the reference,
456/451 after the fix, versus 484/476 previously.
Both pairs and their shadows were also examined visually.

## Post shadow, axle, and end of level 3 — November 21, 2026, 19:00

Implementation: preservation of terminal walls X=87/90 under the banks, shadow
reception restored on the landing mesh, quad splitting compatible with colors.
Ends of imported axle shortened in all poses from the rest mask, without
changing the source. Level 3 slider travel extended to 840 px, GOAL fully
visible.

Automated: `npm run check` passed, 567 tests / 79 files; lint, TypeScript,
build, and business logic coverage above thresholds. Geometric tests for
preserved surface at both ends, caster and receiver list, quad preservation,
axle rendering without modifying cup/source, and projection of the lower corner
of GOAL at 208 pixels in the 240-pixel frame.

Manual/GPU: Chrome WebGL2/SwiftShader, level 4 at 510 and 620 px, level 3 at
maximum 840 px; no JS errors. Axle tucked into walls and full GOAL plaque
visible. Comparing the render with/without only the mesh
`level4-lower-bridge-arches` among the casters modifies 4,380 pixels of the
right wall's window (635..741, 420..592), RGB threshold > 6. The curved boundary
is visible on the restored wall; no new local map and no observed return of
self-shadowing streaks in these captures. The shadow is a 3D projection and
remains for Michel to evaluate against the arcade drawing.

## Level 4: native animation and finishing touches — November 21, 2026, 18:35

Implementation: reading the emitted hammer frame at object+0x42, native
repetition table shared by both representations; gray U top without gridlines;
lighting of inner faces and shadow reception of both arches; fully yellow low
walls; yellow flags.

Automated: `npm run check` passed, 565 tests / 78 files; business logic
coverage 99.45% statements, 98.59% branches, 99.01% functions, 99.40% lines.
The reader is tested with a next-frame pointer distinct from the emitted frame,
as well as an unaligned entry and truncated memory. Pose tests compare copies
of buffers to genuinely detect differences.

Manual/GPU: Chrome WebGL2/SwiftShader, views 510/620/784, no JS errors.
Visual comparison to original captures: gray U without surface joints, lit
orange inner faces, yellow low walls without red frieze, pale yellow flags.
Two A/B comparisons in the arch windows (RGB difference > 6): first zone 524
modified pixels when reception is cut, 8,087 when the sun is cut; second zone
7,361 and 11,085 respectively.
Removing both pairs of arches from casters modifies 7,353 pixels in the
second passage's window. In the first passage, the shadow of other walls
covers the projection: this same comparison does not distinguish an additional
contribution in the examined window. Both meshes remain registered as casters,
and the first pair does receive shadows.

68010/MAME: creation and coordinates of the objects were confirmed by a local
MAME 0.271 probe. Scripts, zone transitions, cadence, and the last-frame field
are verified in local disassembly. Teleportation attempts did not achieve a
full strike replay: perceived synchronization with collisions remains for
Michel to verify while playing the zone. 3D pose correspondences are not
identical sprites.

## Start: wall without yellow and large wall shadow — November 21, 2026, 18:00

Implementation: yellow coloring and its frieze are restricted to sectors
X+Z >= 120. The X=22/Z=18..23 facade keeps the reference's orange hue, without
a false self-shadowing line. Intersection walls are no longer excluded from
the main light: they receive the full level map, which includes the large
cliffs. The local map and its light are removed.

Automated: `npm run check` passed, 563 tests in 77 files. The projection test
verifies that walls, cliffs, and ramps are associated with the same shadow map
and that the receiver is no longer excluded from the sun. Business logic
coverage, lint, TypeScript, and build passed.

Manual/GPU: Chrome WebGL2/SwiftShader at scrolls 0/160/620 px, no JS errors.
Check of the left region: zero yellow pixels in the examined window; yellow
remains present in the downstream sector. Check of two points under the left
arm: orange color, without the previous dark band. Sun comparison with/without
shadows: 6,211 different pixels in the right wall's receiving window. Captures
wait for scene availability and several frames of the application loop,
without added manual rendering.

The contour is that of a 3D-computed shadow; an exact match with arcade pixels
is not certified. To be compared by Michel against his 18:00/18:02 captures in
the reloaded view.

## Ramp connection, lighting, and shadows — November 21, 2026

- Implementation: shared edge at X=82, unified normals on a tile, incoming
  walls restored behind ramps, local shadow reception separated from the
  banner. `twoSidedLighting` fixes visible back faces. Orange/dark red palette
  recalibrated and bright red reduced.
- Tests: `npm run check` passed, 563 tests / 77 files. Checks for stepless
  connections, normals, 5- and 3-cell UVs, restored walls, casters/receivers of
  the local map, and disposal with the scene. Business logic coverage above
  thresholds, lint, typing, and build passed.
- Chrome WebGL2: 0/160/620 px captures and native overlay at start, no JS
  errors. Toggling local shadows modifies 1,420 pixels in the examined
  receiving zone. Shadows remain 3D projections, with a contour different from
  the arcade drawing.
- Comparison: 5- and 3-cell golden arms, 9- and 7-cell gray paths. Native full
  view overlaid at 5/3 scale, translation (76,-1) for the 1120×840 viewport.
  Joint pitch matches; their gray is 102 and their width corresponds to the 4
  pixels out of 16 measured in the reference. Golden joints were lightened to
  ochre. Reference PNG samples: native dark red 93/14/7, rendered 95/14/7;
  native orange 189/78/32, rendered 190/80/32. These values do not certify a
  display's color profile or the identity of all shadows.
- To be validated by Michel: evaluation during gameplay. No modification to the
  arcade program or emulation schedule.

## Second arch connections and cube outlines — November 21, 2026

Implementation: two horizontal arch tops at 16272; two central cells at
16260 and a slope on each side on landing X=90..94; shared vertices on both
rows of the X=94..98 climb. Local frieze at 16228 and red paint on
longitudinal walls. Narrow landing walls are separated from global shadow
receivers, without duplicate triangles. Both terminal cubes of the golden ramps
have a lighting-independent gray outline, offset outward to avoid z-fighting.

Automated: `npm run check` passed, 560 tests in 76 files. Tests verify
horizontal tops, central flat width, slope connections, outlines and their
cleanup, as well as wall partitioning. Business logic coverage above thresholds,
lint, TypeScript, and build passed.

Browser: Chrome WebGL2/SwiftShader, captures at scrolls 0/510/620/784 px
examined, no JS errors. Temporary comparison with shadow reception
enabled/disabled: the landing streaks indeed came from self-shadowing. Local
separation removes these streaks while preserving cast shadows. Gray outlines
visible on both cubes, separating the left cube from the red wall behind it.

To be validated by Michel: visual evaluation in his gameplay view and traversal.
Arcade rules and core synchronization are not modified here.

## Ramps, arches, and hammers — November 21, 2026

- Implementation: two suspended ramps without solid walls; first passage
  lowered; second passage normals fixed; two bevels preserved on its landing;
  hammers flipped onto X=105. Gameplay mode follows only RAM pointers,
  converting arcade units to cells.
- Automated: `npm run check` passed, 557 tests in 76 files, with formatting,
  lint, TypeScript, V8 coverage, and build. Targeted regressions cover normals,
  bevels and connections, single undersides, RAM coordinates, and lack of
  autonomous live animation.
- Browser: Chrome WebGL2/SwiftShader, arcade views at 0/510/620/784 px,
  captures examined, no JS errors. Injection of four test RAM records: poses
  2/6/9/12, four visible models, anchors X=105.45 and Z=102.5/104.5/106.5/108.5.
  Geometries do not change after 20 render notifications without a native update.
- Original: 68010 disassembly for scripts, scroll-triggered creation, and zone-
  transition wake-up. MAME 0.271 confirms four waiting objects with RAM X=840
  and Z=816/832/848/864. The test that wrote the zone directly did not trigger
  the transition routine and does not prove the strike.
- To be validated by Michel: F4 played traversal, evaluation of movements and
  collisions together. Timing comes from the core; correspondence between
  arcade frames and imported poses remains a visual adaptation.

## Architecture of the two arches — November 20, 2026 evening

`npm run check` passed with 553 tests.

The local reference mesh allowed measuring 0.1-cell strips. The test verifies
that the cliffs closing the first passage are removed, that the strips leave
the center open, and that their profile remains thin. The artificial platform
of the second crossing was removed and lower surfaces are no longer
duplicated. Chrome WebGL2 rendered both passages at 510 and 620 px, without JS
errors. Self-shadowing of both strips is disabled to avoid artifacts from the
global shadow map. Height calibration remains a visual adaptation of the
reference.

## Fixes after arch and cylinder comparison — November 20, 2026

Tests verify the new bounds of the arches under the transverse section and
their reduced height. Retracted cylinders use a horizontal disk and a dark gray
outline. Joints and frieze are modified only for level 4 presentation. Arch
calibration remains to be tested against a played traversal.

## Level 4 additions — November 20, 2026

`npm run check` passed with 551 tests.

Tests for openings under the bridge, both arcs, and keeping cylinder heads at
rest. Gray caps and both arches were examined in Chrome WebGL2 at scrolls 440
and 510. Two-tone walls and their frieze are estimated visual adjustments.
Catapult overlap and textures were fixed, with a more precise local shadow map.
Validation of the six passages in-game remains to be done.

## Wall connections and pipe extension — November 20, 2026

The test scene verifies the deep walls of the U-support, their material shared
with the cliffs, and the gray top. It also verifies that the tube descends
below the floor and that the bell protrudes beyond its axis. Visual check in
Chrome performed, without JavaScript errors. `npm run check` passed with 550
tests.

Bounds comparison of the `hoover_down` model was performed on its first and
last poses. Animated calibration in-game remains open.

## Catapult from Rolling Madness 3D — November 20, 2026

Michel indicates having obtained the author's agreement for reuse. The rest
catapult and its 22 poses were extracted with their normals, UVs, and texture.
Chrome displays the local mesh on level 4 without JavaScript errors. The scene
test verifies pose selection on native signal and return to rest. Chrome also
verified vertex changes between two firing poses and the presence of the local
texture. `npm run check` passed with 550 tests. Animated calibration in-game
remains to be verified.

## Level 4 mechanism overlay — November 20, 2026

MAME 0.271 captures of frames 1177 and 1297 were loaded into the study page at
50% opacity, at scrolls 128 and 314 px. Comparison shows a residual offset of
scenery contours. Scene tests verify that the conduit envelope is on the outer
side of the track edge for both orientations and that the shifted axle does not
alter the cup center at rest. Joint material was verified in Chrome WebGL,
without JS errors. `npm run check` passed with 549 tests.

## Native cylinders and level 4 mesh details — November 20, 2026

The MAME 0.271 probe recorded the transition to zone 4, table creation, and
first poses of the three groups. Tests verify slot addresses and independence,
conversion of rise and retract, and return to hidden. Shapes of the spout and
tiled support were examined in Chrome on the study page. Test RAM displayed
four slots observed in MAME at multiple heights in Chrome WebGL2.
`npm run check` passed with 549 tests. Verification of a played traversal in
the Web core remains open.

## Visual details of vacuums and catapult — November 20, 2026

Scene tests verify that the baseplate touches the tiling, that the fixed
structure keeps its position during firing, and that the cup remains centered
at rest. The suction fitting and native poses keep their existing tests.
Verification of both new models in Chrome at 280 and 440 px on the study page.
`npm run check` passed with 547 tests.

## Level 4 vacuum and catapult — November 20, 2026

A MAME 0.271 probe with the TTL BIOS observed catapult rest, firing start, and
next pointers. Marble position and velocity were initialized upstream to reach
the zone. Tests verify reading of suction and firing, cup alignment, its rest
without native signal, convergence of fragments, and their retraction during
reconstruction. The full level 4 survey was also rendered in Chrome WebGL2 with
control poses. The marble appears centered in the cup. Rest, lift, and return
were verified in world coordinates. The marble disappears during suction and
all eight fragments are completely hidden at the end of the effect. No JS
errors. `npm run check` passed with 547 tests. A full traversal of both
obstacles in the Web core remains to be verified.

## Marble suction — MAME observation — November 20, 2026

A controlled replay of level 4 under MAME 0.271 captured the intact marble at
1177, fragments at 1184 and 1200, then their disappearance at 1232. The state
`0x0a` counter starts at 32 and the physical pose remains fixed during this
sequence. State `4` appears at 1242. The three remake meshes were read from
local extraction. Poses, triangle counts, and material references are listed in
[the handoff](../HANDOFF.md#aspiration-de-la-bille--comparaison-des-deux-jeux--20-novembre-2026).

## Level 4 procedural vacuums — November 20, 2026

Tests verify poses read for both vacuum types, hiding at rest, and independent
deployment. Chrome WebGL2 rendered the local level 4 survey using test RAM fed
with pointers observed in MAME. Six mechanisms present in the scene, none
visible at rest, and two successive openings verified. `npm run check` passed
with 545 tests. F4 resume is confirmed in Chrome. Vacuum slot initialization
was not observed during artificial movement in the Web core. A full game via
F4 remains to be verified.

## Level 4 vacuums — MAME probe — November 20, 2026

Capstone was used to read the 68010 from the local archive. MAME 0.271 with
the TTL BIOS confirmed all six waiting actors, state change upon crossing a
boundary, return to empty frame when leaving the zone, and retraction after
capture. Positions/velocities were artificially initialized before crossings.
The probe then observed native simulation and its RAM pointers. Address details
and recorded frames are in [HANDOFF.md](../HANDOFF.md#aspirateurs-du-niveau-4--déclenchement-arcade--20-novembre-2026).

## Level 4 procedural mechanisms — November 20, 2026

The NullEngine test verifies anchoring on a slope, absence of mechanisms over
a missing tile, catapult arm direction, and evolution of moving parts in
deterministic time. `npm run check` passed with 542 tests. Chrome captures of
the study scene examined at 315, 494, and 750 px. Cycles are presentation
animations. Interactions during a game remain to be verified.

## Local extraction of Rolling Madness 3D — November 20, 2026

Binary Refinery 0.11.3 decompressed the 329 files listed in the Inno Setup
5.0.4 table. The first attempt revealed a checksum mismatch on the game binary.
Local decoding of the legacy x86 filter restored all nine filtered binaries.
Sizes and Inno checksums of all 329 files match. The SHA-256 manifest validates
all 339 outputs, including wizard resources and exported metadata. The existing
converter exported its 11 models to a temporary JSON. Mesh data matches the
current local library. The only different texture is `amoeba.png`.

`npm run check` passed with 541 Vitest tests. Verification covers file
extraction and reading. Integrating the models into the scene and verifying in
a browser remain to be done.

## Level 3 — fluid amoebas, RAM-synced wave + joints, flush pipe, and acid melt — November 19, 2026

Implementation: world interpolation + directional stretching of amoebas in
`createIntermediateActors.ts`; native `waveProfile` reading (22 triplets
`0x772 + i * 6` from ROM table `0x1d370`) and `melt` (`state === 9`,
`word(base + 0x74)` `0x1062..0x107a`) in `practicePose.ts`; routing
`animation === 9` to `player_melt` in `createMarbleAnimation.ts`; real-time
`setLevel3WaveProfile` sync + strong contrasted relief + striped flanks
`level3-wave-sides` + opening `z = 78, x = 76..78` of the copper pipe + warm
sand/brown palette + 2 symmetrical bumps + niches to the edge in
`createLevel3Materials.ts`, `createTerrainStudy.ts`, and
`createLivePracticeView.ts`.

Automated: `npm run check` (Prettier, ESLint, strict TypeScript, 536 Vitest
tests + V8 coverage ≥ 90%, Vite build) with tests added in `practicePose.test.ts`
and `createTerrainStudy.test.ts`.
GPU visual (Chrome DevTools on `http://127.0.0.1:5173/terrain.html`): captures
verified at `0 px`, `500 px` (flush pipe funnel, vertical wall without spurious
triangle, 2 asymmetrical bumps with cut corner, niches to the edge) and
`736 px` (final brown slopes without spurious green tile, turquoise low walls
without white highlight, single cap at central V hollow `(99, 92)`, arched
wave with vertical joints).
To be validated by Michel: video of amoebas and `player_melt` melting + live
check of the wave without spurious plateau.

## Level 3 — full scroll, native amoebas, textured towers, niches, and shadows — November 19, 2026

Implementation: `level3LastSurveyedScroll = -15440` (`736 px`) in
`practiceTerrain.ts`; reading of 8 native amoeba slots (`0x1482 + i * 0x42`,
`kind = 'acid'`) in `intermediateActors.ts` and animated rendering
`arcade-acid-0..7` in `createIntermediateActors.ts`; stone/pilaster texture
`level3-tower-stone` on both start towers, 6 rows of recessed niches
`carveLevel3WallNiches` faithful to `MarbleMadness_Level3.png`, raising/tinting
of the copper pipe, full flanks of the turquoise wave (`createLevel3Wave`),
and smoothed turquoise wavy low walls + pyramid (`level3-turquoise-curbs` /
`level3-turquoise-spike`) in `createLevel3Materials.ts`; shadow lightening
(`fill.intensity = 0.34`, `shadows.darkness = 0.28`) in `createTerrainStudy.ts`.

Automated: `npm run check` (Prettier, ESLint, strict TypeScript, Vitest + V8
coverage ≥ 90%, Vite build) with tests added in `intermediateActors.test.ts`
and `createTerrainStudy.test.ts`.
GPU visual (Chrome DevTools on `http://127.0.0.1:5173/terrain.html`): captures
verified at `0 px`, `250 px`, `500 px`, and `736 px` (slider max raised to
`736 px`).
To be validated by Michel: live gameplay test of Level 3 (scrolling to GOAL and
amoeba visibility).

## Level 3 — steps 1, 2, and 3 (MAME survey, scenery, and live wiring) — November 19, 2026

Implementation: MAME 0.271 extraction of the complete `118 × 118` survey of
level 3 + copper pipe from `lev3.ase.mesh` (`scripts/add-level3-pipes.mjs` →
`local-roms/level3-terrain.json`); `'level3-terrain-v1'` support in
`practiceTerrain.ts`; smoothing of ditch edges, vertical copper pipe
(`createLevel3Pipe`), animated turquoise wave (`createLevel3Wave`), `GOAL` and
yellow/black flags in `createLevel3Materials.ts`, `createPracticeGoal.ts`, and
`createTerrainStudy.ts`; live wiring `0x2cd9e` in `practicePose.ts`,
`createLivePracticeView.ts`, and `feasibility.ts`.

Automated: `npm run check` (Prettier, ESLint, strict TypeScript, Vitest + V8
coverage ≥ 90%, Vite build) with tests added in `practiceTerrain.test.ts`,
`practicePose.test.ts`, and `createTerrainStudy.test.ts`.
GPU visual (Chrome DevTools on `http://127.0.0.1:5173/terrain.html`): level 3
loaded without runtime error, verified on `Arcade framing` (`0 px` and
`250 px`) and `Free view` (copper pipe, turquoise wave, and `GOAL` + flags
visible).

## 4096 shadows, pits, guardrails, auxiliary piston, L1 spike, and L2 alcove — November 19, 2026

Implementation: 4096 shadow map on Practice Race and tightened
`bias`/`normalBias` in `createPracticeSun.ts`; resetting normals to `(0, 1, 0)`
for `extendPracticePitRims` rim extensions in `createTerrainStudy.ts`;
increased diameter of red guardrails (`0.36/0.38`) in
`createPracticeGuardrail.ts`; back-and-forth animation at 4.5 Hz of the small
right piston (`auxiliary-plunger` + `auxiliary-cap`) in
`createIntermediateBridgeMechanism.ts`; closing of notch `(62, 82)` at the end
of level 1 (`practiceChannelTerrain.ts`); widening of the alcove behind the ice
to 7 tiles (`z = 76..83`) and shelf height adjustment (`intermediateLandmarks.ts`);
removal of internal collision tiles at the Y blue pipe supports (`z = 85..86`
and `z = 91..94`) with trapezoidal interior floor strictly inscribed in the
exit (`z = 92.9..95`) in `createTerrainStudy.ts`; strictly hexagonal shading of
the icy basin in `intermediateIceMaterial.ts`; fine calibration of
`bias`/`normalBias` (`0.00045`/`0.01` and `0.0005`/`0.011`) in
`createPracticeSun.ts`.

Automated: `npm run check` (Prettier, ESLint, strict TypeScript, Vitest + V8
coverage, Vite build).
GPU visual (Chrome DevTools on `http://127.0.0.1:5173/terrain.html`): verified
on views `Arcade framing` (0 px — 5 clean pits without acne or white gaps),
`Pipes and ramps` (flush Y pipe without overhanging tiles or floor), and
`Ice and goal` (sharp hexagonal basin inscribed in a circle + alcove).

## Shadow acne, specular marble, pipe, waves, ice, and alcove — November 19, 2026

Implementation: removal of `floor` from shadow casters and `bias`/`normalBias`
adjustment in `createPracticeSun.ts`; separation of the two start pits
(`terrain-pit-walls`, `receiveShadows = false`); two-tone marble texture +
spherical reflection (`Texture.SPHERICAL_MODE`) inspired by Rolling Madness 3D
(`player.png` + `player_env.jpg`); darkening of pipe interiors + `interior`
shadow caster; fix of `intermediateWaveCell` on `z = 81` and slope contrast
via vertex colors (`intermediateSlopeColors`); vertical ribs (`joint(z - x)`)
on flat ice; recessed alcove + gray tiled shelf (`intermediate-alcove-shelf`)
in the blue wall behind the ice; explicit error reporting in `src/terrain.ts`.

Automated: `npm run check` (Prettier, ESLint, strict TypeScript, Vitest + V8
coverage, Vite build) and `NullEngine` verification on both real surveys
`practice-complete-terrain.json` and `intermediate-terrain-pipes.json`.

Limits: visual test pass in Chrome to be confirmed by Michel on
`http://127.0.0.1:5173/` and `http://127.0.0.1:5173/terrain.html` (Playwright
sandbox blocked on loopback).

## Level 1 & 2 finishing touches, sweeper, and synced bridge — November 19, 2026

Implementation: RAM synchronization of the sweeper (`0x72`/`0x7a`/`0x7f`) with
ground recalibration and `0.84` scale; RAM synchronization of the Intermediate
Race bridge (`0x772`/`0x774`, steps 0..6); mechanism wheel moved to the left
of the piston; static shadows of pipes on blue walls
(`intermediate-pipe-wall-light`, `REFRESHRATE_RENDER_ONCE`); floor preserved
at the marble's foot in `chase` camera and `chase` restricted to 1-player mode;
marble texture with 6 rings of 8 yellow dots without distortion; 4-line GOAL
frame on Practice Race; clipping of `±21` boundary diagonals on Practice Race;
3D maintained during `mode === 4` (Out of Time / Game Over) with alpha-RAM
reading; linear opening sweep end → start.

Automated: `npm run check` passed (530 Vitest tests, V8 coverage, ESLint,
strict TypeScript, Vite build). New unit and NullEngine tests for each point
above; GPU assertion added in `tests/browser/occlusion.spec.ts`.

Limits: Playwright Chrome execution in the network sandbox fails with
`net::ERR_ACCESS_DENIED` (`127.0.0.1:5173`) and the host's Chrome did not have
remote debugging enabled. Visual test pass and
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser` remain to be confirmed on
Michel's machine.

## Materials, magic, GOAL, and occlusion — November 19, 2026

Implementation: single paint and specular per player across normal/dizzy/broken
shapes; partially emissive yellow marks and repeated UVs, required by V=1..2
coordinates of local models. Wand and stretching driven by native state 8;
+10 SEC read from native notice; score notices read without inference on HUD
deltas. The black ball produced 1000 points in the native survey; this event
is distinct from the wand's +10 SEC. The pointer also differentiates the real
−5 SEC from other notices. Emissive blue/red Intermediate GOAL according to
who arrived first; thickened worms; piston and bridge base moved closer to the
slope and observed at the arcade angle. Occlusion: local corridor through
walls in Behind camera, fast opening with soft edges, and restoration outside
corridor/outside camera.

Automated: `npm run check` passed, 515 Vitest tests. Tests added for shared
paint, repeated UVs, magic/stretching/stop, 1000 bonus, score/+10/−5
separation, Intermediate GOAL, and fade inversion. Coverage thresholds are
preserved. Build passed with the pre-existing warning on BabylonJS chunk sizes.

Chrome: 32 control, view, and occlusion tests passed. The new GPU test
measures marble pixels behind an opaque wall, after opening, after corridor
movement, and after disabling; the wall becomes opaque again without the level
disappearing. It does not rely solely on NullEngine.

Local tests: same MAME session, F2 idle for eight seconds, three V views, F2
under capture, C and behind command. WebGL captures inspected on P1/P2
normal/dizzy/broken shapes, wand at native RAM 2526/2580/2690, +10 at 2710
and 1000 reward at 2936, bridge from the arcade angle. No JavaScript errors or
console errors on the visual bench. Material/effect tests replay poses in the
presentation; they are not a full game or a new injection into Web gameplay.

Limits: spontaneous wand appearance was not replayed; its old MAME bench
activates the pending flag then lets the arcade run the effect and its timer.
Delivered code forces no bonus. Visual finishing of worms, GOAL at the end of
a real course, and complex occlusion corners remain to be replayed by Michel.
Real Safari not retested. The sweeper still needs to be synchronized and
finely recalibrated; the bridge keeps its study cycle.

## Worms, end of game, and capture click — November 19, 2026

Implementation: articulated worm with alternating supports, curvature with two
ends on the ground, attack and meal phases (flat mouth, bell, straightening,
tongue). Phase determined by the arcade script and its fraction, not by a
private clock. Removal of the melt puddle on the native swallowed-marble state.
Return to native results/game over screens, without keeping a motionless
terrain. Click on 2D/3D images to resume and capture.

Automated: `npm run check` passed, 505 Vitest tests. New tests: motionless
supports during the other half-step, four native directions, meal progression,
late tongue, geometry reuse, stop/hide, absence of puddle, native menu/level
phases. Global coverage: 99.41% statements, 98.58% branches; thresholds
unchanged.

Reference: new MAME replay of original course inputs, frames 3138–3258 and
local RAM. 3D poses inspected in Chrome at native frames 2970, 2986, 2998,
3138, 3170, 3206, 3250. Double support and mouth/bell/tongue phases are
present. Geometry is reconstructed: this is not a pixel-for-pixel reproduction
of sprites. In-game comparison to be validated by Michel, especially at
direction changes and contacts.

Real end of game: F2, capture, 82 seconds without inputs. Timer reaches zero,
native mode goes from 0 to 4 then 1; display switches to direct source,
attract mode continues, no pause or JavaScript errors. This test neither
accelerates nor modifies the timer. Temporary log `/tmp/mm-timeout.json`.

Automated browser: 31 Chrome tests (`video.spec.ts`, `controls.spec.ts`)
passed after fixing the view-change case during results. The new click test
uses real Pointer Lock and verifies both canvases, Escape, and unmount. Test
with the real core: three capture/resume/Escape cycles (3D, 2D, 3D), advancing
frame counter, single session, no JavaScript errors. The bench waits for
diagnostic refresh after Escape. Real Safari was not retested in this batch;
its simulated compatibility test remains in the Chrome suite. Pre-existing
large chunks warning at build.

Topics for wand, sweeper, and normal/broken material remain open in
[ANIMATION_AUDIT.md](ANIMATION_AUDIT.md).

## Sweeps and camera transition — November 18, 2026

Implementation: position/target transition and projection toward each of the
four framings; preparation of preferred terrain without a brief return to
arcade video; automatic sweep on each new compatible scene and after F2.
Reading of level 2 during its native introduction. Time comes from the core,
so it remains frozen when paused. F2 resumes an already playable state: the
timer continues during its sweep; C interrupts it. A null pose keeps the
prepared 3D terrain with actors hidden; a portion outside the partial survey
keeps the arcade fallback.

Automated: `npm run check` passed, 496 Vitest tests. Five camera tests added:
matrix/framing continuity at sequence end for all four presets, pause,
duration, re-arming, and manual switching. An additional test verifies reading
the next level during the native countdown.

Browser: all 14 Chrome tests in `video.spec.ts` pass on the first check. Real
test with local core: F2 start motionless at (220,108) for eight seconds, V
through the three views, F2 under capture, C and input in rear camera, no
JavaScript errors. WebGL captures of level 1 at progressions 0, 0.65, 0.8,
0.95, and 1 inspected at transition phases; no JS errors on this bench.
Cinematic comfort remains for Michel to evaluate. Build keeps its pre-existing
BabylonJS chunk size warning.

Previously requested animation fixes are not delivered with this transition.
Their observations and limits are preserved in
[ANIMATION_AUDIT.md](ANIMATION_AUDIT.md).

## Ice and low marble framing

Tests verify projection of reflections on slopes, diagonal grid of flat tiles,
connection of drips on the cliff and in the hole, and maintaining camera
heading when stopped. Shortcut C selects the low framing in the 3D game.
Chrome captures of the basin from above and obliquely show its joints and
drips. The low view was tested on the final descent of Practice Race with
poses drawn from the replay. `npm run check` passes with 474 Vitest tests.
All 49 Chrome tests pass.

## Ice, goal, and pipe connections

Tests check tiles covered by gray coating, shadow reception, piston alignment,
and edge setback relative to the deck top. The last section was inspected in
the **Ice and goal** framing in Chrome with the turquoise basin, gray GOAL
marking, and its two animated flags. The finish palette is that of the study.
`npm run check` passes with 470 Vitest tests. The Chrome rerun on the
stabilized version passes all 49 tests after a fixture loss on the first pass
during a source edit.

## Shadows, spikes, and pipe interiors of Intermediate Race

Measurement of the peak and its shadow comes from the local arcade capture at
306 px. Tests check projection (79 px right and 19 px down), cap profile,
shadow reception by cliffs, and lining cutout in the mouths. Chrome visual
checks at 0, 218, and 306 px and in free view on both pipes. `npm run check`
passes with 469 Vitest tests. All 49 Chrome tests pass.

## Bridge and final section finishing of Intermediate Race

Chrome was used to inspect the raised bridge edge, its mechanical parts, both
pipes, the first pipe's wall, and the final basin. Tests cover imported
normals, seam cutting, gray exit material, and geometry connections.
`npm run check` passes with 466 Vitest tests. All 49 Chrome tests pass.

## Thickened bridge, ripples, and pipes of Intermediate Race

Tests cover tile connections, rigid bridge edge, piston placement, framings,
and indices of imported faces. In Chrome, the local survey with pipes displays
both mouths and their connections to the course. The low framing lets you see
the deck and part of the moving mechanism.

MAME 0.271 reproduces disappearance under the worm and breaking followed by
the sweeper with the two commands from `docs/PROTOTYPE_04.md`. In Chrome, the
Web core's save state restores the position and descriptor of Practice Race on
a subsequent iteration. Starts at levels 2 to 6 were not validated by
restoration. `npm run check` passes with 458 Vitest tests. All 49 Chrome tests
pass.

## Articulated bridge and shadows of Intermediate Race

MAME 0.271 replay confirms movement of the free edge, fixed height of the
hinge, and a 144-frame cycle. Tests verify these poses, corner connections,
deck visibility volume, and surfaces included in the shadow map.

In Chrome, captures at 0 and 218 px show shadows in pits and on ramps. At 306
px, the arcade framing shows the bridge. Both extreme positions were also
verified in free view. The mechanism is a visual reconstruction and the study
cycle runs independently of the core. `npm run check` passes with 439 Vitest
tests. All 49 Chrome tests pass.

## Pyramids of Intermediate Race

All three bases were checked in grid and on screen. The test verifies the 14
tiles, offset of the last row, and relative height of the cap. Rendering was
compared to the arcade capture at 218 pixels of scroll in Chrome.
`npm run check` passes with 433 Vitest tests. All 49 Chrome tests pass.

## Isolated blocks of Intermediate Race

Tests reconstruct the top of four representative blocks, including the one
truncated at the survey edge. They verify the four flat tiles, eight edge
faces, and spaces between blocks. All four groups were inspected in Chrome in
arcade view and oblique view. `npm run check` passes with 432 Vitest tests
and all 49 Chrome tests pass.

## Ledges of Intermediate Race

Les captures Chrome à 0, 218 et 306 pixels de défilement ont été
comparées aux captures arcade. Les cinq rebords et les jonctions
retouchées suivent des arêtes droites. Les tests vérifient les parois
des fosses, leur intérieur en retrait et les coins complétés aux
emplacements relevés. `npm run check` passe avec 428 tests Vitest.

## Premier relevé d’Intermediate Race

MAME 0.271 replay `measure-terrain.mjs --intermediate` reproduces the local
130 × 130 cell grid. Start, ramp at 218 pixels, and plateau at 306 pixels of
scroll were compared in Chrome against native captures. The browser test loads
the new format and moves the framing. Unit tests cover the format, level
depths, and connection of the three strips of the large ramp. Start pit edges
and scenery beyond the plateau remain to be refined. The scene is available
in the study page.
`npm run check` passes with 422 Vitest tests. All 49 Chrome tests pass.

## P2 catch-up and timer spacing

MAME 0.271 replay reproduces the five-second loss after P2 exits through the
top of the screen. Captures and snapshots replayed in Chrome verify absence of
the message during reconstruction, its appearance, and its removal. The full
case with Web core inputs remains to be reproduced in-game. A browser test
checks the gray pixel between the two digits of "55". Pose and scene tests
cover core-driven duration and anchoring to the marble.
`npm run check` passes with 420 Vitest tests. All 48 Chrome tests pass.

## Two-player finish and rendering of the final descent

Two MAME 0.271 replays send the marbles through in both orders. GOAL takes
the color of the first to arrive and keeps it on the second pass. The summary
precedes Intermediate Race. Tests cover reading the first player, both
palettes, and their preservation on the second pass. In Chrome, ten snapshots
from these replays go through `readPracticePose` and the real scene. They
confirm the palettes before and after the finish, including when the first
marble is hidden, and disabling 3D at the summary and then Intermediate Race.
The full course with the Web core and keyboard steering remains to be
validated in-game.
The end framing in Chrome confirms crenellated joints, subtle tile dithering,
and wall continuity down under the frame. Tests verify that extending walls
leaves lips and steps at their surveyed level.
`npm run check` passes with 418 Vitest tests. All 48 Chrome tests pass.

## Low-speed marble precision

Replay without input reaches a stable pose after the start slope. Another
replay with pulses reproduces a low-speed back-and-forth. The reading test
uses the integer and fractional words from this replay. It verifies that
motion keeps its original amplitude. Reading tests cover signed coordinates
and both players. In Chrome with the real core, the comparison keeps both
marbles in play during P2's fall and respawn. The jitter reported on Michel's
machine remains to be confirmed after the update.
`npm run check` passes with 415 Vitest tests and all 48 Chrome tests pass.

## Count and position of respawn shards

Frame-by-frame solo MAME 0.271 replay was used to count the eight shards and
measure the ellipse relative to the respawn point. The scene test verifies the
count, span, and offset at counter 16, convergence, and then marble placement.
In Chrome with the real core, the P2 fall comparison at counters 17, 13, 8,
and 2 shows the ellipse tightening toward the marble. Shard positions remain
an approximation of the arcade survey.
`npm run check` passes with 414 Vitest tests and all 48 Chrome tests pass.

## Shard orbit and right pyramid

Chrome gameplay with the real core shows the four red shards above the scenery
at reconstruction counters 17, 13, 8, and 2. The marble resumes its place at
the end. The scene test verifies counterclockwise direction in all three
framings, decreasing common radius, and P1 and P2 colors. The same comparison
shows the right face of the pyramid cleared. The terrain test takes two support
tiles at a missing corner, verifies the flat landing across both footprints,
and the absence of an inner wall.
`npm run check` passes with 414 Vitest tests and all 48 Chrome tests pass.

## Respawn and sharp shadows

Native replay confirmed the reconstruction counter for P1 and P2. In Chrome
with the real core and full survey, a P2 fall triggered by Q and S displays
the red and gold shards in the comparison. The pose at reconstruction counter
10 remains frozen during pause. The full marble returns after resuming. Tests
verify convergence of the four shards, their removal, and preserving the same
point across two renders of the same snapshot.

Scenery shadows were inspected in Chrome at the start of the course. The
**Marble shadows** option is unchecked by default. At the same paused pose,
enabling it displays P1's shadow. The scene test verifies adding and removing
both marbles, and the browser test verifies syncing the option between both
menus.
`npm run check` passes with 413 Vitest tests and all 48 Chrome tests pass.

## Two-player, terrain continuity, and H help

In Michel's video, the right panel switches to the fallback message around
22.5 seconds while the arcade timer continues. The Chrome test with a full
survey keeps the 3D view after an excursion outside scroll and grid bounds.
The video jump was not replayed with its original inputs.

A two-player game in Chrome with the real core and local archives confirms
both positions, separate scores, and both timers. Holding Q and S for P2,
reconstruction is observed at counter 1372 with P1 still visible. The red
marble respawns and the 3D view stays active. Captures notably show P2 at
110 points and P1 at 0 then 10 points.

The H panel was opened and closed under capture with the real core. The
browser test also verifies the button, arrow-key switching, and input focus
priority in fields.
`npm run check` passes with 412 Vitest tests and all 48 Chrome tests pass.

## Practice Race cameras

In Chrome with the real core and full survey, the flyover follows the
countdown from 0 to 1, passing through zero of the source byte. Captures were
checked at the overview framing, mid-flyover, and race start. The timer shows
60 upon returning to the arcade framing. Following, top view, and FOV change
were checked while paused. Pose and iteration counter remain stable during
framing changes.

Vitest tests cover FOV bounds, orthographic projection, countdown decoding,
and marble tracking. The browser scenario verifies C, +, and − under capture,
the menu while paused, syncing between page and immersive view, and single
video subscription.
`npm run check` passes with 408 Vitest tests and all 47 Chrome tests pass.

## GOAL, flags, and start lift

Poses 1860 and 1920 of the local replay were checked in Chrome. The serif
GOAL lettering remains on the first face of the trough, in its gray and blue
palettes. Flags use three alternating cells per row and two rows per side.
Tests verify palettes, transparency beyond lettering, and checkerboard.

With the real Web core, a no-input start went through all five positions at
counter 1340 to 1356, then reverse positions back to flat at counter 1566.
The frozen comparison at maximum height shows the slope under the marble on
both sides. Tests cover decoding, slope dimensions, its walls, and return to
flat ground.
`npm run check` passes with 402 Vitest tests and all 47 Chrome tests pass.

## Arcade HUD appearance and decal orientation

The Chrome comparison with the real Web core shows score and timer overlaid on
the terrain, with the blue, gray, and black palettes sampled from the game.
Comparison was checked at the start and then at 50 seconds. The browser test
verifies transparency outside the HUD, glyph colors, and 4:3 framing.
Characters are redrawn in bitmap.

All three 3–4–5–6 markings were compared in Chrome on pose 1920 of the MAME
0.271 replay. The texture test verifies the orientation of the 6 and arrow
preservation. The scene test verifies that both right markings share their
material and the left one uses its variant.
`npm run check` passes with 399 Vitest tests and all 47 Chrome tests pass.

## Score and timer in 3D

MAME 0.271 replay associates HUD tiles with capture values across three poses.
At frame 1199, the HUD shows 0 and 58; at 1500 it shows 150 and 53; then at
the finish (1920), 1,270 and 47. A second game, left at the start, confirms the
transition to 00. Vitest tests verify these formats, incomplete tiles, and
out-of-bounds reads.
All 47 Chrome tests pass, including 3D and comparison display, the leading zero
of timer `07`, and HUD removal outside Practice Race on an injected pose. With
the real Web core, the start capture shows 0 and 58 in both views. Switching
to direct view then returning to 3D and comparison while paused preserves
these values.
During the race, the HUD matches Web core tiles on frames checked up to 100
points and 18 seconds. Input replay stops on the first section. The finish
was therefore verified by the native replay and by the browser test with an
injected pose.
`npm run check` passes with 398 Vitest tests.

## Joints under Practice Race markings

Texture tests verify that joints let the tiling show through in both GOAL
palettes and under numbered markings. Rendering was checked on poses 1740,
1860, and 1920 in Chrome.
`npm run check` passes with 394 Vitest tests.

## Numbered markings, flags, and finish banner

MAME 0.271 replay shows the gray banner at frame 1860 and blue during
animation 6 at frame 1920. Tests cover placement of the three markings, both
palettes, finish state reading, and flag movement around its fixed attachment.
Poses 1860 and 1920 and cloth movement were checked in Chrome. `npm run check`
passes with 394 Vitest tests and the Chrome suite passes with 47 tests.

## Connections in the descent to the finish

Tests verify removal of vertical faces inside turns, continuity of the final
edge, preservation of an adjacent opening, and seating of the finish marking on
the fixed mesh. MAME 0.271 replay finishes Practice Race and reaches
Intermediate Race. The three Chrome captures at poses 1740, 1860, and 1920
show the descent and crossing onto the checkerboard. `npm run check` passes
with 390 Vitest tests and all 47 Chrome tests pass.

## Cast shadows at cliff edges

Tests verify shadow reception on the relief and central arrow, and disabling
it on vertical strips. Gameplay view is also tested with the marble and
guardrails in the shadow map. The comparison at the reference pose in Chrome
shows ground shadows and cleared vertical strips. `npm run check` passes with
385 Vitest tests and all 47 Chrome tests pass.

## Arrow, small pyramids, and Practice Race trough

MAME 0.271 replay with `--finish` reaches Intermediate Race and provides frame
1500 for the bridge and trough. Tests verify arrow orientation, ridge removal
under pyramids, rim continuity, and absence of internal walls between trough
tiles. The browser comparison uses the pose and scroll of frame 1500. The
trough turn profile remains an approximation of the survey.
`npm run check` passes with 384 Vitest tests and all 47 Chrome tests pass.

## Slope break and steps under both pyramids

Tests verify shoulder width, inclination difference between both faces, level
difference above the three steps of each pyramid, and connection of the base
to the landing. The comparative close-up with the arcade core was checked in
Chrome. `npm run check` passes with 379 Vitest tests and all 47 Chrome tests
pass.

## Calibration of the joint between cap and base

Tiling joints above the tower locally give a seven-native-pixel vertical
offset between both views. The foreground line of the seam is around line 149
in the arcade capture. The test reprojects this edge, checks peak altitude,
and verifies width of the central stones. Landing connection remains tested.
The close-up with overlayable grids was checked in Chrome.
`npm run check` passes with 378 Vitest tests and all 47 Chrome tests pass.

## Proportions of base stones

The test verifies the shared level of the base and lowered landing, constant
peak altitude, and width of the central stone at both edges. The comparative
close-up in-game was checked in Chrome.

## Proportions and joints of pyramids

Tests cover the three base stones, height of the shoulder and cap, connection
to the landing, and convergence of the cap joint toward the peak.
The side-by-side close-up was verified in-game in Chrome. `npm run check`
passes with 378 Vitest tests and all 47 Chrome tests pass.

## Pyramid cap and reusable elements

Tests verify cap height, base-to-landing connection, and construction of
straight or angled guardrails. Two guardrails built from the same points can
receive distinct materials. The profile is compared to arcade in-game in
Chrome. `npm run check` passes with 377 Vitest tests and all 47 Chrome tests
pass.

## Junction of pyramids and their landing

The test flattens both 3 × 3 landings, verifies absence of an internal wall
between their tiles, and checks equality of support height with the pyramid
base. The next step remains tested separately. The in-game close-up confirms
the connection at the landing edge in Chrome.
`npm run check` passes with 376 Vitest tests and all 47 Chrome tests pass.

## Guardrail support and pyramid bases

Tests verify a post's support on a sloped triangle and alignment of the
crossbar at its ends. Relief faces of bases are verified by their vertices,
and the palette test checks the yellow diagonal as well as the orange at the
panel foot. The comparative close-up was verified in Chrome with the arcade
core. `npm run check` passes with 376 Vitest tests and all 47 Chrome tests
pass.

## Ledge under the left guardrail

Tests verify edge continuity under the completed tiles, high post position,
stripes of the orange face and its yellow return, and tower base joints. The
comparison with the arcade core in Chrome verifies the continuous ledge and
palette. Base relief remains an approximation.
`npm run check` passes with 375 Vitest tests and all 47 Chrome tests pass.

## Practice Race directional light

The test reprojects the measured direction and finds the 22 × 3 pixel offset
for a 6-pixel post on screen. Geometry tests cover the ground connection to
the left of the pit, tightened tower profile, and relative dimensions of arrow
tips. The arcade core and full survey were used for comparison in Chrome.
Shadow silhouettes depend on reconstructed reliefs and objects.
`npm run check` passes with 373 Vitest tests and all 47 Chrome tests pass.

## Per-zone palette and Practice Race scenery (previous iteration)

Projecting tile centers in frame 1199 gives grays 135, 169, 186, and 220 on
3 × 3 panels. Tests check calibration and palette change at the landing,
colors of central walls, the three tower heights, and gaps between arrow tips.
Slope remains used outside the opening map. Side-by-side visual check in
Chrome with the arcade core and full survey. Shadows remain computed from 3D
relief and tower shape remains an approximation. `npm run check` passes with
373 Vitest tests and the Chrome suite passes with 47 tests.

## Panel slope and Practice Race connections

Tests check the shared hue of the nine tiles of a panel, identical hue of two
parallel panels, and difference between panels of distinct slopes. They also
cover flat steps, thickened feet, and continuous orange edge at the terrain
junction. In-game comparison with the local core visually confirms the new
gray distribution and disappearance of sawtooth edges on the right border.
Exact step profile and central wall shades remain approximated. `npm run check`
passes with 370 Vitest tests. The first Chrome pass failed on a camera test
after test fixture loss. All 47 tests pass on serial rerun, without editing
code during the test.

## Tile blocks and side pits (previous iteration)

Gray samples measured in the opening capture show a six-cell period in both
axes. 3 × 3 blocks are aligned at cell 2 modulo 3. Tests verify the same
alignment across surveys of different sizes, per-pit sampling, and extension
of tiling at the upper edge.
`npm run check` passes with 367 Vitest tests. All 47 Chrome tests pass
serially. Two control tests had failed during the parallel run.

## Practice Race side pit colors

The local arcade capture locates the palette change at columns 63 and 255.
The test verifies that the pattern follows these markers in both pits and that
neighboring faces use the usual stripes. The oblique yellow transition is
approximated.

## Practice Race central hole materials

Chrome comparison with the real core and full survey shows neutral gray tiles,
black joints, yellow and orange walls, light spikes, red guardrails, and both
ground arrows. Tests verify color stripe alignment between two faces and
application of a sloped marking with missing cells. Step relief remains
approximated. `npm run check` passes with 364 Vitest tests and all 47 Chrome
tests pass.

## Practice Race scenery and margins

The nine 336 × 240 MAME replay captures each have 24 black pixels on the left
and right. The camera test verifies both margins and projection of arcade
markers. Mesh tests cover guardrails, spikes, openings, and faces between two
steps.

Captures of the real MAME core in Chrome, at start and then in motion, show
aligned margins, red guardrails, both spikes, and central hole walls. Shapes
and depth remain approximated. `npm run check` passes with 362 Vitest tests
and all 47 Chrome tests pass.

## Modern rendering toggle and comparison

Chrome with the MAME core and local archives displays arcade on the left and
3D on the right in the same game. Under capture, V toggles from original to 3D
and Shift+V activates side-by-side. Lock remains on the MAME canvas. The
browser scenario also verifies boost retention, full-screen menu, paused
comparison, and absence of a second subscription. Outside the survey, only the
modern panel is replaced by a message. `npm run check` and all 47 Chrome tests
pass.

## Practice Race from start to finish

MAME 0.271 bench in `--finish` mode produces the same survey at frames 1199,
1500, 1740, 1860, and 1920. The scroll word goes from `-16144` to `-15784`.
The marble crosses the finish at the end of race mode, then Intermediate Race
is loaded at 1965. The file placed in `local-roms/` matches the export byte
for byte.

The Web core reaches the checkered strip at iteration 2044, arcade summary at
2104, and Intermediate Race at 2146. Chrome captures show start, descent, and
finish in 3D. Across the 948 common iterations (1199–2146), fixed-point X and
Z coordinates, scroll, level descriptor, and game/marble states are identical
in Arcade and 3D. Score and timer comparison remains to be done. Slopes of the
last slide remain approximate. Scenery, HUD, and P2 case remain to be
completed.

`npm run check` passes with 349 Vitest tests and all 46 Chrome tests pass.
MAME replays of short surveys and the finish also pass.

## Fall and respawn on the first ramp

Chrome replay with the real Web core and extended survey. Native inputs
`(-22, 22)` are injected before iterations 1200 to 1529. The marble is
visible at frame 1440 (scroll `-16118`), absent at 1478 (`-16086`),
reconstructing at 1525 (`-16076`), and back at 1610 at point (284, 196),
height 16360. All four captures show the terrain in 3D. Marble and shadow are
absent in the two intermediate captures and return together. Framing continues
during the fall and remains stable at the respawn point. MAME 0.271 replay at
the upper edge also distinguishes disappearance from reconstruction.

Unit tests cover reading known states, unknown values, continuing framing
during disappearance, and resuming without artificial rotation. The Chrome test
counts blue pixels on the canvas to verify disappearance and return, with a
single source. `npm run check` passes with 346 Vitest tests and all 45 Chrome
tests pass. Falls on the full course and P2 remain to be verified.

## Rolling, shadow, and first scroll

The NullEngine test verifies rotation direction, stopping rotation at constant
position, resuming after a missing pose, link between marble and shadow map,
as well as a 20-native-pixel shift without horizontal displacement. The
automated Chrome test maintains modern rendering during measured scrolling and
verifies fallback outside its bounds without a new video subscription.

Replay under MAME 0.271, captured by `scripts/measure-terrain.mjs --scroll`,
observes readings +10, +20, +30, +39, and +48 from the start. Displacements
found in images are −7, −17, −27, −37, and −46 native pixels respectively,
with at least 99.3% of sampled background pixels identical after translation.
Mesh exports are identical at frames 1199, 1399, 1450, 1500, and 1630.

In Chrome with local ROMs, P1 replay shows the rotating pattern, visible
shadow to the right and under the marble, and terrain rising after scrolling
begins. Reading goes from `-16144` to `-16134` before the moving capture. 3D
remains active under capture. Control replay without `--scroll`,
`npm run check` (343 Vitest tests), and all 45 Chrome tests pass.

## Full marble in 3D view

The NullEngine test verifies that the bottom of the sphere touches the plane
at the start height and rises with the height read in MAME. In Chrome with
local archives, the start capture shows the full circle. Movement diagnostics
go from (140, 140, 16384) to (166, 153, 16380), with 3D view still active.
`npm run check` passes with 340 Vitest tests. The Chrome scenario targeted on
the arcade toggle passes.

## Practice Race in 3D during gameplay

Chrome with the pinned core and local archives loaded the 20 × 14 cell
survey, displayed the blue marble on the terrain, and kept the modern view
during movement. Diagnostics give (X, Z, height) (140, 140, 16384) at frame
1193, then (163, 151, 16381) at frame 1253. Manual return to direct view
succeeded. Trackball inputs were injected to reproduce this trajectory.

`npm run check` passes with 339 Vitest tests. All 45 Chrome tests pass.
The new synthetic case covers entering the section, fallback when out of
bounds or out of frame, and keeping a single video subscription without arcade
copying during modern rendering. Real scrolling, falling, marble restart,
trackpad play, and full replay comparison tests remain to be done.

## Independent P1 and P2 inputs

Chrome 157.0.8103.51 with the real core and two credits. After Start P2 and
capture, D moved P2's counters from (0, 0) to (85, 85), with rotation of the
red ball. Counters and the blue ball remained fixed. A pointer movement then
changed P1's counters and its ball's rotation, with P2's counters still at
(85, 85). Escape, pressed during Z, released capture. Counters, orientations,
and frame remained stable while paused. The ROM-less Chrome test covers
remapping, latching, and key release.

## Tilted monitor and trackball rotation

The Tilted Monitor view sits between Front and Screen & Controls. Framing was
examined in Chrome with level 1 displayed. Tests cover the cycle with capture
and boost, as well as independent rotation of both balls. Dragging on the red
ball works while paused. `npm run check` passes with 289 tests. All 35 Chrome
tests pass.

## Atari System I cabinet — November 13, 2026

NullEngine tests cover framing on the tilted monitor, video aspect ratio,
fixed cabinet footprint, and independent rotation of the left trackball. The
Chrome suite verifies Start buttons, coin returns, capture, and view cycling.

On the real local core, all four framings were examined at 1,440 × 1,000 with
level 1 displayed. All four textures returned HTTP 200 and Chrome reported no
JavaScript exceptions. Close-up display shows both balls, buttons, and game
image. The movement control available on this prototype drives P1.

`npm run check` passes with 288 tests. The Chrome suite passes with 34 tests.
All four navigation tests were also replayed after adding the right trackball
framing check.

## Framing switch with C

The unit test verifies the loop of all four framings. The Chrome test verifies
both selectors, on-screen position of screen and controls, preservation of
Pointer Lock and held boost, and no effect from Ctrl+C, key repeat,
out-of-capture presses, or direct view. A Chrome 157.0.8103.51 test with the
real core cycled through all four views while the game was advancing, with
capture maintained and zero JS errors. Capture of the close-up view at
1280 × 900 revealed overlap of the bottom of the screen by the panel. After
lowering its upper edge, a new capture shows the full image and controls.
`npm run check` passes with 289 tests. All 34 Chrome tests pass.

## 3D ball rotation direction — November 10, 2026

NullEngine tests track a vertex point after a prior diagonal gesture. All four
directions and the diagonal move this point along the expected cabinet axes.
A horizontal delta of 870 keeps the point on the upper hemisphere and on the
right side. `npm run check` passes with 288 tests, and the Chrome suite with
33 tests.

Chrome 157.0.8103.40, real core and Cabinet camera. After initial orientation,
two mouse gestures under Pointer Lock produced a rotation of about 23° each.
Downward gesture rotated around −X and rightward gesture around −Z. Measured
orthogonal components were zero to numerical precision. Before and after
captures were examined with the arcade screen visible.

Separate measurement of the in-game marble in the production build. Five
fresh sessions start from the same position at the beginning of level 1. The
bench sends six 64-unit samples on a single axis starting at frame 1200 and
verifies the actually read deltas. Pixel displacement of the blue marker is
measured between frames 1199 and 1212.

| Input   | Screen ΔX | Screen ΔY |
| ------- | --------: | --------: |
| Neutral |      0.00 |      0.00 |
| Right   |     +9.73 |     −3.89 |
| Left    |    −10.14 |     −3.92 |
| Down    |     −0.18 |     +2.99 |
| Up      |     −0.11 |     −7.41 |

Comparing opposite directions, right and left differ by 19.87 px in X and
0.04 px in Y. Up and down differ by 10.39 px in Y and 0.06 px in X. On this
start, reversing a gesture thus reverses displacement on its primary axis.
Vertical offset of both horizontal gestures is nearly identical. This local
measurement covers neither slopes nor large impulses. Physical trackpad feel
remains to be verified.

## Prototype 03 — explorable bar, November 10, 2026

Unit tests cover collisions, look rotation, speed at 60 and 120 steps per
second, capture transfer and cancellation, ball rotation, mixing, and
resolution caps. 284 tests in 32 files. Coverage of 99.58% statements, 99.30%
branches, 100% functions, and 99.55% lines.

Chrome 157, 33 browser tests passed. The tour scenario verifies that the
BabylonJS canvas holds capture, then E transfers it to the game. Walk, credit,
and boost keys are isolated. Escape and Leave Cabinet clean up states. The
suite covers capture refusal, ratios at DPR 2, mesh rotation, picking, and
scene disposal during transition. The offline Web Audio test finds the right
channel at 0.3125 under attenuation and panning, then both channels at 0.5
after restoring the direct path. All three preview tests passed on the
production build.

Real core and locally selected archives in Chrome 157.0.8103.40. Positional
audio produced a measurable signal in-game. A side step changed distance from
2.82 to 2.90 m and balance from 0 to −0.23, with a single audio source. E
restored arcade routing. Escape froze frame 1227 and purged boost and pending
deltas. No JS errors during this run. Cabinet, walk, Bar, and Front views were
visually inspected. On the dev server, five non-zero native samples resulted
in a measured ball rotation of 1.854 rad on X and −3.396 rad on Z. Measurements
are in `third_party/prototype03-evidence.json`.

On a Chrome viewport at DPR 2, framebuffer widths were 1256, 1884, and 2512 px.
The browser provided GPU timestamps. These first samples were taken while
paused, with compilation and resizing. They verify instrumentation and sizes,
with too little data to compare GPU times across profiles.

Production endurance completed after 600.008 active seconds. The run
transferred capture from bar to core, then verified ten stable pauses, purged
inputs, one audio source, and direct routing in-game. Final frame 36,796,
36,094 copies, zero JS errors or remote requests. Across this run, average
render CPU 0.554 ms, max 36.9 ms, average GPU 0.429 ms over 18,061 samples.
These values aggregate multiple framings at DPR 1, with other checks at the
start of the test. They do not allow inferring Retina GPU times or 120 Hz
smoothness. The full report is in
`third_party/prototype03-endurance-evidence.json`.

Safari WebDriver 17.4.1 refused the session because "Allow Remote Automation"
is disabled. Playwright's WebKit (build 2251) starts, then times out opening
a tab before reaching the project. In Safari, start the session with local
archives and verify Explore → E → Escape, then all three render profiles. At
120 Hz, verify look smoothness and video stability in that same flow. Audio
listening and trackpad comfort remain to be evaluated on Michel's Mac.

## Prototype 02 — cabinet and first bar, November 10, 2026

Scope 1–5 explicitly authorized by Michel. Full implementation: cabinet and
signs, ball/controls/coin slot, furnished bar, materials and four lights,
Bar/Cabinet/Front framings with 0.65 s transition. Same emulator and texture,
no new physics or audio chain. Spec 02 and AGENTS updated.

Unit/NullEngine: **250 tests / 27 files**, format/lint/types/build check
passed, coverage 99.48% statements, 99.34% branches, 100% functions, 99.45%
lines. New action resolver and time progression, scenery construction/disposal,
margin under image for ball, single camera and retarget on resize, transition
while paused. No thresholds lowered or new code excluded.

ChromeGPU: **29 tests passed**; **3 preview tests passed**. Animated
video/colors and existing modes preserved. Real mouse clicks on projected
meshes: Credit, Start1/2, coin slot, and ball. PointerLock capture from the
latter, clicks ignored during capture, hover cursor, transition without new
video, cancellation/disposal with generated textures and all other resource
counters at zero. An additional test verifies StartP2 while paused then active.
Classic ray imports register real picking, no fake facade.

Initial runs: context lost/reloads on new Vite dependencies and helper
temporarily without scene; the helper now reuses Engine.LastCreatedScene via
the same Engine import as production, without a new late EngineStore import to
pre-optimize. Stable run afterward. The projected point was outside viewport on
the long page: scroll added in bench, full-screen real clicks worked. Visual
inspection revealed the
inverted signs and a ball in front of the image; vertical upload fixed and
deck lowered, new margin test. PointerEvent.button is −1 on hover:
fixed and cursor assertion before clicks. No behavior masked by deleting
tests. The latest full runs passed.

Real runtime Chrome 157.0.8103.40, local archives: Credit and Start via 3D
buttons, entering game from ball, real Front/capture; Escape purges boost,
pending (0,0), P1/P2 buttons empty. Returning to bar while paused does not
advance the core, final frame 1115 stable, 402 copies, 1 audio source, zero
JS errors. Final captures `/tmp/marble-prototype2-bar.png`, `cabinet.png`, and
`game.png` examined: upright signs, room and furniture visible, full video
without ball over it. Digital evidence without ROM/image/state:
`third_party/prototype02-evidence.json`.

**Production Endurance 02 passed**: after a 2-minute run stopped for hover and
a 6-minute run interrupted by HMR, a new full test used the static 4175 build
and `--local-files` (ZIPs from the roms folder selected in inputs, standard
validator, no copy/upload). Ten new intervals, **600.02 s active**, frame
36772, 36063 copies, zero JS errors or remote requests. Ten stable pauses,
boost/pending/P1/P2 buttons empty. Three cameras, comparison/direct and 3D
return, two viewport sizes, captures and resumes. No minutes reused or
assembled with interrupted runs. Preview 4175 stopped after test.
Final report `scene=prototype-02-cabinet-bar`, `localFileSelection=true`,
`complete=true`: `third_party/prototype02-endurance-evidence.json`.

Cumulative CPU averages of video callback 0.459–0.550 ms, max 9 ms:
transition rAF rendering and GPU completion are not included. Not a fine
benchmark between cameras, dimensions change and other checks coexisted at the
start. JS Heap 16.73–28.87 MiB with returns after GC; nodes 4646–4693,
documents 1. Listeners 721 at first sample then 720 stable; 1 audio source and
context suspended on pauses. No blocking degradation observed during this
test, not a universal proof of zero WASM/GPU leaks, audio listening, or
physical comfort. Arcade states may include game over/attract. Safari/120 Hz
remain open.

**Production picking verified separately**, without dev module/helper or
access to a test scene: native clicks projected from the cabinet's declared
coordinates/camera. Credit then Start produce `[0,2,1]/[0,2,0]` and
`[0,3,1]/[0,3,0]`, the ball captures and selects Front. 64 copies in this
short test, Escape paused, pending (0,0), zero JS errors. This verifies
picking registration and capture in compiled code. Evidence:
`third_party/prototype02-production-evidence.json`. Permanent ROM-less tests
remain 29 Chrome and 3 preview.

## Capture shortcuts — November 10, 2026

Explicit request from Michel, spec section 16: Credit `5`/`(`, Start P1
`1`/`&`, Start P2 `2`/`é`. Implemented via a pure key resolver, gated on
capture/unpaused/non-input-focus and modifiers. Key repeats absorbed. Start P2
port 1, independent 120 ms pulses, and purge of both ports on every
interruption; no relative P2 input added.

Tests: **231 tests / 25 files**, `npm run check` passed; coverage 99.48%
statements, 99.31% branches, 100% functions, 99.44% lines. **27 Chrome tests**
and **3 preview tests** passed. Six aliases + modifiers/composition/foreign
keys in unit tests; independence/purge of both ports and canceled timer.
Chrome: real capture, hold without repeat, aliases, typing, Ctrl/Alt/Cmd,
Escape, and unmount. First attempt aborted because `Playwright.press` does not
know `é`; replaced by Chrome CDP `Input.dispatchKeyEvent` for that key,
without synthetic DOM event. CDP event typing fixed via const union.

Real runtime: observed all twelve expected `simulateInput` calls for the six
aliases, ports 0/1, and compliant presses/releases. The ten-minute endurance
run is now complete; result and limits below. The `npm run measure:endurance`
command is permanent, outside CI and without ROM in unit/browser tests.
Protocol `ENDURANCE.md`.

## Automated endurance of real runtime — November 10, 2026

Chrome 157.0.8103.40, clean context and local ROMs validated by the app; no
archive downloaded/copied/modified. **Ten intervals completed**, 600.40 s
active plus interruptions, final frame 36794 and 36090 copies. Periodic
movements and boosts, Escape during boost, ten stable pauses; pending (0,0),
P1/P2 buttons empty and boost purged at each. Nine re-entries/captures,
alternating cameras, comparison then direct and 3D return, viewport 1440×1100
then 1100×900 and back. Zero JS errors, zero requests outside loopback. Full
digital evidence without image, ROM, or state:
`third_party/endurance-evidence.json`; initial temporary local report
`test-results/endurance.json`. Protocol: `ENDURANCE.md`.

Cumulative copy+render CPU submission averages 0.144–0.177 ms; max 10.2 ms.
Dimensions change and build/browser checks coexisted with the start of the
test: not a precise comparative benchmark across cameras or machines. No GPU
completion measurement. Listeners 718 and documents 1 constant; 1 audio source
at each sample, context suspended on pauses. A non-zero active RMS is observed
at the first sample, zeros possible during attract/silences; no continuous
listening performed. JS Heap 19.73–21.58 MiB, nodes 4582–4645: variations and
increase on later samples, without forced GC; not proof of zero leaks and not
all WASM/GPU memory. No blocking technical degradation observed during this
series; the program may be in game over/attract, this is not a ten-minute
human playthrough. Physical trackpad, jump/braking, listening, 120 Hz screen,
and Safari remain open.

An initial run was aborted before measurement because `Playwright.press` does
not know `é`. The new run, with native CDP keyboard for `é`, completed all ten
full intervals. No missing intervals, shortened duration, or lowered
threshold. The bench disposes its browser in `finally` and marks `complete`
only after all ten intervals and error checks.

## Front and perspective cameras — November 10, 2026

Human feedback before this delivery: Michel confirms "it works well" for the
previous fullscreen presentation. This does not yet certify the endurance
test, jumps, or physical comfort of the new boost.

Implemented: Camera selectors synced between page/HUD, active in 3D scene,
orthographic Front centered on screen and existing perspective kept by
default. Same camera/plane/texture/session; choice preserved during session,
independent flat plane, texture redrawn even while paused. No input,
pause/resume, or persistent preference added by the change.

NullEngine: new framing/aspect test for three source/viewport pairs, front
rotation, margin around screen, plane/3D return, single camera and meshes.
Chrome GPU: **26 tests passed**, two new ones verify colors and their
animation, fullscreen HUD, sync, narrow resize, retention, disabling, and
disposal; the other tests play/pause without any extra calls to inputs. First
run: 25/26, color assertion before shader availability. The test now waits
for rendering like other GPU tests; full pass 26/26. No threshold or render
test removed.

Real local runtime Chrome **157.0.8103.40**: Credit/Start in HUD, switch
during playback with advancing frames, then switch while paused at stable
frame 1062. 360 cumulative copies, gain 1.70 unchanged, pending (0,0), front
choice preserved after switching to plane then back to 3D; zero JS errors.
Captures of both views examined in `/tmp/marble-camera-front.png` and
`/tmp/marble-camera-perspective.png`: upright front, full and larger video,
visible frame and base partially out of frame; perspective with scenery. No
audio listening/endurance or physical trackpad validation performed in this
test. Digital evidence: `third_party/camera-presets-evidence.json`.

`npm run check`: **215 tests / 24 files**, coverage 99.47% statements, 99.29%
branches, 100% functions, 99.43% lines. **3 preview tests passed** on the
final build; format, lint, types, and build passed. BabylonJS chunk >500 KB
warning preserved.

## 3D Fullscreen and HUD — November 9, 2026

Implemented: Play in 3D Fullscreen button, same session/texture, HUD Credit,
Start, Capture, Pause, Resume/sound, and Back. Entry and exit while paused;
immersive fallback if Fullscreen API unavailable/refused. HUD controls
delegate to existing controls and reflect their states/messages.

Six pure transition tests added (refusal, cancellation, late results,
disposal, re-entry). Chrome: **24 tests passed**, including three new ones on
HUD/Pointer Lock/boost, refusal and small viewport, and fullscreen animated
GPU video, resize, and single subscription. First run revealed focus requested
too early before native fullscreen end; fixed by waiting for
`fullscreenchange`, then full suite passed. No threshold lowered or test
skipped.

Real runtime test, Chrome 157 and local ROMs: native fullscreen entry,
Credit/Start/Capture from HUD, boost held then Escape, pending (0,0), boost
released and stable frame **1066**. Re-entry while paused, **364 cumulative
3D copies**, return to page and focus restored; zero JS errors. The script
awaited the actual event/focus after exit (an initial synchronous read was
premature). Capture `/tmp/marble-fullscreen-hud.png` examined: readable game,
HUD on top, without overlapping the image. Evidence:
`third_party/fullscreen-hud-evidence.json`. No physical trackpad comfort,
full audio listening, Safari/120 Hz/endurance certified by this test.

`npm run check`: **214 tests / 24 files**, coverage 99.47% statements, 99.29%
branches, 100% functions, 99.43% lines. Format/lint/types/build passed;
**3 preview tests passed** on the final build. Existing BabylonJS chunk

> 500 KB warning preserved.

## Comfort boost and perspective presentation — November 9, 2026

Human feedback received: 0.50× is unplayable (normal control insufficient, no
felt acceleration). The calibration recommendation is therefore rejected. New
explicit scope: Space for boost and continuing 3D rendering. No new gesture
or calibration session requested from Michel.

Implemented: normal 1.70× (migrated from 0.50× candidate), continuous
directional boost while Space is held under capture. L1 norm 128 per
iteration, direction guided by trackpad; no writing to game physics or rules.
Release, Escape, focus/visibility, changed gain, or disposal purge held state
and pending inputs. Input fields do not trigger boost. Cloned source and
injected time for tests, no standalone timer. Generated inputs and mouse
events are counted separately.

Rendering: new Screen mode in 3D scene, procedural screen/support/base/grid,
perspective and lighting, same session/texture/video hook. NullEngine tests:
reference plane preserved, camera, aspect, reused scenery, lighting disabled
on return to plane, disposal of meshes/materials/lights. Chrome GPU: same
video colors and animated change, resize, hidden source, return to plane, and
single subscription. Real capture `/tmp/marble-screen-stage.png` examined:
readable video in perspective frame, base/floor/lighting visible. Not a 3D
reconstruction of levels, no new external asset delivered.

Real runtime Chrome 157, local archives: 1.70× gain restored from 0.50×, game
started via Credit/Start, 3D scene enabled, 24 boost commands observed at
(128,0), then zeros on release. A second boost is purged by Escape; frame
1138 stable, 90 cumulative 3D copies, no pending or held state, no resume on
Space while paused, and zero JavaScript errors. Second boost timeline: 9
generated commands distinguished from mouse events. Automated Chrome inputs,
no physical comfort or successful jump certified. Digital evidence without
ROM/image/state: `third_party/comfort-stage-evidence.json`.

`npm run check` passed: **208 tests / 23 files**, coverage 99.44% statements,
99.26% branches, 100% functions, 99.40% lines; format/lint/types/build pass.
Six pure boost tests, generated commands test, rejected gain restoration, new
3D NullEngine test keeping the initial plane test. Chrome dev: **21 tests
passed**, Chrome preview: **3 tests passed**. First run after interruption:
20/21, isolated failure switching to comparison, cause not isolated;
subsequent runs 21/21, with GPU checks and real runtime passing. No threshold
lowered or test skipped, usual BabylonJS chunk warning.

To validate while playing: boost comfort, normal precision, jump, and braking.
Next independent task: 3D fullscreen view with compact game HUD to reduce
reliance on diagnostics page. No blocking of this work on the now-rejected
calibration. Details: `COMFORT_AND_3D.md`.

## Captured gesture calibration — November 9, 2026

Permanent bench added: `measure:calibration`, `phase-check`, and `refine`.
Numerical data verified without ROM in unit tests; 20 new tests on
`captureCalibration` (validation, copy, quantization of both axes, timings,
peak window, neutrality, bounds, selectable phases and steps). An additional
unit test confirms that the 0.50× candidate remains purely linear, without
limiter. By default player gain and preferences do not change.

25 tests with local archives and real Web core: 12 gains/profiles, 5 timing
checks, 8 refinements. All observed polls match setpoints, no lost log /
observation error / JS error, identical starts, motionless neutrals, and
40,000-pixel control region unchanged in every frame. Full 1.70× reproduces
previous replay points exactly. Old `ports quick` bench executed:
neutral/256/neutral compliant, 64 reads per case.

Isolated strike: 0.85× favorable on one phase, nearly zero on the other, so
not kept. Refinement at 0.40/0.45/0.50×; the 0.50× candidate preserves
direction and a larger response at both timings in this group. At 36
iterations: 0.50× gives (−9.141; +2.788) then (−12.115; +4.804) native
pixels, versus (+2.985; −3.136) then (−5.061; +0.889) at 1.70×. Optical
displacements, not a physical acceleration measurement or successful jump. The
matrix does not include the full profile at 0.50×: choice based on isolated
strike, comfort still to be tested. Details: [CALIBRATION.md](CALIBRATION.md),
evidence `capture-calibration-evidence.json`.

Explicit test button added: gain unchanged before click, 0.50× applied and
stored after click, no resume from pause. Browser test also verifies return
to 1.70× via slider. Real runtime: 1.70× gain preserved before click, 0.50×
after, auto-readout at right gain after capture/Escape, zero JS errors. This
check uses automated Chrome mouse events, not a physical trackpad. Default and
game controls/physics remain unchanged.

`npm run check` passed: **200 tests / 22 files**, coverage 99.39% statements,
99.46% branches, 100% functions, 99.35% lines; format/lint/types/build pass.
Chrome dev: **19 tests passed**, Chrome preview: **3 tests passed**. Existing
BabylonJS chunk warning preserved. For this calibration, human validation
remains for comfort and effectiveness of the candidate setting in-game,
notably level 1 jump and level 3 braking; no jump result announced as fixed.

## First usable human profile — November 9, 2026

Gain 1.70×, 95 captured lines and 96 non-zero events, 1.391 seconds, 52
non-zero native samples over 85 iterations; L1 peak 1182 (−608,+574). For
each line, `sentX/Y = polledX/Y`. Sums −5737/+6257, no clipping and no
unsampled event. This verifies the hook on this test, without making it an
exhaustive poll counter or proof of jump.

Real Web replay, fresh runtime per neutral/profile/neutral case: all polls
match X/Y profile before 1200..1294, identical starts, motionless neutrals,
zero JS errors. Original handler observed without altering its return, 488
reads per test across 1198..1319, no trace loss/error. Replay of same bytes
in MAME 0.271, neutral/profile, `ttl` BIOS and previously calibrated fixed
phase −1, 488 reads verified by each of both taps. Hold of last value after
trace, without artificial zero-jump of counters. Seven optical instants
compared: max deviation 0.158 native pixel per axis. No Web-core-specific
defect demonstrated, no equality of internal states or successful jump
certified.

Per-iteration replay is not a reproduction of macOS jitter or Michel's full
game. The marker enters the control region: this check does not rule out
camera movement over the full path. No gain or input modified. No new human
test needed to continue this investigation. Protocol:
[CAPTURED_MOTION.md](CAPTURED_MOTION.md), profile and evidence without
ROM/image/state: `third_party/captured-motion-evidence.json`.

`npm run check` passed: 179 tests/21 files; coverage 99.29% statements,
99.39% branches, 100% functions, 99.24% lines. Format/lint/types/build pass,
usual BabylonJS warning preserved. No new app code or artificial unit test
added. Permanent browser suites not rerun; the three real Web tests and two
native MAME tests are done. Out-of-repo replay prototypes, derived from
existing benches; digital profile preserved.

## Automatic arming on capture — November 9, 2026

Michel's last text has a native X peak 1189 without saturation, but
`motionTimeline` idle and no lines: manual arming not performed, observer
remained at initial gain 1 while player control was indeed at 1.70×. Replace
manual prerequisite with automatic reset/arming on every successful capture
from uncaptured state. Escape preserves, a recapture starts a fresh
measurement at current gain. No modification to inputs/physics.

ROM-less hook test: no reset before capture, observed gain 1.7, strong
gesture retained after Escape; recapture at gain 2 with zeroed counters, no
previous segment. Chrome suite: first run 17/18, late Pointer Lock
notification adding legitimate pauses in the Credit/Start test log. Assertion
focused on resume/press order, then **18/18**.

Real runtime Chrome 157.0.8103.38, local archives, automated movements,
without New Try button: initial peak 1958, next 16828, segment 2 chosen, one
line preserved after Escape, complete/gain 1.7, zero JS errors. Not a
physical trackpad test. Evidence: `third_party/auto-measure-evidence.json`.
`npm run check` passed: **179 tests / 21 files**, format/lint/types/build,
coverage 99.29% statements, 99.39% branches, 100% functions, 99.24% lines.
Chrome preview: **3 tests passed**, after rerunning permission check initially
unavailable due to usage limit. Existing chunk warning.

Procedure now unified: Capture → acceleration → Escape → Copy. Human
measurement of the strong gesture remains to be obtained; transmitted peak
alone does not validate the jump.

## Simplified measurement, strongest movement — November 9, 2026

The survey provided by Michel corresponded to the first segment (300 ms, 35
events, native L1 peak 319), whereas the full test contained an X peak 916
outside the segment. He had followed the instruction: acceleration, Escape,
Copy. Selecting the first movement made the protocol ambiguous; the mismatch
does not prove poor human execution or absence of loss on the real strong
movement. No medium/fast diagnostic requested going forward.

Fix implemented: observation until explicit interruption, automatic selection
of the segment with the largest transmitted L1 command peak or observed at
the last poll. Silence/limit closes a segment, not the test. Best and
candidate only, 256 internal lines max, copy limited to chosen segment and
criterion/ID exposed. Intermediate peaks before cancellation by an opposite
event remain visible. Events interrupted before poll stored separately.
Inputs/gain remain unchanged.

Interface: New Try → Capture → acceleration → Escape → Copy. Visible status
ready/in progress/finished, no waiting to time. ROM-less Chrome: regression
on small first movement, silence, stronger acceleration, Escape; the second
measurement replaces the first and stays frozen. Other pause/start/video
checks continue to pass.

Real runtime with local archives, Chrome 157.0.8103.38: automated mouse
events, first segment peak 813, second peak 9900, second selected, one line
preserved after immediate Escape, page status "Measurement finished", zero JS
errors. This is not a physical trackpad gesture. Digital evidence:
`third_party/strongest-gesture-evidence.json`, without ROM/image/state.

`npm run check` passed: **179 tests / 21 files**, coverage 99.29% statements,
99.39% branches, 100% functions, 99.24% lines; format/lint/types/build pass.
Four new non-regression tests (later gesture, interruption before poll, many
segments/bounds, opposite events) and existing tests adapted. Chrome dev:
**18 tests passed**, Chrome preview: **3 tests passed**. Existing BabylonJS
chunk size warning preserved. A new physical test remains to be done after
reload; jump is not fixed.

## Startup and Credit/Start after Escape — November 9, 2026

Defect reproduced with local archives and Chrome 157.0.8103.38: copyright
warning at startup, Credit/Start without effect on this screen, then buttons
disabled after Escape. Resume re-enabled them. Fix: core option
`skip_disclaimer enabled`, and explicit Credit/Start commands available while
paused (resume before press, no resume/purge if already active). Real
compatibility warnings are not hidden.

Test in fixed real runtime, fresh document: attract mode observed after boot,
without any mouse movement; Credit from pause then Start, game observed with
score 0/time 60, then capture, Escape, Credit/Start accessible. New Credit
from pause restarts: frame 1112 → 1139, zero JavaScript errors. Captures
examined in `/tmp` only; no ROM/image/state added to repo. Digital evidence:
`third_party/startup-controls-evidence.json`.

`npm run check` passed: 175 tests across 21 files; coverage 99.27% statements,
99.35% branches, 100% functions, 99.22% lines. One config test and four pure
command tests added (resume/press order, already active session, resume
failure). Chrome dev: 18 tests passed, including regression capture → Escape →
Credit → Start and Start directly from pause. Chrome preview: 3 tests passed.
Existing tests preserve lack of automatic resume on focus return. Neither
human comfort nor level 1 jump validated by this test. Existing BabylonJS
chunk size warning preserved.

## Temporal distribution and gesture survey — November 9, 2026

Implemented: opt-in observer of first gesture after "New measurement try",
bounded (128 lines/two seconds checked at callbacks), injected time,
aggregation of accepted events and last native poll after iteration. Stop
after silence, interruption, gain change, or disposal; preserved after pause,
explicit reset. No transformed input, timer, persistence, or new listener.
Events interrupted before a callback stored separately. Player gain remains
unchanged.

Real bench Chrome 157.0.8103.38, local archives: 11 constant-total tests,
then 6 checks (neutrals and 1536 over 1/4/6/12 iterations). Identical starts,
native setpoints observed exactly, motionless neutrals, zero JS errors. At
total 1536, one impulse gives ΔX −53.12 pixels at 1236, 6 × 256 gives +105.71,
12 × 128 gives +95.79; 4 × 384 remains inverted. Repetitions find exact
positions in every frame. Scenery check on these six repetitions: 24
comparisons of 360,000 RGBA pixels, no change in control region. Initial series
did not have this built-in check; other cases do not retroactively benefit
from this proof. Screen positions, not speed or successful jump.

Hook in real runtime, two spot Chrome checks with automated mouse events and
Pointer Lock: three accepted events, three non-zero native samples over three
iterations, quiet stop, 14 lines preserved after Escape, zero JS errors. This
does not measure a physical trackpad. Final probe is executed from `/tmp`:
Playwright cleans its `test-results` directory.

`npm run check` passed: **170 tests / 20 files**, format/lint/types/build.
Coverage: 99.26% statements, 99.34% branches, 100% functions, 99.22% lines.
17 new pure tests: constant-total integer distribution, bounds, RGBA regions,
arming/stop/reset, duration, and snapshots. A non-regression reproduced a
previous duration preserved when canceling a new arming; reset of both
bounds fixed and test passed. Chrome: **17 dev and 3 preview tests**,
including a new hook test with fake ROM-less runtime, real events, and pointer
capture. Existing BabylonJS chunk size warning preserved. First final check
hindered by temporary probe picked up by ESLint; moved outside workspace then
check rerun successfully.

Results: [MOTION_PROFILES.md](MOTION_PROFILES.md),
`third_party/impulse-profile-evidence.json`, without ROM/image/state. To be
done by Michel: a fast gesture then a medium gesture, each armed separately,
usual gain preserved, Copy diagnostics after Escape. Level 1 jump and level 3
braking open.

## Native reference — November 9, 2026

MAME 0.271 ARM64 already installed, `ttl` BIOS, archive verification passed.
Preserved command `npm run measure:reference` executed: 20 tests, five
amplitudes and four phases. All starts identical, four motionless neutrals;
64 replayed reads and 64 verified reads per test. At fixed −1 offset, all five
responses match Web within 0.063 pixel per axis. Phase dependence is strong;
case 416 also inverts its direction in the reference. No 2003-Plus-specific
bug demonstrated, jump not fixed.

Exploratory checks: Web replay 64/256/416 without native pending, outputs
identical to initial bench; native 416 at real speed identical to accelerated
phase 0 case. Spot captures: native scenery unchanged across 31,200 checked
pixels. These checks do not prove internal state equality or human comfort.
Details, limits, and evidence: [REFERENCE_COMPARISON.md](REFERENCE_COMPARISON.md),
`third_party/mame-reference-evidence.json`.

19 unit tests added on capture validation/serialization, bounds, duplicates,
phases, parsing, and refusal of incomplete/unverified reports.
`npm run check` passed: 153 tests across 17 files, coverage 99.09%
statements, 99.13% branches, 100% functions, 99.04% lines;
format/lint/types/build pass. Chrome dev: 16 tests passed; Chrome preview: 3
tests passed. Initial sandbox HTTP block bypassed by authorized execution,
without application change. Existing BabylonJS chunks >500 KB warning
preserved.

## Real port reads — November 9, 2026

Opt-in instrumentation of the pinned core's port handler, without changing its
arguments, returns, or physics. SHA-256 verified, five-line static map and
signature verified, typed WASM trampoline, and handler restoration. No RAM or
ROM code access; no modification of third-party files. Public sources and
method: [TRACKBALL_PORTS.md](TRACKBALL_PORTS.md).

Real tests Chrome 157.0.8103.38 headless: five impulses 0/64/256/416/768 per
bench protocol, then 0/256/0 repetition with the module kept in the project.
Identical starts, native inputs received, screen results identical to previous
measurements; zero JS errors, zero lost reads/observation errors on the
preserved bench. 64 reads per test, 4 offsets per frame counter.

For both player 1 ports, from 0: 64 gives 239 then 237; 256 gives 188 then
179; 416 gives 146 then 131; 768 gives 53 then 26. At 416, steps −110/−15 and
final value −125 modulo 256 are consistent with the driver, but visible
horizontal response remains inverted. Loss before these ports or their wrap
alone is not enough to explain this test. At 768, modulo steps are ambiguous.
No jump fixed or specific bug of the program or core declared.

Internal counter read in handler is +1 relative to pre-iteration counter. For
input 256 at 1200, values appear under 1202 then 1203 (iterations 1201 then
1202). Both labels are preserved: neither CPU cycle precision nor hardware
latency inferred. Raw logs and observations:
`third_party/trackball-port-evidence.json`, without ROM, state, or image.

Checks: 26 new tracer and modulo-delta tests, including rejected
version/addresses/signature, bounded window, preserved values/exceptions,
isolated measurement errors, restoration, and concurrent owner. Check: 134
tests across 16 files; 16 Chrome dev tests and 3 preview tests without ROM.
Coverage 99.01% statements, 98.96% branches, 100% functions, 98.95% lines.
`npm run measure:ports -- --quick` passed with hash, log, and start checks.
Module remains absent from app bundle; no new player setting.

## Effective game response — November 9, 2026

Test 416, technically active but without improvement according to Michel, is
removed from frontend, session API, and associated modules/tests. User gain
is unchanged, no new limiter or smoothing/inertia is added. A regression test
preserves linear transmission of large gestures.

A reproducible bench is delivered: `npm run measure:impulses` (11 fresh
starts), or `-- --quick` (3). Dev server and local archives required, never
run in CI. Script observes the marble marker on screen, without reading/writing
RAM or ROM code. Diagnostic impulses are written to native pending, before
poll, at fixed frames; they intentionally bypass gain and browser event. This
is not a trackpad comfort simulation.

Result: all starts are identical, two motionless neutrals, polls match
setpoints exactly, zero JS errors. At frame 1212: 64×1 gives (+2.931; -4.056)
pixels; 256×1 (+9.728; -3.887); 416×1 (-23.213; -3.718). Horizontal direction
changes on large peaks. A fixed 360,000-pixel scenery zone remains identical
across checked captures. Six frames at 256 give 29.91 pixels of displacement
versus 10.48 for a single frame; duration also matters. This does not reveal
the internal cause nor certify fidelity of artificial input spreading. Jump
remains unvalidated.

Protocol and limits: [INPUT_RESPONSE.md](INPUT_RESPONSE.md). Digital evidence
without image/state: `third_party/impulse-response-evidence.json`. First
bench via snapshot restoration rejected for non-identical starts. Final script
reproduces its 3 short tests; pure tracker imported via Vite is tested
without GPU and absent from app bundle. Control images in `/tmp` only.

Checks: `npm run check` passed, 108 tests across 15 files,
format/lint/types/coverage/build. Coverage 99.18% statements, 99.30% branches,
100% functions, 99.13% lines; new measurement module covered. 16 Chrome dev
tests and 3 build tests passed without ROM. Test count reduction comes from
removing the rejected experiment; thresholds remain 90% and are not lowered.
New tests cover centroid/bounds, bottom-up RGBA, HUD/border exclusion,
spurious colors, invalid dimensions/buffers.

Next: reading/timing of core analog ports from public sources or comparison
with another truly compatible core. Do not declare a specific core bug or a
fixed jump from screen tracking alone.

## Feedback from November 9, 2026 — 416 test inconclusive

Michel reports **no improvement** with protection enabled. His survey confirms
technical operation (20 clamps, L1 peak before 1205, native X max 416 at
1.70× gain), but not a fix for the symptom. The test with protection
disabled had 27 overflows, L1 peak 1635, and native X max 1522. Both tests
are not a comparison with identical gestures. The counter wrap hypothesis is
not retained as a demonstrated explanation.

Priority: observe game response to controlled impulses. First attempt with
transient in-memory snapshot and restoration: visually different starts
between tests, so series rejected. No state written to disk or repo. Resumed
with a new document/runtime per test and frame-aligned inputs; results logged
separately below.

## Large impulses test — November 8, 2026

Priority human feedback: impulses remain insufficient to jump from the classic
path to side platforms on level 1. This functional criterion is not validated.
Lack of int16 bridge clipping does not certify interpretation of large deltas
by game counters.

Implemented: non-persistent opt-in mode, disabled by default, jointly
clamping pending deltas before poll. The 416 limit is a hypothesis derived
from 8-bit counters, axis rotation, and 30% driver sensitivity, with rounding
margin; not a measurement of intra-frame game reads. No physics boost,
spreading, new gain, or deferred movement. Before/after measurements are
distinguished and mode remains explicit.

- Targeted tests: 30 passed. `npm run check`: 113 tests across 15 files,
  format, lint, types, coverage, and build passed. Coverage: 99.16%
  statements, 99.26% branches, 100% functions, 99.11% lines.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 17 tests passed without
  ROM, with enable/disable test without resume or gain change.
- Unit tests: disabled mode unchanged, small movements, joint limit and
  diagonals, signs, no deferred excess, stats reset, invalid inputs, pre-hook
  before native, and writing only pending.
- Spot test Chrome 157.0.8103.38 headless, real mouse events via capture,
  1.70× gain in isolated profile: 28 clamped impulses, L1 peak before 1700;
  native X -416..416. After release: pause, zeroed mouse state; stats reset
  verified, no JS errors. Does not prove a successful jump in-game.

To be validated by Michel: jump comparison with/without protection at same
gain, feel feedback, and diagnostics. If protection does not improve this
case, the hypothesis will not be considered a demonstrated fix. Endurance and
other limits of C remain open.

## Current status — November 8, 2026, increment E

Michel confirms **"ok, it's good"** after the flicker fix. The fixed view is
validated on his Mac; this confirmation does not count as implicit validation
of endurance, audio listening, or braking. Summary and latest test pass are
in [RELEASE.md](RELEASE.md). Following sections preserve history of tests and
their results as of the indicated date.

- `npm run check`: 98 tests across 14 files, format/lint/types/coverage/build
  passed; coverage 99.08% statements, 99.23% branches, 100% functions,
  99.02% lines.
- 16 Chrome dev tests and 3 preview build tests passed without ROM. The
  preview suite verifies compiled code, local selection and its errors,
  resource hashes, notices, archive exclusion, and dev routes.
- Isolated rebuild in `/tmp/marble-delivery-esl6_gr1`, without ROM or initial
  `node_modules`: offline `npm ci` install from cache, then verification of
  existing emulation resources and `npm run check` passed. All 49 files in
  `dist` are byte-for-byte identical to the reference build. Node 24.20.0,
  npm 11.19.0, same platform. This is not proof of identity across OS/versions,
  nor a fresh initial runtime download.
- Install test first hit broken Homebrew Node outside project (missing
  simdjson library), then an error with `npm ci --prefix`. Installing from
  the temporary folder with working nvm Node succeeded. No system or lockfile
  modification to work around these errors. npm warned about unapproved
  optional `fsevents` script; checks passed, no global approval or script
  added.
- Spot test of compiled build on local preview server with manual ZIP
  selection: race and two views, hidden source, real capture, and 20 events
  seen by driver. Frame 1097 → 1187, copies 1089 → 1179; stable pause frame
  1210/copy 1202, no JS errors or remote/dev requests. Observed average
  copy+render CPU submission cost 0.122 ms, max 6.9 ms, not GPU time.
  Temporary preview server stopped after test.
- GitHub workflow completed to include `test:preview`, without attested remote
  run (folder not initialized as Git repo). No deployment.

Remaining for Michel to confirm: session of at least 10 minutes, audio
listening, braking, no doubling on new session; Safari, 120 Hz, and DPR not
validated. Original game code and Michel's gain are unchanged.

## Capping diagnostic — November 6, 2026

Michel confirms that **fast gestures seem to cap** at 1.80×. Cause remains
unidentified; no measurement from his test has been received yet.

Application path remains linear, with its sole existing int16 safety. Core
source (`mame2003.c` / `inptport.c` of the pinned revision) transfers relative
deltas then applies analog sensitivity; driver counters are 8-bit. This
reading does not demonstrate a speed cap or a browser error on Michel's Mac.
No change to gain, curve, or physics.

Added: independent reset of measurements alone and local copy of diagnostics.
A test confirms that gain and fractions survive reset; browser tests for
successful copy, refusal, and button availability.
`npm run check`: **61 tests passed**; **10 Chrome tests passed** without ROM.
To receive: copied diagnostics after a fast-gesture test at constant gain.

## Trackpad calibration — human feedback of November 5, 2026

Michel reports a **1.80× "not too bad"** setting, with difficulty achieving
strong accelerations. Cause not established: do not automatically conclude
clipping, a trackpad defect, or normal arcade behavior.

A non-regression test confirms linear 1.80× gain on small and large deltas,
with peaks and saturation counter. New diagnostic fields do not modify inputs.
Next test on real hardware: compare peaks before/after gain and `saturated`,
and clarify whether speed seems to cap or if too long a gesture is required.
No new acceleration curve added. `npm run check`: 60 tests passed; all 8
Chrome tests remain passing.

## Increment B — November 5, 2026

**Implemented**: Credit and Start with release, standard Pointer Lock, shared
gain with fractions and saturation, real native purge, explicit pause/resume,
volume and audio context resume, persistence of settings alone.

**Automated without ROM**: 59 unit/integration tests across 8 files and 8
Chrome tests passed. Business logic coverage: 99.07% lines, 99.13%
statements, 98.50% branches, 100% functions. `npm run check` passed. UI
command tests use a test adapter; real runtime tests use a synthetic ROM-less
ZIP and verify its loading then the expected failure.

**Local tests with provided archives** (outside permanent tests), Chrome
157.0.8103.38 headless:

| Test                                 | Observation                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Credit then Start after MAME screens | A race starts, countdown then race timer                                   |
| Relative movement after countdown    | Marble moved on plateau; example polled values (4, -2) in native driver    |
| Positive X at gain 1                 | Observed received/transmitted sum 304/304, no saturation; visible movement |
| In-game audio                        | Running context, one source, gain 0.5; non-zero RMS observed 0.06412       |
| Escape                               | Capture released, pending X/Y, polled values, and buttons at zero          |
| Pause                                | Frame 1131 stable across two reads 350 ms apart, audio context suspended   |
| Resume                               | Context and loop explicitly restarted, without automatic recapture         |
| Console                              | No JavaScript errors during these tests                                    |

**To be validated by Michel**: real audio listening, precision of small
gestures, signs of felt axes, diagonals, fast gestures, lifting/placing
finger, preferred sensitivity, and endurance. Automated movements are those of
the Chrome pointer, not those of a real Apple trackpad. RMS proves a measured
signal, not listened audio or certified sync. Safari and 60/120 Hz screens
untested.

The hook intentionally depends on the JS/WASM glue pair and a private ABI,
verified by hash and memory tests. See `DECISIONS.md` before any core update.
BabylonJS video is not yet wired.

## Game + BIOS loading fix — November 5, 2026

- Archives provided by Michel are read from their original location, without
  copying into the project. All 27 game dumps and three BIOS dumps match
  expected sizes and SHA-1. Atari suffixes are normalized after verification.
- Spot test in **Chrome 157.0.8103.38 headless**: selection of `marble.zip`
  and `atarisy1.zip`, validation, start button, then observation of attract
  mode (level and marble displayed). No JavaScript errors observed.
- Originals are unchanged. The working ZIP is built in memory only.
- **Audio not listened to, trackpad not tested**; no gameplay comfort
  certified.
- Permanent tests synthetic only: assembly of two ZIPs, aliases, incorrect
  content, missing/truncated BIOS, duplicates, ignored extra files, and retry.
- `npm run check` passed: **33 tests** across 4 files; coverage: 97.95% lines,
  98.14% statements, 97.72% branches, 100% functions; build passed.
- Chrome tests: **3 tests passed**, including fix for BIOS selection after
  error.

The previous finding of missing ROM concerned November 4; it is lifted for
this local test with files explicitly provided by the user.

## Increment A — November 4, 2026

Environment: macOS, Node 24.20.0, npm 11.19.0; **Chrome 157.0.8103.38
headless** via Playwright. This automated browser does not constitute a human
test on the Apple trackpad. Exact npm versions in manifest and lockfile.

| Check                        | Status and evidence                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| Versioned local distribution | `npm run setup:emulator` passes; SHA-256 of files verified                |
| Types, lint, format, build   | `npm run check` passed                                                    |
| Unit and NullEngine tests    | 27 tests passed across 4 files                                            |
| Business scope coverage      | 97.43% lines, 97.72% statements, 94.87% branches, 100% functions          |
| Chrome UI without archive    | Clear message, no core instance created                                   |
| Incorrect synthetic archive  | Rejected with list of missing dumps, retry possible                       |
| Real runtime without ROM     | Frontend, 7z decompressor, and WASM loaded from local origin              |
| Runtime identification       | RetroArch 1.21.0 (`6dd4353`), MAME core Git Version `3a72dae`             |
| Driver in runtime            | `Matched game driver: marble`, trackball reported, 30 ROM names requested |
| Failure without ROM          | `Required files are missing` then `Failed to load content`, expected      |
| Runtime network              | HTTP requests observed only on local origin                               |
| Browser persistence          | No IndexedDB database after launch attempt without ROM                    |

Both Playwright tests pass. They use a synthetic archive containing a test
file without game data. The runtime test directly calls the integration to
bypass the validator's normal refusal; this bypass is limited to the test and
is not an application option.

The announced input driver is `emulatorjs` (derived from rwebinput), with
mouse support present in its source; the path to the marble remains untested.

The manifest of 30 dumps was cross-checked with the driver of the revision
announced by the core. Durable synthetic evidence is in
`third_party/core-evidence.json` and `third_party/runtime-evidence.json`.
The JSON test report and attached logs are generated in `test-results/`.

## To validate next

- Trackpad comfort and listening by Michel, then 10-minute endurance.
- Finger repositioning and fast gestures on real hardware.
- Frame rate at 60/120 Hz, Safari as secondary validation.
- BabylonJS video copy with aspect, orientation, and hidden source.
- Repetition of new sessions and full comfort validation of C.

Use the matrix in section 11 of the specification for each test: date,
versions, procedure, observations, status, and limits. Distinguish
implemented, automatically tested, manually tested, and to be validated by
Michel.

## Known limits

The bench accepts the `marble` parent set, complete or split between game and
BIOS. Other sets are not handled. Useful files must be at the root of ZIPs;
extra files are ignored. Pause, context silence, and purge were observed in
Chrome; human comfort validation and other browsers remain to be done.

Video copy is not implemented. The separate BabylonJS scene remains a demo.
Vite reports a BabylonJS chunk larger than 500 kB on this secondary page; the
bench's application bundle is about 14 KB, excluding emulation files. The 11
previously noted moderate npm alerts concern the ESLint/minimatch toolchain;
no forced update to incompatible versions was applied. The emulator may emit
missing-option warnings during the ROM-less test; effective options will need
to be recorded during increment B.

## November 6, 2026 — preloading of roms folder

- Implemented: preloading of game and BIOS from the test Vite server,
  development only. Manual selection preserved and identical SHA-1
  validation; no automatic start of emulation or Pointer Lock.
- `npm run check`: 75 tests across 10 files, format/lint/types/build passed.
  Coverage: 98.86% statements, 99.01% branches, 100% functions, 98.78% lines.
  BabylonJS >500 KB warning unchanged.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 12 tests passed. Two new
  cases: preloaded synthetic archives actually passed to validator; HTTP
  failure leaving manual selection available. Routes are intercepted to
  exclude any reading of personal ROMs under test.
- Local HTTP check with provided files: `/__local-roms/marble.zip` 200,
  471,410 bytes; BIOS 200, 57,375 bytes; `/roms/marble.zip` 403.
- Build inspection: no ZIP and no `/__local-roms/` route in app bundle.
  `roms/` already ignored by Git (repo still not initialized).
- These checks do not constitute a new game test or physical trackpad
  validation. Measuring the fast-gesture plateau remains to be done.

## November 8, 2026 — observation of last native poll

- Human feedback: Chrome 155, 1.70× gain, 6582 events; received peaks 199,
  transmitted 338, pending 765, zero hook clipping. Difficult braking exiting
  the waves, end slope of level 3. Cause not established.
- Implemented: signed extrema and inversions of the last native poll sampled
  after each emulator iteration; preserved after pause and explicit reset. No
  modification to inputs or physics.
- Targeted tests: 16 passed. `npm run check`: 84 tests across 11 files,
  format, lint, types, and build passed; coverage 99.02% statements, 99.19%
  branches, 100% functions, 98.95% lines. BabylonJS chunk warning unchanged.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 12 tests passed without ROM.
- Spot test Chrome 157.0.8103.38 headless with local archives: real browser
  mouse movements and capture, 63 iterations, 30 non-zero samples, X -20..87,
  Y -8..8; one inversion observed per axis. After release, native state at
  zero and stats preserved. Reset verified via button. No JavaScript errors.
  No ZIP included in permanent tests.
- Limit: no observation of every C poll, multiple polls may miss sampling;
  repeated values possible. No native displacement total or braking delay
  claimed. Measures neither speed nor game physics.
- To be validated by Michel: comparison of medium/fast opposite gestures at
  same gain, especially braking on the reported slope. C remains to be
  validated.

## November 8, 2026 — increment D, same-session video

Implemented: direct/BabylonJS plane comparison and plane alone, fixed camera,
neutral background, core aspect preserved, single session and audio chain.
On-demand BabylonJS import. `HtmlElementTexture` copy in synchronous hook of
native iteration; no second emulation loop or `preserveDrawingBuffer`.

Automated tests: `npm run check` passed, 92 tests across 13 files; coverage
99.04% statements, 99.21% branches, 100% functions, 98.98% lines. Framing
calculation included in thresholds; NullEngine verifies scene and disposal.
`PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 15 passed without ROM. The
three new tests cover WebGL transfer with primary and shaded colors,
orientation, resize, hidden-source animation, stopping live copies, idempotent
cleanup, and fallback to direct view if GPU creation fails.

Real spot test with local archives, Chrome 157.0.8103.38 headless:
Credit/Start and race observed in both views, captures inspected. Switch to
plane alone, hidden source, real capture, and 20 mouse events seen by native
driver; frame 1073 → 1193 and copies 1068 → 1188. After release: stable
pause, frame 1201/copy 1196, zero residual input, and no JavaScript errors.
Images in `/tmp` only, no ROM data integrated into tests.

Dimensions announced by core: 336×240 and aspect 1.333333373. Copied
dimensions: 547×410 then 1110×832. Keep distinction between
framebuffer/aspect/presentation. Observed average copy+render CPU submission
time 0.156 ms, max 21.7 ms, including creation/resizes; no GPU wait. These
headless results prove neither real GPU cost nor speed on a 120 Hz screen.
Game rendering was observed with unpreserved source WebGL buffer.

Remaining limits: human validation of comfort and braking, audio listening
during new mode, 10-minute endurance, 120 Hz screen, Safari, and DPR changes.
The 15 permanent tests remain ROM-less; they do not certify the game by
themselves. BabylonJS chunks >500 KB warning preserved. C is not declared
fully validated; no cabinet/bar added.

## November 8, 2026 — flicker after first D delivery

Human feedback: rapid flicker in comparison; slight shimmer when scrolling on
plane alone. Fix implemented: video notification only after an actual
`drawArrays`/`drawElements` on the default framebuffer of the source canvas;
iterations without drawing keep the texture. Final bilinear filtering for
fractional resampling, without emulation change.

Spot probe in real runtime Chrome 157.0.8103.38 headless, local archives:
before, 331 copies including 3 without drawing and transparent in comparison.
After, 338 copies with zero undrawn/transparent cases in comparison; 579
cumulative and still zero after hidden-source mode. The `readPixels` probe is
not part of delivered code or permanent tests. This reproduces the copy defect,
without proving all causes of human-perceived flicker are eliminated.

`npm run check` passed: 98 tests across 14 files, format/lint/types/build.
Coverage: 99.08% statements, 99.23% branches, 100% functions, 99.02% lines;
new video hook included. `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 16
tests passed without ROM. The new test verifies true red/green interpolation at
a texel edge with odd width, preserving interior colors. Non-regression unit
tests on iterations without drawing, FBO, other canvas, single notification,
and marker validation.

To be validated by Michel after full reload: absence of flicker in comparison,
scroll quality, and compromise of slightly softer filtering. Physical/120 Hz
screen and comfort not certified by these tests. Existing BabylonJS build
warnings unchanged.

Game test after this fix, Chrome 157 headless: race displayed, hidden source,
and capture active; frame 1082 → 1202, copies 1076 → 1196, 20 native events
observed. Stable pause at frame 1212/copy 1206; no JavaScript errors.
Observed average CPU submission cost 0.127 ms (max 6.2 ms), without GPU
completion measurement. No human test of new filtering.

## Cabinet CRT screen

- NullEngine test verifies enabling on cabinet, replacement of shared texture,
  material reuse, and scene cleanup.
- Chrome test verifies page/HUD sync, persistence after reload, pixel
  differences with scanline and curvature settings, exact restoration after
  disabling, and fidelity of BabylonJS plane view. A setting change does not
  request a new video copy.
- With local archives and real core, a game was launched in Chrome. Paused
  captures of the same frame, front-on with and without effect and tilted view
  with effect, show rounded corners, curvature, and scanlines. Resuming with
  noise at 50% ran without console errors. Preferred intensity while playing
  remains to be validated by Michel.
- `npm run check` passes with 294 Vitest tests. Chrome suite passes with 37
  tests. Vite still reports chunks larger than 500 KB.

### Aspect ratio and curvature fix

Real core announces 336 × 240 and a 4:3 presentation aspect ratio. Chrome
measured a source canvas of 1110 × 833 and a WebGL viewport of 1110 × 832. The
browser test measures the front image on a 16:9 window, then verifies
centering of a wider synthetic source in the tube and shrinking of both axes
toward corners with CRT.
Front and Tilted Monitor views of a real paused game were inspected with
enhanced rendering. No JavaScript or shader errors observed. `npm run check`
passes with 297 tests. All 38 Chrome tests pass.

## Boosted boost after Michel's jump test

Michel reports that jumping to side platforms on level 1 remains impossible
with trackpad and Space. Two games of the real core in Chrome received 36
consecutive horizontal inputs, starting at iteration 1200. At the twelfth
iteration, the marble moved about 5 pixels with 128 units per iteration and 11
pixels with 256, on an image scaled to 336 pixels wide. All 36 native reads of
each series match the setpoint. This comparison measures screen displacement
on the level 1 start. Held boost now uses 256. Normal gain keeps its
independent setting. Crossing between ramp and platform remains to be
verified.

Additional tests verified response to left, down, and diagonal right. End-to-
end test with Pointer Lock, Space held, and horizontal movement observed 28
boost iterations, with last native poll at (256, 0). After Escape, capture is
released, boost purged, and pending deltas are zero. No JS errors. All 297
`npm run check` tests and 38 Chrome tests pass.

## User feedback on Safari

Michel validates a two-player game, audio, and CRT readability. He reports
intermittent black screens and slower startup in Safari. Attempt to open Safari
from the test tool timed out. Cause of black screen and time difference remain
to be measured in Safari.

With local archives in Chrome, a launch after the change recorded 57 ms for
ZIPs, 27 ms for frontend, and 1,405 ms between start click and start event,
without JS errors. These times are indicative for this test and do not
measure a speed gain in Safari.

3D context loss was triggered in Chrome with `WEBGL_lose_context`. Test
verifies return to direct view, pixel restoration, and keeping a single video
subscription. `npm run check` passes with 297 tests. All 39 Chrome tests pass.

### Safari capture and crackling

Michel reports an immediate pause when clicking Capture and crackling audio.
Browser may confirm Pointer Lock via event after method returns. This case is
reproduced in the Capture button test in Chrome and in the exploration unit
test. Requested audio configuration in Safari changes from 64 to 128 ms.
Listening and capture with Safari browser itself remain to be confirmed.

A launch of the real core in Chrome with Safari user agent confirms that
generated config contains `audio_latency = 128`, without JavaScript errors.
`npm run check` passes with 300 tests. All 40 Chrome tests pass.

### Safari fullscreen capture

Capture is confirmed windowed by Michel. He reports repeated pauses and audio
dropouts in native fullscreen. Safari prior to 18.2 now uses immersive
presentation in the window.
Chrome test with Safari 17 user agent verifies HUD, real capture, pause on
Escape, and no native fullscreen request. With local ROMs, frame went from 17
to 59 with active capture and running audio context, without JS errors.
Listening and smoothness in Safari remain to be verified. All 41 Chrome tests
pass.

## Prototype 04 — first probe and mesh

Local Lua probe runs with MAME 0.271 and user archives. After Credit and
Start, all six read pointers match the table documented by Marble Love. At
frame 1199, active descriptor is `0x2bee2`, cell is `(17, 17)`, and all
sixteen sampled heights are `0x4000`. Slopes, edges, and world coordinates
remain to be qualified.

The `terrain.html` scene uses a synthetic grid. Unit tests on slopes, holes,
and UVs. NullEngine verifies normals, scene resources, and their disposal.
Camera rotation is tested in Chrome. Repeated texture and lighting were
inspected on a Chrome capture. `npm run check` passes with 310 tests and the
build includes `terrain.html`. All 42 Chrome tests pass.

### Prototype 04 — Practice Race replay

`scripts/measure-terrain.mjs` ran four independent sessions with MAME 0.271
and local archives. The seven surveys and seven images of each trajectory are
identical between both runs. Captures of start, slope, and track exit were
inspected. Survey goes from `0x4000` at start to variable heights on slope,
then zeros at edge. Images are in the temporary folder printed by the command.
Vertical scale of mesh remains to be established.

### Prototype 04 — local survey mesh

Across two axes and two repetitions, the Lua decoder recovers all sixteen
core words at the seven checkpoints and produces the same 20 × 14 cell start
grid. Survey was loaded in Chrome and scene was inspected after vertex
welding. Slopes and openings are visible. Calibrated silhouette comparison and
cliff height remain to be done. Unit tests cover JSON validation, partial
cells, seams, and exposed faces. `npm run check` passes with 324 tests.

### Prototype 04 — comparison framing

Fixed camera is tested with NullEngine on three points in arcade coordinates.
Both MAME 0.271 replays verify projection across six observations with a
maximum deviation of 2.14 native pixels. Overlay of real first frame and mesh
was inspected in Chrome. A browser test verifies capture selection, its
opacity, and return to free view. Marble center comparison validates local
start framing, with a still-approximate terrain silhouette.

## Playable Intermediate Race and local startup

- Automated. Tests cover level 2 descriptor, rendering of a deep pose beyond
  the range of old captures, fixed-axis camera, presence of bridge parts, and
  restriction of files to loopback. Playwright verifies preloading before F2
  with synthetic archives.
- Chrome with local archives. Replay regenerates respawn point. Study page
  preloads archives, F2 opens game, core displays Intermediate Race with 60
  seconds, and modern view displays the same marble. Captured cursor moves the
  marble. F2 restores start `(220, 108)` under capture. Bridge mechanism was
  observed flat and raised in study framing.
- To verify in-game. Full course of level 2 in modern view and comfort on
  Michel's trackpad. 3D bridge still follows study cycle.

## F2 resume fix and 3D actors

- Initial trace shows movements and a death with no delta received. Restoring
  ports and Slapstic bank removes this defect. Real Chrome test verifies
  exactly X=220 and Z=108 for eight seconds, visible marble, then F2 under
  capture and all three V views.
- Trackpad in behind camera moves the marble toward the front of the framing.
  Unit tests also verify the reference frame for different horizontal
  orientations and amplitude preservation.
- A replay in the Web core traversed the start of Intermediate Race up to
  first contact with worms. Comparative capture shows their positions and
  dizzy marble with stars. Sweeper and extracted model poses are visible in
  the WebGL check scene. Tests verify model switching, morphs, stopping while
  paused, and hiding stars and tongue.
- Full course and fine alignment of breaking, cleaning, jump, and tongue
  durations remain to be validated in-game. Automated route tests did not
  reproduce every interaction on every pass.
- Delivery passes `npm run check` with 490 Vitest tests and 51 Chrome tests.
  Vite keeps its warning on BabylonJS chunk sizes.
