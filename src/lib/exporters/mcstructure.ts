/**
 * Export als .mcstructure (Bedrock): lässt sich mit einem Konstruktionsblock laden
 * (der Import-Knopf dafür existiert nur unter Windows).
 *
 * Experimentell: Die Zuordnung der Blockzustände ist gegen Wiki und GeyserMC
 * geprüft, das Laden im Spiel aber noch nicht.
 */
import { javaToBedrock, type BedrockStateValue } from '../bedrock';
import { formatBlockState } from '../blockstate';
import { nbt, writeNbt, type NbtTag } from '../nbt';
import type { Structure } from '../structure';
import { parseVersion } from '../version';

export interface McstructureExport {
  bytes: Uint8Array;
  /** Hinweise, z. B. Blöcke, deren Ausrichtung nicht übertragen werden konnte. */
  warnings: string[];
}

/** Bedrock-Blockversion aus der Spielversion: 26.62 → intern 1.26.62 → 0x011A3E00. */
export function bedrockBlockVersion(gameVersion: string): number {
  const parsed = parseVersion(gameVersion);
  const parts = parsed?.parts ?? [26, 60];
  const [major, minor, patch] = parts[0]! >= 2 ? [1, parts[0]!, parts[1] ?? 0] : [parts[0]!, parts[1] ?? 0, parts[2] ?? 0];
  return ((major & 0xff) << 24) | ((minor & 0xff) << 16) | ((patch & 0xff) << 8);
}

function stateTag(value: BedrockStateValue): NbtTag {
  return value.type === 'string' ? nbt.string(value.value) : value.type === 'int' ? nbt.int(value.value) : nbt.byte(value.value);
}

export function exportMcstructure(structure: Structure, options: { bedrockVersion: string }): McstructureExport {
  if (structure.syntax !== 'java') throw new Error('Der Export erwartet Blockzustände in Java-Schreibweise');
  const { size, palette, blocks } = structure;
  const version = bedrockBlockVersion(options.bedrockVersion);
  const droppedBlocks = new Map<string, string[]>();

  const entries: NbtTag[] = [];
  const entryIndex = new Map<string, number>();
  const addEntry = (name: string, states: Record<string, BedrockStateValue>): number => {
    const key = `${name}|${JSON.stringify(states)}`;
    let index = entryIndex.get(key);
    if (index === undefined) {
      index = entries.length;
      entryIndex.set(key, index);
      entries.push(
        nbt.compound({
          name: nbt.string(name),
          states: nbt.compound(Object.fromEntries(Object.entries(states).map(([k, v]) => [k, stateTag(v)]))),
          version: nbt.int(version),
        }),
      );
    }
    return index;
  };

  const airIndex = addEntry('minecraft:air', {});
  let waterIndex = -1;
  const primary = new Int32Array(palette.length);
  const logged = new Uint8Array(palette.length);
  palette.forEach((state, i) => {
    if (i === 0) {
      primary[i] = airIndex;
      return;
    }
    const converted = javaToBedrock(state);
    primary[i] = addEntry(converted.name, converted.states);
    if (converted.waterlogged) {
      logged[i] = 1;
      if (waterIndex < 0) waterIndex = addEntry('minecraft:water', { liquid_depth: { type: 'int', value: 0 } });
    }
    if (converted.dropped.length > 0) droppedBlocks.set(formatBlockState(state), converted.dropped);
  });

  // Bedrock-Reihenfolge: x außen, dann y, dann z
  const volume = size.x * size.y * size.z;
  const layer0: NbtTag[] = new Array(volume);
  const layer1: NbtTag[] = new Array(volume);
  const none = nbt.int(-1);
  const tags = new Map<number, NbtTag>();
  const intTag = (n: number): NbtTag => {
    let t = tags.get(n);
    if (!t) tags.set(n, (t = nbt.int(n)));
    return t;
  };
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      for (let z = 0; z < size.z; z++) {
        const paletteIndex = blocks[(y * size.z + z) * size.x + x]!;
        const i = (x * size.y + y) * size.z + z;
        layer0[i] = intTag(primary[paletteIndex]!);
        layer1[i] = logged[paletteIndex] ? intTag(waterIndex) : none;
      }
    }
  }

  const root = nbt.compound({
    format_version: nbt.int(1),
    size: nbt.list('int', [nbt.int(size.x), nbt.int(size.y), nbt.int(size.z)]),
    structure: nbt.compound({
      block_indices: nbt.list('list', [nbt.list('int', layer0), nbt.list('int', layer1)]),
      entities: nbt.list('compound', []),
      palette: nbt.compound({
        default: nbt.compound({
          block_palette: nbt.list('compound', entries),
          block_position_data: nbt.compound({}),
        }),
      }),
    }),
    structure_world_origin: nbt.list('int', [nbt.int(0), nbt.int(0), nbt.int(0)]),
  });

  const warnings: string[] = [];
  if (droppedBlocks.size > 0) {
    const list = [...droppedBlocks].slice(0, 6).map(([block, props]) => `${block.replace('minecraft:', '')} (${props.join(', ')})`);
    warnings.push(
      `Bei ${droppedBlocks.size} Blockzustand/-zuständen wurden Eigenschaften nicht übertragen: ${list.join('; ')}${droppedBlocks.size > 6 ? ' …' : ''}. Diese Blöcke erscheinen im Standardzustand.`,
    );
  }
  if (structure.containers && structure.containers.length > 0) {
    warnings.push('Der Inhalt von Behältern wird nicht exportiert – Trichter und Truhen sind in der Datei leer.');
  }
  return { bytes: writeNbt(root, { littleEndian: true }), warnings };
}
