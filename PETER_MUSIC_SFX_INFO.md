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

| File                                                                                                                                                  | Responsibility                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`native/audio/opm_pokey.cpp`](native/audio/opm_pokey.cpp)                                                                                            | Clean-room C++17 DSP core emulating **Yamaha YM2151 (OPM)** + **Atari POKEY**, compiled via Emscripten (`-O3 -sSTANDALONE_WASM=1`).                                                                                                                    |
| [`scripts/build-audio-wasm.mjs`](scripts/build-audio-wasm.mjs)                                                                                        | Reproducible build script compiling `opm_pokey.cpp` → `public/assets/audio/opm-pokey.wasm` (`~12.7 KiB`).                                                                                                                                              |
| [`public/assets/audio/opm-pokey-worklet.js`](public/assets/audio/opm-pokey-worklet.js)                                                                | `AudioWorkletProcessor` instantiating the WASM binary, rendering 128-sample stereo blocks in the audio thread, and running an integrated 44.1 kHz VGM scheduler.                                                                                       |
| [`src/remaster/audio/vgmParser.ts`](src/remaster/audio/vgmParser.ts)                                                                                  | Parses `.vgm` and gzipped `.vgz` (via `fflate`) into timed YM2151 (`0x54`) and POKEY (`0xBB`) register writes with loop support.                                                                                                                       |
| [`public/assets/audio/level1-practice.vgm`](public/assets/audio/level1-practice.vgm)                                                                  | Preloaded original Practice-Race-inspired YM2151 + POKEY loop (standard VGM 1.50, editable in Furnace Tracker / regenerated via `npm run build:music`).                                                                                                |
| [`public/assets/audio/goal-fanfare.vgm`](public/assets/audio/goal-fanfare.vgm)                                                                        | Preloaded one-shot celebratory YM2151 `GOAL` fanfare triggered automatically on finish.                                                                                                                                                                |
| [`public/assets/audio/sfx-bank.json`](public/assets/audio/sfx-bank.json)                                                                              | Human-editable JSON sound-design bank defining all FM SFX operator patches, note macros, and POKEY rolling/shatter curves (loaded at runtime — edit & reload!).                                                                                        |
| [`src/remaster/audio/soundCues.ts`](src/remaster/audio/soundCues.ts)                                                                                  | **Layer (a), backend-agnostic.** Maps `RemasterEvent`s to named sound cues (`marble.wallBump`, `marble.airborne`, `goal.arrive`, …) with priority, cooldown, intensity and stop rules. Defines the `SoundCueBackend` interface your engine implements. |
| [`src/remaster/audio/romSfxBackend.ts`](src/remaster/audio/romSfxBackend.ts) + [`public/assets/audio/rom-sfx.json`](public/assets/audio/rom-sfx.json) | **Layer (b), ROM-faithful backend.** Replays the YM2151/POKEY register streams captured from the original 6502 sound program, using the arcade driver's channel priorities. See [docs/ROM_SFX.md](docs/ROM_SFX.md).                                    |
| [`src/remaster/audio/synthCueBackend.ts`](src/remaster/audio/synthCueBackend.ts)                                                                      | Alternative layer (b): the earlier hand-designed FM bank (`sfx-bank.json`). It is the fallback, and the `B` key toggles it for A/B listening.                                                                                                          |
| [`src/remaster/audio/createRemasterAudio.ts`](src/remaster/audio/createRemasterAudio.ts)                                                              | TypeScript `RemasterAudioController` owning the `AudioContext`, `AudioWorkletNode`, preloaded VGM tracks, and `sfx-bank.json` SFX triggers.                                                                                                            |

### Signal flow

```text
Game Loop (60 Hz Havok + Simulation)
   │
   ├── discrete events: handleEvents(RemasterEvent[])
   ├── continuous telemetry: updateRolling(speed, grounded)
   └── UI controls: setMix(music, sfx), setMuted(), loadVgm()
           │
           ▼
createRemasterAudio.ts (main thread)
   │  postMessage({ type: 'opm' | 'pokey' | 'batch' | 'vgm' | 'mix' | 'mute' })
   ▼
AudioWorkletProcessor (opm-pokey-worklet.js, audio thread)
   │  calls WASM exports per 128-sample quantum
   ▼
opm-pokey.wasm (C++17)
   ├── YM2151 ch 0..3  ──► × musicGain ──┐
   ├── YM2151 ch 4..7  ──► × sfxGain   ──┼──► tanh() soft-clip ──► Stereo Out
   └── POKEY  ch 0..3  ──► × sfxGain   ──┘
```

---

## 3. What the Current WASM Synth Can Do

The original 1984 _Marble Madness_ (Atari System 1) hardware used a **Yamaha YM2151 (OPM)** for FM music/SFX and an **Atari POKEY** for polynomial-counter noise and granular effects. Our standalone WASM core emulates both chips with zero external dependencies:

### Yamaha YM2151 (OPM) — 8 channels × 4 operators

- **Full register write interface** (`opm_write(reg, val)`):
  - `$08`: Key On / Key Off per channel and per operator slot (`M1, M2, C1, C2`).
  - `$20–$27`: Stereo panning (`L/R`), Op-0 self-feedback (`0..7`), and **all 8 OPM FM connection algorithms (`0..7`)**.
  - `$28–$2F`: Key Code (`KC`, octave + semitone).
  - `$30–$37`: Key Fraction (`KF`, 6-bit fine pitch).
  - `$40–$5F`: Detune (`DT1`) and frequency multiplier (`MUL`, `0.5×` to `15×`).
  - `$60–$7F`: Total Level (`TL`, `0.75 dB` per step).
  - `$80–$9F`: Attack Rate (`AR`).
  - `$A0–$BF`: Decay 1 Rate (`D1R`).
  - `$C0–$DF`: Decay 2 Rate (`D2R`).
  - `$E0–$FF`: Sustain Level (`D1L`) and Release Rate (`RR`).
- **Bus routing**:
  - Channels `0..3` are routed to the **Music bus** (`musicGain`).
  - Channels `4..7` are routed to the **SFX bus** (`sfxGain`).

### Atari POKEY — 4 polynomial-counter channels

- **Register interface** (`pokey_write(reg, val)` for `AUDF0..3` / `AUDC0..3`):
  - Authentic 4-bit, 5-bit, and 17-bit LFSR polynomial noise generators, pure square wave mode, and volume-only DAC mode.
  - **Channel 0** includes a 2-pole low-pass filter (`rollLp1`, `rollLp2`) whose cutoff tracks `AUDF0`, producing a warm muffled ceramic-on-stone rolling marble sound instead of harsh static.
  - **Channel 1** is unfiltered 17-bit noise used for shatter/explosion bursts.

### Update (November 26, 2026)

- The YM2151 is now **ymfm**, pinned to commit 81aec25 and vendored in
  `native/audio/third_party/ymfm`. That gives accurate envelopes, DT1/DT2, LFO
  and noise.
- POKEY implements AUDCTL and all distortions.
- A third POKEY carries the remaster-only rolling rumble (`[2, reg, val]`
  batch ops). The SFX POKEY stays raw for ROM streams.
- The older notes below about the clean-room OPM are historical.

### Current limitations (and easy upgrades if you want them)

- The clean-room YM2151 does not yet implement the OPM hardware LFO (PM/AM), `DT2` coarse detune, or channel-7 hardware noise mode.
- If you want 100% cycle-accurate OPM emulation, **Aaron Giles's `ymfm`** (BSD-3-Clause, the exact FM core used inside modern MAME) compiles cleanly with the same `emcc` pipeline and drops right behind the same `opm_write` / `audio_render` interface.
- Conversely, you are **not locked to YM2151/POKEY** at all — see Section 5 below!

---

## 4. Tools You Can Use Right Now to Author Music & SFX

### Option A — Chiptune Trackers exporting `.vgm` / `.vgz`

You can test tracks immediately by clicking **Load .VGM/.VGZ** in `remaster.html`:

- **[Furnace Tracker](https://github.com/tildearrow/furnace)** (free, open-source, macOS/Windows/Linux): has native **Yamaha YM2151 (OPM)** and **Atari POKEY** chip presets (and dual-chip configurations!), real-time FM patch editing, and direct `.vgm` / `.vgz` export with loop points.
- **DefleMask** or any tracker targeting YM2151 (`0x54`) / POKEY (`0xBB`) VGM streams.

_(Note: when playing a `.vgm` that uses all 8 YM2151 channels, remember that channels `0..3` are currently on `musicGain` and `4..7` on `sfxGain` — we can easily give VGM its own dedicated YM2151 instance so music gets all 8 FM channels without ever colliding with SFX!)_

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
    } // 0..1
  | { readonly type: 'shatter'; readonly player: 1 | 2 }
  | { readonly type: 'fall'; readonly player: 1 | 2 }
  | { readonly type: 'respawn'; readonly player: 1 | 2 }
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

### 4. Sound cues: the seam for a new SFX engine

Game code never talks to chips. The audio layers are split like this:

- `handleEvents()` passes each event to `cuesForEvent()` in `soundCues.ts`.
- The dispatcher applies the cue rules: cooldown, intensity floor, `stops`,
  and priority order.
- It then calls the active `SoundCueBackend`:
  `playCue(trigger, rule)`, `stopCue(cue, player)` and `stopAll()`.

To plug in a richer SFX engine:

1. Implement `SoundCueBackend`. Each trigger carries `cue`, `player` and an
   `intensity` from 0 to 1, for example impact speed for `marble.wallBump`
   and `marble.landing`.
2. Select your backend in `createRemasterAudio.ts`, next to `rom` and
   `synth`.

Cues whose game event does not exist yet are listed with a `TODO:` trigger in
`DEFAULT_SOUND_CUE_RULES`, so the full vocabulary is known in advance:

- pipes, acid, ice, worms, black marble, vacuums, pistons and magic wand.

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
