# Arcade Endurance Recipe

## Reproducing

Node24+, local Chrome, and runtime installed. Start npm run dev, with personal
ZIPs in roms/; no transfer, download, or persistent storage is performed by
the harness. In a second terminal:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance
```

MARBLE_TEST_URL can point to another loopback HTTP server. The harness refuses
remote hosts. Numeric report in test-results/endurance.json, outside Git.
Duration: ten **active** sixty-second intervals, plus interruptions.
Duration cannot be shortened by a validation flag.

## Freezing the Production Build

To prevent hot reload from interrupting the session:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

In a second terminal:

```sh
MARBLE_TEST_URL=http://127.0.0.1:4175/ PLAYWRIGHT_CHANNEL=chrome npm run measure:endurance -- --local-files
```

--local-files selects fixed files roms/marble.zip and, if present,
roms/atarisy1.zip via browser file inputs. Archives remain outside dist and
are never uploaded. The app's normal validator is used.
Do not modify the build during the test. Dev mode remains possible if no
file is modified; a reload invalidates the entire series, never resumed
or stitched from a new session. The harness then reports missing session
diagnostics. The report exposes localFileSelection and the scenery.

## Actions and Observations

- Loads the real runtime and local archives via the page validator.
- Captures pointer to explore the bar, verifies the positional audio branch,
  then transfers capture to the core with E.
- Real Chrome capture, six Credit/Start aliases: observes the twelve expected
  press/release calls, distinct ports0/1; é via native CDP keyboard.
- Ten minutes of active loop, automated movements, and periodic boost.
- Every minute: Escape during a boost, stable pause, pending and buttons on
  both ports empty, fullscreen exit; then camera switch and recapture.
- Comparison/direct switches and 3D return, two viewport sizes.
- Every minute, the harness logs frames, copies, browser-exposed CPU and GPU
  times, draw calls, audio state, sources, RMS, DOM and JavaScript heap
  counters, listeners, and errors.
- No upload, archive copy, screenshot, or game save in the report.

The result must contain ten samples, over 600s active, frame and copy
progression, stable pauses, and zero JS errors. Examine memory/listener
trends without turning a GC variation into a leak diagnosis.
Counters are observed, not thresholds tuned to make the test pass.

## Scope

This is an automated technical session, mixing a started game then
arcade-decided states (game over/attract included). No human performance,
level traversal, or jump success is certified. Sound can be observed as
signal/context without proving listening quality. JS heap counters do not
cover all WASM/GPU memory; CPU time does not measure GPU work completion.
This headless Chrome test does not establish behavior on a 120Hz physical
display, Safari, or Apple trackpad.

Do not close a user game: the harness opens its own browser.
Avoid other heavy tests during a performance comparison. The report is
marked complete only after all ten intervals and error verification.
On failure, failure and available samples are saved.

## Prototype 01 History — November 10, 2026 Result

Ten samples, **600.40s active**, final frame 36794, **36090 copies**, zero
JS errors and remote requests. All six aliases produce the twelve expected
native calls. Ten stable pauses with inputs and boost cleared, nine
resumes/captures, alternated cameras and comparison/direct switches, two
viewport sizes. One audio source and 718 constant listeners, context
suspended on each pause.

Cumulative CPU copy+render average 0.144–0.177ms, max 10.2ms. JS heap
19.73–21.58MiB, nodes 4582–4645; the rise in late readings and GC variability
do not allow asserting absence of leaks. No blocking degradation observed
during this test. Early minutes coexisted with automated checks; do not
infer fine-grained performance comparisons from them.
Listening, physical comfort, 120Hz/Safari, and GPU/WASM memory remain unproven.
Numeric evidence preserved: third_party/endurance-evidence.json.

## Prototype02 — Production, November 10, 2026

The final cabinet/bar version completed a new series on static preview 4175
with --local-files, after the interrupted dev trials described in VALIDATION.
Ten new intervals, **600.02s active**, frame 36772 and 36063 copies.
Zero JS errors/remote requests, ten proper pauses/clears, three cameras,
fullscreen/capture, and resize. Evidence: third_party/prototype02-endurance-evidence.json.
The 01 series above is kept as history, not merged with this one.

Listeners 721 then 720 after initialization, audio source 1; JS heap
16.73–28.87MiB with drops after GC, nodes 4646–4693. Video callback average
0.459–0.550ms, max 9ms; excluding transition rAF render and GPU completion.
No blocking degradation observed; GPU/WASM memory, listening, and physical
hardware limits remain unchanged. Acceptance preview stopped after saving evidence.
