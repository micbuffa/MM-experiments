/**
 * Stereo TFMX / Amiga ProTracker-inspired WebAudio synthesizer
 * (original placeholder soundtracks for the Amiga Attract Mode, 3D Showcase & Victory screen,
 * designed to be swapped out cleanly by Peter Salomonsen's WebAssembly Music compositions).
 *
 * Audio engine features:
 * - Warm Paula-style stereo bus + musical dotted-eighth ping-pong delay + soft master compressor
 * - CH1: Heroic detuned dual-oscillator synth-brass/lead with resonant filter envelope & vibrato
 * - CH2: Shimmering stereo arpeggio + warm filtered string pad chords
 * - CH3: Punchy filtered synth-bass with sub-octave body
 * - CH4: Crisp 1990 Amiga-style drums (kick + click, gated snare, accented hi-hats, tom fills)
 */

export type AmigaTrackerTrack = 'demo' | 'showcase' | 'victory';

export interface AmigaTrackerController {
  attachContext(ctx: AudioContext): void;
  play(track: AmigaTrackerTrack): void;
  stop(): void;
  setVolume(gain: number): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

interface TrackerPattern {
  readonly bpm: number;
  readonly lead: readonly (number | null)[];
  readonly leadLen?: readonly number[]; // duration in 16th steps (default 2)
  readonly bass: readonly (number | null)[];
  readonly chords: readonly (readonly [number, number, number])[];
  // 0=rest, 1=kick, 2=snare, 3=closed hat, 4=open hat, 5=tom high, 6=tom low
  readonly drums: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 64-step (4-bar A+B) Epic Turrican / TFMX-inspired Amiga Demoscene theme (D minor, 130 BPM)
// Progression: Dm -> Bb -> C -> A7 | Dm -> Bb -> C -> Dm
const DEMO_PATTERN: TrackerPattern = {
  bpm: 130,
  lead: [
    // Phrase A (bars 1-2): heroic soaring melody
    74,
    null,
    null,
    77,
    81,
    null,
    79,
    77,
    74,
    null,
    72,
    74,
    77,
    null,
    null,
    null,
    70,
    null,
    null,
    74,
    77,
    null,
    76,
    74,
    72,
    null,
    74,
    76,
    79,
    null,
    76,
    null,
    // Phrase B (bars 3-4): higher climax + dramatic turnaround
    81,
    null,
    null,
    84,
    86,
    null,
    84,
    81,
    79,
    null,
    77,
    79,
    81,
    null,
    null,
    null,
    77,
    null,
    79,
    81,
    79,
    null,
    76,
    72,
    74,
    null,
    77,
    81,
    74,
    null,
    null,
    null,
  ],
  bass: [
    // Dm (driving 16th octave groove)
    38, 50, 38, 38, 50, 38, 41, 45, 38, 50, 38, 38, 45, 43, 41, 40,
    // Bb -> C -> A7
    34, 46, 34, 34, 46, 34, 38, 41, 36, 48, 36, 36, 33, 45, 37, 40,
    // Dm -> Bb
    38, 50, 38, 38, 50, 38, 41, 45, 34, 46, 34, 34, 46, 34, 38, 41,
    // C -> Dm
    36, 48, 36, 36, 48, 36, 40, 43, 38, 50, 38, 41, 45, 50, 45, 38,
  ],
  // 1 chord per 8 steps (half-bar)
  chords: [
    [62, 65, 69], // Dm
    [62, 65, 69], // Dm
    [58, 62, 65], // Bb
    [60, 64, 67], // C -> A
    [62, 65, 69], // Dm
    [58, 62, 65], // Bb
    [60, 64, 67], // C
    [62, 65, 69], // Dm
  ],
  drums: [
    1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3, 4, 3, 1, 3, 3, 3, 2, 3, 1, 3, 1,
    3, 1, 3, 2, 5, 6, 2, 1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3, 4, 3, 1, 3,
    3, 3, 2, 3, 1, 3, 1, 3, 2, 5, 5, 6, 6, 2,
  ],
};

// Cosmic 122 BPM Amiga Showcase theme (A minor -> F -> G -> E, 32-step loop)
// for the neon grid, stepped cube pedestal & 3 orbiting marbles screen.
const SHOWCASE_PATTERN: TrackerPattern = {
  bpm: 122,
  lead: [
    69,
    null,
    72,
    76,
    81,
    null,
    79,
    76,
    77,
    null,
    76,
    72,
    74,
    null,
    null,
    null,
    76,
    null,
    79,
    81,
    83,
    null,
    81,
    79,
    76,
    null,
    74,
    72,
    71,
    null,
    76,
    null,
  ],
  bass: [
    45, 57, 45, 45, 57, 45, 48, 52, 41, 53, 41, 41, 53, 41, 45, 48, 43, 55, 43,
    43, 55, 43, 47, 50, 40, 52, 40, 44, 47, 52, 47, 44,
  ],
  chords: [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [55, 59, 62], // G
    [52, 56, 59], // E
  ],
  drums: [
    1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 3, 3, 2, 3, 4, 3, 1, 3, 3, 3, 2, 3, 1, 3, 1,
    3, 2, 3, 5, 6, 2, 3,
  ],
};

// Uplifting 128 BPM Amiga Victory / Hall of Fame theme (C major -> G -> Am -> F, 32-step loop)
const VICTORY_PATTERN: TrackerPattern = {
  bpm: 128,
  lead: [
    72,
    null,
    76,
    79,
    84,
    null,
    83,
    79,
    79,
    null,
    76,
    74,
    76,
    null,
    null,
    null,
    81,
    null,
    84,
    81,
    79,
    null,
    76,
    72,
    74,
    76,
    79,
    null,
    84,
    null,
    null,
    null,
  ],
  bass: [
    48, 60, 48, 48, 60, 48, 52, 55, 43, 55, 43, 43, 55, 47, 50, 55, 45, 57, 45,
    45, 57, 45, 48, 52, 41, 53, 41, 41, 43, 55, 47, 50,
  ],
  chords: [
    [60, 64, 67], // C
    [55, 59, 62], // G
    [57, 60, 64], // Am
    [53, 57, 60], // F
  ],
  drums: [
    1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3, 4, 3, 1, 3, 3, 3, 2, 3, 1, 3, 1,
    3, 2, 5, 6, 2, 4, 3,
  ],
};

export function createAmigaTrackerMusic(): AmigaTrackerController {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let dryBus: GainNode | null = null;
  let delayNode: DelayNode | null = null;
  let delayFeedback: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let activeTrack: AmigaTrackerTrack | null = null;
  let timerId: number | undefined;
  let nextStepTime = 0;
  let stepIndex = 0;
  let volume = 0.75;
  let muted = false;
  let disposed = false;

  function syncGain() {
    if (!masterGain || !ctx) return;
    const target = muted ? 0 : Math.max(0, Math.min(1.5, volume)) * 0.3;
    masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.03);
  }

  function ensureGraph(audioCtx: AudioContext) {
    if (ctx === audioCtx && masterGain) return;
    ctx = audioCtx;

    // Master chain: dry + filtered echo -> soft compressor -> Paula 6.2kHz warmth -> destination
    masterGain = audioCtx.createGain();
    dryBus = audioCtx.createGain();
    dryBus.gain.value = 1.0;

    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.14;

    const paulaFilter = audioCtx.createBiquadFilter();
    paulaFilter.type = 'lowpass';
    paulaFilter.frequency.value = 6400;
    paulaFilter.Q.value = 0.6;

    // Musical dotted-eighth stereo-style echo send (classic TFMX spatial sheen)
    delayNode = audioCtx.createDelay(1.0);
    delayNode.delayTime.value = 0.346; // ~3 sixteenths at 130 BPM
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = 0.27;
    const delayTone = audioCtx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2600;
    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0.28;

    dryBus.connect(compressor);
    dryBus.connect(delayNode);
    delayNode.connect(delayTone);
    delayTone.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayTone.connect(wetGain);
    wetGain.connect(compressor);

    compressor.connect(paulaFilter);
    paulaFilter.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    syncGain();

    // Pre-generate 0.3s crisp noise buffer for snare & hi-hats
    const len = Math.floor(audioCtx.sampleRate * 0.3);
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let held = 0;
    for (let i = 0; i < len; i++) {
      if (i % 2 === 0) held = Math.random() * 2 - 1;
      data[i] = held;
    }
  }

  /** Heroic Turrican / TFMX dual-osc synth-brass lead with filter sweep & vibrato */
  function scheduleHeroLead(when: number, duration: number, midi: number) {
    if (!ctx || !dryBus) return;
    const freq = midiToHz(midi);
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'square';
    oscA.frequency.setValueAtTime(freq, when);
    oscB.frequency.setValueAtTime(freq, when);
    oscA.detune.setValueAtTime(-7, when);
    oscB.detune.setValueAtTime(7, when);

    // Expressive vibrato LFO that blooms smoothly on sustained notes
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.6;
    lfoGain.gain.setValueAtTime(0, when);
    lfoGain.gain.linearRampToValueAtTime(11, when + Math.min(0.14, duration));
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.detune);
    lfoGain.connect(oscB.detune);

    // Resonant low-pass brass filter envelope
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(3800, when);
    filter.frequency.exponentialRampToValueAtTime(
      1150,
      when + Math.max(0.08, duration * 0.85),
    );

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.24, when + 0.014);
    env.gain.setValueAtTime(0.21, when + Math.max(0.02, duration * 0.72));
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = -0.18;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(env);
    if (pan) {
      env.connect(pan);
      pan.connect(dryBus);
    } else {
      env.connect(dryBus);
    }

    oscA.start(when);
    oscB.start(when);
    lfo.start(when);
    oscA.stop(when + duration + 0.02);
    oscB.stop(when + duration + 0.02);
    lfo.stop(when + duration + 0.02);
  }

  /** Punchy TFMX synth-bass with resonant filter pluck + sub-triangle body */
  function scheduleSynthBass(when: number, duration: number, midi: number) {
    if (!ctx || !dryBus) return;
    const freq = midiToHz(midi);
    const saw = ctx.createOscillator();
    const sub = ctx.createOscillator();
    saw.type = 'sawtooth';
    sub.type = 'triangle';
    saw.frequency.setValueAtTime(freq, when);
    sub.frequency.setValueAtTime(freq * 0.5, when);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.4;
    filter.frequency.setValueAtTime(1650, when);
    filter.frequency.exponentialRampToValueAtTime(240, when + 0.095);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.36, when + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    saw.connect(filter);
    sub.connect(filter);
    filter.connect(env);
    env.connect(dryBus);

    saw.start(when);
    sub.start(when);
    saw.stop(when + duration + 0.015);
    sub.stop(when + duration + 0.015);
  }

  /** Warm Amiga string pad sustained across each chord change */
  function schedulePadChord(
    when: number,
    duration: number,
    chord: readonly [number, number, number],
  ) {
    if (!ctx || !dryBus) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1350;
    filter.Q.value = 0.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.11, when + 0.09);
    env.gain.setValueAtTime(0.1, when + Math.max(0.12, duration - 0.12));
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    filter.connect(env);
    env.connect(dryBus);

    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToHz(chord[i]!), when);
      osc.detune.setValueAtTime((i - 1) * 6, when);
      osc.connect(filter);
      osc.start(when);
      osc.stop(when + duration + 0.02);
    }
  }

  /** Sparkling stereo Amiga arpeggio bell/pluck */
  function scheduleArpNote(when: number, duration: number, midi: number) {
    if (!ctx || !dryBus) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(midiToHz(midi + 12), when);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.13, when + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = 0.28;

    osc.connect(filter);
    filter.connect(env);
    if (pan) {
      env.connect(pan);
      pan.connect(dryBus);
    } else {
      env.connect(dryBus);
    }
    osc.start(when);
    osc.stop(when + duration + 0.015);
  }

  function scheduleDrum(when: number, kind: 1 | 2 | 3 | 4 | 5 | 6) {
    if (!ctx || !dryBus) return;
    if (kind === 1) {
      // Deep punchy Amiga kick + crisp beater click
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, when);
      osc.frequency.exponentialRampToValueAtTime(40, when + 0.095);
      env.gain.setValueAtTime(0.62, when);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
      osc.connect(env);
      env.connect(dryBus);
      osc.start(when);
      osc.stop(when + 0.17);
    } else if (kind === 5 || kind === 6) {
      // Amiga synth tom fill (high / low)
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const startHz = kind === 5 ? 240 : 165;
      osc.frequency.setValueAtTime(startHz, when);
      osc.frequency.exponentialRampToValueAtTime(startHz * 0.45, when + 0.12);
      env.gain.setValueAtTime(0.42, when);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
      osc.connect(env);
      env.connect(dryBus);
      osc.start(when);
      osc.stop(when + 0.16);
    } else if (noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      if (kind === 2) {
        // Gated Amiga snare: punchy body + crisp bright snap
        filter.type = 'bandpass';
        filter.frequency.value = 2100;
        filter.Q.value = 0.7;
        env.gain.setValueAtTime(0.38, when);
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
        const body = ctx.createOscillator();
        const bEnv = ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(215, when);
        body.frequency.exponentialRampToValueAtTime(115, when + 0.07);
        bEnv.gain.setValueAtTime(0.32, when);
        bEnv.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
        body.connect(bEnv);
        bEnv.connect(dryBus);
        body.start(when);
        body.stop(when + 0.1);
      } else {
        // Closed (3) or Open (4) hi-hat
        filter.type = 'highpass';
        filter.frequency.value = 6800;
        const dur = kind === 4 ? 0.13 : 0.04;
        env.gain.setValueAtTime(kind === 4 ? 0.16 : 0.11, when);
        env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      }
      src.connect(filter);
      filter.connect(env);
      env.connect(dryBus);
      src.start(when);
      src.stop(when + (kind === 2 ? 0.18 : kind === 4 ? 0.15 : 0.05));
    }
  }

  function scheduleStep(pattern: TrackerPattern, step: number, when: number) {
    const stepDur = 60 / pattern.bpm / 4; // 16th note
    const len = pattern.lead.length;
    const idx = step % len;

    // CH1: Heroic Lead (compute sustain length until next note)
    const leadNote = pattern.lead[idx];
    if (leadNote !== null && leadNote !== undefined) {
      let holdSteps = 1;
      while (holdSteps < 4 && pattern.lead[(idx + holdSteps) % len] === null) {
        holdSteps++;
      }
      scheduleHeroLead(when, stepDur * (holdSteps + 0.35), leadNote);
    }

    // CH2: Warm String Pad every 8 steps + Sparkling Arpeggio every 16th
    const chordBlock = Math.floor(idx / 8) % pattern.chords.length;
    const chord = pattern.chords[chordBlock] ?? pattern.chords[0]!;
    if (idx % 8 === 0) {
      schedulePadChord(when, stepDur * 7.8, chord);
    }
    const arpMidi = chord[step % 3]!;
    scheduleArpNote(when, stepDur * 0.85, arpMidi);

    // CH3: Punchy Filtered Synth Bass
    const bassNote = pattern.bass[idx];
    if (bassNote !== null && bassNote !== undefined) {
      scheduleSynthBass(when, stepDur * 0.94, bassNote);
    }

    // CH4: Amiga Drums
    const drum = pattern.drums[idx] ?? 0;
    if (drum !== 0) {
      scheduleDrum(when, drum);
    }
  }

  function tickScheduler() {
    if (!ctx || !activeTrack || disposed) return;
    if (ctx.state !== 'running') return;
    const pattern =
      activeTrack === 'victory'
        ? VICTORY_PATTERN
        : activeTrack === 'showcase'
          ? SHOWCASE_PATTERN
          : DEMO_PATTERN;
    const stepDur = 60 / pattern.bpm / 4;
    if (delayNode) {
      delayNode.delayTime.setTargetAtTime(stepDur * 3, ctx.currentTime, 0.05);
    }
    const lookAhead = 0.14;
    if (nextStepTime < ctx.currentTime - 0.1) {
      nextStepTime = ctx.currentTime + 0.02;
    }
    while (nextStepTime < ctx.currentTime + lookAhead) {
      scheduleStep(pattern, stepIndex, nextStepTime);
      nextStepTime += stepDur;
      stepIndex = (stepIndex + 1) % pattern.lead.length;
    }
  }

  function startLoop() {
    if (timerId !== undefined) return;
    timerId = window.setInterval(tickScheduler, 35);
    tickScheduler();
  }

  function stopLoop() {
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      timerId = undefined;
    }
  }

  return {
    attachContext(audioCtx: AudioContext) {
      if (disposed) return;
      ensureGraph(audioCtx);
      if (activeTrack) {
        nextStepTime = audioCtx.currentTime + 0.03;
        startLoop();
      }
    },

    play(track: AmigaTrackerTrack) {
      if (disposed) return;
      if (activeTrack === track && timerId !== undefined) return;
      activeTrack = track;
      stepIndex = 0;
      if (ctx) {
        nextStepTime = ctx.currentTime + 0.03;
        startLoop();
      }
    },

    stop() {
      activeTrack = null;
      stopLoop();
    },

    setVolume(gain: number) {
      volume = gain;
      syncGain();
    },

    setMuted(value: boolean) {
      muted = value;
      syncGain();
    },

    dispose() {
      disposed = true;
      activeTrack = null;
      stopLoop();
      masterGain?.disconnect();
      masterGain = null;
      dryBus = null;
      delayNode = null;
      delayFeedback = null;
      ctx = null;
    },
  };
}
