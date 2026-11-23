import { describe, expect, it } from 'vitest';
import { parseReferenceOutput, serializeReplay } from './referenceReplay';

const reads = Array.from({ length: 64 }, (_, i) => ({
  frame: 1198 + Math.floor(i / 4),
  offset: i % 4,
  value: i,
}));
const output =
  [1199, 1206, 1212]
    .map(
      (frame) => `REF_POSITION ${frame} 336 240 158.9 48.1 106 153 42 166 55`,
    )
    .join('\n') + '\nREF_COMPLETE 0.271 64 64';

describe('reference replay protocol', () => {
  it('serializes complete ports in deterministic order with a fixed phase', () => {
    expect(serializeReplay([...reads].reverse(), -1)).toBe(
      serializeReplay(reads, -1),
    );
    expect(serializeReplay(reads, -1)).toContain(
      '[1198]={[0]=0,[1]=1,[2]=2,[3]=3}',
    );
    expect(serializeReplay(reads, -1)).toContain('local phaseShift=-1');
  });
  it('rejects incomplete or duplicate captures', () => {
    expect(() => serializeReplay(reads.slice(1), 0)).toThrow();
    expect(() => serializeReplay([...reads.slice(1), reads[1]!], 0)).toThrow(
      'Duplicate',
    );
  });
  it.each([
    { frame: 1197 },
    { frame: NaN },
    { offset: 4 },
    { offset: -1 },
    { value: 256 },
    { value: -1 },
    { value: 1.5 },
  ])('rejects invalid integer samples %j', (invalid) => {
    expect(() =>
      serializeReplay([{ ...reads[0]!, ...invalid }, ...reads.slice(1)], 0),
    ).toThrow();
  });
  it('rejects undocumented phase values', () => {
    expect(() => serializeReplay(reads, 3)).toThrow();
  });
  it('parses verified native geometry and positions amid ordinary MAME output', () => {
    expect(
      parseReferenceOutput(`MAME log\n${output}\nAverage speed`)[2],
    ).toEqual({
      frame: 1212,
      width: 336,
      height: 240,
      x: 158.9,
      y: 48.1,
      pixels: 106,
      bounds: [153, 42, 166, 55],
    });
  });
  it.each([
    output.replace('64 64', '64 63'),
    output.replace('0.271', '0.272'),
    output.replace('REF_COMPLETE', 'INCOMPLETE'),
    output.replace('REF_POSITION 1206', 'NO_MARKER 1206'),
    output.replace('336 240', '640 480'),
    output.replace('158.9', 'NaN'),
    output.replace('48.1 106', '48.1 0'),
    output.replace('158.9', '400'),
  ])('rejects incomplete or incompatible runs', (invalid) => {
    expect(() => parseReferenceOutput(invalid)).toThrow();
  });
});
