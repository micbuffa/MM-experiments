// Yamaha YM2151 (OPM, via ymfm) + Atari POKEY (clean-room) audio engine compiled
// to standalone WASM for the remaster AudioWorklet. Register-compatible with the
// Atari System 1 sound board, so YM2151/POKEY VGM streams and the ROM-derived
// SFX register streams (public/assets/audio/rom-sfx.json) play unchanged.

#include <cmath>
#include <cstdint>
#include <cstring>

#include "third_party/ymfm/ymfm_opm.h"

namespace {

constexpr float kDefaultSampleRate = 48000.0f;

// Atari POKEY 4-channel polynomial-counter sound generator, stepped at the
// System 1 POKEY clock (1.789772 MHz) and box-filtered down to the output rate.
// Implements AUDCTL (64 kHz / 15 kHz / 1.79 MHz clocks, 16-bit channel joins,
// high-pass flip-flops, 9/17-bit poly select) and the 8 AUDC distortion modes,
// as used by the Marble Madness 6502 sound program (AUDCTL 0x28 / 0x50 / 0x78).
constexpr double kPokeyClock = 1789772.5;

struct PokeyChannel {
  uint8_t audf = 0; // Frequency divider (0..255)
  uint8_t audc = 0; // Bits 7..5 = distortion, Bit 4 = volume-only, Bits 3..0 = volume
  int32_t counter = 1;
  uint8_t out = 0;
};

struct PokeyChip {
  PokeyChannel ch[4];
  uint8_t audctl = 0;
  uint8_t hpff[2] = {0, 0};
  uint32_t poly4 = 0xfu;
  uint32_t poly5 = 0x1fu;
  uint32_t poly9 = 0x1ffu;
  uint32_t poly17 = 0x1ffffu;
  int32_t div64 = 28;
  int32_t div15 = 114;
  double cycleAcc = 0.0;
  float dcState = 0.0f;
  float rollLp1 = 0.0f;
  float rollLp2 = 0.0f;

  void reset() {
    for (int i = 0; i < 4; ++i) ch[i] = PokeyChannel{};
    audctl = 0;
    hpff[0] = hpff[1] = 0;
    poly4 = 0xfu;
    poly5 = 0x1fu;
    poly9 = 0x1ffu;
    poly17 = 0x1ffffu;
    div64 = 28;
    div15 = 114;
    cycleAcc = 0.0;
    dcState = 0.0f;
    rollLp1 = 0.0f;
    rollLp2 = 0.0f;
  }

  void write(uint8_t reg, uint8_t val) {
    const uint8_t r = reg & 0x0f;
    if (r < 8) {
      const uint8_t c = r >> 1;
      if ((r & 1) == 0) ch[c].audf = val;
      else ch[c].audc = val;
    } else if (r == 8) {
      audctl = val;
    }
  }

  bool fastClock(int c) const {
    return (c == 0 && (audctl & 0x40)) || (c == 2 && (audctl & 0x20));
  }

  int32_t reloadValue(int c) const {
    const bool join12 = (audctl & 0x10) != 0;
    const bool join34 = (audctl & 0x08) != 0;
    if ((c == 1 && join12) || (c == 3 && join34)) {
      const int lo = c - 1;
      const int32_t period = (static_cast<int32_t>(ch[c].audf) << 8) | ch[lo].audf;
      return period + (fastClock(lo) ? 7 : 1);
    }
    return static_cast<int32_t>(ch[c].audf) + (fastClock(c) ? 4 : 1);
  }

  void underflow(int c) {
    const uint8_t a = ch[c].audc;
    // Bit 7 clear: the 5-bit poly gates the output update.
    if (!(a & 0x80) && !(poly5 & 1u)) return;
    if (a & 0x20) {
      ch[c].out ^= 1u;
    } else if (a & 0x40) {
      ch[c].out = static_cast<uint8_t>(poly4 & 1u);
    } else {
      ch[c].out = static_cast<uint8_t>(((audctl & 0x80) ? poly9 : poly17) & 1u);
    }
  }

  // Decrement a channel counter by one clock; returns true on underflow.
  bool clockChannel(int c) {
    if (--ch[c].counter > 0) return false;
    ch[c].counter = reloadValue(c);
    return true;
  }

  // Advance POKEY by one 1.79 MHz machine cycle.
  void cycle() {
    poly4 = ((poly4 << 1) | (((poly4 >> 3) ^ (poly4 >> 2)) & 1u)) & 0xfu;
    poly5 = ((poly5 << 1) | (((poly5 >> 4) ^ (poly5 >> 2)) & 1u)) & 0x1fu;
    poly9 = ((poly9 << 1) | (((poly9 >> 8) ^ (poly9 >> 4)) & 1u)) & 0x1ffu;
    poly17 = ((poly17 << 1) | (((poly17 >> 16) ^ (poly17 >> 11)) & 1u)) & 0x1ffffu;

    bool baseTick = false;
    if (audctl & 0x01) {
      if (--div15 <= 0) {
        div15 = 114;
        baseTick = true;
      }
    } else if (--div64 <= 0) {
      div64 = 28;
      baseTick = true;
    }

    const bool join12 = (audctl & 0x10) != 0;
    const bool join34 = (audctl & 0x08) != 0;

    // Channels 1+2 (indices 0, 1).
    bool u0 = false;
    if (fastClock(0) || baseTick) u0 = join12 ? false : clockChannel(0);
    if (join12) {
      if (fastClock(0) || baseTick) {
        if (clockChannel(1)) underflow(1);
      }
    } else {
      if (u0) underflow(0);
      if (baseTick && clockChannel(1)) underflow(1);
    }

    // Channels 3+4 (indices 2, 3).
    bool u2 = false;
    if (fastClock(2) || baseTick) u2 = join34 ? false : clockChannel(2);
    if (join34) {
      if (fastClock(2) || baseTick) {
        if (clockChannel(3)) {
          underflow(3);
          u2 = true;
        }
      }
    } else {
      if (u2) underflow(2);
      if (baseTick && clockChannel(3)) {
        underflow(3);
        if (audctl & 0x02) hpff[1] = ch[1].out;
      }
    }
    if (u2 && (audctl & 0x04)) hpff[0] = ch[0].out;
  }

  // Instantaneous channel level 0..15.
  int level(int c) const {
    const uint8_t a = ch[c].audc;
    const int vol = a & 0x0f;
    if (vol == 0) return 0;
    if (a & 0x10) return vol;
    const bool join12 = (audctl & 0x10) != 0;
    const bool join34 = (audctl & 0x08) != 0;
    if ((c == 0 && join12) || (c == 2 && join34)) return 0;
    uint8_t bit = ch[c].out;
    if (c == 0 && (audctl & 0x04)) bit ^= hpff[0];
    if (c == 1 && (audctl & 0x02)) bit ^= hpff[1];
    return bit ? vol : 0;
  }

  float step(float sampleRate, bool lowPassCh0) {
    cycleAcc += kPokeyClock / static_cast<double>(sampleRate);
    int n = static_cast<int>(cycleAcc);
    cycleAcc -= n;
    if (n < 1) n = 1;
    float acc[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    for (int k = 0; k < n; ++k) {
      cycle();
      for (int c = 0; c < 4; ++c) acc[c] += static_cast<float>(level(c));
    }
    const float inv = 1.0f / (15.0f * static_cast<float>(n));
    float mix = 0.0f;
    for (int c = 0; c < 4; ++c) {
      const float v = acc[c] * inv; // 0..1 unipolar, like the real DAC
      if (lowPassCh0 && c == 0) {
        // Warm low-passed marble rolling rumble used by the legacy rolling layer.
        const float alpha =
            0.09f + (1.0f - static_cast<float>(ch[0].audf) / 255.0f) * 0.12f;
        const float gain = static_cast<float>(ch[0].audc & 0x0f) / 15.0f;
        rollLp1 += alpha * ((v * 2.0f - gain) * 0.85f - rollLp1);
        rollLp2 += alpha * (rollLp1 - rollLp2);
        mix += rollLp2;
      } else {
        mix += v * 0.56f;
      }
    }
    // DC blocker: POKEY output is unipolar.
    dcState += 0.0015f * (mix - dcState);
    return mix - dcState;
  }
};

// Yamaha YM2151 (OPM) emulated by Aaron Giles's ymfm (BSD-3-Clause, vendored in
// third_party/ymfm, pinned commit 81aec25). The chip renders at clock / 64
// (55.93 kHz for the 3.579545 MHz System 1 clock) and is linearly resampled to
// the AudioContext rate.
constexpr double kOpmClock = 3579545.0;

class OpmInterface : public ymfm::ymfm_interface {};

struct OpmChip {
  OpmInterface intf;
  ymfm::ym2151 chip{intf};
  double pos = 0.0;
  double step = 1.0;
  float prevL = 0.0f, prevR = 0.0f, curL = 0.0f, curR = 0.0f;

  void reset(float sampleRate) {
    chip.reset();
    step = (kOpmClock / 64.0) / static_cast<double>(sampleRate);
    pos = 0.0;
    prevL = prevR = curL = curR = 0.0f;
  }

  void write(uint8_t reg, uint8_t val, float /*sampleRate*/) {
    // Timer and IRQ registers are owned by the original sound CPU, not by us.
    if (reg >= 0x10 && reg <= 0x14) return;
    chip.write_address(reg);
    chip.write_data(val);
  }

  void render(float /*sampleRate*/, float& outL, float& outR) {
    pos += step;
    while (pos >= 1.0) {
      pos -= 1.0;
      prevL = curL;
      prevR = curR;
      ymfm::ym2151::output_data out;
      chip.generate(&out);
      curL = static_cast<float>(out.data[0]) / 32768.0f;
      curR = static_cast<float>(out.data[1]) / 32768.0f;
    }
    const float t = static_cast<float>(pos);
    outL += prevL + (curL - prevL) * t;
    outR += prevR + (curR - prevR) * t;
  }
};

// Output scaling of the chips before the bus gains (ymfm OPM output is the
// signed 16-bit DAC value / 32768; POKEY is 0..1 per channel after DC removal).
constexpr float kOpmLevel = 1.6f;
constexpr float kPokeyLevel = 0.65f;

// Dual YM2151 + Dual POKEY engine:
// - Music bus (dedicated 8-ch YM2151 + 4-ch POKEY) for full 8-channel VGM playback
// - SFX bus   (dedicated 8-ch YM2151 + 4-ch POKEY) for zero-collision real-time SFX,
//   driven by the ROM-derived register streams (raw POKEY, no extra filtering)
// - Rolling POKEY (1 low-passed channel) for the remaster-only rolling rumble,
//   kept apart so it never alters the ROM-faithful SFX POKEY.
struct OpmPokeyEngine {
  float sampleRate = kDefaultSampleRate;
  OpmChip musicOpm;
  PokeyChip musicPokey;
  OpmChip sfxOpm;
  PokeyChip sfxPokey;
  PokeyChip rollPokey;
  float musicGain = 0.75f;
  float sfxGain = 1.0f;

  void reset(float sr) {
    sampleRate = (sr > 8000.0f) ? sr : kDefaultSampleRate;
    musicOpm.reset(sampleRate);
    musicPokey.reset();
    sfxOpm.reset(sampleRate);
    sfxPokey.reset();
    rollPokey.reset();
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
      const float sfxP = sfxPokey.step(sampleRate, false);
      const float rollP = rollPokey.step(sampleRate, true);

      const float music = kPokeyLevel * musP;
      const float sfx = kPokeyLevel * sfxP + 0.65f * rollP;
      left[i] = std::tanh((musL * kOpmLevel + music) * musicGain +
                          (sfxL * kOpmLevel + sfx) * sfxGain);
      right[i] = std::tanh((musR * kOpmLevel + music) * musicGain +
                           (sfxR * kOpmLevel + sfx) * sfxGain);
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

void pokey_roll_write(uint32_t reg, uint32_t val) {
  gEngine.rollPokey.write(static_cast<uint8_t>(reg & 0x0fu),
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
