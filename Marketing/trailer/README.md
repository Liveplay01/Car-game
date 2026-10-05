# Trailer-Pipeline – Roundabout Timing

Die Videos in `../videos/` entstehen aus dem **echten Spiel**: kein Mockup, keine Fake-UI.

| Schritt | Befehl | Ergebnis |
| --- | --- | --- |
| 0 | `cd Web; npm run dev` und `cd Marketing/trailer; npm install` | Spiel auf :5050, Playwright |
| 1 Gameplay filmen | `node capture/batch.mjs` (`--landscape` für 16:9) | `footage/g-*.mp4`, `L-*.mp4` + `.json` mit den Spiel-Events |
| 1 Menüs filmen | `node capture/scenes.mjs chest crash slots upgrade collection builder museum upgrades` | `footage/s-*.mp4` |
| 2 Schneiden | `node compose/render.mjs short \| short-wide \| trailer \| trailer-wide` | `out/<cut>.mp4` mit Ton |

## Wie es funktioniert

- **Aufnahme:** Die Spieluhr wird mit Playwright (`page.clock`) angehalten und Bild für Bild um 1/60 s vorgestellt, jedes Bild ist ein
  Screenshot (1080×1920 oder 1920×1080). Das ergibt ruckelfreie 60 fps in voller Auflösung, egal wie schnell der Rechner ist.
  Ein Bot (`capture/lib.mjs`: `careful`, `bold`, `wild`, `hunter`) spielt über die Tastatur; der Spielstand kommt aus `capture/showcase`/`play.mjs` (`stage`).
- **Zeiten:** Das Spiel ist nicht deterministisch. Die JSON-Dateien neben den Clips nennen die Spiel-Events (Takedown, Explosion, Tight Fit ...),
  die Zeit im Log geteilt durch **1,0625** ist die Zeit im Video.
- **Casino-Szenen:** `scenes.mjs` fixiert den Zufall (`crypto.getRandomValues` = 0) und setzt einen gesuchten `casinoSeed`, damit die Runden gewinnen.
  Die Quoten bleiben die des Spiels; es ist nur die Wahl des Seeds.
- **Schnitt:** `compose/cuts/*.mjs` listet Shots, Titel, Blitze und Sound-Cues auf dem 120-BPM-Raster der Spielmusik (1 Schlag = 0,5 s).
  `compose/stage.html` zeichnet jedes Bild (Kamera-Zoom, Shake, Zeitlupe, Typo-Slams), `compose/audio.py` mischt Musik-Stems und Sounds des Spiels.
- **Neue Schnitte:** Kopie eines Cuts anlegen, Zeiten anpassen, rendern.
