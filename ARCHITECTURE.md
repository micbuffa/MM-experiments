# Marble Madness Web — Architecture

## Remaster Audio Layers (`Remaster` branch)

`src/remaster/audio/` separates two layers.

**(a) Cue layer: `soundCues.ts`.**

- Pure TypeScript, with no WebAudio or chip knowledge.
- Maps `RemasterEvent`s from `remasterSimulation.ts`, including `bump`,
  `airborne` and `land`, to sound cues.
- Applies cooldown, intensity and stop rules, then calls a `SoundCueBackend`.

**(b) Backends.**

- `romSfxBackend.ts` replays `public/assets/audio/rom-sfx.json`, the register
  streams captured from the arcade 6502 sound program, with driver priorities.
  The streams go to the worklet as `sfxStreams` messages and run on the ymfm
  YM2151 + POKEY WASM core.
- `synthCueBackend.ts` is the hand-made FM fallback.

**Controller.** `createRemasterAudio.ts` owns the AudioContext and worklet,
the music VGM player, the remaster-only rolling POKEY, and backend
selection. Details are in [docs/ROM_SFX.md](docs/ROM_SFX.md).

## Shared Native Palette for the First Four Races

`emulation/terrainPalette` (formerly `level4Palette`) checks the memory map
of the pinned core and reads 64 words of terrain RAM and 16 words from the wave sprite bank. `practicePose`
exposes them across all four levels; the adapter reuses the unchanged
array and the renderer only updates uniforms when a change occurs.
`TerrainPalettePaint` owns the colors and their material binding,
with no observer, extra texture, or GPU readback. Materials and
plugins are disposed with the scene.

`ArcadeTerrainPaint` selects the native tints for levels 1 through 3:
floors lit by their normals and the sun, walls by orientation,
level 3 tower patterns, second green bank, and cyan ice atlas.
Existing grain and patterns are preserved; the shader avoids the
over-brightening added by the old vertex colors. Ice has
lighting already baked into the atlas and no longer adds a white highlight.
Indices 0–63 of the readout correspond to the playfield; 64–79 correspond
to motion object colors 80–95. Reading remains bounded to these two
graphics RAM regions. `IntermediatePipePaint` selects the purples from
bank 3; the waves use flat playfield green 63 and the
crest tints from the sprite bank. Wave normals point
upward, their amplitude matches the arcade profile, and their surfaces
do not receive shadows. Unchanged values do not rewrite buffers.
The two niches in level 2 are seven tiles wide and three tiles deep.
The two ledges remain entirely behind the facade plane.
`refineIntermediatePipe` subdivides the closed Y surface while preserving the
lips and material boundaries, then `fitIntermediatePipeHoods` applies
a continuous deformation without splitting or flattening distinct skins.
The extracted file and the separate J are preserved. Normals are recomputed
on coincident vertices to smooth interior, exterior, and joints.
Copies and buffers remain owned by the scene meshes; no
per-frame updates or extra GPU readbacks. The local audit
`node scripts/audit-intermediate-pipe.mjs` checks the Y edges and triangles
and scans for non-coplanar intersections between non-adjacent faces.
`practiceDisplayTerrain` also fixes the three SW corners of the paving in front
of the central tower that inherit its collision profile; the visible terrain
remains flat there, without altering the core's collision data.
The level 4 vacuums are procedural: a 90-degree bent ribbon,
parented to the mount, connects the stem to the head. Only the head receives
native wobble; the connector recesses into its back to avoid a gap.
The level 1 wall material explicitly includes the texture alpha
in BabylonJS's final alpha test, including with vertex colors.

`Level4PalettePaint` shares the uniform binding while keeping the
level 4-specific swatches and wall mask.

## Level 3 Corridor Floor Reconstruction

In the initial maze, `level3DisplayTerrain` fixes SW samples
taken on the plateau at 16384 when the other three corners belong
to the lower corridor and define a consistent plane. The local fix
precedes `terrainMesh` and `terrainCliffs` generation: it eliminates
false ramps and enables vertical walls joined to the true floor.
It modifies neither the simulation nor the source data and preserves
gradual slopes and separately defined ramps.

## Level 3 Pipe and Procedural Vacuums

`widenLevel3Pipe` prepares a copy of the imported duct's positions/normals,
with diameter increased only on the vertical section and transitions at the
ends. `createLevel3Pipe` shares this copy between outer shell and interior.
`level3DisplayTerrain` places the three paving rows on Z=76..78 and
the opening on Z=79..82. `createLevel3Pipe` translates shell and liner by one
tile along +Z; their Z=83 edge meets the existing platform. The edge of the
large platform thus spans seven tiles before this block.

`createLevel4Vacuums` owns the six procedural mechanisms and their shared
materials, disposed with the scene. `readLevel4VacuumMouthFrames` forwards the
two active native frames via `PracticePose.vacuumMouthFrames` and
`setLevel4VacuumExtensions`. The setter deforms the head and its fragment target,
without moving the duct and without an extra observer or clock. Retraction
and reset restore the neutral pose. `public/assets/README.md` lists the
Rolling Madness models actually selected versus those only available.

## Local Catapult Axle Adjustment

`fitCatapultAxle` prepares a copy of the imported poses for
`createRollingCatapult`. The axle end vertices are identified
on the rest pose and adjusted across all poses. The source model,
cup, arm, and arcade synchronization remain unchanged.
The copies are owned by the scene renderer, with no new GPU resource.

## Level 4 Mechanism and Wall Refinements

`level4Hammers` reads the last-emitted frame pointer (+0x42), distinct from the
next-interpretation pointer (+0x3e). Its sprite ordinal table
preserves native repeats for both hammer representations.
`level4CliffColors` encodes per-face entirely yellow low walls;
`Level4CliffPaint` preserves the high-wall frieze and the lighting treatment
of the inner faces of both arch pairs. The latter receive and cast
shadows from the existing sun. `createCatapultMasonry` owns an extra
untextured gray material, shared by all six tops and disposed with
the scene. No observer or new shadow map is added.

## Level 4 Arcade Palette

`emulation/terrainPalette` reads 64 terrain palette words and 16 wave palette words from RAM
B00400 of the pinned core, after checking tables and memory bounds.
`practicePose` publishes them; the adapter keeps the last array and
reuses its identity if unchanged. `createLivePracticeView` forwards
changes to `level4PalettePaint`. Wall and track uniforms are
updated without new resources or GPU readbacks. The study fallback is
measured in the same checkpoint. The full PNG's palette is different:
that file remains an architectural reference, not the colorimetric truth.

`Level4CliffPaint` retains height-based paint zones, gray joints,
and light/shadow blending via `key`. The tall outer wall X=90, Z=72..90
additionally has a shadow boundary derived from the original tiles,
baked in wall coordinates, because no geometric obstacle occludes
the sun on that facade. This local mask combines with 3D shadows,
with no new light and without touching the arch piers.
`Level4GoldPaint` also shifts track tint by orientation
(brown, beige, pink), then applies existing grain and shadow.
Materials remain owned by the scene. No simulation depends
on the palette or shaders.

## Level 4 Lighting and Local Joints

`level4LandingNormals` prepares per-tile normals for the landing, without changing
geometry in other zones. `level4DisplayTerrain` gives the slope joint
a shared edge with the flat section.

The cliff material lights both visible faces. The first sector
does not receive a yellow frieze. A localized palette fix keeps the
left facade uniform, without false self-shadowing at the ramp joint.
The deep crossing walls receive the full `key` sun
map, with the tall cliffs and ramps as casters.
There is no longer a dedicated light or shadow map for the crossing. Scene
resources and arcade timing remain unchanged.

## Level 4 Joints and Contours

`createLevel4ArchBridge` builds three-tile sinusoidal profiles,
sampled separately for both pairs. Depths below the bank are
9/15 arcade units (crown/ends) for the first pair and 10/16 for
the second; horizontal banks are painted gray.
It builds the horizontal tops of the second passage
at 16272. `level4DisplayTerrain` joins the two central tiles at 16260,
the two side slopes, and the adjacent large inclined plane. The passage
paint uses a constant local red/yellow boundary.
`openLevel4Bridge` keeps the end walls of banks X=87/90, which
receive the curved shadow of the piers. `splitLevel4LandingWalls` distributes
faces between cliffs and landing while preserving the four vertices of each quad
for painting. Both meshes cast and receive the global map.
`createLevel4RampEndJoints` owns the mesh and mortar material of the
suspended end cubes. They are disposed with the scene; no new
observer or asset load is added.

## Level 4 Presentation — November 21, 2026

The gold ramps have fascias and undersides without solid support.
Both undersides share the crossing without overlap. The X-oriented
bridge reverses its indices to keep normals pointing outward;
the neighboring landing retains both bevels. Level 4 uses PCF filtering
on its shadow map to soften artifacts on tall walls.

`level4Hammers` converts integer RAM coordinates into tiles (division by
eight). `createRollingHammers` has no live animation clock:
native frames drive the imported poses, and a reset hides
them. The procedural fallback follows the same flow in game mode. Study
page previews remain separate from this native behavior.

## Level 4 Cliffs and Bridge Presentation

`createLevel4ArchBridge` removes the survey faces beneath both
long sides of the bridge and builds both arches. `level4CliffPaint`
provides per-fragment cliff coloring by height.
Cylinder caps belong to the scene. The imported catapult
has a light restricted to its meshes and a local shadow
map owned by the scene.

## Catapult Masonry Support

`createCatapultMasonry` builds the U-shaped coping and its deep
walls using the scene's track and cliff materials.
Joints are aligned in world space. The scene owns the
meshes and the shadow generator reuses them.

## Imported Catapult

`createRollingCatapult` reuses `createRollingActor` for the two
catapult meshes from the local library. It replaces the scene's
pose driver and hides procedural moving parts. The
library is passed to the live scene and loaded locally in
the study page. The scene owns geometries, materials, and textures.

## Level 4 Cylinders

`emulation/level4Pistons` reads only raised slots from the native
level 4 table. `practicePose` forwards their position and animation
step. The live scene owns 36 reusable meshes and applies
each pose to the visible slots. The core remains responsible for counters,
zones, and bounces.

## Level 4 Native Effects

`practicePose` forwards per-player suction progress and the
shot pointer converted to a pose number. The live view hides the marble
during fragmentation and drives the catapult without a render clock.
Fragments are allocated at scene creation. The core retains
triggering, impulse, and reconstruction.

## Level 4 Vacuums

The `emulation/level4Vacuums` reader reads object frame pointers from the
pinned core. `practicePose` forwards level 4 deployment ratios and
`createLivePracticeView` applies them to the scene's six procedural mechanisms.
The meshes belong to the scene. Their height depends on the
native pose in-game. The study scene displays them deployed. Restoring
a checkpoint confirms the requested level before handing control back to
the UI.

`createMarbleMaterial` owns per-player paints (six rings of 8 yellow dots
projected without spherical distortion), shared between the normal marble and
its morphs. `practicePose` reads native break/broom pointers (`0x72`, `0x7a`,
`0x7f`), the 7 native steps of the Intermediate Race bridge (`0x772`/`0x774`),
native magic/reward events, and maintains the 3D view during `mode === 4`
(Out of Time / Game Over) with alpha-RAM banner reading in `practiceHud`.
`createIntermediateBridge` exposes live driving (`setIntermediateBridgeStep`)
separate from the study loop, and `createTerrainStudy` installs a dedicated
static directional light (`intermediate-pipe-wall-light`, `REFRESHRATE_RENDER_ONCE`)
to cast pipe shadows onto `terrain-cliffs`.

`createCameraOcclusion` installs a material plugin on walls/towers/rims.
Fragments near the camera–marble segment are made visually passable
via threshold dithering, excluding the floor at the marble's foot (`mmAboveFoot`/`mmClearFoot`).
`chase` framing is restricted to 1-player mode (`resolvePracticeCamera` /
`practiceCameraControls`). The opening sweep (`createLivePracticeCamera`)
traverses the level linearly from finish to start without backtracking.
`practiceChannelTerrain` clips outer corners along the `±21` diagonal bounds
of the full survey, and `createPracticeGoal` frames the 4 lines of the
Practice Race chute while keeping the compact format for Intermediate Race.

Worms are articulated meshes owned by the scene (`createWorm.ts`).
Calculation of contacts, curvature, and eating phases is pure and testable
without GPU (`game/modern/wormPose.ts`), driven by native scripts read in
`intermediateActors.ts`. `readModernPhase` distinguishes level introductions
from arcade screens: `createVideoView` keeps 3D only in the former,
and restores original video for results/game over. `playControls` owns
canvas-click recapture, using the same control path as the
Capture button and the same cleanup.

Sweep handoff belongs to `rendering/createLivePracticeCamera.ts`.
It uses native Practice progression, or 180 frames of the core counter
for a new scene/F2 resume, and also interpolates projection toward
the gameplay camera. `createVideoView` prepares the preferred terrain before a valid
pose and preserves its presentation across native phases. The
`practicePose` reader accepts level 2's native introduction after player
initialization. These modules do not advance the core. F2 keeps its playable
checkpoint; the sweep does not stop the timer and C interrupts it.

The Prototype 03 section describes the current additions. Earlier sections
preserve the choices and evidence from prior increments.

Prototype of the original arcade game in the browser, in TypeScript/Vite,
with **EmulatorJS 4.2.3 + MAME 2003-Plus** and its video on a BabylonJS plane.
A single session provides direct, comparison, and 3D views. Credit, Start,
relative trackpad, pause/resume, volume, and diagnostics are available.

Michel played with the trackpad and confirmed the flicker fix in the BabylonJS
view. The latest tested gain is **1.70×**; braking at the end of level 3
remains an open item. Boost impulses and jumping onto the side platforms
of level 1 are not validated. The 10-minute endurance run and full audio listening
remain to be confirmed. The [release summary](docs/RELEASE.md) separates acquired
validations from limits; detailed evidence remains in
[docs/VALIDATION.md](docs/VALIDATION.md).

## Setup and Startup

Node.js **24 or higher**, npm. On the reference Mac, use Chrome with WebGL2.

```sh
npm ci
npm run setup:emulator
npm run dev
```

Setup downloads only pinned emulation files, verifies
their SHA-256 hashes, and copies their notices into `public/vendor/`. It downloads
no ROMs. Existing valid files are reused. The application
then uses local assets, with no CDN at game launch.

Vite provides the HTTP server: open `http://127.0.0.1:5173/` in Chrome.
For subsequent launches, `npm run dev` is sufficient from the project folder.
Keep this terminal open; Ctrl+C stops the server. Do not open `index.html`
directly with `file://`.

To preload test archives, place `marble.zip` and, if needed,
`atarisy1.zip` in the `roms/` folder at the project root, then reload the
page. It displays the preloaded archives; no file picker is needed.
This mechanism is reserved for `npm run dev`, on this machine: `roms/` is ignored
by Git and absent from the build. `npm run preview` retains manual selection.

## First Trial on Michel's Mac

1. If archives are not already preloaded from `roms/`, choose **marble.zip** in the **Jeu** field. If the BIOS is separate, also choose
   **atarisy1.zip** in the **BIOS facultatif** field. The 30 dumps of the
   parent `marble` set are searched at the root of both ZIPs; clone files
   present in subfolders are ignored.
2. Click **Vérifier et préparer**: sizes and SHA-1 hashes of the uncompressed
   data are verified locally. Filenames alone are not sufficient.
3. Click **Démarrer l'émulation**, then wait for the game screen after MAME's
   startup messages (a few seconds). The disclaimer screen
   is skipped via the core option; no trackpad movement is needed.
4. Click **Crédit**, then **Start joueur 1**. After the race countdown,
   click **Capturer le trackpad**. Move one finger, without holding
   a click. The pointer becomes invisible and gestures control the marble.
5. **Esc**, focus loss, or hidden tab: pause, audio suspended, and inputs
   cleared. **Reprendre / activer le son** explicitly resumes emulation and
   audio; **Capturer le trackpad** also resumes and recaptures on your click.
   Returning to the tab never resumes automatically.
6. If needed, adjust **Sensibilité X/Y** after Esc, then recapture.
   Shared gain 0.25–4×, default 1×: experimental setting, not a fidelity value.
   The reset button restores 1×. Adjustable volume, 0% to mute.
   Only gain and volume are stored locally.
7. **Nouvelle session** reloads the page completely and reloads archives from `roms/`
   in development (otherwise, select them again);
   a confirmation appears if emulation has already started.

System dumps `136032.205`, `136032.206`, and `136032.107` may be in
the game or separate BIOS archive. Atari names `136032.205.l13`, `136032.206.l12`,
`136032.107.b2`, and the equivalent `136032.104.f5` are recognized only if their
sizes and SHA-1 hashes match. The application assembles only the 30 validated
files under MAME names in an in-memory ZIP; originals remain untouched.
The exact list of names, sizes, CRCs, and SHA-1s is in
[src/emulation/marble-roms.json](src/emulation/marble-roms.json), and names are
viewable in the UI. Harness limit: 16 MiB per archive.

No upload or persistent storage of ROMs, BIOSes, or save states. Archives are read and assembled solely in memory. Native frontend preferences are disabled; only our
gain and volume settings are stored under keys `marble.gain` and `marble.volume`.
Do not place archives in `public/`: use `roms/` for local testing
or the file pickers. The server receives no uploads.
An archive error allows a retry; a runtime error requires a
new session. If assets are missing, re-run `npm run setup:emulator`.

For the first trial, check especially small gestures, diagonals, and
finger repositioning. No smoothing, extra acceleration, inertia, or
45° rotation is added. Physics remain those of the arcade program. Scroll
wheel and touch events do not control the marble. Standard browser
behavior is used; unadjusted movement mode is not enabled.

Regarding trackpad tuning, Michel finds **1.80× quite comfortable**, with
difficulty on strong accelerations: he notes that fast gestures
seem to plateau. This remains under investigation.
Diagnostics display command peaks `peakRaw` (before gain), `peakSent`
(after gain), and `peakPending` (before native consumption), as well as `saturated`
(hook clipping count). Compare a few gentle then fast gestures at the
same gain. Peaks remain available after Esc; they do not measure
marble speed and do not by themselves prove a limit in the arcade program.

To record a usable trial:

1. Keep the usual gain (currently 1.70×).
2. Click **Capturer**, perform an acceleration, then **Esc**.
3. Click **Copier les diagnostics** and paste the text into the discussion.

The clamp trial at 416 was **removed**: Michel observed no
improvement in jumping. Commands remain linear at the chosen gain, with no
extra limiter or added inertia. Impulses/jumps are not
yet validated as faithful to the original game.

An [impulse response benchmark](docs/INPUT_RESPONSE.md) now measures
the marble on screen after identical starts. It is run manually,
with local archives and the dev server already running:

```sh
npm run measure:impulses -- --quick
# Full suite (about 4 minutes):
npm run measure:impulses
```

To compare the same total across multiple durations: `npm run measure:profiles`
(about 4 minutes), or `npm run measure:profiles -- --quick` (about 2 minutes).
The [gestures and profiles protocol](docs/MOTION_PROFILES.md) describes the results
and the next human recording: **Capturer → one acceleration → Esc → Copier les diagnostics**.
Each new capture automatically starts measurement and resets its counters
to zero. "Nouvel essai" remains an optional reset shortcut. No need to time or label the gesture:
the recorder automatically keeps the motion with the highest command peak,
even if a small movement preceded it. The `motionTimeline` block is local,
bounded, included in the copy, and preserved after Esc.

The [recorded gesture calibration benchmark](docs/CALIBRATION.md) compares gains
without altering player preferences:

```sh
npm run measure:calibration
npm run measure:calibration -- --phase-check
npm run measure:calibration -- --refine
```

It replays the full profile then an isolated stroke, checks polls and real
ports, and verifies a one-iteration offset before selecting a candidate.
Gains are diagnostic setpoints; no setting is changed at launch.

To also observe the [actual trackball port reads](docs/TRACKBALL_PORTS.md):

```sh
npm run measure:ports -- --quick
```

The [comparison with native MAME 0.271](docs/REFERENCE_COMPARISON.md) is run
separately, with an already-installed executable and the same local archives:

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

It requires no HTTP server and does not alter the web page's core.
Measurements agree after phase alignment; jumping remains unresolved.

The tracer verifies the binary and its read map, preserves real handler
arguments and return values, then restores it. The report goes to
`test-results/trackball-ports.json`; this tool runs neither in normal gameplay
nor in CI. Jumping is still not declared fixed.

Numeric reports go to `test-results/impulse-response.json` (ignored
by Git). No game snapshot or image is kept there. The benchmark injects
native diagnostic deltas without using the trackpad or gain: this is not
a player-accessible game control. It does not validate a successful jump.

The `nativeSampling` block keeps the last native poll sampled after
each emulator iteration: signed extrema `minX/maxX/minY/maxY`, last
non-zero movements, and reversals `reversalsX/Y`. Zeros do not artificially
create a reversal. A pause breaks the sign sequence without clearing
statistics. These are neither exhaustive poll counters nor marble braking
measurements; multiple polls within one iteration may escape
observation and a value may remain identical across two samples.

Michel reports difficulty braking on the steep slope exiting the
waves, at the end of level 3. For the next test, keep the same gain and compare
a run of medium gestures then a run of fast opposite gestures, resetting
measurements between the two and copying each result after Esc.
Note the braking feel and gain; do not change the original physics.

Resetting only clears statistics, without changing control,
fractions, or the game. Copying is local, with no upload; if
blocked by the browser, select the diagnostics text manually.

If sound is missing, check volume then click **Reprendre / activer le son**
after the core launches. Diagnostics report `audioState` and `audioRms`:
a zero level at a given instant may correspond to normal silence. A signal
measurement does not replace listening. The frontend `start` signal alone does not prove
the arcade program has launched.

After startup, the **Affichage de la même session** selector offers:

- **Vue directe**: EmulatorJS display, without BabylonJS copies.
- **Comparer les deux vues**: direct video and 3D plane side by side.
- **Plan BabylonJS seul**: source hidden, same emulator and same controls.

The camera is fixed and intercepts no input. Copying only replaces the image
when an actual core draw has occurred; iterations without an image
keep the last texture. Bilinear filtering limits edge
flicker during scrolling when video is displayed at a fractional size. Credit, Start, capture, gain,
volume, and Esc work in all three modes. No ROM reload
nor second audio chain when switching views. Switching views
does not resume a paused game. On GPU failure, direct view remains
accessible. After Esc, switch views then recapture to resume.

`videoGeometry` reports native dimensions and aspect announced by the core;
`videoView` reports copied canvas dimensions, copy count, and average/max CPU cost
of copy+render submission. These are neither full GPU times,
nor proof of normal emulation speed. The canvas includes any
black bars from the frontend; its resolution may differ from the native framebuffer.

The [standalone technical scene](http://127.0.0.1:5173/scene.html) remains an
older static demo. The main page selector gives access to real
video. Braking comfort, endurance, and 120 Hz displays remain
to be validated on Michel's hardware.

## Checks

```sh
npm run check
npm run test:browser
npm run test:preview
```

For browser tests, install Chromium once:

```sh
npx playwright install chromium
```

On a Mac with Chrome already installed, you can use:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

Tests use **synthetic data only, without ROMs**. The runtime test
bypasses the validator solely in the test context, to verify
loading of the real core, recognition of `marble`, and the expected failure due to
missing dumps. UI control tests use a ROM-less test adapter;
trials with user archives remain ad-hoc and documented. It does not validate a playable game. Results and limits:
[docs/VALIDATION.md](docs/VALIDATION.md).

| Command                             | Usage                                      |
| ----------------------------------- | ------------------------------------------ |
| `npm run setup:emulator`            | Install/verify local frontend and core     |
| `npm test`                          | Unit tests and NullEngine integration      |
| `npm run test:watch`                | Watch mode tests                           |
| `npm run test:coverage`             | Coverage of rules and archive checks       |
| `npm run test:preview`              | Build then HTTP tests of production output |
| `npm run test:browser`              | ROM-less browser checks                    |
| `npm run typecheck`                 | Strict TypeScript, including browser tests |
| `npm run lint`                      | ESLint with zero warnings                  |
| `npm run format`                    | Format with Prettier                       |
| `npm run check`                     | Format, lint, typecheck, coverage, build   |
| `npm run build` / `npm run preview` | Production build / preview                 |

CI installs the verified assets and runs checks and Chromium tests.
`test:preview` uses a dedicated server on `127.0.0.1:4173`, then stops it.
It verifies the compiled page, synthetic archive validation, runtime
hashes and notices, and the absence of ROMs and dev preload routes.
For installed Chrome: `PLAYWRIGHT_CHANNEL=chrome npm run test:preview`.

To test the build manually:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`, then select the ZIPs with the local fields.
This test remains local and publishes nothing. In development, keep `npm run dev`
for `roms/` preloading. After modifying the emulation hook,
perform a full page reload to replace the glue already loaded in memory.

Downloaded third-party files are ignored by format/lint tools;
they are verified by hash, without rewriting their sources.

## Agents and Documentation

- [AGENTS.md](AGENTS.md): shared guidelines, mandatory tests for any major feature.
- [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md): mandatory reading for every task.
- [ARCHITECTURE.md](ARCHITECTURE.md): modules and dependencies.
- [HANDOFF.md](HANDOFF.md): actual status and next action.
- [Specification](Marble_Madness_Prototype_01_SPEC.md): scope and increments A through E.
- [Release](docs/RELEASE.md): summary and latest manual acceptance.
- [Decisions](docs/DECISIONS.md): versions, verified APIs, evidence, and core choice.
- [Third-Party Components](third_party/README.md): provenance, hashes, and separate licenses.

`CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` point to the shared
guidelines. If a tool does not load them automatically, explicitly ask it
to read `AGENTS.md`. No extra skill is required.

The folder is not yet initialized as a Git repository. No public deployment.
Do not commit ROMs/BIOSes, secrets, `node_modules`, `dist`, `coverage`,
`public/vendor`, or test reports. `VITE_*` variables are public.

The TRACKPAD_TRIAL_GAIN (0.50×) candidate remains a linear gain constant in
input/relativeMotion, distinct from the unchanged 1× default. The UI button calls the
same applyGain as the slider and reset; no import of
calibration tools in the app, no loading of numeric evidence
at launch. Explicit storage after click, no automatic resume. Existing
preferred setting is preserved prior to user action.

## Space Comfort Mode and 3D Presentation — Spec Section 15

`input/boostMotion.ts` is a pure generator, time injected in seconds, with no DOM
or standalone loop. The last displacement gives a direction; a direction
older than 0.25 s does not trigger a boost without a new gesture. While
held, each native iteration receives an L1-norm 256 vector, reused
without per-frame allocation. Trackpad movements then steer the boost,
instead of adding up as large spikes. Releasing immediately returns
to normal relative control. No marble force, velocity, or position is written.

`emulation/emulatorjs.ts` owns the generator and feeds it from accepted
events. Its existing native pre-hook writes the command once before the iteration,
without depending on BabylonJS. Mode switch: pending cleared, fractions purged;
entering boost starts a clean measurement. The generated command log is
separate from mouse events (`generatedCommands`) in the timeline. Normal gain
counters cover normal commands; boost exposes its emission
separately, nativeSampling observes the last poll of both modes.

`ui/playControls.ts` consumes Space only during capture, without repeat,
releasing on keyup and any interruption; focus leaves the Capture button to
prevent a new Space after Esc from implicitly recapturing. No scrolling
on Space when canvas/body waits while paused; UI fields remain editable.
Rejected 0.50× gain migrated to 1.70×; other user choices are preserved.
DEFAULT_GAIN is now 1.70× and the normal button restores that value.

`rendering/createScreenStage.ts` builds a procedural screen stand, floor,
grid, and lighting owned by the scene. `createVideoScene` keeps the same video
plane and unlit material; only its presentation switches from orthographic
to perspective and the stage is enabled. Stage created lazily, kept in
plane mode without multiplying resources, disposed with scene/materials/lights.
No new listener, engine, or loop for this view. `createVideoView` keeps
the single existing texture and copy subscription; source hidden as in plane-only mode.
direct/compare/babylon/stage modes share a single session and switching
never resumes a paused game. GPU unavailable: direct fallback.

## Fullscreen Presentation and Compact HUD

`game/gamePresentation.ts` owns presentation transitions without DOM:
entry, native exit, denial, async cancellation, and disposal. The injected
host provides pause, presentation, and fullscreen API. No path resumes
the core; existing play gestures remain owners of that decision.
A generation counter invalidates stale results without closing a newer entry.

`ui/gamePresentation.ts` owns the HUD, its listeners, and its MutationObserver.
Buttons delegate to shared controls; no second handler for Credit,
Start, Pointer Lock, audio, or boost. Disabled states and messages are
synchronized. `feasibility.ts` mounts after controls and comparison,
then unmounts presentation before them. The fullscreen element wraps source
video, BabylonJS canvas, and HUD. Renderer ResizeObserver adapts the engine;
the core remains independent. Fullscreen API denial/absence: immersive CSS within
the window. Safari prior to 18.2 takes this path directly to
preserve Pointer Lock. Exit: pause/purge, then focus the enter button after the
fullscreenchange event, when that button becomes accessible again outside fullscreen.

## Fixed Front and Perspective Cameras

`createVideoScene` owns a front/perspective `CameraPreset`, initially
perspective. The stage's front view is orthographic, centered on the video
plane (Y=1.85), frame provided by videoFrustum with an extra 8% margin
for the 3D frame. Perspective keeps the previous framing. The flat plane
remains unchanged and the 3D choice is preserved across other presentations.
A single FreeCamera is reconfigured, without attachControl or new resources.
mode/position/setTarget/ortho* APIs were verified in installed BabylonJS
and exercised with NullEngine then Chrome GPU.

`createVideoView.setCameraPreset` reframes and redraws the last texture even
while paused, without copying or advancing the core. `videoComparison` owns
both page/HUD selectors, their listeners (AbortController), synchronized
values, and disabling outside 3D scene/error/disposal. The
videoView.cameraPreset diagnostic exposes this choice. No access to core
controls, preferences, or states; switching neither pauses nor resumes a session.

## Capture Shortcuts and P2 Start

`input/requestPointerCapture` handles async confirmation on the document
and the promise-based variant. Gameplay and exploration use this hook
from the user gesture and manage their interruptions separately.

`input/arcadeShortcuts.ts` resolves requested key aliases, without DOM or time.
It rejects Ctrl/Alt/Meta and composition; Shift remains allowed for digits
on French keyboards. `playControls` accepts the command only in Pointer Lock
on the session canvas, unpaused and outside text inputs. Recognized repeats
are absorbed without a second impulse. The capture-phase document listener intercepts
before native EmulatorJS shortcuts, which remain neutralized.

`ProbeSession.pulse(button, player=0)` keeps existing calls and accepts
port 1 for StartJ2. Two instances of the buttonPulses generator own their
own timers; clearInputs frees both before native zero_inputs. The adapter
calls simulateInput(player, button, value), index2=SELECT/credit, index3=START.
`heldButtons` remains port 0; `heldPlayer2Buttons` exposes port 1. No new
physics, core config, or relative input for the second player.

`scripts/measure-endurance.mjs` is an opt-in benchmark outside app/CI,
loopback server and local ROMs required. It observes the real test instance
via a constructor proxy (like the other benchmarks), native input calls,
existing diagnostics, and Chrome CDP Performance. Numeric report bounded to
ten samples and one hundred input calls maximum; no image, ROM, or state.
Browser and context are released in finally. Metrics do not feed
the game and cadence remains the core's. Active duration is timed
with test process performance.now, without altering game clocks.

## Prototype02 — Allowed Cabinet, Bar, and Interactions

Spec02 amended by Michel's explicit request replaces the historical
cabinet/bar exclusions. `createScreenStage` assembles two modules: `createCabinet`
(cabinet, screen, marquee, trackball, coin door, buttons) and `createBarRoom`
(floor, walls, counter, shelves, bottles, furniture, and four lights).
`decorTools` provides geometries/materials/canvas signs; resources named
and owned by the scene. Sign textures created once, system font,
DOM-less path for NullEngine; GPU disposal is verified in Chrome.
Repeating materials shared. Sides and panel follow video aspect.
The top of the trackball stays below Y=0.85, bottom edge of the image, so as not to
occlude the game in front projection.

`game/cabinetAction` filters only recognized metadata credit/start1/
start2/play; left-click only, no interaction during capture. Ray
picking is registered explicitly by the classic Culling/ray import in
createVideoScene. `createVideoView` owns canvas listeners, hover/tooltip,
picking, and typed action callback. `videoComparison` delegates to existing buttons;
play selects front then calls Capture synchronously, preserving the
PointerLock/audio user gesture. No animation wait before capture.
The new StartJ2 button shares the same port 1 impulse method as the keyboard.
The 3D controls are neither a new emulation facade nor code inside assets.

`game/cameraTransition` computes smoothstep interpolation from seconds.
createVideoScene reuses a single FreeCamera and working vectors.
To interpolate to/from orthographic, the transition uses a perspective
FOV matching the screen frustum, then restores the target projection.
`resizeLayout` recomputes the target without canceling the transition (especially when
HUD status changes on capture). The explicit layout method can cancel.
Three framings: bar, cabinet perspective, and front centered on video.

`createVideoView` owns a single temporary rAF task during the 0.65 s
transition. The video callback continues copying but leaves rendering to this
task; at the end, rendering returns to the normal video callback. No permanent
loop or core iteration from BabylonJS. During pause, the camera
can therefore move over the last texture. Stop/cancel rAF on presentation
change, disable, blur, Esc, visibility, and dispose; resources and
listeners freed. A scene.executeWhenReady callback draws the scenery after
initial shader compilation, even if no new arcade draw arrives.
The cabinet can be visible before the first video texture; its screen then
waits for the first actual core draw, without copying an invalid framebuffer.
If BabylonJS loses its WebGL context, the adapter detaches the texture and
falls back to direct view. After restoration, the next core draw
feeds a new texture if the 3D view is selected. Loss of the
core context follows the usual pause and appears in diagnostics.

copyAndRender* metrics remain those of the video callback. Transition
rAF rendering is outside this timing; these values therefore do not describe
the total cost of animations and never measure GPU completion.

## Prototype 03 — Exploration, Sound, and Render Cost

The Atari System I cabinet uses meshes converted from Gozer's SKP.
`createCabinet` builds these meshes and their local textures, then places
the two trackballs and picking zones for buttons and coin door.
`venueLayout` contains dimensions in meters. Walk collisions follow
the fixed footprint of the cabinet. Video preserves its aspect in the tilted
monitor opening and the front camera aligns to that plane.

`ui/crtControls` synchronizes the page switch and HUD switch and
persists settings via local preferences. `createVideoScene` applies
`rendering/createCrtMaterial` to the monitor surface in Cabinet and bar mode.
Tube dimensions are fixed at 4:3 aspect. `videoFit` centers the video
in the opening according to the copied canvas ratio, with letterboxing if needed.
The subdivided mesh bulges the center and mid-edges of the glass.
The fragment shader warps the raster on both axes, with glass reflection,
and attenuates scanlines when their projection becomes too small.
Interference advances with received frames. Settings can
redraw the paused image without a new copy. The scene disposes the mesh
and its materials. The video adapter owns the shared texture.

`game/cameraPreset` defines the order of the five fixed framings. In-game,
`ui/videoComparison` intercepts C when the arcade canvas has Pointer Lock
and the Cabinet and bar scene is active. The shortcut and both selectors
use the same framing change and the same BabylonJS transition.

`game/barNavigation` computes walk pose and collisions in meters and
seconds. `venueLayout` shares cabinet dimensions between rendering
and collisions. `input/barExplorer` owns Pointer Lock on the BabylonJS
canvas and walk keys. `ui/videoComparison` coordinates observation,
exploration, and gameplay states. E near the cabinet ends walking, restores
arcade audio, then requests capture on the native canvas in the same gesture.
Pause, Esc, focus or capture loss, and hidden page purge keys
and cancel pending capture. `playControls` remains owner of arcade
controls. Exploration lets the core play so the bar can be heard, with
arcade inputs disabled.

The session exposes `VenueEffects`. After each captured iteration,
the adapter relays P1's native deltas and P2's movement computed
from held directions. Each notification identifies the player.
P2's remappable keyboard goes through `ui/player2Controls` and
`gameManager.simulateInput` on Libretro port 1. The web driver filter
reserves the mouse for port 0. Pause purges both players' directions.
`createTrackball` applies an incremental quaternion to each ball and
attaches marbling to its vertices. Blue follows P1 and red follows P2.
`createVideoView` rotates red during a drag started on
that ball outside Pointer Lock and schedules rendering with the existing loop.
The increment axis stays tied to the cabinet, even after a
composed rotation. The top rolls toward +X for a right gesture and toward −Z
for a downward trackpad gesture. A 45° cap per sample
prevents a large impulse from drawing nearly a full turn in a single update.
This cap belongs to the renderer.

`game/spatialMix` computes gain and pan from pose. The adapter
knows the OpenAL master `Module.AL.currentCtx.gain` of the pinned build.
`audio/spatialOutput` replaces its direct link with a gain and a
`StereoPannerNode` from the existing context during the walk. Stopping the walk
restores the direct link. Nodes and subscriptions follow the session
lifecycle. Diagnostics distinguish the positional branch signal
and the core's source count.

`createVideoView` owns the rAF task during exploration and transitions.
The video callback continues updating the texture, then resumes rendering
when the rAF task ends. Core cadence is independent of these
two paths. `game/renderQuality` sets the DPR cap of the BabylonJS canvas.
`createScreenStage` uses a static shadow map, refreshed on a
quality change. The Eco profile disables shadows.
`renderMetrics` wraps manual rendering with beginFrame/endFrame and owns
scene and engine instrumentation. Classic imports
`abstractEngine.timeQuery` and `engine.query` register the required
BabylonJS extensions. CPU measurement covers render submission, while
GPU uses asynchronous driver timestamps when available.

## Prototype 04 — Terrain

In development on loopback, `terrain.html` instantiates the game page
in a same-origin frame to preload and verify archives during
the study. The single EmulatorJS session starts on click. Direct start loads
a solo checkpoint created by replaying commands with the same web core,
via `scripts/record-intermediate-checkpoint.mjs`. The dev server
serves the checkpoint and level 2 survey under fixed names. The checkpoint remains in
`local-roms/`, outside the build. BabylonJS rendering reads coordinates,
height, and scroll of the active level after each emulated iteration.

`emulation/intermediateCheckpoint` supplements core state with
port accumulators and Slapstic state from the pinned WASM. Resuming
reconstructs the ROM bank using the same addressing as the Atari device.
`localStudy` preloads both full surveys. `createVideoView` keeps
the surveys in memory and replaces the scene when the read level changes.

`intermediateActors` reads records for the black ball and the four
creature slots. `rollingActors` validates the local model library.
`createRollingActor` owns pose meshes, materials, and textures in
the scene. `createIntermediateActors` applies native positions and states.
`createMarbleAnimation` selects marble animations. The clock is
the core's frame counter and freezes while paused.
`cameraRelativeMotion` converts gestures into trackball axes according to the
camera's horizontal direction. Boost uses this same frame.

`game/modern/terrainMesh.ts` takes a height grid and emits positions,
indices, and UVs with no graphics dependency. `rendering/createTerrainStudy.ts`
creates the test BabylonJS scene. `terrain.html` reuses the lifecycle
of `createApplication` for the loop and cleanup.
The MAME probe and data analysis remain in local tools.

The local diagnostic `scripts/measure-terrain.mjs` exports vertices of a
Practice Race segment from MAME 0.271. `practiceTerrain` validates and
normalizes the JSON chosen in `terrain.html` or in the game view. The format
associates cells with their origin and measured scroll range. `terrainMesh` builds
surfaces and `terrainCliffs` exposed faces and steps. Guardrails
and start spikes belong to `createPracticeLandmarks`. This
module places posts on the paving triangles. The
`createPracticeGuardrail` and `createPracticeTower` builders receive their materials
from the scene. Dimensions and anchor points are described in
[the scenery element inventory](docs/SCENE_ELEMENTS.md). Loading happens from
the chosen file and the study scene alone owns its render loop.
`createPracticeSun` uses the azimuth measured on frame 1199 and sets
elevation to 24°. The study scene owns the generator without filtering
guardrails and towers. The in-game view can add marbles to it
on demand. Paving and markings receive cast shadows. Vertical
walls are lit by their material and the sun.
Terrain normals determine grays on a uniform
paving texture. `practiceDisplayTerrain` reconstructs
the central pit steps and completes tiles above the
right outer wall to join its edge to the terrain.
The renderer also adjusts the side pit lip to match its cutout in
the arcade view. The height survey is preserved for projection.
`createPracticeNumberSigns` draws the three 3–4–5–6 markings on the
paving. The left variant mirrors digits within their tiles and
both right-facing markings share their material.
`createPracticeGoal` provides the three palettes for the serif lettering,
placed on the first slope of the chute. It animates the 3 × 2 checkered flags
in the scene's render loop. The in-game view
selects the gray palette at start, then that of `PracticePose.goalOwner`,
the first player to finish according to the core. Paving uses a
16 × 16 texel texture with stepped joints and light dithering.
`practiceChannelTerrain` joins shared chute vertices and
completes straight rims in the presentation mesh. It
extends exposed cliffs of the final descent below the frame.

`practiceProjection` describes the arcade framing in native pixels and
`createPracticeCamera` transposes it to the orthographic camera.
The local benchmark compares the projection to the observed marble and the terrain
page can overlay a capture loaded from a local file.
The study page also accepts `intermediate-terrain-v1`, a 130 × 130 cell
survey with adjustable framing over the measured range.
Mesh and camera are shared between both levels.
Intermediate Race applies its blue cliff material. Its three
towers use the `createIntermediateTower` model, with a base
offset by 14 tiles prepared in `intermediateLandmarks`.
`intermediateRims` joins incomplete tiles before generating
cliffs. Cliffs and the bridge deck cast their
shadows onto the paving. `createIntermediateBridge` replaces the surveyed
bridge zone with an articulated deck and its mechanism. The study
scene animates these meshes at the cadence observed in MAME.
A local copy of the survey may include decorative meshes for both
pipes. `parseIntermediatePipeGeometry` validates vertices, indices, and optional
normals before `createIntermediatePipes` builds the surfaces.
`intermediatePipeSurfaces` cuts welds in the model triangles
and separates gray tiles of both mouths to apply a shadow-receiving
material to them. `intermediateFinish` selects ice and finish
tiles. Banner and flags reuse `createPracticeGoal` with
Intermediate Race coordinates and colors.
`intermediateIceMaterial` projects reflection patterns into UVs from
relief. `intermediateIceWalls` splits vertical faces between
ice and cliff along the drips.
`createIntermediateBridgeMechanism` builds the mechanism and texture
of the deck side. Their provenance and alignment are documented in
`docs/PROTOTYPE_04.md`.
The Intermediate Race sun uses the shadow displacement of the
central pyramid's apex. Blue cliffs receive
shadows in addition to the paving.

In the game page, the `emulation/practicePose` adapter provides
`VideoSource` with a reading of the active level and P1/P2 poses restricted to the
pinned WASM binary. The same snapshot includes scores and timers read from
arcade HUD tiles by `emulation/practiceHud`. `createVideoView`
forwards these values to `ui/videoComparison` when modern terrain
is visible. `ui/practiceHud` draws the HUD at 336 × 240 on an overlaid
2D canvas, framed to the 4:3 image, with an accessible text equivalent.
It hides when returning to arcade. Its updates follow
core video notifications and pose reads on view switch.
`createLivePracticeView` reuses the mesh of the locally chosen
survey and converts the pose to BabylonJS coordinates.
Reading preserves fractions of all three coordinates to display
small movements without rounding jitter.
`createPracticeStartLift` prepares five local slopes with their walls
and selects the one indicated by `PracticePose.startLift`. These meshes
belong to the scene and share terrain materials.
Successive position differences rotate the marble's pattern.
The adapter distinguishes visible, hidden, and reconstructing marbles.
`createPracticeMarble` owns each marble's mesh and rolling.
Every fall or reconstruction hides the sphere and resets its rolling
tracking. `createPracticeRespawn` animates eight shards in the player's
color using the arcade counter read from the pose. In the camera
plane, the ellipse tightens and descends onto the respawn point.
Shards remain legible above the scenery.
`createPracticeCatchUpLabel` uses a camera-facing bitmap panel
to display "−5 SEC" above the caught-up marble. Presence
and horizontal offset of the text come from the arcade pose.
The scroll word shifts the orthographic projection
window during the race, fall, and finish.
`createLivePracticeCamera` drives this camera and a perspective camera
for tracking, top-down view, behind-the-marble framing, and flyover.
Both share the same
viewport within the 4:3 image. Perspectives target P1, then P2 if P1 is
hidden, or keep the last target point if both marbles are hidden.
Flyover takes its progress from
`PracticePose.opening` during the core countdown and ends
when gameplay begins. `practiceCameraControls` wires the menu, FOV
slider, and shortcuts to the scene. Camera controls
redraw the paused view from the same snapshot. The owner
`createVideoView` renders a single presentation per core
notification on the existing BabylonJS engine. The survey scene is disposed
on file replacement or end of view lifetime. The full survey
keeps the scene on screen during marble excursions.
It clamps framing to the surveyed scroll and provides a projection
margin around the mesh. The partial survey keeps its video
fallback outside the segment. `gameHelp` controls the H panel, with the
keys displayed by the P2 configuration module.

Modern comparison mode keeps the MAME canvas visible beside the
BabylonJS scene. Both outputs use the same session, and rendering of
the modern scene uses the existing video notification without copying the
arcade canvas. Display selectors and shortcuts V and Shift+V
switch presentation. Capture remains attached to the MAME canvas.

## Level 4 Two Overpasses

Paving at the lower crossing remains at the low corridor height.
Both arched strips are distinct thin meshes. Cliff
removal aligns with their edges. The lower crossing surface
belongs solely to `level4-underpass-surface`. Both strips
cast shadows and retain directional lighting without reading
the global shadow map on their own faces.

## Level 5 (Silly Race) Presentation

The `level5-terrain-v1` survey and checkpoint remain local. F5 loading
uses the same session and pose reader as the other levels.
Scroll decreases: camera and study slider respect this direction.
`level5Actors` reads the separate native pools (miniatures and birds);
`createLevel5Actors` only displays their positions/states/cycles.
`createLevel5Terrain` owns static resources; `level5DisplayTerrain`
fixes presentation samples, including the small flat arena ramp.
`level5FortGeometry` separately generates a symmetrical roof with four 12-arcade-unit
corners and its four yellow walls. Terrain stays at the base of the plinth;
its grid cuts do not participate in the corners. `createPracticeTower`
keeps the plinth center for the shoulder and apex in levels 1 and 5.
The local ellipse mask is derived from the original full image by
`scripts/level5-wall-pattern.mjs`, included in the local actor library,
then projected onto vertical faces. Pigments and shadows remain subject
to the native palette and scene lights. Everything is disposed by the scene.

### Level 5 Death Effects

`birdDeath` reads each player's native fragment groups and forwards
their projected offsets in `PracticeMarblePose.birdDeath`. `createBirdDeath`
owns the eight presentation meshes per player, updates them from
the pose, and hides them as soon as it disappears. `createLivePracticeView` hides
the sphere during this effect. No extra timer. `birdParts` separates
the four beak faces for painting; `createRollingActor` accepts
a presentation vertical scale, used for the first stages
of black miniature squashing and reset to 1 for normal poses.

Level 5 squashed miniatures also use ground anchoring from
the mesh's minimum Y and a presentation horizontal scale; normal
updates restore default values. `fitBirdPoses` copies and
adjusts beak and feathers once at model load; pose normals
are recomputed on these copies. No extra observer or timer.

## Level 5 Finish Depth and Edges

The finish collision strip is distinct from the visible volume. `level5DisplayTerrain`
rebuilds platforms at 16416; `level5FinishDepth` shifts X/Z/H by 48
for presenting both marbles in this zone. `createLivePracticeView`
uses these coordinates for meshes and cameras, without writing to the core.
Movement follows the isometric ray: arcade projection is unchanged.
Flags are anchored in the presented terrain. The Z=34 end wall
shares its lower edge with the adjacent slope, with no intermediate volume.

`archBridgeGeometry` is the pure builder shared between levels 4 and 5.
Level 5 rotates this three-cell profile and adds the two solid supports
of its six-cell approach bridge.
`openLevel5Bridge` only removes faces beneath this deck; the scene owns
both banks, the lower floor, their shared materials, and their shadows.

Both diagonal limits X−Z=±21 are clipped along the entire race after
floor repairs. Missing SW corners of interior walls are filled from
the three consistent corners; they are not treated as outer corners.
