import { describe, expect, it } from 'vitest';
import { parseBlockState } from './blockstate';
import { blockCost, breakdown, computeMaterials, formatBreakdown, stackSize, totalSlots } from './materials';
import type { Blueprint } from './schema';
import { structureFromBlueprint } from './structure';

const cost = (s: string) => blockCost(parseBlockState(s));

describe('stackSize', () => {
  it('kennt 64er-, 16er- und 1er-Stacks', () => {
    expect(stackSize('minecraft:cobblestone')).toBe(64);
    expect(stackSize('minecraft:redstone')).toBe(64);
    expect(stackSize('minecraft:ender_pearl')).toBe(16);
    expect(stackSize('minecraft:oak_sign')).toBe(16);
    expect(stackSize('minecraft:bucket')).toBe(16);
    expect(stackSize('minecraft:water_bucket')).toBe(1);
    expect(stackSize('minecraft:hopper_minecart')).toBe(1);
    expect(stackSize('minecraft:white_bed')).toBe(1);
    expect(stackSize('minecraft:shulker_box')).toBe(1);
    expect(stackSize('minecraft:diamond_pickaxe')).toBe(1);
    expect(stackSize('minecraft:oak_boat')).toBe(1);
  });

  it('verwechselt ähnliche Namen nicht', () => {
    expect(stackSize('minecraft:rail')).toBe(64);
    expect(stackSize('minecraft:design_block')).toBe(64);
    expect(stackSize('minecraft:red_bedrock')).toBe(64);
  });
});

describe('breakdown', () => {
  it('rechnet 64er-Stacks um', () => {
    expect(breakdown('minecraft:stone', 140)).toMatchObject({ stacks: 2, rest: 12, slots: 3, shulkers: 0 });
    expect(breakdown('minecraft:stone', 64)).toMatchObject({ stacks: 1, rest: 0, slots: 1 });
    expect(breakdown('minecraft:stone', 63)).toMatchObject({ stacks: 0, rest: 63, slots: 1 });
  });

  it('rechnet Shulkerkisten um (27 Stacks)', () => {
    expect(breakdown('minecraft:stone', 1728)).toMatchObject({ shulkers: 1, stacksAfterShulkers: 0, rest: 0 });
    expect(breakdown('minecraft:stone', 1728 + 5 * 64 + 12)).toMatchObject({
      shulkers: 1,
      stacksAfterShulkers: 5,
      rest: 12,
      stacks: 32,
    });
  });

  it('beachtet 16er- und 1er-Stacks', () => {
    expect(breakdown('minecraft:ender_pearl', 40)).toMatchObject({ stackSize: 16, stacks: 2, rest: 8, slots: 3 });
    expect(breakdown('minecraft:ender_pearl', 27 * 16)).toMatchObject({ shulkers: 1 });
    expect(breakdown('minecraft:water_bucket', 5)).toMatchObject({ stackSize: 1, stacks: 5, rest: 0, slots: 5 });
    expect(breakdown('minecraft:water_bucket', 30)).toMatchObject({ shulkers: 1, stacksAfterShulkers: 3 });
  });
});

describe('formatBreakdown', () => {
  const f = (id: string, n: number) => formatBreakdown(breakdown(id, n));
  it('formatiert lesbar', () => {
    expect(f('minecraft:stone', 12)).toBe('');
    expect(f('minecraft:stone', 64)).toBe('1 Stack');
    expect(f('minecraft:stone', 204)).toBe('3 Stacks + 12');
    expect(f('minecraft:stone', 1728 + 5 * 64 + 12)).toBe('1 Shulker + 5 Stacks + 12');
    expect(f('minecraft:ender_pearl', 40)).toBe('2 Stacks + 8 (16er-Stacks)');
    expect(f('minecraft:water_bucket', 3)).toBe('');
  });
});

describe('blockCost', () => {
  it('ordnet Blöcke ihren Items zu', () => {
    expect(cost('minecraft:redstone_wire')).toMatchObject({ item: 'minecraft:redstone', count: 1 });
    expect(cost('minecraft:wall_torch[facing=north]')).toMatchObject({ item: 'minecraft:torch' });
    expect(cost('minecraft:oak_wall_sign[facing=north]')).toMatchObject({ item: 'minecraft:oak_sign' });
    expect(cost('minecraft:farmland')).toMatchObject({ item: 'minecraft:dirt' });
    expect(cost('minecraft:melon_stem[age=7]')).toMatchObject({ item: 'minecraft:melon_seeds' });
    expect(cost('minecraft:piston[facing=up]')).toMatchObject({ item: 'minecraft:piston', count: 1 });
  });

  it('zählt Doppelstufen doppelt und Mehrfachblöcke einfach', () => {
    expect(cost('minecraft:stone_slab[type=double]').count).toBe(2);
    expect(cost('minecraft:stone_slab[type=top]').count).toBe(1);
    expect(cost('minecraft:oak_door[half=upper]').item).toBeNull();
    expect(cost('minecraft:oak_door[half=lower]').count).toBe(1);
    expect(cost('minecraft:white_bed[part=head]').item).toBeNull();
    expect(cost('minecraft:sea_pickle[pickles=3]').count).toBe(3);
    expect(cost('minecraft:piston_head[facing=up]').item).toBeNull();
  });

  it('zählt Treppen mit half=top normal', () => {
    expect(cost('minecraft:oak_stairs[half=top,facing=north]')).toMatchObject({
      item: 'minecraft:oak_stairs',
      count: 1,
    });
  });

  it('zählt nur Quellblöcke als Flüssigkeit', () => {
    expect(cost('minecraft:water')).toMatchObject({ item: null, water: 1 });
    expect(cost('minecraft:water[level=0]')).toMatchObject({ water: 1 });
    expect(cost('minecraft:water[level=3]')).toMatchObject({ water: 0 });
    expect(cost('minecraft:lava[level=0]')).toMatchObject({ lava: 1 });
    expect(cost('minecraft:oak_slab[type=top,waterlogged=true]')).toMatchObject({ count: 1, water: 1 });
    expect(cost('minecraft:kelp')).toMatchObject({ item: 'minecraft:kelp', water: 1 });
  });

  it('behält fremde Namensräume', () => {
    expect(cost('mod:machine').item).toBe('mod:machine');
  });
});

describe('computeMaterials', () => {
  const bp: Blueprint = {
    format: 'grid',
    stateSyntax: 'java',
    start: { x: 0, y: 0, z: 0 },
    palette: {
      S: 'minecraft:stone',
      W: 'minecraft:water[level=0]',
      w: 'minecraft:water[level=3]',
      P: 'minecraft:piston[facing=north]',
      p: 'minecraft:piston[facing=south]',
      R: 'minecraft:redstone_wire',
      D: 'minecraft:stone_slab[type=double]',
    },
    layers: [
      ['SSS', 'SWw', 'SSS'],
      ['P.p', 'RRR', 'D..'],
    ],
  };
  const s = structureFromBlueprint(bp);

  it('summiert über den ganzen Bauplan und fasst Zustände zusammen', () => {
    const m = computeMaterials(s);
    expect(Object.fromEntries(m.items)).toEqual({
      'minecraft:stone': 7,
      'minecraft:piston': 2,
      'minecraft:redstone': 3,
      'minecraft:stone_slab': 2,
    });
    expect(m.fluids).toEqual({ water: 1, lava: 0 });
  });

  it('rechnet pro Ebene', () => {
    expect(Object.fromEntries(computeMaterials(s, 0).items)).toEqual({ 'minecraft:stone': 7 });
    expect(Object.fromEntries(computeMaterials(s, 1).items)).toEqual({
      'minecraft:piston': 2,
      'minecraft:redstone': 3,
      'minecraft:stone_slab': 2,
    });
    expect(computeMaterials(s, 1).fluids.water).toBe(0);
  });

  it('zählt Inventarplätze', () => {
    expect(totalSlots(computeMaterials(s))).toBe(4);
  });
});
