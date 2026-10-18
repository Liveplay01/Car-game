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
  Grafik und Museum. Der Hochzeitskorso (Level 100) ist gebaut. Der Hochzeitskorso (Level 100) ist gebaut.
- **Endowed Progress:** bewusst nicht als Fake-Vorsprung gebaut; echte Vorsprünge gibt es schon.

**Bewusst nicht gebaut (nicht neu vorschlagen):**
- Luck-Bonus aus der Serie auf Casino, Truhen oder Verkehr: bricht die ehrlichen Odds und die Rückzahlquote.
- Set-Boni mit Münzen oder Spawn-Chancen: Skins geben keine Boni (Alben zahlen schon Geld und Rahmen).
- Style Profiling, Session-Bonus, Retry-Bonus, Lucky-Drop-Boost: unsichtbar oder Anreiz zum Dauerspielen.
- Prestige-Vorsprung über ★4 hinaus: Heat übernimmt das, freiwillig und mit Lohn.
- Boss Rush, Daily-Kalender, Pity-Zähler, Sammlungs-Hinweise: gab es schon.

---

## Aus der Langzeit-Liste (Leo, 07.10.2026)

Gebaut am 07.10.: Touren (Haunted Ring, Winter Lights), Saison-Regeln, Achievements (Mutator des Tages und Chill sind am 18.10. wieder entfernt).
Offen, grob nach Wirkung:

- **Co-op-Multiplayer:** zwei bis vier Spieler auf einem Ring in Unlimited, ein Crash trifft alle.
- **Challenge-Builder:** Wetter, Boss, Autozahl und Level selbst einstellen und als Link teilen (kein Freitext, keine Moderation).
- **Neue Verkehrselemente:** Falschfahrer, Traktor, Hochzeitskorso, Radrennen; Parade und Straßenbahn stehen schon offen.
- **Mehr Touren:** weitere Einträge in `TOURS`, z. B. im Frühling und Sommer, jeder mit drei Skins.

---

## Später: Fehlerberichte (Leo, 02.10.2026)

Umami läuft seit 07.10.2026 (`ui/analytics.ts`). Offen ist nur noch GlitchTip als Coolify-Dienst für
Fehlerberichte aus dem Feld. Es braucht wie jeder Dienst einen Absatz in `Web/src/present/legal.ts`, ein
neues `LEGAL_UPDATED` und muss zum Data-Safety-Formular in der Play Console passen.

---

## Wachstum: mehr Spieler erreichen (Leo, 04.10.2026)

Gebaut ist die Einladung per Link (beide bekommen bei Level 5 eine Chest). Was darüber hinaus am meisten
bringen dürfte, grob nach Aufwand und Wirkung:

1. **Ein Discord für das Spiel.** Der Discord-Webhook für „Build with us“ existiert; ein Discord, in dem
   Patch Notes erscheinen (aus `/changelog.json`), macht daraus einen Ort.
2. **Google-Play-Eintrag als Suchmaschine.** Titel, Kurztext und die ersten zwei Screenshots entscheiden,
   nicht das Spiel. Screenshots mit Beschriftung („Tap. Merge. Don't crash.“), ein 15-Sekunden-Video aus dem
   Crash-Material, Stichwörter „roundabout“, „traffic“, „one tap“.
3. **Landeseiten für Suchbegriffe** auf timing.love: „Car Circle Alternative“, „Kreisverkehr Spiel“, „One-Tap-Spiel
   im Browser“. Das Museum liefert schon Text zu Bossen und Wetter; kurze Anleitungsseiten dazu ziehen Suchende an.
4. **Teams statt Einzelner.** Ein Teamcode (wie der Freundescode) für Klassen, Büros, Discords: eine Rangliste
   nur dafür. Schulklassen und Streamer-Communities teilen Links in Gruppen, nicht einzeln. Braucht ein Modul im
   Server (`teams`), kein neues System.
5. **Web Push für die Daily** („Neue Daily: Marathon“). Wirkt auf Wiederkehr, nicht auf Neue; braucht einen
   Push-Dienst im Server und einen Absatz in `legal.ts`. Erst wenn die Zahlen aus Umami zeigen, dass
   Spieler nach Tag 2 gehen.

Die Zahlen kommen aus Umami (Ereignisse `tutorial-done` und `shift` mit Modus, Level und Ausgang): wo Neue
aussteigen, entscheidet, welcher Punkt hier als Nächstes dran ist.

---

## Offener Bug: Geld zurückspulen über die Cloud-Kopie (Leo, 12.10.2026)

**Problem:** Der Spielstand ist die Quelle des Geldes, jede ältere Kopie (Cloud, Export/Import, zweites Gerät) ist ein Rückspulpunkt. Wer sich im Casino freiwillig verliert und dann einen alten Stand lädt, behält das Geld und kann das beliebig wiederholen (gemeldet von einem Spieler: Cloud-Sync entkoppeln, All-in verlieren, Code wieder eintippen).

**Schon gefixt (12.10.2026, `net/cloud.ts`):** Ein Code, den dieses Gerät beendet hat, spult nicht mehr zurück, solange die Cloud-Kopie unverändert ist (`rememberStopped`, `connectCloud`).

**Noch offen:** Export/Import, ein zweites Gerät, das die Cloud-Version zwischendurch ändert, und der Weg über DevTools.

**Lösung (nicht gebaut): Casino-Konto auf dem Server.**
1. Vor jeder Runde meldet das Spiel den Einsatz an den Server (`POST /v1/casino/bet`), der ihn sofort als Minus bucht; nach der Runde meldet es die Auszahlung (Plus). Eine nie gemeldete Wette zählt als verloren.
2. Der Server führt pro Spieler einen Saldo (Summe aller Gewinne und Verluste), nie zurückgesetzt.
3. Der Spielstand trägt den Saldo-Stand vom letzten Speichern. Beim Laden eines älteren Stands (Cloud, Import, anderes Gerät): `Geld += Serversaldo − gespeicherter Saldo`, mindestens 0.
4. Das Casino lässt Einsätze nur mit Server-Konto und Netz zu (sonst ließe sich offline verlieren, ohne es zu melden).
- Neues Server-Modul `Server/src/modules/casino` (Tabelle, Plausibilitätsgrenzen, Tests), Feld im Spielstand, Netzaufruf in `present/casinoFlow.ts`, Datenschutz in `legal.ts` (`LEGAL_UPDATED`), README.
- **Entscheidung nötig:** bricht die Regel „Geld wird lokal berechnet“ für das Casino, und das Casino ist dann nicht mehr offline spielbar.
- **Bleibt offen auch danach:** ein neues anonymes Konto mit altem Export (ohne echte Konten nicht zu verhindern; Mindest-Kontoalter fürs Casino würde es mühsamer machen) und Fälschen mit dem Schlüssel aus dem Bundle.

## Später: Neu-Punkte außerhalb der Segmente (Leo, 15.10.2026)

Das Neu-System (`present/news.ts`, Punkt am Tab und Segment, Marker am Element) kennt nur Progress, Shop und Social.
Neues auf dem Game-Tab (Heat-Pille, neuer Modus), in den Settings oder im Build-Tab hat keinen Platz für den Punkt.
Erst bauen, wenn eine konkrete Neuerung es braucht: dann steht fest, wo der Punkt hin soll.
