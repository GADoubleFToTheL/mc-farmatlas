/**
 * Java-„DataVersion“ → Spielversion. Schematic-Dateien speichern nur diese
 * Zahl. Quelle der Tabelle: minecraft.wiki/w/Data_version (nur fertige Versionen).
 */
const RELEASES: ReadonlyArray<readonly [string, number]> = [
  ['26.3', 5023], ['26.2', 4903], ['26.1.2', 4790], ['26.1.1', 4788], ['26.1', 4786],
  ['1.21.11', 4671], ['1.21.10', 4556], ['1.21.9', 4554], ['1.21.8', 4440], ['1.21.7', 4438],
  ['1.21.6', 4435], ['1.21.5', 4325], ['1.21.4', 4189], ['1.21.3', 4082], ['1.21.2', 4080],
  ['1.21.1', 3955], ['1.21', 3953], ['1.20.6', 3839], ['1.20.5', 3837], ['1.20.4', 3700],
  ['1.20.3', 3698], ['1.20.2', 3578], ['1.20.1', 3465], ['1.20', 3463], ['1.19.4', 3337],
  ['1.19.3', 3218], ['1.19.2', 3120], ['1.19.1', 3117], ['1.19', 3105], ['1.18.2', 2975],
  ['1.18.1', 2865], ['1.18', 2860], ['1.17.1', 2730], ['1.17', 2724], ['1.16.5', 2586],
  ['1.16.4', 2584], ['1.16.3', 2580], ['1.16.2', 2578], ['1.16.1', 2567], ['1.16', 2566],
  ['1.15.2', 2230], ['1.15.1', 2227], ['1.15', 2225], ['1.14.4', 1976], ['1.14.3', 1968],
  ['1.14.2', 1963], ['1.14.1', 1957], ['1.14', 1952], ['1.13.2', 1631], ['1.13.1', 1628],
  ['1.13', 1519], ['1.12.2', 1343], ['1.12.1', 1241], ['1.12', 1139],
];

export interface JavaVersionGuess {
  version: string;
  /** false: Die Zahl liegt zwischen zwei Versionen (Snapshot) oder ist neuer als die Tabelle. */
  exact: boolean;
}

export function javaVersionFromDataVersion(dataVersion: number): JavaVersionGuess | null {
  if (!Number.isFinite(dataVersion) || dataVersion < RELEASES[RELEASES.length - 1]![1]) return null;
  for (const [version, number] of RELEASES) {
    if (dataVersion >= number) return { version, exact: dataVersion === number };
  }
  return null;
}

/**
 * Bedrock speichert die Version je Block als vier Bytes (1.21.40.1 → 0x01152801).
 * Seit 2026 heißt die interne 1.26.60 nach außen 26.60.
 */
export function bedrockVersionFromBlockVersion(blockVersion: number): string | null {
  if (!Number.isInteger(blockVersion) || blockVersion <= 0) return null;
  const major = (blockVersion >>> 24) & 0xff;
  const minor = (blockVersion >>> 16) & 0xff;
  const patch = (blockVersion >>> 8) & 0xff;
  if (major !== 1) return null;
  return minor >= 26 ? `${minor}.${patch}` : `1.${minor}.${patch}`;
}
