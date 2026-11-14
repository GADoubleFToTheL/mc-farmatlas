/**
 * Bedrock-Blockzustände in die Java-Schreibweise übersetzen, die der Rest der
 * App verwendet. Geprüft gegen die Blockzustands-Tabellen im Minecraft Wiki und
 * gegen die Zuordnung von GeyserMC (Java 26.3 ↔ Bedrock 26.60).
 *
 * Wichtige Eigenheiten:
 *  - Kolben zählen die Richtungen anders als alle anderen Blöcke (2 = Süden, 3 = Norden).
 *  - Wandfackeln speichern die Seite, an der sie hängen – Java die Gegenrichtung.
 *  - Türen sind gegenüber Java um 90° gedreht.
 *
 * Was nicht übersetzt werden kann, wird in `unmapped` gemeldet statt verschwiegen.
 */
import type { BlockState } from './blockstate';

export type BedrockValue = string | number | boolean | bigint;

export interface BedrockConversion {
  state: BlockState;
  /** Bedrock-Eigenschaften ohne Entsprechung, z. B. "direction=2". */
  unmapped: string[];
}

const FACING6 = ['down', 'up', 'north', 'south', 'west', 'east'] as const;
const PISTON6 = ['down', 'up', 'south', 'north', 'east', 'west'] as const;
const STAIRS4 = ['east', 'west', 'south', 'north'] as const;
const TRAPDOOR4 = ['east', 'west', 'south', 'north'] as const;
const RAIL_SHAPES = [
  'north_south', 'east_west', 'ascending_east', 'ascending_west', 'ascending_north',
  'ascending_south', 'south_east', 'south_west', 'north_west', 'north_east',
] as const;
const OPPOSITE: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east' };
/** Bedrock-Tür → Java-Tür (eine Vierteldrehung gegen den Uhrzeigersinn). */
const DOOR_FACING: Record<string, string> = { east: 'north', south: 'east', west: 'south', north: 'west' };

const LEVER: Record<string, { face: string; facing: string }> = {
  up_north_south: { face: 'floor', facing: 'north' },
  up_east_west: { face: 'floor', facing: 'west' },
  down_north_south: { face: 'ceiling', facing: 'north' },
  down_east_west: { face: 'ceiling', facing: 'west' },
  north: { face: 'wall', facing: 'north' },
  south: { face: 'wall', facing: 'south' },
  east: { face: 'wall', facing: 'east' },
  west: { face: 'wall', facing: 'west' },
};

/** Bedrock-ID → Java-ID, wo die Namen abweichen. */
const ID_ALIASES: Record<string, string> = {
  golden_rail: 'powered_rail',
  piston_arm_collision: 'piston_head',
  sticky_piston_arm_collision: 'piston_head',
  moving_block: 'moving_piston',
  grass_path: 'dirt_path',
  grass: 'grass_block',
  waterlily: 'lily_pad',
  reeds: 'sugar_cane',
  melon_block: 'melon',
  web: 'cobweb',
  slime: 'slime_block',
  noteblock: 'note_block',
  trip_wire: 'tripwire',
  magma: 'magma_block',
  snow_layer: 'snow',
  snow: 'snow_block',
  brick_block: 'bricks',
  end_bricks: 'end_stone_bricks',
  hardened_clay: 'terracotta',
  nether_brick: 'nether_bricks',
  red_nether_brick: 'red_nether_bricks',
  quartz_ore: 'nether_quartz_ore',
  mob_spawner: 'spawner',
  undyed_shulker_box: 'shulker_box',
  stonecutter_block: 'stonecutter',
  deadbush: 'dead_bush',
  tallgrass: 'short_grass',
  yellow_flower: 'dandelion',
  fence_gate: 'oak_fence_gate',
  wooden_door: 'oak_door',
  trapdoor: 'oak_trapdoor',
  wooden_button: 'oak_button',
  wooden_pressure_plate: 'oak_pressure_plate',
  standing_sign: 'oak_sign',
  wall_sign: 'oak_wall_sign',
  sea_pickle: 'sea_pickle',
  seagrass: 'seagrass',
  portal: 'nether_portal',
  concrete_powder: 'white_concrete_powder',
  frame: 'item_frame',
  glow_frame: 'glow_item_frame',
  invisible_bedrock: 'barrier',
  unpowered_repeater: 'repeater',
  powered_repeater: 'repeater',
  unpowered_comparator: 'comparator',
  powered_comparator: 'comparator',
  lit_redstone_lamp: 'redstone_lamp',
  lit_furnace: 'furnace',
  lit_smoker: 'smoker',
  lit_blast_furnace: 'blast_furnace',
  lit_redstone_ore: 'redstone_ore',
  lit_deepslate_redstone_ore: 'deepslate_redstone_ore',
  lit_pumpkin: 'jack_o_lantern',
  unlit_redstone_torch: 'redstone_torch',
  flowing_water: 'water',
  flowing_lava: 'lava',
  daylight_detector_inverted: 'daylight_detector',
  // Laut GeyserMC-Tabelle (Bedrock 26.60) abweichend benannt:
  normal_stone_slab: 'stone_slab',
  normal_stone_stairs: 'stone_stairs',
  stone_stairs: 'cobblestone_stairs',
  end_brick_stairs: 'end_stone_brick_stairs',
  prismarine_bricks_stairs: 'prismarine_brick_stairs',
  darkoak_standing_sign: 'dark_oak_sign',
  darkoak_wall_sign: 'dark_oak_wall_sign',
  dirt_with_roots: 'rooted_dirt',
  silver_glazed_terracotta: 'light_gray_glazed_terracotta',
  azalea_leaves_flowered: 'flowering_azalea_leaves',
  waxed_copper: 'waxed_copper_block',
  beetroot: 'beetroots',
  frog_spawn: 'frogspawn',
};

const WALL_TORCH: Record<string, string> = {
  torch: 'wall_torch',
  soul_torch: 'soul_wall_torch',
  redstone_torch: 'redstone_wall_torch',
  copper_torch: 'copper_wall_torch',
};

/** Eigenschaften ohne Bedeutung für Bauplan und Material. */
const IGNORED = new Set([
  'update_bit', 'infiniburn_bit', 'allow_underwater_bit', 'explode_bit', 'color_bit', 'persistent_bit',
  'stripped_bit', 'in_wall_bit', 'occupied_bit', 'attached_bit', 'suspended_bit', 'disarmed_bit',
  'item_frame_map_bit', 'item_frame_photo_bit', 'honey_level', 'bite_counter', 'wall_post_bit',
  'wall_connection_type_east', 'wall_connection_type_north', 'wall_connection_type_south',
  'wall_connection_type_west', 'minecraft:corner', 'minecraft:connection_east', 'minecraft:connection_north',
  'minecraft:connection_south', 'minecraft:connection_west', 'minecraft:connection_up', 'coral_direction',
  'coral_fan_direction', 'coral_hang_type_bit', 'dead_bit', 'covered_bit', 'drag_down', 'stability',
  'stability_check', 'multi_face_direction_bits', 'vine_direction_bits', 'growing_plant_age',
  'propagule_stage', 'big_dripleaf_head', 'big_dripleaf_tilt', 'bamboo_leaf_size', 'bamboo_stalk_thickness',
  'age_bit', 'brushed_progress', 'ominous', 'vault_state', 'trial_spawner_state', 'crafting',
  'rehydration_level', 'natural', 'tip', 'head_piece_bit', 'end_portal_eye_bit', 'books_stored',
  'sculk_sensor_phase', 'bloom', 'active', 'can_summon', 'cracked_state', 'turtle_egg_count',
  'redstone_east', 'redstone_north', 'redstone_south', 'redstone_west', 'powered_shelf_type',
  'structure_void_type', 'pale_moss_carpet_side_east', 'pale_moss_carpet_side_north',
  'pale_moss_carpet_side_south', 'pale_moss_carpet_side_west', 'upper_block_bit_placeholder',
  'creaking_heart_state', 'respawn_anchor_charge', 'bedrock_block_type', 'chemistry_table_type',
]);

function truthy(v: BedrockValue): boolean {
  return v === true || v === 1 || v === 1n || v === '1' || v === 'true';
}

function bool(v: BedrockValue): string {
  return truthy(v) ? 'true' : 'false';
}

function num(v: BedrockValue): number {
  return typeof v === 'boolean' ? Number(v) : Number(v);
}

export function bedrockToJava(name: string, states: Record<string, BedrockValue> = {}): BedrockConversion {
  const colon = name.indexOf(':');
  const namespace = colon === -1 ? 'minecraft' : name.slice(0, colon);
  const original = colon === -1 ? name : name.slice(colon + 1);
  let id = ID_ALIASES[original] ?? original;
  const props: Record<string, string> = {};
  const unmapped: string[] = [];
  const skip = new Set<string>();

  // --- Besonderheiten, die an der ID hängen ---
  if (original === 'powered_repeater' || original === 'powered_comparator') props.powered = 'true';
  if (original === 'unpowered_repeater') props.powered = 'false';
  if (original.startsWith('lit_') && id !== 'jack_o_lantern') props.lit = 'true';
  if (original === 'unlit_redstone_torch') props.lit = 'false';
  if (original === 'daylight_detector_inverted') props.inverted = 'true';
  if (/_standing_sign$/.test(id)) id = id.replace(/_standing_sign$/, '_sign');
  if (/double_cut_copper_slab$/.test(id)) id = id.replace(/double_cut_copper_slab$/, 'cut_copper_double_slab');
  if (id.endsWith('_double_slab')) {
    id = id.replace(/_double_slab$/, '_slab');
    id = ID_ALIASES[id] ?? id;
    props.type = 'double';
    skip.add('minecraft:vertical_half');
    skip.add('top_slot_bit');
  }
  if (id === 'cauldron') {
    const fill = num(states.fill_level ?? 0);
    const liquid = String(states.cauldron_liquid ?? 'water');
    if (fill > 0) {
      if (liquid === 'lava') id = 'lava_cauldron';
      else if (liquid === 'powder_snow') id = 'powder_snow_cauldron';
      else id = 'water_cauldron';
      if (id !== 'lava_cauldron') props.level = String(Math.max(1, Math.min(3, Math.round(fill / 2))));
    }
    skip.add('fill_level');
    skip.add('cauldron_liquid');
  }
  const torchSide = states.torch_facing_direction;
  if (torchSide !== undefined) {
    const side = String(torchSide);
    if (OPPOSITE[side] && WALL_TORCH[id]) {
      id = WALL_TORCH[id]!;
      props.facing = OPPOSITE[side]!;
    }
    skip.add('torch_facing_direction');
  }

  const isPiston = /^(sticky_)?piston$|^piston_head$|^moving_piston$/.test(id);
  const isButton = id.endsWith('_button');
  const isDoor = id.endsWith('_door');
  const isTrapdoor = id.endsWith('trapdoor');
  const isLever = id === 'lever';
  const isSlab = id.endsWith('_slab');

  for (const [key, value] of Object.entries(states)) {
    if (skip.has(key) || IGNORED.has(key)) continue;
    switch (key) {
      case 'facing_direction': {
        const n = num(value);
        if (isButton) {
          if (n === 0) props.face = 'ceiling';
          else if (n === 1) props.face = 'floor';
          else props.face = 'wall';
          props.facing = n >= 2 && FACING6[n] ? FACING6[n]! : 'north';
        } else {
          const dir = (isPiston ? PISTON6 : FACING6)[n];
          if (dir) props.facing = dir;
          else unmapped.push(`${key}=${String(value)}`);
        }
        break;
      }
      case 'minecraft:facing_direction':
        props.facing = String(value);
        break;
      case 'minecraft:cardinal_direction':
        props.facing = isDoor ? (DOOR_FACING[String(value)] ?? String(value)) : String(value);
        break;
      case 'direction': {
        const dir = isTrapdoor ? TRAPDOOR4[num(value)] : undefined;
        if (dir) props.facing = dir;
        else unmapped.push(`${key}=${String(value)}`);
        break;
      }
      case 'weirdo_direction': {
        const dir = STAIRS4[num(value)];
        if (dir) props.facing = dir;
        else unmapped.push(`${key}=${String(value)}`);
        break;
      }
      case 'upside_down_bit':
        props.half = truthy(value) ? 'top' : 'bottom';
        break;
      case 'minecraft:vertical_half':
        if (isSlab) props.type = String(value);
        else props.half = String(value);
        break;
      case 'top_slot_bit':
        props.type = truthy(value) ? 'top' : 'bottom';
        break;
      case 'pillar_axis':
        props.axis = String(value);
        break;
      case 'repeater_delay':
        props.delay = String(num(value) + 1);
        break;
      case 'output_subtract_bit':
        props.mode = truthy(value) ? 'subtract' : 'compare';
        break;
      case 'output_lit_bit':
      case 'powered_bit':
      case 'button_pressed_bit':
      case 'rail_data_bit':
        props.powered = bool(value);
        break;
      case 'triggered_bit':
        props.triggered = bool(value);
        break;
      case 'toggle_bit':
        props.enabled = truthy(value) ? 'false' : 'true';
        break;
      case 'open_bit':
        if (isLever) props.powered = bool(value);
        else props.open = bool(value);
        break;
      case 'lever_direction': {
        const mapped = LEVER[String(value)];
        if (mapped) Object.assign(props, mapped);
        else unmapped.push(`${key}=${String(value)}`);
        break;
      }
      case 'liquid_depth':
        props.level = String(num(value));
        break;
      case 'redstone_signal':
        props.power = String(num(value));
        break;
      case 'rail_direction': {
        const shape = RAIL_SHAPES[num(value)];
        if (shape) props.shape = shape;
        else unmapped.push(`${key}=${String(value)}`);
        break;
      }
      case 'dripstone_thickness':
        props.thickness = String(value) === 'merge' ? 'tip_merge' : String(value);
        break;
      case 'hanging':
        if (id === 'pointed_dripstone') props.vertical_direction = truthy(value) ? 'down' : 'up';
        else props.hanging = bool(value);
        break;
      case 'upper_block_bit':
        props.half = truthy(value) ? 'upper' : 'lower';
        break;
      case 'door_hinge_bit':
        props.hinge = truthy(value) ? 'right' : 'left';
        break;
      case 'age':
      case 'growth':
      case 'kelp_age':
        props.age = String(num(value));
        break;
      case 'moisturized_amount':
        props.moisture = String(num(value));
        break;
      case 'composter_fill_level':
        props.level = String(num(value));
        break;
      case 'cluster_count':
        props.pickles = String(num(value) + 1);
        break;
      case 'height':
        props.layers = String(num(value) + 1);
        break;
      case 'candles':
        props.candles = String(num(value) + 1);
        break;
      case 'lit':
        props.lit = bool(value);
        break;
      case 'extinguished':
        props.lit = truthy(value) ? 'false' : 'true';
        break;
      case 'ground_sign_direction':
        props.rotation = String(num(value));
        break;
      default:
        unmapped.push(`${key}=${String(value)}`);
    }
  }

  return { state: { id: `${namespace}:${id}`, props }, unmapped };
}

// ---------------------------------------------------------------------------
// Rückrichtung für den Export als .mcstructure
// ---------------------------------------------------------------------------

export type BedrockStateValue = { type: 'string'; value: string } | { type: 'int'; value: number } | { type: 'byte'; value: number };

export interface JavaToBedrock {
  name: string;
  states: Record<string, BedrockStateValue>;
  waterlogged: boolean;
  /** Java-Eigenschaften, die nicht nach Bedrock übertragen wurden. */
  dropped: string[];
}

/** Java-ID → Bedrock-ID, wo die Namen abweichen (gegen die GeyserMC-Tabelle geprüft). */
const JAVA_TO_BEDROCK_ID: Record<string, string> = {
  powered_rail: 'golden_rail',
  dirt_path: 'grass_path',
  lily_pad: 'waterlily',
  sugar_cane: 'reeds',
  melon: 'melon_block',
  cobweb: 'web',
  slime_block: 'slime',
  note_block: 'noteblock',
  magma_block: 'magma',
  snow: 'snow_layer',
  snow_block: 'snow',
  bricks: 'brick_block',
  end_stone_bricks: 'end_bricks',
  terracotta: 'hardened_clay',
  nether_bricks: 'nether_brick',
  red_nether_bricks: 'red_nether_brick',
  nether_quartz_ore: 'quartz_ore',
  spawner: 'mob_spawner',
  shulker_box: 'undyed_shulker_box',
  stonecutter: 'stonecutter_block',
  dead_bush: 'deadbush',
  jack_o_lantern: 'lit_pumpkin',
  nether_portal: 'portal',
  oak_fence_gate: 'fence_gate',
  oak_door: 'wooden_door',
  oak_trapdoor: 'trapdoor',
  oak_button: 'wooden_button',
  oak_pressure_plate: 'wooden_pressure_plate',
  stone_slab: 'normal_stone_slab',
  stone_stairs: 'normal_stone_stairs',
  cobblestone_stairs: 'stone_stairs',
  end_stone_brick_stairs: 'end_brick_stairs',
  prismarine_brick_stairs: 'prismarine_bricks_stairs',
  rooted_dirt: 'dirt_with_roots',
  kelp_plant: 'kelp',
  tripwire: 'trip_wire',
  moving_piston: 'moving_block',
  wall_torch: 'torch',
  redstone_wall_torch: 'redstone_torch',
  soul_wall_torch: 'soul_torch',
  copper_wall_torch: 'copper_torch',
};

const DOOR_FACING_BACK: Record<string, string> = { north: 'east', east: 'south', south: 'west', west: 'north' };

/** Java-Eigenschaften ohne Entsprechung, die beim Export gefahrlos entfallen. */
const JAVA_IGNORED = new Set([
  'waterlogged', 'locked', 'enabled', 'triggered', 'powered', 'lit', 'extended', 'snowy', 'persistent',
  'distance', 'north', 'east', 'south', 'west', 'up', 'down', 'attached', 'disarmed', 'in_wall',
  'occupied', 'has_bottle_0', 'has_bottle_1', 'has_bottle_2', 'signal_fire', 'stage', 'unstable',
  'short', 'conditional', 'has_record', 'has_book', 'bottom', 'drag', 'note', 'instrument', 'power',
]);

/**
 * Übersetzt einen Blockzustand aus der Java-Schreibweise nach Bedrock.
 * Unterstützt die für Farmen wichtigen Blöcke; alles andere behält seinen Namen
 * und bekommt den Standardzustand (gemeldet in `dropped`).
 */
export function javaToBedrock(state: BlockState): JavaToBedrock {
  const colon = state.id.indexOf(':');
  const namespace = state.id.slice(0, colon);
  const id = state.id.slice(colon + 1);
  const p = state.props;
  const states: Record<string, BedrockStateValue> = {};
  const used = new Set<string>();
  let name = JAVA_TO_BEDROCK_ID[id] ?? id;

  const str = (key: string, value: string) => void (states[key] = { type: 'string', value });
  const int = (key: string, value: number) => void (states[key] = { type: 'int', value });
  const bit = (key: string, value: boolean) => void (states[key] = { type: 'byte', value: value ? 1 : 0 });
  const take = (key: string): string | undefined => {
    if (p[key] !== undefined) used.add(key);
    return p[key];
  };
  const isTrue = (key: string): boolean => take(key) === 'true';
  const index6 = (order: readonly string[], dir: string | undefined): number => Math.max(0, order.indexOf(dir ?? 'north'));

  if (id === 'piston' || id === 'sticky_piston' || id === 'piston_head') {
    if (id === 'piston_head') name = take('type') === 'sticky' ? 'sticky_piston_arm_collision' : 'piston_arm_collision';
    int('facing_direction', index6(PISTON6, take('facing')));
  } else if (id === 'observer') {
    str('minecraft:facing_direction', take('facing') ?? 'south');
    bit('powered_bit', isTrue('powered'));
  } else if (id === 'dispenser' || id === 'dropper') {
    int('facing_direction', index6(FACING6, take('facing')));
    bit('triggered_bit', isTrue('triggered'));
  } else if (id === 'hopper') {
    int('facing_direction', index6(FACING6, take('facing') ?? 'down'));
    bit('toggle_bit', take('enabled') === 'false');
  } else if (id === 'repeater') {
    name = isTrue('powered') ? 'powered_repeater' : 'unpowered_repeater';
    str('minecraft:cardinal_direction', take('facing') ?? 'north');
    int('repeater_delay', Math.max(0, Math.min(3, Number(take('delay') ?? 1) - 1)));
  } else if (id === 'comparator') {
    const powered = isTrue('powered');
    name = powered ? 'powered_comparator' : 'unpowered_comparator';
    str('minecraft:cardinal_direction', take('facing') ?? 'north');
    bit('output_subtract_bit', take('mode') === 'subtract');
    bit('output_lit_bit', powered);
  } else if (/^(chest|trapped_chest|ender_chest|furnace|blast_furnace|smoker|stonecutter|carved_pumpkin|jack_o_lantern|lectern|loom|anvil)$/.test(id)) {
    if ((id === 'furnace' || id === 'blast_furnace' || id === 'smoker') && isTrue('lit')) name = `lit_${id}`;
    str('minecraft:cardinal_direction', take('facing') ?? 'north');
    take('type');
  } else if (id === 'barrel') {
    int('facing_direction', index6(FACING6, take('facing')));
    bit('open_bit', isTrue('open'));
  } else if (id.endsWith('_stairs')) {
    int('weirdo_direction', Math.max(0, STAIRS4.indexOf((take('facing') ?? 'east') as (typeof STAIRS4)[number])));
    bit('upside_down_bit', take('half') === 'top');
    take('shape');
  } else if (id.endsWith('_slab')) {
    const type = take('type') ?? 'bottom';
    if (type === 'double') {
      name = /cut_copper_slab$/.test(name)
        ? name.replace(/cut_copper_slab$/, 'double_cut_copper_slab')
        : name.replace(/_slab$/, '_double_slab');
      str('minecraft:vertical_half', 'bottom');
    } else {
      str('minecraft:vertical_half', type);
    }
  } else if (id.endsWith('trapdoor')) {
    int('direction', Math.max(0, TRAPDOOR4.indexOf((take('facing') ?? 'east') as (typeof TRAPDOOR4)[number])));
    bit('open_bit', isTrue('open'));
    bit('upside_down_bit', take('half') === 'top');
  } else if (id.endsWith('_door')) {
    str('minecraft:cardinal_direction', DOOR_FACING_BACK[take('facing') ?? 'north'] ?? 'east');
    bit('door_hinge_bit', take('hinge') === 'right');
    bit('open_bit', isTrue('open'));
    bit('upper_block_bit', take('half') === 'upper');
  } else if (/^(redstone_|soul_|copper_)?(wall_)?torch$/.test(id)) {
    const facing = take('facing');
    if (/redstone/.test(id) && take('lit') === 'false') name = 'unlit_redstone_torch';
    str('torch_facing_direction', facing && OPPOSITE[facing] ? OPPOSITE[facing]! : 'top');
  } else if (id === 'lever') {
    const face = take('face') ?? 'wall';
    const facing = take('facing') ?? 'north';
    const northSouth = facing === 'north' || facing === 'south';
    str(
      'lever_direction',
      face === 'floor' ? (northSouth ? 'up_north_south' : 'up_east_west') : face === 'ceiling' ? (northSouth ? 'down_north_south' : 'down_east_west') : facing,
    );
    bit('open_bit', isTrue('powered'));
  } else if (id.endsWith('_button')) {
    const face = take('face') ?? 'wall';
    const facing = take('facing') ?? 'north';
    int('facing_direction', face === 'floor' ? 1 : face === 'ceiling' ? 0 : index6(FACING6, facing));
    bit('button_pressed_bit', isTrue('powered'));
  } else if (id === 'rail' || id.endsWith('_rail')) {
    int('rail_direction', Math.max(0, RAIL_SHAPES.indexOf((take('shape') ?? 'north_south') as (typeof RAIL_SHAPES)[number])));
    if (id !== 'rail') bit('rail_data_bit', isTrue('powered'));
  } else if (id === 'water' || id === 'lava') {
    const level = Number(take('level') ?? 0);
    if (level > 0) name = `flowing_${id}`;
    int('liquid_depth', level);
  } else if (id === 'redstone_wire') {
    int('redstone_signal', Number(take('power') ?? 0));
  } else if (id === 'pointed_dripstone') {
    const thickness = take('thickness') ?? 'tip';
    str('dripstone_thickness', thickness === 'tip_merge' ? 'merge' : thickness);
    bit('hanging', take('vertical_direction') !== 'up');
  } else if (id === 'farmland') {
    int('moisturized_amount', Number(take('moisture') ?? 0));
  } else if (/cauldron$/.test(id)) {
    name = 'cauldron';
    const level = Number(take('level') ?? 3);
    str('cauldron_liquid', id === 'lava_cauldron' ? 'lava' : id === 'powder_snow_cauldron' ? 'powder_snow' : 'water');
    int('fill_level', id === 'cauldron' ? 0 : id === 'lava_cauldron' ? 6 : Math.min(6, level * 2));
  } else if (id === 'sugar_cane' || id === 'cactus' || id === 'nether_wart') {
    int('age', Number(take('age') ?? 0));
  } else if (id === 'kelp' || id === 'kelp_plant') {
    int('kelp_age', Number(take('age') ?? 0));
  } else if (/^(wheat|carrots|potatoes|beetroots)$/.test(id)) {
    if (id === 'beetroots') name = 'beetroot';
    int('growth', Number(take('age') ?? 0));
  } else if (id === 'redstone_lamp') {
    if (isTrue('lit')) name = 'lit_redstone_lamp';
  } else if (id.endsWith('fence_gate')) {
    str('minecraft:cardinal_direction', take('facing') ?? 'north');
    bit('open_bit', isTrue('open'));
    bit('in_wall_bit', isTrue('in_wall'));
  } else if (id === 'ladder' || id.endsWith('_glazed_terracotta') || id === 'end_rod' || id === 'lightning_rod') {
    int('facing_direction', index6(FACING6, take('facing')));
  } else if (id === 'lantern' || id === 'soul_lantern') {
    bit('hanging', isTrue('hanging'));
  } else if (id === 'composter') {
    int('composter_fill_level', Number(take('level') ?? 0));
  } else if (id === 'daylight_detector') {
    if (isTrue('inverted')) name = 'daylight_detector_inverted';
    int('redstone_signal', Number(take('power') ?? 0));
  } else if (p.axis !== undefined) {
    str('pillar_axis', take('axis')!);
  }

  const waterlogged = p.waterlogged === 'true';
  const dropped = Object.keys(p)
    .filter((k) => !used.has(k) && !JAVA_IGNORED.has(k))
    .map((k) => `${k}=${p[k]}`);
  return { name: `${namespace}:${name}`, states, waterlogged, dropped };
}
