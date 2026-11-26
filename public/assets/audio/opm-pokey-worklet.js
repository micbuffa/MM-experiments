// AudioWorkletProcessor driving the standalone Yamaha YM2151 (OPM) + Atari POKEY WASM core.
class OpmPokeyWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.exports = null;
    this.memory = null;
    this.leftOffset = 0;
    this.rightOffset = 0;
    this.muted = false;
    this.vgm = null;
    this.vgmIndex = 0;
    this.vgmWaitSamples = 0;
    // ROM-faithful SFX register streams: one stream per hardware slot
    // (0..7 = SFX YM2151 channels, 8..11 = SFX POKEY channels). Each stream is
    // { writes: Uint16Array [tick, chip, reg, val]*, index, elapsed, tickFrames }.
    this.sfxSlots = new Array(12).fill(null);

    this.port.onmessage = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'init' && msg.wasmBytes) {
        try {
          const { instance } = await WebAssembly.instantiate(msg.wasmBytes, {});
          this.exports = instance.exports;
          this.memory = instance.exports.memory;
          // Reactor-style standalone WASM: run C++ static constructors (ymfm).
          this.exports._initialize?.();
          this.exports.audio_init(sampleRate);
          this.leftOffset = this.exports.audio_left_ptr() >>> 2;
          this.rightOffset = this.exports.audio_right_ptr() >>> 2;
          this.port.postMessage({ type: 'ready' });
        } catch (err) {
          this.port.postMessage({ type: 'error', error: String(err) });
        }
      } else if (msg.type === 'opm' && this.exports) {
        this.exports.opm_write(msg.reg, msg.val);
      } else if (msg.type === 'pokey' && this.exports) {
        this.exports.pokey_write(msg.reg, msg.val);
      } else if (
        msg.type === 'batch' &&
        this.exports &&
        Array.isArray(msg.ops)
      ) {
        // op[0]: 0 = SFX YM2151, 1 = SFX POKEY, 2 = rolling POKEY.
        for (const op of msg.ops) {
          if (op[0] === 0) this.exports.opm_write(op[1], op[2]);
          else if (op[0] === 1) this.exports.pokey_write(op[1], op[2]);
          else this.exports.pokey_roll_write(op[1], op[2]);
        }
      } else if (msg.type === 'sfxStreams' && Array.isArray(msg.streams)) {
        const tickFrames = Number(msg.tickSeconds) * sampleRate;
        for (const s of msg.streams) {
          if (!(s.writes instanceof Uint16Array)) continue;
          const slot = s.slot | 0;
          if (slot < 0 || slot >= this.sfxSlots.length) continue;
          this.sfxSlots[slot] = {
            writes: s.writes,
            index: 0,
            elapsed: 0,
            tickFrames,
          };
        }
      } else if (msg.type === 'sfxStop' && Array.isArray(msg.slots)) {
        for (const slot of msg.slots) this.silenceSfxSlot(slot | 0);
      } else if (msg.type === 'vgm') {
        this.exports?.audio_reset_music?.();
        this.vgm = msg.vgm;
        this.vgmIndex = 0;
        this.vgmWaitSamples = 0;
      } else if (msg.type === 'mute') {
        this.muted = Boolean(msg.muted);
      } else if (msg.type === 'mix' && this.exports?.audio_set_mix) {
        this.exports.audio_set_mix(
          Number(msg.music ?? 0.75),
          Number(msg.sfx ?? 1.0),
        );
      }
    };
  }

  silenceSfxSlot(slot) {
    if (slot < 0 || slot >= this.sfxSlots.length) return;
    this.sfxSlots[slot] = null;
    if (!this.exports) return;
    if (slot < 8) this.exports.opm_write(0x08, slot);
    else this.exports.pokey_write(((slot - 8) << 1) | 1, 0);
  }

  stepSfx(frames) {
    if (!this.exports) return;
    for (let slot = 0; slot < this.sfxSlots.length; slot++) {
      const s = this.sfxSlots[slot];
      if (!s) continue;
      const w = s.writes;
      while (s.index < w.length && w[s.index] * s.tickFrames <= s.elapsed) {
        if (w[s.index + 1] === 0)
          this.exports.opm_write(w[s.index + 2], w[s.index + 3]);
        else this.exports.pokey_write(w[s.index + 2], w[s.index + 3]);
        s.index += 4;
      }
      s.elapsed += frames;
      if (s.index >= w.length) this.sfxSlots[slot] = null;
    }
  }

  stepVgm(frames) {
    if (!this.vgm || !this.exports) return;
    // VGM wait ticks are at 44100 Hz.
    let remaining = (frames * 44100) / sampleRate;
    const cmds = this.vgm.commands;
    let safety = 0;
    while (remaining > 0 && safety++ < 2048) {
      if (this.vgmWaitSamples > 0) {
        const take = Math.min(remaining, this.vgmWaitSamples);
        this.vgmWaitSamples -= take;
        remaining -= take;
        if (this.vgmWaitSamples > 0) break;
      }
      if (this.vgmIndex >= cmds.length) {
        if (this.vgm.loopCommandIndex !== null) {
          this.vgmIndex = this.vgm.loopCommandIndex;
        } else {
          this.vgm = null;
          break;
        }
      }
      const cmd = cmds[this.vgmIndex++];
      if (cmd.type === 'opm') this.exports.opm_music_write(cmd.reg, cmd.val);
      else if (cmd.type === 'pokey')
        this.exports.pokey_music_write(cmd.reg, cmd.val);
      else if (cmd.type === 'wait') this.vgmWaitSamples += cmd.samples;
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const left = out[0];
    const right = out[1] || out[0];
    const frames = left.length;

    if (!this.exports || !this.memory || this.muted) {
      left.fill(0);
      if (right !== left) right.fill(0);
      return true;
    }

    this.stepVgm(frames);
    this.stepSfx(frames);
    this.exports.audio_render(frames);
    const heap = new Float32Array(this.memory.buffer);
    left.set(heap.subarray(this.leftOffset, this.leftOffset + frames));
    if (right !== left) {
      right.set(heap.subarray(this.rightOffset, this.rightOffset + frames));
    }
    return true;
  }
}

registerProcessor('opm-pokey-worklet', OpmPokeyWorklet);
