# Videos für Social (Reels, TikTok, Shorts)

Hochformat 1080×1920, 14–18 s, Ton an. Pipeline: [trailer/README.md](trailer/README.md), Schnitte in
`trailer/compose/cuts/reel-*.mjs`, gemeinsame Teile in `social.mjs`.

## Was funktioniert (Leo, 11.10.2026)

Favoriten: **reel-3-too-early** und **reel-4-every-city**. Was die beiden gemeinsam haben:

- Hook in der ersten Sekunde, mit Humor („POV: You tap without looking“)
- echte Physik und echte Fehler statt nur Erfolge
- hohes Tempo, Schnitte auf dem Beat, viel Abwechslung im Bild
- kurze Texte (1–3 Wörter), die im Bild knallen

**Ton:** Keine Sounds, die sich wiederholen (derselbe Klick oder Merge auf jedem Schnitt). Jeder Moment
bekommt einen eigenen Klang. Wo ein Sound doch öfter kommt: selten, mit anderer Tonhöhe (`rate`) und Lautstärke.

## Neu (12.10.2026)

| Video | Hook | Schnitt | Footage |
| --- | --- | --- | --- |
| `reel-5-rate-my-timing` | „Rate my timing“ | `reel-rate.mjs`: Crashes mit immer schlechterer Note, Mayhem „Error/10“, dann 10/10 | `f-*`, `w-hail`, `w-night` |
| `reel-6-every-sky` | „Same tap. Every sky.“ | `reel-sky.mjs`: neun Wetter im Beat, je ein Merge auf dem Schlag, Perfect auf Eis | `w-*` |
| `reel-7-cash-out` | „Cash out… NOW!“ | `reel-greed.mjs`: Clutch-Cash-out, Double or nothing gewonnen, dann zu gierig | `s-greed` |
| `reel-8-legendary` | „Tap fast.“ / „Legendary?“ | `reel-chest.mjs`: Truhe mit 8 Taps aufbrechen, Reel kriecht, Legendary, dann auf der Straße | `s-chest`, `w-extreme` |

## Ideen

| Idee | Hook | Inhalt |
| --- | --- | --- |
| **Skin-Upgrade** | „One more spin“ | Das Rad läuft, Skin wird seltener (Common → Legendary), am Ende ein Fehlschlag als Pointe. |
| **Auto-Formen** | „Same car? No.“ | Beetle, GT Coupé, Roadster, Jeep, Hot Rod im Beat-Schnitt, jedes Mal in der Kreisel-Einfahrt. |
| **The Family** | „Never borrow from these guys“ | Kredit beim Don, Zeiger-Balken (Perfect), Brief des Dons, Frist läuft ab, Mafia-Badge. |
| **Auktionshaus** | „The sharks bid again“ | Sammler treiben den Preis, Zuschlag oder Weggehen. Mit Humor, die Sammler sind als Computer benannt. |
| **Boss-Kampf** | „Level 15 be like“ | Boss kommt, Sturm, Fail, dann der Sieg. |
| **Polizei** | „Wanted“ | Verbrecher im Kreisel, Takedown in Zeitlupe. Neu in 1080 aufnehmen, das alte Material ist unscharf. |
| **Hochzeitskorso / Events** | „Wait… a wedding?“ | Seltene Ereignisse als Überraschung, Museum als Abspann. |
| **Street Builder** | „Built my own city“ | Zeitraffer vom Bauen, dann im Spiel fahren. |
| **Multiplayer** | „1v1 my friend“ | Zwei Handys, wer zuerst crasht. |

## Vorgehen

1. **Aufnehmen:** Gameplay mit `node capture/batch.mjs <name>` (Bots: `peak` für Perfects, `wild` für Crashes,
   `hunter` für Polizei, `bold`). Menüs wie Casino, Chests, Mafia und Auktion als Szene in `capture/scenes.mjs`. Neue
   Szenen fehlen noch für Mafia, Auktion, Auto-Formen und Street Builder. Casino-Szenen fixieren den Zufall über
   den Seed, die Quoten bleiben echt. Ein festes Wetter oder eine Nacht gibt das siebte Feld in `batch.mjs` vor
   (`'snow'`, `'storm/night'`, `'-/blackout'`; `play.mjs`, `pinSky`). Eine Szene kann ihre Momente zurückgeben (`marks`
   im JSON, Sekunden im Clip), der Schnitt liest sie (`reel-greed.mjs`). Truhen öffnen sich nur mit 8 schnellen Taps
   (`hitChest`). ffmpeg kommt über `winget install Gyan.FFmpeg`, der Mixer braucht `pip install numpy scipy`.
2. **Momente finden:** Die Event-Zeiten kommen aus `footage/<clip>.json` (`events()` und `merges()` in `social.mjs`).
   Danach einen Kontaktbogen mit ffmpeg anschauen. Die ersten ~2 s jedes Clips nicht verwenden (Startkarte,
   Achievement-Toast).
3. **Schneiden:** `reel-crash.mjs` oder `reel-city.mjs` kopieren. Kaum zoomen (Bildgröße ≤ 1,3), kein Abdunkeln,
   Texte zwischen y 0,13 und 0,78. Am Ende `endCard()`.
4. **Rendern:** `node compose/render.mjs <cut>`, dann prüfen: Kontaktbogen, ein Durchlauf mit Ton auf dem Handy,
   und hören, ob sich ein Sound wiederholt.
5. Fertige Videos kommen als `videos/reel-<n>-<name>.mp4`.
