import { describe, expect, it } from 'vitest';
import { bedrockVersionFromBlockVersion, javaVersionFromDataVersion } from './dataversion';
import { compareVersions } from './version';

describe('javaVersionFromDataVersion', () => {
  it('kennt fertige Versionen', () => {
    expect(javaVersionFromDataVersion(5023)).toEqual({ version: '26.3', exact: true });
    expect(javaVersionFromDataVersion(3953)).toEqual({ version: '1.21', exact: true });
    expect(javaVersionFromDataVersion(2586)).toEqual({ version: '1.16.5', exact: true });
  });

  it('ordnet Zwischenstände der nächstälteren Version zu', () => {
    expect(javaVersionFromDataVersion(4800)).toEqual({ version: '26.1.2', exact: false });
    expect(javaVersionFromDataVersion(9999)).toEqual({ version: '26.3', exact: false });
  });

  it('gibt bei sehr alten oder ungültigen Zahlen nichts zurück', () => {
    expect(javaVersionFromDataVersion(100)).toBeNull();
    expect(javaVersionFromDataVersion(Number.NaN)).toBeNull();
  });

  it('liefert Versionen, die der Versionsvergleich versteht', () => {
    expect(compareVersions(javaVersionFromDataVersion(4786)!.version, '1.21.11')).toBeGreaterThan(0);
  });
});

describe('bedrockVersionFromBlockVersion', () => {
  it('liest altes und jahresbasiertes Schema', () => {
    expect(bedrockVersionFromBlockVersion(0x01152801)).toBe('1.21.40');
    expect(bedrockVersionFromBlockVersion(0x011a3c00)).toBe('26.60');
    expect(bedrockVersionFromBlockVersion(0)).toBeNull();
  });
});
