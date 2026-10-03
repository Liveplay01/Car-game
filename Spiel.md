# Spiel.md – Roundabout Timing („Car Game“): Spielmechanik, Funktionen & Status

Stand: 02.10.2026 · Überblick über das ganze Spiel. Das Spiel heißt **Roundabout Timing** (kurz RAT); „Car Game“ ist nur noch der Ordner- und Repo-Name. Es ist ein **Browserspiel** (`Web/`), dazu ein kleiner optionaler Dienst (`Server/`). Die frühere Swift-/iPhone-Schiene ist seit dem 29.09.2026 gelöscht (Git-Historie bis Commit `4f9ac73`). Maßgeblich sind `Web/src/core/config.ts` (alle Zahlen) und [Web/README.md](Web/README.md) (Befehle, Aufbau, Deployment), für den Dienst [Server/README.md](Server/README.md). Regeln und Grundlagen stehen in [FOUNDATION.md](FOUNDATION.md), die Truhen in [LOOT.md](LOOT.md). Weicht dieses Dokument vom Code ab, gilt der Code.

---

## 1. Kernidee & Inspiration

**Inspiration:** Browserspiel *Car Circle* (Shoom Games) – One-Tap-Timing: Autos per Tap in einen rotierenden Kreisverkehr einfädeln, ohne zu kollidieren. Keine Lenkung, kein Gas, keine Bremse.

**Das Spielprinzip:** Der Spieler packt seine Autos in **Lücken zwischen Bot-Autos**. Im Ring sind deshalb immer mindestens 3–5 Bots (siehe 7).

**Unsere Version:** Gleiche Grundmechanik, dazu aktive Sondertypen im Verkehr:
- **Verbrecher-Pickups** (müssen aktiv per Polizeiauto gerammt werden), alle 15 Level als **Syndikats-Boss** mit Eskorte
- **Geldtransporter** (sollen unbeschadet entkommen, aber **nicht** von Polizei berührt werden), manchmal als **Jackpot**
- **Lkw** (zahlen an Mautstellen), **Tanklaster** und **Militär-Trucks** (explodieren)
- **Krankenwagen und Feuerwehr** (die Straße vor ihnen frei halten), **Motorräder**, **Fahrschulauto**, **Schulbusse**
- dazu **Wetter**, **Nacht** und **City Events**, die den Verkehr oder die Sicht verändern, ab Level 80 ein **zweispuriger Ring**

**Meta:** Geld → Upgrades kaufen, Kreisverkehr im Street Builder ausbauen (Zufahrten, Module), Truhen mit Skins öffnen, Quests, Trials und Feats abhaken, Casino. Die Stadt wächst sichtbar mit. Langzeitziele: Legendary Shifts, Prestige, Elite-Leiste, Saison-Pass, Ruhmeshalle.

**Plattform:** Browser auf Handy (Hochformat, einhändig) und Desktop, installierbar als PWA, offline spielbar nach dem ersten Besuch. Läuft außerdem auf **CrazyGames** und (in Vorbereitung) im **Google Play Store** als Trusted Web Activity (siehe 14). Spielsprache nur Englisch, Projektdokumente auf Deutsch.

---

## 2. Spielmodi, Schicht & Level

### Spielmodi (Wischen auf dem Wartebildschirm, `←` / `→`)

| Modus | Kurz | Regeln |
|---|---|---|
| **Shift** | „Clear the level, move up“ | die Karriere: feste Autozahl pro Schicht, Level, Geld (siehe unten) |
| **Unlimited** | „Endless · until you crash“ | spielt auf Level 3 (ohne Prestige-Vorsprung, ohne Legendary-Regel), ohne Autozahl, bis zum ersten Verlust. Nach der 20-s-Rampe alle 25 s +1 Auto Dichte (bis +8), Tempo +8 % pro Minute (bis 160 %). Lohn 20 pro geschicktem Auto, keine Crash-Kosten. Ein „Jammed“-Auto (siehe 4) zählt nicht als Auto. Rekorde: Punkte und Autos; die Punkte gehen auf die Bestenliste |
| **Mayhem** | „12 cars · aim for the tankers“ | Crashes sind das Ziel: 12 Autos auf Level 6 (ohne Prestige-Vorsprung), +3 Dichte, 1,1 s Nachladen zwischen den Autos, keine Polizei, keine Verbrecher, kein Krankenwagen, kein Lohn, keine Critical Merges. 34 % Lkw, davon 60 % Tanklaster, bis zu 4 Militär-Trucks (erster nach 9–15 s, dann alle 6–10 s); Verkehr erholt sich doppelt so schnell. Jedes neue Wrack gibt **Flammen**; ein Folge-Crash innerhalb von 1,5 s verlängert die Kette (Flammen = Kettenlänge, höchstens 10, Lkw ×2). Wracks treffen nur, solange sie noch fliegen. Die Schicht endet, wenn die letzte Kettenreaktion ausgebrannt ist. Rekorde: Flammen und längste Kette |
| **Multiplayer** | „Up to 4 friends · last one standing“ | siehe 11 |

Das Wischen geht von Anfang an; ein Hinweis weist erst nach Level 6 darauf hin (siehe „Freischaltungen“ in 9). Die Gefahrenstufe *Normal Duty / High Alert* wurde am 26.09.2026 **entfernt** und durch die Modi ersetzt.

### Schicht & Level (Modus Shift)

- **Keine Uhr.** Eine Schicht besteht aus einer festen Zahl Autos, die alle in den Verkehr müssen; danach ist sie geschafft.
- **Level:** Jede geschaffte Schicht = Level +1, eine verlorene wird **auf demselben Level wiederholt** (neu ausgeloste Autozahl).
- **Autos pro Schicht:** Level 1 ≈ 10 (8–12), +1,1 pro Level, je Versuch ±2, höchstens 30.
- **Level 1 ist bewusst machbar** (weniger und langsamere Autos, größere KI-Lücken, längere Jagd, mehr Polizei); von Level 1 bis `hardLevel` 5 gleiten die Werte auf die vollen hoch.
- **Tempo:** ab Level 5 +1 % pro Level, bis +40 %. **Dichte:** ab Level 6 zusätzliche Autos (+0,3 pro Level, bis +6), KI fährt enger auf (Lücke −0,01 s pro Level, bis 0,06 s), bleibt länger (Extrarunden, ab Level 12 mindestens zwei Ausfahrten).
- **Rush Hour** in den letzten 4 Autos: Tempo auf 135 %, Dichte +2, Punkte ×2. Dichte und Tempo steigen zudem über die ersten 20 s: Wer auf die perfekte Lücke wartet, bekommt mehr Verkehr, keinen leichteren.
- **Fließender Schichtwechsel, kein Ergebnis-Screen:** Das Ergebnis steht in derselben oberen Karte, der Ring schickt einen Lichtlauf herum. Nach dem Nachklang wird es von selbst zum Wartebildschirm der nächsten Schicht, deren Verkehr schon fährt; das Tempo gleitet zum neuen Start-Tempo, die Autos der nächsten Schicht rollen von hinten in die Warteschlange. Ein Tap startet jederzeit. Kein Freeze, kein Replay, keine Einblendung.
- **Kein Pause-Screen:** Wer den Browser-Tab verlässt, friert die Welt ein; beim Zurückkommen wird eingezählt.
- **Kein Tap-Cooldown:** Das nächste Auto steht ≈ 0,3 s nach dem Tap an der Haltelinie; ein früher Tap wird gehalten. Eigene Autos bewerten sich nicht gegenseitig, schnelles Tippen gibt also keine geschenkten Tight Fits.
- **Kein verschluckter Tap:** Das nachrückende Auto fährt weich an und bremst weich an der Haltelinie (Bremslichter an). Kommt der Tap zu früh, leuchtet kurz die Lichthupe auf, das Auto rollt ohne Stocken durch die Linie in sein Einfädeln, sobald zum vorderen eigenen Auto mindestens 4 Einheiten Platz sind.
- **Taps mit Zeitstempel:** Gezählt wird der Moment von `pointerdown`, nicht der nächste Frame.
- **Einfädeln bei Stau** (30.09.2026): Ein einfädelndes Auto bremst hinter langsamem oder stehendem Verkehr an seiner Einmündung und fährt an der Haltelinie sanft los. Bei fließendem Verkehr bleibt das Timing exakt.
- **Schichtlänge – entschieden: kurz lassen** (Leo, 26.09.2026). Je nach Level 8–75 s. Kurze Schichten tragen das „Nur noch eine!“.
- **Zwei Spuren ab Level 80** (30.09.2026): innere Spur, die synchron mit der äußeren dreht; 40 % der KI und 35 % deiner Autos (nie Polizei) fahren innen und kreuzen beim Ein- und Ausfahren die äußere Spur. Die Innenspur wird etwas weiter hinten befahren (Einfädelwinkel 0,42 statt 0,26). Ein Pfeil vor der Haltelinie zeigt die Spur des vorderen Autos. Wer innen ausfahren will, prüft die Kreuzung und dreht sonst eine Runde. Die Insel wird kleiner (`layout.islandRadius`).

---

## 3. Game-Over-Regeln (Hard vs. Soft Fail)

| Ereignis | Konsequenz |
|---|---|
| **Verbrecher-Pickup entkommt** (Countdown abgelaufen) | **Hard Fail** – Schicht verloren (ab Level 20 zusätzlich 350 Verlust) |
| **Normales Auto crasht** | **Hard Fail** (`maxStrikes = 1`; ab Level 20 kostet der Crash Geld) |
| **Polizeiauto crasht** | Soft Fail: kostet 250 Punkte & Combo, **3 erlaubt** (`maxPoliceCrashes = 3`, Upgrade *Backup* +1 pro Stufe), der 4. = Hard Fail |
| **Militär-Truck geht hoch** | Hard Fail („KABOOM“, dasselbe Level noch einmal); in Mayhem das Finale |
| **Folgeunfälle im Verkehr** | Kosten standardmäßig **keine** Strikes (umschaltbar); wer in einen sichtbaren Unfall einfädelt, bleibt 1 s verantwortlich |
| **Regel gebrochen** (Trial „flawless“, Legendary Shift *Zero Tolerance*) | Schicht endet als *failed*: schon ein Crash oder Cut-off genügt |

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
| **Jammed** | Auto, das sich hinter langsamem Verkehr einfädelt (Tempo < 90 % des geplanten) | 0 | Combo und Kette bleiben, wie sie sind |

- **Combo-Multiplikator:** 0–4 ×1 · 5–9 ×1,5 · 10–19 ×2 · 20+ ×3.
- **Critical Merge** (Leo, 28.09.2026): 7 % der Perfect Inputs und Near Misses sind kritisch, ihre Punkte zählen ×3 („CRITICAL“). Die Ziehung kommt aus dem Seed: gleiche Taps = gleiche Criticals. Nicht in Mayhem und Multiplayer.
- **Close Shave:** Ein Tight Fit oder Near Miss direkt neben einem Motorrad gibt +150 × Combo (× Rush Hour).
- **Jammed** (Leo, 01.10.2026, Fix): Nach einem Crash ließen sich Autos hintereinander im Schritttempo einfädeln, jedes +1 Combo, in Unlimited sogar ein Rekord ohne Spiel. Ein Auto, das sich hinter langsamem Verkehr hineinbremst, hat nichts getimt: Anzeige „Jammed · no points“, keine Punkte, in Unlimited zählt es nicht als Auto.
- **Perfect Chain:** zählt Perfect Inputs, Near Misses, Tight Fits, Takedowns, gerettete Transporter und freie Straßen für Notfallfahrten und Fahrschulauto in Folge; eine normale saubere Einfädelung, ein Cut-off oder ein Crash beendet sie. Keine eigene Anzeige.
- **Flow State:** ab Kette 5 – Ring-Glow, Sound-Layer, die Stadt atmet mit. Nur Feedback, kein Modus, kein Text.
- **Schichtabschluss:** +1.000 Punkte.
- **Perfect Run:** geschaffte Schicht ohne Crash (Polizei eingeschlossen) und ohne Cut-off: **+1.500 Punkte, +25 % Lohn** (nicht in Mayhem). Der erste sagt einmal, was er bringt.
- **Rekord-Geist:** Bestzeit pro Level (pro Auto); live als ±Sekunden im HUD, „NEW BEST TIME“ beim Übertreffen. Ein Prestige löscht die Bestzeiten (neue Straße).
- **Timing** (Records): wie früh (−) oder spät (+) die letzten 50 Merges im Schnitt getippt waren, gemessen an der Mitte der Lücke (`core/timing.ts`).
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
| **Entkommt er** | Schicht verloren (Hard Fail); beim nächsten Verbrecher erinnert das Spiel, wie man ihn fängt |
| **Takedown** | 1.000 Pkt × Multiplikator × Rush Hour, kurze Slow-Mo, Soft-Body-Deformation, Splitter in Polizeifarben, „BUSTED!“, Combo bleibt |
| **Zählt nicht** | wenn der Verbrecher selbst ins Polizeiauto fährt |
| **Einsatzfahrt (Dispatch)** | Dispatch-Button, `D`, `E` oder Rechtsklick: das nächste Auto wird Polizei, Combo × 0,5 (*Dispatch Radio* +10 % pro Stufe zurück) |
| **Verfolgung im Ring** | Polizeiauto direkt hinter dem Pickup jagt mit bis ×1,4 Tempo (*Interceptor* +0,1/Stufe) und rammt ihn |
| **Masse** | Pickup = 2,5× Auto. **Was beschädigt ist, fährt nicht mehr:** Jeder Treffer ohne Takedown macht auch den Pickup zum Wrack – die Jagd endet ohne Punkte und ohne verlorene Schicht |
| **Blaulicht** | nur Blau (deutscher Lichtbalken), LED-Doppelblitze, weicher Schein auf der Straße, jedes Polizeiauto im eigenen Takt |

### Syndikats-Bosse (28.09.2026, Werte in `config.ts`)

- **Jedes 15. Level** (15, 30, 45 …) ist der erste Verbrecher der Schicht der **Boss** des Syndikats. Er kommt früh (nach 1,5–3 s), mit 3 s Warnung („SYNDICATE CONVOY“ usw.), und bleibt länger im Ring als ein normaler Verbrecher. Die vier Bosse wechseln der Reihe nach, jede Runde beginnt von vorn:

| Boss | Level | Eskorte | Zeit (× Verbrecher-Countdown) | Besonderheit |
|---|---|---|---|---|
| **The Convoy** | 15 | 2 gepanzerte Begleiter direkt dahinter | ×1,5 | das Polizeiauto muss genau in die Lücke zwischen Boss und Begleitern getimt werden; ein Treffer auf einen Begleiter ist ein normaler Crash |
| **The Getaway Driver** | 30 | keine | ×0,7 | schnell weg; ein Polizeiauto muss bereitstehen |
| **The Armoured Boss** | 45 | 1 | ×1,8 | steckt den ersten Rammstoß weg („ARMOUR CRACKED“), ein zweites Polizeiauto nötig |
| **The Phantom** | 60 | 1 | ×1,6 | kommt im Blackout, fährt ohne Licht |

- **Ab Runde 2 (Level 75+)** je Runde +1 Eskorte (höchstens 3, nur nicht beim Getaway Driver) und ×0,9 Zeit pro Runde.
- **Busted:** Das gestohlene Geld kommt zurück (3.000 + 200 × Level), der Boss zählt als Trophäe in *Records*, +10 Elite XP.
- **Rematch** (Progress → Goals): besiegte Bosse lassen sich noch einmal spielen, eine Runde härter, 20 Autos, fester Seed; zahlt einmal 6.000 / 8.000 / 10.000 / 12.000 (Convoy / Getaway / Armoured / Phantom).
- Auf Boss-Leveln gibt es nie einen Legendary Shift; der Phantom erzwingt einen Blackout.

Weitere Langzeit-Systeme (Legendary Shifts, Prestige, Elite) siehe 12.

---

## 6. Geldtransporter-Mechanik

| Element | Details |
|---|---|
| **Aussehen** | gepanzerter Kastenwagen in Panzergrün, Goldmünze, Goldstreifen, Rundumleuchte |
| **Spawn** | erster nach 8–14 s, Pause danach 15–25 s (*Cash Route* −0,4 s pro Stufe; jede Zusatz-Zufahrt −15 %); Warnung 2 s vorher als pulsierender Keil in Transporter-Farbe auf dem Inselrand |
| **Ziel** | Unbeschadet die markierte Ausfahrt nehmen → **450 Geld** (× Rush Hour) |
| **Jackpot** (Leo, 28.09.2026) | 8 % der Transporter sind ein Jackpot: vergoldet, angekündigt („JACKPOT!“), zahlen das **5-Fache** (2.250), aber nur wenn er durchkommt. Der Countdown steht in Sekunden |
| **Sperrzone** | 130 Einheiten (≈ 5 Autolängen) um den Transporter, auf dem Ring als Bogen sichtbar |
| **Polizei in Sperrzone** | Transporter wird **beschlagnahmt** → kein Geld, keine Strafe |
| **Normales Auto in Sperrzone** | **Abschirmen** → +50 Bonus pro Auto |
| **Transporter crasht** | Wrack, Geld weg („LOST“); er bremst und crasht wie jeder andere Fahrer (Masse 1,6) |
| **Countdown** | 10 s, dann nimmt er seine Ausfahrt; ist das letzte Auto vorher drin, sofortige Auszahlung |
| **Double Run** (Upgrade) | 4 % pro Stufe Chance auf einen zweiten Transporter direkt danach |

Kein Transporter in Mayhem und im Multiplayer. Gold am ganzen Auto bleibt dem Jackpot-Transporter vorbehalten (Skins sind nie ganz golden).

---

## 7. Verkehr: Bots im Ring, KI, Lkw & Fahrzeugtypen

### Bots im Ring (Playtest Leo, 24.09.2026)

Der Spieler soll Lücken treffen, keine Kolonnen bilden.

- **`minRingBots`:** Level 1–4: 3 · ab Level 5: 4 · ab Level 9: 5; ein größerer Kreisverkehr skaliert mit. Jede Schicht startet mit mindestens so vielen Bots.
- **Halteregel:** Ein Bot fährt erst raus, wenn danach noch genug drin sind, sonst dreht er eine weitere Runde. Entscheidung 1,5 s vor der Ausfahrt. Fehlt ein Bot, kommt sofort Ersatz.
- **Dichte zählt nur KI-Autos,** nicht die des Spielers.
- **Stauwellen lösen sich auf:** Ohne Wrack und ohne Modul-Schlange darf ein Bot trotz Minimum raus; Rückfallebene nach 20 s Bremsen.
- **Die KI wartet nur bei Störungen nahe ihrer Einfahrt** (bis 2,5 s voraus, 1,5 s zurück), fädelt nur mit sicherer Lücke ein und verursacht nie einen Crash. Wartet ein KI-Auto 2,5 s an der Linie, drängt es sich beim nächsten Auto ohne Berührung hinein (`aiPatience`): ein Strom eigener Autos kann die anderen Arme nicht aushungern.
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

### Notfallfahrten: Krankenwagen & Feuerwehr (Leo, 28.09. / 30.09.2026)

- **Krankenwagen:** ab Level 8, 40 % pro Schicht (nicht in Mayhem und Multiplayer), früh in der Schicht (2–5 s), 2 s Warnung („AMBULANCE“); drängt sich rein wie der Verbrecher und fährt fast eine Runde.
- **Die Straße vor ihm** (120 Einheiten) muss frei bleiben: wer dort einfädelt, verliert Combo und Chain („BLOCKED“). Frei durch: **+300** und Chain +1 („CLEAR ROAD“). Er verursacht nie selbst einen Crash.
- **Feuerwehr:** ab Level 35 ist jede zweite Notfallfahrt (45 %) eine Feuerwehr: lang und schwer (Masse 2,4), **190** statt 120 Einheiten freie Straße, zahlt **500**.

### Motorrad (ab Level 22, 30.09.2026)

12 % der neuen KI-Autos: schmal (Breite 7, Länge 15), leicht, fädelt schnell in 0,1-s-Lücken ein (ein Auto will 0,25 s), eine Lücke, auf die man gezählt hat, kann also weg sein. Tight Fit/Near Miss daneben: +150 × Combo („CLOSE SHAVE“). Kennzeichnung „BIKE“.

### Fahrschulauto (ab Level 28, 30.09.2026)

30 % der Schichten, angekündigt („LEARNER DRIVER“), eine Runde, zögert alle 2–4 s kurz (bremst auf 35 %); der Verkehr dahinter staut sich. Ein grünes Band vorne und hinten (80 Einheiten) frei halten: **+250** und Chain +1 („PATIENCE“). Wer nah einfädelt, verliert nur den Bonus („TOO CLOSE“).

### Schulbus (City Event *School Run*, ab Level 30)

Schulbusse (28 % des neuen Verkehrs, Länge 44, Masse 2,4) halten 1,6 s an einer Haltestelle auf dem Ring; der Verkehr dahinter wartet. Die beste Lücke öffnet sich direkt nach dem Anfahren.

### Fahrzeugtypen des Spielers (freischaltbar, LOOT.md)

Ein Typ hat Spielwerte, ein Skin nur Aussehen – **anders, nicht besser**. Jeder freigeschaltete Typ taucht gelegentlich in der eigenen Schlange auf.

| Typ | Anteil | Eigenschaften |
|---|---|---|
| **Compact** (Rare) | 12 % | sehr kurz (18), leicht (0,7), fädelt 15 % **langsamer** ein |
| **Sports Car** (Epic) | 15 % | kürzer (21), leichter (0,8), fädelt 20 % schneller ein |
| **Van** (Epic) | 12 % | lang (29), schwer (1,5), fädelt 10 % schneller ein |
| **Classic** (Legendary, Honour) | 10 % | fährt wie ein Auto, etwas länger (25) und schwerer (1,1); lange Haube, Chromstoßstangen. Nur als seltener Fund in der Standard Chest (1 zu 500) |

---

## 8. Wetter, Nacht & City Events

**Erste Begegnung (Leo, 29.09.2026):** Bringt eine Schicht eine Bedingung, in der der Spieler noch nie gespielt hat, erklärt eine Karte unter der oberen Leiste auf dem Wartebildschirm, was sie ist und was sich ändert („New · Roadworks“ + ein Satz, `INTRO_TEXT` in `present/strings.ts`). Sie kommt einen Moment nach dem Wartebildschirm, blockiert nichts und geht mit dem Start. Erst dann zählt die Bedingung als gesehen (Museum, `sightings`), die Karte erscheint also genau einmal. Ist der Bildschirm zu niedrig, zeigt sie nur den Namen und die Kurzzeile aus dem Museum. Eine neue Bedingung braucht ihren Satz, sonst bricht der Build ab. Gesehen zählt überhaupt nur, was in einer laufenden Schicht vorkommt, nicht der Verkehr hinter den Tabs, und erst nach dem Tutorial.

**Briefings (Leo, 01.10.2026):** Spezialfahrzeuge, Bosse und Bedingungen sagen beim ersten Auftauchen in einer laufenden Schicht in der **oberen Karte**, was zu tun ist („Ram the boss with a police car, in the gap before its escorts“): Die Zahlen blenden aus, ein Satz blendet ein (`present/briefing.ts`). Eine Aufgabe mit Ende (Verbrecher fangen, Straße vor dem Krankenwagen frei halten, Transporter durchlassen, Militär-Truck, Fahrschulauto) bleibt, bis sie vorbei ist (mindestens 3,5 s, höchstens 40 s); alles andere bleibt 5 s. Mehrere reihen sich ein, eine Aufgabe geht vor bloßen Neuigkeiten. Kostete eine Begegnung die letzte Schicht, kommt der Hinweis in der nächsten noch einmal („Remember“). Neues Wetter und neue City Events bekommen ihre Sekunden zu Schichtbeginn. Die Texte stehen im Museum (`brief` je Eintrag); der Build bricht ab, wenn einer fehlt.

### Wetter (pro Schicht ausgelost)

Chance ab Level 6: +2 % pro Level (Level 6 = 2 %), höchstens 40 %. Vorher auf dem Wartebildschirm angekündigt. Welche Art, hängt vom Level ab; Gewichte: Light Rain 4, Heavy Rain 3, Storm 2, Extreme 1, Fog 3, Snow 2 (nur Arten, die ab dem Level offen sind).

| Stufe | ab Level | Wirkung |
|---|---|---|
| Clear | 1 | – |
| Light Rain | 6 | Reifen haften schlechter (85 %, Wracks rutschen weiter), Fahrer reagieren etwas später (+0,1 s), bremsen schwächer (−10 %) |
| Heavy Rain | 12 | Grip 70 %, +0,2 s Reaktion, −20 % Bremse, dazu +1 Auto Dichte |
| Storm | 18 | Grip 55 %, +0,3 s, +2 Dichte, KI drängelt (Lücken ×0,8) |
| Extreme | 25, selten | Grip 40 %, +0,4 s, +3 Dichte, häufiger Blitze im Bild (die Regeln sind die eines starken Sturms) |
| **Fog** | 35 | Sicht nur im Bild (die Gegenseite des Rings blendet aus, Warnungen leuchten durch), Fahrer reagieren 0,3 s später, **Lohn ×1,1** |
| **Snow & Ice** | 45 | Reifen 45 % Grip, Bremse 60 %, +0,15 s Reaktion, Reifenspuren bleiben im Schnee liegen, **Lohn ×1,15** |

Fair bleibt es: Das Tap-Timing ändert sich nie; Sonderfahrzeuge, Warnungen und Countdown-Ringe liegen immer über den Wettereffekten.

**Wetter zieht auf (01.10.2026):** Beim Schichtwechsel springt das Bild nicht um. Das alte Wetter dünnt in 2,5 s aus, das neue setzt ein: Regen Tropfen für Tropfen, Nebel, Schnee und die Abdunklung im Sturm blenden über (`WeatherFade` in `present/weather.ts`). Nur das Bild; die Regeln haben das neue Wetter sofort, die Ready-Karte nennt es. Regen und Schnee sind außerdem deutlich leichter für schwache Handys gezeichnet.

### Nacht und Blackout (nur Web)

- **Nacht** ab Level 10: Chance 3 % pro Level ab Level 10 (Level 10 = 3 %), höchstens 20 %. Die Stadt wird dunkel, man fädelt nach den Lichtern der Autos ein.
- **Blackout** ab Level 20: 35 % der Nächte, auch die Straßenlaternen sind aus; nur Scheinwerfer und Rücklichter zeigen den Verkehr. Der Phantom-Boss und der Legendary Shift *Dark Storm* erzwingen einen Blackout.
- **Nur das Bild ändert sich, nicht die Regeln.** Dafür zahlt die Schicht mehr: Nacht ×1,1, Blackout ×1,25 Lohn.

### City Events (höchstens eins pro Schicht, ab Level 4 mit 25 % Chance, vorher angekündigt)

| Event | ab Level | Wirkung |
|---|---|---|
| Roadworks (Baustelle) | 4 | ein Ringabschnitt (110 Einheiten) fährt langsamer (×0,6) |
| Road Closure (Sperrung) | 4 | eine KI-Zufahrt ist zu, die anderen bekommen ihren Verkehr (nur bei mindestens 4 Armen) |
| Concert Traffic | 4 | eine Zufahrt schickt eine Welle dicht folgender Autos (+2 Dichte, KI-Spawns doppelt so schnell) |
| VIP Convoy | 4 | +1 Dichte, alle KI-Fahrer halten 60 % mehr Abstand: breite Lücken mit neuem Rhythmus |
| Police Operation | 4 | +15 % Polizei in der Schlange |
| **School Run** | 30 | Schulbusse halten an einer Haltestelle auf dem Ring (siehe 7) |

Events ändern Tempo, Dichte oder Lücken – nie die Regeln. Nach einer geschafften Schicht mit City Event: 15 % Event Chest.

---

## 9. Wirtschaft & Meta-Progression

### Geld verdienen

| Quelle | Betrag |
|---|---|
| Schichtabschluss | 150 + 30 × Level (*Overtime* +4 %/Stufe, +10 % pro Zusatz-Zufahrt, Nacht ×1,1 / Blackout ×1,25, Nebel ×1,1, Schnee ×1,15, Daily-Serie ab 3 Tagen ×1,15) |
| Unlimited | 20 pro geschicktem Auto |
| Geretteter Transporter | 450 (Rush Hour ×2, Jackpot ×5) |
| Abschirm-Bonus | 50 pro Auto in der Sperrzone |
| Krankenwagen / Feuerwehr / Fahrschulauto | 300 / 500 / 250 |
| Perfect Run | +25 % Lohn |
| Boss busted | 3.000 + 200 × Level; Rematch 6.000–12.000 |
| Daily Shift | 300 × Serie (bis 7 Tage → 2.100) + Event Chest |
| Weekly Shift | 6.000 + Premium-Truhe, einmal pro Woche |
| Quests (3 pro Tag) | 250 / 350 / 500 je Quest |
| Trials | 1.500 – 5.000, je einmal (siehe 11) |
| Toll Booth | 6 pro Lkw; Speed Camera 3 pro Auto über dem Limit – **nur in den ersten 60 s** einer Schicht |
| Daily Login | 30 pro Toll Booth pro Tag Abwesenheit, höchstens 3 Tage |
| Duplikate aus Truhen | Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000 |
| Alben (voller Satz, einmalig) | 5.000 – 60.000 (siehe 10) |
| Saison-Pass | 5.000 / 10.000 / 20.000 / 30.000 auf vier Stufen (siehe 12) |
| Casino | Spielgeld, siehe unten |

Geld bleibt auch aus verlorenen Schichten. Der Kontostand steht immer links in der oberen Karte und zählt schon während der Schicht hoch.

### Geld ausgeben

| Bereich | Was | Preis |
|---|---|---|
| **Upgrades** (Build → Upgrades) | 13 Upgrades, 86 Stufen | erste Stufe 2.600 × Faktor, jede weitere ×1,5 |
| **Zufahrten** (Build → Street Builder) | 5.–8. Arm; je Arm Ring +18 breiter, +25 % Verkehr, Transporter 15 % früher, +10 % Lohn | 32.500 / 65.000 / 130.000 / 260.000 = **487.500** |
| **Module** (Street Builder) | Toll Booth, Speed Camera, Tow Depot auf 6 festen Modulplätzen | 10.400 / 15.600 / 13.000 |
| **Truhen** (Shop) | Standard, Premium | 26.000 / 52.000 |
| **Saison-Pass** (Progress → Today, ab Level 15) | 12 Stufen pro Saison | 150.000 |
| **Ruhmeshalle** (Records → Elite) | Monument mit Plakette pro Prestige-Rang, eigener Skin | 250.000 |

Abreißen (Zufahrten und Module) ist möglich, **nichts wird erstattet.** Verschieben kostet nichts. Die eigene Zufahrt bleibt fest, und es bleiben immer mindestens 4 Zufahrten.

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

### Casino (Shop → Casino, ab Level 12)

Crash, Slots, Skin-Upgrade und Doppelt oder nichts, nur mit Spielgeld **und Skins**; Chancen und Rückzahlquoten stehen offen im Spiel und in [LOOT.md](LOOT.md) („Casino“), `npm run sim:casino` prüft sie. Es gibt keine kaufbare Währung und keine Truhen gegen Echtgeld (CLAUDE.md). Das Casino öffnet leise mit Level 12; nichts im Spiel lenkt dorthin.

| Spiel | Regel | Rückzahlung |
|---|---|---|
| **Crash** | Multiplikator e^(0,18·t), Crash-Punkt vorab gezogen, höchstens 100×; Auto-Ausstieg bei 1,5× / 2× / 5× wählbar | 96 % für jedes Ziel |
| **Slots** | 3 Walzen à 20 gleich wahrscheinliche Stopps; drei Boss 500×, Transporter 150×, Ambulance 100×, Sports Car 40×, Van 15×, Compact 10×, Car 6×, zwei Bosse irgendwo 10×, erste zwei Walzen gleich 2× | 95,45 % |
| **Skin-Upgrade** | 1–5 Truhen-Skins auf einen selteneren; Chance = Einsatzwert / Zielwert × 0,95, höchstens 75 % | 95 % |
| **Doppelt oder nichts** | nach jedem Gewinn freiwillig, faire Münze, höchstens 5× in Folge | 100 % |

Einsätze: 100 · 500 · 1.000 · 5.000 · 25.000 oder All in. Jeder Gewinn zahlt mindestens das Doppelte des Einsatzes. Der Einsatz wird abgezogen und der Stand gespeichert, **bevor** etwas enthüllt wird: Neu laden würfelt nicht neu; eine abgebrochene Crash-Fahrt gibt den Einsatz zurück.

**Darstellung (Leo, 29.09.2026):**
- **Erst die Enthüllung, dann das Geld:** Die Regeln verbuchen eine Runde sofort (fair beim Neuladen). Geld-Chip, Tagessaldo und Verlauf zeigen das Ergebnis aber erst mit der Enthüllung (`Wallet` in `present/casinoWallet.ts`). Der Einsatz fliegt als Münzen vom Chip auf die Bühne, ein Gewinn fliegt zurück und zählt dort hoch.
- **Gewinnstufen nach Vielfachem des Einsatzes, in allen Spielen gleich** (`casinoWinTiers`: 2 · 10 · 40 · 150): mehr Münzen, dann Konfetti, dann Strahlen und ein Stoß, dann ein Goldblitz. Ein gewonnener Skin bekommt mindestens Konfetti.
- **Pro Spiel:** Crash lehnt die Kamera mit dem Multiplikator bis 8 % ans Auto und zählt den Gewinn hoch. Slots verwischen schnelle Walzen, Gewinnsymbole hüpfen nacheinander, die Gewinnlinie zeichnet sich, ein Verlust dunkelt kurz ab. Beim Skin-Upgrade fliegen die Einsätze in den Topf und zerspringen bei Verlust, die Nadel zieht einen Schweif. Bei Doppelt oder nichts wächst ein Münzstapel mit jeder Verdopplung und kippt bei Verlust.
- **Eigene Klänge,** synthetisiert (`Web/audio-src/make_casino_sounds.py`): Walzenstopp, Münzklimpern, Nadel, Crash-Zähler, Münzwurf und -landung, Chips, Splittern.
- **Ehrlich bleibt es:** keine vorgetäuschten Beinahe-Gewinne, kein Jubel bei Verlust, jede Enthüllung überspringbar, Reduce Motion zeigt nur Zählen und Blenden. Die Inszenierung ändert nie das Ergebnis.
- Das Casino lädt als eigenes Paket (`present/casinoLoader.ts`), wenn der Shop mit freigeschaltetem Casino öffnet.

### Freischaltungen und einmalige Hinweise (29.09.2026)

Ein neuer Spieler trifft die Systeme nacheinander (`core/unlocks.ts`, Werte in `config.ts`):

| Was | Ab | Wie es sich zeigt |
|---|---|---|
| Daily Shift (und Serie) | Level 4 | Hinweis „New · the Daily Shift …“; vorher sagt die Quest-Zeile, ab wann |
| Modus-Wischen | nie gesperrt; Hinweis, sobald Level 6 geschafft ist (`modeHintAfterLevel`) | Meldung „New modes · swipe sideways …“, danach bis zum ersten Wechsel die Zeile „Swipe for more modes“ am Game-Tab |
| Trials (Progress) | Level 9 | Hinweis „New · Trials in Progress …“; vorher ist das Segment blass und sagt beim Tippen, ab wann. Jede Trial öffnet erst bei ihrem eigenen Level („Opens at level X“) |
| Casino (Shop) | Level 12 | ohne Hinweis; vorher ist das Segment blass |
| Saison-Pass | Level 15 | im Today-Segment |
| Prestige, Elite-Leiste | Level 50 | Elite-Karte in Records ab Level 40 sichtbar |

**Entzerrt (Leo, 29.09.2026):** vorher Daily 3, Modi 5, Trials 8, Casino 10: fünf neue Systeme in den ersten drei Minuten. Jetzt etwa eins alle ein bis vier Minuten (Daily nach ~1 min, Modi ~2, Trials ~4, Casino ~8). Wer ein System schon vorher benutzt hat (oder ein Prestige hat), behält es.

**Einmalige Hinweise** (`hints` im Spielstand; `present/notices.ts`: jede Meldung in ihrer eigenen Zeile, nacheinander, oben unter der Punktzahl, damit der Daumen sie nicht verdeckt):
- **Willkommens-Truhe:** beim ersten geschafften Level (Level 2 erreicht) eine Standard Chest, einmal, nie nach einem Prestige.
- Nach Level 4 (also ab Level 5) bittet das Spiel den Browser, den Speicher dauerhaft zu behalten (`storage.persist()`), und schlägt die Installation vor: auf iPhone und iPad als bildschirmfüllender Hinweis mit den drei Schritten zum Home-Bildschirm (`installDialog` in `ui/sheets.ts`), sonst als Zeile. Nicht im Play-Store-Rahmen und nicht auf CrazyGames.
- Ab Level 3 erscheint einmal pro Gerät ein Cloud-sync-Hinweis (`cloudIntroFromLevel`); nach Level 12 empfiehlt das Spiel Cloud sync, solange das Gerät keine Cloud-Kopie hat.
- Der erste Perfect Run sagt, was er bringt.
- Läuft ein Gerät langsam, wird einmal Reduce Motion empfohlen (nie von selbst eingeschaltet).
- Schreibt der Browser nicht mehr (privates Fenster, Speicher voll), sagt das Spiel es einmal pro Sitzung.

### Street Builder & Module

- **Ziehen und Ablegen** aus der Palette auf leuchtende Steckplätze (16 Plätze, Mindestabstand 2, Vollausbau 8 Zufahrten); fehlt Geld, wackelt es und der Preis wird rot.
- **Gebaute Teile** (Leo, 02.10.2026): Ein Tipp auf einen gebauten Arm oder ein Modul öffnet ein Sheet: was es macht, ein kleiner Kreisverkehr mit dem Teil hervorgehoben (auch wenn das Sheet es auf der Karte verdeckt), dazu **Move** und **Delete**.
  - **Move** hebt das Teil an: Es atmet an seinem Platz, die freien Plätze leuchten; per Drag & Drop oder per Tipp auf einen freien Platz verschieben, ein Tipp daneben lässt es stehen. **Verschieben ist kostenlos** (`Careers.moveArm`, `moveModule`); ein Arm braucht weiter 2 Plätze Abstand, ein Modul einen leeren Platz. Die eigene Zufahrt bleibt fest.
  - **Delete** fragt einmal nach (der Knopf wird rot gefüllt, „Tap again to delete“, 3 s), dann wird abgerissen. Nichts wird erstattet; unter 5 Armen ist Delete für Arme gesperrt.
- **Toll Booth:** Lkw zahlen, der Abschnitt staut (Zone 150 Einheiten, Tempo ×0,55). Der Stau behindert Polizei → Verbrecher entkommen leichter.
- **Speed Camera:** kurze, scharfe Zone (44 Einheiten), alle bremsen (×0,7); zahlt nur über 108 % Grundtempo.
- **Tow Depot:** Wracks in seiner Zone (180 Einheiten) verschwinden 30 % schneller; nach einem Crash fährt kurz ein Abschleppwagen hin.
- **City Evolution:** um den Kreisverkehr wachsen mit Level, Zufahrten und Modulen Stadtblöcke, Bäume und Infrastruktur – rein Darstellung.

---

## 10. Sammeln: Truhen, Skins, Mastery, Alben

Details und alle Item-Listen: [LOOT.md](LOOT.md) (Liste im Code: `Web/src/core/loot.ts`).

- **Nur Aussehen.** Kein Skin gibt einen Spielvorteil. Sonderfahrzeuge bleiben an der **Form** erkennbar, nicht an der Farbe.
- **102 Items:** 74 Car Skins (39 aus Truhen, 3 Daily-Serie, 4 Saison, 12 Saison-Pass, 16 Ehren-Skins aus Legendary Shifts, Prestige, Elite und Ruhmeshalle), 24 Map Skins (21 aus Truhen, 3 Ehren-Maps) und 4 Fahrzeugtypen (der Classic ist ein Honour). Im Shop vier Regale (seit 01.10.2026): **Cars** (Truhen-Skins nach Seltenheit mit Überschriften, dazu Fahrzeuge und Saison-Skins), **Maps**, **Honours** (Legendary Shifts, Prestige, Elite, Feats, Ruhmeshalle, Daily-Serie, der Classic), **Pass**. Das Raster scrollt (4 Spalten); Chips und Überschriften zeigen den Fortschritt.
- **Skins mischen:** bis zu **5 Car Skins** gleichzeitig; **jedes Fahrzeug** im Level trägt einen davon, fest pro Fahrzeug. Ein Map Skin.
- **Map Skins** färben den Boden der Stadt (Tag-Maps hell und satt, Nacht-Maps dunkel), tönen die Mittelinsel, säumen die Straßen mit eigenen Pflanzen und bringen ein **Herzstück** mit Animation. Jede Map hat ein kleines Diorama in der Collection.
- **Car Skins:** Farben, Rennstreifen, zweifarbige Dächer, **Shiny** (Lichtstreif) und **Glitter** (Funkeln); Pass- und Feat-Skins mit eigenen Effekten (Schneespur, Regenbogen, Lavarisse, Blitze, kreisende Lichtkrone …).
- **Big Screen** (Prestige ★5): eine Map, die statt der Stadt das **eigene Bild oder Video** zeigt (YouTube-Link, Bild, Videodatei oder Upload eines Bildes vom Gerät, gedämpft hinter dem Ring, Videos stumm in Schleife). Ein hochgeladenes Bild bleibt auf dem Gerät (`carGame.backdrop.v1`).

### Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Standard | **Willkommens-Truhe** beim ersten geschafften Level (einmal), Lucky Drop (6 % je geschaffter Schicht), Shop (26.000), Werbung (3/Tag), Mastery Stufe I, Elite-Level, Saison-Pass | 70 % | 22 % | 7 % | 1 % |
| Premium | Shop (52.000), Mastery Stufe II/III, Legendary Shift, Weekly Shift, jedes zehnte Elite-Level, Saison-Pass | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt | Mastery „Crime Fighter“ | 50 % | 30 % | 15 % | 5 % |
| Event | jede geschaffte Daily Shift; 15 % nach jeder geschafften Schicht mit City Event; Saison-Pass | 40 % | 35 % | 20 % | 5 % |

- **Odds immer sichtbar**, **Pity:** spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic.
- **Der Fund (Leo, 01.10.2026):** Jede Standard Chest enthält mit **1 zu 500** den **Classic**, solange man ihn nicht hat. Die Chance steht bei den Odds.
- **Der Event Chest** enthält in der Hälfte der Fälle das Saison-Item (Frost, Blossom, Sunburst, Pumpkin), das es nur in seiner Saison gibt.
- **Kein Echtgeld.** Eine Standard-Truhe gibt es auch für eine Werbung, bis zu 3 pro Tag: auf CrazyGames deren **Rewarded Ad** (die Truhe erst, wenn sie zu Ende lief), sonst eine **Platzhalter-Werbung** (kein Werbepartner angebunden, kein Geld dafür).
- **Öffnung „splashy, fruity“:** Squash & Stretch, Splash-Blobs, Konfetti, Strahlen, Jelly-Pop; Legendary mit Goldregen. Das Rollen der Karten zeigt in 70 % der Fälle eine Legendary-Karte knapp neben dem Gewinn (nur Anzeige, die Chancen bleiben). Reduce Motion nur Blende.

### Mastery

Acht Ziele mit je drei Stufen zählen über die ganze Laufbahn; beim Erreichen erscheint ein Toast, die Truhe liegt im Shop. Der Stand ist unter **Progress → Goals** einsehbar.

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

Stufe I gibt eine Standard-, höhere Stufen eine Premium-Truhe; Crime Fighter gibt Stufe I–II Criminal Hunt, Stufe III Premium. Die obersten Stufen von Perfect Timing, Combo Master und Close Calls geben Titel (siehe 12).

### Alben

Ein voller Satz zahlt einmal Geld und legt einen **Rahmen** in seiner Farbe um den Kreisverkehr (der wertvollste zählt).

| Album | Inhalt | Belohnung |
|---|---|---|
| Commons / Rares / Epics / Legends | alle Car Skins der Seltenheit aus Truhen (10 / 11 / 10 / 8) | 5.000 / 10.000 / 20.000 / 40.000 |
| Maps | alle 21 Map Skins aus Truhen | 10.000 |
| Seasons | 4 Saison-Items | 30.000 |
| Loyalty | 3 Serien-Items | 20.000 |
| Honours | alle 19 Ehren-Items (Legendary Shifts, Prestige, Elite, Feats, Ruhmeshalle; ohne den Classic, der Glück ist) | 50.000 |
| Season Pass | alle 12 Pass-Skins | 60.000 |

---

## 11. Täglich, wöchentlich & Mitspielen

### Daily Shift (ab Level 4)

- Automatisch die **erste Schicht des Tages**, ein Versuch, Titel „DAILY SHIFT“. Ein Tages-Seed für alle, immer mit einem City Event (jeden Tag ein anderes, im Kreis über die sechs). Nie eine Legendary-Regel. Geschafft → 300 × Serie Geld (bis 7 Tage) + Event Chest. Die allererste Schicht ist nie die Daily.
- **Serie:** zählt gespielte Tage. 7 / 14 / 30 Tage geben exklusive Skins (Bronze Badge, Silver Badge, Gold Laurel). Ab **3 Tagen in Folge zahlt jede Schicht 15 % mehr** (Schichtlohn, Transporter, Abschirm-Bonus, Krankenwagen), solange die Serie lebt. Sechs Stunden vor Mitternacht warnt die Wartekarte, dass sie bald reißt.
- **Saisons:** siehe Event Chest in 10 und Saison-Pass in 12.

### Quests

3 kleine Ziele pro Tag, für alle gleich, je einmal bezahlt, wechseln um Mitternacht. Unter **Progress → Today**. Sieben mögliche: 3 Perfect Inputs (250) · 3 Tight Fits (250) · Combo 15 (250) · 2 Takedowns (350) · 2 Transporter (350) · Perfect Chain 8 (350) · ein Perfect Run (500).

### Weekly Shift

Eine Schicht pro Woche (neu jeden Montag), für alle gleich (Seed aus der Woche, kein Server nötig). Beliebig oft spielbar, zahlt **einmal pro Woche 6.000 + eine Premium-Truhe**. Sechs Formen im Wechsel:

| Form | Schicht |
|---|---|
| Flawless | Level 16–24, 18–22 Autos, kein Crash und kein Cut-off |
| Precision | Level 10–16, 16 Autos, 5–7 Perfect Inputs |
| Storm Front | Level 20–28, 18–22 Autos, Sturm bei Nacht |
| Gridlock | Level 18–24, 14–18 Autos, Rush Hour von Anfang an |
| Dragnet | Level 18–24, 18–22 Autos, Verbrecher doppelt so oft |
| Boss Hunt | Level eines Syndikats-Bosses, den Boss festnehmen |

(Bis 01.10.2026 „Weekly Elite“; umbenannt, damit es nicht mit der Elite-Leiste verwechselt wird.)

### Records, Wartekarte und „fast geschafft“

- **Records** (Progress): Highscore, Level, Bestcombo, längste Kette, Daily-Serie, Schichten, Takedowns, Transporter, Perfect Inputs, Unlimited- und Mayhem-Rekorde, Syndikats-Bosse, Prestige, Legendary Shifts, Weekly Shifts, Krankenwagen, Sammlung, **Timing**. Sechs große Werte oben, der Rest unter „All stats“; Modi, die man nie gespielt hat, zeigen keine Strichzeile.
- **Offene Schleifen** (Leo, 28.09.2026): Es gibt immer ein Nächstes in Reichweite. Die Wartekarte nennt die nächste offene Quest oder die Mastery-Stufe, die am nächsten ist, und das Upgrade, auf das das Geld am schnellsten reicht. Nach einer verlorenen Schicht sagt das Spiel ehrlich, wie knapp es war: „1 car short of level 12“, „1.250 points short of your best“, „One merge short of ×2“ (nur wenn es wirklich knapp war).
- **Tutorial:** in der ersten Schicht, ohne Menü und ohne Pause – pulsierender Ring am vordersten Auto, „Wait for a gap, then tap“, Combo-Hinweis, beim ersten Crash „Cars crash instantly. Police get 3 chances.“

### Trials (Progress → Goals, ab Level 9)

Sieben feste Schichten mit festem Seed (alle treffen denselben Verkehr), frischem Kreisverkehr mit 4 Armen, ohne eigene Upgrades. Eine Zusatzregel beendet die Schicht als *failed*, wenn sie gebrochen wird. Jede Trial zahlt einmal. **Die leichteste steht oben, und jede öffnet erst bei ihrem Level.** Trials, die Perfects oder Tight Fits zählen, zeigen den Fortschritt live unter der oberen Karte und erklären auf ihrem Startbildschirm, was ein Perfect Input (die Mitte einer mittleren Lücke, nicht der größten) und ein Tight Fit verlangt. Die vier Boss-Rematches gehören ebenfalls dazu (siehe 5).

| Trial | Level | Autos | Ziel / Bedingung | Belohnung |
|---|---|---|---|---|
| Dead Centre | 6 | 12 | mindestens 4 Perfect Inputs | 1.500 |
| Tight Squeeze | 8 | 8 | mindestens 5 Einfädelungen Tight Fit, Near Miss oder Perfect | 1.500 |
| Clean Sheet | 12 | 16 | kein Crash, kein Cut-off | 2.500 |
| Marathon | 14 | 40 | schaffen | 4.000 |
| Most Wanted | 15 | 24 | den Syndikats-Boss festnehmen | 5.000 |
| Blackout | 16 | 16 | Nacht, Laternen aus | 3.000 |
| Storm Watch | 20 | 18 | Sturm bei Nacht | 4.000 |

### Challenge-Links (nur Web)

Nach einer Schicht macht „Challenge a friend“ einen Link (`#challenge=…`) mit Seed, Modus, Level, Upgrades, Zufahrten, Modulen und Event. Wer ihn öffnet, spielt dieselbe Schicht aus einer frischen Welt; Ziel ist die Punktzahl (in Mayhem die Flammen) des Absenders. Eine Challenge bringt nichts ein. **Mit dem Dienst** (01.10.2026) wird daraus beim Tippen ein Kurzlink (`…/c/K7M29QXA`), der im Chat ein Vorschaubild zeigt: Kreisverkehr bei Nacht und eine LED-Tafel mit „Beat 12,345“, mit Leaderboard-Namen auch „from Leo“. Ohne Dienst oder ohne Antwort in 2,5 s bleibt es der lange Link (`net/challengeLink.ts`, Server/README).

### Multiplayer (nur Web)

- **Bis zu 4 Freunde auf einem Kreisverkehr**, jeder mit eigener Zufahrt (je Platz eine Farbe: Mint, Koralle, Violett, Gold); 8 Arme, dazwischen KI-Verkehr (Unlimited-Level, keine Polizei, Verbrecher, Wetter, Nacht oder Events).
- **Raus ist,** wessen Auto **beim Einfädeln** crasht, oder wer 10 s fließenden Verkehrs lang kein Auto schickt (die Uhr wartet, solange Wracks liegen, höchstens 3 s pro Auto). Der Letzte gewinnt.
- **Eskalation:** nach 30 s *Rush Hour* (Ring +15 %, etwas mehr Verkehr), nach 60 s *Sudden Death* (+30 %, Stillstandsuhr nur noch 4 s).
- **Risiko zahlt:** Jede Einfädelung füllt die Druckleiste (sauber 1, Tight Fit/Near Miss 3, Perfect 4); voll (16) schickt einen Lkw in der eigenen Farbe auf die Zufahrt vor einem Gegner. Fünf Einfädelungen ohne Cut-off geben ein **Schild** gegen einen leichten Stoß.
- **Ausgeschieden, nicht gelangweilt:** einer anderen Spur folgen (die Kamera neigt sich), Reaktionen (🔥 💀 👏 😮, Tasten 1–4), ein Lkw von der Tribüne pro Match (`T`).
- **Runden:** einzelnes Match, Best of 3 oder 5; Punkte pro Runde 3 / 2 / 1 nach Platz, +1 für die meisten Autos, +1 für die engste Einfädelung. Danach alle auf *Ready*.
- **Beitreten:** Der Host tippt *Host a game* und bekommt einen vierstelligen Code oder einen Einladungslink (`#join=1234`). Bots füllen offene Spuren (ein Freund übernimmt den Platz eines Bots); *Practise against bots* geht ganz ohne Netz.
- **Netz:** Peer-to-Peer über WebRTC mit PeerJS; dessen öffentlicher Broker stellt die Geräte nur einander vor. Dazu seit 01.10.2026 ein **Relay** (Cloudflare TURN, `GET /v1/rtc/ice` vom Dienst) für Handys im Mobilfunk und Schul-WLAN; ohne Antwort bleibt es bei STUN. Wer die Verbindung verliert, behält den Platz und holt auf (Reconnect). Fällt der Host weg, endet das Match für alle.
- **Lockstep:** Alle Geräte rechnen dieselbe deterministische Welt (gleicher Seed, gleiche Taps, 120 Hz). Der Host vergibt jedem Tap seinen Schritt (6 Schritte ≈ 50 ms Eingabeverzögerung für alle) und entscheidet, wer raus ist. Kaputte oder überflutete Nachrichten werden verworfen (`net/messages.ts`).

---

## 12. Langzeit: Legendary, Prestige, Elite, Pass, Ruhmeshalle, Feats

Alles hier ist **nur Aussehen, Titel, Truhen und Geld, nie ein Vorteil auf der Straße.**

### Legendary Shifts (28.09.2026)

Ab Level 25 ist jede Karriere-Schicht mit 6 % eine **Legendary Shift** mit einer Zusatzregel (nie auf Boss-Leveln, nie in Daily, Unlimited und Mayhem). Vorher auf der Wartekarte angekündigt.

| Regel | Wirkung |
|---|---|
| Gridlock | Rush Hour vom ersten bis zum letzten Auto, +2 Dichte |
| Dragnet | Verbrecher bei jeder Schicht, doppelt so oft, Zeit ×0,85 |
| Heavy Load | 45 % Lkw, die Hälfte davon Tanklaster |
| Dark Storm | Sturm im Blackout |
| Zero Tolerance | ein Crash oder Cut-off beendet die Schicht („RULE BROKEN“) |

Geschafft: **Premium-Truhe**, +10 Elite XP. Skins nach der 1. (Laurel), 5. (Crown) und 15. (Phoenix); die 50. gibt den Feat *Undying Flame*.

### Prestige (28.09.2026)

Ab Level 50 (Progress → Records → Elite-Karte → Prestige, mit Rückfrage): zurück auf **Level 1**. Geld, Upgrades, Straßen, Sammlung, Elite-Leiste und Titel bleiben; die Bestzeiten der alten Straße gehen. Der Verkehr läuft pro Rang **10 Level härter** (höchstens +40, also ab ★4); die Boss-Level bleiben bei dem Level, das angezeigt wird. Der Stern steht vor dem Level (★ + Level) und in der Bestenliste (Silber bei ★1, Gold bei ★2, Iris ab ★3, mit einem langsamen Glanz; Antippen erklärt Prestige). Systeme bleiben freigeschaltet.

| Rang | Belohnung |
|---|---|
| ★1 / ★2 / ★3 | Silver Star / Gold Star / Iris Star (Skins) |
| ★5 | **Big Screen** (Map mit eigenem Bild oder Video) |
| ★10 | **Nova** (Skin) · Titel *Ascended* |
| ★15 | **Gilded City** (Map in Blattgold) |
| ★20 | **Singularity** (Skin) · Titel *Eternal* |

### Elite-Leiste (29.09.2026)

Level 50 öffnet die Leiste (Elite-Karte oben in Records ab Level 40 sichtbar), Prestige behält sie. **Elite XP pro Schicht:** 10 für eine geschaffte Schicht, 1 je Perfect Input und Tight Fit (auch in einer verlorenen Schicht), je 10 für einen gestellten Boss und eine geschaffte Legendary Shift. Level 50 ist Elite 1; progressiv (03.10.2026): Elite 1→2 braucht 60 XP, jedes weitere Level 4 XP mehr (`eliteXpPerLevel`, `eliteXpGrowth`). **Jedes Elite-Level zahlt eine Standard Chest, jedes zehnte eine Premium Chest.** Mayhem und Trials zählen nicht.

- **Lackierungen:** Elite 5 Steel Chevron, 15 Blaze Chevron, 25 Jade Chevron, 35 Black Aurum, 45 Halo; Feats bei 75 (Zenith Crown) und 100 (Event Horizon).
- **In der Welt:** goldener Innenrand auf der Mittelinsel, je 10 Elite-Level ein goldener Punkt bei der eigenen Spur (höchstens fünf); die Level-Anzeige oben wird golden.
- **Titel (19):** Elite Driver (1), Road Veteran (10), Ring Master (20), Iron Nerves (30), Road Royalty (40), Living Legend (50); Precision Driver, Combo Master, Close Call Artist (je ein Mastery ganz); Syndicate Breaker (alle Bosse); Night Owl, Storm Chaser (Trials Blackout, Storm Watch); Legend Hunter (15 Legendary Shifts); Star Driver (★3); Ascended (★10), Eternal (★20), Grandmaster (Elite 75), Centurion (Elite 100), Immortal (50 Legendary Shifts). Der erste verdiente Titel wird getragen, jeder andere lässt sich im Elite-Sheet antippen.

### Feats (01.10.2026, Progress → Goals)

Die schwersten Taten im Spiel, nie Glück, nie kaufbar. Jede zeigt Belohnung, Bild, Ziel und Fortschritt, bevor man sie hat. Ausgezahlt wird dort, wo die Tat passiert; ein Spielstand, der schon weiter ist, bekommt sie beim Laden.

| Feat | Ziel | Belohnung |
|---|---|---|
| Big Screen | Prestige ★5 | Map |
| Nova | Prestige ★10 | Skin + Titel *Ascended* |
| Gilded City | Prestige ★15 | Map |
| Singularity | Prestige ★20 | Skin + Titel *Eternal* |
| Zenith Crown | Elite 75 | Skin + Titel *Grandmaster* |
| Event Horizon | Elite 100 | Map + Titel *Centurion* |
| Undying Flame | 50 Legendary Shifts | Skin + Titel *Immortal* |

### Saison-Pass (30.09.2026, Progress → Today, ab Level 15)

150.000 Spielgeld pro Saison, nie Echtgeld. Jede Schicht bringt dieselben XP wie die Elite-Leiste; progressiv (03.10.2026): Stufe 1 braucht 54 XP, jede weitere 12 XP mehr (bis 186), zusammen 1.440 XP, 12 Stufen. Der Pass gilt für die Saison, in der er gekauft wurde (Dezember zählt zum nächsten Winter); danach ist die Strecke zu. Die Strecke ist jede Saison gleich: Standard · 5.000 · **Skin 1** · Standard · 10.000 · Premium · Event · **Skin 2** · 20.000 · Premium · 30.000 · **Skin 3**. Die vier Saisons kommen jedes Jahr wieder, also auch ihre Skins; ein schon besessener Skin zahlt sein Duplikat-Geld. Pass-Skins gibt es in keiner Truhe und im Casino nicht.

| Saison | Stufe 3 (Epic) | Stufe 8 (Legendary) | Stufe 12 (Legendary) |
|---|---|---|---|
| Winter | Blizzard | Northern Lights | Glacier |
| Frühling | Petal Storm | Rainbow Road | Bloom Glow |
| Sommer | Solar Flare | Neon Wave | Lava Core |
| Herbst | Ghost Rider | Harvest Moon | Thunderbolt |

### Ruhmeshalle (30.09.2026)

250.000, sobald die Elite-Leiste offen ist (Records → Elite). Eine goldene Wand auf der Insel mit einem Stern pro Prestige-Rang, eine Plakette pro Rang (Datum, Elite-Level, Bosse, Legendary Shifts) und der Skin **Hall of Famer** (Lorbeer-Aura).

### Museum (Progress → Museum)

Katalog von **30 Einträgen**: 4 Bosse, 11 Spezialfahrzeuge (Police Car, Criminal, Money Transporter, Lorry, Ambulance, Gas Tanker, Military Truck, Fire Engine, Motorbike, Learner Driver, School Bus) und 15 Bedingungen (Two Lanes, 6 Wetter, Night, Blackout, 6 City Events). Ein Eintrag steht gesperrt als graue Silhouette („From Level X“), bis er in einer laufenden Schicht vor dir auf der Straße war; dann zeigt er sich mit allem, was man wissen muss (und seinem Briefing-Satz). Bosse zeigen den Rematch.

**Das Museum wächst mit:** Der Katalog folgt den Inhaltslisten (`BOSS_KINDS`, Fahrzeugtypen, `WEATHERS`, `CITY_EVENTS`, Dunkelheit); der Build bricht ab, bis Level (`core/museum.ts`), Text (`present/strings.ts`) und Bild/Farbe (`present/museum.ts`) eingetragen sind. Ein gewöhnlicher Fahrzeugtyp kommt in `ORDINARY`. Alte Spielstände erhalten automatisch, was sie schon gesehen haben müssen.

---

### Endgame-Erweiterung (02.10.2026)

Für Spieler ab ★4 (Prestige macht den Verkehr ab dort nicht mehr schwerer). Werte in `config.ts`.

- **Vier neue Syndikats-Bosse** (die Runde hat jetzt acht, danach beginnt sie von vorn):
  - **The Twins** (Level 75): ohne Eskorte; kaum ist der erste gefasst, kommt der zweite aus einer anderen Zufahrt (0,8–1,6 s). Erst beide zusammen zählen als Boss.
  - **The Decoy** (90): zwei Eskorten im Boss-Lack; der echte Boss ist der Pickup mit dem Ring.
  - **The Smuggler** (105): doppelt gepanzert, also drei Polizeiautos, keine Eskorte, Zeit ×2,2.
  - **The Kingpin** (120): im Blackout, gepanzert, drei getarnte Eskorten.

  Die Eskorten bleiben im Spielkern Lieferwagen (fair, an der Form erkennbar). Jeder Boss hat ein Rematch (14.000 / 16.000 / 18.000 / 25.000). Rematches behalten ihr Level (Boss-Level + 60), der Boss ist festgelegt. Titel *Syndicate Breaker* gilt weiter für die ersten vier, neu *Syndicate's End* für alle acht.
- **Aufstiegs-Trials** (Progress → Goals, ab ★1): je eine pro Prestige-Rang ★1–★10, Level 66 bis 120, harte Bedingungen (Sturm bei Nacht, Blackout, Schnee, Nebel mit Gridlock, Boss, flawless, Extreme, Dragnet, Heavy Load, Dark Storm). Sie zahlen einmal 15.000 bis 60.000; ★10 gibt den Titel *Summit*. Geprüft mit `node scripts/ascension-sim.mjs`.
- **Unlimited-Stufen:** nach 4:00 Tanklaster, 5:30 Nacht, 7:00 Sturm, 8:30 Militär-Trucks (alle 40–60 s), danach alle 90 s *Overtime* (+1 Dichte, +3 % Tempo, höchstens 6-mal, Tempo bis 175 %). Jede Stufe wird oben angekündigt. Geprüft mit `node scripts/unlimited-sim.mjs`.
- **Unlimited-Meilensteine:** Skins für 250 / 500 / 1.000 Autos in einem Lauf (Endurance, Overdrive, Infinity). Alte Spielstände bekommen sie beim Laden.
- **Prestige ohne Lücken:** ab ★4 bringt jeder Rang bis ★20 einen Skin oder einen Titel, dazu Titel bei ★25 und ★30. Der Stern in der Bestenliste wechselt die Farbe bei ★4 (Glut), ★10 (Prisma) und ★20 (Ewig).
- **Mastery IV und V** (alle Ziele) und zwei neue Ziele: *Lifesaver* (Notfallfahrten durchgelassen) und *Close Shaves* (Close Shaves an Motorrädern). Die Mastery-Titel hängen weiter an Stufe III; *Mastermind* gibt es für alle Ziele auf V.
- **Neue Spezialfahrzeuge** (`core/oversize.ts`, `core/racers.ts`):
  - **Oversize Load** ab Level 85: 30 % der Schichten, 52 lang, fährt mit 80 % Tempo eine Runde. Ein bernsteinfarbenes Band vorne und hinten (70) frei halten, dann zahlt er 400 und Chain +1.
  - **Street Racers** ab Level 90: 25 % der Schichten, zwei drängen sich nacheinander ein. Jeder, den ein Polizeiauto rammt, zahlt 500 und Chain +1. Entkommen kostet nichts.
- **Neues Wetter:**
  - **Hail** ab Level 55: Grip 80 %, Bremse 70 %, +0,2 s Reaktion, +1 Dichte, Lohn ×1,15.
  - **Sandstorm** ab Level 65: Sicht wie Nebel in Sandfarbe, Grip 85 %, +0,35 s Reaktion, Lohn ×1,2.
- **Neues City Event Marathon** ab Level 40: Läufer überqueren eine KI-Zufahrt (6 s von 14 s), dort wartet dann jeder an der Linie. Die Daily-Shift-Rotation bleibt bei den ersten sechs Events.
- **Noch offen aus der Liste:** Parade (City Event) und Straßenbahn.

## 13. Look & Feel / Sound / Haptik / Menüs

**Leitgedanke „Eine Stadt, ein Ring“ (Leo, 25.09.2026):** Die Welt ist die Oberfläche. Neues wird zuerst am Kreisverkehr gezeigt (Inselrand, Lichtsignale, Farbe), erst dann als klassische Anzeige; die Tabs sind Blicke auf dieselbe laufende Stadt, der Ring hört nie auf.

| Aspekt | Umsetzung |
|---|---|
| **Ring als UI** | Auf dem Inselrand ein Strich pro Auto der Schicht, der aufleuchtet, sobald das Auto drin ist – ersetzt den Autozähler. Dazu Lichtsignale: **Welle** (Combo-Stufe, Takedown, Transporter bezahlt), **Aufflackern** (Strike rot, Polizei-Crash blau), **Lichtlauf** (Rush Hour, Schicht geschafft). Warn-Keile für Verbrecher und Transporter sitzen auf demselben Rand |
| **Die Stadt atmet** | Bäume wiegen sich, Fenster glimmen, Wolkenschatten ziehen; lebhafter bei dichtem Verkehr und in der Rush Hour. Asphalt mit Körnung und abgenutzten Markierungen, Häuser mit echten Dächern, Laternen mit Lichtpfützen, Autos mit weichem Schatten und Glanz |
| **Lichter der Autos** | Bremslichter zeigen, was die Fahrer tun (Schlange an der Linie, Stau hinter einem Wrack); die Lichthupe blinkt, wenn ein früher Tap gehalten wird. Bei Nacht tragen Scheinwerfer und Rücklichter das Bild |
| **Perspektiven** | Die Kamera gleitet je Tab: Build – der Ring liegt unter dem Plan; Shop – Schwenk, der Ring rutscht an den Rand; Progress – eigener Blick. Die Seiten decken die Stadt nie ganz zu |
| **Grafik** | Canvas 2D, clean, minimalistisch, flache Vektorformen, ein Mint-Akzent für das, was der Spieler verdient. Der Kreisverkehr bleibt auf jeder Map dunkel, damit Autos und Text gleich gut lesbar sind |
| **Farben** | Tokens nach Rolle. Fahrzeugfarben = Spielinfo, nie UI-Akzent |
| **Schrift** | Systemschrift: auf Apple-Geräten SF Pro, in der Spielszene SF Pro Rounded (`ui-rounded`), sonst Segoe UI / Roboto; Tabular Figures für Zahlen |
| **Obere Anzeige** | schwebende Karte mit drei Spalten (MONEY · CARS/SCORE · BEST), im Ergebnis zählt das Geld hoch. Auf dem Wartebildschirm führt Geld → Chests, Autos → Collection, Best → Records. Zeigt auch die Briefings (siehe 8) |
| **Navigation** | DOM-Tab-Bar wie in iOS: **Progress · Game · Shop · Build**; zwischen den Schichten sichtbar, während einer Schicht ausgeblendet. Build hat die Segmente Upgrades / Street Builder, Shop Chests / Collection / Casino |
| **Progress-Tab** (aufgeräumt 01.10.2026) | vier Segmente ohne Unter-Tabs: **Records** (Elite-Karte ab Level 40, sechs große Werte, der Rest unter „All stats“, **Ranks** für die Bestenliste) · **Today** (Daily Shift mit Serie, Weekly Shift, Season Pass, drei Quests, alle im selben Kartenstil) · **Goals** (Trials, Mastery, Feats untereinander mit Überschriften) · **Museum** (Bosse, Specials, Conditions untereinander). Jede Liste scrollt (`present/scroll.ts`) mit Schwung und Überrollen wie in iOS; Mausrad und Trackpad gleiten; Tastatur: Pfeile, Bild↑/↓, Pos1/Ende; getippt wird beim Loslassen |
| **Menüs** | native Anmutung: gruppierte Listen, Sheets, Schalter, Segmented Controls; Glas nur für schwebende Bedienelemente über der Szene. Kritisch gedämpfte Federn, kein harter Schnitt |
| **Einstellungen** | Sheet: Sound effects und Music (getrennt), Haptics, Vehicle Labels, **Left-handed** (schwebende Knöpfe auf die andere Seite, Dispatch links), **Larger text** (Hinweise und Karten über der Szene ×1,2), Reduce Motion (System / On / Off), Install (wo möglich), **What's new** (Patch Notes aus `present/patchNotes.ts`; ungelesen: Punkt am Einstellungsknopf), Links zu CrazyGames (nicht in der Play-App und nicht auf CrazyGames selbst), zur **Homepage timing.love** (nicht auf CrazyGames) und zum **Roundabout Timing Wiki auf Fandom**, **Cloud sync**, Reset Progress, **Legal** (Privacy Policy, Imprint, Licenses) |
| **Ergebnis teilen** | Unter jedem Ergebnis „Picture“: Blitz mit Auslöser-Geräusch, dann fällt ein **Sofortbild** gekippt ein und entwickelt sich aus Weiß. Der Abzug (1080×1350, 4:5) zeigt den Kreisverkehr von oben ohne HUD, mit Film-Look, Klebestreifen in der Map-Farbe, Sticker mit dem Ergebnis, **NEW BEST**-Stempel, orangem Datum, darunter Score, die besten Fakten, Map-Name, „Can you beat …?“ und Spielname mit Icon. Nur zwei Knöpfe: **Share** (Teilen-Menü mit Challenge-Link; ohne Datei-Teilen: Bild kopieren) und **Download**. Reduce Motion: nur Überblenden (`ui/photo.ts`, Text in `present/photo.ts`) |
| **Adaptive Auflösung** | Kommen die Frames dauerhaft langsam und unregelmäßig, sinkt die Pixeldichte 2 → 1,5 → 1, dann die Deko (Bodentextur, Luft, Wolkenschatten); nach 12 s flüssigem Lauf steigt sie wieder. Gleichmäßige 30 fps (Stromsparmodus) bleiben unangetastet. Verborgene Knöpfe und Tab-Bar kosten während der Schicht nichts; Crash-Wackeln zeichnet die Stadt nicht neu |
| **Sound** | Web Audio: 44 Effekte und 7 Musik-Stems (base, bass, rhythm, lead, flow, rush, siren) als AAC in `Web/public/audio/`, mit Tonhöhen-Variation und Stereo-Position. Adaptive Musik: Combo baut Instrumente auf, Verbrecher → Sirene, Rush Hour → Beat zieht an, Flow verdichtet; bei Verbrecher-Warnung und Rush-Hour-Beginn atmet die Musik durch einen Tiefpass ein. Im Multiplayer baut sie mit den Phasen auf |
| **Haptik** | über `navigator.vibrate` – nur wo der Browser es kann (Android/Chrome); iOS-Safari hat keine Vibration, der Schalter zeigt das an |
| **Accessibility** | Farben nie allein (Formen, Icons, Muster), Vehicle Labels, WCAG-AA-Kontrast, 44-px-Ziele (kleine Knöpfe reagieren auf größere Fläche, ganze Zeilen schalten ihren Schalter), Tastatur (Leertaste, Enter, D/E, Esc, R, Tab, Pfeile), sichtbarer Fokus, Live-Region für Ergebnisse und Hinweise (`ui/liveRegion.ts`: Screenreader lesen vor, wie eine Schicht endete, und jede Meldung). Reduce Motion ist standardmäßig aus (Leo, 29.09.2026; „System“ wählbar) und entfernt Shake, Zeitlupe und fliegende Teile |
| **App-Shortcuts** | Langes Drücken aufs App-Icon (installierte PWA, Play-App): **Daily Shift** (`/?start=shift`: Modus Shift, die Daily kommt, wenn sie offen ist), **Unlimited**, **Multiplayer** (öffnet die Lobby). Erst nach dem Tutorial; die Adresse wird danach bereinigt. Icons aus `Web/icon/make_shortcut_icons.py` |
| **Icon** | Kreisverkehr bei Nacht, das Mint-Auto fädelt in eine Lücke ein (Original in `Web/icon/`), als PWA-Icons in `Web/public/icons/`. Store-Material in `Marketing/` (App-Icon 512, Feature Graphic, sieben Screenshots, Cover) |

---

## 14. Online-Dienste, Verbreitung & Recht

### Wo das Spiel läuft

| Ort | Wie |
|---|---|
| **Website** | `https://game.gustaff.dev` (Docker, Coolify, nginx, Port 5050). Installierbar als PWA, offline nach dem ersten Besuch |
| **CrazyGames** | dieselbe Seite mit `?crazygames` (kein eigener Build). Nur dann lädt das SDK v3; der Spielstand liegt im Data Module (in der Cloud für eingeloggte Spieler, im Browser für Gäste); kein Service Worker, keine Installations-Hinweise. Eigene Werbung von CrazyGames: die Gratis-Truhe im Shop läuft dort über ihre **Rewarded Ad** (Truhe erst nach vollständiger Werbung, 3 pro Tag), große Momente (Boss, Legendary Shift, Rekord in Unlimited/Mayhem, Prestige) melden ein `happytime` (höchstens alle 90 s), Multiplayer-Einladungen laufen über deren Einladungslink (02.10.2026). Keine Midgame-Werbung (kein Bruch zwischen den Schichten). Seit 01.10.2026 offiziell dort gelistet |
| **Google Play** | Trusted Web Activity: ein kleiner Android-Rahmen, der `https://game.gustaff.dev/?googleplaystore` im Vollbild öffnet. **Kein eigener Build:** jeder Deploy erreicht die App sofort, sie teilt Spielstand, Offline-Modus und Service Worker mit dem Browserspiel. Die App blendet Installieren und den CrazyGames-Link aus. `public/.well-known/assetlinks.json` verknüpft App und Seite. **Stand 02.10.2026:** in der Play Console angemeldet und fertig angelegt; es fehlen die Tester (mindestens 12) und die 14 Tage Mindestlaufzeit des geschlossenen Tests, danach die Freigabe für die Produktion. Ein neues Release braucht nur eine Änderung am Rahmen (Icon, Name, Package, Signatur, Start-URL, App-Shortcuts) oder die `iarc_rating_id` im Manifest. **App-Shortcuts** (02.10.2026, langes Drücken aufs App-Icon): Daily Shift, Unlimited, Multiplayer (`/?start=…`, siehe 13); die Play-App bekommt sie mit dem nächsten Wrapper-Build. Homescreen-Widgets wären nativer Android-Code im Rahmen und kämen nicht an den Spielstand: nicht geplant |

### Wenn etwas schiefgeht

- **404:** Unbekannte Adressen bekommen `Web/public/404.html` im Spiel-Look („This road is closed.“, Kreisverkehr mit gesperrtem Arm, Knopf zurück zum Spiel), mit echtem 404-Status (`error_page` in `nginx.conf`). Das Spiel ist nur `/` (dazu `/privacy`, `/imprint`). Der Service Worker reicht die 404 durch; bei Serverausfall (5xx) oder ohne Netz kommt das gespeicherte Spiel.
- **Spiel startet nicht:** Ein Startbildschirm in `index.html` (das Mint-Auto dreht seine Runden) verschwindet, sobald das Spiel steht. Sonst wird er nach 20 s zu „The roundabout did not start.“ mit *Try again*, nur per CSS (die CSP verbietet Inline-Skripte); ein Fehler beim Start zeigt ihn sofort.
- **Nicht abgedeckt:** der erste Besuch, während der Container ausgefallen ist. Dann antwortet Coolifys Proxy mit seiner eigenen Fehlerseite (in Coolify einstellbar).

### Updates

Ein Push auf `main` → Coolify baut neu. Der Service Worker (Navigation network-first, Cache wechselt mit jedem Build) holt die neue Version beim nächsten Start; ein Spiel im Hintergrund prüft beim Zurückkommen. Die Seite lädt sich neu, **nur wenn nichts verloren geht** (keine Schicht, kein Match oder Lobby, kein Foto), danach zeigt „Updated · See what’s new in Settings“ auf die Patch Notes. Gepusht wird nur durch Leo.

### Ranglisten-Dienst (`Server/`, 30.09.–01.10.2026)

Ein kleiner, **optionaler** Server auf `api-game.gustaff.dev` (Node 22, Hono, SQLite, ein Container, Port 5051, eigene Coolify-Ressource). Das Spiel läuft ohne ihn (offline-first); ohne `VITE_API_URL` im Build sind seine Funktionen abgeschaltet. Module in `Server/src/modules/`:

| Modul | Was |
|---|---|
| `players` | anonyme Spieler: frei gewählter Name (3–16 Zeichen, eindeutig, Filter für Englisch und Deutsch gegen Beleidigungen), geheimer Token, umbenennen, löschen. Derselbe Name gilt im Multiplayer |
| `leaderboard` | Bestenlisten **Shift-Level** (`Prestige × 1000 + Level`) und **Unlimited** (Punkte), Top 50 und eigener Rang; nur ein besserer Wert ersetzt den alten |
| `friends` | **Freunde-Board** (01.10.2026): Freundescode `K7M2-9QXA`, einseitig (kein Annehmen nötig), bis 100 Freunde, dieselbe Liste nur unter euch |
| `sync` | **Cloud-Spielstand per Sync-Code** (`K7M2-9QXA-4TFB`, 01.10.2026): kein Konto, kein Passwort; nur der Hash des Codes wird gespeichert; bis 512 KB; Schreiben nennt die Version, auf der es aufbaut, bei Konflikt fragt das Spiel, **nie still überschreiben** |
| `rtc` | **TURN-Zugänge** für den Multiplayer (Cloudflare, braucht `CF_TURN_KEY_ID` und `CF_TURN_API_TOKEN` in Coolify) |
| `challenges` | **Kurzlinks** (`/c/K7M29QXA`) mit Vorschaubild 1200 × 630, das der Server selbst zeichnet (kein Upload) |
| `admin` | Moderation per Token: Spieler suchen, sperren, umbenennen, Einträge löschen |

**Anti-Cheat nur über Plausibilitätsgrenzen** (`422 invalid_score`); wer DevTools hat, kann eine glaubhafte Fälschung schicken. **Geld und Truhen werden lokal berechnet, die Casino-Regel gilt weiter.** Rate-Limits im Speicher (kein IP-Speichern).

**Cloud sync im Spiel** (Settings → Cloud sync, `net/cloud.ts`): Sicherung per Code; eine Änderung geht 2 s später hoch, ein offenes Spiel schaut alle 10 s (und beim Zurückkommen oder Online-Gehen), ob ein anderes Gerät weiterspielt. Neuerer Stand ersetzt den lokalen von selbst, wenn dieses Gerät nichts Ungesendetes hat, zwischen den Schichten und nicht auf einer Seite; haben beide Geräte gespielt, wählt der Spieler. Das Spiel legt Leaderboard-Name, Token und Freunde mit in die Kopie: ein neues Gerät wird derselbe Spieler. Der Browser kann den Code im Passwortmanager merken. Löschen geht für alle Geräte. Der Export einer Datei und „Import a save file“ sind seit 01.10.2026 weg.

### Werbung

- **AdSense** (`ui/ads.ts`): lädt erst, wenn das Spiel auf dem Bildschirm steht, nur im Produktions-Build und nie auf `?crazygames`. Einwilligungs-Meldung für EWR/UK über AdSense; keine Anker- oder Vollbild-Formate, ein Tap auf die Szene darf nie eine Anzeige treffen. `ads.txt` liegt auf der Hauptdomain `gustaff.dev`, nicht im Repo.
- **Im Spiel selbst** gibt es für die Standard-Truhe (bis 3 pro Tag) auf CrazyGames deren Rewarded Ad, überall sonst eine Platzhalter-Werbung (kein Werbepartner).

### Recht & Datenschutz

Datenschutz, Impressum und Lizenzen in `Web/src/present/legal.ts` (Settings → Legal, außerdem `/privacy` und `/imprint` für Formulare; Lizenzen der gebündelten Bibliotheken aus `node_modules`). Kurzfassung: keine Konten, kein Tracking, der Fortschritt bleibt auf dem Gerät; wer einen Namen auf die Bestenliste setzt oder Cloud sync nutzt, speichert Name, Werte oder Spielstand auf dem Server („Deleting your data“ steht auf `/privacy`). Ein neuer Dienst, der Daten bekommt (Werbung, Analyse, Server), braucht einen Absatz dort und ein neues `LEGAL_UPDATED`.

---

## 15. Technische Architektur

```
Eingabe (pointerdown mit Zeitstempel, Tastatur)
        │
        ▼
core/  (Spielregeln, kein DOM, 120 Hz, deterministisch)
  ├─ config.ts                  ← ALLE Tuning-Werte
  ├─ world / roundabout / paths / vehicle / collision / crash / drivers / traffic
  ├─ specials (Verbrecher, Bosse, Transporter, Militär) / ambulance / learner / explosions / modules
  ├─ scoring / levels (Kurven, Upgrades, Wetter, Nacht, Events, Legendary, Mayhem) / events
  ├─ career / loot / daily / weekly / trials / goals / feats / elite / seasonPass / museum / unlocks
  ├─ casino / challenge / versus / timing
  └─ rng / vec2
        │
        ▼
present/  (Darstellung)
  ├─ session (GameSession), flow (Modus-Wischen), transitions, perspective, tutorial, briefing, notices, booking
  ├─ Szene: scene, render, draw, carArt, city, cityLights, mapThemes, mapPlants, mapCentre, weather, night,
  │         effects, explosionsFx, marks, skins, skinEffects
  ├─ HUD & Seiten: hud, menukit, readyScreen, shop (+ shopFlow), progress, upgrades, builder (+ buildFlow),
  │         detail, museum, versus, casino* (Spiele, Kit, Wallet, Loader), photo, scroll, legal, licenses, patchNotes
  └─ strings (alle Texte), theme, icons, feedback (+ Musik-Mix)
        │
        ▼
audio/ (Web Audio)   storage/ (localStorage, Gerät, Profil, Backdrop)   net/ (PeerJS-Raum, Rangliste, Cloud, Relay, Kurzlinks)
ui/ (DOM-Hülle: Canvas, Tab-Bar, Sheets, Lobby, Backdrop, Werbung, CrazyGames, Live-Region)
```

- **Vite + TypeScript + HTML5 Canvas**, kein UI-Framework, keine Game-Engine. Einzige Laufzeit-Abhängigkeit des Spiels: `peerjs` (Multiplayer, lädt erst beim Öffnen eines Raums). Der Dienst: Hono und `@hono/node-server`.
- **Gleicher Seed + gleiche Taps = gleiches Ergebnis** – Grundlage für Balancing-Bots, Challenge-Links, Trials, Weekly Shift und Multiplayer. Glück (Critical Merge, Jackpot) kommt aus einem eigenen Strom desselben Seeds, damit ältere Seeds ihren Verkehr behalten.
- **Spielstand nur lokal:** `localStorage`, Schlüssel `carGame.save.v2` (alte `carGame.career.v1` werden übernommen); tolerant geladen, Feld für Feld. Optional Cloud sync per Code (die Quelle bleibt der Browser). Auf CrazyGames über deren Data Module.
- **PWA und offline:** Manifest, Service Worker aus dem Build (precacht alle Dateien; Navigation network-first, nach 3 s oder ohne Netz die gespeicherte Seite). Nach dem ersten Laden läuft alles ohne Netz, nur der Multiplayer, die Bestenliste und Cloud sync brauchen es. Beim ersten Besuch: „Ready to play offline“.
- **Deployment:** Docker (Node baut, `nginx:alpine` liefert statisch aus), Port 5050, Coolify baut aus GitHub, Content-Security-Policy in `nginx.conf`. **Das Spiel selbst braucht kein Backend;** der optionale Dienst aus `Server/` ist eine eigene Coolify-Ressource.

**Feste Entscheidungen** siehe [CLAUDE.md](CLAUDE.md).

---

## 16. Stand der Umsetzung (02.10.2026)

Die Web-Version ist das ganze Spiel. Zuletzt dazugekommen (aus den Patch Notes): 28.09. Casino und Museum · 29.09. helle Maps, acht neue Maps, Foto-Abzug, flüssigeres Spiel · 30.09. Bestenlisten, zwei Spuren, Saison-Pass, Ruhmeshalle, Motorräder, Fahrschulauto, Feuerwehr, Nebel und Schnee, Name **Roundabout Timing** · 01.10. Briefings, Feats, Big Screen, Cloud sync, Freunde-Board, Relay, Kurzlinks, der Classic, CrazyGames · 02.10. Vorbereitung für Google Play (TWA, AdSense, Rechtliches), CrazyGames-SDK (Rewarded Ad, happytime, Einladungslinks), 404-Seite und Startbildschirm, App-Shortcuts, Street Builder: gebaute Teile verschieben und löschen.

| Bereich | Inhalt | Stand |
|---|---|---|
| Kern | Kreisverkehr, Einfädeln, Schicht & Punkte, echte Crash-Physik, Bots im Ring, Critical Merge, Close Shave | ✅ |
| Sonderverkehr | Polizei & Verbrecher, vier Bosse, Transporter (Jackpot), Lkw, Tanklaster, Militär-Truck, Krankenwagen, Feuerwehr, Motorrad, Fahrschulauto, Schulbus | ✅ |
| Modi | Shift, Unlimited, Mayhem, Multiplayer (Wischen, Runden, Relay) | ✅ |
| Schwierigkeit | Level-Kurve, Wetter (7), Nacht/Blackout, City Events (6), zwei Spuren, Risiko & Versicherung | ✅ |
| Meta | Geld, 13 Upgrades, Street Builder mit Modulen, Truhen, Sammlung (102 Items), Alben, Mastery, Daily, Serie, Quests, Trials, Records, Casino, Freischaltungen | ✅ |
| Langzeit | Legendary Shifts, Prestige, Elite-Leiste, Titel, Feats, Saison-Pass, Ruhmeshalle, Weekly Shift, Museum, Big Screen | ✅ |
| Hülle | Tab-Bar, Einstellungen, PWA, Offline, Speicherschutz, Docker/Coolify, Patch Notes, Rechtliches | ✅ |
| Online | Bestenlisten, Freunde-Board, Cloud sync, TURN-Relay, Kurzlinks mit Vorschaubild (`Server/`) | ✅ gebaut (Relay braucht die Cloudflare-Zugangsdaten in Coolify) |
| Verbreitung | Website, CrazyGames, Google Play | Website ✅ · CrazyGames ✅ · Play: Test (12 Tester, 14 Tage) steht aus |
| Look & Feel | Ring als UI, atmende und sichtbar wachsende Stadt, Kamera je Tab, adaptive Musik, 24 Map Skins | ✅ |

Geprüft wird mit `npm test` (Web: 62 Tests, node:test; Server: 42 Tests), `npm run build` (Typecheck) und den Balancing-Bots. Am 28.09.2026: Build grün; `npm run sim` auf Level 5 – vorsichtiger Bot 60/60 Schichten geschafft, 0 Crashes; Zufalls-Tapper 0/60 geschafft, 60 Crashes.

### Offen

- **Multiplayer über echte Netze** prüfen (Mobilfunk, Schul-WLAN): das Relay ist gebaut, braucht aber `CF_TURN_KEY_ID` und `CF_TURN_API_TOKEN` in Coolify.
- **Google Play:** 12 Tester, 14 Tage geschlossener Test, dann Produktion; Altersfreigabe (`iarc_rating_id`) ins Manifest, wenn Play sie ausstellt.
- **Analytics und Fehlerberichte** (IDEA.md): noch nicht gebaut.

### Playtest offen

- Bots im Ring: Fühlt es sich wie Lücken-Treffen an? Reichen 3 Bots auf Level 1?
- Warn-Keil auf der Mittelinsel und Blaulicht auf dem Boden: deutlich genug?
- Ring als UI: Liest man den Schichtfortschritt, ohne hinzuschauen?
- Unlimited: Wie lange hält man durch, steigt der Druck richtig?
- Mayhem: Macht Zielen auf Tanklaster Spaß, sind 12 Autos richtig?
- Nacht/Blackout: noch fair lesbar? Boss-Konvoi: Ist die Lücke vor den Begleitern treffbar?
- Multiplayer: Sind 50 ms Eingabeverzögerung spürbar? Sind 10 s bis zum Ausscheiden richtig?
- Verlorene Schicht: Zeitlupe und Sofort-Neustart im richtigen Maß?
- Zwei Spuren ab Level 80, Fahrschulauto, Briefings: verständlich, ohne zu nerven?

### Gemessen (Karriere-Bot)

- **Level laufen dem Geld davon** (`npm run sim:career`, 29.09.2026): Level 60 ist nach 1,1 h (Könner) bis 1,6 h (Gelegenheitsspieler) reiner Spielzeit erreicht, bis dahin sind 130.000–150.000 verdient. Alle Upgrades zusammen kosten 1,6 Mio.; mit Level 60 besitzt man 28–30 von 86 Stufen. Die erste zusätzliche Zufahrt (32.500) und die Module (10.400–15.600) werden nie erschwinglich, solange man Upgrades kauft. Leo, 29.09.2026: bleibt so.
- **Die ersten Minuten** (`npm run sim:career -- 12 --story=20`): Schichten dauern anfangs 6–10 s. Ein Gelegenheitsspieler verliert bei **Level 10 vier Schichten am Stück** (Minute 5–7). Die Freischaltungen sind inzwischen entzerrt (siehe 9). **Die Kurve ab Level 8** (Leo, 29.09.2026: bleibt so): `npm run sim:career -- --curve=3-16 --per=60` (verlorene Schichten je Level, frische Karriere ohne Upgrades): Könner 8 % bis Level 7, dann 13 → 22 → 27 → 35 → 47 % (Level 8–12); Gelegenheitsspieler 23–35 % bis Level 7, dann 45 → 45 → 63 → 77 → 65 %. Es gibt keinen einzelnen Auslöser: ab Level 8 kommen mehr Autos (+1,1 je Level, ab Level 9 fünf Ring-Bots statt vier), Krankenwagen (8), der Verbrecher hat weniger Zeit, dazu Regen, City Events und ab 10 die Nacht.
- **Jackpot und Elite-Tempo** (`npm run sim:career -- 70`, 01.10.2026): Geldtransporter bringen 27–29 % des Geldes auf der Straße, Jackpot-Transporter davon 11–14 % (der Aufschlag durch `jackpotFactor` 5 allein: 9–11 %), bei nur 6 Jackpots in 120–206 Schichten, also stark vom Zufall abhängig. Die **Elite-Leiste** läuft schnell: Level 50–70 bringen 17 (Gelegenheitsspieler) bis 29 XP (Könner) pro Schicht, rund 1.500–2.700 XP pro Stunde. In dem Tempo wäre **Elite 100 nach 4–7 h** reiner Spielzeit erreicht, Elite 50 nach 2–3 h. Gemessen nur bis Level 70 und ohne Prestige; schwerere Level bringen vermutlich weniger XP pro Stunde. Noch nicht entschieden.

---

## 17. Ideen danach

Offene Ideen stehen in [IDEA.md](IDEA.md). Stand 02.10.2026 ist dort nur noch **Analytics und Fehlerberichte** (Umami oder Plausible, GlitchTip als Coolify-Dienste, ohne eigenen Code; braucht einen Absatz in `legal.ts` und passt zum Data-Safety-Formular in der Play Console). Die übrigen Ideen (Konto mit Passwort, Daily-Bestenliste mit Replay-Prüfung, Ghost Racing) sind gestrichen.

---

## 18. Testen & Balancing

| Werkzeug | Befehl (in `Web/`) |
|---|---|
| **Einmalig installieren** | `npm install` |
| **Spielen / Entwickeln** | `npm run dev` → http://localhost:5050 (auch vom Handy im WLAN) |
| **Typecheck + Build** | `npm run build` (muss vor jedem Commit grün sein) |
| **Build lokal ausliefern** | `npm run preview` (Port 5050, mit Service Worker und der CSP aus `nginx.conf`) |
| **Balancing-Bots** | `npm run sim -- 60 5` (Schichten, Level): der vorsichtige Bot darf **nie** crashen, ein Zufalls-Tapper fast immer |
| **Tests** | `npm test`: Replays (gleicher Seed + gleiche Taps), vorsichtiger Bot ohne Crash, Spielstände (alt, kaputt), Buchung einer Schicht, Freischaltungen, Meldungen, Elite, Saison-Pass, Feats, Big Screen, Patch Notes |
| **Karriere-Bot** | `npm run sim:career -- 60`: ein menschenähnlicher Bot (Reaktionszeit, Fehleinschätzung, jagt Verbrecher per Dispatch) spielt als Könner und als Gelegenheitsspieler von Level 1 bis 60, bucht jede Schicht wie das Spiel und kauft wie ein Spieler. `--story=20` erzählt die ersten 20 Schichten einzeln, `--curve=3-16 --per=60` misst verlorene Schichten je Level |
| **Multiplayer-Bots** | `npm run sim:versus`: vorsichtige Spuren scheiden nie durch Crash aus, gleicher Seed = gleiches Match |
| **Casino** | `npm run sim:casino`: jedes Spiel zahlt zurück, was sein Odds-Blatt sagt, die Münze ist fair, gleicher Seed = gleiches Ergebnis |
| **Dienst** (in `Server/`) | `npm test` (Namen, Anmeldung, Ranglisten, Freunde, Sync, Challenges, Admin) und `npm run typecheck` |
| **Container wie in Coolify** | im Repo-Root: `docker build -t car-game . ; docker run -p 5050:5050 car-game` |

**Steuerung:** Tap / Klick / Leertaste = Auto schicken (der erste Tap startet) · Wischen bzw. `←` / `→` = Modus · Dispatch-Button, `D`, `E`, Rechtsklick = Einsatzfahrt · `Tab` = Seite · obere Karte = Chests / Collection / Records · `Enter` = starten / Upgrade kaufen · `Esc` = Einstellungen bzw. zurück · `R` = Schicht neu · `↑` / `↓`, Bild↑/↓, Pos1/Ende = Liste scrollen · im Multiplayer `1`–`4` Reaktionen, `T` Lkw von der Tribüne. Leertaste und Enter spielen immer, auch wenn die Maus einen Knopf fokussiert hat; nur ein mit `Tab` erreichter Knopf behält sie.

**Playtest-Routine:** 3 Schichten spielen, am Desktop und auf einem echten Handy → Fairness der Crashes, Feedback-Wahrnehmung, Ruckler, Motivation („Will ich noch eine?“). Auffälligkeiten **mit Seed** notieren (ein Challenge-Link hält die Schicht fest).

**Patch Notes:** Jede größere Neuerung und jeder spürbare Bugfix kommt in `Web/src/present/patchNotes.ts` (Settings → What's new), Englisch, für Spieler geschrieben, **ein Eintrag pro Tag**, neueste zuerst (CLAUDE.md).

---

## 19. Entscheidungen

- [x] Schichtlänge: kurz lassen, kein 2-Minuten-Ziel (Leo, 26.09.2026)
- [x] Verlorenes Level wiederholen: bleibt so, fair dank Sofort-Neustart (Leo, 26.09.2026)
- [x] Gefahrenstufe High Alert: entfernt, ersetzt durch die Spielmodi (26.09.2026)
- [x] Browserspiel statt App (Leo, 27.09.2026)
- [x] Store entfernt, Casino statt Store; keine kaufbare Währung, solange es das Casino gibt (Leo, 28.09.2026)
- [x] Level-Kurve für Speed, Density und Weather; Rush-Hour-Werte (Leo, 29.09.2026: bleibt so)
- [x] Bots im Ring: Startet Level 1 mit 3 oder 4? (Leo, 29.09.2026: bleibt so)
- [x] Kosten: Zufahrten, Module, Truhen (Karriere neu messen) (Leo, 29.09.2026: bleibt so)
- [x] Crash-Kosten ab Level 20, Verlust bei Flucht, Versicherungs-Staffeln (Leo, 29.09.2026: bleibt so)
- [x] Parameter der Fahrzeugtypen (Compact, Sports Car, Van) (Leo, 29.09.2026: bleibt so)
- [x] Truhen-Odds, Mastery-Stufen, Pity-Schwelle (Leo, 29.09.2026: bleibt so)
- [x] Wetter, Nacht-Chance, Häufigkeit der City Events (Leo, 29.09.2026: bleibt so)
- [x] Unlimited- und Mayhem-Werte, Boss-Level-Abstand (jedes 15.) (Leo, 29.09.2026: bleibt so)
- [x] Blaulicht auf dem Boden und Warn-Keil: Intensität, Position, Deutlichkeit (Leo, 29.09.2026: bleibt so)
- [x] Nur noch die Web-Version, Swift-Schiene gelöscht (Leo, 29.09.2026)
- [x] Freischalt-Level entzerrt: Daily 4, Modi 6, Trials 9 (jede Trial bei ihrem Level), Casino 12 (Leo, 29.09.2026)
- [x] Name **Roundabout Timing** (Leo, 30.09.2026)
- [x] Kleiner optionaler Ranglisten-Dienst in `Server/` erlaubt; Spielstand bleibt lokal, Cloud ist nur eine Kopie (Leo, 30.09.2026)
- [x] Cloud sync per Code statt Export und statt Konto mit Passwort (Leo, 01.10.2026)
- [x] CrazyGames über `?crazygames`, Google Play als Trusted Web Activity über `?googleplaystore`, je ohne eigenen Build (Leo, 30.09. / 02.10.2026)
- [x] Ideen außer Analytics und Fehlerberichten gestrichen (Leo, 02.10.2026)

---

## 20. Datei-Struktur (Kern)

```
Car-game/
├─ CLAUDE.md                      ← feste Entscheidungen, Befehle, Arbeitsweise
├─ Spiel.md                       ← dieses Dokument
├─ FOUNDATION.md, LOOT.md, IDEA.md
├─ Dockerfile, .dockerignore      ← Node baut, nginx liefert aus (Port 5050)
├─ Marketing/                     ← Store-Material: App-Icon, Feature Graphic, Screenshots, Cover, Videos
├─ Web/                           ← DAS SPIEL
│  ├─ README.md, PRODUCT.md
│  ├─ index.html, vite.config.ts, nginx.conf, package.json
│  ├─ src/core/                   ← Spielregeln (config.ts = alle Zahlen)
│  ├─ src/present/                ← Szene, HUD, Seiten, Session, Texte
│  ├─ src/audio/ storage/ net/ ui/
│  ├─ public/                     ← Manifest, Icons, og-image, 404.html, .well-known/assetlinks.json,
│  │                                audio/sounds (44), audio/music (7 Stems)
│  ├─ icon/                       ← Original des Icons (make_icon.py), Shortcut-Icons (make_shortcut_icons.py)
│  ├─ audio-src/                  ← Skripte für die Casino-Klänge (make_casino_sounds.py)
│  └─ scripts/                    ← test.mjs, sim.mjs, career-sim.mjs, versus-sim.mjs, casino-sim.mjs
└─ Server/                        ← optionaler Ranglisten-Dienst (Node 22, Hono, SQLite)
   ├─ README.md, Dockerfile, package.json
   ├─ src/                        ← app, config, db, rateLimit, codes, module
   │  └─ modules/                 ← players, leaderboard, friends, sync, rtc, challenges, admin
   └─ test/                       ← Tests des Dienstes
```

---

**Stand:** 02.10.2026 – Roundabout Timing ist ein Browserspiel, offline spielbar nach dem ersten Laden, mit automatischen Tests, auf der Website und auf CrazyGames live; die Play-Store-Fassung wartet auf den geschlossenen Test. Nächste Schritte: Tester für Google Play, das Relay in Coolify einrichten, danach Analytics und Fehlerberichte.
