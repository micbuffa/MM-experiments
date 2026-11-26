# Level 2 Drawbridge and Pipes: Integration Note

Pure modules in `src/remaster/level2/` (no BabylonJS, no Havok; Vitest-covered).
ROM evidence is in [level2-bridge-pipes.md](level2-bridge-pipes.md). Units:
arcade units (8 per cell) and arcade height words unless a name ends in
`World` (remaster cells / world Y). ROM logic runs at 30 Hz; the helpers take
seconds and convert.

## Drawbridge

```ts
import { bridgeState } from './level2/bridgeCycle';
import { decideBridgeCrossing } from './level2/bridgeCrossing';

// Each fixed step (60 Hz), with the scene's own bridge clock in seconds:
const bridge = bridgeState(bridgeSeconds /*, { phaseOffsetTicks } */);
// Rendering: rotate the deck about its hinge (z = 60) by bridge.angleRadians
// (smooth), or lift the free edge by bridge.freeEdgeRiseWorld.
// Kinematic Havok deck collider: drive it from the same values.

// Per marble near the deck (Level 2 axes: along = cell Z, lateral = cell X):
const decision = decideBridgeCrossing(
  {
    along: arcadeZ / 8,
    lateral: arcadeX / 8,
    heightUnits: marbleBottomHeight - 0x3f88, // hinge level ~ bridge object height (verify on the mesh)
    velocityAlong: velocity.z,
    radiusCells: REMASTER_PHYSICS.marbleRadius,
  },
  bridge.smoothStep, // or bridge.step for the ROM-exact discrete lip
);
```

What to do with `decision.kind`:

- `traverse`: nothing special; optional step-up assist (snap the marble onto
  the deck if it is within `surfaceRiseUnits`) gives the "forgiving" feel of
  issue #4. Pass `{ wallStepUnits: 6 }` for more forgiveness than the ROM's 4.
- `rebound`: set the Z velocity to `reflectedVelocityAlong` (ROM keeps the
  magnitude); a wall restitution below 1 is a remaster choice.
- `fall` with `outcome: 'vanish'`: let it fall; when it is 128 units below its
  take-off height, trigger the existing fall/respawn path (48-tick = 1.6 s
  reassembly, `MARBLE_TERRAIN_ROM.rebuildTicksAfterVoidFall`).
- `fall` with `outcome: 'land'`: let Havok drop it into the recess; the
  existing shatter threshold decides the landing.
- `embedded`: vanish + 24-tick reassembly (only if the deck rises over a
  marble trapped under it).

`passable` is `true` exactly when the lip is under 4 units (steps 0-1). The
cycle starts at `t = 0` with the raise; the ROM starts it when the bridge
object spawns, so a scene may start its clock when the bridge comes into view.

## Pipes (Approach A, timed teleport)

```ts
import {
  beginPipeTraversal,
  pipeTraversalAt,
  probePipeEntry,
} from './level2/pipeTeleport';
import { arcadeToWorld } from './level2/romUnits';

// Each fixed step, per active marble (arcade coordinates):
const probe = probePipeEntry({ x, z, height });
switch (probe.kind) {
  case 'mouth': // drop pipe: zero horizontal velocity, keep gravity
    break;
  case 'rim':
  case 'body': // solid: handled by the outer pipe shell collider
    break;
  case 'enter': {
    const traversal = beginPipeTraversal(probe.pipe, probe.entry, otherMarbles);
    // ROM order: teleport now. Hide the marble, make it kinematic, place it at
    // arcadeToWorld({ ...traversal.exit, height: groundAt(traversal.exit) }, frame)
    // (Y from sampleLayerHeight). Emit traversal.entrySound (0x35) as a cue.
    break;
  }
}
// While a traversal is active:
const frame = pipeTraversalAt(secondsSinceEnter);
if (frame.released) {
  // Show the marble, back to dynamic, set velocity
  // (traversal.exitVelocityWorld.x, 0, traversal.exitVelocityWorld.z),
  // award traversal.pipe.exitScore, clear airborne if pipe.clearsAirborne.
}
```

Notes:

- The ROM moves the marble to the exit on the **entry** tick; follow cameras
  will jump there. Keep the camera on the entry for 0.63 s if that feels better.
- Exterior collisions: enable the existing shell mesh as a static collider, but
  exclude the `interior` cap triangles (they close the mouths).
- Black marble: only the Y-pipe teleports non-player actors; the drop pipe
  removes them (`0x15bd0`).

## Files

- `src/remaster/level2/romUnits.ts`: 30 Hz tick, arcade ↔ world conversions.
- `src/remaster/level2/bridgeCycle.ts`: `BRIDGE_ROM`, `bridgeState`,
  `bridgeStepAtTick`, `deckRiseUnits`, `freeEdgeRiseUnits`.
- `src/remaster/level2/bridgeCrossing.ts`: `decideBridgeCrossing`,
  `MARBLE_TERRAIN_ROM`, `LEVEL2_BRIDGE_FOOTPRINT`.
- `src/remaster/level2/pipeTeleport.ts`: `LEVEL2_PIPES`, `probePipeEntry`,
  `isExitOccupied`, `beginPipeTraversal`, `pipeTraversalAt`.
- `src/remaster/level2/romSoundCues.ts`: cue numbers (data only).
