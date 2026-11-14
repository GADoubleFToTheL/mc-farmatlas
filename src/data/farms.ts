/**
 * Alle Farmen: die aus data/farms/ (beim Build eingebunden und damit offline
 * verfügbar) plus die lokal importierten aus IndexedDB.
 * Die Gültigkeit der Repo-Dateien prüft `npm run validate`.
 */
import { useMemo } from 'react';
import { useLocalFarms } from '../db/store';
import { summarize, type FarmSummary } from '../lib/catalog';
import { attachBlueprint, type LocalFarmRecord } from '../lib/localfarm';
import type { Farm } from '../lib/schema';

const modules = import.meta.glob<Farm>('../../data/farms/*.json', { eager: true, import: 'default' });

/** Farmen aus dem Repo, unverändert. */
export const REPO_FARMS: readonly Farm[] = Object.values(modules);

export interface Catalog {
  summaries: readonly FarmSummary[];
  find: (id: string | undefined) => FarmSummary | undefined;
}

export function buildCatalog(repoFarms: readonly Farm[], local: ReadonlyMap<string, LocalFarmRecord>): Catalog {
  const attached = new Map<string, LocalFarmRecord>();
  const own: LocalFarmRecord[] = [];
  for (const record of local.values()) {
    if (record.attachedTo) attached.set(record.attachedTo, record);
    else own.push(record);
  }
  const summaries: FarmSummary[] = repoFarms.map((farm) => {
    const record = attached.get(farm.id);
    // Hat die Katalog-Farm inzwischen einen eigenen Bauplan, gilt dieser.
    if (!record || farm.blueprint) return summarize(farm);
    return summarize(attachBlueprint(farm, record), { kind: 'angehaengt', recordId: record.id, info: record.info });
  });
  const repoIds = new Set(repoFarms.map((f) => f.id));
  for (const record of own) {
    if (repoIds.has(record.farm.id)) continue;
    summaries.push(summarize(record.farm, { kind: 'eigen', recordId: record.id, info: record.info }));
  }
  const byId = new Map(summaries.map((s) => [s.farm.id, s]));
  return { summaries, find: (id) => (id ? byId.get(id) : undefined) };
}

export function useCatalog(): Catalog {
  const local = useLocalFarms();
  return useMemo(() => buildCatalog(REPO_FARMS, local), [local]);
}
