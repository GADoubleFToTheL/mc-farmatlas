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
