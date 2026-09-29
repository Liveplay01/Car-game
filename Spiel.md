# Spiel.md – Car Game: Spielmechanik, Funktionen & Status

Stand: 29.09.2026 · Übersicht über das ganze Spiel. Seit dem 27.09.2026 ist Car Game ein **Browserspiel** (`Web/`); die frühere Swift-/iPhone-Schiene ist seit dem 29.09.2026 gelöscht. Maßgeblich sind `Web/src/core/config.ts` (alle Zahlen) und [Web/README.md](Web/README.md) (Befehle, Aufbau, Deployment). Regeln und Grundlagen stehen in [FOUNDATION.md](FOUNDATION.md), die Truhen in [LOOT.md](LOOT.md). Weicht dieses Dokument vom Code ab, gilt der Code.

---

## 1. Kernidee & Inspiration

**Inspiration:** Browserspiel *Car Circle* (Shoom Games) – One-Tap-Timing: Autos per Tap in einen rotierenden Kreisverkehr einfädeln, ohne zu kollidieren. Keine Lenkung, kein Gas, keine Bremse.

**Das Spielprinzip:** Der Spieler packt seine Autos in **Lücken zwischen Bot-Autos**. Im Ring sind deshalb immer mindestens 3–5 Bots (siehe 7).

**Unsere Version:** Gleiche Grundmechanik, dazu aktive Sondertypen im Verkehr:
- **Verbrecher-Pickups** (müssen aktiv per Polizeiauto gerammt werden), alle 15 Level als **Syndikats-Konvoi** mit Boss
- **Geldtransporter** (sollen unbeschadet entkommen, aber **nicht** von Polizei berührt werden)
- **Lkw** (zahlen an Mautstellen), **Tanklaster** und **Militär-Trucks** (explodieren)
- dazu **Wetter**, **Nacht** und **City Events**, die den Verkehr oder die Sicht verändern

**Meta:** Geld → Upgrades kaufen, Kreisverkehr im Street Builder ausbauen (Zufahrten, Module), Truhen mit Skins öffnen, Trials und Quests abhaken. Die Stadt wächst sichtbar mit.

**Plattform:** Browser auf Handy (Hochformat, einhändig) und Desktop, installierbar als PWA, offline spielbar nach dem ersten Besuch. Spielsprache nur Englisch, Projektdokumente auf Deutsch.

---

## 2. Spielmodi, Schicht & Level

### Spielmodi (Wischen auf dem Wartebildschirm, `←` / `→`)

| Modus | Kurz | Regeln |
|---|---|---|
| **Shift** | „Clear the level, move up“ | die Karriere: feste Autozahl pro Schicht, Level, Geld (siehe unten) |
| **Unlimited** | „Endless · until you crash“ | spielt auf Level 3, ohne Autozahl, bis zum ersten Verlust. Nach der 20-s-Rampe alle 25 s +1 Auto Dichte (bis +8), Tempo +8 % pro Minute (bis 160 %). Lohn 20 pro geschicktem Auto, keine Crash-Kosten. Rekorde: Punkte und Autos |
| **Mayhem** | „12 cars · aim for the tankers“ | Crashes sind das Ziel: 12 Autos auf Level 6, +3 Dichte, 1,1 s Nachladen zwischen den Autos, keine Polizei, keine Verbrecher, kein Lohn. 34 % Lkw, davon 60 % Tanklaster, bis zu 4 Militär-Trucks (erster nach 9–15 s, dann alle 6–10 s). Jedes neue Wrack gibt **Flammen**; ein Folge-Crash innerhalb von 1,5 s verlängert die Kette (Flammen = Kettenlänge, höchstens 10, Lkw ×2). Wracks treffen nur, solange sie noch fliegen. Die Schicht endet, wenn die letzte Kettenreaktion ausgebrannt ist. Rekorde: Flammen und längste Kette |
| **Multiplayer** | „Up to 4 friends · last one standing“ | siehe 11 |

Die Gefahrenstufe *Normal Duty / High Alert* wurde am 26.09.2026 **entfernt** und durch die Modi ersetzt.

### Schicht & Level (Modus Shift)

- **Keine Uhr.** Eine Schicht besteht aus einer festen Zahl Autos, die alle in den Verkehr müssen; danach ist sie geschafft.
- **Level:** Jede geschaffte Schicht = Level +1, eine verlorene wird **auf demselben Level wiederholt** (neu ausgeloste Autozahl).
- **Autos pro Schicht:** Level 1 ≈ 10 (8–12), +1,1 pro Level, je Versuch ±2, höchstens 30.
- **Level 1 ist bewusst machbar** (weniger und langsamere Autos, größere KI-Lücken, längere Jagd, mehr Polizei); ab Level 5 (`hardLevel`) gelten die vollen Werte.
- **Tempo:** ab Level 5 +1 % pro Level, bis +40 %. **Dichte:** ab Level 6 zusätzliche Autos (bis +6), KI fährt enger auf (bis 0,06 s), bleibt länger (Extrarunden, ab Level 12 mindestens zwei Ausfahrten).
- **Rush Hour** in den letzten 4 Autos: Tempo auf 135 %, Dichte +2, Punkte ×2. Dichte und Tempo steigen zudem über die ersten 20 s: Wer auf die perfekte Lücke wartet, bekommt mehr Verkehr, keinen leichteren.
- **Fließender Schichtwechsel, kein Ergebnis-Screen:** Das Ergebnis steht in derselben oberen Karte, der Ring schickt einen Lichtlauf herum. Nach dem Nachklang wird es von selbst zum Wartebildschirm der nächsten Schicht, deren Verkehr schon fährt; das Tempo gleitet zum neuen Start-Tempo, die Autos der nächsten Schicht rollen von hinten in die Warteschlange. Ein Tap startet jederzeit. Kein Freeze, kein Replay, keine Einblendung.
- **Kein Pause-Screen:** Wer den Browser-Tab verlässt, friert die Welt ein; beim Zurückkommen wird eingezählt.
- **Kein Tap-Cooldown:** Das nächste Auto steht ≈ 0,3 s nach dem Tap an der Haltelinie; ein früher Tap wird gehalten. Eigene Autos bewerten sich nicht gegenseitig, schnelles Tippen gibt also keine geschenkten Tight Fits.
- **Kein verschluckter Tap:** Das nachrückende Auto fährt weich an und bremst weich an der Haltelinie (Bremslichter an). Kommt der Tap zu früh, leuchtet kurz die Lichthupe auf, das Auto rollt ohne Stocken durch die Linie in sein Einfädeln, sobald zum vorderen eigenen Auto mindestens 4 Einheiten Platz sind.
- **Taps mit Zeitstempel:** Gezählt wird der Moment von `pointerdown`, nicht der nächste Frame.
- **Schichtlänge – entschieden: kurz lassen** (Leo, 26.09.2026). Je nach Level 8–75 s. Kurze Schichten tragen das „Nur noch eine!“.

---

## 3. Game-Over-Regeln (Hard vs. Soft Fail)

| Ereignis | Konsequenz |
|---|---|
| **Verbrecher-Pickup entkommt** (Countdown abgelaufen) | **Hard Fail** – Schicht verloren (ab Level 20 zusätzlich 350 Verlust) |
| **Normales Auto crasht** | **Hard Fail** (`maxStrikes = 1`; ab Level 20 kostet der Crash Geld) |
| **Polizeiauto crasht** | Soft Fail: kostet 250 Punkte & Combo, **3 erlaubt** (`maxPoliceCrashes = 3`, Upgrade *Backup* +1 pro Stufe), der 4. = Hard Fail |
| **Militär-Truck geht hoch** | Hard Fail („KABOOM“, dasselbe Level noch einmal); in Mayhem das Finale |
| **Folgeunfälle im Verkehr** | Kosten standardmäßig **keine** Strikes (umschaltbar); wer in einen sichtbaren Unfall einfädelt, bleibt 1 s verantwortlich |

In Mayhem beendet kein Crash die Schicht, in Unlimited beendet ihn der erste Hard Fail.

**Verlorene Schicht ohne Game-Over-Screen:** Der Crash, der die Schicht beendet, läuft kurz in Zeitlupe, die Kamera tritt etwas zurück, der Inselrand flackert rot. Der Verkehr fährt weiter. Kurz nach dem Crash startet ein Tap sofort den nächsten Versuch auf demselben Level. Wer nicht tippt, sieht das Ergebnis in der oberen Karte. Reduce Motion: keine Zeitlupe, kein Zurücktreten.

**Crashes sind echte Physik** (`Web/src/core/crash.ts`, `drivers.ts`): Stoß-Impuls am Kontaktpunkt, 30 % Rückprall, Reifenreibung, reagierender Verkehr mit Kettenunfällen (Fahrer reagieren nach 0,5–1,5 s), Blechschaden mit Beulen und abreißenden Teilen. Keine geskripteten Animationen.

---

## 4. Bewertung: Combo, Präzision & Flow

Jede Einfädelung wird nach dem engsten Abstand (surface to surface) bewertet:

| Stufe | Regel | Punkte | Combo |
|---|---|---|---|
| **Tight Fit** | < 0,12 s | 200 × Mult. | +2 |
| **Near Miss** | < 0,2 s, kein Tight Fit | 125 × Mult. | +1 |
| **Perfect Input** | Lücke vorne/hinten fast gleich (≤ 25 % Abweichung), beide ≥ 0,2 s, zusammen ≤ 2 s | 150 × Mult. | +1 |
| **Clean** | alles andere | 100 × Mult. | +1 |
| **Crash** | | −250 (nie unter 0) | Reset |
| **Cut-off** (optional, Default aus) | Hintermann < `sloppyWindow` | – | Reset, kein Strike |

- **Combo-Multiplikator:** 0–4 ×1 · 5–9 ×1,5 · 10–19 ×2 · 20+ ×3.
- **Perfect Chain:** zählt Perfect Inputs, Near Misses, Tight Fits, Takedowns und gerettete Transporter in Folge; eine normale saubere Einfädelung, ein Cut-off oder ein Crash beendet sie. Keine eigene Anzeige.
- **Flow State:** ab Kette 5 – Ring-Glow, Sound-Layer, die Stadt atmet mit. Nur Feedback, kein Modus, kein Text.
- **Schichtabschluss:** +1.000 Punkte.
- **Perfect Run:** geschaffte Schicht ohne Crash (Polizei eingeschlossen) und ohne Cut-off: **+1.500 Punkte, +25 % Lohn** (nicht in Mayhem).
- **Rekord-Geist:** Bestzeit pro Level (pro Auto); live als ±Sekunden im HUD, „NEW BEST TIME“ beim Übertreffen.
- **Reifenspuren** nach einer gekonnten Einfädelung (nur Web).

---

## 5. Verbrecher-Bots & Polizei

- **Verbrecher halten sich nicht an die Verkehrsordnung** *(Leo, 27.09.2026)*: Der Pickup rollt ohne Anhalten an die Linie und quetscht sich in die erste Lücke, in der er nicht crasht (`criminalEntryGap` = 0,05 s); nur ein Stau direkt an seiner Einfahrt hält ihn auf.

| Element | Details |
|---|---|
| **Fahrzeugtyp** | Pickup-Truck (violett, offene Ladefläche, Countdown-Ring) – sofort erkennbar |
| **Nur stoppbar mit** | Polizeiauto (blau, weißes Dach, Lichtbalken mit Blaulicht) |
| **Anteil Polizei in der Schlange** | 20 % (Level 1: 30 %; *More Patrols* +3 %/Stufe; Police Operation +15 %) |
| **Auftritt** | erster Verbrecher nach 4–8 s, Pause danach 10–16 s; keiner, wenn die Jagd das Schichtende überdauern könnte |
| **Warnung** | 2 s vorher: Sirene und pulsierender Keil in Verbrecher-Farbe auf dem Inselrand in Richtung der Zufahrt – ohne Beschriftung |
| **Countdown** | ab Einfahrt Level 1: 16 s, Level 5: 12 s, −0,25 s pro Level bis 8 s (*Longer Pursuit* +1 s/Stufe). Sichtbar als Ring um den Pickup und als Sekunden in der Inselmitte |
| **Entkommt er** | Schicht verloren (Hard Fail) |
| **Takedown** | 1.000 Pkt × Multiplikator × Rush Hour, kurze Slow-Mo, Soft-Body-Deformation, Splitter in Polizeifarben, „BUSTED!“, Combo bleibt |
| **Zählt nicht** | wenn der Verbrecher selbst ins Polizeiauto fährt |
| **Einsatzfahrt (Dispatch)** | Dispatch-Button, `D`, `E` oder Rechtsklick: das nächste Auto wird Polizei, Combo × 0,5 (*Dispatch Radio* +10 % pro Stufe zurück) |
| **Verfolgung im Ring** | Polizeiauto direkt hinter dem Pickup jagt mit bis ×1,4 Tempo (*Interceptor* +0,1/Stufe) und rammt ihn |
| **Masse** | Pickup = 2,5× Auto. **Was beschädigt ist, fährt nicht mehr:** Jeder Treffer ohne Takedown macht auch den Pickup zum Wrack – die Jagd endet ohne Punkte und ohne verlorene Schicht |
| **Blaulicht** | nur Blau (deutscher Lichtbalken), LED-Doppelblitze, weicher Schein auf der Straße, jedes Polizeiauto im eigenen Takt |

### Neu seit 28.09.2026 (Werte in `config.ts`)

- **Vier Syndikats-Bosse** im Wechsel alle 15 Level: Convoy (15, zwei Eskorten dahinter), Getaway Driver (30, keine Eskorte, 0,7× Zeit), Armoured Boss (45, steckt den ersten Rammstoß weg, zweites Polizeiauto nötig), Phantom (60, Blackout, fährt ohne Licht). Ab Runde 2 (75+) je +1 Eskorte (max. 3) und ×0,9 Zeit. Besiegte Bosse öffnen ein **Rematch** unter Progress → Bosses (eine Runde härter, zahlt einmal 6.000–12.000).
- **Legendary Shifts:** ab Level 25, 6 % pro Karriere-Schicht, nie auf Boss-Leveln oder in der Daily. Regeln: Gridlock, Dragnet, Heavy Load, Dark Storm, Zero Tolerance. Geschafft: Premium-Truhe, Skins nach 1/5/15.
- **Weekly Elite:** eine Schicht pro Woche (ab Montag) für alle, per Seed. Progress → Quests. Beliebig oft spielbar, zahlt einmal pro Woche 6.000 + Premium-Truhe.
- **Prestige:** ab Level 50 (Progress → Records). Zurück auf Level 1; Geld, Upgrades, Straßen, Sammlung bleiben. Verkehr pro Rang 10 Level härter (max. 40). ★ vor dem Level, Skins bei ★1–3. Nur Optik, kein Bonus.
- **Krankenwagen:** ab Level 8, 40 % pro Schicht, angekündigt, drängt sich rein wie der Verbrecher und fährt fast eine Runde. Die Straße vor ihm (120 Einheiten) muss frei bleiben: wer dort einfädelt, verliert Combo und Chain. Frei durch: +300, Chain +1.

### Syndikats-Konvoi (Boss-Level, nur Web)

- **Jedes 15. Level** (15, 30, 45 …) ist der erste Verbrecher der Schicht der **Boss** des Syndikats. Er kommt früh (nach 1,5–3 s), mit 3 s Warnung („SYNDICATE CONVOY“), und bleibt 1,5-mal so lange im Ring wie ein normaler Verbrecher.
- **Zwei gepanzerte Begleitfahrzeuge** fädeln direkt hinter ihm ein. Ein Polizeiauto muss genau in die Lücke zwischen Boss und Begleitern getimt werden; ein Treffer auf einen Begleiter ist ein normaler Crash.
- **Busted:** Das gestohlene Geld kommt zurück (3.000 + 200 × Level) und der Boss zählt als Trophäe in *Records*.

---

## 6. Geldtransporter-Mechanik

| Element | Details |
|---|---|
| **Aussehen** | gepanzerter Kastenwagen in Panzergrün, Goldmünze, Goldstreifen, Rundumleuchte |
| **Spawn** | erster nach 8–14 s, Pause danach 15–25 s (*Cash Route* −0,4 s pro Stufe; jede Zusatz-Zufahrt −15 %); Warnung 2 s vorher als pulsierender Keil in Transporter-Farbe auf dem Inselrand |
| **Ziel** | Unbeschadet die markierte Ausfahrt nehmen → **450 Geld** (× Rush Hour) |
| **Sperrzone** | 130 Einheiten (≈ 5 Autolängen) um den Transporter, auf dem Ring als Bogen sichtbar |
| **Polizei in Sperrzone** | Transporter wird **beschlagnahmt** → kein Geld, keine Strafe |
| **Normales Auto in Sperrzone** | **Abschirmen** → +50 Bonus pro Auto |
| **Transporter crasht** | Wrack, Geld weg („LOST“); er bremst und crasht wie jeder andere Fahrer (Masse 1,6) |
| **Countdown** | 10 s, dann nimmt er seine Ausfahrt; ist das letzte Auto vorher drin, sofortige Auszahlung |
| **Double Run** (Upgrade) | 4 % pro Stufe Chance auf einen zweiten Transporter direkt danach |

Kein Transporter in Mayhem und im Multiplayer.

---

## 7. Verkehr: Bots im Ring, KI, Lkw & Fahrzeugtypen

### Bots im Ring (Playtest Leo, 24.09.2026)

Der Spieler soll Lücken treffen, keine Kolonnen bilden.

- **`minRingBots`:** Level 1–4: 3 · ab Level 5: 4 · ab Level 9: 5; ein größerer Kreisverkehr skaliert mit. Jede Schicht startet mit mindestens so vielen Bots.
- **Halteregel:** Ein Bot fährt erst raus, wenn danach noch genug drin sind, sonst dreht er eine weitere Runde. Entscheidung 1,5 s vor der Ausfahrt. Fehlt ein Bot, kommt sofort Ersatz.
- **Dichte zählt nur KI-Autos,** nicht die des Spielers.
- **Stauwellen lösen sich auf:** Ohne Wrack und ohne Modul-Schlange darf ein Bot trotz Minimum raus; Rückfallebene nach 20 s Bremsen.
- **Die KI wartet nur bei Störungen nahe ihrer Einfahrt** (bis 2,5 s voraus, 1,5 s zurück), fädelt nur mit sicherer Lücke ein und verursacht nie einen Crash.
- **Fließender Verkehr ab Level 6:** Bots fahren ohne Anhalten ein (Rolling Merge).
- Neue Autos erscheinen außerhalb des Bildes und fahren heran.

### Lkw

22 % des normalen Verkehrs (*Freight* +1,5 %/Stufe); Länge 36 (Auto 24), Masse 2,2, heller Kofferaufbau. Zahlen an Mautstellen.

### Sprengstoff: Tanklaster & Militär-Truck (Leo, 27.09.2026)

- **Tanklaster** (ab Level 4, 18 % der Lkw): fährt wie ein Lkw (silberner Tank, orange Bänder, Gefahren-Raute), zahlt Maut. **Wird er zum Wrack, explodiert er:** alles im Umkreis von 66 wird zum Wrack und weggeschleudert, ein Tanklaster in Reichweite geht mit hoch (Kettenreaktion).
- **Militär-Truck** (ab Level 7, 30 % der Schichten, einer pro Schicht): angekündigt wie der Transporter, dreht 12 s seine Runden und hat eine **Sperrzone** (84 lang, rot pulsierend). **Fädelt ein Auto in die Zone ein oder trifft irgendetwas den Truck, geht die Bombe hoch:** alles auf der Straße fliegt in die Luft, die Schicht ist verloren. Die Zone zählt für KI und Bots wie ein Auto; solange er fährt, zählt er als einer der Mindest-Bots.
- **Der Rauch der Bombe ist der Übergang:** Er füllt das Bild, dahinter wird ein frischer Kreisverkehr aufgebaut.
- **Explosionen:** Blitz, Feuerball, Druckwelle, brennende Trümmer, Screenshake mit Zoom-Punch, eigene Sounds (`explosion`, `detonation`). Reduce Motion: nur Blenden, kein Shake.
- **Die Karte leidet:** verbrannter Boden, Bäume und Häuser in Reichweite fangen Feuer und bleiben eine Weile verkohlt.

### Fahrzeugtypen des Spielers (freischaltbar, LOOT.md)

Ein Typ hat Spielwerte, ein Skin nur Aussehen – **anders, nicht besser**. Jeder freigeschaltete Typ taucht gelegentlich in der eigenen Schlange auf.

| Typ | Anteil | Eigenschaften |
|---|---|---|
| **Compact** (Rare) | 12 % | sehr kurz (18), leicht (0,7), fädelt 15 % **langsamer** ein |
| **Sports Car** (Epic) | 15 % | kürzer (21), leichter (0,8), fädelt 20 % schneller ein |
| **Van** (Epic) | 12 % | lang (29), schwer (1,5), fädelt 10 % schneller ein |

---

## 8. Wetter, Nacht & City Events

**Erste Begegnung (Leo, 29.09.2026):** Bringt eine Schicht eine Bedingung, in der der Spieler noch nie gespielt hat, erklärt eine Karte unter der oberen Leiste auf dem Wartebildschirm, was sie ist und was sich ändert („New · Roadworks“ + ein Satz, `INTRO_TEXT` in `present/strings.ts`). Sie kommt einen Moment nach dem Wartebildschirm, blockiert nichts und geht mit dem Start. Erst dann zählt die Bedingung als gesehen (Museum, `sightings`), die Karte erscheint also genau einmal. Ist der Bildschirm zu niedrig, zeigt sie nur den Namen und die Kurzzeile aus dem Museum. Eine neue Bedingung braucht ihren Satz, sonst bricht der Build ab.
Spezialfahrzeuge und Bosse bekommen beim ersten Auftauchen in einer laufenden Schicht einmal einen Hinweis unten („New · Gas Tanker · Wreck it and it explodes“, die Kurzzeile aus dem Museum). Gesehen zählt überhaupt nur, was in einer laufenden Schicht vorkommt, nicht der Verkehr hinter den Tabs, und erst nach dem Tutorial.

### Wetter (pro Schicht ausgelost)

Chance ab Level 6: +2 % pro Level, höchstens 40 %. Vorher auf dem Wartebildschirm angekündigt.

| Stufe | ab Level | Wirkung |
|---|---|---|
| Clear | 1 | – |
| Light Rain | 6 | Reifen haften schlechter (Wracks rutschen weiter), Fahrer reagieren etwas später |
| Heavy Rain | 12 | dazu +1 Auto Dichte, Fahrer bremsen schwächer |
| Storm | 18 | dazu +2 Dichte, KI drängelt (Lücken ×0,8) |
| Extreme | 25, selten | Sturm plus kurze Böen, die das Tempo schwanken lassen |

Fair bleibt es: Das Tap-Timing ändert sich nie; Sonderfahrzeuge, Warnungen und Countdown-Ringe liegen immer über den Wettereffekten.

### Nacht und Blackout (nur Web)

- **Nacht** ab Level 10: Chance 3 % pro Level ab Level 10, höchstens 20 %. Die Stadt wird dunkel, man fädelt nach den Lichtern der Autos ein.
- **Blackout** ab Level 20: 35 % der Nächte, auch die Straßenlaternen sind aus; nur Scheinwerfer und Rücklichter zeigen den Verkehr.
- **Nur das Bild ändert sich, nicht die Regeln.** Dafür zahlt die Schicht mehr: Nacht ×1,1, Blackout ×1,25 Lohn.

### City Events (höchstens eins pro Schicht, ab Level 4 mit 25 % Chance, vorher angekündigt)

| Event | Wirkung |
|---|---|
| Roadworks (Baustelle) | ein Ringabschnitt fährt langsamer (×0,6) |
| Road Closure (Sperrung) | eine KI-Zufahrt ist zu, die anderen bekommen ihren Verkehr |
| Concert Traffic | eine Zufahrt schickt eine Welle dicht folgender Autos (+2 Dichte, KI-Spawns doppelt so schnell) |
| VIP Convoy | drei KI-Autos fahren eng hintereinander ein: lange Lücke davor und dahinter |
| Police Operation | +15 % Polizei in der Schlange |

Events ändern Tempo, Dichte oder Lücken – nie die Regeln.

---

## 9. Wirtschaft & Meta-Progression

### Geld verdienen

| Quelle | Betrag |
|---|---|
| Schichtabschluss | 150 + 30 × Level (*Overtime* +4 %/Stufe, +10 % pro Zusatz-Zufahrt, Nacht ×1,1 / Blackout ×1,25) |
| Unlimited | 20 pro geschicktem Auto |
| Geretteter Transporter | 450 (Rush Hour ×2) |
| Abschirm-Bonus | 50 pro Auto in der Sperrzone |
| Perfect Run | +25 % Lohn |
| Boss busted | 3.000 + 200 × Level |
| Daily Shift | 300 × Serie (bis 7 Tage → 2.100) + Event Chest |
| Quests (3 pro Tag) | 250 / 350 / 500 je Quest |
| Trials | 1.500 – 5.000, je einmal (siehe 11) |
| Toll Booth | 6 pro Lkw; Speed Camera 3 pro Auto über dem Limit – **nur in den ersten 60 s** einer Schicht |
| Daily Login | 30 pro Toll Booth pro Tag Abwesenheit, höchstens 3 Tage |
| Werbung (Platzhalter) | bis zu 3 × am Tag Geld: 2.000 + 250 × (Level − 1) |
| Duplikate aus Truhen | Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000 |
| Alben (voller Satz, einmalig) | 5.000 – 40.000 (siehe 10) |

Geld bleibt auch aus verlorenen Schichten. Der Kontostand steht immer links in der oberen Karte und zählt schon während der Schicht hoch.

### Geld ausgeben

| Bereich | Was | Preis |
|---|---|---|
| **Upgrades** (Build → Upgrades) | 13 Upgrades, 86 Stufen | erste Stufe 2.600 × Faktor, jede weitere ×1,5 |
| **Zufahrten** (Build → Street Builder) | 5.–8. Arm; je Arm Ring +18 breiter, +25 % Verkehr, Transporter 15 % früher, +10 % Lohn | 32.500 / 65.000 / 130.000 / 260.000 = **487.500** |
| **Module** (Street Builder) | Toll Booth, Speed Camera, Tow Depot auf 6 festen Modulplätzen | 10.400 / 15.600 / 13.000 |
| **Truhen** (Shop) | Standard, Premium | 26.000 / 52.000 |

Abreißen (Zufahrten und Module) ist möglich, **nichts wird erstattet.** Die eigene Zufahrt und die 4 Start-Zufahrten bleiben.

### Upgrades (kaufbar, pro Stufe)

| Upgrade | Wirkung pro Stufe | Stufen | Erste Stufe |
|---|---|---|---|
| More Patrols | +3 % Polizeiautos in der Schlange | 10 | 2.600 |
| Longer Pursuit | +1 s Verbrecher-Countdown | 8 | 3.100 |
| Quiet Streets | 10 % der Schichten ohne Verbrecher | 5 | 3.900 |
| Interceptor | Polizei jagt 10 % schneller im Ring | 5 | 3.900 |
| Dispatch Radio | Einsatzfahrt behält 10 % mehr Combo | 5 | 3.100 |
| Backup | +1 Polizei-Crash pro Schicht | 3 | 7.800 |
| Cash Route | Transporter 0,4 s früher & öfter | 8 | 2.600 |
| Overtime | +4 % Schichtlohn | 10 | 2.600 |
| Freight | +1,5 % Lkw (mehr Maut, dichterer Verkehr) | 8 | 2.600 |
| Quick Recovery | Verkehr beschleunigt 20 % stärker (schneller wieder auf Tempo nach Unfällen) | 5 | 3.100 |
| Double Run | +4 % Chance auf zweiten Transporter | 5 | 3.900 |
| Insurance* | −15 % Crash-Kosten (Stufe 7 = 100 %) | 7 | 5.200 |
| Robbery Insurance* | −15 % Verlust bei Flucht (Stufe 7 = 100 %) | 7 | 5.200 |

\* freigeschaltet ab Level 20.

### Risiko & Versicherung (ab Level 20)

Bis Level 19 sind Fehler kostenlos. Ab Level 20: Der Crash, der die Schicht beendet, bzw. ein Polizei-Crash kostet nach Wucht **60 / 120 / 200**; ein entkommener Verbrecher **350** zusätzlich zur verlorenen Schicht. Folgeunfälle kosten nichts, Unlimited kostet nie. Kosten kommen vom Verdienst der Schicht, dann vom Konto – **nie ins Minus.**

### Casino (Shop → Casino, ab Level 10)

Crash, Slots, Skin-Upgrade und Doppelt oder nichts, nur mit Spielgeld; Chancen und Rückzahlquoten stehen offen im Spiel und in [LOOT.md](LOOT.md) („Casino“), `npm run sim:casino` prüft sie. Es gibt keine kaufbare Währung und keine Truhen gegen Echtgeld (CLAUDE.md). Das Casino öffnet leise mit Level 10; nichts im Spiel lenkt dorthin.

**Darstellung (Leo, 29.09.2026):**
- **Erst die Enthüllung, dann das Geld:** Die Regeln verbuchen eine Runde sofort (fair beim Neuladen). Geld-Chip, Tagessaldo und Verlauf zeigen das Ergebnis aber erst mit der Enthüllung (`Wallet` in `present/casino.ts`). Der Einsatz fliegt als Münzen vom Chip auf die Bühne, ein Gewinn fliegt zurück und zählt dort hoch.
- **Gewinnstufen nach Vielfachem des Einsatzes, in allen Spielen gleich** (`casinoWinTiers`: 2 · 10 · 40 · 150): mehr Münzen, dann Konfetti, dann Strahlen und ein Stoß, dann ein Goldblitz. Ein gewonnener Skin bekommt mindestens Konfetti.
- **Pro Spiel:** Crash lehnt die Kamera mit dem Multiplikator bis 8 % ans Auto und zählt den Gewinn hoch. Slots verwischen schnelle Walzen, Gewinnsymbole hüpfen nacheinander, die Gewinnlinie zeichnet sich, ein Verlust dunkelt kurz ab. Beim Skin-Upgrade fliegen die Einsätze in den Topf und zerspringen bei Verlust, die Nadel zieht einen Schweif. Bei Doppelt oder nichts wächst ein Münzstapel mit jeder Verdopplung und kippt bei Verlust.
- **Eigene Klänge,** synthetisiert in `audio/player.ts`: Walzenstopp, Münzklimpern, Nadel, Crash-Zähler, Münzwurf und -landung, Chips, Splittern.
- **Ehrlich bleibt es:** keine vorgetäuschten Beinahe-Gewinne, kein Jubel bei Verlust, jede Enthüllung überspringbar, Reduce Motion zeigt nur Zählen und Blenden.

### Freischaltungen und einmalige Hinweise (29.09.2026)

Ein neuer Spieler trifft die Systeme nacheinander (`core/unlocks.ts`, Werte in `config.ts`):

| Was | Ab | Wie es sich zeigt |
|---|---|---|
| Daily Shift (und Serie) | Level 3 | Hinweis „New · the Daily Shift …“; vorher sagt die Quest-Zeile, ab wann |
| Trials (Progress) | Level 8 | Hinweis „New · Trials in Progress …“; vorher ist das Segment blass und sagt beim Tippen, ab wann |
| Casino (Shop) | Level 10 | ohne Hinweis; vorher ist das Segment blass |

Wer ein System schon vorher benutzt hat, behält es. Einmalige Hinweise (`hints` im Spielstand): nach Level 3 bittet das Spiel den Browser, den Speicher dauerhaft zu behalten (`storage.persist()`), und schlägt die Installation vor (iPhone: „Zum Home-Bildschirm“); nach Level 5 zeigt der Game-Tab bis zum ersten Moduswechsel „Swipe for more modes“; nach Level 12 empfiehlt es einen Export, solange der Speicher nicht geschützt ist. Meldungen kommen nacheinander, jede in ihrer eigenen Zeile (`present/notices.ts`).

### Street Builder & Module

- **Ziehen und Ablegen** aus der Palette auf leuchtende Steckplätze (16 Plätze, Mindestabstand 2, Vollausbau 8 Zufahrten); fehlt Geld, wackelt es und der Preis wird rot.
- **Abreißen:** erster Tipp markiert, zweiter reißt ab.
- **Toll Booth:** Lkw zahlen, der Abschnitt staut (Zone 150 Einheiten, Tempo ×0,55). Der Stau behindert Polizei → Verbrecher entkommen leichter.
- **Speed Camera:** kurze, scharfe Zone (44 Einheiten), alle bremsen (×0,7); zahlt nur über 108 % Grundtempo.
- **Tow Depot:** Wracks in seiner Zone (180 Einheiten) verschwinden 30 % schneller; nach einem Crash fährt kurz ein Abschleppwagen hin.
- **City Evolution:** um den Kreisverkehr wachsen mit Level, Zufahrten und Modulen Stadtblöcke, Bäume und Infrastruktur – rein Darstellung.

---

## 10. Sammeln: Truhen, Skins, Mastery, Alben

Details und alle Item-Listen: [LOOT.md](LOOT.md) (Liste im Code: `Web/src/core/loot.ts`).

- **Nur Aussehen.** Kein Skin gibt einen Spielvorteil. Sonderfahrzeuge bleiben an der **Form** erkennbar, nicht an der Farbe.
- **69 Items:** 46 Car Skins (davon 7 nur über Daily-Serie und Saison), 20 Map Skins, 3 Fahrzeugtypen.
- **Skins mischen:** bis zu **5 Car Skins** gleichzeitig; **jedes Fahrzeug** im Level trägt einen davon, fest pro Fahrzeug. Ein Map Skin.
- **Map Skins** färben den Boden der Stadt, tönen die Mittelinsel, säumen die Straßen mit eigenen Pflanzen und bringen ein **Herzstück** mit Animation.
- **Car Skins:** Farben, Rennstreifen, zweifarbige Dächer, **Shiny** (Lichtstreif) und **Glitter** (Funkeln).

### Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Standard | Shop (26.000), Werbung (3/Tag), Mastery Stufe I | 70 % | 22 % | 7 % | 1 % |
| Premium | Shop (52.000), Mastery Stufe II/III | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt | Mastery „Crime Fighter“ | 50 % | 30 % | 15 % | 5 % |
| Event | jede geschaffte Daily Shift; 15 % nach jeder geschafften Schicht mit City Event | 40 % | 35 % | 20 % | 5 % |

- **Odds immer sichtbar**, **Pity:** spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic.
- **Kein Echtgeld.** Werbung und Käufe sind Platzhalter.
- **Öffnung „splashy, fruity“:** Squash & Stretch, Splash-Blobs, Konfetti, Strahlen, Jelly-Pop; Legendary mit Goldregen. Reduce Motion nur Blende.

### Mastery

Acht Ziele mit je drei Stufen zählen über die ganze Laufbahn; beim Erreichen erscheint ein Toast, die Truhe liegt im Shop. Der Stand ist unter **Progress → Mastery** einsehbar.

| Ziel | Stufen |
|---|---|
| Perfect Timing (Perfect Inputs) | 25 / 150 / 600 |
| Tight Spots (Tight Fits) | 25 / 150 / 600 |
| Close Calls (Near Misses) | 50 / 300 / 1.200 |
| Long Chain (beste Kette) | 8 / 15 / 25 |
| Crime Fighter (Takedowns) | 10 / 75 / 300 |
| Secure Route (Transporter) | 10 / 75 / 300 |
| Combo Master (beste Combo) | 20 / 40 / 80 |
| Veteran (geschaffte Schichten) | 10 / 75 / 300 |

Stufe I gibt eine Standard-, höhere Stufen eine Premium-Truhe; Crime Fighter gibt Stufe I–II Criminal Hunt, Stufe III Premium. (High Alert Hero ist mit High Alert entfallen.)

### Alben

Ein voller Satz zahlt einmal Geld und legt einen **Rahmen** in seiner Farbe um den Kreisverkehr (der wertvollste zählt).

| Album | Inhalt | Belohnung |
|---|---|---|
| Commons / Rares / Epics / Legends | alle Car Skins der Seltenheit | 5.000 / 10.000 / 20.000 / 40.000 |
| Maps | alle Map Skins | 10.000 |
| Seasons | 4 Saison-Items | 30.000 |
| Loyalty | 3 Serien-Items | 20.000 |

---

## 11. Motivation & Mitspielen

- **Daily Shift:** automatisch die **erste Schicht des Tages**, ein Versuch, Titel „DAILY SHIFT“. Ein Tages-Seed für alle, immer mit City Event. Geschafft → 300 × Serie Geld + Event Chest. Die allererste Schicht ist nie die Daily.
- **Serie:** zählt gespielte Tage. 7 / 14 / 30 Tage geben exklusive Skins (Bronze Badge, Silver Badge, Gold Laurel).
- **Saisons:** Der Event Chest enthält in der Hälfte der Fälle das Saison-Item (Frost, Blossom, Sunburst, Pumpkin), das es nur in seiner Saison gibt.
- **Quests** (früher Challenges): 3 kleine Ziele pro Tag, für alle gleich, je einmal bezahlt, wechseln um Mitternacht. Unter **Progress → Quests**.
- **Records** (Progress): Highscore, Level, Bestcombo, längste Kette, Daily-Serie, Schichten, Takedowns, Transporter, Unlimited- und Mayhem-Rekorde, Syndikats-Bosse, Sammlung, **Timing** (Leo, 29.09.2026): wie früh (−) oder spät (+) die letzten 50 Merges im Schnitt getippt waren, gemessen an der Mitte der Lücke (`core/timing.ts`; ab 8 Merges, bis ±30 ms „On the beat“; offene Ringe zählen nicht).
- **Tutorial:** in der ersten Schicht, ohne Menü und ohne Pause – pulsierender Ring am vordersten Auto, „Wait for a gap, then tap“, Combo-Hinweis, beim ersten Crash „Cars crash instantly. Police get 3 chances.“

### Trials (Progress → Trials, ab Level 8)

Sieben feste Schichten mit festem Seed (alle treffen denselben Verkehr), frischem Kreisverkehr mit 4 Armen, ohne eigene Upgrades. Eine Zusatzregel beendet die Schicht als *failed*, wenn sie gebrochen wird. Jede Trial zahlt einmal.

| Trial | Level | Autos | Ziel / Bedingung | Belohnung |
|---|---|---|---|---|
| Tight Squeeze | 8 | 8 | jede Einfädelung Tight Fit, Near Miss oder Perfect | 1.500 |
| Dead Centre | 6 | 12 | mindestens 4 Perfect Inputs | 1.500 |
| Clean Sheet | 12 | 16 | kein Crash, kein Cut-off | 2.500 |
| Blackout | 16 | 16 | Nacht, Laternen aus | 3.000 |
| Storm Watch | 20 | 18 | Sturm bei Nacht | 4.000 |
| Marathon | 14 | 40 | schaffen | 4.000 |
| Most Wanted | 15 | 24 | den Syndikats-Boss festnehmen | 5.000 |

### Challenge-Links (nur Web)

Nach einer Schicht macht „Challenge a friend“ einen Link (`#challenge=…`) mit Seed, Modus, Level, Upgrades, Zufahrten, Modulen und Event. Wer ihn öffnet, spielt dieselbe Schicht aus einer frischen Welt; Ziel ist die Punktzahl (in Mayhem die Flammen) des Absenders. Eine Challenge bringt nichts ein. Kein Server nötig.

### Multiplayer (nur Web)

- **Bis zu 4 Freunde auf einem Kreisverkehr**, jeder mit eigener Zufahrt; 8 Arme, dazwischen KI-Verkehr (Unlimited-Level, keine Polizei, Verbrecher, Wetter, Nacht oder Events).
- **Raus ist,** wessen Auto **beim Einfädeln** crasht, oder wer 10 s fließenden Verkehrs lang kein Auto schickt (die Uhr wartet, solange Wracks liegen). Der Letzte gewinnt.
- **Beitreten:** Der Host tippt *Host a game* und bekommt einen vierstelligen Code; die anderen geben ihn ein.
- **Netz:** Peer-to-Peer über WebRTC mit PeerJS; dessen öffentlicher Broker stellt die Geräte nur einander vor. Kein eigener Server, nichts wird gespeichert.
- **Lockstep:** Alle Geräte rechnen dieselbe deterministische Welt (gleicher Seed, gleiche Taps, 120 Hz). Der Host vergibt jedem Tap seinen Schritt (≈ 50 ms Eingabeverzögerung für alle) und entscheidet, wer raus ist.

---

## 12. Look & Feel / Sound / Haptik / Menüs

**Leitgedanke „Eine Stadt, ein Ring“ (Leo, 25.09.2026):** Die Welt ist die Oberfläche. Neues wird zuerst am Kreisverkehr gezeigt (Inselrand, Lichtsignale, Farbe), erst dann als klassische Anzeige; die Tabs sind Blicke auf dieselbe laufende Stadt, der Ring hört nie auf.

| Aspekt | Umsetzung |
|---|---|
| **Ring als UI** | Auf dem Inselrand ein Strich pro Auto der Schicht, der aufleuchtet, sobald das Auto drin ist – ersetzt den Autozähler. Dazu Lichtsignale: **Welle** (Combo-Stufe, Takedown, Transporter bezahlt), **Aufflackern** (Strike rot, Polizei-Crash blau), **Lichtlauf** (Rush Hour, Schicht geschafft). Warn-Keile für Verbrecher und Transporter sitzen auf demselben Rand |
| **Die Stadt atmet** | Bäume wiegen sich, Fenster glimmen, Wolkenschatten ziehen; lebhafter bei dichtem Verkehr und in der Rush Hour |
| **Lichter der Autos** | Bremslichter zeigen, was die Fahrer tun (Schlange an der Linie, Stau hinter einem Wrack); die Lichthupe blinkt, wenn ein früher Tap gehalten wird. Bei Nacht tragen Scheinwerfer und Rücklichter das Bild |
| **Perspektiven** | Die Kamera gleitet je Tab: Build – der Ring liegt unter dem Plan; Shop – Schwenk, der Ring rutscht an den Rand; Progress – eigener Blick. Die Seiten decken die Stadt nie ganz zu |
| **Grafik** | Canvas 2D, clean, minimalistisch, dunkle Nacht-Stadt, flache Vektorformen, ein Mint-Akzent für das, was der Spieler verdient |
| **Farben** | Tokens nach Rolle. Fahrzeugfarben = Spielinfo, nie UI-Akzent |
| **Schrift** | Systemschrift: auf Apple-Geräten SF Pro, in der Spielszene SF Pro Rounded (`ui-rounded`), sonst Segoe UI / Roboto; Tabular Figures für Zahlen |
| **Obere Anzeige** | schwebende Karte mit drei Spalten (MONEY · CARS/SCORE · BEST), im Ergebnis zählt das Geld hoch. Auf dem Wartebildschirm führt Geld → Chests, Autos → Collection, Best → Records |
| **Navigation** | DOM-Tab-Bar wie in iOS: **Progress · Game · Shop · Build**; zwischen den Schichten sichtbar, während einer Schicht ausgeblendet. Build hat die Segmente Upgrades / Street Builder, Shop Chests / Collection / Casino, Progress Records / Quests / Trials / Museum / Mastery |
| **Menüs** | native Anmutung: gruppierte Listen, Sheets, Schalter, Segmented Controls; Glas nur für schwebende Bedienelemente über der Szene. Kritisch gedämpfte Federn, kein harter Schnitt |
| **Einstellungen** | Sheet: Sound, Haptics, Vehicle Labels, **Left-handed** (schwebende Knöpfe auf die andere Seite, Dispatch links), **Larger text** (Hinweise und Karten über der Szene ×1,2), Reduce Motion (System / On / Off), **What's new** (Patch Notes aus `present/patchNotes.ts`; ungelesen: Punkt am Einstellungsknopf), Export / Import / Reset Progress |
| **Ergebnis teilen** | Unter jedem Ergebnis „Picture“: das Bild des Bildschirms mit Streifen „Car Game · Adresse“. Am Handy über das Teilen-Menü (mit Challenge-Link, wenn es einen gibt), sonst als PNG gespeichert |
| **Adaptive Auflösung** | Kommen die Frames dauerhaft langsam und unregelmäßig, sinkt die Pixeldichte 2 → 1,5 → 1; nach 12 s flüssigem Lauf steigt sie wieder. Gleichmäßige 30 fps (Stromsparmodus) bleiben unangetastet |
| **Sound** | Web Audio: 35 Effekte und 7 Musik-Stems als AAC in `Web/public/audio/` (noch Platzhalter), mit Tonhöhen-Variation und Stereo-Position. Adaptive Musik: Combo baut Instrumente auf, Verbrecher → Sirene, Rush Hour → Beat zieht an, Flow verdichtet; bei Verbrecher-Warnung und Rush-Hour-Beginn atmet die Musik durch einen Tiefpass ein |
| **Haptik** | über `navigator.vibrate` – nur wo der Browser es kann (Android/Chrome); iOS-Safari hat keine Vibration, der Schalter zeigt das an |
| **Accessibility** | Farben nie allein (Formen, Icons, Muster), Vehicle Labels, WCAG-AA-Kontrast, 44-px-Ziele, Tastatur (Leertaste, Enter, D/E, Esc, R, Tab, Pfeile), sichtbarer Fokus, Live-Region für Ergebnisse. Reduce Motion folgt standardmäßig dem System und entfernt Shake, Zeitlupe und fliegende Teile |
| **Icon** | Kreisverkehr bei Nacht, das Mint-Auto fädelt in eine Lücke ein (Original in `Web/icon/`), als PWA-Icons in `Web/public/icons/` |

---

## 13. Technische Architektur

```
Eingabe (pointerdown mit Zeitstempel, Tastatur)
        │
        ▼
core/  (Spielregeln, kein DOM, 120 Hz, deterministisch)
  ├─ config.ts                  ← ALLE Tuning-Werte
  ├─ world / roundabout / paths / vehicle / collision / crash / drivers / traffic
  ├─ specials (Verbrecher, Boss-Konvoi, Transporter) / explosions / modules
  ├─ scoring / levels (Kurven, Upgrades, Wetter, Nacht, Events, Mayhem)
  ├─ career / loot / daily / casino / trials / challenge / versus / unlocks
  └─ events / rng / vec2
        │
        ▼
present/  (Darstellung)
  ├─ session (GameSession), flow (Modus-Wischen), transitions, perspective, tutorial
  ├─ Szene: scene, render, draw, carArt, city, mapThemes, weather, night, effects, explosionsFx, marks
  ├─ HUD & Seiten: hud, menukit, shop, progress, upgrades, builder, detail, versus
  └─ strings (alle Texte), theme, icons, skins, feedback (+ Musik-Mix)
        │
        ▼
audio/ (Web Audio)   storage/ (localStorage)   net/ (PeerJS-Raum)   ui/ (DOM-Hülle: Canvas, Tab-Bar, Sheets, Lobby)
```

- **Vite + TypeScript + HTML5 Canvas**, kein UI-Framework, keine Game-Engine. Einzige Laufzeit-Abhängigkeit: `peerjs` (Multiplayer).
- **Gleicher Seed + gleiche Taps = gleiches Ergebnis** – Grundlage für Balancing-Bots, Challenge-Links, Trials und Multiplayer.
- **Spielstand nur lokal:** `localStorage`, Schlüssel `carGame.save.v2` (alte `carGame.career.v1` werden übernommen); tolerant geladen, Feld für Feld. Export/Import als JSON-Datei.
- **PWA und offline:** Manifest, Service Worker aus dem Build (precacht alle Dateien; Navigation network-first, nach 3 s oder ohne Netz die gespeicherte Seite). Nach dem ersten Laden läuft alles ohne Netz, nur der Multiplayer braucht es. Beim ersten Besuch: „Ready to play offline“.
- **Deployment:** Docker (Node baut, `nginx:alpine` liefert statisch aus), Port 5050, Coolify baut aus GitHub. **Kein Backend, keine Datenbank, keine API.**

**Feste Entscheidungen** siehe [CLAUDE.md](CLAUDE.md). Die frühere Swift-Schiene liegt nur noch in der Git-Historie (bis Commit `4f9ac73`).

---

## 14. Stand der Umsetzung (29.09.2026)

Die Web-Version ist das ganze Spiel: dazu gehören Nacht/Blackout, Syndikats-Konvoi, Trials, Challenge-Links, Multiplayer, Export/Import, Reifenspuren, Casino, Freischaltungen und Offline-Betrieb.

| Bereich | Inhalt | Stand |
|---|---|---|
| Kern | Kreisverkehr, Einfädeln, Schicht & Punkte, echte Crash-Physik, Bots im Ring | ✅ |
| Sonderverkehr | Polizei & Verbrecher, Transporter, Lkw, Tanklaster, Militär-Truck, Boss-Konvoi | ✅ |
| Modi | Shift, Unlimited, Mayhem, Multiplayer (Wischen) | ✅ |
| Schwierigkeit | Level-Kurve, Wetter, Nacht/Blackout, City Events, Risiko & Versicherung | ✅ |
| Meta | Geld, 13 Upgrades, Street Builder mit Modulen, Truhen, Sammlung, Alben, Mastery, Daily, Serie, Quests, Trials, Records, Casino, Freischaltungen | ✅ |
| Hülle | Tab-Bar, Einstellungen, PWA, Offline, Speicherschutz, Docker/Coolify | ✅ |
| Look & Feel | Ring als UI, atmende und sichtbar wachsende Stadt, Kamera je Tab, adaptive Musik | ✅, Klänge noch Platzhalter |

Geprüft wird mit `npm test` (20 Tests, node:test), `npm run build` (Typecheck) und den Balancing-Bots. Am 28.09.2026: Build grün; `npm run sim` auf Level 5 – vorsichtiger Bot 60/60 Schichten geschafft, 0 Crashes; Zufalls-Tapper 0/60 geschafft, 60 Crashes.

### Offen

- **Echte Klänge und Musik-Stems** statt der `SoundMaker`-Platzhalter.
- **Playtest auf echten Handys** (iPhone-Safari und Android): Timing mit Touch, 60 fps auf älteren Geräten, PWA-Installation.
- **Multiplayer über echte Netze** (Mobilfunk, Firewalls, TURN).
- **Deployment über Coolify** mit HTTPS und eigener Domain.

### Playtest offen

- Bots im Ring: Fühlt es sich wie Lücken-Treffen an? Reichen 3 Bots auf Level 1?
- Warn-Keil auf der Mittelinsel und Blaulicht auf dem Boden: deutlich genug?
- Ring als UI: Liest man den Schichtfortschritt, ohne hinzuschauen?
- Unlimited: Wie lange hält man durch, steigt der Druck richtig?
- Mayhem: Macht Zielen auf Tanklaster Spaß, sind 12 Autos richtig?
- Nacht/Blackout: noch fair lesbar? Boss-Konvoi: Ist die Lücke vor den Begleitern treffbar?
- Multiplayer: Sind 50 ms Eingabeverzögerung spürbar? Sind 10 s bis zum Ausscheiden richtig?
- Verlorene Schicht: Zeitlupe und Sofort-Neustart im richtigen Maß?

### Bekannte Unstimmigkeiten

- **Keine Karriere-Messung:** Die Web-Sim misst nur Schichten, keine ganze Laufbahn (Geld, Preise, Freischaltungen über viele Level).

---

## 15. Ideen danach

Offene Ideen stehen in [IDEA.md](IDEA.md). Aus der alten Planung passen zum Browserspiel weiterhin: freier Straßennetz-Editor und weitere Kreisverkehre, Abschleppwagen aus dem Depot-Hof, Verkehrsleitsystem gegen den Zoll-Stau, Krankenwagen, zweispurige Kreisverkehre, weitere Fahrzeugtypen, Prestige.

---

## 16. Testen & Balancing

| Werkzeug | Befehl (in `Web/`) |
|---|---|
| **Einmalig installieren** | `npm install` |
| **Spielen / Entwickeln** | `npm run dev` → http://localhost:5050 (auch vom Handy im WLAN) |
| **Typecheck + Build** | `npm run build` (muss vor jedem Commit grün sein) |
| **Build lokal ausliefern** | `npm run preview` (Port 5050, mit Service Worker) |
| **Balancing-Bots** | `npm run sim -- 60 5` (Schichten, Level): der vorsichtige Bot darf **nie** crashen, ein Zufalls-Tapper fast immer |
| **Tests** | `npm test`: Replays (gleicher Seed + gleiche Taps), vorsichtiger Bot ohne Crash, Spielstände (alt, kaputt, Export/Import), Buchung einer Schicht, Freischaltungen, Meldungen |
| **Multiplayer-Bots** | `npm run sim:versus`: vorsichtige Spuren scheiden nie durch Crash aus, gleicher Seed = gleiches Match |
| **Container wie in Coolify** | im Repo-Root: `docker build -t car-game . ; docker run -p 5050:5050 car-game` |

**Steuerung:** Tap / Klick / Leertaste = Auto schicken (der erste Tap startet) · Wischen bzw. `←` / `→` = Modus · Dispatch-Button, `D`, `E`, Rechtsklick = Einsatzfahrt · `Tab` = Seite · obere Karte = Chests / Collection / Records · `Enter` = starten / Upgrade kaufen · `Esc` = Einstellungen bzw. zurück · `R` = Schicht neu.

**Playtest-Routine:** 3 Schichten spielen, am Desktop und auf einem echten Handy → Fairness der Crashes, Feedback-Wahrnehmung, Ruckler, Motivation („Will ich noch eine?“). Auffälligkeiten **mit Seed** notieren (ein Challenge-Link hält die Schicht fest).

---

## 17. Offene Entscheidungen / Balancing-Punkte

- [x] Schichtlänge: kurz lassen, kein 2-Minuten-Ziel (Leo, 26.09.2026)
- [x] Verlorenes Level wiederholen: bleibt so, fair dank Sofort-Neustart (Leo, 26.09.2026)
- [x] Gefahrenstufe High Alert: entfernt, ersetzt durch die Spielmodi (26.09.2026)
- [x] Browserspiel statt App (Leo, 27.09.2026)
- [ ] Level-Kurve für Speed, Density und Weather; Rush-Hour-Werte
- [ ] Bots im Ring: Startet Level 1 mit 3 oder 4?
- [ ] Kosten: Zufahrten, Module, Truhen (Karriere neu messen)
- [ ] Crash-Kosten ab Level 20, Verlust bei Flucht, Versicherungs-Staffeln
- [ ] Parameter der Fahrzeugtypen (Compact, Sports Car, Van)
- [ ] Truhen-Odds, Mastery-Stufen, Pity-Schwelle
- [ ] Wetter, Nacht-Chance, Häufigkeit der City Events
- [ ] Unlimited- und Mayhem-Werte, Boss-Level-Abstand (jedes 15.)
- [ ] Blaulicht auf dem Boden und Warn-Keil: Intensität, Position, Deutlichkeit
- [x] Store entfernt, Casino statt Store (Leo, 28.09.2026)
- [x] Nur noch die Web-Version, Swift-Schiene gelöscht (Leo, 29.09.2026)
- [ ] Freischalt-Level: Daily 3, Trials 8, Casino 10

---

## 18. Datei-Struktur (Kern)

```
Car-game/
├─ CLAUDE.md                      ← feste Entscheidungen, Befehle, Arbeitsweise
├─ Spiel.md                       ← dieses Dokument
├─ FOUNDATION.md, LOOT.md, IDEA.md, multiplayer_perfection_plan.md
├─ Dockerfile, .dockerignore      ← Node baut, nginx liefert aus (Port 5050)
├─ Web/                           ← DAS SPIEL
│  ├─ README.md, PRODUCT.md
│  ├─ index.html, vite.config.ts, nginx.conf, package.json
│  ├─ src/core/                   ← Spielregeln (config.ts = alle Zahlen)
│  ├─ src/present/                ← Szene, HUD, Seiten, Session
│  ├─ src/audio/ storage/ net/ ui/
│  ├─ public/                     ← Manifest, Icons, audio/ (35 Sounds, 7 Stems)
│  ├─ icon/                       ← Original des Icons (make_icon.py)
│  └─ scripts/                    ← test.mjs, sim.mjs, versus-sim.mjs, casino-sim.mjs
```

---

**Stand:** 29.09.2026 – Car Game ist ein Browserspiel, offline spielbar nach dem ersten Laden, mit automatischen Tests. Nächster großer Schritt: **Playtest auf echten Handys und Deployment über Coolify.**
