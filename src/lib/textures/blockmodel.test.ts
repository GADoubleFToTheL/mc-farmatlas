import { describe, expect, it } from 'vitest';
import { parseBlockState } from '../blockstate';
import { buildModel, wireConnectsTo, type BlockModel, type Connections } from './blockmodel';
import { buildMeshData, rotatedFace } from './meshdata';
import { PackIndex, type Face } from './pack';

// Kleine Beispielzuordnung im Aufbau von Mojangs Dateien.
const index = new PackIndex(
  {
    stone: { textures: 'stone' },
    oak_log: { textures: { down: 'log_top', side: 'log_side', up: 'log_top' } },
    chest: { textures: { down: 'c_top', east: 'c_side', north: 'c_side', south: 'c_front', up: 'c_top', west: 'c_side' } },
    barrel: { textures: { down: 'b_side', east: 'b_side', north: 'b_top', south: 'b_bottom', up: 'b_side', west: 'b_side' } },
    smooth_stone_slab: { textures: 'stone' },
    normal_stone_stairs: { textures: 'stone' },
    oak_fence: { textures: 'stone' },
    glass: { textures: 'glass' },
    rail: { textures: { down: 'rail', side: 'rail', up: 'rail_turned' } },
    reeds: { textures: 'reeds' },
  },
  {
    texture_data: Object.fromEntries(
      ['stone', 'log_top', 'log_side', 'c_top', 'c_side', 'c_front', 'b_side', 'b_top', 'b_bottom', 'glass', 'rail', 'rail_turned', 'reeds'].map((k) => [k, { textures: `textures/blocks/${k}` }]),
    ),
  },
);

const m = (state: string, connections?: Connections): BlockModel => {
  const built = buildModel(parseBlockState(state), { index, connections });
  if (!built) throw new Error(`kein Modell für ${state}`);
  return built;
};

/** Auf welcher Weltseite liegt die Textur mit diesem Dateinamen (bei Würfeln)? */
function sideOf(model: BlockModel, file: string): Face[] {
  const out: Face[] = [];
  for (const el of model.elements) {
    if (el.type !== 'box') continue;
    for (const [face, tex] of Object.entries(el.faces) as Array<[Face, { path: string }]>) {
      if (tex?.path.endsWith('/' + file)) out.push(rotatedFace(face, model.rotX, model.rotY));
    }
  }
  return [...new Set(out)].sort();
}

describe('rotatedFace', () => {
  it('rotY dreht im Uhrzeigersinn, rotX kippt die Oberseite nach Norden', () => {
    expect(rotatedFace('north', 0, 1)).toBe('east');
    expect(rotatedFace('east', 0, 1)).toBe('south');
    expect(rotatedFace('up', 0, 1)).toBe('up');
    expect(rotatedFace('up', 1, 0)).toBe('north');
    expect(rotatedFace('north', 1, 0)).toBe('down');
    expect(rotatedFace('up', 2, 0)).toBe('down');
    expect(rotatedFace('up', 3, 0)).toBe('south');
    expect(rotatedFace('up', 1, 1)).toBe('east');
  });
});

describe('buildModel – Ausrichtung', () => {
  it('Kolben: Die Stoßfläche zeigt in Blickrichtung', () => {
    for (const dir of ['north', 'east', 'south', 'west', 'up', 'down'] as const) {
      expect(sideOf(m(`minecraft:piston[facing=${dir}]`), 'piston_top_normal'), dir).toEqual([dir]);
    }
    expect(sideOf(m('minecraft:sticky_piston[facing=west]'), 'piston_top_sticky')).toEqual(['west']);
    expect(sideOf(m('minecraft:piston[facing=east]'), 'piston_bottom')).toEqual(['west']);
  });

  it('Beobachter: Gesicht in Blickrichtung, roter Punkt hinten', () => {
    for (const [dir, back] of [['north', 'south'], ['east', 'west'], ['south', 'north'], ['west', 'east'], ['up', 'down'], ['down', 'up']] as const) {
      const model = m(`minecraft:observer[facing=${dir}]`);
      expect(sideOf(model, 'observer_front'), dir).toEqual([dir]);
      expect(sideOf(model, 'observer_back'), dir).toEqual([back]);
    }
  });

  it('Werfer und Spender: Öffnung in Blickrichtung', () => {
    expect(sideOf(m('minecraft:dispenser[facing=west]'), 'dispenser_front_horizontal')).toEqual(['west']);
    expect(sideOf(m('minecraft:dropper[facing=north]'), 'dropper_front_horizontal')).toEqual(['north']);
    expect(sideOf(m('minecraft:dispenser[facing=up]'), 'dispenser_front_vertical')).toEqual(['up']);
    expect(sideOf(m('minecraft:dropper[facing=down]'), 'dropper_front_vertical')).toEqual(['down']);
  });

  it('Truhe, Ofen: Vorderseite in Blickrichtung', () => {
    expect(sideOf(m('minecraft:chest[facing=north]'), 'c_front')).toEqual(['north']);
    expect(sideOf(m('minecraft:chest[facing=east]'), 'c_front')).toEqual(['east']);
    expect(sideOf(m('minecraft:furnace[facing=west,lit=true]'), 'furnace_front_on')).toEqual(['west']);
    expect(sideOf(m('minecraft:furnace[facing=south]'), 'furnace_front_off')).toEqual(['south']);
  });

  it('Fass: Deckel in Blickrichtung', () => {
    expect(sideOf(m('minecraft:barrel[facing=up]'), 'b_top')).toEqual(['up']);
    expect(sideOf(m('minecraft:barrel[facing=down]'), 'b_top')).toEqual(['down']);
    expect(sideOf(m('minecraft:barrel[facing=east]'), 'b_top')).toEqual(['east']);
  });

  it('Stämme: Schnittflächen entlang der Achse', () => {
    expect(sideOf(m('minecraft:oak_log[axis=y]'), 'log_top')).toEqual(['down', 'up']);
    expect(sideOf(m('minecraft:oak_log[axis=x]'), 'log_top')).toEqual(['east', 'west']);
    expect(sideOf(m('minecraft:oak_log[axis=z]'), 'log_top')).toEqual(['north', 'south']);
  });

  it('Verstärker: Die Texturspitze zeigt zum Ausgang (entgegen facing)', () => {
    // Modell: Ausgang im Norden. facing=south → keine Drehung; facing=north → halbe Drehung.
    expect(m('minecraft:repeater[facing=south,delay=1]').rotY).toBe(0);
    expect(m('minecraft:repeater[facing=north,delay=1]').rotY).toBe(2);
    expect(m('minecraft:repeater[facing=west,delay=1]').rotY).toBe(1);
    expect(m('minecraft:comparator[facing=east]').rotY).toBe(3);
    // Die bewegliche Fackel wandert mit der Verzögerung nach hinten.
    const z = (delay: number) => (m(`minecraft:repeater[facing=south,delay=${delay}]`).elements[2] as { from: number[] }).from[2];
    expect([z(1), z(2), z(3), z(4)]).toEqual([6, 8, 10, 12]);
  });

  it('Trichter: Auslauf nach unten oder zur Seite', () => {
    const down = m('minecraft:hopper[facing=down]');
    expect((down.elements[3] as { from: number[] }).from).toEqual([6, 0, 6]);
    const east = m('minecraft:hopper[facing=east]');
    expect((east.elements[3] as { from: number[] }).from).toEqual([6, 4, 0]);
    expect(east.rotY).toBe(1);
  });
});

describe('buildModel – Formen', () => {
  it('Stufen und Treppen', () => {
    expect((m('minecraft:smooth_stone_slab[type=top]').elements[0] as { from: number[] }).from[1]).toBe(8);
    expect((m('minecraft:smooth_stone_slab[type=bottom]').elements[0] as { to: number[] }).to[1]).toBe(8);
    expect(m('minecraft:smooth_stone_slab[type=double]').solid).toBe(true);
    const stairs = m('minecraft:stone_stairs[facing=east,half=bottom]');
    expect(stairs.elements).toHaveLength(2);
    expect(stairs.rotY).toBe(1);
  });

  it('volle Blöcke verdecken, durchsichtige nicht', () => {
    expect(m('minecraft:stone').solid).toBe(true);
    expect(m('minecraft:glass')).toMatchObject({ solid: false, layer: 'cutout' });
    expect(m('minecraft:water[level=0]')).toMatchObject({ solid: false, layer: 'blend' });
  });

  it('Redstone-Leitung: Kreuz, Linie oder Arme', () => {
    const count = (c?: Connections) => m('minecraft:redstone_wire', c).elements.length;
    expect(count()).toBe(1);
    expect(count({ north: true })).toBe(1);
    expect(count({ east: true, west: true })).toBe(1);
    expect(count({ north: true, east: true })).toBe(3);
    expect(count({ north: true, east: true, south: true, west: true })).toBe(5);
    // Importierte Zustände bringen ihre Verbindungen selbst mit
    expect(m('minecraft:redstone_wire[east=side,north=none,south=up,west=none]').elements).toHaveLength(3);
  });

  it('Zäune bekommen Arme zu verbundenen Nachbarn', () => {
    expect(m('minecraft:oak_fence').elements).toHaveLength(1);
    expect(m('minecraft:oak_fence', { north: true, east: true }).elements).toHaveLength(5);
  });

  it('Schienen drehen mit ihrer Form', () => {
    expect(m('minecraft:rail[shape=north_south]').rotY).toBe(0);
    expect(m('minecraft:rail[shape=east_west]').rotY).toBe(1);
    expect(m('minecraft:rail[shape=south_west]').rotY).toBe(1);
    expect(sideOf(m('minecraft:rail[shape=north_east]'), 'rail_turned')).toContain('up');
  });

  it('gibt null zurück, wenn das Paket den Block nicht kennt', () => {
    expect(buildModel(parseBlockState('minecraft:gibt_es_nicht'), { index })).toBeNull();
  });
});

describe('wireConnectsTo', () => {
  it('verbindet Leitung mit passenden Bauteilen', () => {
    const c = (state: string, side: 'north' | 'east' | 'south' | 'west') => wireConnectsTo(parseBlockState(state), side);
    expect(c('minecraft:redstone_wire', 'north')).toBe(true);
    expect(c('minecraft:stone', 'north')).toBe(false);
    expect(c('minecraft:repeater[facing=north]', 'south')).toBe(true);
    expect(c('minecraft:repeater[facing=north]', 'east')).toBe(false);
    // Beobachter östlich der Leitung: verbindet nur, wenn seine Rückseite zur Leitung zeigt
    expect(c('minecraft:observer[facing=east]', 'east')).toBe(true);
    expect(c('minecraft:observer[facing=west]', 'east')).toBe(false);
  });
});

describe('buildMeshData', () => {
  it('erzeugt je Würfel 12 Dreiecke und schattiert die Seiten wie im Spiel', () => {
    const groups = buildMeshData(m('minecraft:stone'));
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.positions.length / 9).toBe(12);
    expect(Math.min(...g.positions)).toBe(0);
    expect(Math.max(...g.positions)).toBe(1);
    expect([...new Set(g.colors)].sort()).toEqual([0.5, 0.6, 0.8, 1]);
  });

  it('trennt nach Textur und schneidet Texturen passend zu', () => {
    const groups = buildMeshData(m('minecraft:smooth_stone_slab[type=bottom]'));
    const g = groups[0]!;
    // Seitenflächen einer unteren Stufe zeigen nur die untere Texturhälfte
    const vs = g.uvs.filter((_, i) => i % 2 === 1);
    expect(Math.min(...vs)).toBe(0);
    expect(vs.some((v) => v === 0.5)).toBe(true);
  });

  it('dreht Positionen mit dem Modell', () => {
    // Liegender Stamm (Achse x): Die Schnittfläche liegt bei x = 0 und x = 1
    const groups = buildMeshData(m('minecraft:oak_log[axis=x]'));
    const top = groups.find((g) => g.material.includes('log_top'))!;
    const xs = top.positions.filter((_, i) => i % 3 === 0);
    expect([...new Set(xs)].sort()).toEqual([0, 1]);
  });

  it('Pflanzenkreuze sind beidseitig sichtbar', () => {
    const groups = buildMeshData(m('minecraft:sugar_cane'));
    expect(groups[0]!.doubleSided).toBe(true);
    expect(groups[0]!.positions.length / 9).toBe(4);
  });
});
