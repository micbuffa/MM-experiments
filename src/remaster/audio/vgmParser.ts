import { gunzipSync } from 'fflate';

export type VgmCommand =
  | { readonly type: 'opm'; readonly reg: number; readonly val: number }
  | { readonly type: 'pokey'; readonly reg: number; readonly val: number }
  | { readonly type: 'wait'; readonly samples: number };

export interface ParsedVgm {
  readonly version: number;
  readonly totalSamples: number;
  readonly loopCommandIndex: number | null;
  readonly commands: readonly VgmCommand[];
}

/**
 * Parse an uncompressed `.vgm` or gzipped `.vgz` stream targeting Yamaha YM2151
 * (`0x54`) and Atari POKEY (`0xBB`) chips at the standard 44.1 kHz VGM tick rate.
 */
export function parseVgm(rawBytes: Uint8Array): ParsedVgm {
  const bytes =
    rawBytes.length >= 2 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b
      ? gunzipSync(rawBytes)
      : rawBytes;
  if (
    bytes.length < 0x40 ||
    bytes[0] !== 0x56 ||
    bytes[1] !== 0x67 ||
    bytes[2] !== 0x6d ||
    bytes[3] !== 0x20
  ) {
    throw new Error('En-tête VGM invalide (attendu "Vgm ").');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint32(0x08, true);
  const totalSamples = view.getUint32(0x18, true);
  const loopRel = view.getUint32(0x1c, true);
  const loopByteOffset = loopRel > 0 ? 0x1c + loopRel : -1;
  const dataRel = version >= 0x150 ? view.getUint32(0x34, true) : 0;
  let offset = dataRel > 0 ? 0x34 + dataRel : 0x40;

  const commands: VgmCommand[] = [];
  let loopCommandIndex: number | null = null;

  while (offset < bytes.length) {
    if (offset === loopByteOffset && loopCommandIndex === null) {
      loopCommandIndex = commands.length;
    }
    const cmd = bytes[offset++]!;
    if (cmd === 0x66) break; // End of sound data
    if (cmd === 0x54 && offset + 1 < bytes.length) {
      commands.push({
        type: 'opm',
        reg: bytes[offset++]!,
        val: bytes[offset++]!,
      });
    } else if (cmd === 0xbb && offset + 1 < bytes.length) {
      commands.push({
        type: 'pokey',
        reg: bytes[offset++]!,
        val: bytes[offset++]!,
      });
    } else if (cmd === 0x61 && offset + 1 < bytes.length) {
      const samples = view.getUint16(offset, true);
      offset += 2;
      commands.push({ type: 'wait', samples });
    } else if (cmd === 0x62) {
      commands.push({ type: 'wait', samples: 735 });
    } else if (cmd === 0x63) {
      commands.push({ type: 'wait', samples: 882 });
    } else if (cmd >= 0x70 && cmd <= 0x7f) {
      commands.push({ type: 'wait', samples: (cmd & 0x0f) + 1 });
    } else if (cmd === 0x67 && offset + 5 < bytes.length) {
      // Data block: skip header (0x66, type, uint32 size) + payload.
      const size = view.getUint32(offset + 2, true);
      offset += 6 + size;
    } else if ((cmd >= 0x30 && cmd <= 0x3f) || cmd === 0x4f || cmd === 0x50) {
      offset += 1;
    } else if (
      (cmd >= 0x40 && cmd <= 0x4e) ||
      (cmd >= 0x51 && cmd <= 0x5f) ||
      (cmd >= 0xa0 && cmd <= 0xbf)
    ) {
      offset += 2;
    } else if (cmd >= 0xc0 && cmd <= 0xdf) {
      offset += 3;
    } else if (cmd >= 0xe0 && cmd <= 0xff) {
      offset += 4;
    }
  }

  return { version, totalSamples, loopCommandIndex, commands };
}
