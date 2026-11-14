/**
 * Alle Farmen aus data/farms/. Die Dateien werden beim Build eingebunden und
 * landen damit im Offline-Cache. Gültigkeit prüft `npm run validate`.
 */
import { summarize, type FarmSummary } from '../lib/catalog';
import type { Farm } from '../lib/schema';

const modules = import.meta.glob<Farm>('../../data/farms/*.json', { eager: true, import: 'default' });

export const FARMS: readonly Farm[] = Object.values(modules);
export const SUMMARIES: readonly FarmSummary[] = FARMS.map(summarize);

const BY_ID = new Map(SUMMARIES.map((s) => [s.farm.id, s]));

export function findFarm(id: string | undefined): FarmSummary | undefined {
  return id ? BY_ID.get(id) : undefined;
}
