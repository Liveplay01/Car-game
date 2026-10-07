# Idea.md – offene Ideen

Stand: 04.10.2026

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

## Für Vielspieler und Verzahnung (Leo, 05.10.2026)

Gebaut am 05.10.: Streak Freeze, Unlimited-Stufen und -Marken (Ring, Elite-XP, Titel, Bestenliste), Legendary-Pity,
Rückenwind, **Heat** (freiwillige Schwierigkeit ab Level 50), Bestenlisten **Daily** und **Boss Rush**. Offen:

- **Gauntlet:** Unlimited mit Auswahl: nach jeder Marke (25, 50, 100 …) wählt man 1 von 3 Lauf-Effekten, die nur
  für den Lauf gelten. Eigene Rangliste, damit die reine Unlimited-Liste ehrlich bleibt. Mittel bis groß, braucht Balancing.
- **Teams:** Teamcode wie der Freundescode, Team-Ranking und ein wöchentliches Gemeinschaftsziel mit Truhe für alle.
  Ein neuer Baustein im Dienst (`teams`).
- **Neue Elemente für späte Level:** z. B. Falschfahrer, Traktor oder eine zusätzliche Boss-Runde ab ★5. Regeln,
  Grafik und Museum.
- **Mastery pro Fahrzeug** mit kosmetischen Effekten oder Hupen-Sounds (auch in LOOT.md, „Ideen für später“).
- **Heat verfeinern:** Heat-Stufe als Zusatz auf der Shift-Level-Liste (der Dienst bräuchte ein `heat` im Meta);
  eigene Heat-Auflagen statt nur Stufen (z. B. nur Nebel oder nur dichter Verkehr), wenn Spieler es wünschen.
- **Endowed Progress:** bewusst nicht als Fake-Vorsprung gebaut; echte Vorsprünge gibt es schon.

**Bewusst nicht gebaut (nicht neu vorschlagen):**
- Luck-Bonus aus der Serie auf Casino, Truhen oder Verkehr: bricht die ehrlichen Odds und die Rückzahlquote.
- Set-Boni mit Münzen oder Spawn-Chancen: Skins geben keine Boni (Alben zahlen schon Geld und Rahmen).
- Style Profiling, Session-Bonus, Retry-Bonus, Lucky-Drop-Boost: unsichtbar oder Anreiz zum Dauerspielen.
- Prestige-Vorsprung über ★4 hinaus: Heat übernimmt das, freiwillig und mit Lohn.
- Boss Rush, Daily-Kalender, Pity-Zähler, Sammlungs-Hinweise: gab es schon.

---

## Aus der Langzeit-Liste (Leo, 07.10.2026)

Gebaut am 07.10.: Touren (Haunted Ring, Winter Lights), Mutator des Tages, Saison-Regeln, Chill, Achievements.
Offen, grob nach Wirkung:

- **Wochenligen:** Bestenlisten ohne Reset sind für Neue aussichtslos. Eine Liga mit Wochen-Reset (Bronze bis Diamant,
  Auf- und Abstieg) gibt jeder Woche ein Ziel; Belohnung nur Rahmen und Titel. Braucht ein Modul `leagues` im Dienst.
- **Community-Raid:** alle Takedowns der Spieler füllen eine Woche lang die Leiste eines Riesen-Bosses; ist sie leer,
  bekommen alle eine Truhe. Passt zu den Teams (oben), ein Zähler im Dienst.
- **Fahrprüfung:** 30 bis 50 handgebaute Mini-Szenarien mit 1 bis 3 Sternen für das Mittelspiel (Level 10 bis 40).
- **Co-op-Multiplayer:** zwei bis vier Spieler auf einem Ring in Unlimited, ein Crash trifft alle.
- **Challenge-Builder:** Wetter, Boss, Autozahl und Level selbst einstellen und als Link teilen (kein Freitext, keine Moderation).
- **Neue Verkehrselemente:** Falschfahrer, Traktor, Hochzeitskorso, Radrennen; Parade und Straßenbahn stehen schon offen.
- **Mehr Touren:** weitere Einträge in `TOURS`, z. B. im Frühling und Sommer, jeder mit drei Skins.
- **Mutator auf der Daily-Bestenliste** (eigener Rang je Mutator): braucht eine Änderung im Dienst.

---

## Später: Fehlerberichte (Leo, 02.10.2026)

Umami läuft seit 07.10.2026 (`ui/analytics.ts`). Offen ist nur noch GlitchTip als Coolify-Dienst für
Fehlerberichte aus dem Feld. Es braucht wie jeder Dienst einen Absatz in `Web/src/present/legal.ts`, ein
neues `LEGAL_UPDATED` und muss zum Data-Safety-Formular in der Play Console passen.

---

## Wachstum: mehr Spieler erreichen (Leo, 04.10.2026)

Gebaut ist die Einladung per Link (beide bekommen bei Level 5 eine Chest). Was darüber hinaus am meisten
bringen dürfte, grob nach Aufwand und Wirkung:

1. **Clip-Knopf für die Crashes.** Die Physik (Blechschaden, Stoß, Verkehr reagiert) ist das Material, das
   auf TikTok, Shorts und Reels läuft. `canvas.captureStream` + `MediaRecorder` hält die letzten 8 Sekunden
   fest, ein Tipp teilt sie (mit Wasserzeichen und Link). Wirkt erst, wenn Spieler es auch posten wollen:
   zuerst ein paar eigene Clips auf den Kanälen testen.
2. **Mehr Portale.** CrazyGames läuft; Poki, GameDistribution, Y8, itch.io, Newgrounds und Kongregate nehmen
   Browserspiele auch. Ein Eintrag je Portal, derselbe Build mit eigenem `?portal=`-Schalter nach dem Muster von
   `?crazygames`. Portale bringen Besucher, ohne dass wir sie holen müssen.
3. **Ein Konto bei Reddit, Hacker News und Discord, mit echter Geschichte.** „Show HN: Ein-Tap-Kreisverkehr im
   Browser, ohne Engine und ohne Framework“ und r/WebGames sind die zwei Orte, an denen ein kleines, sauber gebautes
   Browserspiel von selbst Anklang findet. Der Discord-Webhook für „Build with us“ existiert; ein Discord, in dem
   Patch Notes erscheinen (aus `/changelog.json`), macht daraus einen Ort.
4. **Google-Play-Eintrag als Suchmaschine.** Titel, Kurztext und die ersten zwei Screenshots entscheiden,
   nicht das Spiel. Screenshots mit Beschriftung („Tap. Merge. Don't crash.“), ein 15-Sekunden-Video aus dem
   Crash-Material, Stichwörter „roundabout“, „traffic“, „one tap“.
5. **Landeseiten für Suchbegriffe** auf timing.love: „Car Circle Alternative“, „Kreisverkehr Spiel“, „One-Tap-Spiel
   im Browser“. Das Museum liefert schon Text zu Bossen und Wetter; kurze Anleitungsseiten dazu ziehen Suchende an.
6. **Teams statt Einzelner.** Ein Teamcode (wie der Freundescode) für Klassen, Büros, Discords: eine Rangliste
   nur dafür. Schulklassen und Streamer-Communities teilen Links in Gruppen, nicht einzeln. Braucht ein Modul im
   Server (`teams`), kein neues System.
7. **Web Push für die Daily** („Neue Daily: Marathon“). Wirkt auf Wiederkehr, nicht auf Neue; braucht einen
   Push-Dienst im Server und einen Absatz in `legal.ts`. Erst wenn die Zahlen aus Umami zeigen, dass
   Spieler nach Tag 2 gehen.

Die Zahlen kommen aus Umami (Ereignisse `tutorial-done` und `shift` mit Modus, Level und Ausgang): wo Neue
aussteigen, entscheidet, welcher Punkt hier als Nächstes dran ist.
