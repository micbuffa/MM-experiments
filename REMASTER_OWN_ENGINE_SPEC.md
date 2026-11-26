# Marble Madness Remaster — Own Engine Specification (`Remaster` Branch)

This specification defines the architecture, invariants, milestones, and live task tracker for the **`Remaster`** branch: a **100% standalone 3D Marble Madness engine** running without MAME or Atari ROMs at runtime, built on **TypeScript + BabylonJS 9.33.2 + Havok Physics (WASM) + Yamaha YM2151 (OPM) / Atari POKEY (WASM AudioWorklet)**.

---

## 1. Vision & Scope

1. **Full emancipation from MAME & ROMs**: recreate the complete _Marble Madness_ gameplay (all 6 original courses, physics feel, enemies, traps, animations, 1P/2P rules, scoring, timers, audio) on top of our existing 3D BabylonJS scenes.
2. **Browser first, native-ready**: pure TypeScript deterministic simulation (`60 Hz` fixed step) decoupled from DOM/GPU, Havok WASM physics, and WASM `AudioWorklet` synthesis — easily packageable later as a native app (Tauri or Babylon Native).
3. **Future-proof for original gameplay**: hybrid level format (`RemasterLevelV1`) supporting both height-grid courses (the 6 original levels) and multi-tier 3D volumes (_Hamsterball_-style bridges, overpasses, tubes, boosters, moving platforms), paving the way for an **in-browser level editor**, **new courses**, and **original FM/WebAssembly music**.
4. **Temporary calibration harness**: MAME/EmulatorJS remains temporarily available on `Remaster` as a reference tool to measure 68010 constants until all 6 levels are calibrated, then will be removed from this branch.

---

## 2. Core Architectural Invariants

- **Fixed-step simulation (`1 / 60 s`)**: game rules, timers, scoring, AI, and state machines live in `src/remaster/engine/` as pure TypeScript with an injectable `RemasterPhysicsBackend` (zero DOM, zero BabylonJS, ≥ 90% V8 test coverage).
- **Havok Physics (`@babylonjs/havok@1.3.14`)**:
  - Separate static `PhysicsAggregate` meshes for **floor** (`restitution = 0`, 2-pass gorge/slope seam smoothing) and **vertical cliffs / landmarks** (`restitution = 0.42`, including guardrails, pyramids, and spikes).
  - Uphill push force projected along the local ramp tangent so steep launch ramps (~39°) climb cleanly without wedging the marble.
  - Low air damping (`0.08`) during jumps + `Space` boost (`1.75×`, raised speed cap `26 c/s`) to clear side gaps.
  - Kinematic mode during opening flyover, respawn reassembly, pipes, and catapults.
- **Autonomous Audio (`src/remaster/audio/` + `native/audio/opm_pokey.cpp`)**:
  - Standalone C++17 **Yamaha YM2151 (OPM)** + **Atari POKEY** compiled via Emscripten to `public/assets/audio/opm-pokey.wasm` (`~12.7 KiB`) running inside `AudioWorkletProcessor`.
  - Independent **Music** (`YM2151 ch 0..3`) and **SFX** (`YM2151 ch 4..7 + POKEY 0..3`) buses, `.vgm`/`.vgz` player, and open architecture for Peter Salomonsen's **WebAssembly Music** tools and **WAM 2.0** plugins (see [PETER_MUSIC_SFX_INFO.md](PETER_MUSIC_SFX_INFO.md)).
- **BabylonJS discipline**: targeted ES imports, explicit side-effect imports (`joinedPhysicsEngineComponent`, `v2/physicsEngineComponent`), `beginFrame()`/`endFrame()` for `engine.getDeltaTime()` animations, zero per-frame allocations in hot loops, clean `dispose()`.

---

## 3. Live Task Tracker & Roadmap

Legend: `[x]` Done · `[~]` In Progress · `[ ]` Planned

### Phase 0 — 68010 ROM Reference & Physics Calibration

- [x] Establish world-unit conversion (`1 cell = 8 arcade units`, `marbleRadius = 0.675`, `arcadeHeightScale = sqrt(2/3)`).
- [x] Initial physics constants (`physicsConstants.ts`) validated interactively on Level 1 (`remaster.html`).
- [ ] Write automated MAME headless probe script (`scripts/measure-rom-physics.mjs`) to record reference curves for: flat acceleration, slope 1/2/3 speeds, ice friction (L2/L6), shatter drop threshold, wall restitution, and exact per-level timers/bonuses.
- [ ] Store measured curves in `docs/REMASTER_CALIBRATION.md` and add automated Havok calibration regression tests.

### Phase 1 — Vertical Slice: Level 1 (_Practice Race_) Autonomous (**CURRENT PHASE**)

- [x] Hybrid level format `RemasterLevelV1` (`heightLayers[]` + `volumes[]`, `remasterLevel.ts` + unit tests).
- [x] Pure TypeScript fixed-step `60 Hz` simulation (`remasterSimulation.ts` + unit tests, V8 coverage ≥ 90%).
- [x] Havok backend (`createHavokBackend.ts` + welded/smoothed `buildCollisionMesh.ts`) with separate floor (`0` bounce) / cliffs (`0.42` bounce) and `practice-landmarks` colliders (red guardrails, pyramids, spikes).
- [x] Tangent-projected uphill ramp climbing + `Space` boost + low air damping for side jumps.
- [x] Standalone `opm-pokey.wasm` (`AudioWorklet`) + `.vgm`/`.vgz` parser (`vgmParser.ts`) + Music/SFX mix sliders + low-passed POKEY rolling rumble + FM SFX.
- [x] Standalone entry point `remaster.html` with 5 cameras (`Arcade / Follow / Overhead / Chase / Chase High`), raycast occlusion, animated `GOAL` flags, spiral respawn fragments (`createPracticeRespawn`), 1P/2P mode, trackpad Pointer Lock + Keyboard + native Gamepad API.
- [x] Playwright WebGL browser test (`tests/browser/remaster.spec.ts`).
- [ ] **Remaining Level 1 polish**:
  - [ ] Start-lift animation at the beginning of Level 1 (`createPracticeStartLift` synced with opening).
  - [ ] Shatter/broken marble animation + broom sweep (`createMarbleAnimation`) on lethal fall impact.
  - [ ] Floating `+score` / time-bonus 3D labels (`createScoreAward`) and dizzy stars on hard wall bump.
  - [ ] Fine-tune Level 1 side-jump landing & shatter height threshold with Michel's playtest feedback.

### Phase 2 — Levels 2 to 6 (Reusable Engine Components)

- [ ] **Level 2 (_Beginner Race_)**:
  - [ ] Level 2 hybrid data conversion (`intermediate-terrain-pipes.json`) + ice surface friction zones.
  - [ ] Kinematic Y-pipe spline traversal (entry/exit triggers + tube audio whoosh).
  - [ ] Animated moving bridge (kinematic Havok collider).
  - [ ] Black Marble AI (patrol/chase + marble-to-marble knockback) & Magic Wand event.
  - [ ] Acid puddles + procedural dissolve animation (`createAcidDissolve`).
- [ ] **Level 3 (_Intermediate Race_)**:
  - [ ] Animated turquoise wave (dynamic collider/impulse push).
  - [ ] Curved orange pipe traversal.
  - [ ] Worms & moving acid snakes AI.
- [ ] **Level 4 (_Aerial Race_)**:
  - [ ] Vacuum cleaners (radial suction force field + capture animation).
  - [ ] Synchronized pistons & swinging hammers (kinematic Havok colliders).
  - [ ] Catapult launch mechanism (kinematic arc into Havok ballistic flight).
- [ ] **Level 5 (_Silly Race_)**:
  - [ ] Uphill reversed course (`direction = -1`) + Escher finish arch.
  - [ ] Animated curly red pipe traversal (`updateLevel5PipeAnimation`).
  - [ ] Birds (swoop & grab), Steelies, Amoebas, squashable miniatures (`+3 SEC`).
- [ ] **Level 6 (_Ultimate Race_) & Full Game Loop**:
  - [ ] 4-phase disappearing-block maze (O(1) toggle of pre-built Havok colliders + visuals).
  - [ ] Ice diamond + 4 hexagonal pyramids + shimmering amoeba plateaus.
  - [ ] Full 6-course progression, inter-level score tally, Attract/Title screen, Game Over & local High Scores.

### Phase 3 — Music & Sound Design Integration (with Peter Salomonsen)

- [x] ROM-derived SFX: event → ROM command map and YM2151/POKEY register
      streams (`rom-sfx.json`, [docs/ROM_SFX.md](docs/ROM_SFX.md)).
  - Backend-agnostic cue layer (`soundCues.ts`) and ROM backend.
  - ymfm OPM core.
  - Wall, marble, airborne and landing events (issue #2).
- [ ] Emit the Level 2+ cue events marked `TODO:` in `DEFAULT_SOUND_CUE_RULES`:
      pipes, acid, ice, worms, black marble, wand, vacuums, pistons, daze, broom.

- [ ] Dedicated 8-channel music bus (or Peter's WebAssembly Music / WAM 2.0 graph) separate from SFX bus.
- [ ] Expand audio telemetry contract (surface material, impact material, 3D positional panning, enemies/mechanisms, adaptive low-timer music).
- [ ] Original soundtrack for Levels 1–6 + menus/fanfares (`.vgm` or WebAssembly Music).

### Phase 4 — Emancipation & Native Readiness

- [ ] Remove MAME / EmulatorJS / ROM dependencies from `Remaster` branch once all 6 levels are calibrated.
- [ ] Replace remaining _Rolling Madness 3D_ meshes with 100% original procedural / glTF models.
- [ ] Standalone offline PWA build + prototype native wrapper (Tauri or Babylon Native).

### Phase 5 — Original Gameplay, _Hamsterball_ Levels & Level Editor

- [ ] Multi-tier 3D volume blocks (`volumes[]`): overpasses, half-pipes, transparent tubes, speed boosters, jump pads, moving/tilting platforms.
- [ ] In-browser visual Level Editor (height brush + 3D volume placement + entity spawners + instant 1-click Havok playtest + JSON import/export).

---

## 4. Verification Checklist (Every Delivery)

1. `npm run check` (`format:check`, `lint`, `typecheck`, `test:coverage` ≥ 90% on `src/remaster/engine/**` and `src/remaster/levels/**`, `build`).
2. `npx playwright test tests/browser/remaster.spec.ts` (real Chromium WebGL + Havok + zero console errors).
3. Human playtest by Michel on `http://127.0.0.1:5173/remaster.html` for physics feel, controls, visuals, and audio.
