import { useMemo } from 'react';
import type { ContainerContent, Farm } from '../../lib/schema';
import { blockIndex, structureFromBlueprint, type Structure } from '../../lib/structure';
import { NO_ORIENTATION, orientStructure, type Orientation } from '../../lib/transform';
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

export function loadBlueprint(structure: Structure, start: { x: number; y: number; z: number }): LoadedBlueprint {
  const contents = new Map<number, ContainerContent>();
  for (const c of structure.containers ?? []) contents.set(blockIndex(structure.size, c.x, c.y, c.z), c);
  return { structure, visuals: buildVisuals(structure), start, contents, markers: new Set(contents.keys()) };
}

/**
 * Bauplan einer Farm als Struktur samt Darstellung, in der gewählten Ausrichtung
 * (gedreht/gespiegelt); null, wenn die Farm keinen Bauplan hat.
 */
export function useBlueprint(farm: Farm, orientation: Orientation = NO_ORIENTATION): LoadedBlueprint | null {
  const base = useMemo(
    () => (farm.blueprint ? { structure: structureFromBlueprint(farm.blueprint), start: farm.blueprint.start } : null),
    [farm],
  );
  const { rot, mirror } = orientation;
  return useMemo(() => {
    if (!base) return null;
    const oriented = orientStructure(base.structure, base.start, { rot, mirror });
    return loadBlueprint(oriented.structure, oriented.start);
  }, [base, rot, mirror]);
}
