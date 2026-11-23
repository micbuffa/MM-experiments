import { intermediateOpeningScroll } from '../game/modern/practiceTerrain';
import type { PracticePose } from './practicePose';

export type CheckpointLevel = NonNullable<PracticePose['level']>;

export function matchesRestoredCheckpoint(
  pose: PracticePose | null,
  level: CheckpointLevel,
): boolean {
  if (!pose || pose.level !== level) return false;
  if (level !== 'intermediate') return pose.marble === 'visible';
  return (
    pose.scroll === intermediateOpeningScroll &&
    Math.abs(pose.x - 220) < 1 &&
    Math.abs(pose.z - 108) < 1
  );
}

// This layout belongs to CORE_WASM_SHA256. These are MAME input-port
// accumulators, outside the arcade program's work RAM.
const portBanks = [0x1018a40, 0x1018ac0] as const;
const portsPerBank = 4;
const portCount = portBanks.length * portsPerBank;
const stateBytes = 1_106_168;
const signature = 0x4d4d3202; // MM2, format version 2.
const portsBytes = (1 + portCount) * 4;
const hardwareBytes = 13;
const headerBytes = portsBytes + hardwareBytes;
const slapsticState = 24554108;
const mappedBank = 24509408;
const bankPointer = 24509228;
const bankZeroPointer = 24509232;

export interface IntermediateCheckpoint {
  readonly state: Uint8Array;
  readonly ports: Int32Array;
  readonly hardware: Uint8Array;
}

export function readCheckpointHardware(heap: Uint8Array) {
  const bytes = new Uint8Array(hardwareBytes);
  bytes.set(heap.subarray(slapsticState, slapsticState + 9));
  bytes.set(heap.subarray(mappedBank, mappedBank + 4), 9);
  return bytes;
}

export function restoreCheckpointHardware(heap: Uint8Array, bytes: Uint8Array) {
  const memory = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  const bank = new DataView(bytes.buffer, bytes.byteOffset + 9, 4).getUint32(
    0,
    true,
  );
  if (bank > 3) throw new Error('Banque Atari incompatible.');
  const target = memory.getUint32(bankPointer, true);
  const source =
    bank === 0 ? memory.getUint32(bankZeroPointer, true) : target + bank * 8192;
  if (
    target <= 0 ||
    source <= 0 ||
    target + 8192 > heap.length ||
    source + 8192 > heap.length
  )
    throw new Error('Mémoire Atari incompatible.');
  heap.copyWithin(target, source, source + 8192);
  heap.set(bytes.subarray(0, 9), slapsticState);
  heap.set(bytes.subarray(9), mappedBank);
}

export function readCheckpointPorts(heap: Uint8Array) {
  const memory = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  return Int32Array.from(
    portBanks.flatMap((address) =>
      Array.from({ length: portsPerBank }, (_, i) =>
        memory.getInt32(address + i * 4, true),
      ),
    ),
  );
}

export function restoreCheckpointPorts(heap: Uint8Array, ports: Int32Array) {
  const memory = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  for (const [bank, address] of portBanks.entries())
    for (let i = 0; i < portsPerBank; i++)
      memory.setInt32(address + i * 4, ports[bank * portsPerBank + i]!, true);
}

export function encodeIntermediateCheckpoint(
  state: Uint8Array,
  ports: Int32Array,
  hardware: Uint8Array,
) {
  if (
    state.length !== stateBytes ||
    ports.length !== portCount ||
    hardware.length !== hardwareBytes
  )
    throw new Error('État du niveau 2 incompatible.');
  const bytes = new Uint8Array(headerBytes + stateBytes);
  const header = new DataView(bytes.buffer, 0, headerBytes);
  header.setUint32(0, signature);
  for (const [i, port] of ports.entries())
    header.setInt32(4 + i * 4, port, true);
  bytes.set(hardware, portsBytes);
  bytes.set(state, headerBytes);
  return bytes;
}

export function decodeIntermediateCheckpoint(bytes: Uint8Array) {
  if (bytes.length !== headerBytes + stateBytes) return undefined;
  const header = new DataView(bytes.buffer, bytes.byteOffset, headerBytes);
  if (header.getUint32(0) !== signature) return undefined;
  if (header.getUint32(portsBytes + 9, true) > 3) return undefined;
  return {
    state: bytes.subarray(headerBytes),
    ports: Int32Array.from({ length: portCount }, (_, i) =>
      header.getInt32(4 + i * 4, true),
    ),
    hardware: bytes.subarray(portsBytes, headerBytes),
  } satisfies IntermediateCheckpoint;
}
