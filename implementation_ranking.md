# Implementation Ranking: Research.md gegen den Spielstand

Stand: 17.10.2026 · Grundlage: `Research.md` (10 Muster), Spiel.md, LOOT.md, IDEA.md, DESIGN-LANGUAGE.md, CLAUDE.md, Code in `Web/src/` und Umami-Daten vom 09.10. bis 17.10.2026 (ohne Kanal `play`, also ohne die Tester des geschlossenen Play-Tests).

---

## 1. Zusammenfassung des Abgleichs

### Wo das Spiel steht

Roundabout Timing hat bereits **7 der 10 Muster ganz oder teilweise eingebaut**, meist in einer offenen Form mit sichtbaren Chancen, fest gesäten Ergebnissen und ohne Echtgeld. Für ein Spiel dieser Größe ist die Retention-Mechanik ungewöhnlich vollständig: Daily mit Streak, Freezes und Rettung per Werbung, Quests, Weekly, Touren, Season Pass, Pity, Push, Einladungen, Mafia-Fristen in Echtzeit. Was fehlt, liegt fast ausschließlich bei der **Monetarisierung** und bei **sozialen Schleifen, die erst mit mehr Spielern wirken**.

| # | Muster aus Research.md | Im Spiel | Wo |
| --- | --- | --- | --- |
| 1 | DDA / EOMM | **Teilweise, offen:** Erleichterung nach 3 Niederlagen, erster Regen und erste Nacht garantiert, Schild, Tailwind nach knappem Verlust; Heat als umgekehrte DDA (schwerer, dafür mehr Lohn). Keine verdeckte, auf Abwanderung zielende Steuerung | `easeAfterLosses`, `tailwind*`, `heat*` in `core/config.ts` |
| 2 | Pacing Gates / Appointment | **Termine ja, Sperren nein:** Daily, Quests, Weekly, Gratis-Truhe für morgen, Tageslimits für Werbung, Auktion mit drei Losen am Tag, Mafia-Frist in Echtzeit. Keine Energie, keine Bauzeiten | `core/daily.ts`, `core/weekly.ts`, `core/mafia.ts` |
| 3 | Currency Decoupling | **Nein.** Eine Spielwährung, kein Echtgeld (Casino-Regel) | CLAUDE.md, „Casino statt Store“ |
| 4 | Pity / dynamische Drops | **Pity offen sichtbar** (Epic nach 10, Legendary nach 40), Klopfkraft als Kontrollgefühl (+10 % auf Chancen über Common, ausgewiesen), Classic 1 zu 500, Werbe-Boost im Skin-Upgrade. Keine persönlichen oder versteckten Raten | `core/loot.ts`, LOOT.md |
| 5 | Near-Miss / LDW | **Ja, in der Truhe:** In 70 % der Walzen ohne Legendary steht eine Legendary-Karte direkt neben dem Gewinn (`chestTeaserChance: 0.7`, `core/loot.ts:373`). Das Casino schließt Near-Miss und LDW ausdrücklich aus | `core/config.ts:871`, DESIGN-LANGUAGE.md |
| 6 | Social Pressure | **Teilweise:** Freunde-Board, Push „überholt“, Einladung mit Truhe für beide (Reziprozität), Game Fund (gemeinsames Ziel), öffentliche Marker: Mafia-Badge bei Verzug, „2 tries“ in der Daily-Rangliste. Keine Gilden | `Server/src/modules/*`, `core/mafia.ts` |
| 7 | Anchoring / Decoy | **Ansatzweise:** Diamond Chest (250.000) als Anker, Auktion mit Schätzpreis und Hai-Bietern, High-Roller-Tisch. Kein rotierendes Angebot, keine Bundles | `core/auction.ts`, `diamondChestPrice` |
| 8 | FOMO / Battle Pass | **Ja, abgefedert:** Season Pass für 150.000 Spielgeld, Strecke schließt mit der Saison, Skins kommen jedes Jahr wieder; Touren mit Termin; Saison-Item in der Event Chest. Keine Gratis-Strecke | `core/seasonPass.ts`, `core/tours.ts` |
| 9 | Dark UX / versehentliche Käufe | **Nein.** Nichts zu kaufen; Löschen und Prestige fragen zweimal | DESIGN-LANGUAGE.md |
| 10 | Sunk Cost / Progress Decay | **Ja, fast vollständig nach Duolingo-Muster:** Streak mit Bonus (+15 % ab Tag 3), Heat hängt an der Streak und fällt mit ihr, Freeze verdient oder per Werbung, Rettung per Werbung, Mafia-Verzug mit Pfändung, Sperren und Badge | `core/career.ts`, `core/heat.ts`, `core/mafia.ts` |

### Was die Daten sagen (Umami, 09.–17.10.2026, ohne Play-Tester)

- **55 neue Besuche in 9 Tagen** (49 Browser-Tab, 6 installierte App) gegenüber 643 wiederkehrenden. Das Spiel hat eine kleine, treue Basis und **fast keinen Zulauf**.
- **0 Anzeigen-Ereignisse.** Kein Spieler hat ein Werbe-Angebot gesehen; seit dem 16.10. blenden sich Angebote ohne bereite Anzeige aus. `VITE_REWARDED_ADS` ist im `Dockerfile` leer. **Damit bringen alle sieben gebauten Werbe-Plätze heute nichts ein.**
- Grobe D1-Näherung: 6 Besuche mit „erster Besuch gestern“ auf 55 Neue, etwa 11 %. Bei dieser Menge ist das Rauschen, keine Messung.
- **Unlimited ist 26 % aller Schichten** (1.194 von 4.526), Shift 73 %, Chill und Mayhem unter 1 %.
- Die Daily gelingt in 37 % der Fälle (46 von 123). Die neue Wiederholung per Werbung hätte also bei fast zwei von drei Dailies einen Anlass.
- Push: 39 Angebote beim ersten Mal, 8 Zusagen, 2 vom Browser blockiert.

### Wo das größte ungenutzte Potenzial liegt

1. **Die Monetarisierung ist gebaut, aber abgeschaltet.** Der stärkste Hebel ist kein neues Feature, sondern dass Rewarded Ads überhaupt laufen. Erst dann bekommen die Werbe-Plätze, die Research.md beschreibt (Wiederbelebung, Lohn verdoppeln, Streak-Rettung), einen Wert.
2. **Der Platz mit dem höchsten Umsatz fehlt:** eine Wiederbelebung per Werbung im Moment des Scheiterns, vor allem in Unlimited (Muster 1 und 7 in ihrer Werbe-Form).
3. **Der Season Pass ist für die meisten unerreichbar.** XP gibt es erst nach dem Kauf für 150.000, laut Karriere-Bot (Spiel.md §16) verdient man bis Level 60 insgesamt nur 130.000 bis 150.000. Eine Gratis-Strecke mit rückwirkender Freischaltung ist der Standard der Branche, den das Spiel noch nicht nutzt.
4. **Soziale Muster (6) wirken erst mit Spielerdichte.** Bei rund 6 neuen Spielern am Tag haben Ligen, Teams und Geschenke wenig Masse. Sie gehören nach hinten, bis der Zulauf steigt.
5. **Die verdeckten Muster (1, 3, 4, 5, 9 in ihrer dunklen Form) haben hier kaum Hebel.** Ohne Echtgeld gibt es keinen Kaufmoment, den man ausreizen könnte. Dagegen stehen harte Risiken: AdSense-Sperre, Play-Richtlinien, DSA Art. 25 und UCPD, und das deterministische Spiel (gleicher Seed + gleiche Taps) würde zerbrechen. Diese Punkte stehen im Ranking ganz hinten, mit Begründung aus Sicht von Geschäft und Technik.

---

## 2. Gerankte Liste der Optimierungsmöglichkeiten

### Bewertungslogik

- **Machbarkeit (1–10):** 10 = in Stunden mit vorhandenen Bausteinen, 1 = neues System mit Server, Recht und Balancing.
- **Impact (1–10):** erwartete Wirkung auf Retention, Engagement, Viralität oder Umsatz, **bei der heutigen Spielerzahl**.
- **Größe:** Gering = Tweak an Werten oder Oberfläche · Mittel = neue Mechanik in bestehenden Systemen · Hoch = neues System oder Eingriff in den Core-Loop.
- **Priorität = 0,6 × Impact + 0,4 × Machbarkeit.** Punkte, die einer festen Entscheidung, einer Plattform-Richtlinie oder dem Recht widersprechen, stehen unabhängig vom Wert in einem eigenen Block am Ende (Rang 15–20).

### Übersicht

| Rang | Anpassung | Muster | Machbarkeit | Impact | Größe | Priorität |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Rewarded Ads live schalten | Voraussetzung für 1, 7, 8, 10 | 7 | 10 | Gering | 8,8 |
| 2 | Wiederbelebung per Werbung (Unlimited + Karriere) | 1, 7 | 6 | 8 | Mittel | 7,2 |
| 3 | Schichtlohn verdoppeln per Werbung (Karriere) | 7 | 9 | 6 | Gering | 7,2 |
| 4 | Season Pass: Gratis-Strecke, rückwirkende Freischaltung, XP-Schub | 8 | 7 | 7 | Mittel | 7,0 |
| 5 | Comeback-Truhe mit festen, sichtbaren Chancen | 4, 10 | 8 | 6 | Gering | 6,8 |
| 6 | Schaufenster: tägliche Skins zum Festpreis | 7, 8 | 7 | 6 | Mittel | 6,4 |
| 7 | Pity sichtbar an der Truhe | 4 | 9 | 4 | Gering | 6,0 |
| 8 | Streak: Freeze für Spielgeld, Streak am App-Icon | 10 | 9 | 4 | Gering | 6,0 |
| 9 | Wochen-Liga mit Auf- und Abstieg | 6, 8, 10 | 4 | 7 | Hoch | 5,8 |
| 10 | Feierabend-Fenster (zweiter täglicher Termin) | 2 | 8 | 4 | Gering | 5,6 |
| 11 | Truhenpreise als Anker und Mengenrabatt | 7 | 9 | 3 | Gering | 5,4 |
| 12 | Truhen-Teaser: Entscheidung treffen (erledigt, bleibt) | 5 | 10 | 2 | Gering | 5,2 |
| 13 | Tägliches Geschenk an Freunde | 6 | 5 | 5 | Mittel | 5,0 |
| 14 | Crews mit Wochenziel (ohne Pranger) | 6 | 3 | 6 | Hoch | 4,8 |
| 15 | Casino: Near-Miss und LDW ausbauen | 5 | 8 | 2 | Gering | nicht empfohlen |
| 16 | Premium-Währung / Echtgeld-Pakete | 3, 7 | 2 | 6 | Hoch | blockiert |
| 17 | Pranger und Gruppenzwang ausbauen | 6 | 7 | 2 | Mittel | nicht empfohlen |
| 18 | Dark UX bei Werbung und Käufen | 9 | 8 | 1 | Gering | blockiert |
| 19 | Energie- / Leben-System | 2 | 6 | 2 | Mittel | nicht empfohlen |
| 20 | Verdeckte DDA und persönliche Drop-Raten | 1, 4 | 2 | 2 | Hoch | blockiert |

---

### Rang 1: Rewarded Ads live schalten

**Kurzbeschreibung:** Sieben Werbe-Plätze sind gebaut (Truhe, Upgrade-Schritt, Skin-Boost, Streak-Rettung, Freeze, doppelter Daily-Lohn, zweiter Daily-Versuch), aber Umami zählt seit dem 09.10. kein einziges `ad`-Ereignis. Ohne laufende Werbung bringt jede Monetarisierung aus diesem Dokument nichts.

- **Machbarkeit: 7** · der Code ist fertig; was fehlt, ist die Freigabe für H5 Games Ads (Antrag, nicht garantiert) und das Build-Arg.
- **Impact: 10** · von null auf einen Umsatz; jeder weitere Werbe-Punkt hier setzt das voraus.
- **Größe: Gering** (Betrieb und Konfiguration).

**Stand (Leo, 18.10.2026):** Beworben ist für **beides**, das normale AdSense-Konto und H5 Games Ads. Beide Anträge werden derzeit noch von Google überprüft; bis zur Freigabe bleibt `VITE_REWARDED_ADS` leer.

**Umsetzungsplan:**
1. Stand des AdSense-Kontos prüfen: freigegebenes AdSense-Konto **und** separater Antrag für H5 Games Ads ([Google H5 Games Ads](https://www.google.ca/adsense/start/h5-games-ads/), [AdSense-Hilfe](https://support.google.com/adsense/answer/9959170?hl=en)).
2. Nach der Freigabe in Coolify `VITE_REWARDED_ADS=1` als Build-Arg setzen (`Dockerfile:23`), neu bauen.
3. In Umami prüfen, dass `ad` mit `step = offer` und `watched` kommt, getrennt nach `channel` (Play-Tester herausrechnen).
4. Wird der Antrag abgelehnt: ein zweites H5-Netzwerk für Rewarded Video prüfen (z. B. AppLixir); braucht einen Absatz in `present/legal.ts`, ein neues `LEGAL_UPDATED`, die CSP in `nginx.conf` und einen Adapter in `ui/ads.ts` hinter derselben Schnittstelle wie `adBreak`.
5. In der Play-App (TWA) läuft dieselbe Web-Werbung; AdMob geht dort nicht, weil die Seite kein nativer Code ist.

---

### Rang 2: Wiederbelebung per Werbung („Weiterfahren“)

**Kurzbeschreibung:** Nach dem Crash, der einen Lauf beendet, bietet die Ergebnis-Karte einmal „Weiterfahren · Werbung“ an. Der Abschleppwagen räumt die Unfallstelle, der Lauf geht weiter. In Unlimited (26 % aller Schichten) ist das der natürliche Platz; in der Karriere nur, wenn mindestens 60 % der Autos geschafft sind (dieselbe Schwelle wie Tailwind). Research.md nennt das Muster unter 1 und 7 („Werbe-Revives am Frustrationsmaximum“); Unity und CrazyGames führen den Revive nach dem Scheitern als einen der wichtigsten Rewarded-Plätze im Hypercasual-Bereich ([Unity](https://unity.com/blog/8-ad-placements-to-boost-your-hyper-casual-ltv-meta-gameplay), [CrazyGames](https://docs.crazygames.com/resources/monetizing-hypercasual-io/)).

- **Machbarkeit: 6** · die Welt muss weiterlaufen können, ohne die Determinismus-Regel zu brechen.
- **Impact: 8** · die meisten Anzeigen pro Spieler und weniger Frust, weil ein Rekordlauf nicht am ersten Fehler endet.
- **Größe: Mittel**.

**Umsetzungsplan:**
1. **Core** (`core/world.ts`, `core/config.ts`): neues Eingabe-Ereignis `revive` im Tap-Protokoll, mit Sim-Schritt. Es entfernt Wrack und beteiligte Autos (der Abschleppwagen aus dem Tow Depot existiert schon als Bild), gibt 2 s Schutz vor einem neuen Hard Fail und setzt den Lauf fort. Gleicher Seed + gleiche Taps + gleiche Revives = gleiches Ergebnis; `npm test` bekommt einen Replay mit Revive.
2. **Werte:** `reviveAdsPerDay: 3`, `reviveMinShare: 0.6`, `reviveGrace: 2`, höchstens ein Revive pro Lauf.
3. **Ablauf** (`present/session.ts`, `present/adPill.ts`, `present/hud.ts`): `GameAd` um `revive` erweitern. Das Angebot erscheint erst nach dem `FAIL`-Atem (`ResultBanner.breath`, 1,2 s), so bleibt die Fail-Pause unangetastet. Mit Countdown von etwa 5 s, danach verfällt es ohne weitere Meldung. Ohne bereite Anzeige zeigt sich nichts (wie seit 16.10.).
4. **Fairness der Ranglisten:** ein Lauf mit Revive trägt `meta.revived` wie die Daily „2 tries“ (`Server/src/modules/leaderboard/boards.ts`) und lässt sich nicht als Challenge verschicken (wie `assisted`).
5. **Grenzen:** nicht in der Daily (dort gibt es den zweiten Versuch), nicht in Trials, Chill, Mayhem und Multiplayer; nie in der ersten Sitzung. Löst ein Revive aus, entfällt Tailwind für diese Schicht.
6. **Nicht koppeln:** Die Schwierigkeitskurve bleibt, wie sie ist (`npm run sim:career` vorher/nachher gleich); der Revive darf nie ein Grund werden, sie anzuziehen.
7. Analytics: `reward = revive` in der Liste von CLAUDE.md ergänzen, Patch Notes, Web/README „Rewarded ads“.

---

### Rang 3: Schichtlohn verdoppeln per Werbung (Karriere)

**Kurzbeschreibung:** Den doppelten Lohn gibt es heute nur für die Daily (einmal am Tag). Dasselbe Angebot auf der Ergebnis-Karte einer gewonnenen Karriere-Schicht, bis zu dreimal am Tag. Research.md, Muster 7: „Double your reward“ am Levelende ist neben dem Revive der Standard-Platz ([AppLixir](https://support.applixir.com/hc/en-us/articles/360056835154-Best-Practices-)).

- **Machbarkeit: 9** · `AdPill`, `gameAd` und die Verdopplung der Daily gibt es; neu ist nur die Bedingung.
- **Impact: 6** · häufiger Werbe-Kontakt; die Wirtschaft verträgt es (laut Karriere-Bot laufen die Level dem Geld davon).
- **Größe: Gering**.

**Umsetzungsplan:**
1. `config.ts`: `adDoublePerDay: 3` (Karriere), getrennt von der Daily-Verdopplung.
2. `Careers.adDoubleOpen(career, today)` analog zu `adRetryOpen`; verdoppelt nur den Schichtlohn, nicht Transporter-Geld oder Boni (sonst wird ein Jackpot zur Werbe-Pflicht).
3. `present/session.ts` `gameAd`: nach einer gewonnenen Karriere-Schicht `double` anbieten, wenn kein anderes Angebot steht. **Ohne** `rewardBurst` (die drei großen Momente bleiben drei), nur ein Hochzählen im Geld-Chip.
4. Nicht nach der allerersten Schicht und nicht in der ersten Sitzung.

---

### Rang 4: Season Pass mit Gratis-Strecke, rückwirkender Freischaltung und XP-Schub

**Kurzbeschreibung:** Heute zählt Season-XP erst nach dem Kauf für 150.000 (`SeasonPass.record` gibt ohne Kauf `null`). Neu: Ab Level 15 sammelt jeder Spieler Season-XP. Eine **Gratis-Strecke** zahlt einige Stufen (Standard-Truhen, kleines Geld), die **Premium-Strecke** (150.000) schaltet alle schon erreichten Stufen **rückwirkend** frei. Research.md, Muster 8: Der sichtbare, schon erarbeitete Fortschritt auf der gesperrten Strecke ist der Kaufanreiz (Endowment, Sunk Cost); das Spiel zeigt ihn heute gar nicht. Dazu einmal am Tag „+XP für eine Werbung“.

- **Machbarkeit: 7** · ein Modul (`core/seasonPass.ts`), ein Feld im Spielstand, zwei Zeilen in der Darstellung.
- **Impact: 7** · tägliches Ziel ab Level 15, starke Geldsenke, Kaufmoment mit Wert.
- **Größe: Mittel**.

**Umsetzungsplan:**
1. `core/seasonPass.ts`: `record()` bucht XP immer (ab `seasonPassLevel`); `TRACK` bekommt je Slot `free: boolean` (Vorschlag: Stufe 1, 4, 7 gratis, also Standard, Standard, Event). Gekauft = alle erreichten Premium-Stufen zahlen sofort aus, mit ihrer Inszenierung.
2. Spielstand: `passFreePaid` neben dem bestehenden Zähler; alte Spielstände mit gekauftem Pass ändern sich nicht.
3. `present/progress.ts` (Goals): zwei Zeilen, die gesperrte Premium-Zeile zeigt „3 Stufen warten · 150.000“. Ehrlich: keine durchgestrichenen Preise.
4. XP-Schub: `adPassXpPerDay: 1`, +1 Stufe XP höchstens bis zur nächsten Stufe; neuer `GameAd` `pass`.
5. Saisonende: sieben Tage vorher eine Zeile auf der Today-Karte („Saison endet in 7 Tagen · 2 Stufen offen“). Die Push-Regel bleibt bei einer pro 20 Stunden; der vorhandene Push-Grund `pass` kann diesen Termin übernehmen.
6. Mit `npm run sim:career` prüfen, wie viele Stufen ein Gelegenheitsspieler pro Saison erreicht; Ziel: Gratis-Spieler sehen die Premium-Zeile zur Hälfte gefüllt, bevor sie 150.000 haben.

---

### Rang 5: Comeback-Truhe mit festen, sichtbaren Chancen

**Kurzbeschreibung:** Die Daten zeigen eine Basis, die in Abständen zurückkommt (16 Rückkehrer nach 4 bis 14 Tagen in 9 Tagen). Wer nach 7 Tagen oder mehr wiederkommt, findet eine Premium Chest und eine Zeile „Neu, seit du weg warst“ aus den Patch Notes. Research.md, Muster 4 beschreibt den versteckten „Reactivation Boost“ auf Drop-Raten; die offene Form ist eine feste Truhe, die der Rückkehr-Push schon ankündigt.

- **Machbarkeit: 8** · `lastLoginDay` existiert, die Push-Gründe `comeback` (3/7/14/30 Tage) auch.
- **Impact: 6** · gibt dem Rückkehr-Push einen konkreten Inhalt und dem ersten Besuch danach einen Anlass.
- **Größe: Gering**.

**Umsetzungsplan:**
1. `config.ts`: `comebackDays: 7`, `comebackChest: 'premium'`, höchstens einmal in 30 Tagen.
2. `core/career.ts`: beim Laden prüfen, Truhe wie die Willkommens-Truhe in die wartenden legen (Pille „Chest ready“).
3. `net/push.ts`: der Comeback-Text nennt die Truhe („Eine Premium Chest wartet auf dich“), Server-Text in `Server/src/modules/push`.
4. Patch-Notes-Zusammenfassung seit dem letzten Besuch: `summary` der Einträge seit `lastLoginDay`, höchstens 3 Zeilen, einmal als Sheet.
5. Keine unsichtbare Chancen-Anhebung: die Truhe hat ihre normalen Odds (LOOT.md, IDEA.md „Lucky-Drop-Boost“ bleibt gestrichen).

---

### Rang 6: Schaufenster, tägliche Skins zum Festpreis

**Kurzbeschreibung:** Im Shop unter Chests drei Skins pro Tag zum festen Spielgeld-Preis, rotiert aus dem Tages-Seed (offline, für alle gleich). Research.md, Muster 7 und 8: Der zeitlich begrenzte Direktkauf (das Modell des Fortnite-Item-Shops) ist der Nachfolger der Lootbox. Er gibt einen täglichen Grund, den Shop zu öffnen, ein konkretes Wunsch-Item und eine Geldsenke vor Level 50 (die Auktion öffnet erst dort).

- **Machbarkeit: 7** · Rotation aus dem Seed ist reine Logik; die Darstellung kann die Kartenzeilen der Truhen nutzen.
- **Impact: 6** · Engagement und Geldsenke; nimmt den Truhen etwas Wert, darum Preise über dem Truhen-Gegenwert.
- **Größe: Mittel**.

**Umsetzungsplan:**
1. `core/loot.ts`: `storefront(day, career)` gibt 3 fehlende Truhen-Skins (1 Rare, 1 Epic, 1 aus Epic/Legendary), ohne Honours, Pass-, Tour- und Haus-Skins.
2. Preise in `config.ts` über dem Erwartungswert einer Truhe je Seltenheit (Vorschlag: Rare 60.000, Epic 150.000, Legendary 450.000; unter den Schätzungen der Auktion, damit diese ihren Platz behält). Mit `npm run sim:career` gegenrechnen.
3. `present/shop.ts`, `present/shopFlow.ts`: Abschnitt über den Truhen, Zeile „Neu in 6 h“. Ehrlich: kein „Nur heute!“-Banner, keine durchgestrichenen Preise (DESIGN-LANGUAGE, „fake urgency“).
4. Freischaltung mit dem Casino (Level 12), wie alles nach „Nur zeigen, was erreicht ist“.
5. Analytics: `tab` meldet `shop/storefront` schon über den bestehenden Kanal.

---

### Rang 7: Pity sichtbar an der Truhe

**Kurzbeschreibung:** Die Zähler stehen im Chest-Sheet. Neu: auf der Truhen-Karte und nach dem Öffnen „Legendary spätestens in 12 Truhen“. Research.md, Muster 4: Der sichtbare Pity-Zähler macht aus Zufall ein planbares Ziel (Goal-Gradient); das Spiel hat die Mechanik, zeigt sie aber nur eine Ebene tiefer.

- **Machbarkeit: 9** · `chestsSinceLegendary` und `PITY_LEGENDARY_CHESTS` gibt es.
- **Impact: 4** · mehr Truhen-Öffnungen (auch per Werbung), sobald der Zähler nah ist.
- **Größe: Gering**.

**Umsetzungsplan:** In `present/shop.ts` eine kleine Fortschrittsleiste (das eine Fortschritts-Element des Spiels, amber/gold) unter der Truhe; ab 30 von 40 eine Zeile auf der Karte. Auf der Ergebniskarte der Truhe der neue Zählerstand. Text nach `S` und in alle Sprachen.

---

### Rang 8: Streak, Freeze für Spielgeld und Streak am App-Icon

**Kurzbeschreibung:** Muster 10 ist fast vollständig. Zwei Hebel fehlen: (a) ein Freeze für Spielgeld (Duolingo verkauft ihn gegen seine Währung), als Geldsenke mit Verlustangst; (b) bei installierter App zeigt `setAppBadge()` eine offene Daily in den letzten Stunden vor dem Riss.

- **Machbarkeit: 9** · Freeze-Logik und Vorrat existieren, `setAppBadge` wird schon für Benachrichtigungen genutzt.
- **Impact: 4** · stabilisiert Serien, wenig Wirkung auf Neue.
- **Größe: Gering**.

**Umsetzungsplan:**
1. **Entscheidung nötig:** „Nur verdient, nie gekauft“ (Spiel.md §11) aufweichen. Durch den Werbe-Freeze ist sie schon gelockert.
2. `config.ts`: `freezePrice` (Vorschlag 15.000, danach ×2 im selben Monat), Vorrat bleibt bei `streakFreezeMax: 2`.
3. Kauf in Progress → Today an der Streak-Karte.
4. App-Badge: in `ui/` beim Schließen/Verstecken setzen, wenn die Daily offen ist und `streakWarningHours` begonnen hat; beim Öffnen löschen.

---

### Rang 9: Wochen-Liga mit Auf- und Abstieg

**Kurzbeschreibung:** Gruppen von etwa 30 Spielern pro Woche, sortiert nach Season-/Elite-XP der Woche; die besten steigen auf, die letzten ab (Bronze bis Diamant). Research.md, Muster 6, 8 und 10 in einem: sozialer Vergleich, Wochenrhythmus und Statusverlust. Duolingo nutzt das als einen seiner stärksten Engagement-Treiber.

- **Machbarkeit: 4** · neues Server-Modul, Wochen-Wechsel, Gruppenbildung, Oberfläche im Social-Tab.
- **Impact: 7** auf lange Sicht, **heute begrenzt** durch die Spielerzahl.
- **Größe: Hoch**.

**Umsetzungsplan:**
1. Erst ab 50 bis 100 aktiven Spielern pro Woche sinnvoll; bis dahin füllen **computergesteuerte Fahrer, als solche benannt** (wie die Sammler der Auktion) die Gruppen auf.
2. `Server/src/modules/leagues`: Tabelle Woche, Liga, Gruppe; XP kommt mit dem bestehenden Speicher-Upload, Plausibilitätsgrenzen wie bei den Ranglisten.
3. Spiel: Segment unter Social → Ranks („League“), braucht den Spieler (`accountReady`); Intro-Drawer (`INTROS`, `S.intro`, `IntroArt`).
4. Belohnung: Aufstieg = Truhe; Abstieg kostet nichts außer der Liga. Push nur „im Top 20 überholt“ (gibt es schon).

---

### Rang 10: Feierabend-Fenster (zweiter täglicher Termin)

**Kurzbeschreibung:** Research.md, Muster 2 ohne Sperre: ein festes Fenster am Tag (z. B. 18–20 Uhr Ortszeit), in dem Karriere-Schichten +20 % zahlen. Ein zweiter Grund am Tag neben der Daily, der in den Alltag passt (Feierabend, Bus).

- **Machbarkeit: 8** · nur `Goals.forPay` und eine Pille auf der Wartekarte.
- **Impact: 4**.
- **Größe: Gering**.

**Umsetzungsplan:** `config.ts` `rushHourWindow: [18, 20]`, `rushHourPay: 0.2`; der Lohn wird beim Buchen berechnet, nicht in der Simulation, der Determinismus bleibt. Pille wie Tailwind. **Kein eigener Push** (Regel: eine pro 20 Stunden). Name nicht „Rush Hour“, das ist schon eine Phase der Schicht; Vorschlag „After Work“.

---

### Rang 11: Truhenpreise als Anker und Mengenrabatt

**Kurzbeschreibung:** Research.md, Muster 7. Die Premium Chest kostet das Doppelte der Standard Chest, hat aber die achtfache Legendary-Chance (8 % gegen 1 %); die Standard Chest ist damit schon der Köder, nur sagt es niemand. Neu: an der Premium Chest der ehrliche Vergleich „8× Legendary-Chance“ und ein Paket „3 Premium für 140.000“.

- **Machbarkeit: 9** · Werte und Beschriftung.
- **Impact: 3** · lenkt Geld in die größere Truhe, verkürzt den Weg zur Pity.
- **Größe: Gering**.

**Umsetzungsplan:** `config.ts` `premiumBundle: { count: 3, price: 140000 }`; drei Truhen nacheinander öffnen (die Klopf-Öffnung pro Truhe bleibt). Die Diamond Chest bleibt nach „Nur zeigen, was erreicht ist“ bis zur Elite-Leiste unsichtbar; sie als frühen Anker zu zeigen, würde der Regel widersprechen.

---

### Rang 12: Truhen-Teaser, eine Entscheidung treffen

**Kurzbeschreibung:** Muster 5 ist im Spiel: `chestTeaserChance: 0.7` legt in 70 % der Walzen ohne Legendary eine Legendary-Karte direkt neben den Gewinn. DESIGN-LANGUAGE.md sagte für Casino **und** Truhen-Öffnung „near misses only when the draw gives them“; die beiden Entscheidungen widersprachen sich.

- **Machbarkeit: 10** · ein Wert.
- **Impact: 2** · der Teaser steigert die Spannung der Öffnung; ein Umsatz hängt nicht daran, weil Truhen kein Echtgeld kosten.
- **Größe: Gering**.

**Entschieden (Leo, 17.10.2026):** Die Regel ist aus DESIGN-LANGUAGE.md gestrichen, der Teaser bleibt bei 70 %. Erledigt. Die Casino-Regeln in LOOT.md („Fair gebaut“) und Spiel.md §9 beschreiben weiter, dass die Casino-Spiele keine vorgetäuschten Beinahe-Gewinne zeigen; das entspricht dem Code der Casino-Spiele.

---

### Rang 13: Tägliches Geschenk an Freunde

**Kurzbeschreibung:** Research.md, Muster 6 (Reziprozität): einmal am Tag jedem Freund ein kleines Geschenk schicken (z. B. eine Rubbelkarte oder 1.000). Der Empfänger bekommt es beim nächsten Start und sieht den Absender; zurückschenken ist ein Tap. Der Push-Grund `gift` gibt es schon.

- **Machbarkeit: 5** · Server-Modul, Abholung über `net/rewards.ts`, Knopf im Freunde-Panel.
- **Impact: 5** · Rückkehr-Anlass von außen, wächst mit der Freundesliste.
- **Größe: Mittel**.

**Umsetzungsplan:** `Server/src/modules/gifts` (je Absender und Tag höchstens ein Geschenk pro Freund, Plausibilität); `ui/friendsPanel.ts` Knopf „Send gift“ je Zeile; Empfang über `net/rewards.ts` wie die Belohnungen von Build with us; Datenschutz-Absatz in `legal.ts` nur, falls neue Daten entstehen (Freundescodes liegen schon dort). Keine Meldung „X hat dir nichts geschenkt“.

---

### Rang 14: Crews mit Wochenziel (ohne Pranger)

**Kurzbeschreibung:** IDEA.md „Teams“: Crew-Code, eine Rangliste für Crews, ein gemeinsames Wochenziel mit Truhe für alle. Research.md, Muster 6 beschreibt dazu Gilden-Paywalls und öffentliche Fehlermeldungen; diese Teile tragen hier nichts, weil es nichts zu kaufen gibt, und bei einer kleinen Basis treiben sie Spieler eher hinaus.

- **Machbarkeit: 3** · Server-Modul, Mitgliedschaft, Oberfläche, Moderation der Crew-Namen.
- **Impact: 6** auf lange Sicht (Klassen, Büros, Discords teilen in Gruppen), heute klein.
- **Größe: Hoch**.

**Umsetzungsplan:** erst nach der Liga (Rang 9), die dieselbe Infrastruktur für Wochenwechsel braucht. `Server/src/modules/teams`; Segment unter Social; Ziel aus Summe der Schichten, keine individuelle Mindestleistung, keine Liste „hat nicht beigetragen“.

---

### Rang 15–20: nicht empfohlen oder blockiert

Diese Punkte sind in Research.md beschrieben und hier vollständig bewertet. Sie stehen hinten, weil sie in diesem Spiel **wenig einbringen und viel riskieren**, nicht aus Prinzip.

| Rang | Anpassung | Machbarkeit | Impact | Größe | Warum nicht |
| --- | --- | --- | --- | --- | --- |
| 15 | **Casino: Near-Miss und LDW ausbauen** (gezinkte Walzen, Jubel bei Nettoverlust) | 8 | 2 | Gering | Widerspricht einer festen Entscheidung (DESIGN-LANGUAGE, LOOT.md „Fair gebaut“). Ohne Echtgeld kein Umsatz; das einzige Ergebnis wären schnellere Verluste von Spielgeld. Simuliertes Glücksspiel wirkt auf die Altersfreigabe in Play (IARC). |
| 16 | **Premium-Währung / Echtgeld-Pakete** (Muster 3, Paket-Mismatch, Restguthaben) | 2 | 6 (theoretisch) | Hoch | Blockiert durch die Casino-Regel: Solange das Casino existiert, gibt es keine kaufbare Währung. Echtgeld-Truhen fallen in Belgien und den Niederlanden unter das Glücksspielrecht; Google Play verlangt dann offengelegte Chancen und Play Billing. Wäre nur denkbar als Kauf ohne Zufall (z. B. ein Supporter-Paket mit Skin) und **nach** Entfernen des Casinos. |
| 17 | **Pranger und Gruppenzwang ausbauen** (Muster 6: Meldungen an die Gruppe, wer nicht beigetragen hat) | 7 | 2 | Mittel | Die bestehenden Marker (Mafia-Badge, „2 tries“) reichen. Mehr öffentlicher Druck ohne Kaufmoment senkt bei einer kleinen Basis eher die Retention, als dass er sie hebt. |
| 18 | **Dark UX** (Werbung, die ein Tap auf die Szene auslöst; Kauf ohne Bestätigung) | 8 | 1 | Gering | Versehentliche Anzeigen-Klicks verstoßen gegen die AdSense-Richtlinien und gefährden das Konto, also den gesamten Werbe-Umsatz. Ohne Echtgeld gibt es keinen Kauf, den man auslösen könnte. DSA Art. 25 und das FTC-Verfahren gegen Epic (Research.md) setzen den Rahmen. |
| 19 | **Energie- / Leben-System** (Muster 2) | 6 | 2 | Mittel | Schichten dauern 8 bis 75 s, der Reiz ist „nur noch eine“ (Spiel.md §2). Eine Sperre bricht das, und Unlimited (26 % der Schichten) wäre nicht mehr möglich. Portale raten Webspielen ausdrücklich von langsamen Freischaltsystemen ab (reports/Retention…). Ohne Kauf zum Überspringen gibt es auch keinen Umsatz. |
| 20 | **Verdeckte DDA / EOMM und persönliche Drop-Raten** (Muster 1 und 4: Abwanderungsrisiko, Whale-Degradation) | 2 | 2 | Hoch | Bricht den Kern: gleicher Seed + gleiche Taps = gleiches Ergebnis (Challenges, Daily-Rangliste, Replays, Tests). Die angezeigten Odds wären falsch, also irreführend nach UCPD. Es fehlen Telemetrie und Spielerzahl für ein Modell (55 Neue in 9 Tagen). IDEA.md hat „Luck-Bonus“ und „Lucky-Drop-Boost“ schon gestrichen. Die offenen Formen sind schon im Spiel (Erleichterung nach 3 Niederlagen, Tailwind). |

---

## 3. Empfohlene Execution-Roadmap

### Umgesetzt (18.10.2026, noch nicht committet)

- **Rang 3, Schichtlohn verdoppeln:** gewonnene Karriere-Schicht, 3× am Tag (`adShiftDoublesPerDay`), nicht am ersten Tag, ohne `rewardBurst`; Umami `reward = pay`.
- **Rang 5, Comeback-Truhe:** Premium Chest bei **jeder** Rückkehr nach 7+ Tagen (`comebackDays`), nicht nur einmal in 30 Tagen, damit der Push-Text (7/14/30 Tage, nennt die Truhe) immer stimmt. Offen: die Zusammenfassung „Neu, seit du weg warst“.
- **Rang 7, Pity sichtbar:** goldene Leiste auf jeder Truhen-Karte, ab 10 Truhen „Legendary in N“ auf den Kauf-Karten, Zählerstand auf der Ergebnis-Karte.

### Quick Wins (die nächsten 1–2 Wochen)

1. **Rewarded Ads live schalten (Rang 1).** Ohne das ist alles Weitere Vorarbeit. Parallel den H5-Antrag nachverfolgen und eine zweite Werbe-Quelle vorbereiten.
2. **Schichtlohn verdoppeln per Werbung (Rang 3).** Ein Tag Arbeit auf vorhandenen Bausteinen; geht live, sobald Werbung läuft.
3. **Comeback-Truhe (Rang 5).** Wirkt sofort auf die bestehende Basis, die heute den Großteil der Besuche stellt, und braucht keine Werbung.
4. **Pity sichtbar an der Truhe (Rang 7).** Weniger als ein halber Tag. (Die Teaser-Entscheidung, Rang 12, ist am 17.10. gefallen.)

### Mittelfristig (2–6 Wochen)

5. **Wiederbelebung per Werbung (Rang 2).** Der größte Umsatz-Hebel nach dem Einschalten; braucht saubere Core-Arbeit für den Determinismus und die Ranglisten-Markierung.
6. **Season Pass mit Gratis-Strecke (Rang 4).** Am besten zum nächsten Saisonwechsel (Winter ab 01.12.2026), damit niemand mitten in der Saison umgestellt wird.
7. **Schaufenster (Rang 6)** und **Streak-Freeze für Spielgeld (Rang 8)**, wenn die Geldwirtschaft nach Pass und Verdopplung neu gemessen ist (`npm run sim:career`).

### Langzeit (sobald der Zulauf steigt)

8. **Wochen-Liga (Rang 9),** dann **Geschenke an Freunde (Rang 13)** und **Crews (Rang 14).** Sie brauchen Spielerdichte. Bei rund 6 neuen Spielern am Tag ist **Zulauf der eigentliche Engpass**: Play-Store-Eintrag, Landeseiten, Discord (IDEA.md „Wachstum“) bewegen hier mehr als jede weitere Retention-Mechanik.

### Messen

Jede Änderung zwei Wochen vorher/nachher auf demselben Kanal vergleichen (`channel` tab/app; `play` herausrechnen bis zum Ende des geschlossenen Tests am ~28.10.2026). Neue Werbe-Plätze melden sich über das bestehende `ad`-Ereignis mit eigenem `reward`. Bei dieser Spielerzahl sind nur große Effekte sichtbar; kleine Feinheiten lieber mit dem Karriere-Bot als mit Umami prüfen.

---

**Quellen der eigenen Recherche:** [Google H5 Games Ads](https://www.google.ca/adsense/start/h5-games-ads/) · [AdSense-Hilfe H5 Games Ads](https://support.google.com/adsense/answer/9959170?hl=en) · [Unity: 8 Ad Placements für Hypercasual](https://unity.com/blog/8-ad-placements-to-boost-your-hyper-casual-ltv-meta-gameplay) · [CrazyGames: Monetizing Hypercasual/IO](https://docs.crazygames.com/resources/monetizing-hypercasual-io/) · [AppLixir Best Practices](https://support.applixir.com/hc/en-us/articles/360056835154-Best-Practices-) · [Battle Pass, Gratis- und Premium-Strecke](https://pmplayground.substack.com/p/the-science-behind-battle-passes) · [Throne and Liberty: rückwirkende Pass-Belohnungen](https://www.playthroneandliberty.com/en-us/news/articles/battle-pass-glacials-star)
