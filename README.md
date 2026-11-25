# Marble Madness Remaster (`Remaster` Branch)

Standalone 3D **Marble Madness** engine built with **TypeScript, BabylonJS 9.33.2, Havok Physics (WASM), and an autonomous Yamaha YM2151 (OPM) + Atari POKEY WebAssembly AudioWorklet** — **no MAME and no Atari ROMs required at runtime**.

> Looking for the original MAME/EmulatorJS 3D arcade wrapper? See the `main` branch (live beta: https://micbuffa.github.io/MM-experiments/).

---

## Current Status (Phase 1 — Level 1 Vertical Slice Playable)

The **`Remaster`** branch already runs a **complete, standalone Level 1 (_Practice Race_)** at **`http://127.0.0.1:5173/remaster.html`**:

- **Own Fixed-Step Game Engine (`60 Hz`)** ([`src/remaster/engine/`](src/remaster/engine/)): deterministic pure-TypeScript simulation covering opening flyover, countdown timer, progress & time-bonus scoring, lethal-fall shatter, spiral respawn, `GOAL` arrival, and 1P/2P support.
- **Havok 3D Physics** ([`src/remaster/physics/`](src/remaster/physics/)): welded & slope-smoothed floor collision mesh (`restitution = 0`), crisp wall/cliff bounce (`restitution = 0.42`), automatic colliders on all Level 1 landmarks (red guardrails, stone pyramids, channel spikes), tangent-projected steep-ramp climbing, and `Space` jump boost.
- **Hybrid Level Format (`RemasterLevelV1`)** ([`src/remaster/levels/`](src/remaster/levels/)): combines height-grid layers (for the 6 original courses) with free-form 3D volumes (`volumes[]`) ready for future multi-tier _Hamsterball_-style levels and an in-browser level editor.
- **Autonomous Yamaha YM2151 + Atari POKEY WASM Audio** ([`native/audio/opm_pokey.cpp`](native/audio/opm_pokey.cpp), [`src/remaster/audio/`](src/remaster/audio/)): 12.7 KiB standalone WASM synth running in an `AudioWorkletProcessor`, with independent **Music** / **SFX** mix sliders, low-passed POKEY marble rolling rumble, FM SFX, and a live **`.vgm` / `.vgz`** player.
- **Full 3D Presentation**: reuses our BabylonJS 9.33.2 terrain, animated `GOAL` flags, spiral respawn fragments, 5 cameras (`Arcade`, `Follow`, `Overhead`, `Chase`, `Chase High` with raycast-gated wall occlusion), trackpad Pointer Lock, keyboard, and native **Gamepad API** support.

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
- **Toolbar**: **Music** & **SFX** mix sliders, **1P / 2P** toggle, **Load `.VGM`/`.VGZ`** music loader

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
