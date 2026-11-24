# Third-Party Components

No ROMs, BIOSes, or extracted game assets are provided.

| Component                                             | Version or Identification                                                                                                    | Notice                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EmulatorJS                                            | 4.2.3, tag `v4.2.3`, commit `e150dc0491ae747028919fb82d6598954976ede6`                                                       | `LICENSE.EmulatorJS.txt`; sources: https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3                                      |
| MAME 2003-Plus runtime/core distributed by EmulatorJS | archive SHA-256 `cb6d9c80a88b65d1579d16d02128a678f8d1cd3f51de1479e647cea27b13247b`, report from June 14, 2025; wrapper 2.0.2 | `LICENSE.MAME2003-Plus.txt`, extracted from the archive; declared repo: https://github.com/EmulatorJS/mame2003-plus-libretro |
| 7z decompression and bundled dependencies             | file `compression/extract7z.js` from distribution 4.2.3                                                                      | Keep the notices present in the distributed files and consult their sources in the EmulatorJS repository                     |
| BabylonJS, fflate, and npm tools                      | Exact versions in `package.json` and `package-lock.json`                                                                     | Notices in the respective npm packages                                                                                       |

`emulatorjs-assets.json` pins the URL, size, and SHA-256 of each download.
`npm run setup:emulator` installs the files into `public/vendor/` (ignored by Git)
and copies the notices into the assets served by Vite. No CDN is used at
runtime when playing. Setup requires network access to the indicated sources.

Frontend adaptations are isolated and commented in
`src/emulation/emulatorjs.ts`; no downloaded binary is modified. The core report does not provide a source SHA. The Chrome test subsequently recorded
MAME Git Version `3a72dae` and RetroArch `1.21.0 (6dd4353)`; details in
`runtime-evidence.json`. Do not confuse 2.0.2 (EmulatorJS wrapper) with the core version.

`core-evidence.json` records the inspection of the two candidate binaries, without game
data. String positions constitute static evidence, not proof of a successful launch.
See `docs/DECISIONS.md`.

No single license applies to the entire project or its dependencies.

Since increment B, `src/emulation/coreInputPatch.ts` adapts in memory a single
hook in the core's JS glue, after verifying both the JS and WASM SHA-256 hashes. The
WASM and distributed files on disk remain untouched. This gain/purge hook
is documented in `docs/DECISIONS.md`; it depends on the ABI of RetroArch 6dd4353's
`emulatorjs` driver and must be re-verified on any version change.

The video hooks in `coreInputPatch.ts` and `coreVideoPatch.ts` also observe
iterations and source framebuffer draws, again after verifying
both hashes. No patch is applied to the distributed file on disk.
The markers and scope of the pinned renderer are documented in DECISIONS.md.
`npm run test:preview` compares the assets served by the build against the manifest
hashes and verifies that both notices are preserved byte-for-byte.

`impulse-response-evidence.json` records the November 9, 2026 benchmark: controlled
native commands, screen centroids, and comparability checks. It contains
no ROM, image, save state, or game memory data. Protocol and limits in
`docs/INPUT_RESPONSE.md`, opt-in script `npm run measure:impulses`.

`trackball-port-evidence.json` supplements the benchmark with actual return values from the
core's trackball handler. The diagnostic module verifies the WASM and its static table,
preserves arguments/return values, and restores its trampoline. No ROM, RAM,
or game image data in these numeric logs. Reference: `docs/TRACKBALL_PORTS.md`.

`mame-reference-evidence.json`: numeric measurements from replaying the ports in
MAME 0.271 ARM64 already installed by the user; hash/version, four
phases, and limits. No executable, ROM, capture, or state provided. Protocol:
`docs/REFERENCE_COMPARISON.md`; pinned 0.271 public sources cited in the report.

`impulse-profile-evidence.json`: numeric measurements of constant-total-displacement
profiles, repetitions with a control background region, and timeline hook
verification. No images, ROMs, or save states. Automated Chrome control
is not a physical trackpad gesture; protocol in `docs/MOTION_PROFILES.md`.

`startup-controls-evidence.json`: reproduction of the startup disclaimer and
real verification after configuring skip_disclaimer, Credit/Start from pause,
and after Esc. Numeric measurements only; no ROM, image, or save state.

`strongest-gesture-evidence.json`: verification in the real runtime of automatic
selection of a stronger second movement, followed by immediate Esc. Automated
Chrome mouse events, without physical trackpad testing; no ROM/image/state.

`auto-measure-evidence.json`: real verification of capture automatically arming
measurement at the current gain, without a reset button. Automated Chrome,
not a physical trackpad gesture; no ROM/image/state.

`captured-motion-evidence.json`: first complete human profile (95 lines),
X/Y replay with Web core port trace and fixed-phase MAME 0.271 comparison.
Counters are data, not code or game RAM; no ROM,
image, or save state. Details and limits: docs/CAPTURED_MOTION.md.

`capture-calibration-evidence.json`: 25 calibrated replays of the human profile and
its peak window, two timings, neutrals, optical checks, and player 1 ports.
Includes verification of the candidate button in the real runtime, without physical
trackpad validation. No ROM, image, or save state; see docs/CALIBRATION.md.

`comfort-stage-evidence.json`: verification of the Space directional boost and
perspective video in the real runtime with local archives. Automated Chrome
inputs, controlled hold/release/Esc, no physical comfort
test. Control capture remained in /tmp; no ROM/image/state provided.

`fullscreen-hud-evidence.json`: Chrome test of the real local runtime, HUD
controls, fullscreen, purge on Esc, stable frame, and focus return. No ROM,
image, or save state; no physical comfort certification.

`camera-presets-evidence.json`: Chrome test of the two framings on the real local
game, preserving play/pause and selection, no distributed dump/image/state.

`endurance-evidence.json`: ten active minutes in Chrome of the real runtime with
local archives, six command aliases, interruptions, and metrics. Numeric data
only; no dump, state, or image. Limits in docs/ENDURANCE.md.

`prototype02-evidence.json`: real runtime in the cabinet and bar, 3D
interactions, capture, paused transition, and cleanup. Numeric data without ROM,
image, or state. Captures examined in /tmp only; new spec02 scope.

`prototype02-production-evidence.json`: real preview build, Credit/Start via
meshes and capture via the ball, without dev helpers. `prototype02-endurance-evidence.json`:
ten active minutes of this build with archives selected via the local
fields, three framings/interruptions, and metrics. No dump, image, or state;
interrupted runs are not merged into this complete result.

`prototype03-evidence.json` contains measurements of the real core in the explorable
bar and in the cabinet. They cover audio routing, resolution at
DPR 2, native samples, ball rotation, and pause.
`prototype03-endurance-evidence.json` keeps the ten readings from the production
build, from initial capture handoff through the final pause.
