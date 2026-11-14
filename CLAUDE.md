# Farmatlas – Hinweise für Claude

Web-App (PWA), um Minecraft-Farmen nachzuschlagen und Ebene für Ebene nachzubauen.
Rein statisch, gehostet auf GitHub Pages unter `/mc-farmatlas/`. Oberfläche, Texte,
Kommentare und Commit-Messages sind auf Deutsch.

Zielsystem des Nutzers: **Bedrock Edition 26.62**. Der Katalog enthält Farmen für
Bedrock und Java, jeweils klar gekennzeichnet.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run typecheck` | TypeScript-Prüfung (strict) |
| `npm run validate` | alle `data/farms/*.json` gegen das Schema prüfen |
| `npm test` | Vitest |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |
| `npm run check` | alles zusammen – muss vor jedem Commit grün sein |
| `npm run import -- <datei> --trocken` | Schematic lesen und zusammenfassen (siehe `--hilfe`) |
| `npm run preview` | gebauten Stand unter `http://localhost:4173/mc-farmatlas/` ansehen |

## Regeln für Inhalte (wichtiger als alles andere)

- **Niemals Baupläne erfinden.** Ein falscher Redstone-Plan ist schlimmer als keiner.
- Kein Bauplan aus Videos, Bildern oder Beschreibungstexten ableiten. Kein eindeutiger
  Fund → `"blueprint": null` (die App zeigt „Bauplan fehlt → Schematic importieren“).
- Jede Farm braucht mindestens eine Quelle mit Link. Texte in eigenen Worten.
- Raten nur mit Quelle (`rate.source` verweist auf `sources`); die App zeigt „laut Quelle“.
- Neue Farmen starten mit `"status": "ungeprueft"`. Nur der Nutzer setzt den Status hoch.
- Fremde Schematics kommen nur ins Repo, wenn der Ersteller die Weitergabe erlaubt.
- Keine Mojang-Texturen und keine fremden Bilder ins Repo.

## Konventionen

- TypeScript strict, keine `any`. Kernlogik ohne UI liegt in `src/lib/` und hat Tests.
- Intern immer Block-IDs (`minecraft:observer`); deutsche Namen nur für die Anzeige.
- Versionen nur über `src/lib/version.ts` vergleichen – nie als Text. Es gibt zwei
  Schemata (1.21.x und jahresbasiert 26.x); verglichen wird nur innerhalb einer Edition.
- Routing über Hash (`#/…`), `base` ist `/mc-farmatlas/` (siehe `vite.config.ts`).
- Mobile first: Touch-Flächen mindestens 44 px, Prüfung bei 390 px Breite und am Desktop.
- Persönliche Daten (Favoriten, Fortschritt, Notizen, Importe) nur lokal in IndexedDB.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `data/farms/` | eine JSON-Datei pro Farm |
| `src/lib/` | Kernlogik ohne UI: `schema`, `version`, `blockstate`, `structure`, `traits`, `materials`, `catalog`, `userdata`, `names`, `blockstyle`, `bedrock`, `dataversion`, `localfarm`, `transform`, `nbt` |
| `src/lib/exporters/` | Export als `.litematic` und `.mcstructure` |
| `src/lib/importers/` | Schematic-Parser (`schematic.ts`) und echte Testdateien (`fixtures/`) |
| `src/db/` | IndexedDB (`database.ts`) und Zustand im Speicher (`store.ts`) |
| `src/features/` | `catalog`, `farm`, `viewer`, `materials`, `build`, `import`, `settings` |
| `src/ui/` | gemeinsame Bausteine (Knöpfe, Chips, Blatt, Icons) |
| `scripts/` | Node-Skripte (`validate.ts`, `import.ts`) |

Wichtige Zusammenhänge:

- `structure.ts` ist das gemeinsame Format für Baupläne (Palette + Index-Array). Zeichenraster
  aus Farm-Dateien und später importierte Schematics werden beide dorthin übersetzt.
- `traits.ts` macht aus einem Blockzustand das, was der Viewer zeigt (Pfeil, Verzögerung, Hälfte,
  Flüssigkeit). Achtung: Bei `repeater`/`comparator` ist der Pfeil die Signalrichtung, also
  entgegen `facing`; beim Beobachter zeigt `facing` auf die beobachtete Seite.
- `materials.ts` zählt Wasser- und Lavaquellen getrennt von Items; fließende Flüssigkeit kostet nichts.
- Neue Blöcke: deutschen Namen in `names.ts`, Farbe in `blockstyle.ts` ergänzen.
  `npm run validate` gibt einen Hinweis, wenn einer Farm ein deutscher Name fehlt.

### Schematic-Import

- `importers/schematic.ts` läuft in Browser und Node. Java-Formate liest `minecraft-block-reader`
  (WebAssembly; in `vite.config.ts` aus `optimizeDeps` ausgeschlossen). `.mcstructure` lesen wir
  selbst, weil die Bibliothek Bedrock-Zustände nur lückenhaft übersetzt.
- `bedrock.ts` übersetzt Bedrock-Zustände in Java-Schreibweise. Die Zuordnung ist gegen das Wiki
  und die GeyserMC-Tabelle geprüft. Eigenheiten: Kolben zählen Richtungen anders (2 = Süden,
  3 = Norden), Wandfackeln speichern die Gegenrichtung, Türen sind um 90° gedreht. Was sich nicht
  übersetzen lässt, landet als Hinweis am Paletteneintrag – nie stillschweigend verwerfen.
- Importierte Baupläne sind intern immer `stateSyntax: "java"`.
- Lokale Importe (`localfarm.ts`) liegen in IndexedDB (`userFarms`) und stecken im Backup. Ein
  Import ist entweder eine eigene Farm (`lokal-…`) oder hängt an einer Katalog-Farm ohne Bauplan
  (`import:<id>`); `data/farms.ts` führt beides zum Katalog zusammen.
- Testdateien: nur frei weitergebbare echte Dateien ins Repo (siehe `fixtures/README.md`).

### Drehen, Spiegeln, Export

- `transform.ts` dreht/spiegelt Positionen und Blockzustände (`facing`, `axis`, `rotation`,
  Seiten-Eigenschaften, Schienenformen, links/rechts bei Treppen, Türen, Truhen). Die gewählte
  Ausrichtung liegt je Farm in `farmState.orientation` (erst spiegeln, dann drehen); der Bauplan
  in der Farm-Datei bleibt unverändert.
- `exporters/litematic.ts` schreibt Litematica-Format 6 mit Datenversion 1.21 (liest jede
  aktuelle Mod-Version). Die Tests lesen jede exportierte Datei mit dem Importer zurück.
- `exporters/mcstructure.ts` nutzt `javaToBedrock` aus `bedrock.ts`. Im Spiel ungetestet –
  die Oberfläche sagt das auch. Neue Blöcke dort nur mit belegter Zuordnung ergänzen.
- `Preview3D.tsx` (three.js) wird erst beim Öffnen der 3D-Ansicht geladen.

## Datenschema

Quelle der Wahrheit ist `src/lib/schema.ts` (zod). Kurzfassung:

- Steckbrief: `id` (= Dateiname), `name`, `category`, `outputs` (Item-IDs, XP = `farmatlas:xp`),
  `editions` (`java`/`bedrock` je `{from, to}`), `difficulty` 1–5, `rate`, `status`
- `requirements`: Dimension, Biom, Y-Höhe, Sonderort, AFK, Mobs, Simulationsdistanz, Chunk-Grenzen
- Texte: `principle`, `steps` (mit `layers`, 1 = unterste Ebene), `pitfalls`, `editionNotes`
- `blueprint` (oder `null`):
  - `palette`: ein Zeichen → Blockzustand, `.` ist immer Luft
  - `layers[y][z]`: eine Zeile als Text, ein Zeichen pro Block
  - Achsen: x = Spalte (Westen → Osten), z = Zeile (Norden oben), y = Ebene (unten → oben)
  - `start`: nullbasierter Startblock, darf nicht Luft sein
  - `stateSyntax`: `java` (`minecraft:repeater[facing=north,delay=2]`) oder `bedrock`
  - zweites Format `"format": "indexed"` für große Importe: `size`, `palette` als Liste
    (Index 0 = Luft) und `runs` (Paare aus Palettenindex und Anzahl, Reihenfolge y → z → x)
  - optional `containers`: Inhalt von Behältern je Position (z. B. Filter-Items)
- `blueprintOrigin` (Pflicht bei Bauplan): `quelle` (aus der Quelle übernommen),
  `standarddesign` (eigene Umsetzung eines Standarddesigns) oder `import`, jeweils mit Erklärung
- `extras`: was nicht im Bauplan steht (Wassereimer, Mobs, Werkzeug)
- `sources`, optional `schematics` (bekannte Downloads samt Zugangsart)

Maße und Materialliste werden aus dem Bauplan berechnet und stehen nicht in der Datei.
Nur Farmen ohne Bauplan dürfen `size` (laut Quelle) angeben.

## So fügst du eine neue Farm hinzu

1. Quelle prüfen: Ist das Design eindeutig und passt es zu Edition und Version?
2. Datei `data/farms/<id>.json` anlegen; `id` in Kleinbuchstaben mit Bindestrichen.
3. Steckbrief, Voraussetzungen und Texte ausfüllen (eigene Worte, Quelle verlinken).
4. Bauplan nur eintragen, wenn er gesichert ist – sonst `"blueprint": null`.
   Ebene 1 ist die unterste, Norden ist oben, jede Zeile gleich lang.
5. `"status": "ungeprueft"` setzen.
6. `npm run validate` – meldet Tippfehler im Raster, unbekannte Kürzel und falsche Zustände.
7. In der App ansehen (`npm run dev`), dann `npm run check` und committen.

## Deployment

`.github/workflows/deploy.yml` prüft jeden Push (Typen, Daten, Tests, Build) und
veröffentlicht nur von `main` und nur bei grünem Ergebnis.
