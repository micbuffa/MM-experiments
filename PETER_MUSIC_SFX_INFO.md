# Marble Madness Remaster — Music & Sound Design Guide (for Peter Salomonsen)

Welcome to the **`Remaster`** branch of **Marble Madness Web**!

This document explains how the standalone audio engine currently works, what hardware chips and protocols it emulates, how the game communicates physics and gameplay events to audio, and how you can freely extend, customize, or replace parts of the engine with your own WebAssembly Music tools, live-coding workflows, or **WAM (Web Audio Modules)** plugins.

---

## 1. Project Context & Quick Start

The `Remaster` branch is a **100% standalone 3D remaster** built with **TypeScript + BabylonJS + Havok Physics (WASM)** — **no MAME and no original Atari ROMs** are used at runtime.

### Run locally

```bash
npm ci
npm run dev
```

Open **`http://127.0.0.1:5173/remaster.html`** in your browser:

- Click the canvas to unlock Web Audio (and optionally capture the trackpad).
- Use the bottom toolbar to test:
  - **Music** & **SFX** independent mix sliders (`0–100%`)
  - **Audio: YM2151 + POKEY (M)** mute toggle
  - **Load .VGM/.VGZ** button to drop and play any YM2151/POKEY VGM track live
- Rebuild the WASM audio core after editing C++:

```bash
npm run build:audio-wasm
```

---

## 2. Current Audio Architecture

All audio code for the remaster is cleanly isolated from the simulation, physics, and BabylonJS rendering:

| File                                                                                     | Responsibility                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`native/audio/ymfm/`](native/audio/ymfm/)                                               | Pinned **Aaron Giles `ymfm` (`ymfm::ym2151`, BSD-3-Clause)** cycle-accurate Yamaha YM2151 (OPM) core — the exact FM engine used inside modern MAME.                                |
| [`native/audio/opm_pokey.cpp`](native/audio/opm_pokey.cpp)                               | C++17 DSP wrapper hosting **Dual `ymfm::ym2151` (`musicOpm` + `sfxOpm`)** + **Dual Atari POKEY (`musicPokey` + `sfxPokey`)**, compiled via Emscripten (`-O3 -sSTANDALONE_WASM=1`). |
| [`scripts/build-audio-wasm.mjs`](scripts/build-audio-wasm.mjs)                           | Reproducible build script compiling `opm_pokey.cpp` + `ymfm_opm.cpp` → `public/assets/audio/opm-pokey.wasm` (`~36.1 KiB`).                                                         |
| [`public/assets/audio/opm-pokey-worklet.js`](public/assets/audio/opm-pokey-worklet.js)   | `AudioWorkletProcessor` instantiating the WASM binary, stepping music & SFX VGM streams in **16-sample (`~0.33 ms`) sub-blocks**, and cleanly silencing SFX channels on clip end.  |
| [`src/remaster/audio/vgmParser.ts`](src/remaster/audio/vgmParser.ts)                     | Parses `.vgm` and gzipped `.vgz` (via `fflate`) into timed YM2151 (`0x54`) and POKEY (`0xBB`) register writes with loop support.                                                   |
| [`public/assets/audio/level1-practice.vgm`](public/assets/audio/level1-practice.vgm)     | Preloaded Practice-Race YM2151 + POKEY loop (standard VGM 1.50; in dev mode, local `.vgz` themes for Levels 1–2, Goal fanfares, and Game Over are also auto-loaded when present).  |
| [`public/assets/audio/goal-fanfare.vgm`](public/assets/audio/goal-fanfare.vgm)           | Preloaded one-shot celebratory YM2151 `GOAL` fanfare triggered automatically on finish.                                                                                            |
| [`public/assets/audio/sfx-bank.json`](public/assets/audio/sfx-bank.json)                 | Human-editable JSON sound-design bank mapping all **15 ROM-verified SFX `.vgm` triggers** (`romSfx`), fallback FM operator patches, and POKEY rolling curves (edit & reload!).     |
| [`src/remaster/audio/createRemasterAudio.ts`](src/remaster/audio/createRemasterAudio.ts) | TypeScript `RemasterAudioController` owning the `AudioContext`, `AudioWorkletNode`, preloaded VGM tracks, ROM SFX clips, and `sfx-bank.json` event routing.                        |

### Signal flow

```text
Game Loop (60 Hz Havok + Simulation)
   │
   ├── discrete events: handleEvents(RemasterEvent[])
   ├── continuous telemetry: updateRolling(speed, grounded)
   └── UI controls: setMix(music, sfx), setMuted(), loadVgm(), playLevelTheme()
           │
           ▼
createRemasterAudio.ts (main thread)
   │  postMessage({ type: 'opm' | 'pokey' | 'batch' | 'vgm' | 'sfxVgm' | 'mix' | 'mute' })
   ▼
AudioWorkletProcessor (opm-pokey-worklet.js, audio thread)
   │  steps music VGM + SFX VGM & calls audio_render(16) in 16-sample sub-blocks
   ▼
opm-pokey.wasm (C++17 + ymfm::ym2151)
   ├── Music ymfm::ym2151 (all 8 ch) + Music POKEY ──► × musicGain ──┐
   └── SFX   ymfm::ym2151 (all 8 ch) + SFX   POKEY ──► × sfxGain   ──┴──► tanh() soft-clip ──► Stereo Out
```

---

## 3. What the Current WASM Synth Can Do

The original 1984 _Marble Madness_ (Atari System 1) hardware used a **Yamaha YM2151 (OPM)** clocked at **3,579,545 Hz** for FM music/SFX and an **Atari POKEY** for polynomial-counter noise and granular effects. Our standalone WASM core runs **two independent instances of each chip** (dedicated Music bus + dedicated SFX bus), so 8-channel music tracks and multi-channel SFX never steal voices from each other:

### Dual Cycle-Accurate Yamaha YM2151 (`ymfm::ym2151`) — 2 × (8 channels × 4 operators)

- **100% hardware-accurate OPM emulation** (Aaron Giles's `ymfm`, BSD-3-Clause, pinned in `native/audio/ymfm/`):
  - Exact Atari System 1 clock (`3,579,545 Hz`, native `55,930.39 Hz` sample rate linearly resampled to WebAudio `sampleRate`).
  - Full register set (`opm_music_write` for Music, `opm_write` for SFX): all 8 algorithms, exact 2-sample Op-0 self-feedback, `DT1` & `DT2` coarse detune, Key Scale (`KS`), exponential hardware envelopes (`AR / D1R / D2R / D1L / RR`), hardware LFO (PM/AM), and channel-7 hardware noise mode.
  - Because Music and SFX each own a full 8-channel `ymfm::ym2151`, **any 8-channel `.vgm` / `.vgz` song plays at full polyphony** with zero channel collisions with live SFX.

### Dual Atari POKEY — 2 × 4 polynomial-counter channels

- **Register interface** (`pokey_music_write` for Music, `pokey_write` for SFX, `AUDF0..3` / `AUDC0..3`):
  - Authentic 4-bit, 5-bit, and 17-bit LFSR polynomial noise generators, pure square wave mode, and volume-only DAC mode.
  - **SFX Channel 0** is dedicated to marble rolling rumble with a smooth 2-pole low-pass filter (`~340 Hz`) whose cutoff tracks `AUDF0`, producing a warm ceramic-on-stone roll (automatically muted while sliding on ice).
  - **SFX Channels 1–3** play POKEY SFX streams (`impact`, `broomSweep`, etc.) without ever clobbering channel 0 rolling.

### Note on future flexibility

- You are **not locked to YM2151/POKEY** at all — `opm-pokey.wasm` is simply the default retro synth backend behind `RemasterAudioController`. See Section 4 & Section 6 below to layer or swap in WebAssembly Music or WAM 2.0 plugins!

---

## 4. Tools You Can Use Right Now to Author Music & SFX

### Option A — Chiptune Trackers exporting `.vgm` / `.vgz`

You can test tracks immediately by clicking **Load .VGM/.VGZ** in `remaster.html`:

- **[Furnace Tracker](https://github.com/tildearrow/furnace)** (free, open-source, macOS/Windows/Linux): has native **Yamaha YM2151 (OPM)** and **Atari POKEY** chip presets (and dual-chip configurations!), real-time FM patch editing, and direct `.vgm` / `.vgz` export with loop points.
- **DefleMask** or any tracker targeting YM2151 (`0x54`) / POKEY (`0xBB`) VGM streams.
- All 8 YM2151 channels and all 4 POKEY channels are available to your music `.vgm`/`.vgz` on the dedicated Music chip pair without ever colliding with SFX.
- You can also swap any of the **15 SFX triggers** (`wallBounce`, `marbleClack`, `pvpClack`, `impact`, `fall`, `voidFall`, `shatter`, `broomSweep`, `dizzy`, `respawn`, `wormEat`, `pipeEnter`, `iceEnter`, `iceLeave`, `countdownTick`) by editing [`public/assets/audio/sfx-bank.json`](public/assets/audio/sfx-bank.json) and reloading.

### Option B — Live Coding & WebAssembly Music (`wasm-music`)

Because the engine runs on a standard browser `AudioContext` + `AudioWorklet`, you can integrate your own **WebAssembly Music** synths, live-coded songs, or AssemblyScript/Rust/C++ DSP modules directly:

- Compile your music/synth engine to a `.wasm` loaded in an `AudioWorkletProcessor`.
- Drive tempo, sections, filter cutoffs, or procedural SFX directly from game telemetry via `AudioParam`s or `port.postMessage` (zero GC in the audio thread).
- You can run your custom WASM music engine **in place of** the built-in sequencer, or **layered alongside** the YM2151/POKEY retro chips (for example: retro FM/POKEY SFX + lush WebAssembly Music soundtrack, or vice versa!).

### Option C — WAM (Web Audio Modules / WAM 2.0) Plugins

`createRemasterAudio.ts` creates a standard `AudioContext` and connects `AudioWorkletNode` → `ctx.destination`. You can cleanly insert a **WAM 2.0** graph right in between:

- **WAM effects** on the master, music, or SFX bus (stereo reverb, tape/ping-pong delay, chorus, EQ, dynamics/limiter — e.g. subtle room reverb on marble impacts and spacious delay on the FM lead!).
- **WAM instruments** triggered via Web MIDI / WAM `scheduleEvents` from our game events (e.g. FM/analog/physical-modeling synths for impacts, chimes, acid sizzle, or adaptive stems).
- To keep separate Music and SFX buses for WAM effects, `OpmPokeyWorklet` can easily expose `numberOfOutputs: 2` (Output 0 = Music stereo, Output 1 = SFX stereo) so you can apply different WAM FX chains to Music vs SFX!

---

## 5. How the Game Notifies the Audio Engine

The simulation (`src/remaster/engine/remasterSimulation.ts`) is pure TypeScript running at a fixed **60 Hz** step and has **zero dependency** on Web Audio. It communicates with audio through a clean contract in `src/remaster/audio/createRemasterAudio.ts`:

### 1. Discrete Gameplay Events (`handleEvents`)

Every simulation tick produces a `readonly RemasterEvent[]` array:

```ts
export type RemasterEvent =
  | { readonly type: 'start' }
  | {
      readonly type: 'impact';
      readonly player: 1 | 2;
      readonly intensity: number;
    } // floor landing thud (0..1)
  | {
      readonly type: 'wallBounce';
      readonly player: 1 | 2;
      readonly intensity: number;
    } // wall / cliff / well-rim bounce (0..1)
  | {
      readonly type: 'marbleClack';
      readonly player: 1 | 2;
      readonly intensity: number;
    } // player <-> Black Marble / worm bump
  | {
      readonly type: 'pvpClack';
      readonly player: 1 | 2;
      readonly intensity: number;
    } // player 1 <-> player 2 billiard clack
  | { readonly type: 'shatter'; readonly player: 1 | 2 } // > 3-cell drop (followed by broom sweep at 680 ms)
  | { readonly type: 'dizzy'; readonly player: 1 | 2 } // < 3-cell drop / hard hit (1.67 s)
  | { readonly type: 'fall'; readonly player: 1 | 2 } // airborne fall whistle
  | { readonly type: 'respawn'; readonly player: 1 | 2 }
  | { readonly type: 'wormEat'; readonly player: 1 | 2 } // Level 2 green worm swallow
  | { readonly type: 'pipeEnter'; readonly player: 1 | 2 } // Level 2 drop-pipe / Y-pipe traversal
  | { readonly type: 'iceEnter'; readonly player: 1 | 2 } // Level 2 ice zone entry
  | { readonly type: 'iceLeave'; readonly player: 1 | 2 } // Level 2 ice zone exit
  | {
      readonly type: 'catchUp';
      readonly player: 1 | 2;
      readonly penaltySeconds: number;
    }
  | {
      readonly type: 'goal';
      readonly player: 1 | 2;
      readonly timeBonus: number;
    }
  | { readonly type: 'countdownTick'; readonly remainingSeconds: number }
  | { readonly type: 'gameOver' };
```

### 2. Continuous Per-Frame Telemetry (`updateRolling`)

Called every animation frame with live marble physics state:

```ts
audio.updateRolling(speed: number, grounded: boolean);
```

- `speed`: horizontal marble speed in world cells/second (`0` at rest, `~14–18` fast roll, `~22–26` boost/steep slope).
- `grounded`: `true` when rolling on the surface, `false` when airborne.

### 3. Planned Events & Telemetry for Levels 2–6 & Future Levels

As we bring in Levels 2 through 6 and custom _Hamsterball_-style levels, we plan to expand the audio contract with:

- **Surface-aware rolling**: `surface: 'stone' | 'ice' | 'acid' | 'wave' | 'booster'` (so rolling on ice can sound crystalline/glassy, stone muffled, booster energetic).
- **Rich collision metadata**: `material: 'wall' | 'guardrail' | 'pyramid' | 'marble' | 'floor'`, impact velocity, and world position `(x, y, z)` for stereo/3D panning!
- **Airborne telemetry**: vertical velocity & height above ground (for subtle wind rush during big jumps or fall-whistle pitch curves).
- **Enemies & mechanisms**:
  - Acid puddle sizzle & marble dissolve (`melt` progress `0..1`)
  - Pipe traversal resonant tube whoosh (Levels 2, 3, 5)
  - Black Marble proximity & bump, Worm / Steelie / Bird encounters
  - Level 4 Vacuums (continuous suction hum scaled by distance), Pistons, Hammers, Catapult launch
  - Level 6 disappearing-maze phase click/pulse, Magic Wand shimmer
- **Adaptive music state**:
  - Current level index (`1..6` + custom levels)
  - Game phase (`opening`, `playing`, `finished`, `gameOver`)
  - Urgency flag (`remainingTime <= 10 s`) for tempo boost or tension stem!

_(Note: the repo already has a Web Audio spatializer pattern in `src/audio/spatialOutput.ts` using `PannerNode` / `AudioListener`, which we can reuse if you want 3D positional SFX relative to the active camera.)_

---

## 6. How to Plug In Your Own Audio Engine Cleanly

You have complete freedom to evolve `src/remaster/audio/`:

1. **Keep the `RemasterAudioController` interface** (or extend it as needed for new telemetry) so `remaster.ts` stays decoupled from DSP details.
2. **Lifecycle rules to keep everything rock-solid**:
   - Never create/resume an `AudioContext` at module import time — wait for `unlock()` (called on first user click/keydown).
   - Release all timers, `AudioWorkletNode`s, WAM instances, and close the `AudioContext` inside `dispose()` (called on page unload and Vite HMR).
   - Avoid allocations inside `AudioWorkletProcessor.process()`.
   - Document any third-party audio libraries/plugins/licenses in `public/assets/README.md`.
3. **CSP note**: `remaster.html` already allows `'wasm-unsafe-eval'` and `blob:` in `script-src` / `worker-src` / `connect-src` so WASM modules, AudioWorklets, and local WAM bundles load cleanly.

If you want to experiment right away:

- Drop a `.vgm`/`.vgz` in `remaster.html` via **Load .VGM/.VGZ**, or
- Edit `native/audio/opm_pokey.cpp` and run `npm run build:audio-wasm`, or
- Wire your own WebAssembly Music / WAM 2.0 graph inside `src/remaster/audio/createRemasterAudio.ts`!
