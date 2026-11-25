import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SFX_BANK, parseSfxBank } from './sfxBank';

describe('sfxBank', () => {
  it('parses the shipped editable public/assets/audio/sfx-bank.json cleanly', () => {
    const raw = readFileSync(
      resolve(process.cwd(), 'public/assets/audio/sfx-bank.json'),
      'utf8',
    );
    const bank = parseSfxBank(raw);
    expect(bank.format).toBe('remaster-sfx-bank-v1');
    expect(bank.patches.impact.ops).toHaveLength(4);
    expect(bank.rolling.maxVolume).toBeGreaterThan(0);
    expect(bank.events.fall.notes.length).toBeGreaterThan(2);
    expect(DEFAULT_SFX_BANK.format).toBe('remaster-sfx-bank-v1');
  });

  it('rejects invalid bank payloads', () => {
    expect(() => parseSfxBank('{"format":"wrong"}')).toThrow();
  });
});
