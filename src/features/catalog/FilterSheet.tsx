import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  SIZE_CLASS_LABELS,
  type SizeClass,
} from '../../lib/catalog';
import { CATEGORIES } from '../../lib/schema';
import { toggleInList } from '../../db/store';
import { Button, Chip, Segmented } from '../../ui/controls';
import { Sheet } from '../../ui/Sheet';
import { resetCatalogFilters, setCatalogState, type CatalogState } from './catalogState';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-semibold text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 accent-(--accent)"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function FilterSheet({
  open,
  onClose,
  state,
  resultCount,
  versionLabel,
  editionChosen,
}: {
  open: boolean;
  onClose: () => void;
  state: CatalogState;
  resultCount: number;
  versionLabel: string;
  editionChosen: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={resetCatalogFilters}>
            Zurücksetzen
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            {resultCount} {resultCount === 1 ? 'Farm' : 'Farmen'} anzeigen
          </Button>
        </div>
      }
    >
      <Group title="Kategorie">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={state.categories.includes(c)}
              onClick={() => setCatalogState({ categories: toggleInList(state.categories, c) })}
            >
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={`Schwierigkeit: höchstens ${DIFFICULTY_LABELS[state.maxDifficulty]}`}>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip
              key={n}
              active={state.maxDifficulty === n}
              className="flex-1 justify-center px-0"
              aria-label={`Höchstens Schwierigkeit ${n}`}
              onClick={() => setCatalogState({ maxDifficulty: n })}
            >
              {n}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Größe (Grundfläche)">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SIZE_CLASS_LABELS) as SizeClass[]).map((s) => (
            <Chip
              key={s}
              active={state.sizeClasses.includes(s)}
              onClick={() => setCatalogState({ sizeClasses: toggleInList(state.sizeClasses, s) })}
            >
              {SIZE_CLASS_LABELS[s]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="AFK nötig">
        <Segmented
          label="AFK nötig"
          className="w-full"
          value={state.afk}
          onChange={(afk) => setCatalogState({ afk })}
          options={[
            { value: 'egal', label: 'Egal' },
            { value: 'nicht-noetig', label: 'Ohne AFK' },
            { value: 'noetig', label: 'Mit AFK' },
          ]}
        />
      </Group>

      <Group title="Weitere">
        <Toggle
          checked={state.versionOnly}
          onChange={(versionOnly) => setCatalogState({ versionOnly })}
          label={
            editionChosen
              ? `Nur für meine Version bestätigt (${versionLabel})`
              : 'Nur für meine Version bestätigt (Edition oben wählen)'
          }
        />
        <Toggle
          checked={state.blueprintOnly}
          onChange={(blueprintOnly) => setCatalogState({ blueprintOnly })}
          label="Nur Farmen mit Bauplan"
        />
        <Toggle
          checked={state.favoritesOnly}
          onChange={(favoritesOnly) => setCatalogState({ favoritesOnly })}
          label="Nur Favoriten"
        />
      </Group>
    </Sheet>
  );
}
