import { describe, expect, it } from 'vitest';
import { bedrockToJava } from './bedrock';
import { formatBlockState } from './blockstate';

const java = (name: string, states: Record<string, string | number | boolean> = {}) =>
  formatBlockState(bedrockToJava(name, states).state);
const unmapped = (name: string, states: Record<string, string | number | boolean>) => bedrockToJava(name, states).unmapped;

describe('bedrockToJava – Richtungen (gegen Wiki und GeyserMC geprüft)', () => {
  it('Kolben zählen anders: 2 = Süden, 3 = Norden, 4 = Osten, 5 = Westen', () => {
    expect(java('minecraft:piston', { facing_direction: 3 })).toBe('minecraft:piston[facing=north]');
    expect(java('minecraft:piston', { facing_direction: 2 })).toBe('minecraft:piston[facing=south]');
    expect(java('minecraft:sticky_piston', { facing_direction: 4 })).toBe('minecraft:sticky_piston[facing=east]');
    expect(java('minecraft:sticky_piston', { facing_direction: 5 })).toBe('minecraft:sticky_piston[facing=west]');
    expect(java('minecraft:piston', { facing_direction: 1 })).toBe('minecraft:piston[facing=up]');
    expect(java('minecraft:piston', { facing_direction: 0 })).toBe('minecraft:piston[facing=down]');
  });

  it('Trichter, Werfer und Spender zählen normal: 2 = Norden, 3 = Süden, 4 = Westen, 5 = Osten', () => {
    expect(java('minecraft:hopper', { facing_direction: 0, toggle_bit: false })).toBe(
      'minecraft:hopper[enabled=true,facing=down]',
    );
    expect(java('minecraft:hopper', { facing_direction: 4, toggle_bit: 1 })).toBe(
      'minecraft:hopper[enabled=false,facing=west]',
    );
    expect(java('minecraft:dispenser', { facing_direction: 2, triggered_bit: 0 })).toBe(
      'minecraft:dispenser[facing=north,triggered=false]',
    );
    expect(java('minecraft:dropper', { facing_direction: 5, triggered_bit: 0 })).toBe(
      'minecraft:dropper[facing=east,triggered=false]',
    );
  });

  it('Beobachter: gleiche Richtung wie in Java', () => {
    expect(java('minecraft:observer', { 'minecraft:facing_direction': 'north', powered_bit: false })).toBe(
      'minecraft:observer[facing=north,powered=false]',
    );
  });

  it('Verstärker: gleiche Richtung, Verzögerung um 1 versetzt', () => {
    expect(java('minecraft:unpowered_repeater', { 'minecraft:cardinal_direction': 'south', repeater_delay: 1 })).toBe(
      'minecraft:repeater[delay=2,facing=south,powered=false]',
    );
    expect(java('minecraft:powered_repeater', { 'minecraft:cardinal_direction': 'east', repeater_delay: 3 })).toBe(
      'minecraft:repeater[delay=4,facing=east,powered=true]',
    );
  });

  it('Komparator', () => {
    expect(
      java('minecraft:unpowered_comparator', {
        'minecraft:cardinal_direction': 'west',
        output_subtract_bit: true,
        output_lit_bit: false,
      }),
    ).toBe('minecraft:comparator[facing=west,mode=subtract,powered=false]');
  });

  it('Wandfackeln speichern die Gegenrichtung', () => {
    expect(java('minecraft:torch', { torch_facing_direction: 'south' })).toBe('minecraft:wall_torch[facing=north]');
    expect(java('minecraft:redstone_torch', { torch_facing_direction: 'east' })).toBe(
      'minecraft:redstone_wall_torch[facing=west]',
    );
    expect(java('minecraft:unlit_redstone_torch', { torch_facing_direction: 'top' })).toBe(
      'minecraft:redstone_torch[lit=false]',
    );
    expect(java('minecraft:torch', { torch_facing_direction: 'top' })).toBe('minecraft:torch');
  });

  it('Treppen, Falltüren, Türen', () => {
    expect(java('minecraft:oak_stairs', { weirdo_direction: 3, upside_down_bit: true })).toBe(
      'minecraft:oak_stairs[facing=north,half=top]',
    );
    expect(java('minecraft:oak_stairs', { weirdo_direction: 0, upside_down_bit: false })).toBe(
      'minecraft:oak_stairs[facing=east,half=bottom]',
    );
    expect(java('minecraft:trapdoor', { direction: 3, open_bit: 1, upside_down_bit: 1 })).toBe(
      'minecraft:oak_trapdoor[facing=north,half=top,open=true]',
    );
    expect(java('minecraft:iron_trapdoor', { direction: 0, open_bit: 0, upside_down_bit: 0 })).toBe(
      'minecraft:iron_trapdoor[facing=east,half=bottom,open=false]',
    );
    expect(
      java('minecraft:wooden_door', {
        'minecraft:cardinal_direction': 'east',
        door_hinge_bit: 0,
        open_bit: 0,
        upper_block_bit: 0,
      }),
    ).toBe('minecraft:oak_door[facing=north,half=lower,hinge=left,open=false]');
  });

  it('Knöpfe und Hebel', () => {
    expect(java('minecraft:stone_button', { facing_direction: 1, button_pressed_bit: 0 })).toBe(
      'minecraft:stone_button[face=floor,facing=north,powered=false]',
    );
    expect(java('minecraft:stone_button', { facing_direction: 4, button_pressed_bit: 0 })).toBe(
      'minecraft:stone_button[face=wall,facing=west,powered=false]',
    );
    expect(java('minecraft:lever', { lever_direction: 'up_east_west', open_bit: 1 })).toBe(
      'minecraft:lever[face=floor,facing=west,powered=true]',
    );
    expect(java('minecraft:lever', { lever_direction: 'south', open_bit: 0 })).toBe(
      'minecraft:lever[face=wall,facing=south,powered=false]',
    );
  });
});

describe('bedrockToJava – weitere Zustände', () => {
  it('Stufen und Doppelstufen', () => {
    expect(java('minecraft:smooth_stone_slab', { 'minecraft:vertical_half': 'top' })).toBe(
      'minecraft:smooth_stone_slab[type=top]',
    );
    expect(java('minecraft:smooth_stone_double_slab', { 'minecraft:vertical_half': 'bottom' })).toBe(
      'minecraft:smooth_stone_slab[type=double]',
    );
  });

  it('Wasser und Lava: Quelle und fließend', () => {
    expect(java('minecraft:water', { liquid_depth: 0 })).toBe('minecraft:water[level=0]');
    expect(java('minecraft:flowing_water', { liquid_depth: 3 })).toBe('minecraft:water[level=3]');
    expect(java('minecraft:flowing_lava', { liquid_depth: 9 })).toBe('minecraft:lava[level=9]');
  });

  it('Schienen', () => {
    expect(java('minecraft:rail', { rail_direction: 0 })).toBe('minecraft:rail[shape=north_south]');
    expect(java('minecraft:rail', { rail_direction: 9 })).toBe('minecraft:rail[shape=north_east]');
    expect(java('minecraft:golden_rail', { rail_direction: 1, rail_data_bit: true })).toBe(
      'minecraft:powered_rail[powered=true,shape=east_west]',
    );
  });

  it('Tropfstein, Kessel, Redstone, Ackerboden', () => {
    expect(java('minecraft:pointed_dripstone', { dripstone_thickness: 'tip', hanging: true })).toBe(
      'minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]',
    );
    expect(java('minecraft:pointed_dripstone', { dripstone_thickness: 'merge', hanging: 0 })).toBe(
      'minecraft:pointed_dripstone[thickness=tip_merge,vertical_direction=up]',
    );
    expect(java('minecraft:cauldron', { cauldron_liquid: 'water', fill_level: 0 })).toBe('minecraft:cauldron');
    expect(java('minecraft:cauldron', { cauldron_liquid: 'lava', fill_level: 6 })).toBe('minecraft:lava_cauldron');
    expect(java('minecraft:cauldron', { cauldron_liquid: 'water', fill_level: 6 })).toBe(
      'minecraft:water_cauldron[level=3]',
    );
    expect(java('minecraft:redstone_wire', { redstone_signal: 0 })).toBe('minecraft:redstone_wire[power=0]');
    expect(java('minecraft:farmland', { moisturized_amount: 7 })).toBe('minecraft:farmland[moisture=7]');
    expect(java('minecraft:lit_redstone_lamp')).toBe('minecraft:redstone_lamp[lit=true]');
  });

  it('benennt abweichende IDs um und lässt gleiche unverändert', () => {
    expect(java('minecraft:reeds', { age: 3 })).toBe('minecraft:sugar_cane[age=3]');
    expect(java('minecraft:slime')).toBe('minecraft:slime_block');
    expect(java('minecraft:stone')).toBe('minecraft:stone');
    expect(java('mod:machine')).toBe('mod:machine');
  });

  it('meldet Unbekanntes, statt es zu verschweigen', () => {
    expect(unmapped('minecraft:anvil', { direction: 2 })).toEqual(['direction=2']);
    expect(unmapped('minecraft:stone', { erfunden: 5 })).toEqual(['erfunden=5']);
    expect(unmapped('minecraft:cobblestone_wall', { wall_post_bit: 1, wall_connection_type_east: 'short' })).toEqual([]);
  });
});
