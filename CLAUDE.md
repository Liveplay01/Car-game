# CLAUDE.md – Car Game

Kreisverkehr-Timing-Spiel fürs iPhone (One-Tap, inspiriert von "Car Circle").

| Dokument | Inhalt |
| --- | --- |
| [IDEA.md](IDEA.md) | Spielidee und Features |
| [PLAN.md](PLAN.md) | Weg: Windows → Mac → Veröffentlichung |
| [FOUNDATION.md](FOUNDATION.md) | Basis: Technik, Regeln mit Startwerten, Architektur |
| [ROADMAP.md](ROADMAP.md) | Meilensteine M0–M8 |
| [TESTING.md](TESTING.md) | So wird getestet |

## Feste Entscheidungen – nicht neu vorschlagen

- **Swift, überall.** Kein Web-Stack, keine Engine (Unity, Godot …), kein
  Cross-Plattform-Framework.
- **Entwickelt und getestet wird unter Windows** (Swift-Toolchain, VS Code). Der
  **Mac dient nur zum Fertigmachen** (Phase 2).
- **Alles Spielentscheidende und die Darstellungslogik** gehören in das
  plattformneutrale Paket `Game/` (`GameCore`, `GamePresentation`). Dort nur
  Swift-Standardbibliothek + Foundation, **kein** SpriteKit, UIKit, SwiftUI oder
  `simd`. Das Paket muss unter Windows bauen.
- **`TestWindow/`** (raylib) ist ein Werkzeug, kein Produkt: Es zeichnet nur, nimmt
  Eingaben an und spielt Ton ab. Keine Spiellogik darin, kein Design-Aufwand.
- **`App/`** (Xcode, Phase 2) enthält nur dünne Adapter (SpriteKit, Touch, Haptik,
  Audio) und die SwiftUI-Menüs.
- **Zielgeräte:** jedes iPhone ab **iOS 26** (ab iPhone 11 / SE 2. Gen.), Hochformat,
  einhändig. Nichts darf eine iOS-27-API voraussetzen.
- **Spielsprache nur Englisch**, alle Texte zentral in `Strings.swift`. Die
  Projektdokumente sind auf Deutsch.
- **Veröffentlichung:** App Store weltweit. Die eigene Website ist Landing Page
  (App-Store-Link, TestFlight-Link, Datenschutz, Support).
- **Kein GitHub, kein Remote.** Das Projekt liegt lokal. Keine Branch-, Push- oder
  PR-Workflows vorschlagen.
- **Kein Backend, kein eigener Server.** Online-Funktionen nur über Apple-Dienste.
- **So viele native Apple-Elemente wie möglich** (Tab-Bar, NavigationStack,
  Listen, Sheets, SF Symbols). Die Hauptnavigation zwischen Street Builder, Game,
  Shop und Upgrades ist eine native iOS-Tab-Bar (`TabView`). Eigenes Design nur für
  die Spielszene.
- **Crashes sind echte Physik** (`CrashPhysics`, `Drivers.swift`): Stoß-Impuls,
  Reifenreibung, reagierender Verkehr, Blechschaden. Keine geskripteten Animationen.

## Befehle (ab M0)

```powershell
cd Game;       swift test                                        # Logik-Tests
cd Game;       swift run -c release Sim --shifts 1000 --seed 42  # Balancing-Bot
cd Game;       swift run -c release Sim --curve --shifts 300     # Schwierigkeit pro Level
cd Game;       swift run -c release Sim --career 120             # Laufbahnen: Level, Geld, Upgrades
cd TestWindow; swift run -c release TestWindow                   # Spielen
cd TestWindow; swift run SoundMaker                              # Platzhalter-Sounds neu erzeugen
```

## Arbeitsweise

- Neues Spielsystem: zuerst in `GameCore` mit Tests, dann in `GamePresentation`
  darstellen, dann im Testfenster spielen.
- Alle Tuning-Werte stehen in `Game/Sources/GameCore/Config.swift`.
- Welcher Meilenstein gerade dran ist: [ROADMAP.md](ROADMAP.md).
