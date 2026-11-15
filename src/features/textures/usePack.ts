/**
 * Zustand des Texturpakets für die Oberfläche: aus, wird geladen, bereit oder Fehler.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useSettings } from '../../db/store';
import type { PackIndex } from '../../lib/textures/pack';
import { loadPackIndex } from './textureStore';

export type PackStatus = 'aus' | 'laedt' | 'bereit' | 'fehler';

interface PackState {
  status: PackStatus;
  index: PackIndex | null;
}

let state: PackState = { status: 'aus', index: null };
const listeners = new Set<() => void>();

function set(next: PackState): void {
  state = next;
  for (const l of listeners) l();
}

let loading = false;

/** Lädt die Zuordnung (aus dem Cache oder dem Netz), falls noch nicht geschehen. */
export async function ensurePack(): Promise<PackIndex | null> {
  if (state.index) return state.index;
  if (loading) return null;
  loading = true;
  set({ status: 'laedt', index: null });
  const index = await loadPackIndex();
  loading = false;
  set(index ? { status: 'bereit', index } : { status: 'fehler', index: null });
  return index;
}

export function resetPack(): void {
  set({ status: 'aus', index: null });
}

/** Texturpaket laut Einstellungen; `index` ist nur gesetzt, wenn Original-Texturen aktiv und geladen sind. */
export function usePack(): PackState {
  const { textures } = useSettings();
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  useEffect(() => {
    if (textures === 'original' && !state.index) void ensurePack();
  }, [textures]);
  return textures === 'original' ? current : { status: 'aus', index: null };
}
