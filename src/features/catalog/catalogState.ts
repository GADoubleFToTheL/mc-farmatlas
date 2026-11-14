/**
 * Such- und Filterzustand der Übersicht. Liegt außerhalb der Komponente,
 * damit er beim Wechsel zur Detailseite und zurück erhalten bleibt.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_FILTER, type CatalogFilter, type SortKey } from '../../lib/catalog';
import type { Edition } from '../../lib/schema';

export interface CatalogState extends Omit<CatalogFilter, 'edition' | 'myVersions'> {
  /** null = Edition aus den Einstellungen verwenden. */
  edition: Edition | 'alle' | null;
  sort: SortKey;
}

let state: CatalogState = { ...DEFAULT_FILTER, edition: null, sort: 'name' };
const listeners = new Set<() => void>();

export function useCatalogState(): CatalogState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function setCatalogState(patch: Partial<CatalogState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function resetCatalogFilters(): void {
  setCatalogState({ ...DEFAULT_FILTER, query: state.query });
}
