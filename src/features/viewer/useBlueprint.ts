import { useMemo } from 'react';
import type { ContainerContent, Farm } from '../../lib/schema';
import { blockIndex, structureFromBlueprint, type Structure } from '../../lib/structure';
import { buildVisuals, type BlockVisual } from './visuals';

export interface LoadedBlueprint {
  structure: Structure;
  visuals: Array<BlockVisual | null>;
  start: { x: number; y: number; z: number };
  /** Behälterinhalt je Blockposition (Index in der Struktur). */
  contents: ReadonlyMap<number, ContainerContent>;
  /** Positionen, die im Raster eine Raute bekommen. */
  markers: ReadonlySet<number>;
}

/** Bauplan einer Farm als Struktur samt Darstellung; null, wenn keiner vorhanden ist. */
export function useBlueprint(farm: Farm): LoadedBlueprint | null {
  return useMemo(() => {
    if (!farm.blueprint) return null;
    const structure = structureFromBlueprint(farm.blueprint);
    const contents = new Map<number, ContainerContent>();
    for (const c of structure.containers ?? []) contents.set(blockIndex(structure.size, c.x, c.y, c.z), c);
    return {
      structure,
      visuals: buildVisuals(structure),
      start: farm.blueprint.start,
      contents,
      markers: new Set(contents.keys()),
    };
  }, [farm]);
}
