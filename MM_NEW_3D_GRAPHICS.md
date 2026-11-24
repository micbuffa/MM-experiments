# Marble Madness — Modern True-3D Rendering

## Objective

Run a single Marble Madness session in the MAME 2003-Plus core already
integrated into EmulatorJS, with two selectable presentations.
The **Arcade** presentation displays the original video, including inside the
existing 3D cabinet. The **Modern 3D** presentation renders the course, marbles,
and objects as textured, lit meshes with BabylonJS.

The first playable milestone is **Practice Race**. The next target covers all
six courses, one by one. The bar environment and cabinet camera angles continue
to provide access to the arcade presentation.

## Game Invariants

- The same core runs the same game session in both presentations. It remains
  solely responsible for physics, collisions, rules, active objects,
  scrolling, progression, score, timer, and audio.
- The existing input pipeline remains shared between both presentations,
  including gain, Space boost, and P1/P2 controls. Switching views preserves
  the game, its pause state, and pointer capture. Standard interruptions
  continue to pause and purge inputs.
- BabylonJS consumes read-only observations. It modifies neither game memory,
  ROMs, nor core settings. Emulation cadence remains independent of 3D frames.
  Any interpolation is strictly for display.
- ROMs and BIOS files remain local. Data extracted from Michel's archives
  remains local. Permanent tests use synthetic data. Modern textures and
  materials have their provenance recorded in `public/assets/README.md`.

## Sources and Responsibilities

| Source or Module        | Purpose                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REA with Ghidra         | Locally analyze the 68010 program, identify routines, and document terrain, object, scroll, and HUD fields. Verify installation before use and record versions.               |
| Marble Love             | Use notes and probes from revision `113cf5d` as leads. Cross-check every integrated field against core observations.                                                          |
| Local MAME 0.271        | Replay scenes and collect reproducible observations to verify interpretations.                                                                                                |
| Web Core Adapter        | Validate exact build compatibility and publish a consistent snapshot after each iteration. Addresses verified in local MAME are ported to Web only after verifying alignment. |
| Pure TypeScript Modules | Convert units and axes, validate data, build geometry and the display model.                                                                                                  |
| BabylonJS and UI        | Display meshes, lighting, and HUD. Manage camera, view selection, and resource lifecycle.                                                                                     |

The snapshot contract progressively includes level and iteration IDs, game
state, scroll, entity poses and visual states, then score and timer. Each
published datum must have a documented source, unit or meaning, and a test.
The 3D camera translates the observed framing and scrolling into the BabylonJS
coordinate system. Menus, transitions, or unsupported levels display the arcade
video. A data or 3D rendering error triggers the same fallback within the
current session.

## Tasks and Acceptance Criteria

### 1. Prepare Analysis and Reference Replay

- [ ] Verify REA, Ghidra, and Java. Prepare the local analysis project and
      identify routines using Marble Love notes.
- [x] Replay a short reproducible Practice Race sequence in MAME.
      Document the build, initial state, inputs, and sampled iterations.
- [ ] Establish coordinate mappings on a flat area, a slope, and an edge.
      Validate axis directions, vertical scale, sample ordering, and void encoding.

**Acceptance.** A second replay yields the same values, and each observed
surface type is matched to a visible landmark in the arcade video.

### 2. Reconstruct the First Real Segment

- [x] Display in `/terrain.html` a first segment built from local Practice Race
      data. Reuse the indexed mesh and extend it according to measured needs.
- [x] Build surfaces, visible cliff faces, and level drops. Apply original
      textures and tuned lighting to make slopes and voids readable.
- [x] Compare arcade and 3D captures in a shared framing.
- [ ] Validate remaining approximate edges and cliff proportions.

**Acceptance.** Flat areas, the ramp, and segment edges match observations.
Openings are not covered over by the mesh.

### 3. Display the Marble and Scrolling of the Current Game

- [x] Read the level descriptor and P1's position from the Web core during the
      Practice Race start. Place the 3D marble in the surveyed terrain.
- [x] Measure the first scroll and synchronize camera framing with the snapshot.
      Extend the survey up to the first scroll's ramp.
- [x] Make marble rolling visible and add a drop shadow oriented according to
      the arcade view.
- [x] Verify a fall and P1's respawn on the first ramp. Keep the 3D view during
      absence and restore the marble at the resume point.
- [x] Add the **Arcade / Modern 3D** toggle, with fallback within the same
      session if the current level or state cannot be displayed in 3D.

**Acceptance.** The segment is playable in 3D and toggling displays the same
game at the same position, including while paused. Testing observes no new
session, no new audio chain, and no loss of capture.

### 4. Deliver Practice Race in Full

- [x] Extend geometry from start to finish and handle the transition to the
      summary screen and then to Intermediate Race in arcade.
- [x] Display the arcade core's score and timer in P1's modern view.
- [x] Display the second marble, plus two-player scores and timers.
- [ ] Add missing visual elements and poses for other objects.
- [ ] Verify single-player and two-player race cases, edge crossings,
      falls, and transition to the next screen.
- [ ] Replay the same input sequence from the same initial state in Arcade,
      in 3D, and with mid-game toggles. Compare, per core iteration, marble
      positions and states, observable collisions or transitions, score, timer,
      and finish.

**Acceptance.** Gameplay traces match exactly for tested sequences. The full
course remains readable and playable in the browser, including when switching
presentations mid-game.

### 5. Extend to Other Courses

- [ ] Add subsequent courses individually, with their terrain variants and
      animated objects. Scenery movements derive from states observed in the core.
- [ ] Verify level-to-level loading, cleanup of meshes and textures, and
      returns to arcade screens.
- [ ] Measure rendering cost, especially during scrolling and in immersive view.
      Verify smoothness and audio in Chrome and Safari.

**Acceptance.** Each added course has an arcade/3D comparison, a regression
replay, and a visual sign-off. Uncovered sequences remain accessible in
arcade presentation.

## Validation on Every Delivery

- Add Vitest tests for every significant feature. Notably cover decoding,
  edge cases, coordinate conversions, holes, view transitions, and subscription
  cleanup.
- Use NullEngine for scene construction and disposal. Verify real rendering,
  controls, and stability in the browser.
- Compare runs on numbered emulation iterations. Report any discrepancy at the
  first diverging instant. Image comparison alone does not validate gameplay
  identity.
- Run `npm run check` and relevant browser tests. Record methods, results,
  and limitations in `docs/VALIDATION.md`, then update `HANDOFF.md`.

## Starting Point

`/terrain.html` displays test geometry and accepts the local Practice Race survey.
The local probe confirmed the six descriptors and read sixteen samples at the
start of Practice Race.
Replay now covers the start, the slope, and exiting the terrain.
Mappings to validate are tracked in
[Prototype 04 notes](docs/PROTOTYPE_04.md).

- [Prototype 04 notes and evidence](docs/PROTOTYPE_04.md)
- [REA](https://github.com/morluto/rea)
- [Marble Love and its level format](https://github.com/magno73/marble-love/blob/113cf5de969ff62cb1d7b901340206f30122f658/docs/level-header-format.md)
