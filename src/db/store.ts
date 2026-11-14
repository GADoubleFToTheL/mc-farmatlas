/**
 * Zustand der persönlichen Daten im Arbeitsspeicher, gespiegelt in IndexedDB.
 * Komponenten lesen über die Hooks unten und schreiben über die update-Funktionen.
 */
import { useSyncExternalStore } from 'react';
import { localFarmRecordSchema, type LocalFarmRecord } from '../lib/localfarm';
import {
  createBackup,
  DEFAULT_SETTINGS,
  emptyFarmState,
  farmStateSchema,
  mergeFarmStates,
  settingsSchema,
  type Backup,
  type FarmState,
  type Settings,
} from '../lib/userdata';
import * as database from './database';

interface State {
  ready: boolean;
  persistent: boolean;
  settings: Settings;
  farmStates: ReadonlyMap<string, FarmState>;
  favorites: ReadonlySet<string>;
  /** Lokal importierte Farmen, Schlüssel = Datensatz-ID. */
  localFarms: ReadonlyMap<string, LocalFarmRecord>;
}

let state: State = {
  ready: false,
  persistent: true,
  settings: DEFAULT_SETTINGS,
  farmStates: new Map(),
  favorites: new Set(),
  localFarms: new Map(),
};

const listeners = new Set<() => void>();

function setState(patch: Partial<State>): void {
  state = { ...state, ...patch };
  if (patch.farmStates) {
    state.favorites = new Set([...state.farmStates.values()].filter((s) => s.favorite).map((s) => s.farmId));
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyTheme(theme: Settings['theme']): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#12161a' : '#f1f3f1');
}

/** Behält nur Datensätze, die dem aktuellen Schema entsprechen. */
export function parseLocalFarms(raw: readonly unknown[]): LocalFarmRecord[] {
  const records: LocalFarmRecord[] = [];
  for (const entry of raw) {
    const parsed = localFarmRecordSchema.safeParse(entry);
    if (parsed.success) records.push(parsed.data);
  }
  return records;
}

/** Ergänzt Felder, die ältere gespeicherte Einträge noch nicht kennen. */
function parseFarmStates(raw: readonly unknown[]): FarmState[] {
  const states: FarmState[] = [];
  for (const entry of raw) {
    const parsed = farmStateSchema.safeParse(entry);
    if (parsed.success) states.push(parsed.data);
  }
  return states;
}

let initPromise: Promise<void> | null = null;

/** Lädt die gespeicherten Daten einmalig beim Start. */
export function initStore(): Promise<void> {
  initPromise ??= (async () => {
    const [persistent, stored, farmStates, userFarms] = await Promise.all([
      database.isPersistent(),
      database.loadSettings(),
      database.loadAllFarmStates(),
      database.loadUserFarms(),
    ]);
    const parsed = settingsSchema.safeParse(stored);
    const settings = parsed.success ? parsed.data : DEFAULT_SETTINGS;
    applyTheme(settings.theme);
    setState({
      ready: true,
      persistent,
      settings,
      farmStates: new Map(parseFarmStates(farmStates).map((s) => [s.farmId, s])),
      localFarms: new Map(parseLocalFarms(userFarms).map((r) => [r.id, r])),
    });
  })();
  return initPromise;
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(subscribe, () => state.ready);
}

export function usePersistent(): boolean {
  return useSyncExternalStore(subscribe, () => state.persistent);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => state.settings);
}

export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => state.favorites);
}

const EMPTY_STATES = new Map<string, FarmState>();

export function useFarmState(farmId: string): FarmState {
  const stored = useSyncExternalStore(subscribe, () => state.farmStates.get(farmId));
  let empty = EMPTY_STATES.get(farmId);
  if (!empty) {
    empty = emptyFarmState(farmId);
    EMPTY_STATES.set(farmId, empty);
  }
  return stored ?? empty;
}

export function useAllFarmStates(): ReadonlyMap<string, FarmState> {
  return useSyncExternalStore(subscribe, () => state.farmStates);
}

export function useLocalFarms(): ReadonlyMap<string, LocalFarmRecord> {
  return useSyncExternalStore(subscribe, () => state.localFarms);
}

export async function saveLocalFarm(record: LocalFarmRecord): Promise<void> {
  const localFarms = new Map(state.localFarms);
  localFarms.set(record.id, record);
  setState({ localFarms });
  await database.saveUserFarm(record);
  requestPersistence();
}

export async function deleteLocalFarm(id: string): Promise<void> {
  const localFarms = new Map(state.localFarms);
  localFarms.delete(id);
  setState({ localFarms });
  await database.deleteUserFarm(id);
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...state.settings, ...patch };
  applyTheme(settings.theme);
  setState({ settings });
  void database.saveSettings(settings);
}

let persistRequested = false;

/** Bittet den Browser einmalig, die Daten nicht von sich aus zu löschen. */
function requestPersistence(): void {
  if (persistRequested) return;
  persistRequested = true;
  void navigator.storage?.persist?.().catch(() => false);
}

export function updateFarmState(farmId: string, patch: Partial<Omit<FarmState, 'farmId' | 'updatedAt'>>): void {
  const current = state.farmStates.get(farmId) ?? emptyFarmState(farmId);
  const next: FarmState = { ...current, ...patch, farmId, updatedAt: Date.now() };
  const farmStates = new Map(state.farmStates);
  farmStates.set(farmId, next);
  setState({ farmStates });
  void database.saveFarmState(next);
  requestPersistence();
}

export function toggleFavorite(farmId: string): void {
  const current = state.farmStates.get(farmId);
  updateFarmState(farmId, { favorite: !(current?.favorite ?? false) });
}

export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export async function exportBackup(): Promise<Backup> {
  return createBackup(state.settings, [...state.farmStates.values()], [...state.localFarms.values()]);
}

export interface BackupImportResult {
  farmStates: number;
  localFarms: number;
}

/** Führt ein Backup mit den vorhandenen Daten zusammen (neuerer Stand gewinnt) oder ersetzt sie. */
export async function importBackup(backup: Backup, mode: 'merge' | 'replace'): Promise<BackupImportResult> {
  const incomingFarms = parseLocalFarms(backup.userFarms);
  const mergedStates =
    mode === 'replace' ? backup.farmStates : mergeFarmStates([...state.farmStates.values()], backup.farmStates);
  const localFarms = new Map(mode === 'replace' ? [] : state.localFarms);
  for (const record of incomingFarms) {
    const existing = localFarms.get(record.id);
    if (!existing || record.info.importedAt >= existing.info.importedAt) localFarms.set(record.id, record);
  }
  await database.replaceAllFarmStates(mergedStates);
  await database.replaceAllUserFarms([...localFarms.values()]);
  if (mode === 'replace') {
    applyTheme(backup.settings.theme);
    await database.saveSettings(backup.settings);
    setState({ settings: backup.settings });
  }
  setState({ farmStates: new Map(mergedStates.map((s) => [s.farmId, s])), localFarms });
  return { farmStates: backup.farmStates.length, localFarms: incomingFarms.length };
}
