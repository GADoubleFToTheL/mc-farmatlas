import { describe, expect, it } from 'vitest';
import { PackIndex, parseLooseJson } from './pack';

// Eigene kleine Beispiele im Aufbau von Mojangs Dateien (die Originale liegen nicht im Repo).
const blocks = parseLooseJson(`﻿{
  // Kommentar wie im Original
  "format_version": "1.21.40",
  "stone": { "sound": "stone", "textures": "flattened_stone" },
  "piston": { "textures": { "down": "piston_bottom", "side": "piston_side", "up": "piston_top" } },
  "observer": { "textures": { "down": "o_bottom", "east": "o_east", "north": "o_north", "south": "o_south", "up": "o_top", "west": "o_west" } },
  "grass": { "textures": { "down": "grass_bottom", "side": "grass_side", "up": "grass_top" } },
  "seaLantern": { "textures": "sea_lantern" },
  "air": {}
}`);
const terrain = parseLooseJson(`{
  /* Blockkommentar */
  "texture_data": {
    "flattened_stone": { "textures": "textures/blocks/stone" },
    "piston_side": { "textures": ["textures/blocks/piston_side"] },
    "grass_side": { "textures": [{ "path": "textures/blocks/grass_side", "overlay_color": "#79c05a" }] },
    "repeater_up": { "textures": ["textures/blocks/repeater_off", "textures/blocks/repeater_on"] }
  }
}`);
const index = new PackIndex(blocks, terrain);

describe('parseLooseJson', () => {
  it('verträgt BOM und Kommentare, lässt URLs in Texten aber stehen', () => {
    expect(parseLooseJson('﻿{ "a": 1 } // Ende')).toEqual({ a: 1 });
    expect(parseLooseJson('{ "url": "https://example.org/x" }')).toEqual({ url: 'https://example.org/x' });
  });
});

describe('PackIndex', () => {
  it('liest einfache, dreiteilige und sechsteilige Zuordnungen', () => {
    expect(index.blockFaces('minecraft:stone')?.up).toBe('flattened_stone');
    expect(index.blockFaces('piston')).toEqual({
      up: 'piston_top', down: 'piston_bottom', north: 'piston_side', south: 'piston_side', east: 'piston_side', west: 'piston_side',
    });
    expect(index.blockFaces('observer')?.south).toBe('o_south');
  });

  it('findet abweichend benannte Einträge', () => {
    expect(index.blockFaces('grass_block')?.up).toBe('grass_top');
    expect(index.blockFaces('sea_lantern')?.up).toBe('sea_lantern');
  });

  it('meldet fehlende Einträge', () => {
    expect(index.blockFaces('gibt_es_nicht')).toBeNull();
    expect(index.blockFaces('air')).toBeNull();
  });

  it('löst Texturschlüssel in Pfade auf, auch Varianten', () => {
    expect(index.texturePath('flattened_stone')).toBe('textures/blocks/stone');
    expect(index.texturePath('piston_side')).toBe('textures/blocks/piston_side');
    expect(index.texturePath('grass_side')).toBe('textures/blocks/grass_side');
    expect(index.texturePath('repeater_up', 1)).toBe('textures/blocks/repeater_on');
    expect(index.texturePath('repeater_up', 9)).toBe('textures/blocks/repeater_on');
    expect(index.texturePath('fehlt')).toBeNull();
  });
});
