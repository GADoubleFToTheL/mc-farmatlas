import { describe, expect, it } from 'vitest';
import { formatBlockState, parseBlockState } from './blockstate';
import type { Blueprint } from './schema';
import { blockAt, structureFromBlueprint } from './structure';
import {
  composeOrientation,
  orientStructure,
  transformDirection,
  transformPoint,
  transformState,
  transformStructure,
  type Orientation,
  type TransformOp,
} from './transform';

const t = (state: string, op: TransformOp) => formatBlockState(transformState(parseBlockState(state), op));

describe('transformDirection', () => {
  it('dreht im Uhrzeigersinn: Norden → Osten → Süden → Westen', () => {
    expect(transformDirection('north', 'rotate-cw')).toBe('east');
    expect(transformDirection('east', 'rotate-cw')).toBe('south');
    expect(transformDirection('west', 'rotate-cw')).toBe('north');
    expect(transformDirection('north', 'rotate-ccw')).toBe('west');
    expect(transformDirection('north', 'rotate-180')).toBe('south');
  });
  it('spiegelt nur die betroffene Achse', () => {
    expect(transformDirection('east', 'mirror-x')).toBe('west');
    expect(transformDirection('north', 'mirror-x')).toBe('north');
    expect(transformDirection('north', 'mirror-z')).toBe('south');
    expect(transformDirection('east', 'mirror-z')).toBe('east');
  });
});

describe('transformState – Ausrichtungen', () => {
  it('dreht Kolben, Beobachter, Trichter, Werfer und Verstärker', () => {
    expect(t('minecraft:piston[facing=north]', 'rotate-cw')).toBe('minecraft:piston[facing=east]');
    expect(t('minecraft:observer[facing=east]', 'rotate-cw')).toBe('minecraft:observer[facing=south]');
    expect(t('minecraft:hopper[facing=west]', 'rotate-180')).toBe('minecraft:hopper[facing=east]');
    expect(t('minecraft:dispenser[facing=south]', 'rotate-ccw')).toBe('minecraft:dispenser[facing=east]');
    expect(t('minecraft:repeater[delay=3,facing=north]', 'rotate-cw')).toBe('minecraft:repeater[delay=3,facing=east]');
  });

  it('lässt oben und unten unverändert', () => {
    expect(t('minecraft:piston[facing=up]', 'rotate-cw')).toBe('minecraft:piston[facing=up]');
    expect(t('minecraft:hopper[facing=down]', 'mirror-x')).toBe('minecraft:hopper[facing=down]');
    expect(t('minecraft:oak_slab[type=top]', 'rotate-cw')).toBe('minecraft:oak_slab[type=top]');
  });

  it('dreht Achsen von Stämmen', () => {
    expect(t('minecraft:oak_log[axis=x]', 'rotate-cw')).toBe('minecraft:oak_log[axis=z]');
    expect(t('minecraft:oak_log[axis=y]', 'rotate-cw')).toBe('minecraft:oak_log[axis=y]');
    expect(t('minecraft:oak_log[axis=x]', 'rotate-180')).toBe('minecraft:oak_log[axis=x]');
    expect(t('minecraft:oak_log[axis=x]', 'mirror-x')).toBe('minecraft:oak_log[axis=x]');
  });

  it('dreht Seiten von Redstone-Leitung, Zäunen und Mauern', () => {
    expect(t('minecraft:redstone_wire[east=none,north=side,south=none,west=up]', 'rotate-cw')).toBe(
      'minecraft:redstone_wire[east=side,north=up,south=none,west=none]',
    );
    expect(t('minecraft:oak_fence[east=true,north=false,south=false,west=false]', 'mirror-x')).toBe(
      'minecraft:oak_fence[east=false,north=false,south=false,west=true]',
    );
  });

  it('dreht Schienen', () => {
    expect(t('minecraft:rail[shape=north_south]', 'rotate-cw')).toBe('minecraft:rail[shape=east_west]');
    expect(t('minecraft:rail[shape=ascending_north]', 'rotate-cw')).toBe('minecraft:rail[shape=ascending_east]');
    expect(t('minecraft:rail[shape=south_east]', 'rotate-cw')).toBe('minecraft:rail[shape=south_west]');
    expect(t('minecraft:rail[shape=north_east]', 'rotate-cw')).toBe('minecraft:rail[shape=south_east]');
    expect(t('minecraft:rail[shape=north_east]', 'mirror-x')).toBe('minecraft:rail[shape=north_west]');
    expect(t('minecraft:powered_rail[powered=true,shape=ascending_west]', 'mirror-x')).toBe(
      'minecraft:powered_rail[powered=true,shape=ascending_east]',
    );
  });

  it('dreht stehende Schilder in 16 Schritten', () => {
    expect(t('minecraft:oak_sign[rotation=0]', 'rotate-cw')).toBe('minecraft:oak_sign[rotation=4]');
    expect(t('minecraft:oak_sign[rotation=14]', 'rotate-cw')).toBe('minecraft:oak_sign[rotation=2]');
    expect(t('minecraft:oak_sign[rotation=4]', 'mirror-x')).toBe('minecraft:oak_sign[rotation=12]');
    expect(t('minecraft:oak_sign[rotation=0]', 'mirror-z')).toBe('minecraft:oak_sign[rotation=8]');
  });

  it('vertauscht beim Spiegeln links und rechts', () => {
    expect(t('minecraft:oak_stairs[facing=east,half=bottom,shape=inner_left]', 'mirror-x')).toBe(
      'minecraft:oak_stairs[facing=west,half=bottom,shape=inner_right]',
    );
    expect(t('minecraft:oak_stairs[facing=east,half=bottom,shape=inner_left]', 'rotate-cw')).toBe(
      'minecraft:oak_stairs[facing=south,half=bottom,shape=inner_left]',
    );
    expect(t('minecraft:oak_door[facing=north,half=lower,hinge=left]', 'mirror-z')).toBe(
      'minecraft:oak_door[facing=south,half=lower,hinge=right]',
    );
    expect(t('minecraft:chest[facing=north,type=left]', 'mirror-x')).toBe('minecraft:chest[facing=north,type=right]');
    expect(t('minecraft:oak_slab[type=top]', 'mirror-x')).toBe('minecraft:oak_slab[type=top]');
  });

  it('dreht die Ausrichtung des Werkers', () => {
    expect(t('minecraft:crafter[orientation=north_up]', 'rotate-cw')).toBe('minecraft:crafter[orientation=east_up]');
    expect(t('minecraft:crafter[orientation=up_west]', 'rotate-180')).toBe('minecraft:crafter[orientation=up_east]');
  });

  it('vier Vierteldrehungen und doppeltes Spiegeln ergeben das Original', () => {
    for (const state of [
      'minecraft:piston[facing=north]',
      'minecraft:rail[shape=south_west]',
      'minecraft:oak_sign[rotation=7]',
      'minecraft:redstone_wire[east=side,north=up,south=none,west=none]',
      'minecraft:oak_stairs[facing=west,half=top,shape=outer_right]',
    ]) {
      let s = parseBlockState(state);
      for (let i = 0; i < 4; i++) s = transformState(s, 'rotate-cw');
      expect(formatBlockState(s)).toBe(formatBlockState(parseBlockState(state)));
      expect(t(t(state, 'mirror-x'), 'mirror-x')).toBe(formatBlockState(parseBlockState(state)));
      expect(t(t(state, 'rotate-cw'), 'rotate-ccw')).toBe(formatBlockState(parseBlockState(state)));
      // Zwei Spiegelungen an verschiedenen Achsen = halbe Drehung
      expect(t(t(state, 'mirror-x'), 'mirror-z')).toBe(t(state, 'rotate-180'));
    }
  });
});

const bp: Blueprint = {
  format: 'grid',
  stateSyntax: 'java',
  start: { x: 0, y: 0, z: 0 },
  containers: [{ x: 2, y: 0, z: 0, items: [{ item: 'minecraft:stone', count: 1 }] }],
  palette: { P: 'minecraft:piston[facing=north]', S: 'minecraft:stone', C: 'minecraft:chest[facing=east]' },
  // Norden oben:  P S C
  //               . . S
  layers: [['PSC', '..S']],
};

describe('transformStructure', () => {
  const s = structureFromBlueprint(bp);
  const at = (st: ReturnType<typeof structureFromBlueprint>, x: number, z: number) => formatBlockState(blockAt(st, x, 0, z));

  it('dreht im Uhrzeigersinn: die Nordreihe wird zur Ostspalte', () => {
    const r = transformStructure(s, 'rotate-cw');
    expect(r.size).toEqual({ x: 2, y: 1, z: 3 });
    // Erwartet (Norden oben):  . P
    //                          . S
    //                          S C
    expect(at(r, 1, 0)).toBe('minecraft:piston[facing=east]');
    expect(at(r, 1, 1)).toBe('minecraft:stone');
    expect(at(r, 1, 2)).toBe('minecraft:chest[facing=south]');
    expect(at(r, 0, 2)).toBe('minecraft:stone');
    expect(at(r, 0, 0)).toBe('minecraft:air');
    expect(r.containers).toEqual([{ x: 1, y: 0, z: 2, items: [{ item: 'minecraft:stone', count: 1 }] }]);
  });

  it('spiegelt West ↔ Ost', () => {
    const m = transformStructure(s, 'mirror-x');
    expect(m.size).toEqual(s.size);
    expect(at(m, 2, 0)).toBe('minecraft:piston[facing=north]');
    expect(at(m, 0, 0)).toBe('minecraft:chest[facing=west]');
    expect(at(m, 0, 1)).toBe('minecraft:stone');
  });

  it('ist nach vier Vierteldrehungen wieder das Original', () => {
    let r = s;
    for (let i = 0; i < 4; i++) r = transformStructure(r, 'rotate-cw');
    expect(r.size).toEqual(s.size);
    expect([...r.blocks].map((i) => formatBlockState(r.palette[i]!))).toEqual(
      [...s.blocks].map((i) => formatBlockState(s.palette[i]!)),
    );
    expect(r.containers).toEqual(s.containers);
  });

  it('Punkt- und Strukturumrechnung stimmen überein', () => {
    for (const op of ['rotate-cw', 'rotate-ccw', 'rotate-180', 'mirror-x', 'mirror-z'] as const) {
      const r = transformStructure(s, op);
      const p = transformPoint(s.size, { x: 0, y: 0, z: 0 }, op);
      expect(blockAt(r, p.x, p.y, p.z).id, op).toBe('minecraft:piston');
    }
  });
});

describe('Orientation', () => {
  const s = structureFromBlueprint(bp);
  const flat = (o: Orientation) => {
    const r = orientStructure(s, bp.start, o);
    return JSON.stringify([r.structure.size, [...r.structure.blocks].map((i) => formatBlockState(r.structure.palette[i]!)), r.start]);
  };

  it('führt den Startblock mit', () => {
    const r = orientStructure(s, bp.start, { rot: 1, mirror: false });
    expect(r.start).toEqual({ x: 1, y: 0, z: 0 });
    expect(blockAt(r.structure, r.start.x, r.start.y, r.start.z).id).toBe('minecraft:piston');
  });

  it('composeOrientation entspricht dem direkten Umformen der aktuellen Ansicht', () => {
    const actions = ['cw', 'ccw', 'mirror'] as const;
    const opOf = { cw: 'rotate-cw', ccw: 'rotate-ccw', mirror: 'mirror-x' } as const;
    for (const mirror of [false, true]) {
      for (let rot = 0; rot < 4; rot++) {
        for (const action of actions) {
          const before = orientStructure(s, bp.start, { rot, mirror });
          const direct = transformStructure(before.structure, opOf[action]);
          const expected = JSON.stringify([
            direct.size,
            [...direct.blocks].map((i) => formatBlockState(direct.palette[i]!)),
            transformPoint(before.structure.size, before.start, opOf[action]),
          ]);
          expect(flat(composeOrientation({ rot, mirror }, action)), `${rot}/${mirror}/${action}`).toBe(expected);
        }
      }
    }
  });
});
