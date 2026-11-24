# Marble Madness — Prototype 02: Cabinet and First Bar

[Specification 03](Marble_Madness_Prototype_03_SPEC.md) then authorizes
exploration, positional audio, and rendering polish.

Scope explicitly authorized by Michel on November 10, 2026: complete
stages 1, 2, 3, 4, and 5 proposed after the technical delivery of prototype 01.
This request supersedes the detailed-cabinet/bar exclusions of prototype 01 and
`AGENTS.md` for this evolution. Prototype 01 arcade invariants remain.

## Deliverables

1. Procedural 3D cabinet: full cabinet body, screen, marquee, panels, coin door,
   speakers, control panel, and trackball. Original project creation,
   without claiming to exactly reproduce the Atari cabinet or using its artwork.
2. Bar view, cabinet view, and frontal gameplay view, smooth transition in seconds.
   Camera without `attachControl` to reserve the trackpad for gameplay.
3. Clickable 3D controls outside capture: credit, P1/P2 Start, coin door, and
   entering gameplay via screen/trackball. Delegation to existing commands.
   Entering gameplay frames toward the screen and requests `PointerLock` in the
   same user gesture. No auto-resume at the end of a transition or focus loss.
4. Consistent materials and lighting: painted metal, bright inserts, cyan/orange
   accents, wood, and warm/cool lighting. Unlit video with preserved colors.
5. First bar room: floor, walls, counter, shelves, decorative bottles,
   stools, table, and sign. Fixed open room for observation; no FPS
   movement, furniture physics, customers, network, or spatial audio.

## Architecture and Resources

One session, one BabylonJS engine, and one video texture. Video is copied
only after actual core drawing. The camera may move during pause without
advancing emulation. A temporary `rAF` animation owns rendering during
the transition; no concurrent permanent loop. Stop on completion, interruption,
view change, visibility change, and disposal. Time in seconds, testable pure
interpolations, scenery resources owned by the scene and reused.

No added dependency, external asset, or external font. Signs use a
once-generated canvas and a system font, never an image extracted from ROM.
Models can be improved later without modifying arcade physics.

## Acceptance

Unit tests for recognized actions/filtering, transition progress, framing, and
cleanup. `NullEngine` for geometry, single resources, and disposal; real
browser for picking, shaders, signs, paused transitions, animated video, colors,
resize, capture, and controls. Verify the real runtime with local ROMs,
record inspected captures and limitations in VALIDATION and HANDOFF. The
10-minute test of prototype 01 does not automatically validate the new scenery.
