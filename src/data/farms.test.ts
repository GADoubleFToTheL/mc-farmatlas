/**
 * Prüft die echten Farm-Dateien: Jede muss dem Schema entsprechen, und aus
 * jedem Bauplan müssen sich Struktur und Materialliste berechnen lassen.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { summarize } from '../lib/catalog';
import { computeMaterials } from '../lib/materials';
import { validateFarm } from '../lib/schema';
import { blockAt, structureFromBlueprint } from '../lib/structure';
import { isAir } from '../lib/blockstate';

const dir = fileURLToPath(new URL('../../data/farms/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('Farm-Dateien', () => {
  it('sind vorhanden', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(file, () => {
      const result = validateFarm(JSON.parse(readFileSync(dir + file, 'utf8')));
      if (!result.ok) throw new Error(result.problems.map((p) => `${p.path}: ${p.message}`).join('\n'));
      const { farm } = result;
      expect(`${farm.id}.json`).toBe(file);
      expect(farm.status).toBe('ungeprueft');

      const summary = summarize(farm);
      if (!farm.blueprint) {
        expect(summary.hasBlueprint).toBe(false);
        return;
      }
      const structure = structureFromBlueprint(farm.blueprint);
      expect(summary.size).toEqual({ width: structure.size.x, height: structure.size.y, depth: structure.size.z });
      const { x, y, z } = farm.blueprint.start;
      expect(isAir(blockAt(structure, x, y, z))).toBe(false);

      // Summe der Ebenen = Gesamtliste
      const total = computeMaterials(structure);
      const perLayer = new Map<string, number>();
      let water = 0;
      for (let layer = 0; layer < structure.size.y; layer++) {
        const m = computeMaterials(structure, layer);
        water += m.fluids.water;
        for (const [item, n] of m.items) perLayer.set(item, (perLayer.get(item) ?? 0) + n);
      }
      expect(Object.fromEntries(perLayer)).toEqual(Object.fromEntries(total.items));
      expect(water).toBe(total.fluids.water);
      expect(total.items.size).toBeGreaterThan(0);
    });
  }
});
