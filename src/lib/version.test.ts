import { describe, expect, it } from 'vitest';
import { compareVersions, isInRange, isValidVersion, isYearBased, parseVersion, sortVersions } from './version';

describe('parseVersion', () => {
  it('liest alte und jahresbasierte Versionen', () => {
    expect(parseVersion('1.21.11')?.parts).toEqual([1, 21, 11]);
    expect(parseVersion('26.1')?.parts).toEqual([26, 1]);
    expect(parseVersion('26.62')?.parts).toEqual([26, 62]);
    expect(parseVersion('V26.62')?.parts).toEqual([26, 62]);
  });

  it('liest Vorabversionen', () => {
    expect(parseVersion('26.1-snapshot-3')?.pre).toEqual({ kind: 'snapshot', n: 3 });
    expect(parseVersion('1.21.5-rc1')?.pre).toEqual({ kind: 'rc', n: 1 });
  });

  it('lehnt Unsinn ab', () => {
    for (const bad of ['', '26', 'abc', '1.21.x', '25w14a', '1..2', '1.2.3.4.5']) {
      expect(isValidVersion(bad), bad).toBe(false);
    }
  });
});

describe('compareVersions', () => {
  it('26.1 ist neuer als 1.21.11', () => {
    expect(compareVersions('26.1', '1.21.11')).toBeGreaterThan(0);
    expect(compareVersions('1.21.11', '26.1')).toBeLessThan(0);
  });

  it('vergleicht Segmente als Zahlen, nicht als Text', () => {
    expect(compareVersions('1.21.11', '1.21.9')).toBeGreaterThan(0);
    expect(compareVersions('1.21.130', '1.21.62')).toBeGreaterThan(0);
    expect(compareVersions('26.10', '26.9')).toBeGreaterThan(0);
    expect(compareVersions('26.62', '26.60')).toBeGreaterThan(0);
    expect(compareVersions('26.100', '26.62')).toBeGreaterThan(0);
  });

  it('behandelt fehlende Segmente als 0', () => {
    expect(compareVersions('1.21', '1.21.0')).toBe(0);
    expect(compareVersions('26.3', '26.3.1')).toBeLessThan(0);
  });

  it('ordnet Vorabversionen vor der fertigen Version ein', () => {
    expect(compareVersions('26.1-snapshot-1', '26.1')).toBeLessThan(0);
    expect(compareVersions('26.1-rc-1', '26.1-pre-3')).toBeGreaterThan(0);
    expect(compareVersions('26.1-pre-2', '26.1-pre-1')).toBeGreaterThan(0);
    expect(compareVersions('26.1-snapshot-9', '1.21.11')).toBeGreaterThan(0);
  });

  it('wirft bei ungültiger Eingabe', () => {
    expect(() => compareVersions('abc', '1.21')).toThrow();
  });
});

describe('sortVersions', () => {
  it('sortiert über beide Schemata hinweg', () => {
    expect(sortVersions(['26.1', '1.21.11', '1.20', '26.3', '1.21.2', '26.2'])).toEqual([
      '1.20',
      '1.21.2',
      '1.21.11',
      '26.1',
      '26.2',
      '26.3',
    ]);
  });
});

describe('isInRange', () => {
  it('prüft inklusive Grenzen', () => {
    const range = { from: '1.21', to: '26.62' };
    expect(isInRange('1.21', range)).toBe(true);
    expect(isInRange('26.62', range)).toBe(true);
    expect(isInRange('1.21.130', range)).toBe(true);
    expect(isInRange('26.70', range)).toBe(false);
    expect(isInRange('1.20.80', range)).toBe(false);
  });
});

describe('isYearBased', () => {
  it('erkennt das Schema', () => {
    expect(isYearBased('26.1')).toBe(true);
    expect(isYearBased('1.21.11')).toBe(false);
  });
});
