// Autonomous Yamaha YM2151 (OPM) 8-channel 4-operator FM + Atari POKEY 4-channel
// polynomial-counter audio engine compiled to standalone WASM for AudioWorklet.
// 100% original clean-room implementation, register-compatible with YM2151 VGM streams.

#include <cmath>
#include <cstdint>
#include <cstring>

namespace {

constexpr float kTwoPi = 6.28318530717958647692f;
constexpr float kDefaultSampleRate = 48000.0f;

// Standard YM2151 KC note-code to semitone offset table (skipping unused 3,7,11,15).
constexpr int8_t kNoteTable[16] = {
    0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 8, 9, 10, 11, 11};

struct FmOperator {
  float phase = 0.0f;
  float phaseInc = 0.0f;
  float env = 0.0f;
  uint8_t envState = 0; // 0=off, 1=attack, 2=decay, 3=sustain, 4=release
  uint8_t mul = 1;
  uint8_t dt1 = 0;
  uint8_t tl = 127;     // Total Level (0=loudest, 127=silent)
  uint8_t ar = 31;      // Attack Rate (0..31)
  uint8_t d1r = 0;      // Decay 1 Rate
  uint8_t d1l = 0;      // Sustain Level (0..15)
  uint8_t d2r = 0;      // Decay 2 Rate
  uint8_t rr = 15;      // Release Rate (0..15)
  float prevOut = 0.0f; // For operator 0 self-feedback

  float totalLevelGain() const {
    if (tl >= 127) return 0.0f;
    // YM2151 attenuation is 0.75 dB per TL step.
    return std::pow(10.0f, -0.75f * static_cast<float>(tl) / 20.0f);
  }

  float sustainLevel() const {
    if (d1l >= 15) return 0.0f;
    return std::pow(10.0f, -3.0f * static_cast<float>(d1l) / 20.0f);
  }

  void keyOn() {
    phase = 0.0f;
    envState = 1;
    if (ar >= 31) {
      env = 1.0f;
      envState = 2;
    }
  }

  void keyOff() {
    if (envState != 0) envState = 4;
  }

  void stepEnv(float sampleRate) {
    if (envState == 0) return;
    if (envState == 1) {
      const float rate =
          (ar == 0) ? 0.0f : (0.5f * std::pow(2.0f, ar * 0.35f) / sampleRate);
      env += rate;
      if (env >= 1.0f) {
        env = 1.0f;
        envState = 2;
      }
    } else if (envState == 2) {
      const float sl = sustainLevel();
      if (d1r == 0) {
        if (env <= sl) envState = 3;
        return;
      }
      const float rate = 0.12f * std::pow(2.0f, d1r * 0.28f) / sampleRate;
      env -= rate;
      if (env <= sl) {
        env = sl;
        envState = 3;
      }
    } else if (envState == 3) {
      if (d2r > 0) {
        const float rate = 0.08f * std::pow(2.0f, d2r * 0.26f) / sampleRate;
        env -= rate;
        if (env <= 0.0001f) {
          env = 0.0f;
          envState = 0;
        }
      }
    } else if (envState == 4) {
      const float rate =
          0.35f * std::pow(2.0f, (rr * 2 + 1) * 0.28f) / sampleRate;
      env -= rate;
      if (env <= 0.0001f) {
        env = 0.0f;
        envState = 0;
      }
    }
  }

  float sample(float modRadians, float sampleRate) {
    stepEnv(sampleRate);
    if (envState == 0 || env <= 0.0001f) return 0.0f;
    const float out = std::sin(phase + modRadians) * env * totalLevelGain();
    phase += phaseInc;
    if (phase >= kTwoPi) phase -= kTwoPi;
    return out;
  }
};

struct FmChannel {
  FmOperator ops[4]; // OPM slot order: 0=M1, 1=C1, 2=M2, 3=C2
  uint8_t alg = 0;   // Connection algorithm 0..7
  uint8_t fb = 0;    // Operator 0 feedback 0..7
  uint8_t pan = 3;   // Bit 0=Left, Bit 1=Right
  uint8_t kc = 0x40; // Key Code (octave + note)
  uint8_t kf = 0;    // Key Fraction (upper 6 bits)
  float baseFreq = 440.0f;

  void updateFreq(float sampleRate) {
    const int oct = (kc >> 4) & 0x07;
    const int note = kNoteTable[kc & 0x0f];
    const float frac = static_cast<float>(kf >> 2) / 64.0f;
    // YM2151 octave 4, note 9 (A) ~= 440 Hz (at 3.579545 MHz clock).
    const float semis = (oct - 4) * 12.0f + (note - 9) + frac;
    baseFreq = 440.0f * std::pow(2.0f, semis / 12.0f);
    for (int i = 0; i < 4; ++i) {
      const float mulFactor =
          (ops[i].mul == 0) ? 0.5f : static_cast<float>(ops[i].mul);
      ops[i].phaseInc = (kTwoPi * baseFreq * mulFactor) / sampleRate;
    }
  }

  void render(float sampleRate, float& outL, float& outR) {
    const float fbScale =
        (fb == 0) ? 0.0f : (0.125f * static_cast<float>(1 << (fb - 1)));
    const float m1 = ops[0].sample(ops[0].prevOut * fbScale, sampleRate);
    ops[0].prevOut = m1;

    constexpr float kModIndex = 4.0f;
    float s = 0.0f;
    switch (alg & 7) {
      case 0: {
        const float c1 = ops[1].sample(m1 * kModIndex, sampleRate);
        const float m2 = ops[2].sample(c1 * kModIndex, sampleRate);
        s = ops[3].sample(m2 * kModIndex, sampleRate);
        break;
      }
      case 1: {
        const float m2 = ops[2].sample(0.0f, sampleRate);
        const float c1 = ops[1].sample((m1 + m2) * kModIndex, sampleRate);
        s = ops[3].sample(c1 * kModIndex, sampleRate);
        break;
      }
      case 2: {
        const float c1 = ops[1].sample(0.0f, sampleRate);
        const float m2 = ops[2].sample(c1 * kModIndex, sampleRate);
        s = ops[3].sample((m1 + m2) * kModIndex, sampleRate);
        break;
      }
      case 3: {
        const float c1 = ops[1].sample(m1 * kModIndex, sampleRate);
        const float m2 = ops[2].sample(0.0f, sampleRate);
        s = ops[3].sample((c1 + m2) * kModIndex, sampleRate);
        break;
      }
      case 4: {
        const float c1 = ops[1].sample(m1 * kModIndex, sampleRate);
        const float m2 = ops[2].sample(0.0f, sampleRate);
        const float c2 = ops[3].sample(m2 * kModIndex, sampleRate);
        s = (c1 + c2) * 0.5f;
        break;
      }
      case 5: {
        const float c1 = ops[1].sample(m1 * kModIndex, sampleRate);
        const float m2 = ops[2].sample(m1 * kModIndex, sampleRate);
        const float c2 = ops[3].sample(m1 * kModIndex, sampleRate);
        s = (c1 + m2 + c2) * 0.35f;
        break;
      }
      case 6: {
        const float c1 = ops[1].sample(m1 * kModIndex, sampleRate);
        const float m2 = ops[2].sample(0.0f, sampleRate);
        const float c2 = ops[3].sample(0.0f, sampleRate);
        s = (c1 + m2 + c2) * 0.35f;
        break;
      }
      default: {
        const float c1 = ops[1].sample(0.0f, sampleRate);
        const float m2 = ops[2].sample(0.0f, sampleRate);
        const float c2 = ops[3].sample(0.0f, sampleRate);
        s = (m1 + c1 + m2 + c2) * 0.28f;
        break;
      }
    }
    if (pan & 1) outL += s;
    if (pan & 2) outR += s;
  }
};

// Atari POKEY 4-channel polynomial noise / square-wave generator.
struct PokeyChannel {
  uint8_t audf = 0; // Frequency divider (0..255)
  uint8_t audc = 0; // Bits 7..5 = distortion, Bit 4 = volume-only, Bits 3..0 = volume
  float counter = 0.0f;
  float outBit = 1.0f;
};

struct PokeyChip {
  PokeyChannel ch[4];
  uint32_t lfsr17 = 0x1ffffu;
  uint32_t lfsr5 = 0x1fu;
  uint32_t lfsr4 = 0xfu;
  float rollLp1 = 0.0f;
  float rollLp2 = 0.0f;

  void reset() {
    for (int i = 0; i < 4; ++i) ch[i] = PokeyChannel{};
    lfsr17 = 0x1ffffu;
    lfsr5 = 0x1fu;
    lfsr4 = 0xfu;
    rollLp1 = 0.0f;
    rollLp2 = 0.0f;
  }

  void write(uint8_t reg, uint8_t val) {
    const uint8_t r = reg & 0x0f;
    if (r < 8) {
      const uint8_t c = r >> 1;
      if ((r & 1) == 0) ch[c].audf = val;
      else ch[c].audc = val;
    }
  }

  float step(float sampleRate, bool lowPassCh0) {
    const uint32_t b17 = ((lfsr17 >> 16) ^ (lfsr17 >> 11)) & 1u;
    lfsr17 = ((lfsr17 << 1) | b17) & 0x1ffffu;
    const uint32_t b5 = ((lfsr5 >> 4) ^ (lfsr5 >> 2)) & 1u;
    lfsr5 = ((lfsr5 << 1) | b5) & 0x1fu;
    const uint32_t b4 = ((lfsr4 >> 3) ^ (lfsr4 >> 2)) & 1u;
    lfsr4 = ((lfsr4 << 1) | b4) & 0xfu;

    float mix = 0.0f;
    const float baseInc = 64000.0f / sampleRate;
    for (int i = 0; i < 4; ++i) {
      PokeyChannel& p = ch[i];
      const uint8_t vol = p.audc & 0x0f;
      if (vol == 0) continue;
      const float gain = static_cast<float>(vol) / 15.0f;
      if (p.audc & 0x10) {
        mix += gain * 0.25f;
        continue;
      }
      p.counter += baseInc / static_cast<float>(p.audf + 1);
      if (p.counter >= 1.0f) {
        p.counter -= std::floor(p.counter);
        const uint8_t dist = (p.audc >> 5) & 0x07;
        if (dist >= 5) p.outBit = -p.outBit;
        else if (dist == 4) p.outBit = (lfsr17 & 1u) ? 1.0f : -1.0f;
        else if (dist == 0) {
          if (lfsr5 & 1u) p.outBit = (lfsr17 & 1u) ? 1.0f : -1.0f;
        } else {
          p.outBit = (lfsr4 & 1u) ? 1.0f : -1.0f;
        }
      }
      if (lowPassCh0 && i == 0) {
        // Warm low-passed marble rolling rumble with post-filter makeup gain.
        const float raw = p.outBit * gain * 0.85f;
        const float alpha =
            0.09f + (1.0f - static_cast<float>(p.audf) / 255.0f) * 0.12f;
        rollLp1 += alpha * (raw - rollLp1);
        rollLp2 += alpha * (rollLp1 - rollLp2);
        mix += rollLp2;
      } else {
        mix += p.outBit * gain * 0.28f;
      }
    }
    return mix;
  }
};

struct OpmChip {
  FmChannel fm[8];

  void reset(float sampleRate) {
    for (int c = 0; c < 8; ++c) {
      fm[c] = FmChannel{};
      fm[c].updateFreq(sampleRate);
    }
  }

  void write(uint8_t reg, uint8_t val, float sampleRate) {
    if (reg == 0x08) {
      const uint8_t ch = val & 0x07;
      constexpr int kSlotMap[4] = {0, 2, 1, 3};
      for (int b = 0; b < 4; ++b) {
        if (val & (1u << (b + 3))) fm[ch].ops[kSlotMap[b]].keyOn();
        else fm[ch].ops[kSlotMap[b]].keyOff();
      }
      return;
    }
    const uint8_t ch = reg & 0x07;
    if (reg >= 0x20 && reg <= 0x27) {
      fm[ch].pan = (val >> 6) & 0x03;
      fm[ch].fb = (val >> 3) & 0x07;
      fm[ch].alg = val & 0x07;
    } else if (reg >= 0x28 && reg <= 0x2f) {
      fm[ch].kc = val & 0x7f;
      fm[ch].updateFreq(sampleRate);
    } else if (reg >= 0x30 && reg <= 0x37) {
      fm[ch].kf = val & 0xfc;
      fm[ch].updateFreq(sampleRate);
    } else if (reg >= 0x40) {
      constexpr int kSlotMap[4] = {0, 2, 1, 3};
      const int slot = kSlotMap[(reg >> 3) & 0x03];
      FmOperator& op = fm[ch].ops[slot];
      const uint8_t bank = reg & 0xe0;
      if (bank == 0x40) {
        op.dt1 = (val >> 4) & 0x07;
        op.mul = val & 0x0f;
        fm[ch].updateFreq(sampleRate);
      } else if (bank == 0x60) {
        op.tl = val & 0x7f;
      } else if (bank == 0x80) {
        op.ar = val & 0x1f;
      } else if (bank == 0xa0) {
        op.d1r = val & 0x1f;
      } else if (bank == 0xc0) {
        op.d2r = val & 0x1f;
      } else if (bank == 0xe0) {
        op.d1l = (val >> 4) & 0x0f;
        op.rr = val & 0x0f;
      }
    }
  }

  void render(float sampleRate, float& outL, float& outR) {
    for (int c = 0; c < 8; ++c) fm[c].render(sampleRate, outL, outR);
  }
};

// Dual YM2151 + Dual POKEY engine:
// - Music bus (dedicated 8-ch YM2151 + 4-ch POKEY) for full 8-channel VGM playback
// - SFX bus   (dedicated 8-ch YM2151 + 4-ch POKEY) for zero-collision real-time SFX
struct OpmPokeyEngine {
  float sampleRate = kDefaultSampleRate;
  OpmChip musicOpm;
  PokeyChip musicPokey;
  OpmChip sfxOpm;
  PokeyChip sfxPokey;
  float musicGain = 0.75f;
  float sfxGain = 1.0f;

  void reset(float sr) {
    sampleRate = (sr > 8000.0f) ? sr : kDefaultSampleRate;
    musicOpm.reset(sampleRate);
    musicPokey.reset();
    sfxOpm.reset(sampleRate);
    sfxPokey.reset();
  }

  void resetMusic() {
    musicOpm.reset(sampleRate);
    musicPokey.reset();
  }

  void renderBlock(float* left, float* right, int frames) {
    for (int i = 0; i < frames; ++i) {
      float musL = 0.0f;
      float musR = 0.0f;
      float sfxL = 0.0f;
      float sfxR = 0.0f;
      musicOpm.render(sampleRate, musL, musR);
      const float musP = musicPokey.step(sampleRate, false);
      sfxOpm.render(sampleRate, sfxL, sfxR);
      const float sfxP = sfxPokey.step(sampleRate, true);

      left[i] = std::tanh((musL * 0.18f + musP * 0.30f) * musicGain +
                          (sfxL * 0.30f + sfxP * 0.65f) * sfxGain);
      right[i] = std::tanh((musR * 0.18f + musP * 0.30f) * musicGain +
                           (sfxR * 0.30f + sfxP * 0.65f) * sfxGain);
    }
  }
};

OpmPokeyEngine gEngine;
float gLeft[128];
float gRight[128];

} // namespace

extern "C" {

void audio_init(float sampleRate) { gEngine.reset(sampleRate); }

void audio_reset_music() { gEngine.resetMusic(); }

void audio_set_mix(float musicGain, float sfxGain) {
  gEngine.musicGain = (musicGain < 0.0f) ? 0.0f : (musicGain > 2.0f ? 2.0f : musicGain);
  gEngine.sfxGain = (sfxGain < 0.0f) ? 0.0f : (sfxGain > 2.0f ? 2.0f : sfxGain);
}

void opm_write(uint32_t reg, uint32_t val) {
  gEngine.sfxOpm.write(static_cast<uint8_t>(reg & 0xffu),
                       static_cast<uint8_t>(val & 0xffu), gEngine.sampleRate);
}

void pokey_write(uint32_t reg, uint32_t val) {
  gEngine.sfxPokey.write(static_cast<uint8_t>(reg & 0x0fu),
                         static_cast<uint8_t>(val & 0xffu));
}

void opm_music_write(uint32_t reg, uint32_t val) {
  gEngine.musicOpm.write(static_cast<uint8_t>(reg & 0xffu),
                         static_cast<uint8_t>(val & 0xffu), gEngine.sampleRate);
}

void pokey_music_write(uint32_t reg, uint32_t val) {
  gEngine.musicPokey.write(static_cast<uint8_t>(reg & 0x0fu),
                           static_cast<uint8_t>(val & 0xffu));
}

void audio_render(int frames) {
  const int count = (frames > 128) ? 128 : (frames < 0 ? 0 : frames);
  gEngine.renderBlock(gLeft, gRight, count);
}

float* audio_left_ptr() { return gLeft; }
float* audio_right_ptr() { return gRight; }

} // extern "C"
