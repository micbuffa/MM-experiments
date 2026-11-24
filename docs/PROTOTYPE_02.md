# Interactive Cabinet and First 3D Bar

This document describes stage 02. For the explorable bar and positional sound,
see [specification 03](../Marble_Madness_Prototype_03_SPEC.md).

All five stages were authorized by Michel and implemented: original cabinet,
framing with transitions, clickable controls, materials/lighting, first room.
Specification 02 details the scope; the original game remains in MAME.

## Using

1. npm run dev; local archives in roms/ or manual selection.
2. Verify and prepare, start the core, then wait for its screen.
3. Play in 3D fullscreen. **Bar** camera for the room, **Cabinet** for the unit,
   **Frontal** for a straight, enlarged image. Page/HUD selectors follow the
   same choice and transitions also work while paused.
4. Outside capture, click Credit or the cabinet coin door, then Start1
   or 2. HUD buttons remain an accessible alternative. The arcade program
   decides required credits and game state.
5. Click the screen or trackball: zoom in toward the screen and capture in
   the same gesture. One finger without held click to play, Space for boost.
6. Escape releases and pauses; resume/capture explicitly. During capture,
   3D clicks do not trigger credits or Start. Shortcuts 5/(, 1/&, 2/é always
   available. Port 2 has Start, not a second trackpad.

The cabinet screen waits for the core's first actual draw if it has not yet
been copied; the scenery, however, can be displayed while paused before the
first video. The camera has no navigation attached to the trackpad. The first
room is a fixed observation scene, not an FPS-walkable bar.

## Contents and Ownership

- Cabinet, plinth, side panels, marquee, and speakers.
- Live original screen, control panel, trackball, buttons, and coin door.
- Dark painted metal, light inserts, cyan/orange accents.
- Plank floor, walls, slatted counter, shelves/bottles, stools, table, and
  pendant lights; ambient/directional lighting and warm/cool point lights.
- One session, one engine, one video texture. Original geometry and system
  marquee generated locally; no external images or models.
- Direct mode and comparison plane preserved, with unlit video colors.

## Verifications

Actions and timing: pure unit tests. NullEngine: geometry/aspect, single camera,
reuse, transition and resize, trackball below video field, scene disposal.
Chrome: video pixels, pause, three views, real clicks projected onto meshes,
hover, real capture from the trackball, commands ignored during capture, and
cleanup of generated textures/meshes/cameras.
The cabinetHarness helper is in tests only and absent from the build.

The real runtime was tested with local ROMs. Screenshots of all three views
were examined in /tmp: straight marquees and game unobstructed by the trackball.
Numeric evidence and the new endurance recipe are recorded separately in
VALIDATION.md. The prototype 01 recipe alone does not certify this new scenery.
Full listening, physical comfort, Safari/120Hz, and full GPU cost remain
distinct from automated checks.

## Delivery Summary

Check 250 tests/27 files, Chrome 29, and preview 3 passed. The real game was
used to verify Credit/Start and capture via meshes, then the three framings.
A specific picking and capture test also passed in the production build,
without dev helper. The new endurance run of the final build completed
600.02s active and 36063 copies, with no JS errors or stuck commands.
Evidence and limits detailed in VALIDATION.md. All five stages are delivered.
