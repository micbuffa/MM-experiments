import { describe, expect, it } from 'vitest';
import {
  ROM_ICE_ZONES,
  ROM_ICE_ZONE_TAGS,
  arcadeCellAt,
  iceZoneAt,
  isIceAtWorld,
  isIceCell,
} from './romSurfaceZones';

function iceCells(course: number, size = 140) {
  const cells: string[] = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (isIceCell(course, x, z)) cells.push(`${x},${z}`);
    }
  }
  return cells;
}

describe('romSurfaceZones', () => {
  it('maps the Beginner Race ice to the ROM rectangle x 90..105, z 94..107', () => {
    const cells = iceCells(2);
    expect(cells).toHaveLength(16 * 14);
    expect(isIceCell(2, 90, 94)).toBe(true);
    expect(isIceCell(2, 105, 107)).toBe(true);
    expect(isIceCell(2, 89, 100)).toBe(false);
    expect(isIceCell(2, 106, 100)).toBe(false);
    expect(isIceCell(2, 98, 93)).toBe(false);
    expect(isIceCell(2, 98, 108)).toBe(false);
    expect(iceZoneAt(2, 98, 100)?.tag).toBe(0x10);
  });

  it('keeps Practice, Intermediate and Silly Race free of ice', () => {
    expect(iceCells(1)).toEqual([]);
    expect(iceCells(3)).toEqual([]);
    expect(iceCells(5)).toEqual([]);
  });

  it('uses the anchor as the maximum corner of each Ultimate Race zone', () => {
    const ultimate = ROM_ICE_ZONES.filter((zone) => zone.course === 6);
    expect(ultimate.map((zone) => zone.tag)).toEqual([
      0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
    ]);
    for (const zone of ultimate) {
      expect(zone.maxX).toBe(zone.anchor.x);
      expect(zone.maxZ).toBe(zone.anchor.z);
    }
    // The 0x34 + 0x35 pair forms the ice diamond plateau x 69..79, z 71..81.
    expect(isIceCell(6, 69, 71)).toBe(true);
    expect(isIceCell(6, 79, 71)).toBe(true);
    expect(isIceCell(6, 79, 79)).toBe(false);
    expect(isIceCell(6, 88, 104)).toBe(true);
    expect(iceCells(6)).toHaveLength(8 + 8 + 88 + 24 + 18 + 6);
  });

  it('decodes the two Aerial Race line zones as one cell wide and 18 long', () => {
    // The lines cross at (22, 23), so 18 + 18 - 1 distinct cells.
    expect(iceCells(4)).toHaveLength(35);
    expect(iceZoneAt(4, 22, 23)?.tag).toBe(0x17);
    expect(isIceCell(4, 22, 9)).toBe(true);
    expect(isIceCell(4, 22, 26)).toBe(true);
    expect(isIceCell(4, 22, 27)).toBe(false);
    expect(isIceCell(4, 27, 23)).toBe(true);
    expect(isIceCell(4, 28, 23)).toBe(false);
  });

  it('only lists tags that the ROM excludes from input and friction', () => {
    for (const zone of ROM_ICE_ZONES) {
      expect(ROM_ICE_ZONE_TAGS).toContain(zone.tag);
      expect(zone.minX).toBeLessThanOrEqual(zone.maxX);
      expect(zone.minZ).toBeLessThanOrEqual(zone.maxZ);
    }
  });

  it('converts world positions to arcade cells with the layer origin', () => {
    const layer = { columns: 130, rows: 130, origin: { x: 0, z: 0 } };
    // World 0 is the layer centre, cell 65.
    expect(arcadeCellAt(layer, 0, 0)).toEqual({ x: 65, z: 65 });
    expect(arcadeCellAt(layer, 98 - 65 + 0.5, 100 - 65 + 0.99)).toEqual({
      x: 98,
      z: 100,
    });
    const shifted = { columns: 40, rows: 40, origin: { x: 10, z: 11 } };
    expect(arcadeCellAt(shifted, -20, -20)).toEqual({ x: 10, z: 11 });
  });

  it('tests ice from a world position on a Remaster level', () => {
    const level = {
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells: [],
          defaultSurface: 'stone' as const,
        },
      ],
    };
    expect(isIceAtWorld(level, 98.5 - 65, 100.5 - 65)).toBe(true);
    expect(isIceAtWorld(level, 80.5 - 65, 100.5 - 65)).toBe(false);
    expect(isIceAtWorld({ ...level, courseIndex: 1 }, 33.5, 35.5)).toBe(false);
    expect(isIceAtWorld({ courseIndex: 2, heightLayers: [] }, 0, 0)).toBe(
      false,
    );
  });
});
