# Foundation.md – Plan für die Basis des Spiels

Stand: 22.09.2026 · Grundlage: [IDEA.md](IDEA.md) (Spielidee) und [PLAN.md](PLAN.md) (Build- & Release-Weg)
Weiter geht es in [ROADMAP.md](ROADMAP.md), getestet wird nach [TESTING.md](TESTING.md).

## 0. Was mit "Basis" gemeint ist

Die Basis ist der Kernloop. Er muss für sich allein schon Spaß machen, bevor
irgendein Zusatzsystem dazukommt:

> Autos warten in einer Schlange. Ein Tap schickt das vorderste Auto in einen
> rotierenden Kreisverkehr. Gutes Timing bringt Punkte und Combo, schlechtes
> Timing einen Crash. Eine Schicht ist eine feste Zahl Autos (15), die alle in den
> Verkehr müssen; die letzten davon sind Rush Hour. Gut gespielt dauert das ≈ 20 s.

Fühlt sich dieser Loop nicht gut an, retten ihn auch Verbrecher, Geldtransporter
und Zollstellen nicht. Deshalb bauen wir ihn zuerst und spielen ihn auf dem
Windows-PC, bevor irgendetwas anderes dazukommt.

**Teil der Basis:** Kreisverkehr, KI-Verkehr, Warteschlange, Einfädeln per Tap,
Kollision, Combo, Tight-Fit-Bonus, Strikes, Schicht mit Rush Hour,
Ergebnis-Screen, Highscore.

**Nicht Teil der Basis:** alles andere aus IDEA.md. Die Architektur ist aber so
geschnitten, dass diese Systeme später ohne Umbau andocken (Abschnitt 4.6).

---

## 1. Technik, Arbeitsweise, Zielgeräte

### 1.1 Stack: Swift, überall

| Bereich | Wahl | Warum |
| --- | --- | --- |
| Sprache | Swift 6 | eine Sprache für Logik, Testfenster, App, später Widgets und Watch |
| Spielregeln | Modul **`GameCore`** | plattformneutral, läuft unter Windows und auf dem iPhone |
| Darstellungslogik | Modul **`GamePresentation`** | beschreibt Bild, Ton und Haptik als Daten, ebenfalls plattformneutral |
| Testfenster (Windows) | raylib über ein Swift-Paket | Fenster, Formen, Eingabe, Ton. Nur zum Testen, kommt nicht in die App |
| Spielszene (App) | SpriteKit | zeichnet, was `GamePresentation` vorgibt |
| Menüs (App) | SwiftUI | Apple-Look, Dynamic Type und VoiceOver ohne Nachbau |
| Haptik (App) | Core Haptics, Muster als `.ahap`-Dateien | Die Dateien entstehen am PC, spürbar sind sie erst am iPhone |
| Audio | Sounddateien (`.wav`), im Testfenster über raylib, in der App über AVAudioEngine | dieselben Dateien auf beiden Seiten |
| Texte | nur Englisch, zentral in `Strings.swift` | eine Quelle für Testfenster und App |
| Speichern | `Codable` → JSON-Datei | einfach, versionierbar, überall gleich |
| Tests | Swift Testing (unter Windows); ob XCUITest in Swift Playgrounds läuft, ist in M12 zu klären, sonst manuelles Playtesting | – |
| Werkzeuge | VS Code + Swift-Erweiterung (Windows); Swift Playgrounds nur zum Fertigmachen (iPad) | – |
| Fremdcode | In der App keiner, nur Apple-Frameworks. raylib nur im Testfenster | keine Abhängigkeiten in der App |

**Kein Backend, kein eigener Server.** Das Projekt und der Spielstand liegen
lokal; GitHub kommt ab Phase 2 nur als Sync-Kanal zwischen Windows und iPad dazu
(Abschnitt 1.2). Spätere Online-Funktionen laufen über Apples eigene Dienste
(Game Center, CloudKit, StoreKit).

### 1.2 Arbeitsweise: Windows zuerst, iPad nur zum Fertigmachen

Swift läuft unter Windows, SpriteKit, SwiftUI und die Haptik aber nicht. Damit
kein Mac gebraucht wird, steckt **alles Plattformneutrale in einem Paket**, das
unter Windows entsteht und getestet wird; zum Fertigmachen reicht später ein
iPad mit Swift Playgrounds:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Game/ – plattformneutrales Swift, entsteht unter Windows    │
  │                                                              │
  │   GameCore           die Spielregeln                         │
  │   GamePresentation   was man sieht, hört, fühlt – als Daten  │
  └──────────────┬──────────────────────────────┬────────────────┘
                 │                              │
   Testfenster · Windows · jetzt      iPhone-App · iPad · zum Fertigmachen
   raylib zeichnet die Daten          SpriteKit zeichnet dieselben Daten
   Maus / Leertaste = Tap             Touch, Haptik, SwiftUI-Menüs
```

| Unter Windows im Testfenster fertig und testbar | Erst mit iPad (und iPhone) |
| --- | --- |
| Timing, Fairness, Kollision, Combo, Schicht | wie sich ein echter Touch anfühlt |
| alle Features: Polizei, Transporter, Wirtschaft | Haptik spüren (die Muster schreiben wir am PC) |
| Look & Feel: Farben, Formen, Effekte, HUD, Sounds | SF-Pro-Schrift, SwiftUI-Menüs, Liquid Glass |
| Ablauf der Screens und ihre Inhalte | Performance auf dem iPhone, Bildschirmgrößen |
| Balancing (Bot spielt 1000 Schichten) | Signieren, TestFlight, App Store |

**Was für Phase 2 übrig bleibt (iPad, Swift Playgrounds):**

1. `App.swiftpm`-Projekt anlegen und das Paket `Game/` per lokalem Pfad einbinden
2. SpriteKit-Adapter: zeichnet die Render-Liste aus `GamePresentation`
3. Touch-, Haptik- und Audio-Adapter
4. SwiftUI-Menüs als reine Ansichten des Screen-Ablaufs aus `GamePresentation`
5. Tests auf dem echten Gerät und Timing-Feintuning mit Touch
6. Über GitHub synchronisieren, App-Store-Einreichung direkt aus Playgrounds prüfen

Alles andere kommt fertig und getestet aus Phase 1. Deshalb bleibt Phase 2 überschaubar.

**Einschränkung:** Maus und Leertaste sind nur ein Ersatz für den Finger. Ob das
Spiel Spaß macht, zeigt das Testfenster. Das letzte Timing-Feintuning passiert mit
echtem Touch (iPad, später iPhone).

**Risiko und Rückfallebene:** Die Swift-Pakete für raylib sind Community-Projekte.
Baut keines mit der aktuellen Swift-Version, legen wir den raylib-Quellcode (C)
direkt ins Projekt. Die Swift-Toolchain kompiliert ihn mit. Deshalb ist der erste
Schritt in M0 ein kurzer Bautest.

**Für Phase 2:** Swift Playgrounds (App Store, kostenlos) auf dem iPad
installieren, das Repo über eine Git-App (z. B. Working Copy) klonen oder über
Playgrounds' eigenen Repo-Import laden, darin den Ordner `App.swiftpm` öffnen.
Windows bleibt die Hauptkopie und pusht auf `origin`; das iPad zieht nur den
Stand, es entsteht keine zweite Quelle der Wahrheit.

### 1.3 Zielgeräte und Sprache

**Mindestversion ist iOS 26.** Das sind alle iPhones ab **iPhone 11** und das
**iPhone SE ab der 2. Generation**. iOS 27 wird ausdrücklich nicht vorausgesetzt:
Alles, was die App braucht, gibt es schon in iOS 26. Neuere APIs nur hinter
`if #available(iOS 27, *)`, und dann mit einem Weg, der ohne sie genauso
funktioniert.

| Grenze | Gerät | Was das für uns heißt |
| --- | --- | --- |
| Kleinster Bildschirm | iPhone SE (2./3. Gen.): 375 × 667 pt, 16:9, Home-Button | Das Layout muss auch auf einem niedrigen Bildschirm funktionieren |
| Größter Bildschirm | iPhone 17 Pro Max: 440 × 956 pt | Nichts darf verloren oder gestreckt wirken |
| Schwächster Chip | A13 (iPhone 11, SE 2. Gen.) | Performance-Maßstab: Dort müssen 60 fps halten |
| Bildwiederholrate | 60 Hz auf den meisten Modellen, 120 Hz auf ProMotion-Modellen | Fester Simulationstakt, damit das Timing überall gleich ist |
| Action Button | nur auf neueren Modellen | Die Einsatzfahrt gibt es immer auch als Button im Spiel |

**Sprache: nur Englisch, weltweit.** Alle Texte stehen an einer Stelle
(`Strings.swift`) und werden von Testfenster und App gemeinsam genutzt. Zahlen
erscheinen im Format des Geräts (1,000 bzw. 1.000). In Grafiken steht kein Text.

---

## 2. Spielregeln der Basis, konkret

Alle Zahlen sind **Startwerte**. Sie stehen gesammelt in
`Game/Sources/GameCore/Config.swift` und werden im Playtest getunt, im Testfenster
live über `tuning.json` (siehe [TESTING.md](TESTING.md)). Damit sind auch die
offenen Punkte "Combo-Schwellen" und "Multiplikatoren" aus IDEA.md vorläufig
beantwortet.

### 2.1 Spielfeld

- **Hochformat, einhändig spielbar.** Das Testfenster ist ebenfalls hochkant.
- **Die Spielwelt ist überall gleich groß** und hat feste Welt-Einheiten. Nur die
  Kamera zoomt so, dass Kreisverkehr und Warteschlange ins Fenster bzw. in den
  sicheren Bildschirmbereich passen. Timing und Highscores sind dadurch auf allen
  Geräten gleich. Auf dem iPhone SE zeigt die Warteschlange 3 statt 4 Autos.
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
Einheiten weiter, damit alle Platz behalten. Gebaut wird im Street Builder (ROADMAP.md, M5).

### 2.2 Was bei einem Tap passiert

Im Testfenster ist ein Tap ein Linksklick oder die Leertaste.

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
6. Autos im Ring **verlassen ihn nach 1–3 Ausfahrten wieder**. So entstehen
   ständig neue Lücken.

### 2.3 Bewertung einer Einfädelung

Der Abstand wird **in Sekunden** gemessen (Abstand ÷ Ringgeschwindigkeit). So
bleibt die Bewertung fair, wenn das Tempo in der Rush Hour steigt.

| Ergebnis | Bedingung | Punkte | Combo | Feedback |
| --- | --- | --- | --- | --- |
| **Crash** | Fahrzeuge berühren sich (beim Einfädeln oder bis 1 s danach) | −250 (nie unter 0) | auf 0 | normales Auto: Strike (Standard: Game Over), Polizeiauto: Polizei-Crash (2.6) |
| **Tight Fit** | kleinster Abstand < 0,12 s | 200 × Multiplikator | +2 | Swoosh, auf dem iPhone ein scharfer Taptic-Klick |
| **Sauber** | alles andere | 100 × Multiplikator | +1 | dezenter Ton |

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
  Akzent-Pill. Auf dem iPhone kommt ein Haptik-Signal dazu.
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
- **Gefahrenstufe (M5):** Vor jeder Schicht wählt man auf dem Game-Tab zwischen **Normal
  Duty** und **High Alert**. High Alert bringt 15 % mehr Autos, einen um ein Fünftel
  kürzeren Verbrecher-Countdown (nie unter `minCriminalTime`) und einen Verbrecher in
  *jeder* Schicht – dafür zählt alles Geld dreifach. Der Verkehr selbst (Dichte, Tempo)
  bleibt wie im Level: Dichter oder schneller obendrauf machte hohe Level unspielbar statt
  riskanter.
- **Level (M5):** Jede geschaffte Schicht ist ein Level höher, eine verlorene wird auf
  demselben Level wiederholt. Mit dem Level wachsen die Autozahl (10 → höchstens 30,
  je Versuch zufällig ±2) und ab Level 5 das Tempo; Level 1 bis 4 sind entschärft
  (`Levels.swift`, ROADMAP.md M5).

### 2.6 Fehler: Crashes

*Stand M4+:* **Ein Crash deines normalen Autos beendet die Schicht sofort**
(`maxStrikes = 1`, der klassisch harte "Car Circle"-Modus). **Polizeiautos haben ein
eigenes Budget:** Drei Polizei-Crashes pro Schicht übersteht man (`maxPoliceCrashes = 3`),
der vierte beendet sie. Ein Polizei-Crash kostet wie jeder Crash Punkte und die Combo,
aber keinen Strike.

- Die weiche Variante aus IDEA.md bleibt für den Vergleich umschaltbar:
  `maxStrikes = 3`. Das HUD zeigt Strike-Punkte nur, wenn es mehr als einen gibt,
  daneben blau umrandet die Polizei-Crashes; ein benutzter Punkt wird rot.
- **Wer ist schuld:** Es zählt das Auto, das gerade einfädelt (oder in der Sekunde
  danach). Fädelt ein Polizeiauto in dein eigenes normales Auto im Ring ein, ist das
  ein Polizei-Crash. Ist ein normales Auto mitschuld, ist es ein Strike.
- **Kein Crash im Sinne der Regel:** der Takedown (Polizei trifft Verbrecher: Punkte,
  Slow-Mo) und die Beschlagnahme (Polizei trifft Transporter: kein Geld, aber auch
  keine Strafe). Der Pickup ist dabei "gepanzert": Alles andere prallt an ihm ab, er fährt
  verbeult weiter. **Der Geldtransporter nicht:** Jeder Crash macht ihn zum Wrack, das Geld
  ist weg ("LOST"). Dafür bremst er wie jeder andere Fahrer.
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
  Physik (`Drivers.swift`). Danach beschleunigen sie wieder in den Fluss.
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
| Toll Booth | 8.000 | 120 pro Lkw (Autos fahren durch) | 150 lang, Tempo × 0,55 | langer, milder Abschnitt: dahinter staut es sich |
| Speed Camera | 12.000 | 45 pro Auto, nur wenn das Ring-Tempo über 108 % liegt (ruhiger Start: nichts, Rush Hour: jedes Auto) | 44 lang, Tempo × 0,7 | kurz und scharf: alle bremsen am Blitzer |
| Tow Depot | 10.000 | nichts | 180 lang, kein Tempolimit | Wracks in der Zone verschwinden 30 % schneller, der Ring fließt früher wieder |

- **Wer zahlt:** jedes Fahrzeug, das die Modulmitte passiert, außer Wracks und dem
  Verbrecher-Pickup. High Alert vervielfacht Modul-Einnahmen **nicht** (Entscheidung Leo,
  24.09.2026), nur Schichtlohn, Transporter und Abschirm-Bonus.
- **Daily Login:** Jede Mautstelle zahlt 600 pro Tag Abwesenheit, höchstens 3 Tage
  (`tollIncomePerDay`).
- **Fahrer in der Zone** bremsen auf das Zonen-Tempo und beschleunigen danach wieder
  (Fahrermodell aus 2.6). Die KI fädelt nicht ein, solange ein langsames Auto nahe ihrer
  Einfahrt ist (2.7); eine Zone auf der anderen Seite des Rings hält sie nicht auf.
- **Darstellung:** Das Modul steht am Ring, seine Zone ist als Abschnitt sichtbar, damit
  man sieht, wo sich der Verkehr gleich staut. Ein Abschleppwagen fährt nach einem Crash
  aus dem Depot-Hof.
- Alle Werte stehen in `Config.swift` (Abschnitt „Ring modules and trucks“).

---

## 3. Screens und UI

**Screen-Ablauf und Inhalte** entstehen in `GamePresentation`, also unter Windows:
welcher Screen gerade aktiv ist, welche Daten er zeigt und welche Aktionen er
anbietet. Das Testfenster zeigt das als schlichte Textseiten. Die App baut daraus
auf dem Mac die SwiftUI-Screens.

*Stand M5:* **Es gibt kein Startmenü.** Das Spiel öffnet auf dem Game-Tab mit dem
Kreisverkehr; ein Tap startet die Schicht. Unten wechselt eine Tab-Bar zu den anderen
Seiten (in der App die native `TabView`, im Testfenster eine schlichte Leiste). Während
einer Schicht ist sie ausgeblendet.

| Screen | Inhalt | Wichtigste Aktion |
| --- | --- | --- |
| **Game-Tab, bereit** | kein Menü: oben in der Szene "LEVEL 3", die Zahl der Autos, die Gefahrenstufe ("Normal duty" / "High alert · ×3 money"), Highscore und Geld; auf der Mittelinsel "Tap to start" | **Tap** (irgendwo) |
| **Spiel (HUD)** | oben links Punkte, oben mittig die Autos, die noch fehlen ("12 cars"), darunter die Crash-Punkte (2.6), oben rechts Pause; Combo auf der Mittelinsel; unten die Warteschlange | Tippen |
| **Pause** | Resume, Restart, End shift. Pausiert automatisch, wenn die App in den Hintergrund geht | **Resume** |
| **Ergebnis** | kein Menü: oben in der Szene "GAME OVER" bzw. "LEVEL 3 COMPLETE", Punkte groß, "New Highscore" oder Bestwert; auf der Mittelinsel "Tap for level 4" bzw. "Tap to try level 3 again", Zeit, beste Combo, Tight Fits, Geld | **Tap** (irgendwo) |
| **Einstellungen** | Sound, Haptics, Reduce Motion (Standard: folgt iOS); über dem Game-Tab (App: Zahnrad und Sheet, Testfenster: Esc) | – |
| **Upgrades-Tab** | Kontostand und eine Karte je Upgrade: Bild, Name, gekaufte Stufen, Preis der nächsten. Ein Tap öffnet unten die Details, ein Doppel-Tap kauft | Stufe kaufen |
| **Street-Builder-Tab** | der Kreisverkehr von oben, die freien Steckplätze und eine Palette mit Teilen. Ein Teil wird auf einen Platz gezogen, ein Doppel-Tap baut es, ein einzelner nimmt es wieder weg | Zufahrt bauen |
| **Shop-Tab** | noch Platzhalter ("comes later") | – |

Das HUD und das Ergebnis-Banner gehören zur Spielszene und kommen deshalb komplett
aus der Render-Liste. Nur der Pause-Button liegt in der App als SwiftUI-Overlay darüber.

**Navigation (ab M5):** Street Builder, Game, Shop und Upgrades wechselt man über
eine **native iOS-Tab-Bar** (SwiftUI `TabView`). `ScreenFlow` modelliert die Tabs
(`Tab`, `Screen.page`), die App baut daraus nur noch die `TabView`.

### Design-Grundsätze

Die Details legt der Look-&-Feel-Meilenstein M11 fest, das meiste davon schon im Testfenster.

- **Dark Theme** mit Farben als Tokens nach Rollen: background, surface (Straße),
  primary (Text), muted, accent, destructive. Sie stehen als Konstanten in
  `GamePresentation` und gelten für Testfenster und App gleich.
- **Fahrzeugfarben sind Spielinformation und für die UI tabu.** Die Akzentfarbe
  darf nie wie ein Fahrzeugtyp aussehen (Polizei, Pickup, Transporter).
- **Fahrzeugtypen sind immer über Farbe, Form und Symbol erkennbar.** Damit ist
  Farbenblind-Tauglichkeit Standard und kein Extra.
- **Schrift:** In der App SF Pro, im Testfenster eine freie Platzhalterschrift.
  Zahlen mit gleich breiten Ziffern, damit Punkte und Zähler nicht zittern.
- **In der App:** SF Symbols. **Liquid Glass sparsam**, nur für schwebende
  Bedienelemente wie Pause und Menü-Panels, nie über der Fahrbahn.
- **Touch:** Die ganze Spielfläche ist Tap-Zone. Buttons haben mindestens 44 pt.
- **So viele native Apple-Elemente wie möglich:** Tab-Bar, NavigationStack, Listen
  und Formulare (Einstellungen), Sheets, SF Symbols, System-Buttons. Eigenes Design
  nur für die Spielszene selbst (Render-Liste).
- **So wenig Bewegung für den Daumen wie möglich:** Nach einer Schicht geht es mit
  einem Tap weiter, ohne einen Button suchen zu müssen.

### Motion- und Haptik-Regeln

Nach Emil Kowalski: Je häufiger ein Ereignis, desto weniger Animation. Für Haptik
gilt dasselbe. Die Bild-Spalte wird in `GamePresentation` umgesetzt und ist im
Testfenster sichtbar. Die Haptik-Spalte ist erst auf dem iPhone spürbar.

| Ereignis | Häufigkeit | Bild | Haptik |
| --- | --- | --- | --- |
| Tap → Auto fährt los | 15× pro Schicht, oft kurz hintereinander | sofort, keine Animation davor | keine (die Bewegung ist das Feedback) |
| Sauber eingefädelt | sehr oft | kein Text | keine |
| Tight Fit | oft | Swoosh + kurzes "TIGHT!" (von 0,9 auf 1 skaliert mit Einblendung, < 250 ms, ease-out) | ein scharfer Transient |
| Neue Combo-Stufe | gelegentlich | Spring auf dem Multiplikator (Dauer 0,35 s, Bounce 0,2), Glow | Doppel-Tick |
| Crash | gelegentlich | Wracks mit Beulen, abreißende Teile, Splitter, Funken, Rauch; bei harten Treffern (≈ jeder 4.) Feuerball und Brand; Shake je nach Aufprallstärke. Wracks und Rauch liegen unter dem Verkehr, damit keine Lücke verdeckt wird | kräftiger Stoß + kurzes Rumpeln, nur beim eigenen Crash |
| Rush Hour beginnt | 1× pro Schicht | Zustandswechsel am Auto-Zähler (Akzent-Pill) | ansteigendes Muster |
| Slow-Mo | nur beim Verbrecher-Takedown | nie für häufige Ereignisse | eigenes Muster |
| Menüs (App, SwiftUI) | selten | ≤ 250 ms, `.timingCurve(0.23, 1, 0.32, 1, duration: 0.25)`; Buttons beim Drücken auf 0,97 skaliert | `.sensoryFeedback` nur bei Bestätigungen |

**Reduce Motion** ist eine Einstellung in `GamePresentation` und folgt in der App
der iOS-Einstellung. Sie entfernt Shake, Zoom, Slow-Mo und fliegende Teile. Ein-
und Ausblenden sowie Farbwechsel bleiben, weil sie Information tragen.

---

## 4. Architektur

### 4.1 Drei Schichten

```
  Eingabe mit Zeitstempel (Testfenster: Klick / Leertaste · App: Touch)
        │
        ▼
  GameCore ─ Spielregeln, fester Takt 120 Hz, deterministisch
        │  Zustand + Events (merged · crash · comboChanged · rushHour · shiftEnded)
        ▼
  GamePresentation ─ macht daraus Daten:
        │   • Render-Liste pro Frame (Formen, Texte, Kamera)
        │   • Effekte (Swoosh, Glow, Shake, Partikel, Popups, Slow-Mo)
        │   • Feedback-Signale (Sound-ID, Haptik-ID)
        │   • Screen-Ablauf (Start → Schicht → Pause → Ergebnis …)
        ▼
  Plattform ─ führt nur aus
      Testfenster: raylib zeichnet, spielt Sounds
      App: SpriteKit zeichnet, AVAudioEngine spielt, Core Haptics vibriert, SwiftUI zeigt Menüs
```

- **`GameCore` und `GamePresentation` nutzen nur die Swift-Standardbibliothek und
  Foundation.** Kein SpriteKit, UIKit, SwiftUI oder `simd` (dafür ein eigener
  `Vec2`). Nur so bauen sie unter Windows.
- **Die Render-Liste** besteht aus einfachen Bausteinen: abgerundete Rechtecke,
  Kreise, Bögen, Linien und Texte, jeweils mit fester ID, Position, Drehung,
  Farb-Token und Deckkraft. Jede Plattform kann das mit wenig Code zeichnen. Die
  App hält pro ID einen wiederverwendeten SpriteKit-Node und rendert Formen als
  Texturen vor.
- **Die Plattform enthält keine Spiellogik.** Testfenster und iPhone verhalten sich
  dadurch garantiert gleich, und die Mac-Phase bleibt dünn.
- **Game-Loop:** Die Plattform sammelt pro Frame die vergangene Zeit und ruft
  `world.step(1/120)` so oft wie nötig auf. Zwischen zwei Schritten wird
  interpoliert. Am PC-Monitor (60/144 Hz) wie auf dem iPhone (60/120 Hz) bleibt
  das Timing damit gleich.
- **Eingaben kommen mit Zeitstempel** in die Simulation und werden nicht erst im
  nächsten Frame verarbeitet. Das macht das Timing auf die Millisekunde fair.
- **Deterministisch:** fester Zeitschritt plus Seed-Zufall. Gleicher Seed und
  gleiche Eingaben ergeben dasselbe Ergebnis. Das ist auch die Grundlage für
  Replays und Social Clips aus IDEA.md.
- **Nur für die App:** 120 Hz per `SpriteView(preferredFramesPerSecond: 120)` und
  dem Info.plist-Key `CADisableMinimumFrameDurationOnPhone`.

### 4.2 Fahrzeuge fahren auf Pfaden, nicht auf Winkeln

Jedes Fahrzeug hat einen **Pfad**, eine **Strecke s** auf diesem Pfad und ein
**Tempo**. Der Ring ist ein geschlossener Pfad. Zufahrten, Ausfahrten und die
Einfädelbahn sind offene Pfade.

**Warum:** Mehrspurige Kreisverkehre, der Straßennetz-Editor und die Zollstellen
aus IDEA.md sind dann nur neue Pfade und keine neue Logik.

### 4.3 Kollision

- Jedes Fahrzeug ist eine **Kapsel** (Strecke plus Radius). Der Abstand zwischen
  zwei Kapseln ist exakt und billig zu berechnen.
- **Keine Physik-Engine.** Die Kollision gehört zur Spiellogik, muss unter
  Windows testbar sein und exakt die Abstände für Tight Fit liefern.
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
Car game/                          (Projektordner, lokal)
├─ CLAUDE.md                       feste Projektentscheidungen für Claude-Sessions
├─ IDEA.md · PLAN.md · FOUNDATION.md · ROADMAP.md · TESTING.md
├─ Game/                           Swift Package – plattformneutral (Windows + iPad)
│  ├─ Package.swift
│  ├─ Sources/GameCore/            Spielregeln
│  │  ├─ Config.swift              ALLE Tuning-Werte an einem Ort
│  │  ├─ World.swift               Spielzustand + step(dt)
│  │  ├─ Paths.swift               Pfade (Kreis, Bézier) nach Streckenlänge
│  │  ├─ Roundabout.swift          Ring, Zufahrten, Einfädel- und Ausfahrbahnen
│  │  ├─ Vehicle.swift             Fahrzeug, Phasen, Einfädel-Tempoprofil
│  │  ├─ Traffic.swift             KI-Verkehr (ein- und ausfahren)
│  │  ├─ Queue.swift               Warteschlange + Tap-Verarbeitung
│  │  ├─ Collision.swift           Kapsel-Abstände
│  │  ├─ CrashPhysics.swift        Stoß als Starrkörper-Impuls, Rutschen mit Reifenreibung, Beulen
│  │  ├─ Drivers.swift             Fahrer reagieren auf Crashes: bremsen, anhalten, auffahren
│  │  ├─ Criminals.swift           Verbrecher-Pickup: Warnung, Countdown, Takedown, Einsatzfahrt (M3)
│  │  ├─ Scoring.swift             Bewertung, Combo, Strikes
│  │  ├─ Shift.swift               Autos der Schicht, Dichte- und Tempokurve, Rush Hour
│  │  ├─ Tuning.swift              tuning.json über die Config legen
│  │  ├─ Events.swift              typisierte Events
│  │  ├─ RNG.swift                 Seed-Zufall
│  │  └─ Vec2.swift                eigene Vektor-Mathematik
│  ├─ Sources/GamePresentation/    Darstellung als Daten
│  │  ├─ RenderList.swift          Formen, Texte, Kamera pro Frame
│  │  ├─ Camera.swift              Welt ins Fenster bzw. auf den Bildschirm einpassen
│  │  ├─ Effects.swift             Crash-Effekte: Feuer, Rauch, Splitter, abreißende Teile, Shake
│  │  ├─ CarArt.swift              Fahrzeug aus Teilen, verbeulbare Karosserie
│  │  ├─ HUD.swift                 Punkte, Auto-Zähler, Crash-Punkte, Combo, Popups, Ergebnis-Banner
│  │  ├─ Platform.swift            Protokolle (SaveStore …), Spielstand, JSON-Speicher
│  │  ├─ Motion.swift              Easing-Kurven und Springs
│  │  ├─ Theme.swift               Farb-Tokens, Maße
│  │  ├─ Feedback.swift            Event → Sound-ID + Haptik-ID
│  │  ├─ ScreenFlow.swift          Screen-Ablauf und Screen-Inhalte
│  │  ├─ SceneBuilder.swift        Straßen und Fahrzeuge als Render-Items
│  │  ├─ DebugOverlay.swift        F1: Hitboxen, Abstände, FPS, Seed
│  │  ├─ GameSession.swift         Frame-Schleife für die Plattform (Takt, Eingaben, Render-Liste)
│  │  └─ Strings.swift             alle Texte (Englisch)
│  ├─ Sources/GameBots/            Bots (perfekt, menschlich, zufällig) für Sim und Tests
│  ├─ Sources/Sim/                 Balancing-Bot:  swift run Sim
│  └─ Tests/                       Swift Testing:  swift test
├─ Assets/                         plattformneutral: Sounds (.wav), Haptik-Muster (.ahap)
├─ TestWindow/                     Swift Package – Testfenster (raylib)
│  ├─ Package.swift                nutzt ../Game und raylib
│  ├─ Sources/CRaylib/             raylib 5.5 als C-Quellcode (Rückfallebene aus 1.2, ab M0 genutzt)
│  ├─ Sources/TestWindow/          zeichnet, nimmt Eingaben an, spielt Sounds
│  ├─ Sources/SoundMaker/          erzeugt die Platzhalter-Sounds:  swift run SoundMaker
│  ├─ tuning.json                  Werte zum Live-Tunen (Taste T)
│  └─ savegame.json                Highscore und Einstellungen des Testfensters (entsteht beim Spielen)
└─ App.swiftpm/                    Swift-Playgrounds-App-Projekt – entsteht erst auf dem iPad (Phase 2)
   ├─ Package.swift                iOSApplication-Produkt, lokale Abhängigkeit auf ../Game
   └─ Sources/                     SpriteKit-, Touch-, Haptik-, Audio-Adapter, SwiftUI-Menüs
```

### 4.5 Schnittstellen (Protokolle)

Alles, was Hardware oder Speicher berührt, läuft über ein Protokoll aus dem Paket
`Game/` (`Platform.swift`). Jede Plattform liefert ihre eigene Umsetzung. Einzige
Ausnahme: `FileSaveStore` (JSON-Datei, nur Foundation) steckt schon im Paket und
dient Testfenster und App gleich, nur der Speicherort unterscheidet sich.

| Protokoll | Zweck | Testfenster | App | In Tests |
| --- | --- | --- | --- | --- |
| `SaveStore` | Spielstand, Highscore | JSON-Datei | JSON in Application Support | im Arbeitsspeicher |
| `AudioPlaying` | Sounds, später Musik-Layer | raylib | AVAudioEngine | stumm |
| `HapticsPlaying` | Haptik-Muster | stumm | Core Haptics (`.ahap`) | zeichnet nur auf |
| `RandomSource` | Zufall | Uhrzeit oder `--seed` | Uhrzeit | fester Seed |

### 4.6 Andockpunkte für spätere Systeme

| Späteres System (IDEA.md) | Wo es in der Basis andockt |
| --- | --- |
| Polizei, Verbrecher-Pickup, Geldtransporter, Trucks | `VehicleType`; die Warteschlange erzeugt Typen nach Gewichtung (Polizei und Pickup umgesetzt in M3) |
| Einsatzfahrt / Panic-Button | `World.dispatchPolice()` (M3); in der App ein Button und der Action Button |
| Sperrzonen um den Geldtransporter | Regel-Hooks in der Bewertung (`onMerged`) |
| Zollstellen und Stau | Pfade, dazu das Fahrermodell aus `Drivers.swift` (eigenes Tempo, Bremsen, Anfahren) |
| Verfolgung im Ring (M4+) | `Drivers.swift`: Ein Polizeiauto, direkt hinter dem Verbrecher, beschleunigt auf ×1,4 (`policeChaseSpeedFactor`), bremst nicht für ihn und rammt ihn; es kreist, solange es jagt, danach reiht es sich wieder ein |
| Blaulicht (M4+) | `SceneBuilder.swift`: Polizeiautos blinken, sobald sie losfahren; während einer Jagd alle, auch in der Warteschlange |
| Gefahrenstufe und Upgrades | Die Config wird pro Schicht aus Basiswerten plus Modifikatoren gebaut; das Level macht es schon so (`Config.forLevel`) |
| Shop, Truhen, Straßeneditor | neue Screens in `ScreenFlow`, in der App als SwiftUI-Ansichten; Hauptnavigation als native Tab-Bar |
| Trucks, Polizei, Transporter mit Schaden | eigene Teile-Modelle in `CarArt`, Masse pro Fahrzeugtyp in `CrashPhysics` |
| Adaptive Musik | Events (`comboChanged`, `rushHour`) steuern die Audio-Layer |
| Widget, Live Activity, Watch | lesen den gespeicherten Spielstand bzw. Events aus |
| Replays und Social Clips | Seed und Eingabe-Zeitpunkte genügen als komplettes Replay |

---

## 5. Bauschritte der Basis (M0 bis M2, alles unter Windows)

### M0 – Fundament

1. Werkzeuge einrichten: Visual-Studio-Build-Tools, Swift-Toolchain, VS Code mit
   Swift-Erweiterung (Befehle in [TESTING.md](TESTING.md), Abschnitt 0).
2. **Bautest Testfenster:** Ein raylib-Fenster öffnet sich unter Windows. Klappt
   das Swift-Paket nicht, wird raylib lokal eingebunden (Abschnitt 1.2).
3. Paket `Game/` mit `GameCore` und `GamePresentation` und je einem ersten Test
   anlegen. `swift test` ist grün.
4. Die Render-Liste steht, und das Testfenster zeichnet, was sie liefert.
   Game-Loop mit festem 120-Hz-Takt und Interpolation, die Kamera passt die Welt
   ins Hochkant-Fenster.
5. Statischer Kreisverkehr im Testfenster. Debug-Overlay mit F1 (FPS, Seed),
   Startparameter `--seed` und `--time-scale`.

**Fertig, wenn:** der Kreisverkehr im Testfenster zu sehen ist und `swift test`
grün ist.

### M1 – Kreisverkehr & Einfädeln

1. Pfad-System (Ring, 4 Zufahrten, Einfädelbahn) mit Tests.
2. KI-Verkehr, Warteschlange, Einfädeln, Kapsel-Kollision und Messung des
   Mindestabstands, mit Tests für die Grenzfälle ("gerade so berührt", "gerade so vorbei").
3. Fahrzeuge als Formen in der Render-Liste. Klick oder Leertaste lässt ein Auto
   einfädeln, ein Crash dreht die Autos heraus.
4. Debug: Kapseln und Abstände einblenden (F1), Zeitlupe (F2).

**Fertig, wenn:** Man kann endlos einfädeln und crashen, und jeder Crash wirkt im
Debug-Overlay fair.

### M2 – Schicht & Punkte (damit ist die Basis spielbar)

1. Bewertung (Crash, Tight Fit, Sauber), Combo, Strikes, Schicht-Timer, Dichte-
   und Tempokurve, Rush Hour, alles mit Tests.
2. HUD (Punkte, Timer, Strikes, Combo) als Texte in der Render-Liste.
3. Screen-Ablauf Start → Schicht → Pause → Ergebnis in `ScreenFlow`, im
   Testfenster als schlichte Textseiten.
4. Highscore in einer JSON-Datei speichern (`SaveStore`).
5. Live-Tuning: Werte in `tuning.json` ändern, im Fenster **T** drücken, sofort
   aktiv, ohne Neustart.
6. Einfache Soundeffekte für Tight Fit und Crash. Ton hilft schon jetzt beim
   Timing-Gefühl.
7. Balancing-Bot `swift run Sim`: Ein perfekter Bot darf nie crashen, ein
   Zufalls-Tapper crasht oft, die Punkteverteilung ist plausibel.

**Fertig, wenn:** die Definition of Done unten erfüllt ist.

*Umgesetzt in M2, zusätzlich auf Wunsch:* echte Crash-Physik, reagierender Verkehr
mit Kettenunfällen, Blechschaden mit abreißenden Teilen, erste Crash-Effekte (Feuer,
Rauch, Splitter) und das Ergebnis als Banner statt Menü (Abschnitte 2.5 und 2.6).

---

## 6. Definition of Done der Basis (Windows)

- [x] Eine komplette 2-Minuten-Schicht ist im Testfenster spielbar
- [x] Läuft flüssig mit der Bildrate des Monitors (gemessen: 164 fps), auch in der Rush Hour
- [x] Das Auto fährt im selben Frame los, in dem geklickt bzw. gedrückt wird (automatischer Test)
- [ ] Jeder Crash ist im Debug-Overlay nachvollziehbar, kein "das war doch frei!" (Playtest)
- [x] Gleicher Seed und gleiche Eingaben ergeben dasselbe Ergebnis (automatischer Test)
- [x] Combo, Tight Fit, Strikes, Rush Hour, Ergebnis und Highscore funktionieren
- [x] Werte lassen sich über `tuning.json` ohne Neustart ändern
- [x] Das Testfenster enthält keine Spiellogik, nur Zeichnen, Eingabe und Ton
- [x] `swift test` ist grün, der Balancing-Bot liefert plausible Werte (perfekter Bot: 0 Crashes in 1000 Schichten)
- [ ] Playtest: 5 Schichten gespielt, Entscheidungen aus Abschnitt 7 notiert

---

## 7. Entscheidungen

**Entschieden:**

- ✅ Swift, überall
- ✅ Entwickelt und getestet wird unter Windows, Phase 2 läuft ohne Mac auf dem iPad (Swift Playgrounds)
- ✅ Die App läuft auf jedem iPhone ab iOS 26 (ab iPhone 11 / SE 2. Gen.)
- ✅ Hochformat, einhändig
- ✅ Spielsprache nur Englisch
- ✅ Veröffentlichung weltweit über den App Store, deine Website ist die
  Startseite des Spiels (PLAN.md, Phase 3)
- ✅ GitHub erst ab Phase 2, nur als Sync-Kanal zwischen Windows und iPad
- ✅ So viele native Apple-Elemente wie möglich; Hauptnavigation (Street Builder,
  Game, Shop, Upgrades) als native Tab-Bar
- ✅ Crashes mit echter Physik, reagierendem Verkehr und Blechschaden (2.6)
- ✅ Ergebnis ohne Menü: Banner in der Szene, ein Tap startet die nächste Schicht
- ✅ Kein Startmenü: Das Spiel öffnet auf dem Game-Tab, ein Tap startet die Schicht;
  die anderen Seiten erreicht man über die Tab-Bar unten (3)
- ✅ Eine Schicht hat keine feste Zeit: Man bringt eine feste Zahl Autos in den Verkehr,
  danach ist sie zu Ende. Gut gespielt ≈ 20 s, und das Spiel soll nicht leicht sein (2.5)

**Entscheiden wir im Playtest nach M2:**

1. ~~3 Strikes oder klassisch 1 (`maxStrikes`)~~ → in M4 entschieden: klassisch 1 für
   normale Autos, dazu 3 Polizei-Crashes (2.6)
2. Schwelle für Tight Fit (0,12 s) und ob "Cut off!" an oder aus ist (`sloppyWindow`)
3. ~~Schichtlänge 120 s~~ → in M4 entschieden: keine Uhr, 15 Autos pro Schicht (2.5).
   Offen: Zahl der Autos und Stärke der Rush Hour
4. Einfädeldauer 0,5 s
5. Kommen Klick und Leertaste als Tap-Ersatz nah genug an das echte Gefühl heran?
   Das endgültige Timing-Feintuning passiert mit Touch in M12.
6. **Combo-Stufen (5/10/20).** Der Balancing-Bot erreicht ×3 nach rund 15
   Einfädelungen und hält es oft die ganze Schicht (beste Combo Ø 190 beim perfekten,
   Ø 125 beim menschenähnlichen Bot). Höhere Schwellen oder ein Abklingen der Combo
   würden die Stufen spürbarer machen.
7. Sollen Folgeunfälle Strikes kosten (`chainCrashesCostStrikes`)? Und wie lange
   bleibt ein eingefädeltes Auto in deiner Verantwortung (`mergeResponsibility`, 1 s)?
8. Wie lange sollen Wracks liegen bleiben (`crashDuration`, 2,2 s)? Länger heißt
   mehr Stau und mehr Folgeunfälle, aber auch längere Wartezeit an der Einfahrt.
