# Idea.md – offene Ideen

Stand: 29.09.2026

Diese Datei enthält nur Ideen, die **noch nicht umgesetzt** sind. Was gebaut ist, steht in
[Spiel.md](Spiel.md) und [FOUNDATION.md](FOUNDATION.md), die Zahlen in `Web/src/core/config.ts`.
Gestrichene Ideen werden hier ebenfalls entfernt.

Die Spielidee in einem Satz: Autos per Tap in einen rotierenden Kreisverkehr einfädeln
(inspiriert von "Car Circle"), mit Polizei, Verbrechern, Geldtransportern, Wetter und
einer Stadt, die mit dem Spieler wächst.

---

## Designprinzipien (bleiben gültig)

1. **One Tap, sofortiges Feedback.** Jeder Tap fühlt sich unmittelbar und physisch an.
2. **Skill statt Zufall.** Situationen lesen und durch Timing lösen.
3. **Anticipation statt Überraschung.** Wichtiges wird rechtzeitig angekündigt.
4. **Positive Präzision.** Perfect Input, Tight Fit, Near Miss und Perfect Chain fühlen sich besonders gut an.
5. **Sonderfahrzeuge verändern Entscheidungen**, ohne den Kernloop zu ersetzen.
6. **Physik vermittelt Gewicht.**
7. **Economy bleibt unterstützend** und überdeckt nie die One-Tap-Mechanik.
8. **Die Stadt wächst sichtbar.**
9. **Cosmetics bleiben Cosmetics.** Skins geben keine Gameplay-Boni.
10. **Kein Feature-Bloat.** Neues fügt sich möglichst unsichtbar in den Spielfluss ein.
11. **Der Schichtwechsel bleibt flüssig.** Kein Freeze, kein Replay, keine Einblendung
    zwischen zwei Schichten (Highlight/Replay wurde deshalb gestrichen).
12. **Die Welt ist die Oberfläche** (Leo, 25.09.2026). Neues wird zuerst am Kreisverkehr
    gezeigt (Inselrand, Lichtsignale, Farbe), erst dann als klassische Anzeige. Keine Beschriftung,
    wo die Farbe am Ring schon alles sagt.
    Räumlich, aber leise: Tiefe durch Schatten und kleine Staffelung, kein 3D.
13. **Eine Stadt, mehrere Perspektiven.** Die Tabs sind Blicke auf dieselbe laufende Stadt,
    kein Menü über einem angehaltenen Spiel. Der Ring hört nie auf.

---

## Später: Backend über Coolify (Leo, 29.09.2026: verschoben)

Das Spiel bleibt offline-first; ein Backend wäre ein Zusatz, der ausfallen darf. Empfohlene
Reihenfolge: (1) Analytics und Fehlerberichte (Umami/Plausible, GlitchTip als Coolify-Dienste,
kein eigener Code); (2) eigener PeerJS-Server und TURN mit kurzlebigen Zugängen (löst
„Multiplayer über echte Netze“); (3) Daily-Bestenliste mit Replay-Prüfung (Seed + Taps,
`core/` läuft in Node); (4) Kurzlinks mit Vorschaubild für Challenge-Links; (5) Spielstand
über Geräte per Sync-Code. Geld und Truhen bleiben lokal, die Casino-Regel gilt weiter. Vorher
muss „Kein Backend“ aus den festen Entscheidungen in CLAUDE.md.

---

## Offen: Inhaltliche Abwechslung

- Weitere Vehicle Types über Compact, Sports Car und Van hinaus (z. B. Oldtimer; Truhen-Inhalt,
  eigene faire Eigenschaften).
- Zweispurige Kreisverkehre.
- Ghost Racing über Challenge-Links (Leo, 28.09.2026: erstmal nicht).

Diese Inhalte dürfen die Kernmechanik nicht mit Sonderregeln überladen.

