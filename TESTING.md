# Testing – so testest du das Spiel

Stand: 22.09.2026 · Gehört zu [FOUNDATION.md](FOUNDATION.md) und [ROADMAP.md](ROADMAP.md)

> **Getestet wird unter Windows.** Die Befehle unten gibt es, sobald M0 gebaut
> ist. Die Einrichtung (Abschnitt 0) kannst du schon jetzt machen.

## Überblick

| Phase | Wo | Was du testest |
| --- | --- | --- |
| **1 · Windows** | **Testfenster** | das Spiel selbst: Timing, Fairness, Combo, Schicht, alle Features, Look & Feel, Sounds |
| **1 · Windows** | **Automatische Tests** | Spiellogik, Darstellungslogik, Balancing, in Sekunden und ohne Fenster |
| 2 · Mac | Simulator und dein iPhone | Touch, Haptik, SwiftUI-Menüs, Performance, Bildschirmgrößen |
| 3 · Launch | TestFlight | Beta-Tester weltweit über einen Link auf deiner Website |

---

## 0. Einmalig einrichten (Windows)

Dauert einmalig etwas, denn die Visual-Studio-Build-Tools sind ein großer Download.

1. **Entwicklermodus einschalten:** Einstellungen → System → Für Entwickler →
   Entwicklermodus.
2. **Build-Tools installieren.** Swift braucht den C++-Compiler und das Windows-SDK
   von Visual Studio. In PowerShell:
   ```powershell
   winget install --id Microsoft.VisualStudio.2022.Community --exact --force --custom "--add Microsoft.VisualStudio.Component.Windows11SDK.22621 --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.VC.Tools.ARM64" --source winget
   ```
3. **Swift installieren:**
   ```powershell
   winget install --id Swift.Toolchain -e --source winget
   ```
4. **VS Code** mit der Erweiterung **"Swift"** (Herausgeber: swiftlang) installieren.
5. **Neues Terminal öffnen und prüfen:**
   ```powershell
   swift --version
   ```
   Hier sollte Swift 6.4 oder neuer stehen.

Die Befehle stammen aus der offiziellen Anleitung auf
[swift.org/install/windows](https://www.swift.org/install/windows/). Falls sich dort
etwas geändert hat, gilt die Anleitung auf swift.org.

---

## 1. Spielen im Testfenster

```powershell
cd "D:\Github Projekte\Car game\TestWindow"
swift run -c release TestWindow
```

- **Der erste Start dauert ein paar Minuten**, weil raylib einmal mitkompiliert
  wird. Danach geht es in Sekunden.
- **`-c release`** baut die schnelle Version. Für Playtests immer so starten,
  Debug-Builds laufen spürbar langsamer.
- Alternativ in VS Code: **Run and Debug → TestWindow**, mit Debugger und Haltepunkten.

**Steuerung**

| Taste | Wirkung |
| --- | --- |
| **Leertaste** oder **Linksklick** | Tap: das vorderste Auto losschicken. Nach "GAME OVER" / "SHIFT COMPLETE": nächste Schicht |
| **Enter** | Hauptaktion des Menüs: Schicht starten, Weiter, Zurück |
| **Esc** | Pause bzw. weiter; im Ergebnis zurück zum Startmenü |
| **1–9** | Menüpunkt wählen (die Nummern stehen im Menü) |
| **R** | Schicht neu starten (neuer Seed, außer mit `--seed`) |
| **F1** | Debug-Overlay: Hitboxen (Kapseln, auch Wracks), gemessene Abstände, FPS, Seed |
| **F2** | Zeitlupe umschalten: 1× → 0,5× → 0,25× |
| **T** | Tuning-Werte aus `tuning.json` neu laden |
| **E** oder **Rechtsklick** | Einsatzfahrt: das vorderste Auto wird zum Polizeiauto, die Combo halbiert sich |

Das Fenster startet im Startmenü, dahinter läuft der Verkehr. Verliert das Fenster
den Fokus, pausiert die Schicht (wie die App im Hintergrund). Der Seed jeder Schicht
steht in der Konsole und auf dem Ergebnis-Banner. Highscore und Einstellungen liegen
in `TestWindow/savegame.json`; zum Zurücksetzen die Datei löschen.

**Startparameter**

```powershell
swift run -c release TestWindow --seed 42                    # immer dieselbe Schicht
swift run -c release TestWindow --seed 42 --time-scale 0.5   # dazu halbe Geschwindigkeit
```

Mit `--seed` lässt sich jede Situation exakt wiederholen, etwa um einen Crash
nachzustellen, der sich unfair angefühlt hat.

Werkzeug-Optionen (für Demos und Screenshots):

```powershell
swift run -c release TestWindow --play                           # ohne Startmenü direkt in die Schicht
swift run -c release TestWindow --debug                          # mit Debug-Overlay starten
swift run -c release TestWindow --autotap 0.9                    # tippt alle 0,9 s automatisch (startet direkt)
swift run -c release TestWindow --screenshot bild.png --at 4     # Screenshot nach 4 s, dann Ende
swift run -c release TestWindow --autotap 0.3 --screenshot crash.png --at-crash 0.5
                                                                 # Screenshot 0,5 s nach dem ersten Crash
```

**Falls `swift` nicht gefunden wird oder „could not find CLI tool `link`“ meldet:**
Das Terminal ist älter als die Swift-Installation. VS Code bzw. das Terminal
einmal komplett neu starten, damit `Path` und `SDKROOT` geladen werden.

---

## 2. Werte live tunen

In `TestWindow/tuning.json` stehen die wichtigsten Spielwerte, zum Beispiel:

```json
{
  "tightFitSeconds": 0.12,
  "mergeDuration": 0.5,
  "ringSpeed": 110,
  "maxStrikes": 1,
  "shiftCars": 15
}
```

1. Datei in VS Code ändern und speichern.
2. Im Testfenster **T** drücken. Die neuen Werte gelten sofort, ohne Neustart. Läuft
   gerade eine Schicht, beginnt sie **mit demselben Seed** neu, so trifft man mit den
   neuen Werten auf denselben Verkehr (Geometrie wie die Einfädelbahn hängt von
   Tempo und Einfädeldauer ab). Unten erscheint kurz, wie viele Werte von
   `Config.swift` abweichen; Tippfehler in Schlüsseln werden gemeldet.
3. Passen die Werte, werden sie fest in `Game/Sources/GameCore/Config.swift`
   übernommen.

Die Datei wird beim Start automatisch geladen. Fehlt sie, schreibt **T** eine neue
mit allen aktuellen Werten. Alle Schlüssel sind optional; was fehlt, kommt aus
`Config.swift`. Tunbar sind u. a. `tightFitSeconds`, `sloppyWindow`, `mergeDuration`,
`ringSpeed`, `maxStrikes`, `maxPoliceCrashes`, `queueAdvanceDuration`,
`policeChaseSpeedFactor`, `shiftCars`, `rushHourCars`, `rampSeconds`, Dichte- und
Tempokurve, Punkte, `comboThresholds` und `comboMultipliers`.

---

## 3. Automatische Tests

```powershell
cd "D:\Github Projekte\Car game\Game"
swift test
```

Das prüft alles, was man ohne Bildschirm prüfen kann:

- **Spielregeln:** Kollisionen und ihre Grenzfälle, Tight-Fit-Bewertung,
  Combo-Stufen, Strikes, Rush Hour, und ob gleicher Seed und gleiche Eingaben
  dasselbe Ergebnis liefern.
- **Darstellungslogik:** Kamera-Einpassung, Effekt-Timings und der Screen-Ablauf
  (z. B. dass nach dem Crash, der die Schicht beendet, der Ergebnis-Screen kommt).

In VS Code geht das auch über die Test-Ansicht (Kolben-Symbol).

**Balancing-Bot**

```powershell
swift run -c release Sim --shifts 1000 --seed 42
```

Drei Bots spielen je 1000 Schichten parallel auf allen Kernen (etwa 10 s; für
schnelle Vergleiche `--shifts 200`). Stand M4 (Schicht = 15 Autos, keine Uhr):

```
Bot       Score avg     p10  median     p90  Done   Time Crashes Aborted Escaped Busted Best combo Tight fits  Merges
Perfect       5,951   4,850   5,400   8,100  100%  6.0 s    0.00      0%      0%    0.3       18.5        4.6    14.7
Human         5,994   4,450   6,150   8,250   92% 19.2 s    0.07      7%      0%    0.9       13.2        2.4    13.6
Random          333       0       0     850    1% 14.9 s    0.98     98%      1%    0.0        3.2        0.7     2.7
```

*Done* = Anteil geschaffter Schichten, *Time* = wie lange eine geschaffte Schicht im
Median gedauert hat (Ziel: ≈ 20 s für einen guten Spieler).

*Aborted* = durch einen Crash beendet (normales Auto oder der 4. Polizei-Crash),
*Escaped* = ein Verbrecher ist entkommen, *Busted* =
Takedowns pro Schicht.

- **Perfect:** perfektes Timing, sieht die Autos so, wie ein Spieler sie sieht.
  **Er darf nie crashen.** Crasht er doch, meldet der Sim die Schicht mit Seed: Dort
  ist ein Crash passiert, den niemand hätte kommen sehen. Er jagt Verbrecher gezielt
  und ruft eine Einsatzfahrt, wenn kein Polizeiauto nah an der Spitze steht.
- **Human:** plant den Tap etwas voraus, verfehlt ihn um ~40 ms, wagt nur manchmal
  einen Tight Fit, zielt beim Takedown auf die Mitte des Trefferfensters und wartet,
  bis eine Unfallstelle an der Einfahrt geräumt ist.
- **Random:** tippt blind.

Optionen: `--bot perfect|human|random|all`, `--tuning ../TestWindow/tuning.json`
(rechnet mit den Werten aus der Tuning-Datei). Schicht i nutzt Seed `seed + i`,
jede Schicht lässt sich also im Testfenster nachspielen.

**Wofür:** Wenn du an Werten drehst, siehst du sofort, ob das Spiel leichter oder
schwerer wird, noch bevor du selbst spielst.

**Sounds:** Die Platzhalter-Sounds in `Assets/Sounds` erzeugt
`cd TestWindow; swift run SoundMaker` neu. Die finalen Sounds kommen in M6 unter
denselben Dateinamen.

---

## 4. Was das Testfenster nicht zeigen kann

| Kommt erst in Phase 2 mit dem iPhone | Warum |
| --- | --- |
| Touch-Gefühl | Klick und Leertaste sind nur ein Ersatz für den Finger |
| Haptik | Die Muster schreiben wir am PC, spüren lassen sie sich nur im iPhone |
| SwiftUI-Menüs, SF-Pro-Schrift | Die gibt es nur auf Apple-Geräten; das Testfenster zeigt Textseiten |
| Performance | Ein PC ist viel schneller als ein iPhone 11 |
| Bildschirmgrößen | vom iPhone SE bis zum Pro Max, erst im Simulator bzw. auf Geräten |

**Ob das Spiel Spaß macht und wie es aussieht, siehst du im Testfenster. Wie es
sich in der Hand anfühlt, erst auf dem iPhone.**

---

## Playtest-Routine (nach jedem Meilenstein)

Spiele **3 Schichten im Testfenster**, und beantworte danach:

- [ ] Fühlt sich jeder Crash fair an? Falls nicht: F1 drücken und nachsehen.
- [ ] Wirken Crash, Wracks und Folgeunfälle glaubwürdig, ohne die nächste Lücke zu verdecken?
- [ ] Erkenne ich sofort, was gut war (Tight Fit) und was schlecht?
- [ ] Ruckelt irgendetwas? F1 zeigt die FPS.
- [ ] Ist klar, was ich als Nächstes tun soll?
- [ ] **Will ich direkt noch eine Schicht spielen?** Das ist die wichtigste Frage.

Notiere Auffälligkeiten **mit Seed**. Er steht im Debug-Overlay und auf der
Ergebnisseite. Mit `--seed` lässt sich die Situation dann exakt nachstellen.

---

## Phase 2 und 3 · Mac, iPhone, TestFlight (später)

Kurzüberblick, damit du weißt, was kommt. Die ausführliche Anleitung ergänzen wir,
wenn der Mac da ist.

- **Einrichten:** Xcode 27 aus dem App Store; unter Xcode → Settings → Accounts
  die Apple-ID hinzufügen.
- **Simulator:** Projekt öffnen, iPhone-Modell wählen, **⌘R**. Mindestens auf
  iPhone SE (kleinster Bildschirm), deinem Modell und 17 Pro Max prüfen.
- **Auf dem iPhone:** per Kabel anschließen, unter Signing & Capabilities deine
  Apple-ID als Team wählen, **⌘R**. Auf dem iPhone einmal den Entwicklermodus
  einschalten (Einstellungen → Datenschutz & Sicherheit) und der App vertrauen
  (Einstellungen → Allgemein → VPN & Geräteverwaltung).
- **Mit kostenloser Apple-ID** läuft die App 7 Tage, danach einfach wieder aus
  Xcode starten. Mit dem Developer-Account aus M8 fällt diese Grenze weg.
- **Performance** nur auf dem echten iPhone mit Release-Build und Instruments
  messen. Maßstab ist das schwächste unterstützte Gerät (iPhone 11 / SE 2. Gen.).
- **TestFlight (M8):** Build aus Xcode hochladen, öffentlichen Einladungslink auf
  deiner Website teilen. Tester installieren die App über Apples TestFlight-App,
  bis zu 10.000 Personen.
- **Das Testfenster** läuft auch auf dem Mac weiter, praktisch zum schnellen Tunen.
