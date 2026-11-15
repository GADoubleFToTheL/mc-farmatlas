# Farmatlas

Minecraft-Farmen nachschlagen und Ebene für Ebene nachbauen – als Web-App fürs Handy
und für den PC. Die App läuft komplett im Browser, lässt sich installieren und
funktioniert danach auch ohne Internet.

**Adresse:** https://gadoubleftothel.github.io/mc-farmatlas/

## Stand

Das Projekt entsteht in Phasen:

| Phase | Inhalt | Stand |
|---|---|---|
| 0 | Grundgerüst, installierbare App, automatische Veröffentlichung | fertig |
| 1 | Übersicht, Detailseite, Ebenen-Viewer, Materialliste, Bau-Modus, erste Farmen | fertig |
| 2 | Import von Schematic-Dateien (`.litematic`, `.schem`, `.nbt`, `.mcstructure`) | fertig |
| R | Recherche weiterer Farmen für Bedrock und Java ([Bericht](docs/recherche-bericht.md)) | fertig |
| 3 | 3D-Vorschau, Drehen/Spiegeln, Export, Notizen | fertig |
| 4 | Blöcke wie im Spiel (Original-Texturen aufs Gerät laden), 3D-Ansicht im Bau-Modus | fertig |

## Was die App kann

- **Übersicht:** Suche nach Name oder Item („Eisen“, „XP“), Filter nach Kategorie, Edition,
  Version, Schwierigkeit, Größe und AFK, Sortierung, Favoriten.
- **Detailseite:** Steckbrief, Voraussetzungen, Funktionsprinzip, Bauschritte, häufige Fehler, Quellen.
- **Ebenen-Viewer:** eine Ebene als Raster, Norden ist oben. Wischen oder ±-Tasten wechseln die
  Ebene, zwei Finger zoomen, Antippen zeigt Name und Zustand eines Blocks. Die Ebene darunter
  lässt sich blass einblenden. Das Lineal zählt vom Startblock aus.
- **Materialliste:** gesamt oder pro Ebene, umgerechnet in Stacks und Shulkerkisten, zum Abhaken.
- **Bau-Modus:** Vollbild, Ebene für Ebene abhaken, der Bildschirm bleibt an, der Fortschritt bleibt gespeichert.
  Er startet in der 3D-Ansicht: Was schon gebaut ist, steht fest da, der Rest der Farm ist blass
  angedeutet. Oben links wechselst du zur Ebenen-Ansicht von oben.
- **Backup:** In den Einstellungen (Zahnrad) lassen sich alle eigenen Daten als Datei speichern und
  auf einem anderen Gerät wieder laden.

- **Schematic-Import:** Über das Pfeil-Symbol oben rechts lädst du eine `.litematic`-, `.schem`-,
  `.nbt`- (Java) oder `.mcstructure`-Datei (Bedrock). Bauplan und Materialliste entstehen automatisch.
  Die Datei bleibt auf deinem Gerät. Bei Farmen mit dem Hinweis „Bauplan fehlt“ kannst du den
  importierten Bauplan direkt an die Farm hängen – dann stehen Steckbrief und Quellen daneben.

- **Drehen und Spiegeln:** Im Reiter „Bauplan“ drehst du die Farm in die Richtung, in der sie bei dir
  stehen soll. Die Ausrichtung aller Blöcke (Kolben, Beobachter, Trichter, Schienen …) dreht mit.
- **3D-Ansicht:** Zeigt die ganze Farm oder den Stand bis zur gewählten Ebene. Ziehen dreht,
  zwei Finger zoomen, Antippen zeigt den Block.
- **Blöcke wie im Spiel:** siehe nächster Abschnitt.
- **Export:** Als `.mcstructure` für den Bedrock-Konstruktionsblock (noch nicht im Spiel getestet)
  oder als `.litematic` für die Java-Mod Litematica.
- **Notizen:** Pro Farm eigene Notizen und die Koordinaten, an denen sie in deiner Welt steht.

### Blöcke wie im Spiel

Ohne weiteres Zutun zeigt die App Blöcke als einfache Farben mit Symbolen. So schaltest du das
echte Aussehen ein:

1. Eine Farm mit Bauplan öffnen (Reiter „Bauplan“ oder Bau-Modus).
2. Im Kasten „Blöcke wie im Spiel anzeigen?“ auf **Wie im Spiel anzeigen** tippen
   (braucht einmal Internet, wenige Sekunden).
3. Fertig – ab jetzt sehen Blöcke in der 3D-Ansicht, im Bauplan von oben und in der Legende aus
   wie im Spiel. Das funktioniert danach auch offline.

Dasselbe geht über das Zahnrad oben rechts → **Aussehen der Blöcke**. Dort schaltest du auch
zurück auf einfache Farben.

Die Bilder kommen direkt aus dem offiziellen Beispiel-Paket von Mojang
([bedrock-samples](https://github.com/Mojang/bedrock-samples)) und werden nur auf deinem Gerät
gespeichert. Sie liegen nicht in diesem Projekt und werden nicht weitergegeben. Für sie gilt die
Minecraft-EULA. Mit **Texturen löschen** entfernst du sie wieder.

Grenzen der Darstellung:

- Würfel, Stufen, Treppen, Kolben, Beobachter, Trichter, Truhen, Verstärker, Schienen, Pflanzen,
  Zäune, Mauern und Flüssigkeiten haben ihre eigene Form. Seltene Sonderformen sind vereinfacht
  (ansteigende Schienen liegen flach, Türen sind geschlossen, Redstone-Staub ist angenähert).
- Blöcke, die das Spiel nicht als normale Blocktextur zeichnet (Betten, Schilder, Banner), und
  Blöcke, die das Paket nicht kennt, erscheinen weiter als farbiger Würfel.
- Kommt eine neue Farm mit neuen Blöcken dazu, lädst du die fehlenden Bilder mit demselben Knopf nach.

### Symbole im Bauplan

Mit Original-Texturen blendest du die Pfeile über **Pfeile an/aus** ein oder aus.

| Symbol | Bedeutung |
|---|---|
| Pfeil | Ausrichtung des Blocks; bei Verstärkern die Signalrichtung |
| ⊙ / ⊗ | zeigt nach oben / nach unten |
| roter Punkt | Beobachter: Signalausgang (Rückseite) |
| Zahl im roten Kreis | Verstärker: Verzögerung in Ticks |
| halb gefülltes Feld | obere bzw. untere Stufe |
| Blau mit Rahmen / gestreift | Wasserquelle / fließendes Wasser |
| grüne Ecke | Startblock |
| weiße Raute | Behälter mit Inhalt (nur bei Importen) – antippen zeigt, was hineingehört |

## App aufs Handy holen

1. Adresse oben im Browser öffnen (Android: Chrome, iPhone: Safari).
2. Android: Menü (⋮) → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
   iPhone: Teilen-Symbol → „Zum Home-Bildschirm“.
3. Die App einmal mit Internet öffnen. Sobald „Farmatlas ist jetzt offline nutzbar“
   erscheint, sind alle Daten auf dem Gerät.

Gibt es eine neue Version, zeigt die App unten einen Hinweis mit „Aktualisieren“.

## Deine Daten

Favoriten, Baufortschritt, Notizen und importierte Farmen liegen nur auf deinem Gerät
(im Browser-Speicher). Es gibt kein Konto und keinen Server.

## Woher die Farmen kommen

- Jede Farm nennt ihre Quelle und verlinkt das Original.
- Baupläne werden nie geraten. Fehlt ein gesicherter Plan, steht dort
  „Bauplan fehlt → Schematic importieren“.
- Neue Farmen sind als „ungeprüft“ markiert, bis sie im Spiel getestet wurden.
- Raten pro Stunde stammen immer aus der verlinkten Quelle („laut Quelle“).

## Für Entwicklung

Voraussetzung: [Node.js](https://nodejs.org/) 22 oder neuer.

```bash
npm install
```

```bash
npm run dev
```

Weitere Befehle:

| Befehl | Zweck |
|---|---|
| `npm run validate` | prüft alle Farm-Dateien in `data/farms/` |
| `npm test` | führt die Tests aus |
| `npm run build` | baut die App nach `dist/` |
| `npm run check` | alles zusammen |

### Schematic als Farm-Datei ins Repo schreiben

```bash
npm run import -- meine-farm.litematic --trocken
```

Der Trockenlauf zeigt nur, was in der Datei steckt. Zum Schreiben nach `data/farms/` braucht das
Skript eine Quelle und die Bestätigung, dass der Ersteller die Weitergabe erlaubt:

```bash
npm run import -- meine-farm.litematic --quelle https://beispiel.de/tutorial --autor "Name" --weitergabe-erlaubt
```

Ohne diese Erlaubnis gehört die Datei nicht ins öffentliche Repo – dann einfach in der App importieren.

Wie eine neue Farm angelegt wird, steht in [CLAUDE.md](CLAUDE.md) im Abschnitt
„So fügst du eine neue Farm hinzu“.

## Veröffentlichung

Jeder Push auf `main` startet eine GitHub Action. Sie prüft Typen, Farmdaten und Tests,
baut die App und veröffentlicht sie auf GitHub Pages – aber nur, wenn alles grün ist.

Einmalig nötig: im Repository unter **Settings → Pages → Build and deployment → Source**
den Eintrag **GitHub Actions** wählen.

## Rechtliches

Farmatlas ist ein privates Fanprojekt und steht in keiner Verbindung zu Mojang oder
Microsoft. Das Repository enthält keine Texturen oder Grafiken aus Minecraft; ohne weiteres
Zutun werden Blöcke mit eigenen Farben und Symbolen dargestellt. Wer in den Einstellungen
„Original-Texturen laden“ wählt, lädt die Bilder selbst von Mojangs offiziellem
Beispiel-Paket auf das eigene Gerät; dafür gilt die Minecraft-EULA.
