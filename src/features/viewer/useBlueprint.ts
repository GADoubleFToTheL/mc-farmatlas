import { useMemo } from 'react';
import type { Farm } from '../../lib/schema';
import { structureFromBlueprint, type Structure } from '../../lib/structure';
import { buildVisuals, type BlockVisual } from './visuals';

export interface LoadedBlueprint {
  structure: Structure;
  visuals: Array<BlockVisual | null>;
  start: { x: number; y: number; z: number };
}

/** Bauplan einer Farm als Struktur samt Darstellung; null, wenn keiner vorhanden ist. */
export function useBlueprint(farm: Farm): LoadedBlueprint | null {
  return useMemo(() => {
    if (!farm.blueprint) return null;
    const structure = structureFromBlueprint(farm.blueprint);
    return { structure, visuals: buildVisuals(structure), start: farm.blueprint.start };
  }, [farm]);
}
