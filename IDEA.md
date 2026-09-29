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

## Offen: Look & Feel

- **Echte Klänge und Musik-Stems** statt der Platzhalter: Combo baut Layer auf (Rhythmus,
  Bass), Verbrecher bringt Sirenen-Impuls, Rush Hour zieht den Beat an, Flow State verdichtet
  den Rhythmus. Perfect Input: kurzer hochwertiger Sound. Takedown in Schichten: Kontakt,
  Metall, Deformation, Reifen, abreißende Teile, Signatur. Das Mischpult (`MusicMix`) steht.
- **Haptik feinjustieren** auf Android-Handys (iPhones können im Browser nicht vibrieren);
  Takedown-Haptik mit der Wucht skalieren.
- **Daily Shift als eigene Perspektive** (z. B. anderer Blickwinkel oder Tageslicht) statt
  Splash-Karte.

## Offen: Balancing (Startwerte stehen, Feinschliff im Playtest)

- Levelkurve für Speed, Density und Weather; Rush-Hour-Werte.
- Kosten: Map-Erweiterungen, Zollstellen (auch Maximalzahl), Abschlepp-Depot.
- Wirkung der 30-%-Wrackentfernung des Depots.
- Crash-Kosten ab Level 20, Verlust bei Flucht, beide Versicherungs-Staffeln.
- Parameter des Sportwagens; weitere Fahrzeugtypen.
- Truhen-Odds, Anzahl der Mastery-Stufen, Pity-Schwelle.
- Wetterparameter, Häufigkeit der City Events.
- Blaulicht auf dem Boden: Intensität und Reichweite.
- Keil-Warnung auf der Mittelinsel: Position und Deutlichkeit.
- Freischalt-Level für Daily (3), Trials (8) und Casino (10).

---

## Offen: Stadt und Straßennetz

- Freier Straßennetz-Editor bzw. Stadtübersicht: neue Straßen, **weitere Kreisverkehre**,
  Gebäude, Verkehrsinfrastruktur, dekorative Stadtobjekte.
- Die Position einer Zollstelle beeinflusst ihren Wert.
- Nach einem Crash kommt ein Abschleppwagen sichtbar **aus dem Depot-Hof in der Stadt**
  (heute fährt er aus dem Hof am Ring).
- Verkehrsleitsystem als Gegen-Upgrade zum Zoll-Stau.

---

## Offen: Inhaltliche Abwechslung

- Weitere Vehicle Types über Compact, Sports Car und Van hinaus (z. B. Oldtimer; Truhen-Inhalt,
  eigene faire Eigenschaften).
- Zweispurige Kreisverkehre.
- Ghost Racing über Challenge-Links (Leo, 28.09.2026: erstmal nicht).

Diese Inhalte dürfen die Kernmechanik nicht mit Sonderregeln überladen.

