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
| [Web/PRODUCT.md](Web/PRODUCT.md) | Zielgruppe, Produktzweck |
| [Web/ICONS.md](Web/ICONS.md) | Animierte Icons: Einbau, Stil, Vorlage für neue Icons |
| [DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md) | Design-Sprache: Brand Personality, Farbrollen, Design-Prinzipien, Motion- und Haptik-Regeln, Barrierefreiheit |
| [Spiel.md](Spiel.md) | Überblick über das ganze Spiel und Stand der Umsetzung |
| [FOUNDATION.md](FOUNDATION.md) | Regeln mit Startwerten, Motion-Regeln, Architektur |
| [LOOT.md](LOOT.md) | Was in den Truhen steckt: Skins, Fahrzeugtypen, Odds |
| [IDEA.md](IDEA.md) | Offene Ideen (Umgesetztes und Gestrichenes wird entfernt) |
| [NEW-PLAYSTORE-BUILD.md](NEW-PLAYSTORE-BUILD.md) | Sammelliste für den nächsten Build der Android-App, mit Anleitung |

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
- **Spielsprachen: Englisch, Deutsch, Spanisch, Französisch, Italienisch (Leo, 12.10.2026), seit 18.10.2026 auch Japanisch, Koreanisch und Chinesisch (vereinfacht; für die Asien-Märkte, von Claude übersetzt, nicht von Muttersprachlern geprüft).:** 8 Sprachen (en/de/es/fr/it/ja/ko/zh). Sichtbare Texte nie fest im Code, immer über `S` (`present/strings.ts`, `present/lang/<code>.ts`). Englisch bleiben Patch Notes, Rechtstexte, Skin-Namen, Servertexte; Projektdokumente deutsch. → [DECISIONS.md](DECISIONS.md)
- **Spielstand nur lokal im Browser:** Nur lokal (`carGame.save.v2`), HMAC-versiegelt (`storage/seal.ts`). Geld, Truhen, Fortschritt ohne Backend. → [DECISIONS.md](DECISIONS.md)
- **Ranglisten-Dienst (Leo, 30.09.2026):** Optionaler Server `Server/` (Hono + SQLite, Port 5051): Namen, Bestenlisten, Crews, Cloud-Sync per Sync-Code, TURN, Challenge-Links, Build with us, Einladungen. Spiel läuft offline ohne ihn; Geld/Truhen lokal; Anti-Cheat nur Plausibilität. → [DECISIONS.md](DECISIONS.md)
- **Changelog-API (Leo, 04.10.2026):** Das Spiel schreibt bei jedem Build `/changelog.json` aus `present/patchNotes.ts`
  (`vite.config.ts`, mit CORS in `nginx.conf`). Die Website liest sie im Browser; ein neuer Patch-Notes-Eintrag steht
  dort mit dem nächsten Deployment des Spiels, ohne Kopieren. Die Form ist öffentlich: Felder ergänzen, nie umbenennen.
- **Website-Daten (Leo, 15.10.2026):** Build schreibt `/data/*.json`, SVGs und `index.json` für timing.love. Felder nur ergänzen, nie umbenennen. → [DECISIONS.md](DECISIONS.md)
- **Analytics (Leo, 07.10.2026):** Nur Umami (`ui/analytics.ts`), kein zweites System. Ereignisse tragen nie Namen, Codes oder Spielstand; jedes trägt `channel`. → [DECISIONS.md](DECISIONS.md)
- **Spielerkonto (Leo, 15.10.2026):** „Dein Spieler“ (`ui/accountSheet.ts`) bündelt Konto, Freundescode, Name und Cloud-Sync. Crew/Club brauchen den Spieler, Mafia nicht. Kein zweites Cloud-Sync-Pop-up. Sync-Code geheim. → [DECISIONS.md](DECISIONS.md)
- **Benachrichtigungen (Leo, 08.10.2026):** Optionaler Server `Server/` (Hono + SQLite, Port 5051): Namen, Bestenlisten, Crews, Cloud-Sync per Sync-Code, TURN, Challenge-Links, Build with us, Einladungen. Spiel läuft offline ohne ihn; Geld/Truhen lokal; Anti-Cheat nur Plausibilität. → [DECISIONS.md](DECISIONS.md)
- **Freiwillige Werbung (Leo, 05.10.2026):** Nur Rewarded Ads auf Tap, bezahlt erst nach dem Ende. Keine Pflicht-, Midgame- oder Banner-Werbung. Platzhalter bis zur AdSense-Freigabe (`?adfake` im Dev). → [DECISIONS.md](DECISIONS.md)
- **Streak-Anzeigen und Schlüsselmomente (Leo, 16.10.2026):** Weitere Rewarded Ads nur auf Tap, nur normale Seite und Play-App. Nur drei Vollbild-Momente (`rewardBurst`), keine weiteren dazunehmen. → [DECISIONS.md](DECISIONS.md)
- **Weniger Reibung, ein Ideen-System, Support (Leo, 24.10.2026):** Codes und Links aus der Zwischenablage findet das Spiel selbst (`net/pasted.ts` parst nur ganze Codes oder Links, `ui/clipboard.ts` liest still, wo der Browser es schon erlaubt, sonst per Tipp auf „Einfügen“): Cloud-Sync-Code, Multiplayer-Raumcode, Crew-Einladungslink (`adoptCrewText`, ein abgelehnter Link wird nicht erneut angeboten). Neue Codefelder bekommen dasselbe. **Jede Feature-Idee ist eine Game-Fund-Idee:** `POST /v1/feedback` mit `kind: idea` landet nur noch in `ideas` (Quelle `feedback`), `feedback` hält nur Bug-Reports; timing.love/build listet die veröffentlichten Ideen live (`GET /v1/ideas`). **Support:** timing.love/support, verlinkt in Settings → About. **Konto löschen = echtes Löschen** (kein Nullsetzen; Begründung und Folgen in Server/README.md, „Erasing a player“, `ctx.onErase`). **Rate Limits** stehen in Server/README.md („Rate limits“): Flood-Guard über alles, neue Routen bekommen bei Schreiben, Code-Raten oder Zeichnen ein eigenes engeres Limit.
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
- **Native App-Anmutung im Browser::** Dock-Tab-Bar (Progress · Social · Game · Shop · Build), iOS-Look, Glas nur über der Szene. Flache Navigation, Segmente wischbar, Neues dorthin sortieren, wo es hingehört. → [DECISIONS.md](DECISIONS.md)
- **Sanfter Einstieg (Leo, 12.10.2026):** Karriere-Level 1–5 bringen je eine Mechanik (`forIntro`). Neue Mechaniken in diese Leiter, nicht auf Level 1–5 dazu. → [DECISIONS.md](DECISIONS.md)
- **Fail-Pause (Leo, 12.10.2026):** Eine verlorene Schicht (Karriere, Unlimited, Challenge und Trial; keine Detonation; Mayhem kennt kein Verlieren) zeigt zuerst `FAIL` groß auf der Top-Karte, das Fail-Icon auf der Insel und den Ring dunkelrot; Taps starten erst nach `ResultBanner.breath` (1,2 s) die nächste Schicht (`ResultBanner.breathes/lock`, `RingSignals.dusk` in `present/hud.ts`).
- **Leise Hilfe (Leo, 18.10.2026):** Nur Karriere-Schichten: nach Niederlagen mehr Luft (`forEase`, trägt `assisted`). Nie zusätzlicher Druck, nie in Daily/Unlimited/Trial/Versus. Remote-Tuning nie für Vergleichbares. → [DECISIONS.md](DECISIONS.md)
- **Nur zeigen, was erreicht ist (Leo, 12.10.2026):** Gesperrte Bereiche sind unsichtbar (`Unlocks.isKnown`). Neue freischaltbare Bereiche gleich so bauen. → [DECISIONS.md](DECISIONS.md)
- **Einleitungs-Drawer (Leo, 12.10.2026):** Jeder nicht selbstverständliche Ort, Tab, Segment und jedes Feature bekommt einen Erklärungsdrawer (`INTROS`, `HINTS`, `Intros.known`, `S.intro`, `IntroArt`, `introHere`). → [DECISIONS.md](DECISIONS.md)
- **Wenige Meldungen (Leo, 12.10.2026):** Notice-Pille nur für Absagen, Warnungen und Belohnung mit Grund. Was die UI schon zeigt, bekommt keine Zeile; dieselbe Sache nie über zwei Kanäle. → [DECISIONS.md](DECISIONS.md)
- **Späte Inhalte hängen an den Prestige-Rängen (Leo, 18.10.2026):** Späte Inhalte an Prestige-Ränge hängen (`bossesPerRank`, `oversizePrestige` …), nicht an Level über 50. → [DECISIONS.md](DECISIONS.md)
- **Gestrichen am 18.10.2026 (Leo): Mutator des Tages, Chill-Modus, Ruhmeshalle zum Kaufen:** Gestrichen: Mutator des Tages, Chill-Modus, Ruhmeshalle. Sync-Code bleibt geheim und getrennt vom Freundescode. → [DECISIONS.md](DECISIONS.md)
- **Animierte Icons (Leo, 20.10.2026):** Jedes DOM-Icon aus `ui/animatedIcons.ts` (`animatedIcon('<id>')`), nie nackte Pfade oder Emoji. Fehlendes nach `Web/ICONS.md` zeichnen. → [DECISIONS.md](DECISIONS.md)
- **Fahrzeugfarben sind Spielinformation** und für die UI tabu; Fahrzeugtypen sind über
  Form, Farbe und Symbol erkennbar.
- **Casino statt Store (Leo, 28.09.2026):** Seit 29.10.2026 heißt es **sichtbar „Arcade“** (alle 8 Sprachen, Patch Notes, Ranglistentitel „Arcade profit“), damit es nicht wie ein echtes Casino wirkt; Code, IDs, Speicherfelder, Analytics und Dokumente sagen weiter `casino`/Casino. Der Shop hat Chests · Collection · Casino (Crash, Slots,
  Skin-Upgrade, Doppelt oder nichts; `core/casino.ts`). Der Store ist entfernt. **Solange das Casino
  existiert, gibt es keine kaufbare Währung und keine Truhen gegen Echtgeld.** Chancen bleiben sichtbar
  und ehrlich (LOOT.md, Casino); `npm run sim:casino` prüft die Rückzahlquoten.
- **Der Club (Leo, 10.10.2026), Geldsenken für große Kontostände::** Social-Segment ab Level 50: Auktionshaus, Game Fund, Diamond Chest, High-Roller-Tisch. Geldsenken, nie ein Vorteil auf der Straße. → [DECISIONS.md](DECISIONS.md)
- **Die Mafia (Leo, 11.10.2026), ein Segment des Social-Tabs:** Social-Segment ab dem ersten Boss: Kredite per Zeiger-Balken, Frist in Echtzeit, Sanktionen nur bei Verzug, Schuld nach 14 Tagen abgeschrieben. Nicht in CrazyGames. → [DECISIONS.md](DECISIONS.md)
- **Auto-Formen (Leo, 10.10.2026):** Skins mit eigener Karosserie (`present/carModels.ts`). Form bleibt im Rechteck der Kapsel-Hitbox; neue Form braucht Umriss, Teile, Lampen, Details. → [DECISIONS.md](DECISIONS.md)
- **Crashes sind echte Physik** (`Web/src/core/crash.ts`, `drivers.ts`): Stoß-Impuls,
  Reifenreibung, reagierender Verkehr, Blechschaden. Keine geskripteten Animationen.


## Befehle

```powershell
cd Web; npm install                     # einmalig
cd Web; npm run dev                     # Entwickeln: http://localhost:5050 (auch vom Handy im WLAN)
cd Web; npm run build                   # Typecheck + Build nach Web/dist
cd Web; npm run preview                 # Build lokal ausliefern, Port 5050
cd Web; npm test                        # Tests: Replays, Spielstände, Meldungen (node:test)
cd Web; npm run e2e                     # Browser-Minitests (Playwright, installiertes Chrome, Handy 360 px, Port 5055, API gemockt)
cd Web; npm run sim -- 60 5             # Balancing-Bots: Schichten, Level
cd Web; npm run sim:casino              # Casino: Rückzahlquoten, faire Münze, Determinismus
cd Web; npm run sim:auction             # Auktionshaus: wie oft welches Limit gewinnt, was ein Zuschlag kostet
cd Web; npm run sim:wedding -- 40 100   # Hochzeitskorso: Fluss mit und ohne (Abstürze, Dauer, Bots auf dem Ring)
cd Web; npm run sim:career -- 60        # Ganze Karriere bis Level 60: Spielzeit, Geld, Upgrades
cd Server; npm install                  # einmalig
cd Server; npm run dev                  # Ranglisten-Dienst: http://localhost:5051
cd Server; npm test                     # Tests des Dienstes (Namen, Anmeldung, Ranglisten, Admin)
docker build -t car-game . ; docker run -p 5050:5050 car-game   # Container wie in Coolify
```

## Arbeitsweise

- **Browser-Tests über die Probe (Leo, 16.10.2026):** Das Spiel wird im Dev-Server mit `window.__probe` getestet (`Web/src/ui/devProbe.ts`, Web/README.md „Checking the game without screenshots“), über Playwright `browser_evaluate` auf `http://localhost:5050/?demo&level=N` oder als `npm run e2e`-Test: `play('careful')` spielt eine Schicht in rund 0,5 s, `state()` liefert Bildschirm, Ergebnis und DOM-Text als wenige Zeilen JSON. **Screenshots und DOM-Snapshots nur für echte Optik-Fragen** (Layout, Politur, ein sichtbarer Fehler), nie, um Ablauf, Zustand oder Ergebnis zu prüfen. Fehlt der Probe etwas, das man sonst per Screenshot nachsehen müsste, die Probe erweitern statt Bilder zu machen. Balancing bleibt `npm run sim`. CLI-Anything ist für dieses Canvas-Spiel nicht geeignet.
- Neues Spielsystem: zuerst in `Web/src/core/`, mit dem Balancing-Bot prüfen
  (`npm run sim`: der vorsichtige Bot darf nie crashen), dann darstellen
  (`present/`, `ui/`), dann im Browser spielen – auch auf einem echten Handy.
- Alle Tuning-Werte stehen in `Web/src/core/config.ts`.
- **Frontend-Übergänge (Leo, 21.10.2026):** Bei jeder Arbeit an Übergängen, Animationen oder Motion im Frontend (Öffnen/Schließen, Seitenwechsel, Toasts, Tooltips, Ladezustände, Hover, Icon-Wechsel, Texte, Zahlen) zuerst den installierten Skill `transitions-dev` laden; für das Feintuning bestehender Bewegung `transitions-polish`, für „KI baut die Oberfläche“-Effekte `transitions-ui-generation`. Die Motion-Tokens und Regeln der Skills gelten neben [DESIGN-LANGUAGE.md](DESIGN-LANGUAGE.md) und den Motion-Regeln in FOUNDATION.md; bei Widerspruch gewinnt das Spiel (Haptik, Physik, Lesbarkeit). Die Skills liegen in `.agents/skills/` (Installation: `npx skills add Jakubantalik/transitions.dev`).
- **Marketing-Skills (Leo, 22.10.2026):** Bei Marketing-Aufgaben den passenden Skill aus `~/.claude/skills/` laden. Feste Entscheidungen gewinnen bei Widerspruch. → [DECISIONS.md](DECISIONS.md)
- **Museum wächst mit (Leo, 28.09.2026):** Katalog in `core/museum.ts` folgt den Inhaltslisten. Neuer Boss, Fahrzeug, Wetter oder Ereignis braucht Level, Text (`museumText.ts`) und Bild (`present/museum.ts`), sonst bricht der Build. → [DECISIONS.md](DECISIONS.md)
- **Patch Notes (Leo, 29.09.2026):** Jede Neuerung und jeder spürbare Bugfix in `Web/src/present/patchNotes.ts` (Englisch, ein Eintrag pro Tag, `summary` ≤ 4 Zeilen à ≤ 100 Zeichen, `items` lang). `npm test` prüft. → [DECISIONS.md](DECISIONS.md)
- **Website-Inhalte aus dem Spiel (Leo, 03.10.2026):** timing.love/changelog, /museum und die
  Titel-Namen auf /ranks entstehen aus den Quellen des Spiels (`npm run content` im Website-Repo
  liest `patchNotes.ts`, `strings.ts`, `core/museum.ts`, nichts wird hier geschrieben). Nach einem
  neuen Patch-Notes-Eintrag, Boss oder Wetter dort einmal ausführen und die JSON-Dateien committen.
- **Name (Leo, 30.09.2026):** Das Spiel heißt **Roundabout Timing** (kurz RAT); „Car Game“ ist nur noch der Ordner- und Repo-Name.
- **CrazyGames (Leo, 30.09.2026):** Eingebettet über die normale URL mit `?crazygames`, kein eigener Build, kein Upload. Nur dann lädt das SDK und speichert über das Data Module (Web/README.md, CrazyGames).
- **Google Play (Leo, 02.10.2026):** Trusted Web Activity auf `/?googleplaystore`, kein eigener Build. `inPlayStore` (`storage/device.ts`) blendet Installieren und den CrazyGames-Link aus; `public/.well-known/assetlinks.json` verknüpft App und Seite (Web/README.md, Google Play).
  **Neuer App-Build gesammelt (Leo, 08.10.2026):** Braucht eine Änderung einen neuen Build der Android-Hülle (Wrapper-Option, Name, Icon, Manifest-`shortcuts`, Berechtigung), kommt sie als Punkt in [NEW-PLAYSTORE-BUILD.md](NEW-PLAYSTORE-BUILD.md); Leo baut, wenn genug zusammen ist.
- **Rechtliches:** Datenschutz und Impressum in `Web/src/present/legal.ts` (Settings → Legal, `/privacy`, `/imprint`). Neuer Dienst, der Daten bekommt (Werbung, Analyse, Server) = Absatz dort und neues `LEGAL_UPDATED`.
- Vor jedem Commit: `npm test` und `npm run build` müssen grün sein (in `Web/`, und in `Server/` `npm test` und `npm run typecheck`, wenn er berührt wurde).
- Das Icon-Original liegt in `Web/icon/` (`python Web/icon/make_pwa_icons.py` erzeugt daraus die PWA-Icons; Quelle: `Marketing/AppIcon-1d.svg`).
- Die Casino-Klänge entstehen in `Web/audio-src/make_casino_sounds.py` (numpy, scipy, ffmpeg)
  und landen als `.m4a` in `Web/public/audio/sounds/`.


## Code Quality & Style Guidelines

- **Engineering for feel is wanted (Leo, 16.10.2026):** Over-engineering in the way Apple and iOS do it is welcome wherever the player feels it: physics-based scrolling, rubber-banding, spring motion, haptics, matched timing, details nobody names but everybody notices. Spend effort there. The limit is the player, not the code: never overwhelm them with options, messages, motion or information (see "Wenige Meldungen", PRODUCT.md "Design Idea"). The rule below targets code that serves nobody: needless layers, wrappers, config and boilerplate.
- No AI Chatter or Needless Abstraction: Write lean, direct code. Avoid unnecessary abstraction layers, wrapper functions, or redundant boilerplate.
- Prefer Native Standards: Do not add dependencies for simple operations. Use native language features instead of external utility libraries.
- Minimal, Meaningful Comments: Write self-documenting code. Do not write line-by-line explanatory comments or state the obvious.
- Clean Naming & Strict Types: Use concise, idiomatic variable names. Avoid overly verbose LLM naming styles. Enforce strict typing (no `any` or loose fallbacks).
- Idiomatic Architecture: Respect the modern conventions of the current framework/language. Keep files focused, modular, and single-purpose.
- Robust Error Handling: Never catch errors just to `console.log` them. Handle edge cases explicitly or let errors bubble up correctly.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
