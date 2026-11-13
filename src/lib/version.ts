/**
 * Versionsvergleich für Minecraft.
 *
 * Unterstützt beide Namensschemata:
 *  - alt:          1.21, 1.21.11 (Java), 1.21.130 (Bedrock)
 *  - jahresbasiert: 26.1, 26.3.1 (Java), 26.62 (Bedrock)
 *
 * Weil das Jahr vorne steht, genügt ein segmentweiser Zahlenvergleich:
 * 26.1 ist neuer als 1.21.11. Versionen werden immer nur innerhalb
 * derselben Edition verglichen (Java 26.3 und Bedrock 26.62 sind nicht
 * vergleichbar) – darum trägt jede Farm einen Bereich pro Edition.
 */

export type PreReleaseKind = 'snapshot' | 'pre' | 'rc';

export interface ParsedVersion {
  parts: number[];
  pre: { kind: PreReleaseKind; n: number } | null;
}

export interface VersionRange {
  from: string;
  to: string;
}

const VERSION_RE = /^(\d+(?:\.\d+){1,3})(?:-(snapshot|pre|rc)-?(\d+))?$/;
const PRE_ORDER: Record<PreReleaseKind, number> = { snapshot: 0, pre: 1, rc: 2 };

export function parseVersion(input: string): ParsedVersion | null {
  const m = VERSION_RE.exec(input.trim().toLowerCase().replace(/^v/, ''));
  if (!m) return null;
  const parts = m[1]!.split('.').map(Number);
  const pre = m[2] ? { kind: m[2] as PreReleaseKind, n: Number(m[3]) } : null;
  return { parts, pre };
}

export function isValidVersion(input: string): boolean {
  return parseVersion(input) !== null;
}

function mustParse(input: string): ParsedVersion {
  const v = parseVersion(input);
  if (!v) throw new Error(`Ungültige Versionsangabe: "${input}"`);
  return v;
}

/** < 0: a ist älter, 0: gleich, > 0: a ist neuer. */
export function compareVersions(a: string, b: string): number {
  const va = mustParse(a);
  const vb = mustParse(b);
  const len = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < len; i++) {
    const d = (va.parts[i] ?? 0) - (vb.parts[i] ?? 0);
    if (d !== 0) return d;
  }
  // Gleiche Nummer: Vorabversionen liegen vor der fertigen Version.
  if (va.pre && !vb.pre) return -1;
  if (!va.pre && vb.pre) return 1;
  if (va.pre && vb.pre) {
    const d = PRE_ORDER[va.pre.kind] - PRE_ORDER[vb.pre.kind];
    return d !== 0 ? d : va.pre.n - vb.pre.n;
  }
  return 0;
}

export function isInRange(version: string, range: VersionRange): boolean {
  return compareVersions(version, range.from) >= 0 && compareVersions(version, range.to) <= 0;
}

/** Sortiert aufsteigend (älteste zuerst), ohne das Original zu verändern. */
export function sortVersions(versions: readonly string[]): string[] {
  return [...versions].sort(compareVersions);
}

/** true für das jahresbasierte Schema (26.1 …), false für 1.x. */
export function isYearBased(version: string): boolean {
  return mustParse(version).parts[0]! >= 2;
}
