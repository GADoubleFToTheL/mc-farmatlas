/**
 * Lokal importierte Farmen: aus einer gelesenen Schematic wird ein Farm-Eintrag.
 * Solche Einträge bleiben in IndexedDB und kommen nicht ins öffentliche Repo.
 */
import { z } from 'zod';
import type { ImportedSchematic, SchematicFormat } from './importers/schematic';
import { CATEGORIES, EDITIONS, localFarmSchema, type Category, type Farm, type FarmSource } from './schema';
import { blueprintFromStructure } from './structure';

/** Deutsche Namen häufiger Entitäten (IDs überschneiden sich mit Items, daher getrennt). */
const ENTITY_NAMES: Record<string, string> = {
  villager: 'Dorfbewohner',
  villager_v2: 'Dorfbewohner',
  zombie: 'Zombie',
  zombie_villager: 'Zombiedorfbewohner',
  zombie_villager_v2: 'Zombiedorfbewohner',
  iron_golem: 'Eisengolem',
  snow_golem: 'Schneegolem',
  armor_stand: 'Rüstungsständer',
  item_frame: 'Rahmen',
  glow_item_frame: 'Leuchtrahmen',
  minecart: 'Lore',
  hopper_minecart: 'Trichterlore',
  chest_minecart: 'Güterlore',
  boat: 'Boot',
  oak_boat: 'Eichenholzboot',
  cat: 'Katze',
  chicken: 'Huhn',
  cow: 'Kuh',
  sheep: 'Schaf',
  pig: 'Schwein',
  bee: 'Biene',
  turtle: 'Schildkröte',
  endermite: 'Endermilbe',
  wither_skeleton: 'Witherskelett',
  shulker: 'Shulker',
  allay: 'Hilfsgeist',
  frog: 'Frosch',
  axolotl: 'Axolotl',
  item: 'Item (liegt am Boden)',
  painting: 'Gemälde',
};

export function entityName(id: string): string {
  const short = id.slice(id.indexOf(':') + 1);
  return ENTITY_NAMES[short] ?? short.replace(/_/g, ' ');
}

export const importInfoSchema = z.object({
  fileName: z.string(),
  format: z.enum(['litematic', 'schem', 'nbt', 'mcstructure']),
  edition: z.enum(EDITIONS),
  mcVersion: z.string().nullable(),
  mcVersionExact: z.boolean(),
  author: z.string().nullable(),
  blockCount: z.number(),
  warnings: z.array(z.string()),
  importedAt: z.number(),
});
export type ImportInfo = z.infer<typeof importInfoSchema>;

export const localFarmRecordSchema = z.object({
  /** Eindeutig je Import; bei angehängten Importen "import:<Katalog-ID>". */
  id: z.string().min(1),
  /** Katalog-Farm ohne Bauplan, zu der dieser Import gehört (sonst null). */
  attachedTo: z.string().nullable(),
  farm: localFarmSchema,
  info: importInfoSchema,
});
export type LocalFarmRecord = z.infer<typeof localFarmRecordSchema>;

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'farm';
}

/** Dateiname ohne Endung als lesbarer Name („iron_farm-v2.litematic“ → „iron farm v2“). */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base === '' ? 'Importierte Farm' : base;
}

export interface DraftOptions {
  id: string;
  name: string;
  category: Category;
  fileName: string;
  /** Version der Edition, falls die Datei keine nennt (aus den Einstellungen). */
  fallbackVersion: string;
  sources?: FarmSource[];
  now?: number;
}

const FORMAT_SHORT: Record<SchematicFormat, string> = {
  litematic: '.litematic',
  schem: '.schem',
  nbt: '.nbt',
  mcstructure: '.mcstructure',
};

/** Baut aus einer gelesenen Schematic einen vollständigen Farm-Eintrag. */
export function draftFarm(imported: ImportedSchematic, options: DraftOptions): Farm {
  const version = imported.mcVersion ?? options.fallbackVersion;
  const origin = [
    `Importiert aus „${options.fileName}“ (${FORMAT_SHORT[imported.format]})`,
    imported.author ? `Ersteller laut Datei: ${imported.author}` : null,
    imported.mcVersion ? `gespeichert mit ${imported.edition === 'java' ? 'Java' : 'Bedrock'} ${imported.mcVersion}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    schema: 1,
    id: options.id,
    name: options.name.trim() || nameFromFile(options.fileName),
    category: options.category,
    outputs: [],
    editions: { [imported.edition]: { from: version, to: version } },
    difficulty: 3,
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
    principle:
      imported.description ??
      'Aus einer Schematic-Datei importiert. Funktionsprinzip und Voraussetzungen stehen im Original-Tutorial.',
    steps: [],
    pitfalls: [],
    blueprint: blueprintFromStructure(imported.structure),
    blueprintOrigin: { kind: 'import', note: `${origin}.` },
    extras: imported.entities.map((e) => ({
      item: entityName(e.id),
      count: e.count,
      note: 'steht als Entität in der Schematic',
    })),
    sources: options.sources ?? [],
  };
}

export function importInfo(imported: ImportedSchematic, fileName: string, now = Date.now()): ImportInfo {
  return {
    fileName,
    format: imported.format,
    edition: imported.edition,
    mcVersion: imported.mcVersion,
    mcVersionExact: imported.mcVersionExact,
    author: imported.author,
    blockCount: imported.blockCount,
    warnings: imported.warnings,
    importedAt: now,
  };
}

/**
 * Hängt einen importierten Bauplan an eine Katalog-Farm ohne Bauplan:
 * Texte und Quellen kommen aus dem Katalog, Bauplan und Entitäten aus dem Import.
 */
export function attachBlueprint(catalogFarm: Farm, record: LocalFarmRecord): Farm {
  return {
    ...catalogFarm,
    size: undefined,
    blueprint: record.farm.blueprint,
    blueprintOrigin: record.farm.blueprintOrigin,
    extras: [...catalogFarm.extras, ...record.farm.extras],
  };
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
