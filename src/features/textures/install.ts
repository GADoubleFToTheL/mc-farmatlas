/** Lädt das Texturpaket samt aller Bilder für die vorhandenen Baupläne und schaltet „Wie im Spiel“ ein. */
import { updateSettings } from '../../db/store';
import type { Farm } from '../../lib/schema';
import { ensurePack } from './usePack';

export type InstallResult = { ok: true; found: number; total: number } | { ok: false };

export async function installTextures(
  farms: readonly Farm[],
  onProgress?: (done: number, total: number) => void,
): Promise<InstallResult> {
  const index = await ensurePack();
  if (!index) return { ok: false };
  const { preloadForFarms } = await import('./preload');
  const result = await preloadForFarms(farms, index, onProgress);
  updateSettings({ textures: 'original' });
  return { ok: true, ...result };
}
