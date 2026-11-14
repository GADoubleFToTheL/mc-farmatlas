import { describe, expect, it } from 'vitest';
import { displayName, hasGermanName } from './names';

describe('displayName', () => {
  it('kennt Einzelnamen', () => {
    expect(displayName('minecraft:observer')).toBe('Beobachter');
    expect(displayName('minecraft:dispenser')).toBe('Werfer');
    expect(displayName('minecraft:dropper')).toBe('Spender');
    expect(displayName('farmatlas:xp')).toBe('Erfahrung (XP)');
    expect(displayName('minecraft:beacon')).toBe('Leuchtfeuer');
  });

  it('bildet Holznamen', () => {
    expect(displayName('minecraft:spruce_stairs')).toBe('Fichtenholztreppe');
    expect(displayName('minecraft:spruce_slab')).toBe('Fichtenholzstufe');
    expect(displayName('minecraft:dark_oak_fence_gate')).toBe('Schwarzeichenholzzauntor');
    expect(displayName('minecraft:birch_log')).toBe('Birkenstamm');
    expect(displayName('minecraft:spruce_leaves')).toBe('Fichtennadeln');
    expect(displayName('minecraft:jungle_trapdoor')).toBe('Tropenholzfalltür');
    expect(displayName('minecraft:crimson_planks')).toBe('Karmesinbretter');
    expect(displayName('minecraft:acacia_wall_sign')).toBe('Akazienholzschild');
    expect(displayName('minecraft:birch_sapling')).toBe('Birkensetzling');
  });

  it('bildet Farbnamen mit passender Endung', () => {
    expect(displayName('minecraft:red_wool')).toBe('Rote Wolle');
    expect(displayName('minecraft:light_blue_carpet')).toBe('Hellblauer Teppich');
    expect(displayName('minecraft:lime_stained_glass')).toBe('Hellgrünes Glas');
    expect(displayName('minecraft:pink_concrete')).toBe('Rosa Beton');
    expect(displayName('minecraft:magenta_bed')).toBe('Magenta Bett');
    expect(displayName('minecraft:cyan_terracotta')).toBe('Türkise Keramik');
    expect(displayName('minecraft:black_shulker_box')).toBe('Schwarze Shulkerkiste');
  });

  it('bildet Steinnamen', () => {
    expect(displayName('minecraft:stone_brick_stairs')).toBe('Steinziegeltreppe');
    expect(displayName('minecraft:polished_deepslate_slab')).toBe('Polierte Tiefenschieferstufe');
    expect(displayName('minecraft:cobblestone_wall')).toBe('Bruchsteinmauer');
    expect(displayName('minecraft:andesite_stairs')).toBe('Andesittreppe');
  });

  it('zeigt Unbekanntes als ID ohne Namensraum', () => {
    expect(displayName('minecraft:gibt_es_nicht')).toBe('gibt_es_nicht');
    expect(displayName('mod:spruce_stairs')).toBe('mod:spruce_stairs');
    expect(hasGermanName('minecraft:gibt_es_nicht')).toBe(false);
    expect(displayName('Spitzhacke')).toBe('Spitzhacke');
  });
});
