/**
 * Einheitliche Struktur für Baupläne – unabhängig davon, ob sie aus einem
 * Zeichenraster (Farm-JSON) oder später aus einer Schematic-Datei stammen.
 *
 * Achsen: x = Westen → Osten, y = unten → oben, z = Norden → Süden.
 */
import { parseBlockState, type BlockState, type StateSyntax } from './blockstate';
import { AIR_CHAR, type Blueprint } from './schema';

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
}

export const AIR: BlockState = { id: 'minecraft:air', props: {} };

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

export function structureFromBlueprint(bp: Blueprint): Structure {
  const size: Size3 = {
    x: [...bp.layers[0]![0]!].length,
    y: bp.layers.length,
    z: bp.layers[0]!.length,
  };
  const palette: BlockState[] = [AIR];
  const charToIndex = new Map<string, number>([[AIR_CHAR, 0]]);
  for (const [key, value] of Object.entries(bp.palette)) {
    const state = parseBlockState(value, bp.stateSyntax);
    if (state.id === AIR.id) {
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
  return { size, syntax: bp.stateSyntax, palette, blocks };
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
