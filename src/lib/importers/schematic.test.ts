import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatBlockState } from '../blockstate';
import { computeMaterials } from '../materials';
import { blueprintFromStructure, structureFromBlueprint, totalBlocks } from '../structure';
import { formatFromFileName, importSchematic, SchematicError } from './schematic';

const fixture = (name: string) =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))));

describe('formatFromFileName', () => {
  it('erkennt die vier Endungen', () => {
    expect(formatFromFileName('Farm.LITEMATIC')).toBe('litematic');
    expect(formatFromFileName('a.schem')).toBe('schem');
    expect(formatFromFileName('a.nbt')).toBe('nbt');
    expect(formatFromFileName('a.mcstructure')).toBe('mcstructure');
    expect(formatFromFileName('a.schematic')).toBeNull();
  });
});

describe('importSchematic – echte .schem-Datei (WorldEdit, Sponge v3)', () => {
  it('liest Größe, Blöcke, Version und Zustände', async () => {
    const r = await importSchematic(fixture('worldedit-v3.schem'), 'worldedit-v3.schem');
    expect(r.format).toBe('schem');
    expect(r.edition).toBe('java');
    expect(r.structure.size).toEqual({ x: 16, y: 4, z: 16 });
    expect(r.blockCount).toBe(1016);
    expect(r.blockCount).toBe(totalBlocks(r.structure));
    expect(r.mcVersion).toBe('1.21.1');
    expect(r.mcVersionExact).toBe(true);
    const states = r.structure.palette.map((s) => formatBlockState(s));
    expect(states[0]).toBe('minecraft:air');
    expect(states).toContain('minecraft:stripped_oak_wood[axis=y]');
    expect(new Set(states).size).toBe(states.length);
  });

  it('erkennt das Format auch ohne passende Endung', async () => {
    const r = await importSchematic(fixture('worldedit-v3.schem'), 'download.bin');
    expect(r.format).toBe('schem');
    expect(r.blockCount).toBe(1016);
  });

  it('ergibt einen gültigen Bauplan und eine Materialliste', async () => {
    const r = await importSchematic(fixture('worldedit-v3.schem'), 'x.schem');
    const bp = blueprintFromStructure(r.structure);
    expect(bp.format).toBe('indexed');
    const back = structureFromBlueprint(bp);
    expect(totalBlocks(back)).toBe(1016);
    const materials = computeMaterials(back);
    expect(materials.items.size).toBeGreaterThan(50);
  });
});

describe('importSchematic – echte .mcstructure-Datei (Bedrock)', () => {
  it('liest die Datei und übersetzt Bedrock-Zustände', async () => {
    const r = await importSchematic(fixture('monument.mcstructure'), 'monument.mcstructure');
    expect(r.format).toBe('mcstructure');
    expect(r.edition).toBe('bedrock');
    expect(r.structure.size).toEqual({ x: 5, y: 9, z: 5 });
    expect(r.blockCount).toBe(94);
    expect(r.mcVersion).toBe('1.20.30');
    expect(r.structure.syntax).toBe('java');
    const states = r.structure.palette.map((s) => formatBlockState(s));
    expect(states).toContain('minecraft:polished_deepslate_slab[type=bottom]');
    expect(states).toContain('minecraft:polished_deepslate_stairs[facing=east,half=bottom]');
    expect(states.some((s) => s.includes('weirdo_direction') || s.includes('vertical_half'))).toBe(false);
    expect(r.warnings).toEqual([]);
  });

  it('erkennt Bedrock-Dateien auch ohne Endung', async () => {
    const r = await importSchematic(fixture('monument.mcstructure'), 'unbekannt');
    expect(r.format).toBe('mcstructure');
    expect(r.blockCount).toBe(94);
  });
});

describe('importSchematic – Fehlerfälle', () => {
  const fails = async (bytes: Uint8Array, name: string) => {
    try {
      await importSchematic(bytes, name);
      return null;
    } catch (e) {
      return e;
    }
  };

  it('lehnt leere, fremde und ZIP-Dateien verständlich ab', async () => {
    expect(await fails(new Uint8Array(0), 'a.schem')).toBeInstanceOf(SchematicError);
    expect(await fails(new TextEncoder().encode('hallo welt, das ist kein nbt'), 'a.litematic')).toBeInstanceOf(SchematicError);
    const zip = await fails(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]), 'welt.mcworld');
    expect(zip).toBeInstanceOf(SchematicError);
    expect((zip as Error).message).toContain('ZIP');
  });
});
