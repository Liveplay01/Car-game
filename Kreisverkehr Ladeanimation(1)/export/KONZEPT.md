# Konzept: Boot-Zoom (Ladeanimation)

## Grundidee
Der Ladebildschirm ist ein durchgehender Kameraflug von oben auf den eigenen Kreisverkehr. Die Animation ist der Fortschrittsbalken. Sie dauert so lange wie das Laden und keine Sekunde länger.

## Ablauf

**1. Laden: der Anflug**
- Start knapp über den Wolken (Höhe ≈ 18× der Spielansicht), Blick senkrecht nach unten auf die nächtliche Stadt.
- Die Kamera sinkt, die Wolken ziehen nach außen vorbei (Parallaxe, sie liegen auf eigenen Höhen) und blenden aus, wenn man durch sie fliegt.
- Leichte Drehung (≈ 34°), die sich bis zur Landung auflöst. Leichter Dunst, solange man hoch ist.
- Alles ist dunkel: keine Laternen, keine Autos, keine UI. Nur „Loading your city…“ unten.
- Die Höhe folgt dem Ladefortschritt über eine **Feder** (gedämpft, ζ ≈ 0,85), nicht linear. Es gibt kein Ruckeln bei Sprüngen im Fortschritt.
- Vor dem Fertigladen fliegt die Kamera höchstens bis 88 % hinunter, sie landet also nie zu früh.
- Mindestflug 1,2 s, damit ein schneller Start trotzdem fliegt.

**2. Fertig geladen: die Landung**
- Die Feder wird straffer und weniger gedämpft (k 30, ζ 0,5). Die Kamera landet mit einem kleinen Nachfedern genau in der Spielansicht.
- Die Landung ist exakt die Kameraposition des Spiels, damit der Übergang nahtlos ist.

**3a. Erfolg, Spielstand verlangt Nacht**
- Die Straßenlaternen gehen nacheinander an, von der eigenen Straße nach außen, mit kurzem Aufflackern (Timings der `LampWave` aus `cityLights.ts`: 0,2 s pro Arm, 0,12 s pro Lampe, 0,34 s Zünden).
- Danach fahren die Autos los (Ring und Warteschlange) mit Scheinwerfern.
- Dann gleitet die UI herein (oben die Leiste mit den Spielwerten, unten die Tab-Leiste), und der Boot-Screen blendet in die echte Szene über.

**3b. Erfolg, Spielstand verlangt Tag**
- Sonnenaufgang von Osten: Ein warmes Licht wandert über die Stadt, die Nacht weicht von rechts nach links.
- Boden, Dächer und Bäume wechseln auf die Tagesfarben, die langen Morgenschatten werden kürzer.
- Danach Autos und UI wie bei Nacht, dann der Übergang in die echte Szene.

**3c. Fehler**
- Die Kamera landet trotzdem.
- Die Fehlermeldung steht **in der Insel des Kreisverkehrs** (Titel, Text, optional technischer Fehler, Knopf „Try again“).
- Eine rot-weiße Absperrung liegt auf der eigenen Einfahrt.
- Es bleibt Nacht, keine Laternen, keine Autos, keine UI. Der Spielstand wird nicht geladen.

## Regeln
- Es dauert nicht länger als das normale Laden. Nach dem Laden kommen nur Landung und Enthüllung dazu (≈ 2 s Nacht, ≈ 3 s Tag), und die echte Szene läuft dabei schon dahinter.
- Alles in der Farbsprache des Spiels (`theme.ts`): Amber #ffb703 für Licht und Akzent, Rot nur für den Fehler.
- Reduce Motion: keine Drehung, kein Nachfedern, Laternen blenden nur weich auf.
- Erstbesuch: Die bestehende Lektion (`.boot-learn`) bleibt, der Zoom ersetzt nur den kreisenden Auto-Ring.

## Schnittstelle (`bootZoom.ts`)
- `new BootZoom(bootElement)`: Startet den Anflug sofort.
- `zoom.progress(0…1)`: echter Fortschritt (optional, sonst kriecht er selbst weiter).
- `await zoom.ready({ night })`: Landung und Enthüllung. Löst auf, wenn der Boot-Screen ausblenden darf.
- `zoom.fail(title, body, retry, detail?)`: Landung mit Fehler in der Insel.
- `zoom.destroy()`: nach dem Ausblenden aufräumen.
