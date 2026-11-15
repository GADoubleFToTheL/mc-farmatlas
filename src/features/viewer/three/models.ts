/**
 * Ordnet jeder Blockposition ein Modell zu: mit Original-Texturen (wenn das Paket
 * geladen ist) oder als schlichten farbigen Ersatz. Blöcke, deren Form von den
 * Nachbarn abhängt (Redstone-Leitung, Zäune, Mauern, Scheiben), bekommen je
 * Verbindungsmuster ein eigenes Modell.
 */
import { blockAt, inBounds, paletteIndexAt, type Structure } from '../../../lib/structure';
import {
  buildModel,
  connectionFamily,
  wireConnectsTo,
  type BlockModel,
  type Connections,
  type Element,
  type FaceTex,
  type Side,
} from '../../../lib/textures/blockmodel';
import type { Face, PackIndex } from '../../../lib/textures/pack';
import type { BlockVisual } from '../visuals';

const SIDES: ReadonlyArray<[Side, number, number]> = [
  ['north', 0, -1],
  ['east', 1, 0],
  ['south', 0, 1],
  ['west', -1, 0],
];

function allFaces(tex: FaceTex): Record<Face, FaceTex> {
  return { up: tex, down: tex, north: tex, south: tex, east: tex, west: tex };
}

/** Farbiger Ersatz ohne Texturen – dieselben einfachen Formen wie in der Ebenenansicht. */
export function fallbackModel(v: BlockVisual): BlockModel {
  const tex: FaceTex = { path: v.style.color };
  const faces = allFaces(tex);
  const box = (from: [number, number, number], to: [number, number, number]): Element => ({ type: 'box', from, to, faces });
  const base = { rotX: 0, rotY: 0 } as const;
  if (v.shape === 'fluid') return { ...base, elements: [box([0, 0, 0], [16, 14, 16])], layer: 'blend', solid: false };
  if (v.shape === 'wire') return { ...base, elements: [box([1.5, 0, 1.5], [14.5, 1.3, 14.5])], layer: 'opaque', solid: false };
  if (v.shape === 'inset') return { ...base, elements: [box([4, 0, 4], [12, 14, 12])], layer: 'opaque', solid: false };
  const slab = v.state.id.endsWith('_slab') ? v.traits.half : undefined;
  if (slab === 'top') return { ...base, elements: [box([0, 8, 0], [16, 16, 16])], layer: 'opaque', solid: false };
  if (slab === 'bottom') return { ...base, elements: [box([0, 0, 0], [16, 8, 16])], layer: 'opaque', solid: false };
  const seeThrough = /glass|ice|leaves|slime|honey/.test(v.state.id);
  return { ...base, elements: [box([0, 0, 0], [16, 16, 16])], layer: 'opaque', solid: !seeThrough };
}

export interface ResolvedModel {
  /** Eindeutig je Modell (Palettenindex plus Verbindungsmuster). */
  key: string;
  paletteIndex: number;
  model: BlockModel;
}

export class ModelResolver {
  private readonly cache = new Map<string, ResolvedModel>();
  private readonly families: Array<ReturnType<typeof connectionFamily>>;
  private readonly solidByPalette: boolean[] = [];

  constructor(
    readonly structure: Structure,
    private readonly visuals: Array<BlockVisual | null>,
    /** null = ohne Original-Texturen */
    private readonly index: PackIndex | null,
  ) {
    this.families = structure.palette.map((state, i) => (i === 0 || !index ? null : connectionFamily(state.id)));
    structure.palette.forEach((_, i) => {
      this.solidByPalette[i] = i === 0 ? false : this.resolve(i, '').model.solid;
    });
  }

  private resolve(paletteIndex: number, connKey: string, connections?: Connections): ResolvedModel {
    const key = `${paletteIndex}|${connKey}`;
    let hit = this.cache.get(key);
    if (!hit) {
      const visual = this.visuals[paletteIndex]!;
      const textured = this.index ? buildModel(this.structure.palette[paletteIndex]!, { index: this.index, connections }) : null;
      hit = { key, paletteIndex, model: textured ?? fallbackModel(visual) };
      this.cache.set(key, hit);
    }
    return hit;
  }

  private connectionsAt(x: number, y: number, z: number, family: NonNullable<ReturnType<typeof connectionFamily>>): Connections {
    const s = this.structure;
    const result: Connections = {};
    for (const [side, dx, dz] of SIDES) {
      const nx = x + dx;
      const nz = z + dz;
      if (!inBounds(s.size, nx, y, nz)) continue;
      const neighborIndex = paletteIndexAt(s, nx, y, nz);
      if (neighborIndex === 0) continue;
      const neighbor = blockAt(s, nx, y, nz);
      if (family === 'wire') {
        if (wireConnectsTo(neighbor, side)) result[side] = true;
      } else if (this.families[neighborIndex] === family || this.solidByPalette[neighborIndex]) {
        result[side] = true;
      }
    }
    return result;
  }

  /** Modell an einer Position; null bei Luft. */
  at(x: number, y: number, z: number): ResolvedModel | null {
    const paletteIndex = paletteIndexAt(this.structure, x, y, z);
    if (paletteIndex === 0) return null;
    const family = this.families[paletteIndex];
    if (!family) return this.resolve(paletteIndex, '');
    const connections = this.connectionsAt(x, y, z, family);
    const connKey = (['north', 'east', 'south', 'west'] as const).filter((d) => connections[d]).map((d) => d[0]).join('');
    return this.resolve(paletteIndex, connKey, connections);
  }

  /** Modell ohne Nachbarn – für die Legende. */
  forPalette(paletteIndex: number): ResolvedModel | null {
    return paletteIndex === 0 ? null : this.resolve(paletteIndex, '');
  }

  isSolid(x: number, y: number, z: number): boolean {
    return this.solidByPalette[paletteIndexAt(this.structure, x, y, z)] ?? false;
  }

  /** Alle Modelle, die im Bauplan vorkommen. */
  allModels(): ResolvedModel[] {
    const { size } = this.structure;
    const seen = new Map<string, ResolvedModel>();
    for (let y = 0; y < size.y; y++) {
      for (let z = 0; z < size.z; z++) {
        for (let x = 0; x < size.x; x++) {
          const m = this.at(x, y, z);
          if (m && !seen.has(m.key)) seen.set(m.key, m);
        }
      }
    }
    return [...seen.values()];
  }
}
