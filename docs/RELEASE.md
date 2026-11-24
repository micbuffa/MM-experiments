# Delivery Summary

Prototype 03 adds bar exploration, cabinet finishes, trackball rotation,
positional sound, and three rendering profiles.
Current usage is in [README](../README.md) and acceptance in
[VALIDATION.md](VALIDATION.md).

## Prototype 01 History

Status as of November 9, 2026. The 416 protection trial is removed after
negative feedback; a controlled measurement harness documents impulse
response. The prototype is runnable, but the level 1 jump and fidelity of
strong impulses remain unvalidated. Other technical checks pass.

## Increment Status

| Increment       | Actual Status                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A — Feasibility | Original game booted; MAME 2003-Plus frozen and dumps identified/validated.                                                            |
| B — Inputs      | Credit, Start, Pointer Lock, linear gain, fractions, purge, and diagnostics available; human trials performed.                         |
| C — Session     | Pause/resume, volume, errors, and new session tested. Level 1 impulses/jump, level 3 braking, listening, and endurance remain open.    |
| D — BabylonJS   | Same session on a flat plane, comparison, and hidden source tested. Michel confirms flicker fix is good.                               |
| E — Delivery    | Reproducible build verified, build tests and CI workflow prepared, summary and handoff up to date. Final human acceptance to complete. |

## Reproducing the Project

Node 24 or higher, npm, and Chrome with WebGL2. The tested local reference is
Node **24.20.0**, npm **11.19.0**, automated Chrome **157.0.8103.38**; Michel
provided his diagnostics under Chrome **155**. `.nvmrc` specifies the Node 24
branch. Use the usual Node manager if system Node is unavailable.

```sh
npm ci
npm run setup:emulator
npm run check
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
PLAYWRIGHT_CHANNEL=chrome npm run test:preview
npm run dev
```

For Playwright Chromium instead of installed Chrome, install once with
`npx playwright install chromium`, then omit `PLAYWRIGHT_CHANNEL=chrome`.
Initial setup downloads dependencies and the versioned runtime, never the game.
Verification commands use synthetic data.

In development: `http://127.0.0.1:5173/`, with the two ZIPs provided by Michel
in `roms/` for optional preloading. For the build:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/` and select the ZIPs manually. Archives remain
in memory, with no upload or browser storage. The build contains neither ROMs
nor dev preload route. No deployment performed.

## Checks Performed

- `npm run check`: **134 tests across 16 files**, formatting, lint, types,
  coverage, and build passed. Coverage: 99.01% statements, 98.96% branches,
  100% functions, 98.95% lines on the covered scope.
- Development: **16 ROM-less Chrome tests** passed, including real runtime
  without game, controls, interruptions, video, colors, and fractional filtering.
- Build: **3 ROM-less Chrome tests** passed via `test:preview`, with manual
  selection, recoverable errors, local requests, preserved asset SHA-256 and
  notices, absence of archives and dev preload in the output.
- Isolated rebuild of summary E, before the new trackball range trial, in a
  temporary folder without ROMs or node_modules: `npm ci --offline` succeeds
  from cache, followed by verification of already-present emulation assets
  and `npm run check`. All **49 files** in `dist/` are byte-for-byte identical
  to the reference build files. This proof covers the same platform, versions,
  and present sources; it does not claim to guarantee identity across all OSes
  or Node versions.
- One-off build trial with local ZIPs: run, comparison, flat-only, real capture,
  and stable pause, with no JS errors or remote requests/dev preload. ZIPs are
  not added to permanent tests or artifacts.
- GitHub workflow configured for both browser suites. No GitHub run attested:
  the folder is not yet a Git repository.

Detailed evidence and measurements are in [VALIDATION.md](VALIDATION.md).
Verified versions, APIs, and bridges: [DECISIONS.md](DECISIONS.md).
Separate licenses: [third_party/README.md](../third_party/README.md).

## Priority: Impulses and Jump

The 416 trial did not help and is no longer offered. Reproducible measurements
in [INPUT_RESPONSE.md](INPUT_RESPONSE.md) show a non-monotonic response to
native peaks and an effect of command duration. Do not ask for another limiter
trial or arbitrarily increase gain. [Port reads](TRACKBALL_PORTS.md) are now
observed; at 416 bytes reach the expected value despite the inverted visible
response. Next investigation concerns their interpretation/reference comparison;
no jump fix is validated yet. Diagnostics do not certify physical trackpad
comfort.

## Latest Acceptance by Michel

1. Play at least **10 minutes**, at preferred gain (last trial: 1.70×),
   mainly in **BabylonJS Flat Only** mode. Check precision, diagonals,
   opposite gestures to brake, and finger repositioning.
2. During the session, press Escape, briefly switch to another app, then
   return: pause and silence expected, no automatic resume. Resume/capture
   by click and verify absence of residual movement.
3. Compare views, resize the window, then resume. Check image, proportions,
   scrolling, and absence of flicker, with no gain change.
4. Listen to music and effects, try volume/mute and resume; verify absence
   of doubling, persistent cutoff, or perceptible lag.
5. After the session, **New session**, select or preload archives, then
   re-trigger Credit/Start. Verify controls and audio remain unique.

Note browser, duration, gain, smoothness, audio, and braking on the slope
at the end of level 3. If an issue occurs, press Escape then Copy diagnostics.
Positive feedback on visuals does not automatically validate these other points.

## Known Limits

Safari, 120 Hz display, and DPR changes unvalidated. No reliable emulation
speed counter; displayed costs measure CPU submission, not GPU completion.
Private bridges tied to frozen JS/WASM SHA-256, mouse ABI, and renderer:
re-verify before any update. BabylonJS chunk size warnings remain visible.
Local Homebrew Node is broken; rebuild used working nvm Node 24. npm
reported an unapproved optional fsevents script without blocking checks; no
global approval added.

Difficult braking is not attributed to a certain cause. No physics,
acceleration, or inertia added. Cabinet, bar, remaster, and deployment remain
outside this prototype's scope.

Native comparison of November 9: MAME 0.271 reproduces Web responses after
aligning one fixed phase across five amplitudes. No Web-core-specific defect
demonstrated, no jump fixed; see `REFERENCE_COMPARISON.md`. The reference is a
local diagnostic tool, not a new dependency of the shipped game.

The `motionTimeline` recording is armed automatically by each capture and
keeps the strongest movement until Escape, even after a small initial movement.
The constant-total harness shows a strong effect of temporal distribution,
with no jump fix or control change; details and requested human trial in
`MOTION_PROFILES.md`.

Calibration of November 9: 25 replays of the recorded profile and its strongest
stroke, phase check, and refinement. 0.50× trial button added on click only;
default and preferences preserved before action. This candidate preserves
direction at both tested timings, unlike results at higher gains. Comfort
and jump remain to be validated in gameplay; see CALIBRATION.md.

Subsequent human feedback rejects 0.50×: insufficient normal control,
accelerations not recovered. The calibration button was therefore removed,
gain restored to 1.70×, and an explicit Space boost added at Michel's request.
The 3D Scene Screen view now offers a perspective presentation on a stand/pedestal,
same session and video, procedural scenery with no external assets. Tests and
real runtime passed; physical comfort/jumps still to verify. See COMFORT_AND_3D.md.

## Fullscreen Presentation and HUD — November 9, 2026

Delivered: Play in 3D Fullscreen, compact Credit/Start/capture/pause/resume
controls, and Return to page. Enter/exit paused, immersive fallback if
fullscreen denied, same session and texture. `npm run check` passed (214
tests/24 files), Chrome 24 tests, preview 3 tests passed. Real runtime: HUD
operational, held boost cleared on Escape, stable frame, and focus return;
rendering examined. Physical comfort, full audio, and endurance remain to be
validated. Next proposed task: fixed frontal/perspective cameras for readability.

## Fixed Cameras — November 10, 2026

Frontal (enlarged straight screen) and perspective (scenery) selectable in HUD
and on page, same session/texture. Play/pause preserved, no camera control
attached to trackpad. Michel confirmed the previous fullscreen; rendering of
both new framings examined with real Chrome game and automated tests.
Human comfort of the new views and endurance recipe remain open.

## Shortcuts and Endurance — November 10, 2026

Shortcuts during active capture: 5/( credit, 1/& StartP1, 2/é StartP2.
120ms pulses, no repeat or effect outside capture/paused/in input fields;
P2 port independent and cleared. No relative P2 command added. Check 231
tests/25 files, Chrome 27 tests, and preview 3 passed. New permanent command
npm run measure:endurance, protocol in ENDURANCE.md.

Real runtime: twelve calls from the six aliases conforming, **600.40s active**
completed, 36090 video copies, ten pauses/boosts cleared, zero JS errors/remote
requests, constant 718 listeners and 1 audio source. Average cumulative CPU
cost 0.144–0.177ms; not GPU time. No human run or full listening certified;
variable heap memory (19.73–21.58MiB), no proof of absence of GPU/WASM leaks.
The technical recipe allows summarizing prototype 01 and defining next steps;
detailed cabinet/bar still subject to the next explicit scope.

## Prototype02 — Stages 1 to 5, November 10, 2026

Complete original cabinet and furnished bar, local marquees, materials and
lighting, 3D controls, and transitions between Bar/Cabinet/Frontal. Same
session/texture, existing controls, and real capture from screen or trackball.
Tests 250/27, Chrome 29, preview 3 passed; real game screenshots examined,
details in PROTOTYPE_02.md. A new production build endurance run finished:
600.02s active, 36063 copies, zero JS errors/stuck commands. Picking/capture
also verified on the compiled build without dev helper. Both 01/02 recipes
remain separate. Audio/comfort/Safari/120Hz remain to be validated on physical
hardware.
