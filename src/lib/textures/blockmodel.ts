/**
 * Blockmodelle für die Darstellung „wie im Spiel“: Aus welchen Quadern besteht
 * ein Block, welche Textur liegt auf welcher Seite, wie ist er gedreht?
 *
 * Koordinaten in Sechzehnteln eines Blocks (0–16): x = Westen → Osten,
 * y = unten → oben, z = Norden → Süden. Texturen stammen aus Mojangs
 * Bedrock-Paket und werden über ihren Dateinamen angesprochen.
 *
 * Volle Blöcke und die für Farmen wichtigen Sonderformen sind nachgebaut;
 * seltene Formen werden vereinfacht (siehe `buildModel`).
 */
import { javaToBedrock } from '../bedrock';
import type { BlockState } from '../blockstate';
import { blockTexture, type Face, type PackIndex } from './pack';

export type Vec3 = [number, number, number];
export type Quarter = 0 | 1 | 2 | 3;

export interface Tint {
  color: string;
  /** multiply: ganze Textur einfärben · mask: nur Pixel mit Deckkraft einfärben, Rest deckend zeigen */
  mode: 'multiply' | 'mask';
}

export interface FaceTex {
  path: string;
  /** Ausschnitt [u0, v0, u1, v1] in Pixeln; Standard ergibt sich aus der Lage des Quaders. */
  uv?: [number, number, number, number];
  /** Drehung der Textur im Uhrzeigersinn. */
  rot?: 0 | 90 | 180 | 270;
  tint?: Tint;
}

export type Element =
  | { type: 'box'; from: Vec3; to: Vec3; faces: Partial<Record<Face, FaceTex>> }
  | { type: 'cross'; from: Vec3; to: Vec3; tex: FaceTex };

export interface BlockModel {
  elements: Element[];
  /** Kippen um die West-Ost-Achse: 1 = Oberseite nach Norden, 2 = kopfüber, 3 = Oberseite nach Süden. */
  rotX: Quarter;
  /** Danach drehen um die senkrechte Achse, im Uhrzeigersinn von oben (1 = Norden → Osten). */
  rotY: Quarter;
  /** opaque: deckend · cutout: mit Löchern · blend: durchscheinend */
  layer: 'opaque' | 'cutout' | 'blend';
  /** Voller, deckender Würfel – verdeckt angrenzende Flächen. */
  solid: boolean;
}

export type Side = 'north' | 'east' | 'south' | 'west';
export type Connections = Partial<Record<Side, boolean>>;

export interface ModelContext {
  index: PackIndex;
  /** Verbindungen zu Nachbarn (Redstone-Leitung, Zäune, Mauern, Scheiben). */
  connections?: Connections;
}

// --- Farben, mit denen das Spiel graue Texturen einfärbt (Ebenen-Biom) ---
const GRASS = '#91bd59';
const FOLIAGE = '#77ab2f';
const WATER = '#44aff5';
const REDSTONE_OFF = '#5a0000';
const REDSTONE_ON = '#ff2a00';

function tintFor(path: string): Tint | undefined {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (name === 'grass_side') return { color: GRASS, mode: 'mask' };
  if (name === 'grass_top' || name === 'tallgrass' || name === 'fern' || /^double_plant_(grass|fern)/.test(name)) {
    return { color: GRASS, mode: 'multiply' };
  }
  if (name === 'leaves_birch') return { color: '#80a755', mode: 'multiply' };
  if (name === 'leaves_spruce') return { color: '#619961', mode: 'multiply' };
  if (/^leaves_(oak|big_oak|jungle|acacia)/.test(name) || name === 'mangrove_leaves' || name === 'vine') {
    return { color: FOLIAGE, mode: 'multiply' };
  }
  if (name === 'waterlily') return { color: '#208030', mode: 'multiply' };
  if (/^water_(still|flow)/.test(name)) return { color: WATER, mode: 'multiply' };
  if (/^(melon|pumpkin)_stem/.test(name)) return { color: '#8fb23c', mode: 'multiply' };
  return undefined;
}

const T = (file: string, extra: Partial<FaceTex> = {}): FaceTex => {
  const path = blockTexture(file);
  return { path, tint: tintFor(path), ...extra };
};

const ALL_FACES: readonly Face[] = ['up', 'down', 'north', 'south', 'east', 'west'];
const SIDES: readonly Side[] = ['north', 'east', 'south', 'west'];

function all(tex: FaceTex): Record<Face, FaceTex> {
  return { up: tex, down: tex, north: tex, south: tex, east: tex, west: tex };
}

function box(from: Vec3, to: Vec3, faces: Partial<Record<Face, FaceTex>>): Element {
  return { type: 'box', from, to, faces };
}

function sidesAnd(side: FaceTex, up: FaceTex, down: FaceTex = up): Record<Face, FaceTex> {
  return { up, down, north: side, south: side, east: side, west: side };
}

/** Vierteldrehungen, damit die Nordseite des Modells nach `dir` zeigt. */
function fromNorth(dir: string | undefined): Quarter {
  return dir === 'east' ? 1 : dir === 'south' ? 2 : dir === 'west' ? 3 : 0;
}

/** Vierteldrehungen, damit die Südseite des Modells nach `dir` zeigt. */
function fromSouth(dir: string | undefined): Quarter {
  return dir === 'west' ? 1 : dir === 'north' ? 2 : dir === 'east' ? 3 : 0;
}

function model(elements: Element[], options: Partial<Omit<BlockModel, 'elements'>> = {}): BlockModel {
  return { elements, rotX: 0, rotY: 0, layer: 'opaque', solid: false, ...options };
}

function shortId(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

/** Texturen eines Blocks laut Paket; `variant` wählt z. B. die Wachstumsstufe. */
function indexFaces(ctx: ModelContext, bedrockName: string, variant = 0): Record<Face, FaceTex> | null {
  const keys = ctx.index.blockFaces(bedrockName);
  if (!keys) return null;
  const out = {} as Record<Face, FaceTex>;
  for (const face of ALL_FACES) {
    const path = ctx.index.texturePath(keys[face], variant);
    if (!path) return null;
    out[face] = { path, tint: tintFor(path) };
  }
  return out;
}

const CROSS_PLANTS =
  /^(sugar_cane|short_grass|fern|dead_bush|dandelion|poppy|blue_orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|torchflower|sweet_berry_bush|nether_wart|wheat|carrots|potatoes|beetroots|melon_stem|pumpkin_stem|attached_melon_stem|attached_pumpkin_stem|cobweb|kelp|kelp_plant|seagrass|brown_mushroom|red_mushroom|crimson_fungus|warped_fungus|crimson_roots|warped_roots|nether_sprouts|.*_sapling|.*_tulip|bamboo_sapling)$/;

const TRANSLUCENT = /(stained_glass|^ice$|slime_block|honey_block|frosted_ice|tinted_glass)/;
const CUTOUT = /(glass|leaves|spawner|scaffolding|cobweb|ladder|rail|trapdoor|door|iron_bars|campfire|chain|lantern|hopper|cauldron|composter|cactus|bamboo|vine|lily_pad)/;

function cropStage(age: number, stages: number, maxAge: number): number {
  return Math.max(0, Math.min(stages - 1, Math.floor((age * stages) / (maxAge + 1))));
}

/** Arme und Mittelstück einer Redstone-Leitung. */
function dustModel(state: BlockState, ctx: ModelContext): BlockModel {
  const p = state.props;
  const power = Number(p.power ?? 0);
  const tint: Tint = { color: power > 0 ? REDSTONE_ON : REDSTONE_OFF, mode: 'multiply' };
  const explicit = SIDES.some((s) => s in p);
  const has = (s: Side): boolean => (explicit ? p[s] === 'side' || p[s] === 'up' : (ctx.connections?.[s] ?? false));
  let n = has('north');
  let e = has('east');
  let s = has('south');
  let w = has('west');
  const count = Number(n) + Number(e) + Number(s) + Number(w);
  // Eine einzelne Verbindung ergibt im Spiel eine durchgehende Linie.
  if (count === 1) {
    if (n || s) n = s = true;
    else e = w = true;
  }
  const y = 0.25;
  const flat = (x0: number, z0: number, x1: number, z1: number, tex: FaceTex): Element =>
    box([x0, y, z0], [x1, y, z1], { up: tex, down: tex });
  const cross = T('redstone_dust_cross', { tint });
  if (count === 0) return model([flat(0, 0, 16, 16, cross)], { layer: 'cutout' });
  const line = T('redstone_dust_line', { tint });
  if (n && s && !e && !w) return model([flat(0, 0, 16, 16, { ...line, rot: 90 })], { layer: 'cutout' });
  if (e && w && !n && !s) return model([flat(0, 0, 16, 16, line)], { layer: 'cutout' });
  const elements: Element[] = [flat(5, 5, 11, 11, cross)];
  if (n) elements.push(flat(5, 0, 11, 5, cross));
  if (s) elements.push(flat(5, 11, 11, 16, cross));
  if (w) elements.push(flat(0, 5, 5, 11, cross));
  if (e) elements.push(flat(11, 5, 16, 11, cross));
  return model(elements, { layer: 'cutout' });
}

function torchBox(x: number, y: number, z: number, height: number, file: string): Element {
  const side = T(file, { uv: [7, 16 - height, 9, 16] });
  return box([x, y, z], [x + 2, y + height, z + 2], { ...sidesAnd(side, T(file, { uv: [7, 6, 9, 8] })), down: undefined });
}

/** Mittelpfosten plus Arme zu verbundenen Nachbarn (Zaun, Mauer, Scheibe, Gitter). */
function connected(
  ctx: ModelContext,
  faces: Record<Face, FaceTex>,
  post: [number, number],
  arms: Array<[number, number, number]>,
  isolatedCross: boolean,
): Element[] {
  const [half, height] = post;
  const c = ctx.connections ?? {};
  const any = SIDES.some((s) => c[s]);
  const elements: Element[] = [box([8 - half, 0, 8 - half], [8 + half, height, 8 + half], faces)];
  for (const side of SIDES) {
    if (!(c[side] || (isolatedCross && !any))) continue;
    for (const [armHalf, y0, y1] of arms) {
      const span: Record<Side, [Vec3, Vec3]> = {
        north: [[8 - armHalf, y0, 0], [8 + armHalf, y1, 8 - half]],
        south: [[8 - armHalf, y0, 8 + half], [8 + armHalf, y1, 16]],
        west: [[0, y0, 8 - armHalf], [8 - half, y1, 8 + armHalf]],
        east: [[8 + half, y0, 8 - armHalf], [16, y1, 8 + armHalf]],
      };
      elements.push(box(span[side][0], span[side][1], faces));
    }
  }
  return elements;
}

/**
 * Baut das Modell eines Blockzustands (Java-Schreibweise). Gibt null zurück, wenn
 * das Paket keine Textur dafür kennt – dann zeichnet die App einen farbigen Ersatzblock.
 */
export function buildModel(state: BlockState, ctx: ModelContext): BlockModel | null {
  const id = shortId(state.id);
  const p = state.props;
  const bedrock = javaToBedrock(state);
  const name = shortId(bedrock.name);
  const facing = p.facing;

  // --- Flüssigkeiten ---
  if (id === 'water' || id === 'lava') {
    const level = Number(p.level ?? 0);
    const height = level === 0 || level >= 8 ? 14 : Math.max(2, 14 - level * 1.75);
    const still = id === 'water' ? T('water_still_grey') : T('lava_still');
    const flow = id === 'water' ? T('water_flow_grey', { uv: [0, 0, 16, 16] }) : T('lava_flow', { uv: [0, 0, 16, 16] });
    return model([box([0, 0, 0], [16, level >= 8 ? 16 : height, 16], sidesAnd(level === 0 ? still : flow, still))], {
      layer: id === 'water' ? 'blend' : 'opaque',
    });
  }

  if (id === 'redstone_wire') return dustModel(state, ctx);

  // --- Redstone-Bauteile ---
  if (id === 'repeater' || id === 'comparator') {
    const on = p.powered === 'true';
    const top = T(id === 'repeater' ? (on ? 'repeater_on' : 'repeater_off') : on ? 'comparator_on' : 'comparator_off');
    const slab = T('stone_slab_top');
    const torch = on ? 'redstone_torch_on' : 'redstone_torch_off';
    const elements: Element[] = [box([0, 0, 0], [16, 2, 16], sidesAnd(slab, top, slab))];
    if (id === 'repeater') {
      const delay = Math.max(1, Math.min(4, Number(p.delay ?? 1)));
      elements.push(torchBox(7, 2, 2, 5, torch), torchBox(7, 2, 4 + delay * 2, 5, torch));
    } else {
      elements.push(torchBox(7, 2, 2, p.mode === 'subtract' ? 4 : 2, torch), torchBox(4, 2, 11, 5, torch), torchBox(10, 2, 11, 5, torch));
    }
    // Die Textur zeigt mit der Spitze zum Ausgang; der liegt `facing` gegenüber.
    return model(elements, { rotY: fromSouth(facing) });
  }

  if (id === 'piston' || id === 'sticky_piston') {
    const extended = p.extended === 'true';
    const top = extended ? T('piston_inner') : T(id === 'sticky_piston' ? 'piston_top_sticky' : 'piston_top_normal');
    const faces = sidesAnd(T('piston_side'), top, T('piston_bottom'));
    const m = model([box([0, 0, 0], [16, extended ? 12 : 16, 16], faces)], { solid: !extended });
    if (facing === 'down') return { ...m, rotX: 2 };
    if (facing && facing !== 'up') return { ...m, rotX: 1, rotY: fromNorth(facing) };
    return m;
  }
  if (id === 'piston_head') {
    const top = T(p.type === 'sticky' ? 'piston_top_sticky' : 'piston_top_normal');
    const side = T('piston_side');
    const m = model([box([0, 12, 0], [16, 16, 16], sidesAnd(side, top, T('piston_top_normal'))), box([6, -4, 6], [10, 12, 10], sidesAnd(side, top))]);
    if (facing === 'down') return { ...m, rotX: 2 };
    if (facing && facing !== 'up') return { ...m, rotX: 1, rotY: fromNorth(facing) };
    return m;
  }

  if (id === 'observer') {
    const lit = p.powered === 'true';
    // Der Pfeil auf Ober- und Unterseite zeigt zum Signalausgang (Rückseite).
    const faces: Record<Face, FaceTex> = {
      north: T('observer_front'),
      south: T(lit ? 'observer_back_lit' : 'observer_back'),
      east: T('observer_side'),
      west: T('observer_side'),
      up: T('observer_top', { rot: 180 }),
      down: T('observer_top'),
    };
    const m = model([box([0, 0, 0], [16, 16, 16], faces)], { solid: true });
    if (facing === 'up') return { ...m, rotX: 3 };
    if (facing === 'down') return { ...m, rotX: 1 };
    return { ...m, rotY: fromNorth(facing) };
  }

  if (id === 'dispenser' || id === 'dropper') {
    const side = T('furnace_side');
    const top = T('furnace_top');
    if (facing === 'up' || facing === 'down') {
      const m = model([box([0, 0, 0], [16, 16, 16], sidesAnd(top, T(`${id}_front_vertical`), top))], { solid: true });
      return facing === 'down' ? { ...m, rotX: 2 } : m;
    }
    const faces = { ...sidesAnd(side, top), south: T(`${id}_front_horizontal`) };
    return model([box([0, 0, 0], [16, 16, 16], faces)], { solid: true, rotY: fromSouth(facing) });
  }

  if (id === 'hopper') {
    const outside = T('hopper_outside');
    const elements: Element[] = [
      box([0, 10, 0], [16, 16, 16], sidesAnd(outside, T('hopper_top'), outside)),
      box([2, 10, 2], [14, 11, 14], { up: T('hopper_inside') }),
      box([4, 4, 4], [12, 10, 12], sidesAnd(outside, outside)),
    ];
    if (!facing || facing === 'down') {
      elements.push(box([6, 0, 6], [10, 4, 10], sidesAnd(outside, outside)));
      return model(elements, { layer: 'cutout' });
    }
    elements.push(box([6, 4, 0], [10, 8, 4], sidesAnd(outside, outside)));
    return model(elements, { layer: 'cutout', rotY: fromNorth(facing) });
  }

  if (id === 'chest' || id === 'trapped_chest' || id === 'ender_chest') {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    return model([box([1, 0, 1], [15, 14, 15], faces)], { rotY: fromSouth(facing) });
  }

  if (id === 'furnace' || id === 'blast_furnace' || id === 'smoker') {
    const front = T(`${id}_front_${p.lit === 'true' ? 'on' : 'off'}`);
    const faces = { ...sidesAnd(T(`${id}_side`), T(`${id}_top`), T(id === 'smoker' ? 'smoker_bottom' : `${id}_top`)), south: front };
    return model([box([0, 0, 0], [16, 16, 16], faces)], { solid: true, rotY: fromSouth(facing) });
  }

  // --- Fackeln, Hebel, Knöpfe ---
  const torchMatch = /^(redstone_|soul_|copper_)?(wall_)?torch$/.exec(id);
  if (torchMatch) {
    const kind = torchMatch[1] ?? '';
    const file = kind === 'redstone_' ? (p.lit === 'false' ? 'redstone_torch_off' : 'redstone_torch_on') : kind === 'soul_' ? 'soul_torch' : kind === 'copper_' ? 'copper_torch' : 'torch_on';
    if (!torchMatch[2]) return model([torchBox(7, 0, 7, 10, file)], { layer: 'cutout' });
    // Wandfackel: hängt am Block gegenüber der Blickrichtung.
    return model([torchBox(7, 3, 13, 10, file)], { layer: 'cutout', rotY: fromNorth(facing) });
  }

  if (id === 'lever') {
    const base = all(T('cobblestone'));
    const stick = T('lever', { uv: [7, 6, 9, 16] });
    const on = p.powered === 'true';
    if (p.face === 'wall') {
      return model([box([5, 4, 13], [11, 12, 16], base), box([7, on ? 4 : 10, 8], [9, on ? 6 : 12, 13], all(stick))], { rotY: fromNorth(facing) });
    }
    const m = model([box([5, 0, 4], [11, 3, 12], base), box([7, 3, on ? 4 : 10], [9, 10, on ? 6 : 12], all(stick))], {
      rotY: facing === 'east' || facing === 'west' ? 1 : 0,
    });
    return p.face === 'ceiling' ? { ...m, rotX: 2 } : m;
  }

  if (id.endsWith('_button')) {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    const depth = p.powered === 'true' ? 1 : 2;
    if (p.face === 'floor' || p.face === 'ceiling') {
      const m = model([box([5, 0, 6], [11, depth, 10], faces)], { rotY: facing === 'east' || facing === 'west' ? 1 : 0 });
      return p.face === 'ceiling' ? { ...m, rotX: 2 } : m;
    }
    return model([box([5, 6, 16 - depth], [11, 10, 16], faces)], { rotY: fromNorth(facing) });
  }

  // --- Schienen ---
  if (id === 'rail' || id.endsWith('_rail')) {
    const keys = ctx.index.blockFaces(name);
    if (!keys) return null;
    const shape = p.shape ?? 'north_south';
    const curved = /^(south|north)_(east|west)$/.test(shape);
    const powered = p.powered === 'true';
    const key = id === 'rail' ? (curved ? keys.up : keys.north) : powered ? keys.up : keys.north;
    const path = ctx.index.texturePath(key);
    if (!path) return null;
    const tex: FaceTex = { path };
    const turns: Record<string, Quarter> = { south_east: 0, south_west: 1, north_west: 2, north_east: 3 };
    const eastWest = shape === 'east_west' || shape === 'ascending_east' || shape === 'ascending_west';
    return model([box([0, 1, 0], [16, 1, 16], { up: tex, down: tex })], { layer: 'cutout', rotY: curved ? (turns[shape] ?? 0) : eastWest ? 1 : 0 });
  }

  // --- Stufen und Treppen ---
  if (id.endsWith('_slab')) {
    const faces = indexFaces(ctx, shortId(javaToBedrock({ id: state.id, props: {} }).name));
    if (!faces) return null;
    if (p.type === 'double') return model([box([0, 0, 0], [16, 16, 16], faces)], { solid: true });
    return model([p.type === 'top' ? box([0, 8, 0], [16, 16, 16], faces) : box([0, 0, 0], [16, 8, 16], faces)]);
  }
  if (id.endsWith('_stairs')) {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    const upside = p.half === 'top';
    // Die hohe Seite liegt in Blickrichtung; Modell für „Norden“.
    return model(
      [
        upside ? box([0, 8, 0], [16, 16, 16], faces) : box([0, 0, 0], [16, 8, 16], faces),
        upside ? box([0, 0, 0], [16, 8, 8], faces) : box([0, 8, 0], [16, 16, 8], faces),
      ],
      { rotY: fromNorth(facing) },
    );
  }

  if (id.endsWith('trapdoor')) {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    if (p.open === 'true') return model([box([0, 0, 13], [16, 16, 16], faces)], { layer: 'cutout', rotY: fromNorth(facing) });
    return model([p.half === 'top' ? box([0, 13, 0], [16, 16, 16], faces) : box([0, 0, 0], [16, 3, 16], faces)], { layer: 'cutout' });
  }
  if (id.endsWith('_door')) {
    const keys = ctx.index.blockFaces(name);
    const path = keys ? ctx.index.texturePath(p.half === 'upper' ? keys.north : keys.down) : null;
    if (!path) return null;
    return model([box([0, 0, 13], [16, 16, 16], all({ path }))], { layer: 'cutout', rotY: fromNorth(facing) });
  }

  // --- Pflanzen ---
  if (id === 'bamboo') {
    const stem = T('bamboo_stem', { uv: [0, 0, 3, 16] });
    return model([box([6.5, 0, 6.5], [9.5, 16, 9.5], sidesAnd(stem, T('bamboo_stem', { uv: [13, 0, 16, 3] })))], { layer: 'cutout' });
  }
  if (id === 'cactus') {
    const side = T('cactus_side', { uv: [0, 0, 16, 16] });
    return model([box([1, 0, 1], [15, 16, 15], sidesAnd(side, T('cactus_top', { uv: [1, 1, 15, 15] }), T('cactus_bottom', { uv: [1, 1, 15, 15] })))], { layer: 'cutout' });
  }
  if (id === 'pointed_dripstone') {
    const thickness = p.thickness === 'tip_merge' ? 'merge' : (p.thickness ?? 'tip');
    const dir = p.vertical_direction === 'up' ? 'up' : 'down';
    return model([{ type: 'cross', from: [0, 0, 0], to: [16, 16, 16], tex: T(`pointed_dripstone_${dir}_${thickness}`) }], { layer: 'cutout' });
  }
  if (CROSS_PLANTS.test(id)) {
    const age = Number(p.age ?? 0);
    const variant =
      id === 'wheat' ? cropStage(age, 8, 7)
      : id === 'carrots' || id === 'potatoes' ? cropStage(age, 4, 7)
      : id === 'beetroots' || id === 'nether_wart' ? cropStage(age, 4, 3)
      : id === 'sweet_berry_bush' ? 0
      : 0;
    const faces = indexFaces(ctx, name, variant);
    if (!faces) return null;
    const tex = id === 'kelp' || id === 'kelp_plant' ? T('kelp_a', { uv: [0, 0, 16, 16] }) : id === 'sweet_berry_bush' ? T(`sweet_berry_bush_stage${Math.min(3, age)}`) : faces.north;
    return model([{ type: 'cross', from: [0, 0, 0], to: [16, 16, 16], tex }], { layer: 'cutout' });
  }

  // --- Besondere Formen ---
  if (id === 'farmland') {
    const dirt = T('dirt');
    return model([box([0, 0, 0], [16, 15, 16], sidesAnd(dirt, T(Number(p.moisture ?? 0) >= 7 ? 'farmland_wet' : 'farmland_dry'), dirt))]);
  }
  if (id === 'dirt_path') {
    const faces = indexFaces(ctx, name);
    return faces ? model([box([0, 0, 0], [16, 15, 16], faces)]) : null;
  }
  if (/cauldron$/.test(id)) {
    const elements: Element[] = [
      box([0, 0, 0], [16, 16, 16], sidesAnd(T('cauldron_side'), T('cauldron_top'), T('cauldron_bottom'))),
      box([2, 3, 2], [14, 4, 14], { up: T('cauldron_inner') }),
    ];
    if (id === 'lava_cauldron') elements.push(box([2, 15, 2], [14, 15, 14], { up: T('lava_still') }));
    if (id === 'water_cauldron') {
      const y = 6 + Math.max(1, Math.min(3, Number(p.level ?? 3))) * 3;
      elements.push(box([2, y, 2], [14, y, 14], { up: T('water_still_grey') }));
    }
    return model(elements, { layer: 'cutout' });
  }
  if (id.endsWith('_carpet') || id.endsWith('_pressure_plate') || id === 'snow') {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    const height = id === 'snow' ? Math.max(1, Math.min(8, Number(p.layers ?? 1))) * 2 : 1;
    const inset = id.endsWith('_pressure_plate') ? 1 : 0;
    return model([box([inset, 0, inset], [16 - inset, height, 16 - inset], faces)]);
  }
  if (id === 'ladder') {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    return model([box([0, 0, 15.2], [16, 16, 15.2], { north: faces.north, south: faces.north })], { layer: 'cutout', rotY: fromNorth(facing) });
  }
  if (id === 'lantern' || id === 'soul_lantern') {
    const file = id;
    const y = p.hanging === 'true' ? 1 : 0;
    return model([box([5, y, 5], [11, y + 7, 11], sidesAnd(T(file, { uv: [0, 2, 6, 9] }), T(file, { uv: [0, 9, 6, 15] })))], { layer: 'cutout' });
  }
  if (id.endsWith('_fence')) {
    const faces = indexFaces(ctx, name);
    return faces ? model(connected(ctx, faces, [2, 16], [[1, 6, 9], [1, 12, 15]], false)) : null;
  }
  if (id.endsWith('_wall')) {
    const faces = indexFaces(ctx, name);
    return faces ? model(connected(ctx, faces, [4, 16], [[3, 0, 14]], false)) : null;
  }
  if (id === 'iron_bars' || id.endsWith('glass_pane')) {
    const faces = indexFaces(ctx, name);
    if (!faces) return null;
    const pane = all(faces.north);
    return model(connected(ctx, pane, [1, 16], [[1, 0, 16]], true), { layer: TRANSLUCENT.test(id) ? 'blend' : 'cutout' });
  }

  // --- Würfel mit Textur laut Paket ---
  const faces = indexFaces(ctx, name);
  if (!faces) return null;
  const layer = TRANSLUCENT.test(id) ? 'blend' : CUTOUT.test(id) ? 'cutout' : 'opaque';
  const cube = model([box([0, 0, 0], [16, 16, 16], faces)], { layer, solid: layer === 'opaque' });

  // Stämme und andere Säulen
  if (p.axis === 'x') return { ...cube, rotX: 1, rotY: 1 };
  if (p.axis === 'z') return { ...cube, rotX: 1 };

  if (id === 'barrel') {
    // Laut Paket liegt der Deckel im Norden.
    if (facing === 'up') return { ...cube, rotX: 3 };
    if (facing === 'down') return { ...cube, rotX: 1 };
    return { ...cube, rotY: fromNorth(facing) };
  }
  // Blöcke mit Vorderseite (Kürbis, Webstuhl, Bienenstock …): im Paket zeigt sie nach Süden.
  if (facing === 'north' || facing === 'east' || facing === 'south' || facing === 'west') {
    if (faces.south.path !== faces.north.path) return { ...cube, rotY: fromSouth(facing) };
  }
  return cube;
}

/** Braucht dieser Block Nachbarinformationen (und wenn ja, welche Familie)? */
export function connectionFamily(id: string): 'wire' | 'fence' | 'wall' | 'pane' | null {
  const short = shortId(id);
  if (short === 'redstone_wire') return 'wire';
  if (short.endsWith('_fence')) return 'fence';
  if (short.endsWith('_wall')) return 'wall';
  if (short === 'iron_bars' || short.endsWith('glass_pane')) return 'pane';
  return null;
}

/** Verbindet sich eine Redstone-Leitung mit diesem Nachbarn, der in Richtung `side` liegt? */
export function wireConnectsTo(neighbor: BlockState, side: Side): boolean {
  const id = shortId(neighbor.id);
  const facing = neighbor.props.facing;
  const axis = side === 'north' || side === 'south' ? 'z' : 'x';
  const facingAxis = facing === 'north' || facing === 'south' ? 'z' : facing === 'east' || facing === 'west' ? 'x' : null;
  if (id === 'redstone_wire' || id === 'redstone_block' || id === 'lever' || id === 'target' || id === 'daylight_detector') return true;
  if (/^redstone_(wall_)?torch$/.test(id) || id.endsWith('_button') || id.endsWith('_pressure_plate') || id === 'tripwire_hook' || id === 'trapped_chest') return true;
  if (id === 'repeater' || id === 'comparator') return id === 'comparator' ? true : facingAxis === axis;
  // Beobachter: nur an der Rückseite (dem Signalausgang)
  if (id === 'observer') return facing === side;
  return false;
}
