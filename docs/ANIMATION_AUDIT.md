# Animation Audit — November 18, 2026

November 19 update: the worms use an articulated mesh driven by the native
phases; the wand, native messages, shared material (8 yellow-dot rings),
ground-realigned broom synchronization (`0x72`/`0x7a`/`0x7f`), and
Intermediate Race bridge RAM synchronization (`0x772`/`0x774`) are
implemented. The paragraphs below preserve the initial observations.

## Magic Wand and +10 Seconds

The original arcade routine 0x256d2 enters player state 8 when flag
A2+0xcb is active and the player is grounded on an eligible surface.
A2 designates the native object; for P1, A2 starts at 0x400018.
Presentation offsets in `practicePose.ts` start 0x18 before A2.
The MAME RAM dump is big endian; the WebAssembly heap byte-swaps in pairs.
Addresses are specific to the currently verified program/core.

The routine initializes A2+0x56 to 9 and A2+0x57 to 10, animation A2+0xcc to
0x216aa. It actually adds one second to the timer every nine object iterations
(two video frames per iteration), ten times. Observed duration: 180 frames.
The presentation must never add time itself.
Possible progress: `(10 - remaining + (9 - ticks) / 9) / 10`.

After completion, A2+0xd1 is cleared and calling 0x285b0 with event 0x10
creates the +10 SEC message. Presentation offsets: pointer 0xec = 0x22446,
flag 0xf0 = 1; signed vertical offset at 0x80 and age at 0x88.
This event must be read directly rather than inferring a bonus from a timer change.

The animation pointer at 0xcc advances by four bytes every two object
iterations. Table 0x216aa: 54 entries, last invisible. At indices
26/27, the marble is vertically squashed to 0.75; at indices 28/29,
it is stretched to 1.5. Beyond 42, the sprite is empty.
The `actor/rod.ase.mesh` model from Rolling Madness contains 32 poses, duration
2.966875 seconds, texture `rod.png`, 24 vertices per pose. Extraction is available
locally, but not yet added to the application's converter.

Evidence: local MAME capture `/tmp/mm-animation-review/magic/`, state 8 start
frame 2521, end frame 2701. To isolate the sequence, the diagnostic harness
enabled the pending flag in RAM, then let the arcade program run the animation
and timer. **This is not an observation of spontaneous appearance**, nor a patch
shipped in the game. The natural rule is restrictive: low timer between 3 and 6,
eligible surfaces, and a once-per-level lock.

## Breakage and Broom

State 2: primary animation A2+0x5a, table 0x20fde, 32 entries then sentinel.
Presentation offsets: primary pointer 0x72, secondary 0x7a, active 0x7f.
At primary index 9, the game activates broom sequence 0x215f6. Its pointer
then advances each object iteration. The secondary index reaches 43 before
breakage ends. It must control the visibility and progression of the broom.

Natural replay of a P2 fall: state 2 frames 3085–3213, 128 video frames.
At frame 3120: primary index 8, no broom. Frame 3140: primary index
13, broom index 7. Frame 3212: primary index 31, broom index 43.
Local traces `/tmp/mm-animation-review/broken/` and `broom-reference.png`.

The `player_broken` morph includes both the marble AND the broom (`player.png` and
`broom.jpg` groups). In the current import, the broom floats above the ground; its group
must be realigned independently of the debris, then slightly scaled down and compared.
Initial hypothesis for the broom group: scale 0.84 around its XZ center,
with minimum Y realigned to the model ground, without scaling down the marble pieces.

## Normal Marble and Broken Marble

The normal marble is currently procedural with marbled vertex color.
The broken marble uses `player.png` from the remake. Thus they do not share
the same material. The normal model `player.ase.mesh` is available locally:
radius about 5.67; import scale 0.119, final radius about 0.675.
Next fix: shared material/texture for normal, dizzy, and broken,
with a red palette preserving P2's yellow dots; compare the radius and
anchoring of the first breakage poses to the normal sphere.

State 7 consumed/hides the marble in the arcade. Do not automatically display
a "melt" morph when the native visibility flag is zero.

## Worms

Current models are translated entirely with their native root,
which causes feet to slide. The animation to represent must alternate one foot
planted on the ground while the other advances and lands, then vice versa. The native
position advances by an 8-unit step (one tile) at the end of the loop.

Native scripts:

- Idle: 0x20c18, 11 poses.
- Walk +X/+Z/−Z/−X: 0x20c48/0x20c6c/0x20c90/0x20cb4, eight poses each.
- Flex/attack: 0x20cd8, 34 poses.
- Jump: 0x20d64, one pose; translation provided by the core.
- Recovery: 0x20d6c, 26 poses.
- State 4: braking, four scripts of four poses, 0x20dd8/0x20dec/0x20e00/0x20e14.
  Equating it systematically to the start of a jump is incorrect.
- Eating/tongue, state 5: 0x20e28, 30 poses. The first 15 are a recovery,
  15–17 upright, 18 transition, 19–20 tongue extension start, 21–23 extension,
  24–27 maximum extension, 28–29 return. Do not display the tongue throughout state 5.

The `intermediateActors.ts` reader already provides script, index, and pose fraction;
prefer these values over arbitrary remake morph durations.
Also compare the marble's dizzy pose and stars to these native states.
Local original reference: `/tmp/mm-animation-review/worm-reference.png`.

### Additional Attack Verification

A new native replay captured worm 4 at frames 3138–3258. Attack
0x20cd8 starts curled (index 0), straightens around index 8, stays straight
around 16, opens a flat mouth around 23, then forms a bell shape around 24–33.
Eating 0x20e28 resumes this bell shape before straightening (about 15 poses),
then opens the mouth and extends the tongue in its final part. This profile
replaced the initial continuous-flex hypothesis, which was contradicted by captures.
The profiles are in `wormPose.ts`; the geometry remains a 3D approximation.

## Sources and Handoff Precautions

Personal installer: `Rolling Madness 3D 2005/`. Temporary extraction:
`/tmp/mm-rolling-research/extracted/data/{app}`. Dumps, captures, and analysis
tools are not assets to be versioned. Files under `/tmp` may disappear;
the addresses and observations above preserve the results.
Marble Love consulted locally at commit 113cf5de969ff62cb1d7b901340206f30122f658,
in addition to local disassembly of the program and MAME captures.
No second simulation is integrated into the application.
