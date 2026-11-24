# Marble Madness — Prototype 03

Michel authorized five evolutions of prototype 02. Historical restrictions
on navigation and spatial audio are lifted for this batch.

1. **Explorable bar.** ZQSD, WASD, or arrow-key movement, trackpad look.
   Simple collisions with the room, cabinet, and furniture. Pressing E in front
   of the cabinet transfers capture to gameplay. Escape pauses. Leaving the
   cabinet returns to the overview. Movement resumes from the last exploration
   position.
2. **Refined cabinet.** Human-scale proportions, side panel, textured metal and
   wood, static shadows. Frontal framing displays the entire video.
3. **Visible trackball.** The ball rotates according to deltas read by the core.
   Cabinet framing with the HUD Capture button makes it visible during play.
4. **Positional audio.** Exploration attenuates and pans existing arcade audio
   according to position and orientation. The HUD allows disabling it.
   During gameplay and observation, the original arcade mix is used.
5. **Adjustable rendering.** Eco, Balanced, and Retina profiles cap resolution
   at 1×, 1.5×, and 2× of the CSS canvas. Diagnostics measure rendered frames,
   draw calls, and CPU time, plus GPU time if exposed by the platform.
   Test profiles in a real browser. Separately record Safari acceptance and
   testing on a physical 120 Hz display.

One arcade session, one video texture, and a single rendering task at a time.
Visit collisions belong to the scenery. Marble Madness rules and physics
remain in MAME. Preserve reference views, controls, cleanup after
interruption, and local selection of ROMs and BIOS.
