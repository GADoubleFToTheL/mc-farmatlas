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
| 1 | Übersicht, Detailseite, Ebenen-Viewer, Materialliste, Bau-Modus, erste Farmen | offen |
| 2 | Import von Schematic-Dateien (`.litematic`, `.schem`, `.nbt`, `.mcstructure`) | offen |
| R | Recherche weiterer Farmen für Bedrock und Java | offen |
| 3 | 3D-Vorschau, Drehen/Spiegeln, Export, Notizen | offen |

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

Wie eine neue Farm angelegt wird, steht in [CLAUDE.md](CLAUDE.md) im Abschnitt
„So fügst du eine neue Farm hinzu“.

## Veröffentlichung

Jeder Push auf `main` startet eine GitHub Action. Sie prüft Typen, Farmdaten und Tests,
baut die App und veröffentlicht sie auf GitHub Pages – aber nur, wenn alles grün ist.

Einmalig nötig: im Repository unter **Settings → Pages → Build and deployment → Source**
den Eintrag **GitHub Actions** wählen.

## Rechtliches

Farmatlas ist ein privates Fanprojekt und steht in keiner Verbindung zu Mojang oder
Microsoft. Es enthält keine Texturen oder Grafiken aus Minecraft; Blöcke werden mit
eigenen Farben und Symbolen dargestellt.
