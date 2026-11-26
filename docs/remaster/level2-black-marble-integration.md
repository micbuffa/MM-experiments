# Level 2 black marble: integration note

How the Level 2 Remaster scene should drive `src/remaster/level2/`. The
modules are pure TypeScript (no BabylonJS or Havok), deterministic, and
covered by Vitest. ROM findings are in
[level2-black-marble.md](level2-black-marble.md).

## Coordinates

All inputs use **arcade cell coordinates**, the `rows[z][x]` indices of
`local-roms/intermediate-terrain.json`. Positions are continuous (the cell
centre is `index + 0.5`), velocities are in cells/s and accelerations in
cells/s². Convert from and to the scene's world frame at the boundary. On
Practice, `practiceWorldPoint` subtracts an origin and half the grid size. Use
the Level 2 equivalent, and flip signs if the scene mirrors an axis.

## Per fixed step (60 Hz)

```ts
import {
  LEVEL2_BLACK_MARBLE,
  LEVEL2_ZONE_BOUNDARIES,
} from './level2/blackMarbleRom';
import {
  cellOf,
  nextZone,
  scrollRow,
  enemyBandEvent,
  estimateLevel2Scroll,
} from './level2/enemyZones';
import {
  createEnemyMarbleState,
  stepEnemyMarble,
  bumpEnemyMarble,
  clampEnemyVelocity,
  enemyFellOff,
  landsOn,
} from './level2/blackMarbleController';

// 1. Player zones (start at 0). Pass the integer cell before and after the step.
player.zone = nextZone(
  LEVEL2_ZONE_BOUNDARIES,
  player.zone,
  prevCell,
  cellOf(player),
);

// 2. Spawn/despawn from the scroll row (estimate or real camera progress).
const row = scrollRow(estimateLevel2Scroll(leader, leaderHeightAboveBaseUnits));
const ev = enemyBandEvent(LEVEL2_BLACK_MARBLE, enemyActive, previousRow, row);
// At level start call it with (scrollRow(scroll - 25), row): it spawns at node 0 (40,35).
if (ev === 'spawn') {
  /* create body at node 0 centre, on the ground */ state =
    createEnemyMarbleState();
}
if (ev === 'despawn') {
  /* remove body, no score */
}

// 3. AI + steering.
const out = stepEnemyMarble(
  LEVEL2_BLACK_MARBLE,
  state,
  {
    x,
    z,
    vx,
    vz,
    airborne, // no ground contact
    wallNormal, // horizontal unit normal of a touched wall, or null
    slopeAcceleration, // optional: horizontal downhill accel from gravity
  },
  players.map((p) => ({
    x: p.x,
    z: p.z,
    active: p.alive,
    zone: p.zone,
    airborne: p.inAir,
    targetable: p.rollingNormally,
  })),
  dt,
  { mass },
);
state = out.state;
body.applyForce(toWorld(out.desiredForce), body.getAbsolutePosition()); // centre of mass
// After the physics step: clamp horizontal velocity with clampEnemyVelocity (18.75 cells/s).
```

## Events from the scene

- **Marble contact** (Havok collision observer, black marble ↔ any marble):
  `state = bumpEnemyMarble(LEVEL2_BLACK_MARBLE, state, selfPos)`. Call it
  once per contact start, not every frame of the contact.
- **Squash**: if `landsOn(attackerInAir, attackerHeightUnits, victimHeightUnits)`
  and the victim is the black marble, kill it and give 1000 points to each
  active player. If the black marble lands on a player, the player is
  crushed.
- **Fall**: `enemyFellOff(groundUnits, selfUnits)` → remove it and give 1000
  points to each active player.
- Sound: see section 10 of the findings doc. Playback belongs to
  `remaster-sfx-rom-extraction`.

## Physics recommendations (left-wall stall, issue #1)

- Give the black marble a physics material with friction 0 and
  `PhysicsMaterialCombineMode.MINIMUM`. Wall contact then no longer creates
  Coulomb drag (the arcade has none).
- Always pass `wallNormal` when touching a wall. Keep `wallSlide` on (the
  default).
- Watch `out.stalled` in development logs. If it fires on the corridor, try
  `slopeCompensation: 0.5`, then a `speedScale` above 1. Do not aim the marble
  directly at the patrol zone: the node path keeps it on the corridor
  centreline z = 35.5.
- Tune `speedScale` only after comparing with the arcade climb time. In the
  arcade the climb from node 0 to node 6 is about 18 cells at ≤ 18.75 cells/s.
