/**
 * Datenschema einer Farm (eine JSON-Datei pro Farm unter data/farms/).
 * Diese Datei ist die einzige Quelle der Wahrheit: App, `npm run validate`
 * und der Import nutzen dasselbe Schema.
 */
import { z } from 'zod';
import { BlockStateError, isAir, parseBlockState } from './blockstate';
import { compareVersions, isValidVersion } from './version';

export const SCHEMA_VERSION = 1;

export const EDITIONS = ['java', 'bedrock'] as const;
export type Edition = (typeof EDITIONS)[number];

export const CATEGORIES = [
  'pflanzen',
  'nahrung',
  'mobs-xp',
  'rohstoffe',
  'villager-handel',
  'lager-sortierung',
  'sonstiges',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ['ungeprueft', 'kreativ-getestet', 'survival-gebaut'] as const;
export type Status = (typeof STATUSES)[number];

export const DIMENSIONS = ['overworld', 'nether', 'end'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const SCHEMATIC_ACCESS = ['frei', 'login', 'discord', 'bezahlt', 'unklar'] as const;

/** Zeichen für Luft im Zeichenraster. */
export const AIR_CHAR = '.';

const text = z.string().trim().min(1);
const nullableText = text.nullable();
const itemId = z.string().regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/, 'Erwartet "namensraum:id"');
const version = z.string().refine(isValidVersion, 'Ungültige Versionsangabe');

const versionRange = z
  .strictObject({ from: version, to: version })
  .refine((r) => !isValidVersion(r.from) || !isValidVersion(r.to) || compareVersions(r.from, r.to) <= 0, {
    message: '"from" muss älter oder gleich "to" sein',
  });

const editions = z
  .strictObject({ java: versionRange.optional(), bedrock: versionRange.optional() })
  .refine((e) => e.java !== undefined || e.bedrock !== undefined, {
    message: 'Mindestens eine Edition angeben',
  });

const rate = z.strictObject({
  entries: z.array(z.strictObject({ item: itemId, perHour: z.number().positive() })).min(1),
  /** Index in `sources` – jede Rate braucht eine Quelle („laut Quelle“). */
  source: z.number().int().min(0),
  note: nullableText.optional(),
});

const requirements = z.strictObject({
  dimension: z.array(z.enum(DIMENSIONS)).min(1),
  biome: nullableText,
  yLevel: nullableText,
  specialLocation: nullableText,
  afk: z.strictObject({ required: z.boolean(), distance: nullableText, note: nullableText }),
  mobs: z.array(text),
  simulationDistance: nullableText,
  chunkAligned: z.boolean(),
  chunkNote: nullableText.optional(),
});

const step = z.strictObject({
  text,
  /** Ebenen, auf die sich der Schritt bezieht (1 = unterste). */
  layers: z.array(z.number().int().min(1)).optional(),
});

const gridBlueprint = z.strictObject({
  format: z.literal('grid'),
  stateSyntax: z.enum(['java', 'bedrock']),
  /** Startblock, nullbasiert: x = Spalte (West→Ost), y = Ebene, z = Zeile (Nord→Süd). */
  start: z.strictObject({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    z: z.number().int().min(0),
  }),
  /** Kürzel (genau ein Zeichen) → Blockzustand. */
  palette: z.record(z.string(), z.string()),
  /** layers[y][z] ist eine Zeile; jedes Zeichen ist ein Block. Ebene 1 = layers[0]. */
  layers: z.array(z.array(z.string()).min(1)).min(1),
});

const blueprint = gridBlueprint.superRefine((bp, ctx) => {
  const air = new Set<string>([AIR_CHAR]);
  for (const [key, value] of Object.entries(bp.palette)) {
    if ([...key].length !== 1 || key === AIR_CHAR || /\s/.test(key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['palette', key],
        message: `Kürzel muss genau ein Zeichen sein (nicht "${AIR_CHAR}" oder Leerzeichen)`,
      });
    }
    try {
      if (isAir(parseBlockState(value, bp.stateSyntax))) air.add(key);
    } catch (e) {
      ctx.addIssue({
        code: 'custom',
        path: ['palette', key],
        message: e instanceof BlockStateError ? e.message : String(e),
      });
    }
  }

  const depth = bp.layers[0]!.length;
  const width = [...bp.layers[0]![0]!].length;
  const used = new Set<string>();
  bp.layers.forEach((layer, y) => {
    if (layer.length !== depth) {
      ctx.addIssue({
        code: 'custom',
        path: ['layers', y],
        message: `Ebene ${y + 1} hat ${layer.length} Zeilen, erwartet ${depth}`,
      });
    }
    layer.forEach((row, z) => {
      const cells = [...row];
      if (cells.length !== width) {
        ctx.addIssue({
          code: 'custom',
          path: ['layers', y, z],
          message: `Ebene ${y + 1}, Zeile ${z + 1} hat ${cells.length} Zeichen, erwartet ${width}`,
        });
      }
      for (const ch of cells) {
        used.add(ch);
        if (ch !== AIR_CHAR && !(ch in bp.palette)) {
          ctx.addIssue({
            code: 'custom',
            path: ['layers', y, z],
            message: `Unbekanntes Kürzel "${ch}" in Ebene ${y + 1}, Zeile ${z + 1}`,
          });
        }
      }
    });
  });

  for (const key of Object.keys(bp.palette)) {
    if (!used.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['palette', key], message: `Kürzel "${key}" wird nicht verwendet` });
    }
  }

  const { x, y, z } = bp.start;
  const startChar = [...(bp.layers[y]?.[z] ?? '')][x];
  if (startChar === undefined) {
    ctx.addIssue({ code: 'custom', path: ['start'], message: 'Startblock liegt außerhalb des Bauplans' });
  } else if (air.has(startChar)) {
    ctx.addIssue({ code: 'custom', path: ['start'], message: 'Startblock darf nicht Luft sein' });
  }
});

const source = z.strictObject({
  title: text,
  author: text,
  url: z.url({ protocol: /^https$/ }),
  license: nullableText.optional(),
});

const schematicLink = z.strictObject({
  url: z.url({ protocol: /^https$/ }),
  format: z.enum(['litematic', 'schem', 'nbt', 'mcstructure', 'welt', 'sonstiges']),
  access: z.enum(SCHEMATIC_ACCESS),
  note: nullableText.optional(),
});

export const farmSchema = z
  .strictObject({
    schema: z.literal(SCHEMA_VERSION),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Nur Kleinbuchstaben, Ziffern und Bindestriche'),
    name: text,
    category: z.enum(CATEGORIES),
    /** Item-IDs; für Erfahrung "farmatlas:xp". Leer bei Lager/Sortierung erlaubt. */
    outputs: z.array(itemId),
    /** Zusätzliche Suchbegriffe. */
    tags: z.array(text).optional(),
    editions,
    difficulty: z.number().int().min(1).max(5),
    /** Nur für Farmen ohne Bauplan: Maße laut Quelle (B × H × T). Sonst berechnet. */
    size: z
      .strictObject({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        depth: z.number().int().positive(),
      })
      .nullable()
      .optional(),
    rate: rate.nullable(),
    status: z.enum(STATUSES),
    requirements,
    principle: text,
    steps: z.array(step),
    pitfalls: z.array(text),
    editionNotes: z.strictObject({ java: nullableText.optional(), bedrock: nullableText.optional() }).optional(),
    blueprint: blueprint.nullable(),
    /** Was nicht im Bauplan steht: Wassereimer, Lava, Mobs, Werkzeug. `item` ist eine ID oder freier Text. */
    extras: z.array(
      z.strictObject({ item: text, count: z.number().int().positive(), note: nullableText.optional() }),
    ),
    sources: z.array(source).min(1),
    /** Bekannte Schematic-Downloads (für „bitte selbst herunterladen“). */
    schematics: z.array(schematicLink).optional(),
  })
  .superRefine((farm, ctx) => {
    if (farm.rate && farm.rate.source >= farm.sources.length) {
      ctx.addIssue({ code: 'custom', path: ['rate', 'source'], message: 'Verweist auf keine vorhandene Quelle' });
    }
    const height = farm.blueprint?.layers.length ?? 0;
    farm.steps.forEach((s, i) => {
      for (const layer of s.layers ?? []) {
        if (!farm.blueprint) {
          ctx.addIssue({
            code: 'custom',
            path: ['steps', i, 'layers'],
            message: 'Schritt verweist auf Ebenen, aber es gibt keinen Bauplan',
          });
          break;
        }
        if (layer > height) {
          ctx.addIssue({
            code: 'custom',
            path: ['steps', i, 'layers'],
            message: `Ebene ${layer} existiert nicht (Bauplan hat ${height} Ebenen)`,
          });
        }
      }
    });
    if (farm.blueprint && farm.size) {
      ctx.addIssue({
        code: 'custom',
        path: ['size'],
        message: 'Bei vorhandenem Bauplan werden die Maße berechnet – "size" weglassen',
      });
    }
  });

export type Farm = z.infer<typeof farmSchema>;
export type Blueprint = NonNullable<Farm['blueprint']>;
export type FarmSource = Farm['sources'][number];

export interface ValidationProblem {
  path: string;
  message: string;
}

export type ValidationResult = { ok: true; farm: Farm } | { ok: false; problems: ValidationProblem[] };

export function validateFarm(data: unknown): ValidationResult {
  const result = farmSchema.safeParse(data);
  if (result.success) return { ok: true, farm: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(Wurzel)',
      message: issue.message,
    })),
  };
}
