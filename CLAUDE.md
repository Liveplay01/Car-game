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
- **Spielsprachen: Englisch, Deutsch, Spanisch, Französisch und Italienisch (Leo, 12.10.2026).** Texte stehen in `present/strings.ts` (`S`, Englisch) und `present/lang/<code>.ts` (Übersetzung, legt sich beim Start über `S`); Wahl in Settings → Play → Language (`present/i18n.ts`, startet das Spiel neu). Nichts Sichtbares fest in den Code schreiben, immer nach `S`; eine neue Sprache = Eintrag in `LANGUAGES` und `TRANSLATIONS`. Für neue Sprachen gibt es das Hilfsskript `scripts/translate.mjs`. Englisch bleiben Patch Notes, Rechtstexte, Skin-Namen und Texte vom Server. Die Projektdokumente sind auf Deutsch.
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
- **Website-Daten (Leo, 15.10.2026):** Wie `/changelog.json` schreibt das Spiel bei jedem Build `/data/*.json` (`present/siteData.ts`, `present/svg.ts`, Plugin `siteDataApi`, CORS in `nginx.conf`): Museum, Collection (Skins, Maps, Truhen mit Chancen), Trials und Titel, Zählungen, dazu die Spielgrafik als SVG und ein `index.json` mit Fingerabdruck je Datei. Die Website (timing.love) liest sie live und holt nur, was sich geändert hat; neue Inhalte erscheinen dort mit dem nächsten Deployment des Spiels. Die Form ist öffentlich: Felder ergänzen, nie umbenennen. Web/README.md, „Site data API“.
- **Analytics (Leo, 07.10.2026):** Das Spiel zählt Besuche mit **Umami** auf Leos eigener Instanz (`analytics.kestrel.nrw`, `ui/analytics.ts`): ohne Cookie, ohne ID, nur auf der normalen Seite und in der Play-App (nie CrazyGames oder itch.io), nicht bei Do Not Track, ohne Wirkung aufs Spiel, wenn blockiert. Ereignisse (Leo, 09.10.2026, Wiederkehr messen): `tutorial-done`, `shift` (Modus, Level, Ausgang, Daily, Nummer), `special`, `visit` (je Start: neu/zurück, Tage seit dem letzten Besuch und seit dem ersten in groben Stufen, Kanal, Build; auf dem Gerät aus dem Spielstand abgeleitet, `firstDay`, kein Datum, keine ID, D1/D7 als Näherung), `push` (Angebot, Zusage), `install`, `today-open` (Progress → Today geöffnet, `daily` = Daily noch offen), `ad` (Anzeigen-Schritt, Leo 16.10.2026: `reward` = chest/upgrade/boost/rescue/freeze/double/retry, `step` = offer/ask/watched oder warum nicht; ohne Namen und Spielstand), `invite-open`, `challenge-open`, gemeldet über `GameSession.onStep`/`track` (Ereignisse vor dem Laden des Skripts warten in einer Schlange); neue Ereignisse tragen nie Namen, Codes oder Spielstand. Datenschutzerklärung („Visit statistics“) und CSP in `nginx.conf` nennen den Dienst; „no tracking“ gilt nicht mehr. Kein zweites Analytics-System bauen.
- **Spielerkonto (Leo, 15.10.2026):** Ein Name ist „Dein Spieler“ (`ui/accountSheet.ts`): Ranglisten-Konto, Freundescode, Multiplayer-Name und Cloud-Sync entstehen in einem Schritt; der Browser wird gebeten, Name und Sync-Code wie Benutzername und Passwort zu speichern. **Freunde und Club brauchen den Spieler** (`SocialView`, `accountReady`), die Mafia nicht (ein Kredit muss immer zurückzahlbar bleiben); **Ranglisten sind ohne Spieler lesbar** (Leo, 16.10.2026), mitmachen heißt „Create my player“. Kein Sheet öffnet sich von selbst beim Betreten des Social-Tabs. Gefragt wird einmal nach Level 5 oder nach einem Prestige (`accountPromptAfterLevel`), „Nein danke“ nur mit zweiter Bestätigung (Hint `account`). Wer schon einen Namen hatte, bekommt Cloud-Sync automatisch und eine Meldung mit dem Code (nicht auf Geräten, die Sync bewusst beendet haben). Kein zweites Pop-up für Cloud-Sync bauen.
- **Benachrichtigungen (Leo, 08.10.2026):** Web Push über den Ranglisten-Dienst (`Server/src/modules/push`, VAPID-Schlüssel per
  `npm run vapid`; Spiel: `net/push.ts`, Schalter in Settings, Angebot nach der ersten gewonnenen Schicht (Grund: die Gratis-Truhe von morgen) und erneut ab einer Daily-Streak von 2, Leo 09.10.2026; „Not now“ kostet nichts, nur „Turn on“ fragt den Browser). **Nur Wichtiges:**
  Streak, im Top 20 überholt, Gratis-Truhe (Geschenk, Einladung), neuer Season Pass, Rückkehr-Stupser nach 3/7/14/30 Tagen. Höchstens
  eine pro 20 Stunden (die Streak darf dazukommen), nie zwischen 21 und 9 Uhr Ortszeit. Keine Werbung, keine Casino- oder Kauf-Hinweise
  per Benachrichtigung. Web/README.md, „Notifications“.
- **Freiwillige Werbung (Leo, 05.10.2026):** Die einzige Werbung im Spiel sind **Rewarded Ads**, immer auf Tap und nur bezahlt, wenn sie zu Ende gesehen wurde: Gratis-Standard-Truhe (3/Tag), ein Gratis-Schritt eines vom Spiel gezogenen Upgrades (1/Tag) und +10 Prozentpunkte Chance auf die nächste Runde des Skin-Upgrades (3/Tag, `upgradeAdBoost`, im Rad sichtbar). **Die beiden neuen nur auf der normalen Seite und in der Google-Play-App, nie auf CrazyGames** (dort nur die Truhe, deren SDK). Echte Werbung über Googles Ad Placement API (`ui/ads.ts`, `present/adFlow.ts`), eingeschaltet mit dem Build-Arg `VITE_REWARDED_ADS=1`, sobald das AdSense-Konto für H5 Games Ads freigegeben ist; bis dahin läuft die Platzhalter-Werbung. Keine Pflicht-, Midgame- oder Banner-Werbung. Details: Web/README.md, „Rewarded ads“.
- **Streak-Anzeigen und Schlüsselmomente (Leo, 16.10.2026):** Drei weitere Rewarded Ads auf der Game-Seite, immer auf Tap, nur auf der normalen Seite und in der Play-App, und nur, wenn eine Anzeige bereit ist (`AdPill`, `present/adPill.ts`, `GameSession.gameAd`): eine gerissene Daily-Serie ab 3 Tagen zurückholen (höchstens 7 verpasste Tage, einmal in 7 Tagen, `Careers.adRescue`), ein Streak Freeze in den letzten Stunden vor dem Riss (einmal am Tag), den Lohn der Daily-Schicht auf der Ergebnis-Karte verdoppeln (einmal am Tag) und **eine verlorene Daily noch einmal spielen** (einmal am Tag, `Careers.adRetryOpen`, gleiche Stadt und gleicher Seed, die Serie zählt nur einmal; die Daily-Rangliste zeigt „2 tries“ über `meta.tries`, `Server/src/modules/leaderboard/boards.ts`). Werte in `config.ts` (`streakRescue*`). Dazu bekommen **nur drei Momente** die große Vollbild-Inszenierung `present/rewardBurst.ts` (nicht blockierend): die erste gewonnene Schicht, Level 5 geschafft, ein Serien-Meilenstein (`GameSession.momentOf`), außerdem die Belohnungen der Anzeigen. Nicht noch mehr Momente dazunehmen, sonst hebt sich keiner mehr ab. Entwickeln ohne AdSense-Freigabe: `npm run dev`, dann `?adfake` (Pseudo-Anzeige von 2 s, nur im Dev-Build).
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
- **Native App-Anmutung im Browser:** Tab-Bar als schwebendes, rundes Dock (Leo, 16.10.2026; höchstens 440 px breit, `--tabbar-h`) (Progress · Social · Game · Shop · Build), gruppierte
  Listen, Sheets, Schalter, Segmented Controls, wie man sie von iOS kennt. Eigenes Design
  nur für die Spielszene. Glas-Effekt nur für schwebende Bedienelemente über der Szene.
  **Social-Tab (Leo, 10.10.2026):** Friends, Ranks und Club sind eine Seite der Tab-Bar (`present/social.ts` zeichnet Titel und Segmente, `ui/socialPage.ts` hostet die Inhalte als DOM: `friendsPanel`, `ranksPanel`, `clubPanel`). Keine Friends-Pille über dem Spiel, keine Club-Karte im Shop, keine Schubladen dafür. Neue soziale Funktionen kommen als Block oder Segment dorthin. **Sortierung (Leo, 10.10.2026):** Progress = Today · Trials · Goals · Records · Museum (nach dem, was sie vom Spieler verlangen), Shop = Chests · Collection · Casino, Build = Upgrades (unter Police · Money · Driving) · Street Builder, Settings = Play · Account · About. Neues dorthin sortieren, wo es hingehört, nicht in die nächstbeste Liste.
- **Sanfter Einstieg (Leo, 12.10.2026):** Die ersten Karriere-Level bringen je eine Sache (`forIntro` in `core/levels.ts`, Werte `policeLevel`/`criminalLevel`/`transporterLevel` in `config.ts`): Level 1 nur Lücken und Merges, Level 2 Polizei mit Dispatch, Level 3 Verbrecher, Level 4 Geldtransporter, Level 5 Tanker, Stadtereignisse ab 6. Gilt nur für Karriere-Schichten und nur ohne Prestige; Unlimited, Chill, Mayhem und Trials bleiben unberührt. Neue Mechaniken gehören in diese Leiter, nicht auf Level 1–5 dazu.
- **Fail-Pause (Leo, 12.10.2026):** Eine verlorene Schicht (Karriere, Unlimited, Challenge und Trial; keine Detonation; Chill und Mayhem kennen kein Verlieren) zeigt zuerst `FAIL` groß auf der Top-Karte, das Fail-Icon auf der Insel und den Ring dunkelrot; Taps starten erst nach `ResultBanner.breath` (1,2 s) die nächste Schicht (`ResultBanner.breathes/lock`, `RingSignals.dusk` in `present/hud.ts`).
- **Nur zeigen, was erreicht ist (Leo, 12.10.2026):** Gesperrte Bereiche sind nicht zu sehen, auch nicht abgedunkelt: das Casino-Segment im Shop, Club und Mafia im Social-Tab, die Trials und die Karten für Daily und Season Pass in Progress erscheinen mit der Freischaltung (`Unlocks.isKnown`, `ShopPage.sections`, `SocialPage.sections`, `ProgressPage.sections`). Wer sie schon hatte, behält sie; ein Mafia-Kredit im Verzug sperrt das Casino nur (abgedunkelt, nicht versteckt). Neue freischaltbare Bereiche gleich so bauen.
- **Einleitungs-Drawer (Leo, 12.10.2026):** Jeder Ort und jedes Feature erklärt sich einmal selbst (`present/intros.ts`, Liste `INTROS`: Museum, Street Builder, Daily, Trials, Season Pass, Casino, Club, Game fund, Mafia; Texte in `S.intro`, Bild in `present/introArt.ts`). Sobald erreicht, bekommt es einen Punkt an Tab und Segment; beim ersten Öffnen kommt das Detail-Sheet von selbst (`GameSession.watchIntro`). Gesehen = Hint `intro.<name>` im Spielstand; ein Spielstand, der schon gespielt hat, gilt als informiert (`Intros.start`). **Regel (Leo, 12.10.2026): Jede Seite, jedes Segment und jeder Tab, der nicht selbstverständlich ist, bekommt einen Erklärungsdrawer.** Neuer Ort oder neues Feature = Eintrag in `INTROS`, `HINTS` (`intro.<name>`, `core/career.ts`), `Intros.known`, `S.intro`, `IntroArt` und `introHere` in der Session. Ein Tab innerhalb eines DOM-Panels (Club: Game fund) meldet sich stattdessen beim Öffnen über den Host (`GameSession.introduce`).
- **Wenige Meldungen (Leo, 12.10.2026):** Die Notice-Pille (`NoticeQueue`, `announce`/`showNotice`) sagt nur, was nichts anderes auf dem Bildschirm schon zeigt: eine Absage („Not enough money“), eine Warnung oder eine Belohnung samt Grund. Alles, was Punkt, Pille, Knopf, Animation oder Ergebniskarte schon zeigen (Gebautes, Gekauftes, Freigeschaltetes, Gespeichertes), bekommt keine Zeile. Ein Zustand, der nur „es hat geklappt“ heißt, wird ein Zeichen am Element: Cloud-Sync lässt die Settings-Pille kurz grün „Synced“ sagen (`Shell.flashSynced`, `GameSession.onSynced`). Dieselbe Sache nie über zwei Kanäle (Pille, Tip, Drawer, Dialog) melden.
- **Fahrzeugfarben sind Spielinformation** und für die UI tabu; Fahrzeugtypen sind über
  Form, Farbe und Symbol erkennbar.
- **Casino statt Store (Leo, 28.09.2026):** Der Shop hat Chests · Collection · Casino (Crash, Slots,
  Skin-Upgrade, Doppelt oder nichts; `core/casino.ts`). Der Store ist entfernt. **Solange das Casino
  existiert, gibt es keine kaufbare Währung und keine Truhen gegen Echtgeld.** Chancen bleiben sichtbar
  und ehrlich (LOOT.md, Casino); `npm run sim:casino` prüft die Rückzahlquoten.
- **Der Club (Leo, 10.10.2026), Geldsenken für große Kontostände:** Ab der Elite-Leiste (Level 50) hat der Social-Tab das Segment „Club“ (`ui/clubPanel.ts`): **Auktionshaus** (drei Lose am Tag gegen computergesteuerte Sammler, meist Haie, die den Preis weit über die Schätzung treiben; Zuschlag plus 10 % Aufgeld, Weggehen ist gratis; sechs Skins, die es nur dort gibt; `core/auction.ts`, `npm run sim:auction`), **Game Fund** (Leo, 12.10.2026, ersetzt den Stadtfonds; Segment „Game fund“ des Clubs): Spieler schlagen vor, was das Spiel bekommen soll; Leo formuliert im Admin-Panel um und veröffentlicht (auch die Ideen aus „Build with us“ landen dort); alle geben Geld, bei 30.000.000 wird die Idee umgesetzt (`net/ideas.ts`, `core/fund.ts` für die Spendenbeträge, Server-Modul `Server/src/modules/ideas`, die Spenden liegen in `fund_gifts` als `idea:<id>`). Die alten Fund-Skins (Fountain, Lighthouse, Sky Bridge) bleiben bei denen, die sie haben, und werden nicht mehr vergeben; `Server/src/modules/fund` bleibt für alte Clients bestehen, `/v1/fund` wird vom Spiel nicht mehr aufgerufen), **Verträge** (Geld auf eine Perfect Run der nächsten Karriere-Schicht, `core/contracts.ts`). Dazu die **Diamond Chest** (250.000, nie ein Common) und der **High-Roller-Tisch** im Casino (ab 200.000 größere Einsätze, gleiche Chancen). Die Sammler sind auf dem Bildschirm als Computer benannt, die Chancen stehen daneben; nie ein Vorteil auf der Straße, nur Aussehen. Siehe LOOT.md, „Der Club“.
- **Die Mafia (Leo, 11.10.2026), ein Segment des Social-Tabs** (`core/mafia.ts`, `ui/mafiaPanel.ts`; Friends · Ranks · Club · Mafia): offen ab dem ersten besiegten Boss (Level 15). Sie verleiht Geld (drei Beträge nach dem Level, ein Kredit zugleich); der Deal wird auf einem **Zeiger-Balken** ausgehandelt (Tap hält den Zeiger an, schneller bei größerem Betrag, grüne Zone, die Mitte ist Perfect: weniger Zins, mehr Tage). Jeder pünktlich zurückgezahlte Kredit macht den nächsten günstiger und die grüne Zone breiter (`cleanLoans`), **keine eigene Einheit wie „Respect“**. Die Frist läuft in **Echtzeit**, `loan.seen` verhindert Zurückdrehen der Uhr; Briefe des Dons kommen zu 50 %, 24 h und bei Ablauf. **Solange die Frist läuft, gibt es keine Sanktion**, nur keinen zweiten Kredit. **Überfällig:** die Schuld wächst täglich (gedeckelt), 25 % jeder Schicht-Auszahlung gehen an die Familie (`Mafia.garnish`), in Karriere-Schichten kommen keine Transporter, Verbrecher und Bosse (`Mafia.withoutLoot`, Unlimited/Daily/Trials bleiben unberührt), das Casino ist zu (`Unlocks.isOpen`), und der Name trägt das Mafia-Badge in den Ranglisten (als Titel `mafia` über den bestehenden Titel-Kanal, kein Serverumbau). Dazu (11.10.2026): **Schonfrist** von einem Tag, wenn die Frist unbemerkt ablief (`Mafia.returned`); nach **14 Tagen Verzug schreibt die Familie die Schuld ab** und nimmt 14 Tage keine Anrufe an (`mafiaBan`), so bleibt nie ein unlösbarer Kredit; **Steady hand** (langsamerer Zeiger, kein Perfect); nicht in CrazyGames; Dev-Konsole `mafiaDebug` (`ui/mafiaDebug.ts`). Nicht gebaut: beschlagnahmte Skins, Eintreiber auf der Straße, Push-Benachrichtigung (bräuchte einen neuen Grund in `net/push.ts`).
- **Auto-Formen (Leo, 10.10.2026):** Skins können eine eigene Karosserie mitbringen (`present/carModels.ts`, `Skins.model`; LOOT.md, „Auto-Formen“): Beetle (die Bug Hunters, nur über Bug-Reports), Pocket, GT Coupé, Roadster, Jeep, Hot Rod. Nur normale Autos tragen sie. **Jede Form bleibt im Rechteck des normalen Autos und folgt der Kapsel-Hitbox**, damit Optik und Kollision übereinstimmen (kein Geisterunfall); `npm test` prüft Umriss, Teile und Lampen. Eine neue Form braucht Umriss, Teile, Lampen und Details dort.
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
- **Museum wächst mit (Leo, 28.09.2026):** Der Katalog in `core/museum.ts` folgt den Inhaltslisten
  (`BOSS_KINDS`, Fahrzeugtypen, `WEATHERS`, `CITY_EVENTS`, Dunkelheit). Neuer Boss, neues
  Spezialfahrzeug, neues Wetter oder Ereignis erscheint dort automatisch; der Build bricht ab,
  bis Level (`core/museum.ts`), Text (`present/museumText.ts`, `*_TEXT`) und Bild/Farbe
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
  `npm test` prüft: eine `id` pro Tag, neueste zuerst.
  **Kurzfassung und Langfassung (Leo, 09.10.2026):** Jeder Tag hat zwei Teile. `summary` ist die
  Mini-Zusammenfassung, die Spieler sofort sehen: 1 bis 4 kurze Zeilen (höchstens 100 Zeichen,
  `SUMMARY_LINES`, `SUMMARY_LENGTH`), nur was Spieler merken, ohne Technik und ohne Kleinkram.
  `items` bleibt die lange, ausführliche Liste; sie klappt unter der Kurzfassung auf
  („All changes · n“, zu bis zum Tippen). Jede neue Änderung kommt wie bisher oben in `items`;
  ist sie wichtig, kommt zusätzlich eine Zeile oben in `summary` (die unwichtigste fliegt raus,
  wenn es mehr als vier werden). Reine Fixes und Politur gehören nur in `items`. Die Zeilen der
  `summary` dürfen wie `items` `{ text, from }` sein. `changelog.json` trägt beides
  (`summary` und `items`, Felder nur ergänzen, nie umbenennen); die Website kann die Kurzfassung
  zeigen und die lange Liste aufklappen. `npm test` prüft Länge und Anzahl.
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
  **Neuer App-Build gesammelt (Leo, 08.10.2026):** Braucht eine Änderung einen neuen Build der Android-Hülle (Wrapper-Option, Name, Icon, Manifest-`shortcuts`, Berechtigung), kommt sie als Punkt in [NEW-PLAYSTORE-BUILD.md](NEW-PLAYSTORE-BUILD.md); Leo baut, wenn genug zusammen ist.
- **Rechtliches:** Datenschutz und Impressum in `Web/src/present/legal.ts` (Settings → Legal, `/privacy`, `/imprint`). Neuer Dienst, der Daten bekommt (Werbung, Analyse, Server) = Absatz dort und neues `LEGAL_UPDATED`.
- Vor jedem Commit: `npm test` und `npm run build` müssen grün sein (in `Web/`, und in `Server/` `npm test` und `npm run typecheck`, wenn er berührt wurde).
- Das Icon-Original liegt in `Web/icon/` (`python Web/icon/make_icon.py`).
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
