# Marble Madness — Prototype 01 Specification

Version 1.0 — November 4, 2026 — handoff document for Codex

## 1. Context and Objective

Michel Buffa is organizing the 9th edition of Games on Web, a 3D web game creation competition using BabylonJS. Theme: "retro gaming". Project development runs from November 2026 to late May 2027. He wants to prepare a surprise entry under a pseudonym.

Long-term vision: run the real arcade Marble Madness inside a BabylonJS 3D cabinet, then place that cabinet in a bar. A remaster and an enhanced version may be explored later.

This prototype must run the original arcade program in the browser, with sound and relative Apple trackpad control. It must also demonstrate reusing its video output in a minimal BabylonJS scene.

This document is a specification to be implemented, not a report on a working prototype. No core, ROM set, or control path has been tested in this project yet.

## 2. Scope

Included:

- A single game: Marble Madness, Atari arcade version.
- Single player; coin/credit and start accessible from the UI.
- Local loading of ROM archives provided by the user.
- Emulation of the original game, without modifying its physics or rules.
- Apple trackpad control via one-finger relative movement.
- Original audio; pause, resume, volume, reset.
- Diagnostic interface and preference persistence.
- Test displaying the game on a BabylonJS plane, without a modeled cabinet.
- Local execution on Mac with a documented dev command.

Excluded: bar, detailed cabinet, CRT effects, remaster, reverse engineering with REA, new levels, multiplayer, remote leaderboards, public deployment, mobile support, and other peripherals. Do not add a backend, authentication, or a heavy application framework.

## 3. Environment and Proposed Choices

Reference: Apple Silicon Mac with Apple trackpad, stable Chrome on macOS. Record the exact versions tested. Safari is a secondary validation after achieving satisfactory behavior in Chrome.

Proposed base: TypeScript, Vite, HTML/CSS, BabylonJS for the 3D test only. A static app is sufficient. Use a lockfile and pin versions of dependencies, the emulation frontend, and the core; no unversioned "latest" loading.

First candidate: EmulatorJS with the core explicitly named `fbneo`. FBNeo contains an Atari System 1 driver for Marble Madness, but its presence and functionality in the actually distributed binary must be verified.

Fallbacks: EmulatorJS with MAME 2003-Plus if available and suitable; otherwise a WebAssembly MAME build targeting the Atari System 1 driver. Fallbacks are not a requirement to build three solutions: keep the first validated candidate. Do not spend the prototype compiling MAME if the first candidate works.

## 4. Preliminary Phase: Feasibility and Evidence

Before developing the full UI, verify on a small throwaway or minimal page:

1. The exact core version and its support for the chosen game.
2. The expected ROM set, its dependencies, and handling of additional archives.
3. The actual movement path: browser event → frontend → core relative mouse/trackball input → game.
4. Access to the video canvas and pause/resume/reset/volume controls.
5. Ability to copy the canvas image into BabylonJS.

Document the APIs and files actually used in `docs/DECISIONS.md`. Do not invent APIs from plausible names or use synthetic events as an assumed solution before proving they are supported.

If an internal API is indispensable, isolate it in the adapter and specify its version. A small, maintainable frontend adaptation is acceptable; keep its patch and notices. Revisit the core choice if relative control or video extraction requires a major rewrite.

## 5. ROMs and Assets

The user selects one or more local archives. Do not download, provide, commit, or bundle ROMs, BIOS files, or extracted assets in the project. Archive filenames do not prove compatibility.

Display actionable errors: missing archive, incompatible ROM, missing dependency, unavailable core, startup failure. Preserve archives in the structure expected by the core; do not assume all of them should be unpacked.

Document the required set and files based on data from the chosen core. The game is loaded in browser memory without uploading. No persistent ROM storage for this prototype; only preferences may be persisted. Ignore any test directories containing game data in Git.

## 6. Experience and States

Simple UI in French: file selection, start, credit, Player 1 Start, pause/resume, reset, sound/volume, trackpad capture, sensitivity, collapsible diagnostics, and access to the BabylonJS test.

Explicit states: missing files, loading, ready, captured play, paused, error. Distinguish frontend states from arcade program states: "game over" and attract mode belong to the game.

Initial startup is a user action enabling audio activation. Pointer capture also requires a user gesture and must not be assumed automatic after async loading.

After capture, no held click is needed to play. Lifting and repositioning a finger must not generate artificial movement. Multi-finger gestures and scroll wheel must not steer the marble.

`Escape` releases the pointer and pauses. Losing focus or switching tabs pauses and mutes audio. Purge pending inputs and buttons. Returning to the page does not auto-resume the game: require an explicit action to resume, then recapture if necessary. Handle transitions idempotently.

Credit/Start buttons and any shortcuts must send a press followed by a release; no key may remain stuck after an interruption. Reset asks for confirmation only if a session has already started.

## 7. Trackpad Control

Use Pointer Lock and movement deltas exposed by the browser. Do not convert an absolute cursor position into a marble position. An Apple trackpad is typically exposed as a pointing device; do not assume access to raw touch coordinates or a specific hardware identity.

Start with standard pointer behavior. The unaccelerated movement option is experimental for this prototype: document detection, fallback, and result. No goal of guaranteed macOS acceleration removal.

Movement must be accumulated and consumed once by the core input path. Reuse the frontend's mechanism if it already does this properly. If a custom bridge is needed: sum deltas since the last read, apply gain, quantize to the expected format while preserving residual fractions, transmit, then consume. Respect input type bounds without overflow or sign inversion. Do not arbitrarily distribute movement across the BabylonJS render rate.

Settings: a shared X/Y gain, saved locally; gain reset. Gain, bounds, and default value will be determined by testing, not presented as fidelity constants. Document the core's internal sensitivity to avoid two opaque settings.

In the initial scope, no smoothing, extra acceleration, dead zone, or inertia added initially; comfort evolution authorized later in section 15. Physics remain those of the original program. Validate signs and axis mapping in-game; do not add a 45° rotation simply because the view is isometric.

Canvas CSS size, zoom, devicePixelRatio, and texture resolution must not be used as command multipliers. Verify actual behavior during display changes.

## 8. Video, Cadence, and BabylonJS

Preserve the appropriate aspect ratio for the game and avoid distortion. Query framebuffer dimensions and any aspect correction from the core, without assuming they are identical. No CRT shader for this prototype.

The core must maintain its emulation cadence regardless of a 60 or 120 Hz display. Do not step the game once per BabylonJS render. Expose presentation rate and emulation speed indicator separately if possible; UI FPS does not prove emulation runs at normal speed.

For the 3D test: fixed camera, neutral background, and a plane carrying the game video. Same session and same inputs as the direct view. Allow comparing both views, optionally side-by-side in diagnostics; do not launch two emulators.

Prefer updating a texture from the canvas or framebuffer. Do not go through video encoding, periodic screenshots, or per-frame image URLs. Examine source WebGL context constraints: framebuffer availability, copy timing, buffer preservation, and color. Do not blanket-enable an expensive option without measuring.

Initial target: BabylonJS WebGL; WebGPU is out of scope. Use an unlit or emissive material to preserve the image. Check orientation, aspect ratio, colors, and absence of black or frozen frames. Copying must keep working when the source canvas is no longer visible; do not confuse hiding with stopping its frame production.

## 9. Audio

Audio managed by the core/frontend, with user activation, volume, and mute. Keep music and sound effects synchronized with the game. No spatialization or new AudioWorklet in this prototype.

Verify start, pause, focus-loss, and resume transitions, as well as the absence of doubled audio on reset or session recreation. Note any constraint that would later prevent spatial routing, without solving it now.

## 10. Code Organization

Separate at least the following responsibilities, with project-appropriate names:

- Emulation adapter: lifecycle, ROMs, video, inputs, audio, and capabilities.
- Relative control: capture, gain, cleanup, and metrics; without duplicating frontend work.
- UI: files, actions, states, and errors.
- BabylonJS view: consumes video without knowing ROM formats.

The adapter must conceptually cover load/start, suspend/resume, reset, volume, video access, and destroy. A delta-submission method is only required if the frontend needs a custom bridge. Do not create a fake facade whose methods lack real implementations.

Ensure listeners, GPU resources, and file references are released on destroy. A new session must not add a second loop or a second audio chain. No third-party iframe preventing access to video or inputs.

## 11. Diagnostics and Validation

Collapsible panel: core/version, browser, capture/focus/pause, video dimensions, received/transmitted deltas if observable, gain, presentation rate, and relevant errors. Declare unavailable metrics; do not fabricate metrics.

| Test | Acceptance Criterion |
| --- | --- |
| Cold start | Correct archives accepted, attract mode and sound present |
| Gameplay | Credit, Start, and course playable without directional keyboard controls |
| Precision | Small gestures and diagonals controllable; human testing by Michel |
| Fast gesture | No obvious saturation, inversion, or recurring lost movement |
| Finger repositioning | No artificial impulse |
| Escape and focus loss | Pause and silence, no residual input on resume |
| Resize | Proportioned image; no gain tied to size |
| 60/120 Hz display, if available | Consistent game speed; no doubled speed |
| BabylonJS view | Correct animated image and preserved control, same session |
| Endurance | At least 10 minutes, no visible progressive degradation or audio dropout |
| Reset and new session | Clean return without doubled listeners/audio/emulation |
| File error | Understandable message and ability to retry |

Automate useful checks for custom code: delta/fraction preservation if implemented, input cleanup, and critical transitions. Use synthetic data, with no ROMs in tests. Build and TypeScript checks mandatory. Real browser tests for emulation/audio/GPU; simulations do not replace them.

Record completed tests, results, versions, and limitations in `docs/VALIDATION.md`. Distinguish "implemented", "automated test", "manual test", and "pending Michel's validation". Trackpad quality cannot be certified from a remote environment.

## 12. Increments and Deliverables

| Increment | Deliverable and Gate |
| --- | --- |
| A — Feasibility | Chosen core/version, ROMs identified, game started or blocker precisely documented |
| B — Inputs | Functional capture and trackpad; proof of relative path, minimal diagnostics |
| C — Session | UI, audio, pause/resume, errors; comfort validation by Michel |
| D — BabylonJS | Same session displayed on a 3D plane; cost and constraints recorded |
| E — Delivery | Reproducible build, documentation, checks, and validation summary |

Codex's first objective is A then B. It must continue useful independent work, but must not present C as validated until Michel has tested the controls. Do not advance toward a cabinet or bar solely on the basis of an animated image.

Deliver the runnable project, `README.md`, this specification, `docs/DECISIONS.md`, and `docs/VALIDATION.md`. The README specifies installation, startup, expected ROMs, controls, versions, component licenses, and known limitations. Do not apply an arbitrary single license to all dependencies.

## 13. Initial References

Sources consulted during discussion; verify versions at implementation start:

- EmulatorJS, arcade: https://emulatorjs.org/docs/systems/arcade/
- EmulatorJS, options and internal API warning: https://emulatorjs.org/docs/options/
- FBNeo, Atari System 1 driver: https://github.com/finalburnneo/FBNeo/blob/master/src/burn/drv/atari/d_atarisy1.cpp
- MAME, Atari System 1 driver: https://github.com/mamedev/mame/blob/master/src/mame/atari/atarisy1.cpp
- MAME, Emscripten compilation and subsets: https://docs.mamedev.org/initialsetup/compilingmame.html
- Libretro, MAME 2003-Plus and relative inputs: https://docs.libretro.com/library/mame2003_plus/
- Pointer Lock: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

## 14. Launch Prompt for Codex

> Read this specification and the repository instructions. Implement the prototype incrementally, starting with EmulatorJS + FBNeo validation and Apple trackpad relative control. Verify the APIs and compatibility of the actual core used before developing the full UI. Do not add a bar, detailed cabinet, or remaster. Do not provide or download any ROMs. If ROMs are missing, prepare loading, diagnostics, and independent checks, then state exactly which files are required and what remains untested. Document every decision and give me a short procedure to test controls on my Mac. Continue until the runnable prototype is achieved within the authorized scope; do not declare gameplay feel validated without my test.


## 15. Authorized Evolution After Michel's Test — November 9, 2026

User feedback: 0.50× makes normal control insufficient and does not allow
desired accelerations. This calibration is rejected as a playability solution.
Michel requests a boost, for example with Space, and to move forward
toward 3D rendering instead of continuing calibration.

Amended scope:
- Normal control at the comfortable reference gain 1.70×, other gains adjustable.
- Held Space command assist: continuous emission of moderate trackball deltas
  in the direction guided on the trackpad; releasing returns normal control.
  No invented jump key in MAME, no modified RAM, rules, or physics.
  This comfort mode is distinct from strict original cabinet control.
- Boost active only after capture and during emulation; no stuck key or
  residual command after Escape/focus loss/visibility change, setting change,
  or disposal. Input inside UI fields preserved.
- Perspective BabylonJS presentation: animated screen on a procedural
  stand/pedestal, same session and same video. Comparison views and the
  reference plane remain available. No physics engine, second session, or
  loop stepping the core from rendering. No bar or detailed cabinet in
  this presentation step.

Unit tests for controls and cleanup, 3D construction/disposal with
NullEngine, GPU/Pointer Lock tests in Chrome and real runtime. Physical
playability, jumps, and braking remain to be verified by Michel; independent
3D tasks continue without requiring new calibration captures.


## 16. Authorized Shortcuts and Acceptance — November 10, 2026

Michel confirms the views and then requests, in capture only: 5 or ( for credit,
1 or & for P1 Start, 2 or é for P2 Start. This last command is an
explicit extension of the control scope, not an implementation of a
second relative device. The arcade program keeps its credit and start
rules. No repeat while held, no command outside capture, while paused,
or in an input field; cleanup of both ports on interruption.

Begin the proposed endurance acceptance test: ten minutes of real local runtime,
camera switches, pause/resume, and fullscreen, with measurements and limits recorded.
An automated bench certifies neither a human game session, nor listening, nor 120Hz/Safari.


## 17. Transition to Prototype 02 — Authorized November 10, 2026

Michel explicitly requests the five proposed stages: complete 3D cabinet,
overview and transition to gameplay, 3D controls, materials/lighting,
first bar room. The neighboring specification02 defines this extension.
The cabinet/bar exclusions above remain the history of prototype01,
not a blocker for this request. Emulation, rules, and ROM loading unchanged.
