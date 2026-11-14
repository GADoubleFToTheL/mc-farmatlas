import { describe, expect, it } from 'vitest';
import { validateFarm } from './schema';

function baseFarm(): Record<string, unknown> {
  return {
    schema: 1,
    id: 'test-farm',
    name: 'Testfarm',
    category: 'pflanzen',
    outputs: ['minecraft:sugar_cane'],
    editions: { bedrock: { from: '1.21.0', to: '26.62' }, java: { from: '1.21', to: '26.3' } },
    difficulty: 1,
    rate: null,
    status: 'ungeprueft',
    requirements: {
      dimension: ['overworld'],
      biome: null,
      yLevel: null,
      specialLocation: null,
      afk: { required: false, distance: null, note: null },
      mobs: [],
      simulationDistance: null,
      chunkAligned: false,
    },
    principle: 'Ein Testprinzip.',
    steps: [{ text: 'Boden legen.', layers: [1] }],
    pitfalls: [],
    blueprint: {
      format: 'grid',
      stateSyntax: 'java',
      start: { x: 0, y: 0, z: 0 },
      palette: { S: 'minecraft:stone', P: 'minecraft:piston[facing=north]' },
      layers: [
        ['SS', 'SS'],
        ['.P', '..'],
      ],
    },
    blueprintOrigin: { kind: 'standarddesign', note: 'Testplan' },
    extras: [{ item: 'minecraft:water_bucket', count: 1 }],
    sources: [{ title: 'Quelle', author: 'Jemand', url: 'https://example.org/farm' }],
  };
}

function problems(data: unknown): string[] {
  const r = validateFarm(data);
  return r.ok ? [] : r.problems.map((p) => `${p.path}: ${p.message}`);
}

describe('farmSchema', () => {
  it('akzeptiert eine gültige Farm', () => {
    expect(problems(baseFarm())).toEqual([]);
  });

  it('akzeptiert eine Farm ohne Bauplan mit Maßen laut Quelle', () => {
    const farm = {
      ...baseFarm(),
      blueprint: null,
      blueprintOrigin: null,
      steps: [],
      size: { width: 9, height: 12, depth: 9 },
    };
    expect(problems(farm)).toEqual([]);
  });

  it('lehnt unbekannte Felder ab', () => {
    expect(problems({ ...baseFarm(), foo: 1 }).length).toBeGreaterThan(0);
  });

  it('verlangt mindestens eine Edition und gültige Bereiche', () => {
    expect(problems({ ...baseFarm(), editions: {} }).join()).toContain('Mindestens eine Edition');
    expect(problems({ ...baseFarm(), editions: { java: { from: '26.1', to: '1.21.11' } } }).join()).toContain(
      'älter oder gleich',
    );
    expect(problems({ ...baseFarm(), editions: { java: { from: 'x', to: '26.1' } } }).join()).toContain(
      'Ungültige Versionsangabe',
    );
  });

  it('prüft das Zeichenraster', () => {
    const f = baseFarm();
    const bp = f.blueprint as { layers: string[][]; palette: Record<string, string>; start: object };
    bp.layers[1] = ['.P', '.X'];
    expect(problems(f).join()).toContain('Unbekanntes Kürzel "X"');

    const g = baseFarm();
    (g.blueprint as typeof bp).layers[1] = ['.P', '...'];
    expect(problems(g).join()).toContain('erwartet 2');

    const h = baseFarm();
    (h.blueprint as typeof bp).layers[1] = ['.P'];
    expect(problems(h).join()).toContain('hat 1 Zeilen');
  });

  it('prüft die Palette', () => {
    const f = baseFarm();
    const bp = f.blueprint as { palette: Record<string, string> };
    bp.palette.Q = 'minecraft:dirt';
    expect(problems(f).join()).toContain('wird nicht verwendet');

    const g = baseFarm();
    (g.blueprint as typeof bp).palette.P = 'minecraft:piston[facing=north';
    expect(problems(g).join()).toContain('Klammer');

    const h = baseFarm();
    (h.blueprint as typeof bp).palette.AB = 'minecraft:dirt';
    expect(problems(h).join()).toContain('genau ein Zeichen');
  });

  it('prüft den Startblock', () => {
    const f = baseFarm();
    (f.blueprint as { start: object }).start = { x: 0, y: 1, z: 0 };
    expect(problems(f).join()).toContain('nicht Luft');

    const g = baseFarm();
    (g.blueprint as { start: object }).start = { x: 5, y: 0, z: 0 };
    expect(problems(g).join()).toContain('außerhalb');
  });

  it('verlangt die Herkunft des Bauplans', () => {
    expect(problems({ ...baseFarm(), blueprintOrigin: null }).join()).toContain('Herkunft');
    expect(problems({ ...baseFarm(), blueprint: null, steps: [] }).join()).toContain('Herkunft ohne Bauplan');
  });

  it('prüft Ebenenverweise in den Bauschritten', () => {
    expect(problems({ ...baseFarm(), steps: [{ text: 'x', layers: [3] }] }).join()).toContain(
      'Ebene 3 existiert nicht',
    );
  });

  it('verlangt für eine Rate eine vorhandene Quelle', () => {
    const rate = { entries: [{ item: 'minecraft:sugar_cane', perHour: 100 }], source: 2 };
    expect(problems({ ...baseFarm(), rate }).join()).toContain('keine vorhandene Quelle');
    expect(problems({ ...baseFarm(), rate: { ...rate, source: 0 } })).toEqual([]);
  });

  it('verlangt https-Quellen', () => {
    const f = { ...baseFarm(), sources: [{ title: 'Q', author: 'A', url: 'http://example.org' }] };
    expect(problems(f).length).toBeGreaterThan(0);
  });
});
