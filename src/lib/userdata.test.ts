import { describe, expect, it } from 'vitest';
import {
  createBackup,
  DEFAULT_SETTINGS,
  emptyFarmState,
  mergeFarmStates,
  parseBackup,
  type FarmState,
} from './userdata';

const state = (farmId: string, o: Partial<FarmState> = {}): FarmState => ({ ...emptyFarmState(farmId), ...o });

describe('Backup', () => {
  it('übersteht Export und Import unverändert', () => {
    const states = [state('a', { favorite: true, updatedAt: 5 }), state('b', { doneLayers: [1, 2], notes: 'x', updatedAt: 9 })];
    const backup = createBackup(DEFAULT_SETTINGS, states, [], new Date('2026-11-13T12:00:00Z'));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual({ ok: true, backup });
  });

  it('lässt leere Einträge weg', () => {
    const backup = createBackup(DEFAULT_SETTINGS, [state('leer'), state('fav', { favorite: true })], []);
    expect(backup.farmStates.map((s) => s.farmId)).toEqual(['fav']);
  });

  it('lehnt fremde Dateien verständlich ab', () => {
    expect(parseBackup('kein json')).toEqual({ ok: false, error: 'Die Datei ist kein gültiges JSON.' });
    const r = parseBackup(JSON.stringify({ app: 'etwas-anderes' }));
    expect(r.ok).toBe(false);
    const broken = { ...createBackup(DEFAULT_SETTINGS, [], []), farmStates: [{ farmId: 'a' }] };
    expect(parseBackup(JSON.stringify(broken)).ok).toBe(false);
  });
});

describe('ältere Daten', () => {
  it('ergänzt die Ausrichtung bei Backups aus älteren Versionen', () => {
    const old = { ...createBackup(DEFAULT_SETTINGS, [], []), farmStates: [{ farmId: 'a', favorite: true, doneLayers: [], checkedMaterials: [], notes: '', location: null, updatedAt: 1 }] };
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.ok && parsed.backup.farmStates[0]!.orientation).toEqual({ rot: 0, mirror: false });
  });
});

describe('mergeFarmStates', () => {
  it('nimmt pro Farm den neueren Stand und behält den Rest', () => {
    const current = [state('a', { notes: 'alt', updatedAt: 10 }), state('b', { favorite: true, updatedAt: 20 })];
    const incoming = [
      state('a', { notes: 'neu', updatedAt: 30 }),
      state('b', { favorite: false, updatedAt: 5 }),
      state('c', { doneLayers: [1], updatedAt: 1 }),
    ];
    const merged = mergeFarmStates(current, incoming);
    const byId = Object.fromEntries(merged.map((s) => [s.farmId, s]));
    expect(byId.a!.notes).toBe('neu');
    expect(byId.b!.favorite).toBe(true);
    expect(byId.c!.doneLayers).toEqual([1]);
    expect(merged).toHaveLength(3);
  });
});
