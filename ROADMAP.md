# Roadmap – vom Testfenster zur App im App Store

Stand: 22.09.2026 · Die Details zur Basis (M0–M2) stehen in [FOUNDATION.md](FOUNDATION.md), das Testen in [TESTING.md](TESTING.md), der Gesamtweg in [PLAN.md](PLAN.md).

## Überblick

### Phase 1 · Windows: fast die ganze Arbeit, gespielt im Testfenster

| # | Meilenstein | Umfang | Was du danach im Testfenster testen kannst |
| --- | --- | --- | --- |
| M0 | Fundament ✅ | S | Kreisverkehr im Fenster, erste Tests grün |
| M1 | Kreisverkehr & Einfädeln ✅ (Playtest offen) | M | endlos einfädeln und crashen |
| M2 | Schicht & Punkte ✅ (Playtest offen) | M | komplette Schicht mit Punkten → **Basis spielbar** |
| M3 | Polizei & Verbrecher ✅ (Playtest offen) | L | Verbrecher jagen, Einsatzfahrt |
| M4 | Geldtransporter ✅ (Playtest offen) | M | Transporter abschirmen, erstes Geld |
| M5 | Wirtschaft & Fortschritt (Level ✅, Geld & Upgrades ✅, Tab-Navigation ✅, fließender Übergang ✅, Gefahrenstufe ✅, Street Builder ✅) | L | Geld verdienen und ausgeben, Gefahrenstufe |
| M6 | Look & Feel | M | finale Farben, Formen, Effekte, HUD und Sounds |

### Phase 2 · Mac: nur Fertigmachen

| # | Meilenstein | Umfang | Was du danach testen kannst |
| --- | --- | --- | --- |
| M7 | iPhone-App | M | das komplette Spiel mit Touch und Haptik auf deinem iPhone |

### Phase 3 · Veröffentlichung

| # | Meilenstein | Umfang | Ergebnis |
| --- | --- | --- | --- |
| M8 | v1.0 & Launch | M | Beta über TestFlight, dann **v1.0 im App Store**, deine Website als Startseite |

**Umfang** ist die relative Größe (S < M < L) und keine Zeitzusage.

## Grundsätze

1. **Jeder Meilenstein endet mit etwas Spielbarem.** Kein Meilenstein ist "nur Technik".
2. **M2 ist ein Tor.** Macht die Basis keinen Spaß, tunen wir die Basis und bauen
   nicht weiter. Features retten keinen schwachen Kernloop.
3. **Ein neues System pro Meilenstein**, danach ein Playtest. So wissen wir immer,
   was ein Problem verursacht.
4. **Alles, was nicht zwingend den Mac braucht, entsteht unter Windows.** Regeln
   gehören in `GameCore`, Darstellung, Effekte und Screen-Ablauf in
   `GamePresentation`. Das Testfenster und später die App führen nur aus.
5. **Das Testfenster bleibt ein Werkzeug.** Es bekommt keine eigene Logik und
   keinen eigenen Design-Aufwand.
6. **Kein eigener Server.** Alles läuft auf dem Gerät. Online-Funktionen laufen
   später über Apples Dienste.

---

# Phase 1 · Windows

## M0–M2 · Die Basis

Schritt für Schritt beschrieben in [FOUNDATION.md, Abschnitt 5](FOUNDATION.md#5-bauschritte-der-basis-m0-bis-m2-alles-unter-windows).
Am Ende steht eine komplette Schicht (damals 2 Minuten, seit M4 15 Autos ohne Uhr) mit Combo, Tight Fit, Strikes und
Rush Hour, spielbar im Testfenster auf deinem PC.

**In M2 zusätzlich umgesetzt (auf Wunsch vorgezogen):**

- **Crashes mit echter Physik:** Stoß als Starrkörper-Impuls am Kontaktpunkt,
  danach rutschen und drehen die Wracks mit Reifenreibung aus (`CrashPhysics`).
- **Reagierender Verkehr:** Fahrer sehen Wracks und bremsende Autos, reagieren nach
  0,5–1,5 s und bremsen. Reicht der Platz nicht, gibt es Auffahrunfälle
  (`Drivers.swift`). Ohne Crash fließt alles exakt wie vorher.
- **Blechschaden:** Beulen dort, wo das Auto getroffen wurde; Stoßstangen, Haube,
  Spiegel und Räder reißen ab, Scheiben splittern (`CarArt`).
- **Crash-Effekte, erste Version:** Aufprall-Blitz, Feuerball und Brand bei harten
  Treffern, Rauch, Funken, Splitter, kurzer Shake. Der Feinschliff folgt in M6.
- **Ergebnis ohne Menü:** "GAME OVER" bzw. "SHIFT COMPLETE" oben in der Szene, die
  Simulation läuft weiter, ein Tap startet die nächste Schicht.

**Playtest-Tor nach M2:** 5 Schichten spielen, dann entscheiden: 3 Strikes oder 1?
(In M4 entschieden: 1 für normale Autos, 3 Crashes für Polizeiautos.)
Stimmt die Tight-Fit-Schwelle? Sind die Schichtlänge und die Rush Hour richtig?
Sind die Combo-Stufen zu niedrig? (Der Balancing-Bot hält ×3 fast die ganze
Schicht, siehe FOUNDATION.md, Abschnitt 7.) Sollen Folgeunfälle Strikes kosten?
Und die wichtigste Frage: *Will ich direkt noch eine Schicht spielen?*

---

## M3 · Polizei & Verbrecher

**Ziel:** die zweite Gefahrenquelle aus IDEA.md. Zum Einfädeln kommt eine aktive Jagd.

- **Fahrzeugtypen in der Schlange:** normale Autos und Polizeiautos, nach
  Gewichtung, über Farbe, Form und Symbol unterscheidbar.
- **Verbrecher-Pickup:** vorher ~2 s Warnung (Banner und Sirenen-Ton), dann ein
  sichtbarer Countdown am Fahrzeug. Startwert: **15 s** (seit M4: 12 s).
- **Takedown = ein Polizeiauto trifft beim Einfädeln den Pickup.** Der Pickup
  kommt pro Runde (~7 s) einmal an deiner Einfahrt vorbei. Bei 15 s bleiben also
  etwa 2 Chancen. Das ist die Spannung.
- **Guter Crash:** 0,3 s Slow-Mo und eine Belohnung. Trifft ein normales Auto den
  Pickup, ist das ein normaler Crash (Strike).
- **Pickup entkommt = Schicht verloren** (Hard Fail, wie in IDEA.md festgelegt).
- **Einsatzfahrt:** Das nächste Auto wird zum Polizeiauto, dafür halbiert sich die
  Combo. Im Testfenster liegt sie auf Taste **E** oder der rechten Maustaste.

**Beantwortet aus IDEA.md:** wie oft Verbrecher erscheinen, wie streng das
Zeitlimit ist und wie der Spieler an ein Polizeiauto kommt (Startwerte, im
Playtest zu tunen).

**Umgesetzt** (`Criminals.swift`, Startwerte in `Config.swift`, alle auch in `tuning.json`):

| Regel | Startwert |
| --- | --- |
| Anteil Polizeiautos in der Warteschlange | 20 % (`policeShare`) |
| Erster Verbrecher / Pause nach einem Takedown | nach 15–25 s / 18–30 s (seit M4: 4–8 s / 10–16 s) |
| Warnung vor dem Auftauchen | 2 s: "WANTED", Sirene, pulsierender Ring an der Zufahrt |
| Countdown ab der Einfahrt | 15 s (seit M4: 12 s); der Pickup dreht bis dahin Runden statt auszufahren |
| Takedown | 1.000 Punkte × Multiplikator (× Rush Hour), Combo bleibt, 0,3 s Slow-Mo |
| Einsatzfahrt (E / Rechtsklick) | vorderstes Auto wird Polizei, Combo × 0,5 |
| Kein neuer Verbrecher | wenn die Jagd das Schichtende überdauern könnte |

- **Nur Polizei stoppt ihn.** Der Pickup ist schwer (2,5-fache Masse) und bremst für
  nichts. Normale Autos und Wracks prallen physikalisch an ihm ab, er fährt verbeult
  weiter. Rammt dein normales Auto ihn beim Einfädeln, ist das ein normaler Strike.
- **Der gute Crash** sieht anders aus als ein Unfall: kurze Zeitlupe, flache
  Splitter in Polizeifarben, blauer Ring, "BUSTED! +1.000", eigener Sound, kein Feuer.
- **Erkennbarkeit:** Polizei blau mit weißem Dach und Lichtbalken (blinkt während der
  Jagd), Pickup violett mit offener Ladefläche und Countdown-Ring. Typen unterscheiden
  sich immer auch in der Form.
- **Balancing-Bot** (1000 Schichten): Der perfekte Bot fängt jeden Verbrecher (Ø 3,1
  pro Schicht, 0 % Fluchten), der menschenähnliche Ø 3,0 bei 1 % Fluchten. Blindes
  Tippen lässt 15 % entkommen.

**Playtest-Fragen zu M3:** Ist der Countdown von 15 s zu streng oder zu locker? Fühlt
sich die Einsatzfahrt (halbe Combo) fair an? Stört das Warten mit dem Polizeiauto
an der Spitze den Einfädel-Rhythmus zu sehr?

---

## M4 · Geldtransporter ✅

**Ziel:** Risiko mit Belohnung, im Konflikt mit der Polizei-Mechanik.

- Der Transporter taucht **zufällig** über eine KI-Zufahrt auf, klar markiert.
- **Die Sperrzonen direkt vor und hinter ihm** sind als Bögen auf dem Ring
  sichtbar. Landet dort ein Polizeiauto, wird der Transporter festgenommen und es
  gibt kein Geld.
- Normale Autos in diesen Lücken schirmen den Transporter ab und geben einen Bonus.
- Seine **Ausfahrt ist vorher markiert** (Fluchtweg-Anzeige aus IDEA.md).
  Verlässt er den Kreisverkehr sicher, gibt es **Geld**.
- **Geld wird als Währung eingeführt** und gespeichert.

**Umgesetzt** (`Transporters.swift`, `Queue.swift`, `Drivers.swift`, Startwerte in `Config.swift`):

| Regel | Startwert |
| --- | --- |
| Erster Transporter / Pause danach | nach 8–14 s / 15–25 s, 2 s Warnung ("SECURED") |
| Countdown ab der Einfahrt | 10 s; der Transporter kreist bis dahin und nimmt dann seine markierte Ausfahrt. Ist das letzte Auto vorher drin, wird er sofort ausgezahlt |
| Sicher raus | 2.500 Geld (× Rush Hour); jedes normale Auto, das in eine Sperrzone einfädelt, +500 |
| Polizei trifft den Transporter | beschlagnahmt: kein Geld, keine Strafe |
| Geld | wird nach jeder Schicht im Spielstand gutgeschrieben, auch nach Game Over; Startbildschirm zeigt den Kontostand |

**Neue Spielregeln (M4+):**

- **Kein Tap-Cooldown:** Das nächste Auto folgt direkt und steht nach ≈ 0,3 s an der
  Haltelinie; ein früher Tap wird gehalten (FOUNDATION.md 2.2). Eigene Autos bewerten
  sich nicht gegenseitig, schnelles Tippen gibt also keine geschenkten Tight Fits.
- **Blaulicht:** Polizeiautos blinken, sobald sie losfahren.
- **Verfolgung:** Ein Polizeiauto direkt hinter dem Verbrecher fährt bis zu ×1,4 so
  schnell, bleibt im Kreis und rammt ihn (Takedown). Ist ein anderes Auto dazwischen,
  fährt es normal mit.
- **Normales Auto crasht = sofort Game Over** (`maxStrikes = 1`).
- **Polizeiauto crasht = Schicht läuft weiter:** 3 Polizei-Crashes pro Schicht
  (`maxPoliceCrashes`), der 4. beendet sie. Kostet Punkte und Combo.
- **Schicht ohne Uhr:** 15 Autos, die alle in den Verkehr müssen; danach ist die
  Schicht geschafft (FOUNDATION.md 2.5). Dichte und Tempo steigen mit der Zeit, die
  letzten 4 Autos sind Rush Hour. Ein Verbrecher, der dann noch unterwegs ist, muss
  trotzdem gefasst werden.

**Balancing-Bot** (1000 Schichten, siehe TESTING.md): Der perfekte Bot ist in ≈ 6 s
durch. Der menschenähnliche braucht ≈ 19 s und schafft 92 % der Schichten; blindes
Tippen scheitert zu 98 %. Der Bot schätzt Lücken perfekt ein und wartet ohne Ungeduld.
Wie schwer es sich für einen Menschen anfühlt, zeigt nur der Playtest.

**Playtest-Fragen zu M4:** Sind 15 Autos und ≈ 20 s die richtige Länge? Ist es schwer
genug (Stellschrauben: `shiftCars`, `densityStart`/`densityEnd`, `aiSafeGap`, Tempo)?
Ist sofortiges Game Over fair? Ist die Verfolgung im Ring als zweite Takedown-Chance
lesbar?

**Beantwortet aus IDEA.md:** wie die Position des Transporters fair erkennbar ist.

---

## M5 · Wirtschaft & Fortschritt

**Ziel:** ein Grund, immer wieder zu spielen. Geld verdienen und sinnvoll ausgeben.

- **Geldquellen:** Schichtabschluss (abhängig vom Level) und gerettete Transporter.
- **Vor jeder Schicht:** "Normal Duty" oder "High Alert" (mehr Risiko, dreifacher Ertrag) ✅.
- **Upgrade-Shop:** die Wahrscheinlichkeits-Upgrades aus IDEA.md (Transporter-Chance,
  weniger Verbrecher, längeres Zeitlimit, mehr Polizei), mit steigenden Kosten.
- **Ausbau-Stufen des Kreisverkehrs** als vereinfachte Map-Erweiterung: größerer
  Ring, mehr Zufahrten, mehr Bots ✅ (als Ziehen und Ablegen im Street Builder). Der freie
  Straßennetz-Editor kommt nach v1.0.
- **Spielstand versioniert**, damit spätere Updates alte Spielstände lesen können.
  Das ist wichtig, sobald echte Spieler das Spiel haben.
- **Kein Startmenü:** Ein Tap auf dem Game-Tab startet die Schicht. Neue Seiten
  (Upgrades, Shop, Street Builder) samt Inhalten in `ScreenFlow`, im Testfenster als
  Textseiten mit Zifferntasten.
- **Hauptnavigation als native iOS-Tab-Bar** (SwiftUI `TabView`): Street Builder,
  Game, Shop, Upgrades. In `ScreenFlow` als Tabs modelliert, gebaut in M7.

**Beantwortet aus IDEA.md:** erste Kosten und Skalierung der Upgrades. Der
Balancing-Bot rechnet vor, wie schnell man sich was leisten kann.

### Schritt 1 · Level ✅

Jede geschaffte Schicht ist ein Level höher, eine verlorene wird **auf demselben Level
wiederholt**, mit neu ausgeloster Autozahl. Das Level steht im Spielstand.
(`Levels.swift`, Werte in `Config.swift`, alle auch in `tuning.json`)

| Was | Level 1 | Level 5 (`hardLevel`) | darüber |
| --- | --- | --- | --- |
| Autos pro Schicht | 8–12 | 12–16 | +1,1 pro Level, je Versuch ±2, höchstens 30 |
| Verkehr (Dichte, Tempo, KI-Lücken) | entschärft (`easy…`-Werte) | Werte aus `Config.swift` | Tempo +1,5 % pro Level, bis +30 % |
| Verbrecher-Countdown | 16 s | 12 s | −0,25 s pro Level, bis 8 s |
| Anteil Polizeiautos | 30 % | 20 % | 20 % |

Level 1 ist bewusst machbar, damit man reinkommt; ab Level 5 wird es richtig schwer.
Startbildschirm ("Start level 3"), Mittelinsel ("LEVEL 3") und Ergebnis ("LEVEL 3
COMPLETE", "Tap for level 4" bzw. "Tap to try level 3 again") zeigen das Level. Im
Testfenster springt `--level 8` direkt zu einem Level.

**Schwierigkeitskurve** (`swift run -c release Sim --curve`, 500 Schichten pro Level):

| Level | Autos | Mensch-Bot geschafft | Dauer | Perfekter Bot | Dauer |
| --- | --- | --- | --- | --- | --- |
| 1 | 8–12 | 95 % | 8 s | 100 % | 4 s |
| 3 | 10–14 | 89 % | 12 s | 100 % | 5 s |
| 5 | 12–16 | 84 % | 15 s | 100 % | 6 s |
| 10 | 18–22 | 90 % | 21 s | 100 % | 15 s |
| 15 | 23–27 | 71 % | 25 s | 99 % | 18 s |
| 20 | 28–30 | 65 % | 33 s | 99 % | 19 s |
| 25+ | 28–30 | 29 % | 31 s | 100 % | 19 s |

Ab Level 25 flacht die Kurve ab: Autozahl und Tempo sind an ihrer Grenze (ohne Upgrades, mit gekauften Upgrades siehe Schritt 2). Der
Mensch-Bot schätzt Lücken perfekt ein; wie schwer es sich wirklich anfühlt, zeigt der
Playtest. Der perfekte Bot crasht auf keinem Level (Test `perfectBotNeverCrashesAtAnyLevel`).

**Gefunden beim Messen:** Bei hohem Tempo staut sich der Ring nach einem Takedown lange
(Fahrer brauchen aus dem Stand ≈ 8 s zurück aufs Tempo, der Pickup bremst für nichts).
Der Mensch-Bot hat bis dahin gewartet, bis der ganze Ring wieder fließt, und so
Verbrecher entkommen lassen. Jetzt spielt er wie ein Mensch weiter, nur mit doppelt so
großen Lücken.

**Playtest-Fragen:** Ist Level 1 zu leicht, Level 5 zu schwer? Soll die Kurve über
Level 20 hinaus weiter steigen (z. B. zwei Verbrecher gleichzeitig, Eskalation aus
IDEA.md)? Ist ein verlorenes Level zu wiederholen motivierend oder frustrierend?

### Schritt 2 · Geld & Upgrades ✅ · Tab-Navigation ✅

**Geld:** jede geschaffte Schicht zahlt 200 + 60 × Level (Level 10: 800), dazu
Transporter (800, in der Rush Hour doppelt) und 100 pro Auto, das einen Transporter
abschirmt. Die alten Beträge (2.500 und 500) stammten aus den 2-Minuten-Schichten und
hätten alles in 20 Schichten bezahlt. Geld aus verlorenen Schichten bleibt.

**Upgrades** (Upgrades-Tab, `Upgrades.swift`; Preise ab 2.000, jede Stufe doppelt so
teuer, die starken mit Aufschlag):

| Upgrade | Wirkung pro Stufe | Stufen | Erste Stufe |
| --- | --- | --- | --- |
| More Patrols | +3 % Polizeiautos in der Schlange | 10 | 2.000 |
| Longer Pursuit | +1 s Verbrecher-Countdown | 8 | 2.400 |
| Quiet Streets | 10 % der Schichten ohne Verbrecher | 5 | 3.000 |
| Interceptor | Polizei jagt im Ring 10 % schneller | 5 | 3.000 |
| Dispatch Radio | Einsatzfahrt behält 10 % mehr Combo | 5 | 2.400 |
| Backup | ein Polizei-Crash mehr pro Schicht | 3 | 6.000 |
| Cash Route | Transporter kommen 1 s früher und öfter | 8 | 2.000 |
| Overtime | +20 % Lohn pro Schicht | 10 | 2.000 |

Die langen Upgrades (bis 10 Stufen) haben kleine Schritte, damit es immer etwas zu sparen
gibt; jede Stufe kostet das 1,5-fache der vorigen. Insgesamt sind es 54 Stufen.

**"Quiet Streets" hieß erst "Verbrecher kommen später"** – gemessen war das ein
Nachteil: Später heißt mitten in der Rush Hour, wo der Verkehr am dichtesten und
schnellsten ist. Jetzt heißt es "weniger Schichten mit Verbrechern".

**Karriere-Simulation** (`swift run -c release Sim --career 120`, 40 Spieler, der
Mensch-Bot kauft nach jeder Schicht die billigste Stufe, die er sich leisten kann):

| Schichten | Level | geschafft (letzte 10) | Verdienst/Schicht | Upgrade-Stufen |
| --- | --- | --- | --- | --- |
| 10 | 10 | 87 % | ≈ 1.000 | 4/27 |
| 30 | 26 | 76 % | ≈ 2.600 | 15/27 |
| 50 | 38 | 59 % | ≈ 3.400 | 21/27 |
| 80 | 50 | 42 % | ≈ 3.500 | 27/27 |
| 120 | 68 | 41 % | ≈ 4.600 | 27/27 |

Damit das späte Spiel trotz aller Upgrades schwer bleibt, steigt das Tempo jetzt bis
+30 % (Level 25) statt +20 %. +45 % war eine Wand (12 % geschafft ab Level 28). Nach
etwa 80 Schichten ist alles gekauft; danach sammelt sich Geld an. Das fangen später
Shop und Street Builder auf.

**Navigation:** kein Startmenü mehr. Der Game-Tab zeigt den Kreisverkehr mit "LEVEL 4 ·
11–15 cars · Tap to start"; ein Tap startet. Die Tab-Bar (Street Builder, Game, Shop,
Upgrades) ist zwischen den Schichten sichtbar und während einer Schicht ausgeblendet.
Einstellungen liegen über dem Game-Tab (App: Zahnrad, Testfenster: Esc). Shop und
Street Builder sind noch Platzhalter.

### Schritt 3 · Fließender Übergang, Upgrade-Karten, Bugfixes ✅

**Fließender Übergang zwischen Schichten** (FOUNDATION.md 2.5): Nach dem Ergebnis läuft der
Verkehr weiter, das Level steigt, das Tempo gleitet zum neuen Start-Tempo und die Autos der
nächsten Schicht rollen von hinten in die Warteschlange, noch bevor man tippt. Der erste Tap
schickt das vorderste Auto los und startet damit die Schicht; Verbrecher, Transporter und
Verkehrsanstieg zählen erst ab da.

**Upgrade-Karten:** je Karte ein gezeichnetes Bild (Streifenwagen, Stoppuhr, Schild,
Geldrolle …), Name, Stufenpunkte und Preis. Ein Tap öffnet unten die Details mit Wirkung
und Gesamtwirkung, ein Doppel-Tap kauft. Beim Kauf federt die Karte, ein Ring läuft nach
außen, die neue Stufe ploppt auf und der Kontostand zählt herunter; fehlt Geld, wackelt die
Karte kurz und der Preis leuchtet rot. Mit Reduce Motion bleiben nur Farbe und Deckkraft.

**Bugfixes aus dem Playtest:**

| Gemeldet | Ursache | Behoben |
| --- | --- | --- |
| Transporter hinterlässt gelbe Linien | Der Fluchtweg-Pfeil stand dauerhaft an seiner Ausfahrt, obwohl er dort erst nach dem Countdown rausfährt | Pfeil entfernt; er kreist ohnehin bis zum Countdown-Ende |
| Zerstörter Transporter fuhr weiter | Er galt als "gepanzert" | Jeder Crash macht ihn zum Wrack, das Geld ist weg; dafür bremst er wie andere Fahrer |
| Autos erscheinen sichtbar am Bildrand | Sie wurden direkt an der Haltelinie erzeugt | Sie erscheinen außerhalb des Bildes und fahren heran |
| Gelber Transporter-Effekt an einem normalen Auto | Die KI mied nur die Zufahrt des Verbrechers, nicht die des Transporters | Warnungen nur an freien Zufahrten, KI meidet beide |

### Schritt 4 · Gefahrenstufe ✅

Vor jeder Schicht wählt man auf dem Game-Tab (Testfenster: **H**, App später ein
Segmented Control) zwischen **Normal Duty** und **High Alert**. Die Wahl steht im
Spielstand und gilt, bis man sie ändert.

| High Alert | Wert |
| --- | --- |
| Autos pro Schicht | ×1,15 |
| Verbrecher-Countdown | ×0,8, aber nie unter `minCriminalTime` |
| Verbrecher | in jeder Schicht (`criminalChance` = 1) |
| Geld (Schichtlohn, Transporter, Abschirm-Bonus) | ×3 |

**Was nicht geht, und warum:** Tempo ×1,1 oder +2 Autos im Ring klingen naheliegend,
machen aber hohe Level unspielbar statt riskanter, weil beides sich mit der Level-Kurve
multipliziert (Mensch-Bot auf Level 35: 82 % → 17 %). Auch kürzere Abstände zwischen
Verbrechern kippen das Spiel (Level 35: 9 %, fast nur noch Fluchten). Die jetzige
Mischung kostet auf Level 10 rund 2 Prozentpunkte und auf Level 35 rund 28 – früh ein
guter Deal, spät eine echte Wette.

| Gemessen (Mensch-Bot, 400 Schichten) | Normal | High Alert |
| --- | --- | --- |
| Level 10 geschafft | 92 % | 90 % |
| Level 20 geschafft | 94 % | 92 % |
| Level 35 geschafft | 82 % | 54 % |

In der Karriere (`Sim --career 120 --duty high`) kauft man damit früh doppelt so schnell
Upgrades (35 statt 18 Stufen nach 30 Schichten), bleibt aber im späten Spiel eher stecken.

**Playtest-Fragen:** Ist ×3 zu großzügig, solange man die Schichten locker schafft? Soll
High Alert zusätzlich mehr Punkte geben, nicht nur mehr Geld?

### Schritt 5 · Street Builder ✅

Der Kreisverkehr wird im Street-Builder-Tab ausgebaut, per Ziehen und Ablegen:

- Unten die **Palette** mit dem Teil "New arm" und seinem Preis. Ein Tap darauf zeigt wie
  bei den Upgrades, was es bringt.
- **Ziehen:** Sobald man zieht, leuchten die freien Steckplätze auf, das Teil rastet am
  nächsten passenden ein. Zu dicht an einer bestehenden Zufahrt ist kein Ziel.
- **Doppel-Tap auf das abgelegte Teil:** bauen. Die Zufahrt wächst aus dem Ring heraus, der
  Ring pulst kurz, der Kontostand zählt herunter.
- **Ein Tap darauf:** Das Teil blendet aus und ist weg. Kommt in der Zeit ein zweiter Tap,
  wird stattdessen gebaut.
- Fehlt Geld, wackelt das Teil und der Preis wird rot.

**Technisch:** Zufahrten sitzen jetzt in Steckplätzen statt gleichmäßig verteilt
(`Arm` mit Slot, `RoundaboutLayout` aus `Config.armSlots`, FOUNDATION.md 2.1). Ein Ausbau
ändert die Geometrie, deshalb beginnt die wartende Schicht danach auf dem neuen
Kreisverkehr neu statt den Verkehr zu übernehmen.

| Zufahrten | Preis | Wirkung |
| --- | --- | --- |
| 5. | 25.000 | je Zufahrt: Ring +18 breiter, +25 % Verkehr, Transporter 15 % öfter, +30 % Lohn |
| 6. | 50.000 | |
| 7. | 100.000 | |
| 8. | 200.000 | (Vollausbau, 16 Plätze bei Mindestabstand 2) |

Zusammen 375.000 – genau der Betrag, der sich im späten Spiel sonst nur anhäuft.

**Gemessen** (Mensch-Bot, Level 20, 300 Schichten): 4 Zufahrten 93 % geschafft, 6 Zufahrten
92 %, 8 Zufahrten 73 %. Der Ausbau bringt also mehr Geld, macht die Schichten länger und
erst im Vollausbau deutlich schwerer.

**Playtest-Fragen:** Fühlt sich der größere Ring besser oder unübersichtlicher an? Sind die
Preise richtig? Soll man eine gebaute Zufahrt wieder abreißen können?

**Weitere Upgrade-Ideen** (noch nicht gebaut):

- **Insurance:** Der erste Crash eines normalen Autos pro Schicht beendet sie nicht.
  Sehr stark, weil es die Kernregel aufweicht; nur eine Stufe, sehr teuer.
- **Precision:** Tight-Fit-Fenster +0,01 s pro Stufe (mehr Punkte, nicht leichter).
- **Hot Streak:** Combo-Stufen eine Einfädelung früher.
- **Early Warning / Scanner:** "WANTED" kommt 1 s früher, mehr Zeit für ein Polizeiauto.
- **Carpool:** ein Auto weniger pro Schicht.
- **Road Crew:** Wracks räumen schneller (`crashDuration` kürzer), weniger Stau nach Crashes.
- **Rush Bonus:** Rush Hour zählt ×2,25 statt ×2.
- **Armored Escort:** Transporter zahlen +20 %.
- **Sirens:** KI-Autos warten an ihrer Haltelinie, solange ein Polizeiauto einfädelt.
- **Lucky Day:** kleine Chance, dass eine Schicht doppelt zahlt.

**Playtest-Fragen:** Fühlen sich die Upgrades spürbar an? Sind die Preise richtig (erste
Stufe nach 2–3 Schichten)? Ist ein kaufbares "Insurance" gut oder nimmt es dem Spiel die
Härte?

---

## M6 · Look & Feel

**Ziel:** Das Spiel sieht aus und klingt so, wie IDEA.md es beschreibt: ruhig,
hochwertig, präzise. Fast alles davon entsteht in `GamePresentation` und ist im
Testfenster zu sehen und zu hören.

- **Design-Pass:** finale Farb-Tokens (Dark Theme), Fahrzeug- und Straßendesign
  als flache Vektorformen, HUD-Layout.
- **Effekte nach den Motion-Regeln** (FOUNDATION.md, Abschnitt 3): Swoosh bei
  Tight Fit, Glow und Spring bei neuen Combo-Stufen, Slow-Mo beim Takedown,
  Reduce Motion. Feinschliff der Crash-Effekte, Wracks und Fahrzeugteile aus M2.
- **Fahrzeugdesign** auf Basis des Teile-Modells aus M2 (`CarArt`): finale Formen
  für Auto, Polizei, Pickup, Transporter, jeweils mit abreißbaren Teilen.
- **Sound:** alle Soundeffekte und eine Basis-Musik, schon als getrennte Stems für
  die adaptive Musik aus IDEA.md.
- **Haptik-Muster** für jedes Ereignis als `.ahap`-Dateien schreiben (das ist
  JSON). Spüren lassen sie sich erst in M7.
- **Screen-Entwürfe** für die SwiftUI-Menüs festlegen (Layout, Inhalte, Texte),
  damit M7 nur noch umsetzt. **Möglichst native Apple-Elemente:** Tab-Bar,
  NavigationStack, Listen und Formulare für Einstellungen, Sheets, SF Symbols.
- **App-Icon** als Entwurf.

**Fertig, wenn:** man ohne Erklärung sieht und hört, was gut und was schlecht war.

### Offen – als Nächstes dran (Stand 22.09.2026)

Aus dem Playtest und den Ansagen von Leo, in dieser Reihenfolge:

1. **Bug – Geldtransporter über das Schichtende hinaus:** Fährt am Ende einer
   Schicht noch ein Transporter ein, ist er in der Folgeschicht zwar da, zählt
   dort aber als ganz normales Auto (keine Sperrzonen, kein Geld). `nextShift`
   nimmt die Fahrzeuge mit, aber nicht den Zustand von `TransporterState` /
   `CriminalState`. Beides muss mitwandern (Frist auf die neue Schichtzeit
   umrechnen) oder das Fahrzeug wird beim Übergang sauber zum normalen Auto.
2. **Schwierigkeit:** Level 14 fühlt sich noch einen Tick zu leicht an
   (Playtest Leo). Kurve ab Level 10 nachziehen und mit
   `swift run -c release Sim --curve --shifts 300` gegenmessen.
3. **Warnung im Innenteil:** Die Ankündigung von Verbrecher und Geldtransporter
   soll **nicht mehr an der Zufahrt** stehen, sondern als **Ring im Innenteil
   des Kreisverkehrs** (auf der Insel) angezeigt werden — der Blick bleibt in
   der Mitte. Betrifft `HUD.addChase` / `HUD.addTransporter`.
4. **Blaulicht wirft Licht auf den Boden:** Das Polizei-Blaulicht soll die
   Fahrbahn mitbeleuchten (weicher blauer/roter Schein unter und neben dem
   Auto, im Takt des Blinkens).
5. **Trucks fertig bauen:** Der LKW ist als Fahrzeugtyp da (länger, schwerer,
   eigenes Aussehen) — er ist die Grundlage der Mautstelle und muss im Spiel
   sauber aussehen und sich sauber anfühlen.

**Gerade angefangen (M5-Nachzügler, Street Builder):** Ringmodule
`GameCore/Modules.swift` — **Mautstelle** (LKW zahlen, Abschnitt staut) und
**Blitzer** (Strafe oberhalb des Tempolimits, Autos bremsen kurz) auf einer
**festen Zahl von Modulplätzen** am Ring; ist alles belegt, wird getauscht
(`Career.build(_:inSlot:config:)`). Fertig: Kern, Zeichnen im Spiel, Laufbahn.
Offen: Test `ModuleTests` stürzt noch ab (untersuchen), Palette und Modulplätze
im Street Builder, Platzhalter-Sound `toll` im SoundMaker, Doku in
FOUNDATION.md 2.9.

---

# Phase 2 · Mac

## M7 · iPhone-App

**Ziel:** Das fertige Spiel aus Phase 1 läuft mit Touch und Haptik auf dem iPhone.

- Projektordner auf den Mac umziehen, Xcode 27 installieren, Time Machine einrichten.
- **Xcode-Projekt** (iOS-App, Mindestversion iOS 26, Hochformat) mit dem Paket `Game/`.
- **Adapter:** SpriteKit zeichnet die Render-Liste, Touch mit Zeitstempel als
  Eingabe, AVAudioEngine spielt die Sounds, Core Haptics die `.ahap`-Muster.
  120 Hz auf ProMotion-Geräten.
- **SwiftUI-Menüs** nach den Entwürfen aus M6, als Ansichten von `ScreenFlow`,
  mit nativen Elementen (Tab-Bar für Street Builder, Game, Shop, Upgrades).
- **Timing-Feintuning mit Touch** auf dem echten Gerät.
- **Geräte-Tests:** alle Bildschirmgrößen im Simulator (SE bis Pro Max); 10
  Schichten am Stück auf dem schwächsten Gerät (iPhone 11 oder SE 2. Gen., A13),
  ohne Ruckler und ohne Hitze.
- **Randfälle:** Anruf während einer Schicht, App-Wechsel, Stummschalter, Stromsparmodus.
- **App-Icon** final (Icon Composer), Startbildschirm, VoiceOver und Dynamic Type in den Menüs.

**Fertig, wenn:** das komplette Spiel auf deinem iPhone läuft und sich ohne
Einschränkung so gut anfühlt wie geplant.

---

# Phase 3 · Veröffentlichung

## M8 · v1.0 & Launch

**Ziel:** Das Spiel ist weltweit im App Store, deine Website ist seine Startseite.
Warum das nur über den App Store geht, steht in [PLAN.md, Phase 3](PLAN.md#phase-3--veröffentlichung).

- **Apple Developer Program** beitreten (99 $/Jahr).
- **Deine Website:** Landing Page zum Spiel, **Privacy Policy** und
  **Support-Seite**. Beide URLs verlangt Apple.
- **TestFlight-Beta:** öffentlicher Einladungslink auf deiner Website, bis zu
  10.000 Tester. Feedback einarbeiten.
- **App-Store-Eintrag** (auf Englisch): Name, Beschreibung, Screenshots,
  Altersfreigabe, Datenschutz-Angaben (ohne Tracking und ohne Konto: "Data Not
  Collected"), EU-Händlerstatus nach DSA.
- **Review** durch Apple, dann **Launch**. Auf der Website kommt der App-Store-Link dazu.

**→ v1.0: das Spiel weltweit im App Store.**

---

## Nach v1.0 (grob priorisiert)

Updates laufen über den App Store. Neue Spielsysteme entstehen weiter zuerst unter
Windows im Paket `Game/`, der Mac wird nur für den Feinschliff und den Upload gebraucht.

| Version | Inhalt | Hinweis |
| --- | --- | --- |
| **v1.1 Straßennetz & Zoll** | Straßennetz-Editor bzw. Stadtübersicht, Zollstellen, Trucks, Stau mit Fahrzeugfolgemodell, Verkehrsleitsystem | Designfrage vorher klären: Spielt eine Schicht auf *einem* Kreisverkehr des Netzes (Vorschlag) oder auf dem ganzen Netz? |
| **v1.2 Motivation & Sammeln** | Daily Login mit Abholen der Zolleinnahmen, Challenges, Perfect-Run-Bonus, Lootboxen und Skins | Lootboxen zunächst nur mit Ingame-Geld; Odds und Pity-System wie in IDEA.md |
| **v1.3 Abwechslung** | adaptive Musik, Wetter und Tag/Nacht, Krankenwagen/VIP, Baustellen, zweispurige Kreisverkehre, Boss-Event, Prestige | – |
| **v1.4 Apple-Ökosystem** | Game Center (Bestenlisten, Erfolge), Widget, Live Activity / Dynamic Island, Action Button, Siri Shortcuts, Apple Watch | mit dem Developer-Account aus M8 möglich; braucht mehr Mac-Arbeit als andere Updates |
| **Später, falls gewünscht** | Premium-Boxen, Season Pass, Multiplayer | Echtgeld braucht In-App-Käufe (StoreKit, Apple erhält eine Provision) und eine rechtliche Prüfung der Lootboxen (App Store 3.1.1, Altersfreigaben, Länder wie Belgien) |
