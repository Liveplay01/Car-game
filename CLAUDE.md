# CLAUDE.md – Car Game

Kreisverkehr-Timing-Spiel **im Browser** (One-Tap, inspiriert von "Car Circle"), spielbar
auf Handy und Desktop, installierbar als PWA.

**Nur die Web-Version (Leo, 29.09.2026):** Car Game ist ein **Browserspiel**. Die frühere
Apple-Schiene (Swift-Pakete, Testfenster, iPad-App, App-Store-Pläne) ist gelöscht; wer sie
braucht, findet sie in der Git-Historie (bis Commit `4f9ac73`). Keine Swift-, iOS- oder
App-Store-Arbeit mehr vorschlagen.

| Dokument | Inhalt |
| --- | --- |
| [Web/README.md](Web/README.md) | **Das Spiel:** Befehle, Aufbau, Speichern, PWA, Deployment |
| [Web/PRODUCT.md](Web/PRODUCT.md) | Zielgruppe, Designprinzipien, Barrierefreiheit |
| [Spiel.md](Spiel.md) | Überblick über das ganze Spiel und Stand der Umsetzung |
| [FOUNDATION.md](FOUNDATION.md) | Regeln mit Startwerten, Motion-Regeln, Architektur |
| [LOOT.md](LOOT.md) | Was in den Truhen steckt: Skins, Fahrzeugtypen, Odds |
| [IDEA.md](IDEA.md) | Offene Ideen (Umgesetztes und Gestrichenes wird entfernt) |

## Feste Entscheidungen – nicht neu vorschlagen

- **Browserspiel.** Das Produkt ist `Web/`: **Vite + TypeScript + HTML5 Canvas**, ohne
  UI-Framework (kein React/Vue) und ohne Game-Engine.
- **Aufbau von `Web/src/`:** `core/` (Spielregeln, kein DOM), `present/` (Darstellung:
  Render-Liste, Szene, HUD, Seiten, Übergänge, Kamera, Feedback und die `GameSession`),
  `audio/` (Web Audio: Samples aus `Web/public/audio/`, adaptive Musik-Stems), `storage/`
  (localStorage), `net/` (Multiplayer über PeerJS/WebRTC), `ui/` (DOM-Hülle: Canvas,
  Tab-Bar, Sheets). Spiellogik gehört nur nach `core/`.
- **Fester Takt:** Simulation mit 120 Hz, Interpolation dazwischen, Taps mit Zeitstempel
  (`pointerdown`). Gleicher Seed + gleiche Taps = gleiches Ergebnis.
- **Zielgeräte:** aktuelle Browser auf Handy (Hochformat, einhändig) und Desktop.
  Touch ohne Doppeltipp-Zoom (`touch-action`), Tastatur (Leertaste/Enter) auf dem Desktop.
- **Spielsprache nur Englisch.** Die Projektdokumente sind auf Deutsch.
- **Spielstand nur lokal im Browser** (`localStorage`, Schlüssel `carGame.save.v2`, alte `carGame.career.v1` werden übernommen).
  **Kein Backend, keine Datenbank, keine API.** nginx liefert nur statische Dateien aus.
- **Offline spielbar:** Nach dem ersten Laden läuft das Spiel ohne Netz (Service Worker aus
  `Web/vite.config.ts`, precacht alle Dateien). Nur der Multiplayer braucht Netz.
- **Deployment:** Docker-Image aus dem `Dockerfile` im Repo-Root (Node baut, `nginx:alpine`
  liefert aus), **Port 5050** – überall: Container, `npm run dev`, `npm run preview`.
  Coolify baut es aus dem GitHub-Repo. nginx-Konfiguration: `Web/nginx.conf`.
- **GitHub** ist die Quelle für das Deployment. Commits direkt auf `main`, kein
  Feature-Branch- oder PR-Workflow für dieses Ein-Personen-Projekt (der PR-Workflow aus
  der globalen CLAUDE.md gilt hier weiterhin nicht). **Gepusht wird nur durch Leo**; jeder
  Push auf `main` kann ein Deployment auslösen.
- **Neue Regeln entstehen in `Web/src/core/`**, alle Werte in `Web/src/core/config.ts`.
- **Native App-Anmutung im Browser:** Tab-Bar (Progress · Game · Shop · Build), gruppierte
  Listen, Sheets, Schalter, Segmented Controls, wie man sie von iOS kennt. Eigenes Design
  nur für die Spielszene. Glas-Effekt nur für schwebende Bedienelemente über der Szene.
- **Fahrzeugfarben sind Spielinformation** und für die UI tabu; Fahrzeugtypen sind über
  Form, Farbe und Symbol erkennbar.
- **Casino statt Store (Leo, 28.09.2026):** Der Shop hat Chests · Collection · Casino (Crash, Slots,
  Skin-Upgrade, Doppelt oder nichts; `core/casino.ts`). Der Store ist entfernt. **Solange das Casino
  existiert, gibt es keine kaufbare Währung und keine Truhen gegen Echtgeld.** Chancen bleiben sichtbar
  und ehrlich (LOOT.md, Casino); `npm run sim:casino` prüft die Rückzahlquoten.
- **Crashes sind echte Physik** (`Web/src/core/crash.ts`, `drivers.ts`): Stoß-Impuls,
  Reifenreibung, reagierender Verkehr, Blechschaden. Keine geskripteten Animationen.

## Befehle

```powershell
cd Web; npm install                     # einmalig
cd Web; npm run dev                     # Entwickeln: http://localhost:5050 (auch vom Handy im WLAN)
cd Web; npm run build                   # Typecheck + Build nach Web/dist
cd Web; npm run preview                 # Build lokal ausliefern, Port 5050
cd Web; npm test                        # Tests: Replays, Spielstände, Meldungen (node:test)
cd Web; npm run sim -- 60 5             # Balancing-Bots: Schichten, Level
cd Web; npm run sim:casino              # Casino: Rückzahlquoten, faire Münze, Determinismus
cd Web; npm run sim:career -- 60        # Ganze Karriere bis Level 60: Spielzeit, Geld, Upgrades
docker build -t car-game . ; docker run -p 5050:5050 car-game   # Container wie in Coolify
```

## Arbeitsweise

- Neues Spielsystem: zuerst in `Web/src/core/`, mit dem Balancing-Bot prüfen
  (`npm run sim`: der vorsichtige Bot darf nie crashen), dann darstellen
  (`present/`, `ui/`), dann im Browser spielen – auch auf einem echten Handy.
- Alle Tuning-Werte stehen in `Web/src/core/config.ts`.
- **Museum wächst mit (Leo, 28.09.2026):** Der Katalog in `core/museum.ts` folgt den Inhaltslisten
  (`BOSS_KINDS`, Fahrzeugtypen, `WEATHERS`, `CITY_EVENTS`, Dunkelheit). Neuer Boss, neues
  Spezialfahrzeug, neues Wetter oder Ereignis erscheint dort automatisch; der Build bricht ab,
  bis Level (`core/museum.ts`), Text (`present/strings.ts`, `*_TEXT`) und Bild/Farbe
  (`present/museum.ts`) eingetragen sind. Ein gewöhnlicher Fahrzeugtyp kommt in `ORDINARY`.
  Eine ganz neue Inhaltsart bekommt ein eigenes Regal (`MUSEUM_SHELVES`); alte Spielstände
  erhalten dafür automatisch, was sie schon gesehen haben müssen (`museumShelves`).
- **Patch Notes (Leo, 29.09.2026):** Jede größere Neuerung und jeder spürbare Bugfix bekommt
  einen Eintrag in `Web/src/present/patchNotes.ts` (Settings → What's new): Englisch, für
  Spieler geschrieben, neueste zuerst, eindeutige `id`. Eine neue erste `id` zeigt den Punkt
  am Einstellungsknopf. Jeder Eintrag hat ein `impact`: `major` (rot, ändert Regeln, Level oder
  Belohnungen spürbar), `minor` (gelb, neu oder poliert, ohne das Spiel zu ändern), `fix`
  (grün, nur Fehlerbehebungen). Die Liste zeigt den neuesten aufgeklappt, die anderen zu.
- **Name (Leo, 30.09.2026):** Das Spiel heißt **Roundabout Timing** (kurz RAT); „Car Game“ ist nur noch der Ordner- und Repo-Name.
- **CrazyGames (Leo, 30.09.2026):** Eingebettet über die normale URL mit `?crazygames`, kein eigener Build, kein Upload. Nur dann lädt das SDK und speichert über das Data Module (Web/README.md, CrazyGames).
- **Rechtliches:** Datenschutz und Impressum in `Web/src/present/legal.ts` (Settings → Legal, `/privacy`, `/imprint`). Neuer Dienst, der Daten bekommt (Werbung, Analyse, Server) = Absatz dort und neues `LEGAL_UPDATED`.
- Vor jedem Commit: `npm test` und `npm run build` müssen grün sein.
- Das Icon-Original liegt in `Web/icon/` (`python Web/icon/make_icon.py`).
- Die Casino-Klänge entstehen in `Web/audio-src/make_casino_sounds.py` (numpy, scipy, ffmpeg)
  und landen als `.m4a` in `Web/public/audio/sounds/`.
