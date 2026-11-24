# BabylonJS Best Practices

## Mandatory Application

**Every agent must read this file at the start of each task and apply
the relevant rules before modifying the project.** `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, and Copilot instructions refer to this guide. For a new
session or resuming after a handoff, re-read it along with `ARCHITECTURE.md`.

The user specification defines the scope; this guide defines implementation
practices. Do not add a feature simply because it is mentioned here.
Document any justified deviation in `docs/DECISIONS.md`.

## API, Dependencies, and Imports

- Check the APIs in the types and sources of the **installed version** before
  coding; supplement with official documentation. A Playground example
  may target a different version or rely on implicit registrations.
- Use strict TypeScript and targeted ES imports from `@babylonjs/core`.
  Avoid `Legacy/legacy` global imports, the global `BABYLON` namespace, and CDNs.
- Explicitly pass the scene to constructors that accept it; do not
  implicitly rely on the most recently created scene.
- For loaders, picking, and other components, check the side-effect imports
  required by the installed version. Comment them and test the production
  build; type checking alone does not guarantee runtime registration.
- Do not unnecessarily mix classic imports, `pure` imports, and Babylon Lite
  APIs. Any migration requires dedicated verification.
- Keep added BabylonJS packages at compatible, exact versions with a lockfile.
  Load Inspector and diagnostic tools in development only.

## Code Organization

- `app/` owns initialization and lifecycle; `rendering/` owns scenes and
  their visual representation. Keep application rules outside BabylonJS
  objects and testable without a GPU.
- Extract by responsibility: scene, camera, materials, loading, video
  texture, diagnostics. Avoid a scene-creation function that bundles
  UI, events, emulation, and business logic.
- Inject scene, engine, and required dependencies rather than using singletons.
  Use typed references; avoid per-frame lookups by name.
- Name resources for diagnostics. Use a `TransformNode` for a transform
  container with no geometry to display.

## Resource Ownership and Disposal

- Every resource must have an owner and a cleanup path: engine, scene,
  camera, mesh, material, texture, observer, DOM event, and async task.
- Only one BabylonJS render loop is created per application. Do not add a
  second loop or a second engine on reset, view change, or hot reload.
- Store observer handles and listener references to remove them on module
  disposal; avoid repeated subscriptions on resume.
- On teardown, stop updates first, then dispose of owned resources. Do not
  assume disposing a mesh disposes all its materials and textures; do not
  dispose a shared resource still used elsewhere.
- Disposing a scene releases its BabylonJS resources, but does not replace
  cleaning up DOM listeners, timers, or external application references.
- Ensure cleanup is idempotent across repeated calls. After an async load,
  verify the owner still exists; dispose of any now-unneeded result instead
  of attaching it to a disposed scene.

## Render Loop, Timing, and Performance

- Use seconds in application code; explicitly convert milliseconds from APIs
  that provide them. Avoid "per-frame" movement.
- **The emulated core cadence remains independent of BabylonJS.** Rendering
  displays its video; it does not advance the arcade program or alter its physics.
- Reuse vectors, colors, and buffers in hot paths; prefer `ToRef` variants
  and in-place operations where appropriate. Avoid repeated allocations,
  logging, and DOM reads inside per-frame callbacks.
- Share geometries, materials, and textures where usage permits. Consider
  instances or thin instances only for genuine repetitions, after reviewing
  picking, transform, and material constraints.
- Do not blanket-freeze matrices, active materials, or meshes: verify that
  the affected data is static and plan for updates when needed.
- Measure available CPU/GPU time, draw calls, resolution, and memory before
  optimizing. FPS alone proves neither core speed nor input smoothness.
- Cap texture resolution and cost according to measured needs. Test DPR and
  resize costs; do not hide a regression by arbitrarily lowering quality or
  raising build warning thresholds.

## Camera, Transforms, and Inputs

- Follow `ARCHITECTURE.md` conventions: left-handed, vertical Y axis.
  Distinguish local, world, screen, and arcade-core coordinates.
- Deliberately choose Euler angles or quaternions; avoid concurrent writes
  to `rotation` and `rotationQuaternion`. Test orientation, scale, and parenting.
- Attach camera controls only in views that need them. The arcade video view
  uses a fixed camera: its controls must not consume trackpad events intended
  for gameplay.
- Leave relative capture, focus, and user gestures to the input module.
  No command multiplier based on canvas size or texture resolution.
- Resize the engine when the display surface changes; preserve video aspect
  ratio and check DPR changes. Do not distort the plane.

## Core Video on a Texture

- Use the same session for direct view and 3D view. Choose the texture API
  after verifying the actual source: 2D canvas, WebGL canvas, or framebuffer.
  Do not assume a WebGL canvas can be read as a 2D context.
- Reuse the texture and transfer pixels at the appropriate time. Avoid
  `toDataURL`, video encoding, screenshots, and per-frame texture recreation.
- Validate the timing of source buffer copies. Do not blanket-enable
  `preserveDrawingBuffer`; document any actual need and its cost.
- For the arcade screen, use an unlit or appropriate emissive material and
  verify vertical orientation, aspect ratio, alpha, filtering, and color
  reproduction. Verify that tone mapping and image processing do not
  unintentionally alter the video.
- Transfer video only when needed and measure copy cost. Verify that hiding
  the source canvas does not stall its frame production.
- WebGL is the prototype target. Apply the CRT effect to the monitor material
  and reuse the core texture. Check scanlines at multiple distances and
  resolutions to avoid moiré.

## Assets and Loading

- Add only necessary loaders with explicit imports. Handle loading, errors,
  and late results after disposal; do not leave rejected promises unhandled.
- Prefer web-appropriate formats and sizes; for future models, consider
  glTF/GLB and compression after measurement, with versioned decoders.
- Record provenance and licenses in `public/assets/README.md`. ROMs/BIOS
  remain user-provided local files, never shipped assets.

## Validation Before Delivery

- Unit tests for every significant feature: math, state, dimension
  adaptation, and cadence logic, with deterministic inputs.
- `NullEngine` tests for scene construction and resource disposal verifiable
  without a GPU. They do not validate shaders, video copies, or real rendering.
- Browser verification for rendering changes: console, aspect ratio, colors,
  resize, interruptions, view switching, and create/dispose cycles.
- For arcade integration, verify animated video and sound, same session in
  both views, independent cadence, and no duplicated resources or inputs.
- Run `npm run check`. Record measurements, versions, and actual results in
  `docs/VALIDATION.md`, decisions in `docs/DECISIONS.md`, next steps in `HANDOFF.md`.
  Explicitly state what remains untested or pending Michel's validation.

## Official References

Consult while verifying compatibility with the installed version:

- [Scene Optimization](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/)
- [Scene API and Lifecycle](https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene)
- [Pure Imports and Explicit Registrations](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/treeShaking/usingPureImports/)
- [BabylonJS Repository Performance Guidelines](https://github.com/BabylonJS/Babylon.js/blob/master/.github/instructions/performance.instructions.md)
