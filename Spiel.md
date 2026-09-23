# Spiel.md – Car Game: Spielmechanik, Funktionen & Status

---

## 1. Kernidee & Inspiration

**Inspiration:** Browserspiel *Car Circle* (Shoom Games) – One-Tap-Timing: Autos per Klick in rotierenden Kreisverkehr einfädeln, ohne zu kollidieren. Keine Lenkung, kein Gas, keine Bremse.

**Unsere Version:** Gleiche Grundmechanik, dazu **aktive Sondertypen** im Verkehr:
- **Verbrecher-Pickups** (müssen aktiv per Polizeiauto gerammt werden)
- **Geldtransporter** (sollen unbeschadet entkommen, aber **nicht** von Polizei berührt werden)
- **Normale Trucks** (für Zollstellen)

**Meta-Währung:** Geld → Straßennetz im Editor erweitern, Upgrades kaufen, Zollstellen bauen.

---

## 2. Rundenstruktur (Schicht-System)

- Kein Endlos-Loop, sondern **feste Schichten** (Arbeitstag ~2 Min / 15 Autos)
- **Rush Hour** in den letzten 4 Autos: Tempo +35 %, Dichte +2, Punkte ×2
- Dramaturgischer Bogen: ruhiger Einstieg → steigende Komplexität → Rush-Hour-Finale
- **Keine Uhr** – Schicht endet, wenn alle Autos eingefädelt sind
- Level-System: jede geschaffte Schicht = Level up, verlorene wird wiederholt

---

## 3. Game-Over-Regeln (Hard vs. Soft Fail)

| Ereignis | Konsequenz |
|---|---|
| **Verbrecher-Pickup entkommt** (Countdown abgelaufen) | **Hard Fail** – sofortiges Rundenende |
| **Normales Auto crasht** | **Hard Fail** (klassisch: `maxStrikes = 1`) |
| **Polizeiauto crasht** | Soft Fail: kostet Punkte & Combo, **3 erlaubt** (`maxPoliceCrashes = 3`), 4. = Hard Fail |
| **Folgeunfälle im Verkehr** | Kosten standardmäßig **keine** Strikes (umschaltbar) |

**Begründung:** Bei 2-Minuten-Schicht mit vielen parallelen Systemen (Combo, Verbrecher, Transporter, Zoll) wäre ein einzelner Patzer, der die ganze Schicht beendet, überproportional hart. Polizei-Crashes haben eigenes Budget, da sie für Takedowns riskiert werden müssen.

---

## 4. Combo / Streak / Tight-Fit-System

- **Combo-Zähler** steigt bei sauberen Einfädelungen
- **Multiplikatoren:**
  - 0–4: ×1
  - 5–9: ×1,5
  - 10–19: ×2
  - 20+: ×3
- **Tight Fit** (Abstand < 0,12 s): 200 Pkt × Multiplikator, +2 Combo, Swoosh-Effekt, scharfes Haptik-Klicken
- **Sauber**: 100 Pkt × Multiplikator, +1 Combo
- **Crash / unsauber**: Combo-Reset
- **Cut-off** (optional, Default aus): zu knapp hinter Hintermann → Combo-Reset, kein Strike

---

## 5. Verbrecher-Bots & Polizei-Mechanik

| Element | Details |
|---|---|
| **Fahrzeugtyp** | Pickup-Truck (violett, offene Ladefläche, Countdown-Ring) – sofort erkennbar |
| **Nur stoppbar mit** | Polizeiauto (blau, weißes Dach, Lichtbalken) |
| **Countdown** | 12 s ab Einfahrt (eine Runde ~6 s → ~2 Chancen) |
| **Entkommt er** | Schicht verloren (Hard Fail) |
| **Takedown** | 1.000 Pkt × Multiplikator × Rush Hour, 0,3 s Slow-Mo, flache Splitter in Polizeifarben, Combo bleibt |
| **Warnung** | 2 s vorher: „WANTED“-Banner, Sirene, pulsierender Keil auf Mittelinsel |
| **Einsatzfahrt (Panic-Button)** | Taste **E** / Rechtsklick: nächstes Auto wird Polizei, Combo halbiert (`×0,5`) |
| **Verfolgung im Ring** | Polizeiauto direkt hinter Pickup jagt mit ×1,4 Tempo, rammt ihn |
| **Masse** | Pickup = 2,5× Auto – normales Auto prallt ab, Pickup fährt verbeult weiter |

---

## 6. Geldtransporter-Mechanik

| Element | Details |
|---|---|
| **Spawn** | Zufällig an KI-Zufahrt, Warnung „SECURED“ (2 s) |
| **Ziel** | Unbeschadet Ausfahrt nehmen → **Geld** (800 × Rush Hour) |
| **Sperrzonen** | Bogen ±65° (130° gesamt) vor & hinter Transporter |
| **Polizei in Sperrzone** | Transporter wird **beschlagnahmt** → kein Geld, keine Strafe |
| **Normales Auto in Sperrzone** | **Abschirmen** → +100 Bonus pro Auto |
| **Transporter crasht** | Wrack, Geld weg („LOST“) |
| **Countdown** | 10 s, dann nimmt er markierte Ausfahrt |
| **Letzes Auto der Schicht drin** | Sofortige Auszahlung |

---

## 7. Zollstellen & Risiko-Mechaniken (Straßen-Editor)

- **Zollstellen** im Street Builder kaufbar & platzierbar
- **Jeder Truck** zahlt Gebühr (120) → **passive Einnahme**
- **Kehrseite:** Jede Zollstelle bremst Verkehr ab (Zone 150°, Tempo ×0,55)
  - Stau behindert **Polizei** → Verbrecher entkommen leichter
  - Truck-Spawn-Upgrade erhöht allgemeinen Verkehr → Combo schwieriger
- **Gefahrenstufe vor Schicht** (Push Your Luck):
  - **Normal Duty** / **High Alert** (×3 Geld, aber +15 % Autos, Countdown ×0,8, Verbrecher in **jeder** Schicht)

---

## 8. Wirtschaft & Meta-Progression

### Geld verdienen
- Schichtabschluss (200 + 60 × Level)
- Gerettete Geldtransporter (800, Rush Hour ×2)
- Abschirm-Bonus (100 pro Auto in Sperrzone)
- Zolleinnahmen (passiv, pro Truck)
- Modul-Gebühren (Toll Booth, Speed Camera)

### Geld ausgeben
| Bereich | Was |
|---|---|
| **Map-Ausbau (Street Builder)** | Neue Zufahrten (Arme): Ring wird breiter, mehr Verkehr, mehr Transporter, mehr Lohn. 4→8 Arme, Preise: 25k / 50k / 100k / 200k = 375k gesamt |
| **Wahrscheinlichkeits-Upgrades** | 8 Upgrades, bis zu 10 Stufen, Preise steigen ×1,5 pro Stufe |
| **Zollstellen & Module** | Toll Booth (8.000), Speed Camera (12.000), feste Slots (6), voll = Tausch |
| **Lootboxen** | Nur kosmetische Skins, Pity-System, Odds-Transparenz |

### Upgrades (kaufbar, pro Stufe)
| Upgrade | Wirkung | Max Stufen | Erste Stufe |
|---|---|---|---|
| More Patrols | +3 % Polizeiautos in Schlange | 10 | 2.000 |
| Longer Pursuit | +1 s Verbrecher-Countdown | 8 | 2.400 |
| Quiet Streets | 10 % Schichten ohne Verbrecher | 5 | 3.000 |
| Interceptor | Polizei jagt 10 % schneller im Ring | 5 | 3.000 |
| Dispatch Radio | Einsatzfahrt behält 10 % mehr Combo | 5 | 2.400 |
| Backup | +1 Polizei-Crash pro Schicht | 3 | 6.000 |
| Cash Route | Transporter 1 s früher & öfter | 8 | 2.000 |
| Overtime | +20 % Schichtlohn | 10 | 2.000 |

---

## 9. Skins & Lootboxen

- **Nur über Lootboxen** (kein direkter Kauf, kein Fortschritt)
- Typen: Standard (Ingame-Währung), Premium (Echtgeld), Event, Verbrecherjagd
- Seltenheit: Common / Rare / Epic / Legendary (Rahmenfarben/Glow)
- **Keine Gameplay-Boni** auf Skins (Pay-to-Win-Vermeidung, Regulierung)
- Multiplayer-Skins nur kosmetisch, Multiplayer selbst mit Standard-Skin spielbar

---

## 10. Look & Feel / Sound / Haptik

| Aspekt | Umsetzung |
|---|---|
| **Grafik** | Clean, minimalistisch, Apple-artig, Dark Theme, flache Vektorformen, hoher Kontrast |
| **Farben** | Tokens nach Rolle (background, surface, primary, muted, accent, destructive). Fahrzeugfarben = Spielinfo, nie UI-Akzent |
| **Schrift** | SF Pro (App), Tabular Figures für Scores, Dynamic Type |
| **Animationen** | Spring-Easing, physikalisch, keine harten Schnitte. Reduce Motion entfernt Shake/Zoom/Slow-Mo |
| **Sound** | Adaptive Audio-Layer: Combo baut Instrumente auf, Verbrecher → Synthwave-Sirene, Rush Hour → Beat zieht an |
| **Haptik** | Je Ereignis eigenes `.ahap`-Muster: Tight Fit (scharfer Transient), Takedown (eigenes), Crash (kräftig), Rush Hour (ansteigend), Menüs (nur Bestätigungen) |

---

## 11. Technische Architektur

```
Eingabe (Touch/Click mit Zeitstempel)
        │
        ▼
GameCore (120 Hz, deterministisch, plattformneutral)
  ├─ Config.swift        ← ALLE Tuning-Werte
  ├─ World.swift         ← Spielzustand + step(dt)
  ├─ Vehicle/Paths/Roundabout
  ├─ Traffic/Queue/Collision/CrashPhysics/Drivers
  ├─ Criminals/Transporters/Modules
  ├─ Scoring/Shift/Levels/Upgrades
  └─ Events/RNG/Vec2
        │
        ▼
GamePresentation (Daten: Render-Liste, Effekte, HUD, ScreenFlow, Feedback)
        │
        ▼
Plattform
  ├─ TestWindow (Windows, raylib) – Maus/Leertaste, Sounds, Live-Tuning (T)
  └─ iPhone-App (Swift Playgrounds, iPad) – SpriteKit, SwiftUI, Core Haptics, AVAudioEngine
```

**Wichtig:** GameCore & GamePresentation nutzen **nur Swift Stdlib + Foundation** → laufen unter Windows. Plattform enthält **keine Spiellogik**.

---

## 12. Aktueller Implementierungsstand (Stand M5, 23.09.2026)

### ✅ Fertig & spielbar im Testfenster
- **M0–M2 Basis:** Kreisverkehr, Einfädeln, KI-Verkehr, Kollision, Combo, Tight Fit, Strikes, Schicht, Rush Hour, Highscore, Live-Tuning (`tuning.json`), Crash-Physik (Starrkörper-Impuls, Reifenreibung, Beulen, abreißende Teile, Feuer/Rauch/Splitter), reagierender Verkehr mit Kettenunfällen
- **M3 Polizei & Verbrecher:** Pickup, Warnung, Countdown, Takedown, Slow-Mo, Einsatzfahrt, Verfolgung im Ring, Blaulicht
- **M4 Geldtransporter:** Spawn, Sperrzonen, Abschirmen, Beschlagnahme, Geld als Währung, kein Tap-Cooldown, Autos fahren von außerhalb an
- **M5 Wirtschaft & Fortschritt:**
  - Level-System (1–∞, Kurve bis Level 25 gemessen)
  - Geld & Upgrades (8 Upgrades, 54 Stufen gesamt, Karriere-Simulation getestet)
  - Tab-Navigation (Street Builder, Game, Shop, Upgrades)
  - Fließender Schichtübergang (Verkehr läuft weiter, Tempo gleitet, neue Autos rollen in Queue)
  - Upgrade-Karten mit Animationen
  - Gefahrenstufe (Normal Duty / High Alert)
  - Street Builder (Ziehen & Ablegen, 4→8 Arme, Preise, Ring-Geometrie ändert sich)
  - Ring-Module: **Toll Booth** (LKW zahlen, Stau) & **Speed Camera** (Strafe über Limit, Bremsen) – Kern, Zeichnen, Laufbahn fertig, Tests grün

### 🟡 In Arbeit / Offen (M6 Look & Feel)
1. **Bugfix:** Geldtransporter über Schichtende hinaus → **behoben** (verwaistes Fahrzeug wird sauber zum normalen Auto)
2. **Balancing:** Level 14 noch zu leicht → Kurve ab Level 10 nachziehen
3. **Warnung im Innenteil:** Keil auf Mittelinsel statt an Zufahrt → **im Code, Playtest offen**
4. **Blaulicht auf Boden:** Weicher Schein unter Polizei → **im Code, Playtest offen**
5. **Trucks optisch final prüfen** (Länge, Masse, Maut, Farben verdrahtet)
6. **Street Builder Palette & Modulplätze** für Toll Booth / Speed Camera

### 📋 Geplant (Post-M6 / v1.1+)
- Straßennetz-Editor / Stadtübersicht (v1.1)
- Daily Login, Challenges, Perfect-Run-Bonus, Lootboxen, Skins (v1.2)
- Adaptive Musik, Wetter/Tag-Nacht, Krankenwagen/VIP, Baustellen, 2-spurige Kreisverkehre, Boss-Event, Prestige (v1.3)
- Game Center, Widget, Live Activity, Action Button, Siri Shortcuts, Apple Watch (v1.4)
- Premium-Boxen, Season Pass, Multiplayer (später, rechtliche Prüfung nötig)

---

## 13. Testen & Balancing

| Werkzeug | Befehl |
|---|---|
| **Testfenster spielen** | `cd TestWindow && swift run -c release TestWindow` |
| **Automatische Tests** | `cd Game && swift test` |
| **Balancing-Bot (1000 Schichten)** | `swift run -c release Sim --shifts 1000` |
| **Schwierigkeitskurve** | `swift run -c release Sim --curve --shifts 300` |
| **Karriere-Simulation (120 Schichten)** | `swift run -c release Sim --career 120` |
| **Live-Tuning** | `tuning.json` editieren → im Fenster **T** drücken (neuer Seed, gleiche Geometrie) |
| **Debug-Overlay** | **F1** (Hitboxen, Abstände, FPS, Seed) |
| **Zeitlupe** | **F2** (1× → 0,5× → 0,25×) |

**Playtest-Routine (nach jedem Meilenstein):** 3 Schichten spielen → Fairness der Crashes prüfen (F1), Feedback-Wahrnehmung, Ruckler (FPS), Motivation („Will ich noch eine?“).

---

## 14. Nächste Schritte (Roadmap)

| Phase | Meilenstein | Ziel |
|---|---|---|
| **Phase 1 (Windows)** | **M6 Look & Feel** | Finale Farben, Formen, Effekte, HUD, Sounds, Haptik-Muster (`.ahap`), Screen-Entwürfe für SwiftUI, App-Icon |
| **Phase 2 (iPad)** | **M7 iPhone-App** | `App.swiftpm` anlegen, SpriteKit-Adapter, Touch/Haptik/Audio-Adapter, SwiftUI-Menüs aus `ScreenFlow`, Timing-Feintuning auf Gerät, Tests auf iPhone 11/SE (A13) |
| **Phase 3** | **M8 v1.0 Launch** | Apple Developer Program (99 $), TestFlight-Beta (Website), App Store Einreichung, Privacy Policy & Support-Seite, Launch |

---

## 15. Offene Entscheidungen / Balancing-Punkte

- [ ] Zollstellen: Max. Anzahl, Gebühr-Skalierung mit Upgrades
- [ ] Zollstellen-Stau: Stärke/Sichtbarkeit, Preis Verkehrsleitsystem-Gegen-Upgrade
- [ ] Map-Erweiterung & Upgrades: Genauere Kosten & Skalierung
- [ ] Lootboxen: Odds & Preise pro Box-Typ
- [ ] Multiplayer: Echtzeit vs. asynchroner Vergleich
- [ ] Truck-Integration: Finales Aussehen, Bremsverhalten im Playtest prüfen
- [ ] Blaulicht-Intensität/Reichweite auf Boden
- [ ] Keil-Warnung auf Mittelinsel: Position & Deutlichkeit
- [ ] Level-Kurve ab Level 10 nachziehen (aktuell Level 14 zu leicht)

---

## 16. Datei-Struktur (Kern)

```
Car game/
├─ IDEA.md, FOUNDATION.md, PLAN.md, ROADMAP.md, TESTING.md, UI.md
├─ Game/                          ← Plattformneutrales Swift-Paket
│  ├─ Sources/GameCore/           ← Spiellogik (Config, World, Vehicle, Criminals, Transporters, Upgrades, Levels, Modules, …)
│  ├─ Sources/GamePresentation/   ← Darstellung als Daten (RenderList, HUD, ScreenFlow, Effects, CarArt, Theme, Motion, Feedback, SceneBuilder, …)
│  ├─ Sources/GameBots/           ← Bots für Sim & Tests
│  ├─ Sources/Sim/                ← Balancing-Bot (swift run Sim)
│  └─ Tests/                      ← Swift Testing (GameCore, GamePresentation, GameBots)
├─ TestWindow/                    ← raylib-Testfenster (Windows)
│  ├─ tuning.json                 ← Live-Tuning
│  └─ savegame.json               ← Highscore, Einstellungen, Karriere
├─ Assets/Sounds/                 ← .wav (Platzhalter, SoundMaker neu erzeugbar)
└─ App.swiftmp/                   ← Entsteht in Phase 2 auf iPad (Swift Playgrounds)
```

---

**Stand:** 23.09.2026 – M5 vollständig, M6 gestartet. Das Spiel ist im Testfenster **voll spielbar** mit allen Kernsystemen (Polizei, Transporter, Wirtschaft, Level, Street Builder, Module). Nächster großer Schritt: **M6 Look & Feel** (finale Optik, Sound, Haptik) → dann **Phase 2 auf iPad**.