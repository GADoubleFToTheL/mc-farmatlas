/**
 * npm run import -- <datei> --quelle <https-Link> --autor <Name> [Optionen]
 *
 * Liest eine Schematic (.litematic, .schem, .nbt, .mcstructure) mit demselben
 * Parser wie die App und schreibt daraus eine Farm-Datei nach data/farms/.
 *
 * Achtung: Farm-Dateien im Repo sind öffentlich. Fremde Schematics dürfen nur
 * hinein, wenn der Ersteller die Weitergabe erlaubt – deshalb verlangt das
 * Skript die ausdrückliche Bestätigung --weitergabe-erlaubt.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CATEGORY_LABELS } from '../src/lib/catalog';
import { importSchematic, SchematicError } from '../src/lib/importers/schematic';
import { draftFarm, isCategory, nameFromFile, slugify } from '../src/lib/localfarm';
import { computeMaterials, sortedItems } from '../src/lib/materials';
import { displayName } from '../src/lib/names';
import { CATEGORIES, validateFarm } from '../src/lib/schema';
import { DEFAULT_SETTINGS } from '../src/lib/userdata';

const FARMS_DIR = fileURLToPath(new URL('../data/farms/', import.meta.url));

const HELP = `
Aufruf:
  npm run import -- <datei> --quelle <https-Link> --autor <Name> --weitergabe-erlaubt [Optionen]

Pflicht:
  --quelle <url>          Link zum Original-Tutorial oder zur Download-Seite (https)
  --autor <name>          Ersteller der Farm bzw. der Schematic
  --weitergabe-erlaubt    Bestätigt: Der Ersteller erlaubt, die Datei öffentlich weiterzugeben

Optional:
  --name <text>           Anzeigename (Standard: Name aus der Datei bzw. Dateiname)
  --id <id>               Dateiname ohne .json (Standard: aus dem Namen gebildet)
  --kategorie <k>         ${CATEGORIES.join(' | ')} (Standard: sonstiges)
  --titel <text>          Titel der Quelle (Standard: Name der Farm)
  --lizenz <text>         Lizenz oder Wortlaut der Erlaubnis
  --ueberschreiben        Vorhandene Farm-Datei ersetzen
  --trocken               Nur anzeigen, nichts schreiben

Die fertige Datei danach von Hand ergänzen (Ertrag, Voraussetzungen, Funktionsprinzip,
Bauschritte) und mit "npm run validate" prüfen.
`;

function fail(message: string): never {
  console.error(`Fehler: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      quelle: { type: 'string' },
      autor: { type: 'string' },
      'weitergabe-erlaubt': { type: 'boolean', default: false },
      name: { type: 'string' },
      id: { type: 'string' },
      kategorie: { type: 'string', default: 'sonstiges' },
      titel: { type: 'string' },
      lizenz: { type: 'string' },
      ueberschreiben: { type: 'boolean', default: false },
      trocken: { type: 'boolean', default: false },
      hilfe: { type: 'boolean', short: 'h', default: false },
    },
  });

  const file = positionals[0];
  if (values.hilfe || !file) {
    console.log(HELP);
    process.exit(file ? 0 : 1);
  }
  if (!existsSync(file)) fail(`Datei nicht gefunden: ${file}`);
  if (!isCategory(values.kategorie)) {
    fail(`Unbekannte Kategorie "${values.kategorie}". Möglich: ${CATEGORIES.join(', ')}`);
  }

  let imported;
  try {
    imported = await importSchematic(new Uint8Array(readFileSync(file)), basename(file));
  } catch (e) {
    fail(e instanceof SchematicError ? e.message : String(e));
  }

  const name = values.name ?? (imported.name && imported.name !== 'Unnamed' ? imported.name : nameFromFile(basename(file)));
  const id = values.id ?? slugify(name);
  const { size } = imported.structure;

  console.log(`Gelesen: ${basename(file)}`);
  console.log(`  Format:   ${imported.format} (${imported.edition === 'java' ? 'Java' : 'Bedrock'})`);
  console.log(`  Version:  ${imported.mcVersion ?? 'unbekannt'}${imported.mcVersion && !imported.mcVersionExact ? ' (ungefähr)' : ''}`);
  console.log(`  Maße:     ${size.x} × ${size.y} × ${size.z} (B × H × T)`);
  console.log(`  Blöcke:   ${imported.blockCount} in ${imported.structure.palette.length - 1} Arten`);
  if (imported.author) console.log(`  Ersteller laut Datei: ${imported.author}`);
  if (imported.entities.length > 0) {
    console.log(`  Entitäten: ${imported.entities.map((e) => `${e.count}× ${e.id}`).join(', ')}`);
  }
  for (const w of imported.warnings) console.log(`  Hinweis:  ${w}`);
  console.log('  Material (häufigste):');
  for (const [item, count] of sortedItems(computeMaterials(imported.structure)).slice(0, 8)) {
    console.log(`    ${String(count).padStart(6)}  ${displayName(item)}`);
  }

  if (values.trocken) {
    console.log('\nTrockenlauf: Es wurde nichts geschrieben.');
    return;
  }
  if (!values.quelle || !values.autor) fail('--quelle und --autor sind Pflicht (jede Farm braucht eine Quelle).\n' + HELP);
  if (!values['weitergabe-erlaubt']) {
    fail(
      'Farm-Dateien im Repo sind öffentlich. Bestätige mit --weitergabe-erlaubt, dass der Ersteller die Weitergabe erlaubt.\n' +
        'Ohne Erlaubnis: Datei nicht ins Repo, sondern in der App über „Schematic importieren“ lokal laden.',
    );
  }

  const farm = draftFarm(imported, {
    id,
    name,
    category: values.kategorie,
    fileName: basename(file),
    fallbackVersion: DEFAULT_SETTINGS.versions[imported.edition],
    sources: [
      {
        title: values.titel ?? name,
        author: values.autor,
        url: values.quelle,
        ...(values.lizenz ? { license: values.lizenz } : {}),
      },
    ],
  });

  const result = validateFarm(farm);
  if (!result.ok) {
    fail(`Die erzeugte Farm ist ungültig:\n${result.problems.map((p) => `  ${p.path}: ${p.message}`).join('\n')}`);
  }
  const target = join(FARMS_DIR, `${id}.json`);
  if (existsSync(target) && !values.ueberschreiben) {
    fail(`${target} gibt es schon. Andere --id wählen oder --ueberschreiben angeben.`);
  }
  writeFileSync(target, JSON.stringify(result.farm, null, 2) + '\n');
  console.log(`\nGeschrieben: data/farms/${id}.json (Kategorie: ${CATEGORY_LABELS[values.kategorie]}, Status: ungeprüft)`);
  console.log('Als Nächstes: Ertrag, Voraussetzungen, Funktionsprinzip und Bauschritte ergänzen, dann "npm run validate".');
}

void main();
