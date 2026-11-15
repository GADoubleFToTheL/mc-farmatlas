/**
 * Zuordnung „Block → Texturdateien“ aus Mojangs offiziellem Bedrock-Beispielpaket.
 *
 * Die Dateien selbst (Texturen, blocks.json, terrain_texture.json) liegen NICHT im
 * Repo – sie gehören Mojang. Die App lädt sie auf Wunsch des Nutzers direkt von
 * Mojangs GitHub-Repository auf das Gerät und speichert sie dort.
 */

/** Fester Stand des Pakets, damit sich die App nicht unbemerkt verändert. */
export const PACK_VERSION = 'v1.26.60.5';
export const PACK_BASE = `https://raw.githubusercontent.com/Mojang/bedrock-samples/${PACK_VERSION}/resource_pack/`;
export const PACK_FILES = { blocks: 'blocks.json', terrain: 'textures/terrain_texture.json' } as const;

export type Face = 'up' | 'down' | 'north' | 'south' | 'east' | 'west';
export const FACES: readonly Face[] = ['up', 'down', 'north', 'south', 'east', 'west'];

/** Mojangs JSON enthält Kommentare und teils ein BOM. Texte in Anführungszeichen bleiben unberührt. */
export function parseLooseJson(text: string): unknown {
  let out = '';
  let inString = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      out += ch;
      if (ch === '\\') out += text[++i] ?? '';
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += ch;
    }
  }
  return JSON.parse(out);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Blöcke, deren Eintrag in blocks.json anders heißt als der Block selbst. */
const BLOCK_KEY_ALIASES: Record<string, string> = {
  grass_block: 'grass',
  sea_lantern: 'seaLantern',
  spawner: 'mob_spawner',
  trip_wire: 'tripWire',
  tripwire: 'tripWire',
};

export class PackIndex {
  private readonly blocks: Record<string, unknown>;
  private readonly textures: Record<string, unknown>;
  private readonly lowerKeys = new Map<string, string>();

  constructor(blocksJson: unknown, terrainJson: unknown) {
    this.blocks = isRecord(blocksJson) ? blocksJson : {};
    const data = isRecord(terrainJson) && isRecord(terrainJson.texture_data) ? terrainJson.texture_data : {};
    this.textures = data;
    for (const key of Object.keys(this.blocks)) this.lowerKeys.set(key.toLowerCase().replace(/_/g, ''), key);
  }

  /** Texturschlüssel je Seite für einen Bedrock-Blocknamen (ohne "minecraft:"). */
  blockFaces(name: string): Record<Face, string> | null {
    const short = name.replace(/^minecraft:/, '');
    const key =
      (short in this.blocks ? short : undefined) ??
      (BLOCK_KEY_ALIASES[short] && BLOCK_KEY_ALIASES[short]! in this.blocks ? BLOCK_KEY_ALIASES[short] : undefined) ??
      this.lowerKeys.get(short.toLowerCase().replace(/_/g, ''));
    const entry = key ? this.blocks[key] : undefined;
    const t = isRecord(entry) ? entry.textures : undefined;
    if (typeof t === 'string') {
      return { up: t, down: t, north: t, south: t, east: t, west: t };
    }
    if (!isRecord(t)) return null;
    const side = typeof t.side === 'string' ? t.side : undefined;
    const pick = (face: Face): string | undefined => (typeof t[face] === 'string' ? (t[face] as string) : undefined);
    const up = pick('up') ?? side;
    const down = pick('down') ?? side ?? up;
    const north = pick('north') ?? side ?? up;
    if (!up || !down || !north) return null;
    return {
      up,
      down,
      north,
      south: pick('south') ?? side ?? north,
      east: pick('east') ?? side ?? north,
      west: pick('west') ?? side ?? north,
    };
  }

  /** Pfad einer Textur ohne Endung, z. B. "textures/blocks/stone". */
  texturePath(key: string, variant = 0): string | null {
    const entry = this.textures[key];
    const t = isRecord(entry) ? entry.textures : undefined;
    const item = Array.isArray(t) ? (t[Math.min(variant, t.length - 1)] ?? t[0]) : t;
    if (typeof item === 'string') return item;
    if (isRecord(item) && typeof item.path === 'string') return item.path;
    return null;
  }
}

/** Pfad einer Blocktextur aus ihrem Dateinamen. */
export function blockTexture(fileName: string): string {
  return `textures/blocks/${fileName}`;
}
