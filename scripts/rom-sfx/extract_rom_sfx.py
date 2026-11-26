#!/usr/bin/env python3
"""Regenerate public/assets/audio/rom-sfx.json from the local Marble Madness ROMs.

Runs the original 6502 sound program (136033.421 @ 0x8000, 136033.422 @ 0xC000)
in a minimal Atari System 1 sound-board harness: py65 6502 core, sound latch +
NMI command path (0x1810 / NMI 0x9566), YM2151 timer-A IRQ (0x81A6) at the rate
the program itself programs (TA = 0x320 -> 7168 CPU cycles, ~4.005 ms), and
captures every YM2151 (0x1800/0x1801) and POKEY (0x1870-0x187F) register write.
Writes are tick-quantized and deduplicated (a register is only kept when its
value changes; YM2151 key-on 0x08 is always kept).

No ROM bytes are written to the output: only the register streams the sound
program produces, the driver tables needed to schedule them (channel, priority,
restart flag) and the human annotations in annotations.json.

Usage (never commit the ROMs; Python >= 3.10):
    python3 -m venv /tmp/romsfx-venv && /tmp/romsfx-venv/bin/pip install py65==1.2.0
    /tmp/romsfx-venv/bin/python scripts/rom-sfx/extract_rom_sfx.py roms/marble.zip

Arguments: <marble.zip> [annotations.json] [output.json]
"""
import json
import os
import sys
import zipfile

from py65.devices.mpu6502 import MPU
from py65.memory import ObservableMemory

CPU_HZ = 14318181 / 8  # 6502 at 1.789772 MHz
TICK_CYCLES = 7168     # YM2151 timer A: 64 * (1024 - 0x320) YM clocks / 2
MAX_SECONDS = 8.0

# Sound-driver tables in the 6502 address space (see docs/ROM_SFX.md).
CMD_TYPE = 0x9B3D       # per command: 6 = start sound, 4 = stop, 8 = fade, ...
CMD_PARAM = 0x9BA5      # per command: sound index (type 6) / target command
SND_FIRST_TRACK = 0x9C23
SND_RESTART = 0x9C6A
TRK_PRIORITY = 0x9CB1
TRK_CHANNEL = 0x9E03
TRK_SCRIPT = 0x9EAC
TRK_NEXT = 0x9F55
SCRIPT_LO = 0x9647      # script pointer table, 256 + 256 bytes
SCRIPT_HI = 0x9747
VOICE_PRIORITY = 0x0308  # 16 voice slots, 0 = free


def load_sound_rom(zip_path):
    rom = bytearray(b'\xff' * 0x10000)
    with zipfile.ZipFile(zip_path) as z:
        rom[0x8000:0xC000] = z.read('136033.421')
        rom[0xC000:0x10000] = z.read('136033.422')
    return bytes(rom)


class SoundBoard:
    def __init__(self, rom):
        self.mem = ObservableMemory()
        for a in range(0x8000, 0x10000):
            self.mem._subject[a] = rom[a]
        self.cpu = MPU(memory=self.mem)
        self.ym_addr = 0
        self.ym_regs = [0] * 256
        self.timer_flag = 0
        self.timer_period = None
        self.next_timer = None
        self.cmd = 0
        self.log = []
        self.capture = False
        self.rand = 0x1234
        m = self.mem
        m.subscribe_to_write([0x1800], self._ym_addr)
        m.subscribe_to_write([0x1801], self._ym_data)
        m.subscribe_to_read([0x1800, 0x1801], lambda a: self.timer_flag)
        m.subscribe_to_read([0x1810], lambda a: self.cmd)
        m.subscribe_to_write([0x1810], lambda a, v: None)
        # 0x1820 bit 7 = self-test off, bit 4 = no response pending.
        m.subscribe_to_read([0x1820], lambda a: 0x80)
        m.subscribe_to_write(range(0x1820, 0x1828), lambda a, v: None)
        m.subscribe_to_write(range(0x1870, 0x1880), self._pokey)
        m.subscribe_to_read(range(0x1870, 0x1880), self._pokey_read)
        m.subscribe_to_read(range(0x1000, 0x1010), lambda a: 0)
        m.subscribe_to_write(range(0x1000, 0x1010), lambda a, v: None)
        self.cpu.reset()
        self.cpu.pc = rom[0xFFFC] | rom[0xFFFD] << 8

    def now(self):
        return self.cpu.processorCycles

    def _ym_addr(self, a, v):
        self.ym_addr = v

    def _ym_data(self, a, v):
        r = self.ym_addr
        self.ym_regs[r] = v
        if r in (0x10, 0x11):
            ta = (self.ym_regs[0x10] << 2) | (self.ym_regs[0x11] & 3)
            self.timer_period = 64 * (1024 - ta) // 2
            return
        if r == 0x14:
            if v & 0x10:
                self.timer_flag = 0
            if (v & 1) and self.next_timer is None and self.timer_period:
                self.next_timer = self.now() + self.timer_period
            return
        if self.capture:
            self.log.append((self.now(), 0, r, v))

    def _pokey(self, a, v):
        if self.capture:
            self.log.append((self.now(), 1, a - 0x1870, v))

    def _pokey_read(self, a):
        self.rand = (self.rand * 1103515245 + 12345) & 0x7FFFFFFF
        return (self.rand >> 16) & 0xFF

    def run(self, cycles):
        end = self.now() + cycles
        cpu = self.cpu
        while cpu.processorCycles < end:
            if self.next_timer is not None and cpu.processorCycles >= self.next_timer:
                self.timer_flag = 1
                self.next_timer += self.timer_period
            if self.timer_flag and self.ym_regs[0x14] & 4 and not (cpu.p & cpu.INTERRUPT):
                cpu.irq()
            cpu.step()

    def send(self, cmd):
        self.cmd = cmd
        self.cpu.nmi()

    def voices_active(self):
        return any(self.mem._subject[VOICE_PRIORITY + y] for y in range(16))


def tracks_of(rom, sound):
    x = rom[SND_FIRST_TRACK + sound]
    out = []
    while True:
        idx = rom[TRK_SCRIPT + x] * 2
        table = SCRIPT_HI if idx >= 256 else SCRIPT_LO
        idx &= 0xFF
        out.append({
            'driverChannel': rom[TRK_CHANNEL + x],
            'priority': rom[TRK_PRIORITY + x],
            'scriptAddr': rom[table + idx] | rom[table + idx + 1] << 8,
        })
        x = rom[TRK_NEXT + x]
        if x == 0:
            return out


def capture(rom, cmd):
    board = SoundBoard(rom)
    board.run(int(CPU_HZ * 0.3))  # boot + driver init
    board.capture = True
    t0 = board.now()
    board.send(cmd)
    ticks = 0
    end_tick = None
    while ticks * TICK_CYCLES < MAX_SECONDS * CPU_HZ:
        board.run(TICK_CYCLES)
        ticks += 1
        if ticks > 3 and not board.voices_active():
            end_tick = ticks
            break
    last = {}
    writes = []
    for (t, chip, reg, val) in board.log:
        tick = int((t - t0) // TICK_CYCLES)
        if not (chip == 0 and reg == 0x08):
            if last.get((chip, reg)) == val:
                continue
            last[(chip, reg)] = val
        writes.append([tick, chip, reg, val])
    return end_tick, writes


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    zip_path = sys.argv[1]
    ann_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'annotations.json')
    out_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        here, '..', '..', 'public', 'assets', 'audio', 'rom-sfx.json')
    rom = load_sound_rom(zip_path)
    ann = json.load(open(ann_path))
    commands = {}
    for key, info in sorted(ann['commands'].items()):
        cmd = int(key, 16)
        if rom[CMD_TYPE + cmd] != 6:
            raise SystemExit('command %s is not a start-sound command' % key)
        sound = rom[CMD_PARAM + cmd]
        end_tick, writes = capture(rom, cmd)
        commands[key] = {
            'command': cmd,
            'name': info['name'],
            'sound': sound,
            'restartIfPlaying': rom[SND_RESTART + sound] != 0,
            'tracks': tracks_of(rom, sound),
            'endTick': end_tick,
            'writes': writes,
        }
        print('cmd %s %-28s writes=%4d endTick=%s' % (key, info['name'], len(writes), end_tick))
    out = {
        'format': 'marble-rom-sfx-v1',
        'description': ann['description'],
        'source': ann['source'],
        'tickSeconds': TICK_CYCLES / CPU_HZ,
        'cues': ann['cues'],
        'commands': commands,
    }
    with open(out_path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')


if __name__ == '__main__':
    main()
