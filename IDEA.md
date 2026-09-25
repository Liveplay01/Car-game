# Idea.md – offene Ideen

Stand: 25.09.2026

Diese Datei enthält nur noch Ideen, die **noch nicht umgesetzt** sind. Was gebaut ist,
steht mit seinen Regeln und Startwerten in [ROADMAP.md](ROADMAP.md) (M0–M11) und in
`Game/Sources/GameCore/Config.swift`. Gestrichene Ideen werden hier ebenfalls entfernt
und in der Roadmap vermerkt.

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
    gezeigt (Inselrand, Lichtsignale, schwebende Schilder), erst dann als klassische Anzeige.
    Räumlich, aber leise: Tiefe durch Schatten und kleine Staffelung, kein 3D.
13. **Eine Stadt, mehrere Perspektiven.** Die Tabs sind Blicke auf dieselbe laufende Stadt,
    kein Menü über einem angehaltenen Spiel. Der Ring hört nie auf.

---

## Offen: Look & Feel (M11)

- **Finale Optik:** sehr clean, minimalistisch, Apple-artig, Dark Theme, viel Raum,
  reduzierte Palette, hoher Kontrast, SF Pro, SF-Symbols-artige Icons.
- **Animationen:** Spring-Easing, physisch, keine harten Schnitte, direkte Verbindung
  zwischen Input und Bewegung.
- **Fahrzeugdarstellung final:** Farben und Formen vermitteln Spielinformation, Farbe
  nie allein (Formen, Icons, Muster). Textlabels gibt es als Einstellung "Vehicle labels".
- **Finale Sounds und adaptive Musik als echte Stems:** Combo baut Layer auf (Rhythmus,
  Bass), Verbrecher bringt Sirenen-Impuls, Rush Hour zieht den Beat an, Flow State
  verdichtet den Rhythmus. Perfect Input: kurzer hochwertiger Sound. Takedown in
  Schichten: Kontakt, Metall, Deformation, Reifen, abreißende Teile, Signatur. Das
  Mischpult dafür (`MusicMix`) existiert; es fehlen die Klänge.
- **Haptik spüren und feinjustieren** auf dem iPhone (Muster liegen in `Assets/Haptics`);
  Takedown-Haptik mit der Wucht skalieren.
- **App-Icon** (die Screen-Entwürfe stehen in UI.md, Abschnitt 4).

---

## Offen: Welt als UI (Fortsetzung)

Umgesetzt ist die Basis (ROADMAP.md, "Eine Stadt, ein Ring"). Offen:

- **In der App:** die nativen Tabs (M12) über der gleitenden Kamera, Seiten mit
  durchscheinendem Material statt Vollfläche.
- **Daily Shift als eigene Perspektive** (z. B. anderer Blickwinkel oder Tageslicht) statt
  Splash-Karte.
- **Weitere Schilder im Raum:** Wetter und City Event über dem betroffenen Teil der Stadt
  statt als Zeile in der Inselmitte.
- **Stadtwachstum sichtbar machen:** nach einem Level-Up entsteht ein neues Gebäude mit einer
  kurzen, leisen Bewegung am Rand der Stadt.

## Offen: Balancing (Startwerte stehen, Feinschliff im Playtest)

- Schichtlänge: IDEA sah ~2 Minuten für 15 Autos vor, gemessen sind es 8–35 s. Länger machen oder so lassen?
- Levelkurve für Speed, Density und Weather; Rush-Hour-Werte.
- Kosten: Map-Erweiterungen, Zollstellen (auch Maximalzahl), Abschlepp-Depot.
- Wirkung der 30-%-Wrackentfernung des Depots.
- Crash-Kosten ab Level 20, Verlust bei Flucht, beide Versicherungs-Staffeln.
- Parameter des Sportwagens; weitere Fahrzeugtypen.
- Truhen-Odds, Anzahl der Mastery-Stufen, Pity-Schwelle.
- Wetterparameter, Häufigkeit der City Events.
- Blaulicht auf dem Boden: Intensität und Reichweite.
- Keil-Warnung auf der Mittelinsel: Position und Deutlichkeit.

---

## Offen: Stadt und Straßennetz (v1.1)

- Freier Straßennetz-Editor bzw. Stadtübersicht: neue Straßen, **weitere Kreisverkehre**,
  Gebäude, Verkehrsinfrastruktur, dekorative Stadtobjekte.
- Die Position einer Zollstelle beeinflusst ihren Wert.
- Nach einem Crash kommt ein Abschleppwagen sichtbar **aus dem Depot-Hof in der Stadt**
  (heute fährt er aus dem Hof am Ring).
- Verkehrsleitsystem als Gegen-Upgrade zum Zoll-Stau.

---

## Offen: Motivation (v1.2)


---

## Offen: Inhaltliche Abwechslung (v1.3)

- Krankenwagen.
- Boss-Event / Kopf des Verbrechens.
- Weitere Vehicle Types über Compact, Sports Car und Van hinaus (z. B. Oldtimer; Truhen-Inhalt,
  eigene faire Eigenschaften).
- Tag/Nacht, zweispurige Kreisverkehre, Prestige.

Diese Inhalte dürfen die Kernmechanik nicht mit Sonderregeln überladen.

---

## Offen: Apple-Ökosystem (v1.4)

- **Home-Screen-Widget:** Level, Daily Shift, Personal Best, verfügbare Truhe,
  Stadtstatus, passive Einnahmen. Nicht das ganze Spiel abbilden.
- **Live Activity / Dynamic Island:** nur bei aktiver Criminal-Jagd oder aktivem
  Geldtransporter, nie während jeder Schicht.
- **Action Button:** Start Shift / Daily Shift, bewusst einfach.
- **GameKit:** Bestenlisten und Achievements (aus der Mastery).
- **CloudKit:** Spielstand-Sync.
- Siri Shortcuts, Apple Watch.

---

## Später, falls gewünscht

- **Premium-Truhen gegen Echtgeld** (StoreKit) und Season Pass; vorher rechtliche
  Prüfung der Lootboxen (App Store 3.1.1, Altersfreigaben, Länder wie Belgien).
- **Multiplayer**: Echtzeit oder asynchroner Vergleich; Multiplayer-Skins nur kosmetisch,
  spielbar mit Standard-Skin.
