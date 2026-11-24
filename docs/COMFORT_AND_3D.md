# Comfort Control and First 3D Presentation

Michel's request replaces the 0.50× calibration, rejected as unplayable,
with an explicit boost and continued visual work. This evolution is recorded
in section 15 of the specification.

## Playing

Reload the page, start the game, then Capture. Normal control reverts
to 1.70× if the old 0.50× candidate was still saved; other valid gains
are kept. The Normal Control button restores 1.70×.

Hold **Space** and steer with the trackpad for a continuous command in the
chosen direction. Releasing Space restores normal control. If the last gesture
is stale, give a direction on the trackpad after holding Space.
Escape, focus loss, or hidden tab: pause, silence, and boost cleared. Space
does not resume a paused game and does not activate in an input field.

Boost is not a native jump key. While held, it replaces large deltas with
moderate, sustained commands; the arcade program still decides acceleration,
collisions, and jumps. An L1 norm of 256 counts per iteration is retained
following Michel's feedback on the level 1 jump and comparison with the initial
128 setting. Playability, jumping, and braking remain to be verified in-game.

## Displaying 3D

Select **3D Scene Screen** in Display within the same session. The real video
is placed in a frame on a stand/pedestal, with perspective, lighting, and a
gridded floor. The 3D buttons are decorative; Credit/Start remain in the UI.
The game board and marble are not rebuilt as BabylonJS meshes.

The same texture, emulator, and inputs remain in use.
Fixed camera, no camera control consuming the trackpad. Direct, compared,
and flat-only views remain available. No external assets or second audio
chain. Video continues to be copied after its actual draw; no BabylonJS
loop advancing the core. Changing views does not resume the game.

## Validation and Next Steps

Pure tests cover direction, hold, joint quantization, release, and clears.
NullEngine verifies presentation switching, scenery reuse, and disposal.
Chrome tests verify real capture/Space, its cleanup, perspective animated
video colors, resizing, and returning to flat view without extra subscriptions.

Initial real-runtime test: 1.70× gain restored, 24 horizontal boost iterations
observed at (128,0), then zeros on release. A second boost is cleared by
Escape, stable frame, and no restart via Space while paused. Animated 3D scene,
90 cumulative copies observed, zero JS errors. These are automated Chrome inputs,
not a physical trackpad comfort test. Render screenshot examined in /tmp, not
shipped as an asset. Numeric evidence in third_party.

## Fullscreen and HUD Delivered

After startup, **Play in 3D Fullscreen** selects the 3D scene and displays
compact controls. Credit → Start → Capture, or just Capture to resume an
already started game. Entering itself pauses. Escape pauses/releases the
trackpad, exiting fullscreen depending on the browser; Return to page exits
and keeps pause. If the Fullscreen API is denied or absent, the view remains
immersive in the window, with the same Return button.

Controls and states reflect existing controls; no second engine, audio, loop,
or session. Tests also cover late requests after exit/unmount and focus after
native close. Fullscreen rendering was examined on a screenshot of the real
game in Chrome; animated video and readable HUD.

## Fixed Cameras Delivered — November 10, 2026

The Camera selector is available in the HUD and on the page (active only
in 3D scene). Frontal frames the screen straight-on and enlarged with its frame;
the pedestal is partially out of frame to prioritize the video. Perspective
keeps the scenery view, initial choice. Both selectors are synchronized,
the choice is kept during the session and after switching presentation,
without a new persistent preference.

Switching camera sends no commands and preserves play/pause.
The last texture is redrawn even while paused. If the trackpad is captured,
press Escape to release it before choosing, then Capture to resume. The camera
never uses trackpad movements. The comparison plane remains independent of the
3D choice. Physical boost comfort remains to be confirmed.

## Prototype02 Now Authorized

Michel explicitly requested cabinet, transition, interactions, materials, and
first bar. These five steps are implemented in the new scene; see
PROTOTYPE_02.md and spec02. The historical cabinet/bar restrictions above
no longer block this scope. Physical comfort limits remain separate.
