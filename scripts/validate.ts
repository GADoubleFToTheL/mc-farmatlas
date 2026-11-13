/**
 * npm run validate – prüft alle Farm-Dateien unter data/farms/ gegen das Schema.
 * Beendet sich mit Fehlercode 1, sobald eine Datei ungültig ist (wichtig für die GitHub Action).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFarm } from '../src/lib/schema';

const FARMS_DIR = fileURLToPath(new URL('../data/farms/', import.meta.url));

interface FileReport {
  file: string;
  problems: string[];
}

export function validateDirectory(dir: string): FileReport[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const seen = new Map<string, string>();
  return files.map((file) => {
    const problems: string[] = [];
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (e) {
      return { file, problems: [`Kein gültiges JSON: ${e instanceof Error ? e.message : String(e)}`] };
    }
    const result = validateFarm(data);
    if (!result.ok) {
      problems.push(...result.problems.map((p) => `${p.path}: ${p.message}`));
    } else {
      const { id } = result.farm;
      if (id !== basename(file, '.json')) {
        problems.push(`id "${id}" passt nicht zum Dateinamen (erwartet "${id}.json")`);
      }
      const other = seen.get(id);
      if (other) problems.push(`id "${id}" ist doppelt (auch in ${other})`);
      seen.set(id, file);
    }
    return { file, problems };
  });
}

function main(): void {
  const reports = validateDirectory(FARMS_DIR);
  const bad = reports.filter((r) => r.problems.length > 0);
  for (const r of reports) {
    if (r.problems.length === 0) {
      console.log(`✓ ${r.file}`);
    } else {
      console.error(`✗ ${r.file}`);
      for (const p of r.problems) console.error(`    ${p}`);
    }
  }
  console.log(`\n${reports.length} Farm-Datei(en) geprüft, ${bad.length} mit Fehlern.`);
  if (bad.length > 0) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
