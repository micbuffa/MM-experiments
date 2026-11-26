/**
 * Sound command numbers sent by the 68010 through 0x158ac (forwarded to the
 * sound CPU by BIOS 0x23c unless attract silence 0x4003b8 is set). Data only:
 * playback belongs to the separate sound work (branch
 * `remaster-sfx-rom-extraction`). Addresses are the `pea #cmd` call sites.
 */
export const LEVEL2_ROM_SOUND_CUES = {
  /** Marble swallowed by a pipe (0x2a46a drop pipe, 0x2a538 Y-pipe). */
  pipeEnter: 0x35,
  /** Sent by 0x15884 right before pipeEnter / fall cues (0x3b skipped on course index 2). */
  preCueA: 0x3a,
  preCueB: 0x3b,
  /** Ground fell more than 8 units under the marble: airborne (0x12482). */
  fallStart: 0x45,
  /** Fall ends: landing (0x124ce), void fall (0x126b8), embedded (0x1226e). */
  fallEnd: 0x46,
  /** Landing thud right after fallEnd on a normal landing (0x124da). */
  landing: 0x5d,
  /** Vanish sequence 0x25bae(kind 4) when $57 = 0x65 (embedded). */
  vanishEmbedded: 0x3c,
  /** Vanish sequence 0x25bae(kind 4) otherwise ($57 = 0x64, void fall). */
  vanishVoid: 0x3d,
  /** Shatter 0x25bae(kind 2) at 0x25bdc. */
  shatter: 0x38,
  /** Bump against a wall object (types 5, 0x1a..0x1f) at 0x29f96 etc. */
  wallObjectBump: 0x42,
} as const;
