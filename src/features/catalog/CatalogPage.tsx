import { useMemo, useState } from 'react';
import { SUMMARIES } from '../../data/farms';
import { useFavorites, useSettings } from '../../db/store';
import {
  countActiveFilters,
  EDITION_LABELS,
  matchesFilter,
  SORT_LABELS,
  sortFarms,
  type CatalogFilter,
  type SortKey,
} from '../../lib/catalog';
import { Button, Chip, Segmented } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { resetCatalogFilters, setCatalogState, useCatalogState } from './catalogState';
import { FarmCard } from './FarmCard';
import { FilterSheet } from './FilterSheet';

export function CatalogPage() {
  const state = useCatalogState();
  const settings = useSettings();
  const favorites = useFavorites();
  const [filterOpen, setFilterOpen] = useState(false);

  const edition = state.edition ?? settings.edition;
  const filter: CatalogFilter = useMemo(
    () => ({ ...state, edition, myVersions: settings.versions }),
    [state, edition, settings.versions],
  );
  const results = useMemo(
    () => sortFarms(SUMMARIES.filter((s) => matchesFilter(s, filter, favorites)), state.sort),
    [filter, favorites, state.sort],
  );
  const activeFilters = countActiveFilters(filter);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="sr-only">Farm-Übersicht</h1>

      <label className="relative block">
        <span className="sr-only">Farmen durchsuchen</span>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={state.query}
          onChange={(e) => setCatalogState({ query: e.target.value })}
          placeholder="Name oder Item, z. B. Eisen, XP"
          autoComplete="off"
          enterKeyHint="search"
          className="h-13 w-full rounded-xl border border-line bg-surface pr-4 pl-11 text-base placeholder:text-muted"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Edition"
          value={edition}
          onChange={(e) => setCatalogState({ edition: e })}
          options={[
            { value: 'bedrock', label: 'Bedrock' },
            { value: 'java', label: 'Java' },
            { value: 'alle', label: 'Alle' },
          ]}
        />
        <Chip active={state.favoritesOnly} onClick={() => setCatalogState({ favoritesOnly: !state.favoritesOnly })}>
          <Icon name="star" className="size-4" filled={state.favoritesOnly} />
          Favoriten
        </Chip>
        <Button onClick={() => setFilterOpen(true)} className="ml-auto">
          <Icon name="filter" />
          Filter
          {activeFilters > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs text-accent-ink">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p aria-live="polite">
          {results.length} {results.length === 1 ? 'Farm' : 'Farmen'}
          {edition !== 'alle' && ` für ${EDITION_LABELS[edition]}`}
        </p>
        <label className="flex items-center gap-2">
          Sortierung
          <select
            value={state.sort}
            onChange={(e) => setCatalogState({ sort: e.target.value as SortKey })}
            className="h-11 rounded-lg border border-line bg-surface px-2 text-ink"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center">
          <p className="font-medium">Keine Farm passt zu Suche und Filtern.</p>
          <p className="mt-1 text-sm text-muted">Probier einen anderen Begriff oder setz die Filter zurück.</p>
          <Button
            className="mt-4"
            onClick={() => {
              resetCatalogFilters();
              setCatalogState({ query: '', edition: 'alle' });
            }}
          >
            Alles zurücksetzen
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((s) => (
            <FarmCard
              key={s.farm.id}
              summary={s}
              favorite={favorites.has(s.farm.id)}
              myEdition={settings.edition}
              myVersion={settings.versions[settings.edition]}
            />
          ))}
        </div>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        state={state}
        resultCount={results.length}
        editionChosen={edition !== 'alle'}
        versionLabel={edition !== 'alle' ? `${EDITION_LABELS[edition]} ${settings.versions[edition]}` : ''}
      />
    </div>
  );
}
