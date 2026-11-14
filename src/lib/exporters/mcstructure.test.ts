import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bedrockToJava, javaToBedrock } from '../bedrock';
import { formatBlockState, parseBlockState } from '../blockstate';
import { importSchematic } from '../importers/schematic';
import { validateFarm } from '../schema';
import { blockAt, structureFromBlueprint, totalBlocks } from '../structure';
import { bedrockBlockVersion, exportMcstructure } from './mcstructure';

const farmsDir = fileURLToPath(new URL('../../../data/farms/', import.meta.url));

/** Java → Bedrock → Java muss für unterstützte Blöcke wieder denselben Zustand ergeben. */
function roundTrip(javaState: string): string {
  const b = javaToBedrock(parseBlockState(javaState));
  const plain = Object.fromEntries(Object.entries(b.states).map(([k, v]) => [k, v.value]));
  const back = bedrockToJava(b.name, plain);
  expect(back.unmapped, javaState).toEqual([]);
  if (b.waterlogged) back.state.props.waterlogged = 'true';
  return formatBlockState(back.state);
}

describe('javaToBedrock', () => {
  it('übersetzt die Eigenheiten richtig', () => {
    expect(javaToBedrock(parseBlockState('minecraft:piston[facing=north]'))).toMatchObject({
      name: 'minecraft:piston',
      states: { facing_direction: { type: 'int', value: 3 } },
    });
    expect(javaToBedrock(parseBlockState('minecraft:hopper[facing=north]')).states.facing_direction).toEqual({ type: 'int', value: 2 });
    expect(javaToBedrock(parseBlockState('minecraft:wall_torch[facing=north]'))).toMatchObject({
      name: 'minecraft:torch',
      states: { torch_facing_direction: { type: 'string', value: 'south' } },
    });
    expect(javaToBedrock(parseBlockState('minecraft:repeater[delay=3,facing=east]'))).toMatchObject({
      name: 'minecraft:unpowered_repeater',
      states: { 'minecraft:cardinal_direction': { value: 'east' }, repeater_delay: { type: 'int', value: 2 } },
    });
    expect(javaToBedrock(parseBlockState('minecraft:oak_door[facing=north,half=lower,hinge=left]')).states['minecraft:cardinal_direction']).toEqual({ type: 'string', value: 'east' });
    expect(javaToBedrock(parseBlockState('minecraft:stone_slab[type=double]')).name).toBe('minecraft:normal_stone_double_slab');
    expect(javaToBedrock(parseBlockState('minecraft:cobblestone_stairs[facing=east,half=bottom]')).name).toBe('minecraft:stone_stairs');
    expect(javaToBedrock(parseBlockState('minecraft:water[level=3]'))).toMatchObject({ name: 'minecraft:flowing_water', states: { liquid_depth: { value: 3 } } });
    expect(javaToBedrock(parseBlockState('minecraft:sugar_cane')).name).toBe('minecraft:reeds');
  });

  it('ist die Umkehrung der Import-Übersetzung', () => {
    const states = [
      'minecraft:piston[facing=north]', 'minecraft:piston[facing=south]', 'minecraft:piston[facing=east]',
      'minecraft:piston[facing=west]', 'minecraft:piston[facing=up]', 'minecraft:piston[facing=down]',
      'minecraft:sticky_piston[facing=west]',
      'minecraft:observer[facing=north,powered=false]', 'minecraft:observer[facing=down,powered=false]',
      'minecraft:dispenser[facing=up,triggered=false]', 'minecraft:dropper[facing=east,triggered=false]',
      'minecraft:hopper[enabled=true,facing=down]', 'minecraft:hopper[enabled=true,facing=west]',
      'minecraft:repeater[delay=1,facing=north,powered=false]', 'minecraft:repeater[delay=4,facing=west,powered=true]',
      'minecraft:comparator[facing=south,mode=subtract,powered=false]',
      'minecraft:chest[facing=east]', 'minecraft:furnace[facing=north]', 'minecraft:furnace[facing=north,lit=true]',
      'minecraft:barrel[facing=up,open=false]',
      'minecraft:oak_stairs[facing=north,half=top]', 'minecraft:cobblestone_stairs[facing=west,half=bottom]',
      'minecraft:stone_stairs[facing=east,half=bottom]',
      'minecraft:smooth_stone_slab[type=top]', 'minecraft:smooth_stone_slab[type=double]', 'minecraft:stone_slab[type=bottom]',
      'minecraft:stone_slab[type=double]', 'minecraft:oak_slab[type=bottom,waterlogged=true]',
      'minecraft:oak_trapdoor[facing=north,half=top,open=true]', 'minecraft:iron_trapdoor[facing=west,half=bottom,open=false]',
      'minecraft:oak_door[facing=north,half=lower,hinge=left,open=false]', 'minecraft:iron_door[facing=west,half=upper,hinge=right,open=true]',
      'minecraft:torch', 'minecraft:wall_torch[facing=east]', 'minecraft:redstone_torch[lit=false]', 'minecraft:redstone_wall_torch[facing=south]',
      'minecraft:lever[face=wall,facing=east,powered=false]', 'minecraft:lever[face=floor,facing=north,powered=true]',
      'minecraft:stone_button[face=wall,facing=south,powered=false]', 'minecraft:stone_button[face=floor,facing=north,powered=false]',
      'minecraft:rail[shape=south_west]', 'minecraft:powered_rail[powered=true,shape=ascending_east]',
      'minecraft:water[level=0]', 'minecraft:water[level=5]', 'minecraft:lava[level=0]',
      'minecraft:redstone_wire[power=0]',
      'minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]',
      'minecraft:farmland[moisture=7]', 'minecraft:cauldron', 'minecraft:lava_cauldron', 'minecraft:water_cauldron[level=3]',
      'minecraft:sugar_cane[age=0]', 'minecraft:redstone_lamp[lit=true]', 'minecraft:oak_log[axis=x]',
      'minecraft:stone', 'minecraft:glass', 'minecraft:dirt', 'minecraft:mud', 'minecraft:blue_ice', 'minecraft:soul_soil',
      'minecraft:slime_block', 'minecraft:bricks', 'minecraft:magma_block',
    ];
    for (const state of states) expect(roundTrip(state), state).toBe(formatBlockState(parseBlockState(state)));
  });

  it('meldet nicht übertragene Eigenschaften', () => {
    expect(javaToBedrock(parseBlockState('minecraft:white_bed[facing=north,part=foot]')).dropped).toEqual(['facing=north', 'part=foot']);
    expect(javaToBedrock(parseBlockState('minecraft:stone')).dropped).toEqual([]);
  });
});

describe('bedrockBlockVersion', () => {
  it('rechnet das Jahresschema in die interne Version um', () => {
    expect(bedrockBlockVersion('26.62')).toBe(0x011a3e00);
    expect(bedrockBlockVersion('1.21.40')).toBe(0x01152800);
  });
});

describe('exportMcstructure', () => {
  it('ergibt für jede Farm mit Bauplan eine Datei, die sich Block für Block gleich zurücklesen lässt', async () => {
    let checked = 0;
    for (const file of readdirSync(farmsDir).filter((f) => f.endsWith('.json'))) {
      const result = validateFarm(JSON.parse(readFileSync(farmsDir + file, 'utf8')));
      if (!result.ok || !result.farm.blueprint) continue;
      const structure = structureFromBlueprint(result.farm.blueprint);
      const { bytes, warnings } = exportMcstructure(structure, { bedrockVersion: '26.62' });
      expect(warnings, file).toEqual([]);
      const back = await importSchematic(bytes, `${result.farm.id}.mcstructure`);
      expect(back.format).toBe('mcstructure');
      expect(back.mcVersion).toBe('26.62');
      expect(back.warnings).toEqual([]);
      expect(back.blockCount).toBe(totalBlocks(structure));
      expect(back.structure.size).toEqual(structure.size);
      // Import ergänzt Standardwerte (z. B. powered=false) – verglichen wird, was der Plan vorgibt.
      for (let y = 0; y < structure.size.y; y++) {
        for (let z = 0; z < structure.size.z; z++) {
          for (let x = 0; x < structure.size.x; x++) {
            const expected = blockAt(structure, x, y, z);
            const actual = blockAt(back.structure, x, y, z);
            expect(actual.id, `${file} (${x},${y},${z})`).toBe(expected.id);
            for (const [k, v] of Object.entries(expected.props)) expect(actual.props[k], `${file} ${expected.id}.${k}`).toBe(v);
          }
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });
});
