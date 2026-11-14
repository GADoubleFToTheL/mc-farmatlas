/**
 * Export als .litematic (Litematica, nur Java): Der Bauplan lässt sich damit im
 * Spiel als Hologramm einblenden.
 *
 * Aufbau wie von Litematica geschrieben: eine Region, Palette mit Luft an
 * Stelle 0, Blockindizes dicht gepackt (Einträge dürfen über 64-Bit-Grenzen laufen).
 */
import { gzip, nbt, writeNbt, type NbtTag } from '../nbt';
import { totalBlocks, type Structure } from '../structure';

/** Litematica-Formatversion 6 lesen alle Mod-Versionen seit 1.18. */
const LITEMATIC_VERSION = 6;
/** Datenversion von Java 1.21 – neuere Spielversionen rechnen selbst hoch. */
const DATA_VERSION = 3953;

export interface LitematicMeta {
  name: string;
  author?: string;
  description?: string;
  now?: number;
}

/** Packt Palettenindizes dicht in 64-Bit-Zahlen. */
export function packBlockStates(blocks: ArrayLike<number>, paletteSize: number): BigInt64Array {
  const bits = Math.max(2, 32 - Math.clz32(Math.max(1, paletteSize - 1)));
  const longs = new BigUint64Array(Math.ceil((blocks.length * bits) / 64));
  const width = BigInt(bits);
  for (let i = 0; i < blocks.length; i++) {
    const value = BigInt(blocks[i]!);
    if (value === 0n) continue;
    const bit = BigInt(i) * width;
    const index = Number(bit >> 6n);
    const shift = bit & 63n;
    longs[index] = longs[index]! | ((value << shift) & 0xffffffffffffffffn);
    if (shift + width > 64n) longs[index + 1] = longs[index + 1]! | (value >> (64n - shift));
  }
  return new BigInt64Array(longs.buffer);
}

const xyz = (x: number, y: number, z: number): NbtTag => nbt.compound({ x: nbt.int(x), y: nbt.int(y), z: nbt.int(z) });

export function litematicNbt(structure: Structure, meta: LitematicMeta): NbtTag {
  if (structure.syntax !== 'java') throw new Error('Der Litematic-Export braucht Blockzustände in Java-Schreibweise');
  const { size, palette, blocks } = structure;
  const now = BigInt(meta.now ?? Date.now());
  const name = meta.name.trim() || 'Farmatlas';

  const paletteTags = palette.map((state) => {
    const entry: Record<string, NbtTag> = { Name: nbt.string(state.id) };
    const keys = Object.keys(state.props).sort();
    if (keys.length > 0) {
      entry.Properties = nbt.compound(Object.fromEntries(keys.map((k) => [k, nbt.string(state.props[k]!)])));
    }
    return nbt.compound(entry);
  });

  return nbt.compound({
    MinecraftDataVersion: nbt.int(DATA_VERSION),
    Version: nbt.int(LITEMATIC_VERSION),
    SubVersion: nbt.int(1),
    Metadata: nbt.compound({
      Name: nbt.string(name),
      Author: nbt.string(meta.author?.trim() || 'Farmatlas'),
      Description: nbt.string(meta.description ?? ''),
      EnclosingSize: xyz(size.x, size.y, size.z),
      RegionCount: nbt.int(1),
      TimeCreated: nbt.long(now),
      TimeModified: nbt.long(now),
      TotalBlocks: nbt.int(totalBlocks(structure)),
      TotalVolume: nbt.int(size.x * size.y * size.z),
    }),
    Regions: nbt.compound({
      [name]: nbt.compound({
        Position: xyz(0, 0, 0),
        Size: xyz(size.x, size.y, size.z),
        BlockStatePalette: nbt.list('compound', paletteTags),
        // Litematica zählt wie wir: y außen, dann z, dann x.
        BlockStates: nbt.longArray(packBlockStates(blocks, palette.length)),
        Entities: nbt.list('compound', []),
        TileEntities: nbt.list('compound', []),
        PendingBlockTicks: nbt.list('compound', []),
        PendingFluidTicks: nbt.list('compound', []),
      }),
    }),
  });
}

/** Fertige .litematic-Datei (gzip-komprimiertes NBT). */
export async function exportLitematic(structure: Structure, meta: LitematicMeta): Promise<Uint8Array> {
  return gzip(writeNbt(litematicNbt(structure, meta)));
}
