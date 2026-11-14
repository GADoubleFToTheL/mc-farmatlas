/**
 * Kleiner NBT-Schreiber für den Export (Java: Big-Endian, Bedrock: Little-Endian).
 * Gelesen wird NBT weiterhin mit minecraft-block-reader.
 */
export type NbtTag =
  | { type: 'byte'; value: number }
  | { type: 'short'; value: number }
  | { type: 'int'; value: number }
  | { type: 'long'; value: bigint }
  | { type: 'string'; value: string }
  | { type: 'list'; of: NbtTag['type']; value: NbtTag[] }
  | { type: 'compound'; value: Record<string, NbtTag> }
  | { type: 'intArray'; value: ArrayLike<number> }
  | { type: 'longArray'; value: ArrayLike<bigint> };

const TAG_ID: Record<NbtTag['type'], number> = {
  byte: 1,
  short: 2,
  int: 3,
  long: 4,
  string: 8,
  list: 9,
  compound: 10,
  intArray: 11,
  longArray: 12,
};

export const nbt = {
  byte: (value: number | boolean): NbtTag => ({ type: 'byte', value: Number(value) }),
  short: (value: number): NbtTag => ({ type: 'short', value }),
  int: (value: number): NbtTag => ({ type: 'int', value }),
  long: (value: bigint | number): NbtTag => ({ type: 'long', value: BigInt(value) }),
  string: (value: string): NbtTag => ({ type: 'string', value }),
  list: (of: NbtTag['type'], value: NbtTag[]): NbtTag => ({ type: 'list', of, value }),
  compound: (value: Record<string, NbtTag>): NbtTag => ({ type: 'compound', value }),
  intArray: (value: ArrayLike<number>): NbtTag => ({ type: 'intArray', value }),
  longArray: (value: ArrayLike<bigint>): NbtTag => ({ type: 'longArray', value }),
};

class Writer {
  private buffer = new Uint8Array(1 << 14);
  private view = new DataView(this.buffer.buffer);
  private offset = 0;
  private readonly encoder = new TextEncoder();

  constructor(private readonly little: boolean) {}

  private reserve(bytes: number): void {
    if (this.offset + bytes <= this.buffer.length) return;
    let size = this.buffer.length;
    while (size < this.offset + bytes) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buffer.subarray(0, this.offset));
    this.buffer = next;
    this.view = new DataView(next.buffer);
  }

  u8(v: number): void {
    this.reserve(1);
    this.view.setUint8(this.offset++, v & 0xff);
  }
  i16(v: number): void {
    this.reserve(2);
    this.view.setInt16(this.offset, v, this.little);
    this.offset += 2;
  }
  i32(v: number): void {
    this.reserve(4);
    this.view.setInt32(this.offset, v, this.little);
    this.offset += 4;
  }
  i64(v: bigint): void {
    this.reserve(8);
    this.view.setBigInt64(this.offset, BigInt.asIntN(64, v), this.little);
    this.offset += 8;
  }
  text(v: string): void {
    const bytes = this.encoder.encode(v);
    if (bytes.length > 0xffff) throw new Error('Text zu lang für NBT');
    this.reserve(2 + bytes.length);
    this.view.setUint16(this.offset, bytes.length, this.little);
    this.offset += 2;
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  payload(tag: NbtTag): void {
    switch (tag.type) {
      case 'byte':
        return this.u8(tag.value);
      case 'short':
        return this.i16(tag.value);
      case 'int':
        return this.i32(tag.value);
      case 'long':
        return this.i64(tag.value);
      case 'string':
        return this.text(tag.value);
      case 'list':
        // Leere Listen tragen den Typ „Ende“ (0), wie das Spiel sie schreibt.
        this.u8(tag.value.length === 0 ? 0 : TAG_ID[tag.of]);
        this.i32(tag.value.length);
        for (const entry of tag.value) {
          if (entry.type !== tag.of) throw new Error(`Liste erwartet ${tag.of}, enthält ${entry.type}`);
          this.payload(entry);
        }
        return;
      case 'compound':
        for (const [key, child] of Object.entries(tag.value)) {
          this.u8(TAG_ID[child.type]);
          this.text(key);
          this.payload(child);
        }
        this.u8(0);
        return;
      case 'intArray':
        this.i32(tag.value.length);
        for (let i = 0; i < tag.value.length; i++) this.i32(tag.value[i]!);
        return;
      case 'longArray':
        this.i32(tag.value.length);
        for (let i = 0; i < tag.value.length; i++) this.i64(tag.value[i]!);
        return;
    }
  }

  finish(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }
}

/** Schreibt einen Wurzel-Compound (mit leerem Namen) als unkomprimiertes NBT. */
export function writeNbt(root: NbtTag, options: { littleEndian?: boolean } = {}): Uint8Array {
  if (root.type !== 'compound') throw new Error('Die NBT-Wurzel muss ein Compound sein');
  const w = new Writer(options.littleEndian ?? false);
  w.u8(TAG_ID.compound);
  w.text('');
  w.payload(root);
  return w.finish();
}

/** Gzip – im Browser und in Node (ab 18) über CompressionStream. */
export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
