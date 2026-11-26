# Assets

## Corrected Tower and Finish Geometry — Captures 16:06–17:47

The procedural pyramidal tower shared by levels 1 and 5 is centered on its
base. The three forts of level 5 have dedicated symmetrical roofs and walls;
their corners follow the **12 units from the arcade survey**, replacing the
8 units found in the Rolling Madness model. The extracted Rolling Madness file
served as a local spatial reference; no new model or texture is shipped. The arch
reuses the procedural builder from level 4.

## Follow-up Refinements (Captures 15:26–15:31)

The corners of the three towers near GOAL are closed procedural volumes
with all faces in gray stone. The beak and feathers of the Rolling Madness
birds are adjusted on copies of the poses; the extracted files
remain intact. Squashed silhouettes are anchored to the ground and widened to restore
visibility. No external texture or new dependency.

## Level 5 Procedural Refinements — November 22, 2026

The five bird pyramids reuse the procedural geometry from level 1.
The beak keeps its four faces from the Rolling Madness mesh, with a separate
matte yellow paint. Bird shattering uses eight procedural fragments
positioned from the core records; `player_expl` is not added
to the library. The three miniature types use their already-extracted final
squashed meshes; the first two poses of the black ball are adapted
by compressing the normal mesh. Neither sound nor physics from Rolling Madness are added.

## Level 5 Local Additions — November 22, 2026

Birds: `bird`, `bird_fast`, `bird_expl`. Miniatures: `blacky_mini`,
`blacky_squashed_mini`, `stick_idle_mini`, `stick_squashed_mini`,
`amoeba_stretch_mini`, `amoeba_squashed_mini`. The decorative clock is the
`catapult.png` subset of the static `lev5.ase.mesh` model, stored
locally as `level5_clock`. Same provenance from Luca Elia's _Rolling Madness 3D_
as the other extracted meshes (non-commercial experimental use; will be replaced
with procedural geometry upon request); files kept in `local-roms/`.

The fallback pattern `lev5_side.PNG` comes from this installer. Normal rendering
now uses a mask derived from the original full image of level 5
provided in the project, to preserve the position of its ellipses. This mask
is also local and excluded from the build. In-game colors come from the
core palette. Neither Rolling Madness physics nor audio are used.

## Actual Inventory Used — November 21, 2026

With the local library loaded, the following Rolling Madness models are
selected by the renderer. Loading a file into the library does not
mean that all of its animations are used.

| Element                 | Rolling Madness Geometry/Poses Used                        | Current Paint                                      |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| Normal marble           | `player`, base pose                                        | Procedural blue/red paint with yellow markings     |
| Dizzy                   | `player_dizzy`                                             | Project paint; procedural stars                    |
| Broken marble and broom | `player_broken`, marble and broom groups                   | Repainted marble; `broom.jpg` reused               |
| Melting                 | Procedural (`createAcidDissolve.ts`, `player_melt` unused) | Project paint + 16 fizz particles                  |
| Black enemy             | `blacky`                                                   | Local model texture                                |
| Amoebas                 | `amoeba_stretch`                                           | Project translucent material                       |
| Catapult                | `catapult`, `catapult_throw`                               | `catapult.png`; axle adjusted in a copy            |
| Hammers                 | `hammer`                                                   | `hammer.png`; poses synchronized to native sprites |
| Level 2 and 3 pipes     | Subsets of imported scenery, kept in local surveys         | Project materials; level 3 vertical duct widened   |

The level 4 vacuums are **entirely procedural**, in accordance with
Michel's choice on November 21. Neither `hoover_on`, nor `hoover_down`, nor their texture
or sound are used. The beak wobble follows the active frames of the
arcade program. Cylinders, worms, arches, paving tiles, walls, flags,
wand, and suction fragments are also created by the project.

`stick_idle`, `stick_bend`, `stick_jump_start`, `stick_jump`, and `player_hoover`
are in the library but are not currently selected.
Rolling Madness sounds and music are not used: game audio comes
from the arcade core. Extracted assets remain local, outside the build.

## Rolling Madness 3D Catapult

The `catapult` and `catapult_throw` models, as well as `catapult.PNG`, come from
the local _Rolling Madness 3D_ (2005) installer by Luca Elia. Attempts to reach
the author have so far gone unanswered; this project is a non-commercial
educational/experimental demo, and any of these models will be promptly replaced
with procedural equivalents upon request. They are added to
`local-roms/rolling-actors.json` for the study scene and the game. The original
license remains in `3D_assets_for_animated_entities/embedded/license.rtf`.

## Remaster Paints and Effects

The blue/red paints with yellow markings in `createMarbleMaterial.ts`, the
ivory/gold wand, and the score/time bitmap banners are generated by
project code, with no image extracted from ROMs. The private geometries for
normal/dizzy/broken marble remain from the local Rolling Madness installer,
under the provenance and limits stated below. They are not
included in public assets. Visibility shaders and the articulated worm
are also procedural, owned by their scene.

## Atari System I Cabinet

Geometry from [Marble Madness arcade game by Gozer](https://embed-3dwarehouse-classic.sketchup.com/model/0a8f07a9-4747-47e3-84c9-9c2b81f99cd5/Marble-Madness-arcade-game),
derived from the `marble.skp` file provided by Michel. The SKP author field lists
Gozer. Its SHA-256 is `4814722d9bd1c81ec48d4a7f77742bb0eec77184a14e39a408b4ac1e379e5620`.
The model is integrated into the game scene under the [3D Warehouse Terms of Use](https://3dwarehouse.sketchup.com/tou)
for combined works. Graphics and trademarks belong to their respective
owners.

- `src/rendering/assets/atariSystem1.json` contains the parts converted from
  SketchUp 2021 via OpenSKP 1.3.0 and glTF. Transforms are applied,
  coordinates are centered in meters, and parts are grouped by
  material or interactive element.
- `cabinet/marquee.webp`, `cabinet/control-panel.webp`, `cabinet/side-art.webp`,
  and `cabinet/rear-vent.webp` come from the Gozer model textures. They are
  converted to WebP. Marquee and control panel UVs are realigned.
- The two spheres, speakers, and interactive zones are built
  in BabylonJS. The blue trim and red right-hand ball follow the variant
  photographed by Michel. The monitor displays the core canvas.

The [Classic Arcade Cabinets plan](https://www.classicarcadecabinets.com/marble-madness.html)
and the [Atari manual](https://r.mprd.se/MAME/manuals/arcade/marble.pdf) provide
references on the cabinet and layout. Render dimensions come
from the SKP. The provided photos serve as finishing references.

## Prototype Asset History

For each addition, document: file, author, original URL, license,
required attribution, and modifications. Verify that the license permits the intended use.
Optimize size, resolution, and formats for the Web; do not bundle large
authoring source files unnecessarily.

The 3D screen stage (mount, bezel, pedestal, decorative buttons, grid)
is original project geometry created in `src/rendering/createScreenStage.ts`.
Colors and materials are defined in code; no external texture, model, font,
or image added. The animated texture comes from the local session's emulation
canvas, not from an exported or shipped ROM asset.

## Prototype02

Cabinet, bar, furniture, and geometric graphics: original project creation,
defined in src/rendering/createCabinet.ts and createBarRoom.ts; shared tools
in decorTools.ts. No external provenance, GLB model, Atari artwork texture,
downloaded font, or ROM-extracted image. Signs are local canvases
generated once with a monospace system font; textures owned
and destroyed by the scene. The game title is text, not reproduced artwork.
Original cabinet style, without claiming to be an exact replica of the Atari cabinet.
No new global license imposed on dependencies; existing notices preserved.

## Prototype 03

Side artwork, ball rings, and wood, brushed metal, and paint grains
are project creations. The `createCabinet.ts` and `decorTools.ts` modules
produce them at scene initialization. No external image or model file is used.

The tiling texture in `terrain.html` is generated in memory by
`src/rendering/createTerrainStudy.ts` for prototype 04. It is
original to the project and does not come from Atari graphics.

## Intermediate Race Pipes

The study accepts a local copy of the survey with the pipe faces from
`lev2.ase.mesh`, from [Rolling Madness 3D](https://www.lucaelia.com/games.php)
by Luca Elia (2005). The installer includes its own license. The
imported triangles are snapped to arcade tiles and their two materials
are created in BabylonJS. The survey remains in `local-roms/`.

The Y now retains the full closed surface of the local model: hoods,
lips, inner/outer skins, and joints are no longer split apart.
Local subdivision smooths the branches while protecting thin lips;
the junction is lowered and hoods are compacted in memory, without changing
the extracted file. Normals are recomputed on coincident vertices.
No new external texture; paint derived from the live core palette.

## Rolling Madness 3D Animated Actors

The full extraction of the installer provided by Michel is kept
locally in `3D_assets_for_animated_entities/`, at the project root.
Luca Elia's license is in `embedded/license.rtf` inside that folder.
It requires permission to modify or redistribute the software.

`local-roms/rolling-actors.json` is produced by
`scripts/extract-rolling-actors.mjs` from the local installer provided
by Michel. Models and textures are by Luca Elia, Rolling Madness 3D
(2005), under the license included in the installer. They remain in
the local folder excluded from the repository and build.

The library contains poses for `stick_idle`, `stick_bend`,
`stick_jump_start`, `stick_jump`, `blacky`, `player_dizzy`,
`player_broken`, and `player_melt`. The broom and shards are two
groups of the same `player_broken` model. Complementary stars and tongue
are geometries created in the project.

## Remaster Audio (`public/assets/audio/`)

- `opm-pokey.wasm` is built from `native/audio/opm_pokey.cpp`. That file holds
  a clean-room POKEY and links Aaron Giles's **ymfm** for the YM2151.
  - ymfm is BSD-3-Clause, pinned to commit
    `81aec25ccbb98f4873a255f7551ac4dadac59b4a` and vendored under
    `native/audio/third_party/ymfm/` together with its `LICENSE`.
- `rom-sfx.json` holds YM2151/POKEY register-write streams. They were captured
  by running the original Marble Madness 6502 sound program (136033.421/.422)
  from the user's local ROMs with `scripts/rom-sfx/extract_rom_sfx.py`.
  - The file contains no ROM bytes or code, only the chip register values the
    program outputs plus driver scheduling metadata.
  - See `docs/ROM_SFX.md`.
