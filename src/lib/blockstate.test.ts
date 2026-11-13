import { describe, expect, it } from 'vitest';
import { formatBlockState, isAir, parseBlockState } from './blockstate';

describe('parseBlockState (Java)', () => {
  it('liest ID ohne Eigenschaften und ergänzt den Namensraum', () => {
    expect(parseBlockState('minecraft:stone')).toEqual({ id: 'minecraft:stone', props: {} });
    expect(parseBlockState('stone')).toEqual({ id: 'minecraft:stone', props: {} });
  });

  it('liest Eigenschaften', () => {
    expect(parseBlockState('minecraft:repeater[facing=north,delay=2]')).toEqual({
      id: 'minecraft:repeater',
      props: { facing: 'north', delay: '2' },
    });
  });

  it('meldet Fehler', () => {
    expect(() => parseBlockState('minecraft:piston[facing=north')).toThrow();
    expect(() => parseBlockState('minecraft:piston[facing]')).toThrow();
    expect(() => parseBlockState('Minecraft:Stone')).toThrow();
    expect(() => parseBlockState('minecraft:piston[facing=north,facing=south]')).toThrow();
    expect(() => parseBlockState('')).toThrow();
  });
});

describe('parseBlockState (Bedrock)', () => {
  it('liest Anführungszeichen, Zahlen und Wahrheitswerte', () => {
    const s = parseBlockState(
      'minecraft:observer["minecraft:facing_direction"="north","powered_bit"=false]',
      'bedrock',
    );
    expect(s).toEqual({
      id: 'minecraft:observer',
      props: { 'minecraft:facing_direction': 'north', powered_bit: 'false' },
    });
    expect(parseBlockState('minecraft:unpowered_repeater["repeater_delay"=1]', 'bedrock').props).toEqual({
      repeater_delay: '1',
    });
  });
});

describe('formatBlockState', () => {
  it('schreibt sortiert und ist umkehrbar', () => {
    const java = 'minecraft:repeater[delay=2,facing=north]';
    expect(formatBlockState(parseBlockState('minecraft:repeater[facing=north,delay=2]'))).toBe(java);
    const bedrock = 'minecraft:observer["minecraft:facing_direction"="north","powered_bit"=false]';
    expect(formatBlockState(parseBlockState(bedrock, 'bedrock'), 'bedrock')).toBe(bedrock);
  });
});

describe('isAir', () => {
  it('erkennt Luft', () => {
    expect(isAir(parseBlockState('minecraft:air'))).toBe(true);
    expect(isAir(parseBlockState('minecraft:stone'))).toBe(false);
  });
});
