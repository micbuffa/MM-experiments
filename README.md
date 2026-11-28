# Marbylon Madness 3D (`Remaster` Branch)

Standalone 3D homage to Atari's **Marble Madness (1984)** built with **TypeScript, BabylonJS 9.33.2, Havok Physics (WASM), custom WebGL GLSL shaders, and a WebAssembly AudioWorklet** — **no MAME and no Atari ROMs required at runtime**.

> Looking for the original MAME/EmulatorJS 3D arcade wrapper? See the `main` branch (live beta: https://micbuffa.github.io/MM-experiments/).

---

## Current Status (All 6 Original Courses Playable + 100% 3D Attract & Victory Modes)

The **`Remaster`** branch runs **all 6 original arcade courses standalone** with automatic course chaining (`1 → 2 → 3 → 4 → 5 → 6`) at **`http://127.0.0.1:5173/remaster.html`** (live demo: **https://micbuffa.github.io/MM-experiments/remaster/**):

1. **Level 1 — _Practice Race_**: opening flyover, start lift, jump ramps, gorge, `GOAL` flags & time-bonus fanfare.
2. **Level 2 — _Beginner Race_**: Black Marble AI (68010 patrol/chase/attack graph), 3 Green Worms, animated drawbridge, drop-pipe & Y-pipe traversals, and frictionless ROM ice basin.
3. **Level 3 — _Intermediate Race_**: animated sine-wave bridge, copper pipe launcher, 4 Green Worms, and 7 gelatinous Acid Amoebas with dissolve VFX/SFX.
4. **Level 4 — _Aerial Race_**: frictionless start ice beams (with 2P rail-steering assist), twin vacuums with suction VFX, rhythmic floor pistons, spring catapult launcher, rhythmic overhead hammers, and Black Marble guardian.
5. **Level 5 — _Silly Race_**: uphill inverted-gravity course, 9 squashable miniature enemies (`+3 SEC` / `+500 pts` + per-kind ROM squash SFX), curly red Y-pipe, 10 flying birds across 5 lanes (spiral 8-fragment bird death), and bidirectional zero-jump Escher `?` arch teleport.
6. **Level 6 — _Ultimate Race_**: floating amber sand plateau (`4×` drag), 2×2 golden pit → twin wedge tunnels, cyan ice strips & 4-pyramid ice diamond, anisotropic ribbed worm slopes (`X: 5× / Z: 1×`), 10 Hz animated shimmering peach amoeba plateaus, Black Marble guardian (shatters on drop), 144-point native ROM respawn table, 4-phase disappearing-block maze (`41 frames` at `60 Hz`) + 3D `CONGRATULATIONS!` finish.

### 100% 3D WebGL + GLSL Attract & Victory Modes

- **4-Stage 3D Attract Mode** ([`src/remaster/rendering/createAttract3DScene.ts`](src/remaster/rendering/createAttract3DScene.ts), [`src/remaster/rendering/createAmigaDemo3DScene.ts`](src/remaster/rendering/createAmigaDemo3DScene.ts), [`src/remaster/engine/remasterAttract.ts`](src/remaster/engine/remasterAttract.ts)):
  1. **Live 3D Flyover**: real 3D courses scrolling live behind a floating holographic GLSL title & raycasted 3D `1 PLAYER` / `2 PLAYERS` buttons.
  2. **Live 3D AI Demo**: real-time Havok AI autopilot playing the course while cycling all 5 3D cameras.
  3. **Amiga 500 Demoscene Homage**: custom GLSL Copper bars, Boing-Ball sinusoidal checkerboard floor, periodic CRT glitches, 48 thin-instanced morphing 3D Vectorballs (`Cube → Torus → Helix → Sphere`), flat-stepped + wireframe sinusoidally deformed polyhedron, an **equatorial 3D orbital rainbow sinusoidal scrolltext** orbiting the Vectorballs plus a classic bottom sinusoidal scroller (both editable in [`src/remaster/engine/amigaScrollTexts.ts`](src/remaster/engine/amigaScrollTexts.ts) with automatic duration scaling).
  4. **3D Arcade Showcase**: custom GLSL neon horizon grid, Fresnel energy rings, stepped marble pedestal, orbiting glossy marbles, Hall of Fame, and tribute credits.
- **Stereo TFMX / Amiga Tracker Placeholder Soundtrack** ([`src/remaster/audio/createAmigaTrackerMusic.ts`](src/remaster/audio/createAmigaTrackerMusic.ts)): 3 original WebAudio chiptune themes (epic Turrican-inspired 130 BPM demo theme, cosmic 122 BPM showcase theme, uplifting 128 BPM victory theme) with stereo echo, resonant synth-brass lead, string pad & drums — cleanly isolated for Peter Salomonsen's upcoming WebAssembly Music compositions.
- **100% 3D Final Victory & Game Over Hall of Fame** ([`src/remaster/rendering/createVictory3DScene.ts`](src/remaster/rendering/createVictory3DScene.ts)): custom GLSL aurora sky & iridescent gold Trophy Marble, 96 thin-instanced 3D confetti shards, live keyboard 3-letter Hall of Fame initials entry (`localStorage`), scrolling credits, and raycasted 3D `PLAY AGAIN` / `TITLE 3D` buttons.
- **Authentic 1984 Atari System 1 8×8 Bitmap Font** ([`src/remaster/rendering/arcadeBitmapFont.ts`](src/remaster/rendering/arcadeBitmapFont.ts)): pixel-crisp 8×8 arcade glyphs across all 3D title, Amiga, and victory scenes.

### Engine Architecture

- **Own Fixed-Step Game Engine (`60 Hz`)** ([`src/remaster/engine/`](src/remaster/engine/), [`src/remaster/level2/`](src/remaster/level2/)–[`src/remaster/level6/`](src/remaster/level6/)): deterministic pure-TypeScript simulation covering opening flyover, countdown timer, automatic `1 → 6` course chaining with cumulative P1/P2 scores, progress & time-bonus scoring, 3-cell lethal shatter + broom sweep, `< 3`-cell dizzy stun (`1.67 s`), elevation-preserving safe respawn, `GOAL` arrival, and 1P/2P support.
- **Havok 3D Physics** ([`src/remaster/physics/`](src/remaster/physics/)): welded & slope-smoothed floor collision meshes (`restitution = 0`, `MULTIPLY`), elastic wall/cliff & marble-to-marble billiard bounces (`MAXIMUM`, `0.90–0.96`), static `PhysicsShapeMesh` phase swapping (`60 FPS`) for Level 6's disappearing maze, automatic colliders on landmarks & pyramids, terminal fall velocity cap, live **`Ball Sensitivity`** slider (`0.25×–2.00×`, default `0.80×`), and `Space` turbo boost.
- **Hybrid Level Format (`RemasterLevelV1`)** ([`src/remaster/levels/`](src/remaster/levels/)): combines height-grid layers (for the 6 original courses) with free-form 3D volumes (`volumes[]`) ready for future multi-tier _Hamsterball_-style levels and an in-browser level editor.
- **WebAssembly AudioWorklet** ([`native/audio/opm_pokey.cpp`](native/audio/opm_pokey.cpp), [`src/remaster/audio/`](src/remaster/audio/)): standalone WASM synth running in an `AudioWorkletProcessor` with independent **Music** / **SFX** mix sliders, rolling rumble, verified SFX in [`public/assets/audio/sfx-bank.json`](public/assets/audio/sfx-bank.json), and a live **`.vgm` / `.vgz`** player.
- **Full 3D Presentation**: BabylonJS 9.33.2 terrain, live cast shadows on all marbles, thin-instanced 3D marble motion trails ([`src/remaster/rendering/createMarbleTrail.ts`](src/remaster/rendering/createMarbleTrail.ts)), global Retina-crisp CRT scanlines (`S`, ON by default), animated `GOAL` flags, spiral respawn/shatter fragments, 5 cameras (`Arcade`, `Follow`, `Overhead`, `Chase`, `Chase High`), trackpad Pointer Lock, keyboard, and native **Gamepad API** support.

### Roadmap & Tracking

- **[REMASTER_OWN_ENGINE_SPEC.md](REMASTER_OWN_ENGINE_SPEC.md)**: full architecture specification, physics/audio design, and live phase-by-phase task tracker (Phase 0 → Phase 5).
- **[PETER_MUSIC_SFX_INFO.md](PETER_MUSIC_SFX_INFO.md)**: dedicated technical guide for **Peter Salomonsen** covering the YM2151/POKEY WASM synth, `.vgm` authoring (Furnace Tracker), WebAssembly Music / live-coding integration, WAM 2.0 plugins, and gameplay audio events.
- **[HANDOFF.md](HANDOFF.md)**: detailed session log and technical history.

---

## Quick Start

- **Node.js** `>= 24.0.0` (see `.nvmrc`) and **npm** (`package-lock.json` is authoritative).
- Optional: **Emscripten (`emcc`)** only if you edit `native/audio/opm_pokey.cpp` and rebuild `opm-pokey.wasm`.

```bash
npm ci
npm run dev
```

Open **`http://127.0.0.1:5173/remaster.html`** to play the standalone Remaster (no ROM setup needed).

---

## Controls (`remaster.html`)

- **Attract Mode**: click/tap 3D `1 PLAYER` / `2 PLAYERS` buttons (or press **`Space` / `Enter`** for 1P, **`2`** for 2P) · **`←` / `→`** (or **swipe left/right** on mobile) switch between the 4 3D attract modes and cycle Courses `1 → 6 → 1`
- **Mobile & Tablet (iPhone, Android, iPad)**: drag anywhere on the screen as a full-screen touch trackball, hold either the **left or right `BOOST` button** (or place a **2nd finger** anywhere on the playfield) for turbo boost, tap to skip flyover/post-goal, and use the compact **`⚙ Controls`** drawer for settings
- **Click canvas** (desktop): unlock WebAssembly audio & capture trackpad / mouse (Pointer Lock)
- **Player 1**: Trackpad / Mouse, **Arrows / WASD**, or **Gamepad 1** (left stick / D-pad)
- **Player 2** (2P mode): **IJKL** or **Gamepad 2**
- **`Space`** (or Gamepad A/B): skip opening flyover / **boost** for ramp jumps / skip post-goal countdown
- **`C`**: cycle 3D camera (`Arcade` → `Follow` → `Overhead` → `Chase` → `Chase High`) · **`+` / `-`**: adjust zoom / FOV
- **`T`**: toggle **Regular Timer / Infinite Time (`∞`)** · **`S`**: toggle CRT **Scanlines** (ON by default) · **`Q`**: quit to 3D Title/Attract Mode · **`R`**: restart level · **`M`**: mute/unmute audio · **`Shift+V`**: preview 3D Victory scene · **`Esc`**: release pointer lock
- **Toolbar**: **Level selector (`1 · Practice` → `6 · Ultimate`)**, **Ball Sensitivity** slider (`0.25×`–`2.00×`), **Music** & **SFX** mix sliders, **1P / 2P** toggle, **Load `.VGM`/`.VGZ`** music loader

---

## Commands

| Command                                              | Description                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                        | Start Vite dev server (`http://127.0.0.1:5173/remaster.html`)                                                |
| `npm run build`                                      | Typecheck (`tsc --noEmit`) and build all entry points into `dist/`                                           |
| `npm run build:audio-wasm`                           | Compile `native/audio/opm_pokey.cpp` → `public/assets/audio/opm-pokey.wasm` via `emcc`                       |
| `npm test`                                           | Run Vitest unit test suite                                                                                   |
| `npm run test:coverage`                              | Run unit tests with V8 coverage (≥ 90% on `src/game/**`, `src/remaster/engine/**`, `src/remaster/levels/**`) |
| `npm run lint`                                       | Run ESLint (`--max-warnings 0`)                                                                              |
| `npm run typecheck`                                  | Strict TypeScript check (`exactOptionalPropertyTypes: true`)                                                 |
| `npm run check`                                      | Full verification chain (`format:check`, `lint`, `typecheck`, `test:coverage`, `build`)                      |
| `npx playwright test tests/browser/remaster.spec.ts` | Run Remaster Chromium WebGL + Havok browser test                                                             |

---

## Guide for Contributors & AI Assistants

- [REMASTER_OWN_ENGINE_SPEC.md](REMASTER_OWN_ENGINE_SPEC.md): master spec & task tracker for the `Remaster` branch.
- [PETER_MUSIC_SFX_INFO.md](PETER_MUSIC_SFX_INFO.md): music & sound design architecture guide.
- [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md): engineering, testing, and BabylonJS guidelines.

---

## Credits

- **3D Engine, BabylonJS Renderer & Havok Remaster**: **Michel Buffa**
- **WebAssembly Music & Sound Design**: **Peter Salomonsen**
- **Inspiration**: _Marble Madness_ (Atari Games, 1984 — Mark Cerny, Bob Flanagan, Brad Fuller, Hal Canon, Sam Comstock), the 1986 Amiga port (Larry Reed, Will Harvey & Electronic Arts) & _Hamsterball_ (Raptisoft, 2004)
- **Temporary prototype meshes**: a few actor/mechanism models on the legacy paths originate from [_Rolling Madness 3D_](https://www.lucaelia.com/games.php) (2005) by **Luca Elia** (non-commercial research use, scheduled for replacement by 100% original procedural/glTF models in Phase 4).
