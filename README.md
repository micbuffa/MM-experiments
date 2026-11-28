# Marble Madness Web (3D + Arcade Emulation)

Browser-based 3D wrapper for **Marble Madness (Atari System I, 1984)**: the original arcade core (**EmulatorJS 4.2.3 + MAME 2003-Plus**) remains the sole authority for physics, rules, scoring, timers, and audio, while **BabylonJS 9.33.2** drives a pixel-aligned real-time 3D presentation, dynamic 3D cameras, an explorable 3D arcade cabinet/bar scene, and a standalone static beta distribution.

**Live Beta (GitHub Pages):** https://micbuffa.github.io/MM-experiments/

---

## Summary of Work Accomplished

### 1. Arcade Core, Controls & Comfort (Prototype 01)

- Local **Atari System I** emulation via **EmulatorJS 4.2.3 + MAME 2003-Plus** (WebAssembly, SHA-256 verified glue/WASM core, `marble.zip` ROM and `atarisy1.zip` BIOS assembled in memory).
- Relative trackball input on **trackpad / mouse** via Pointer Lock, with **Space** boost and 2-player support (**P1** trackpad/mouse, **P2** keyboard).
- Clean pause on **Esc**, focus-loss handling, and automatic input drain.

### 2. 3D Atari System I Cabinet, Explorable Bar & Spatial Audio (Prototypes 02 & 03)

- 3D Atari System I arcade cabinet inside a first-person explorable bar (`WASD/ZQSD` + mouse look), clickable cabinet controls (coin slots, Start P1/P2, animated trackballs), and smooth camera transitions.
- Simulated CRT screen (scanlines, curvature, vignette) and **WebAudio positional mixing** based on the player’s position in the bar.

### 3. Real-Time 3D Presentation of All 6 Courses — Full Game (Prototype 04)

- **Level 1 (_Practice Race_)**: full course survey, grid-aligned red guardrails with spherical elbow joints, opening towers, pits, directional arrows, checkered flags, and `GOAL` decal.
- **Level 2 (_Beginner / Intermediate Race_)**: articulated bridge, chutes and Y-pipe, animated waves, ice basin, ogival domed white towers with bold masonry joints, green worms, and amoebas.
- **Level 3 (_Intermediate / Aerial Race_)**: sandy paving, turquoise curbs, animated waves, opening Gothic arches, aligned `GOAL` pad and flags.
- **Level 4 (_Aerial Race_)**: arch bridges, catapult, hammers, MAME-synced pistons, and vacuum cleaners with marble suction animation.
- **Level 5 (_Silly Race_)**:
  - Uphill reverse course with towers, 4-quarter-pyramid castles, squashable miniatures (**`+3 SEC`** 3D bonus label), flying birds with **real-time cast shadows**, and yellow wall-collision sparks.
  - **Escher "Monument Valley" finish**: continuous barrel-vault arch clipped along the isometric seam, faithful optical illusion in `Arcade` view, and a floor `?` marker visible in other 3D views.
  - **3D intro flyover**: depth-anchored to the true start platform with an elevated scenic arc and automatic terrain clearance, blending seamlessly into gameplay.
- **Level 6 (_Ultimate Race_)**:
  - Complete final course with carmine-red cliffs, 1-block-thick floating upper platforms, speckled amber start mound, hollow square pit island, open yellow triangular chutes, cyan ice strips and `11×11` diamond with 4 hexagonal pyramids, live MAME-synced shimmering amoeba plateaus (Playfield Bank 3), parallel-ribbed worm platforms, black-on-white `GOAL` pad with flags, and the **4-phase disappearing-block final maze** locked directly to the 68010 core (`0x400978`).
- **3D Cameras, Quality, Magic Wand & HUD**: 5 camera presets (`Arcade`, `Follow`, `Overhead`, `Chase`, `Chase High` with raycast-gated transparent wall occlusion), `+/-` zoom, `Eco / Balanced / High` GPU quality modes with Intel HD/UHD auto-detection, broadside-angled 3D **Magic Wand** (`+10 SEC`) with spinning stars and marble squash-and-stretch, native Score/Timer/Notice HUD, and instant **Side-by-side / 3D / Original** view cycling (`V`).

### 4. Static Beta Distribution (`dist-beta/` & GitHub Pages)

- Self-contained static entry point (`beta.html` → `dist-beta/index.html`) deployed to `gh-pages`:
  - Initialization overlay with progress bar, **4.6–8.5 KB Attract Mode boot savestate** (skips the ~4–5 s Atari System 1 POST), **Service Worker Cache-First** (`sw.js`), **IndexedDB ROM cache**, lazy-loaded level checkpoints, and compact zlib-compressed **`rolling-actors.bin` (577 KB vs 6.7 MB JSON)**.
  - Starts automatically in **full-screen CRT Attract Mode** (scanlines) with tactile **`1 PLAYER · START`** / **`2 PLAYERS`** buttons, a semi-transparent key legend (`5` Insert coins, `1` Start Player 1, `2` Start Player 2), starting level radio buttons (**`1`–`6`**, full game), player control pickers, and `3D Quality` selector.
  - **Mobile & Tablet Playability (iPhone, Android, iPad)**: responsive `100dvh` + safe-area layout, full-screen multi-touch trackball steering feeding the authentic MAME trackball pipeline, **dual left + right floating `BOOST` buttons** (ambidextrous) + 2nd-finger playfield boost, automatic full-screen 3D default on compact viewports, and a compact bottom action bar (`View`, `Cam`, `Timer`, `Quality`, `Title`).
  - On desktop, automatically switches to **full-screen side-by-side CRT view** (pixel-aligned 4:3 Original on the left, 3D on the right with intro flyover) and a semi-transparent top banner (`V` View, `C` Camera, `G` Quality, `T` Timer, `Space` Boost, `Esc` Pause).

---

## Prerequisites & Setup

- **Node.js** `>= 24.0.0` (see `.nvmrc`) and **npm** (`package-lock.json` is authoritative).

```bash
npm ci
npm run setup:emulator   # Installs EmulatorJS 4.2.3 + MAME 2003-Plus into public/vendor/
```

---

## Commands

| Command                 | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`           | Start Vite dev server at `http://127.0.0.1:5173/`                                      |
| `npm run build`         | Typecheck (`tsc --noEmit`) and build standard app into `dist/`                         |
| `npm run build:beta`    | Build standalone **static beta distribution** into `dist-beta/`                        |
| `npm run preview`       | Preview standard build (`dist/`)                                                       |
| `npm run preview:beta`  | Preview static beta distribution (`dist-beta/`) at `http://127.0.0.1:4174/`            |
| `npm test`              | Run Vitest unit test suite                                                             |
| `npm run test:watch`    | Run Vitest in watch mode                                                               |
| `npm run test:coverage` | Run unit tests with V8 coverage (≥ 90% threshold on core modules)                      |
| `npm run lint`          | Run ESLint (`--max-warnings 0`)                                                        |
| `npm run typecheck`     | Strict TypeScript check without emit                                                   |
| `npm run format`        | Format repository with Prettier                                                        |
| `npm run format:check`  | Check Prettier formatting                                                              |
| `npm run check`         | Full verification chain: `format:check`, `lint`, `typecheck`, `test:coverage`, `build` |
| `npm run test:browser`  | Run Playwright browser tests against dev server                                        |
| `npm run test:preview`  | Build and run Playwright tests against `vite preview`                                  |

---

## Entry Points & Controls

- **`index.html`**: full application (workbench, 3D cabinet/bar, live 3D view, side-by-side comparison, diagnostics).
- **`beta.html`** (`dist-beta/index.html`): beta-tester full-screen build (CRT attract mode → dual CRT comparison, level picker 1–6).
- **`terrain.html`**: 3D terrain inspection studio (all 6 levels, arcade scroll slider, reference screenshot overlay).
- **`scene.html`**: standalone BabylonJS scene testbed.

### In-Game Keyboard Shortcuts

- **`5`**: Insert coins
- **`1`** / **`2`**: Start Player 1 / Start Player 2
- **`V`** (or `Shift+V`): cycle view (`Side-by-side` → `3D Only` → `Original Only`)
- **`C`**: cycle 3D camera (`Arcade` → `Follow` → `Overhead` → `Chase`)
- **`G`**: cycle 3D quality (`Eco` → `Balanced` → `High`)
- **`T`**: toggle infinite timer (debug)
- **`+` / `-`**: adjust zoom / FOV
- **`Space`**: trackball boost · **`Esc`**: pause / release pointer lock
- **`F2`–`F6`** (dev mode in `index.html`): jump directly to levels 2–6

---

## Guide for Contributors & AI Assistants (Claude, Codex, Gemini)

The repository is structured for fast onboarding by both human contributors and AI coding agents:

- [AGENTS.md](AGENTS.md): shared engineering and testing guidelines (referenced by [CLAUDE.md](CLAUDE.md), [GEMINI.md](GEMINI.md), and [.github/copilot-instructions.md](.github/copilot-instructions.md)).
- [ARCHITECTURE.md](ARCHITECTURE.md): module responsibilities, data flow, and dependency boundaries.
- [BABYLONJS_BEST_PRACTICES.md](BABYLONJS_BEST_PRACTICES.md): BabylonJS conventions (targeted ES imports, resource ownership/disposal, zero per-frame allocations).
- [HANDOFF.md](HANDOFF.md): detailed handoff log, recent decisions, and current project state.
- [docs/PROTOTYPE_04.md](docs/PROTOTYPE_04.md), [docs/DECISIONS.md](docs/DECISIONS.md), [docs/VALIDATION.md](docs/VALIDATION.md): technical evidence, MAME memory maps, and validation records.

> **Assets note**: `roms/marble.zip`, `roms/atarisy1.zip`, and the surveyed terrain/checkpoint files (`local-roms/*.json`, `local-roms/*.state`) are included in this experimental repository to ease contributor setup.

---

## Credits

- **Original arcade game**: _Marble Madness_ (Atari Games, 1984), executed faithfully via EmulatorJS / MAME 2003-Plus.
- **3D Web edition & BabylonJS renderer**: **Michel Buffa** (procedural terrains, shaders, lighting, cameras, arcade cabinet/bar scene, and real-time emulation bridge).
- **A few 3D actor & pipe models (catapult, hammers…)**: reused from [_Rolling Madness 3D_](https://www.lucaelia.com/games.php) (2005) by **Luca Elia**, whom we warmly thank for his inspiring work. This project is a non-commercial research and educational experiment; attempts to reach Luca Elia have so far gone unanswered, and any of these models will be promptly removed and replaced with procedural equivalents upon request.
- **Atari System I 3D cabinet model**: derived from the SketchUp model by **Gozer** (3D Warehouse).
