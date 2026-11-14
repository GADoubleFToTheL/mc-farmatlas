import { useEffect, useRef, useState } from 'react';
import { updateFarmState } from '../../db/store';
import { DIMENSION_LABELS } from '../../lib/catalog';
import { DIMENSIONS } from '../../lib/schema';
import type { FarmState } from '../../lib/userdata';

type Coord = 'x' | 'y' | 'z';

/** Eigene Notizen und der Standort der Farm in der eigenen Welt – bleibt auf dem Gerät. */
export function MyNotes({ farmState }: { farmState: FarmState }) {
  const { farmId } = farmState;
  const [notes, setNotes] = useState(farmState.notes);
  const [coords, setCoords] = useState<Record<Coord, string>>({
    x: farmState.location ? String(farmState.location.x) : '',
    y: farmState.location ? String(farmState.location.y) : '',
    z: farmState.location ? String(farmState.location.z) : '',
  });
  const [dimension, setDimension] = useState(farmState.location?.dimension ?? 'overworld');
  const timer = useRef(0);

  // Notizen kurz nach der letzten Eingabe speichern – und sicher beim Verlassen der Seite.
  const pending = useRef<string | null>(null);
  const flush = () => {
    window.clearTimeout(timer.current);
    if (pending.current !== null) {
      updateFarmState(farmId, { notes: pending.current });
      pending.current = null;
    }
  };
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onNotes = (value: string) => {
    setNotes(value);
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  };

  const saveLocation = (next: Record<Coord, string>, dim: string) => {
    const values = (['x', 'y', 'z'] as const).map((k) => next[k].trim());
    if (values.every((v) => v === '')) {
      updateFarmState(farmId, { location: null });
      return;
    }
    const numbers = values.map((v) => Number(v));
    if (values.some((v) => v === '') || numbers.some((n) => !Number.isInteger(n))) return;
    updateFarmState(farmId, { location: { x: numbers[0]!, y: numbers[1]!, z: numbers[2]!, dimension: dim } });
  };

  const incomplete =
    (['x', 'y', 'z'] as const).some((k) => coords[k].trim() !== '') &&
    (['x', 'y', 'z'] as const).some((k) => !/^-?\d+$/.test(coords[k].trim()));

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-2.5 text-sm font-semibold tracking-wide text-muted uppercase">Meine Notizen</h2>
      <label className="block">
        <span className="sr-only">Notizen zu dieser Farm</span>
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          onBlur={flush}
          rows={3}
          maxLength={4000}
          placeholder="Was du dir merken willst: Änderungen, Ertrag, offene Punkte …"
          className="w-full rounded-lg border border-line bg-bg p-3 text-sm leading-relaxed placeholder:text-muted"
        />
      </label>

      <h3 className="mt-3 mb-1.5 text-sm font-medium">Wo steht sie in meiner Welt?</h3>
      <div className="grid grid-cols-3 gap-2">
        {(['x', 'y', 'z'] as const).map((k) => (
          <label key={k} className="block">
            <span className="text-xs text-muted uppercase">{k}</span>
            <input
              value={coords[k]}
              inputMode="text"
              autoComplete="off"
              placeholder="–"
              onChange={(e) => {
                const next = { ...coords, [k]: e.target.value.replace(/[^\d-]/g, '') };
                setCoords(next);
                saveLocation(next, dimension);
              }}
              className="mt-0.5 h-12 w-full rounded-lg border border-line bg-bg px-3 font-mono"
            />
          </label>
        ))}
      </div>
      <label className="mt-2 block">
        <span className="text-xs text-muted">Dimension</span>
        <select
          value={dimension}
          onChange={(e) => {
            setDimension(e.target.value);
            saveLocation(coords, e.target.value);
          }}
          className="mt-0.5 h-12 w-full rounded-lg border border-line bg-bg px-3"
        >
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {DIMENSION_LABELS[d]}
            </option>
          ))}
        </select>
      </label>
      {incomplete && <p className="mt-1.5 text-xs text-warn">Gespeichert wird, sobald X, Y und Z ganze Zahlen sind.</p>}
      <p className="mt-2 text-xs text-muted">Notizen und Koordinaten bleiben auf diesem Gerät und stecken im Backup.</p>
    </section>
  );
}
