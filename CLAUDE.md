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
| [Server/README.md](Server/README.md) | **Ranglisten-Dienst:** API, Module, Deployment in Coolify, Moderation |
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
  **Versiegelt (Leo, 04.10.2026):** Speicherstand und Cloud-Kopie tragen ein HMAC-Siegel (`storage/seal.ts`, Web/README.md, „Sealed save“); eine von Hand geänderte Kopie wird verworfen. Das ist Reibung gegen DevTools-Edits, kein Beweis: der Schlüssel liegt im Bundle.
  Das Spiel selbst bleibt ohne Backend: nginx liefert nur statische Dateien aus, Geld, Truhen und Fortschritt liegen lokal.
- **Ranglisten-Dienst (Leo, 30.09.2026):** Es gibt **einen kleinen, optionalen Server** in `Server/`
  (Node 22 + Hono + SQLite, eigener Container, eigene Coolify-Ressource auf einer Subdomain, Port 5051).
  Er kennt anonyme Spieler (frei gewählter Name, gefiltert), Bestenlisten (Shift-Level, Unlimited-Rekord) und
  seit 01.10.2026 ein **Freunde-Board** (Freundescode `K7M2-9QXA`, einseitig), einen optionalen **Cloud-Spielstand
  per Sync-Code** (`K7M2-9QXA-4TFB`, kein Konto, kein Passwort, Rückfrage bei Konflikt, nie still überschreiben),
  **TURN-Zugänge** für den Multiplayer (Cloudflare, `GET /v1/rtc/ice`) und **Kurzlinks für Challenges** (`/c/K7M29QXA`,
  Vorschaubild zeichnet der Server selbst, kein Upload; `net/challengeLink.ts`), seit 03.10.2026 **Build with us**
  (Bug-Reports und Ideen vom Formular auf timing.love/build, je 1 pro Tag, Inbox unter `/admin`; ein Bug-Report mit
  Freundescode zahlt den Ladybug-Skin, das Spiel holt Belohnungen über `net/rewards.ts` ab); seit 04.10.2026 **Einladungen** (der Freundescode ist die Einladung, `/i/K7M29QXA`; erreicht der Eingeladene Level 5, bekommen beide eine Standard Chest, `Server/src/modules/referrals`, Spiel: `net/invite.ts`), weitere Funktionen kommen als Module in
  `Server/src/modules/`. Anti-Cheat nur über Plausibilitätsgrenzen.
  Das Spiel läuft auch ohne ihn (offline-first, `net/leaderboard.ts`, `net/cloud.ts` und `net/rtc.ts` sind abgeschaltet
  bzw. fallen zurück ohne `VITE_API_URL`). Die Quelle des Spielstands bleibt der Browser (Cloud = optionale Kopie);
  Geld und Truhen werden lokal berechnet, die Casino-Regel gilt weiter. Details: [Server/README.md](Server/README.md).
- **Changelog-API (Leo, 04.10.2026):** Das Spiel schreibt bei jedem Build `/changelog.json` aus `present/patchNotes.ts`
  (`vite.config.ts`, mit CORS in `nginx.conf`). Die Website liest sie im Browser; ein neuer Patch-Notes-Eintrag steht
  dort mit dem nächsten Deployment des Spiels, ohne Kopieren. Die Form ist öffentlich: Felder ergänzen, nie umbenennen.
- **Freiwillige Werbung (Leo, 05.10.2026):** Die einzige Werbung im Spiel sind **Rewarded Ads**, immer auf Tap und nur bezahlt, wenn sie zu Ende gesehen wurde: Gratis-Standard-Truhe (3/Tag), ein Gratis-Schritt eines vom Spiel gezogenen Upgrades (1/Tag) und +10 Prozentpunkte Chance auf die nächste Runde des Skin-Upgrades (3/Tag, `upgradeAdBoost`, im Rad sichtbar). **Die beiden neuen nur auf der normalen Seite und in der Google-Play-App, nie auf CrazyGames** (dort nur die Truhe, deren SDK). Echte Werbung über Googles Ad Placement API (`ui/ads.ts`, `present/adFlow.ts`), eingeschaltet mit dem Build-Arg `VITE_REWARDED_ADS=1`, sobald das AdSense-Konto für H5 Games Ads freigegeben ist; bis dahin läuft die Platzhalter-Werbung. Keine Pflicht-, Midgame- oder Banner-Werbung. Details: Web/README.md, „Rewarded ads“.
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
cd Server; npm install                  # einmalig
cd Server; npm run dev                  # Ranglisten-Dienst: http://localhost:5051
cd Server; npm test                     # Tests des Dienstes (Namen, Anmeldung, Ranglisten, Admin)
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
- **Patch Notes (Leo, 29.09.2026):** Jede größere Neuerung und jeder spürbare Bugfix kommt
  in `Web/src/present/patchNotes.ts` (Settings → What's new): Englisch, für Spieler
  geschrieben, neueste zuerst.
  **Ein Eintrag pro Tag (Leo, 01.10.2026):** Gibt es für heute schon einen Eintrag (`id` ist
  der Tag, `YYYY-MM-DD`), kommt jede neue Änderung als Punkt oben in dessen `items`. Keinen
  zweiten Eintrag für denselben Tag anlegen. Den `title` des Tages so anpassen, dass er das
  Wichtigste nennt, und das `impact` auf die stärkste Änderung des Tages heben (`major` rot:
  ändert Regeln, Level oder Belohnungen spürbar; `minor` gelb: neu oder poliert, ohne das
  Spiel zu ändern; `fix` grün: nur Fehlerbehebungen; reine Fixes beginnen mit „Fixed:“).
  Erst am nächsten Tag beginnt ein neuer Eintrag. Ein neuer Punkt zeigt den Punkt am
  Einstellungsknopf (`latestNote`: Tag und Anzahl der Punkte), auch im bestehenden Eintrag.
  `npm test` prüft: eine `id` pro Tag, neueste zuerst. Die Liste zeigt den neuesten Tag
  aufgeklappt, die anderen zu.
  **Von Spielern angestoßen (Leo, 03.10.2026):** Ein Punkt, den ein Spieler gemeldet oder
  vorgeschlagen hat (Build with us), ist `{ text, from: null }` („From a player“) oder
  `{ text, from: 'Name' }` („Thanks, Name“, nur mit dem Einverständnis des Spielers) statt
  eines Strings. Die Website (timing.love/changelog) übernimmt die Markierung.
- **Website-Inhalte aus dem Spiel (Leo, 03.10.2026):** timing.love/changelog, /museum und die
  Titel-Namen auf /ranks entstehen aus den Quellen des Spiels (`npm run content` im Website-Repo
  liest `patchNotes.ts`, `strings.ts`, `core/museum.ts`, nichts wird hier geschrieben). Nach einem
  neuen Patch-Notes-Eintrag, Boss oder Wetter dort einmal ausführen und die JSON-Dateien committen.
- **Name (Leo, 30.09.2026):** Das Spiel heißt **Roundabout Timing** (kurz RAT); „Car Game“ ist nur noch der Ordner- und Repo-Name.
- **CrazyGames (Leo, 30.09.2026):** Eingebettet über die normale URL mit `?crazygames`, kein eigener Build, kein Upload. Nur dann lädt das SDK und speichert über das Data Module (Web/README.md, CrazyGames).
- **Google Play (Leo, 02.10.2026):** Trusted Web Activity auf `/?googleplaystore`, kein eigener Build. `inPlayStore` (`storage/device.ts`) blendet Installieren und den CrazyGames-Link aus; `public/.well-known/assetlinks.json` verknüpft App und Seite (Web/README.md, Google Play).
- **Rechtliches:** Datenschutz und Impressum in `Web/src/present/legal.ts` (Settings → Legal, `/privacy`, `/imprint`). Neuer Dienst, der Daten bekommt (Werbung, Analyse, Server) = Absatz dort und neues `LEGAL_UPDATED`.
- Vor jedem Commit: `npm test` und `npm run build` müssen grün sein (in `Web/`, und in `Server/` `npm test` und `npm run typecheck`, wenn er berührt wurde).
- Das Icon-Original liegt in `Web/icon/` (`python Web/icon/make_icon.py`).
- Die Casino-Klänge entstehen in `Web/audio-src/make_casino_sounds.py` (numpy, scipy, ffmpeg)
  und landen als `.m4a` in `Web/public/audio/sounds/`.
