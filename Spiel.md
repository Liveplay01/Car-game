# Spiel.md – Car Game: Spielmechanik, Funktionen & Status

Stand: 26.09.2026 · Übersicht über das ganze Spiel. Die Details stehen in [ROADMAP.md](ROADMAP.md) (Regeln und Messwerte je Meilenstein), [LOOT.md](LOOT.md) (Truhen, Skins), [FOUNDATION.md](FOUNDATION.md) (Basis, Architektur), [TESTING.md](TESTING.md) und in `Game/Sources/GameCore/Config.swift` (alle Zahlen). Weicht dieses Dokument vom Code ab, gilt der Code.

---

## 1. Kernidee & Inspiration

**Inspiration:** Browserspiel *Car Circle* (Shoom Games) – One-Tap-Timing: Autos per Tap in einen rotierenden Kreisverkehr einfädeln, ohne zu kollidieren. Keine Lenkung, kein Gas, keine Bremse.

**Das Spielprinzip:** Der Spieler packt seine Autos in **Lücken zwischen Bot-Autos**. Im Ring sind deshalb immer mindestens 3–5 Bots (siehe 7).

**Unsere Version:** Gleiche Grundmechanik, dazu aktive Sondertypen im Verkehr:
- **Verbrecher-Pickups** (müssen aktiv per Polizeiauto gerammt werden)
- **Geldtransporter** (sollen unbeschadet entkommen, aber **nicht** von Polizei berührt werden)
- **Lkw** (zahlen an Mautstellen)
- dazu **Wetter** und **City Events**, die den Verkehr wirklich verändern

**Meta:** Geld → Upgrades kaufen, Kreisverkehr im Street Builder ausbauen (Zufahrten, Module), Truhen mit Skins öffnen. Die Stadt wächst sichtbar mit.

**Zielgerät:** iPhone ab iOS 26, Hochformat, einhändig. Spielsprache nur Englisch, Projektdokumente auf Deutsch.

---

## 2. Schicht, Level & Ablauf

- **Keine Uhr.** Eine Schicht besteht aus einer festen Zahl Autos, die alle in den Verkehr müssen; danach ist sie geschafft.
- **Level:** Jede geschaffte Schicht = Level +1, eine verlorene wird **auf demselben Level wiederholt** (neu ausgeloste Autozahl).
- **Autos pro Schicht:** Level 1 ≈ 10 (8–12), +1,1 pro Level, je Versuch ±2, höchstens 30. High Alert ×1,15.
- **Level 1 ist bewusst machbar** (weniger und langsamere Autos, größere KI-Lücken, längere Jagd, mehr Polizei); ab Level 5 (`hardLevel`) gelten die vollen Werte.
- **Tempo:** ab Level 5 +1 % pro Level, bis +40 %. **Dichte:** ab Level 6 zusätzliche Autos (bis +6), KI fährt enger auf (bis 0,06 s), bleibt länger (Extrarunden, ab Level 12 mindestens zwei Ausfahrten).
- **Rush Hour** in den letzten 4 Autos: Tempo auf 135 %, Dichte +2, Punkte ×2. Dichte und Tempo steigen zudem über die ersten 20 s: Wer auf die perfekte Lücke wartet, bekommt mehr Verkehr, keinen leichteren.
- **Fließender Schichtwechsel, kein Ergebnis-Screen:** Das Ergebnis steht in derselben oberen Karte (gleiche Größe, gleicher Platz), der Ring schickt einen Lichtlauf herum. Nach 3,6 s Nachklang (`epilogue`) wird es von selbst zum Wartebildschirm der nächsten Schicht, deren Verkehr schon fährt; das Tempo gleitet zum neuen Start-Tempo, die Autos der nächsten Schicht rollen von hinten in die Warteschlange. Ein Tap startet jederzeit. Kein Freeze, kein Replay, keine Einblendung (Highlight/Replay wurde gestrichen).
- **Kein Tap-Cooldown:** Das nächste Auto steht ≈ 0,3 s nach dem Tap an der Haltelinie; ein früher Tap wird gehalten. Eigene Autos bewerten sich nicht gegenseitig, schnelles Tippen gibt also keine geschenkten Tight Fits.
- **Kein verschluckter Tap (26.09.2026):** Das nachrückende Auto fährt weich an und bremst weich an der Haltelinie (Bremslichter an). Kommt der Tap zu früh, leuchtet kurz die Lichthupe auf, das Auto bremst nicht mehr, pendelt sich ohne Wackler auf Ringtempo ein und rollt ohne Stocken durch die Linie in sein Einfädeln; die Autos dahinter rollen weiter statt schlagartig zu stehen. Ohne gehaltenen Tap ist das Auto im selben Moment bereit wie früher; mit gehaltenem Tap geht es, sobald es an der Linie ist und zum vorderen eigenen Auto mindestens 4 Einheiten Platz sind.
- **Schichtlänge – entschieden: kurz lassen** (Leo, 26.09.2026). Gemessen je nach Level 8–75 s (Mensch-Bot: Level 10 ≈ 36 s, Level 20 ≈ 68 s, Level 30 ≈ 75 s). Kein Ziel mehr von ≈ 2 Minuten: kurze Schichten tragen das „Nur noch eine!“, lange ermüden den Daumen und machen einen späten Crash bitter.

### Gefahrenstufe vor der Schicht (Push Your Luck)

Auf dem Game-Tab wählbar, gilt bis zur nächsten Änderung:

| | Normal Duty | High Alert |
|---|---|---|
| Autos | wie das Level | ×1,15 |
| Verbrecher-Countdown | wie das Level | ×0,8 (nie unter 8 s) |
| Verbrecher | gemäß Chance (Quiet Streets senkt sie) | in **jeder** Schicht |
| Geld (Lohn, Transporter, Abschirm-Bonus) | ×1 | **×2** |

Auf High Alert tragen beide Ränder der Ringfahrbahn feine rote Rennstreifen (blenden beim Umschalten weich ein und aus): „Jetzt zählt es“ steht auf der Straße, nicht in einer Anzeige.

Mehr Tempo oder mehr Autos im Ring ließen hohe Level unspielbar statt riskanter werden (Mensch-Bot Level 35: 82 % → 17 %) – die jetzige Mischung kostet auf Level 10 ≈ 2, auf Level 35 ≈ 28 Prozentpunkte.

---

## 3. Game-Over-Regeln (Hard vs. Soft Fail)

| Ereignis | Konsequenz |
|---|---|
| **Verbrecher-Pickup entkommt** (Countdown abgelaufen) | **Hard Fail** – Schicht verloren (ab Level 20 zusätzlich 350 Verlust) |
| **Normales Auto crasht** | **Hard Fail** (`maxStrikes = 1`; ab Level 20 kostet der Crash Geld) |
| **Polizeiauto crasht** | Soft Fail: kostet 250 Punkte & Combo, **3 erlaubt** (`maxPoliceCrashes = 3`, Upgrade *Backup* +1 pro Stufe), der 4. = Hard Fail |
| **Folgeunfälle im Verkehr** | Kosten standardmäßig **keine** Strikes (umschaltbar); wer in einen sichtbaren Unfall einfädelt, bleibt 1 s verantwortlich |

**Verlorene Schicht ohne Game-Over-Screen (26.09.2026):** Der Crash, der die Schicht beendet, läuft kurz in Zeitlupe (0,2× für 0,45 s, dann weich zurück), die Kamera tritt 5 % zurück, der Inselrand flackert rot. Der Verkehr fährt weiter. Ab 0,5 s nach dem Crash startet ein Tap sofort den nächsten Versuch auf demselben Level, ohne auf das Ergebnis zu warten (der Tap wird gehalten, bis das erste Auto an der Linie ist). Wer nicht tippt, sieht wie bisher das Ergebnis in der oberen Karte. Reduce Motion: keine Zeitlupe, kein Zurücktreten. Zurückspulen gibt es bewusst nicht (kein Replay, der Ring hört nie auf).

**Begründung:** Bei einer Schicht mit vielen parallelen Systemen (Combo, Verbrecher, Transporter, Modul-Zonen) wäre ein einzelner Patzer eines Polizeiautos, der alles beendet, überproportional hart. Polizei-Crashes haben ein eigenes Budget, da sie für Takedowns riskiert werden müssen.

**Crashes sind echte Physik** (`CrashPhysics`, `Drivers.swift`): Stoß-Impuls am Kontaktpunkt, Reifenreibung, reagierender Verkehr mit Kettenunfällen (Fahrer reagieren nach 0,5–1,5 s), Blechschaden mit Beulen und abreißenden Teilen. Keine geskripteten Animationen.

---

## 4. Bewertung: Combo, Präzision & Flow

Jede Einfädelung wird nach dem engsten Abstand (surface to surface) bewertet:

| Stufe | Regel | Punkte | Combo | Feedback |
|---|---|---|---|---|
| **Tight Fit** | < 0,12 s | 200 × Mult. | +2 | Swoosh, scharfer Haptik-Impuls |
| **Near Miss** | < 0,2 s, kein Tight Fit | 125 × Mult. | +1 | kurzer Swoosh, dezente Haptik |
| **Perfect Input** | Lücke vorne/hinten fast gleich (≤ 25 % Abweichung), beide ≥ 0,2 s, zusammen ≤ 2 s | 150 × Mult. | +1 | Präzisions-Ring, dunkles „Plopp“ wie ein hochwertiger Schalter |
| **Clean** | alles andere | 100 × Mult. | +1 | leiser Tick (steigt mit der Combo), feinster Haptik-Klick beim Einrasten in den Ring |
| **Crash** | | −250 (nie unter 0) | Reset | |
| **Cut-off** (optional, Default aus) | Hintermann < `sloppyWindow` | – | Reset, kein Strike | |

- **Combo-Multiplikator:** 0–4 ×1 · 5–9 ×1,5 · 10–19 ×2 · 20+ ×3.
- **Perfect Chain:** zählt Perfect Inputs, Near Misses, Tight Fits, Takedowns und gerettete Transporter in Folge; eine normale saubere Einfädelung, ein Cut-off oder ein Crash beendet sie. Keine eigene Anzeige.
- **Flow State:** ab Kette 5 – Ring-Glow, Sound-Layer, die Stadt atmet mit; die Haptik der Einfädelungen (Klick, Tight Fit, Near Miss, Perfect, Combo) wird tiefer und weicher, Warnungen und Treffer bleiben scharf. Nur Feedback, kein Modus, kein Text.
- **Schichtabschluss:** +1.000 Punkte.
- **Perfect Run:** geschaffte Schicht ohne Crash (Polizei eingeschlossen) und ohne Cut-off: **+1.500 Punkte, +25 % Lohn**.
- **Rekord-Geist:** Bestzeit pro Level (pro Auto); live als ±Sekunden im HUD, „NEW BEST TIME“ beim Übertreffen.
- **Ergebnis** zählt Near Misses, Perfect Inputs, längste Kette, Bestcombo (für Mastery).

---

## 5. Verbrecher-Bots & Polizei

| Element | Details |
|---|---|
| **Fahrzeugtyp** | Pickup-Truck (violett, offene Ladefläche, Countdown-Ring) – sofort erkennbar |
| **Nur stoppbar mit** | Polizeiauto (blau, weißes Dach, Lichtbalken mit Blaulicht) |
| **Anteil Polizei in der Schlange** | 20 % (Level 1: 30 %; *More Patrols* +3 %/Stufe; Police Operation +15 %) |
| **Auftritt** | erster Verbrecher nach 4–8 s, Pause danach 10–16 s; keiner, wenn die Jagd das Schichtende überdauern könnte |
| **Warnung** | 2 s vorher: Sirene und pulsierender Keil in Verbrecher-Farbe auf dem Inselrand in Richtung der Zufahrt – ohne Beschriftung, die Farbe sagt es (Leo, 25.09.2026) |
| **Countdown** | ab Einfahrt Level 1: 16 s, Level 5: 12 s, −0,25 s pro Level bis 8 s (*Longer Pursuit* +1 s/Stufe); der Pickup dreht bis dahin Runden. Sichtbar als Ring um den Pickup und als Sekunden in der Inselmitte |
| **Entkommt er** | Schicht verloren (Hard Fail) |
| **Takedown** | 1.000 Pkt × Multiplikator × Rush Hour, 0,3 s Slow-Mo, Soft-Body-Deformation (Front/Heck/Seite/Ecke, Restbeule), flache Splitter in Polizeifarben, blauer Ring, „BUSTED!“, Combo bleibt, kein Feuer |
| **Zählt nicht** | wenn der Verbrecher selbst ins Polizeiauto fährt |
| **Einsatzfahrt (Panic-Button)** | **E** / Rechtsklick: das vorderste Auto wird Polizei, Combo × 0,5 (*Dispatch Radio* +10 % pro Stufe zurück) |
| **Verfolgung im Ring** | Polizeiauto direkt hinter dem Pickup jagt mit bis ×1,4 Tempo (*Interceptor* +0,1/Stufe), bleibt im Kreis und rammt ihn |
| **Masse** | Pickup = 2,5× Auto: schiebt das andere Auto weiter weg. **Was beschädigt ist, fährt nicht mehr** (26.09.2026): Jeder Treffer ohne Takedown macht auch den Pickup zum Wrack – die Jagd endet ohne Punkte und ohne verlorene Schicht; ein normales eigenes Auto bekommt wie immer den Strike |
| **Blaulicht** | nur Blau (deutscher Lichtbalken), LED-Doppelblitze, weißer Kern, weicher Schein auf der Straße, jedes Polizeiauto im eigenen Takt |

---

## 6. Geldtransporter-Mechanik

| Element | Details |
|---|---|
| **Aussehen** | gepanzerter Kastenwagen in Panzergrün, Goldmünze, Goldstreifen, Rundumleuchte, kein Heckfenster |
| **Spawn** | erster nach 8–14 s, Pause danach 15–25 s (*Cash Route* −0,4 s pro Stufe; jede Zusatz-Zufahrt −15 %); Warnung 2 s vorher als pulsierender Keil in Transporter-Farbe auf dem Inselrand, ohne Beschriftung |
| **Ziel** | Unbeschadet die markierte Ausfahrt nehmen → **450 Geld** (× Rush Hour; High Alert ×2) |
| **Sperrzonen** | Zone von 130 Einheiten (≈ 5 Autolängen) um den Transporter, je 65 davor und dahinter, auf dem Ring als Bogen sichtbar |
| **Polizei in Sperrzone** | Transporter wird **beschlagnahmt** → kein Geld, keine Strafe |
| **Normales Auto in Sperrzone** | **Abschirmen** → +50 Bonus pro Auto |
| **Transporter crasht** | Wrack, Geld weg („LOST“); er bremst und crasht wie jeder andere Fahrer (Masse 1,6) |
| **Countdown** | 10 s, dann nimmt er seine Ausfahrt; ist das letzte Auto vorher drin, sofortige Auszahlung |
| **Double Run** (Upgrade) | 4 % pro Stufe Chance auf einen zweiten Transporter direkt danach |

---

## 7. Verkehr: Bots im Ring, KI, Lkw & Fahrzeugtypen

### Bots im Ring (Playtest Leo, 24.09.2026)

Der Spieler soll Lücken treffen, keine Kolonnen bilden.

- **`minRingBots`:** Level 1–4: 3 · ab Level 5: 4 · ab Level 9: 5; ein größerer Kreisverkehr skaliert mit. Jede Schicht startet mit mindestens so vielen Bots.
- **Halteregel:** Ein Bot fährt erst raus, wenn danach noch genug drin sind, sonst dreht er eine weitere Runde. Entscheidung 1,5 s vor der Ausfahrt, damit KI und Spieler nie in eine Lücke planen, die nicht frei wird. Fehlt ein Bot, kommt sofort Ersatz.
- **Dichte zählt nur KI-Autos,** nicht die des Spielers – eine Kolonne verhindert also keine Bots.
- **Stauwellen lösen sich auf:** Ohne Wrack und ohne Modul-Schlange darf ein Bot trotz Minimum raus; Rückfallebene nach 20 s Bremsen.
- **Die KI wartet nur bei Störungen nahe ihrer Einfahrt** (bis 2,5 s voraus, 1,5 s zurück), fädelt weiter nur mit sicherer Lücke ein und verursacht nie einen Crash.
- **Fließender Verkehr ab Level 6:** Bots fahren ohne Anhalten ein (Rolling Merge), höchstens 2 stehen gleichzeitig an einer Linie, ein Auto pro Zufahrt in der Schlange.
- Neue Autos erscheinen außerhalb des Bildes und fahren heran.

Gemessen (Mensch-Bot, `Sim --ring`): Ø 3,6 Bots im Ring auf Level 1 (vorher 1,2), unter dem Minimum 1,1 % der Zeit (vorher 88 %), längste Kolonne im Median 4 (vorher 6).

### Lkw

22 % des normalen Verkehrs (*Freight* +1,5 %/Stufe); Länge 36 (Auto 24), Masse 2,2, heller Kofferaufbau (nur das Fahrerhaus trägt den Skin). Zahlen an Mautstellen.

### Fahrzeugtypen des Spielers (freischaltbar, LOOT.md)

Ein Typ hat Spielwerte, ein Skin nur Aussehen – **anders, nicht besser**. Jeder freigeschaltete Typ taucht gelegentlich in der eigenen Schlange auf.

| Typ | Anteil | Eigenschaften |
|---|---|---|
| **Compact** (Rare) | 12 % | sehr kurz (18), leicht (0,7), fädelt 15 % **langsamer** ein |
| **Sports Car** (Epic) | 15 % | kürzer (21), leichter (0,8), fädelt 20 % schneller ein |
| **Van** (Epic) | 12 % | lang (29), schwer (1,5), fädelt 10 % schneller ein |

---

## 8. Wetter & City Events

### Wetter (dritte Schwierigkeitsachse, pro Schicht ausgelost)

Chance ab Level 6: +3 % pro Level, höchstens 60 %. Vorher auf dem Game-Tab angekündigt („LEVEL 14 · Heavy Rain“).

| Stufe | ab Level | Wirkung |
|---|---|---|
| Clear | 1 | – |
| Light Rain | 6 | Reifen haften schlechter (Wracks rutschen weiter), Fahrer reagieren etwas später |
| Heavy Rain | 12 | dazu +1 Auto Dichte, Fahrer bremsen schwächer |
| Storm | 18 | dazu +2 Dichte, KI drängelt (Lücken ×0,8) |
| Extreme | 25, selten | Sturm plus kurze Böen, die das Tempo schwanken lassen |

Fair bleibt es: Das Tap-Timing ändert sich nie; Sonderfahrzeuge, Warnungen und Countdown-Ringe liegen immer über den Wettereffekten.

### City Events (höchstens eins pro Schicht, ab Level 4 mit 25 % Chance, vorher angekündigt)

| Event | Wirkung |
|---|---|
| Roadworks (Baustelle) | ein Ringabschnitt fährt langsamer (×0,6) |
| Road Closure (Sperrung) | eine KI-Zufahrt ist zu, die anderen bekommen ihren Verkehr |
| Concert / Parade | eine Zufahrt schickt eine Welle dicht folgender Autos (+2 Dichte, KI-Spawns doppelt so schnell) |
| VIP Convoy | drei KI-Autos fahren eng hintereinander ein: lange Lücke davor und dahinter |
| Police Operation | +15 % Polizei in der Schlange |

Events ändern Tempo, Dichte oder Lücken – nie die Regeln.

---

## 9. Wirtschaft & Meta-Progression

Alles Kaufbare wurde am 25.09.2026 um 30 % teurer, das Geld pro Schicht gleichzeitig gesenkt.

### Geld verdienen

| Quelle | Betrag |
|---|---|
| Schichtabschluss | 150 + 30 × Level (*Overtime* +4 %/Stufe, +10 % pro Zusatz-Zufahrt, High Alert ×2) |
| Geretteter Transporter | 450 (Rush Hour ×2, High Alert ×2) |
| Abschirm-Bonus | 50 pro Auto in der Sperrzone |
| Perfect Run | +25 % Lohn |
| Daily Shift | 300 × Serie (bis 7 Tage → 2.100) + Event Chest |
| Challenges (3 pro Tag) | 250 / 350 / 500 je Challenge |
| Toll Booth | 6 pro Lkw; Speed Camera 3 pro Auto über dem Limit – **nur in den ersten 60 s** einer Schicht, der Stau bleibt |
| Daily Login | 30 pro Toll Booth pro Tag Abwesenheit, höchstens 3 Tage |
| Duplikate aus Truhen | Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000 |
| Alben (voller Satz, einmalig) | 5.000 – 40.000 (siehe 10) |

Geld bleibt auch aus verlorenen Schichten. Der Kontostand steht immer links in der oberen Karte und zählt schon während der Schicht hoch, sobald etwas verdient wird (Transporter, Maut); im Ergebnis zählt er bis zum neuen Kontostand, der Verdienst der Schicht erscheint auf der Insel und landet mit Ka-ching.

### Geld ausgeben

| Bereich | Was | Preis |
|---|---|---|
| **Upgrades** (Upgrades-Tab) | 12 Upgrades, 81 Stufen | erste Stufe 2.600 × Faktor, jede weitere ×1,5 |
| **Zufahrten** (Street Builder) | 5.–8. Arm; je Arm Ring +18 breiter, +25 % Verkehr, Transporter 15 % früher, +10 % Lohn | 32.500 / 65.000 / 130.000 / 260.000 = **487.500** |
| **Module** (Street Builder) | Toll Booth, Speed Camera, Tow Depot auf 6 festen Modulplätzen; voll = Tausch | 10.400 / 15.600 / 13.000 |
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
| Double Run | +4 % Chance auf zweiten Transporter | 5 | 3.900 |
| Insurance* | −15 % Crash-Kosten (Stufe 7 = 100 %) | 7 | 5.200 |
| Robbery Insurance* | −15 % Verlust bei Flucht (Stufe 7 = 100 %) | 7 | 5.200 |

\* sichtbar ab Level 20. Die Geld-Upgrades wurden stark gedämpft, damit das Geld nicht alles bezahlt.

### Risiko & Versicherung (ab Level 20)

Bis Level 19 sind Fehler kostenlos. Ab Level 20: Der Crash, der die Schicht beendet, bzw. ein Polizei-Crash kostet nach Wucht **60 / 120 / 200**; ein entkommener Verbrecher **350** zusätzlich zur verlorenen Schicht. Folgeunfälle kosten nichts. Kosten kommen vom Verdienst der Schicht, dann vom Konto – **nie ins Minus.** Anzeige im Ergebnis, bei Vollversicherung „FULL COVERAGE · You Pay $0“.

### Street Builder & Module

- **Ziehen und Ablegen** aus der Palette auf leuchtende Steckplätze (16 Plätze, Mindestabstand 2, Vollausbau 8 Zufahrten); Doppel-Tap baut, ein Tap nimmt das Teil wieder weg; fehlt Geld, wackelt es und der Preis wird rot.
- **Abreißen:** erster Tipp markiert (rot pulsierend, ×-Abzeichen), zweiter reißt ab.
- **Toll Booth:** Lkw zahlen, der Abschnitt staut (Zone 150 Einheiten lang, Tempo ×0,55). Der Stau behindert Polizei → Verbrecher entkommen leichter.
- **Speed Camera:** kurze, scharfe Zone (44 Einheiten), alle bremsen (×0,7); zahlt nur über 108 % Grundtempo.
- **Tow Depot:** Wracks in seiner Zone (180 Einheiten) verschwinden 30 % schneller; kleiner Hof am Ring, nach einem Crash fährt kurz ein Abschleppwagen hin.
- **City Evolution:** um den Kreisverkehr wachsen mit Level, Zufahrten und Modulen Stadtblöcke, Bäume und Infrastruktur – rein Darstellung, aus dem Spielstand berechnet.

---

## 10. Sammeln: Truhen, Skins, Mastery, Alben

Details und alle Item-Listen: [LOOT.md](LOOT.md).

- **Nur Aussehen.** Kein Skin gibt einen Spielvorteil. Sonderfahrzeuge bleiben an der **Form** erkennbar, nicht an der Farbe.
- **61 Items:** 39 Car Skins, 12 Map Skins, 3 Fahrzeugtypen, 7 nur über Daily-Serie und Saison.
- **Skins mischen:** bis zu **5 Car Skins** gleichzeitig; **jedes Fahrzeug** im Level (auch KI, Polizei, Pickup, Transporter, Lkw) trägt einen davon, fest pro Fahrzeug. Ein Map Skin.
- **Map Skins** färben den Boden der Stadt, tönen die Mittelinsel, säumen alle Straßen mit eigenen Pflanzen und bringen ein **Herzstück** mit Animation (z. B. Koi-Teich mit Torii bei Sakura, Windmühle bei Meadow, Ringplanet bei Cosmos). Reduce Motion: nichts fliegt.
- **Car Skins:** Farben, Rennstreifen, zweifarbige Dächer, **Shiny** (Lichtstreif) und **Glitter** (Funkeln).

### Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Standard | Shop (26.000), Werbung (3/Tag), Mastery Stufe I, Daily Shift | 70 % | 22 % | 7 % | 1 % |
| Premium | Shop (52.000), Mastery Stufe II/III | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt | Mastery „Crime Fighter“ | 50 % | 30 % | 15 % | 5 % |
| Event | jede geschaffte Daily Shift; 15 % nach jeder geschafften Schicht mit City Event | 40 % | 35 % | 20 % | 5 % |

- **Odds immer sichtbar**, **Pity:** spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic.
- **Kein Echtgeld in v1.0.** Premium gegen Echtgeld frühestens später, nach rechtlicher Prüfung der Lootboxen.
- **Werbung:** eine Standard-Truhe pro angesehener Werbung, bis zu 3 pro Tag (Google AdMob, im Code mit Test-IDs; im Testfenster eine 3-s-Platzhalter-Werbung).
- **Öffnung „splashy, fruity“:** Squash & Stretch, Frucht-Palette, Splash-Blobs, Konfetti, Strahlen, Jelly-Pop; Legendary mit Goldregen. Reduce Motion nur Blende.

### Mastery (unsichtbar)

Neun Ziele mit je drei Stufen zählen über die ganze Laufbahn; beim Erreichen erscheint ein Toast („MASTERY COMPLETE · … · CHEST EARNED“), die Truhe liegt im Shop. Kein Mastery-Screen.

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
| High Alert Hero | 5 / 30 / 120 |

Stufe I gibt eine Standard-, höhere Stufen eine Premium-Truhe; Crime Fighter gibt Stufe I–II Criminal Hunt, Stufe III Premium.

### Alben

Ein voller Satz zahlt einmal Geld und legt einen **Rahmen** in seiner Farbe um den Kreisverkehr (der wertvollste zählt).

| Album | Inhalt | Belohnung |
|---|---|---|
| Commons / Rares / Epics / Legends | alle Car Skins der Seltenheit | 5.000 / 10.000 / 20.000 / 40.000 |
| Maps | alle 12 Map Skins | 10.000 |
| Seasons | 4 Saison-Items | 30.000 |
| Loyalty | 3 Serien-Items | 20.000 |

---

## 11. Motivation: Daily, Serie, Challenges, Tutorial

- **Daily Shift:** automatisch die **erste Schicht des Tages**, ein Versuch, angekündigt per Splash und Titel „DAILY SHIFT“. Ein Tages-Seed für alle, immer mit City Event. Geschafft → 300 × Serie Geld + Event Chest. Die allererste Schicht ist nie die Daily.
- **Serie:** zählt gespielte Tage (Wiederkommen wird belohnt). 7 / 14 / 30 Tage geben exklusive Skins (Bronze Badge, Silver Badge, Gold Laurel).
- **Saisons:** Der Event Chest enthält in der Hälfte der Fälle das Saison-Item (Frost/Winter, Blossom/Frühling, Sunburst/Sommer, Pumpkin/Herbst), das es nur in seiner Saison gibt.
- **Challenges:** 3 kleine Ziele pro Tag, für alle gleich, je einmal bezahlt (z. B. 3 Perfect Inputs, 2 Takedowns, Kette 8, Combo 15, High-Alert-Schicht, Perfect Run). Sichtbar im Shop unter *Today*.
- **Tutorial:** in der ersten Schicht, ohne Menü und ohne Pause – pulsierender Ring am vordersten Auto, „Wait for a gap“, Combo-Hinweis nach zwei sauberen Einfädelungen, beim ersten Crash „Cars crash instantly. Police get 3 chances.“ (auch wenn dieser Crash die Schicht beendet, läuft der Hinweis bis ins Ergebnis). Endet mit der ersten Schicht; alte Spielstände sehen es nicht.
- **Game Center:** `GameServicing` im Spiel, GameKit-Adapter in der App (Ranglisten Highscore/Level/Bestcombo/Daily-Serie, Erfolge aus Mastery, Serie und Alben, Access Point). IDs in `GameServices.swift`.
- **Spielstand** versioniert und tolerant: fehlende Schlüssel fallen auf Defaults, unbekannte Truhen werden verworfen, nie der ganze Spielstand.

---

## 12. Look & Feel / Sound / Haptik / Menüs

**Leitgedanke „Eine Stadt, ein Ring“ (Leo, 25.09.2026):** Die Welt ist die Oberfläche. Neues wird zuerst am Kreisverkehr gezeigt (Inselrand, Lichtsignale, Farbe), erst dann als klassische Anzeige; die Tabs sind Blicke auf dieselbe laufende Stadt, der Ring hört nie auf.

| Aspekt | Umsetzung |
|---|---|
| **Ring als UI** (`RingSignals`) | Auf dem Inselrand ein Strich pro Auto der Schicht, der aufleuchtet, sobald das Auto drin ist (ab der eigenen Zufahrt in Fahrtrichtung, in der Rush Hour Mint) – ersetzt den Autozähler. Dazu drei Lichtsignale: **Welle** (Combo-Stufe, Takedown, Transporter bezahlt), **Aufflackern** des Rands (Strike rot, Polizei-Crash blau, verlorene Schicht), **Lichtlauf** einmal herum (Rush Hour beginnt, Schicht geschafft). Warn-Keile für Verbrecher und Transporter sitzen auf demselben Rand |
| **Die Stadt atmet** (`CityPulse`) | Bäume wiegen sich, Fenster glimmen im eigenen Takt, zwei Wolkenschatten ziehen; lebhafter bei dichtem Verkehr und in der Rush Hour; im Flow schickt jedes eingefädelte Auto eine schwache Lichtwelle durch die Fenster |
| **Lichter der Autos** (`VehicleLamps`) | Bremslichter zeigen, was die Fahrer tun: die Schlange steht an der Linie, ein Bot bremst vor seiner Linie, hinter einem Wrack baut sich sichtbar ein Stau auf (wer den Unfall noch nicht bemerkt hat, rollt ohne Bremslicht weiter). Nur das vorderste stehende Auto wirft einen roten Schein auf den Asphalt. Die Lichthupe blinkt zweimal kurz, wenn ein früher Tap gehalten wird |
| **High Alert auf der Straße** | zwei feine rote Rennstreifen an den Rändern der Ringfahrbahn, statt einer weiteren Anzeige |
| **Perspektiven** (`Perspective`) | Die Kamera gleitet je Tab (0,65 s, kritisch gedämpft): Street Builder – der echte Ring liegt exakt unter dem Plan und die Kamera wächst mit; Shop – Schwenk in ein Viertel, der Ring rutscht an den Rand; Upgrades – Ring näher, Stadt tritt zurück. Die Seiten decken die Stadt nicht mehr ganz zu |
| **Grafik** | Clean, minimalistisch, Apple-artig, Dark Theme, flache Vektorformen, hoher Kontrast; Effekte in `GamePresentation` als Daten |
| **Farben** | Tokens nach Rolle (background, surface, primary, muted, accent, destructive). Fahrzeugfarben = Spielinfo, nie UI-Akzent |
| **Schrift** | Spielszene in SF Pro Rounded (App, wie die Zahlen in Fitness), native Bedienelemente in SF Pro; Tabular Figures für Scores, große Zahlen fett, kleine Labels leicht gesperrt |
| **Obere Anzeige** | schwebende Karte im Chrome-Material, immer gleich groß, drei Spalten mit Beschriftung über dem Wert, weicher Verlauf darunter. Vor der Schicht **MONEY · CARS · BEST**, in der Schicht **MONEY · SCORE · BEST** (bzw. Rekord-Rennen ±Sekunden), im Ergebnis **MONEY** (zählt hoch) · „LEVEL 5 COMPLETE“ über den Punkten · **BEST / NEW BEST**. Bei High Alert steht „HIGH ALERT“ über dem Geld; die Daily Shift steht in der Mitte über den Autos |
| **HUD** | Punktzahl läuft hinterher statt zu springen und tickt bei jedem Auto, Geld federt beim Zuwachs, Rush Hour färbt die Mittelspalte, Strike-/Polizei-Crash-Punkte landen mit Ring; Verbrecher-Countdown in der Inselmitte |
| **Animationen** | kritisch gedämpfte Feder (kein Überschwingen) für Menüs, Tab-Wechsel und Hinweise; Truhe und Treffer federn; kein harter Schnitt zwischen Spiel, Ergebnis, Tabs und Einstellungen. Reduce Motion behält nur die Überblendung |
| **Menüs** | Apple-artig (`MenuKit`): Large Title mit Geld-Chip, Segment-Control, Karten steigen ein und schwingen aus, geben beim Tippen nach; gestapelte Popups. Native Buttons der App in Liquid Glass (`.glass`, `.glassProminent`): der Verkehr scheint durch, sie geben mit der Systemfeder nach |
| **Shop** | Segmente Chests / Collection / Today, Collection in Regalen (Common, Rare, Epic, Legend, Maps, Special, max. 12 pro Regal; Reiterwechsel animiert: Markierung gleitet, Items wischen von der Seite herein); **NEW**-Markierung für neue Items, Badge am Shop-Tab |
| **Einstellungen** | iOS-Sheet: Sound, Haptics, Reduce Motion, Vehicle Labels |
| **Sound** | 32 Effekte, adaptive Musik aus 7 Stems (`base`, `bass`, `rhythm`, `lead`, `flow`, `rush`, `siren`, Mischpult `MusicMix`): Combo baut Instrumente auf, Verbrecher → Sirene, Rush Hour → Beat zieht an, Flow verdichtet. **Die Musik atmet ein:** bei der Verbrecher-Warnung und zu Beginn der Rush Hour schließt ein Tiefpass die Musik kurz (bis ≈ 650 Hz, ≈ 1,4 s), dann öffnet sie sich mit Sirene bzw. Beat wieder; Effekte bleiben ungefiltert. Saubere Einfädelungen steigen mit der Combo die a-Moll-Pentatonik hinauf; häufige Sounds variieren leicht in der Tonhöhe; keine Knackser. Klangrichtung: organisch und edel statt Arcade (Perfect ist ein dunkles „Plopp“). **Alles noch Platzhalter aus dem `SoundMaker`** |
| **Haptik** | 15 `.ahap`-Muster (Einfädel-Klick, Tight Fit, Near Miss, Perfect, Takedown, Crash, Rush Hour, Combo, Flow, Truhe, Transporter …), Takedown skaliert mit der Wucht. Der Klick einer sauberen Einfädelung ist kaum spürbar und nur allein im Frame; im Flow wird die Haptik der Einfädelungen tiefer und weicher. Spürbar erst auf dem iPhone |
| **Accessibility** | Farben nie allein (Formen, Icons, Muster), Vehicle Labels, Reduce Motion entfernt Shake/Zoom/Slow-Mo/Deformation, Kamerafahrten (Schnitt statt Fahrt) und das Atmen der Stadt; am Ring bleibt nur das Aufflackern; alle Informationen bleiben |
| **App-Icon** | Kreisverkehr bei Nacht, das Mint-Auto fädelt in eine Lücke ein (`Assets/Icon/make_icon.py`) |
| **Navigation** | native iOS-Tab-Bar (Street Builder, Game, Shop, Upgrades); zwischen den Schichten sichtbar, während einer Schicht ausgeblendet |

---

## 13. Technische Architektur

```
Eingabe (Touch/Click mit Zeitstempel)
        │
        ▼
GameCore (120 Hz, deterministisch, plattformneutral)
  ├─ Config.swift / Tuning.swift  ← ALLE Tuning-Werte, Live-Tuning
  ├─ World / Roundabout / Paths / Vehicle / Collision / CrashPhysics
  ├─ Traffic / Queue / Drivers            (KI, Bots im Ring, reagierender Verkehr)
  ├─ Criminals / Transporters / Modules
  ├─ Scoring / Shift / Levels / Risk
  ├─ Weather / CityEvents
  ├─ Upgrades (Career) / Mastery / Chests / Rewards / Daily
  └─ Events / RNG / Vec2
        │
        ▼
GamePresentation (Daten: Render-Liste, Effekte, HUD, ScreenFlow, Feedback)
  ├─ GameSession, ScreenFlow, Transitions, Motion, MenuKit, TopBar, HUD (ReadyBanner, ResultBanner)
  ├─ Seiten: ShopPage, UpgradePage, StreetBuilderPage, SettingsPage, Tutorial
  ├─ Szene: SceneBuilder, CarArt, VehicleLamps, CityLayer (CityPulse), MapThemes, WeatherLayer, PoliceLights, Effects
  ├─ Welt als UI: RingSignals, Perspective (Kamera je Tab)
  └─ Strings (alle Texte), Theme, Icons, Music, Feedback, GameServices
        │
        ▼
Plattform
  ├─ TestWindow (Windows, raylib) – Maus/Leertaste, Sounds, Live-Tuning (T)
  └─ App.swiftpm (Swift Playgrounds, iPad) – Canvas-Zeichnung, SwiftUI, Core Haptics, AVAudioEngine, GameKit, AdMob
```

**Wichtig:** `GameCore` und `GamePresentation` nutzen **nur Swift Stdlib + Foundation** → laufen unter Windows. Die Plattform enthält **keine Spiellogik**. Neues Spielsystem: zuerst in `GameCore` mit Tests, dann in `GamePresentation`, dann im Testfenster spielen.

**Feste Entscheidungen** (siehe [CLAUDE.md](CLAUDE.md)): Swift überall, kein Mac, kein Backend (Ausnahme: Werbung über Google AdMob), so viele native Apple-Elemente wie möglich, GitHub nur als Sync-Kanal ab Phase 2.

---

## 14. Stand der Umsetzung (26.09.2026)

**Alle 367 automatischen Tests sind grün** (211 GameCore, 149 GamePresentation, 7 GameBots; `swift test` am 26.09.2026).

| Meilenstein | Inhalt | Stand |
|---|---|---|
| M0–M2 | Fundament, Kreisverkehr, Einfädeln, Schicht & Punkte, Crash-Physik | ✅ |
| M3 | Polizei & Verbrecher | ✅ |
| M4 | Geldtransporter | ✅ |
| M5 | Wirtschaft: Level, Geld & Upgrades, Tab-Navigation, fließender Übergang, Gefahrenstufe, Street Builder | ✅ |
| M6 | Präzision & Flow (Near Miss, Perfect Input, Chain, Flow) | ✅ |
| M7 | Risiko & Versicherung, Freight, Double Run, dichtere Level | ✅ |
| M8 | Wetter & City Events | ✅ |
| M9 | Module im Street Builder, Tow Depot, wachsende Stadt | ✅ |
| M10 | Fahrzeugtypen, unsichtbare Mastery, Truhen, Shop | ✅ |
| v1.2 (vorgezogen) | Daily Shift, Challenges, Perfect Run, Daily Login, Serie, Event-Truhen, Saisons, Alben, Rekord-Geist | ✅ |
| v1.4 (Teil, vorgezogen) | Game Center (Adapter in der App) | ✅ im Code |
| Bots im Ring | Mindestens 3–5 Bots, Halteregel, fließender Verkehr | ✅ |
| Inhalt (25.09.) | 39 Car Skins, 12 Map Skins mit Herzstücken, Compact & Van, Tutorial, Street Builder abreißen | ✅ |
| Eine Stadt, ein Ring (25.09.) | Ring als UI, Ankündigung nur am Ring, kein Ergebnis-Screen, atmende Stadt, Kamera je Tab, obere Karte mit Geld | ✅ |
| Mehr Gefühl, keine UI (26.09.) | Bremslichter und Lichthupe, weiches Nachrücken, verlorene Schicht mit Zeitlupe und Sofort-Neustart, High-Alert-Streifen, Einfädel-Klick, weichere Flow-Haptik, atmende Musik, Perfect-„Plopp“, SF Pro Rounded, Liquid-Glass-Buttons | ✅ (Haptik, App-Teile und Klang erst auf iPad/iPhone prüfbar) |
| **M11 Look & Feel** | Soft-Body-Takedown ✅, Haptik-Muster ✅, adaptiver Musik-Mix ✅, App-Icon ✅, Sound-Feinschliff ✅, Apple-Menüs und obere Anzeige ✅, Welt als UI ✅, Mehr Gefühl ✅ | 🟡 teilweise |
| **M12 iPhone-App** | `App.swiftpm` vorbereitet: Canvas-Zeichnung, Touch, Sound, Haptik, Musik, AdMob (Test-IDs), Game Center, native Buttons, Einstellungen | 🟡 ungetestet, erster Build auf dem iPad offen; Shop, Upgrades und Street Builder in der App noch nicht gebaut |
| M13 v1.0 Launch | Developer Program, TestFlight, App Store | ⬜ |

Fast alles ist **im Testfenster spielbar, der Playtest steht aber bei fast allen Systemen noch aus.**

### Offen in M11

- **Finale Sounds und Musik als echte Stems** (heute synthetische Platzhalter; das Mischpult existiert)
- **Haptik spüren und feinjustieren** auf dem iPhone
- **Design-Pass und Screen-Entwürfe** (UI.md) für die SwiftUI-Menüs, damit M12 nur umsetzt

### Playtest offen

- Bots im Ring: Fühlt es sich wie Lücken-Treffen an? Reichen 3 Bots auf Level 1?
- Warn-Keil auf der Mittelinsel: richtige Position, deutlich genug?
- Blaulicht auf dem Boden: Intensität und Reichweite?
- Lkw: Aussehen und Bremsverhalten
- Ist Level 14 jetzt schwer genug (Kurve ab Level 10 nachgezogen)?
- Sind die längeren Schichten auf hohen Leveln gut?
- Truhen-Öffnung, Motion und Menüs im Gesamteindruck
- Ring als UI: Liest man den Schichtfortschritt am Ring, ohne hinzuschauen? Sind die Lichtsignale zu viel oder zu wenig?
- Ist der Nachklang von 3,6 s nach der Schicht richtig?
- Merkt man, dass die Stadt atmet, ohne dass es auffällt? Fühlen sich die Tab-Wechsel wie eine Kamerafahrt an?
- Verlorene Schicht: Sind 0,45 s Zeitlupe und 5 % Zurücktreten richtig? Tippt man zu früh versehentlich in den Neustart (Sperre 0,5 s)?
- Bremslichter: Liest man den Stau hinter einem Wrack? Stört der Schein in dichten Leveln?
- Lichthupe beim frühen Tap: wahrgenommen, ohne abzulenken?
- High-Alert-Streifen: deutlich genug, ohne mit den Signalen am Inselrand zu konkurrieren?
- Auf dem iPhone: Einfädel-Klick kaum spürbar genug? Weichere Flow-Haptik spürbar? Atmende Musik hörbar, aber nicht störend?

### Bekannte Unstimmigkeiten

- **Karriere-Simulation** (`Sim --career`) und die Verdienst-Tabellen in ROADMAP.md (M5, Schritt 2) stammen von vor den Preis- und Lohnänderungen vom 25.09. und sollten neu gemessen werden.

---

## 15. Geplant nach v1.0

| Version | Inhalt |
|---|---|
| **v1.1 Straßennetz** | freier Straßennetz-Editor / Stadtübersicht, neue Straßen und weitere Kreisverkehre, Abschleppwagen aus dem Depot-Hof in der Stadt, Verkehrsleitsystem als Gegen-Upgrade zum Zoll-Stau (Designfrage vorher: Spielt eine Schicht auf *einem* Kreisverkehr des Netzes oder auf dem ganzen Netz?) |
| **v1.3 Abwechslung** | Tag/Nacht, Krankenwagen, Boss-Event (Kopf des Verbrechens), zweispurige Kreisverkehre, weitere Fahrzeugtypen (z. B. Oldtimer), Prestige – ohne die Kernmechanik mit Sonderregeln zu überladen |
| **v1.4 Apple-Ökosystem** | Home-Screen-Widget, Live Activity / Dynamic Island (nur bei aktiver Jagd oder Transporter), Action Button, CloudKit-Sync, Siri Shortcuts, Apple Watch |
| **Später, falls gewünscht** | Premium-Truhen gegen Echtgeld (StoreKit, rechtliche Prüfung), Season Pass, Multiplayer (Echtzeit vs. asynchron offen; Multiplayer-Skins nur kosmetisch) |

### Nächste Schritte

1. **Playtest im Testfenster** (Level 1, 5, 10, 20; Werte in `tuning.json`), auch mit dem Ring als UI und dem neuen Spielgefühl (Playtest-Fragen oben).
2. **M11 abschließen:** finale Sounds, Design-Pass.
3. **M12:** erster Build auf dem iPad, Timing-Feintuning mit Touch, Tests auf iPhone 11 / SE (A13), Randfälle (Anruf, App-Wechsel, Stummschalter).
4. **M13:** Apple Developer Program (99 $), AdMob-Konto mit echten IDs, Game-Center-IDs in App Store Connect, TestFlight-Beta (Website), Datenschutzangaben mit Werbe-/Tracking-Daten, ATT-Abfrage, Privacy Policy & Support-Seite, Einreichung, Launch.

---

## 16. Testen & Balancing

| Werkzeug | Befehl |
|---|---|
| **Spielen** | `Spiel starten.cmd` (baut und startet) oder `cd TestWindow; swift run -c release TestWindow` |
| **Automatische Tests** | `cd Game; swift test` |
| **Balancing-Bot** | `swift run -c release Sim --shifts 1000 --seed 42` |
| **Schwierigkeit pro Level** (mit Wetter und Events) | `swift run -c release Sim --curve --shifts 300` |
| **Laufbahnen** (Level, Geld, Upgrades; `--duty high`) | `swift run -c release Sim --career 120` |
| **Bots im Ring, Kolonnen des Spielers** | `swift run -c release Sim --ring --shifts 200` |
| **Sounds neu erzeugen** | `cd TestWindow; swift run SoundMaker`, danach `powershell -File sync-app-assets.ps1` |
| **Live-Tuning** | `tuning.json` editieren → im Fenster **T** (gleicher Seed, neue Werte) |
| **Debug-Overlay / Zeitlupe** | **F1** (Hitboxen, Abstände, FPS, Seed) / **F2** (1× → 0,5× → 0,25×) |

**Steuerung im Testfenster:** Leertaste / Linksklick = Tap · **E** / Rechtsklick = Einsatzfahrt · **H** = Gefahrenstufe · **Tab** oder Klick auf die Leiste = Seite wechseln · **Esc** = Pause / Einstellungen / zurück · **R** = Schicht neu · Ziehen = Street Builder.

**Startparameter** (u. a.): `--seed`, `--time-scale`, `--play`, `--level 8`, `--tab upgrades`, `--duty high`, `--weather storm`, `--event roadworks`, `--map sakura`, `--shelf maps`, `--chest-preview legendary`, `--settings`, `--debug`, `--autotap 0.9`, `--size 375x667`, `--save datei.json`, `--screenshot bild.png --at 4`, `--at-crash 0.2`. Vollständige Liste: [TESTING.md](TESTING.md) und `LaunchOptions.swift`.

**Playtest-Routine (nach jedem Meilenstein):** 3 Schichten spielen → Fairness der Crashes prüfen (F1), Feedback-Wahrnehmung, Ruckler (FPS), Motivation („Will ich noch eine?“). Auffälligkeiten **mit Seed** notieren.

---

## 17. Offene Entscheidungen / Balancing-Punkte

- [x] Schichtlänge: kurz lassen, kein 2-Minuten-Ziel (Leo, 26.09.2026)
- [ ] Level-Kurve für Speed, Density und Weather; Rush-Hour-Werte
- [ ] Bots im Ring: Startet Level 1 mit 3 oder 4? Sind 3er-Lücken ein netter Moment oder ein Schlupfloch?
- [ ] Kosten: Zufahrten, Module, Tow Depot, Truhen nach den +30 % (Karriere neu messen)
- [ ] Wirkung der 30-%-Wrackentfernung des Depots
- [ ] Crash-Kosten ab Level 20, Verlust bei Flucht, Versicherungs-Staffeln
- [ ] Parameter der Fahrzeugtypen (Compact, Sports Car, Van)
- [ ] Truhen-Odds, Mastery-Stufen, Pity-Schwelle
- [ ] Wetterparameter, Häufigkeit der City Events
- [ ] Blaulicht auf dem Boden und Warn-Keil: Intensität, Position, Deutlichkeit
- [ ] Ist ×2 bei High Alert genug Anreiz, solange man die Schichten locker schafft? Soll High Alert zusätzlich mehr Punkte geben?
- [x] Verlorenes Level wiederholen: bleibt so, fair dank Sofort-Neustart (Leo, 26.09.2026)
- [ ] Muss vor dem Launch geklärt werden: ob Swift Playgrounds Game-Center-Berechtigung und App-Store-Upload für dieses Projekt ausreichen oder Xcode am Ende doch nötig wird

---

## 18. Datei-Struktur (Kern)

```
Car game/
├─ CLAUDE.md                      ← feste Entscheidungen, Befehle, Arbeitsweise
├─ Spiel.md                       ← dieses Dokument
├─ IDEA.md, PLAN.md, FOUNDATION.md, ROADMAP.md, TESTING.md, LOOT.md, UI.md
├─ Spiel starten.cmd              ← baut und startet das Testfenster
├─ sync-app-assets.ps1            ← Sounds/Haptik/Musik nach App.swiftpm kopieren
├─ Game/                          ← Plattformneutrales Swift-Paket
│  ├─ Sources/GameCore/           ← Spiellogik (Config, World, Vehicle, Criminals, Transporters, Upgrades, Levels, Modules, Weather, CityEvents, Risk, Mastery, Chests, Rewards, Daily, …)
│  ├─ Sources/GamePresentation/   ← Darstellung als Daten (GameSession, RenderList, HUD, TopBar, ScreenFlow, Shop/Upgrade/StreetBuilder/Settings-Seiten, CarArt, CityLayer, MapThemes, Strings, Theme, Motion, Music, Feedback, …)
│  ├─ Sources/GameBots/           ← Bots für Sim & Tests
│  ├─ Sources/Sim/                ← Balancing-Bot (swift run Sim)
│  └─ Tests/                      ← Swift Testing (GameCore, GamePresentation, GameBots)
├─ TestWindow/                    ← raylib-Testfenster (Windows), nur Zeichnen, Eingabe, Ton
│  ├─ Sources/TestWindow/         ← Fenster, Renderer, Platform, Startparameter
│  ├─ Sources/SoundMaker/         ← erzeugt die Platzhalter-Sounds
│  ├─ tuning.json                 ← Live-Tuning
│  └─ savegame.json               ← Highscore, Einstellungen, Karriere
├─ App.swiftpm/                   ← iPhone-App (Swift Playgrounds auf dem iPad): dünne Adapter
│  └─ CarGameApp, GameModel, GameCanvas, Input, Overlays, Platform, Ads, GameCenter, Resources/
└─ Assets/
   ├─ Sounds/                     ← 32 .wav (Platzhalter)
   ├─ Music/                      ← 7 Stems
   ├─ Haptics/                    ← 14 .ahap-Muster
   └─ Icon/                       ← App-Icon und Skript
```

---

**Stand:** 26.09.2026 – M0–M10, die vorgezogenen Motivationssysteme und „Eine Stadt, ein Ring“ sowie „Mehr Gefühl, keine UI“ sind gebaut, alle 367 Tests grün, das Spiel ist im Testfenster voll spielbar. M11 (Look & Feel) ist zum großen Teil fertig, M12 (iPhone-App) ist vorbereitet, aber auf dem iPad noch nie gebaut. Nächster großer Schritt: **Playtest, dann erster Build auf dem iPad.**
