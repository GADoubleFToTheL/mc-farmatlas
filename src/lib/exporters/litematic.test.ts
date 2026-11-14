import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatBlockState } from '../blockstate';
import { importSchematic } from '../importers/schematic';
import { validateFarm } from '../schema';
import { blockAt, structureFromBlueprint, totalBlocks, type Structure } from '../structure';
import { transformStructure } from '../transform';
import { exportLitematic, packBlockStates } from './litematic';

const farmsDir = fileURLToPath(new URL('../../../data/farms/', import.meta.url));

function sameBlocks(a: Structure, b: Structure): void {
  expect(b.size).toEqual(a.size);
  for (let y = 0; y < a.size.y; y++) {
    for (let z = 0; z < a.size.z; z++) {
      for (let x = 0; x < a.size.x; x++) {
        const expected = formatBlockState(blockAt(a, x, y, z));
        const actual = formatBlockState(blockAt(b, x, y, z));
        if (actual !== expected) throw new Error(`(${x},${y},${z}): erwartet ${expected}, gelesen ${actual}`);
      }
    }
  }
}

describe('packBlockStates', () => {
  it('nutzt mindestens 2 Bit und packt dicht', () => {
    // 2 Bit je Eintrag: 1,2,3,0 → 0b00_11_10_01
    expect([...packBlockStates([1, 2, 3, 0], 4)]).toEqual([0b00111001n]);
    expect(packBlockStates(new Array(32).fill(1), 2)).toHaveLength(1);
    expect(packBlockStates(new Array(33).fill(1), 2)).toHaveLength(2);
  });

  it('lässt Einträge über 64-Bit-Grenzen laufen', () => {
    // 5 Bit je Eintrag: der 13. Eintrag (Bit 60–64) liegt in zwei Zahlen
    const values = new Array(13).fill(0);
    values[12] = 0b10011;
    const packed = new BigUint64Array(packBlockStates(values, 21).buffer);
    expect(packed).toHaveLength(2);
    expect(packed[0]).toBe(0b0011n << 60n);
    expect(packed[1]).toBe(0b1n);
  });
});

describe('exportLitematic', () => {
  const files = readdirSync(farmsDir).filter((f) => f.endsWith('.json'));

  it('wird von einem unabhängigen Leser Block für Block gleich zurückgelesen (alle Farmen mit Bauplan)', async () => {
    let checked = 0;
    for (const file of files) {
      const result = validateFarm(JSON.parse(readFileSync(farmsDir + file, 'utf8')));
      if (!result.ok || !result.farm.blueprint) continue;
      const structure = structureFromBlueprint(result.farm.blueprint);
      const bytes = await exportLitematic(structure, { name: result.farm.name, now: 1 });
      expect(bytes[0]).toBe(0x1f); // gzip
      const back = await importSchematic(bytes, `${result.farm.id}.litematic`);
      expect(back.format).toBe('litematic');
      expect(back.name).toBe(result.farm.name);
      expect(back.mcVersion).toBe('1.21');
      expect(back.blockCount).toBe(totalBlocks(structure));
      sameBlocks(structure, back.structure);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });

  it('exportiert auch gedrehte Baupläne korrekt', async () => {
    const farm = JSON.parse(readFileSync(farmsDir + 'zuckerrohr-beobachter-kolben.json', 'utf8'));
    const rotated = transformStructure(structureFromBlueprint(farm.blueprint), 'rotate-cw');
    const back = await importSchematic(await exportLitematic(rotated, { name: 'Gedreht' }), 'gedreht.litematic');
    sameBlocks(rotated, back.structure);
    expect(back.structure.palette.map((s) => formatBlockState(s))).toContain('minecraft:piston[facing=east]');
  });

  it('verarbeitet große Paletten (echte WorldEdit-Datei, 128 Blockarten)', async () => {
    const fixture = new Uint8Array(readFileSync(fileURLToPath(new URL('../importers/fixtures/worldedit-v3.schem', import.meta.url))));
    const original = await importSchematic(fixture, 'worldedit-v3.schem');
    const back = await importSchematic(await exportLitematic(original.structure, { name: 'Test' }), 'test.litematic');
    sameBlocks(original.structure, back.structure);
  });
});
