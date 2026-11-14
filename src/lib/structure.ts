/**
 * Einheitliche Struktur für Baupläne – unabhängig davon, ob sie aus einem
 * Zeichenraster (Farm-JSON) oder aus einer Schematic-Datei stammen.
 *
 * Achsen: x = Westen → Osten, y = unten → oben, z = Norden → Süden.
 */
import { formatBlockState, isAir, parseBlockState, type BlockState, type StateSyntax } from './blockstate';
import {
  AIR_CHAR,
  type Blueprint,
  type ContainerContent,
  type GridBlueprint,
  type IndexedBlueprint,
} from './schema';

export interface Size3 {
  x: number;
  y: number;
  z: number;
}

export interface Structure {
  size: Size3;
  syntax: StateSyntax;
  /** Index 0 ist immer Luft. */
  palette: BlockState[];
  /** Palettenindex je Block; Position = (y * size.z + z) * size.x + x. */
  blocks: Uint16Array;
  /** Hinweis je Palettenindex (z. B. nicht übersetzte Bedrock-Zustände). */
  paletteNotes?: Array<string | undefined>;
  /** Inhalt von Behältern. */
  containers?: ContainerContent[];
}

export const AIR: BlockState = { id: 'minecraft:air', props: {} };

/** Mehr Paletteneinträge passen nicht in das Index-Array. */
export const MAX_PALETTE = 65535;

export function blockIndex(size: Size3, x: number, y: number, z: number): number {
  return (y * size.z + z) * size.x + x;
}

export function inBounds(size: Size3, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < size.x && y < size.y && z < size.z;
}

export function paletteIndexAt(s: Structure, x: number, y: number, z: number): number {
  return inBounds(s.size, x, y, z) ? s.blocks[blockIndex(s.size, x, y, z)]! : 0;
}

export function blockAt(s: Structure, x: number, y: number, z: number): BlockState {
  return s.palette[paletteIndexAt(s, x, y, z)]!;
}

function fromGrid(bp: GridBlueprint): Structure {
  const size: Size3 = {
    x: [...bp.layers[0]![0]!].length,
    y: bp.layers.length,
    z: bp.layers[0]!.length,
  };
  const palette: BlockState[] = [AIR];
  const charToIndex = new Map<string, number>([[AIR_CHAR, 0]]);
  for (const [key, value] of Object.entries(bp.palette)) {
    const state = parseBlockState(value, bp.stateSyntax);
    if (isAir(state)) {
      charToIndex.set(key, 0);
    } else {
      charToIndex.set(key, palette.length);
      palette.push(state);
    }
  }
  const blocks = new Uint16Array(size.x * size.y * size.z);
  bp.layers.forEach((layer, y) => {
    layer.forEach((row, z) => {
      [...row].forEach((ch, x) => {
        const index = charToIndex.get(ch);
        if (index === undefined) throw new Error(`Unbekanntes Kürzel "${ch}" im Bauplan`);
        blocks[blockIndex(size, x, y, z)] = index;
      });
    });
  });
  return { size, syntax: bp.stateSyntax, palette, blocks, containers: bp.containers };
}

function fromIndexed(bp: IndexedBlueprint): Structure {
  const size = { ...bp.size };
  const palette = bp.palette.map((value, i) => (i === 0 ? AIR : parseBlockState(value, bp.stateSyntax)));
  const blocks = new Uint16Array(size.x * size.y * size.z);
  let offset = 0;
  for (let i = 0; i + 1 < bp.runs.length; i += 2) {
    const index = bp.runs[i]!;
    const count = bp.runs[i + 1]!;
    if (index >= palette.length || offset + count > blocks.length) throw new Error('Bauplan-Daten sind beschädigt');
    if (index !== 0) blocks.fill(index, offset, offset + count);
    offset += count;
  }
  if (offset !== blocks.length) throw new Error('Bauplan-Daten sind unvollständig');
  const paletteNotes = bp.paletteNotes
    ? palette.map((_, i) => bp.paletteNotes![String(i)])
    : undefined;
  return { size, syntax: bp.stateSyntax, palette, blocks, paletteNotes, containers: bp.containers };
}

export function structureFromBlueprint(bp: Blueprint): Structure {
  return bp.format === 'grid' ? fromGrid(bp) : fromIndexed(bp);
}

/** Anzahl je Palettenindex (ohne Luft) für eine Ebene bzw. die ganze Struktur. */
export function countBlocks(s: Structure, layer?: number): Map<number, number> {
  const counts = new Map<number, number>();
  const perLayer = s.size.x * s.size.z;
  const from = layer === undefined ? 0 : layer * perLayer;
  const to = layer === undefined ? s.blocks.length : from + perLayer;
  for (let i = from; i < to; i++) {
    const p = s.blocks[i]!;
    if (p !== 0) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return counts;
}

export function isLayerEmpty(s: Structure, layer: number): boolean {
  return countBlocks(s, layer).size === 0;
}

export function totalBlocks(s: Structure): number {
  let n = 0;
  for (let i = 0; i < s.blocks.length; i++) if (s.blocks[i] !== 0) n++;
  return n;
}

/**
 * Entfernt leere Ränder und unbenutzte Paletteneinträge.
 * Gibt null zurück, wenn die Struktur keinen einzigen Block enthält.
 */
export function trimStructure(s: Structure): Structure | null {
  const min = [s.size.x, s.size.y, s.size.z];
  const max = [-1, -1, -1];
  for (let y = 0; y < s.size.y; y++) {
    for (let z = 0; z < s.size.z; z++) {
      for (let x = 0; x < s.size.x; x++) {
        if (s.blocks[blockIndex(s.size, x, y, z)] === 0) continue;
        if (x < min[0]!) min[0] = x;
        if (y < min[1]!) min[1] = y;
        if (z < min[2]!) min[2] = z;
        if (x > max[0]!) max[0] = x;
        if (y > max[1]!) max[1] = y;
        if (z > max[2]!) max[2] = z;
      }
    }
  }
  if (max[0]! < 0) return null;
  const size: Size3 = { x: max[0]! - min[0]! + 1, y: max[1]! - min[1]! + 1, z: max[2]! - min[2]! + 1 };
  const remap = new Map<number, number>([[0, 0]]);
  const palette: BlockState[] = [AIR];
  const notes: Array<string | undefined> = [undefined];
  const blocks = new Uint16Array(size.x * size.y * size.z);
  for (let y = 0; y < size.y; y++) {
    for (let z = 0; z < size.z; z++) {
      for (let x = 0; x < size.x; x++) {
        const old = s.blocks[blockIndex(s.size, x + min[0]!, y + min[1]!, z + min[2]!)]!;
        let index = remap.get(old);
        if (index === undefined) {
          index = palette.length;
          remap.set(old, index);
          palette.push(s.palette[old]!);
          notes.push(s.paletteNotes?.[old]);
        }
        blocks[blockIndex(size, x, y, z)] = index;
      }
    }
  }
  const containers = s.containers
    ?.map((c) => ({ ...c, x: c.x - min[0]!, y: c.y - min[1]!, z: c.z - min[2]! }))
    .filter((c) => inBounds(size, c.x, c.y, c.z));
  return {
    size,
    syntax: s.syntax,
    palette,
    blocks,
    paletteNotes: notes.some((n) => n !== undefined) ? notes : undefined,
    containers: containers && containers.length > 0 ? containers : undefined,
  };
}

/** Erster Block der untersten Ebene (von Nordwesten aus) – Vorschlag für den Startblock. */
export function defaultStart(s: Structure): Size3 {
  for (let y = 0; y < s.size.y; y++) {
    for (let z = 0; z < s.size.z; z++) {
      for (let x = 0; x < s.size.x; x++) {
        if (s.blocks[blockIndex(s.size, x, y, z)] !== 0) return { x, y, z };
      }
    }
  }
  return { x: 0, y: 0, z: 0 };
}

/** Zeichen, die im Zeichenraster als Kürzel dienen können. */
const GRID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=?@$~^';

/** Bis zu dieser Kantenlänge bleibt ein Bauplan als Zeichenraster gut lesbar. */
const GRID_MAX_EDGE = 48;

export function fitsGrid(s: Structure): boolean {
  return (
    s.palette.length - 1 <= GRID_CHARS.length &&
    Math.max(s.size.x, s.size.z) <= GRID_MAX_EDGE &&
    !s.paletteNotes?.some((n) => n !== undefined)
  );
}

function toGrid(s: Structure, start: Size3): GridBlueprint {
  const palette: Record<string, string> = {};
  const chars: string[] = [AIR_CHAR];
  for (let i = 1; i < s.palette.length; i++) {
    const ch = GRID_CHARS[i - 1]!;
    chars.push(ch);
    palette[ch] = formatBlockState(s.palette[i]!, s.syntax);
  }
  const layers: string[][] = [];
  for (let y = 0; y < s.size.y; y++) {
    const rows: string[] = [];
    for (let z = 0; z < s.size.z; z++) {
      let row = '';
      for (let x = 0; x < s.size.x; x++) row += chars[s.blocks[blockIndex(s.size, x, y, z)]!];
      rows.push(row);
    }
    layers.push(rows);
  }
  return {
    format: 'grid',
    stateSyntax: s.syntax,
    start,
    ...(s.containers ? { containers: s.containers } : {}),
    palette,
    layers,
  };
}

function toIndexed(s: Structure, start: Size3): IndexedBlueprint {
  const runs: number[] = [];
  let current = -1;
  let count = 0;
  for (let i = 0; i < s.blocks.length; i++) {
    const p = s.blocks[i]!;
    if (p === current) {
      count++;
    } else {
      if (count > 0) runs.push(current, count);
      current = p;
      count = 1;
    }
  }
  if (count > 0) runs.push(current, count);
  const notes: Record<string, string> = {};
  s.paletteNotes?.forEach((n, i) => {
    if (n) notes[String(i)] = n;
  });
  return {
    format: 'indexed',
    stateSyntax: s.syntax,
    start,
    ...(s.containers ? { containers: s.containers } : {}),
    size: { ...s.size },
    palette: s.palette.map((state, i) => (i === 0 ? AIR.id : formatBlockState(state, s.syntax))),
    runs,
    ...(Object.keys(notes).length > 0 ? { paletteNotes: notes } : {}),
  };
}

/**
 * Struktur als Bauplan speichern. Kleine Baupläne werden zum lesbaren
 * Zeichenraster, große zum kompakten Index-Format.
 */
export function blueprintFromStructure(
  s: Structure,
  start: Size3 = defaultStart(s),
  format: 'auto' | 'grid' | 'indexed' = 'auto',
): Blueprint {
  const useGrid = format === 'grid' || (format === 'auto' && fitsGrid(s));
  if (useGrid && s.palette.length - 1 > GRID_CHARS.length) {
    throw new Error('Zu viele verschiedene Blöcke für das Zeichenraster');
  }
  return useGrid ? toGrid(s, start) : toIndexed(s, start);
}
