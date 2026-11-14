/**
 * Übersicht: Kennzahlen je Farm ableiten, suchen, filtern, sortieren.
 * Reine Funktionen ohne UI, damit sie testbar bleiben.
 */
import type { ImportInfo } from './localfarm';
import { displayName } from './names';
import { blueprintSize, type Category, type Edition, type Farm } from './schema';
import { isInRange } from './version';

export const CATEGORY_LABELS: Record<Category, string> = {
  pflanzen: 'Pflanzen',
  nahrung: 'Nahrung',
  'mobs-xp': 'Mobs & XP',
  rohstoffe: 'Rohstoffe',
  'villager-handel': 'Villager & Handel',
  'lager-sortierung': 'Lager & Sortierung',
  sonstiges: 'Sonstiges',
};

export const EDITION_LABELS: Record<Edition, string> = { java: 'Java', bedrock: 'Bedrock' };

export const STATUS_LABELS: Record<Farm['status'], string> = {
  ungeprueft: 'ungeprüft',
  'kreativ-getestet': 'im Kreativ getestet',
  'survival-gebaut': 'im Survival gebaut',
};

export const DIMENSION_LABELS: Record<Farm['requirements']['dimension'][number], string> = {
  overworld: 'Oberwelt',
  nether: 'Nether',
  end: 'Ende',
};

export const DIFFICULTY_LABELS = ['', 'sehr leicht', 'leicht', 'mittel', 'schwer', 'sehr schwer'] as const;

export type SizeClass = 'klein' | 'mittel' | 'gross';
export const SIZE_CLASS_LABELS: Record<SizeClass, string> = {
  klein: 'Klein (bis 9 × 9)',
  mittel: 'Mittel (bis 24 × 24)',
  gross: 'Groß',
};

export interface FarmSize {
  width: number;
  height: number;
  depth: number;
}

export interface FarmSummary {
  farm: Farm;
  /** B × H × T – aus dem Bauplan berechnet oder laut Quelle; null, wenn unbekannt. */
  size: FarmSize | null;
  sizeFromBlueprint: boolean;
  sizeClass: SizeClass | null;
  hasBlueprint: boolean;
  searchText: string;
  /**
   * Gesetzt bei lokalen Importen: "eigen" = eigenständige importierte Farm,
   * "angehaengt" = Katalog-Farm, deren Bauplan aus einem eigenen Import stammt.
   */
  local?: { kind: 'eigen' | 'angehaengt'; recordId: string; info: ImportInfo };
}

/** Kleinbuchstaben, Umlaute und Akzente vereinheitlicht („Kürbis“ → „kurbis“). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function farmSize(farm: Farm): FarmSize | null {
  if (farm.blueprint) {
    const size = blueprintSize(farm.blueprint);
    return { width: size.x, height: size.y, depth: size.z };
  }
  return farm.size ?? null;
}

export function sizeClassOf(size: FarmSize | null): SizeClass | null {
  if (!size) return null;
  const footprint = Math.max(size.width, size.depth);
  return footprint <= 9 ? 'klein' : footprint <= 24 ? 'mittel' : 'gross';
}

export function summarize(farm: Farm, local?: FarmSummary['local']): FarmSummary {
  const size = farmSize(farm);
  const words = [
    farm.name,
    CATEGORY_LABELS[farm.category],
    ...farm.outputs.flatMap((id) => [displayName(id), id.slice(id.indexOf(':') + 1).replace(/_/g, ' ')]),
    ...(farm.tags ?? []),
  ];
  return {
    farm,
    size,
    sizeFromBlueprint: farm.blueprint !== null,
    sizeClass: sizeClassOf(size),
    hasBlueprint: farm.blueprint !== null,
    searchText: normalize(words.join(' ')),
    ...(local ? { local } : {}),
  };
}

export type SortKey = 'name' | 'difficulty' | 'size' | 'category';
export const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  difficulty: 'Schwierigkeit',
  size: 'Größe',
  category: 'Kategorie',
};

export interface CatalogFilter {
  query: string;
  categories: Category[];
  edition: Edition | 'alle';
  /** Nur Farmen, deren Versionsbereich die eigene Version einschließt. */
  versionOnly: boolean;
  myVersions: Record<Edition, string>;
  maxDifficulty: number;
  sizeClasses: SizeClass[];
  afk: 'egal' | 'noetig' | 'nicht-noetig';
  blueprintOnly: boolean;
  favoritesOnly: boolean;
}

export const DEFAULT_FILTER: Omit<CatalogFilter, 'edition' | 'myVersions'> = {
  query: '',
  categories: [],
  versionOnly: false,
  maxDifficulty: 5,
  sizeClasses: [],
  afk: 'egal',
  blueprintOnly: false,
  favoritesOnly: false,
};

/** Passt die Farm zur Edition und – falls bekannt – zur eigenen Version? */
export function versionFit(farm: Farm, edition: Edition, myVersion: string): 'passt' | 'andere-version' | 'andere-edition' {
  const range = farm.editions[edition];
  if (!range) return 'andere-edition';
  try {
    return isInRange(myVersion, range) ? 'passt' : 'andere-version';
  } catch {
    return 'andere-version';
  }
}

export function matchesFilter(s: FarmSummary, f: CatalogFilter, favorites: ReadonlySet<string>): boolean {
  const { farm } = s;
  const tokens = normalize(f.query).split(/\s+/).filter(Boolean);
  if (!tokens.every((t) => s.searchText.includes(t))) return false;
  if (f.categories.length > 0 && !f.categories.includes(farm.category)) return false;
  // Eigene Importe versteckt der Editionsfilter nie – sonst sucht man sie nach dem Import vergeblich.
  if (f.edition !== 'alle' && s.local?.kind !== 'eigen') {
    const fit = versionFit(farm, f.edition, f.myVersions[f.edition]);
    if (fit === 'andere-edition') return false;
    if (f.versionOnly && fit !== 'passt') return false;
  }
  if (farm.difficulty > f.maxDifficulty) return false;
  if (f.sizeClasses.length > 0 && (s.sizeClass === null || !f.sizeClasses.includes(s.sizeClass))) return false;
  if (f.afk === 'noetig' && !farm.requirements.afk.required) return false;
  if (f.afk === 'nicht-noetig' && farm.requirements.afk.required) return false;
  if (f.blueprintOnly && !s.hasBlueprint) return false;
  if (f.favoritesOnly && !favorites.has(farm.id)) return false;
  return true;
}

function volume(s: FarmSummary): number {
  return s.size ? s.size.width * s.size.height * s.size.depth : Number.POSITIVE_INFINITY;
}

export function sortFarms(list: readonly FarmSummary[], key: SortKey): FarmSummary[] {
  const byName = (a: FarmSummary, b: FarmSummary) => a.farm.name.localeCompare(b.farm.name, 'de');
  const sorted = [...list];
  switch (key) {
    case 'name':
      return sorted.sort(byName);
    case 'difficulty':
      return sorted.sort((a, b) => a.farm.difficulty - b.farm.difficulty || byName(a, b));
    case 'size':
      return sorted.sort((a, b) => volume(a) - volume(b) || byName(a, b));
    case 'category':
      return sorted.sort(
        (a, b) => CATEGORY_LABELS[a.farm.category].localeCompare(CATEGORY_LABELS[b.farm.category], 'de') || byName(a, b),
      );
  }
}

export function countActiveFilters(f: CatalogFilter): number {
  return (
    (f.categories.length > 0 ? 1 : 0) +
    (f.versionOnly ? 1 : 0) +
    (f.maxDifficulty < 5 ? 1 : 0) +
    (f.sizeClasses.length > 0 ? 1 : 0) +
    (f.afk !== 'egal' ? 1 : 0) +
    (f.blueprintOnly ? 1 : 0) +
    (f.favoritesOnly ? 1 : 0)
  );
}
