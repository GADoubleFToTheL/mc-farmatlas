/**
 * Baupläne drehen und spiegeln – Positionen und Blockausrichtungen.
 *
 * Achsen: x = Westen → Osten, z = Norden → Süden. „Im Uhrzeigersinn“ heißt von
 * oben gesehen: Norden wandert nach Osten.
 */
import { formatBlockState, type BlockState } from './blockstate';
import { blockIndex, type Size3, type Structure } from './structure';

export type TransformOp = 'rotate-cw' | 'rotate-ccw' | 'rotate-180' | 'mirror-x' | 'mirror-z';

/** Ausrichtung, wie sie je Farm gespeichert wird: erst spiegeln (West ↔ Ost), dann drehen. */
export interface Orientation {
  /** Vierteldrehungen im Uhrzeigersinn (0–3). */
  rot: number;
  /** West und Ost vertauscht. */
  mirror: boolean;
}

export const NO_ORIENTATION: Orientation = { rot: 0, mirror: false };

type Horizontal = 'north' | 'east' | 'south' | 'west';
const CW: Record<Horizontal, Horizontal> = { north: 'east', east: 'south', south: 'west', west: 'north' };
const HORIZONTAL = ['north', 'east', 'south', 'west'] as const;

function isHorizontal(v: string | undefined): v is Horizontal {
  return v === 'north' || v === 'east' || v === 'south' || v === 'west';
}

/** Himmelsrichtung nach der Operation. */
export function transformDirection(dir: Horizontal, op: TransformOp): Horizontal {
  switch (op) {
    case 'rotate-cw':
      return CW[dir];
    case 'rotate-180':
      return CW[CW[dir]];
    case 'rotate-ccw':
      return CW[CW[CW[dir]]];
    case 'mirror-x':
      return dir === 'east' ? 'west' : dir === 'west' ? 'east' : dir;
    case 'mirror-z':
      return dir === 'north' ? 'south' : dir === 'south' ? 'north' : dir;
  }
}

const isMirror = (op: TransformOp): boolean => op === 'mirror-x' || op === 'mirror-z';
const swapsAxes = (op: TransformOp): boolean => op === 'rotate-cw' || op === 'rotate-ccw';

/** Schienenformen aus zwei Richtungen in der Schreibweise des Spiels. */
const RAIL_PAIRS = ['north_south', 'east_west', 'south_east', 'south_west', 'north_west', 'north_east'];

function transformRailShape(shape: string, op: TransformOp): string {
  if (shape.startsWith('ascending_')) {
    const dir = shape.slice('ascending_'.length);
    return isHorizontal(dir) ? `ascending_${transformDirection(dir, op)}` : shape;
  }
  const [a, b] = shape.split('_');
  if (!isHorizontal(a) || !isHorizontal(b)) return shape;
  const ta = transformDirection(a, op);
  const tb = transformDirection(b, op);
  return RAIL_PAIRS.find((p) => p === `${ta}_${tb}` || p === `${tb}_${ta}`) ?? shape;
}

/** 16-teilige Drehung von Schildern, Bannern und Köpfen (0 = Süden, 4 = Westen, 8 = Norden, 12 = Osten). */
function transformRotation16(value: number, op: TransformOp): number {
  switch (op) {
    case 'rotate-cw':
      return (value + 4) % 16;
    case 'rotate-180':
      return (value + 8) % 16;
    case 'rotate-ccw':
      return (value + 12) % 16;
    case 'mirror-x':
      return (16 - value) % 16;
    case 'mirror-z':
      return (24 - value) % 16;
  }
}

const LEFT_RIGHT: Record<string, string> = {
  left: 'right',
  right: 'left',
  inner_left: 'inner_right',
  inner_right: 'inner_left',
  outer_left: 'outer_right',
  outer_right: 'outer_left',
};

/** Blockzustand nach der Operation. Unbekannte Eigenschaften bleiben unverändert. */
export function transformState(state: BlockState, op: TransformOp): BlockState {
  const p = state.props;
  if (Object.keys(p).length === 0) return state;
  const out: Record<string, string> = { ...p };
  const id = state.id.slice(state.id.indexOf(':') + 1);

  if (isHorizontal(p.facing)) out.facing = transformDirection(p.facing, op);

  // Seiten-Eigenschaften (Zäune, Mauern, Scheiben, Redstone-Leitung, Ranken …)
  const sides = HORIZONTAL.filter((d) => d in p);
  if (sides.length > 0) {
    for (const d of sides) delete out[d];
    for (const d of sides) out[transformDirection(d, op)] = p[d]!;
  }

  if (swapsAxes(op) && (p.axis === 'x' || p.axis === 'z')) out.axis = p.axis === 'x' ? 'z' : 'x';

  if (p.rotation !== undefined && /^\d+$/.test(p.rotation)) {
    out.rotation = String(transformRotation16(Number(p.rotation), op));
  }

  if (p.shape !== undefined) {
    if (id.endsWith('rail')) out.shape = transformRailShape(p.shape, op);
    else if (isMirror(op) && LEFT_RIGHT[p.shape]) out.shape = LEFT_RIGHT[p.shape]!;
  }

  // Werker, Verbundblock: z. B. "north_up", "up_east"
  if (p.orientation !== undefined) {
    out.orientation = p.orientation
      .split('_')
      .map((part) => (isHorizontal(part) ? transformDirection(part, op) : part))
      .join('_');
  }

  if (isMirror(op)) {
    if (p.hinge && LEFT_RIGHT[p.hinge]) out.hinge = LEFT_RIGHT[p.hinge]!;
    if ((id === 'chest' || id === 'trapped_chest') && p.type && LEFT_RIGHT[p.type]) out.type = LEFT_RIGHT[p.type]!;
  }
  return { id: state.id, props: out };
}

export function transformSize(size: Size3, op: TransformOp): Size3 {
  return swapsAxes(op) ? { x: size.z, y: size.y, z: size.x } : { ...size };
}

/** Position eines Blocks nach der Operation (`size` ist die Größe davor). */
export function transformPoint(size: Size3, point: Size3, op: TransformOp): Size3 {
  const { x, y, z } = point;
  switch (op) {
    case 'rotate-cw':
      return { x: size.z - 1 - z, y, z: x };
    case 'rotate-ccw':
      return { x: z, y, z: size.x - 1 - x };
    case 'rotate-180':
      return { x: size.x - 1 - x, y, z: size.z - 1 - z };
    case 'mirror-x':
      return { x: size.x - 1 - x, y, z };
    case 'mirror-z':
      return { x, y, z: size.z - 1 - z };
  }
}

export function transformStructure(s: Structure, op: TransformOp): Structure {
  const size = transformSize(s.size, op);
  // Palette umrechnen; gleiche Zustände fallen zusammen (kommt praktisch nicht vor, schadet aber nicht).
  const palette: BlockState[] = [s.palette[0]!];
  const notes: Array<string | undefined> = [undefined];
  const byKey = new Map<string, number>();
  const remap = new Uint16Array(s.palette.length);
  for (let i = 1; i < s.palette.length; i++) {
    const state = transformState(s.palette[i]!, op);
    const key = formatBlockState(state);
    let index = byKey.get(key);
    if (index === undefined) {
      index = palette.length;
      byKey.set(key, index);
      palette.push(state);
      notes.push(s.paletteNotes?.[i]);
    }
    remap[i] = index;
  }
  const blocks = new Uint16Array(s.blocks.length);
  for (let y = 0; y < s.size.y; y++) {
    for (let z = 0; z < s.size.z; z++) {
      for (let x = 0; x < s.size.x; x++) {
        const value = s.blocks[blockIndex(s.size, x, y, z)]!;
        if (value === 0) continue;
        const t = transformPoint(s.size, { x, y, z }, op);
        blocks[blockIndex(size, t.x, t.y, t.z)] = remap[value]!;
      }
    }
  }
  return {
    size,
    syntax: s.syntax,
    palette,
    blocks,
    paletteNotes: notes.some((n) => n !== undefined) ? notes : undefined,
    containers: s.containers?.map((c) => ({ ...c, ...transformPoint(s.size, c, op) })),
  };
}

function opsFor(o: Orientation): TransformOp[] {
  const ops: TransformOp[] = [];
  if (o.mirror) ops.push('mirror-x');
  const rot = ((o.rot % 4) + 4) % 4;
  if (rot === 1) ops.push('rotate-cw');
  if (rot === 2) ops.push('rotate-180');
  if (rot === 3) ops.push('rotate-ccw');
  return ops;
}

export function isIdentity(o: Orientation): boolean {
  return !o.mirror && ((o.rot % 4) + 4) % 4 === 0;
}

/** Wendet eine gespeicherte Ausrichtung auf Struktur und Startblock an. */
export function orientStructure(s: Structure, start: Size3, o: Orientation): { structure: Structure; start: Size3 } {
  let structure = s;
  let point = start;
  for (const op of opsFor(o)) {
    point = transformPoint(structure.size, point, op);
    structure = transformStructure(structure, op);
  }
  return { structure, start: point };
}

/**
 * Verknüpft eine Ausrichtung mit einer weiteren Bedienung aus Sicht des Nutzers
 * („nach rechts drehen“, „spiegeln“) und liefert wieder die Normalform.
 */
export function composeOrientation(o: Orientation, action: 'cw' | 'ccw' | 'mirror'): Orientation {
  const rot = ((o.rot % 4) + 4) % 4;
  if (action === 'cw') return { rot: (rot + 1) % 4, mirror: o.mirror };
  if (action === 'ccw') return { rot: (rot + 3) % 4, mirror: o.mirror };
  // Spiegeln der aktuellen Ansicht (West ↔ Ost): M·R^k = R^(-k)·M
  return { rot: (4 - rot) % 4, mirror: !o.mirror };
}
