// Dual cycle-accurate Yamaha YM2151 (OPM via Aaron Giles's ymfm, BSD-3-Clause)
// + Dual Atari POKEY 4-channel polynomial-counter audio engine compiled to
// standalone WASM for AudioWorklet.
// Exact Atari System 1 YM2151 clock: 3,579,545 Hz (native output: 55,930.39 Hz).

#include <cmath>
#include <cstdint>
#include <new>
#include "ymfm_opm.h"

namespace {

constexpr float kDefaultSampleRate = 48000.0f;
constexpr uint32_t kOpmClockHz = 3579545u;
constexpr double kOpmNativeRate = static_cast<double>(kOpmClockHz) / 64.0;

class MinimalYmfmInterface : public ymfm::ymfm_interface {};

// Wrapper around ymfm::ym2151 with linear resampling from 55,930.39 Hz to host sampleRate.
struct YmfmOpmChip {
  MinimalYmfmInterface intf;
  ymfm::ym2151 chip;
  double phase = 0.0;
  double step = kOpmNativeRate / static_cast<double>(kDefaultSampleRate);
  float prevL = 0.0f;
  float prevR = 0.0f;
  float currL = 0.0f;
  float currR = 0.0f;

  YmfmOpmChip() : chip(intf) {}

  void reset(float sampleRate) {
    const double sr = (sampleRate > 8000.0f) ? static_cast<double>(sampleRate)
                                             : static_cast<double>(kDefaultSampleRate);
    step = kOpmNativeRate / sr;
    phase = 0.0;
    prevL = prevR = currL = currR = 0.0f;
    chip.reset();
  }

  void write(uint8_t reg, uint8_t val) {
    chip.write_address(reg);
    chip.write_data(val);
  }

  void renderSample(float& outL, float& outR) {
    phase += step;
    while (phase >= 1.0) {
      phase -= 1.0;
      prevL = currL;
      prevR = currR;
      ymfm::ym2151::output_data data;
      chip.generate(&data, 1);
      currL = static_cast<float>(data.data[0]) / 32768.0f;
      currR = static_cast<float>(data.data[1]) / 32768.0f;
    }
    const float t = static_cast<float>(phase);
    outL = prevL + (currL - prevL) * t;
    outR = prevR + (currR - prevR) * t;
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
        // Silky ceramic-on-stone rolling rumble (~340 Hz) with zero static crackle.
        const float raw = p.outBit * gain * 0.22f;
        const float alpha = 0.045f;
        rollLp1 += alpha * (raw - rollLp1);
        rollLp2 += alpha * (rollLp1 - rollLp2);
        mix += rollLp2;
      } else {
        mix += p.outBit * gain * 0.30f;
      }
    }
    return mix;
  }
};

// Dual YM2151 (ymfm) + Dual POKEY engine:
// - musicOpm + musicPokey: full 8-channel YM2151 + 4-channel POKEY for VGM music
// - sfxOpm   + sfxPokey:   dedicated 8-channel YM2151 + 4-channel POKEY for SFX
struct OpmPokeyEngine {
  float sampleRate = kDefaultSampleRate;
  YmfmOpmChip musicOpm;
  PokeyChip musicPokey;
  YmfmOpmChip sfxOpm;
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
      musicOpm.renderSample(musL, musR);
      const float musP = musicPokey.step(sampleRate, false);
      sfxOpm.renderSample(sfxL, sfxR);
      const float sfxP = sfxPokey.step(sampleRate, true);

      // ymfm outputs full-scale signed 16-bit normalized to [-1, 1] per chip.
      left[i] = std::tanh((musL * 0.68f + musP * 0.28f) * musicGain +
                          (sfxL * 1.25f + sfxP * 0.80f) * sfxGain);
      right[i] = std::tanh((musR * 0.68f + musP * 0.28f) * musicGain +
                           (sfxR * 1.25f + sfxP * 0.80f) * sfxGain);
    }
  }
};

alignas(OpmPokeyEngine) uint8_t gEngineStorage[sizeof(OpmPokeyEngine)];
OpmPokeyEngine* gEngine = nullptr;
float gLeft[128];
float gRight[128];

inline OpmPokeyEngine& engine() {
  if (!gEngine) {
    gEngine = new (gEngineStorage) OpmPokeyEngine();
  }
  return *gEngine;
}

} // namespace

extern "C" {

void audio_init(float sampleRate) { engine().reset(sampleRate); }

void audio_reset_music() { engine().resetMusic(); }

void audio_set_mix(float musicGain, float sfxGain) {
  OpmPokeyEngine& eng = engine();
  eng.musicGain = (musicGain < 0.0f) ? 0.0f : (musicGain > 2.0f ? 2.0f : musicGain);
  eng.sfxGain = (sfxGain < 0.0f) ? 0.0f : (sfxGain > 2.0f ? 2.0f : sfxGain);
}

void opm_write(uint32_t reg, uint32_t val) {
  engine().sfxOpm.write(static_cast<uint8_t>(reg & 0xffu),
                        static_cast<uint8_t>(val & 0xffu));
}

void pokey_write(uint32_t reg, uint32_t val) {
  engine().sfxPokey.write(static_cast<uint8_t>(reg & 0xffu),
                          static_cast<uint8_t>(val & 0xffu));
}

void opm_music_write(uint32_t reg, uint32_t val) {
  engine().musicOpm.write(static_cast<uint8_t>(reg & 0xffu),
                          static_cast<uint8_t>(val & 0xffu));
}

void pokey_music_write(uint32_t reg, uint32_t val) {
  engine().musicPokey.write(static_cast<uint8_t>(reg & 0xffu),
                            static_cast<uint8_t>(val & 0xffu));
}

void audio_render(int frames) {
  const int count = (frames < 0) ? 0 : (frames > 128 ? 128 : frames);
  engine().renderBlock(gLeft, gRight, count);
}

float* audio_left_ptr() { return gLeft; }
float* audio_right_ptr() { return gRight; }

} // extern "C"
