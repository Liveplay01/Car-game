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
| M5 | Wirtschaft & Fortschritt | L | Geld verdienen und ausgeben, Gefahrenstufe |
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

- **Geldquellen:** Schichtabschluss (abhängig von den Punkten) und gerettete Transporter.
- **Vor jeder Schicht:** "Normal Duty" oder "High Alert" (mehr Risiko, dreifacher Ertrag).
- **Upgrade-Shop:** die Wahrscheinlichkeits-Upgrades aus IDEA.md (Transporter-Chance,
  weniger Verbrecher, längeres Zeitlimit, mehr Polizei), mit steigenden Kosten.
- **Ausbau-Stufen des Kreisverkehrs** als vereinfachte Map-Erweiterung: größerer
  Ring, mehr Zufahrten, mehr Bots. Der freie Straßennetz-Editor kommt nach v1.0.
- **Spielstand versioniert**, damit spätere Updates alte Spielstände lesen können.
  Das ist wichtig, sobald echte Spieler das Spiel haben.
- **Neue Screens** (Vor der Schicht, Shop) samt Inhalten in `ScreenFlow`, im
  Testfenster als Textmenüs mit Zifferntasten.
- **Hauptnavigation als native iOS-Tab-Bar** (SwiftUI `TabView`): Street Builder,
  Game, Shop, Upgrades. In `ScreenFlow` als Tabs modelliert, gebaut in M7.

**Beantwortet aus IDEA.md:** erste Kosten und Skalierung der Upgrades. Der
Balancing-Bot rechnet vor, wie schnell man sich was leisten kann.

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

---

# Phase 2 · Mac

## M7 · iPhone-App

**Ziel:** Das fertige Spiel aus Phase 1 läuft mit Touch und Haptik auf dem iPhone.

- Projektordner auf den Mac umziehen, Xcode 27 installieren, Time Machine einrichten.
- **Xcode-Projekt** (iOS-App, Mindestversion iOS 27, Hochformat) mit dem Paket `Game/`.
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
