/**
 * Materialliste aus einem Bauplan berechnen und in Stacks bzw.
 * Shulkerkisten umrechnen.
 */
import type { BlockState } from './blockstate';
import { countBlocks, type Structure } from './structure';

export const SHULKER_SLOTS = 27;

export interface FluidCounts {
  /** Wasser-Quellblöcke (inkl. wassergefüllter Blöcke). */
  water: number;
  /** Lava-Quellblöcke. */
  lava: number;
}

export interface MaterialList {
  /** Item-ID → Anzahl. */
  items: Map<string, number>;
  /**
   * Quellblöcke werden getrennt gezählt: Wasser lässt sich mit einem Eimer
   * und einer unendlichen Quelle beliebig oft platzieren, eine Umrechnung
   * in Stacks wäre irreführend.
   */
  fluids: FluidCounts;
}

/** Blöcke, die kein eigenes Item verbrauchen (entstehen von selbst oder sind Teil eines anderen Blocks). */
const NO_ITEM = new Set([
  'air',
  'cave_air',
  'void_air',
  'piston_head',
  'moving_piston',
  'fire',
  'soul_fire',
  'nether_portal',
  'end_portal',
  'end_gateway',
  'frosted_ice',
  'bubble_column',
  'structure_void',
  'light',
  'barrier',
]);

/** Block-ID → Item-ID, wo beide voneinander abweichen. */
const BLOCK_TO_ITEM: Record<string, string> = {
  redstone_wire: 'redstone',
  tripwire: 'string',
  wall_torch: 'torch',
  redstone_wall_torch: 'redstone_torch',
  soul_wall_torch: 'soul_torch',
  copper_wall_torch: 'copper_torch',
  farmland: 'dirt',
  dirt_path: 'dirt',
  wheat: 'wheat_seeds',
  carrots: 'carrot',
  potatoes: 'potato',
  beetroots: 'beetroot_seeds',
  melon_stem: 'melon_seeds',
  attached_melon_stem: 'melon_seeds',
  pumpkin_stem: 'pumpkin_seeds',
  attached_pumpkin_stem: 'pumpkin_seeds',
  kelp_plant: 'kelp',
  bamboo_sapling: 'bamboo',
  cocoa: 'cocoa_beans',
  sweet_berry_bush: 'sweet_berries',
  cave_vines: 'glow_berries',
  cave_vines_plant: 'glow_berries',
  weeping_vines_plant: 'weeping_vines',
  twisting_vines_plant: 'twisting_vines',
  tall_seagrass: 'seagrass',
  torchflower_crop: 'torchflower_seeds',
  pitcher_crop: 'pitcher_pod',
  powder_snow: 'powder_snow_bucket',
  water_cauldron: 'cauldron',
  lava_cauldron: 'cauldron',
  powder_snow_cauldron: 'cauldron',
  big_dripleaf_stem: 'big_dripleaf',
};

/** Eigenschaften, die die Stückzahl in einem Block angeben. */
const COUNT_PROPS: Record<string, string> = {
  sea_pickle: 'pickles',
  turtle_egg: 'eggs',
  snow: 'layers',
  candle: 'candles',
};

/** ID ohne Namensraum. */
function shortId(id: string): string {
  return id.slice(id.indexOf(':') + 1);
}

function withNamespace(id: string, original: string): string {
  const colon = original.indexOf(':');
  return colon === -1 ? `minecraft:${id}` : `${original.slice(0, colon)}:${id}`;
}

export interface BlockCost {
  item: string | null;
  count: number;
  water: number;
  lava: number;
}

/** Was kostet ein einzelner Block dieses Zustands? */
export function blockCost(state: BlockState): BlockCost {
  const id = shortId(state.id);
  const p = state.props;
  const cost: BlockCost = { item: null, count: 0, water: 0, lava: 0 };

  if (id === 'water' || id === 'lava') {
    // Nur Quellblöcke müssen platziert werden; fließende Flüssigkeit entsteht von selbst.
    if (Number(p.level ?? 0) === 0) cost[id] = 1;
    return cost;
  }
  if (id === 'bubble_column') {
    cost.water = 1;
    return cost;
  }
  if (NO_ITEM.has(id)) return cost;

  // Zweiteilige Blöcke nur einmal zählen.
  if (p.half === 'upper') return cost;
  if (p.part === 'head' && id.endsWith('_bed')) return cost;

  let itemId = BLOCK_TO_ITEM[id] ?? id;
  if (itemId === id) {
    if (/_wall_hanging_sign$/.test(id)) itemId = id.replace('_wall_hanging_sign', '_hanging_sign');
    else if (/_wall_sign$/.test(id)) itemId = id.replace('_wall_sign', '_sign');
    else if (/_wall_banner$/.test(id)) itemId = id.replace('_wall_banner', '_banner');
    else if (/_wall_(head|skull)$/.test(id)) itemId = id.replace('_wall_', '_');
    else if (/_wall_fan$/.test(id)) itemId = id.replace('_wall_fan', '_fan');
    else if (/_candle_cake$/.test(id) || id === 'candle_cake') itemId = 'cake';
  }

  let count = 1;
  if (id.endsWith('_slab') && p.type === 'double') count = 2;
  const countProp = COUNT_PROPS[id] ?? (id.endsWith('_candle') ? 'candles' : undefined);
  if (countProp && p[countProp]) count = Math.max(1, Number(p[countProp]));

  cost.item = withNamespace(itemId, state.id);
  cost.count = count;
  if (p.waterlogged === 'true') cost.water = 1;
  if (id === 'kelp' || id === 'kelp_plant' || id === 'seagrass' || id === 'tall_seagrass') cost.water = 1;
  return cost;
}

/** Items, die laut Schematic in Behältern liegen (gesamt oder für eine Ebene). */
export function containerItems(structure: Structure, layer?: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const c of structure.containers ?? []) {
    if (layer !== undefined && c.y !== layer) continue;
    for (const { item, count } of c.items) totals.set(item, (totals.get(item) ?? 0) + count);
  }
  return totals;
}

export function emptyMaterials(): MaterialList {
  return { items: new Map(), fluids: { water: 0, lava: 0 } };
}

/** Materialliste für eine Ebene (nullbasiert) oder – ohne Angabe – den ganzen Bauplan. */
export function computeMaterials(structure: Structure, layer?: number): MaterialList {
  const list = emptyMaterials();
  for (const [paletteIndex, blocks] of countBlocks(structure, layer)) {
    const cost = blockCost(structure.palette[paletteIndex]!);
    if (cost.item && cost.count > 0) {
      list.items.set(cost.item, (list.items.get(cost.item) ?? 0) + cost.count * blocks);
    }
    list.fluids.water += cost.water * blocks;
    list.fluids.lava += cost.lava * blocks;
  }
  return list;
}

// ---------------------------------------------------------------------------
// Stapelgrößen
// ---------------------------------------------------------------------------

const STACK_16 = new Set([
  'ender_pearl',
  'snowball',
  'egg',
  'blue_egg',
  'brown_egg',
  'bucket',
  'honey_bottle',
  'armor_stand',
  'written_book',
  'wind_charge',
]);

const STACK_1 = new Set([
  'shears',
  'flint_and_steel',
  'saddle',
  'totem_of_undying',
  'elytra',
  'shield',
  'bow',
  'crossbow',
  'trident',
  'mace',
  'fishing_rod',
  'carrot_on_a_stick',
  'warped_fungus_on_a_stick',
  'brush',
  'spyglass',
  'cake',
  'potion',
  'splash_potion',
  'lingering_potion',
  'enchanted_book',
  'writable_book',
  'mushroom_stew',
  'rabbit_stew',
  'beetroot_soup',
  'suspicious_stew',
  'minecart',
]);

/** Maximale Stapelgröße eines Items: 64, 16 oder 1. */
export function stackSize(itemId: string): 64 | 16 | 1 {
  const id = shortId(itemId);
  if (STACK_16.has(id)) return 16;
  if (/(^|_)sign$/.test(id) || id.endsWith('_banner')) return 16;
  if (STACK_1.has(id)) return 1;
  if (id.endsWith('_bucket')) return 1;
  if (id.endsWith('_bed') || id.endsWith('shulker_box')) return 1;
  if (id.endsWith('_minecart') || /(_boat|_raft)$/.test(id)) return 1;
  if (/_(sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|horse_armor)$/.test(id)) return 1;
  if (id.startsWith('music_disc_')) return 1;
  return 64;
}

export interface StackBreakdown {
  count: number;
  stackSize: 64 | 16 | 1;
  /** Volle Stacks insgesamt. */
  stacks: number;
  /** Einzelne Items über die vollen Stacks hinaus. */
  rest: number;
  /** Belegte Inventarplätze. */
  slots: number;
  /** Volle Shulkerkisten (27 Plätze). */
  shulkers: number;
  /** Volle Stacks, die nicht mehr in eine volle Shulkerkiste passen. */
  stacksAfterShulkers: number;
}

export function breakdown(itemId: string, count: number): StackBreakdown {
  const size = stackSize(itemId);
  const stacks = Math.floor(count / size);
  const rest = count % size;
  const perShulker = SHULKER_SLOTS * size;
  const shulkers = Math.floor(count / perShulker);
  return {
    count,
    stackSize: size,
    stacks,
    rest,
    slots: stacks + (rest > 0 ? 1 : 0),
    shulkers,
    stacksAfterShulkers: Math.floor((count - shulkers * perShulker) / size),
  };
}

/** „3 Stacks + 12“, „1 Shulker + 5 Stacks + 12“ oder schlicht „12“. */
export function formatBreakdown(b: StackBreakdown): string {
  if (b.stackSize === 1 || b.count < b.stackSize) return '';
  const parts: string[] = [];
  if (b.shulkers > 0) parts.push(`${b.shulkers} Shulker`);
  const stacks = b.shulkers > 0 ? b.stacksAfterShulkers : b.stacks;
  if (stacks > 0) parts.push(`${stacks} ${stacks === 1 ? 'Stack' : 'Stacks'}`);
  if (b.rest > 0) parts.push(`${b.rest}`);
  const suffix = b.stackSize === 16 ? ' (16er-Stacks)' : '';
  return parts.join(' + ') + suffix;
}

/** Summe der Inventarplätze einer Liste – hilfreich für „passt das in mein Inventar?“. */
export function totalSlots(list: MaterialList): number {
  let slots = 0;
  for (const [item, count] of list.items) slots += breakdown(item, count).slots;
  return slots;
}

export function sortedItems(list: MaterialList): Array<[string, number]> {
  return [...list.items].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
