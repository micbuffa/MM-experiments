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

    this.port.onmessage = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'init' && msg.wasmBytes) {
        try {
          const { instance } = await WebAssembly.instantiate(msg.wasmBytes, {});
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
      if (cmd.type === 'opm') this.exports.opm_write(cmd.reg, cmd.val);
      else if (cmd.type === 'pokey') this.exports.pokey_write(cmd.reg, cmd.val);
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
