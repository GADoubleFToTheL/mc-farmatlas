/**
 * Schematic-Dateien lesen: .litematic, .schem, .nbt (Java) und .mcstructure (Bedrock).
 * Läuft unverändert im Browser und in Node (`npm run import`).
 *
 * Die Java-Formate liest die Bibliothek minecraft-block-reader (inklusive
 * Litematica-Regionen mit negativer Größe). Bedrock-Dateien lesen wir selbst,
 * weil ihre Blockzustände vollständig übersetzt werden müssen (siehe bedrock.ts).
 */
import { bedrockToJava, type BedrockValue } from '../bedrock';
import { formatBlockState, isAir, type BlockState } from '../blockstate';
import { bedrockVersionFromBlockVersion, javaVersionFromDataVersion } from '../dataversion';
import type { ContainerContent, Edition } from '../schema';
import { AIR, blockIndex, MAX_PALETTE, totalBlocks, trimStructure, type Size3, type Structure } from '../structure';

export type SchematicFormat = 'litematic' | 'schem' | 'nbt' | 'mcstructure';

export const SCHEMATIC_EXTENSIONS = ['.litematic', '.schem', '.nbt', '.mcstructure'] as const;

export const FORMAT_LABELS: Record<SchematicFormat, string> = {
  litematic: 'Litematica (.litematic)',
  schem: 'WorldEdit / Sponge (.schem)',
  nbt: 'Konstruktionsblock Java (.nbt)',
  mcstructure: 'Konstruktionsblock Bedrock (.mcstructure)',
};

export interface ImportedSchematic {
  format: SchematicFormat;
  edition: Edition;
  /** Auf den Inhalt zugeschnitten, Zustände in Java-Schreibweise. */
  structure: Structure;
  blockCount: number;
  name: string | null;
  author: string | null;
  description: string | null;
  /** Spielversion, mit der die Datei gespeichert wurde (falls erkennbar). */
  mcVersion: string | null;
  /** false: Version nur ungefähr bestimmbar (Snapshot oder neuer als die Tabelle). */
  mcVersionExact: boolean;
  /** Entitäten in der Datei, z. B. Loren oder Dorfbewohner. */
  entities: Array<{ id: string; count: number }>;
  warnings: string[];
}

export class SchematicError extends Error {}

/** Mehr Zellen verarbeiten wir nicht (≈ 512 × 256 × 512) – schützt vor Speichermangel am Handy. */
const MAX_VOLUME = 64 * 1024 * 1024;

type Nbt = Record<string, unknown>;

function isRecord(v: unknown): v is Nbt {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !ArrayBuffer.isView(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function int(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  return null;
}

function listOf(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>);
  return [];
}

export function formatFromFileName(fileName: string): SchematicFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.litematic')) return 'litematic';
  if (lower.endsWith('.schem')) return 'schem';
  if (lower.endsWith('.mcstructure')) return 'mcstructure';
  if (lower.endsWith('.nbt')) return 'nbt';
  return null;
}

function formatFromRoot(root: Nbt): SchematicFormat | null {
  if (isRecord(root.Regions)) return 'litematic';
  if (isRecord(root.Schematic) || 'BlockData' in root || (isRecord(root.Blocks) && 'Palette' in root)) return 'schem';
  if (isRecord(root.structure) && 'format_version' in root) return 'mcstructure';
  if ('blocks' in root && ('palette' in root || 'palettes' in root)) return 'nbt';
  return null;
}

/** Inhalt eines Behälters aus Block-NBT lesen (Java: id/count bzw. Count, Bedrock: Name/Count). */
function readItems(nbt: unknown): ContainerContent['items'] | null {
  if (!isRecord(nbt)) return null;
  const totals = new Map<string, number>();
  for (const entry of listOf(nbt.Items)) {
    if (!isRecord(entry)) continue;
    const id = str(entry.id) ?? str(entry.Name);
    const count = int(entry.count) ?? int(entry.Count) ?? 1;
    if (!id || count <= 0) continue;
    const full = id.includes(':') ? id : `minecraft:${id}`;
    totals.set(full, (totals.get(full) ?? 0) + count);
  }
  if (totals.size === 0) return null;
  return [...totals].map(([item, count]) => ({ item, count })).sort((a, b) => b.count - a.count);
}

function countEntities(ids: Array<string | null>): Array<{ id: string; count: number }> {
  const counts = new Map<string, number>();
  for (const id of ids) {
    if (!id) continue;
    const full = id.includes(':') ? id : `minecraft:${id}`;
    counts.set(full, (counts.get(full) ?? 0) + 1);
  }
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

function checkVolume(size: Size3): void {
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) throw new SchematicError('Die Datei enthält keine Blöcke.');
  if (size.x * size.y * size.z > MAX_VOLUME) {
    throw new SchematicError(
      `Der Bauplan ist mit ${size.x} × ${size.y} × ${size.z} Blöcken zu groß für die App. Teile ihn im Spiel in kleinere Abschnitte.`,
    );
  }
}

/** Sammelt Blockzustände zu einer Palette ohne Duplikate. */
class PaletteBuilder {
  readonly palette: BlockState[] = [AIR];
  readonly notes: Array<string | undefined> = [undefined];
  private readonly index = new Map<string, number>();

  add(state: BlockState, note?: string): number {
    if (isAir(state) || state.id === 'minecraft:structure_void') return 0;
    const key = formatBlockState(state);
    let i = this.index.get(key);
    if (i === undefined) {
      if (this.palette.length >= MAX_PALETTE) throw new SchematicError('Der Bauplan enthält zu viele verschiedene Blockzustände.');
      i = this.palette.length;
      this.index.set(key, i);
      this.palette.push(state);
      this.notes.push(note);
    }
    return i;
  }

  get hasNotes(): boolean {
    return this.notes.some((n) => n !== undefined);
  }
}

// ---------------------------------------------------------------------------
// Java: .litematic, .schem, .nbt
// ---------------------------------------------------------------------------

async function readJava(
  bytes: Uint8Array,
  format: Exclude<SchematicFormat, 'mcstructure'>,
  root: Nbt,
): Promise<ImportedSchematic> {
  const { read } = await import('minecraft-block-reader');
  let parsed: Awaited<ReturnType<typeof read>>;
  try {
    parsed = await read(bytes);
  } catch (e) {
    throw new SchematicError(`Die Datei ließ sich nicht lesen (${e instanceof Error ? e.message : String(e)}).`);
  }
  if (!('raw' in parsed) || !('size' in parsed)) {
    throw new SchematicError('Das ist eine Weltdatei, kein Bauplan. Exportiere den Ausschnitt als Schematic.');
  }
  const { raw } = parsed;
  const size: Size3 = { x: parsed.size[0], y: parsed.size[1], z: parsed.size[2] };
  checkVolume(size);

  const builder = new PaletteBuilder();
  const remap = parsed.palette.map((p) => builder.add({ id: p.id, props: { ...(p.properties ?? {}) } }));
  const blocks = new Uint16Array(size.x * size.y * size.z);
  let outside = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const x = raw[i + 1]!;
    const y = raw[i + 2]!;
    const z = raw[i + 3]!;
    if (x < 0 || y < 0 || z < 0 || x >= size.x || y >= size.y || z >= size.z) {
      outside++;
      continue;
    }
    blocks[blockIndex(size, x, y, z)] = remap[raw[i]!] ?? 0;
  }

  const containers: ContainerContent[] = [];
  for (const [blockNumber, nbt] of parsed.blockNbt) {
    const items = readItems(nbt);
    const at = blockNumber * 4;
    if (items && at + 3 < raw.length) containers.push({ x: raw[at + 1]!, y: raw[at + 2]!, z: raw[at + 3]!, items });
  }

  const warnings: string[] = [];
  if (outside > 0) warnings.push(`${outside} Blöcke lagen außerhalb der angegebenen Größe und wurden ausgelassen.`);

  // Metadaten je nach Format
  const meta = isRecord(root.Metadata) ? root.Metadata : isRecord(root.Schematic) && isRecord(root.Schematic.Metadata) ? root.Schematic.Metadata : {};
  const dataVersion =
    int(root.MinecraftDataVersion) ?? int(root.DataVersion) ?? (isRecord(root.Schematic) ? int(root.Schematic.DataVersion) : null);
  const guess = dataVersion === null ? null : javaVersionFromDataVersion(dataVersion);
  if (format === 'litematic' && isRecord(root.Regions) && Object.keys(root.Regions).length > 1) {
    warnings.push(`Die Datei besteht aus ${Object.keys(root.Regions).length} Regionen; sie wurden zu einem Bauplan zusammengefügt.`);
  }

  return finish({
    format,
    edition: 'java',
    structure: { size, syntax: 'java', palette: builder.palette, blocks, containers },
    name: str(meta.Name),
    author: str(meta.Author),
    description: str(meta.Description),
    mcVersion: guess?.version ?? null,
    mcVersionExact: guess?.exact ?? false,
    entities: countEntities(parsed.entities.map((e) => str(e.nbt.id))),
    warnings,
  });
}

// ---------------------------------------------------------------------------
// Bedrock: .mcstructure
// ---------------------------------------------------------------------------

function readBedrock(root: Nbt): ImportedSchematic {
  const sizeList = listOf(root.size).map(Number);
  const size: Size3 = { x: sizeList[0] ?? 0, y: sizeList[1] ?? 0, z: sizeList[2] ?? 0 };
  checkVolume(size);
  const structure = isRecord(root.structure) ? root.structure : {};
  const layers = listOf(structure.block_indices).map(listOf);
  const defaults = isRecord(structure.palette) && isRecord(structure.palette.default) ? structure.palette.default : {};
  const entries = listOf(defaults.block_palette);
  const positionData = isRecord(defaults.block_position_data) ? defaults.block_position_data : {};
  const layer0 = layers[0] ?? [];
  const layer1 = layers[1] ?? [];
  if (layer0.length < size.x * size.y * size.z) throw new SchematicError('Die Datei ist unvollständig (zu wenige Blockdaten).');

  const builder = new PaletteBuilder();
  const cache = new Map<string, number>();
  const unmappedBlocks = new Set<string>();
  let version: number | null = null;

  const name = (i: number): string => {
    const e = entries[i];
    return isRecord(e) ? (str(e.name) ?? '') : '';
  };
  const isWater = (i: number): boolean => /(^|:)(flowing_)?water$/.test(name(i));
  const WATER_SOURCE: BlockState = { id: 'minecraft:water', props: { level: '0' } };

  const resolve = (paletteIndex: number, waterlogged: boolean): number => {
    const key = `${paletteIndex}|${waterlogged ? 1 : 0}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const entry = entries[paletteIndex];
    let result = 0;
    if (isRecord(entry) && str(entry.name)) {
      version ??= int(entry.version);
      const states = isRecord(entry.states) ? (entry.states as Record<string, BedrockValue>) : {};
      const converted = bedrockToJava(str(entry.name)!, states);
      if (isAir(converted.state)) {
        result = waterlogged ? builder.add(WATER_SOURCE) : 0;
      } else {
        const fluid = /:(water|lava)$/.test(converted.state.id);
        if (waterlogged && !fluid) converted.state.props.waterlogged = 'true';
        let note: string | undefined;
        if (converted.unmapped.length > 0) {
          note = `Bedrock-Zustand nicht vollständig übersetzt: ${converted.unmapped.join(', ')}`;
          unmappedBlocks.add(str(entry.name)!.replace(/^minecraft:/, ''));
        }
        result = builder.add(converted.state, note);
      }
    }
    cache.set(key, result);
    return result;
  };

  const blocks = new Uint16Array(size.x * size.y * size.z);
  const containers: ContainerContent[] = [];
  // Bedrock-Reihenfolge: x außen, dann y, dann z
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      for (let z = 0; z < size.z; z++) {
        const i = (x * size.y + y) * size.z + z;
        const p0 = Number(layer0[i]);
        const p1 = layer1.length > i ? Number(layer1[i]) : -1;
        const waterlogged = p1 >= 0 && isWater(p1);
        let index = 0;
        if (p0 >= 0) index = resolve(p0, waterlogged);
        else if (waterlogged) index = builder.add(WATER_SOURCE);
        if (index === 0) continue;
        blocks[blockIndex(size, x, y, z)] = index;
        const data = positionData[String(i)];
        const items = isRecord(data) ? readItems(data.block_entity_data) : null;
        if (items) containers.push({ x, y, z, items });
      }
    }
  }

  const warnings: string[] = [];
  if (unmappedBlocks.size > 0) {
    const list = [...unmappedBlocks].sort();
    warnings.push(
      `Bei ${list.length} Blockart(en) ließ sich die Ausrichtung oder ein anderer Zustand nicht übersetzen: ${list.slice(0, 8).join(', ')}${list.length > 8 ? ' …' : ''}. Tippe im Bauplan auf den Block, um den Original-Zustand zu sehen.`,
    );
  }

  return finish({
    format: 'mcstructure',
    edition: 'bedrock',
    structure: {
      size,
      syntax: 'java',
      palette: builder.palette,
      blocks,
      paletteNotes: builder.hasNotes ? builder.notes : undefined,
      containers,
    },
    name: null,
    author: null,
    description: null,
    mcVersion: version === null ? null : bedrockVersionFromBlockVersion(version),
    mcVersionExact: true,
    entities: countEntities(listOf(structure.entities).map((e) => (isRecord(e) ? str(e.identifier) : null))),
    warnings,
  });
}

function finish(result: Omit<ImportedSchematic, 'blockCount'>): ImportedSchematic {
  const trimmed = trimStructure(result.structure);
  if (!trimmed) throw new SchematicError('Die Datei enthält keine Blöcke.');
  return { ...result, structure: trimmed, blockCount: totalBlocks(trimmed) };
}

/**
 * Liest eine Schematic-Datei. Das Format wird am Inhalt erkannt, der Dateiname
 * hilft nur bei der Unterscheidung von Java- und Bedrock-NBT.
 */
export async function importSchematic(bytes: Uint8Array, fileName: string): Promise<ImportedSchematic> {
  if (bytes.length === 0) throw new SchematicError('Die Datei ist leer.');
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new SchematicError('Das ist ein ZIP-Archiv (z. B. eine Welt). Entpacke es und wähle die Schematic-Datei darin.');
  }
  const { readNBT } = await import('minecraft-block-reader');
  const byName = formatFromFileName(fileName);

  let root: Nbt;
  try {
    const skip = new Set(['BlockStates', 'BlockData', 'block_indices', 'blocks', 'Blocks', 'Data']);
    // Bedrock schreibt Little-Endian; bei unbekannter Endung entscheidet die Bibliothek.
    root = (await readNBT(bytes, byName === 'mcstructure' ? { littleEndian: true } : byName ? { skip } : {})) as Nbt;
  } catch {
    throw new SchematicError('Die Datei ist kein lesbares NBT. Unterstützt werden .litematic, .schem, .nbt und .mcstructure.');
  }
  if (!isRecord(root)) throw new SchematicError('Die Datei hat einen unerwarteten Aufbau.');

  const format = (byName === 'mcstructure' ? 'mcstructure' : formatFromRoot(root)) ?? byName;
  if (!format) {
    throw new SchematicError('Unbekanntes Format. Unterstützt werden .litematic, .schem, .nbt und .mcstructure.');
  }
  if (format === 'mcstructure') {
    if (!isRecord(root.structure)) throw new SchematicError('Die Datei ist keine gültige .mcstructure-Datei.');
    return readBedrock(root);
  }
  return readJava(bytes, format, root);
}
