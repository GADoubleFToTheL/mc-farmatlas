import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER,
  matchesFilter,
  normalize,
  sizeClassOf,
  sortFarms,
  summarize,
  versionFit,
  type CatalogFilter,
} from './catalog';
import type { Farm } from './schema';

function farm(overrides: Partial<Farm>): Farm {
  return {
    schema: 1,
    id: 'x',
    name: 'X',
    category: 'pflanzen',
    outputs: [],
    editions: { bedrock: { from: '1.21.0', to: '26.62' } },
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
    principle: 'p',
    steps: [],
    pitfalls: [],
    blueprint: null,
    extras: [],
    sources: [{ title: 't', author: 'a', url: 'https://example.org' }],
    ...overrides,
  };
}

const filter = (o: Partial<CatalogFilter> = {}): CatalogFilter => ({
  ...DEFAULT_FILTER,
  edition: 'bedrock',
  myVersions: { bedrock: '26.62', java: '26.3' },
  ...o,
});

const iron = summarize(
  farm({
    id: 'eisen',
    name: 'Eisenfarm',
    category: 'mobs-xp',
    outputs: ['minecraft:iron_ingot'],
    difficulty: 4,
    size: { width: 15, height: 20, depth: 15 },
    editions: { java: { from: '1.21', to: '26.3' } },
    requirements: { ...farm({}).requirements, afk: { required: true, distance: null, note: null } },
  }),
);
const cane = summarize(
  farm({
    id: 'zuckerrohr',
    name: 'Zuckerrohrfarm',
    outputs: ['minecraft:sugar_cane'],
    tags: ['Papier'],
    difficulty: 2,
    blueprint: {
      format: 'grid',
      stateSyntax: 'java',
      start: { x: 0, y: 0, z: 0 },
      palette: { S: 'minecraft:stone' },
      layers: [['SSS', 'SSS']],
    },
  }),
);
const xp = summarize(
  farm({ id: 'xp', name: 'Mobfarm', category: 'mobs-xp', outputs: ['farmatlas:xp'], difficulty: 3,
    editions: { bedrock: { from: '1.20.0', to: '1.21.50' } } }),
);
const none = new Set<string>();

describe('normalize', () => {
  it('vereinheitlicht Umlaute und Großschreibung', () => {
    expect(normalize('Kürbis')).toBe('kurbis');
    expect(normalize('Straße')).toBe('strasse');
  });
});

describe('summarize', () => {
  it('berechnet Maße aus dem Bauplan (B × H × T)', () => {
    expect(cane.size).toEqual({ width: 3, height: 1, depth: 2 });
    expect(cane.sizeFromBlueprint).toBe(true);
    expect(iron.size).toEqual({ width: 15, height: 20, depth: 15 });
    expect(iron.sizeFromBlueprint).toBe(false);
  });

  it('ordnet Größenklassen zu', () => {
    expect(sizeClassOf({ width: 9, height: 50, depth: 3 })).toBe('klein');
    expect(sizeClassOf({ width: 10, height: 1, depth: 3 })).toBe('mittel');
    expect(sizeClassOf({ width: 3, height: 1, depth: 25 })).toBe('gross');
    expect(sizeClassOf(null)).toBeNull();
  });
});

describe('matchesFilter', () => {
  const all = filter({ edition: 'alle' });

  it('sucht nach Name, Output-Item (deutsch) und Tags', () => {
    expect(matchesFilter(iron, { ...all, query: 'Eisen' }, none)).toBe(true);
    expect(matchesFilter(iron, { ...all, query: 'eisenbarren' }, none)).toBe(true);
    expect(matchesFilter(cane, { ...all, query: 'eisen' }, none)).toBe(false);
    expect(matchesFilter(xp, { ...all, query: 'XP' }, none)).toBe(true);
    expect(matchesFilter(cane, { ...all, query: 'papier' }, none)).toBe(true);
    expect(matchesFilter(cane, { ...all, query: 'sugar cane' }, none)).toBe(true);
    expect(matchesFilter(cane, { ...all, query: 'zucker pflanzen' }, none)).toBe(true);
  });

  it('filtert nach Edition und Version', () => {
    expect(matchesFilter(iron, filter(), none)).toBe(false);
    expect(matchesFilter(cane, filter(), none)).toBe(true);
    expect(matchesFilter(xp, filter(), none)).toBe(true);
    expect(matchesFilter(xp, filter({ versionOnly: true }), none)).toBe(false);
    expect(matchesFilter(iron, filter({ edition: 'java', versionOnly: true }), none)).toBe(true);
  });

  it('zeigt eigene Importe unabhängig vom Editionsfilter', () => {
    const info = {
      fileName: 'a.litematic', format: 'litematic' as const, edition: 'java' as const, mcVersion: '1.21',
      mcVersionExact: true, author: null, blockCount: 1, warnings: [], importedAt: 0,
    };
    const own = summarize(iron.farm, { kind: 'eigen', recordId: 'lokal-x', info });
    const attached = summarize(iron.farm, { kind: 'angehaengt', recordId: 'import:eisen', info });
    expect(matchesFilter(own, filter({ versionOnly: true }), none)).toBe(true);
    expect(matchesFilter(attached, filter(), none)).toBe(false);
  });

  it('filtert nach Kategorie, Schwierigkeit, Größe, AFK, Bauplan und Favoriten', () => {
    expect(matchesFilter(iron, { ...all, categories: ['pflanzen'] }, none)).toBe(false);
    expect(matchesFilter(iron, { ...all, categories: ['pflanzen', 'mobs-xp'] }, none)).toBe(true);
    expect(matchesFilter(iron, { ...all, maxDifficulty: 3 }, none)).toBe(false);
    expect(matchesFilter(iron, { ...all, sizeClasses: ['klein'] }, none)).toBe(false);
    expect(matchesFilter(cane, { ...all, sizeClasses: ['klein'] }, none)).toBe(true);
    expect(matchesFilter(xp, { ...all, sizeClasses: ['klein'] }, none)).toBe(false);
    expect(matchesFilter(iron, { ...all, afk: 'nicht-noetig' }, none)).toBe(false);
    expect(matchesFilter(cane, { ...all, afk: 'noetig' }, none)).toBe(false);
    expect(matchesFilter(iron, { ...all, blueprintOnly: true }, none)).toBe(false);
    expect(matchesFilter(cane, { ...all, favoritesOnly: true }, none)).toBe(false);
    expect(matchesFilter(cane, { ...all, favoritesOnly: true }, new Set(['zuckerrohr']))).toBe(true);
  });
});

describe('versionFit', () => {
  it('unterscheidet Edition und Version', () => {
    expect(versionFit(iron.farm, 'bedrock', '26.62')).toBe('andere-edition');
    expect(versionFit(xp.farm, 'bedrock', '26.62')).toBe('andere-version');
    expect(versionFit(cane.farm, 'bedrock', '26.62')).toBe('passt');
    expect(versionFit(cane.farm, 'bedrock', 'quatsch')).toBe('andere-version');
  });
});

describe('sortFarms', () => {
  const ids = (key: Parameters<typeof sortFarms>[1]) => sortFarms([iron, cane, xp], key).map((s) => s.farm.id);
  it('sortiert nach Name, Schwierigkeit und Größe', () => {
    expect(ids('name')).toEqual(['eisen', 'xp', 'zuckerrohr']);
    expect(ids('difficulty')).toEqual(['zuckerrohr', 'xp', 'eisen']);
    expect(ids('size')).toEqual(['zuckerrohr', 'eisen', 'xp']);
  });
});
