/**
 * Lädt Mojangs Bedrock-Texturen auf Wunsch direkt von Mojangs GitHub-Repository
 * und legt sie im Browser-Cache dieses Geräts ab. Danach funktioniert alles offline.
 * Nichts davon liegt im Farmatlas-Repo.
 */
import { decodeTga } from '../../lib/textures/tga';
import type { Tint } from '../../lib/textures/blockmodel';
import { PACK_BASE, PACK_FILES, PACK_VERSION, PackIndex, parseLooseJson } from '../../lib/textures/pack';

const CACHE_NAME = `farmatlas-texturen-${PACK_VERSION}`;
/** Merkt sich, welche Texturen als .tga vorliegen oder fehlen – spart wiederholte Fehlversuche. */
const KINDS_URL = `${PACK_BASE}__farmatlas_kinds.json`;

type Kind = 'png' | 'tga' | 'missing';
let kinds: Record<string, Kind> | null = null;
let kindsDirty = false;

async function openCache(): Promise<Cache | null> {
  try {
    return 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
  } catch {
    return null;
  }
}

async function loadKinds(): Promise<Record<string, Kind>> {
  if (kinds) return kinds;
  const cache = await openCache();
  const hit = await cache?.match(KINDS_URL);
  kinds = hit ? ((await hit.json().catch(() => ({}))) as Record<string, Kind>) : {};
  return kinds;
}

async function saveKinds(): Promise<void> {
  if (!kinds || !kindsDirty) return;
  kindsDirty = false;
  const cache = await openCache();
  await cache?.put(KINDS_URL, new Response(JSON.stringify(kinds), { headers: { 'content-type': 'application/json' } }));
}

/** Erst Cache, dann Netz (und ablegen). Gibt null bei 404 oder ohne Netz zurück. */
async function fetchCached(url: string): Promise<Response | null> {
  const cache = await openCache();
  const hit = await cache?.match(url);
  if (hit) return hit;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    await cache?.put(url, response.clone());
    return response;
  } catch {
    return null;
  }
}

let indexPromise: Promise<PackIndex | null> | null = null;

/** Zuordnung Block → Textur; null, wenn sie weder im Cache noch im Netz erreichbar ist. */
export function loadPackIndex(): Promise<PackIndex | null> {
  indexPromise ??= (async () => {
    const [blocks, terrain] = await Promise.all([fetchCached(PACK_BASE + PACK_FILES.blocks), fetchCached(PACK_BASE + PACK_FILES.terrain)]);
    if (!blocks || !terrain) {
      indexPromise = null;
      return null;
    }
    try {
      return new PackIndex(parseLooseJson(await blocks.text()), parseLooseJson(await terrain.text()));
    } catch {
      indexPromise = null;
      return null;
    }
  })();
  return indexPromise;
}

/** Liegt das Paket schon auf dem Gerät? (ohne Netzabfrage) */
export async function isPackInstalled(): Promise<boolean> {
  const cache = await openCache();
  return !!(cache && (await cache.match(PACK_BASE + PACK_FILES.blocks)) && (await cache.match(PACK_BASE + PACK_FILES.terrain)));
}

export async function removePack(): Promise<void> {
  indexPromise = null;
  kinds = null;
  images.clear();
  if ('caches' in globalThis) await caches.delete(CACHE_NAME);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function applyTint(data: Uint8ClampedArray, tint: Tint): void {
  const [r, g, b] = hexToRgb(tint.color);
  for (let i = 0; i < data.length; i += 4) {
    if (tint.mode === 'mask') {
      // Nur deckende Pixel (das Gras) einfärben, den Rest (die Erde) deckend zeigen.
      if (data[i + 3]! > 0) {
        data[i] = (data[i]! * r) / 255;
        data[i + 1] = (data[i + 1]! * g) / 255;
        data[i + 2] = (data[i + 2]! * b) / 255;
      }
      data[i + 3] = 255;
    } else {
      data[i] = (data[i]! * r) / 255;
      data[i + 1] = (data[i + 1]! * g) / 255;
      data[i + 2] = (data[i + 2]! * b) / 255;
    }
  }
}

/** Rohbild einer Textur (erstes Bild bei Animationen), ohne Einfärbung. */
async function loadRaw(path: string): Promise<ImageData | null> {
  const known = await loadKinds();
  const tryKind = async (kind: 'png' | 'tga'): Promise<ImageData | null> => {
    const response = await fetchCached(`${PACK_BASE}${path}.${kind}`);
    if (!response) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let width: number;
    let height: number;
    let source: CanvasImageSource | ImageData;
    if (kind === 'tga') {
      const img = decodeTga(bytes);
      width = img.width;
      height = img.height;
      source = new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, width, height);
    } else {
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    }
    // Animierte Texturen sind Streifen aus quadratischen Bildern – nur das erste nehmen.
    const frame = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = frame;
    canvas.height = frame;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    if (source instanceof ImageData) ctx.putImageData(source, 0, 0);
    else ctx.drawImage(source, 0, 0);
    return ctx.getImageData(0, 0, frame, frame);
  };

  const kind = known[path];
  if (kind === 'missing') return null;
  if (kind) return tryKind(kind);
  for (const candidate of ['png', 'tga'] as const) {
    const image = await tryKind(candidate).catch(() => null);
    if (image) {
      known[path] = candidate;
      kindsDirty = true;
      return image;
    }
  }
  // Nur als „fehlt“ merken, wenn wir online sind – sonst könnte es am Netz liegen.
  if (navigator.onLine) {
    known[path] = 'missing';
    kindsDirty = true;
  }
  return null;
}

const images = new Map<string, Promise<HTMLCanvasElement | null>>();

/** Fertig eingefärbte Textur als Canvas; null, wenn es die Textur nicht gibt. */
export function loadTexture(path: string, tint?: Tint): Promise<HTMLCanvasElement | null> {
  const key = tint ? `${path}|${tint.mode}|${tint.color}` : path;
  let promise = images.get(key);
  if (!promise) {
    promise = (async () => {
      const raw = await loadRaw(path);
      if (!raw) return null;
      const data = new Uint8ClampedArray(raw.data);
      if (tint) applyTint(data, tint);
      const canvas = document.createElement('canvas');
      canvas.width = raw.width;
      canvas.height = raw.height;
      canvas.getContext('2d')!.putImageData(new ImageData(data, raw.width, raw.height), 0, 0);
      return canvas;
    })();
    images.set(key, promise);
    void promise.then(() => saveKinds());
  }
  return promise;
}

/** Lädt eine Liste von Texturen vorab (für die Offline-Nutzung). */
export async function preloadTextures(
  paths: ReadonlyArray<{ path: string; tint?: Tint }>,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let done = 0;
  let found = 0;
  const queue = [...paths];
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      if (await loadTexture(item.path, item.tint)) found++;
      onProgress?.(++done, paths.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await saveKinds();
  return found;
}
