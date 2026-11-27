import type { Level5Actor } from '../../emulation/level5Actors';
import {
  LEVEL5_BIRD_COLLISION_RADIUS,
  LEVEL5_BIRD_LANES,
  LEVEL5_ESCHER_TELEPORT,
  LEVEL5_MINIATURE_KINDS,
  LEVEL5_RED_Y_PIPE,
  LEVEL5_SILLY_ARENA,
  type Level5MiniKind,
} from './level5RomData';

interface MutableMiniActor {
  readonly id: number;
  readonly kind: Level5MiniKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  phase: number;
  heading: number;
  squashed: boolean;
  squashElapsed: number;
  turnTimer: number;
}

interface MutableBirdActor {
  readonly id: number;
  readonly laneIndex: number;
  x: number;
  z: number;
  readonly startZ: number;
  readonly endZ: number;
  readonly height: number;
  speed: number;
  fast: boolean;
  phase: number;
  /** 1 = flying, 2 = stunned/exploding, 0 = respawn delay */
  state: 0 | 1 | 2;
  stateTimer: number;
}

export interface Level5ActorsState {
  readonly minis: MutableMiniActor[];
  readonly birds: MutableBirdActor[];
}

export interface Level5PlayerProbe {
  readonly playerIndex: 0 | 1;
  readonly cellX: number;
  readonly cellZ: number;
  readonly grounded: boolean;
  readonly active: boolean;
  readonly immune: boolean;
}

export interface Level5StepOutcome {
  readonly actors: Level5Actor[];
  readonly squashes: readonly {
    readonly playerIndex: 0 | 1;
    readonly kind: Level5MiniKind;
    readonly timeBonusSeconds: number;
    readonly score: number;
  }[];
  readonly birdHits: readonly (0 | 1)[];
}

/** True when a marble enters the lower mouth of the red inverted Y-pipe (ROM 0x2a738). */
export function isInsideLevel5RedPipeEntry(
  cellX: number,
  cellZ: number,
  heightUnits: number,
): boolean {
  const b = LEVEL5_RED_Y_PIPE.entryBox;
  return (
    cellX >= b.minX &&
    cellX <= b.maxX &&
    cellZ >= b.minZ &&
    cellZ <= b.maxZ &&
    heightUnits <= b.maxHeight
  );
}

/** True when a marble crosses the Escher '?' floor seam leading to the upper GOAL bridge. */
export function isInsideLevel5EscherTeleport(
  cellX: number,
  cellZ: number,
  heightUnits: number,
): boolean {
  const b = LEVEL5_ESCHER_TELEPORT.triggerBox;
  return (
    cellX >= b.minX &&
    cellX <= b.maxX &&
    cellZ >= b.minZ &&
    cellZ <= b.maxZ &&
    heightUnits <= b.maxHeight
  );
}

/** True when a marble turns back on the upper Escher bridge to return to the lower '?' floor. */
export function isInsideLevel5EscherReturn(
  cellX: number,
  cellZ: number,
  heightUnits: number,
): boolean {
  const b = LEVEL5_ESCHER_TELEPORT.returnBox;
  return (
    cellX >= b.minX &&
    cellX <= b.maxX &&
    cellZ >= b.minZ &&
    cellZ <= b.maxZ &&
    heightUnits >= b.minHeight
  );
}

const ARCADE_UNITS_PER_CELL = 8;

const CARDINAL_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Known safe open floor cells inside the H=16238 Silly Arena (avoiding H=16244 raised blocks). */
const SAFE_MINI_SPAWNS = [
  [91.5, 92.5],
  [95.5, 92.5],
  [101.5, 92.5],
  [91.5, 98.5],
  [96.5, 95.5],
  [101.5, 96.5],
  [91.5, 102.5],
  [96.5, 103.5],
  [101.5, 102.5],
] as const;

/** Initializes the 9 Silly Arena miniature enemies and 10 flying birds (ROM 0x19024 & 0x19a40). */
export function createLevel5ActorsState(
  random: () => number = Math.random,
): Level5ActorsState {
  const minis: MutableMiniActor[] = LEVEL5_MINIATURE_KINDS.map((kind, i) => {
    const [sx, sz] = SAFE_MINI_SPAWNS[i]!;
    const [dx, dz] = CARDINAL_DIRS[Math.floor(random() * 4) & 3]!;
    const speed = kind === 'black' ? 2.1 : kind === 'worm' ? 1.15 : 0.95;
    return {
      id: i,
      kind,
      x: sx,
      z: sz,
      vx: dx * speed,
      vz: dz * speed,
      phase: random(),
      heading: Math.atan2(dx, dz),
      squashed: false,
      squashElapsed: 0,
      turnTimer: 0.65 + random() * 0.9,
    };
  });

  const birds: MutableBirdActor[] = [];
  for (const lane of LEVEL5_BIRD_LANES) {
    for (let slot = 0; slot < 2; slot++) {
      const id = 9 + lane.laneIndex * 2 + slot;
      const fast = (lane.laneIndex + slot) % 2 === 1;
      const laneLen = lane.startZ - lane.endZ;
      const offsetFrac = (lane.laneIndex * 0.19 + slot * 0.5) % 1;
      birds.push({
        id,
        laneIndex: lane.laneIndex,
        x: lane.x,
        z: lane.startZ - offsetFrac * laneLen,
        startZ: lane.startZ,
        endZ: lane.endZ,
        height: lane.height,
        speed: fast ? 8.8 : 5.8,
        fast,
        phase: offsetFrac,
        state: 1,
        stateTimer: 0,
      });
    }
  }

  return { minis, birds };
}

/** Converts internal Level 5 actor state into the native `Level5Actor[]` snapshot for 3D rendering. */
export function readLevel5ActorsSnapshot(
  state: Level5ActorsState,
): Level5Actor[] {
  const out: Level5Actor[] = [];
  for (const m of state.minis) {
    // Keep squashed miniatures visible flat on the floor for 3.0 s before fading out.
    if (m.squashed && m.squashElapsed > 3.0) continue;
    out.push({
      id: m.id,
      kind: m.kind,
      x: m.x * ARCADE_UNITS_PER_CELL,
      z: m.z * ARCADE_UNITS_PER_CELL,
      height: LEVEL5_SILLY_ARENA.height,
      state: m.squashed ? 2 : 1,
      phase: m.phase,
      heading: m.heading,
      fast: false,
      ...(m.squashed ? { squash: Math.min(1, m.squashElapsed / 0.18) } : {}),
    });
  }
  for (const b of state.birds) {
    if (b.state === 0) continue;
    let birdSpark: 'flash' | number | undefined;
    if (b.state === 2) {
      if (b.stateTimer < 0.22) {
        birdSpark = 'flash';
      } else {
        const expFrac = Math.min(1, (b.stateTimer - 0.22) / 0.28);
        birdSpark = (Math.floor(expFrac * 2.99) + 1) / 3;
      }
    }
    out.push({
      id: b.id,
      kind: 'bird',
      x: b.x * ARCADE_UNITS_PER_CELL,
      z: b.z * ARCADE_UNITS_PER_CELL,
      height: b.height,
      state: b.state,
      phase: b.phase,
      heading: Math.PI, // flying toward -Z
      fast: b.fast,
      ...(birdSpark !== undefined ? { birdSpark } : {}),
    });
  }
  return out;
}

/** Steps all 19 Level 5 actors, resolves miniature squashes (+3 s / +500) and flying bird strikes. */
export function stepLevel5Actors(
  state: Level5ActorsState,
  players: readonly Level5PlayerProbe[],
  dt: number,
  random: () => number = Math.random,
  isArenaFloor?: (cellX: number, cellZ: number) => boolean,
): Level5StepOutcome {
  const squashes: {
    playerIndex: 0 | 1;
    kind: Level5MiniKind;
    timeBonusSeconds: number;
    score: number;
  }[] = [];
  const birdHits: (0 | 1)[] = [];

  for (const m of state.minis) {
    if (m.squashed) {
      m.squashElapsed += dt;
      continue;
    }
    // ROM 0x1919c: worms & amoebas animate in calm 10 Hz / 8-frame strides; mini blacks scurry faster.
    const animRate = m.kind === 'black' ? 2.2 : m.kind === 'worm' ? 1.15 : 1.0;
    m.phase = (m.phase + dt * animRate) % 1;
    m.turnTimer -= dt;
    const speed = m.kind === 'black' ? 2.1 : m.kind === 'worm' ? 1.15 : 0.95;
    if (m.turnTimer <= 0) {
      const [dx, dz] = CARDINAL_DIRS[Math.floor(random() * 4) & 3]!;
      m.vx = dx * speed;
      m.vz = dz * speed;
      m.turnTimer = 0.7 + random() * 1.1;
    }
    const nextX = m.x + m.vx * dt;
    const nextZ = m.z + m.vz * dt;
    const inBounds =
      nextX >= LEVEL5_SILLY_ARENA.minX &&
      nextX <= LEVEL5_SILLY_ARENA.maxX &&
      nextZ >= LEVEL5_SILLY_ARENA.minZ &&
      nextZ <= LEVEL5_SILLY_ARENA.maxZ;
    const clearFloor =
      inBounds &&
      (!isArenaFloor ||
        (isArenaFloor(nextX + Math.sign(m.vx) * 0.35, nextZ) &&
          isArenaFloor(nextX, nextZ + Math.sign(m.vz) * 0.35)));
    if (clearFloor) {
      m.x = nextX;
      m.z = nextZ;
    } else {
      // Bounce cleanly off arena walls & raised H=16244 interior blocks
      m.vx = -m.vx;
      m.vz = -m.vz;
      m.turnTimer = 0.25;
    }
    m.heading = Math.atan2(m.vx, m.vz);

    for (const p of players) {
      if (!p.active || !p.grounded) continue;
      if (
        Math.hypot(p.cellX - m.x, p.cellZ - m.z) <
        LEVEL5_SILLY_ARENA.squashRadiusCells
      ) {
        m.squashed = true;
        m.squashElapsed = 0;
        m.vx = 0;
        m.vz = 0;
        squashes.push({
          playerIndex: p.playerIndex,
          kind: m.kind,
          timeBonusSeconds: LEVEL5_SILLY_ARENA.squashTimeBonusSeconds,
          score: LEVEL5_SILLY_ARENA.squashScore,
        });
        break;
      }
    }
  }

  for (const b of state.birds) {
    if (b.state === 0) {
      b.stateTimer -= dt;
      if (b.stateTimer <= 0) {
        b.state = 1;
        b.z = b.startZ;
        b.phase = 0;
        b.fast = random() > 0.5;
        b.speed = b.fast ? 8.8 : 5.8;
      }
      continue;
    }
    if (b.state === 2) {
      b.stateTimer += dt;
      b.phase = Math.min(0.99, b.stateTimer / 0.5);
      if (b.stateTimer >= 0.5) {
        b.state = 0;
        b.stateTimer = 0.65 + random() * 0.7;
      }
      continue;
    }

    // Flying straight along -Z
    b.z -= b.speed * dt;
    b.phase = (b.phase + dt * (b.fast ? 5.5 : 3.5)) % 1;

    let hitPlayer = false;
    for (const p of players) {
      if (!p.active || p.immune) continue;
      if (
        Math.hypot(p.cellX - b.x, p.cellZ - b.z) < LEVEL5_BIRD_COLLISION_RADIUS
      ) {
        birdHits.push(p.playerIndex);
        hitPlayer = true;
        break;
      }
    }
    if (hitPlayer || b.z <= b.endZ) {
      b.state = 2;
      b.stateTimer = 0;
      b.phase = 0;
    }
  }

  return {
    actors: readLevel5ActorsSnapshot(state),
    squashes,
    birdHits,
  };
}
