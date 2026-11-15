/**
 * Minimaler TGA-Leser (unkomprimiert und RLE, 24/32 Bit sowie Graustufen).
 * Mojangs Bedrock-Paket liefert viele Blocktexturen nur als .tga, die kein
 * Browser von sich aus darstellen kann.
 */
export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, zeilenweise von oben nach unten. */
  data: Uint8ClampedArray;
}

export function decodeTga(bytes: Uint8Array): RgbaImage {
  if (bytes.length < 18) throw new Error('TGA-Datei ist zu kurz');
  const idLength = bytes[0]!;
  const colorMapType = bytes[1]!;
  const imageType = bytes[2]!;
  const width = bytes[12]! | (bytes[13]! << 8);
  const height = bytes[14]! | (bytes[15]! << 8);
  const depth = bytes[16]!;
  const descriptor = bytes[17]!;
  const rle = imageType === 10 || imageType === 11;
  const grey = imageType === 3 || imageType === 11;
  if (colorMapType !== 0 || ![2, 3, 10, 11].includes(imageType)) {
    throw new Error(`TGA-Typ ${imageType} wird nicht unterstützt`);
  }
  const bytesPerPixel = depth / 8;
  if (![1, 3, 4].includes(bytesPerPixel) || width === 0 || height === 0) throw new Error('Unerwartetes TGA-Format');

  const data = new Uint8ClampedArray(width * height * 4);
  const topDown = (descriptor & 0x20) !== 0;
  let offset = 18 + idLength;
  let pixel = 0;
  const total = width * height;

  const put = (at: number): void => {
    // Pixel liegen als B, G, R(, A) vor; Zeilen meist von unten nach oben.
    const row = Math.floor(pixel / width);
    const col = pixel % width;
    const y = topDown ? row : height - 1 - row;
    const out = (y * width + col) * 4;
    if (grey) {
      data[out] = data[out + 1] = data[out + 2] = bytes[at]!;
      data[out + 3] = 255;
    } else {
      data[out] = bytes[at + 2]!;
      data[out + 1] = bytes[at + 1]!;
      data[out + 2] = bytes[at]!;
      data[out + 3] = bytesPerPixel === 4 ? bytes[at + 3]! : 255;
    }
    pixel++;
  };

  if (!rle) {
    if (offset + total * bytesPerPixel > bytes.length) throw new Error('TGA-Datei ist unvollständig');
    for (let i = 0; i < total; i++) put(offset + i * bytesPerPixel);
  } else {
    while (pixel < total) {
      if (offset >= bytes.length) throw new Error('TGA-Datei ist unvollständig');
      const header = bytes[offset++]!;
      const count = (header & 0x7f) + 1;
      if (header & 0x80) {
        for (let i = 0; i < count && pixel < total; i++) put(offset);
        offset += bytesPerPixel;
      } else {
        for (let i = 0; i < count && pixel < total; i++) put(offset + i * bytesPerPixel);
        offset += count * bytesPerPixel;
      }
    }
  }
  return { width, height, data };
}
