/**
 * IndexedDB-Zugriff. Alle persönlichen Daten bleiben auf dem Gerät.
 * Ist IndexedDB nicht verfügbar (z. B. privater Modus), arbeitet die App
 * im Arbeitsspeicher weiter und weist in den Einstellungen darauf hin.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FarmState, Settings } from '../lib/userdata';

interface FarmatlasDB extends DBSchema {
  farmState: { key: string; value: FarmState };
  settings: { key: string; value: Settings };
  /** Lokal importierte Farmen (Phase 2). */
  userFarms: { key: string; value: { id: string } & Record<string, unknown> };
}

const DB_NAME = 'farmatlas';
const DB_VERSION = 1;
const SETTINGS_KEY = 'app';

let dbPromise: Promise<IDBPDatabase<FarmatlasDB> | null> | null = null;

function open(): Promise<IDBPDatabase<FarmatlasDB> | null> {
  dbPromise ??= (async () => {
    try {
      return await openDB<FarmatlasDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('farmState')) db.createObjectStore('farmState', { keyPath: 'farmId' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
          if (!db.objectStoreNames.contains('userFarms')) db.createObjectStore('userFarms', { keyPath: 'id' });
        },
      });
    } catch (e) {
      console.warn('IndexedDB nicht verfügbar – Daten werden nicht dauerhaft gespeichert.', e);
      return null;
    }
  })();
  return dbPromise;
}

export async function isPersistent(): Promise<boolean> {
  return (await open()) !== null;
}

export async function loadAllFarmStates(): Promise<FarmState[]> {
  const db = await open();
  return db ? db.getAll('farmState') : [];
}

export async function saveFarmState(state: FarmState): Promise<void> {
  const db = await open();
  await db?.put('farmState', state);
}

export async function replaceAllFarmStates(states: FarmState[]): Promise<void> {
  const db = await open();
  if (!db) return;
  const tx = db.transaction('farmState', 'readwrite');
  await tx.store.clear();
  await Promise.all(states.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function loadSettings(): Promise<Settings | undefined> {
  const db = await open();
  return db?.get('settings', SETTINGS_KEY);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await open();
  await db?.put('settings', settings, SETTINGS_KEY);
}

export async function loadUserFarms(): Promise<unknown[]> {
  const db = await open();
  return db ? db.getAll('userFarms') : [];
}
