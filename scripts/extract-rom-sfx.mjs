#!/usr/bin/env node
/**
 * Local developer tool: runs the Atari System 1 6502 sound CPU ROMs
 * (136033.421 + 136033.422 from local roms/marble.zip) to capture the
 * exact original YM2151 + POKEY register streams for Marble Madness SFX.
 *
 * Usage:
 *   node scripts/extract-rom-sfx.mjs --scan          # list all sound command IDs
 *   node scripts/extract-rom-sfx.mjs --export        # export mapped SFX .vgm files
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROM_421 = execFileSync('unzip', ['-p', 'roms/marble.zip', '136033.421']);
const ROM_422 = execFileSync('unzip', ['-p', 'roms/marble.zip', '136033.422']);

function createAtariSys1SoundCpu() {
  const ram = new Uint8Array(0x1000);
  let opmAddr = 0;
  let opmStatus = 0;
  let latchIn = 0;
  let opmTimerA = 0;
  let opmTimerACtrl = 0;

  let A = 0;
  let X = 0;
  let Y = 0;
  let SP = 0xff;
  let P = 0x24; // I=1, U=1
  let PC = 0;

  const events = [];
  let sampleClock = 0;
  const unknownWrites = new Set();

  function read(addr) {
    addr &= 0xffff;
    if (addr < 0x1000) return ram[addr];
    if (addr >= 0x8000 && addr < 0xc000) return ROM_421[addr - 0x8000];
    if (addr >= 0xc000) return ROM_422[addr - 0xc000];
    if (addr === 0x1801) return opmStatus;
    if (addr === 0x1810) return latchIn;
    if (addr === 0x1820) return 0x80; // bit7=1 (normal mode, skip RAM test), bit4=0 (ready)
    if (addr >= 0x1800 && addr < 0x1900) return 0;
    return 0;
  }

  function write(addr, val) {
    addr &= 0xffff;
    val &= 0xff;
    if (addr < 0x1000) {
      ram[addr] = val;
      return;
    }
    if (addr === 0x1800) {
      opmAddr = val;
      return;
    }
    if (addr === 0x1801) {
      if (opmAddr === 0x10) opmTimerA = (opmTimerA & 3) | (val << 2);
      else if (opmAddr === 0x11) opmTimerA = (opmTimerA & 0x3fc) | (val & 3);
      else if (opmAddr === 0x14) {
        opmTimerACtrl = val;
        if (val & 0x10) opmStatus &= ~0x01;
        if (val & 0x20) opmStatus &= ~0x02;
      } else {
        events.push([sampleClock, 0, opmAddr, val]);
      }
      return;
    }
    if (addr >= 0x1870 && addr <= 0x187f) {
      events.push([sampleClock, 1, addr - 0x1870, val]);
      return;
    }
    if (addr >= 0x1810 && addr <= 0x182f) return;
    unknownWrites.add(addr.toString(16));
  }

  const read16 = (a) => read(a) | (read((a + 1) & 0xffff) << 8);
  const push = (v) => {
    ram[0x100 + SP] = v & 0xff;
    SP = (SP - 1) & 0xff;
  };
  const pull = () => {
    SP = (SP + 1) & 0xff;
    return ram[0x100 + SP];
  };
  const setZN = (v) => {
    v &= 0xff;
    P = (P & ~0x82) | (v === 0 ? 0x02 : 0) | (v & 0x80);
    return v;
  };

  function adc(v) {
    const c = P & 1;
    const sum = A + v + c;
    const ov = (~(A ^ v) & (A ^ sum) & 0x80) !== 0;
    P = (P & ~0x41) | (sum > 0xff ? 1 : 0) | (ov ? 0x40 : 0);
    A = setZN(sum);
  }
  function sbc(v) {
    adc(v ^ 0xff);
  }
  function cmp(reg, v) {
    const diff = reg - v;
    P = (P & ~0x01) | (reg >= v ? 1 : 0);
    setZN(diff);
  }
  function branch(cond) {
    const off = read(PC++);
    if (cond) {
      PC = (PC + (off < 128 ? off : off - 256)) & 0xffff;
    }
  }

  const zp = () => read(PC++);
  const zpx = () => (read(PC++) + X) & 0xff;
  const zpy = () => (read(PC++) + Y) & 0xff;
  const abs = () => {
    const a = read16(PC);
    PC = (PC + 2) & 0xffff;
    return a;
  };
  const absx = () => (abs() + X) & 0xffff;
  const absy = () => (abs() + Y) & 0xffff;
  const indx = () => {
    const z = (read(PC++) + X) & 0xff;
    return ram[z] | (ram[(z + 1) & 0xff] << 8);
  };
  const indy = () => {
    const z = read(PC++);
    return ((ram[z] | (ram[(z + 1) & 0xff] << 8)) + Y) & 0xffff;
  };

  function step() {
    const op = read(PC++);
    let a;
    let v;
    switch (op) {
      case 0x00:
        PC = (PC + 1) & 0xffff;
        push(PC >> 8);
        push(PC & 0xff);
        push(P | 0x30);
        P |= 4;
        PC = read16(0xfffe);
        break;
      case 0x01:
        A = setZN(A | read(indx()));
        break;
      case 0x05:
        A = setZN(A | ram[zp()]);
        break;
      case 0x06:
        a = zp();
        v = ram[a];
        P = (P & ~1) | (v >> 7);
        ram[a] = setZN(v << 1);
        break;
      case 0x08:
        push(P | 0x30);
        break;
      case 0x09:
        A = setZN(A | read(PC++));
        break;
      case 0x0a:
        P = (P & ~1) | (A >> 7);
        A = setZN(A << 1);
        break;
      case 0x0d:
        A = setZN(A | read(abs()));
        break;
      case 0x0e:
        a = abs();
        v = read(a);
        P = (P & ~1) | (v >> 7);
        write(a, setZN(v << 1));
        break;
      case 0x10:
        branch((P & 0x80) === 0);
        break;
      case 0x11:
        A = setZN(A | read(indy()));
        break;
      case 0x15:
        A = setZN(A | ram[zpx()]);
        break;
      case 0x16:
        a = zpx();
        v = ram[a];
        P = (P & ~1) | (v >> 7);
        ram[a] = setZN(v << 1);
        break;
      case 0x18:
        P &= ~0x01;
        break;
      case 0x19:
        A = setZN(A | read(absy()));
        break;
      case 0x1d:
        A = setZN(A | read(absx()));
        break;
      case 0x1e:
        a = absx();
        v = read(a);
        P = (P & ~1) | (v >> 7);
        write(a, setZN(v << 1));
        break;
      case 0x20:
        a = abs();
        push((PC - 1) >> 8);
        push((PC - 1) & 0xff);
        PC = a;
        break;
      case 0x21:
        A = setZN(A & read(indx()));
        break;
      case 0x24:
        v = ram[zp()];
        P = (P & ~0xc2) | (v & 0xc0) | ((A & v) === 0 ? 2 : 0);
        break;
      case 0x25:
        A = setZN(A & ram[zp()]);
        break;
      case 0x26:
        a = zp();
        v = ram[a];
        {
          const c = P & 1;
          P = (P & ~1) | (v >> 7);
          ram[a] = setZN((v << 1) | c);
        }
        break;
      case 0x28:
        P = (pull() & ~0x10) | 0x20;
        break;
      case 0x29:
        A = setZN(A & read(PC++));
        break;
      case 0x2a:
        {
          const c = P & 1;
          P = (P & ~1) | (A >> 7);
          A = setZN((A << 1) | c);
        }
        break;
      case 0x2c:
        v = read(abs());
        P = (P & ~0xc2) | (v & 0xc0) | ((A & v) === 0 ? 2 : 0);
        break;
      case 0x2d:
        A = setZN(A & read(abs()));
        break;
      case 0x2e:
        a = abs();
        v = read(a);
        {
          const c = P & 1;
          P = (P & ~1) | (v >> 7);
          write(a, setZN((v << 1) | c));
        }
        break;
      case 0x30:
        branch((P & 0x80) !== 0);
        break;
      case 0x31:
        A = setZN(A & read(indy()));
        break;
      case 0x35:
        A = setZN(A & ram[zpx()]);
        break;
      case 0x36:
        a = zpx();
        v = ram[a];
        {
          const c = P & 1;
          P = (P & ~1) | (v >> 7);
          ram[a] = setZN((v << 1) | c);
        }
        break;
      case 0x38:
        P |= 0x01;
        break;
      case 0x39:
        A = setZN(A & read(absy()));
        break;
      case 0x3d:
        A = setZN(A & read(absx()));
        break;
      case 0x3e:
        a = absx();
        v = read(a);
        {
          const c = P & 1;
          P = (P & ~1) | (v >> 7);
          write(a, setZN((v << 1) | c));
        }
        break;
      case 0x40:
        P = (pull() & ~0x10) | 0x20;
        {
          const lo = pull();
          const hi = pull();
          PC = lo | (hi << 8);
        }
        break;
      case 0x41:
        A = setZN(A ^ read(indx()));
        break;
      case 0x45:
        A = setZN(A ^ ram[zp()]);
        break;
      case 0x46:
        a = zp();
        v = ram[a];
        P = (P & ~1) | (v & 1);
        ram[a] = setZN(v >> 1);
        break;
      case 0x48:
        push(A);
        break;
      case 0x49:
        A = setZN(A ^ read(PC++));
        break;
      case 0x4a:
        P = (P & ~1) | (A & 1);
        A = setZN(A >> 1);
        break;
      case 0x4c:
        PC = abs();
        break;
      case 0x4d:
        A = setZN(A ^ read(abs()));
        break;
      case 0x4e:
        a = abs();
        v = read(a);
        P = (P & ~1) | (v & 1);
        write(a, setZN(v >> 1));
        break;
      case 0x50:
        branch((P & 0x40) === 0);
        break;
      case 0x51:
        A = setZN(A ^ read(indy()));
        break;
      case 0x55:
        A = setZN(A ^ ram[zpx()]);
        break;
      case 0x56:
        a = zpx();
        v = ram[a];
        P = (P & ~1) | (v & 1);
        ram[a] = setZN(v >> 1);
        break;
      case 0x58:
        P &= ~0x04;
        break;
      case 0x59:
        A = setZN(A ^ read(absy()));
        break;
      case 0x5d:
        A = setZN(A ^ read(absx()));
        break;
      case 0x5e:
        a = absx();
        v = read(a);
        P = (P & ~1) | (v & 1);
        write(a, setZN(v >> 1));
        break;
      case 0x60:
        {
          const lo = pull();
          const hi = pull();
          PC = ((lo | (hi << 8)) + 1) & 0xffff;
        }
        break;
      case 0x61:
        adc(read(indx()));
        break;
      case 0x65:
        adc(ram[zp()]);
        break;
      case 0x66:
        a = zp();
        v = ram[a];
        {
          const c = (P & 1) << 7;
          P = (P & ~1) | (v & 1);
          ram[a] = setZN((v >> 1) | c);
        }
        break;
      case 0x68:
        A = setZN(pull());
        break;
      case 0x69:
        adc(read(PC++));
        break;
      case 0x6a:
        {
          const c = (P & 1) << 7;
          P = (P & ~1) | (A & 1);
          A = setZN((A >> 1) | c);
        }
        break;
      case 0x6c:
        a = abs();
        PC = read(a) | (read((a & 0xff00) | ((a + 1) & 0xff)) << 8);
        break;
      case 0x6d:
        adc(read(abs()));
        break;
      case 0x6e:
        a = abs();
        v = read(a);
        {
          const c = (P & 1) << 7;
          P = (P & ~1) | (v & 1);
          write(a, setZN((v >> 1) | c));
        }
        break;
      case 0x70:
        branch((P & 0x40) !== 0);
        break;
      case 0x71:
        adc(read(indy()));
        break;
      case 0x75:
        adc(ram[zpx()]);
        break;
      case 0x76:
        a = zpx();
        v = ram[a];
        {
          const c = (P & 1) << 7;
          P = (P & ~1) | (v & 1);
          ram[a] = setZN((v >> 1) | c);
        }
        break;
      case 0x78:
        P |= 0x04;
        break;
      case 0x79:
        adc(read(absy()));
        break;
      case 0x7d:
        adc(read(absx()));
        break;
      case 0x7e:
        a = absx();
        v = read(a);
        {
          const c = (P & 1) << 7;
          P = (P & ~1) | (v & 1);
          write(a, setZN((v >> 1) | c));
        }
        break;
      case 0x81:
        write(indx(), A);
        break;
      case 0x84:
        ram[zp()] = Y;
        break;
      case 0x85:
        ram[zp()] = A;
        break;
      case 0x86:
        ram[zp()] = X;
        break;
      case 0x88:
        Y = setZN(Y - 1);
        break;
      case 0x8a:
        A = setZN(X);
        break;
      case 0x8c:
        write(abs(), Y);
        break;
      case 0x8d:
        write(abs(), A);
        break;
      case 0x8e:
        write(abs(), X);
        break;
      case 0x90:
        branch((P & 0x01) === 0);
        break;
      case 0x91:
        write(indy(), A);
        break;
      case 0x94:
        ram[zpx()] = Y;
        break;
      case 0x95:
        ram[zpx()] = A;
        break;
      case 0x96:
        ram[zpy()] = X;
        break;
      case 0x98:
        A = setZN(Y);
        break;
      case 0x99:
        write(absy(), A);
        break;
      case 0x9a:
        SP = X;
        break;
      case 0x9d:
        write(absx(), A);
        break;
      case 0xa0:
        Y = setZN(read(PC++));
        break;
      case 0xa1:
        A = setZN(read(indx()));
        break;
      case 0xa2:
        X = setZN(read(PC++));
        break;
      case 0xa4:
        Y = setZN(ram[zp()]);
        break;
      case 0xa5:
        A = setZN(ram[zp()]);
        break;
      case 0xa6:
        X = setZN(ram[zp()]);
        break;
      case 0xa8:
        Y = setZN(A);
        break;
      case 0xa9:
        A = setZN(read(PC++));
        break;
      case 0xaa:
        X = setZN(A);
        break;
      case 0xac:
        Y = setZN(read(abs()));
        break;
      case 0xad:
        A = setZN(read(abs()));
        break;
      case 0xae:
        X = setZN(read(abs()));
        break;
      case 0xb0:
        branch((P & 0x01) !== 0);
        break;
      case 0xb1:
        A = setZN(read(indy()));
        break;
      case 0xb4:
        Y = setZN(ram[zpx()]);
        break;
      case 0xb5:
        A = setZN(ram[zpx()]);
        break;
      case 0xb6:
        X = setZN(ram[zpy()]);
        break;
      case 0xb8:
        P &= ~0x40;
        break;
      case 0xb9:
        A = setZN(read(absy()));
        break;
      case 0xba:
        X = setZN(SP);
        break;
      case 0xbc:
        Y = setZN(read(absx()));
        break;
      case 0xbd:
        A = setZN(read(absx()));
        break;
      case 0xbe:
        X = setZN(read(absy()));
        break;
      case 0xc0:
        cmp(Y, read(PC++));
        break;
      case 0xc1:
        cmp(A, read(indx()));
        break;
      case 0xc4:
        cmp(Y, ram[zp()]);
        break;
      case 0xc5:
        cmp(A, ram[zp()]);
        break;
      case 0xc6:
        a = zp();
        ram[a] = setZN(ram[a] - 1);
        break;
      case 0xc8:
        Y = setZN(Y + 1);
        break;
      case 0xc9:
        cmp(A, read(PC++));
        break;
      case 0xca:
        X = setZN(X - 1);
        break;
      case 0xcc:
        cmp(Y, read(abs()));
        break;
      case 0xcd:
        cmp(A, read(abs()));
        break;
      case 0xce:
        a = abs();
        write(a, setZN(read(a) - 1));
        break;
      case 0xd0:
        branch((P & 0x02) === 0);
        break;
      case 0xd1:
        cmp(A, read(indy()));
        break;
      case 0xd5:
        cmp(A, ram[zpx()]);
        break;
      case 0xd6:
        a = zpx();
        ram[a] = setZN(ram[a] - 1);
        break;
      case 0xd8:
        P &= ~0x08;
        break;
      case 0xd9:
        cmp(A, read(absy()));
        break;
      case 0xdd:
        cmp(A, read(absx()));
        break;
      case 0xde:
        a = absx();
        write(a, setZN(read(a) - 1));
        break;
      case 0xe0:
        cmp(X, read(PC++));
        break;
      case 0xe1:
        sbc(read(indx()));
        break;
      case 0xe4:
        cmp(X, ram[zp()]);
        break;
      case 0xe5:
        sbc(ram[zp()]);
        break;
      case 0xe6:
        a = zp();
        ram[a] = setZN(ram[a] + 1);
        break;
      case 0xe8:
        X = setZN(X + 1);
        break;
      case 0xe9:
        sbc(read(PC++));
        break;
      case 0xea:
        break;
      case 0xec:
        cmp(X, read(abs()));
        break;
      case 0xed:
        sbc(read(abs()));
        break;
      case 0xee:
        a = abs();
        write(a, setZN(read(a) + 1));
        break;
      case 0xf0:
        branch((P & 0x02) !== 0);
        break;
      case 0xf1:
        sbc(read(indy()));
        break;
      case 0xf5:
        sbc(ram[zpx()]);
        break;
      case 0xf6:
        a = zpx();
        ram[a] = setZN(ram[a] + 1);
        break;
      case 0xf8:
        P |= 0x08;
        break;
      case 0xf9:
        sbc(read(absy()));
        break;
      case 0xfd:
        sbc(read(absx()));
        break;
      case 0xfe:
        a = absx();
        write(a, setZN(read(a) + 1));
        break;
      default:
        throw new Error(
          `Illegal opcode $${op.toString(16)} at $${(PC - 1).toString(16)}`,
        );
    }
  }

  function triggerIrq() {
    if ((P & 0x04) !== 0) return;
    push(PC >> 8);
    push(PC & 0xff);
    push(P & ~0x10);
    P |= 0x04;
    PC = read16(0xfffe);
  }

  function triggerNmi() {
    push(PC >> 8);
    push(PC & 0xff);
    push(P & ~0x10);
    P |= 0x04;
    PC = read16(0xfffa);
  }

  function reset() {
    PC = read16(0xfffc);
    SP = 0xff;
    P = 0x24;
    sampleClock = 0;
    events.length = 0;
    for (let i = 0; i < 40000; i++) step();
  }

  function sendCommand(cmd) {
    latchIn = cmd & 0xff;
    triggerNmi();
    for (let i = 0; i < 4000; i++) step();
  }

  function runTicks(tickCount, samplesPerTick = 184) {
    for (let t = 0; t < tickCount; t++) {
      sampleClock += samplesPerTick;
      if (opmTimerACtrl & 0x04) {
        opmStatus |= 0x01;
        triggerIrq();
      }
      for (let i = 0; i < 3000; i++) step();
    }
  }

  return { reset, sendCommand, runTicks, events, unknownWrites };
}

function encodeVgm(events) {
  const body = [];
  let lastSample = 0;
  for (const [sample, chip, reg, val] of events) {
    let delta = sample - lastSample;
    lastSample = sample;
    while (delta > 0) {
      const chunk = Math.min(0xffff, delta);
      body.push(0x61, chunk & 0xff, (chunk >> 8) & 0xff);
      delta -= chunk;
    }
    if (chip === 0) body.push(0x54, reg & 0xff, val & 0xff);
    else if (chip === 1) body.push(0xbb, reg & 0xff, val & 0xff);
  }
  body.push(0x66);
  const header = Buffer.alloc(0xc0, 0);
  header.write('Vgm ', 0, 'ascii');
  header.writeUInt32LE(0xc0 + body.length - 4, 0x04);
  header.writeUInt32LE(0x00000161, 0x08);
  header.writeUInt32LE(lastSample, 0x18);
  header.writeUInt32LE(3579545, 0x30); // YM2151 clock
  header.writeUInt32LE(0xc0 - 0x34, 0x34); // data offset
  header.writeUInt32LE(1789772, 0xb0); // POKEY clock
  return Buffer.concat([header, Buffer.from(body)]);
}

const args = new Set(process.argv.slice(2));
const log = (msg) => process.stdout.write(`${msg}\n`);
const cpu = createAtariSys1SoundCpu();
cpu.reset();
log(
  `Boot OK! Init writes: ${cpu.events.length} unknown writes: [${[...cpu.unknownWrites].join(', ')}]`,
);

if (args.has('--scan') || args.size === 0) {
  for (let id = 0x1f; id <= 0x67; id++) {
    const c = createAtariSys1SoundCpu();
    c.reset();
    c.events.length = 0;
    c.sendCommand(id);
    c.runTicks(400); // ~1.67s at 240Hz
    const opmEvents = c.events.filter((e) => e[1] === 0);
    const kcs = opmEvents
      .filter((e) => e[2] >= 0x28 && e[2] <= 0x2f)
      .map((e) => e[3]);
    const keyOns = opmEvents.filter((e) => e[2] === 0x08 && e[3] & 0x78);
    const pokeyAudc = c.events.filter(
      (e) =>
        e[1] === 1 &&
        (e[2] === 1 || e[2] === 3 || e[2] === 5 || e[2] === 7) &&
        (e[3] & 0x0f) > 0,
    );
    const opmDur =
      opmEvents.length >= 2
        ? Math.round(((opmEvents.at(-1)[0] - opmEvents[0][0]) / 44100) * 1000)
        : 0;
    const pkDur =
      pokeyAudc.length >= 2
        ? Math.round(((pokeyAudc.at(-1)[0] - pokeyAudc[0][0]) / 44100) * 1000)
        : 0;
    if (keyOns.length === 0 && pokeyAudc.length === 0) continue;
    const kcSummary =
      kcs.length > 0
        ? `kc:${kcs[0].toString(16)}->${kcs.at(-1).toString(16)} (${Math.min(...kcs).toString(16)}..${Math.max(...kcs).toString(16)}, n=${kcs.length})`
        : 'no-opm';
    const pkSummary =
      pokeyAudc.length > 0
        ? `pk:${pokeyAudc.length}w ${pkDur}ms c0=${pokeyAudc[0][3].toString(16)}`
        : '';
    log(
      `0x${id.toString(16).padStart(2, '0')} | kon=${String(keyOns.length).padStart(2)} ${String(opmDur).padStart(4)}ms ${kcSummary.padEnd(32)} | ${pkSummary}`,
    );
  }
}

if (args.has('--detail')) {
  const ids = [
    0x1f, 0x23, 0x27, 0x2b, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x35, 0x37, 0x38,
    0x39, 0x3c, 0x3d, 0x41, 0x42, 0x43, 0x45, 0x53, 0x54, 0x5a, 0x5d, 0x5e,
    0x5f, 0x60,
  ];
  for (const id of ids) {
    const c = createAtariSys1SoundCpu();
    c.reset();
    c.events.length = 0;
    c.sendCommand(id);
    c.runTicks(400);
    const kcs = c.events
      .filter((e) => e[1] === 0 && e[2] >= 0x28 && e[2] <= 0x2f && e[3] > 0)
      .map((e) => e[3].toString(16));
    const rlfb = c.events.find(
      (e) => e[1] === 0 && e[2] >= 0x20 && e[2] <= 0x27,
    );
    const pk = c.events
      .filter(
        (e) =>
          e[1] === 1 &&
          (e[2] === 1 || e[2] === 3 || e[2] === 5 || e[2] === 7) &&
          (e[3] & 0xf) > 0,
      )
      .slice(0, 12)
      .map((e) => `c${e[2] >> 1}:${e[3].toString(16)}`);
    log(
      `0x${id.toString(16)}: alg=${rlfb ? rlfb[3] & 7 : '-'} fb=${rlfb ? (rlfb[3] >> 3) & 7 : '-'} kcs=[${kcs.slice(0, 18).join(',')}] ${pk.length ? 'pk=[' + pk.join(',') + ']' : ''}`,
    );
  }
}

// 100% 68010-verified sound command IDs (from JSR 0x158ac call sites in roms/marble.zip).
const NAMED_SFX = [
  ['sfx-wall-bounce.vgm', 0x34, 140], // 0x1b8fa: authentic 68010 wall-rebound knock (now rendered cycle-exact via ymfm!)
  ['sfx-marble-clack.vgm', 0x32, 110], // 0x1bf9c: player <-> Black Marble clack
  ['sfx-pvp-clack.vgm', 0x37, 130], // 0x1bfac: player <-> player clack
  ['sfx-impact.vgm', 0x5d, 100], // 0x124da: floor landing thud (POKEY)
  ['sfx-fall.vgm', 0x45, 300], // 0x12482: airborne fall whistle (~1.25 s)
  ['sfx-void-fall.vgm', 0x3d, 260], // 0x25c5a: void fall vanish
  ['sfx-shatter.vgm', 0x38, 170], // 0x25bdc: marble shatter
  ['sfx-broom.vgm', 0x5f, 260], // 0x26068: broom sweep (POKEY)
  ['sfx-dizzy.vgm', 0x39, 380], // 0x15076 / 0x25db0: dizzy stars (~1.58 s)
  ['sfx-respawn.vgm', 0x3c, 220], // 0x25c44: marble respawn
  ['sfx-worm-eat.vgm', 0x33, 240], // 0x153a2: worm swallows marble
  ['sfx-pipe.vgm', 0x35, 220], // 0x2a46a: pipe traversal
  ['sfx-ice-enter.vgm', 0x43, 180], // 0x2b19c: enter Level 2 ice zone (0x10)
  ['sfx-ice-leave.vgm', 0x44, 120], // 0x2b1ee: leave Level 2 ice zone
  ['sfx-acid-dissolve.vgm', 0x5e, 260], // 0x1769e: Level 3 acid amoeba dissolve (POKEY fizz)
  ['sfx-countdown.vgm', 0x41, 120], // low-time countdown tick
];

if (args.has('--export')) {
  const outDir = join('local-roms', 'original_FX_and_musics', 'sfx');
  mkdirSync(outDir, { recursive: true });
  for (const [filename, id, ticks] of NAMED_SFX) {
    const c = createAtariSys1SoundCpu();
    c.reset();
    c.events.length = 0;
    c.sendCommand(id);
    c.runTicks(ticks);
    // Filter out idle POKEY ch0..3 zero-volume refresh writes so FM-only SFX
    // never clobber the live rolling sound on POKEY channel 0.
    // For POKEY SFX that use ch0 (reg 0/1), remap ch0 -> ch1 (reg 2/3).
    const activePokeyCh = new Set();
    for (const [, chip, reg, val] of c.events) {
      if (
        chip === 1 &&
        (reg === 1 || reg === 3 || reg === 5 || reg === 7) &&
        (val & 0x0f) > 0
      ) {
        activePokeyCh.add(reg >> 1);
      }
    }
    const filtered = [];
    for (const [t, chip, reg, val] of c.events) {
      if (chip === 0) {
        filtered.push([t, 0, reg, val]);
      } else if (chip === 1 && reg <= 7) {
        const ch = reg >> 1;
        if (!activePokeyCh.has(ch)) continue;
        // Remap POKEY ch 0 -> ch 1 so rolling (ch 0) stays untouched
        const mappedReg = ch === 0 ? reg + 2 : reg;
        filtered.push([t, 1, mappedReg, val]);
      } else if (chip === 1 && reg === 8 && activePokeyCh.size > 0) {
        filtered.push([t, 1, reg, val]);
      }
    }
    if (filtered.length > 0) {
      const t0 = filtered[0][0];
      const norm = filtered.map(([t, ch, r, v]) => [t - t0, ch, r, v]);
      // Ensure any used POKEY SFX channel is cleanly silenced at the end
      const tEnd = norm.at(-1)[0] + 441;
      for (const ch of activePokeyCh) {
        const mappedCh = ch === 0 ? 1 : ch;
        norm.push([tEnd, 1, mappedCh * 2 + 1, 0]);
      }
      const outPath = join(outDir, filename);
      writeFileSync(outPath, encodeVgm(norm));
      log(
        `Exported ${outPath} (cmd 0x${id.toString(16)}, ${norm.length} writes)`,
      );
    }
  }
}
