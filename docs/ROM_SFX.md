# Marble Madness ROM Sound Effects — Findings and Remaster Mapping

GitHub issue #2. Static analysis of the local `roms/marble.zip` (set
`marble`) plus an emulated run of the 6502 sound program. No ROM bytes or
disassembly listings are committed. Only the register streams the sound program
produces (`public/assets/audio/rom-sfx.json`), the driver tables needed to
schedule them, and these notes are in the repo.

## 1. Hardware path (verified against the ROM)

- **68010 side.** Every gameplay sound goes through `sound(cmd)` at
  **0x158AC**. It calls BIOS jump-table entry **0x23C**, which jumps to
  **0x4C6E**. That routine retries the word write to the sound latch at
  **0xFE0000** while `0xF60001` bit 7 (sound buffer full) is set.
  - Nothing is sent while word `$4003B8 != 0`. This is a power-on window that
    clears when the sound CPU answers `0xFF` (0x10146).
  - Some call sites use `jsr (a4)` with `a4 = 0x158AC`, for example the ice
    zone at 0x2B19C. A simple search for `jsr $158ac` misses them.
- **6502 side** (136033.421 at 0x8000 and .422 at 0xC000; vectors NMI
  0x9566, RESET 0x8002, IRQ 0x81A6).
  - **NMI (0x9566).** Reads the command from 0x1810. The type table **0x9AD5**
    decides whether the command is queued or runs immediately. Queued commands
    go into a 16-entry ring buffer at 0x0200 (indices 0x0210/0x0211).
  - **Main loop (0x80EE).** Pops the queue and calls **0x8359**, which
    dispatches on type **0x9B3D[cmd]** with parameter **0x9BA5[cmd]**. The
    handler table is at 0x862F. Valid commands are 0x00..0x67.
  - **Command types:**

    | type | handler               | meaning                                          |
    | ---- | --------------------- | ------------------------------------------------ |
    | 6    | 0x84E9                | start sound #param                               |
    | 4    | 0x83A4                | stop the sound of command #param                 |
    | 8    | 0x83EB                | fade the sound of command #param                 |
    | 1    | —                     | mute/unmute group                                |
    | 2    | 0x8380 → table 0x9C0D | reset or cabinet lamp patterns (cmds 0x61..0x67) |
    | 0    | —                     | write 0x1B, an attract-mode priority floor       |

  - **Sound tables.** For sound `s`, the first track is `0x9C23[s]` and the
    restart flag is `0x9C6A[s]` (0 = ignore the command while that sound is
    already playing). For track `x`:
    - priority `0x9CB1[x]`;
    - driver channel `0x9E03[x]`;
    - script index `0x9EAC[x]`, which points into the script pointer table at
      0x9647/0x9747;
    - mute group `0x9D5A[x]`;
    - next track `0x9F55[x]` (0 = end of chain).

    Driver channels 0..3 are POKEY AUDF/AUDC pairs 1..4. Channels 4..11 are
    YM2151 channels 0..7.

  - **Channel stealing (0x8508).** A new track takes a busy channel only when
    its priority is greater than or equal to the current one.
  - **Timing.** The YM2151 timer A is programmed to TA = 0x320 (regs
    0x10/0x11 = 0xC8/0x00) with IRQ enabled. That gives an IRQ every
    7168 CPU cycles (**4.005 ms**). The IRQ updates the two halves of the
    channel set on alternate ticks (0x81FF → 0x900A). POKEY registers are
    refreshed every tick, and AUDCTL is 0x78, 0x28 or 0x50 depending on the
    sound.

## 2. Gameplay event → ROM command

The table lists the 68010 call site, the enclosing routine, and how much is
decoded.

- **Decoded.** The 6502 effect was captured by running the original sound
  program (see §3). The register stream is exact up to the harness timing
  (tick quantization at 4.005 ms).
- **Guessed.** The gameplay meaning comes from static 68010 reading only.
  These rows carry low or medium confidence.

| Event (remaster cue)                                                  | cmd                                                                 | 68010 site(s) → routine                                                                                                                | Confidence                                 | Remaster trigger                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| Marble ↔ wall (`marble.wallBump`)                                     | **0x34**                                                            | 0x1B8F4 in wall resolver 0x1B5C2 (from 0x121B8 at 0x1233A). Fires when a velocity component flips sign; no speed threshold or scaling. | high                                       | `bump` (target `wall`), new              |
| Player ↔ player (`marble.marbleBump`)                                 | **0x37**                                                            | 0x1BFAC in collision 0x1BC88 (distance metric < 0x70)                                                                                  | high                                       | `bump` (target `marble`), new            |
| Marble ↔ black marble (`marble.enemyMarbleBump`)                      | **0x32**                                                            | 0x1BF9C, either marble at 0x4009A4/0x400A20                                                                                            | high                                       | TODO (Level 2 black marble)              |
| Leaves ground, falling (`marble.airborne`)                            | **0x45** (stop **0x46**)                                            | See note 1                                                                                                                             | high                                       | `airborne`, new                          |
| Landing thud (`marble.landing`)                                       | **0x5D** (POKEY)                                                    | 0x124DA, sent right after 0x46                                                                                                         | high                                       | `land` and `shatter`                     |
| Shatter on hard landing (`marble.shatter`)                            | **0x38**                                                            | 0x25BDC in 0x25BAE kind 2; thresholds in note 2                                                                                        | high                                       | `shatter`                                |
| Broom sweep (`marble.broomSweep`)                                     | **0x5F** (POKEY)                                                    | 0x26062, shatter animation 0x215F6 frame 9                                                                                             | medium-high                                | TODO (no broom animation yet)            |
| Dazed (`marble.dazed`)                                                | **0x39** loop, stop 0x3A + 0x3B                                     | See note 3                                                                                                                             | high                                       | TODO (no daze state)                     |
| Lost: void fall / off-screen lethal landing (`marble.lostOffEdge`)    | **0x3D**                                                            | 0x25C54 (0x25BAE kind 4); the abyss is > 0x800000 below take-off (0x1269E)                                                             | high                                       | `fall` (below `killY`)                   |
| Lost: embedded, eaten, vacuum (`marble.lost`, `marble.vacuumCapture`) | **0x3C**                                                            | 0x25C44 ($57 == 0x65), 0x25346 (0x25230), 0x256AC (vacuum)                                                                             | high                                       | TODO                                     |
| 2P off-screen catch-up −5 SEC (`race.catchUp`)                        | **0x3C**                                                            | catch-up teleport path (screen Y `$20` > 0xEC)                                                                                         | medium                                     | `catchUp`                                |
| Worm swallows marble (`marble.eaten`)                                 | **0x33**                                                            | 0x153A2 in enemy behaviour 0x15460 (4 slots at 0x401302)                                                                               | medium (cross-checked by the worms branch) | TODO                                     |
| Level 5 creature grabs marble (`marble.birdGrab`)                     | **0x3E**                                                            | 0x19E20                                                                                                                                | medium                                     | TODO                                     |
| Acid / amoeba pool (`marble.acidMelt`)                                | **0x5E** (POKEY noise swell)                                        | 0x17698, 7 acid objects at 0x401482 (melt sprite table 0x21062)                                                                        | high                                       | TODO                                     |
| Ice zone enter / leave (`marble.onIce`)                               | **0x43** loop / **0x44** stop                                       | 0x2B19C / 0x2B1EE (ice tiles 0x35–0x37); 0x43 also at Aerial start 0x10F8A                                                             | high (verified)                            | TODO (surface events)                    |
| Pipe entry (`pipe.enter`)                                             | **0x35**, **0x36**                                                  | See note 4                                                                                                                             | high                                       | TODO                                     |
| Pipe exit (`pipe.exit`)                                               | —                                                                   | 0x253EC state machine. Only the catapult exit (type 0x0A) sends 0x45; the other exits are silent                                       | high                                       | TODO; ROM backend silent                 |
| Goal (`goal.arrive`)                                                  | **0x2F** (P1) / **0x30** (P2)                                       | 0x13874 in 0x13966 when the section becomes 0xFF (table 0x1EF72)                                                                       | high                                       | `goal`                                   |
| Out of time (`race.gameOver`)                                         | **0x3F** (8-track jingle)                                           | 0x16AEC in 0x16A20                                                                                                                     | high                                       | `gameOver`                               |
| Magic wand / secret +10 s (`bonus.extraTime`)                         | **0x53**                                                            | 0x2571A in 0x253EC; the chance check is at 0x1BBAA                                                                                     | high (magic wand per the Level 2 branch)   | TODO                                     |
| Squash a Level 5 miniature +3 s (`bonus.squashMiniature`)             | **0x5A/0x5B/0x5C**                                                  | 0x1933A/0x1932A/0x1930A in 0x19250; chosen by actor `$25` (7 → 0x5B, 9 → 0x5C, else 0x5A)                                              | high                                       | TODO                                     |
| Pistons (`level.pistonNear` / `level.pistonFar`)                      | **0x1F–0x24** / **0x27–0x2C**                                       | 0x1844A; tables 0x1EFB6 (on screen) and 0x1EFD6 (off screen)                                                                           | high                                       | TODO                                     |
| Vacuum hum (`level.vacuumHum`)                                        | **0x47/49/4B/4D/4F/51** loop, stops 0x48..0x52                      | start table 0x1EF42, stop table 0x1EF5A (section − 0x1E)                                                                               | medium-high                                | TODO                                     |
| Bounce off a solid actor (`level.actorBounce`)                        | **0x42**                                                            | 0x29F96.. in 0x29CD2 (types 0x05, 0x1A–0x1F)                                                                                           | medium                                     | TODO                                     |
| Catapult (no cue yet)                                                 | **0x60** (POKEY)                                                    | 0x12A78, actor script opcode on type 0x0A                                                                                              | low-medium                                 | —                                        |
| Coin                                                                  | **0x41**                                                            | 0x2888A                                                                                                                                | high                                       | not used (no coins)                      |
| Race start                                                            | music only (0x08/0x0A/0x0C/0x0E/0x14/0x18 per level, table 0x1EF7A) | 0x10744 / 0x10F1C                                                                                                                      | high                                       | `start` → VGM theme                      |
| Low-time warning tick (`timer.lowTimeTick`)                           | **none found**                                                      | —                                                                                                                                      | high (absence)                             | `countdownTick`; ROM backend silent      |
| Respawn (`marble.respawn`)                                            | **none**                                                            | —                                                                                                                                      | high (absence)                             | `respawn`; ROM backend silent            |
| Rolling sound                                                         | **none**                                                            | No command depends on speed and none is re-sent every frame                                                                            | high (absence)                             | remaster-only rumble on a separate POKEY |

Notes:

1. **0x45 falling sound.** Sent from 0x12482 (0x121B8, ground drops more than
   8 units), 0x1642C and 0x16642 (ledge checks), 0x18920 (piston launch) and
   0x255A4 (catapult release). **0x46** stops it at 0x124CE, 0x12268, 0x126B8,
   0x16B42, 0x1CF6A and 0x2A8A4 (landing, void vanish, embedded, time-out,
   pipe entry).
2. **Hard-landing thresholds (0x25C74).** The fall distance is
   `d1 = |take-off $2A − ground| >> 15`, accumulated into `$57`. A player
   marble shatters when `$56 + ($57 − $56)/2 > 0x1F`, but only while it is
   on screen. Off screen, the same landing sends 0x3D instead.
3. **0x39 dazed.** Three triggers:
   - a medium landing while the marble is not in its normal state (0x25DAA);
   - a bump into a worm or enemy (0x15076);
   - a hit from an actor of type 0x0C (0x2AB50).

   The black marble landing on a player (0x1BFE4) calls the 0x15884 helper.
   That helper sends **0x3A** (stop 0x39) and **0x3B**; 0x3B is skipped on
   course index 2. 0x3B is captured as a 4-tick LFO reset plus a key-off on
   YM channel 5. Parallel analyses saw it used before the pipe, embedded,
   void-fall, worm-eat and squash cues. It is therefore best read as a
   generic "marble taken" clean-up, not an event sound.

4. **Pipe entry.** **0x35** comes from actor collision 0x29CD2 (types 0x12,
   0x13, 0x14, 0x20 and 0x25) at sites 0x2A46A, 0x2A538, 0x2A6E2 and 0x2A956.
   **0x36** is sent for type 0x22 at site 0x2A82E.

Other commands:

- Music start commands: 0x08, 0x0A, 0x0C, 0x0E, 0x14, 0x18; fades: 0x09..0x19.
- Aerial second tune: 0x10, with fade 0x11 and mute/unmute 0x12/0x13.
- Silly second tune: 0x16. Congratulations: 0x1B. Attract tunes: 0x1C–0x1E.
  Probable high-score jingle: 0x1A.
- Handshake ping every 8 frames: 0x07. Reset: 0x00/0x02.
- Lamp patterns: 0x61–0x67.

Level-5 actor spawns 0x54–0x58 and 0x59 have low confidence; their streams are
shipped but not bound.

## 3. How the effects were decoded

`scripts/rom-sfx/extract_rom_sfx.py` runs the sound program in a py65 6502
with the board I/O emulated:

- the latch and NMI command path;
- 0x1820 bit 7 (self-test off);
- the YM2151 busy and timer status and timer-A IRQ at the programmed rate;
- POKEY reads returning random values.

For each command in `annotations.json`, the script sends the command after
boot. It then records every YM2151 (0x1800/0x1801) and POKEY (0x1870–0x187F)
write until the driver frees all 16 voice slots (0x0308), up to 8 s. Each
write is quantized to the 4.005 ms tick and kept only when the register
value changes; key-on is always kept. The driver tables listed in §1 supply
the channel, priority and restart metadata. Loops (0x39, 0x47..0x51) have
`endTick: null` and sustain until they are stopped.

The script regenerates `public/assets/audio/rom-sfx.json` (83 KB):

```bash
python3 -m venv /tmp/romsfx && /tmp/romsfx/bin/pip install py65==1.2.0
/tmp/romsfx/bin/python scripts/rom-sfx/extract_rom_sfx.py roms/marble.zip
```

## 4. Architecture of the two layers

```text
RemasterSimulation events ──► (a) soundCues.ts ──► SoundCueBackend ──► (b) romSfxBackend.ts  ─► worklet `sfxStreams` ─► ymfm YM2151 + POKEY
 (bump/airborne/land/...)      cue id, priority,     (interface)          rom-sfx.json streams,
                               cooldown, intensity,                       driver priority / restart
                               stops                                  └─► synthCueBackend.ts (sfx-bank.json FM, fallback)
```

**(a) Backend-agnostic layer: `src/remaster/audio/soundCues.ts`.**

- `SOUND_CUE_IDS` lists the cues. `DEFAULT_SOUND_CUE_RULES` gives each cue
  its priority, cooldown, per-player flag, intensity floor, the cues it
  stops, and the event that triggers it.
- Cues whose event does not exist yet carry a `TODO:` trigger.
- `cuesForEvent()` maps simulation events to cues.
- `createSoundCueDispatcher()` applies the rules.
- Nothing in this layer knows about chips or ROM commands.

**(b) ROM-faithful backend: `romSfxBank.ts` + `romSfxBackend.ts`.**

- Bindings from cue to command live in `rom-sfx.json` under `cues`. An entry
  can list an intensity ladder or a round-robin set, per-player overrides,
  and stop commands.
- Each command's stream is split per hardware slot, and writes to slots the
  command does not own are dropped.
- Slots are arbitrated with the driver priorities and restart flags.
- The worklet replays the streams at sample accuracy.

A future backend, such as WebAssembly music, implements `SoundCueBackend`
(`playCue`, `stopCue`, `stopAll`) and is selected in `createRemasterAudio.ts`.
Neither layer (a) nor the game code changes. The `B` key or the toolbar button
switches between the ROM and synth backends for A/B listening.
