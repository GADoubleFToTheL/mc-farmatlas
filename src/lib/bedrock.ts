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
  if (id.endsWith('_double_slab')) {
    id = id.replace(/_double_slab$/, '_slab');
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
