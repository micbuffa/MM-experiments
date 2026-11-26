# Level 2 Green Worms: Integration Note

This note is for the developer building the Level 2 scene. The module is
`src/remaster/level2/greenWorms/` (`wormRomData.ts`, `wormSimulation.ts`). It
has no BabylonJS or Havok imports. See [level2-green-worms.md](level2-green-worms.md)
for the ROM analysis.

## Units

The module works in **arcade units**: 1 cell = 8 units, the height is the raw
arcade height (the Level 2 plateau is 16264), and velocities are units per
tick (1/60 s). Convert to and from the remaster world as follows:
`units = cells × 8`, velocity `units/tick = (cells/s) × 8 / 60`, and use the
same height mapping the Level 2 terrain conversion already uses.

## Calls

```ts
import {
  createWormWorld,
  stepWorms,
  readWormPose,
  scrollRow,
  arcadeScrollForPoint,
  type WormPlayer,
} from '../level2/greenWorms/wormSimulation';

const worms = createWormWorld(); // Level 2 spawns, scroll row 0.
const players: WormPlayer[] = [
  {
    id: 0,
    active: true,
    x,
    z,
    height,
    vx,
    vz,
    prevX,
    prevZ,
    arcadeState: 0,
    airState: 0,
  },
];

// In the fixed 60 Hz simulation step, after the marble physics step:
const row = scrollRow(arcadeScrollForPoint(leader.x, leader.z, leader.height));
const events = stepWorms(worms, players, row, 1 / 60, {
  groundHeight: (x, z, layer) => sampleArcadeHeight(x, z), // Arcade units.
});
// Then apply what the module wrote to `players` and handle `events`.

// Rendering: for each worm slot, if `slot.active`, read its pose.
const pose = readWormPose(worms.slots[i], env);
```

## Applying the results

- `player.x/z/vx/vz` were changed (`bump` blocks the marble, `knockback` sets
  its velocity, `swallow` moves it into the worm). Teleport or set the
  velocity of the Havok body to match.
- `arcadeState`:
  - **5** = dizzy for 50 ticks (`WORM_CONTACT_STUN_TICKS`). Ignore input and
    show the dizzy stars. The caller must count the timer down and set
    `arcadeState` back to 0.
  - **7** = swallowed. Hide the marble and make it kinematic.
  - **4** = respawn after `marbleEaten`. Use the existing spiral respawn and
    set the state back to 0.
- Events: `spawn`, `despawn` and `state` are for the visuals. `sound` is data
  for the SFX branch; do not play sounds here.

## Rendering

`readWormPose` gives position, `lift`, `heading`, `rear`/`front` (inchworm
extents), `script`, `frame`, `phase` and `poseId`. The procedural mesh on
`main` (`createWorm.ts` + `wormPose.ts`) can be fed directly:
`updateWormPose(rig, pose.state, WORM_SCRIPT_ADDRESS[pose.script], pose.frame, phase, pose.heading)`,
where `phase` is the sub-frame fraction. Alternatively, drive tail and head
from `rear`/`front` for the walk scripts.

## Open points for the Level 2 developer

- Calibrate the `line` argument of `arcadeScrollForPoint`, or replace the
  scroll row with any monotonic progress value mapped onto rows 5 to 34. The
  worms should appear just before their plateau comes into view.
- Provide `layer` per marble if the Level 2 data has layers. If it is left
  undefined, every worm sees the marble.
