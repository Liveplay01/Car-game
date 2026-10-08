# Foundation.md – Spielregeln und Grundlagen

Stand: 29.09.2026 · Car Game ist ein Browserspiel ([Web/README.md](Web/README.md)). Hier stehen
die **Regeln mit ihren Startwerten**, die Grundsätze für Bild und Bewegung und die Architektur.
Die Zahlen selbst stehen in `Web/src/core/config.ts`; weicht dieses Dokument vom Code ab, gilt
der Code. Offene Ideen: [IDEA.md](IDEA.md), Überblick über das ganze Spiel: [Spiel.md](Spiel.md).

## 0. Was mit "Basis" gemeint ist

Die Basis ist der Kernloop. Er muss für sich allein schon Spaß machen, bevor
irgendein Zusatzsystem dazukommt:

> Autos warten in einer Schlange. Ein Tap schickt das vorderste Auto in einen
> rotierenden Kreisverkehr. Gutes Timing bringt Punkte und Combo, schlechtes
> Timing einen Crash. Eine Schicht ist eine feste Zahl Autos (15), die alle in den
> Verkehr müssen; die letzten davon sind Rush Hour. Gut gespielt dauert das ≈ 20 s.

Fühlt sich dieser Loop nicht gut an, retten ihn auch Verbrecher, Geldtransporter
und Zollstellen nicht.

**Teil der Basis:** Kreisverkehr, KI-Verkehr, Warteschlange, Einfädeln per Tap,
Kollision, Combo, Tight-Fit-Bonus, Strikes, Schicht mit Rush Hour,
Ergebnis-Banner, Highscore.

**Alles andere** (Polizei, Transporter, Wirtschaft, Truhen, Modi, Multiplayer …) dockt an
die Basis an, ohne sie umzubauen (Abschnitt 4.6).

---

## 1. Technik und Zielgeräte

### 1.1 Stack

Vite + TypeScript + HTML5 Canvas, ohne UI-Framework und ohne Game-Engine. Befehle, Aufbau,
Speichern, PWA und Deployment: [Web/README.md](Web/README.md). **Kein Backend fürs Spiel:** Der Spielstand
liegt im Browser (`localStorage`), nginx liefert nur statische Dateien aus; nur die optionale
Rangliste spricht mit einem eigenen kleinen Dienst ([Server/README.md](Server/README.md)). Multiplayer läuft
direkt zwischen den Geräten (WebRTC über PeerJS).

### 1.3 Zielgeräte und Sprache

Aktuelle Browser auf dem Handy (Hochformat, einhändig) und auf dem Desktop, installierbar als
PWA und nach dem ersten Laden auch offline spielbar.

| Grenze | Gerät | Was das für uns heißt |
| --- | --- | --- |
| Kleinster Bildschirm | 375 × 667 (iPhone SE, kleine Android-Handys) | Das Layout muss auch auf einem niedrigen Bildschirm funktionieren |
| Größter Bildschirm | Desktop-Fenster, Tablets | Nichts darf verloren oder gestreckt wirken; die Szene bleibt hochkant |
| Schwache Geräte | ältere Mittelklasse-Handys | Performance-Maßstab: Dort müssen 60 fps halten |
| Bildwiederholrate | 60 bis 144 Hz | Fester Simulationstakt, damit das Timing überall gleich ist |

**Sprache: nur Englisch, weltweit.** Alle Texte stehen an einer Stelle
(`Web/src/present/strings.ts`). Zahlen erscheinen im Format des Geräts (1,000 bzw. 1.000).
In Grafiken steht kein Text.

---

## 2. Spielregeln der Basis, konkret

Alle Zahlen sind **Startwerte**. Sie stehen gesammelt in
`Web/src/core/config.ts` und werden im Playtest getunt (`npm run sim` prüft sie mit
Bots). Damit sind auch die
offenen Punkte "Combo-Schwellen" und "Multiplikatoren" aus IDEA.md vorläufig
beantwortet.

### 2.1 Spielfeld

- **Hochformat, einhändig spielbar.** Auf dem Desktop steht die Szene ebenfalls hochkant.
- **Die Spielwelt ist überall gleich groß** und hat feste Welt-Einheiten. Nur die
  Kamera zoomt so, dass Kreisverkehr und Warteschlange ins Fenster bzw. in den
  sicheren Bildschirmbereich passen. Timing und Highscores sind dadurch auf allen
  Geräten gleich. Auf kleinen Handys (375 × 667) zeigt die Warteschlange 3 statt 4 Autos.
- **Ein einspuriger Kreisverkehr mit 4 Zufahrten** (N, O, S, W). Verkehr fließt
  gegen den Uhrzeigersinn, wie im deutschen Rechtsverkehr.
- **Deine Zufahrt ist Süd**, also unten in der Daumenzone. Dort steht die Warteschlange.
- **O, N und W** gehören dem KI-Verkehr, der dort ein- und ausfährt.
- **Die Mittelinsel** zeigt den Combo-Multiplikator. Die Fläche ist frei, dort
  verdeckt die Anzeige keinen Verkehr.

```
                N
                ║
                ║
      W ══════( ○ )══════ O        ○  Mittelinsel mit Combo-Anzeige
                ║                  ↺  Verkehr gegen den Uhrzeigersinn
                ║
               [▮]  ← vorderstes Auto an der Haltelinie
               [▮]
               [▮]     Warteschlange (4 sichtbar, auf dem SE 3)
               [▮]
                S
```

*Stand M5:* Der Kreisverkehr hat **vier Zufahrten zum Start und bis zu acht**. Sie sitzen
in **16 Steckplätzen** rund um den Ring (22,5° Raster); Platz 0 unten gehört immer dem
Spieler. Zwei Zufahrten müssen mindestens zwei Plätze auseinander liegen, sonst stoßen ihre
Ein- und Ausfahrten aneinander. Jede Zufahrt über die vierte hinaus macht den Ring um 18
Einheiten weiter, damit alle Platz behalten. Gebaut wird im Street Builder (Build-Tab).

### 2.2 Was bei einem Tap passiert

Auf dem Desktop ist ein Tap ein Klick oder die Leertaste.

1. **Tap irgendwo auf die Spielfläche** (außer auf Buttons). Das vorderste Auto
   fährt **im selben Frame** los, ohne Ausholbewegung und ohne Verzögerung.
2. Es fährt eine **feste Einfädelbahn**: immer **0,5 s**, und am Ende hat es genau
   Ringgeschwindigkeit. Dadurch ist das Timing lernbar. *Umgesetzt in M2:* Ändert
   sich das Ringtempo während des Einfädelns (Rush Hour), läuft das Einfädeln im
   selben Verhältnis schneller. Kein Abstand ändert sich durch einen Tempowechsel,
   ein gut getimter Tight Fit wird nie zum Crash. Gefunden hat das der Balancing-Bot.
3. Während des Einfädelns misst die Simulation laufend den **kleinsten Abstand**
   zu jedem Auto im Ring.
4. Am Ende wird bewertet (2.3).
5. **Kein Tap-Cooldown** *(M4+)*. Das nächste Auto fährt dem losgefahrenen direkt
   hinterher und steht an der Haltelinie, sobald dieses einen vollen Platz Vorsprung
   hat (`queueSpacing`, bei 100 % Tempo nach ≈ 0,3 s). Ein Tap, der früher kommt, wird
   **gehalten** und schickt das Auto los, sobald es dort steht. Gehalten wird höchstens
   einer, damit ein prellender Finger nicht fünf Autos schickt. So berühren sich eigene
   Autos nie, und **eigene Autos bewerten sich nicht gegenseitig**: Der Abstand zum
   eigenen Vorder- oder Hintermann zählt nicht für Tight Fit und Cut off, sonst wäre
   schnelles Tippen ein Tight-Fit-Automat. Das Risiko liegt beim Spieler: Wer nachschiebt,
   während sein Polizeiauto gleich den Pickup rammt, schickt das nächste Auto ins Wrack.
   `queueAdvanceDuration` (Standard 0) gibt auf Wunsch wieder eine Nachrückzeit.
   **Nachrücken ohne Ruck** *(26.09.2026)*: Das nächste Auto fährt weich an und bremst
   weich an der Linie (`PlayerQueue.approach`, dazwischen kurz bis 1,5× Ringtempo); bereit
   ist es im selben Moment wie vorher. Mit gehaltenem Tap (`PlayerQueue.Pass`) bremst es
   nicht mehr: Es behält sein Tempo und pendelt sich auf Ringtempo ein (liegt es zurück,
   holt es bis 1,5× auf, nie langsamer werden), fährt über die Linie und im selben
   Simulationsschritt in sein Einfädeln, sobald zum vorderen eigenen Auto mindestens
   `passClearance` (4) zwischen den Stoßstangen frei ist. Das kann ein paar Millisekunden
   früher oder später sein als bei einem stehenden Auto. Die Autos dahinter rollen weiter
   (`rollingSpeed`). Bremslichter und eine Lichthupe für den gehaltenen Tap zeichnet
   `present/scene.ts` (`VehicleLamps`).
6. Autos im Ring **verlassen ihn nach 1–3 Ausfahrten wieder**. So entstehen
   ständig neue Lücken.

### 2.3 Bewertung einer Einfädelung

Der Abstand wird **in Sekunden** gemessen (Abstand ÷ Ringgeschwindigkeit). So
bleibt die Bewertung fair, wenn das Tempo in der Rush Hour steigt.

| Ergebnis | Bedingung | Punkte | Combo | Feedback |
| --- | --- | --- | --- | --- |
| **Crash** | Fahrzeuge berühren sich (beim Einfädeln oder bis 1 s danach) | −250 (nie unter 0) | auf 0 | normales Auto: Strike (Standard: Game Over), Polizeiauto: Polizei-Crash (2.6) |
| **Tight Fit** | kleinster Abstand < 0,12 s | 200 × Multiplikator | +2 | Swoosh, dazu ein scharfer Haptik-Klick, wo das Gerät vibrieren kann |
| **Sauber** | alles andere | 100 × Multiplikator | +1 | dezenter Ton |
| **Eingekrochen** *(01.10.2026)* | fährt beim Erreichen des Rings noch unter 90 % seines geplanten Tempos, hat also hinter langsamem Verkehr gebremst (`creepPace`) | 0 | bleibt | "JAMMED · NO POINTS"; Kette bleibt; in Unlimited zählt das Auto nicht (weder Zähler noch Geld) |

**Warum "Eingekrochen":** Nach einem Crash bremsen alle füreinander. Dauertippen schob
so eine Kolonne eigener Autos gefahrlos in den gebremsten Ring, jedes mit +1 Combo, und
die gebremsten Einfädler hielten die Störung selbst am Leben: Unlimited-Rekord ohne zu
spielen. Getimt wird dabei nichts, also gibt es nichts. Test: „cars spammed into the slow
traffic after a crash creep in for nothing“.

**Zur "unsauberen Einfädelung" aus IDEA.md:** Sie ist als optionales Fenster
`sloppyWindow` vorbereitet (z. B. < 0,04 s zum Hintermann ergibt "Cut off!" und
setzt die Combo zurück), steht aber standardmäßig auf **aus**. Der Grund: Tight
Fit soll direkt an der Crash-Kante liegen. Eine zweite Strafzone daneben macht
riskantes Spiel unattraktiver, und das ist das Gegenteil dessen, was IDEA.md will.
Entschieden wird im Playtest.

### 2.4 Combo-Multiplikator

| Combo | 0–4 | 5–9 | 10–19 | 20+ |
| --- | --- | --- | --- | --- |
| Multiplikator | ×1 | ×1,5 | ×2 | ×3 |

### 2.5 Die Schicht

*Stand M4+:* **Eine Schicht hat keine Uhr.** Man hat eine feste Zahl Autos
(`shiftCars = 15`), die alle in den Verkehr müssen. Sobald das letzte eingefädelt ist,
ist die Schicht geschafft. Gut gespielt dauert das ≈ 20 s, und leicht soll es nicht sein.

- **Oben mittig** steht, wie viele Autos noch fehlen ("12 cars"). Die Warteschlange
  zeigt nur noch diese Autos; gegen Ende sieht man sie leer werden.
- **Druck ohne Uhr:** Dichte und Tempo steigen mit der Zeit (`rampSeconds = 20`) von
  6 auf bis zu 10 Autos und von 105 % auf 120 % und bleiben dann oben. Wer lange auf
  die perfekte Lücke wartet, bekommt mehr Verkehr, nicht weniger. Die Dichte ist eine
  Obergrenze: Die KI füllt den Ring nur so weit, wie ihre Sicherheitslücken reichen.
- **Rush Hour = die letzten 4 Autos** (`rushHourCars`): Tempo 135 %, Dichte +2,
  **Punkte ×2**. Sie beginnt mit dem ersten dieser vier; der Zähler wechselt auf eine
  Akzent-Pill, dazu ein Haptik-Signal, wo das Gerät vibrieren kann.
- **Verbrecher und Transporter** kommen früh (nach 4–8 s bzw. 8–14 s). **Sobald alle Autos
  drin sind, ist die Schicht geschafft** – ein Verbrecher, der dann noch unterwegs ist,
  fährt einfach weg. Wer spät noch einen Verbrecher gemeldet bekommt, hat also die Wahl:
  fassen (1.000 Punkte) oder die restlichen Autos schnell reinschicken. Ein Transporter,
  der beim letzten Auto noch kreist, wird sofort ausgezahlt.
- **Neue Autos fahren heran:** KI-Autos, Verbrecher und Transporter erscheinen außerhalb
  des Bildes und fahren an ihre Haltelinie (`aiApproachDistance`), statt dort aufzutauchen.
  Eine Warnung ("WANTED", "SECURED") wird nur an eine Zufahrt gelegt, an der niemand steht,
  damit der Ring nicht ein fremdes Auto markiert.
- **Schichtstart:** Die nächste Schicht steht schon auf dem Game-Tab: Der Verkehr fließt,
  die Autos der Schicht rollen in die Warteschlange. **Der erste Tap schickt das vorderste
  Auto los und startet damit die Schicht** (erst ab da laufen Verkehrsanstieg, Verbrecher
  und Transporter). So ist der Übergang von Schicht zu Schicht fließend: Nach dem Ergebnis
  bleibt der Verkehr im Ring, das Tempo gleitet zum neuen Start-Tempo, und die neuen Autos
  rollen von hinten in die Schlange (`World.nextShift`).
- **Schichtende:** Taps werden nicht mehr angenommen. Die letzte Einfädelung wird noch
  gewertet. Nach 1,2 s erscheint oben in der Szene "GAME OVER" bzw. "SHIFT COMPLETE"
  mit den Punkten und der Zeit, die die Schicht gedauert hat. Es gibt kein Menü: Die
  Simulation läuft weiter, und **ein Tap startet die nächste Schicht** (die ersten 0,4 s
  sind gesperrt, damit ein hektischer Tap nicht versehentlich weiterschaltet).
- **Abschlussbonus:** +1000 für eine geschaffte Schicht.
- **Spielmodi (26.09.2026, ersetzen die Gefahrenstufe High Alert, die ganz entfernt ist):**
  siehe "Game-Tab, Modi" in Abschnitt 3.
- **Level (M5):** Jede geschaffte Schicht ist ein Level höher, eine verlorene wird auf
  demselben Level wiederholt. Mit dem Level wachsen die Autozahl (10 → höchstens 30,
  je Versuch zufällig ±2) und ab Level 5 das Tempo; Level 1 bis 4 sind entschärft
  (`Web/src/core/levels.ts`).

### 2.6 Fehler: Crashes

*Stand M4+:* **Ein Crash deines normalen Autos beendet die Schicht sofort**
(`maxStrikes = 1`, der klassisch harte "Car Circle"-Modus). **Polizeiautos haben ein
eigenes Budget:** Drei Polizei-Crashes pro Schicht übersteht man (`maxPoliceCrashes = 3`),
der vierte beendet sie. Ein Polizei-Crash kostet wie jeder Crash Punkte und die Combo,
aber keinen Strike.

- **Schild als Upgrade** *(08.10.2026, `shieldPrices`)*: Es gibt kein Gratis-Schild. Das
  Upgrade „Shield“ hat 4 Stufen (1.500 / 20.000 / 45.000 / 90.000); jede erhöht
  `maxStrikes` um 1 (Karriere-Schichten, Challenges und Daily; nicht Unlimited). Die obere
  Leiste zeigt, was noch verzeiht, als Plus-Zeichen (Leo, 08.10.2026): ein grünes je
  Schild-Stufe, daneben ein blaues je erlaubtem Polizei-Crash; ein verbrauchtes wird grau.
  Ein verziehener Crash (Schild oder Polizei innerhalb des Limits) zeigt
  keine Meldung: der Ring um die Mitte leuchtet grün (Polizei: blau/rot) mit aufsteigenden
  Plus-Zeichen (`RingSignals.heal`); im Multiplayer in der Farbe des Spielers.
- **Der Ring als Signalspur** *(Leo, 08.10.2026)*: Ankündigungen, Auszahlungen und verpasste
  Boni stehen nicht als Text über der Szene, sondern als Ring-Signal in der Farbe der Sache:
  **Lichtlauf** (und Leuchten am Arm) = kommt gleich, **Welle nach außen** = gelungen, **Welle
  nach innen** (`miss`) = Bonus verpasst, **Blitz** = Schlag für den ganzen Ring (Crash rot,
  Verbrecher entkommen lila, Krankenwagen blockiert rot), **Plus-Zeichen** = Crash verziehen,
  **Spritzer** (`splash`) = Combo-Stufe geschafft (mehr Tropfen je Stufe, oben mit Gold).
  **Farben haben je eine Bedeutung:** Grün gehört dem Spieler (Combo, Schild, Schichtende),
  Limette (`rushHour`) ist Rush Hour (Lichtlauf, Kante, Leiste und Schriftzug), Amber bleibt die Farbe der Oberfläche, Weiß die Stufe im Unlimited, Gold das Große
  (Boss, Jackpot, Marken, Perfect Run), Blau Polizei und Rettung, Violett der Verbrecher; jedes
  Spezialfahrzeug hat seinen eigenen Ton (Learner: Türkis, `learnerSign`).
  Als Text bleiben nur Zahlen, die etwas kosten, und der Kern eines Modus (Critical, Jackpot,
  Penalty/Cost, Boom/Flames, Tight, Cut-off, Shave). Das Museum erklärt die Signale seiner
  Einträge (`present/museumSignal.ts`, `SPECIAL_SIGNAL`); ein neues Signal braucht dort
  seine Zeile, Shield und Backup erklären das Heilen in ihrem Text.
  **Nachts leuchten sie** (Leo, 08.10.2026): Ring-Signale, Armmarkierungen und Bänder liegen über dem Nachtschleier und
  bekommen einen weichen Hof in ihrer Farbe (`HUD.bloom`), statt abgedunkelt zu werden; nicht auf schwachen Geräten (`lowDetail`).
- **Wer ist schuld:** Es zählt das Auto, das gerade einfädelt (oder in der Sekunde
  danach). Fädelt ein Polizeiauto in dein eigenes normales Auto im Ring ein, ist das
  ein Polizei-Crash. Ist ein normales Auto mitschuld, ist es ein Strike.
- **Kein Crash im Sinne der Regel:** der Takedown (Polizei trifft Verbrecher: Punkte,
  Slow-Mo) und die Beschlagnahme (Polizei trifft Transporter: kein Geld, aber auch
  keine Strafe). **Was beschädigt ist, fährt nicht mehr** *(Leo, 26.09.2026)*: Auch der
  Pickup ist nicht mehr "gepanzert". Er ist schwerer (`criminalMass`) und schiebt das andere
  Auto weiter weg, wird aber bei jedem Treffer ohne Takedown selbst zum Wrack; die Jagd endet
  dann ohne Punkte und ohne verlorene Schicht (`criminalWrecked`). **Der Geldtransporter
  ebenso:** Jeder Crash macht ihn zum Wrack, das Geld ist weg ("LOST"). Dafür bremst er
  wie jeder andere Fahrer.
- **Sprengstoff** *(Leo, 27.09.2026)*: Ein Tanklaster, der zum Wrack wird, explodiert und
  macht alles im Umkreis zum Wrack (Stoß-Impuls wie beim Crash, `World.explode`). Der
  Militär-Truck trägt eine Bombe und hat eine Sperrzone; ein Auto, das hineinfädelt, oder ein
  Treffer lässt sie hochgehen: alles auf der Straße wird zum Wrack, die Schicht ist verloren
  (in Mayhem das Finale). Ihr Rauch ist der Übergang ins nächste Level (`SmokeCurtain`).
- **Crash-Physik (umgesetzt in M2):** Der Aufprall ist ein Starrkörper-Stoß am
  Kontaktpunkt: Impulserhaltung, 30 % Rückprall (der Rest geht in die
  Knautschzonen), Reibung beim Streifen. Ein Treffer neben dem Schwerpunkt bringt
  das Auto ins Drehen. Danach rutschen die Wracks mit Reifenreibung an vier Rädern
  aus (≈ 0,8 g) und verschwinden nach 2,2 s (`CrashPhysics`).
- **Blechschaden:** Jeder Treffer hinterlässt eine Beule, deren Tiefe von der
  Aufprallgeschwindigkeit abhängt. Stoßstangen, Haube, Spiegel und Räder reißen bei
  tiefen Beulen ab und rutschen über die Straße, Scheiben splittern (`CarArt`).
- **Der Verkehr reagiert:** Fahrer sehen Wracks und bremsende Autos, reagieren nach
  0,5–1,5 s (echte Bremsreaktionszeiten) und bremsen so stark wie nötig, höchstens
  0,9 g. Reicht der Platz nicht, fahren sie auf, und Kettenunfälle entstehen aus der
  Physik (`Web/src/core/drivers.ts`). Danach beschleunigen sie wieder in den Fluss.
- **Folgeunfälle** im Verkehr dahinter kosten nichts: Ein Fehler zählt einmal. Wer in
  eine sichtbare Unfallstelle einfädelt, macht dagegen einen Fehler. Umschaltbar über
  `chainCrashesCostStrikes`.
- **Abgebrochene Schicht:** Die Punkte bleiben, aber es gibt keinen Abschlussbonus und
  keinen Highscore-Eintrag. Geld aus Transportern bleibt, es ist schon ausgezahlt.

### 2.7 KI-Verkehr

- **Im normalen Verkehr fahren alle Autos im Ring gleich schnell.** Im Ring selbst
  kann also nichts passieren, Unfälle entstehen nur beim Einfädeln. Erst nach einem
  Crash bekommt jeder Fahrer ein eigenes Tempo (2.6); sobald wieder alles fließt,
  gilt das gemeinsame Tempo wieder. Trucks und Stau docken später an dasselbe
  Fahrermodell an.
- **Der Kreis gehört den Bots, der Spieler fügt sich ein.** Es sind immer mindestens
  `minRingBots` KI-Autos im Ring (Level 1–4: 3, ab Level 5: 4, ab Level 9: 5; ein
  größerer Kreisverkehr skaliert das wie die Dichte). Beim Start einer Schicht stehen sie
  schon im Ring.
- **Ein Bot fährt erst raus, wenn sein Nachfolger drin ist.** Würde der Ring unter das
  Minimum fallen, dreht er eine weitere Runde. Das entscheidet er 1,5 s vor seiner
  Ausfahrt (`botExitNotice`), also früher, als irgendwer den Verkehr vorausberechnet:
  Niemand plant in eine Lücke, die dann doch nicht frei wird. Fehlen Bots (nach einem
  Crash), kommt sofort Ersatz, ohne Spawn-Pause und unabhängig von der Dichte.
  **Ausnahme Stau:** Nach einem Crash kann eine Stop-and-go-Welle einmal rund um den Ring
  laufen, in der die Bots füreinander bremsen, und sie löst sich nur, wenn einer rausfährt.
  Deshalb darf ein Bot trotz Minimum raus, wenn er außerhalb des Flusses fährt, kein Wrack
  mehr auf der Straße liegt und er nicht in der Schlange vor einem Modul steht (bis 2,5 s
  vor dessen Zone, `jamLookahead`). Als Rückfallebene gilt: Wer insgesamt 20 s für
  Gefahren bremsen musste (`botJamPatience`), darf ebenfalls raus. Durch eine Zone zu
  kriechen zählt dabei nicht als Bremsen.
- **Die KI fährt nur bei sicherer Lücke ein** (≥ `aiSafeGap` nach vorn und hinten).
  Einfädelnde Spielerautos zählen dabei mit. **Die KI verursacht nie einen Crash.**
- **Die KI verhungert nicht an der Linie (Leo, 29.09.2026):** Wer `aiPatience` (2,5 s) an
  der Haltelinie steht, nimmt die nächste Lücke, durch die er ohne Berührung kommt
  (`aiPushInGap`, 0,15 s); bremsende Autos am Einfädelpunkt halten ihn dann nicht mehr auf,
  nur ein Wrack. Ohne diese Regel konnte ein Dauerstrom von Spielerautos im Unlimited-Modus
  und im Multiplayer nach einigen Minuten alle KI-Arme aushungern: Der Ring war leer, und
  Dauertippen wurde gefahrlos. Test: „a steady stream of the player's cars does not starve
  the other arms“.
  Liegt ein Wrack oder bremst ein Auto nahe ihrer Einfahrt (bis 2,5 s voraus, 1,5 s
  zurück), wartet sie. Eine Störung auf der anderen Seite des Rings, eine
  Verfolgungsjagd oder eine Modul-Zone anderswo hält sie nicht auf.
- Die KI füllt mit **ihren eigenen** Autos bis zur Ziel-Dichte auf. Die Autos des
  Spielers zählen nicht mit: Eine Kolonne des Spielers hält die Bots nicht zurück.
- **Jedes Auto hat ein Ausfahrtziel**, zufällig 1–3 Zufahrten weiter. Süd ist nie
  ein Ziel, denn dort steht deine Schlange.
- **Zufall über einen festen Seed.** Dieselbe Schicht lässt sich exakt
  wiederholen, für Tests und für Bug-Reports.

### 2.9 Module am Ring

Module werden im Street Builder gekauft und auf einen von **6 festen Modulplätzen**
(`moduleSlotCount`) am Ring gesetzt. Die Plätze liegen gleichmäßig verteilt und um einen
halben Schritt versetzt, damit nie ein Modul direkt in einer Einmündung steht. Sind alle
Plätze belegt, wird getauscht: Das alte Modul ist weg, das neue wird voll bezahlt. Ein
Abriss zahlt nichts zurück (`Career.build`, `Career.removeModule`).

Jedes Modul verdient ohne Tap Geld und kostet dafür Fluss, denn Verkehr, der zahlt, fließt
nicht. Mehr Geld heißt ein schwererer Ring (IDEA.md, „Wirtschaft schafft Gefahr“).

| Modul | Preis | Verdient | Zone | Wirkung |
| --- | --- | --- | --- | --- |
| Toll Booth | 10.400 | 120 pro Lkw (Autos fahren durch) | 150 lang, Tempo × 0,55 | langer, milder Abschnitt: dahinter staut es sich |
| Speed Camera | 15.600 | 45 pro Auto, nur wenn das Ring-Tempo über 108 % liegt (ruhiger Start: nichts, Rush Hour: jedes Auto) | 44 lang, Tempo × 0,7 | kurz und scharf: alle bremsen am Blitzer |
| Tow Depot | 13.000 | nichts | 180 lang, kein Tempolimit | Wracks in der Zone verschwinden 30 % schneller, der Ring fließt früher wieder |
| Billboard | 9.100 | 20 pro Auto (jedes Fahrzeug, immer) | 110 lang, Tempo × 0,85 | gleichmäßiges Grundeinkommen, dafür bremst der Verkehr leicht ab |
| Detour Sign | 7.800 | nichts | keine, wirkt auf die Ausfahrtwahl | Von den Autos, die vorbeifahren und weiterfahren würden, biegen 45 % (Stufe 2: 60 %, Stufe 3: 75 %) an der nächsten Ausfahrt vor dem Spielerarm ab; weniger Autos erreichen den Spielerarm |

Jedes Modul hat drei Stufen (Preis Stufe 2 = 1,5 ×, Stufe 3 = 2,5 × Modulpreis): Einnahmen der Zahler ×1/×2/×3, Tow Depot 30/40/50 %, Detour Sign 45/60/75 %.

- **Wer zahlt:** jedes Fahrzeug, das die Modulmitte passiert, außer Wracks und dem
  Verbrecher-Pickup.
- **Daily Login:** Jede Mautstelle zahlt 600 pro Tag Abwesenheit, höchstens 3 Tage
  (`tollIncomePerDay`).
- **Fahrer in der Zone** bremsen auf das Zonen-Tempo und beschleunigen danach wieder
  (Fahrermodell aus 2.6). Die KI fädelt nicht ein, solange ein langsames Auto nahe ihrer
  Einfahrt ist (2.7); eine Zone auf der anderen Seite des Rings hält sie nicht auf.
- **Darstellung:** Das Modul steht am Ring, seine Zone ist als Abschnitt sichtbar, damit
  man sieht, wo sich der Verkehr gleich staut. Ein Abschleppwagen fährt nach einem Crash
  aus dem Depot-Hof.
- Alle Werte stehen in `Web/src/core/config.ts` (Abschnitt „Ring modules and trucks“).

---

## 3. Screens und UI

**Screen-Ablauf und Inhalte** stehen in `Web/src/present/flow.ts`: welcher Screen gerade
aktiv ist, welche Daten er zeigt und welche Aktionen er anbietet. Die DOM-Hülle
(`Web/src/ui/`) zeigt daraus Tab-Bar, Sheets und Knöpfe.

*Stand M5:* **Es gibt kein Startmenü.** Das Spiel öffnet auf dem Game-Tab mit dem
Kreisverkehr; ein Tap startet die Schicht. Unten wechselt eine Tab-Bar zu den anderen
Seiten, gebaut wie eine iOS-Tab-Bar. Während
einer Schicht ist sie ausgeblendet.

| Screen | Inhalt | Wichtigste Aktion |
| --- | --- | --- |
| **Game-Tab, Modi** (26.09.2026) | Wischen zur Seite schiebt die ganze Karte weiter zum Kreisverkehr des nächsten Modus; er rastet auf einer Feder mit leichtem Überschwingen ein, dazu ploppt der Name des Modus auf (Desktop: ← →). Nach Level 5 weist ein Hinweis darauf hin, bis zum ersten Wechsel. **Shift** (Level), **Unlimited** (endlose Schicht auf festem Level `endlessLevel`, wird nach der Anlaufzeit immer dichter und schneller, endet erst mit dem Verlust, zahlt `endlessPayPerCar` je Auto, eigener Bestwert), **Mayhem** (12 Autos auf Level `mayhemLevel`, voller Verkehr ab der ersten Sekunde ohne Anlaufzeit, keine Verbrecher und Transporter; *(27.09.2026)* zwischen zwei Autos eine Nachladezeit von `mayhemReload` = 1,1 s, damit man nicht alles auf einmal raushaut, sondern auf den richtigen Moment wartet; viel mehr Lkw, die meisten davon Tanklaster, und alle paar Sekunden ein Militär-Truck, dessen Bombe das Finale ist; Wracks von Lkw, Tankern und Militär-Trucks zählen doppelt (`mayhemHeavyFlames`); niemand bremst, und fahrende Autos fahren über liegende Wracks hinweg, nur ein noch fliegendes Wrack (schneller als `mayhemWreckHitSpeed`) trifft, was im Weg ist; jeder Unfall, der ein neues Wrack macht, bringt Flammen; ein Folgeunfall im Verkehr binnen `mayhemChainWindow` verlängert die Kettenreaktion und zählt seinen Platz in ihr, höchstens `mayhemMaxChainFlames`; der eigene Crash startet die Kette neu; größere Explosionen je länger die Kette; zählt weder ins Geld noch in Level, Statistik, Mastery oder Challenges, nur eigener Bestwert). Ein kurzer Tipp startet wie immer; auf dem Game-Tab zählt er beim Loslassen. Im Tutorial keine Modi. Als letzte Seite: **Multiplayer** (2–4 Spieler, Last One Standing) | Wischen |
| **Game-Tab, bereit** | kein Menü: oben in der Szene "LEVEL 3", die Zahl der Autos, die Gefahrenstufe ("Normal duty" / "High alert · ×3 money"), Highscore und Geld; auf der Mittelinsel "Tap to start" | **Tap** (irgendwo) |
| **Spiel (HUD)** | oben links Punkte, oben mittig die Autos, die noch fehlen ("12 cars"), darunter die Crash-Punkte (2.6), unten die Einsatzfahrt; Combo auf der Mittelinsel; unten die Warteschlange | Tippen |
| **Unterbrechung** | Geht der Tab in den Hintergrund, hält die Schicht an und zählt beim Zurückkommen herunter | – |
| **Ergebnis** | kein Menü: oben in der Szene "GAME OVER" bzw. "LEVEL 3 COMPLETE", Punkte groß, "New Highscore" oder Bestwert; auf der Mittelinsel "Tap for level 4" bzw. "Tap to try level 3 again", Zeit, beste Combo, Tight Fits, Geld | **Tap** (irgendwo) |
| **Einstellungen** | Sound effects, Music, Haptics, Vehicle labels, Reduce Motion (Standard: aus, „System“ wählbar), Installieren, Cloud sync, Import einer alten Spielstand-Datei; das Zahnrad auf dem Game-Tab öffnet ein Sheet | – |
| **Build-Tab** | Segmented Control **Upgrades · Street Builder** (seit 26.09.2026 ein Tab, wie die Bereiche im Shop); öffnet dort, wo man ihn verlassen hat | – |
| Build · Upgrades | Kontostand und eine Karte je Upgrade: Bild, Name, gekaufte Stufen, Preis der nächsten. Ein Tap öffnet unten die Details, ein Doppel-Tap kauft | Stufe kaufen |
| Build · Street Builder | der Kreisverkehr von oben, die freien Steckplätze und eine Palette mit Teilen. Ein Teil wird auf einen Platz gezogen, ein Doppel-Tap baut es, ein einzelner nimmt es wieder weg | Zufahrt bauen |
| **Shop-Tab** | Chests · Collection · Casino ([LOOT.md](LOOT.md)); keine kaufbare Währung | Truhe öffnen |
| **Progress-Tab** | Records · Quests · Trials · Museum · Mastery | – |

Das HUD und das Ergebnis-Banner gehören zur Spielszene und kommen deshalb komplett
aus der Render-Liste. Nur schwebende Knöpfe (Einstellungen, Einsatzfahrt, Challenge) liegen
als DOM-Elemente darüber.

**Navigation (Progress · Game · Shop · Build):** Die Tab-Bar ist DOM (`Web/src/ui/shell.ts`),
`flow.ts` modelliert die Tabs (`Tab`, `Screen.page`).

### Design-Grundsätze

- **Dark Theme** mit Farben als Tokens nach Rollen: background, surface (Straße),
  primary (Text), muted, accent, destructive. Sie stehen in
  `Web/src/present/theme.ts` und als CSS-Variablen in `Web/src/ui/shell.css`.
- **Fahrzeugfarben sind Spielinformation und für die UI tabu.** Die Akzentfarbe
  darf nie wie ein Fahrzeugtyp aussehen (Polizei, Pickup, Transporter).
- **Fahrzeugtypen sind immer über Farbe, Form und Symbol erkennbar.** Damit ist
  Farbenblind-Tauglichkeit Standard und kein Extra.
- **Schrift:** die Systemschrift (auf Apple-Geräten SF Pro). Zahlen mit gleich breiten
  Ziffern, damit Punkte und Zähler nicht zittern.
- **Glas-Effekt sparsam**, nur für schwebende Bedienelemente über der Szene, nie über
  der Fahrbahn.
- **Touch:** Die ganze Spielfläche ist Tap-Zone. Buttons haben mindestens 44 px.
- **Native App-Anmutung:** Tab-Bar, gruppierte Listen, Sheets, Schalter und Segmented
  Controls, wie man sie von iOS kennt. Eigenes Design nur für die Spielszene selbst
  (Render-Liste).
- **So wenig Bewegung für den Daumen wie möglich:** Nach einer Schicht geht es mit
  einem Tap weiter, ohne einen Button suchen zu müssen.

### Motion- und Haptik-Regeln

Nach Emil Kowalski: Je häufiger ein Ereignis, desto weniger Animation. Für Haptik
gilt dasselbe. Die Bild-Spalte steckt in `Web/src/present/`, die Haptik-Spalte in
`Web/src/audio/` (nur wo der Browser vibrieren kann; auf iPhones kann er es nicht).

| Ereignis | Häufigkeit | Bild | Haptik |
| --- | --- | --- | --- |
| Tap → Auto fährt los | 15× pro Schicht, oft kurz hintereinander | sofort, keine Animation davor | keine (die Bewegung ist das Feedback) |
| Sauber eingefädelt | sehr oft | kein Text | feinster Klick, nur allein im Frame; im Flow tiefer und weicher wie alle Einfädel-Muster |
| Tight Fit | oft | Swoosh + kurzes "TIGHT!" (von 0,9 auf 1 skaliert mit Einblendung, < 250 ms, ease-out); seit 08.10.2026 ein Halt von 30 ms und ein Anlehnen der Kamera von 0,8 % zum Auto (in 70 ms weich hin, 0,26 s zurück; nie in einem Frame, das zuckte), auf Geräten ohne Vibration ×1,6 | ein scharfer Transient |
| Critical Merge, oberste Combo-Stufe | gelegentlich | Halt von 60 ms; der Critical zusätzlich Anlehnen 2,5 % (gleiche Kurve) | eigenes Muster |
| Flow | pro Serie | Ringglühen in drei Stufen (alle 5 Einfädelungen im Flow heller, jedes gesendete Auto pulst es kurz) | weicher |
| Neue Combo-Stufe | gelegentlich | Spring auf dem Multiplikator (Dauer 0,35 s, Bounce 0,2), Glow | Doppel-Tick |
| Crash | gelegentlich | Wracks mit Beulen, abreißende Teile, Splitter, Funken, Rauch; bei harten Treffern (≈ jeder 4.) Feuerball und Brand; Shake je nach Aufprallstärke, seit 08.10.2026 in Flugrichtung der Wracks (Stoß längs, wenig quer). Wracks und Rauch liegen unter dem Verkehr, damit keine Lücke verdeckt wird | kräftiger Stoß + kurzes Rumpeln, nur beim eigenen Crash |
| Rush Hour beginnt | 1× pro Schicht | Zustandswechsel am Auto-Zähler (Akzent-Pill) | ansteigendes Muster |
| Slow-Mo | beim Verbrecher-Takedown und beim Crash, der die Schicht beendet (0,2× für 0,45 s; die Kamera lehnt sich 8 % zum Aufprall, beim Takedown 5 %, danach 5 % Zurücktreten). Seit 08.10.2026 auch 0,5× für höchstens 0,9 s mit 6 % Blick darauf, wenn das letzte Auto einer Schicht dicht neben anderem Verkehr einfädelt (dann ist kein Tap mehr offen) | nie für häufige Ereignisse (Ausnahme seit 08.10.2026: der kurze Halt beim Tight Fit, kürzer als ein Blinzeln) | eigenes Muster |
| Spannung (08.10.2026, `present/cameraFx.ts`) | Zustand, pro Schicht | Rush Hour (steigt mit jedem Auto), letztes Auto, Verbrecher (Boss stärker), Militär-Truck, oberste Combo-Stufe, Unlimited nach Dauer: die Kamera lehnt sich bis 4 % vor, **Drehpunkt ist die Haltelinie**, damit die Lücken stillstehen; die Ränder dunkeln ab (Vignette bis 30 % auf hellen, 50 % auf dunklen Karten, unter dem HUD). Geschafft: die Spannung fällt schnell, die Kamera atmet 2 % aus. Nie in Chill und im Tutorial. Die Spannung rastet auf Stufen ein, damit der Boden gebacken bleibt | keine |
| Menüs (Sheets, Tabs) | selten | ≤ 250 ms, `cubic-bezier(0.23, 1, 0.32, 1)`; Knöpfe geben beim Drücken leicht nach | nur bei Bestätigungen |

**Reduce Motion** ist eine Einstellung und folgt standardmäßig der des Systems
(`prefers-reduced-motion`). Sie entfernt Shake, Zoom, Slow-Mo und fliegende Teile. Ein-
und Ausblenden sowie Farbwechsel bleiben, weil sie Information tragen; auch die Vignette der
Spannung bleibt (sie ist eine Blende), sie trägt dann die Spannung allein.

---

## 4. Architektur

### 4.1 Drei Schichten

```
  Eingabe mit Zeitstempel (pointerdown · Leertaste/Enter)
        │
        ▼
  core/ ─ Spielregeln, fester Takt 120 Hz, deterministisch, kein DOM
        │  Zustand + Events (merged · crash · comboChanged · rushHour · shiftEnded)
        ▼
  present/ ─ macht daraus Daten:
        │   • Render-Liste pro Frame (Formen, Texte, Kamera)
        │   • Effekte (Swoosh, Glow, Shake, Partikel, Popups, Slow-Mo)
        │   • Feedback-Signale (Sound-ID, Haptik-ID)
        │   • Screen-Ablauf (Game-Tab → Schicht → Ergebnis …) in der `GameSession`
        ▼
  Plattform ─ führt nur aus
      present/draw.ts zeichnet auf den Canvas, audio/ spielt Sounds und Musik,
      storage/ speichert, ui/ zeigt Tab-Bar, Sheets und Knöpfe
```

- **`core/` kennt kein DOM** und keine Browser-APIs. Nur so laufen die Balancing-Bots
  (`npm run sim`) und die Tests (`npm test`) in Node.
- **Die Render-Liste** besteht aus einfachen Bausteinen: abgerundete Rechtecke,
  Kreise, Bögen, Linien und Texte, jeweils mit Position, Drehung, Farb-Token und
  Deckkraft.
- **Gebackene Ebenen (29.09.2026, Performance ohne Grafikverlust):** Der Zeichner
  (`present/draw.ts`) backt, was still steht, einmal in ein Bild und kopiert es, solange
  Map, Straße, Kamera und Bildschirm gleich bleiben: den Boden samt Textur
  (`RenderList.markStatic`, in `MapTheme.addGround` die Stelle `still()`), die Alleen und die
  Straße (`RenderList.bake`). Formen außerhalb des Bildschirms werden nicht gezeichnet.
  **Regel:** Ein neues Bodendetail, das sich bewegt oder mit der Zeit ändert, gehört hinter
  `still()`, sonst friert es im Bild ein; eine gebackene Strecke braucht einen Schlüssel,
  der sich mit ihrem Inhalt ändert. Messen: `maps-preview.html?bench=1`, Pixelvergleich
  mit `?frames=2`.
- **Die Plattform enthält keine Spiellogik.**
- **Game-Loop:** Die Plattform sammelt pro Frame die vergangene Zeit und ruft
  `world.step(1/120)` so oft wie nötig auf. Zwischen zwei Schritten wird
  interpoliert. Bei 60, 120 oder 144 Hz bleibt das Timing damit gleich.
- **Eingaben kommen mit Zeitstempel** in die Simulation und werden nicht erst im
  nächsten Frame verarbeitet. Das macht das Timing auf die Millisekunde fair.
- **Deterministisch:** fester Zeitschritt plus Seed-Zufall. Gleicher Seed und
  gleiche Eingaben ergeben dasselbe Ergebnis. Darauf bauen Challenge-Links, der
  Multiplayer (Lockstep) und die Replay-Tests.

### 4.2 Fahrzeuge fahren auf Pfaden, nicht auf Winkeln

Jedes Fahrzeug hat einen **Pfad**, eine **Strecke s** auf diesem Pfad und ein
**Tempo**. Der Ring ist ein geschlossener Pfad. Zufahrten, Ausfahrten und die
Einfädelbahn sind offene Pfade.

**Warum:** Mehrspurige Kreisverkehre, der Straßennetz-Editor und die Zollstellen
aus IDEA.md sind dann nur neue Pfade und keine neue Logik.

### 4.3 Kollision

- Jedes Fahrzeug ist eine **Kapsel** (Strecke plus Radius). Der Abstand zwischen
  zwei Kapseln ist exakt und billig zu berechnen.
- **Keine Physik-Engine.** Die Kollision gehört zur Spiellogik, muss in Node
  testbar sein und exakt die Abstände für Tight Fit liefern.
- **Geprüft wird nur, wo es nötig ist:** einfädelnde Fahrzeuge gegen alles auf der
  Straße, Wracks eingeschlossen. Im normalen Verkehr kann Ring gegen Ring nicht
  kollidieren; erst wenn der Verkehr nach einem Crash gestört ist, wird auch der
  übrige Verkehr gegeneinander und gegen Wracks geprüft (mit Vorfilter über den
  Abstand).
- **Crashes sind echte Physik** (2.6), ebenfalls ohne Engine: Stoß-Impuls,
  Reifenreibung, Wrack gegen Wrack.
- Bei 120 Hz bewegt sich ein Auto pro Schritt weniger als eine Welt-Einheit. Es
  kann also nicht durch ein anderes "hindurchtunneln".

### 4.4 Ordnerstruktur

```
Car-game/
├─ CLAUDE.md                 feste Projektentscheidungen für Claude-Sessions
├─ FOUNDATION.md · Spiel.md · LOOT.md · IDEA.md
├─ Dockerfile                Node baut, nginx liefert aus (Port 5050)
└─ Web/
   ├─ index.html · vite.config.ts (schreibt auch den Service Worker)
   ├─ nginx.conf
   ├─ icon/                  Original des Icons (make_icon.py)
   ├─ public/                Manifest, Icons, Sounds und Musik (.m4a)
   ├─ scripts/               Balancing- und Casino-Bots, Tests
   └─ src/
      ├─ core/               Spielregeln (config.ts: ALLE Tuning-Werte)
      ├─ present/            Render-Liste, Szene, HUD, Seiten, Übergänge, GameSession
      ├─ audio/              Web Audio: Samples, adaptive Musik, Haptik
      ├─ storage/            Spielstand in localStorage
      ├─ net/                Multiplayer-Raum (PeerJS)
      └─ ui/                 DOM-Hülle: Canvas, Tab-Bar, Sheets
```

### 4.6 Andockpunkte für spätere Systeme

| Späteres System (IDEA.md) | Wo es in der Basis andockt |
| --- | --- |
| Polizei, Verbrecher-Pickup, Geldtransporter, Trucks | `VehicleType`; die Warteschlange erzeugt Typen nach Gewichtung (Polizei und Pickup umgesetzt in M3) |
| Einsatzfahrt / Panic-Button | `World.dispatchPolice()`; ein schwebender Knopf, `D`/`E` oder Rechtsklick |
| Sperrzonen um den Geldtransporter | Regel-Hooks in der Bewertung (`onMerged`) |
| Zollstellen und Stau | Pfade, dazu das Fahrermodell aus `drivers.ts` (eigenes Tempo, Bremsen, Anfahren) |
| Verfolgung im Ring | `drivers.ts`: Ein Polizeiauto, direkt hinter dem Verbrecher, beschleunigt auf ×1,4 (`policeChaseSpeedFactor`), bremst nicht für ihn und rammt ihn; es kreist, solange es jagt, danach reiht es sich wieder ein |
| Blaulicht | `present/scene.ts`: Polizeiautos blinken, sobald sie losfahren; während einer Jagd alle, auch in der Warteschlange |
| Gefahrenstufe und Upgrades | Die Config wird pro Schicht aus Basiswerten plus Modifikatoren gebaut; das Level macht es schon so (`forLevel` in `levels.ts`) |
| Shop, Truhen, Straßeneditor | neue Seiten in `flow.ts` und `present/`; Hauptnavigation über die Tab-Bar |
| Trucks, Polizei, Transporter mit Schaden | eigene Teile-Modelle in `carArt.ts`, Masse pro Fahrzeugtyp in `crash.ts` |
| Adaptive Musik | Events (`comboChanged`, `rushHour`) steuern die Audio-Layer |
| Challenge-Links, Replay-Tests | Seed und Eingabe-Zeitpunkte genügen als komplettes Replay |

---

---

## 7. Entscheidungen

**Entschieden:**

- ✅ Browserspiel (Vite + TypeScript + Canvas), installierbar als PWA, offline spielbar
- ✅ Hochformat, einhändig; Desktop mit Tastatur
- ✅ Spielsprache nur Englisch
- ✅ Native App-Anmutung; Hauptnavigation (Progress, Game, Shop, Build) als Tab-Bar
- ✅ Crashes mit echter Physik, reagierendem Verkehr und Blechschaden (2.6)
- ✅ Ergebnis ohne Menü: Banner in der Szene, ein Tap startet die nächste Schicht
- ✅ Kein Startmenü: Das Spiel öffnet auf dem Game-Tab, ein Tap startet die Schicht;
  die anderen Seiten erreicht man über die Tab-Bar unten (3)
- ✅ Eine Schicht hat keine feste Zeit: Man bringt eine feste Zahl Autos in den Verkehr,
  danach ist sie zu Ende. Gut gespielt ≈ 20 s, und das Spiel soll nicht leicht sein (2.5)
- ✅ Klassisch 1 Strike für normale Autos, dazu 3 Polizei-Crashes (2.6)

**Offen für den Playtest:**

1. Schwelle für Tight Fit (0,12 s) und ob "Cut off!" an oder aus ist (`sloppyWindow`)
2. Zahl der Autos pro Schicht und Stärke der Rush Hour
3. Einfädeldauer 0,5 s
4. **Combo-Stufen (5/10/20).** Der Balancing-Bot erreicht ×3 nach rund 15
   Einfädelungen und hält es oft die ganze Schicht. Höhere Schwellen oder ein Abklingen
   der Combo würden die Stufen spürbarer machen.
5. Sollen Folgeunfälle Strikes kosten (`chainCrashesCostStrikes`)? Und wie lange
   bleibt ein eingefädeltes Auto in deiner Verantwortung (`mergeResponsibility`, 1 s)?
6. Wie lange sollen Wracks liegen bleiben (`crashDuration`, 2,2 s)? Länger heißt
   mehr Stau und mehr Folgeunfälle, aber auch längere Wartezeit an der Einfahrt.
