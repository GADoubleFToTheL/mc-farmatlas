/**
 * Eigene Farben für Blöcke – bewusst keine Minecraft-Texturen.
 * Unbekannte Blöcke bekommen eine stabile, aus der ID berechnete Farbe.
 */
import type { BlockState } from './blockstate';
import { displayName } from './names';

export interface BlockStyle {
  /** Füllfarbe der Zelle. */
  color: string;
  /** Kontrastfarbe für Symbole und Kürzel. */
  ink: string;
}

const EXACT: Record<string, string> = {
  stone: '#8b9197',
  cobblestone: '#7b7f85',
  smooth_stone: '#a4a9ae',
  stone_bricks: '#80858b',
  deepslate: '#4b4d55',
  cobbled_deepslate: '#53555d',
  dirt: '#8a5f3c',
  coarse_dirt: '#7a563a',
  grass_block: '#5d9a45',
  podzol: '#6b4a2a',
  mud: '#4a4447',
  moss_block: '#6a8f35',
  farmland: '#5f3d22',
  sand: '#e2d49a',
  red_sand: '#c26a2c',
  gravel: '#8e8a88',
  clay: '#a2a8b6',
  obsidian: '#2a2140',
  basalt: '#55565c',
  netherrack: '#7a3232',
  soul_sand: '#5a4536',
  soul_soil: '#4d3a2e',
  magma_block: '#b5491a',
  ice: '#9cc4f5',
  packed_ice: '#86b0ea',
  blue_ice: '#6f9df0',
  snow_block: '#eef3f5',
  dripstone_block: '#8a6b58',
  pointed_dripstone: '#a07c66',
  glass: '#bfe6ee',
  glass_pane: '#bfe6ee',
  tinted_glass: '#4a3d55',
  glowstone: '#e8c35a',
  sea_lantern: '#cfe6dd',
  jack_o_lantern: '#e8952a',
  torch: '#f2c84b',
  lantern: '#f2c84b',
  water: '#3f76e4',
  lava: '#e8621a',
  sugar_cane: '#93c66a',
  bamboo: '#6f9f1e',
  cactus: '#4f8a2f',
  kelp: '#3f8f5a',
  kelp_plant: '#3f8f5a',
  pumpkin: '#e08a1e',
  carved_pumpkin: '#e08a1e',
  melon: '#7fb52d',
  melon_stem: '#a8c260',
  pumpkin_stem: '#c2b860',
  attached_melon_stem: '#a8c260',
  attached_pumpkin_stem: '#c2b860',
  wheat: '#d8be5a',
  carrots: '#e0902a',
  potatoes: '#c9b56a',
  beetroots: '#a8323c',
  nether_wart: '#a01e2c',
  redstone_wire: '#d02a1e',
  redstone_torch: '#e5402e',
  redstone_wall_torch: '#e5402e',
  redstone_block: '#b81a10',
  redstone_lamp: '#c98a4a',
  repeater: '#c9c2bb',
  comparator: '#d6d0ca',
  observer: '#6b6f78',
  piston: '#b99a66',
  sticky_piston: '#8fae5a',
  slime_block: '#7fd06a',
  honey_block: '#eaa52e',
  hopper: '#4c5058',
  dropper: '#757a82',
  dispenser: '#676c74',
  lever: '#9a8a70',
  target: '#e6c9c0',
  note_block: '#7a4a32',
  tnt: '#d8402e',
  rail: '#9a8f7c',
  powered_rail: '#d8a83a',
  detector_rail: '#a8685a',
  activator_rail: '#a8483a',
  chest: '#b27a2e',
  trapped_chest: '#b2622e',
  ender_chest: '#2e4a48',
  barrel: '#8e6a3c',
  furnace: '#6a6a6e',
  blast_furnace: '#5a5c64',
  smoker: '#6e5a48',
  composter: '#7a5a34',
  cauldron: '#4a4c52',
  lava_cauldron: '#a0481e',
  water_cauldron: '#3c5a9a',
  crafting_table: '#a8703c',
  iron_bars: '#a9adb2',
  iron_block: '#d9dcdf',
  iron_trapdoor: '#c9ccd0',
  ladder: '#a8824a',
  scaffolding: '#d8b86a',
  spawner: '#2e3c4a',
};

/** Muster für Blockfamilien (Reihenfolge = Priorität). */
const PATTERNS: Array<[RegExp, string]> = [
  [/_planks$|_slab$|_stairs$|_fence(_gate)?$|_trapdoor$|_door$|_sign$|_button$|_pressure_plate$/, '#b08a52'],
  [/_log$|_wood$|_stem$/, '#7a5a36'],
  [/_leaves$/, '#4e8a3a'],
  [/_sapling$/, '#5fae4a'],
  [/_wool$|_carpet$/, '#dcdcdc'],
  [/_concrete(_powder)?$|_terracotta$/, '#a0887a'],
  [/_stained_glass(_pane)?$/, '#a8cfe0'],
  [/_shulker_box$|^shulker_box$/, '#8e6a9a'],
  [/_bed$/, '#b8423c'],
  [/copper/, '#c0704a'],
  [/deepslate/, '#4f5159'],
  [/blackstone/, '#2e2a30'],
  [/brick/, '#9a5a48'],
  [/prismarine/, '#5fa594'],
  [/quartz/, '#e6e0d6'],
  [/_ore$/, '#8a8f95'],
  [/coral/, '#d86a9a'],
  [/_candle$|^candle$/, '#e8dca8'],
];

const STONE_VARIANT = /^(stone|cobblestone|smooth_stone|stone_brick|mossy_|andesite|diorite|granite|polished_)/;

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const cache = new Map<string, BlockStyle>();

export function blockColor(id: string): string {
  const short = id.slice(id.indexOf(':') + 1);
  const exact = EXACT[short];
  if (exact) return exact;
  if (STONE_VARIANT.test(short)) return '#868b91';
  for (const [re, color] of PATTERNS) if (re.test(short)) return color;
  return hslToHex(hashHue(short), 0.35, 0.52);
}

export function styleOf(state: BlockState): BlockStyle {
  const hit = cache.get(state.id);
  if (hit) return hit;
  const color = blockColor(state.id);
  const style: BlockStyle = { color, ink: luminance(color) > 0.32 ? '#101418' : '#ffffff' };
  cache.set(state.id, style);
  return style;
}

/**
 * Kurzes Kürzel aus dem deutschen Namen, z. B. „Be“ für Beobachter,
 * „KK“ für Klebriger Kolben. Innerhalb eines Bauplans eindeutig.
 */
export function assignLabels(ids: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  const used = new Set<string>();
  for (const id of ids) {
    if (result.has(id)) continue;
    const name = displayName(id).replace(/[^A-Za-zÄÖÜäöüß0-9 -]/g, '');
    const words = name.split(/[ -]+/).filter(Boolean);
    const first = words[0] ?? '?';
    const candidates: string[] = [];
    if (words.length >= 2) candidates.push((first[0]! + words[1]![0]!).toUpperCase());
    candidates.push(first[0]!.toUpperCase() + (first[1] ?? '').toLowerCase());
    for (let i = 2; i < first.length; i++) candidates.push(first[0]!.toUpperCase() + first[i]!.toLowerCase());
    for (let n = 2; n < 100; n++) candidates.push(`${first[0]!.toUpperCase()}${n}`);
    const label = candidates.find((c) => !used.has(c)) ?? '?';
    used.add(label);
    result.set(id, label);
  }
  return result;
}
