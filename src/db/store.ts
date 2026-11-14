/**
 * Zustand der persönlichen Daten im Arbeitsspeicher, gespiegelt in IndexedDB.
 * Komponenten lesen über die Hooks unten und schreiben über die update-Funktionen.
 */
import { useSyncExternalStore } from 'react';
import {
  createBackup,
  DEFAULT_SETTINGS,
  emptyFarmState,
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
}

let state: State = {
  ready: false,
  persistent: true,
  settings: DEFAULT_SETTINGS,
  farmStates: new Map(),
  favorites: new Set(),
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

let initPromise: Promise<void> | null = null;

/** Lädt die gespeicherten Daten einmalig beim Start. */
export function initStore(): Promise<void> {
  initPromise ??= (async () => {
    const [persistent, stored, farmStates] = await Promise.all([
      database.isPersistent(),
      database.loadSettings(),
      database.loadAllFarmStates(),
    ]);
    const parsed = settingsSchema.safeParse(stored);
    const settings = parsed.success ? parsed.data : DEFAULT_SETTINGS;
    applyTheme(settings.theme);
    setState({
      ready: true,
      persistent,
      settings,
      farmStates: new Map(farmStates.map((s) => [s.farmId, s])),
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

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...state.settings, ...patch };
  applyTheme(settings.theme);
  setState({ settings });
  void database.saveSettings(settings);
}

export function updateFarmState(farmId: string, patch: Partial<Omit<FarmState, 'farmId' | 'updatedAt'>>): void {
  const current = state.farmStates.get(farmId) ?? emptyFarmState(farmId);
  const next: FarmState = { ...current, ...patch, farmId, updatedAt: Date.now() };
  const farmStates = new Map(state.farmStates);
  farmStates.set(farmId, next);
  setState({ farmStates });
  void database.saveFarmState(next);
}

export function toggleFavorite(farmId: string): void {
  const current = state.farmStates.get(farmId);
  updateFarmState(farmId, { favorite: !(current?.favorite ?? false) });
}

export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export async function exportBackup(): Promise<Backup> {
  return createBackup(state.settings, [...state.farmStates.values()], await database.loadUserFarms());
}

/** Führt ein Backup mit den vorhandenen Daten zusammen (neuerer Stand gewinnt). */
export async function importBackup(backup: Backup, mode: 'merge' | 'replace'): Promise<number> {
  const merged =
    mode === 'replace' ? backup.farmStates : mergeFarmStates([...state.farmStates.values()], backup.farmStates);
  await database.replaceAllFarmStates(merged);
  if (mode === 'replace') {
    applyTheme(backup.settings.theme);
    await database.saveSettings(backup.settings);
    setState({ settings: backup.settings });
  }
  setState({ farmStates: new Map(merged.map((s) => [s.farmId, s])) });
  return backup.farmStates.length;
}
