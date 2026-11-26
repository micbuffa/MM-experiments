/**
 * Backend-agnostic gameplay sound cues (layer a).
 *
 * Game code only emits `RemasterEvent`s. This module turns them into named
 * sound cues with priority, cooldown and an intensity parameter, without any
 * knowledge of how a cue is rendered. A playback backend (the ROM-faithful
 * YM2151/POKEY backend today, a WebAssembly-music backend later) implements
 * `SoundCueBackend` and decides what each cue sounds like.
 */
import type { RemasterEvent } from '../engine/remasterSimulation';

export const SOUND_CUE_IDS = [
  'race.start',
  'marble.wallBump',
  'marble.marbleBump',
  'marble.enemyMarbleBump',
  'marble.airborne',
  'marble.landing',
  'marble.shatter',
  'marble.broomSweep',
  'marble.dazed',
  'marble.lostOffEdge',
  'marble.lost',
  'marble.vacuumCapture',
  'marble.eaten',
  'marble.birdGrab',
  'marble.acidMelt',
  'marble.respawn',
  'marble.onIce',
  'pipe.enter',
  'pipe.exit',
  'goal.arrive',
  'timer.lowTimeTick',
  'race.catchUp',
  'race.gameOver',
  'bonus.extraTime',
  'bonus.squashMiniature',
  'level.pistonNear',
  'level.pistonFar',
  'level.vacuumHum',
  'level.actorBounce',
] as const;

export type SoundCueId = (typeof SOUND_CUE_IDS)[number];

export interface SoundCueTrigger {
  readonly cue: SoundCueId;
  /** Player the cue belongs to (null for global cues). */
  readonly player: 1 | 2 | null;
  /** Normalized strength 0..1 (impact speed, closing speed, ...); 1 for binary events. */
  readonly intensity: number;
}

export interface SoundCueRule {
  /** Relative importance when a backend must drop or steal voices (higher wins). */
  readonly priority: number;
  /** Minimum seconds between two accepted triggers (per player when `perPlayer`). */
  readonly cooldownSeconds: number;
  readonly perPlayer: boolean;
  /** Triggers below this intensity are ignored (e.g. micro-bumps). */
  readonly minIntensity: number;
  /** Cues stopped when this cue fires (e.g. landing ends the falling sound). */
  readonly stops?: readonly SoundCueId[];
  /**
   * Name of the `RemasterEvent` that drives the cue, or a TODO hook naming the
   * event a future level must emit (Level 2+ content is not on this branch yet).
   */
  readonly trigger: string;
}

function rule(
  priority: number,
  cooldownSeconds: number,
  perPlayer: boolean,
  trigger: string,
  extra: Partial<Pick<SoundCueRule, 'minIntensity' | 'stops'>> = {},
): SoundCueRule {
  return {
    priority,
    cooldownSeconds,
    perPlayer,
    minIntensity: extra.minIntensity ?? 0,
    trigger,
    ...(extra.stops ? { stops: extra.stops } : {}),
  };
}

/**
 * Default cue rules. Priorities follow the relative order of the original
 * sound-driver track priorities (docs/ROM_SFX.md) so any backend arbitrates
 * like the arcade; cooldowns keep physics jitter from machine-gunning a cue.
 */
export const DEFAULT_SOUND_CUE_RULES: Readonly<
  Record<SoundCueId, SoundCueRule>
> = {
  'race.start': rule(6, 0, false, "event 'start'"),
  'marble.wallBump': rule(9, 0.12, true, "event 'bump' (target 'wall')", {
    minIntensity: 0.05,
  }),
  'marble.marbleBump': rule(7, 0.12, false, "event 'bump' (target 'marble')", {
    minIntensity: 0.05,
  }),
  'marble.enemyMarbleBump': rule(
    9,
    0.12,
    false,
    "TODO: 'bump' with an enemy-marble target (black marble / steelie, Level 2+)",
  ),
  'marble.airborne': rule(9, 0.4, true, "event 'airborne'"),
  'marble.landing': rule(8, 0.1, true, "events 'land' and 'shatter'", {
    stops: ['marble.airborne'],
  }),
  'marble.shatter': rule(9, 0.5, true, "event 'shatter'", {
    stops: ['marble.airborne'],
  }),
  'marble.broomSweep': rule(
    8,
    0.5,
    true,
    'TODO: broom sweep animation frame (arcade: shatter animation frame 9)',
  ),
  'marble.dazed': rule(
    5,
    0.5,
    true,
    'TODO: dazed state after a medium-height landing (arcade 0x25C74)',
  ),
  'marble.lostOffEdge': rule(11, 0.5, true, "event 'fall'", {
    stops: ['marble.airborne'],
  }),
  'marble.lost': rule(11, 0.5, true, 'TODO: generic marble removal'),
  'marble.vacuumCapture': rule(
    11,
    0.5,
    true,
    'TODO: Level 4 vacuum capture event',
    { stops: ['level.vacuumHum'] },
  ),
  'marble.eaten': rule(11, 0.5, true, 'TODO: enemy grab event (Levels 2/3/6)'),
  'marble.birdGrab': rule(11, 0.5, true, 'TODO: Level 5 bird grab event'),
  'marble.acidMelt': rule(
    11,
    0.5,
    true,
    'TODO: acid contact event (Level 2+)',
    {
      stops: ['marble.airborne'],
    },
  ),
  'marble.respawn': rule(5, 0.3, true, "event 'respawn'"),
  'marble.onIce': rule(
    6,
    0.3,
    true,
    "TODO: surface enter/leave events for 'ice' cells (Level 2/6); stop the cue on leaving",
  ),
  'pipe.enter': rule(10, 0.3, true, 'TODO: pipe entry event (Levels 2/3/5)', {
    stops: ['marble.airborne'],
  }),
  'pipe.exit': rule(10, 0.3, true, 'TODO: pipe exit event (Levels 2/3/5)'),
  'goal.arrive': rule(13, 0, true, "event 'goal'"),
  'timer.lowTimeTick': rule(9, 0.5, false, "event 'countdownTick'"),
  'race.catchUp': rule(11, 0.5, true, "event 'catchUp'"),
  'race.gameOver': rule(14, 0, false, "event 'gameOver'"),
  'bonus.extraTime': rule(
    12,
    0,
    false,
    'TODO: magic wand / secret time-bonus event (Level 2)',
  ),
  'bonus.squashMiniature': rule(
    9,
    0.1,
    true,
    'TODO: Level 5 miniature squash event',
  ),
  'level.pistonNear': rule(7, 0.05, false, 'TODO: Level 4 piston pop-up event'),
  'level.pistonFar': rule(7, 0.05, false, 'TODO: Level 4 piston pop-up event'),
  'level.vacuumHum': rule(
    7,
    0.5,
    false,
    'TODO: Level 4 vacuum section enter / leave events',
  ),
  'level.actorBounce': rule(
    12,
    0.12,
    true,
    'TODO: bounce off a solid level actor (hammers, blocks)',
  ),
};

/** Maps one simulation event to the cues it triggers (backend-agnostic). */
export function cuesForEvent(event: RemasterEvent): SoundCueTrigger[] {
  switch (event.type) {
    case 'start':
      return [{ cue: 'race.start', player: null, intensity: 1 }];
    case 'bump':
      return [
        {
          cue:
            event.target === 'wall' ? 'marble.wallBump' : 'marble.marbleBump',
          player: event.player,
          intensity: event.intensity,
        },
      ];
    case 'airborne':
      return [{ cue: 'marble.airborne', player: event.player, intensity: 1 }];
    case 'land':
      return [
        {
          cue: 'marble.landing',
          player: event.player,
          intensity: event.intensity,
        },
      ];
    case 'shatter':
      // Arcade 0x121B8: the landing thud (0x5D) precedes the shatter (0x38).
      return [
        { cue: 'marble.landing', player: event.player, intensity: 1 },
        { cue: 'marble.shatter', player: event.player, intensity: 1 },
      ];
    case 'fall':
      return [
        { cue: 'marble.lostOffEdge', player: event.player, intensity: 1 },
      ];
    case 'respawn':
      return [{ cue: 'marble.respawn', player: event.player, intensity: 1 }];
    case 'catchUp':
      return [{ cue: 'race.catchUp', player: event.player, intensity: 1 }];
    case 'goal':
      return [{ cue: 'goal.arrive', player: event.player, intensity: 1 }];
    case 'countdownTick':
      return [{ cue: 'timer.lowTimeTick', player: null, intensity: 1 }];
    case 'gameOver':
      return [{ cue: 'race.gameOver', player: null, intensity: 1 }];
    case 'impact':
      // Landing sounds come from 'land' (after a real drop) and 'shatter'.
      return [];
  }
}

/** Rendering side of the seam: anything that can make a cue audible. */
export interface SoundCueBackend {
  playCue(trigger: SoundCueTrigger, rule: SoundCueRule): void;
  stopCue(cue: SoundCueId, player: 1 | 2 | null): void;
  stopAll(): void;
}

export interface SoundCueDispatcher {
  /** Filters triggers through intensity floors and cooldowns; returns the accepted ones. */
  dispatch(
    triggers: readonly SoundCueTrigger[],
    nowSeconds: number,
  ): SoundCueTrigger[];
  /** Convenience: map events, filter, and forward to the backend (stops first). */
  handleEvents(events: readonly RemasterEvent[], nowSeconds: number): void;
  reset(): void;
}

export function createSoundCueDispatcher(
  backend: SoundCueBackend,
  rules: Readonly<Record<SoundCueId, SoundCueRule>> = DEFAULT_SOUND_CUE_RULES,
): SoundCueDispatcher {
  const lastFired = new Map<string, number>();

  function keyOf(t: SoundCueTrigger, rule: SoundCueRule): string {
    return rule.perPlayer ? `${t.cue}#${t.player ?? 0}` : t.cue;
  }

  function dispatch(
    triggers: readonly SoundCueTrigger[],
    nowSeconds: number,
  ): SoundCueTrigger[] {
    const accepted: SoundCueTrigger[] = [];
    for (const t of triggers) {
      const rule = rules[t.cue];
      if (t.intensity < rule.minIntensity) continue;
      const key = keyOf(t, rule);
      const last = lastFired.get(key);
      if (last !== undefined && nowSeconds - last < rule.cooldownSeconds) {
        continue;
      }
      lastFired.set(key, nowSeconds);
      accepted.push(t);
    }
    // Highest priority first so a voice-limited backend keeps what matters.
    return accepted.sort(
      (a, b) => rules[b.cue].priority - rules[a.cue].priority,
    );
  }

  return {
    dispatch,
    handleEvents(events, nowSeconds) {
      const triggers: SoundCueTrigger[] = [];
      for (const ev of events) triggers.push(...cuesForEvent(ev));
      for (const t of dispatch(triggers, nowSeconds)) {
        const rule = rules[t.cue];
        for (const stopped of rule.stops ?? [])
          backend.stopCue(stopped, t.player);
        backend.playCue(t, rule);
      }
    },
    reset() {
      lastFired.clear();
    },
  };
}
