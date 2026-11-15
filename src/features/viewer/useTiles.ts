import { useEffect, useState } from 'react';
import type { PackIndex } from '../../lib/textures/pack';
import type { LoadedBlueprint } from './useBlueprint';
import type { TileSet } from './three/tiles';

/**
 * Vorschaubilder der Blöcke mit Original-Texturen für Ebenenansicht und Legende.
 * null, solange keine Texturen aktiv sind oder noch geladen wird.
 */
export function useTiles(blueprint: LoadedBlueprint | null, pack: PackIndex | null): TileSet | null {
  const [tiles, setTiles] = useState<{ for: LoadedBlueprint; pack: PackIndex; set: TileSet } | null>(null);

  useEffect(() => {
    if (!blueprint || !pack) return;
    let cancelled = false;
    void (async () => {
      try {
        // three.js erst hier laden – ohne Texturen wird es für die Ebenenansicht nicht gebraucht.
        const [{ renderTiles }, { ModelResolver }] = await Promise.all([import('./three/tiles'), import('./three/models')]);
        const set = await renderTiles(new ModelResolver(blueprint.structure, blueprint.visuals, pack));
        if (!cancelled) setTiles({ for: blueprint, pack, set });
      } catch (e) {
        console.warn('Vorschaubilder konnten nicht erzeugt werden.', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blueprint, pack]);

  return tiles && tiles.for === blueprint && tiles.pack === pack ? tiles.set : null;
}
