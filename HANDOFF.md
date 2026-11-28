# Handoff

## Remaster CI Fixes, Level 6 Ice Anti-Softlock, Level 4 ROM Respawns/Pistons & Magic Wand — November 28, 2026

- **GitHub Actions CI Fixes** (`tests/browser/remaster.spec.ts`, `src/remaster/remaster.ts`, `src/remaster/audio/createRemasterAudio.ts`):
  - Added a CI-safe synthetic 12×12 terrain Playwright test via `page.route` in `remaster.spec.ts` and gated the 6 `local-roms/` Playwright tests with `requireLocalTerrain()` so they skip cleanly in CI when `local-roms/` is absent.
  - Guarded all `'/__local-roms/'` string literals in `remaster.ts` and `createRemasterAudio.ts` behind `import.meta.env.DEV` so Vite tree-shakes them out of `dist/`, restoring green `tests/preview/production.spec.ts` (3/3 passed).
- **Level 6 Cyan Ice Anti-Softlock & Pyramid Restitution** (`src/remaster/engine/remasterSimulation.ts`, `src/remaster/physics/createHavokBackend.ts`, `src/remaster/engine/remasterSimulation.test.ts`):
  - Added a gentle `28%` unstuck nudge on `onRomIce` only when stalled (`vSpeed < 0.75 c/s`), preserving authentic `0%` steering on ice at normal speed (`>= 0.75 c/s`) while preventing permanent softlocks if a pyramid collision cancels velocity.
  - Set `friction: 0.0`, `staticFriction: 0.0`, and `restitutionCombine: PhysicsMaterialCombineMode.MAXIMUM` on Level 6 `level6-pyramid-*` colliders so marbles deflect cleanly off pyramids on ice.
- **Level 4 Authentic 68010 ROM Respawn Table (`0x1f568`), Piston Upward Launch & Arcade Magic Wand (`+10 SEC`)**:
  - Decoded all **159 native Level 4 respawn checkpoints** from `roms/marble.zip` (`marble2/136033.401` + `136033.402`, pointer table `0x1ef1a[3]` → `0x1f568`) into `LEVEL4_ROM_RESPAWN_POINTS` (`src/remaster/level4/level4RomData.ts`), added `isNearLevel4PistonOrHammer` and `findNearestLevel4Respawn` (`src/remaster/level4/level4Mechanics.ts`), and snapped Level 4 `lastSafe` strictly to safe ROM checkpoints (zero respawns on pistons, hammers, or vacuums).
  - Upgraded `evaluateLevel4PistonBump` (`level4Mechanics.ts`, `remasterSimulation.ts`) to launch the marble upward (`vy = 12.2` center / `8.4` off-center / `4.2` side graze) when chrome pistons pop up underneath it, matching the original arcade.
  - Implemented the classic arcade **Magic Wand (`+10 SEC`)** (`remasterSimulation.ts`, `createRemasterScene.ts`, `createMagicWand.ts`, `createRemasterAudio.ts`): triggers once per course when `!timerFrozen && playElapsed >= 6 && remainingTime <= 15 && remainingTime > 2`, reuses `createMagicWand.ts` (black/ivory/gold wand waving diagonally with `createDizzyStars` tip sparkles) and the authentic 54-frame marble squash-and-stretch (`scaling.y` `0.75` / `1.5`), plays a sparkling chime arpeggio, displays the `+10 SEC` floating arcade badge, and grants `+10` seconds.
- **Validation**: `npm run format && npm run check` (847/847 Vitest tests, ≥ 90% V8 coverage, ESLint, strict TS, Vite build), `npm run test:preview` (3/3 passed), `npx playwright test tests/browser/remaster.spec.ts` (7/7 passed), `npm run build:remaster`.

## Remaster Mobile/Tablet Support, TFMX Amiga Tracker Music, Orbital Rainbow Scroller & Level 5 Polish — November 28, 2026

- **Mobile & Tablet Playability (iPhone, Android, iPad)** (`remasterTouch.ts`, `remasterTouch.test.ts`, `remaster.html`, `remaster.css`, `remaster.ts`):
  - Full-screen Pointer Events touch trackball scaled by `Ball Sensitivity`, **dual left + right floating `BOOST` buttons** (ambidextrous for right- and left-handed players) + 2nd-finger canvas boost, tap to skip flyover/post-goal, swipe left/right to switch 3D Attract modes, mobile Hall of Fame initials bar, `100dvh` + safe areas, collapsible `⚙ Controls` drawer, and portrait-responsive `FOVMODE_HORIZONTAL_FIXED` framing across Attract / Amiga / Victory 3D scenes.
- **Amiga 3D Demoscene & Attract Mode Polish** (`createAmigaDemo3DScene.ts`, `createAttract3DScene.ts`, `amigaScrollTexts.ts`, `remasterAttract.ts`, `remasterAttract.test.ts`):
  - Transformed the Amiga 1986 tribute scroller into an **equatorial 3D orbital sinusoidal cylinder ring** (`amigaOrbital` GLSL shader with animated rainbow copper gradient and depth dimming on the back arc) orbiting the raised central Vectorballs, raised `MARBYLON MADNESS 3D` logo (`y = 3.85`) and `flyover`/`aiDemo` marquee (`y = 4.70`).
  - Manual `←` / `→` (and mobile swipe) now cleanly restarts `flyover` from `0` and advances/wraps Courses `1 → 2 → 3 → 4 → 5 → 6 → 1` just like the automatic cycle.
- **Stereo TFMX / Amiga Tracker Placeholder Soundtrack** (`createAmigaTrackerMusic.ts`, `createRemasterAudio.ts`):
  - 3 original WebAudio themes (Turrican-inspired 130 BPM 64-step `demo`, cosmic 122 BPM `showcase`, uplifting 128 BPM `victory`) with stereo dotted-eighth echo, compressor, detuned resonant synth-brass lead, string pad, filtered sub-bass, and drums — cleanly isolated for Peter Salomonsen's future WebAssembly Music replacement.
- **Gameplay Fixes** (`remasterSimulation.ts`, `remasterSimulation.test.ts`, `createHavokBackend.ts`):
  - Enforced strict flat-tile + flat-neighborhood `lastSafe` checkpoints across **all 6 courses** (preventing sloped respawns before bridges) with regression unit test.
  - Fixed Level 5 white ramp crease stalling by checking `approachingRamp` (`0.48` cells ahead) in the crest clamp, balancing inverted gravity (`2.15 × |g|` standard slopes / `2.95 × |g|` steep white ramps), and preventing sticky `Space` boost via `event.preventDefault()` + `window.blur` cleanup.

## Remaster 100% 3D GLSL Attract Mode (`Marbylon Madness 3D`), 3D Final Victory & Auto-Advance — November 27, 2026

- **Committed, pushed & deployed Level 4 2P start-beam rail steering fix**: `2b679c1` on `origin/Remaster`, `044f1a2` on `origin/gh-pages`.
- **100% English UI, Regular Timer Default + `T` Toggle & Automatic Course Progression**:
  - Renamed `"Nervosité"` → `"Ball Sensitivity"` and translated all UI labels/aria attributes to English (`remaster.html`).
  - Restored regular countdown timer by default (`timerFrozen = false`) and added visible **`Timer: Regular (T)` / `Timer: Infinite ∞ (T)`** toolbar button (`#btn-timer` + `KeyT`).
  - Finishing Levels 1–5 now automatically chains into the next course (`1 → 2 → 3 → 4 → 5 → 6`) after `3.2 s` (`Space` skips the wait), carrying P1/P2 scores forward without needing `N`; finishing Level 6 opens the 3D Final Victory scene.
- **3-Mode 100% 3D WebGL + Custom GLSL Attract Mode (`Marbylon Madness 3D`)** (`createAttract3DScene.ts`, `remasterAttract.ts`, `remasterAttract.test.ts`):
  - **Mode 1 (`flyover`)**: real 3D BabylonJS levels scrolling live behind a floating 3D GLSL holographic title & raycasted 3D `1 PLAYER` / `2 PLAYERS` buttons (`autoClear = false` foreground compositing).
  - **Mode 2 (`aiDemo`)**: real-time Havok 3D AI autopilot (`computeAttractAiInput`) playing the live course while cycling 3D cameras (`Arcade → Follow → Chase → Chase High → Overhead`).
  - **Mode 3 (`amigaDemo`)** (`createAmigaDemo3DScene.ts`): 100% 3D GLSL **Amiga 500 Demoscene homage** — 7 animated horizontal Copper bars + Boing-Ball sinusoidal checkerboard floor + periodic CRT slice glitches, 48 thin-instanced morphing 3D Vectorballs (`Cube → Torus → Double Helix → Sphere`), old-school 4-step flat-shaded + wireframe sinusoidally deformed 3D polyhedron, classic vertex-waved sinusoidal horizontal scrolltext, and optional CRT scanlines (ON by default, toggled via **`S`** / `#btn-scanlines`).
  - **Mode 4 (`showcase`)**: 100% 3D GLSL retro-arcade tribute (`attractGrid` neon horizon grid, `attractFresnel` energy rings, rotating 3-tier pedestal, orbiting Blue/Red/Black marbles, Hall of Fame, and full homage credits for Atari Games 1984 + Michel Buffa, Peter Salomonsen, Luca Elia, Aaron Giles).
  - Cycles automatically across all 4 modes & all 6 courses (`←` / `→` switches attract mode manually).
- **100% 3D WebGL + Custom GLSL Final Victory Scene (`createVictory3DScene.ts`)**:
  - Launches on Level 6 `GOAL` (previewable anytime via **`Shift+V`**): `victoryAurora` starburst sky shader, `victoryGoldOrb` iridescent gold Trophy Marble on a 3-tier obsidian/gold podium with 3 spinning rings, 96 thin-instanced 3D confetti shards, 3D holographic score/rank/keyboard-initials entry & scrolling tribute credits, and raycasted 3D `PLAY AGAIN` / `TITLE 3D` buttons.
- **Marble Cast Shadows & Light 3D Motion Trail (`createRemasterScene.ts`, `createMarbleTrail.ts`)**:
  - Registered P1, P2, and Black Marble meshes as live `ShadowGenerator` casters on the `key` directional sun light with `setPracticeShadowRefresh(scene, 'every-frame')`, restoring crisp cast shadows matching the `main` branch 3D view.
  - Added `createMarbleTrail` (single-draw-call `thinInstance` pool of 24 soft emissive orbs per player, zero per-frame allocations) emitting subtle speed-scaled motion sparkles behind moving marbles.
- **Polish, Authentic 1984 Atari Font, Sensitivity & End-of-Game Initials**:
  - Decoded the exact 1984 Atari System 1 8×8 alphanumeric bitmap font (`136032.104.f5` from `roms/atarisy1.zip`) into `src/remaster/rendering/arcadeBitmapFont.ts` and applied it across all 3D attract, Amiga, and victory scenes.
  - Added a gently bouncing sinusoidal tribute scroller directly under the waving `MARBYLON MADNESS 3D` logo in `createAmigaDemo3DScene.ts` celebrating the 1986 Amiga port and thanking **Larry Reed, Will Harvey & Electronic Arts**.
  - Extracted both Amiga scrolltexts and metrics into an editable module (`src/remaster/engine/amigaScrollTexts.ts`) with a sliding-window Canvas2D strip (zero clipping) and automatic `amigaDemo` stage duration scaling (`computeAmigaDemoDurationSeconds`).
  - Updated `README.md` for `Marbylon Madness 3D`, the 4-stage 3D Attract Mode, 3D Victory/Hall of Fame, controls, and WebAssembly Music credits for Peter Salomonsen.
  - Wired the `Ball Sensitivity` slider (`0.25×–2.00×`, default `0.80×`) to directly scale trackpad gain, input acceleration, and max speed in `remaster.ts` & `remasterSimulation.ts`.
  - Fixed marble trail visibility by setting `proto.alwaysSelectAsActiveMesh = true` on the `thinInstance` pool in `createMarbleTrail.ts` (preventing BabylonJS frustum culling away from origin) and raising particle height/diameter.
  - Added global Retina-crisp CRT scanlines overlay (`#scanlines-overlay`, ON by default, toggled anytime via **`S`** or **`Scanlines: ON (S)`**).
  - Removed explicit `"AMIGA DEMOSCENE"` label text from `createAmigaDemo3DScene.ts` and removed technical engine/chip strings from the course intro banner (`remaster.ts`).
  - Added **`Q`** shortcut (`Title (Q)`) to stop the current game and return to Attract Mode anytime.
  - Enabled 3D Hall of Fame 3-letter initials entry on **`GAME OVER`** as well as Level 6 **`CONGRATULATIONS!`** (`createVictory3DScene.ts`).
  - Added mobile & tablet support (`remasterTouch.ts`, `remasterTouch.test.ts`, `remaster.html`, `remaster.css`, `remaster.ts`, and portrait-responsive `fovMode` in `createAttract3DScene.ts` / `createAmigaDemo3DScene.ts` / `createVictory3DScene.ts`): full-screen Pointer Events touch-trackball steering scaled by `Ball Sensitivity`, multi-touch turbo boost (dedicated floating `BOOST` button + 2nd finger anywhere on the canvas), swipe left/right to switch 3D Attract modes, tap to skip flyover/post-goal, mobile Hall of Fame initials bar, `100dvh` + iPhone safe areas, and collapsible `⚙ Controls` drawer on screens `≤ 960px` or `pointer: coarse`.
  - Verification: `npm run format && npm run check && npx playwright test tests/browser/remaster.spec.ts` (**6/6 passed**).
- **Next action**: Michel visual review on `http://127.0.0.1:5173/remaster.html` (`←`/`→` in Attract Mode to inspect all 4 modes including the Amiga 1986 tribute scroller, `S` for scanlines, `Q` to quit to title, `Shift+V` for Victory), then commit/push/deploy once approved.

## Remaster Level 6 (Ultimate Race) ROM decode, simulation & 3D integration — November 27, 2026

- **Committed & deployed Level 5**: pushed `93e27fd` to `origin/Remaster` and deployed standalone `dist-remaster/` (Levels 1–5) to `origin/gh-pages` (`b09d740`, `https://micbuffa.github.io/MM-experiments/remaster/`).
- **Decoded & implemented Level 6 (_Ultimate Race_) from 68010 ROM (`roms/marble.zip`, course descriptor `0x2e790`)**:
  - **Spawns & GOAL**: `P1 (11.5, 16.5, h = 16384)`, `P2 (11.5, 22.5, h = 16384)`, `GOAL` at `level6Goal` (`88..92, 88..98`, `h = 16352`), `timerSeconds: 65`, `level6OpeningScroll = -16168`, 6 ROM ice zones (`0x32..0x37`, already decoded in `romSurfaceZones.ts`), 2 golden wedge tunnels, and 4 hexagonal pyramids on the cyan ice diamond.
  - **Exact 68010 ROM Surface Friction Modes (`0x12744..0x127EA`, `0x2ae90..0x2b048`)** in `level6RomData.ts`, `level6Mechanics.ts`, and `createHavokBackend.ts`:
    - **Sand / Amber (`0x2d`, `0x2e` — Mode 2, `4×` drag)**: sandy damping (`2.1`) on the flat `H = 16384` start amber plateau (`10..29, 13..26`, excluding the elevated white start mound `20..25, 17..21` and ridge `22..23, 22..26` matching ROM `0x2ae90`'s height check, with `maxClimbSlope = 1.8` on Level 6) and strip behind GOAL (`84..85, 90..92`).
    - **Ribbed Metallic Washboard (`0x2f`, `0x30`, `0x31` — Mode 3, `X: 5×, Z: 1×`)**: anisotropic damping strongly resisting cross-groove `X` motion while keeping along-groove `Z` motion smooth on both ribbed worm slopes (`36..45, 45..64` and `48..66, 45..53`) and the end strip (`84..85, 99..104`).
    - **Shimmering Peach (`0x38`, `0x39`, `0x3a` — Mode 4, `speed += f/4`)**: hyper-slick low damping (`0.06`) with gentle self-accelerating glide on both amoeba plateaus (`44..63, 33..46` and `46..57, 55..68`) and the GOAL bridge (`84..87, 88..89`).
    - **Cyan Ice (`0x32..0x37` — Mode `0xFF`)**: zero friction, zero steering (`romSurfaceZones.ts`).
  - **2×2 Golden Square Pit → Golden Wedge Tunnels Teleport (`0x25`, ROM `0x2a87a`)**: dropping into `(22..23, 31..32, h <= 16379)` (1 arcade unit below the `16380` sunken ledge, eliminating pit-wall bounce) plays `0x35` pipe SFX and randomly shoots the marble out of either golden wedge tunnel `(30.8, 32.0)` or `(30.8, 40.0)` along `+X` (`vx = +8.5`).
  - **Exact 68010 ROM Respawn Table (`0x1f98c`, 144 checkpoints), Shatter-Safe `lastSafe`, Dev Timer Freeze (`KeyT`) & Start-Mound Anti-Takeoff**: extracted all 144 native Level 6 checkpoints into `LEVEL6_ROM_RESPAWN_POINTS` (`findNearestLevel6Respawn`) and guarded `lastSafe` so hard/shattering landings NEVER overwrite the upper-tier respawn point; added `setTimerFrozen` (`KeyT` toggle, paused by default with `∞` HUD indicator during dev playtesting); extended the crest anti-takeoff clamp in `createHavokBackend.ts` to Level 6 so climbing the white start mound never ski-jumps.
  - **4-Phase Disappearing-Block Maze (`0x24e2a..0x24e42`, `41 frames` at `60 Hz` = `0.6833 s`)**: partitioned Level 6 cleanly into static pre-maze terrain and the self-contained maze region (`x >= 76 && z >= 78`, including the `77..82, 79..84` entry deck, `102..106, 104..109` landing, gable ramps `94..101, 104..106`, and GOAL) so every static-to-dynamic transition is 100% welded with zero phantom seam cliffs and zero invisible holes; pre-built 4 `PhysicsShapeMesh` floor/cliff pairs swapped via `body.shape = shapes[phase]` on a single STATIC floor body + STATIC cliff body (guaranteed immediate Havok broadphase update, 60 FPS); switched both `applyPlayerForce` uphill-tangent assist and `step()` crest clamp to sample `activeHeightLayer` (`level6MazePhaseLayers[activeLevel6Phase]`) so the dynamic gable ramp `(98..101, 104..106)` climbs cleanly; attached static Havok colliders to the 4 `level6-pyramid-*` hexagonal pyramids on the cyan ice diamond; lowered `shatterDropWorldY` to `2.85` so `32`-arcade-unit (`3.27` world unit) drops shatter like the original ROM; softened collision-only bump amplitude (`45%`) on the two narrow double-angle walkways (`67..68, 59..62` & `59..62, 69..70`), animated Playfield Bank 3's 7 light-brown/peach shimmering swatches at `10 Hz` in `createRemasterScene.ts`, and tuned sand damping (`1.55`) + Level 6 climb `uphillScale` (`1.45`) for smooth start-mound climbing without Space boost.
  - **1 Black Marble (`0x2275e`, graph `0x2283a`)**: guards the static entry platform `(79..81, 81..83)` right before the disappearing-block maze; falling onto a lower plateau (`drop >= shatterDropWorldY`) now shatters any Black Marble immediately (with black shard burst, shatter SFX, `+1000` if bumped, and permanent elimination).
  - **4 Green Worms (`0x225e0..0x22600`, paths `0x226be..0x22704`)**: 2 on the right ribbed slope (`x = 39..42, z = 48..57`) and 2 on the left ribbed slope (`x = 57..64, z = 48..52`).
  - **4 Acid Amoeba Pools (`0x23dfa..0x23e1c`, loops `0x240e6..0x24174`)**: 2 on the left peach plateau (`x = 47..53, z = 37..43`) and 2 on the right peach plateau (`x = 50..56, z = 58..66`), rendered with 3D translucent pseudopod rigs and triggering `melting` + `acidDissolve` SFX (`0x5e`) on contact.
  - **Music & UI**: wired `10 Level 6.vgz` (`level6-ultimate.vgz`) and `11 Congratulations.vgz` (`congratulations.vgz` on Level 6 GOAL) in `createRemasterAudio.ts` & `build-remaster.mjs`; added **`6 · Ultimate`** to `remaster.html` & `remaster.ts` (`KeyN` advances `1 → 2 → 3 → 4 → 5 → 6`).
- **New modules**: `src/remaster/level6/level6RomData.ts`, `src/remaster/level6/level6Mechanics.ts`, `src/remaster/level6/level6Mechanics.test.ts` (added to `vite.config.ts` ≥ 90% V8 coverage scope).
- **Level 4 2P start-beam rail control (`remasterSimulation.ts`)**: added gentle rail-projected steering (`42%` of normal input acceleration along the beam axis, full 2D at the `(22, 23)` intersection) on Level 4's crossing start beams so a 2P mid-beam collision never stalls a marble permanently on the ice rail.
- **Validation**: `npm run format && npm run check` (Prettier, ESLint, strict TypeScript, Vitest + ≥ 90% V8 coverage, Vite build) and `npx playwright test tests/browser/remaster.spec.ts` (**6/6 passed**); human playtest validated by Michel on `http://127.0.0.1:5173/remaster.html` (`6 · Ultimate`).
- **Next action**: commit & push Level 6 to `origin/Remaster`, build `dist-remaster/`, and deploy Levels 1–6 to `origin/gh-pages` (`https://micbuffa.github.io/MM-experiments/remaster/`).

## Remaster Level 5 (Silly Race) ROM decode, simulation & 3D integration — November 27, 2026

- **Committed & deployed Levels 3 & 4**: pushed `74cea33` to `origin/Remaster` and deployed standalone `dist-remaster/` to `origin/gh-pages` (`833bca7`, `https://micbuffa.github.io/MM-experiments/remaster/`).
- **Decoded & implemented Level 5 (_Silly Race_) from 68010 ROM (`roms/marble.zip`, course descriptor `0x2de1e`)**:
  - **Uphill course (`direction = -1`) & inverted ramp gravity**: spawns at bottom-right `P1 (125.5, 124.5)` / `P2 (123.5, 126.5)` (`h = 16168`), climbing upward to `level5Goal` (`x: 25..29, z: 24..34`, Escher finish, `timerSeconds: 70`, `level5OpeningScroll = -15212`, `level5FinishScroll = -16152`). Exact ramp-tangent inverted gravity (`-3.8 × g_t × dt` in `createHavokBackend.ts`, gated on `PhysicsMotionType.DYNAMIC`), cardinal + velocity rim-contact ramp-entry hook (`0.44` cells) and `maxClimbSlope = 1.8` tangent push assist for steep `49°–60°` ramps, plus a crest anti-takeoff clamp (`slopeVyAhead <= 0.05`) keep the marble engaging and climbing every ramp smoothly without Space boost and glued to flat tiles at every crest.
  - **Strict flat-tile `lastSafe` checkpoints on Level 5 (`remasterSimulation.ts`)**: requires the current cell's 4 corners (`max - min < 0.05`) and `±0.5`-cell neighbor probes (`flatTol = 0.12`) to be genuinely flat so respawns (including after the red Y-pipe) always land on flat tiles.
  - **9 Squashable Miniature Sillies (`0x19024..0x19094`, `0x19346`)**: 3 mini Black Marbles, 3 mini Green Worms, 3 mini Acid Amoebas spawning on safe `H = 16238` cells inside the Silly Arena (`90.2..103.8 × 91.2..104.8`), walking cardinally and bouncing off interior `H = 16244` blocks (`isArenaFloor`). Grounded marble contact squashes them flat (`state = 2`), adds **`+3 SEC`** (`+3 SEC` floating badge via `createPracticeCatchUpLabel(..., '+3')`) + **`+500` pts**, plays the exact 68010 ROM squash SFX per enemy type (**`0x5a`** `sfx-mini-squash-worm.vgm` for type 8 worm, **`0x5b`** `sfx-mini-squash-black.vgm` for type 7 black, **`0x5c`** `sfx-mini-squash-acid.vgm` for type 9 acid), and fades them after `3.0 s`.
  - **Red Inverted Curly Y-Pipe (`level5-clock`, ROM `0x2a738`)**: entry at `(87.6..90.4, 88.6..91.2, h <= 16272)` hides the marble, plays `pipeEnter` SFX, shakes the red pipe via `updateLevel5PipeAnimation()` over `0.85 s`, and ejects (`vz = -5.5`) randomly 50/50 out of the two upper outlets `(91.5, 86.0)` or `(85.5, 86.0)` (`h = 16308`), updating `lastSafe` at the flat exit.
  - **Escher Arch Havok Opening, Bidirectional Zero-Jump `?` Teleport & Visual Depth Shift (`level5FinishDepth`)**: stripped the Escher arch cliff walls (`Z = 21/24, X = 29..35`, `X = 35, Z = 21..24`, and the lower `?` seam wall `X = 29, Z = 15..18`) and added static `H = 16368` floors (`remaster-level5-escher-passage` & `remaster-level5-escher-lower-seam`) in `createHavokBackend.ts`; implemented bidirectional exact isometric ray shift `(+6, +6, +48)` / `(-6, -6, -48)` between lower `?` seam (`27.0..28.7, 15.0..18.0`) and upper bridge (`34.85..35.6, 21.0..24.0`) with clean non-overlapping hysteresis, elevation-guarded `dest.y` (never snapping up onto the overhanging `H = 16416` platform on return), and zero camera/marble jump; applied `level5FinishDepth(ax, az, ah, arcadeView)` visual shift in `createRemasterScene.ts` so the floating `H = 16416` bridge deck never masks or slices the marble in Arcade view.
  - **10 Flying Birds across 5 ROM lanes (`0x19a40..0x19bd4`, `0x244f6`)**: `(57.5, 63)`, `(55.5, 63)`, `(49.5, 58)`, `(47.5, 58)`, `(41.5, 58)` flying `-Z` across the pyramid field with alternating normal/fast speeds, spiky yellow 3D wall-collision spark flashes & explosions (`createLevel5Actors`), and special **`birdDead`** state (`36/30 = 1.2 s`, ROM `0x0b`) using `createBirdDeath()` 8-fragment spiral animation without broom.
  - **Music & UI**: wired `09 Level 5.vgz` (`level5-silly.vgz`) in `createRemasterAudio.ts` & `build-remaster.mjs`, added **`5 · Silly`** to `remaster.html` & `remaster.ts` (`KeyN` advances `1 → 2 → 3 → 4 → 5`).
- **New modules**: `src/remaster/level5/level5RomData.ts`, `src/remaster/level5/level5Mechanics.ts`, `src/remaster/level5/level5Mechanics.test.ts` (added to `vite.config.ts` ≥ 90% V8 coverage scope).
- **Validation**:
  - `node scripts/extract-rom-sfx.mjs --export && npm run format && npm run check`: **OK** (exported `0x5a`/`0x5b`/`0x5c` mini-squash SFX, ≥ 90% V8 coverage, lint, typecheck, Vite build).
  - `npx playwright test tests/browser/remaster.spec.ts --reporter=list`: **5/5 OK** (Levels 1–5 in Chromium WebGL + Havok with zero console errors).
- **Next action**: human playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`5 · Silly`) to verify the flat-tile respawns in the pipe zone, the 3 ROM mini-enemy squash SFX, and the Escher bridge visibility before committing/deploying Level 5.

## Remaster Level 4 ROM piston state machine, Black Marble void-edge guard & vacuum respawn safety — November 27, 2026

- **Exact 68010 ROM Level 4 piston state machine (`0x18476..0x18550`, `0x186ac..0x187c0`)** in `src/remaster/level4/level4RomData.ts` & `level4Mechanics.ts`:
  - Implemented the exact 30 Hz tick countdown (`LEVEL4_PISTON_INIT_DELAYS_BANKS_0_1` from `0x242c6`/`0x242de`, `100`-tick reload from `0x242f6`, 4 random Bank-2 patterns `0x243e6[rand % 4]` rolled via `0x1871a` on zone 4/5 trigger, and 13-tick `0x21342` pop-up sequence = `0.10 s` rise, `0.233 s` hold, `0.10 s` drop).
- **Black Marble never falls off by itself** in `src/remaster/level4/level4RomData.ts` & `src/remaster/engine/remasterSimulation.ts`:
  - Added `LEVEL4_BLACK_MARBLE` (ROM graph `0x2280a`, 7 nodes) wired into `stepEnemyMarble()` / `bumpEnemyMarble()`.
  - Added a universal solid-terrain void-edge guard for all unbumped Black Marbles (`enemy.lastHitTimer <= 0`): probes `0.95` cells around and `0.28 s` ahead, pulls strongly inward toward `patrolCenter` near any void lip, and restores at `home` if it ever falls without a player bump (while bumped Black Marbles fall off, award `+1000`, and stay permanently eliminated).
- **Vacuum respawn safety** in `src/remaster/level4/level4Mechanics.ts` & `src/remaster/engine/remasterSimulation.ts`:
  - Added `isNearLevel4Vacuum()` (`radius = 4.8` cells) to prevent `lastSafe` checkpoints from ever being saved inside a vacuum's hazard zone even while retracted.
  - Added a `1.6 s` post-respawn vacuum immunity timer (`respawnGraceTimer`) when transitioning `'respawning' -> 'active'` so players always have time to regain control.
- **Level 4 start beams & full braking authority** in `src/remaster/engine/remasterSimulation.ts` & `src/remaster/physics/createHavokBackend.ts`:
  - Centered P1 (`z = 23`) and P2 (`x = 22`) frictionless start beams on their rail axis (zero lateral Havok triangle-seam drift), fixed P1 `startLiftTimer` direction (`+X`), capped downhill beam speed to `10.8` cells/s, and removed speed-limit throttling on braking / counter-spin (`fx * vx + fz * vz < 0`).
- **Exact 68010 ROM Level 4 hammers (`0x1d40c..0x1d742`, `0x1ded8`, `0x22346`, `0x2a9a2..0x2ab74`)** in `src/remaster/level4/level4RomData.ts`, `level4Mechanics.ts` & `remasterSimulation.ts`:
  - Implemented all 4 random ROM timing patterns (`rand(4)` at `0x12e50`, 30 Hz ticks, 15 frames × 2 ticks/frame = `1.0 s` swing), exact per-frame ROM hitboxes (`0x22346`, protruding up to `1.0` cell), and subtle radial bump (`5.2` cells/s) + **`2.0 s` dizzy (`60` ticks = `0x3c`) + SFX `0x39`**.
- **Validation**:
  - `npm run format && npm run check`: **OK** (124 test files / 816 Vitest tests, ≥ 90% V8 coverage, lint, typecheck, Vite build).
  - `npx playwright test tests/browser/remaster.spec.ts --reporter=list`: **4/4 OK**.
- **Next action**: human playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`4 · Aerial`) to validate the 30 Hz ROM pistons, Black Marble presence at the catapult deck, and vacuum respawn comfort.

## Remaster Level 4 (Aerial Race) ROM decode, simulation & 3D integration — November 27, 2026

- **Decoded Level 4 directly from 68010 ROM (`roms/marble.zip`, course descriptor `0x2d648`)**:
  - **Spawns & GOAL**: P1 at `(10.5, 23.5, 16384)`, P2 at `(22.5, 9.5, 16384)` on the crossing frictionless start beams (ROM tags `0x17`/`0x18`, already handled by `romSurfaceZones.ts`), `GOAL` at `level4Goal` (`113..117, 104..114`, `h = 16228`), `timerSeconds: 70`, `level4OpeningScroll = -16152`.
  - **1 Black Marble (`0x22746`, `graph = 0x2280a`)**: spawns at `(67.5, 53.5, 16300)` patrolling `(62..67, 49..53)` above the piston corridor (0 worms, 0 acid).
  - **6 Yellow Vacuum Cleaners (`0x1d7d0..0x1d83e`)**: cyclic extension (`0..1`) + active mouth tremor synced to `setLevel4VacuumExtensions()`, radial suction pull within `4.6` cells, capture into `suctioned` (`0.95 s`, driving `createMarbleSuction()` VFX + `suction` SFX) followed by respawn.
  - **36 Chrome Pistons (`0x24406 / 0x2442a / 0x2444e`)**: 3 banks of 3×4 pistons (`69..71 × 55..58`, `69..71 × 63..66`, `76..78 × 74..77`) synced to `setLevel4Pistons()` with knockback on raised pistons (`step >= 3`).
  - **Red Catapult (`0x1db6a`, handler `0x29e22`)**: cup at `(63, 70)` launching the marble up and back along `-Z` (`vy = 16.8, vz = -12.0`) with shatter immunity during the arc and 20-frame arm animation synced to `setLevel4CatapultFrame()`.
  - **4 Wooden Swinging Hammers (`x = 105`, `z ∈ {102.5, 104.5, 106.5, 108.5}`)**: 15-frame ROM swing sequence synced to `setLevel4HammerFrames()` with sideways strike knockback.
  - **Music & UI**: wired `07 Level 4-1.vgz` (`level4-aerial.vgz`) in `createRemasterAudio.ts` & `build-remaster.mjs`, added **`4 · Aerial`** to `remaster.html` & `remaster.ts` (`KeyN` advances `1 → 2 → 3 → 4`).
- **New modules**: `src/remaster/level4/level4RomData.ts`, `src/remaster/level4/level4Mechanics.ts`, `src/remaster/level4/level4Mechanics.test.ts` (added to `vite.config.ts` ≥ 90% V8 coverage scope).
- **Validation**:
  - `npm run format && npm run check`: **OK** (124 test files / 813 Vitest tests, ≥ 90% V8 coverage, lint, typecheck, Vite build).
  - `npx playwright test tests/browser/remaster.spec.ts --reporter=list`: **4/4 OK** (Levels 1–4 in Chromium WebGL + Havok with zero console errors).
- **Next action**: human playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`4 · Aerial`) to verify the start beams, vacuums, Black Marble, pistons, catapult launch arc, hammers, and camera scrolling.

## Remaster Level 3 (Intermediate Race) ROM decode, simulation & 3D integration — November 27, 2026

- **Decoded Level 3 directly from 68010 ROM (`roms/marble.zip`, course descriptor `0x2cd9e`)**:
  - **Spawns & GOAL**: P1 at `(22.5, 9.5, 16408)`, P2 at `(8.5, 23.5, 16408)` (opening twin towers), `GOAL` at `level3Goal` (`92..95, 101..110`, height `16100`), `timerSeconds: 60`, 0 Black Marbles, **2 Green Worms** (`0x225ba` / `LEVEL3_WORM_SPAWNS` patrolling `(44, 33..37)` and `(32..36, 43..45)` with `level3OpeningScroll` and `lastWormViewRow` starting at `wormWorld.viewRow`).
  - **7 Acid Amoeba pools (`0x23daa` + `0x23d62`)**: 1 upper-terrace 4-point loop (`0x23e22`) + 6 staggered lower-terrace pools patrolling the exact 18-point closed loop (`0x23e36..0x23fb2`).
  - **Acid dissolve (`0x1768c..0x176a2`)**: ROM animation state `9` (`melting`, `1.15 s` driven through `createAcidDissolve()` 3D fizz/shrink VFX) + exported POKEY **SFX `0x5e`** (`sfx-acid-dissolve.vgm`), followed by safe respawn at `lastSafe` (excluding wave & amoeba radius).
  - **Copper vertical funnel pipe (`0x1ddbc`/`0x1ddd4`, handler `0x2a5e6`)**: enter window `cellX 75..78, cellZ 78..82`, `ignoreAtOrBelow 0x3f80`, `rimFrom 0x3fb0`, `mouthFrom 0x3fa0`, exit `(77.5, 74.5)` with `-Z` roll-out velocity, `1.05 s` smooth interpolation, `0x35` pipe SFX, and `+4000` score.
  - **Animated turquoise wave (`0x1d0a0`, `waveRegion 81..84 × 76..97`)**: 22-tile traveling crest profile synced to `setLevel3WaveProfile()` with dynamic surface lift and longitudinal traveling-wave slope acceleration.
  - **Music & UI**: wired `06 Level 3.vgz` (`level3-intermediate.vgz`) in `createRemasterAudio.ts` & `build-remaster.mjs`, added **`3 · Intermediate`** to `remaster.html` & `remaster.ts` (`KeyN` advances `1 → 2 → 3`).
- **New modules**: `src/remaster/level3/level3RomData.ts`, `src/remaster/level3/level3Mechanics.ts`, `src/remaster/level3/level3Mechanics.test.ts` (added to `vite.config.ts` ≥ 90% V8 coverage scope).
- **Validation**:
  - `npm run format && npm run check`: **OK** (123 test files / 807 Vitest tests, ≥ 90% V8 coverage, lint, typecheck, Vite build).
  - `npx playwright test tests/browser/remaster.spec.ts --reporter=list`: **3/3 OK** (Level 1, Level 2, and Level 3 in Chromium WebGL + Havok with zero console errors).
- **Next action**: human playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`3 · Intermediate`) to tune wave surfing push, copper pipe entry/exit feel, acid amoeba speed/hitbox, and Level 3 camera scrolling.

## Remaster constant-velocity ice glide, uncut shatter→broom SFX & merge to `Remaster` — November 26, 2026

- **Eliminated Level 2 ice-basin oscillation (`src/remaster/engine/remasterSimulation.ts`, `remasterSimulation.test.ts`)**:
  - Replaced scalar `iceGlideSpeed` with a locked horizontal glide vector `iceGlideVel` on `enterIce` (enforcing a gentle `5.5` minimum only for slow `< 3.5` entries while preserving exact entry speed for `>= 3.5`, keeping PR #10's `iceSurface.integration.test.ts` 100% intact).
  - Maintained `(vx, vz) = iceGlideVel` while grounded on ice (ignoring concave bowl slope gravity so the marble glides straight across without oscillating), while allowing wall bounces (`wallImpactSpeed > 0.5`) to redirect `iceGlideVel`. Cleared `iceGlideVel` on `leaveIce` and respawn.
- **Full uncut shatter impact before broom sweep (`src/remaster/audio/createRemasterAudio.ts`)**:
  - Measured `sfx-shatter.vgm` (`0x38`) through `ymfm` (`693 ms`, peak `0.506`) vs `sfx-broom.vgm` (`0x5f`, `526 ms` leading silence + `565 ms` sweep). Delayed `broomSweep` from `220 ms` to `680 ms` (tracked via `shatterTimeout`) so the full shatter crash plays cleanly before the broom sweeps.
- **Validation**: `npm run format && npm run check` (122 test files / 802 Vitest tests, ≥ 90% V8 coverage, lint, typecheck, Vite build) and `npx playwright test tests/browser/remaster.spec.ts` (2/2) passed.
- **Git**: committed & pushed `test-pr-7-on-remaster` and merged into `Remaster`.

## Remaster ice-basin momentum preservation — November 26, 2026

- **Fixed marble getting trapped in the concave Level 2 ice basin (`src/remaster/engine/remasterSimulation.ts`)**:
  - Recorded `iceGlideSpeed = Math.max(9.0, entrySpeed)` on `enterIce` and preserved horizontal speed along the marble's current travel vector while grounded on ice, compensating for Havok's 0-restitution concave floor crease energy loss so the marble glides cleanly through the bowl and up the exit ramp.
  - Raised the low-speed stall recovery nudge (`v < 4.5`) to `0.85×` so even after a dead-stop wall hit inside the basin the player can never be soft-locked.

## Remaster ice-bowl escape nudge, immediate ROM take-off fall whistle, protected 1.58 s dizzy SFX & full Space boost — November 26, 2026

- **Four fixes applied**:
  1. **Ice-basin bottom soft-lock (`src/remaster/engine/remasterSimulation.ts`)**: preserved uncontrollable zero-friction glide on Level 2 ice at sliding speed (`>= 2.5` cells/s), while adding a subtle `0.22×` low-speed rocking nudge when stalled (`< 2.5` cells/s) at the bottom of the concave bowl.
  2. **Audible fall whistle (`0x45`) before shatter/dizzy & full `1.58 s` dizzy SFX (`0x39`) (`remasterSimulation.ts`, `extract-rom-sfx.mjs`, `createRemasterAudio.ts`, `opm_pokey.cpp`)**:
     - Triggered `fall` (`0x45`) immediately on the take-off frame whenever ground drops `> 0.75` world units below the marble (matching ROM `0x12482` so `0x45`'s measured `233 ms` YM2151 attack ramps up before landing).
     - Extended `sfx-dizzy.vgm` to `380` ticks (`~1.58 s`), `sfx-fall.vgm` to `300` ticks (`~1.25 s`), raised `sfxL` mix to `1.25×` in `opm_pokey.cpp`, and protected playing `dizzy` SFX for `1.25 s` from being cut off by minor `wallBounce`/`impact` events.
  3. **Level 1 right-side jump clearable with Space at any `Nervosité` setting (`createHavokBackend.ts`, `remasterSimulation.ts`, `physicsConstants.ts`)**: `agility` now scales normal driving (`flatSpeedLimit`) only, while holding Space always unlocks full boost acceleration and `boostSpeedLimit: 24.5`.

## Remaster safe non-ice respawn, smooth 1.05 s pipe traversal, stable worms on fall & live Nervosité slider — November 26, 2026

- **Four fixes applied**:
  1. **Never respawn stuck on ice (`src/remaster/engine/remasterSimulation.ts`)**: `lastSafe` is now saved ONLY on controllable non-ice, non-acid, flat solid stone with a `0.5`-cell solid non-ice margin, so falling from Level 2's ice basin always respawns cleanly on the dry stone platform before the ice.
  2. **Smooth 1.05 s pipe traversal & camera glide (`src/remaster/engine/remasterSimulation.ts`)**: extended pipe traversal duration to `1.05 s` so the full `0x35` pipe SFX (`~0.92 s`) plays out, and smoothly interpolated `player.position` from `pipeEntryPos` to `pipeExitPos` while hidden so the camera glides naturally along the pipe instead of snapping.
  3. **Worms stay visible during falls (`src/remaster/engine/remasterSimulation.ts`)**: anchored `updateWorms()` scroll row to `leader.life === 'falling' ? leader.lastSafe : leader.position` so falling off a cliff never jumps past `maxRow` and briefly despawns the worms.
  4. **Live `Nervosité` slider with numeric readout (`remaster.html`, `src/remaster/remaster.ts`, `remasterSimulation.ts`, `createHavokBackend.ts`)**: added a `0.40×`–`1.50×` slider (default `0.80×`) with live value badge scaling acceleration and speed cap in real time.

## Remaster cycle-accurate ymfm (YM2151) WASM audio core integration — November 26, 2026

- **Integrated Aaron Giles's `ymfm` (`ymfm::ym2151`, BSD-3-Clause)** pinned to commit `81aec25ccbb98f4873a255f7551ac4dadac59b4a` in `native/audio/ymfm/` (`ymfm.h`, `ymfm_fm.h`, `ymfm_fm.ipp`, `ymfm_opm.h`, `ymfm_opm.cpp`, `LICENSE`) and documented in `public/assets/README.md`.
- **Replaced clean-room FM core in `native/audio/opm_pokey.cpp`** with Dual `ymfm::ym2151` (`musicOpm` + `sfxOpm`, clocked at exact Atari System 1 `3,579,545 Hz` with linear resampling from `55,930.39 Hz` to WebAudio `sampleRate`) behind the exact same WASM C exports; updated `scripts/build-audio-wasm.mjs`.
- **Restored `wallBounce` (`sfx-wall-bounce.vgm`) to the true 68010 ROM command `0x34` (`0x1b8fa`)** now that `ymfm` renders YM2151 envelopes, LFO, `DT1`/`DT2`, `KS`, and hardware feedback cycle-accurately like MAME.

## Remaster sub-block VGM audio fix, zero-crackle rolling, restored snappy driving + capped fall speed, and true zero-friction ice + ice SFX — November 26, 2026

- **Audio analysis & fixes (`native/audio/opm_pokey.cpp`, `public/assets/audio/opm-pokey-worklet.js`)**:
  - Measured `02 Level 1.vgz` and `05 Level 2.vgz` directly through `opm-pokey.wasm` in Node: found `opm-pokey-worklet.js` was executing all 128-sample VGM commands at once before `audio_render(128)`, eating fast `keyOn`/`keyOff` pairs on Level 1 `ch3` (696 notes); switched worklet rendering to 16-sample (`~0.33 ms`) sub-blocks.
  - Eliminated key-on step clicks in `FmOperator::keyOn()` (no instant `env = 1.0f` / mid-wave `phase = 0` jump), boosted `musicOpm` mix from `0.16` to `0.26`, and tamed POKEY ch 0 rolling rumble (`raw = 0.22`, `alpha = 0.045`, ~340 Hz) so rolling no longer crackles or masks collisions.
- **Snappy driving + exact jump arcs + calm falls + safe respawn (`physicsConstants.ts`, `createHavokBackend.ts`, `remasterSimulation.ts`)**:
  - Restored responsive arcade feel (`gravityY: -30.0`, `inputAcceleration: 34.0`, `flatSpeedLimit: 15.5`, `boostMultiplier: 1.9`, `boostSpeedLimit: 23.0`) so Level 1's right-side jump lands cleanly without overshooting.
  - Added vertical terminal velocity cap (`maxFallSpeed: 15.5` cells/s, matching 68010 `-5 units/tick`) so deep falls stay calm and give the fall whistle plenty of time.
  - Required a `0.45`-cell solid terrain margin around `lastSafe` so jumping off an edge never saves an off-screen void lip.
- **True zero-friction Level 2 ice + ROM ice SFX (`createHavokBackend.ts`, `remasterSimulation.ts`, `createRemasterAudio.ts`, `remaster.ts`, `extract-rom-sfx.mjs`, `sfx-bank.json`)**:
  - Set Havok `friction: 0.0` & `staticFriction: 0.0` dynamically whenever `isIceAtWorld()` is true (in addition to PR #10's zero linear/angular damping and disabled steering).
  - Wired PR #10's `surfaceTransition()` to emit `iceEnter` (`0x43`, `sfx-ice-enter.vgm`) / `iceLeave` (`0x44`, `sfx-ice-leave.vgm`) and muted stone rolling rumble while sliding on ice.

## Remaster PR #10 ROM ice zones integration, restored YM2151 music sustain, audible wall knock & earlier fall whistle — November 26, 2026

- **PR #10 (`MM-experiments#10`) integrated** (`docs/remaster/ice-zones.md`, `src/remaster/engine/romSurfaceZones.ts`, `surfaceRules.ts`, plus unit & integration tests):
  - Wired `isIceAtWorld()` + `resolveSurfaceRules()` into `src/remaster/engine/remasterSimulation.ts` so Level 2's ice basin ignores player steering (including Space surge) while grounded.
  - Wired `isIceAtWorld()`, `MARBLE_ANGULAR_DAMPING`, `surfaceLinearDamping()`, and `surfaceAngularDamping()` into `src/remaster/physics/createHavokBackend.ts` so the marble glides with zero friction/damping on Level 2 ice.
- **Audio fixes**:
  1. **Restored full Level 1 & Level 2 music instruments (`native/audio/opm_pokey.cpp`)**: recalibrated exponential YM2151 decay (`0.08 * 2^((d1r + 0.75*ks) * 0.27)`) so music tracks keep full instrument sustain instead of decaying 10× too fast.
  2. **Audible wall-bounce knock (`scripts/extract-rom-sfx.mjs`, `public/assets/audio/sfx-bank.json`, `createHavokBackend.ts`)**: switched `wallBounce` from slow-attack `0x5c` to instant-attack loud `0x22` (`TL=0, AR=31, kc=0x34`) and lowered `horizDelta` trigger threshold to `1.8`.
  3. **Longer fall whistle before shatter/dizzy (`remasterSimulation.ts`)**: lowered airborne fall-whistle trigger from `dropY > 0.85, vy < -2.5` to `dropY > 0.35, vy < -1.5` so the whistle starts right at take-off.

## Remaster calmer gravity/speed, less aggressive Black Marble & clean 0x5c wall-bounce knock — November 26, 2026

- **Three fixes applied**:
  1. **Wall-bounce SFX buzz eliminated (`scripts/extract-rom-sfx.mjs`, `public/assets/audio/sfx-bank.json`)**: remapped `wallBounce` from `0x34` (43.6 Hz low-frequency FM buzz) to **`0x5c`** (`0x19310`, `alg=0, fb=0, kc=0x3e`, 247 Hz hollow knock with zero feedback).
  2. **Calmer overall marble speed & gravity (`src/remaster/engine/physicsConstants.ts`)**: reduced `gravityY` from `-32.0` to `-20.0`, `inputAcceleration` from `30.0` to `22.0`, `flatSpeedLimit` from `15.0` to `11.5`, `boostSpeedLimit` to `20.0`, `shatterImpactSpeed` to `12.2`, and `fallDurationSeconds` to `1.25`.
  3. **Calmer Black Marble without constant dizzy spam (`src/remaster/engine/remasterSimulation.ts`)**: scaled plateau `controllerForce` by `0.62` (`0.25` during `hitCooldown = 1.1 s`), reduced close-range lunge to `+5`, and raised the Black Marble dizzy threshold from `relSpeed > 4.5` to `relSpeed > 9.5` so normal pushing/wrestling does not stun-lock the player.

## Remaster YM2151 2-sample feedback, 0.96 elastic walls, lighter Black Marble & fall→thud→dizzy audio sequence — November 26, 2026

- **Four fixes applied**:
  1. **Eliminated YM2151 FM buzz ("grésillement") (`native/audio/opm_pokey.cpp`)**: implemented authentic Yamaha 2-sample averaged self-feedback `(prevOut + prevOut2) * 0.5f * (π / 2^(7 - fb))` and restored `kModIndex = 4.0f`, eliminating harsh aliasing on `0x34` (wall bounce) and `0x32` (Black Marble clack).
  2. **More elastic wall bounce (`physicsConstants.ts`, `createHavokBackend.ts`)**: raised `wallRestitution` to `0.96` (matching 68010 `0x1b5a6` sign-flip rebound) and set cliff friction to `0.0`.
  3. **Easier to push & knock off the Black Marble (`createHavokBackend.ts`, `remasterSimulation.ts`)**: lowered Black Marble mass to `0.62×` player mass, `linearDamping` to `0.75`, `invM2` to `1 / (0.55 * m)`, and `hitCooldown` to `0.65 s`.
  4. **Exact original airborne fall → landing thud → dizzy audio sequence (`remasterSimulation.ts`, `createRemasterAudio.ts`)**: trigger `fall` (`0x45`) as soon as the marble drops `> 0.85` world units while airborne (outside pipe mouths) for shatter, dizzy, and void drops alike; on `< 3`-cell dizzy landings, play `impact` (`0x5d`) first and schedule `dizzy` (`0x39`) `160 ms` later so both sounds are heard clearly in order.

## Remaster YM2151 exponential envelopes + LFO, true 0x34 wall-bounce, Space boost, pipe exits & 30 Hz worm sync — November 26, 2026

- **Five root causes fixed**:
  1. **YM2151 SFX sounding wrong vs `main` (`native/audio/opm_pokey.cpp`, `scripts/extract-rom-sfx.mjs`, `public/assets/audio/sfx-bank.json`)**:
     - Located the true 68010 wall-rebound sound call at `0x1b8fa` (`cmd 0x34`, remapped `wallBounce` from `0x5a` to `0x34`).
     - Replaced linear envelope decay in `opm_pokey.cpp` with **exponential (dB-linear) YM2151 decay + Key Scale (`KS`)** and raised FM `kModIndex` (`8.0f`) so `0x34` (wall bounce) and `0x32` (Black Marble clack) produce crisp percussive knocks instead of 2-second drones.
     - Implemented **YM2151 hardware LFO** (`0x18` LFRQ, `0x19` PMD/AMD, `0x1b` WF, `0x38..0x3f` PMS/AMS, `0xa0..0xbf` AMS-EN) so `0x45` (fall whistle) and `0x39` (dizzy) play with their authentic arcade vibrato/warble.
  2. **Space boost not felt on trackpad & calmer normal speed (`physicsConstants.ts`, `remasterSimulation.ts`, `createHavokBackend.ts`)**:
     - Tuned normal rolling (`inputAcceleration: 30.0`, `flatSpeedLimit: 15.0`) and raised Space boost (`boostMultiplier: 2.35`, `boostSpeedLimit: 25.0`), passing `boosting` explicitly to `applyPlayerForce()` (instead of guessing from `forceMag`) plus adding a forward turbo surge when holding Space while already rolling.
  3. **Pipe exit placement & exit speed (`remasterSimulation.ts`)**:
     - Placed Y-pipe exit clearly outside the `z = 95.01` shell at `(83.6, 95.3)` and scaled pipe exit velocity to `0.55×` (`~8.2 cells/s`) so the marble rolls cleanly out of the drop-pipe and Y-pipe.
  4. **Worm occasionally missed on fast drops (`remasterSimulation.ts`)**:
     - Synced `lastWormViewRow` ±1 stepping with `wormWorld.viewRow === lastWormViewRow` (30 Hz tick completion) so 60 Hz frames never drop intermediate `minRow` values (`5` or `6`).

## Remaster Level 2 pipe exits, 3-worm spawn stepping & wall/fall SFX fix — November 26, 2026

- **Three Level 2 bugs fixed**:
  1. **Pipe exit placement (`src/remaster/engine/remasterSimulation.ts`)**: aligned the drop-pipe exit with the open 3D pipe mouth on `main` (`cell (69.0, 76.8)`) and the Y-pipe exit with its open 3D outlet (`cell (83.6, 94.6)`) instead of popping out buried inside the pipe shell, and re-anchored `teleportMarble()` before switching back to `DYNAMIC` so Havok never injects an `ANIMATED` velocity impulse on release.
  2. **Only 1 green worm spawning (`src/remaster/engine/remasterSimulation.ts`)**: `stepWorms()` checks exact `newRow === minRow` (`5` for worms 0 & 1, `6` for worm 2), so rolling downhill quickly skipped `row = 5`. Added single-row stepping (`lastWormViewRow`) in `updateWorms()` so all 3 Level 2 worms reliably spawn.
  3. **Wall bounce & fall SFX (`scripts/extract-rom-sfx.mjs`, `public/assets/audio/sfx-bank.json`, `src/remaster/audio/createRemasterAudio.ts`)**: remapped `wallBounce` from `0x42` (repeating bumper warble) to `0x5a` (`0x19340`, crisp wall thump) and switched `fall` events to play `sfx-fall.vgm` (`0x45`, descending fall whistle) instead of `sfx-void-fall.vgm` (`0x3d`).

## Remaster Level 2 visible void fall & blue drop-pipe fix — November 26, 2026

- **Two Level 2 bugs fixed**:
  1. **Marble disappearing mid-air when falling in the Black Marble zone (`src/remaster/engine/remasterSimulation.ts`, `physicsConstants.ts`, `createRemasterScene.ts`)**:
     - Stopped freezing the marble kinematic when `life === 'falling'` and kept reading its live Havok position so gravity visibly pulls it all the way off the bottom of the screen (`fallDurationSeconds: 1.1`).
     - Removed `life !== 'falling'` from `p1Visible`/`p2Visible` in `createRemasterScene.ts` and froze camera scroll at `leader.lastSafe` while falling (matching the original arcade).
  2. **Entering the blue drop-pipe to the right of the bridge killed the marble with `fall` (`src/remaster/engine/remasterSimulation.ts`)**:
     - `droppedOverVoid` (`currentGround === null && y < lastSafe.y - 2.4`) was firing at `-2.4` units inside the pipe hole before the marble could reach `mouthFrom = 0x3f60` (`-4.08` units) and before `updatePipeTraversals()` ran.
     - Moved `updatePipeTraversals(dt, events)` before the void-fall check, handled `probe.kind === 'mouth'` (ROM `0x2a3d2`: zero horizontal velocity, keep vertical gravity), guarded void-fall with `!inPipeMouth`, and reset `airbornePeakY` on pipe entry so exiting never triggers shatter/dizzy.
- **Validation**: added a regression test in `src/remaster/engine/remasterSimulation.test.ts` and ran `npm run check` + `npx playwright test tests/browser/remaster.spec.ts`.

## Remaster Level 2 camera height-scroll, Havok elastic wall/billiard restitution & 68010-verified ROM SFX JSON — November 26, 2026

- **Four root causes fixed**:
  1. **Camera losing the marble below the screen after the bridge (`src/remaster/rendering/createRemasterScene.ts`)**: `computeArcadeScroll(worldX, worldY, worldZ)` now projects `(arcadeX, arcadeZ, arcadeH)` through `projectPracticePoint()` (accounting for the ~270-unit terrain height drop from spawn to ice/GOAL) and raises Level 2 `endScroll` to `-15120` (GOAL sits at `scroll = -15187`), keeping the marble centered in the 240px viewport all the way to GOAL.
  2. **Non-elastic wall bounces & sticky Black Marble (`src/remaster/physics/createHavokBackend.ts`, `physicsConstants.ts`, `remasterSimulation.ts`)**:
     - Configured Havok `PhysicsMaterialCombineMode`: static floors use `restitution: 0` + `MULTIPLY` (highest Havok priority → `0.0` floor restitution, zero seam hops), while cliffs/walls/landmarks (`0.84`), player marbles (`0.86`), and Black Marbles (`0.90`) use `MAXIMUM`, giving genuine native Havok elastic wall and billiard-ball collisions.
     - Tightened `applyPlayerForce` uphill climb assist (`slope < 0.95` instead of `1.5`) so pushing into a wall/well rim no longer wedges the marble into the wall.
     - Suppressed the Black Marble's close-range lunge impulse during `enemy.hitCooldown` (`0.45 s`) so marbles recoil cleanly apart after a billiard clack instead of sticking.
     - Widened `resolveBilliardCollision` contact envelope to `2.15 * radius` and reused `tmpV1`/`tmpV2` (zero per-call allocations).
  3. **100% 68010-verified ROM SFX + editable JSON mapping + YM2151 `DT2` (`native/audio/opm_pokey.cpp`, `scripts/extract-rom-sfx.mjs`, `public/assets/audio/sfx-bank.json`, `src/remaster/audio/sfxBank.ts`, `createRemasterAudio.ts`, `src/dev/localRoms.ts`, `scripts/build-remaster.mjs`)**:
     - Disassembled all `JSR 0x158ac` call sites in `roms/marble.zip` and re-exported all 13 bit-exact `.vgm` SFX: `wallBounce` (`0x42`), `marbleClack` (`0x32`), `pvpClack` (`0x37`), `impact` (`0x5d`), `fall` (`0x45`), `voidFall` (`0x3d`), `shatter` (`0x38`), `broomSweep` (`0x5f`), `dizzy` (`0x39`), `respawn` (`0x3c`), `wormEat` (`0x33`), `pipeEnter` (`0x35`), `countdownTick` (`0x43`).
     - Added the editable `romSfx` trigger-to-file table to `public/assets/audio/sfx-bank.json`, read dynamically at runtime by `createRemasterAudio.ts`, and wired `pvpClack`, `wormEat`, and `pipeEnter` events from `remasterSimulation.ts`.
     - Added YM2151 `DT2` coarse detune (`reg 0xc0..0xdf`) in `native/audio/opm_pokey.cpp` and rebuilt `public/assets/audio/opm-pokey.wasm` (`13.9 KiB`).
- **Validation**:
  - `npm run build:audio-wasm` + `node scripts/extract-rom-sfx.mjs --export` succeeded.
  - `npm run check` passed (lint, typecheck, Vitest + V8 coverage ≥ 90%, build).
  - `npx playwright test tests/browser/remaster.spec.ts` passed (2/2 tests).
- **Next action**: manual playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`2 · Beginner`) to verify scrolling down to GOAL, elastic wall & Black Marble billiard bounces, and the 68010-verified ROM SFX.

## Remaster Level 2 audio, camera scroll, Black Marble, dizzy/shatter & Green Worms fixes — November 26, 2026

- **Six gameplay & audio bugs fixed** in `opm-pokey-worklet.js`, `createRemasterScene.ts`, `physicsConstants.ts`, and `remasterSimulation.ts`:
  1. **Stuck note on death (`public/assets/audio/opm-pokey-worklet.js`)**: added `silenceSfxChannels()` (YM2151 key-off on SFX channels `0..7` + POKEY mute on channels `1..3`, preserving POKEY channel `0` rolling) whenever an `sfxVgm` clip starts or finishes so no SFX note can hang indefinitely after a fall/shatter.
  2. **Level 2 camera scroll stopping after the bridge (`src/remaster/rendering/createRemasterScene.ts`)**: `computeArcadeScroll()` now uses `-15360` as `endScroll` for Level 2 instead of `terrain.lastScroll` (`-15846`, the half-level survey limit near the bridge), allowing full scrolling down to `GOAL` (`110, 114`).
  3. **Level 2 Black Marble ramp boundary, lunge & billiard collisions (`src/remaster/engine/remasterSimulation.ts`)**: wired real player zone tracking (`nextZone(LEVEL2_ZONE_BOUNDARIES, ...)`) into `stepEnemyMarble()`, added a hard ramp-turnback clamp (`reachedPlateau && selfCell.x >= 32.0`) so the Black Marble never descends past halfway down the ramp, added a close-range lunge impulse (`bestDist < 4.2`), and wired `bumpEnemyMarble()` + crisp billiard-ball bounce (`e = 0.90`) so marbles never stick and the player can knock the Black Marble off.
  4. **3-cell drop shatter vs. dizzy & ROM 68010 timing (`src/remaster/engine/physicsConstants.ts`, `remasterSimulation.ts`)**: tracked airborne peak height (`airbornePeakY`); drops `> 2.45` world units (`> 3` arcade cells) shatter the marble with crumbs + 3D broom sweep; drops `1.15..2.45` (`< 3` cells) or hard Black Marble hits (`relSpeed > 4.5`) trigger dizzy for **`1.67 s`** (50 ROM ticks at 30 Hz, decoded from `roms/marble.zip` `0xd0ac`: `$56 = 0x32`), reducing player steering force to **`0.40×`** and resetting the dizzy timer to full `1.67 s` on re-hit without re-triggering the dizzy SFX.
  5. **Green Worms collision, dizzy knockback, swallow & nearby respawn (`src/remaster/engine/remasterSimulation.ts`, `createRemasterScene.ts`)**: wired real `PlayerArcadeState` into `stepWorms()` and applied returned states back to Havok and players (`knockback`/`bump` → velocity impulse + `1.67 s` dizzy reset + `marbleClack`; `swallowed` → marble hidden & kinematic in worm mouth during chew; `rebuilding` → spiral respawn at `p.lastSafe` + `respawn` SFX).
- **Validation**:
  - `npm run check` passed: 119 test files, 786 Vitest tests (including 3 new unit tests for shatter/dizzy drop & slowdown/reset, Black Marble ramp clamp & bump, and Green Worm collision), lint, typecheck, coverage (93.63% stmts, 90.19% branches, 96.34% funcs, 94.2% lines), and build.
  - `npx playwright test tests/browser/remaster.spec.ts` passed (2/2 tests).
- **Next action**: manual playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`2 · Beginner`) to verify the 6 fixes live (audio note release on death, scrolling past the bridge, Black Marble ramp limit & lunge/billiard fights, 3-cell shatter/dizzy feel, and Green Worm collisions/swallow).

## Remaster Level 2 animated bridge physics & control fix — November 26, 2026

- **Root causes identified and fixed** in `remasterSimulation.ts`, `createHavokBackend.ts`, and `createRemasterScene.ts`:
  - Removed the double `+ marbleRadius` vertical offset in `updateBridgeCrossing()` (which had floated the marble 0.675 cells above the deck because `player.position.y` is already the marble bottom).
  - Removed `setTargetTransform(pos, Quaternion.Identity())` from `setMarblePosition()` in `createHavokBackend.ts` (calling `setTargetTransform` on a `DYNAMIC` Havok body injected artificial vertical launch velocities and reset orientation); `disablePreStep = false` syncs `mesh.position` cleanly without impulse, and `bridgeGrounded` preserves stone damping (`1.15`) instead of air damping (`0.08`) while on the bridge.
  - Moved `updateBridgeCrossing(dt, events)` to run once right after `physics.step(dt)` (before the void-fall check, guarded by `!p.bridgeSupported`) and synchronized the visual deck with `snapshot.bridgePhase * 6` (`smoothStep`).
  - Implemented all five arcade bridge behaviors:
    1. Passable when flat or barely raised (`freeEdgeRiseUnits < 4`, steps 0–1) with zero hop and preserved `(vx, vz)` velocity.
    2. Full player steering in `X` and `Z` on the tilted deck plus physical slope gravity `|g| · sin(θ) · cos(θ)` toward the hinge (`+Z`).
    3. Gentle push-back (`|vz| <= 4.2, vy = 0`) when approaching or pinched by a raised free edge (`step >= 2`) instead of violent ejection.
    4. Rising under a stationary marble rolls it smoothly downhill with `vy = 0` (no upward hop).
    5. Seamless zero-hop exit at the hinge (`z >= 60`) or flat free edge, and standard physical Havok parabolic launch (`vy = -vz · rise / 4`) when rolling off a raised free edge (`z < 56`).
- **Validation**:
  - `npm run check` passed (783 Vitest tests including 4 new bridge crossing/slope/push-back/launch assertions, lint, typecheck, V8 coverage ≥ 90%, build).
  - `npx playwright test tests/browser/remaster.spec.ts` passed (2/2 tests).
- **Next action**: manual playtest by Michel on `http://127.0.0.1:5173/remaster.html` (`2 · Beginner`) across the animated bridge in all states (flat, rising, raised lip, hinge exit, raised free-edge exit).

## Remaster Level 2 bridge and pipe runtime integration — November 26, 2026

- **Branch**: `test-pr-7-on-remaster`; PR #9 is merged locally in commit
  `af795bb`, but neither the branch nor the PR has been pushed/merged remotely.
- `bridgeState()` now drives the Level 2 bridge step in the simulation snapshot,
  and `createRemasterScene()` forwards that step to the existing animated bridge
  mechanism.
- Player pipe probes now call `probePipeEntry()` and `beginPipeTraversal()`.
  An entry teleports the player to the ROM exit, freezes and hides it for the
  decoded 19 ticks, then restores dynamic Havok motion, exit velocity and score.
- `RemasterPhysicsBackend` exposes the optional `setMarbleVelocity()` hook;
  the Havok backend implements it.
- The generic animated bridge collider was removed after browser testing showed
  Havok penetration impulses ejecting the marble when the deck raised or closed.
  `decideBridgeCrossing()` now owns the special arcade response: it supports the
  marble on the deck without vertical impulse, reflects only the longitudinal
  velocity at a high lip, and leaves lateral falls to the normal fall path.
- Bridge support is applied both before and after the Havok step. The pre-step
  application prevents the marble from entering the terrain gap before the ROM
  crossing rule can place it on the lowered deck.
- A grounded marble may now step up by up to 1.5 world units at the lowered
  bridge entrance, covering the measured terrain-to-deck height discontinuity
  without enabling an airborne jump.
- Because the decoded crossing axis is partly inferred, a lowered-deck
  fallback also supports a grounded marble anywhere in the bridge's measured
  footprint and one-cell approach margin.
- Bridge support now uses a position-only physics hook instead of the
  teleport/reset hook. This keeps the current horizontal velocity and input
  forces while the ROM rule clamps only the support height, preventing a
  visible step, loss of steering during the lift, and an artificial launch
  when leaving at the hinge.
- The bridge now remembers that a marble has entered the deck, so support does
  not depend on Havok reporting the gap as grounded during the lift. The
  Havok implementation also sends the target transform to the physics body,
  not only to its visual proxy, while restoring the preserved velocity.
- Added a simulation regression covering steering velocity while entering a
  lowered bridge.
- **Validation**:
  - `npm run check` passed: 782 Vitest tests, lint, typecheck, coverage and build.
    Coverage: 94.59% statements, 90.04% branches, 96.61% functions, 95.23% lines.
  - `npx playwright test tests/browser/remaster.spec.ts` passed: 2 tests.
- **Remaining manual validation**: select `2 · Beginner` at
  `http://127.0.0.1:5173/remaster.html`, reach the drawbridge and pipe mouths,
  and check the visual timing and collision feel. The browser smoke test confirms
  booting only; it does not drive a marble to those coordinates.

## Remaster Level 2 green-worm scene integration — November 26, 2026

- **Branch**: `test-pr-7-on-remaster`; the work is local and has not been pushed.
- Wired the PR #8 worm state machine into `remasterSimulation.ts` for Level 2:
  the simulation creates a worm world, advances it at the decoded 30 Hz cadence,
  converts Remaster world coordinates to arcade units, and exposes renderer-facing
  `WormPose` snapshots.
- Added four procedural worm renderers to `createRemasterScene.ts`. Their native
  script/frame/state data is adapted through `wormPose.ts`, and inactive slots
  are hidden. Scene disposal remains owned by BabylonJS through the scene.
- Added a simulation regression assertion and a Playwright Level 2 boot test.
- **Validation**:
  - `npm run check` passed: 747 Vitest tests, lint, typecheck, coverage and build.
  - `npx playwright test tests/browser/remaster.spec.ts` passed: 2 tests.
  - Manual visual validation by Michel is still required: select `2 · Beginner`
    at `http://127.0.0.1:5173/remaster.html` and confirm worm placement and
    locomotion during the opening and gameplay.
- **Known limitation**: worm contact events currently advance the ROM state
  machine and are exposed through the simulation path, but their knockback,
  swallow and player-state effects are not yet applied back to Havok bodies.

## Remaster Level 2 drawbridge & pipes: ROM decoding + pure modules (issues #4, #5) — November 26, 2026

- **Branch `remaster-l2-bridge-pipes`** (from `origin/Remaster`). No Level 2 scene code touched (that work is unpushed elsewhere); only new pure modules, docs and one coverage-include line in `vite.config.ts`.
- **Findings** ([docs/remaster/level2-bridge-pipes.md](docs/remaster/level2-bridge-pipes.md)), static 68010 disassembly, DECODED vs INFERRED marked:
  - ROM game logic runs at **30 Hz** (main loop `0x11804` waits two VBLANKs via `0x28dea`); all tick counts are 1/30 s.
  - Level 2 course list `0x1df7a` (table `0x1dec0`): bridge script `0x1db12` (type 3, cell 61,56), pipe zones `0x12` (64,78), `0x13` (81,86), `0x14` (87,86), outlets `0x15`, `0x16`.
  - Bridge: 73-tick cycle (raise 7 steps × 2 ticks, hold 15, lower, hold 30); 12 terrain-code overrides `0x40076e..` per step (`0x1b908 + 0x1c·step`); free-edge lip 0/3/5/8/10/(13 inferred)/16 units; generic wall rule edge ≥ 4 units (`0x1b5c2`) → passable only at steps 0-1. No bridge-specific collision or sound.
  - Pipes: teleport on the trigger tick to the exit, hidden/frozen 19 ticks (0.633 s), exit velocity 4 units/tick (15 cells/s) +X (drop pipe) / +Z (Y-pipe), alternate exit if occupied (`0x17cb8`), cue `0x35`, score 4000 / 2000 at release.
  - Approach B: drop-pipe tube radius ≈ 0.60 < marble 0.675 (does not fit), Y-pipe ≈ 0.9-1.1 (fits). Mesh is a closed visual shell.
  - Sound cues section for Peter (not implemented here).
- **Modules** (`src/remaster/level2/`, pure TS, tests next to them): `romUnits.ts`, `bridgeCycle.ts` (`bridgeState(t)`), `bridgeCrossing.ts` (`decideBridgeCrossing`), `pipeTeleport.ts` (`probePipeEntry`, `beginPipeTraversal`, `pipeTraversalAt`), `romSoundCues.ts`. Integration: [docs/remaster/level2-bridge-pipes-integration.md](docs/remaster/level2-bridge-pipes-integration.md).
- **Limitations**: step-5 free-edge rise interpolated (banked level record); bridge side/axis orientation inferred from the existing survey; marble gravity constant not located (fall duration estimate uses actor gravity); nothing verified in MAME or in a browser.
- **Next action**: Level 2 scene owner wires `bridgeState` to the kinematic deck and `probePipeEntry`/`pipeTraversalAt` to the marble; optionally confirm tick timings with a MAME probe on `0x772` and `$59`.

## Remaster Branch: Phase 1 Level 1 Vertical Slice (Havok + YM2151/POKEY WASM) — November 25, 2026

- **Branch `Remaster` created** from `main` (`76bfdae`) for the standalone ROM-free / MAME-free Marble Madness remaster (see [REMASTER_OWN_ENGINE_SPEC.md](REMASTER_OWN_ENGINE_SPEC.md)).
- **Hybrid Level Format (`RemasterLevelV1`)** ([remasterLevel.ts](src/remaster/levels/remasterLevel.ts), [remasterLevel.test.ts](src/remaster/levels/remasterLevel.test.ts)):
  - Combines `heightLayers[]` (for the 6 original courses, exact Level 1 `GOAL` bounds `x = 72..80, z = 64..68`) and `volumes[]` (multi-tier 3D shapes ready for future _Hamsterball_-style levels and an editor).
- **Fixed-Step `60 Hz` Pure-TS Engine & 1P/2P Controls** ([physicsConstants.ts](src/remaster/engine/physicsConstants.ts), [remasterSimulation.ts](src/remaster/engine/remasterSimulation.ts), [remasterSimulation.test.ts](src/remaster/engine/remasterSimulation.test.ts), [remasterControls.ts](src/remaster/engine/remasterControls.ts), [remasterControls.test.ts](src/remaster/engine/remasterControls.test.ts)):
  - Opening flyover, `60 s` countdown, forward-progress & time-bonus scoring, lethal-fall shatter, `0.75 s` spiral respawn, `GOAL` arrival, and strict 2P input isolation with per-player device selectors (default: P1 = Trackpad, P2 = Keyboard AZERTY/QWERTY, plus Arrows, WASD/ZQSD, Gamepad 1/2).
- **Havok Physics Backend (`@babylonjs/havok@1.3.14`)** ([buildCollisionMesh.ts](src/remaster/physics/buildCollisionMesh.ts), [buildCollisionMesh.test.ts](src/remaster/physics/buildCollisionMesh.test.ts), [createHavokBackend.ts](src/remaster/physics/createHavokBackend.ts)):
  - Separate static `PhysicsAggregate` meshes for slope-smoothed floor (`restitution = 0`) and vertical cliffs / `practice-landmarks` (`restitution = 0.42`, including red guardrails, pyramids, and spikes).
  - Uphill push force projected along the local ramp tangent + `Space` boost (`1.75×`, cap `26 c/s`) + low air damping (`0.08`) for side jumps.
- **Autonomous Dual Yamaha YM2151 (OPM) + Dual Atari POKEY WASM AudioWorklet** ([opm_pokey.cpp](native/audio/opm_pokey.cpp), [build-audio-wasm.mjs](scripts/build-audio-wasm.mjs), [opm-pokey-worklet.js](public/assets/audio/opm-pokey-worklet.js), [vgmParser.ts](src/remaster/audio/vgmParser.ts), [vgmParser.test.ts](src/remaster/audio/vgmParser.test.ts), [sfxBank.ts](src/remaster/audio/sfxBank.ts), [sfxBank.test.ts](src/remaster/audio/sfxBank.test.ts), [createRemasterAudio.ts](src/remaster/audio/createRemasterAudio.ts), [generate-remaster-music.mjs](scripts/generate-remaster-music.mjs)):
  - Compiled to `public/assets/audio/opm-pokey.wasm` (`13.5 KiB`) via `emcc` with two independent YM2151 + POKEY chip pairs (8-channel Music bus + 8-channel SFX bus, zero channel collision), independent Music / SFX mix sliders, audible low-passed POKEY rolling rumble, editable `public/assets/audio/sfx-bank.json`, preloaded `.vgm`/`.vgz` tracks (`local-roms/original_FX_and_musics/` + original fallbacks), and contributor audio guide [PETER_MUSIC_SFX_INFO.md](PETER_MUSIC_SFX_INFO.md) for Peter Salomonsen.
- **2P Off-Screen Catch-Up (`-5 SEC`) & GOAL Coast-In** ([remasterSimulation.ts](src/remaster/engine/remasterSimulation.ts), [createRemasterScene.ts](src/remaster/rendering/createRemasterScene.ts)):
  - Individual per-player timers in 2P, `-5 SEC` 3D billboard (`createPracticeCatchUpLabel`) + spiral respawn near the leading player when lagging > 17 cells, leader-following camera, and smooth `0.8 s` GOAL coast-in so P1 never blocks P2 at the finish line.
- **Playable Entry Point & Deployment** ([remaster.html](remaster.html), [remaster.ts](src/remaster/remaster.ts), [createRemasterScene.ts](src/remaster/rendering/createRemasterScene.ts), [vite.remaster.config.ts](vite.remaster.config.ts), [build-remaster.mjs](scripts/build-remaster.mjs), [tests/browser/remaster.spec.ts](tests/browser/remaster.spec.ts)):
  - `beginFrame()`/`endFrame()` render framing for animated `GOAL` flags, `createPracticeRespawn` spiral fragments, `8×` anisotropic pit walls + `minZ = 0.5`.
  - Validated with `npm run check`, `npx playwright test tests/browser/remaster.spec.ts`, and `npm run build:remaster`; deployed to `https://micbuffa.github.io/MM-experiments/remaster/` without touching `main`'s root deployment.

## Pipe geometry polish, Chase High camera, raycast-gated occlusion, projection unfreeze & Level 1 pre-flyover curtain — November 25, 2026

- **Level 2 blue Y-pipe upper hoods & Level 3 orange pipe geometry** ([fitIntermediatePipeHoods.ts](src/rendering/fitIntermediatePipeHoods.ts), [fitIntermediatePipeHoods.test.ts](src/rendering/fitIntermediatePipeHoods.test.ts), [widenLevel3Pipe.ts](src/rendering/widenLevel3Pipe.ts), [widenLevel3Pipe.test.ts](src/rendering/widenLevel3Pipe.test.ts)):
  - Raised Level 2 blue Y-pipe upper hoods (`0.85 → 1.10` height multiplier) so the top of the marble no longer clips through the hood roof on entry.
  - Widened the Level 3 orange pipe uniformly (`+42%` constant diameter from `y = -8.23` down to `y = -15.0`, tapering smoothly into the elbow) and shifted it `+0.20` toward the right pillar (`+Z`) so the marble remains fully concealed during the drop while staying aligned with both mouths.
- **`Chase` + `Chase High` cameras & raycast-gated occlusion** ([practiceCameraSettings.ts](src/game/modern/practiceCameraSettings.ts), [practiceCameraSettings.test.ts](src/game/modern/practiceCameraSettings.test.ts), [occlusionFade.ts](src/game/modern/occlusionFade.ts), [occlusionFade.test.ts](src/game/modern/occlusionFade.test.ts), [createCameraOcclusion.ts](src/rendering/createCameraOcclusion.ts), [createLivePracticeCamera.ts](src/rendering/createLivePracticeCamera.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [practiceCameraControls.ts](src/ui/practiceCameraControls.ts), [index.html](index.html), [src/beta.ts](src/beta.ts)):
  - Kept the original low `chase` camera (`back = 7.2, lift = 2.6, clearance = 1.2`) and added `chaseHigh` (`back = 8.4, lift = 4.2, clearance = 1.8`), both using a `3×3` ground-clearance neighbourhood.
  - Added pure CPU terrain raymarching (`isMarbleOccludedByTerrain`) plus zero-allocation landmark AABB ray checks (`Ray.intersectsBoxMinMax`) in `createCameraOcclusion.ts` so the dithered cutout shader (`mmFade`) activates only when the marble is genuinely occluded behind a wall/overhang/landmark, eliminating false floor/slope cutouts.
- **BabylonJS 9.33.2 `unfreezeProjectionMatrix()` fix** ([createLivePracticeCamera.ts](src/rendering/createLivePracticeCamera.ts), [createLivePracticeView.test.ts](src/rendering/createLivePracticeView.test.ts)):
  - `Camera.prototype.unfreezeProjectionMatrix()` clears `_doNotComputeProjectionMatrix` without invalidating `_cache`, leaving `perspective` stuck on the frozen orthographic `blendOpening()` matrix on `follow`/`overhead`/`chase`/`chaseHigh`. Added `unfreezePerspective()` calling `perspective.getProjectionMatrix(true)` on transition, with a regression test asserting `m[15] === 0`.
- **Level 1 pre-flyover curtain & `0x15` wraparound anti-flash guard** ([practiceCameraSettings.ts](src/game/modern/practiceCameraSettings.ts), [practiceCameraSettings.test.ts](src/game/modern/practiceCameraSettings.test.ts), [createVideoView.ts](src/app/createVideoView.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [beta.html](beta.html), [src/beta.css](src/beta.css), [src/beta.ts](src/beta.ts)):
  - Added `stepOpeningCurtain(armed, opening)` so the wrapped 68010 countdown byte (`0x00..0x41` → `opening` in `0.75..1.0` before `0x42`) never flashes the final Level 1 arcade view before the real flyover starts; clears the canvas to black on `index.html` and shows `#modern-starting` (`Starting…`) on `beta.html`, plus guards against all-black opening palettes.
- **Validation & deployment**:
  - `npm run check` passed (Prettier, ESLint, TypeScript, Vitest + V8 coverage, Vite build).
  - Michel validated locally on `http://127.0.0.1:5173/`.
  - Committed and pushed to `main`, `npm run build:beta` built and deployed `dist-beta/` to `gh-pages`.
  - Next action: verify the live GitHub Pages deployment (`https://micbuffa.github.io/MM-experiments/`).

## Level 6 end-maze materials, MAME palette RAM audit, CI stabilization, and English docs — November 24, 2026

- **Level 6 end-maze cell-by-cell material & MAME palette audit** ([level6DisplayTerrain.ts](src/rendering/level6DisplayTerrain.ts), [level6DisplayTerrain.test.ts](src/rendering/level6DisplayTerrain.test.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts)):
  - Audited all 4 disappearing-block maze phases against live MAME gameplay (`local-roms/level6-terrain.json` + live MAME `atarisy1` Playfield Palette RAM `0xB00400..0xB0047E`).
  - Bound `Level6ShimmerPaint` (`level6-peach`) to live **Playfield Bank 3 indices `56..63`** (`0xB00470..0xB0047E`, golden-orange joint + shimmering yellow/peach bands) matching the live arcade bridge & cap under the `GOAL` flags (`x = 84..87, z = 88..89`) and amoeba plateaus.
  - Mapped all end-maze zones accurately in post-`planarSw` display coordinates: upper-left cap (`x = 99..103, z = 81..86`) as `'stone'`, behind-right strip (`x = 84..85, z = 90..104`) as `amber → ice → amber → ribbed`, bottom-right ice (`x = 88..93, z = 104..106`) bordered by `'stone'` (`x = 86..89, z = 101..105`), bottom-left flat landing (`x = 102..106, z = 104..109`) as `'stone'`, and both gable ramps (`x = 94..101, z = 104..106`) + `x = 104..105, z = 100..103` as `'dark'`.
  - Switched Level 6 `GOAL` pad (`x = 88..91, z = 88..97`) to authentic live arcade **Playfield Bank 0** black/charcoal ink (`[28, 28, 32, 255]`) on bright white/light-grey paper (`[238, 238, 242, 255]`) over `'stone'` tiles.
  - Replaced the `16×16` micro-checkerboard on `level6-ribbed` with a `64×64` trilinear-filtered texture (`Texture.TRILINEAR_SAMPLINGMODE`) featuring **4 parallel metallic ribs per cell** aligned with the `+Z` cell edge (`phase = (x % 16) / 16`) and a subtle perpendicular tile seam (`y < 3 || y >= 61`), matching both the worm platforms and the end-maze strip.
- **CI stabilization & local Playwright Chromium setup** ([tests/browser/terrain.spec.ts](tests/browser/terrain.spec.ts), [tests/browser/navigation.spec.ts](tests/browser/navigation.spec.ts), [src/terrain.ts](src/terrain.ts), [playwright.config.ts](playwright.config.ts)):
  - Installed Playwright Chromium locally (`npx playwright install chromium`) so the full CI pipeline (`npm run check && npm run test:browser && npm run test:preview`) runs locally.
  - Guarded dev-only loaders (`loadRollingActors()`, `loadLevelPng()`) behind `import.meta.env.DEV`, raised RGB tolerance to `±6` for `2048×2048` shadows, replaced flaky one-shot assertions with `expect.poll`, and enabled `retries: process.env.CI ? 1 : 0`.
- **Documentation translated to English**:
  - Translated all 29 Markdown documentation files across root and `docs/` into English.
- **Procedural acid-dissolve animation replacing Rolling Madness `player_melt`** ([createAcidDissolve.ts](src/rendering/createAcidDissolve.ts), [createAcidDissolve.test.ts](src/rendering/createAcidDissolve.test.ts), [createMarbleAnimation.ts](src/rendering/createMarbleAnimation.ts)):
  - Analyzed the 68010 ROM acid-melt sequence (`0x25c12..0x25c28` → 7-frame sprite table at `0x21062` / `0x21476..0x214be`, 4 ticks per frame, tiles `0x00d5..0x00fe`).
  - Replaced `player_melt` with a zero-allocation procedural animation where the marble sizzles, shrinks, and vanishes cleanly while 16 pre-allocated effervescent particles (droplets, acid-green fizz, light mist) rise in deterministic arcs driven by `pose.melt`.
- **Level 5 surreal red pipe wobble animation** ([practicePose.ts](src/emulation/practicePose.ts), [practicePose.test.ts](src/emulation/practicePose.test.ts), [createLevel5Terrain.ts](src/rendering/createLevel5Terrain.ts), [createLevel5Terrain.test.ts](src/rendering/createLevel5Terrain.test.ts), [createTerrainStudy.ts](src/rendering/createTerrainStudy.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts)):
  - Decoded the 68010 pipe-traversal state machine in ROM (`0x2a450..0x2a95c` & `0x2552c..0x255c2`: `animation === 3` at `$1a(A2)` / `base + 0x32`, pipe ID at `$58(A2)`, 18-frame countdown at `$59(A2)`).
  - Exposed `inPipe` on `PracticeMarblePose`, centered the `level5-clock` red curly pipe around its centroid, excluded it from static matrix freezing (`DYNAMIC_MESH_PREFIXES`), and added zero-allocation `updateLevel5PipeAnimation` (subtle elastic squash-and-stretch + rumble while `inPipe`, smooth damped settle on exit).
- **Credits & full-game README** ([beta.html](beta.html), [src/beta.css](src/beta.css), [README.md](README.md), [public/assets/README.md](public/assets/README.md)):
  - Added credits for Michel Buffa (3D Web version) and Luca Elia (_Rolling Madness 3D_, non-commercial reuse of a few 3D actor models) in `beta.html` and `README.md`; updated `README.md` to cover all 6 courses (full game).
- **Validation & deployment**:
  - `npm run check && npm run test:browser && npm run test:preview` passed (Prettier, ESLint, TypeScript, 650 Vitest unit tests + coverage, Vite build, 22 Playwright WebGL tests, 3 preview tests).
  - `npm run build:beta` built and deployed `dist-beta/` to `gh-pages`.
  - Next action: human playthrough verification of Level 6 on GitHub Pages (`https://micbuffa.github.io/MM-experiments/`).

## Level 6 (complete visual polish), cross-game shader fix, and infinite timer — November 23, 2026

- **Cross-game shader cache collision fix** ([terrainPalettePaint.ts](src/rendering/terrainPalettePaint.ts), [arcadeTerrainPaint.ts](src/rendering/arcadeTerrainPaint.ts), [intermediatePipePaint.ts](src/rendering/intermediatePipePaint.ts), [createLevel5Terrain.ts](src/rendering/createLevel5Terrain.ts), [createCameraOcclusion.ts](src/rendering/createCameraOcclusion.ts), [arcadeTerrainPaint.test.ts](src/rendering/arcadeTerrainPaint.test.ts)):
  - Added a unique `#define` key via `prepareDefines()` on each `MaterialPluginBase` subclass to prevent any collision in `engine._compiledEffects` across multiple games (purple L1 guardrails, blue L3 pipe, brown L1 floor).
- **Infinite timer (`T` key, disabled by default)** ([emulatorjs.ts](src/emulation/emulatorjs.ts)):
  - Fixed Work RAM timer offsets at `0x82` (P1 = `0x400018 + 0x6a`) and `0x164` (P2 = `0x4000fa + 0x6a`).
- **Complete visual polish for Level 6 (_Ultimate Race_)** ([level6DisplayTerrain.ts](src/rendering/level6DisplayTerrain.ts), [level6DisplayTerrain.test.ts](src/rendering/level6DisplayTerrain.test.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts)):
  - **Animated amoeba plateaus**: `Level6ShimmerPaint` shader (`MM_LEVEL6_SHIMMER`) wired live to the Playfield 1 bank (`0xb00420..0xb0042c`, indices `16..22`) synchronized to MAME's 60 Hz palette cycle.
  - **Exact starting mound (`6×5`)**: continuous shared vertices (`startMoundVertexY`, zero red facets), soft speckled amber texture, removal of gray tile rows at the foot of the red walls.
  - **Hollow square pit island**: outer border and inner rim in gray tiling, golden inner walls with cast shadow (`receiveShadows = true`), and visible chocolate-brown floor (`bottomY = topY - 0.92`).
  - **Open yellow mouths**: hollow triangular tunnels offset over the true MAME trenches (`z = 31..32` and `z = 39..40`), inner shadow gradient, and thin front arch.
  - **1-block-thick floating slabs and gray joints**: entire upper section suspended in space (`isLevel6FloatingSlabEdge`), gray vertical joints on red walls (`apJoint` index `6`), exact 4-tile cyan ice strips (`x = 42..45` and `z = 42..45`), gray stone ramps, and cast shadows from static surfaces onto the cliffs.
  - **Worm platforms and narrow walkways**: embossed `4×4` metallic micro-checkerboard, exact 3-flat-face geometry on the left bump (`x = 67..68, z = 59..62`) and right hollow (`x = 59..62, z = 69..70`), vertical viaduct decals (`createViaductWindowSlots`) on the tall red cliffs.
  - **Cyan ice diamond (`11×11`) and 4 hexagonal pyramids**: 2-tile gray borders at top-left/top-right, 4 hexagonal-base pyramids (`createLevel6HexPyramid`, height `9.5` arcade units), removal of the 3-tile gray ears around the `6×6` entry platform.
  - **Final maze and `GOAL` zone**: out-of-corridor clipping (`Math.abs(x - z) > 21`), anti-spike guard on `(103, 82)`, cream-gold `GOAL` pad (`palette: 'level6'`) + orange-red/black flags placed on the top-right edge (`x = 88.05, z = 88.05 / 90.05`), gold/peach/gold low wall behind on the right, cyan ice on the isolated block, solid charcoal-gray tiles with light-gray joints.
- **Validation & deployment**:
  - `npm run check` + `npm run build:beta` succeeded (all tests pass, V8 coverage OK).
  - WebGL2 visual checks in Chrome (`terrain.html` Side-by-side PNG + 3D) across all of Level 6.
  - Committed and pushed to `main`, `dist-beta/` deployed to `gh-pages`.

## GPU/CPU optimizations (Intel UHD 630 & battery) and study tools — November 23, 2026

- **Static Shadow Map cache + 2048×2048** ([createPracticeSun.ts](src/rendering/createPracticeSun.ts), [createTerrainStudy.ts](src/rendering/createTerrainStudy.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts)):
  - Shadow map capped at `2048 × 2048` (4× less fillrate than `4096 × 4096`).
  - `REFRESHRATE_RENDER_ONCE` enabled on static levels (1, 2, 3, 6) with targeted invalidation (`invalidatePracticeShadows`) only when `startLift`, `bridgeStep`, or `level6MazePhase` changes; `half-rate` mode (1 frame in 2) on `Eco` quality for levels with moving shadows (4, 5, or marble shadows).
  - Expensive PCF disabled in `Eco` mode (`applyPracticeShadowQuality`).
  - World matrix freezing (`freezeWorldMatrix`) and `isPickable = false` on static terrain meshes.
- **3D rendering decoupling and adaptive _frame-skip_** ([createVideoView.ts](src/app/createVideoView.ts)):
  - `refreshModern()` no longer renders BabylonJS synchronously inside `marbleOnVideoFrame`: it schedules a dedicated `requestAnimationFrame` (`runModernFrame`) and automatically adapts a 3D _frame-skip_ (`0..2`) if a frame exceeds `14 ms`, keeping MAME, WebAudio, and trackball polling locked at 60 Hz without audio glitches or trackpad latency.
- **`Eco / Balanced / High` quality selector + Intel UHD auto-detection** ([betaState.ts](src/beta/betaState.ts), [beta.html](beta.html), [beta.ts](beta.ts)):
  - WebGL `UNMASKED_RENDERER_WEBGL` detection automatically switching to `Eco` on Intel HD/UHD Graphics or software rendering, toggleable at any time via the Attract Mode menu or the **`G`** key in-game.

## Level 6: Ultimate Race and 4-phase dynamic maze — November 23, 2026

- **68010 ROM analysis and native MAME survey** ([scripts/survey-level6.mjs](scripts/survey-level6.mjs), `local-roms/level6-terrain.json`, `local-roms/level6-web.state`):
  - ROM descriptor `0x2e790` (`recordBase = 0x8136a`, `maxDiag = 0xc8`, `122 × 122` grid, start `scroll = -16168`, `x = 92, z = 132, h = 16384`).
  - All **112 dynamic slots** (`0x40076e..0x40084c`, 317 mutable cells in `x = 76..117, z = 78..117`) are driven by the **4-phase** cyclic table in ROM `0x24e2a..0x24e42`:
    - `0x24e2a` → phase `0` (`0x24e4e`, 112 words)
    - `0x24e32` → phase `1` (`0x24f32`, 112 words)
    - `0x24e3a` → phase `2` (`0x25016`, 112 words)
    - `0x24e42` → phase `3` (`0x250fa`, 112 words)
    - Measured cadence in real gameplay: **41–42 frames per phase** at 60 Hz (`~0.683 s`, full cycle `~2.75 s`), looped by sentinel `0xffffffff` at `0x24e4a` and exposed in Work RAM `0x400978`.
  - The 9 actors of Level 6 (1 black marble on the ice diamond, 4 worms on the striped slopes, 4 amoebas on the peach plateaus) are already read directly by `readIntermediateActors`.
- **Real-time reading and BabylonJS 3D presentation** ([practicePose.ts](src/emulation/practicePose.ts), [practiceTerrain.ts](src/game/modern/practiceTerrain.ts), [level6DisplayTerrain.ts](src/rendering/level6DisplayTerrain.ts), [createLevel6Terrain.ts](src/rendering/createLevel6Terrain.ts), [arcadeTerrainPaint.ts](src/rendering/arcadeTerrainPaint.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts)):
  - `readPracticePose` recognizes `0x2e790` (`level: 'level6'`) and exposes `level6MazePhase` (`0 | 1 | 2 | 3`) read live from `0x400978` (100% locked synchronization on the 68010 core, zero drift).
  - `createLevel6Terrain` builds the carmine-red cliffs, speckled amber starting plateau and smoothed white ramp, hollow square island with amber floor, 2 orange triangular tunnels, turquoise ice strips, 2 peach diamond plateaus, 2 striped gray slopes, ice diamond with 4 gray pyramids (`createPracticeTower`), `GOAL` marking and its 2 orange/black checkerboard flags.
  - The 4 maze phases (dark-gray blocks, amber block, turquoise ice block, and their red cliffs + shadows) are **pre-built once** in `level6-maze-phase-0..3` and toggled in O(1) via `setLevel6MazePhase` with zero per-frame allocation. In the `terrain.html` study view, a dedicated timer automatically cycles through the 4 phases at the exact arcade cadence (`41 / 60 s`).
- **Integration in `terrain.html`, `index.html` (`F6`), and `beta.html` (`6 · Ultimate`)** ([terrain.html](terrain.html), [src/terrain.ts](src/terrain.ts), [index.html](index.html), [src/ui/feasibility.ts](src/ui/feasibility.ts), [beta.html](beta.html), [src/beta/betaState.ts](src/beta/betaState.ts), [src/beta.ts](src/beta.ts), [scripts/build-beta.mjs](scripts/build-beta.mjs)).
- **Validation**:
  - `npm run check` succeeded (format, lint, typecheck, V8 coverage, Vite build) + `npm run build:beta` succeeded.
  - Chrome WebGL2 visual verification on `terrain.html`: start/orange tunnels, ice diamond + 4 pyramids, and 2 maze screenshots 0.75 s apart confirming smooth toggling of appearing/disappearing blocks and their shadows.
  - CI fix included: `expect.poll` timeout raised to `15 000 ms` in [tests/browser/terrain.spec.ts](tests/browser/terrain.spec.ts).
  - Next action: full playthrough test of Level 6 in side-by-side view (original vs 3D) in `beta.html` or `index.html`, then commit/push and GitHub Pages redeployment on request.

## Level 5: "Monument Valley"-style Escher finish (Option 1) — November 23, 2026

- **Removal of the artificial viaduct and yellow wall under the marble** ([level5DisplayTerrain.ts](src/rendering/level5DisplayTerrain.ts)):
  - The elevated deck at `H = 16416` on the approach bridge now covers only the 6 native tiles of the walkway (`X = 29..34, Z = 21..23`) instead of `X = 29..43`. Beyond `X = 35`, the floor remains at its true low height `H = 16368`, perfectly flush with the rest of the plateau around the towers: no more yellow wall under the blue marble.
  - `level5FinishDepth` shifts the marble by `(+6, +6, +48)` along the isometric view ray over a widened area in `Cadrage arcade` (`X < 33 * 8, Z < 21 * 8`, pixel-identical projection with no clipping of the marble by the upper deck edge), and tightly (`X < 29 * 8 + 6, Z < 18 * 8 + 4`) in other views around the `?` floor marker (`level5-escher-hint`, automatically hidden in `Cadrage arcade` via `scene.onActiveCameraChanged`).
- **`+3 SEC` bonus when squashing minis and yellow spark when birds hit walls** ([practicePose.ts](src/emulation/practicePose.ts), [createPracticeCatchUpLabel.ts](src/rendering/createPracticeCatchUpLabel.ts), [createLivePracticeView.ts](src/rendering/createLivePracticeView.ts), [level5Actors.ts](src/emulation/level5Actors.ts), [createLevel5Actors.ts](src/rendering/createLevel5Actors.ts)):
  - Verified in the 68010 ROM (`0x19348: ADDQ.W #3, $6a(A2)` then `JSR 0x285b0` with index `14` → pointer `0x2242e` in `player+0xec`). `practicePose` now reads `0x2242e` (`timeBonusSeconds: 3`) in addition to `0x22446` (`10`), and `createLivePracticeView` displays the **`+3 SEC`** 3D banner above the marble.
  - Verified in the 68010 ROM (`0x19d2c → 0x224e2..0x22542` for wall collision and `0x19e04 → 0x22546..0x22556` for player collision): `level5Actors` exposes `birdSpark` (`'flash'` during `0x224f2..0x22526`, then 3-step yellow explosion `1/3..1` over `0x2252a..0x2253e` / `0x2254a..0x22552`), rendered in `createLevel5Actors` by a bright-yellow star mesh calibrated to the native `16×16` footprint (`outer = 0.42`, max radius `~0.50` tile, pre-allocated and owned by the scene).
- **Strict alignment, height, and spherical joints on Level 1 red guardrails** ([createPracticeLandmarks.ts](src/rendering/createPracticeLandmarks.ts), [createPracticeGuardrail.ts](src/rendering/createPracticeGuardrail.ts), [createPracticeLandmarks.test.ts](src/rendering/createPracticeLandmarks.test.ts)):
  - Realigned the first 5 red guardrails (`rails[0..4]`) onto the exact tile joint lines (`X = 17/25`, `Z = 17/25`) instead of the skewed values `16.7`, `25.4`, `24.98`, `25.15`: in top-down view, each segment is strictly parallel to the floor joints.
  - Raised post heights (`railHeight = 0.78`, `leftUpperPost = 0.62`) to match the original arcade height and cast shadow length in `Cadrage arcade` view.
  - Added a spherical joint (`practice-rail-*-joint-*`, diameter `0.38`) at the top of each post in `createPracticeGuardrail` so every corner between horizontal and vertical tubes joins seamlessly without a notch.
  - Filled in the missing `SW` corner on the edges of the two upper pits (`Z = 12, X = 25..27` and `Z = 24, X = 13..15`) to remove jagged triangles near the guardrails, as well as on the step `(X = 27, Z = 31)` beneath the foot of the right tower so it is complete and symmetric to `(X = 31, Z = 27)`.
- **Static beta distribution (`dist-beta/`) and GitHub repository `micbuffa/MM-experiments`** ([beta.html](beta.html), [src/beta.ts](src/beta.ts), [src/beta.css](src/beta.css), [src/beta/betaState.ts](src/beta/betaState.ts), [vite.beta.config.ts](vite.beta.config.ts), [scripts/build-beta.mjs](scripts/build-beta.mjs)):
  - `npm run build:beta` produces a 100% static English distribution in `dist-beta/` (`base: './'`, `index.html` + `beta-data/` + `vendor/emulatorjs/`), testable locally via `npm run preview:beta`.
  - Initialization screen with progress bar and 3 startup optimizations: (1) Attract Mode savestate `local-roms/attract-web.state` (`4.6 KB` compressed) restored on startup via `session.restoreRawState` to skip the Atari System 1 POST; (2) Cache-First Service Worker (`scripts/beta-sw.js` → `dist-beta/sw.js`) + IndexedDB cache (`src/beta/betaCache.ts`) for the assembled `marble.zip`; (3) compressed binary encoding `rolling-actors.bin` (`src/emulation/rollingActorsBinary.ts`) replacing the 6.7 MB JSON.
  - Automatic switch to **full-screen side-by-side view** with pixel-aligned `4:3` frames and identical scanline CRT effect on both views (original on the left, 3D on the right), without double-resetting the flyover on Level 1, and semi-transparent top banner (`V` View, `C` Camera, `Space` Boost, `Esc` Pause).
  - Git repository initialized and linked to `https://github.com/micbuffa/MM-experiments.git` with `.gitignore` excluding Rolling Madness (`Rolling Madness 3D 2005/`, `3D_assets_for_animated_entities/`, `local-roms/rolling-actors.json`) and generated artifacts, while versioning `roms/` (ROM/BIOS), terrain/checkpoint surveys, and developer/AI documentation.
- **Bird cast shadows in 3D view** ([createRollingActor.ts](src/rendering/createRollingActor.ts), [createLevel5Actors.test.ts](src/rendering/createLevel5Actors.test.ts)):
  - Automatic registration of bird meshes (`bird`, `bird_fast`, `bird_expl`) as shadow casters on the `key` light's `ShadowGenerator` (`addShadowCaster(mesh, false)`), with `receiveShadows = false` to avoid self-shadowing on their animated wings.
- **Level 5 intro flyover without clipping through the 3D model** ([createLivePracticeCamera.ts](src/rendering/createLivePracticeCamera.ts), [createLivePracticeView.test.ts](src/rendering/createLivePracticeView.test.ts)):
  - Realigned `startCenter` onto the true start depth (`startDepth = Vector3.Dot(startAim, arcadeDir)`) instead of the `dot = 0` plane passing through the origin: on Level 5 (which ascends from the bottom-right), the final `startEye` is now properly above and in front of the starting platform instead of buried beneath the cliff.
  - Added an elevated flyover arc (`flyoverArc = 18` on Level 5, `finishEye` pulled back to `34` units) that progressively zooms into the starting arcade framing, paired with a dynamic clearance floor `keepClearOfTerrain` along the `arcadeDir` view axis to prevent any clipping through terrain or towers.
- **Alignment of the `GOAL` decal at the end of Level 3** ([createLevel3Materials.ts](src/rendering/createLevel3Materials.ts), [createPracticeGoal.ts](src/rendering/createPracticeGoal.ts), [createLevel3Materials.test.ts](src/rendering/createLevel3Materials.test.ts)):
  - Shifted `level3Goal` from `z = 100` to `z = 101` (`{ x: 92, z: 101, width: 4, length: 10 }`) to cover the final row `z = 110` with no beige floor showing on the right, and to free the two end tiles of the turquoise curbs (`z = 100`).
  - Kept the two checkered flags on the ends of the turquoise curbs (`flagZ = goalRegion.z - 1`, i.e., `z = 100`) in `createPracticeGoalFlags`.
- **Ogival domes and thick joints on the 3 Level 2 towers** ([createIntermediateTower.ts](src/rendering/createIntermediateTower.ts), [intermediateLandmarks.ts](src/rendering/intermediateLandmarks.ts), [createIntermediateTower.test.ts](src/rendering/createIntermediateTower.test.ts), [intermediateLandmarks.test.ts](src/rendering/intermediateLandmarks.test.ts)):
  - Hexagonal `outline(2, 2)` base exposing the two gray lateral tiles of the blue plinth, continuous curved ogival profile in 9 rings (`0 → 5.5 → 11 → 16 → 19.5 → 22.5 → 24.5 → 25.5 → 26`) with a slightly rounded crown and cast shadow faithful to the original curve.
  - Dedicated procedural material `createIntermediateTowerMaterial` (`intermediateTowerStone`) with thick dark joints, pronounced horizontal belt at `h = 16`, and panels aligned from bottom to top across both tiers.
- **4-quarter-pyramid castles without central spike** ([createLevel5Terrain.ts](src/rendering/createLevel5Terrain.ts), [createLevel5Terrain.test.ts](src/rendering/createLevel5Terrain.test.ts)):
  - Removed the erroneous 5th central pyramid on the 3 castle blocks (`[36, 27]`, `[11, 28]`, `[48, 36]`): the gray peak visible in the background in the original arcade is the 4th rear corner of the crown, not a central spike.
- **Cantilevered vaulted arch cut along the Escher seam** ([level5Bridge.ts](src/rendering/level5Bridge.ts), [level5Bridge.test.ts](src/rendering/level5Bridge.test.ts)):
  - `openLevel5Bridge` also removes the vertical end wall at `X = 35, Z = 21..24` so it does not close off the Escher seam.
  - `level5BridgeGeometry` builds a true continuous barrel vault over `Z = 21..24` (`alongStart = 30`, `alongSpan = 3.5`, `crownArcade = 16408`, `springArcade = 16376`) clipped along the isometric line `H = 16368 + 8 * (X - 29)` so no part of the arch protrudes below the gray floor in arcade view.
- **Validation**:
  - Chrome WebGL2 visual verification on `terrain.html` (Level 5 at scroll `940 px`, screenshot `/tmp/l5_escher_arcade_v3.png`).
  - `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `630/631` Vitest tests passing (including all Level 5 tests: `level5Bridge.test.ts` and `level5DisplayTerrain.test.ts`). One unrelated pre-existing test in `src/rendering/createPracticeLandmarks.test.ts:77` fails (`expected 1.80 to be less than 1`).
  - The historical open issue of circles hidden under the pipe/clock remains open.

## Level 5 / Level 1: finish, symmetry, and walls — screenshots 16:06–17:47 on November 22, 2026

This entry supersedes the 8-unit corner descriptions and the earlier visual coordinates of GOAL in previous entries.

### Symmetry and height

- `createPracticeTower` used a plinth centered at **(0.5, 0.5)**, then shifted the shoulder and tip back toward (0, 0). All rings and the tip now share the plinth center on both Levels 1 and 5. The Level 1 front-joint calibration test is updated for the four-pixel projected shift resulting from this centering; its height is unchanged.
- The three four-corner towers have a **dedicated roof and four walls**, `level5FortGeometry`, with the same construction on each side. The surveyed floor remains at their foot; the corners no longer depend on its triangulation. Vertical faces remain yellow with shared joints.
- The four corner spikes rise by **12 arcade units**, visible in the native survey (e.g. 16380 → 16392), rather than the 8 units of the Rolling Madness model used in the previous fix. The central spike keeps its center at (cx+0.5, cz+0.5).
- Symmetry tests via 90° and 180° rotations on roof, wall, and classic tower positions; apex centering test.

### Sawtooth edges

The Level 5 collision domain is bounded by **X−Z=±21**. A full tile at the edge protruded past this domain by one triangle; cuts are no longer limited to the first screens. The extraneous NE corner is removed from the +21 boundary, and the SW corner from the −21 boundary, across the entire course. The heights of the three valid corners are preserved, without using the extraneous corner to extrapolate SW.

General preservation of missing SW corners, introduced during this task, also cut **interior walls** into sawtooth edges (row Z=28, X=42..48 in particular). That is removed: the three coherent samples complete the tiles of those rows; only the outer boundary is cut. Tests on both diagonals and on a full interior row. Chrome inspection confirming the straight interior wall behind the tower and the outer edges.

### GOAL, small slope, and arch

The GOAL shape remains 4 × 10 cells. Its presentation depth is realigned to **X=25..28, Z=24..33, H=16416** instead of the collision strip X=19..22, Z=18..27, H=16368. The +48 offset on X, Z, and H **preserves the arcade projection exactly**, while allowing the Z=34 facade to meet the Z=34..35 slope directly. The old isolated volumes are integrated into the two continuous platforms. The flags use the presented terrain height. The marking dimensions are unchanged.

`level5FinishDepth` applies the same presentation realignment to both marbles on the finish strip and approach bridge; no core coordinates are written. The integration test keeps native poses and checks the 3D position; the pure test verifies projection identity.

`archBridgeGeometry` extracts the geometry previously built into Level 4, without changing that level's two arches. `level5Bridge` reuses the profile (crown at −9, springing at −15 units below the deck), oriented along X, X=29..35, Z=21..24: six panels in total. The central opening measures **three cells**, X=30.5..33.5, with two solid 1.5-cell supports. The intrados profile is not stretched across the entire span. Solid passage faces are removed, and a lower floor receives shadows. Ends and neighboring walls are preserved. All these meshes and materials belong to the scene; no new loop or shadow map.

### Validation and next steps

**`npm run check` succeeded: 628 tests / 100 files**, format, lint, typecheck, coverage, and build. Business-logic coverage unchanged: 99.45% statements, 98.60% branches, 99.01% functions, 99.41% lines. Usual chunk size warning. **Chrome: 10/10 terrain tests succeeded**.

Screenshots actually inspected: `/tmp/mm-1747-fort-top.png`, `/tmp/mm-1747-fort-front.png`, `/tmp/mm-1747-fort-back.png`, `/tmp/mm-1747-pyramid-top.png`, `/tmp/mm-1747-level1-top.png`, `/tmp/mm-1633-final-arcade.png`. The final views show the straight interior wall after restoring the tiles. Lighting differences between faces are expected; the claimed symmetry applies to positions. The local session harness loads F5 and also shows the end of the level; it is not a full played game. No Safari/audio/comfort test run added.

No Git initialized; no changes to the core, collisions, ROMs, dependencies, or input gain. Visual fidelity remains subject to Michel's comparison. The historical issue of circles hidden under the pipe remains open, as noted in the previous entry; do not mark it resolved.

## Level 5: fixes from screenshots 15:26–15:31 — November 22, 2026

- The three towers near GOAL now have **four closed gray stone volumes**, generated by `level5FortCorners`. Each quarter has two inward slopes, two gray vertical cuts, and a base. The old terrain corner heights are removed: they produced yellow cuts via the wall generator. Edge-closure test, split vertices for normals. The terrain beneath these elements is flat.
- The three central spikes are centered on the 3 × 3 plinth, narrowed (half-width 0.54 cell), with projected height preserved. Matte stone, shared sun lighting and shadows. The five bird pyramids retain their shared construction with Level 1.
- Small arena ramp: two strips Z=95..96, X=90..92; native profile 16244 → 16242 → 16240 → 16238. Both strips share the exact same edges, rounded to 1e−9. The test enforces flatness and joins.
- Squashed minis: anchoring computed from the bottom of the model so the surface is no longer buried in the floor; margin 0.025, width 1.35×. Squashed amoebas are opaque; their colors and those of other flat fills are strengthened with no specularity. Normal poses restore their dimensions and position. Timings remain those of the core.
- Birds: yellow beak cross-section 1.8×, feather tips shortened and brought closer together; each pose keeps its native motion. Normals recomputed once on the adjusted copies, without modifying the local library.

Validation: `npm run check` **617 tests / 98 files succeeded**, business-logic coverage unchanged (99.45 / 98.60 / 99.01 / 99.41%), build and typecheck succeeded. **Chrome: 10/10 terrain tests succeeded.** Actual screenshots inspected: `/tmp/mm-level5-fort.png`, `/tmp/mm-level5-compare-arena.png`, `/tmp/mm-level5-compare-birds.png`, `/tmp/mm-1531-squashed.png`. The squash harness initializes contacts then leaves transitions to the core; it is not a played traversal. No Git initialized.

**Remaining issue: circles under the pipe/clock entrance.** The current mask was checked against the native framebuffer: 2,292 of the 2,296 pigment pixels surveyed in framing `/tmp/mm-1531-clock-ejs-full.png` match the full map exactly, with vertical offset 1292 and scroll −15462. However, this screenshot does not reveal the parts behind the pipe. No assumed circle or unverified extra pixels were added. Next action: isolate the target facade in a native framing where it is uncovered and complete only its proven contour. Human validation of silhouettes remains open. Do not present this issue as fixed.

## Level 5: arena, pyramids, and bird death — November 22, 2026, screenshots 14:49–14:53

This entry corrects and completes the initial implementation below.

- The gray areas came from UVs doubled vertex-by-vertex at an incorrect height (16232, whereas the arena floor is at 16238). A single tile could span much of the atlas and turn gray due to mipmapping. `level5Surface` now assigns uniform per-cell density: **2× in X=90..103, Z=91..104**, both floor AND block tops, 1× on ramps and adjacent paths. UVs are recomputed from positions, without repeated multiplication of a shared vertex.
- The two large slopes have a diagonal ridge: X−Z=9 for X=106..111 and X−Z=−11 for X=96..101. Their ridge cells remain folded along NW–SE with SW=NE. The previous flat extension artificially raised SW and produced sawtooth edges. Tests verify max ridge height and edge equality with neighboring cells.
- The wall mask now reconnects pigment only in the small **gray mortar** breaks of the reference. Yellow separations between distinct motifs remain intact; 3D gray joints are applied afterward. The yellow line in the middle of the ellipses is thus removed. Local library regenerated with `extract-rolling-actors.mjs`.
- The **five pyramids in the bird zone** now reuse `createPracticeTower` from Level 1: three-stone skirt, shoulder, joints, and tip. 3 × 3 footprint and height adapted to Level 5. Their underlying terrain is flat. The three small towers near GOAL keep their two-facet quarter-pyramid corners.
- Bird beak: the four faces share UV vertex U≈0.0004, V=1.49. `birdParts` isolates them in a matte, slightly emissive yellow material; the purple texture no longer dilutes them in mipmaps. The model points toward −Z: π rotation fix to follow the native direction. Chrome on the real asset: 110 body triangles + 4 beak triangles.

### Animations verified in 68010 and in the Web core

- Fatal contact: `0x19e14` puts the player in **state 0x0b** with counter `player+0x57=0x66`. Dispatcher `0x254ba` leads to `0x25876`, then `0x13ade`: sentinel 102 → 36 → 0, eight expanding fragments. `birdDeath` reads their already-computed projected coordinates in the two player groups at +0x38 and +0xa4 (glyphs 0x10b..0x112), relative to center +0x1e/+0x20. Off-screen fragments or old records at the sentinel are not displayed. `createBirdDeath` displays these positions without an independent clock, then hides its meshes as soon as this state exits.
- Minis: routine `0x192e2` squashes the actor, stops its velocity, and keeps state 2. **Black marble**: lists 0x21f7a → 0x21f7e → 0x21f82, then held frame via 0x21f8a. Rendering keeps the first two stages via vertical mesh compression, then uses `blacky_squashed_mini`. **Worm**: static frame via 0x21a62 (`stick_squashed_mini`). **Amoeba**: static frame via 0x21efe (`amoeba_squashed_mini`). No invented squash cycle.
- Chrome probe: controlled contact initialization, then native code alone. All three squashes are observed; the death counter steps from 102 to 35, 34, 33… with eight fragment records (six still visible at end of expansion, others clipped). The core then returns to player state 0 and `birdDeath` disappears. The marble is off-screen after returning to the safe point in this teleported harness; no full traversal or trackpad comfort sign-off is claimed.
- The official MAME driver consulted sets up the machine/Slapstic; the sequences above come from the local 68010 program and are confirmed in the pinned core. See `docs/DECISIONS.md` for the driver reference.

Validation: **`npm run check` succeeded, 614 tests / 97 files**; business-logic coverage unchanged: 99.45% statements, 98.60% branches, 99.01% functions, 99.41% lines. **Chrome: 10/10 terrain tests succeeded**. No changes to ROM, physics, dependencies, or loops. Each new mesh/material belongs to the scene; reset on missing pose and scene disposal.

Useful files: `level5DisplayTerrain`, `createLevel5Terrain`, `birdParts`, `level5Actors`, `createLevel5Actors`, `birdDeath`, `createBirdDeath` and their wiring in `practicePose`/`createLivePracticeView`. Tests on UVs, ridges, pigment/mortar mask, squashes, P1/P2, fragments, and cleanup.

Screenshots inspected: `/tmp/mm-1449-arena.png`, `/tmp/mm-1453-birds.png`, `/tmp/mm-1453-bird-death.png`, `/tmp/mm-1453-bird-death-late.png`, `/tmp/mm-1453-bird-rebuild.png`, `/tmp/mm-bird-beak-close.png`. Native log `/tmp/mm-1453-native-cycle.log`. The latest harness screenshots replay real contacts without directly forcing squash or death states. No Git initialized. No Safari/audio/P2 test run played.

Next action: reload the app to pick up the local mask, then F5 and playtest Level 5. Keep native fragment reading, per-cell tiling density, and folded ridges; do not reintroduce the height-based UV condition. Level 6 next, on request.

## Level 5 — Silly Race, original motifs, and towers — November 22, 2026

Michel validated the closed Y of Level 2 and the waves of Level 3 before moving on to Level 5. Level 6 is not part of this task.

- Local survey `level5-terrain-v1`, 141 × 141, 3,825 active cells, native heights 16168..16416. 68010 descriptor `0x2de1e`, start `(1004,996,16168)`, scroll −15212. Reversed scrolling: F5 and the Level 5 button restore the local checkpoint; `/terrain.html` also offers Level 5, the reversed slider, and free view. The study limit −16152 frames the finish; it is not a measurement of the native limit.
- `scripts/survey-level5.mjs` verifies the sampler against the Level 4 survey, then lets the core initialize the next race in a diagnostic session. It only writes a derived survey and a normal checkpoint in `local-roms/`. The harness's transition RAM writes are not integrated into the game. No changes to the core or collisions.
- `createLevel5Terrain` includes floors, walls, shadows, GOAL, and decorative clock. `level5DisplayTerrain` fixes the fourth samples that produced sawtooth edges on ramps. Eight 3 × 3 cell plinths carry their central pyramids. The four corners are **two-facet quarter pyramids**: diagonal adapted to the raised corner, split vertices for normals. The test includes a triangular cell before the towers to verify that their detection does not depend on a multiple-of-six index.
- The repeating Rolling Madness motif is replaced by a **pigment mask extracted from `MarbleMadness_Level5.png`**. Only ellipse pixels are kept; no shadows, joints, or floors are copied. Projection calibrated on the 576 × 2286 map: `uPixels=270+2*(nativeZ-nativeX)`; `vPixels=nativeX+nativeZ-2*(nativeHeight-16384)-256`. Wall UVs use this transform, respecting PNG data orientation. The circles on the GOAL facade match the same positions as in the native view. Colors are driven by the core's PF banks: orange 31/29, pink 27/28, yellow 15/14/13, joints 4. The mask describes surfaces visible on this reference; hidden faces have no independent visual proof.
- `level5Actors` reads **9 minis**, RAM base `0x1890`, stride `0x28`, types 7/8/9 at +0x25, and **10 birds**, base `0x19f8`, stride `0x38`. 16.16 fixed-point positions at +0xc/+0x10/+0x14; activity +0x18, state +0x1a, sprite list +0x1c, counter/period +0x24/+0x25. Cycles are read from native lists, without a Babylon timer or recreated movement. Mini and bird models from Rolling Madness are added to the local library; squashed states use the corresponding poses. Adapting 3D poses to sprites remains a visual correspondence, not a mesh identity.
- `readPracticePose`, local loading, comparison, and camera accept Level 5. A test prevents the regression where the camera remained stuck on GOAL due to the increasing scroll clamp. Level 4 vacuums remain procedural. No new dependency, engine, or render loop.

Rebuilding local assets: `node scripts/extract-rolling-actors.mjs "3D_assets_for_animated_entities/data/{app}"`. This command also extracts the original mask via `scripts/level5-wall-pattern.mjs`. Library: 6,725,084 bytes before the latest code tweaks, under the 8 MB limit; none of these files are shipped in the build.

Final validation: **`npm run check` succeeded, 605 tests / 93 files**; **Chrome: 10/10 terrain tests succeeded**, including Silly Race. Business-logic coverage 99.45% statements, 98.60% branches, 99.01% functions, 99.41% lines. See `docs/VALIDATION.md` for commands and results. Chrome comparison screenshots in `/tmp/mm-level5-compare-*.png`, tower view `/tmp/mm-level5-fort.png`. These views come from positions initialized in a temporary harness, not a full trackpad run. The colors of the full PNG differ from some native palettes: the PNG sets the motifs, RAM sets the in-game tints. The imported clock remains a static prop. No Git initialized.

Next action: verify the played traversal and interactions with minis/birds; keep the original mask and corner facets. The next level to rebuild will be Level 6.

## Closed and smoothed Y, interior/exterior — November 22, 2026, 11:40 screenshot

This entry supersedes the hood-cutting reconstruction and local spout flattening described earlier. The audit shows that the Y extracted from Rolling Madness is a closed surface; the stray openings came from faces deleted and then replaced without a complete seam.

- `refineIntermediatePipe` preserves the entire source surface and subdivides each triangle of the Y into four, with local branch relaxation. The thin lips of the three mouths are protected: independent relaxation caused the interior/exterior skins to intersect. Material boundaries and sharp edges are also preserved. A partial/non-closed surface is not subdivided. The separate J is neither moved nor subdivided.
- `fitIntermediatePipeHoods` compacts the hoods to 85% above their base and keeps the junction lowering (1.45 units max) via a continuous deformation applied identically to coincident vertices. No hood, underside, lip, or seam faces are deleted anymore. Skin-classification flattening is removed: it also created degenerate triangles after subdivision.
- Normals recomputed across coincident vertices of different faces and materials; J source normals preserved. `createIntermediatePipes` also uses the adjusted interior indices. Removed the special flat-normal calculation on the spout and the `normalW.z < -0.9` threshold that produced a sharp bright spot inside despite the matte material.
- No changes to local extracted data, core, collisions, or timings. No new dependency, scene, light, or loop. Copies and buffers are owned/disposed by existing meshes.

Reproducible audit, with Vite running: `node scripts/audit-intermediate-pipe.mjs`. It only reads the local pipe survey and prints numbers, without exporting geometry, ROM, or heap. On the real **Y**: 352 source triangles, 1,408 after subdivision; **0 open edges, 0 non-manifold edges, 0 degenerate triangles, 0 non-coplanar intersections detected between non-adjacent faces**, with an edge tolerance of 0.000001 units. Smallest double area after adjustment: 0.0197808653. The separate J is outside this targeted audit; its model has pre-existing intersections and remains unchanged.

Validation: **`npm run check` succeeded, 596 tests / 89 files**; coverage 99.45% statements, 98.59% branches, 99.01% functions, 99.40% lines. The first pass flagged an unimported `console` usage in the new script; replaced with `stdout` imported from Node before succeeding. Non-regression tests: hollow tube with lips, preservation of closure and orientation, open mouths, absence of degenerate triangles, unit/continuous normals, duplicated vertices, and source immutability. **Chrome: 9/9 terrain tests succeeded**. Usual large-chunk warning. No Git initialized.

WebGL2/SwiftShader inspection with no JS or shader errors: three arcade framings of Level 2, four close-ups around the intakes, three around the spout, and views actually inside the pipe toward the intakes/spout. For the latter only, the study camera distance limit is lowered in the harness without changing game navigation code. Screenshots: `/tmp/mm-l2-pipe-wall-closed3-*.png`, `/tmp/mm-y-sealed-intake-*.png`, `/tmp/mm-y-sealed-inside-*.png`. The initial arcade framings precede the removal of the bright-spot threshold; intake close-ups and interior views were retaken afterward. No new full game, Safari, audio, or trackpad test run.

Next action: reload and inspect the intake from the behind-the-marble view and the spout in free view. Keep the closed source topology; do not reintroduce hood cuts or skin flattening.

## Protruding floor, Y roof, and false spikes — November 22, 2026, 11:24–11:27 screenshots

This entry supersedes the shelf extension added in the previous task: both alcove floors are completely recessed from the facade, each seven tiles by three. The lower shelf no longer protrudes three tiles in front of the wall or over the ice; its height is preserved. The build test now explicitly verifies its boundary at the x = 88 plane.

The streaks on the Y mouth roof were geometric z-fighting: both the interior and exterior skins belong to `shell`, not two separate materials. The old `interior` criterion recognized only the interior floor, leaving both roof skins on the same plane. `fitIntermediatePipeHoods` now uses source normals to preserve their orientation and 0.11-unit separation. A test covers both skins in the same material without an interior list. Imported source files remain unchanged.

The three small yellow/white spikes around the Level 1 central tower came from the SW corners of three tiles (x = 28..30, z = 24) that picked up the tower's collision profile. `practiceDisplayTerrain` extends the plane defined by NW/NE/SE when SW is abnormally raised. This removes the facets and triangular walls above the tiling. Legitimate gray spikes and arcade rules/collisions are preserved. Synthetic test for continuity, absence of raised wall, and immutability.

Validation: `npm run check` succeeded, **591 tests / 88 files**, coverage 99.45% statements, 98.59% branches, 99.01% functions, 99.40% lines. `PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`: **9/9**. No dependency changes; usual large-chunk warning. No Git repository initialized.

Chrome WebGL2/SwiftShader, with no JS exceptions or shader errors: three arcade framings of the end of Level 2, three close-ups of the Y spout (front, top, back), and three views of the Level 1 tower (back, top, side). Screenshots inspected: `/tmp/mm-l2-pipe-wall-inset-roof-fix-760.png`, `/tmp/mm-spout-skins-fixed-{front,top,rear}.png`, `/tmp/mm-opening-pits-after-{behind,top,side}.png`; before views available under `/tmp/mm-opening-pits-before-*.png`. No new full game, Safari, audio, or trackpad test run.

Next action: reload the app and check the three framings flagged by Michel. Do not reintroduce a platform in front of the lower alcove.

## Starting pits, alcoves/Y, and vacuum backs — November 22, 2026, 10:24–10:28 screenshots

- **Level 1**: the black outline around the pits came from transparent pixels in the wall atlas being interpreted as opaque. The BabylonJS 9.33.2 shader enables `ALPHATEST_AFTERALLALPHACOMPUTATIONS` with vertex colors: `useAlphaFromDiffuseTexture = true` is required to include the atlas alpha in this final test. The fix preserves existing joints and geometry. The initial diagnosis of a gap in the tiling is disproved by the GPU readout: the black pixels had the exact joint tint (24). After the fix, the tiles behind the cutout reappear.
- **Level 2**: both alcoves keep an identical width of seven tiles, verified on their world coordinates. The recess remains three tiles deep. The lower shelf is raised by 1.2 units and extended three tiles forward to form the visible horizontal platform, instead of disappearing behind the ice. The vertical distance between shelves is now 9.
- The **Y** junction is lowered locally (maximum 1.45 world units) without moving its two hoods, its other pipe, or the outlet onto the terrain. Normals follow the deformation. The flared spout has flat roof and cheeks, a distinct facet reading from the rounded shaft, and keeps 0.11 units between interior/exterior faces to avoid overlap. Imported source geometry remains intact; the adjustment is done on a copy.
- **Level 4 vacuums**: added a 90° procedural elbow between the vertical stem and the rear head intake, and closed the back of the head around this joint. The elbow is parented to the stand and extends slightly into the head to maintain a join during shaking. The mouth goes from 1.70 × 0.62 to 1.70 × 0.84 units; the shell is also taller (1.28 max). Native positions and triggers remain unchanged. No Rolling Madness asset added for the vacuums.

Validation: **`npm run check` succeeded, 589 tests / 88 files**, coverage 99.45% statements, 98.59% branches, 99.01% functions, 99.40% lines. The first full check flagged a forbidden type annotation in the browser test and then an indexing requiring explicit typing; both were fixed before full success. Usual BabylonJS large-chunk warning kept. No dependency additions; Git repository not initialized.

**Chrome: 9/9 terrain tests succeeded**, including a GPU regression that projects a transparent atlas texel onto an isolated surface: the near-black background reappears (channels < 5) instead of joint tint 24. Unit tests also verify the elbow, less-flattened mouth, seven-tile world width of both shelves, lower platform, junction lowering, spout thickness, and source immutability.

WebGL2/SwiftShader inspection: arcade framings of Levels 1–3 and pipe/ice, three close-ups of the alcoves, vacuums in front and rear close-up. No JS exceptions or shader errors in these inspections. Local screenshots: `/tmp/mm-l1-followup3-0.png`, `/tmp/mm-l2-pipe-wall-followup6-{730,760,790}.png`, `/tmp/mm-vacuum-followup-{front,rear}.png`. Michel's screenshots and the full Level 2 PNG served as references. No new audio, Safari, or trackpad test run, nor full game; geometric adjustments remain 3D interpretations of arcade views, not pixel-for-pixel equality.

Next action: reload and compare both alcoves / the Y spout against the 10:24 screenshot, then view the vacuums from behind in free view.

## Level 2 recesses and Level 3 green details — November 22, 2026

Fixes following the 05:04, 05:08, and 05:09 screenshots and clarifications on the two niches:

- Level 2: two stacked openings, with two distinct shelves seven tiles long by three deep, back wall, and side returns. A solid strip separates the openings; the wall resumes beneath the second. The Y keeps its imported branches and spout, but its two hoods are replaced by extruded quarter cylinders. Old triangles crossing the seam are clipped at the base plane. The source remains intact. Purples come from playfield 52/54/57, without white highlight.
- Level 3: removed wave height amplification (1.32×), fixed top normals, no shadows received on water and its skirts, removed overlapping tiled floor under its footprint. The live profile remains driven by arcade samples, with no new simulation; identical samples no longer rewrite buffers. Flat green is 63/126/99; reliefs use the wave sprite colors.
- Green borders no longer receive stray cast shadows and remain matte; light tint 150/195/165. The small pyramidal cap in the V increases from 0.85 units to 16 arcade units (1.633 world units). Its footprint is unchanged. Level 1/3 flags become pale yellow and black, like Level 4; Level 2 flags remain cyan.
- Dark faces of Level 3 walls now account for shadows: previously their color completely ignored the shadow term. A diagnostic ray confirms an occluding wall on the wall adjacent to the waves. Shadow contrast remains a presentation approximation.
- Level 1–3 vertical joints: four pixels centered on sixteen, instead of two. Measured in the full PNGs: repeating 12 wall pixels then 4 joint pixels, notably Level 2 line 1750 and Level 3 line 2000.

Bounded graphics readout: 64 playfield words at B00400, then 16 motion object words at B002a0. Indices 64–79 of the array correspond to MO colors 80–95. No heap, ROM, or state dump; no physics modified. Resources and plugins remain owned/disposed by the existing scene.

Validation: `npm run check` succeeded, **587 tests / 88 files**, coverage 99.45% statements, 98.59% branches, 99.01% functions, 99.40% lines. Tests added for wave amplitude/normals/profile stability, cone height, local replacement and immutability of the pipe, joint thickness; tests extended for both shelves, flags, and palette banks. `PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/browser/terrain.spec.ts`: **9/9** succeeded. The first run without a channel failed because Chromium was not installed; installed Chrome was used for the entire test run. The GPU expectation for the dark Level 3 wall is updated for its new shadow (15 instead of 24).

Chrome WebGL2/SwiftShader: ten framings of Levels 1–3, pipe/ice views, three close-ups of the niches, then two comparisons with the living core at the starts of Levels 2 and 3; no JS exceptions or shader errors found. Local screenshots: `/tmp/mm-l2-pipe-wall-revision6-{730,760,790}.png`, `/tmp/mm-l{1,2,3}-corrected-*.png`, `/tmp/mm-native-level{2,3}-details.png`. Animated waves are inspected on the study page; a full human playthrough up to the waves remains to be done. Depths are exact as requested, but the height of the second recess and the hoods are visual adjustments, not a complete extraction of arcade geometry. No pixel-for-pixel equality claimed. Safari and trackpad feel were not retested. No Git repository initialized.

Concrete next action: reload the app and compare both niches from the free view, then the waves in live gameplay on the framings provided by Michel. Keep the procedural vacuums on Level 4.

## Native palettes for Levels 1, 2, and 3 — November 22, 2026

The verification requested after Level 4 is applied to the three preceding courses. Colors come from the living core's palette, not from the full PNGs' palette. Comparative screenshots in a single session, original on the left / 3D on the right, for each start. The first level is reached with Credit/Start; the next two with their local checkpoints. No heap export, ROM modification, or physics change.

- Level 1: gray floor 180/180/180; yellow walls 255/238/0, orange 238/119/0, dark face 170/51/0. Existing pit and strip motifs/UVs are preserved; dark-facing walls recover their brown instead of turning yellow after the palette fix.
- Level 2: same gray floor; cyan walls 0/187/255, shadow 0/100/150, and dark face 0/54/90. Previously too-dark tiles are realigned. Ice keeps its basin atlas but uses the second bank's tints: cyan 0/135/135, highlight 0/255/255, shadow 0/45/45. White highlights are removed; highlights on blue pipes are reduced.
- Level 3: sand floor 210/182/140; dark-gray walls 45/45/45, 36/36/36, 24/24/24, dark-sand joints. Towers and arches keep their motifs, realigned to this palette. Waves and green borders use the second bank (99/143/121 flat, 187/221/187 lit). The copper pipe keeps its model/position/diameter, with a softer highlight.

`emulation/level4Palette.ts` becomes `terrainPalette.ts`: same bounded and verified 32-word readout, same reuse of the unchanged array, but available across all courses. `practicePose` publishes the palette for each level and `createLivePracticeView` forwards only its changes. `TerrainPalettePaint` shares uniforms and their updates; `ArcadeTerrainPaint` distinguishes floor, wall, tower stone, green, and ice. Level 4 keeps its own colors and local shadow mask. Grain remains procedural; inherited vertex colors no longer double-light floors. Stones are matte. PCF filtering and a 0.02 normal bias reduce shadow artifacts without a new sun or map; NullEngine uses the Poisson fallback provided by BabylonJS.

Validation: `npm run check` succeeded, 584 tests / 86 files, format, lint, TypeScript, coverage, and build. Six new unit tests verify palette transport for the three courses, array reuse/immutability, and uniform updates for both banks without new resources. The terrain browser suite passes 9/9: three new cases measure floor and dark-face pixels (180/180/180 and 170/51/0; 180/180/180 and 0/54/90; 210/182/140 and 24/24/24) on synthetic terrains without ROMs. The Level 4 shadow/palette regression remains included and passing. An initial `check` hit concurrent recreation of `test-results` by Playwright; the full check was then run separately.

GPU: Chrome WebGL2/SwiftShader; live comparisons at the three starts, then ten study arcade framings and the two dedicated Level 2 pipe/ice views, with no JS exceptions or shader errors. Screenshots `/tmp/mm-native-level{1,2,3}-after.png`, `/tmp/mm-l{1,2,3}-final-*.png`. Shadow silhouettes and material grain remain 3D approximations; full equality with original tiles is not certified. No new local shadow mask was added on these levels. Trackpad comfort and Safari were not retested.

Next action: human comparison after reloading, notably Level 3 charcoal walls, Level 1 brown faces, and cyan ice.

## Living core palette and left-side finish shadow — November 21, 2026, 22:14/22:16 screenshots

This fix replaces the color calibration from the previous entry: the full PNG remains a geometric and shadow-silhouette reference, but its palette is not that of the Web core during gameplay. Michel's two views are indeed original on the left / 3D on the right. A local core screenshot confirms coral walls 255/68/51, their shadow 187/51/34, their dark face 119/34/17; finish walls are amber 255/187/0, with shadow 221/136/0 and dark face 153/102/0. Light floor is 180 and vertical joints 70. The initial ramp goes from brown 75/70/60 to beige 165/143/110 and light pink 255/204/204 depending on orientation, unlike the uniform bronze used previously.

`level4Palette.ts` reads only the 32 useful entries from graphics RAM B00400, via the verified pointer of the pinned binary. It checks both tables B00000..B007ff, their handlers, the pointer, and its bounds. The `IIIIRRRRGGGGBBBB` decoding reproduces native intensity. An unchanged palette reuses its previous array. `practicePose` passes it to `createLivePracticeView`, then to the uniforms of `Level4CliffPaint` and `Level4GoldPaint`, only on change. The study scene uses the same measured tints as a fallback. Grays are brightened toward the native 180 floor. Stone and tracks remain matte. No ROM byte, input, or arcade rule is modified.

The large left exterior wall X=90, Z=72..90 meets no obstacle toward the sun in the reconstructed geometry (rays verified). The shadow visible in the original tiles is therefore supplemented by a local mask fixed to this wall's coordinates. Its boundary is measured from the full PNG: H=16213/16203/16193 at Z=72.5/73.5/74.5; plateau H≈16187 at Z=75.5..78.5; diagonal resumes at Z=79.5. The mask combines via minimum with sun visibility; it removes no 3D shadows and adds no invisible wall, texture, shadow map, observer, or GPU pass. It stops before the posts of the second overpass.

Validation: `npm run check` succeeded, 578 tests / 85 files, coverage, lint, TypeScript, and build. Three new unit tests cover decoding, invalid memory, palette change/reuse, immutability, and passing to uniforms of both materials without resource creation. The "large yellow wall" GPU test passes on a synthetic grid without ROMs and checks pixels 221/136/0 in shadow and 255/187/0 in the lit zone. The terrain browser suite passes all 6 tests, without personal ROMs.

Chrome WebGL2/SwiftShader: six study framings with no JS exceptions and live comparison at start (same arcade session, arcade cameras, active capture). Screenshot `/tmp/mm-live-native-comparison.png`; study `/tmp/mm-l4-shadowpalette-{0,160,320,480,640,784}.png`. Live readout confirms starting palette words F721/FB32/FF43. No heap export was performed. The mask is a local restoration of the arcade shadow, not proof of missing geometric occlusion. Other silhouettes and tile grain remain procedural approximations.

Next human validation: reload the view and compare the start and then the large left finish wall. The color reference is now the living core, not the full PNG with a different palette.

## Level 4 palette and materials — November 21, 2026

Comparison against `MM_original_levels_full_views/MarbleMadness_Level4.png` across six arcade framings covering the level (scrolls 0, 160, 320, 480, 640, 784). PNG color sampling, then comparison of pixel families after joint alignment and arcade aspect correction (5/3 in X, 1.75 in Y). This diagnostic is not pixel-for-pixel equality: shadows, filtering, procedural joints, and some silhouettes differ.

`Level4CliffPaint` now uses native colors: orange 204/68/0, shaded orange 153/34/0, dark red 102/0/0, yellow 255/255/0, ochre 187/153/0, and dark-face yellow 136/102/0. Vertical joints remain gray 102. Existing friezes, low yellow walls, and geometry fixes are preserved. Light/shadow mixing uses the `key` map, removing the unshadowed hemisphere contribution. The palette limits brown shifts and blacks on dark faces; it is a presentation arcade treatment, not a core change or a new sun.

Tiles become neutral, slightly brighter, and matte. Hemisphere fill for Level 4 alone is set to 0.30 with a neutral ground. Golden ramps keep lit normals but drop the per-vertex color boost inherited from Level 2, which washed out the right slope. Their diffuse/emissive component limits contrast and keeps the bronze tone. Stone has no specular; the imported catapult is fixed to pure red despite its pink 255/68/68 source texture, with a very faint red highlight. Imported hammers no longer have a white highlight. Procedural vacuums kept; no asset substitution, new texture, or new loop.

Automated validation: 16 targeted tests succeeded, then `npm run check` (575 tests / 83 files, format, lint, TypeScript, coverage, and build). Tests notably check no specular on stones, gray neutrality, no vertex over-lighting on golden ramps, and the red material on imported catapult poses.

GPU validation: Chrome WebGL2/SwiftShader, six framings, no JS exceptions. Measured medians in comparable families: orange 190/80/32 → 204/68/0; red 93/14/7 → 102/0/0; yellow 241/218/36 → 255/255/0; dark yellow face 68/65/7 → 136/102/0; light tile 144/144/146 → 168/168/168 (target 170/170/170). These numbers do not prove every shadow matches. In particular, some large yellow walls remain too bright compared to the reference ochre: shadow distribution still needs refinement. Tests with sun angle and adding main tiles to shadow casters did not improve this enough, so they were not kept.

Local screenshots `/tmp/mm-l4-calibrated-{0,160,320,480,640,784}.png`; baseline `/tmp/mm-l4-before-*.png`, diagnostic `/tmp/mm-color-audit.py`. Next human validation: side-by-side comparison of deep yellow walls and mechanisms in gameplay. Palette calibration is complete; full fidelity of shadow silhouettes is not claimed.

## Level 3 initial corridor floors and walls — November 21, 2026, 21:34/21:35 screenshots

The defect is reproduced from behind the maze, as in Michel's screenshots. The survey contains 43 cells where SW samples the plateau at 16384 while NW/NE/SE belong to the lower corridor. `terrainMesh` then built an inclined tile triangle all the way up to the top of the wall, very bright under lighting: these false ramps appeared to slice through vertical walls and floors.

`level3DisplayTerrain` now reconstructs SW from the plane of the other three coherent corners, only within maze X=16..42, Z=18..44, when that corner matches the plateau and the other three remain clearly below. The other three heights are unchanged: small native slopes are preserved. The large exit ramp and later reliefs keep their handling. Walls from the new edges are vertical, and neighboring floors join with no interior cliff or raised triangle. No changes to core, original survey, materials, or shadows.

Validation: `npm run check` succeeded, 575 tests / 83 files, coverage, lint, TypeScript, and build. New tests reproduce two adjacent tiles with a stray corner, check floor and wall normals, absence of interior wall, preserved gentle slope, exit ramp, and no effect on a cell outside the sector. The source survey is unmodified. Chrome WebGL2/SwiftShader: wide free view, reversed close-up view, and opposite view, with no JS errors. The diagnostic on the real survey counts 43 fixes; it finds no such pattern outside the repaired sector. Screenshots `/tmp/mm-2135-after-wide.png`, `...-detail.png`, `...-reverse.png`, with corresponding `before` screenshots for the wide and reversed views. Final shadow filtering and bias remain existing settings: the fix addresses geometry triangles, not masking shadows.

Next action: compare the reloaded free view to Michel's and traverse the corridors in gameplay to confirm visibility comfort.

## Pipe and block shifted by one tile — November 21, 2026, 21:24 screenshot

Michel's photo shows seven tiles before the side block, versus six previously. The pipe and block are moved together by one tile toward +Z (right on screen). The previous conduit width fix and procedural vacuums are preserved.

- The three-row block now occupies Z=76/77/78, X=76..78, at 16320. The old row Z=75 returns to the lower level at 16196. This adds one tile on the edge of the large platform before the block (Z=69..75).
- The opening still measures 3×4 tiles, but occupies Z=79..82. Its Z=83 end touches the existing high platform directly: no empty one-tile strip on the right. Stray corners from the old survey are flattened to the lower level beneath the funnel, without removing its low floor.
- Pipe shell and liner receive the same `position.z = 1` offset. Imported data remain intact; widened diameter and height remain those from the previous fix. No changes to the arcade core.

Validation: `npm run check` succeeded, 573 tests / 82 files, coverage, lint, TypeScript, and build. Tests for the seven approach tiles, the three shifted high rows, closure at Z=83, no modification to the source survey, and bounds of the two translated meshes. Chrome WebGL2/SwiftShader at 540 px, no JS errors. Screenshot `/tmp/mm-2124-level3-pipe.png`: three-tile block moved with the funnel, right lip joined to the platform.

To do with Michel: compare the reloaded view to his 21:24 screenshot and verify the marble's passage in a real game after this visual realignment.

## Inventory, Level 3 pipe, and procedural vacuums — November 21, 2026, 19:23/19:33 screenshots

Michel explicitly asked to keep procedural vacuums. No Rolling Madness model, texture, or `hoover` sound is wired in. The actually used inventory is now at the top of `public/assets/README.md`, with loaded-but-unused models distinguished from selected models.

- `widenLevel3Pipe` increases the vertical conduit diameter by 22%, with smooth transition to the preserved lip and bend/outlet. Positions and normals are copied; the original imported geometry remains intact. The octagonal conduit also needed to clear the marble between flats, not just have a large enough maximum radius.
- The 19:33 photo shows three tiles between the left edge and the funnel, versus two in the scene. `level3DisplayTerrain` restores Z=75 to 16320 for X=76..78: the high rows are Z=75/76/77. The mouth still starts at Z=78; the pipe is not moved and its opening remains clear.
- `createLevel4Vacuums` now owns the six procedural vacuums, their shared materials, and their meshes (disposed with the scene). Rectangular head with slight corner curvature, stepped lip, shallow golden back with four dots, flat-faced conduit, and three ribs. The top of the head stays near the old version's height.
- `readLevel4VacuumMouthFrames` reads the two active frames emitted at +0x42: tables `0x22016/0x2201a` or `0x220a6/0x220aa` depending on type. The signal goes through `PracticePose.vacuumMouthFrames` and the existing setter. Only the head oscillates slightly (position/rotation/squash) when the vacuum is fully raised and in its active loop. Retraction and reset cancel the effect. No live clock or observer added; the vertical pipe remains fixed. Suction fragments follow the moving nozzle target.

Validation: `npm run check` succeeded, 572 tests / 82 files, coverage, lint, TypeScript, and build. Tests for marble clearance against conduit flats, lip/outlet/source preservation, exact three rows, emitted frame distinct from next frame, head-only motion, reset, and live view wiring with fragments. Chrome WebGL2/SwiftShader: Level 4 at 180/250 px, Level 3 at 540 px, no JS errors. Both injected native phases give distinct visual positions; these tests are not a full suction replay. A sphere of diameter 1.35 placed inside the conduit at (18.5274, -9.5, 20.9958) is occluded: zero blue pixels detected; removing the pipe meshes reveals 2099 blue pixels, confirming the test sphere is rendered. Screenshots `/tmp/mm-1923-vacuum-180.png`, `...-250.png`, `/tmp/mm-1923-level3-pipe.png` (with the three rows), and `/tmp/mm-1923-tremor-0.png` / `...-1.png`.

To be validated by Michel: likeness of the new vacuums against his photo, and actual marble passage through the pipe during a game. Rules and collisions remain those of the arcade core; only presentation is adjusted.

## Profiles of the two arch pairs — November 21, 2026, 19:12 screenshot

Profiles are realigned against the full arcade reference, using adjacent tiles as landmarks. Three-tile spans, spacing between the two piers, 0.1-tile thickness, and platform joins are kept.

- First pair: lowered intrados, crown at 16255 and ends at 16249, for a top at 16264. The fascia was much too thin.
- Second pair: raised intrados, crown at 16262 and ends at 16256, for a top at 16272. The fascia was too thick.
- Curve changes from `sin(pi*t)^0.55` to `sin(pi*t)`: less-bulging shoulders, crown transition closer to the drawn profile. Thin tops are gray.
- Previously restored end walls and shadows remain in place. No changes to physics, camera, or shadow resources.

Chrome comparison at 570 px, same horizontal and vertical scale as the page framing (the full-level raster must be stretched vertically by 5% compared to uniform scaling). Overlay screenshots `/tmp/mm-arch-overlay-calibrated.png`, render `/tmp/mm-arch-model-after.png`, reference `/tmp/mm-arch-original-calibrated.png`. Do not draw conclusions from a uniform overlay: it adds a slope offset at joints. At 570 px: image left 76 px, top -2021.35 px, size 960×3580.5 px; check crop (450,250), 450×570 px in the 1120×840 window. Three checks on the front contour of the first pair give an error of 0/0/1 screenshot pixels, versus 20/18/21 before the fix. Two points on the second pair give 1/0 pixels, versus 27/25 before the fix. Pixel edges, lighting, and tint are not certified identical to the original.

Validation: `npm run check` succeeded, 568 tests / 79 files. The new test measures seven profile points on each of the two pairs from vertices, with a one-arcade-height-unit tolerance for the native raster staircase. Chrome WebGL2/SwiftShader with no JS errors; both pairs and the curved shadow are visible in the screenshot. Next action: compare the reloaded view against Michel's 19:12 screenshot and the local overlay.

## Curved shadow, axle, and Level 3 GOAL — November 21, 2026, 19:00 screenshots

All three requests are fixed and verified in Chrome:

- The `openLevel4Bridge` cutout also removed the end walls of the banks X=87/90, Z=91..95. They are preserved; only the large faces along the arches are opened. `level4-landing-cliffs` again receives shadows from the existing sun. The right wall now bears the curved silhouette of the pier. No new light or shadow map added. `splitLevel4LandingWalls` also keeps full quads, because wall colors depend on the upper edge of each face. The old per-triangle copy was incompatible with this classification.
- `fitCatapultAxle` shortens the transverse ends of the imported axle. The mask is determined in the rest pose and kept for all poses: cup and arm remain intact, even during throw. The original local library is not modified.
- The last study scroll of Level 3 moves from -15440 to -15336, i.e. a slider from 736 to 840 px. The full GOAL plate now fits in the arcade framing, with a 32-native-pixel margin below its bottom corner. Live scroll remains supplied by the core; it was not capped here.

Validation: `npm run check` succeeded, 567 tests / 79 files, coverage, lint, TypeScript, and build. Tests for preserving both walls, receiving and casting on the same map, quads/colors, axle shortening across multiple poses without altering source/cup, GOAL in the final frame. Chrome WebGL2/SwiftShader at Level 4 scrolls 510/620 and Level 3 scroll 840, no JS errors. Removing only the low arches from shadow casters changes 4380 pixels in the right wall window (RGB > 6), confirming their contribution. Local screenshots `/tmp/mm-1900-level4-510.png`, `...-620.png`, and `/tmp/mm-1900-level3-goal.png`. The projection remains 3D-computed; its silhouette is not certified pixel-for-pixel identical to the arcade drawing.

Next action: compare the reloaded app to the 19:00/19:01 screenshots. The existing Vite server remains available at `http://127.0.0.1:5173/terrain.html`.

## Hammers, U-support, arches, and finish — November 21, 2026, 18:35 to 18:38 screenshots

Michel's six points are addressed:

- 68010 audit of hammers: the 15-entry table repeats sprites at steps 3/4 and 8/9/10/11 and returns to initial sprites at steps 13/14. Imported models and procedural fallback now respect these repetitions. The RAM reader mainly uses **+0x42/+0x44**, the frame actually emitted by `0x13334..0x13440`, rather than +0x3e, which `0x132e0` already advances to the next frame. Zone-change activation and waits remain in the core; no live clock added. Detailed evidence in DECISIONS.
- The top of the six blocks of the U-support shares a solid gray material, without texture or joints (`level4-catapult-rim-top`), owned by the scene. Vertical face joints remain in place.
- Both arch pairs receive sun shadows and remain in its shadow-caster list. The internal-face palette mask preserves their light reaction, instead of forcing the dark exterior red onto them. Approved geometry and dimensions are preserved.
- Low finish faces (top <= 16228 and sector X+Z >= 146) are yellow across their entire height. Classification is constant per face; tall walls keep the boundary and red/yellow stippling.
- Level 4 finish flags: pale yellow/black checkerboard and yellow poles.

Validation: `npm run check` succeeded, 565 tests / 78 files, coverage, lint, TypeScript, and build. Targeted tests for the RAM reader (emitted frame distinct from next frame), pose repetitions, retracted end, procedural fallback, shared textureless gray material, both receiving arches, yellow low walls, and checkerboards. Chrome WebGL2/SwiftShader at scrolls 510/620/784, no JavaScript errors. A/B checks for sun, shadow reception, and shadow casting; see VALIDATION for measurements and limits.

Limitation: Rolling Madness mesh poses remain an adaptation of the sprites; timings and triggers are those of the core. The MAME probe still confirms creation of the four objects; teleportation attempts did not produce a full native traversal/strike replay. Trigger and wait analysis therefore relies on disassembly, not such a replay. To do with Michel: a played traversal of the zone to visually assess strikes and collisions together. The app is available on the existing Vite server, `http://127.0.0.1:5173/terrain.html`.

## Start: stray frieze, contact line, and large wall shadow — November 21, 2026, 18:00/18:02 screenshots

Three presentation fixes based on Michel's new screenshots:

- The yellow/stippled frieze is no longer applied to the cliffs of the first sector. The mask now requires X+Z >= 120. The leftmost wall remains orange all the way down; downstream zones keep their yellow and frieze.
- The line under the left arm was a false contact self-shadow on facade X=22, Z=18..23. This facade resumes the uniform orange tint of the reference, with joints preserved. Other faces remain lit. Starting Z faces keep their dark red with no artificial dark diagonal; shadow driving in subsequent sectors is kept.
- Deep walls of the crossing again receive the sun's (`key`) full shadow map. It includes the large cliffs, jump ramps, and their walls. The small local map excluded contributions needed for the large right wall: `createLevel4JumpShadows.ts` is removed, along with its exclusion of receivers from main lighting. This also removes an extra light and shadow texture. Large walls remain casters and receivers in the same map.

The non-regression test verifies connection of the walls to the full map, presence of cliffs and jump ramps among casters, no receiver exclusion, and scene cleanup. Arcade rules, positions, and geometry dimensions do not change.

Validation: `npm run check` succeeded, 563 tests / 77 files, coverage, lint, TypeScript, and build. Chrome WebGL2/SwiftShader: scrolls 0, 160, and 620, no JS errors. Image check finds no yellow pixels in the examined left-wall area and confirms yellow in the downstream sector. The facade under the left arm is orange at both check points that were dark. Sun shadows on/off comparison changes 6211 pixels in the examined right receiver area.

Screenshots wait for the scene and then several frames of the normal loop; do not add a concurrent manual `scene.render()` during this check. Shadow layout remains a 3D projection, with no pixel-for-pixel identity with the arcade drawing. Next action: compare the reloaded app against the 18:00/18:02 screenshots, particularly the diagonal of the large right wall.

## Slope join, lighting, and start comparison — November 21, 2026, 10:13 to 10:25 screenshots

The X=82 join of the second zone no longer contains a red step: the X=80..82 landing is at 16264 and all four lines of the slope start at this exact height. Edges reach 16272 at X=87, center 16276. `level4LandingNormals` keeps a shared lighting normal for both triangles of each tile on the small landing/slope. Residual survey variations no longer form tint diagonals. This remains a presentation fix, with no modification to arcade rules.

Analysis of the local `lev4.ase.mesh` showed that the large incoming walls had to continue to corner (22,23). Removing them had created the black cavity reported by Michel. They are restored, along with both faces of the lower gray paths. Only the outgoing arms remain cantilevered. The reference clearly distinguishes these arms from the incoming ramps.

Lighting of visible back faces was incorrect: the cliff material now has `twoSidedLighting=true`. Visible X faces are orange, Z faces dark red, without the bright red patches introduced by the intermediate fix. Ambient paint remains modulated by shadows. RGB landmarks in the provided screenshots: original dark red 93/14/7, rendered 95/14/7; original orange 189/78/32, rendered 190/80/32. These are samples from the PNG images, not a display color calibration.

Deep starting walls are now separated from the fascia into `level4-jump-ramp-walls`. They receive jump ramp shadows via `createLevel4JumpShadows`, directional light and 2048 local map owned by the scene. Sun direction remains that of the level. The wall is excluded from global directional lighting to avoid double lighting; it remains a caster in its global map. The local map contains the golden floors and their fascias, without self-shadowing from the large walls. Chrome comparison with/without local shadow gives 1420 modified pixels in the examined receiver area. Shadows are recomputed in 3D; their contour does not reproduce the arcade drawing exactly.

Comparison with `MarbleMadness_Level4.png`: 5/3 scale overlay, translation (76,-1) on an 1120×840 screenshot. Outgoing golden arms measure 5 tiles on the left side of the screen and 3 on the right; underlying gray paths extend 9 and 7 tiles, i.e. 4 tiles longer each. Arm UVs repeat once per tile. Gray of vertical joints is raised to 102/255 and their strip to 4 texels out of 16, matching the 4-pixel bars on a 16-pixel pitch observed in the native full view. End-face joints are 0.085 wide and the same gray. Golden floor joints are ochre (min tone 122), not near-black.

Validation: `npm run check` succeeded, 563 tests in 77 files, lint, typecheck, coverage, and build. Tests for shared edges, no step wall at slope join, identical normals per tile, preserved normals elsewhere, restored walls, tile counts via UV, local shadow reception and casting, resource disposal. Chrome WebGL2/SwiftShader: 0/160/620 px views, then start overlay comparison, no JS errors. Views 510/784 had also been verified during the batch. An arcade traversal is not a new validation of this task.

Next action: compare the reloaded render to the 10:25 screenshot while keeping arcade framing. The control overlay is in the temporary file `/tmp/mm-start-original-overlay.png`; it serves to check landmarks, not to certify pixel-for-pixel identity.

## Second arch joins and jump ramp joints — November 21, 2026, after 09:55/10:00 screenshots

Previous fixes had flattened the strips on the wrong side of the overpass and added a slope above the arches. Original screenshots and survey heights show two flat tiles at 16260 in Z=92..94, framed by a one-tile slope on each side (Z=91..92 and 94..95), with outer edges at 16272. This profile is restored on X=90..94. Both arches of overpass X=87..90 now have a horizontal top at 16272, joining these edges flush. The longitudinal slope added on their first tile is removed.

Both rows of the large inclined plane X=94..98 now share the same vertices, from 16260 to 16228. Erroneous SW corners no longer produce the triangular crease at the landing join or at the foot. The join of the other landing X=82..87 meets its outer edge at 16272 and picks up the upstream edge at 16264, with both bevels preserved.

Local overpass paint is red on the longitudinal walls, with the red/yellow frieze at level 16228; the global diagonal lowering of the frieze no longer applies to this zone. The relief remains lit. `splitLevel4LandingWalls` isolates the small landing walls from global shadow-map reception: self-shadowing streaks observed in Chrome disappear, while the walls remain shadow casters onto the lower corridor. Their triangles are removed from the main cliff mesh.

`createLevel4RampEndJoints` adds a gray mortar outline on the exposed vertical faces of the two suspended terminal cubes (Z=27 and X=28). Strips are 0.055 units wide with an outward offset of 0.003 to avoid face overlap. The unlit material preserves joint legibility against the red background. Mesh and material belong to the scene, with no extra observer.

Validation: `npm run check` succeeded, 560 tests in 76 files, V8 coverage above thresholds, lint, TypeScript, and build. Non-regression tests for constant arch height, both flat tiles and slopes, top/bottom joins of the large inclined plane, joints and their cleanup, and separation without duplication of the landing walls. Chrome WebGL2 rendered scrolls 0/510/620/784 px with no JS errors; screenshots inspected. Rendering and geometry tests do not constitute a new arcade traversal. Next action: compare in the reloaded app the start and second overpass zones against the last two original screenshots.

## Ramps, two overpasses, and hammers — November 21, 2026

Requests from the 09:13 to 09:24 screenshots are addressed in presentation only. No changes to ROMs, collisions, or arcade simulation.

- Start: removed both solid supports under the golden ramps. Fascias and undersides remain, with a single underside at the crossing. Supports of the lower gray path are preserved. Global shadow PCF filtering and removing self-shadowing from fascias reduce acne.
- First overpass: top of both strips drops from 16268 to 16264 to meet the platform level. The inner ridge is preserved.
- Second overpass: indices are flipped for the X axis. Normals were inverted relative to the Z-axis overpass; the front arch was lit like the background and lost its contour. Both bevels of landing X=82..87, Z=91..95 are rebuilt, with coherent joins to the central rows. The entry bevel of the strips meets the bank at 16272 then descends to 16260.
- Hammers: rank moves from X=104 to X=105, with imported anchor at 105.45 and Z=102.5/104.5/106.5/108.5 (tiles 10/8/6/4 from bottom), orientation flipped from π to 0. Used model remains `hammer.ase.mesh` from Rolling Madness. The RAM reader converts integer coordinates by dividing by eight. Local live loop was removed; without an active native frame or after reset, hammers are hidden. Procedural fallback also receives native frames and no longer loops in game mode.

**Correction to earlier handoff notes:** hammer creation follows scroll slices (table `0x1dfd4`, entry 40..64). Native entry into zone 10 then wakes their scripts. The old local animation "visible from F4" and the old reader comparing 102 directly to RAM coordinate 816 prevented proper synchronization. Evidence and MAME probe limits are in `docs/DECISIONS.md`.

Validation: `npm run check` succeeded, 557 tests in 76 files, business-logic coverage above thresholds, lint, typecheck, and build succeeded. Tests added for front arch normals, first overpass height, both bevels, absence of overlapping undersides, and clockless hammer driving. Chrome WebGL2/SwiftShader: screenshots at scrolls 0, 510, 620, and 784 px, no JS errors. A second browser check injects RAM records in real format: all four poses 2/6/9/12 are visible at the new anchors and remain unchanged across 20 render notifications. This is a rendering test, not a full native game.

Concrete next action: Michel can replay F4 and compare the zone 10 crossing against native strikes and collisions. Choice of Rolling Madness poses remains a visual match to arcade frames; in-situation motion fidelity still needs to be assessed on a played traversal.

## Two thin-arch overpasses — November 20, 2026 evening fix

`npm run check` succeeded with 553 tests.

Reading of Michel's screenshots and local mesh `lev4.ase.mesh` from Rolling Madness 3D. Edge strips measure 0.1 tile in the reference model on both sides of the overpasses. Their intrados features tall jambs and a gently curved arch. The previous half-ellipse started from the floor and produced an overly bulky vault.

First overpass borders remain at X=76 and X=79 on Z=78..81. Cliff removal is fixed for these faces, which were not the ones removed by the old filter. The profile is lowered in the center with tall ends, and top faces of the strips are closed. For the second overpass, the upper tiling added at X=87..89/Z=91..94 is removed. The lower corridor remains at 16228 and both thin strips border its crossing. Lower corridor walls have a single owner to remove overlapping surfaces.

Strips receive directional lighting and cast shadows. Their self-shadowing via the level map is disabled: that map produced artifacts on these 0.1-unit faces. Height proportions are an adaptation of the reference model profile to the arcade survey. Chrome check at scrolls 510 and 620 px. Traversal and free view remain to be validated by Michel.

## Side walls under second arch, deck bevel join, and jump ramps — November 20, 2026

- **Walls under the lower corridor of the second arch (`X = 87..90, Z = 88..97`)** (`src/rendering/createTerrainStudy.ts`, `src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createLevel4Materials.ts`):
  - `createTerrainStudy.ts` now generates `level4-underpass-cliffs` for both outer walls of the lower corridor (`X = 87` and `X = 90` on `Z = 91..95` at height `16228`) so the lower tiling under the arch rests on real textured cliffs rather than floating in empty space.
  - In `createLevel4ArchBridge.ts`, `openLevel4Bridge` removes the residual internal step at `X = 87` across the full width `Z = 91..95` of the upper bridge, and the crest of both `level4-lower-bridge-arches` follows the left bevel `X = 87..88` (`16276 -> 16260`) up to the flat deck `X = 88..90` (`16260`).
  - In `createLevel4Materials.ts`, borders `Z = 91` and `Z = 94` on `X = 90..93` are kept flat at `16260` in exact alignment with the upper deck (`Z = 91..95`).
- **Golden jump ramps detached from the floor (`X = 22, Z = 19..26` and `Z = 23, X = 19..27`)** (`src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLevel4Materials.ts`):
  - In the 2D survey (`local-roms/level4-terrain.json`), a single height per tile (`16344`) overwrote both lower gray paths (`16320`) and generated solid cliffs beneath the two golden jump ramps crossing at `(X = 22, Z = 23)`.
  - `level4DisplayTerrain` keeps the last tile `(X = 22, Z = 26)` horizontal at `16344` in mid-air; `createTerrainStudy.ts` extends both gray paths (`level4-floor` at `16320`) beneath the jump ramps to their corner-to-corner junction at `(X = 23, Z = 24)` and adds `level4-top-surface` to shadow casters (`shadows.addShadowCaster(topFloor, false)`).
  - `openLevel4Bridge` removes solid walls under both cantilevered jump ramps and `createLevel4ArchBridge` builds `level4-jump-ramp-fascia`: thin side and end fascias (`0.85` units below `toY(16344)`), horizontal undersides for crisp cast shadows onto gray paths and cliffs, and recessed cliff walls (`X = 22, Z = 19..24` and `Z = 23, X = 19..23` under the upper crossing; `X = 23, Z = 24..31` and `Z = 24, X = 23..32` under the gray paths).
- **Validation**:
  - Visual check in Chrome WebGL2 on `terrain.html` (Level 4 at scroll `0 px`).
  - `npm run check` (`prettier --check`, `eslint --max-warnings 0`, `tsc --noEmit`, `vitest run --coverage` with `553` passing tests across `45` files, `vite build`) completely green.

## 3D hammers visible from F4, double-arch crossing, catapult bottom, and vacuum retraction — November 20, 2026

- **3D hammers visible from `F4` and synchronized in zone `10`** (`src/rendering/createRollingHammers.ts`, `src/rendering/createRollingHammers.test.ts`, `src/emulation/level4Hammers.ts`):
  - Until the marble reaches zone `10` (`0x23b28: X ≈ 102, Z ≈ 99`) in game mode (`F4`), the 68010 core has not yet instantiated the 4 RAM hammer slots (`kind = 0x0c`, `id = 0x0a`). `createRollingHammers` now animates a phase-offset local cycle on the 4 hammers while no RAM slot is active (`hasActiveRamHammers === false`), then automatically switches to native RAM pointers (`0x20c14` retracted under the track and `0x22346..0x2237e` striking) as soon as the marble enters zone `10`.
  - In study mode (`terrain.html`), slots `0` and `2` (spaced `4` tiles apart) remain displayed in cocked pose (`pose 6`) at scale `0.088` per `MM_original_levels_full_views/MarbleMadness_Level4.png`.
- **Upper/lower crossing of the second arch (`X = 87..90, Z = 91..95`)** (`src/rendering/createLevel4ArchBridge.ts`, `src/rendering/createLevel4ArchBridge.test.ts`, `src/rendering/createLevel4Materials.ts`, `src/rendering/createTerrainStudy.ts`):
  - The 2D height-grid survey kept only one height per tile (`16228`, that of the lower corridor) at crossing `X = 87..89, Z = 91..94`, which cut off the upper deck (at `16260`) and left the arch flush against a red wall.
  - `level4DisplayTerrain` restores the continuous upper deck at `16260` on `X = 87..89, Z = 91..94` (with the one-tile dark step at `X = 87` descending from `16276` to `16260`), `createTerrainStudy.ts` adds the lower corridor tiling (`level4-underpass-surface` at `16228`), and `createLevel4ArchBridge.ts` orients both `level4-lower-bridge-arches` along the `X` axis at `Z = 91` and `Z = 95` (`openLevel4Bridge` removing solid walls under the bridge).
- **Catapult cup bottom at rest** (`src/rendering/createRollingCatapult.ts`):
  - `baseHeight` raised to `2.1 * scale` so the cup rests above the tiling with no gray tile piercing the red bottom at rest, while keeping the `nativeThrowToPose` (`1..20`) table for the fast `3`-frame lift on launch.
- **Vacuum setback and vertical travel** (`src/rendering/createLevel4Materials.ts`, `src/rendering/createTerrainStudy.test.ts`):
  - Set the 6 vacuum stands back to `1.16` units from the center of the border tile (`0.66` units outside the cliff), reduced vertical retraction travel to `1.1` units, and hid below threshold `extension < 0.35` so the horn never appears to pass through the tiling on descent.
- **Validation**:
  - Visual check in Chrome WebGL2 on `terrain.html` (Level 4 at scrolls `280 px`, `500 px`, `620 px`, and `784 px`).
  - `npm run check` (`prettier --check`, `eslint --max-warnings 0`, `tsc --noEmit`, `vitest run --coverage` with `553` passing tests across `45` files, `vite build`) completely green.

## Reduced downstream arches and recessed cylinder heads — November 20, 2026

Initial placement of the arches under the cylinder platform was wrong. The span is now placed under transverse section X=73..75, Z=78..80, at arcade height 16228. It measures three tiles and descends 2.3 presentation units. Both sides are oriented on constant Z and the high platform regains its solid faces.

Red motifs start from the boundary between yellow and orange. Their lower edge is on this boundary and yellow forms a small raised lip around it. Retracted heads are now wider flat disks, with a dark-gray circular joint and no specularity. Minimum gray for Level 4 tiling joints is raised.

Geometry tests adapted to the new location and reduced height. Bridge traversal and rendering from all angles remain to be validated in-game. Terrain geometry remains a visual adjustment from screenshots.

## Arches, cliff paint, flush cylinders, and shadows — November 20, 2026

`npm run check` succeeded with 551 tests.

The scene displays two arches under the deck of tiles X=76..78, Z=72..77. Solid faces on both sides were removed in this section. All 36 cylinders have a metallic-gray circular head flush with the tiling, including while waiting. Shafts remain driven by native slots.

`level4CliffPaint` colors walls orange at the top and yellow at the bottom, with a dashed border. Split height and downstream progression are presentation settings estimated from the full view. Their exact calibration remains to be compared. The plugin also applies to the arches and catapult support.

The catapult support no longer adds a coplanar face under the top of the outer cliff at X=62. Joint textures are explicitly repeated in world coordinates to eliminate large gray areas. A directional light with the same direction and intensity as the sun illuminates only the two imported catapult meshes, with a 2048 local shadow map and PCF filtering. The general sun excludes these two meshes to avoid double lighting.

Chrome displayed caps and arches at scrolls 440 and 510, no JS errors. Scene tests verify wall clipping, arch construction, and caps at rest. A full F4 playthrough and human tuning of the color split remain open.

## Masonry support and extended conduit — November 20, 2026

The catapult support is now a U-shaped relief in plan view, with three gray copings and walls descending to the base of the cliffs. Faces reuse the cliff material and align their joint UVs to the world grid. The old posts and small baseplate were removed. The imported catapult keeps its poses.

Visual check in Chrome completed, no JavaScript errors. `npm run check` succeeded with 550 tests.

Comparison with `hoover_down` shows a long conduit whose bottom stays fixed across poses. The procedural conduit was extended downward so its end remains below the track. The horn moves forward an additional 0.3 units. The throat back was also moved forward to clear the tube mouth. All six orientations follow the same assembly.

Tests verify wall extension, support materials, pipe bottom, and horn advance. Next in-game check: observe extension and retraction of all six vacuums from F4.

## Imported catapult with author's permission — November 20, 2026

Michel confirms having contacted the author of Rolling Madness 3D and obtained permission to reuse his models. The catapult now uses `catapult.ase.mesh`, `catapult_throw.ase.mesh`, and `catapult.PNG` from local extraction. Other entries in the local library were preserved. The extraction script includes both models and resolves texture filename casing.

`createRollingCatapult` installs scene-owned meshes and binds their poses to the native frame number. The procedural cradle remains visible. The procedural arm and cup remain available as a fallback when the library is missing. The old version is also preserved under `docs/backups/level4-catapult-procedural.ts.txt`.

Integration is available in-game and in the study scene. The NullEngine test verifies rest, launch, return to rest, and fallback preservation. Chrome also verifies real poses at rest, during launch, and on return, with their local texture. `npm run check` succeeded with 550 tests. The study scene was inspected with no JS errors. Support geometry and alignment during a real game remain to be compared against Michel's screenshots.

## Mechanism footprint and arcade comparison — November 20, 2026

Conduits are thicker, shortened, and mounted entirely outside the tiling. Heads are wider and shorter. The procedural catapult has an elongated arm, a thickened cup, and two low walls with right-angle returns around the axle. Launch center remains the same. Cliff joints have their own gray tint, independent of the orange or yellow wall color.

The old procedural catapult is preserved under `docs/backups/level4-catapult-procedural.ts.txt`. The mesh extracted from Rolling Madness 3D remains a local reference. 50% Chrome overlays use MAME screenshots 1177 and 1297, with native scrolls of 128 and 314 px. Overall framing still shows a contour offset in the scenery. The comparison served to widen the nozzle, with a model and support specific to the project. In-game verification remains open.

## Rectangular nozzles, tiled support, and native cylinders — November 20, 2026

Vacuum nozzles have a rectangular opening with rounded corners. The catapult arm is shortened and meets the underside of the cup. The catapult baseplate gets four tiles separated by joints. Post faces reuse the track material.

The ROM defines 36 cylinders, not the two rows of the prototype. Tables at `0x24406`, `0x2442a`, and `0x2444e` give three 3 × 4 groups, at X/Z tiles 69..71/55..58, 69..71/63..66, and 76..78/74..77. `0x186ac` initializes table `0x401650` when an active marble enters zone 4 or 5. The routine resets the table to zero when no active marble remains there. The core staggers rises via counters and cycles through thirteen frame pointers (rise, hold, descent). In MAME, zone 4 activates at 1204 and the first slots rise at 1205. Other groups then start according to their own counters.

Live rendering reads the native table. It displays only moving cylinders, with four presentation height levels. The study scene alone shows nozzles and catapult. Chrome checked both new meshes at 270 and 440 px. A test RAM in Chrome verified four slots observed in MAME at distinct heights. `npm run check` succeeded with 549 tests. A manual F4 traversal of the cylinder sector remains to be verified.

## Procedural mechanism meshes — November 20, 2026

Vacuums now have a hollow oval horn with a rounded lip and a tapered conduit. The fragment marker was moved back into the throat. The catapult includes a hollow cup, an inclined arm, and a fixed cradle with baseplate and two posts. The baseplate rests on the tiling level at the mechanism. The cup keeps the same horizontal center at rest, at the marble's starting point.

Meshes are generated locally in `createLevel4Materials.ts`. Extracted Rolling Madness 3D files remain analysis references. NullEngine tests verify support seating, immobility during launch, and cup centering. Chrome screenshots inspected at 280 and 440 px. `npm run check` succeeded with 547 tests. Next in-game check: inspect mechanisms while traversing F4.

## Suction fragments and Level 4 catapult — November 20, 2026

Live view reads marble state `0x0a`, the native counter, and the vacuum index. Eight procedural fragments per player replace the marble during suction and converge toward the nozzle. The rebuild phase reuses existing rendering.

The native catapult is a type `0x0a` object. Routine `0x29e22` requires distance strictly less than eight arcade units on each axis, zero vertical velocity, and a ready mechanism. It repositions the marble in X and Z onto the actor before the impulse. The MAME 0.271 probe observed point (504, 560), rest pointer `0x2111e`, then `0x210ca` at impulse (frame 1298, vertical velocity +10). Rolling Madness 3D meshes describe the rest model and 22 throw poses over 2.03 s, with material `catapult.png`.

The procedural cup is centered at the native starting point and motion relies on the core's frame pointers. The study scene shows the catapult at rest. `npm run check` succeeded with 547 tests. Chrome WebGL2 verified marble framing in the cup and fragments from control poses. Next in-game check: pass successively through a vacuum and through the cup from F4.

## Marble suction — comparison of both games — November 20, 2026

Local Rolling Madness 3D files define two animations for the mechanism and one for the marble.

| Mesh                     | Poses | Declared duration | Triangles | Material     |
| ------------------------ | ----: | ----------------: | --------: | ------------ |
| `hoover_down.ase.mesh`   |    12 |           0.333 s |       254 | `hoover.png` |
| `hoover_on.ase.mesh`     |    12 |               2 s |       254 | `hoover.png` |
| `player_hoover.ase.mesh` |    17 |               2 s |       224 | `player.png` |

`actor/hoover.txt` plays retraction in reverse for exit. The active state loops on `hoover_on` with `hoover_72.ogg`. Nozzle bounds descend in `hoover_down` and fluctuate slightly in `hoover_on`. Texture `hoover.png` is a 16 × 16 flat RGBA (242, 198, 0, 255). Nozzle volume comes from the mesh and its lighting. In `player_hoover`, the marble stretches toward the nozzle and vertices converge to a single point at the last pose. This animation is already in the local library. Current rendering never selects it.

Arcade, MAME 0.271, and TTL BIOS. After controlled upstream initialization of position and velocity, the core plays capture without further intervention. At frame 1178, the marble enters state `0x0a` at `player + 0x1a`, with `0x20` in counter `player + 0x57` and actor index at `player + 0x58` (P1 base at `0x400018`). Routine `0x13d38` emits successive sprites toward the nozzle. World coordinates of the marble stay fixed during this phase. Frame 1177 shows the intact sphere, 1184 and 1200 blue fragments, and 1232 disappearance near the nozzle. At 1242, the actor begins retracting and the marble transitions to state `4` (rebuild). Frames remain temporary.

The `practicePose` reader does not forward state `0x0a`, so rendering has no distinct suction signal. For a future procedural effect, read this state, its counter, and the actor index. Animate presentation only from the frozen position toward the nozzle, then let the existing rebuild path take over. No modifications to scene meshes or simulation during this comparison.

## Synchronized procedural vacuums — November 20, 2026

The 3D view uses six procedural stands along the track edge. Outside gameplay, the study scene shows them deployed. In-game, frame pointers read from object slots of the pinned core drive nozzle height. Idle frame or inactive slot hides the vacuum. Rendering returns to hidden state after a missing pose. Vertical travel and dimensions are specific to the procedural models. Arcade rules remain in the core. Confirmation of a restore uses the level requested by F2, F3, or F4. F2 keeps its coordinate check.

Targeted tests on both types, opening and retraction pointers, slot-independent ID, and hiding. Chrome WebGL2 on the local survey, with re-injection of pointers observed in MAME into a test RAM: six meshes created, zero visible at rest, then expected alternation between vacuums 0 and 2. Screenshot inspected, no JS errors. F4 resume was confirmed in Chrome with the real core. An artificial move to zone 31 changed the player's zone without initializing vacuum slots in this Web replay. A game following the course remains to be verified. `npm run check` succeeded with 545 tests.

## Level 4 vacuums — arcade triggering — November 20, 2026

Disassembly of the 68010 program and a MAME 0.271 probe with TTL BIOS confirm six vacuums, zone IDs `0x1e..0x23`, actor types `0x0b` and `0x0d`. The level's script table starts at `0x1dfd4`. Waiting actors have state `4` and frame pointer `0x20c14`, observed in RAM at initialization of all six.

- `0x1365c` reads the level boundary table (`0x23ac0`) and compares the tile before/after a simulation step. Exit direction across a segment determines the marble's new zone ID. `0x13966` selects the opening script for the associated actor.
- The object script checks at `0x12ca8` whether an active marble still occupies one of the two zones it monitors. Return to idle and the post-capture retraction script are two distinct paths. Suction goes through `0x13d38` and post-capture retraction through `0x25674` for type `0x0b`.
- All six positions are specified in initialization scripts `0x1d7d0`, `0x1d7e6`, `0x1d7fc`, `0x1d812`, `0x1d828`, `0x1d83e`. In grid coordinates (X, Z), read anchors are (39, 36), (48, 36), (50, 46), (34, 42), (42, 42), and (44, 52), all at height 16300 in arcade units. Michel's screenshots show nozzles at the track edge. The two tile-centered plinths and continuous motion currently coded in `createLevel4Landmarks` explain the presentation discrepancy.

Controlled probe with position and velocity initialized near two boundaries, then native simulation. Entry into zone 30 at frame 1122, opening of corresponding vacuum. Entry into zone 32 at 1140, opening of second type and retraction of first, which returns to the empty pointer at 1186. In a run without early crossing of the second boundary, the first alternated two active frames then the capture path triggered its retraction at 1242. Study concerns vacuums only. No modification to rendering or emulation.

## Level 4 procedural mechanisms — November 20, 2026

Both vacuums, the six pistons, the catapult, and both hammers take their height at the center of tiles present in the displayed mesh. Nozzles tilt, pistons retract to track height, and arms pivot on axes distinct from their plinths. Dimensions and cycles are presentation choices to be verified in-game. The arcade screenshot and actor definitions served as references to identify mechanisms.

Validation in `createTerrainStudy.test.ts` with a synthetic grid. Visual check in Chrome on the study view at 315, 494, and 750 px. `npm run check` succeeded with 542 tests. Next useful check: observe interactions in-game from the F4 shortcut.

## Local extraction of Rolling Madness 3D — November 20, 2026

- All 329 files from the Inno Setup payload are in `3D_assets_for_animated_entities/data/{app}/`. The local folder also contains 4 resources embedded in the installer, including its license, and 6 metadata files exported by the extractor.
- All 47 `.ase.mesh` meshes, textures, sounds, actor and level definitions were preserved in their original directory tree. For Levels 4 to 6, see `level/level4.txt` through `level/level6.txt` and definitions `actor/world4.txt` through `actor/world6.txt`.
- All 329 files match the archive table in path, size, and Inno checksum. All 339 outputs pass `SHA256SUMS` verification. The existing converter produced a temporary JSON with its 11 models. Texture `amoeba.png` differs from the one in the current local library.
- Next action for Level 4: start from `level/level4.txt` and definitions in `actor/`, then determine placements and check them against arcade RAM before wiring the meshes to BabylonJS rendering.

## Quick shortcuts F3 (Level 3) / F4 (Level 4) and Level 4 (_Aerial Race_) — November 20, 2026

- **`F3` (Level 3) & `F4` (Level 4) shortcuts** (`scripts/record-level3-checkpoint.mjs`, `scripts/survey-level4.mjs`, `src/dev/localRoms.ts`, `src/emulation/localStudy.ts`, `src/ui/feasibility.ts`, `index.html`):
  - Local recording of native checkpoints `local-roms/level3-web.state` (Level 3 start `0x2cd9e`) and `local-roms/level4-web.state` (Level 4 start `0x2d648`).
  - **"Niveau 3 · F3"** and **"Niveau 4 · F4"** buttons + `F3` / `F4` keyboard shortcuts and `?study=level3` / `?study=level4` parameters in `feasibility.ts`.
- **Level 4 (_Aerial Race_, descriptor `0x2d648`, key `'level4'`)** (`src/rendering/createLevel4Materials.ts`, `src/game/modern/practiceTerrain.ts`, `src/emulation/practicePose.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLivePracticeView.ts`, `src/rendering/createPracticeGoal.ts`, `src/terrain.ts`, `terrain.html`):
  - Full arcade survey `130 × 130` (`1,492` active cells, scroll `-16152 → -15368`, i.e. `784 px`) in `local-roms/level4-terrain.json`.
  - BabylonJS rendering faithful to `MM_original_levels_full_views/MarbleMadness_Level4.png`: golden/ochre crossed ramps at the top (`level4-top-floor`), stone-gray tracks (`level4-floor`), striped cliffs vermilion-orange at the top transitioning to gold-yellow at the bottom (`level4-cliffs` + `level4CliffColors`), sawtooth cleanup on pit edges (`level4DisplayTerrain`), `GOAL` zone (`x = 113..116, z = 104..113`) + animated flags, and **"Voir le niveau 4 (étude)"** button on `terrain.html`.
  - Full live wiring (`0x2d648` in `readPracticePose` and `readModernPhase`, preloading in `feasibility.ts`).
- **Validation**:
  - `npm run check` green (**541 Vitest tests**, V8 coverage ≥ 90%, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, Vite build).
  - Chrome WebGL2 screenshots verified on `http://127.0.0.1:5173/terrain.html` (Level 4 at `0 px`, `380 px`, and `784 px`).
  - **Animated 3D mechanisms & `player_hoover`** (`createLevel4Materials.ts`, `scripts/extract-rolling-actors.mjs`): extracted `player_hoover.ase.mesh` (`17` poses) into `local-roms/rolling-actors.json`; complete fix of white triangles on the central slot (`z = 62, x = 59..63` and `z = 66, x = 57..63`); initial temporary procedural models (`createLevel4Landmarks`).
  - **Important discovery in `Rolling Madness 3D 2005/RollingMadness3D-Installer.exe`**:
    - Automatic macOS cleanup of `/tmp` had purged files from `/tmp/mm-rolling-research/extracted/` older than 3 days (as well as `libboost_iostreams-mt.dylib` used by `innoextract`).
    - Decompressing the Inno Setup 5.0.4 header (`0x10757e6` in `RollingMadness3D-Installer.exe`) confirms that **all true 3D models, animations, textures, and definitions for Levels 4 to 6 are indeed present in the installer**:
      - Models & animations: `hoover_down.ase.mesh`, `hoover_on.ase.mesh`, `catapult.ase.mesh`, `catapult_throw.ase.mesh`, `hammer.ase.mesh`, `rod.ase.mesh` (pistons), `bird.ase.mesh`, `bird_fast.ase.mesh`, `bird_expl.ase.mesh`, `lev4.ase.mesh`, `lev5.ase.mesh`, `lev6.ase.mesh`, `lev6_bridge1..4.ase.mesh`, `amoeba_stretch_mini.ase.mesh`, `amoeba_squashed_mini.ase.mesh`, `blacky_mini.ase.mesh`, `stick_idle_mini.ase.mesh`, `stick_bend_mini.ase.mesh`.
      - Textures: `hoover.png`, `catapult.PNG`, `hammer.PNG`, `rod.PNG`, `amoeba.png`, `bird.PNG`, `lev4_catapult.png`, `lev4_side.png`, `lev4_tile_glass.png`.
      - World and actor definitions: `actor/world4.txt`, `actor/world5.txt`, `actor/world6.txt`, `actor/catapult.txt`, `actor/hammer.txt`, `actor/hoover.txt`, `actor/bird.txt`.
  - **Level 4 next steps**: use the local extraction described above to prepare replacing the procedural models of `createLevel4Landmarks` with the animated meshes.

## Level 3: exact ROM decoding of waves, V pyramid, and final slope tiles — November 20, 2026

Fixes for the 3 points reported by Michel during live testing of Level 3:

- **Turquoise wave 100% synced to ROM decoder `0x0d0a0` (`practicePose.ts`, `practicePose.test.ts`, `createLivePracticeView.ts`, `createLevel3Materials.ts`)**:
  - Disassembly of 68010 routine `0x0d0a0` and its tables `0x24c7a..0x24df4`: for each tile `i = 0..20`, `word(0x76e + i * 6)` directly encodes the exact height `0x9ab4..0x9ad2` (`0..30` arcade units, i.e. `0` at rest until the marble arrives via the middle walkway); for end tile `i = 21`, `word(0x7f0)` encodes `0x8f84..0x8fa2` (`0..30`).
  - Removed the `nearWave` heuristic in `createLivePracticeView.ts` (arcade RAM naturally stays at `0` when the marble is on the left).
  - Realigned `waveRegion.z` from `75` to `76` (`z = 76..97`, aligned with both bridges `z = 81..82` and `z = 93..94`), exact physical height `waveMaxHeight = level3Height(16148 + 30) - waveBaseY`, and direct tracking without smoothing lag.
- **Level 3 lighting, shadows, wall contrast, and mint highlights (`createTerrainStudy.ts`, `createLevel3Materials.ts`, `createTerrainStudy.test.ts`)**:
  - Lowered `fill.intensity` (`0.34 → 0.18`), `fill.groundColor` (`0.14, 0.12, 0.10`), `level3-cliffs` `emissiveColor` (`0.025, 0.021, 0.016`), and `shadows.darkness` (`0.28 → 0.10`) to recover the charcoal-brown shaded walls and dense cast shadows of the original game.
  - Restored a controlled mint specular (`specularColor = (0.55, 0.88, 0.76)`, `specularPower = 22`) and directional contrast `[0.42..1.48]` on the turquoise curbs (`level3CurbColors`).
  - Boosted turquoise wave (`× 1.32`), brighter upper plateau (`diffuse 0.32, 0.90, 0.72`, `emissive 0.09, 0.26, 0.21`), and deeper shaded slope (`dark * 0.82`).
- **Turquoise V pyramid (`createLevel3Materials.ts`)**: flipped triangle winding on the 4 triangles of `level3-turquoise-spike` to outward left-handed (`c1, tip, c0`, `c2, tip, c1`, `c3, tip, c2`, `c0, tip, c3`) — the 2 front faces are no longer hidden by backface culling.
- **Folded tiles on the 3 final slopes (`createLevel3Materials.ts`)**: planar smoothing `[nw, ne, ne, nw]` on rows `z = 86, x = 96..99` and `z = 93, x = 89..92 / 95..98` (where `(99, 86)`, `(92, 93)`, and `(98, 93)` had `fold = 9` just below the `0.5` threshold).

## Level 3: V pyramid, slope entry tile, arch openings, morphing amoebas, and flat wave before approach — November 19, 2026

Fixes for the 5 points reported by Michel in the latest feedback on Level 3:

- **Level 3 lighting, shadows, wall contrast, and mint highlights (`createTerrainStudy.ts`, `createLevel3Materials.ts`, `createTerrainStudy.test.ts`)**:
  - Lowered `fill.intensity` (`0.34 → 0.18`), `fill.groundColor` (`0.14, 0.12, 0.10`), `level3-cliffs` `emissiveColor` (`0.025, 0.021, 0.016`), and `shadows.darkness` (`0.28 → 0.10`) to recover the charcoal-brown shaded walls and dense cast shadows of the original game.
  - Restored a controlled mint specular (`specularColor = (0.55, 0.88, 0.76)`, `specularPower = 22`) and directional contrast `[0.42..1.48]` on the turquoise curbs (`level3CurbColors`).
  - Boosted turquoise wave (`× 1.32`), brighter upper plateau (`diffuse 0.32, 0.90, 0.72`, `emissive 0.09, 0.26, 0.21`), and deeper shaded slope (`dark * 0.82`).
- **Turquoise V pyramid (`createLevel3Materials.ts`)**: flattened base cell `(99, 92)` to `16124` under the pyramid + added per-vertex colors (`level3CurbColors`) and matte tint `(0.18, 0.58, 0.48)` on `level3-turquoise-spike` — no more overexposed neon-cyan triangle or protruding corner.
- **Final slope entry tiles (`createLevel3Materials.ts`)**: planar smoothing `[nw, ne, ne, nw]` on cells `(92, 94)` and `(99, 87)` whose `sw` corner sampled the adjacent turquoise curb (`16148`) — removed the dark crease on the brown tile.
- **Arch openings at the foot of starting bridges (`createLevel3Materials.ts`)**: added small dark ogival arches at the foot of both flying buttresses (`footYApex = 16384 - 8.5`, below `archProfile[5] = -6`), aligned with `68141cba.png`.
- **Morphing amoebas (`scripts/extract-rolling-actors.mjs`, `createRollingActor.ts`, `createIntermediateActors.ts`, `createRollingActor.test.ts`)**: extracted the real animated mesh **`amoeba_stretch.ase.mesh`** from _Rolling Madness 3D_ (12 poses, 34 triangles) into `local-roms/rolling-actors.json`, per-pose Z recentering (`centerAmoebaPoses`) so stretching happens in place without double translation, semi-transparent acid-green material (`alpha = 0.62`, `disableDepthWrite = true`, showing floor joints through and blending overlaps), and continuous morph driving from distance traveled (with procedural fallback if the model is absent in tests).
- **Flat wave until marble approach (`createLivePracticeView.ts`)**: kept a flat profile while the marble is outside the wave zone (`pose.scroll <= -15620 || pose.z >= 70 * 8`), then driven by the 22 RAM triplets `0x772 + i * 6`.
- **Validation**:
  - `npm run check` green (537 Vitest tests, V8 coverage ≥ 90%, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, Vite build).
  - Chrome WebGL2 screenshots verified on `http://127.0.0.1:5173/terrain.html` at `0 px` and `736 px` (V pyramid matte and crisp, slope entry tile completely flat, arch openings under the bridges).
  - **Remains for Michel to confirm in live gameplay**: wave behavior on approach, amoeba deformation in motion, and melting in acid (`player_melt`). If needed, we can directly import `amoeba_stretch.ase.mesh` from Rolling Madness 3D or move on to **Level 4** (_Aerial Race_).

## Level 3: fluid amoebas, RAM-synced wave + joints, flush pipe, and acid melting — November 19, 2026

Fixes for the 4 points reported by Michel during live testing of Level 3:

- **Level 3 live polish & rendering (`createIntermediateActors.ts`, `createMarbleAnimation.ts`, `createMagicWand.ts`, `createLevel3Materials.ts`, `createTerrainStudy.ts`, `practicePose.ts`)**:
  - **Fluid, semi-transparent amoebas**: constant linear speed (`maxStep = 0.095` tile/frame) and deeper acid-green semi-transparent material (`alpha = 0.62` / `0.52`, `disableDepthWrite = true`) letting floor joints show through and visually merging overlapping amoebas.
  - **Melting marble (`player_melt`)**: applied exact scale `0.675` (aligned with `player_broken` and the marble) with linear 60 fps progression over the 54 native frames of `state === 9`.
  - **Magic wand (`createMagicWand.ts`)**: classic black wand with white tip and gold handle, thicker (`diameter = 0.13`), tilted diagonally (`tilt ≈ -0.95 rad`) beside the marble with bobbing and sparkles.
  - **Copper pipe (`createLevel3Pipe`)**: `copper.backFaceCulling = true` on `level3-pipe-shell`, removing the stray triangle piercing the vertical wall of the tube.
  - **Starting towers & turquoise pyramid (`createLevel3Materials.ts`)**: Gothic lancet arrowslits (tapering to a point at the top), flying-buttress arches descending to `base` on their lower half (`archDrop`), and single turquoise pyramid in the V (`x = 99, z = 92`) with 4 independent triangles + outward winding + solid material `level3-spike-turquoise`.
  - **Turquoise wave**: removed `0.7` fallback (only `0xf004` = `1.0` and `0xbf84/0xdf84/0xcf84` = `0.42` raise the wave, `0` by default) and fast tracking (`lerp 0.55` without crushing smoothing) in `practicePose.ts` and `createLevel3Materials.ts`.
  - **2 asymmetric bumps & sharp edges (`createLevel3Materials.ts`, `terrainMesh.ts`)**: 2-tile diagonal cut (`gx - gz <= 4` and `gz - gx <= 8`), separation of non-coplanar cells into 2 independent triangles in `terrainMesh.ts` (eliminating lighting sawtooth artifacts along the cut edge, now completely straight); restricted `isLevel3TurquoiseCurb` to `z >= 88` and `z >= 95`.
- **Turquoise wave synchronized to arcade RAM + strong relief + vertical joints (`src/emulation/practicePose.ts`, `src/rendering/createLevel3Materials.ts`, `src/rendering/createTerrainStudy.ts`, `src/rendering/createLivePracticeView.ts`)**:
  - Native reading of the **22 wave triplets in RAM (`0x76e..0x7f2`, word `+4` at `0x772 + i * 6`)** discovered in ROM (`0x1d370..0x1d3f2`: `0x9f84` flat, `0xbf84/0xdf84/0xcf84/0x8f84` slopes, `0xf004` crest) in `readPracticePose` (`waveProfile`, 22 values `0..1`).
  - Real-time driving via `setLevel3WaveProfile(scene, pose.waveProfile)` in `live = true` mode (tall crest `2.25` + contrasted per-vertex colors light turquoise / deep pine-green based on normal); standalone animation remains active on `terrain.html` (`live = false`).
  - Separated vertical sides `level3-wave-sides` with procedural striped turquoise/dark-joint texture (1 joint per tile along Z, faithful to `MarbleMadness_Level3.png`).
- **Warm sand/brown tint, 2 symmetric amoeba bumps, and wall niches up to the edge (`src/rendering/createLevel3Materials.ts`)**:
  - Harmonized `level3-floor`, `level3-cliffs`, and `level3-tower-stone` to the true warm golden-sand / slate-brown palette of the arcade CRT.
  - Symmetric reconstruction of the 2 truncated pyramids on the amoeba terrace (`x=63..68, z=61..66` and `x=66..71, z=72..77`) in `level3DisplayTerrain` (no more white blades or staircase steps).
  - Raised wall niches flush to the tiling (`lintelY = topY - 0.14`) and adjusted parities/ranges of all 6 facades up to the edge.
  - Turquoise pyramid (`level3-turquoise-spike`) made more compact (`+0.72`).
- **Copper pipe flush at top and complete at bottom (`src/rendering/createLevel3Materials.ts`)**: masked the 3 collision cells `z = 78, x = 76..78` in `level3DisplayTerrain` that bit into the upper funnel (`x = 76..79, z = 78..82`) and whose cliff at `z = 79` sliced through the shaft and lower bend.
- **Marble melting animation in acid (`src/emulation/practicePose.ts`, `src/rendering/createMarbleAnimation.ts`)**:
  - Native detection of `state === 9` (measured over 56 frames in MAME 0.271, `word(base + 0x74)` progression from `0x1062` to `0x107a` in 7 steps → `melt` in `0..1`).
  - Routed `animation === 9` to the animated `player_melt` mesh (12 poses already present in `local-roms/rolling-actors.json`), synchronized to `pose.melt` + continuous smoothing.
- **Validation**:
  - `npm run check` green (536 Vitest tests, V8 coverage ≥ 90%, Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, Vite build), with new tests in `practicePose.test.ts` and `createTerrainStudy.test.ts`.
  - Chrome WebGL2 visual verification on `http://127.0.0.1:5173/terrain.html` at `500 px` (funnel flush to the millimeter + complete shaft and bend) and `736 px` (crisp vertical joints on wave sides).
  - **Remains for Michel to confirm in live gameplay**: amoeba fluidity, marble melting in acid (`player_melt`), and real-time synchronization of the turquoise wave with the original CRT.

## Level 3: full scroll to GOAL, native amoebas, textured towers, niches, and shadows — November 19, 2026

Fixes for the 5 points reported by Michel on Level 3:

- **Scroll unlocked to amoebas and `GOAL` (`src/game/modern/practiceTerrain.ts`)**: `level3LastSurveyedScroll` raised from `-15870` (`306 px`) to **`-15440`** (`736 px`), covering the entire level up to the turquoise wave and `GOAL`.
- **Native acid amoebas in live gameplay (`src/emulation/intermediateActors.ts`, `src/rendering/createIntermediateActors.ts`)**:
  - Discovered via MAME 0.271 the 8 native amoeba/acid-puddle slots starting at `0x1482` with stride `0x42` (`byte(base + 0x18) === 1`, `id = 10..17`, `kind = 'acid'`).
  - Rendered 8 animated neon-green puddles (`arcade-acid-0..7`, pulsing concentric disks driven by `pose.frame` with zero per-frame allocation).
- **Textures for both starting towers (`src/rendering/createLevel3Materials.ts`)**:
  - Procedural material `level3-tower-stone` (`64 × 128`) with fluted capital, collar band, khaki-olive corner/central pilasters, and slate shaft, with UV coordinates cleanly split between the capital (`v = 0..0.234`) and shaft (`v = 0.234..1`).
- **Reliefs on the large vertical wall, copper funnel, solid wave & turquoise curbs (`src/rendering/createLevel3Materials.ts`, `src/rendering/createTerrainStudy.ts`)**:
  - Generalized `carveLevel3WallNiches` to all **6 facades** visible in `MM_original_levels_full_views/MarbleMadness_Level3.png` (left zigzag `x=50`, right zigzag `z=60`, amoeba terrace left `x=73` and right `z=82`, pipe approach `x=76`, right pipe pillar `z=86`), all with horizontal sills.
  - Raised copper pipe (`level3-pipe-shell` / `level3-pipe-interior`) by `+4` arcade units to sit flush with `16320` tiling, and less-fluorescent satin terracotta/copper tint.
  - Added front/rear vertical sides on `createLevel3Wave` (solid, brighter double-crested turquoise wave).
  - Extracted and transversely smoothed (`[nw, ne, ne, nw]`) the **wavy turquoise curbs** of the final roller-coaster (`level3-turquoise-curbs`, material `level3-curb-turquoise`) + added the **turquoise pyramid** at the center corner (`level3-turquoise-spike`, shadow caster).
  - Raised `bentX` threshold to `> 0.5` in `level3DisplayTerrain` to preserve both bumps on the amoeba terrace.
- **Lighter shadows on Level 3 (`src/rendering/createTerrainStudy.ts`)**:
  - `fill.intensity = 0.34` and `shadows.darkness = 0.28`.
- **Validation**:
  - `npm run check` green (Prettier, ESLint `--max-warnings 0`, `tsc --noEmit`, Vitest + V8 coverage ≥ 90%, Vite build) with tests added in `intermediateActors.test.ts` and `createTerrainStudy.test.ts`.
  - Chrome WebGL2 visual verification on `http://127.0.0.1:5173/terrain.html` at `0 px`, `250 px`, `500 px`, and `736 px` (slider up to `736 px`, textured towers, recessed niches, flush pipe, wave, and `GOAL` flags).
  - **Remains for Michel to confirm**: live gameplay test on Level 3 (smooth scrolling past amoebas + visibility and animation of acid amoebas).

## Level 3 (steps 1, 2, and 3: terrain, copper pipe, turquoise wave, GOAL, and live wiring) — November 19, 2026

Full completion of the first 3 steps of **Level 3** (arcade descriptor `0x2cd9e`, 192 diagonals, internal key `'level3'`):

- **MAME 0.271 survey + copper pipe (`local-roms/level3-terrain.json`, `scripts/add-level3-pipes.mjs`)**: complete `118 × 118` grid (`2,260` active cells, opening scroll `-16176`, P1 start `(180, 76, 16408)`) enriched with the 333 shell triangles + 9 interior triangles of the vertical copper pipe extracted from `lev3.ase.mesh`.
- **Border cleanup & scenery (`createLevel3Materials.ts`, `createPracticeGoal.ts`, `createTerrainStudy.ts`)**:
  - Smoothed both starting towers (`4 × 4` without sawtooth edges) and both curved ramps (`[a, b, b, a]` and `[a, a, b, b]` smooth), removed solid cliffs under these two towers/ramps (`stripLevel3OpeningCliffs`), and built the two **flared medieval towers** (`4×4 → 2.6×2.6`) with **dark arrowslits** and **openwork arches** (`createLevel3OpeningTowers`).
  - Restored the 124 missing `sw` corners on `+Z` borders (removing all sawtooth edges on vertical walls), straightened the 48 twisted-in-X ramp tiles, and flattened the right mini-worm ramp (`x = 30..35, z = 43..44`).
  - Automatic smoothing of isolated corners sampled inside a deep pit (`level3DisplayTerrain`) + clipping of `±21` boundary diagonals.
  - Khaki/sand stone materials (`level3-floor`), olive-gray cliffs (`level3-cliffs`), vertical copper pipe (`level3-pipe-shell` / `level3-pipe-interior`, shadow casters), **animated double-crested turquoise wave** (`level3-wave`, zero per-frame allocation), and `level3-finish` arrival zone (`GOAL` at `x=92..95, z=100..109`) with yellow/black flags.
- **Live wiring (`practicePose.ts`, `createLivePracticeView.ts`, `feasibility.ts`)**:
  - Recognized descriptor `0x2cd9e` in `readPracticePose` and `readModernPhase`, native actor reading (`readIntermediateActors`), automatic dev preloading of `level3-terrain.json`, and seamless 3D switch on Level 2 → Level 3 transition.
- **Study page (`terrain.html`, `src/terrain.ts`, `src/dev/localRoms.ts`, `src/emulation/localStudy.ts`)**:
  - Local dev endpoint `/__local-roms/level3-terrain.json` and **"Voir le niveau 3 (étude)"** button.
- **Chrome WebGL2 visual verification**: screenshots verified on `Cadrage arcade` (`0 px` and `250 px`) and `Vue libre` — cleaned-up starting pits, copper pipe in place, turquoise wave and `GOAL` + flags visible with no runtime errors.
- **Next step**: Level 3 visual polish based on Michel's feedback (`sw === null` zigzag edges, turquoise roller-coaster coating, spikes, and mini-worm / amoeba specific actors, `F3` quick checkpoint).

## 4096 shadow polish, pits, guardrails, auxiliary piston, L1 spike, and L2 alcove — November 19, 2026

Fixes following Michel's 8 screenshots:

- **Practice Race & Intermediate Race shadows (`createPracticeSun.ts`)**: shadow map raised to `4096 × 4096` on both levels and fine calibration `bias` (`0.00045` / `0.0005`) + `normalBias` (`0.01` / `0.011`) to eliminate both white gaps at wall/floor junctions and self-shadowing on the walls of the 5 pits.
- **Hexagonal ice basin (`intermediateIceMaterial.ts`)**: replaced 2D `screenX/screenY` polygons (which spilled outside the basin onto the flat ice) with shading in hexagonal basin coordinates (`dx = x - 9, dz = z - 6, radius = max(|dx|, |dz|, |dx - dz|) < 5`) leaving a flat margin line all around, faithful to the original and Rolling Madness 3D.
- **Blue Y-pipe supports (`intermediateLandmarks.ts`, `createTerrainStudy.ts`)**: masked internal collision cells (`z = 85..86` at both upper mouths and `z = 91..94, x = 82..84` under the lower shaft), realigned the alcove (`z = 76..83`), and added a trapezoidal interior floor strictly inscribed within the flared spout (`x = 82.75..84.25` at `z = 92.9` → `82.05..84.95` at `z = 95`). Visually verified live in Chrome WebGL2.
- **Level 1 starting pits (`createTerrainStudy.ts`)**: straightened to `(0, 1, 0)` the normals of rim extensions added by `extendPracticePitRims`, which tilted away from the sun (`(-0.24, 0.94, 0.24)`) and created a dark-gray ghost-shadow triangle to the right of each pit.
- **Red guardrails (`createPracticeGuardrail.ts`)**: diameter increased from `0.27/0.29` to `0.36/0.38` to match arcade thickness.
- **Level 2 under-bridge mechanism (`createIntermediateBridgeMechanism.ts`)**: added a plunger (`auxiliary-plunger`) and animated the small right piston (`auxiliary-cap` + `auxiliary-plunger`) in fast back-and-forth motion at `4.5 Hz` (several strokes per second).
- **Level 1 end spike (`practiceChannelTerrain.ts`)**: added `[82, 62, 63]` to `channelRims` to close the recessed corner on cell `(62, 82)` under the `3 4 5 6` arrow.
- **Level 2 alcove behind ice (`intermediateLandmarks.ts`)**: widened from `5` to `7` tiles (`z = 77..84`, 2-tile right pillar aligned with the left pipe mouth), lowered the gray shelf (`alcoveTopY - 10.2`), and thickened the middle beam (`2.8`) to match the original framing.
- **Blue Y-pipe supports (`intermediateLandmarks.ts`, `createTerrainStudy.ts`)**: masked internal collision cells (`z = 86` at both upper mouths and `z = 91..94, x = 82..84` under the lower shaft) and added the flush interior floor only inside the flared spout (`z = 92.8..95`) so the pipe joins seamlessly with no tiles or blue pillar protruding underneath. Visually verified live in Chrome WebGL2 via DevTools.

## Shadow acne, specular marble, pipe, waves, ice, and alcove — November 19, 2026

Fixes following Michel's 15 comparative screenshots:

- **Shadow acne removal and Level 1 pit fix (`createTerrainStudy.ts`, `createPracticeSun.ts`, `createPracticeSurfaceMaterial.ts`)**:
  - Removed `floor` (`terrain-surface`) from the shadow caster list on Practice Race and Intermediate Race (direct cause of diagonal black stripes on tiling).
  - Raised `shadows.bias` (`0.001` / `0.0012`) and `shadows.normalBias` (`0.04` / `0.045`) to eliminate self-shadowing speckling on `backFaceCulling = false` vertical walls, while keeping wall-on-wall shadows.
  - Separated the walls of both lateral starting pits (`splitPracticePitWalls` → `terrain-pit-walls`, `receiveShadows = false`) to preserve their brown/orange/yellow arcade gradient without shadow corruption.
- **Rolling Madness 3D-inspired marble rendering (`createMarbleMaterial.ts`)**:
  - Replaced "bowling ball" yellow dots with a soft two-tone blue/red checkerboard (like `player.png` in Rolling Madness 3D) combined with a spherical environment map (`Texture.SPHERICAL_MODE`, like `env "player_env.jpg"`) and strong specular highlight for view-stable reflections as the marble rolls.
- **Level 2 interior pipe shadow (`createIntermediatePipes.ts`, `createTerrainStudy.ts`)**:
  - Darkened interior lining (`diffuseColor(0.26, 0.26, 0.28)`, `emissiveColor(0.05, 0.05, 0.06)`) and added `interior` as a shadow caster to recover the crisp shadow inside the mouth.
- **Slope contrast and Level 2 wave-end geometry (`intermediateRims.ts`, `intermediateLandmarks.ts`, `createTerrainStudy.ts`)**:
  - Removed deformation of flat row `z = 81` in `intermediateWaveCell` (the wave stops cleanly at `z = 80` and finish tiles stay flat).
  - Added per-vertex colors (`intermediateSlopeColors`) on Intermediate Race tiling to recover the strong arcade white/medium-gray/dark-gray contrast between sun-facing and opposite slopes.
- **Level 2 ice and rear alcove (`intermediateIceMaterial.ts`, `intermediateLandmarks.ts`, `createTerrainStudy.ts`)**:
  - Added dark blue-green vertical bands (`joint(z - x) < 0.11`) aligned with the blue wall joints seen transparently through the flat ice.
  - Carved the recessed rectangular alcove into the large blue wall (`x = 88`, `z = 80..85`, `carveIntermediateAlcove`) and added the gray tiled shelf (`intermediate-alcove-shelf`, `receiveShadows = true`) with intermediate beam and second lower recess.
- **Study page `terrain.html` (`src/terrain.ts`)**:
  - Verified Vite transform and `createTerrainStudy` loading on the real survey `local-roms/intermediate-terrain-pipes.json` in `NullEngine` (OK); added explicit error reporting (`console.error` + `#terrain-status`) instead of silent `.catch(() => {})`.

## Wall-on-wall shadows, yellow cliffs, ice, and bridge mechanism — November 19, 2026

Fixes following Michel's 12 comparative screenshots:

- **Wall and platform cast shadows (Levels 1 & 2, `createTerrainStudy.ts`, `createPracticeSurfaceMaterial.ts`)**:
  - On **Practice Race**, vertical walls no longer use alternating yellow/orange/brown bands: they carry a **uniform bright yellow** with dark joints, an orange-brown shadow tint (`emissiveColor(0.36, 0.1, 0)`), `backFaceCulling = false`, **`cliffs.receiveShadows = true`**, and `cliffs` + `floor` are added as shadow casters on `key` (wall-on-wall and platform-on-wall/floor cast shadows).
  - On **Intermediate Race**, removed the additional `intermediate-pipe-wall-light` that washed out `+Z` navy-blue walls (bridge and recess behind the ice), and added `floor` as a shadow caster on `key` for crisp platform and wall shadows.
  - Extended cliff depth (`base = lowest - 18` on Intermediate, `lowest - 10` on Practice) to eliminate the floating cutoff on the large blue wall behind the ice and black bottoms in the pits.
- **Under-bridge mechanism (`createIntermediateBridgeMechanism.ts`)**: 4-spoke wheel + hub oriented **parallel to the slope / turquoise border** (`rotation.set(0, 0, Math.PI / 2)` instead of edge-on), positioned to the left of the piston (`dx = +0.88, dz = -0.78`), purple/dark-steel palette closer to arcade.
- **Intermediate Race ice (`intermediateIceMaterial.ts`)**: crisper grid joints, stronger white diagonal highlights in the basin, deeper interior shadow, and crystalline dithering on the high ramp.
- **Marbles (`createMarbleMaterial.ts`)**: changed from 48 tight dots to **12 spaced icosahedral yellow dots** (3–5 dots visible at once like the original) so 3D rolling is immediately legible.

Validation: `npm run format && npm run check` succeeded (530 Vitest tests, V8 coverage, lint, typecheck, build). Visual test run to be confirmed by Michel in Chrome.

## Level 1 & 2 polish, broom, synchronized bridge, and cameras — November 19, 2026

Delivered on Michel's feedback requests (Levels 1 and 2):

- **Synchronized and realigned broom (`practicePose.ts`, `createRollingActor.ts`, `createMarbleAnimation.ts`)**: reading native break pointers (`base + 0x72`, table `0x20fde`, indices 0..31) and secondary broom script (`base + 0x7a`, table `0x215f6`, indices 0..43, active flag `base + 0x7f`), verified against MAME RAM dumps `/tmp/mm-animation-review/broken/`. The `broom.jpg` group of `player_broken` is separated from `player.png` debris: hidden before native broom activation, scaled down to `0.84` around its XZ center, and realigned to the ground (`y = -5.67` in model space), without touching the debris.
- **Synchronized articulated bridge and visible left wheel (`practicePose.ts`, `createIntermediateBridge.ts`, `createIntermediateBridgeMechanism.ts`, `createLivePracticeView.ts`)**: RAM words `0x772` (`0x6fc8..0x6fd4` in steps of 2) and `0x774` (`0xf048..0xf054`) provide the 7 native bridge steps (0..6, verified on `/tmp/mm-worm-reference/ram-*.bin`). In-game (`live = true`), `createLivePracticeView` drives deck and mechanism height from `pose.bridgeStep` (the 144-frame study cycle remains active in `terrain.html`). The small spoked wheel (`intermediate-bridge-wheel-hub`) is moved left of the piston in arcade view (`dx = +1.05, dz = -0.85`), facing the camera.
- **Pipe cast shadows on blue walls (`createTerrainStudy.ts`)**: a dedicated static directional light (`intermediate-pipe-wall-light`, `includedOnlyMeshes = [cliffs]`, 1024 shadow map rendered once via `REFRESHRATE_RENDER_ONCE`) casts shadows from `intermediate-pipes-shell` onto the `+Z` and `+X` blue walls behind both pipes, without modifying the main sun (`key`) or introducing cliff self-shadowing.
- **"Derrière la bille" camera (`createCameraOcclusion.ts`, `practiceCameraSettings.ts`, `createLivePracticeCamera.ts`, `practiceCameraControls.ts`)**: (1) the occlusion corridor preserves the floor at the marble's feet (`mmAboveFoot` + `mmClearFoot`) while continuing to clear raised walls and ledges between the camera and the marble; (2) `chase` framing is reserved for 1-player mode (option disabled, skipped by **C**, and automatically falls back to `arcade` as soon as a second player is active).
- **Marble texture (`createMarbleMaterial.ts`)**: replaced equatorial `'1'`/`'2'` digits with six symmetric rings of 8 yellow dots projected without spherical distortion across the entire marble (equator and poles), with a softened specular highlight to make 3D rolling immediately legible.
- **Level 1 — Diagonal edges & 4-line GOAL frame (`practiceChannelTerrain.ts`, `createPracticeGoal.ts`)**: clipped outer corners along both boundary diagonals `wx - wz = ±21` of the full survey (removing sawtooth edges); extended the Practice Race GOAL frame across all 4 rows of the trough (`y = 0..63`, letters on the top 2 rows, background and bottom border spanning the bottom 2 rows), while keeping the compact format for Intermediate Race.
- **Out of time / Game over in 3D (`practicePose.ts`, `practiceHud.ts`, `ui/practiceHud.ts`)**: `mode === 4` stays in 3D rendering (`readModernPhase` returns `'level'`, `readPracticePose` keeps the pose); `readPracticeHud` reads native `OUT OF TIME` and `GAME OVER` banners from alpha-RAM (`$A03000`, rows 4..27) and displays them on the 3D HUD canvas; switching back to arcade video then happens for results (`mode === 2`) and attract (`mode === 1`).
- **Linear intro sweep finish → start (`createLivePracticeCamera.ts`)**: camera starts above the finish (end of level) and glides linearly toward the exact starting gameplay camera pose (including direct VP join onto the orthographic arcade framing), without backtracking.

Validation: `npm run check` succeeded (530 Vitest tests, V8 coverage, lint, typecheck, build).
Environment limit: Playwright Chrome tests are blocked in the network sandbox (`net::ERR_ACCESS_DENIED` on `127.0.0.1:5173`) and the user's Chrome did not have remote debugging enabled. To be visually verified by Michel on `http://127.0.0.1:5173/` (and `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`).

Next action: after Michel's visual feedback on these Level 1 & 2 adjustments, start **Level 3 (Silly Race)** with `MM_original_levels_full_views/MarbleMadness_Level3.png`, the MAME terrain survey, and local models (`lev3.ase.mesh`, `lev3_wave.ase.mesh`, amoebas, mini-worms).

## Materials, awards, and visibility — November 19, 2026

Delivered: shared material for normal, dizzy, and broken marbles of both players (`createMarbleMaterial.ts`). Blue/red procedural paint with yellow markings and numbers, shared lighting and specular. Private model UVs go from V=1 to V=2: both textures must repeat, otherwise markings are replaced by a solid color. Non-regression test added. Normal `player` model is added to the converter and local JSON; the procedural sphere remains the fallback if this geometry is missing.

`practicePose` reads magic state 8: native counters, animation pointer, 0.75/1.5 stretch. `createMagicWand.ts` displays a thin ivory/gold wand and its stars without changing time. It retracts at native index 42. The `+10 SEC` message comes from native notice `0x22446`, active in `0xf0`. Score awards come from table `0x22386..0x22422`; the black marble disappearing produced **1000 points** (`0x223aa`) in the original replay, for both players. `createScoreAward.ts` displays these notices without inferring points from a score delta. `−5 SEC` now requires its `0x2243a` pointer and active flag: it no longer overlaps bonuses.

Intermediate GOAL lacked victory materials. They are created, colored, and emissive, with priority given to the first finisher read from the core. Color resets on a new start. Worm body diameter increases from 0.47 to 0.60, ends from 0.58 to 0.72; native cadence/contacts unchanged. The bridge mechanism is moved forward by +2.4 X and +0.7 Z toward the slope: piston and base are clear from the arcade angle. Its cycle remains that of the study, to be synchronized with the core later.

In Chase ("Derrière") camera, `createCameraOcclusion.ts` creates a visibility corridor between the eye and tracked marble, limited to wall/tower materials. Fragmentary mask with soft edges and dithered transparency; the large cliff mesh does not vanish completely. Fast opening (about 0.2 s), restoration on leaving the corridor, immediate mask removal outside Chase camera. Scene-owned plugin, reused buffers/vectors, no alpha sorting. `registerForExtraEvents` must be defined BEFORE `_enable(true)` so uniforms are passed to the GPU. No effect on collisions or gameplay.

Validation: `npm run check` succeeded, 515 Vitest tests; 32 Chrome view, control, and occlusion tests succeeded. GPU test: marble hidden then visible, corridor moved and wall restored. Real F2 replay: stable start for eight seconds, V, F2 under capture, C, and Chase controls; no JS errors. WebGL screenshots inspected of P1/P2 materials, bridge at arcade angle, wand, and notices from native RAMs 2526/2580/2690/2710/2936.

Reload `terrain.html`, F2 to play, and C to switch camera. Local JSON was regenerated with: `node scripts/extract-rolling-actors.mjs '/tmp/mm-rolling-research/extracted/data/{app}'`. Models remain local. Colors, worm diameter, and visibility in a full run remain for Michel to assess; real Safari not retested. The wand was isolated in the MAME harness by setting the pending flag, then run by the original program: do not claim spontaneous appearance was verified. Presentation never activates it itself. Next action: compare broom timing to the secondary native script, then synchronize the bridge; keep the single core as arbiter.

## Worms, game over, and capture click — November 19, 2026

Worms now use `rendering/createWorm.ts`, a procedural articulated mesh, and `game/modern/wormPose.ts`, which interprets native script/index/fraction. The eight-pose walk keeps the first anchor, plants the other end, then lifts the oldest anchor. The script gives direction even when native velocity is zero. Geometry buffers are reused; the scene owns meshes, nodes, and materials. The black marble keeps its local model.

A new MAME replay of the attack showed the sequence: bend, straighten, flattened mouth, swallowing bell, return upright, late mouth/tongue. These phases are represented and synchronized with native indices, rather than a remake's timed animation. Player state 7 hides the marble: the melt morph that created a large blue disk was removed from this case. 3D shapes remain a geometric interpretation, to be assessed in-game by Michel.

The timeout "freeze" was an indefinite hold of the 3D terrain during native screens. `readModernPhase` distinguishes level phases from menus, results, and game over. The latter make the original video visible. Keeping 3D during intros is preserved. A real 82 s run after F2 confirms the 0 → 4 → 1 transition, native video then attract, core unpaused, and no JS errors. No changes to physics, score, or timer.

Clicking on a 2D or 3D image resumes and captures via the same path as the Capture button. Clicks on UI controls and the interactive cabinet keep their function. The listener is cleaned up with controls; no second engine. Capture handling avoids the pause toggle specific to the EmulatorJS canvas.

Validation: `npm run check` passes, 505 Vitest tests; 31 Chrome tests pass. Three click/capture/Esc cycles were also verified with the real core. Browser validation and limits are detailed at the top of `docs/VALIDATION.md`. The older open items wand/+10s, broom, and normal/broken material remain to be finished; see `docs/ANIMATION_AUDIT.md`. Do not announce those topics as fixed. Temporary references: `/tmp/mm-worm-reference/` (native replay and RAM), `/tmp/mm-native-worm-strip.png`, `/tmp/mm-worm-*.png`, `/tmp/mm-timeout.json`.

## Flyovers and camera handoff — November 18, 2026

The flyover smoothly joins the chosen camera (arcade, follow, top, behind): interpolation of position, target, and projection in the last 40% of the sequence. Perspective projection becomes orthographic for arcade framing, with no final cut. C interrupts the sequence.

`createVideoView` prepares the preferred terrain as soon as available, keeps 3D presentation between drawable native states, and selects the next terrain automatically. `practicePose` also exposes Level 2 during its native intro (mode 3, player object initialized), before gameplay. Each new compatible scene gets a 180-native-frame flyover; Practice's native countdown keeps its own progression. F2 re-arms the flyover even on the same terrain. When paused, its time stays frozen. **F2 always restores an already-playable state**: its three-second flyover therefore accompanies the first seconds of the core without suspending its timer; C lets you immediately take the gameplay framing. No ROM/physics patch.

V preserves the explicit choice of arcade/comparison views. A temporarily unavailable pose keeps the last 3D terrain with actors hidden, rather than briefly flashing arcade. Partial terrain outside the survey keeps its previous fallback. A future race without a survey still needs explicit handling: the reader today exposes only Practice and Intermediate.

Checks and limits of this delivery are at the top of `docs/VALIDATION.md`. Compliance requests for worms, wand, broom, and normal/broken marble materials remain under analysis: no fix for these animations is included in this camera batch. Native surveys and wand extraction are kept temporarily under `/tmp/mm-animation-review/`; do not present them as shipped assets. Detailed results are kept in `docs/ANIMATION_AUDIT.md`. Next action: synchronize the wand to native state 8 and the broom to its secondary animation, then compare worm poses with alternating feet.

## Fixed F2 start, automatic surveys, and actors

Reload `terrain.html`. F2 opens Intermediate Race directly in 3D. ROMs, BIOS, full Practice and Intermediate surveys, and local models load automatically. **V** cycles 3D → comparison → arcade, **C** cameras, **H** help. Trackpad and boost use the active camera's frame of reference. The behind view keeps its heading downstream.

The previous checkpoint was incomplete. The core kept game RAM without restoring two analog accumulators and the Atari Slapstic bank. Resuming therefore did not recover the same collision terrain. `emulation/intermediateCheckpoint.ts` adds these states to MM2 version 2 format. Addresses are specific to the WASM hash verified by the loader. `local-roms/intermediate-web.state` was regenerated. Start stays at (220, 108), height 16378, for eight seconds with no input in Chrome. F2 during capture and V are also verified on the real session.

`scripts/extract-rolling-actors.mjs` converts meshes from the extracted local installer. `local-roms/rolling-actors.json` contains textures and poses for worms (idle, bend, jump start, and jump), the black marble, dizzy marble, break with broom, and vanish. Stars and tongue are complementary and procedural. `intermediateActors.ts` reads black at 0xa20 and the four creature slots at 0x1302, stride 0x60. Presentation selects models from native states and uses the core's frame counter. Both surveys remain available when the level changes. Local files are excluded from the build.

`npm run check` passes with 490 Vitest tests. All 51 Chrome tests pass. An automated run in a Web session reaches the worms and displays both renders, native positions, and synchronized stars. Models for the worm, dizzy marble, and broom were observed in a real WebGL context. The full race remains to be played. Fine timings for worm jumps, cleanup, and tongue remain to be compared in-game against arcade animations. The bridge keeps its study cycle and remains to be synchronized.

## Playable Intermediate Race

Open `terrain.html` on the dev server. ROMs and BIOS are verified on load. **F2** opens the game on the study page. After **"Démarrer l'émulation"**, **"Capturer le trackpad"** resumes the timer. **F2** during a game restores the solo start with 60 seconds. Survey and checkpoint remain in `local-roms/`. `node scripts/record-intermediate-checkpoint.mjs` regenerates the checkpoint with Chrome, local ROMs, and the normal Practice Race run.

The core drives both views. **Derrière la bille** camera follows the marble's position with a fixed horizontal axis downstream. The bridge uses a thickened actuator, auxiliary cylinder, conduit, and a three-rivet turquoise edge refined from the new screenshot. Concrete next action: survey the bridge phase in the core to synchronize its rendering, then identify worm and break states. These events remain visible on the arcade view of the comparison.

`npm run check` passes with 478 Vitest tests. The Chrome suite passes with 50 tests. In Chrome with local archives, restore, capture, marble movement, and return to start via F2 were verified. The full 3D race remains to be played.

## Ice polish and behind-the-marble camera

Basin rendering uses visible joints in reflections, diagonal dithering outside the basin, and drips joined to the cliffs near the pit and on the right edge. View the **Glace et arrivée** framing in `terrain.html` with the local survey. The Rolling Madness 3D installer contains the bridge in 16 poses, its textures, and ice material. The inventory is in decisions. In playable Level 1, **C** now reaches **Derrière la bille**. `npm run check` passes with 474 Vitest tests and all 49 Chrome tests pass. Next step is to synchronize the playable Intermediate Race view with the arcade core.

## Intermediate Race ice and finish

In `terrain.html`, load `local-roms/intermediate-terrain-pipes.json` then choose **Glace et arrivée**. The basin has its turquoise texture, stylized reflections, and vertical lip. Gray GOAL marking and blue-and-black flags reuse Practice Race functions. Pipes receive their shell's shadow on a floor flush with the tiling. The bridge mechanism is recentered on the purple base and its turquoise edge no longer protrudes past the deck. `npm run check` passes with 470 Vitest tests. All 49 Chrome tests pass.

Synchronizing Intermediate Race 3D rendering with the core remains the next step. Study GOAL is gray.

## Intermediate Race shadows and pipe outlets

Lighting is realigned to the central pyramid shadow in `intermediate-reference-306.png`. Blue cliffs receive shadows, with an unblurred map and a bias verified in arcade view. The cap of the three pyramids rounds near the top. A textureless gray surface covers the tiling under both pipe mouths. It preserves exterior tiling. Load `local-roms/intermediate-terrain-pipes.json` in `terrain.html`. **Tuyaux et rampes** shows the outlets in free view. `npm run check` passes with 469 Vitest tests. All 49 Chrome tests pass.

Next action: connect arcade states to the playable Intermediate Race view, notably worms and marble breaking.

## Intermediate Race polish

The local `local-roms/intermediate-terrain-pipes.json` survey was regenerated with Rolling Madness 3D normals. Highlights on both pipes follow their smoothed surface, welds are visible, and outlets have a gray floor. The bridge shows a riveted turquoise side, guides, spoked wheel, and telescopic piston animated with the deck. Landing joins near the first pipe and at the final basin were touched up in `intermediateRims`. `terrain.html` lets you verify both framings. `npm run check` passes with 466 Vitest tests and all 49 Chrome tests pass.

Next step remains reading Intermediate Race poses and events to animate the playable 3D view.

## Prototype 04 — 3D terrain

The [modern rendering specification](MM_NEW_3D_GRAPHICS.md) sets the tasks and validation criteria. The MAME core remains the reference for the same game in both presentations.

The `scripts/measure-terrain.mjs` harness checks heights against the game and produced `local-roms/practice-terrain.json` (20 × 14 cells). In `/terrain.html`, load this survey then `local-roms/practice-reference.png` to overlay the arcade screenshot at fixed framing. Replay confirms start projection within 2.14 native pixels on checked points. Section silhouette and cliff depth remain approximated. See [PROTOTYPE_04.md](docs/PROTOTYPE_04.md).

In **Affichage** on the game page, load the `local-roms/practice-complete-terrain.json` survey (91 × 91 cells), select **3D moderne · Practice Race**, then start P1. Relief runs from the start to the finish strip, marked by the GOAL text. Previous surveys remain usable. Modern rendering displays during the race, then MAME shows the summary and Intermediate Race on the arcade canvas.

The MAME 0.271 harness in `--finish` mode verifies the survey at five points of the race and measures a maximum scroll of 360 pixels. The browser reaches 359 pixels of scroll on the verified replay. Arcade and modern views agree on MAME data surveyed across 948 P1 iterations. `npm run check` passes with 349 Vitest tests and all 46 Chrome tests pass. P1's fall on the first ramp had also been validated with local ROMs. Arcade rebuild corresponds to the temporary absence of the marble.

After loading a survey, under capture, **V** toggles between original game and modern 3D. **Shift+V** enables side-by-side comparison or returns to the original game. The **Affichage** menu is also available in the immersive view HUD. Outside the survey, comparison keeps arcade visible and displays a message instead of modern rendering. Succeeded in Chrome with the real core, `npm run check` passes with 356 Vitest tests and all 47 Chrome tests pass.

Practice Race start reproduces the 24-pixel black margins measured on each side of the MAME render. The fixed camera preserves projection of arcade coordinates. Modern terrain uses a stone texture and striped walls. The five red guardrail sections and two start spikes are positioned from the local screenshot. Steps are closed by their vertical faces and openings keep their surveyed contour. Scenery proportions and pit depth are approximated. Comparison was verified in Chrome with the real core. `npm run check` passes with 362 Vitest tests and all 47 Chrome tests pass.

Touch-up of central pit materials from Michel's screenshots and MAME render pixels. Tiles and spikes use neutral grays, wall faces alternate yellow and orange, and joints are dark. Red arrows are applied to the mesh of both ramps. Rails have a wider highlight and light stretches shadows further to the right. Strips are aligned to the course grid. Step relief remains approximated. `npm run check` passes with 364 Vitest tests and all 47 Chrome tests pass.

Both lateral pits now use a motif aligned to visible columns in the arcade screenshot. The motif places dark orange on the left side of each pit, then bright orange and yellow. The oblique transition is approximated by a procedural texture. The rest of the walls still use grid-aligned bands.

Gray of each 3 × 3 panel follows the measured slope. Both lateral pits keep their colored cutout and tiled lip. The central pit has flat steps and a darkened bottom. Guardrails are thicker and their posts sink into the floor. Completed tiles at the bottom-right edge give the orange wall a continuous edge. Exact palette and geometry of the central pit remain approximated. Arcade and 3D comparison was verified in-game under Chrome with the local core and survey. `npm run check` passes with 370 Vitest tests and all 47 Chrome tests pass on serial re-run.

A directional light at about 17° from the ground replaces the gray map. Direction is estimated from the guardrails and their shadows in arcade frame 1199. It applies to both study and game views with the same gray material for tiles. Left join between towers was closed, vertices tightened, and the two detached arrow spikes enlarged. Comparison was verified in-game under Chrome. Orientation is an estimate and shadow silhouettes still depend on reconstructed geometry. `npm run check` passes with 373 Vitest tests and all 47 Chrome tests pass.

Under the left guardrail of the central pit, three completed tiles meet the wall on a single edge. The upper post was realigned to this rim and its height is distinct from the neighboring step. Dark orange runs along the rim, transitioning to yellow on the return. Towers rest on their landing and their plinths carry stone joints. Directional lighting of tiles is preserved. Comparison verified under Chrome with the arcade core. `npm run check` passes with 375 Vitest tests and all 47 Chrome tests pass.

Guardrail posts now follow the height of the tiling triangles, with a slight overlap for contact. Pyramid plinths have two relief stones per face, separated by a recessed joint. The return adjacent to the guardrail carries an oblique yellow band on an orange background. The rest of the face follows the step palette. Comparison verified in-game under Chrome with the full survey. Stone profile remains approximated. `npm run check` passes with 376 Vitest tests and the Playwright suite passes with 47 Chrome tests.

Each pyramid's plinth covers its 3 × 3 landing to the edge. All nine tiles of the landing use the same presentation altitude, shared with the plinth. The stray step from the collision survey beneath the pyramid is thus removed from rendering. Steps below and heights used by the core remain distinct from the landing. The join was checked in-game under Chrome. `npm run check` passes with 376 Vitest tests and all 47 Chrome tests pass.

Pyramid plinths count three stones per face on a 3 × 3 footprint. Plinth bottom and landing are lowered to 16366 in the arcade survey. Lowered and narrowed shoulder accentuates the slope difference between cap and plinth. Three tiles under each pyramid are lowered in the presentation mesh to clear the landing flank. The material draws the contour and diagonal separation of the cap. Guardrail construction is isolated from their anchors in the course. Pyramid and guardrail builders take a material and are reusable with other colors. The [scenery inventory](docs/SCENE_ELEMENTS.md) lists scene names, anchor points, dimensions, and modules to reuse. The new profile was checked in-game under Chrome. `npm run check` passes with 379 Vitest tests and all 47 Chrome tests pass.

The section after the two large pyramids includes the central red arrow, the two small pyramids on their rims, and the trough guardrails. `practiceChannelTerrain` joins the heights of the trough tiles and fills in missing corners on straight rims. The reference frame for this portion is frame 1500, at scroll −16020. Comparison verified under Chrome at the MAME replay pose, which reaches Intermediate Race. `npm run check` passes with 384 Vitest tests and all 47 Chrome tests pass.

At Michel's request, Practice Race cast shadows are limited to tiling, the trough, and markings. Vertical strips keep directional lighting. This fixes projected silhouettes under platform edges. Before/after comparison under Chrome confirms disappearance of these silhouettes. `npm run check` passes with 385 Vitest tests and all 47 Chrome tests pass.

In the descent after the trough, vertex joins are extended to the finish. Straight edges regain their tile corners and course step-downs remain visible. The checkerboard takes its heights from the same mesh as the ramp. Frames 1740, 1860, and 1920 of the MAME 0.271 replay serve to check this zone. All three poses were compared under Chrome. `npm run check` passes with 390 Vitest tests and all 47 Chrome tests pass.

The three 3–4–5–6 markings are placed on platforms and the two checkered flags wave at the finish edge. The GOAL banner is gray before crossing, then blue when the core sends animation 6. Textures are drawn by rendering from the local replay. Flags animate during BabylonJS rendering. Both palettes and cloth motion were verified under Chrome. `npm run check` passes with 394 Vitest tests and all 47 Chrome tests pass.

Tiling joints remain faintly visible beneath the GOAL and 3–4–5–6 markings thanks to localized transparency at tile edges. Both GOAL palettes and markings were inspected under Chrome. `npm run check` passes with 394 Vitest tests.

The 3D view of Practice Race displays P1's score and timer, in solo and comparison modes. `emulation/practiceHud` reads tiles displayed by the pinned Web core directly. `ui/videoComparison` delivers the HTML HUD and hides it when the pose leaves the survey or the summary takes over. The native replay goes from 0 points and 58 seconds at start to 1,270 points and 47 seconds at finish. See addresses and decoding in `docs/DECISIONS.md`. The Web game verifies start, countdown, and view changes while paused. Finish in Chrome remains to be replayed with the real core. `npm run check` passes with 398 Vitest tests and all 47 Chrome tests pass.

The solo HUD reproduces arcade placement and palette with a bitmap font redrawn at native resolution. The timer has larger digits with a black outline. The left-facing numbered marking uses the mirrored version of the digits in their tiles. Arrow, boxes, and joints keep their alignment. The other markings share the second material variant. The HUD was verified with the real core and all three decals on the finish pose in Chrome. `npm run check` passes with 399 Vitest tests and all 47 Chrome tests pass.

GOAL uses serif lettering and a border limited to the first side of the trough. Both flags have a 3 × 2 checkerboard. Both banner palettes were checked in Chrome. Starting lift selects five local meshes and their walls from relief codes read by `emulation/practicePose`. `rendering/createPracticeStartLift` extends the measured profile across three tiles. Comparison with the real Web core shows the slope at maximum, and the trace confirms its return to flat. See `docs/DECISIONS.md`. `npm run check` passes with 402 Vitest tests and all 47 Chrome tests pass.

During the solo countdown, the modern view offers a flyover of the survey to the marble. Field `PracticePose.opening` tracks the arcade counter and hands control to the chosen framing when the race starts. Under capture, C cycles through arcade framing, follow, and top view. Keys + and − adjust FOV or zoom. The same settings are accessible while paused. The real core in Chrome confirmed the flyover, timer at 60 at start, and unchanged pose during adjustments. `npm run check` passes with 408 Vitest tests and all 47 Chrome tests pass.

Duo mode displays both marbles, scores, and timers in Practice Race. Module `createPracticeMarble` shares construction and keeps independent rolling for each marble. P2 fall and respawn were checked in Chrome with the real core. The H panel displays controls and reflects keys configured for P2. Modern view keeps the terrain during an excursion outside the full survey. Regression is covered by a synthetic pose in Chrome. The exact gesture from the video remains to be redone with boost. `npm run check` passes with 412 Vitest tests and all 48 Chrome tests pass.

After a fall, four shards converge on the respawn point per the core's counter. The 3D trajectory is redrawn and cadence is measured in arcade. P2 fall, shards while paused, and respawn were verified under Chrome with the real core. Scenery shadows are crisp with a 24° sun. **Ombre des billes** adds them on demand and stays disabled by default. `npm run check` passes with 413 Vitest tests and all 48 Chrome tests pass.

Respawn shards follow the same counterclockwise circle, centered on the marble and visible in the camera plane. Radius decreases with the arcade counter and each shard carries its player's color. The right pyramid still reuses the left builder, and its two support tiles with missing corners are filled in before the landing mesh. Both touch-ups were checked in the Chrome comparison with the real core. `npm run check` passes with 414 Vitest tests and all 48 Chrome tests pass.

Respawn animation now uses eight shards per player. The solo MAME 0.271 replay served to tune their orbit in `src/rendering/createPracticeRespawn.ts`. It is wider than tall, and its center starts above the respawn point before descending onto the marble. The scene test verifies shard count, location, and orbit span at counter 16, as well as convergence. Chrome comparison was verified during a P2 fall with the real core. `npm run check` passes with 414 Vitest tests and all 48 Chrome tests pass.

Pose reading in `src/emulation/practicePose.ts` preserves X, Z, and height fractions for P1 and P2. A stabilization case was reproduced in MAME 0.271. Offsets of 0.56 and 0.44 units in Z became two single-unit steps. The regression test uses those three values from the core. `npm run check` passes with 415 Vitest tests and all 48 Chrome tests pass. P2 fall and respawn were replayed in Chrome with the real core. Michel's intermittent case remains to be confirmed in gameplay.

Two MAME 0.271 replays validate duo finish in both orders, summary, and transition to Intermediate Race. GOAL keeps the first player's color, read in `src/emulation/practicePose.ts`. In modern view, tiling uses a 16 × 16 texture with stepped joints and light dithering. Cliffs of the final descent extend below the framing, per arcade screenshots. Chrome comparison confirms both visual touch-ups. Native snapshots replayed in Chrome confirm GOAL in both finish orders and exit from modern view at the summary. A duo keyboard run with the Web core remains to be redone in gameplay. `npm run check` and all 48 Chrome tests pass, with 418 Vitest tests.

In duo Practice Race, `practicePose` reads the trigger and offset of the catch-up message. `createPracticeCatchUpLabel` displays "−5 SEC" above the affected player, starting from the marble's return. The timer keeps a separator column between digit outlines. Catch-up was reproduced in native MAME and poses were replayed in Chrome. Full gameplay test with the Web core remains to be done. The "+10 SEC" bonus will be surveyed in Intermediate Race. `npm run check` passes with 420 Vitest tests. All 48 Chrome tests pass.

`terrain.html` loads the Intermediate Race survey in `local-roms/intermediate-terrain.json`. Benchmark `node scripts/measure-terrain.mjs --intermediate` reproduces the survey with MAME 0.271. Framing covers 0 to 306 pixels of scroll and free view shows the full grid. Blue walls, ramp, and three pyramids provide the first study scene. `npm run check` passes with 422 Vitest tests. All 49 Chrome tests pass.

`intermediateRims` restores rectangular rims of the five starting pits and tile corners at straight cliff junctions. The large ramp join is extended to the high plateau. Framings 0, 218, and 306 px were reviewed in Chrome with the existing survey. `npm run check` passes with 428 Vitest tests.

`intermediateRims` fills in the 16 isolated 2 × 2 tile blocks around the ramps, including the one cut by the survey boundary. Top height comes from the first sampled tile of each block. All four groups were inspected in Chrome. `npm run check` passes with 432 Vitest tests and all 49 Chrome tests pass.

Intermediate Race pyramids have their own mesh in `createIntermediateTower` and a 14-tile plinth in `intermediateLandmarks`. Rows follow the 3–4–4–3 pattern with a last row offset by one tile. The test checks footprint and proportions across all three pyramids. Arcade framing at 218 px was reviewed in Chrome. `npm run check` passes with 433 Vitest tests. All 49 Chrome tests pass.

`intermediateRims` clips lateral boundary tiles along a continuous diagonal and extends incomplete tiles along raised straight rims. The same contour is used to generate vertical walls. Tests cover both diagonals and joins in the second half of the survey.

MAME replay confirms movement of the first bridge around (63,58). The four-by-four tile deck visually pivots around Z 60. Its free edge rises 16 units over a 144-frame cycle. `createIntermediateBridge` animates the deck, its turquoise borders, and the purple mechanism in the study scene. Animation loops in study mode. The core phase remains to be wired into the playable view. Terrain processing removes the neighboring stray spike and resets isolated corner tiles to their platform level. Cliffs and bridge cast shadows onto the tiling. `npm run check` passes with 439 Vitest tests. All 49 Chrome tests pass. The bridge was verified at 306 px and in free view, flat then raised. Chrome screenshots show shadows inside pits and on ramps.

The bridge now has a thick deck and low framing for its mechanism. Wave-zone lanes share the same profile. Local file `local-roms/intermediate-terrain-pipes.json` adds triangles for both Rolling Madness 3D pipes, realigned in the arcade grid and dressed with BabylonJS materials. Load this copy in `terrain.html`, then choose **Pont articulé** or **Tuyaux et rampes**. `npm run check` passes with 458 Vitest tests. All 49 Chrome tests pass, and both framings were inspected with the local pipe mesh.

MAME replays `--intermediate` and `--intermediate-impact` isolate respectively P1's dizzy state and engulfment, and P2's break followed by the yellow broom pass. Landmarks in `docs/PROTOTYPE_04.md`. The Web core properly restores a Practice Race state after one iteration, private Chrome test. Starting points for all six courses and the selector remain to be created.

Concrete next action: first wire marble pose and Intermediate Race animation states to the playable view, then survey worm poses to synchronize their 3D rendering. Wand survey remains to be done.

### External reference Rolling Madness 3D

Luca Elia's installer was read on macOS without running the program, using `xtinno` from Binary Refinery 0.11.3. It contains 47 `.ase.mesh` files, including all six terrains and separate models for marbles, enemies, bridges, and obstacles. `level/level1.txt` and `actor/world1.txt` associate Practice with mesh `model/lev1.ase.mesh`. This binary file references 9 textures and 6 lightmap textures. No game source code was found in the installer or on the author's public page. The included license requires permission to modify or redistribute the software. Full extraction is now in `3D_assets_for_animated_entities/`.

[MeltyTool](https://github.com/MeltyPlayer/MeltyTool#supported-formatsgames) has an `.ase.mesh` importer and a reference GLB export for Level 1. All six meshes from the installer match the repository files by Git blob SHA. Improved animations and lightmap textures are proposed in [PR 116](https://github.com/MeltyPlayer/MeltyTool/pull/116), opened during verification. Converting local files and aligning to arcade coordinates remain to be tested if that track is resumed.

## Safari immersive view

Michel confirms capture works in windowed mode. Native fullscreen interrupts capture and audio. The play button opens the immersive view with HUD in Safari prior to 18.2 to work around WebKit bug 272136. Reload, choose Jouer en plein écran 3D then Capturer. Confirm that the game advances and audio remains stable in immersive view in Safari.

## Safari capture and audio crackling

Michel reports that Capturer paused the game and audio crackled. The Pointer Lock hook now awaits the confirmation event if the browser returns a non-promise value. For Safari, the requested RetroArch buffer increases from 64 to 128 ms. Reload in Safari, start, click Capturer, and verify marble movement and audio.

## Testing on Michel's Mac

Michel validates two-player gameplay, audio, and CRT legibility. Safari sometimes shows black screens and slower startup than Chrome. The exact cause remains to be isolated in Safari. Diagnostics time ZIPs, frontend, and core launch. Loss of the BabylonJS graphics context falls back to direct view in the same session. Loss of core context is reported separately. On the next black screen, note the affected view and copy diagnostics from the page.

## Level 1 jump

Michel could not make the jump to the side platforms with Space and the trackpad. Held boost increases from 128 to 256 trackball units per iteration. Given equal start and duration, the real core shows stronger horizontal acceleration. The jump itself remains to be reproduced. Reload the page, start a game, and check crossing from the ramp. Comparative test conditions are in [VALIDATION.md](docs/VALIDATION.md).

## Cathode-ray screen

In Borne et bar 3D, check Effet CRT under Écran cathodique. Sliders adjust curvature, scanlines, and horizontal noise. The HUD mirrors the toggle in fullscreen. Preferences are local. Effect and noise are initially disabled. `src/rendering/createCrtMaterial.ts` contains the tube mesh and shader. `src/ui/crtControls.ts` synchronizes settings. The tube keeps a 4:3 aspect ratio regardless of the video canvas ratio. Glass and raster curvature was strengthened on both axes. `npm run check` passes with 297 tests and Chrome with 38 tests. The real game was observed head-on and in tilted view with the filter active. Reload Vite on port 5173, enable CRT, and compare both framings.

## Two players

P1 uses the trackpad or mouse. P2 uses ZQSD by default, with WASD, arrows, remapping, and disabling in Périphériques de jeu. Filtering in the glue reserves the mouse for P1. Keyboard reaches P2 via the core's D-pad directions. Each trackball follows its input. Tested real core in Chrome with two credits and Start player 2. Verify two-player gameplay comfort on Michel's Mac.

Last updated November 14, 2026.

## Tilted monitor and trackballs

C cycles through Frontale, Moniteur incliné, Écran et commandes, Borne, and Bar. The monitor fills most of the close-up view, with its perspective bezel. Marbling makes ball rotation visible. In-game, the blue one follows P1 deltas. Outside capture, click and drag the red one to verify its animation in the scene.

## Atari System I reproduction

Gozer's `marble.skp` is integrated into the bar after local conversion. Geometry uses the model's dimensions in meters. WebP textures cover the side panels, control panel, and marquee. The monitor's glass and static image give way to the tilted plane receiving MAME video. `src/rendering/createCabinet.ts` builds clickable zones and both trackballs. Blue follows P1. Red represents P2. Both Start buttons and both coin returns are active outside capture. `npm run check` and the Chrome suite pass. The real game was observed in all four framings.

Open the Borne et bar 3D scene, choose Borne to see the whole cabinet, then Écran et commandes to inspect both trackballs. Checks in [VALIDATION.md](docs/VALIDATION.md) and sources in [the asset registry](public/assets/README.md).

## In-game camera shortcut

In Borne et bar 3D, C cycles Frontale, Écran et commandes, Borne, then Bar. Close-up framing shows screen, trackball, and buttons. The cycle is defined in `src/game/cameraPreset.ts` and goes through the same camera change as the HUD and page selectors. The browser test verifies capture and boost during transitions. Close-up view was inspected in Chrome with the real core. `npm run check` passes with 289 tests and the Chrome suite with 34 tests. To test, capture the trackpad in 3D view then press C at each framing change.

## 3D trackball fix

`src/rendering/createCabinet.ts` composes rotations in cabinet axes. The top rolls in the gesture direction, including after a diagonal. Maximum visual amplitude is 45° per sample. The core hook keeps the same deltas. `npm run check` passes with 288 tests, and Chrome with 33 tests. Gestures under Pointer Lock confirmed axes in the scene with the real core. Separate optical tests at the start of Level 1 confirm the primary direction in all four directions. See [measurements](docs/VALIDATION.md#sens-de-rotation-de-la-boule-3d--10-novembre-2026).

For Michel's test run, reload the local Vite 5173 server, choose Caméra → Borne, click Capturer, then compare short vertical and horizontal gestures after a diagonal gesture.

## Prototype 03 — current state

Michel authorized the five evolutions of [specification 03](Marble_Madness_Prototype_03_SPEC.md). They are implemented. The scene keeps a single MAME session and its reference views.

- Explore the bar with ZQSD, WASD, or arrows. Trackpad steers look direction. E nearby transfers Pointer Lock from the BabylonJS canvas to the arcade canvas. Esc pauses and purges inputs. Leaving the cabinet returns to the bar.
- To-scale cabinet, side artwork, material grains, and static shadows. The trackball rotates per observed native deltas. Choose Borne then Capturer in the HUD to see it during gameplay.
- Disengageable positional audio during exploration. The adapter reuses the OpenAL master. In-game, original stereo routing is restored.
- Éco, Équilibrée, or Retina quality, with DPR caps of 1, 1.5, and 2. Diagnostics expose draw calls and available CPU/GPU times.

Code entry points for resumption in `src/ui/videoComparison.ts`, `src/input/barExplorer.ts`, `src/app/createVideoView.ts`, `src/rendering/createScreenStage.ts`, `src/audio/spatialOutput.ts`, and `src/emulation/emulatorjs.ts`. Browser tests in `navigation.spec.ts` and `spatialAudio.spec.ts`, unit tests alongside rules.

Chrome validated all 33 scenarios. A run with the real core measured positional signal, capture transfer, native deltas, and mesh rotation, then stable pause. All four framings were inspected. Resolution setting was verified at DPR 2. See [VALIDATION.md](docs/VALIDATION.md).

Production test run completed with ten active minutes, ten stable pauses, 36,094 video copies, one audio source, zero JS errors, and zero remote requests. `npm run check` and all three preview tests succeeded. Both digital evidence files are in `third_party/prototype03-evidence.json` and `third_party/prototype03-endurance-evidence.json`. The harness re-runs with `npm run measure:endurance -- --local-files` against a preview via `MARBLE_TEST_URL`. See [protocol](docs/ENDURANCE.md).

Next manual action in Safari and on a 120 Hz screen. Open local Vite 5173 server, launch the core, Explorer → E → Esc, then test all three profiles and listen to audio at different distances. Safari WebDriver refused the session because remote automation is disabled. Fallback WebKit did not open a tab within the timeout.

## Prototype 02 history

Michel explicitly authorized all five steps: cabinet, framings/transition, interactions, materials/lighting, first bar. **All are implemented**. Read Marble_Madness_Prototype_02_SPEC.md; AGENTS and spec01 point to this extension. Previous cabinet/bar exclusions in history no longer block work.

New **Borne et bar 3D** option, HUD Camera **Bar / Borne / Frontale**. Full cabinet and artwork, trackball and buttons, coin door, speakers; first room with floor/walls, counter, bottles/shelves, table/stools, and pendant lights. Original procedural materials, warm/cool lighting, no external dependency or asset added. No FPS navigation or spatial audio.

Outside capture: buttons/coin door Credit, Start1/2; screen or trackball → front transition and synchronous capture. Same session and same pulse methods. During capture, 3D clicks are ignored; HUD and shortcuts preserved. Single camera without attached controls. 0.65 s transitions even while paused, temporary rAF owning rendering, video copy always after native draw. HUD resize retargets without breaking animation; blur/Esc/visibility/dispose cancel.

Files: rendering/createCabinet.ts, createBarRoom.ts, decorTools.ts, createScreenStage.ts, createVideoScene.ts; app/createVideoView.ts; game/cabinetAction.ts, cameraTransition.ts; ui/videoComparison.ts and playControls.ts. Protocol/usage: docs/PROTOTYPE_02.md. Marquee text fixed vertically and panel lowered so the trackball stays below the image; non-overlap test.

Validation: npm run check succeeded, **250 tests / 27 files**, coverage 99.48% statements, 99.34% branches, 100% functions, 99.45% lines. **29 Chrome tests**, **3 preview** succeeded. Real picking of buttons, coin door, and trackball, hover, capture and click blocking, video pixels, and zero-remaining disposal of textures/meshes/materials/lights/cameras verified. First pass with new dependencies: test navigations and sceneless helper; stabilization then scroll fix in the harness to place clicked points in the viewport. No skipped tests or lowered thresholds. Inspection helper in tests only.

Real Chrome 157.0.8103.40 runtime: Credit/Start via meshes, capture from trackball, bar transition while paused, then stable frame 1115, 402 copies, front view, boost and pending purged, P1/P2 buttons empty, audio source 1, zero JS errors. Three final screenshots `/tmp/marble-prototype2-{bar,cabinet,game}.png` inspected. Digital evidence to keep in third_party/prototype02-evidence.json. Listening and physical comfort not certified. Video callback metrics exclude transition rAF rendering.

**Endurance 02 completed on isolated production build**: ten new intervals, **600.02 s active**, frame 36772, 36063 copies, zero JS errors or remote requests. Ten stable pauses, pending (0,0), boost and buttons on both ports purged, audio source 1. Listeners 721 at first reading then 720 constant; JS heap 16.73–28.87 MiB returning after GC, nodes 4646–4693. No blocking incident observed, no general proof of absence of GPU/WASM leaks. Average video callback 0.459–0.550 ms, max 9 ms; excludes transition rAF and GPU completion, not a fine comparative benchmark.

Test run: npm run build then local preview 4175, MARBLE_TEST_URL=http://127.0.0.1:4175/ PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance -- --local-files. The harness selects the fixed ZIPs from the roms folder via local inputs; no copy in dist/upload. Temporary report test-results/endurance.json, full evidence third_party/prototype02-endurance-evidence.json, localFileSelection=true, scene=prototype-02-cabinet-bar, complete=true. Preview 4175 stopped after test run; dev server 5173 kept. A 2-min series had been stopped for hover and a 6-min series interrupted by HMR; none of their minutes were reused.

**Picking also verified in production** without dev helper: clicks projected from declared framing on Credit/Start produce all four expected native calls, then the trackball captures and selects Frontale. Esc pauses, pending zero, 64 copies on this short run, zero JS errors. Evidence: third_party/prototype02-production-evidence.json. Final screenshots of the real game inspected as noted above. Evidence 01 remains historical, not overwritten.

Concrete next action: Michel reloads dev 5173, opens Jouer en plein écran 3D, chooses Caméra→Bar/Borne/Frontale, and tries buttons/coin door/trackball/screen. Human test run for rendering and comfort, then prioritization of polish; full listening, Safari/120 Hz, and GPU cost remain open. All five authorized steps are complete, no FPS navigation or spatialization added. No new dependency, Git initialized, or deployment.

## Prototype 01 history — state before extension 02

Original Marble Madness works with EmulatorJS 4.2.3 + MAME 2003-Plus. Credit, Start, relative trackpad, pause/resume, volume, diagnostics, and new session are available. The main page shows the same live session, in side-by-side comparison, on a standalone BabylonJS plane, or on a screen in a 3D scene. `scene.html` remains an old standalone demo.

Michel played up to Level 3. On November 8 he confirms: **"ok, c'est bon"** after fixing flicker and video filtering. This feedback validates that visual issue; do not extend it to endurance or full audio listening. Braking comfort on the slope exiting the waves at the end of Level 3 remains an open item. C is implemented, its full human test run remains open. D is implemented and the fixed image is confirmed by Michel. E is prepared and technically verified; details and final procedure in `docs/RELEASE.md`.

Michel rejected **0.50× as unplayable** and requested boost on Space, then continuing 3D rendering. This feedback supersedes the historical calibration recommendation below. Specification section 15 and AGENTS.md record this authorized evolution. Do not ask for the same capture again.

Default/reset normal gain is **1.70×**. A saved preference at 0.50× is migrated to 1.70×; other valid gains are preserved. Hold **Space**, then steer with the trackpad: continuous native command of L1 norm 128 counts per iteration, replacing deltas while held. Releasing returns to normal control. Esc, blur, hidden tab, and disposal purge boost; Space does not unpause. Physics remain in MAME. Comfort, braking, and jumping are not yet human-validated.

Choose **Écran en scène 3D**: same animated video on a screen with frame, stand, plinth, lighting, and gridded floor. Same session, texture, and loop, fixed camera; no level rebuilt in meshes or external asset added. Details: docs/COMFORT_AND_3D.md. **Fullscreen and HUD now delivered**: Jouer en plein écran 3D → Crédit/Start/Capturer; Pause and Reprendre/sound present. Returning to page exits paused. Esc releases/purges and may exit fullscreen depending on browser. API refusal: immersive fallback in window. Enters paused, no implicit resume. Same session/texture; buttons delegated to shared controls, states/messages synchronized, observers/listeners cleaned up. Michel confirms on November 10 that fullscreen works well, then authorizes both fixed cameras. **Frontale/Perspective camera delivered** in HUD and on page, synchronized selectors, active in 3D scene. Perspective initial; choice kept during session, without storage. Frontale orthographic straight and enlarged, full plane visible; plinth partly out of frame to prioritize gameplay. Same camera/texture/session; no calls to controls or play/pause changes. Esc releases trackpad to use selector, Capturer resumes. Michel confirms views then requests capture shortcuts and next test run. **Shortcuts implemented**: 5/(=Credit, 1/&=StartP1, 2/é=StartP2, only under active/unpaused capture, outside inputs and Ctrl/Alt/Meta. 120 ms pulse, repeats absorbed. StartP2 uses port 1 (no new relative P2 control); two sets of timers, all purged on interruption. Help in HUD and capture status. Spec section 16: authorized request.

**Automated endurance completed**, complete=true: ten intervals, **600.40 s active**, final frame 36794, 36090 video copies, zero JS errors and remote requests. All ten pauses are stable, boost/pending/buttons on both ports purged. All six aliases produced the exact twelve expected native calls. Combined CPU submission average copy+render 0.144–0.177 ms, max 10.2 ms; not GPU time. Listeners 718 constant, one audio source, and context suspended while paused. JS heap 19.73–21.58 MiB: variation with increase on later readings, not proof of no leak; GPU/WASM memory unmeasured. One game then automatic arcade/attract states, not ten minutes of human play or certified listening.

Reproducible command: PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance, dev server and local ROMs required. Report test-results/endurance.json; digital evidence saved in third_party/endurance-evidence.json. Protocol and result: docs/ENDURANCE.md. Early intervals overlapped with build/browser checks; do not use this series as a fine comparative benchmark. No modification to ROMs or real user preferences. Concrete next action: prototype 01 review with Michel, distinguishing achieved technical test run from listening/comfort/120 Hz/Safari still open, then define prototype 02 scope before modeling a detailed cabinet or bar.

Current validation: **npm run check succeeded, 231 tests / 25 files**. Coverage: 99.48% statements, 99.31% branches, 100% functions, 99.44% lines. Chrome dev **27 tests succeeded**, preview **3 tests succeeded**. Pure tests for all six aliases/modifiers and two independent ports; Chrome tests capture, repeat, input, pause/out-of-capture, and teardown. First pass blocked by Playwright.press(é): native keyboard CDP used for this key, other keys remain Playwright keystrokes; real runtime verifies all twelve expected calls. All ten endurance intervals are now complete. BabylonJS chunk size warning >500 KB kept; no dependency added, no deployment or Git repository initialized. Following sections preserve history; the current state above supersedes their next actions.

## Launch and verify

```sh
npm ci
npm run setup:emulator
npm run dev
```

Open `http://127.0.0.1:5173/`. Michel placed `marble.zip` and `atarisy1.zip` in `roms/`, ignored by Git. The local server preloads them via two fixed loopback-only routes; no copy into public/dist, no upload or browser storage. Sizes/SHA-1 of all 30 dumps are verified and the canonical ZIP is assembled in memory. File pickers remain available and take priority.

Vérifier et préparer → Démarrer l'émulation → wait for MAME → Crédit → Start → Capturer. No click-and-hold. Esc/focus loss/hidden tab: pause, mute, and purge. Explicit resume/capture; no automatic resume. After modifying the glue, **hard-reload the page**.

For the build, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`; manual ZIP selection, no dev preloading. Preview test servers are temporary; the dev server can stay running on 5173. No deployment or Git repository initialized.

## Controls and measurements to preserve

- Shared X/Y gain 0.25–4×, default/reset 1.70×; only gain/volume are stored (`marble.gain`, `marble.volume`). Normal mode remains linear. Explicit boost is separate and not persisted. Migration only from the rejected 0.50× candidate.
- Human readout: `saturated=0`, raw peak 289, sent 492, pending 927; native X -927..748, Y -345..917, inversions 102/97. Signs and large movements get through, but these counters do not measure marble speed or braking effectiveness.
- `nativeSampling` observes the last poll after each iteration, not all C/MAME polls; no exhaustive native sum. Pause preserves statistics and breaks sign sequences. Nouvel essai resets only measurements. Copying diagnostics remains local, with manual fallback.

## Critical modules and contracts

- `input/relativeMotion.ts`: linear gain, fractions, int16 clamping of pending, excess discarded, purge. No second per-frame accumulation or 45° rotation.
- `input/buttonPulses.ts`: simulateInput(0, 2|3, 1|0), 120 ms pulse then release; timers and buttons released on interruption.
- `ui/playControls.ts`: user gestures, source Pointer Lock, settings, interruptions, and cancellation of a still-pending capture.
- `emulation/emulatorjs.ts`: pinned internal APIs, MEMFS without persistence, existing pause/audio, one instance per document. New session = reload, no fake destroy. MAME xy_device=mouse, input_interface=retropad, original driver sensitivities and inversion preserved. No raw/unaccelerated mode.
- `emulation/coreInputPatch.ts`: verifies both JS/WASM SHA-256 hashes and markers before hooking. RetroArch ABI 6dd4353, rwebinput_mouse_state_t at head of userdata: size 64, pending 40/44, poll 48/52, buttons 56. No synthetic mouse events. **Do not change hashes without re-verifying ABI and tests.**
- `emulation/coreVideoPatch.ts`: flag reset before iteration, raised by drawArrays/drawElements on source canvas and default framebuffer. One notification after draw; iterations without draw keep texture. Intermediate FBOs/other canvases ignored. Targeted hook on pinned renderer, not generic support for blits/instanced draws. Third-party files on disk/WASM unchanged. Input diagnostics independent of video signal.
- `emulation/videoSource.ts` → `ui/videoComparison.ts` → lazy import `app/createVideoView.ts` → `rendering/createVideoScene.ts` / `videoLayout.ts`. Fixed camera, black emissive material + texture, image processing disabled. HtmlElementTexture copies WebGL without 2D context or CPU pixel readback, then renders in the same call. PreserveDrawingBuffer remains false. Bilinear filtering to avoid a second nearest at fractional scale during scroll. Frames follow the aspect announced by the core (336×240, aspect 1.333333373), distinct from presentation resolution, including any borders.
- Video owner removes subscription/ResizeObserver then disposes texture, scene, and engine. No standalone loop, second emulator, or audio chain. Copies stopped in direct/background mode; source hidden via visibility in single view. GPU error: direct fallback. No view change resumes the game.

Versions and evidence: `docs/DECISIONS.md`, `third_party/README.md`, and manifest. Read `AGENTS.md`, BabylonJS guide, README, architecture, and spec on every resumption.

## Latest technical validation

- `npm run check`: **200 tests across 22 files**, format/lint/types/coverage/build. Coverage: 99.39% statements, 99.46% branches, 100% functions, 99.35% lines.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: **19 ROM-free tests** succeeded.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:preview`: **3 ROM-free tests** succeeded. Compiled code, manual selection, runtime hashes/notices, and exclusion of ROMs/dev routes are verified. CI workflow completed; no attested GitHub run without an initialized repository.
- Isolated rebuild of milestone E (before adding trackball test): Node 24.20.0 / npm 11.19.0, offline npm ci from cache, existing emulation resources verified, check succeeded. **49 dist files byte-for-byte identical**, same platform and versions. Temporary copy without ROMs or initial node_modules. Broken Homebrew Node bypassed via nvm Node; no system or dependency version changes.
- Spot build test with local ZIPs, Chrome 157 headless: race and comparison, real capture with hidden source, 20 native events; frame 1097 → 1187, copies 1089 → 1179. Stable pause frame 1210/copy 1202. No JS errors or remote requests/dev preloading. No ZIP added to build/tests.
- Flicker fix: before, 3 undrawn/transparent copies out of 331; after, zero out of 338 in comparison then 579 cumulative with hidden source. Tests for undrawn iterations, FBO, multiple draws, markers; GPU test for edge filtering. Human confirmation received afterward.

## Next action

Priority on Level 1 jump (see below), then run the 10-minute test from `docs/RELEASE.md` on Michel's Mac: gameplay, braking, listening, focus loss, resume, comparison, resize, and new session. Record feedback without reimplementing physics. Safari, 120 Hz, and DPR remain unvalidated. Displayed CPU cost is neither full GPU time nor an emulation speed measurement. BabylonJS size warnings and tooling limits remain documented. No cabinet, bar, remaster, deployment, or new dependency.

## Priority result of November 9: effective response

The 416 guard did cap 20 pulses at 1.70× gain, but Michel sees **no improvement**. Attempt rejected, associated checkbox/API/module/tests removed; no other limiter or boost added. Do not ask to check it again. The linear transmission test for a large pulse is preserved. Private setPending write and pre-hook remain for diagnostics, not used by the player.

Harness `npm run measure:impulses` (about 4 min), or `-- --quick` (about 1 min), loopback dev server already running and local ZIPs available. Isolated browser; fresh document/runtime for each trial, Credit 700..707, Start 710..717, native pulse 1200, optical tracking 1199/1206/1212. Intentional bypass of gain and event filter to observe only downstream driver response. Snapshot-restore attempt did not have identical starts: rejected, no snapshot kept. Harness checks starts, setpoints, and images. Numerical report in test-results, ignored. Script is not run in CI.

11 full trials + 4 detailed early-frame checks, then 3 short trials reproduced with the kept script: zero JS errors. Identical marker start (525.494; 168.016), canvas 1110 × 832, neutral trials motionless. Scenery identical across 360000 pixels in checked screenshots, so no camera translation for these measurements. Hundredths of a pixel are not physical precision.

At frame 1212, 64×1 moves the marker by (+2.93; −4.06) pixels, 256×1 by (+9.73; −3.89), 416×1 by (−23.21; −3.72). Visible response is not monotonic with peak. 256×6 reaches about 29.91 pixels of displacement versus 10.48 for 256×1. This does not isolate internal counters or prove jumping or fidelity of artificial inertia. No RAM read/write or ROM code.

Tested pure measure: `src/diagnostics/blueMarker.ts`, bottom-up WebGL RGBA excluding HUD and edges, limited to Level 1 start. Imported by harness only, not by the app. Eight tests, coverage included. Reference results without image or state: `third_party/impulse-response-evidence.json`; protocol and interpretation: `docs/INPUT_RESPONSE.md`. Control images remain in /tmp.

**Analog readings now observed (see below).** Next investigation: interpret the same sequences or reference comparison before any new tuning. Do not conclude a specific bug from screen tracking; no jump fix validated yet. Overall human test run remains open; do not add a cabinet, bar, or new physics.

## Port trace completed November 9

`npm run measure:ports -- --quick` adds observation of the real `trakball_r` handler to the harness, not a reconstruction from the mouse. The script captures real WebAssembly exports Eh/Ch and verifies WASM bytes by SHA-256. Module `diagnostics/trackballPorts.ts` checks five static lines of Memory_ReadAddress16 at address 9849616, table handler 17927, arity 2. Provenance: pinned sources atarisy1.c/memory.h and data segment 43696 from the core archive, without ROM.

A WASM trampoline calls the original once with the same arguments, logs returns, and returns them as-is. Bounded window, isolated measurement errors, restoration on teardown, owner check. No change to arcade program code or RAM, no trace in normal frontend or build.

Five prototype native X trials 0/64/256/416/768, then three short trials of the kept tracer 0/256/0: starts and image outputs identical to previous harness, no JS errors, 64 reads per trial (4 per frame label), mask 65280, no loss or observation error on the kept tracer. Both player 1 ports return the same bytes for these X pulses; the other two ports also change, logs kept without treating them as an active second player.

After start 0, player 1 reads give: 64→239 then 237 (steps −17 then −2), 256→188 then 179 (−68 then −9), 416→146 then 131 (−110 then −15), 768→53 then 26 (+53 then −27). Final bytes are consistent with 30% sensitivity and X inversion. At 416, visible response reverses direction while ports normally reach −125 mod 256; their wraparound alone does not explain this case. At 768, steps are ambiguous mod 256. This signed decoding is a diagnostic convention, not proof of the program's algorithm. Do not modify gain.

Timing of case 256: setpoint before iteration 1200; reads under internal counter 1201 still 0, under 1202 value 188, under 1203 value 179. The counter read inside the handler is offset by +1 relative to `iterationFrame`, also kept. Do not call these labels CPU cycles or physical trackpad latency.

26 new ROM-free tests on tracer/decoding, rejecting invalid versions/maps/signatures, bounds, exceptions, observation errors, and restoration. Check 134 tests; 16 Chrome dev tests and 3 build tests. Evidence without ROM/image: `third_party/trackball-port-evidence.json`. Report `test-results/trackball-ports.json` ignored. Protocol and interpretation: `docs/TRACKBALL_PORTS.md`.

This comparison was completed below. The Level 1 jump remains unfixed.

## Reference comparison completed November 9

MAME 0.271 ARM64 was already installed at `/Applications/mame0271-arm64/mame`; it is not the latest version. Original archives validated, ttl BIOS forced, no download or modification of ROMs. Kept launcher:

```sh
MAME_BINARY=/Applications/mame0271-arm64/mame npm run measure:reference
```

No HTTP server required. 20 real trials: amplitudes 0/64/256/416/768, phases −1/0/1/2, fresh process for each case, controlled credit/Start inputs. Replay of real bytes from all four ports, second tap checking received values, 64 reads per tap and trial. No change to program RAM/code. Reports/configs isolated in ignored test-results/reference; NVRAM, autosave, and config writing disabled.

Decisive result: with the same −1 offset across all five cases, Web and native displacements agree within 0.063 native pixels per axis maximum. Reversal at 416 also exists in the reference. A naive comparison without alignment showed a large discrepancy; four phases kept to avoid this false conclusion. No defect specific to 2003-Plus demonstrated, no core replacement or input fix justified by this trial alone. No successful jump validated.

Files: scripts/compare-reference.mjs, scripts/reference/replay.lua, src/diagnostics/referenceReplay.ts and its 19 tests. Digital evidence without ROM/image/state: third_party/mame-reference-evidence.json. Protocol and limits: docs/REFERENCE_COMPARISON.md. Spot Web replay 64/256/416 also recovers the same centroids with zero pending; it remains an exploratory check. Video clock and timer differences: no identity of internal states.

Concrete next action: measure the temporal shape of a real fast gesture, then compare profiles of equal total displacement spread over multiple iterations. Do not propose a new limiter or arbitrarily increase Michel's gain. Level 1 jump and Level 3 braking remain open.

Validation of this task: `npm run check` succeeded, 153 tests / 17 files, coverage 99.09% statements, 99.13% branches, 100% functions, 99.04% lines. Chrome: 16 dev tests and 3 preview tests succeeded. Initial check attempts only requested doc formatting; first browser test run was blocked by the HTTP sandbox, then succeeded with proper execution permission. The launcher prototype initially rejected the read window truncated at delayed phases; stop pushed to 1214, then all 20 full trials succeeded. Existing BabylonJS chunk size warning kept. No human comfort test of jumping performed.

## Temporal gesture: November 9 delivery

The following diagnostic is implemented and verified; now await **Michel's physical gestures**, without announcing the jump as fixed.

1. Hard-reload the page and launch the game at the usual 1.70× gain.
2. Esc → Nouvel essai de mesure → Capturer. Make a single fast gesture, wait about half a second without moving, Esc → Copier les diagnostics.
3. Same procedure for a medium gesture in the same direction, fresh trial.

The motionTimeline block is intentional: first accepted gesture after arming, 128 lines max, stop after 0.18 s silence and zero poll, or first callback after two seconds. Pause keeps the log, resume/capture preserves arming without movement. Modified gain also cancels arming: re-arm afterward. Events before interrupted sampling remain in unsampledEvents. Each line: pre/post-gain event sums and their time bounds, internal frame, and last native poll. Do not sum last polls as an exhaustive counter, nor call timestamps hardware trackpad times. No new gain/filter/limiter/inertia, no storage or upload.

Kept harness: npm run measure:profiles; subset `-- --quick`. 11 full trials (totals 1536 and 416, variable durations), 6 checks with fixed 360000-pixel RGBA region. Same start, exact polls, neutral motionless, zero JS errors. At 1536 total: final ΔX −53.12 in one shot, +105.71 with 6×256, +95.79 with 12×128; 4×384 remains negative. All repeated checks recover identical digital images; 24 scenery comparisons unchanged. Spreading can flip direction, but no universal optimal duration or player fix is demonstrated. Jump and braking unvalidated. Frames 1199/1206/1212/1224/1236.

Modules: input/motionTimeline.ts, diagnostics/impulseProfiles.ts, diagnostics/staticRegion.ts, emulation/emulatorjs.ts hook, UI help, and script measure-impulses.mjs. 17 new pure tests across three files, one new ROM-free browser test of the hook. Protocol: docs/MOTION_PROFILES.md. Digital evidence without ROM/image/state: third_party/impulse-profile-evidence.json. test-results reports are temporary and Playwright may clean them up.

Real runtime check after fix: three automated mouse events, 3 non-zero samples across 3 iterations, quiet stop, 14 lines, no JS errors. This is not a physical gesture. Initial temporary probe in test-results was deleted by Playwright and interfered with lint; final run from /tmp, succeeded. Non-regression of stale duration on canceled arming reproduced, fixed, and tested. Already-running dev server 5173 reused, extra attempt refused because port busy, without stopping existing server.

Final validation: npm run check succeeded, **170 tests / 20 files**; coverage 99.26% statements, 99.34% branches, 100% functions, 99.22% lines. Chrome: 17 dev tests, 3 preview succeeded. Existing BabylonJS chunk warning kept. No Git initialized, no new dependency, deployment, or copied ROM.

Concrete next action: analyze Michel's two real motionTimeline logs, compare event duration, bursts, and large polls per iteration, then choose a fix only if this data justifies it.

## Startup block fixed November 9

Michel could no longer start a game: MAME disclaimer absorbing controls, then buttons grayed out after capture/Esc. Real reproduction done. The installed core offers skip_disclaimer; option defined in pinned source core_options.c and present in its WASM. defaultOptions now enables mame2003-plus_skip_disclaimer=enabled; skip_warnings not enabled. No binary, ROM, BIOS, gain, or physical control modified.

Credit and Start remain accessible after Esc. A click explicitly resumes if needed before pressing; if the core is active, no new resume that would purge an ongoing press. Policy in input/arcadeCommand.ts, 4 unit tests; UI wired and pause message clarified. Esc/focus loss/hidden tab keep pause/mute/purge, focus return always passive. A fifth new test verifies config option without hiding warnings. Chrome regression: capture → Esc → Credit/Start, resume before press, Start directly from pause. Capturer is not required to start.

Real game Chrome 157 headless, local archives: attract mode without prior movement, Credit from pause then Start launch an observed game (score 0, time 60), then capture/Esc leaves buttons accessible. Credit then advances from frame 1112 to 1139, no JS errors. Screenshots inspected in /tmp, digital evidence third_party/startup-controls-evidence.json. No new evidence on human comfort, audio, or jumps.

Hard-reload the page. Wait for the game screen, Crédit → Start joueur 1 → Capturer. Diagnostic gestures remain to be done separately, with Nouvel essai after Esc. The frontend start signal is not an attract-mode detector; do not claim a command during boot is accepted.

Check: 175 tests / 21 files, coverage 99.27% statements, 99.35% branches, 100% functions, 99.22% lines; format/lint/types/build succeeded. Chrome dev: 18 dev tests and 3 preview succeeded. Usual BabylonJS chunk warning kept.

## IMPORTANT: simplified measurement protocol after Michel's feedback

Michel had indeed done an acceleration then Esc and Copy. Do not ask him whether he sent a medium or fast gesture: the defect came from the log stopping after the first small movement. His text contained 300 ms / 35 events / L1 peak 319 in the segment, versus global X peak 916 outside the segment. Those lines did not necessarily measure the sought acceleration. Logging is now fixed.

Single instruction after hard reload: **Nouvel essai → Capturer → perform an acceleration → Esc → Copier les diagnostics.** No pause to time, no extra medium gesture to classify. UI shows ready/in-progress/complete status. Small preceding movements no longer disqualify the measurement.

motionTimeline observes until Esc (or interruption/gain change). Silence or limit closes a segment then continues. Keep best segment and candidate, each limited to 128 lines / two seconds checked at callbacks. Selection by largest L1 peak of intermediate sent batches or last poll, tie to first. selection exposes criterion, ID, peak, and end cause. Other segments are not exported. Delta cancellation can keep an intermediate peakSentL1; unpolled events of the chosen segment remain separate. No modification to controls or gain, no timer, listener, storage, or network added. Do not call the criterion a physical measurement of marble acceleration; a limited segment may be truncated.

Pure tests: small gesture then stronger then weak, Esc before poll, many segments and limits, cancellation by opposite event; 4 new tests, 11 module tests. ROM-free Chrome: capture and same segments via hook. Real core with local archives and automated Chrome movements: initial peak 813, next 9900, second segment chosen, one line, status complete after immediate Esc, no JS errors. Not a physical trackpad. ROM-free digital evidence: third_party/strongest-gesture-evidence.json. Details: docs/MOTION_PROFILES.md.

Validation: npm run check succeeded, **179 tests / 21 files**; coverage 99.29% statements, 99.39% branches, 100% functions, 99.24% lines. Chrome dev 18 tests, preview 3 tests succeeded. Existing chunk warning. Still no Git initialized or new dependency; ROMs unchanged.

Next action: read Michel's next automatic acceleration log without asking him to qualify the segment himself. Jump and braking remain open, no control fix inferred from this UX change alone.

## Automatic arming on each capture — latest fix

The latest user log contains native X peak 1189 and saturated=0, but motionTimeline idle/gain 1/no lines with player gain 1.70×. This proves the observer was not armed, not that input was applied at gain 1. Do not blame a missing click; the flow must no longer depend on the button.

Every successful uncaptured→captured transition calls resetMetrics: global and native stats reset to zero, timeline armed at current gain. Same helper as Nouvel essai, which remains optional. A refused capture does not trigger setCaptured(true), so it does not reset measurements. Pause keeps the log, resume alone keeps it, next capture starts a new log. Controls/gain/physics unmodified, existing purges preserved.

User instruction after hard reload: **Capturer → perform an acceleration → Esc → Copier les diagnostics.** No Nouvel essai required; strongest-movement selection still active. Capture UI and ready/in-progress/complete status updated, README/MOTION_PROFILES/ARCHITECTURE describe this behavior. Hook browser test no longer calls resetMetrics before capture, verifies 1.70× gain then a recapture at 2× with zero counters and fresh segment. Credit/Start order assertion filters redundant Pointer Lock pause notifications; no automatic resume added. First pass 17/18 due to these notifications, rerun 18/18 succeeded.

Real runtime and local archives, automated Chrome movements without Nouvel essai: first peak 1958, next 16828, second segment chosen, one line and status complete/gain 1.7 after Esc, zero JS errors. Not a physical trackpad test. Digital evidence without ROM/image/state: third_party/auto-measure-evidence.json.

Validation: npm run check succeeded, 179 tests / 21 files; coverage 99.29% statements, 99.39% branches, 100% functions, 99.24% lines; format/lint/types/build pass. Chrome dev 18 tests, preview 3 tests succeeded. Preview run had been blocked by an automated permission check failure (usage limit, not security refusal); relaunched after user resume, succeeded. Usual BabylonJS chunk warning kept. No Git initialized, no new dependency, no ROM or user preference modified.

Next action: analyze the next log obtained via capture alone, without imposing another prior step. Jump and braking still open.

## Real profile now available — do not ask for the same test again

Michel provided the new complete log: gain 1.70×, status complete, reason interrupted, 95 lines, 96 non-zero events / 1.391 seconds, 52 non-zero native samples over a span of 85 iterations. All 95 lines have sentX/Y strictly equal to polledX/Y; sums −5737/+6257, saturated=0, no unsampled events. Native L1 peak 1182 at (−608,+574), other peaks 1151 and 1054. This validates hook observation for this trial, not all polls or internal marble speed/physics. The profile is usable: no new prior manipulation to request from Michel.

Real investigation performed from /tmp, probes derived from existing harnesses, no application code changes:

- Web Chrome 157, native X/Y from log replayed before 1200..1294, gain not reapplied, fresh runtimes, fixed Credit/Start, neutral/profile/neutral. Polls received exactly, identical starts, neutrals motionless, zero JS errors.
- Real handler trace with preserved SHA/map/signature, window 1198..1319: 488 reads per trial, no loss/error. Around the big peak, port 0 goes 212→27→190. The mod-256 delta is ambiguous, not proof of internal code.
- Existing MAME 0.271, ttl BIOS, two neutral/profile cases, two independent taps each checking 488 reads; same fixed −1 phase calibrated before this log. After the window, hold the last counter value, not an artificial return to zero. Seven optical measurements agree with Web within 0.158 native pixels per axis. No Web-core-specific difference demonstrated.

Replay is per-iteration, not a reproduction of macOS timestamps or the entire human game. Tracking is screen-space, not physical coordinates. The marker enters the scenery witness region during this displacement: do not claim it stayed static or that the camera moved from these pixels alone. No successful jump verified and no input fix justified for now.

Digital evidence and full profile without ROM/image/state: third_party/captured-motion-evidence.json. Method: docs/CAPTURED_MOTION.md. Replay prototypes were outside the repo in /tmp; permanent scripts were not modified. Numerical shape suffices for future controlled tests from scripts/measure-impulses.mjs and the existing tracer.

Check for this task: npm run check succeeded, 179 tests / 21 files, 99.29% statements, 99.39% branches, 100% functions, 99.24% lines; format, lint, types, and build pass. Permanent dev/preview browser tests not re-run, no UI code modified; all five real trials described above were executed. Usual BabylonJS warning kept. No gain modified, ROM downloaded/copied, new dependency, or Git repository initialized.

Concrete next action: compare amplitudes/calibrations of this same kept profile in a controlled start scene, without contacting Michel again to redo capture. Do not reintroduce the rejected 416 limiter, inertia, or turbo; document a real effect before proposing a fix.

## History — 0.50× calibration since rejected by Michel

This section describes the previous delivery; apply the current state at the top of the file. The 0.50× button and recommendation are no longer available.

Permanent command npm run measure:calibration added to the existing harness, with --phase-check and --refine; dev server/local ZIPs required. Pure module src/diagnostics/captureCalibration.ts: numerical validation, X/Y profile, prefix scaling with error <1 count/axis, int16 overflow rejection, eight-iteration window around peak (indices 62..69), and check planes. 20 new unit tests, ROM-free. No import of this module in the app.

25 real Chrome 157 trials: 12 full/stroke at equivalent gains 0.425/0.85/1.275/1.70/2.125; 5 phase (input/observations shifted by +1); 8 refined at 0.40/0.45/0.50 in both phases. Compliant polls, comparable starts, neutrals motionless, no witness pixel modified across 40000 pixels per frame, no JS errors/lost trace/observation errors. Full 1.70× identical to previous replay. Check of historical quick ports mode: neutral/256/neutral, 64 reads per case, success. No profile redistributed in time.

0.85× looked good in the first phase but becomes near-zero with +1 iteration: do not recommend it on its single favorable result. Refined gains stay in the expected direction at both timings; 0.50× has the largest response in this group. At 36 iterations: 0.50× gives (−9.141,+2.788) then (−12.115,+4.804) native pixels; 1.70× gives (+2.985,−3.136) then (−5.061,+0.889). These are optical positions, not proof of speed, internal physics, or successful jump. Hundredths are not physical precision. Full 0.50× was not replayed in this matrix; choice based on isolated stroke and direction consistency, not a universal optimum or certified comfort.

Button "Essayer 0,50× pour les accélérations" added to controls. Same setter as slider/reset: only an explicit action changes/stores gain. No change before click, default still 1×, reset still 1×, no resume from pause. Return to 1.70× via slider. Purely linear gain, no 416 limiter, inertia, or turbo. Candidate constant in relativeMotion, additional test verifies large linear deltas. Automatic measurement capture preserved, new candidate stored after click then capture.

Chrome: new test of button without resume, persistence, and return to 1.70×. Real runtime: 1.70× confirmed before click, 0.50× confirmed after, capture/Esc preserves the right gain, zero JS errors. Automated movements, not physical trackpad.

Documentation: docs/CALIBRATION.md, README, ARCHITECTURE, DECISIONS, VALIDATION. Digital evidence/profiles/ports without ROM, image, or state: third_party/capture-calibration-evidence.json. Test-results reports temporary, cleaned up by Playwright; evidence saved before browser tests.

Final validation: npm run check succeeded, **200 tests / 22 files**, coverage 99.39% statements, 99.46% branches, 100% functions, 99.35% lines. Chrome dev 19 tests, preview 3 tests succeeded. Usual BabylonJS chunk warning kept. No new dependency or deployment; no Git initialized. ROMs and real user preferences unchanged by harnesses.

Concrete next action: Michel can reload, start a game, Esc, click the test button then Capturer and play normally. Ask only for feel on accelerations/jumping and small gestures, not a new identical capture to qualify. Candidate gain to be human-confirmed; Level 3 braking and session/endurance test run remain open.
