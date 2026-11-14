import { describe, expect, it } from 'vitest';
import { parseBlockState } from './blockstate';
import { validateFarm, type Blueprint } from './schema';
import {
  AIR,
  blockAt,
  blueprintFromStructure,
  countBlocks,
  defaultStart,
  structureFromBlueprint,
  totalBlocks,
  trimStructure,
  type Structure,
} from './structure';

const grid: Blueprint = {
  format: 'grid',
  stateSyntax: 'java',
  start: { x: 1, y: 0, z: 0 },
  palette: { S: 'minecraft:stone', P: 'minecraft:piston[facing=north]', a: 'minecraft:air' },
  layers: [
    ['.SS', 'S.S'],
    ['aP.', '...'],
  ],
};

describe('structureFromBlueprint', () => {
  const s = structureFromBlueprint(grid);
  it('liest Größe, Blöcke und Luft', () => {
    expect(s.size).toEqual({ x: 3, y: 2, z: 2 });
    expect(blockAt(s, 1, 0, 0).id).toBe('minecraft:stone');
    expect(blockAt(s, 0, 0, 0)).toBe(AIR);
    expect(blockAt(s, 0, 1, 0)).toBe(AIR);
    expect(blockAt(s, 1, 1, 0)).toEqual(parseBlockState('minecraft:piston[facing=north]'));
    expect(blockAt(s, 9, 9, 9)).toBe(AIR);
    expect(totalBlocks(s)).toBe(5);
    expect([...countBlocks(s, 1).values()]).toEqual([1]);
  });
});

describe('Index-Format', () => {
  const s = structureFromBlueprint(grid);
  it('übersteht die Umwandlung in beide Formate unverändert', () => {
    for (const format of ['grid', 'indexed'] as const) {
      const bp = blueprintFromStructure(s, grid.start, format);
      expect(bp.format).toBe(format);
      const back = structureFromBlueprint(bp);
      expect(back.size).toEqual(s.size);
      expect([...back.blocks].map((i) => back.palette[i])).toEqual([...s.blocks].map((i) => s.palette[i]));
    }
  });

  it('ist lauflängenkodiert und besteht die Schema-Prüfung', () => {
    const bp = blueprintFromStructure(s, grid.start, 'indexed');
    if (bp.format !== 'indexed') throw new Error('falsches Format');
    expect(bp.palette[0]).toBe('minecraft:air');
    expect(bp.runs).toEqual([0, 1, 1, 3, 0, 1, 1, 1, 0, 1, 2, 1, 0, 4]);
  });

  it('wählt bei kleinen Bauplänen das Zeichenraster', () => {
    expect(blueprintFromStructure(s).format).toBe('grid');
  });

  it('wählt bei großen Bauplänen oder Hinweisen das Index-Format', () => {
    const big: Structure = { size: { x: 60, y: 1, z: 2 }, syntax: 'java', palette: s.palette, blocks: new Uint16Array(120).fill(1) };
    expect(blueprintFromStructure(big).format).toBe('indexed');
    const noted: Structure = { ...s, paletteNotes: [undefined, 'Hinweis', undefined] };
    const bp = blueprintFromStructure(noted);
    expect(bp.format).toBe('indexed');
    expect(structureFromBlueprint(bp).paletteNotes?.[1]).toBe('Hinweis');
  });
});

describe('trimStructure', () => {
  it('entfernt leere Ränder, unbenutzte Paletteneinträge und verschiebt Behälter', () => {
    const size = { x: 4, y: 3, z: 4 };
    const blocks = new Uint16Array(48);
    blocks[(1 * 4 + 2) * 4 + 1] = 2; // x=1, y=1, z=2
    blocks[(1 * 4 + 2) * 4 + 2] = 2; // x=2, y=1, z=2
    const s: Structure = {
      size,
      syntax: 'java',
      palette: [AIR, parseBlockState('minecraft:dirt'), parseBlockState('minecraft:chest')],
      blocks,
      containers: [{ x: 2, y: 1, z: 2, items: [{ item: 'minecraft:stone', count: 3 }] }],
    };
    const t = trimStructure(s)!;
    expect(t.size).toEqual({ x: 2, y: 1, z: 1 });
    expect(t.palette.map((p) => p.id)).toEqual(['minecraft:air', 'minecraft:chest']);
    expect([...t.blocks]).toEqual([1, 1]);
    expect(t.containers).toEqual([{ x: 1, y: 0, z: 0, items: [{ item: 'minecraft:stone', count: 3 }] }]);
    expect(defaultStart(t)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('meldet eine leere Struktur', () => {
    expect(trimStructure({ size: { x: 1, y: 1, z: 1 }, syntax: 'java', palette: [AIR], blocks: new Uint16Array(1) })).toBeNull();
  });
});

describe('Schema für das Index-Format', () => {
  const base = {
    schema: 1, id: 'x', name: 'X', category: 'sonstiges', outputs: [],
    editions: { java: { from: '1.21', to: '26.3' } }, difficulty: 3, rate: null, status: 'ungeprueft',
    requirements: { dimension: ['overworld'], biome: null, yLevel: null, specialLocation: null,
      afk: { required: false, distance: null, note: null }, mobs: [], simulationDistance: null, chunkAligned: false },
    principle: 'p', steps: [], pitfalls: [], blueprintOrigin: { kind: 'import', note: 'n' }, extras: [], sources: [],
  };
  const indexed = {
    format: 'indexed', stateSyntax: 'java', start: { x: 0, y: 0, z: 0 }, size: { x: 2, y: 1, z: 2 },
    palette: ['minecraft:air', 'minecraft:stone'], runs: [1, 3, 0, 1],
  };
  const check = (bp: unknown) => {
    const r = validateFarm({ ...base, blueprint: bp }, { local: true });
    return r.ok ? [] : r.problems.map((p) => p.message);
  };

  it('akzeptiert einen gültigen Plan – lokal auch ohne Quelle', () => {
    expect(check(indexed)).toEqual([]);
    expect(validateFarm({ ...base, blueprint: indexed }).ok).toBe(false);
  });

  it('erkennt falsche Läufe, Indizes und Startblöcke', () => {
    expect(check({ ...indexed, runs: [1, 3] }).join()).toContain('verlangt 4');
    expect(check({ ...indexed, runs: [5, 4] }).join()).toContain('existiert nicht');
    expect(check({ ...indexed, runs: [1, 3, 0] }).join()).toContain('Paare');
    expect(check({ ...indexed, start: { x: 1, y: 0, z: 1 } }).join()).toContain('nicht Luft');
    expect(check({ ...indexed, start: { x: 2, y: 0, z: 0 } }).join()).toContain('außerhalb');
    expect(check({ ...indexed, palette: ['minecraft:stone', 'minecraft:dirt'] }).join()).toContain('Palettenindex 0');
    expect(check({ ...indexed, containers: [{ x: 5, y: 0, z: 0, items: [{ item: 'minecraft:stone', count: 1 }] }] }).join()).toContain('Behälter');
  });
});
