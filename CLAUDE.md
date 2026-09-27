# CLAUDE.md – Car Game

Kreisverkehr-Timing-Spiel **im Browser** (One-Tap, inspiriert von "Car Circle"), spielbar
auf Handy und Desktop, installierbar als PWA.

**Richtungswechsel (Entscheidung Leo, 27.09.2026):** Car Game ist ab jetzt ein
**Browserspiel**. Die Apple-Schiene (Swift-App, iPad/Swift Playgrounds, App Store) ist
**pausiert**, nicht gelöscht. Die Swift-Dokumente unten beschreiben den Stand vor dem
Wechsel und bleiben als Referenz für Regeln, Werte und Ideen.

| Dokument | Inhalt |
| --- | --- |
| [Web/README.md](Web/README.md) | **Das Spiel:** Befehle, Aufbau, Speichern, PWA, Deployment |
| [Web/PRODUCT.md](Web/PRODUCT.md) | Zielgruppe, Designprinzipien, Barrierefreiheit |
| [IDEA.md](IDEA.md) | Offene Ideen (Umgesetztes und Gestrichenes wird entfernt) |
| [FOUNDATION.md](FOUNDATION.md) | Regeln mit Startwerten, Architektur (Swift-Stand, Regeln gelten weiter) |
| [LOOT.md](LOOT.md) | Was in den Truhen steckt: Skins, Fahrzeugtypen, Odds |
| [ROADMAP.md](ROADMAP.md) | Meilensteine der Swift-Schiene (pausiert) |
| [PLAN.md](PLAN.md) | Weg Windows → iPad → App Store (pausiert) |
| [TESTING.md](TESTING.md) | Testen der Swift-Schiene (pausiert) |
| [MONETIZATION.md](MONETIZATION.md) | In-App-Käufe und Werbung der App (pausiert) |

## Feste Entscheidungen – nicht neu vorschlagen

- **Browserspiel.** Das Produkt ist `Web/`: **Vite + TypeScript + HTML5 Canvas**, ohne
  UI-Framework (kein React/Vue) und ohne Game-Engine.
- **Aufbau von `Web/src/`:** `core/` (Spielregeln, kein DOM; Port von `GameCore`),
  `present/` (Darstellung 1:1 aus `GamePresentation`: Render-Liste, Szene, HUD, Seiten,
  Übergänge, Kamera, Feedback und die `GameSession`), `audio/` (Web Audio: echte Samples
  aus `Assets/`, adaptive Musik-Stems), `storage/` (localStorage), `ui/` (DOM-Hülle:
  Canvas, Tab-Bar, Einstellungs-Sheet). Spiellogik gehört nur nach `core/`.
- **Fester Takt:** Simulation mit 120 Hz, Interpolation dazwischen, Taps mit Zeitstempel
  (`pointerdown`). Gleicher Seed + gleiche Taps = gleiches Ergebnis.
- **Zielgeräte:** aktuelle Browser auf Handy (Hochformat, einhändig) und Desktop.
  Touch ohne Doppeltipp-Zoom (`touch-action`), Tastatur (Leertaste/Enter) auf dem Desktop.
- **Spielsprache nur Englisch.** Die Projektdokumente sind auf Deutsch.
- **Spielstand nur lokal im Browser** (`localStorage`, Schlüssel `carGame.save.v2`, alte `carGame.career.v1` werden übernommen).
  **Kein Backend, keine Datenbank, keine API.** nginx liefert nur statische Dateien aus.
- **Deployment:** Docker-Image aus dem `Dockerfile` im Repo-Root (Node baut, `nginx:alpine`
  liefert aus), **Port 5050** – überall: Container, `npm run dev`, `npm run preview`.
  Coolify baut es aus dem GitHub-Repo. nginx-Konfiguration: `Web/nginx.conf`.
- **GitHub** ist die Quelle für das Deployment. Commits direkt auf `main`, kein
  Feature-Branch- oder PR-Workflow für dieses Ein-Personen-Projekt (der PR-Workflow aus
  der globalen CLAUDE.md gilt hier weiterhin nicht). **Gepusht wird nur durch Leo**; jeder
  Push auf `main` kann ein Deployment auslösen.
- **Die Web-Version ist jetzt die führende Umsetzung der Regeln.** Sie ist aus `Game/`
  (`GameCore`) portiert, mit denselben Werten (`Config.swift` → `Web/src/core/config.ts`).
  Neue Regeln entstehen in `Web/src/core/`, nicht mehr in Swift.
- **Native App-Anmutung im Browser:** Tab-Bar (Progress · Game · Shop · Build), gruppierte
  Listen, Sheets, Schalter, Segmented Controls, wie man sie von iOS kennt. Eigenes Design
  nur für die Spielszene. Glas-Effekt nur für schwebende Bedienelemente über der Szene.
- **Fahrzeugfarben sind Spielinformation** und für die UI tabu; Fahrzeugtypen sind über
  Form, Farbe und Symbol erkennbar.
- **Crashes sind echte Physik** (`Web/src/core/crash.ts`, `drivers.ts`): Stoß-Impuls,
  Reifenreibung, reagierender Verkehr, Blechschaden. Keine geskripteten Animationen.

### Pausiert (Apple-Schiene, Stand vor dem 27.09.2026)

Nicht weiterentwickeln, nicht löschen: `Game/` (Swift-Paket `GameCore`,
`GamePresentation`), `TestWindow/` (raylib), `App.swiftpm/`, `Assets/` (Sounds, Haptik,
Icon; das Icon nutzt auch die Web-Version). Die früheren Festlegungen (Swift überall,
iPad statt Mac, iOS 26, App Store, AdMob für Werbe-Truhen, SwiftUI-`TabView`) gelten erst
wieder, wenn die App-Schiene fortgesetzt wird.

## Befehle

```powershell
cd Web; npm install                     # einmalig
cd Web; npm run dev                     # Entwickeln: http://localhost:5050 (auch vom Handy im WLAN)
cd Web; npm run build                   # Typecheck + Build nach Web/dist
cd Web; npm run preview                 # Build lokal ausliefern, Port 5050
cd Web; npm run sim -- 60 5             # Balancing-Bots: Schichten, Level
docker build -t car-game . ; docker run -p 5050:5050 car-game   # Container wie in Coolify
```

Referenz, pausiert: `cd Game; swift test`, `cd Game; swift run -c release Sim …`,
`cd TestWindow; swift run -c release TestWindow`.

## Arbeitsweise

- Neues Spielsystem: zuerst in `Web/src/core/`, mit dem Balancing-Bot prüfen
  (`npm run sim`: der vorsichtige Bot darf nie crashen), dann darstellen
  (`present/`, `ui/`), dann im Browser spielen – auch auf einem echten Handy.
- Alle Tuning-Werte stehen in `Web/src/core/config.ts`.
- Vor jedem Commit: `npm run build` muss grün sein.
