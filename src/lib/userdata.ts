/**
 * Persönliche Daten (nur lokal): Typen, Standardwerte und das Backup-Format.
 * Reine Logik – der eigentliche Speicher liegt in src/db/.
 */
import { z } from 'zod';
import { EDITIONS, type Edition } from './schema';
import { isValidVersion } from './version';

export const BACKUP_FORMAT = 1;

const version = z.string().refine(isValidVersion, 'Ungültige Versionsangabe');

export const settingsSchema = z.object({
  edition: z.enum(EDITIONS),
  versions: z.object({ java: version, bedrock: version }),
  theme: z.enum(['dark', 'light']),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  edition: 'bedrock',
  versions: { bedrock: '26.62', java: '26.3' },
  theme: 'dark',
};

export const farmStateSchema = z.object({
  farmId: z.string().min(1),
  favorite: z.boolean(),
  /** Abgehakte Ebenen (1 = unterste). */
  doneLayers: z.array(z.number().int().min(1)),
  /** Abgehakte Materialien, z. B. "gesamt|minecraft:stone" oder "3|minecraft:stone". */
  checkedMaterials: z.array(z.string()),
  notes: z.string(),
  /** Wo die Farm in der eigenen Welt steht. */
  location: z
    .object({ x: z.number().int(), y: z.number().int(), z: z.number().int(), dimension: z.string() })
    .nullable(),
  /** Gewählte Ausrichtung des Bauplans: erst spiegeln (West ↔ Ost), dann drehen. */
  orientation: z
    .object({ rot: z.number().int().min(0).max(3), mirror: z.boolean() })
    .default({ rot: 0, mirror: false }),
  updatedAt: z.number(),
});
export type FarmState = z.infer<typeof farmStateSchema>;

export function emptyFarmState(farmId: string): FarmState {
  return {
    farmId,
    favorite: false,
    doneLayers: [],
    checkedMaterials: [],
    notes: '',
    location: null,
    orientation: { rot: 0, mirror: false },
    updatedAt: 0,
  };
}

export function isEmptyFarmState(s: FarmState): boolean {
  return (
    !s.favorite &&
    s.doneLayers.length === 0 &&
    s.checkedMaterials.length === 0 &&
    s.notes === '' &&
    s.location === null &&
    s.orientation.rot === 0 &&
    !s.orientation.mirror
  );
}

export const backupSchema = z.object({
  app: z.literal('farmatlas'),
  format: z.literal(BACKUP_FORMAT),
  exportedAt: z.string(),
  settings: settingsSchema,
  farmStates: z.array(farmStateSchema),
  /** Lokal importierte Farmen (ab Phase 2); wird unverändert durchgereicht. */
  userFarms: z.array(z.unknown()).default([]),
});
export type Backup = z.infer<typeof backupSchema>;

export function createBackup(settings: Settings, farmStates: FarmState[], userFarms: unknown[], now = new Date()): Backup {
  return {
    app: 'farmatlas',
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    settings,
    farmStates: farmStates.filter((s) => !isEmptyFarmState(s)),
    userFarms,
  };
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  const result = backupSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: `Das ist kein Farmatlas-Backup (${first ? `${first.path.join('.')}: ${first.message}` : 'unbekanntes Format'}).`,
    };
  }
  return { ok: true, backup: result.data };
}

/**
 * Führt ein Backup mit den vorhandenen Daten zusammen: Pro Farm gewinnt der
 * neuere Stand. So gehen beim Übertragen zwischen Handy und PC keine Daten verloren.
 */
export function mergeFarmStates(current: readonly FarmState[], incoming: readonly FarmState[]): FarmState[] {
  const merged = new Map(current.map((s) => [s.farmId, s]));
  for (const s of incoming) {
    const existing = merged.get(s.farmId);
    if (!existing || s.updatedAt >= existing.updatedAt) merged.set(s.farmId, s);
  }
  return [...merged.values()];
}

export function editionLabel(edition: Edition): string {
  return edition === 'java' ? 'Java' : 'Bedrock';
}
