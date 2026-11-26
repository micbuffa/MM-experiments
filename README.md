# Marble Madness Remaster (`Remaster` Branch)

Standalone 3D **Marble Madness** engine built with **TypeScript, BabylonJS 9.33.2, Havok Physics (WASM), and an autonomous Yamaha YM2151 (OPM) + Atari POKEY WebAssembly AudioWorklet** — **no MAME and no Atari ROMs required at runtime**.

> Looking for the original MAME/EmulatorJS 3D arcade wrapper? See the `main` branch (live beta: https://micbuffa.github.io/MM-experiments/).

---

## Current Status (Level 1 & Level 2 — _Practice_ & _Beginner Race_ Playable)

The **`Remaster`** branch runs a **complete, standalone Level 1 (_Practice Race_) and Level 2 (_Beginner Race_)** at **`http://127.0.0.1:5173/remaster.html`**:

- **Own Fixed-Step Game Engine (`60 Hz`)** ([`src/remaster/engine/`](src/remaster/engine/), [`src/remaster/level2/`](src/remaster/level2/)): deterministic pure-TypeScript simulation covering opening flyover, countdown timer, progress & time-bonus scoring, 3-cell lethal shatter + broom sweep, `< 3`-cell dizzy stun (`1.67 s`), safe non-ice spiral respawn, `GOAL` arrival, 1P/2P support, and full Level 2 mechanics (Black Marble AI, 3 Green Worms, animated drawbridge, drop-pipe & Y-pipe traversals, and ROM ice zones with constant-velocity glide).
- **Havok 3D Physics** ([`src/remaster/physics/`](src/remaster/physics/)): welded & slope-smoothed floor collision mesh (`restitution = 0`, `MULTIPLY`), elastic wall/cliff & marble-to-marble billiard bounces (`MAXIMUM`, `0.90–0.96`), automatic colliders on all landmarks, terminal fall velocity cap, live **`Nervosité`** responsiveness slider (`0.40×–1.50×`), and `Space` turbo boost.
- **Hybrid Level Format (`RemasterLevelV1`)** ([`src/remaster/levels/`](src/remaster/levels/)): combines height-grid layers (for the 6 original courses) with free-form 3D volumes (`volumes[]`) ready for future multi-tier _Hamsterball_-style levels and an in-browser level editor.
- **Cycle-Accurate Dual `ymfm::ym2151` + Dual Atari POKEY WASM Audio** ([`native/audio/opm_pokey.cpp`](native/audio/opm_pokey.cpp), [`native/audio/ymfm/`](native/audio/ymfm/), [`src/remaster/audio/`](src/remaster/audio/)): 36.1 KiB standalone WASM synth (Aaron Giles's BSD-3-Clause `ymfm` YM2151 core + Atari POKEY) running in an `AudioWorkletProcessor` with 16-sample sub-block VGM stepping, independent **Music** / **SFX** mix sliders, low-passed POKEY rolling rumble, 15 editable ROM-verified SFX in [`public/assets/audio/sfx-bank.json`](public/assets/audio/sfx-bank.json), and a live **`.vgm` / `.vgz`** player.
- **Full 3D Presentation**: reuses our BabylonJS 9.33.2 terrain, animated `GOAL` flags, spiral respawn fragments, height-projected arcade scrolling, 5 cameras (`Arcade`, `Follow`, `Overhead`, `Chase`, `Chase High` with raycast-gated wall occlusion), trackpad Pointer Lock, keyboard, and native **Gamepad API** support.

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

- **Click canvas**: unlock YM2151/POKEY audio & capture trackpad / mouse (Pointer Lock)
- **Player 1**: Trackpad / Mouse, **Arrows / WASD**, or **Gamepad 1** (left stick / D-pad)
- **Player 2** (2P mode): **IJKL** or **Gamepad 2**
- **`Space`** (or Gamepad A/B): skip opening flyover / **boost** for ramp jumps
- **`C`**: cycle 3D camera (`Arcade` → `Follow` → `Overhead` → `Chase` → `Chase High`)
- **`+` / `-`**: adjust zoom / FOV
- **`R`**: restart level · **`M`**: mute/unmute audio · **`Esc`**: release pointer lock
- **Toolbar**: **Level selector (`1 · Practice` / `2 · Beginner`)**, **Nervosité** slider (`0.40×`–`1.50×`), **Music** & **SFX** mix sliders, **1P / 2P** toggle, **Load `.VGM`/`.VGZ`** music loader

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
- **Music & Sound Design**: **Peter Salomonsen**
- **Inspiration**: _Marble Madness_ (Atari Games, 1984) & _Hamsterball_ (Raptisoft, 2004)
- **Temporary prototype meshes**: a few actor/mechanism models on the legacy paths originate from [_Rolling Madness 3D_](https://www.lucaelia.com/games.php) (2005) by **Luca Elia** (non-commercial research use, scheduled for replacement by 100% original procedural/glTF models in Phase 4).
