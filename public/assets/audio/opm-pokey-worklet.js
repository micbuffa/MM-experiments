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
    this.sfxVgm = null;
    this.sfxVgmIndex = 0;
    this.sfxVgmWaitSamples = 0;

    this.port.onmessage = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'init' && msg.wasmBytes) {
        try {
          const wasiStub = {
            wasi_snapshot_preview1: {
              fd_close: () => 0,
              fd_write: () => 0,
              fd_seek: () => 0,
              proc_exit: () => {},
            },
          };
          const { instance } = await WebAssembly.instantiate(
            msg.wasmBytes,
            wasiStub,
          );
          this.exports = instance.exports;
          this.memory = instance.exports.memory;
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
        for (const op of msg.ops) {
          if (op[0] === 0) this.exports.opm_write(op[1], op[2]);
          else this.exports.pokey_write(op[1], op[2]);
        }
      } else if (msg.type === 'vgm') {
        this.exports?.audio_reset_music?.();
        this.vgm = msg.vgm;
        this.vgmIndex = 0;
        this.vgmWaitSamples = 0;
      } else if (msg.type === 'sfxVgm') {
        this.silenceSfxChannels();
        this.sfxVgm = msg.vgm;
        this.sfxVgmIndex = 0;
        this.sfxVgmWaitSamples = 0;
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

  silenceSfxChannels() {
    if (!this.exports) return;
    // Key-off all 8 SFX YM2151 channels and silence SFX POKEY ch 1..3
    // (leaving POKEY ch 0 rolling noise untouched) so no SFX note ever hangs.
    for (let ch = 0; ch < 8; ch++) {
      this.exports.opm_write(0x08, ch);
    }
    this.exports.pokey_write(0x03, 0x00);
    this.exports.pokey_write(0x05, 0x00);
    this.exports.pokey_write(0x07, 0x00);
  }

  stepSfxVgm(frames) {
    if (!this.sfxVgm || !this.exports) return;
    let remaining = (frames * 44100) / sampleRate;
    const cmds = this.sfxVgm.commands;
    let safety = 0;
    while (remaining > 0 && safety++ < 2048) {
      if (this.sfxVgmWaitSamples > 0) {
        const take = Math.min(remaining, this.sfxVgmWaitSamples);
        this.sfxVgmWaitSamples -= take;
        remaining -= take;
        if (this.sfxVgmWaitSamples > 0) break;
      }
      if (this.sfxVgmIndex >= cmds.length) {
        this.sfxVgm = null;
        this.silenceSfxChannels();
        break;
      }
      const cmd = cmds[this.sfxVgmIndex++];
      if (cmd.type === 'opm') this.exports.opm_write(cmd.reg, cmd.val);
      else if (cmd.type === 'pokey') this.exports.pokey_write(cmd.reg, cmd.val);
      else if (cmd.type === 'wait') this.sfxVgmWaitSamples += cmd.samples;
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

    // Render in 16-sample (~0.33 ms) sub-blocks so fast VGM keyOn/keyOff pairs
    // and SFX pitch steps are never eaten or jittered across a 128-sample quantum.
    const heap = new Float32Array(this.memory.buffer);
    let offset = 0;
    while (offset < frames) {
      const chunk = Math.min(16, frames - offset);
      this.stepVgm(chunk);
      this.stepSfxVgm(chunk);
      this.exports.audio_render(chunk);
      left.set(heap.subarray(this.leftOffset, this.leftOffset + chunk), offset);
      if (right !== left) {
        right.set(
          heap.subarray(this.rightOffset, this.rightOffset + chunk),
          offset,
        );
      }
      offset += chunk;
    }
    return true;
  }
}

registerProcessor('opm-pokey-worklet', OpmPokeyWorklet);
