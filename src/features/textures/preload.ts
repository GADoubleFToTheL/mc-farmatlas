/** Sammelt alle Texturen, die die vorhandenen Baupläne brauchen, und lädt sie vorab. */
import type { Farm } from '../../lib/schema';
import { structureFromBlueprint } from '../../lib/structure';
import type { Tint } from '../../lib/textures/blockmodel';
import { buildMeshData } from '../../lib/textures/meshdata';
import type { PackIndex } from '../../lib/textures/pack';
import { ModelResolver } from '../viewer/three/models';
import { buildVisuals } from '../viewer/visuals';
import { preloadTextures } from './textureStore';

export function texturesForFarms(farms: readonly Farm[], index: PackIndex): Array<{ path: string; tint?: Tint }> {
  const needed = new Map<string, { path: string; tint?: Tint }>();
  for (const farm of farms) {
    if (!farm.blueprint) continue;
    const structure = structureFromBlueprint(farm.blueprint);
    const resolver = new ModelResolver(structure, buildVisuals(structure), index);
    for (const { model } of resolver.allModels()) {
      for (const group of buildMeshData(model)) {
        if (!group.tex.path.startsWith('#')) needed.set(group.material, { path: group.tex.path, tint: group.tex.tint });
      }
    }
  }
  return [...needed.values()];
}

export async function preloadForFarms(
  farms: readonly Farm[],
  index: PackIndex,
  onProgress?: (done: number, total: number) => void,
): Promise<{ found: number; total: number }> {
  const list = texturesForFarms(farms, index);
  const found = await preloadTextures(list, onProgress);
  return { found, total: list.length };
}
