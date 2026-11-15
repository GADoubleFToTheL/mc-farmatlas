import { describe, expect, it } from 'vitest';
import { decodeTga } from './tga';

function header(type: number, w: number, h: number, depth: number, topDown = false): number[] {
  return [0, 0, type, 0, 0, 0, 0, 0, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, depth, topDown ? 0x20 : 0];
}

describe('decodeTga', () => {
  it('liest unkomprimierte 32-Bit-Bilder und dreht die Zeilen (unten zuerst)', () => {
    // 1 × 2: untere Zeile rot (BGRA), obere Zeile halbtransparent blau
    const img = decodeTga(new Uint8Array([...header(2, 1, 2, 32), 0, 0, 255, 255, 255, 0, 0, 128]));
    expect([img.width, img.height]).toEqual([1, 2]);
    expect([...img.data]).toEqual([0, 0, 255, 128, 255, 0, 0, 255]);
  });

  it('beachtet die Kennung für „von oben nach unten“', () => {
    const img = decodeTga(new Uint8Array([...header(2, 1, 2, 24, true), 0, 0, 255, 0, 255, 0]));
    expect([...img.data]).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
  });

  it('liest lauflängenkodierte Bilder', () => {
    // 3 × 1: zwei gleiche grüne Pixel (Lauf), dann ein einzelnes weißes
    const img = decodeTga(new Uint8Array([...header(10, 3, 1, 24), 0x81, 0, 255, 0, 0x00, 255, 255, 255]));
    expect([...img.data]).toEqual([0, 255, 0, 255, 0, 255, 0, 255, 255, 255, 255, 255]);
  });

  it('lehnt Unbekanntes ab', () => {
    expect(() => decodeTga(new Uint8Array(4))).toThrow();
    expect(() => decodeTga(new Uint8Array(header(1, 1, 1, 8)))).toThrow();
  });
});
