import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importSchematic } from './importers/schematic';
import { attachBlueprint, draftFarm, entityName, importInfo, localFarmRecordSchema, nameFromFile, slugify } from './localfarm';
import { validateFarm, type Farm } from './schema';

const fixture = (name: string) =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`./importers/fixtures/${name}`, import.meta.url))));

describe('slugify / nameFromFile', () => {
  it('macht aus Namen gültige IDs', () => {
    expect(slugify('Eisenfarm für Bedrock (v2)')).toBe('eisenfarm-fuer-bedrock-v2');
    expect(slugify('  ÄÖÜ ß  ')).toBe('aeoeue-ss');
    expect(slugify('!!!')).toBe('farm');
  });
  it('liest einen Namen aus dem Dateinamen', () => {
    expect(nameFromFile('iron_farm-v2.litematic')).toBe('iron farm v2');
    expect(nameFromFile('.schem')).toBe('Importierte Farm');
  });
});

describe('entityName', () => {
  it('übersetzt bekannte Entitäten und lässt unbekannte lesbar', () => {
    expect(entityName('minecraft:hopper_minecart')).toBe('Trichterlore');
    expect(entityName('minecraft:villager_v2')).toBe('Dorfbewohner');
    expect(entityName('minecraft:glow_squid')).toBe('glow squid');
  });
});

describe('draftFarm', () => {
  it('erzeugt aus einer Bedrock-Datei einen gültigen lokalen Eintrag', async () => {
    const imported = await importSchematic(fixture('monument.mcstructure'), 'monument.mcstructure');
    const farm = draftFarm(imported, {
      id: 'lokal-monument',
      name: 'Monument',
      category: 'sonstiges',
      fileName: 'monument.mcstructure',
      fallbackVersion: '26.62',
    });
    expect(farm.editions).toEqual({ bedrock: { from: '1.20.30', to: '1.20.30' } });
    expect(farm.blueprintOrigin?.kind).toBe('import');
    expect(farm.blueprintOrigin?.note).toContain('monument.mcstructure');
    expect(farm.status).toBe('ungeprueft');
    expect(validateFarm(farm, { local: true }).ok).toBe(true);
    // Ohne Quelle darf der Eintrag nicht ins Repo
    expect(validateFarm(farm).ok).toBe(false);

    const record = { id: 'lokal-monument', attachedTo: null, farm, info: importInfo(imported, 'monument.mcstructure', 1) };
    expect(localFarmRecordSchema.safeParse(JSON.parse(JSON.stringify(record))).success).toBe(true);
  });

  it('nimmt die Version aus den Einstellungen, wenn die Datei keine nennt', async () => {
    const imported = { ...(await importSchematic(fixture('worldedit-v3.schem'), 'a.schem')), mcVersion: null };
    const farm = draftFarm(imported, { id: 'x', name: '', category: 'pflanzen', fileName: 'kürbis_farm.schem', fallbackVersion: '26.3' });
    expect(farm.editions).toEqual({ java: { from: '26.3', to: '26.3' } });
    expect(farm.name).toBe('kürbis farm');
  });
});

describe('attachBlueprint', () => {
  it('übernimmt Texte aus dem Katalog und den Bauplan aus dem Import', async () => {
    const imported = await importSchematic(fixture('monument.mcstructure'), 'monument.mcstructure');
    const local = draftFarm(imported, { id: 'import:eisenfarm', name: 'x', category: 'sonstiges', fileName: 'm.mcstructure', fallbackVersion: '26.62' });
    const catalog: Farm = {
      ...local,
      id: 'eisenfarm',
      name: 'Eisenfarm',
      principle: 'Katalogtext',
      blueprint: null,
      blueprintOrigin: null,
      size: { width: 1, height: 1, depth: 1 },
      extras: [{ item: 'minecraft:water_bucket', count: 2 }],
      sources: [{ title: 't', author: 'a', url: 'https://example.org' }],
    };
    const merged = attachBlueprint(catalog, { id: 'import:eisenfarm', attachedTo: 'eisenfarm', farm: local, info: importInfo(imported, 'm', 1) });
    expect(merged.id).toBe('eisenfarm');
    expect(merged.principle).toBe('Katalogtext');
    expect(merged.blueprint).toBe(local.blueprint);
    expect(merged.size).toBeUndefined();
    expect(merged.extras).toHaveLength(1);
    expect(validateFarm(merged).ok).toBe(true);
  });
});
