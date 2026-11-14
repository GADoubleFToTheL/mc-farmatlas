import { useMemo, useState } from 'react';
import { toggleInList, updateFarmState } from '../../db/store';
import { breakdown, computeMaterials, formatBreakdown, sortedItems, totalSlots } from '../../lib/materials';
import { displayName } from '../../lib/names';
import type { Farm } from '../../lib/schema';
import type { Structure } from '../../lib/structure';
import type { FarmState } from '../../lib/userdata';
import { Button, Segmented, cx } from '../../ui/controls';

function Row({
  checked,
  onToggle,
  name,
  count,
  detail,
}: {
  checked: boolean;
  onToggle: () => void;
  name: string;
  count: string;
  detail?: string;
}) {
  return (
    <li>
      <label
        className={cx(
          'flex min-h-13 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2',
          checked ? 'border-line/50 bg-transparent text-muted' : 'border-line bg-surface',
        )}
      >
        <input type="checkbox" checked={checked} onChange={onToggle} className="size-6 shrink-0 accent-(--accent)" />
        <span className={cx('min-w-0 flex-1 leading-snug', checked && 'line-through')}>
          {name}
          {detail && <span className="block text-xs text-muted no-underline">{detail}</span>}
        </span>
        <span className="font-mono text-base font-semibold tabular-nums">{count}</span>
      </label>
    </li>
  );
}

/**
 * Materialliste – gesamt oder für eine Ebene, umgerechnet in Stacks und
 * Shulkerkisten, zum Abhaken. Der Haken-Stand wird je Farm gespeichert.
 */
export function MaterialsPanel({
  farm,
  structure,
  farmState,
  layer,
  onLayerChange,
  fixedScope,
}: {
  farm: Farm;
  structure: Structure | null;
  farmState: FarmState;
  /** Nullbasierte Ebene für die Ansicht „pro Ebene“. */
  layer: number;
  onLayerChange?: (layer: number) => void;
  /** Im Bau-Modus fest auf die aktuelle Ebene. */
  fixedScope?: 'ebene';
}) {
  const [scopeState, setScope] = useState<'gesamt' | 'ebene'>('gesamt');
  const scope = fixedScope ?? scopeState;
  const scopeKey = scope === 'gesamt' ? 'gesamt' : String(layer + 1);

  const list = useMemo(
    () => (structure ? computeMaterials(structure, scope === 'gesamt' ? undefined : layer) : null),
    [structure, scope, layer],
  );

  const checked = new Set(farmState.checkedMaterials);
  const toggle = (key: string) =>
    updateFarmState(farm.id, { checkedMaterials: toggleInList(farmState.checkedMaterials, key) });
  const prefix = `${scopeKey}|`;
  const checkedHere = farmState.checkedMaterials.filter((k) => k.startsWith(prefix)).length;

  const items = list ? sortedItems(list) : [];
  const showExtras = scope === 'gesamt' && farm.extras.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {!fixedScope && structure && (
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Umfang"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'gesamt', label: 'Gesamt' },
              { value: 'ebene', label: 'Pro Ebene' },
            ]}
          />
          {scope === 'ebene' && (
            <label className="flex items-center gap-2 text-sm text-muted">
              Ebene
              <select
                value={layer}
                onChange={(e) => onLayerChange?.(Number(e.target.value))}
                className="h-11 rounded-lg border border-line bg-surface px-2 text-ink"
              >
                {Array.from({ length: structure.size.y }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1} von {structure.size.y}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {!structure && (
        <p className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          Ohne Bauplan lässt sich die Materialliste nicht berechnen. Unten stehen nur die Angaben aus der Quelle.
        </p>
      )}

      {list && items.length === 0 && list.fluids.water + list.fluids.lava === 0 && (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">Für diese Ebene wird nichts gebraucht.</p>
      )}

      {items.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map(([item, count]) => {
            const key = `${prefix}${item}`;
            return (
              <Row
                key={key}
                checked={checked.has(key)}
                onToggle={() => toggle(key)}
                name={displayName(item)}
                count={String(count)}
                detail={formatBreakdown(breakdown(item, count)) || undefined}
              />
            );
          })}
        </ul>
      )}

      {list && list.fluids.water + list.fluids.lava > 0 && (
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-muted">Flüssigkeiten (Quellblöcke)</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {list.fluids.water > 0 && (
              <Row
                checked={checked.has(`${prefix}fluid:water`)}
                onToggle={() => toggle(`${prefix}fluid:water`)}
                name="Wasserquellen"
                detail="mit Wassereimer setzen – ein Eimer und eine unendliche Quelle genügen"
                count={`${list.fluids.water}×`}
              />
            )}
            {list.fluids.lava > 0 && (
              <Row
                checked={checked.has(`${prefix}fluid:lava`)}
                onToggle={() => toggle(`${prefix}fluid:lava`)}
                name="Lavaquellen"
                detail="je Quelle ein Lavaeimer"
                count={`${list.fluids.lava}×`}
              />
            )}
          </ul>
        </section>
      )}

      {showExtras && (
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-muted">Zusätzlich (nicht im Bauplan)</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {farm.extras.map((extra, i) => {
              const key = `${prefix}extra:${i}`;
              return (
                <Row
                  key={key}
                  checked={checked.has(key)}
                  onToggle={() => toggle(key)}
                  name={displayName(extra.item)}
                  detail={extra.note ?? undefined}
                  count={String(extra.count)}
                />
              );
            })}
          </ul>
        </section>
      )}

      {list && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>
            {items.reduce((sum, [, n]) => sum + n, 0)} Blöcke und Items · {totalSlots(list)} Inventarplätze
          </p>
          {checkedHere > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                updateFarmState(farm.id, {
                  checkedMaterials: farmState.checkedMaterials.filter((k) => !k.startsWith(prefix)),
                })
              }
            >
              Haken entfernen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
