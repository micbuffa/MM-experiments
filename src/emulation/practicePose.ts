import { readBirdDeath, type BirdDeath } from './birdDeath';
import { readLevel5Actors, type Level5Actor } from './level5Actors';
import { readTerrainPalette, type TerrainPalette } from './terrainPalette';
import { readLevel4Pistons, type Level4PistonPose } from './level4Pistons';
import {
  readLevel4VacuumExtensions,
  readLevel4VacuumMouthFrames,
  readLevel4VacuumIndex,
} from './level4Vacuums';
import { readLevel4CatapultFrame } from './level4Catapult';
import { readLevel4HammerFrames } from './level4Hammers';
import { readPracticeHud } from './practiceHud';
import type { PracticeHud } from './practiceHud';
import { readIntermediateActors } from './intermediateActors';
import type { IntermediateActor } from './intermediateActors';
import { practiceOpeningScroll } from '../game/modern/practiceProjection';

// Addresses for CORE_WASM_SHA256 only. The 68010 bus stores words in native
// host order; a long is two little-endian words with the high word first.
export const PRACTICE_WORK_RAM = 0x1d99478;
const practiceDescriptor = 0x2bee2;
const intermediateDescriptor = 0x2c54c;
const level3Descriptor = 0x2cd9e;
const level4Descriptor = 0x2d648;
const level5Descriptor = 0x2de1e;
const level6Descriptor = 0x2e790;
// Level 6 disappearing-block maze 4-phase ROM cycle pointers written to Work RAM 0x400978.
const level6MazePhasePointers: Readonly<
  Partial<Record<number, 0 | 1 | 2 | 3>>
> = {
  0x24e2a: 0,
  0x24e32: 1,
  0x24e3a: 2,
  0x24e42: 3,
};
const scoreAwards = [
  250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500,
  6000,
] as const;
export type PracticeStartLiftPhase = 1 | 2 | 3 | 4 | 5;

// Each phase selects a different terrain record in the arcade's lookup table.
const startLiftPhases: Readonly<
  Partial<Record<number, PracticeStartLiftPhase>>
> = {
  0x20c2: 1,
  0x2245: 2,
  0x244a: 3,
  0x254e: 4,
  0x25d0: 5,
};

export interface PracticeMarblePose {
  readonly marble: 'visible' | 'hidden' | 'rebuilding';
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly atGoal?: boolean;
  readonly inPipe?: boolean;
  readonly respawnTicks?: number;
  readonly catchUpOffset?: number;
  readonly timeBonusOffset?: number;
  readonly timeBonusSeconds?: 3 | 10;
  readonly scoreAward?: { readonly points: number; readonly offset: number };
  readonly magic?: {
    readonly progress: number;
    readonly frame: number;
    readonly stretch: number;
  };
  readonly broken?: {
    readonly primaryFrame: number;
    readonly broomFrame?: number;
  };
  readonly melt?: number;
  readonly suction?: {
    readonly progress: number;
    readonly vacuumIndex?: number;
  };
  readonly birdDeath?: BirdDeath;
  readonly animation?: number;
  readonly animationTick?: number;
}

export interface PracticePose extends PracticeMarblePose {
  readonly scroll: number;
  readonly level?: 'intermediate' | 'level3' | 'level4' | 'level5' | 'level6';
  readonly frame?: number;
  readonly bridgeStep?: number;
  readonly level6MazePhase?: 0 | 1 | 2 | 3;
  readonly pistons?: readonly Level4PistonPose[];
  readonly catapultFrame?: number;
  readonly hammerFrames?: readonly (number | undefined)[];
  readonly vacuumExtensions?: readonly number[];
  readonly terrainPalette?: TerrainPalette;
  readonly vacuumMouthFrames?: readonly (number | undefined)[];
  readonly waveProfile?: readonly number[];
  readonly actors?: readonly IntermediateActor[];
  readonly level5Actors?: readonly Level5Actor[];
  readonly player2?: PracticeMarblePose;
  readonly goalOwner?: 1 | 2;
  readonly startLift?: PracticeStartLiftPhase;
  readonly opening?: number;
  readonly hud?: PracticeHud;
}

export function readPracticePose(
  heap: Uint8Array,
  frame = 0,
  previousPalette?: TerrainPalette,
): PracticePose | null {
  if (heap.byteLength < PRACTICE_WORK_RAM + 0x980) return null;
  const memory = new DataView(
    heap.buffer,
    heap.byteOffset + PRACTICE_WORK_RAM,
    Math.min(heap.byteLength - PRACTICE_WORK_RAM, 0x2000),
  );
  const word = (offset: number) => memory.getUint16(offset, true);
  const signed = (offset: number) => memory.getInt16(offset, true);
  const fraction = (offset: number) => word(offset) / 0x10000;
  const descriptor = word(0x474) * 0x10000 + word(0x476);
  const intermediate = descriptor === intermediateDescriptor;
  const level3 = descriptor === level3Descriptor;
  const level4 = descriptor === level4Descriptor;
  const level5 = descriptor === level5Descriptor;
  const level6 = descriptor === level6Descriptor;
  const mode = word(0x390);
  const players = word(0x396);
  const scroll = signed(0x97e);
  const opening =
    !intermediate &&
    !level3 &&
    !level4 &&
    !level5 &&
    !level6 &&
    mode === 5 &&
    scroll === practiceOpeningScroll &&
    memory.getUint8(0x31) === 1;
  // The next race is already initialized during its native title countdown.
  // Keep its terrain drawable before the core hands control back to the player.
  const levelIntro =
    (intermediate || level3 || level4 || level5 || level6) &&
    mode === 3 &&
    memory.getUint8(0x31) === 1 &&
    memory.getUint8(0x33) === 0;
  // Keep the 3D terrain visible during native out-of-time / game-over banners.
  const gameOver = mode === 4;
  if (
    (descriptor !== practiceDescriptor &&
      !intermediate &&
      !level3 &&
      !level4 &&
      !level5 &&
      !level6) ||
    (mode !== 0 && !opening && !levelIntro && !gameOver) ||
    (players !== 1 && players !== 2)
  )
    return null;
  // These are 68010 byte offsets. The little-endian heap swaps each byte pair.
  function marbleAt(base: number, player: number): PracticeMarblePose {
    const slotState = memory.getUint8(base + (0x30 ^ 1));
    const active =
      (slotState === 1 || (gameOver && slotState === 2)) &&
      memory.getUint8(base + (0x31 ^ 1)) === player;
    const animation = memory.getUint8(base + (0x32 ^ 1));
    const displayed = memory.getUint8(base + (0x34 ^ 1));
    const respawnTicks = word(base + 0x6e);
    // Catch-up notice: high byte ages from 0 to 40, low byte selects the penalty.
    const notice = word(base + 0x88);
    const long = (offset: number) =>
      word(base + offset) * 65536 + word(base + offset + 2);
    const awardPointer = long(0xec);
    const awardIndex = (awardPointer - 0x22386) / 12;
    const awardPoints = Number.isInteger(awardIndex)
      ? scoreAwards[awardIndex]
      : undefined;
    const wandFrame = Math.max(0, Math.min(53, (long(0xe4) - 0x216aa) / 4));
    const ticks = memory.getUint8(base + (0x6e ^ 1));
    const remaining = memory.getUint8(base + (0x6f ^ 1));
    const brokenPrimaryPtr = long(0x72);
    const brokenPrimaryIdx = (brokenPrimaryPtr - 0x20fde) / 4;
    const broomActive = memory.getUint8(base + (0x7f ^ 1)) === 1;
    const broomPtr = long(0x7a);
    const broomIdx = (broomPtr - 0x215f6) / 4;
    const broken =
      active &&
      animation === 2 &&
      Number.isInteger(brokenPrimaryIdx) &&
      brokenPrimaryIdx >= 0 &&
      brokenPrimaryIdx <= 31
        ? {
            primaryFrame: brokenPrimaryIdx,
            ...(broomActive &&
            Number.isInteger(broomIdx) &&
            broomIdx >= 0 &&
            broomIdx <= 43
              ? { broomFrame: broomIdx }
              : {}),
          }
        : undefined;
    // The display flag identifies a drawable slot during jumps as well as rolling.
    const marble =
      active && animation === 4 && displayed <= 1
        ? 'rebuilding'
        : active && displayed === 1
          ? 'visible'
          : 'hidden';
    const isSuction = active && level4 && animation === 0x0a;
    const birdDeath =
      active && level5 ? readBirdDeath(memory, base + 0x18) : undefined;
    const vacuumIndex = isSuction
      ? readLevel4VacuumIndex(memory, memory.getUint8(base + (0x70 ^ 1)))
      : undefined;
    return {
      marble,
      x: signed(base + 0x24) + fraction(base + 0x26),
      z: signed(base + 0x28) + fraction(base + 0x2a),
      height: word(base + 0x2c) + fraction(base + 0x2e),
      atGoal: active && animation === 6,
      ...(active && animation === 3 ? { inPipe: true } : {}),
      ...(active &&
      memory.getUint8(base + (0xf0 ^ 1)) === 1 &&
      awardPoints !== undefined
        ? {
            scoreAward: {
              points: awardPoints,
              offset: memory.getInt8(base + (0x80 ^ 1)),
            },
          }
        : {}),
      ...(active && animation === 8
        ? {
            magic: {
              progress: Math.max(
                0,
                Math.min(1, (10 - remaining + (9 - ticks) / 9) / 10),
              ),
              frame: wandFrame,
              stretch:
                wandFrame === 26 || wandFrame === 27
                  ? 0.75
                  : wandFrame === 28 || wandFrame === 29
                    ? 1.5
                    : 1,
            },
          }
        : {}),
      ...(active &&
      memory.getUint8(base + (0xf0 ^ 1)) === 1 &&
      (long(0xec) === 0x22446 || long(0xec) === 0x2242e)
        ? {
            timeBonusOffset: memory.getInt8(base + (0x80 ^ 1)),
            timeBonusSeconds:
              long(0xec) === 0x2242e ? (3 as const) : (10 as const),
          }
        : {}),
      ...(broken ? { broken } : {}),
      ...(isSuction
        ? {
            suction: {
              progress: 1 - Math.min(32, remaining) / 32,
              ...(vacuumIndex !== undefined ? { vacuumIndex } : {}),
            },
          }
        : {}),
      ...(active && animation === 9
        ? {
            melt: Math.max(0, Math.min(1, (word(base + 0x74) - 0x1062) / 0x18)),
          }
        : {}),
      ...(birdDeath ? { birdDeath } : {}),
      ...(active && [1, 2, 5, 7, 9, 11].includes(animation)
        ? { animation, animationTick: frame }
        : {}),
      ...(mode === 0 &&
      players === 2 &&
      marble === 'visible' &&
      animation === 0 &&
      long(0xec) === 0x2243a &&
      memory.getUint8(base + (0xf0 ^ 1)) === 1 &&
      (notice & 0xff) === 0xff &&
      notice >>> 8 <= 40
        ? { catchUpOffset: memory.getInt8(base + (0x80 ^ 1)) }
        : {}),
      ...(marble === 'rebuilding' &&
      displayed === 1 &&
      respawnTicks > 0 &&
      respawnTicks <= 47
        ? { respawnTicks }
        : {}),
    };
  }
  const hud = readPracticeHud(heap, players === 2);
  const liftCode = word(0x76e);
  const startLift =
    !intermediate &&
    !level3 &&
    !level4 &&
    !level5 &&
    !level6 &&
    word(0x774) === (liftCode | 0x4000)
      ? startLiftPhases[liftCode]
      : undefined;
  // Intermediate Race animated bridge: 0x772 steps 0x6fc8..0x6fd4 in increments of 2,
  // paired with 0x774 = 0xf048..0xf054 (7 discrete heights, 0..6).
  const bridgeA = word(0x772);
  const bridgeStep =
    intermediate &&
    bridgeA >= 0x6fc8 &&
    bridgeA <= 0x6fd4 &&
    (bridgeA & 1) === 0 &&
    word(0x774) === 0xf048 + (bridgeA - 0x6fc8)
      ? (bridgeA - 0x6fc8) / 2
      : undefined;
  const level6MazePhase = level6
    ? (level6MazePhasePointers[word(0x978) * 0x10000 + word(0x97a)] ?? 0)
    : undefined;
  // Level 3 animated turquoise wave: 22 triplets at 0x76e..0x7f2 (ROM updater at 0x0d0a0).
  // For tiles 0..20, word +0 steps through 0x9ab4..0x9ad2 (exact height delta 0..30 arcade units;
  // stays at 0x9ab4 = 0 until the marble approaches via the middle walkway).
  // For end-cap tile 21, word +4 (0x7f0) steps through 0x8f84..0x8fa2 (delta 0..30).
  const waveProfile = level3
    ? Array.from({ length: 22 }, (_, i) => {
        if (i < 21) {
          const w0 = word(0x76e + i * 6);
          return w0 >= 0x9ab4 && w0 <= 0x9ad2 ? (w0 - 0x9ab4) / 30 : 0;
        }
        const w2 = word(0x76e + 21 * 6 + 4);
        return w2 >= 0x8f84 && w2 <= 0x8fa2 ? (w2 - 0x8f84) / 30 : 0;
      })
    : undefined;
  const first = marbleAt(0, 0);
  const second = players === 2 ? marbleAt(0xe2, 1) : undefined;
  // Arcade stores the first finisher as a player index (0xff before arrival).
  const finisher = memory.getUint8(0x3a4 ^ 1);
  const goalOwner =
    mode === 0 && finisher < players ? (finisher === 0 ? 1 : 2) : undefined;
  const terrainPalette = readTerrainPalette(heap, previousPalette);
  const catapultFrame = level4 ? readLevel4CatapultFrame(memory) : undefined;
  return {
    ...first,
    ...(terrainPalette ? { terrainPalette } : {}),
    ...(frame ? { frame } : {}),
    ...(intermediate || level3 || level4 || level5 || level6
      ? {
          level: level6
            ? ('level6' as const)
            : level5
              ? ('level5' as const)
              : intermediate
                ? ('intermediate' as const)
                : level3
                  ? ('level3' as const)
                  : ('level4' as const),
          frame,
          ...(bridgeStep !== undefined ? { bridgeStep } : {}),
          ...(level6MazePhase !== undefined ? { level6MazePhase } : {}),
          ...(waveProfile ? { waveProfile } : {}),
          ...(level5
            ? { level5Actors: readLevel5Actors(memory) }
            : { actors: readIntermediateActors(memory) }),
          ...(level4
            ? {
                vacuumExtensions: readLevel4VacuumExtensions(memory),
                vacuumMouthFrames: readLevel4VacuumMouthFrames(memory),
                pistons: readLevel4Pistons(memory),
                hammerFrames: readLevel4HammerFrames(memory),
                ...(catapultFrame !== undefined ? { catapultFrame } : {}),
              }
            : {}),
        }
      : {}),
    ...(second ? { player2: second } : {}),
    ...(goalOwner ? { goalOwner } : {}),
    scroll,
    // The 68010 byte wraps once during the start countdown.
    ...(opening
      ? { opening: Math.min(1, ((memory.getUint8(0x15) - 0x42) & 0xff) / 251) }
      : {}),
    ...(startLift ? { startLift } : {}),
    ...(hud ? { hud } : {}),
  };
}

/** Distinguish native menus/results from the title countdown, without game writes. */
export function readModernPhase(
  heap: Uint8Array,
): 'loading' | 'level' | 'arcade' {
  if (heap.byteLength < PRACTICE_WORK_RAM + 0x478) return 'loading';
  const memory = new DataView(heap.buffer, heap.byteOffset + PRACTICE_WORK_RAM);
  const word = (offset: number) => memory.getUint16(offset, true);
  const mode = word(0x390);
  const descriptor = word(0x474) * 65536 + word(0x476);
  const supported =
    descriptor === practiceDescriptor ||
    descriptor === intermediateDescriptor ||
    descriptor === level3Descriptor ||
    descriptor === level4Descriptor ||
    descriptor === level5Descriptor ||
    descriptor === level6Descriptor;
  if (supported && (mode === 0 || mode === 3 || mode === 4 || mode === 5))
    return 'level';
  return 'arcade';
}
