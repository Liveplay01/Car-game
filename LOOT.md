# LOOT.md – Was in den Truhen steckt

Stand: 06.10.2026 · Code: `Web/src/core/loot.ts` (Katalog, Odds, Pity),
`Web/src/present/skins.ts` (Farben, Streifen, Dächer, Effekte),
`Web/src/present/mapThemes.ts` (was eine Map in der Stadt zeigt),
Namen in `Web/src/present/strings.ts` (`S.shop`). Wird ein Item ergänzt, gehört es in alle und hierher.

## Regeln

- **Nur Aussehen.** Kein Skin gibt einen Spielvorteil. Ein Fahrzeugtyp hat eigene, faire
  Eigenschaften (anders, nicht besser).
- **Skins mischen:** Bis zu **5 Car Skins** gleichzeitig. **Jedes Fahrzeug** im Level –
  eigenes und KI-Verkehr, auch Polizei, Verbrecher-Pickup, Geldtransporter und Lkw – trägt
  einen davon (fest pro Fahrzeug ausgewählt; Entscheidung Leo, 24.09.2026). Map Skin: einer.
- **Sonderfahrzeuge bleiben an der Form erkennbar**, nicht an der Farbe: Polizei am weißen
  Dach mit Lichtbalken und Blaulicht, der Verbrecher an der offenen Ladefläche und seinem
  lila Countdown-Ring, der Geldtransporter an Goldmünze, Goldstreifen und Rundumleuchte,
  der Lkw am hellen Kofferaufbau (nur das Fahrerhaus trägt den Skin). Rennstreifen gibt es
  auf Polizei und Transporter nicht, sie würden Lichtbalken und Münze verdecken. Weiterhin
  keine Skins in Polizeiblau oder Verbrecher-Violett.
- **Odds sind immer sichtbar**, direkt neben der Truhe im Shop.
- **Pity:** Spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic, spätestens die **40. ohne Legendary eine Legendary** (05.10.2026, `PITY_LEGENDARY_CHESTS`, `chestsSinceLegendary`; beide Zähler stehen im Chest-Sheet. In der Event Chest ersetzt das Saison-Item eine so garantierte Legendary nicht).
- **Duplikate** werden zu Geld: Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000.
- **Kein Echtgeld.** Der Store ist entfernt (Leo, 28.09.2026). Geld und Truhen gibt es nur im
  Spiel, solange das Casino existiert, ist keine Währung kaufbar (CLAUDE.md, „Casino statt Store“).
  Standard-Truhe **26.000**, Premium-Truhe **52.000** Ingame-Geld (seit 25.09.2026 alles Kaufbare +30 %)
  (`standardChestPrice`, `premiumChestPrice`).
- **Werbung:** Eine Standard-Truhe gibt es auch für eine angesehene Werbung, bis zu
  **3 pro Tag** (`adChestsPerDay`). Immer freiwillig, bezahlt wird nur eine zu Ende gesehene Werbung.
  Auf CrazyGames deren Rewarded Ad; auf der normalen Seite und in der Google-Play-App Googles Rewarded Ads
  (Web/README.md, „Rewarded ads“); ohne Anbieter läuft eine kurze Platzhalter-Werbung.
- **Weitere Werbe-Angebote (Leo, 05.10.2026; nicht auf CrazyGames):**
  - **Gratis-Upgrade-Schritt:** einmal am Tag zieht das Spiel einen kaufbaren, noch nicht vollen Upgrade
    (aus dem eigenen Strom des Spielstands und dem Tag, den ganzen Tag derselbe); eine Werbung gibt einen
    Schritt davon gratis (`adUpgradesPerDay`, `Careers.adUpgradeOffer`).
  - **Skin-Upgrade-Boost:** eine Werbung gibt der nächsten Runde **+10 Prozentpunkte** Chance
    (`upgradeAdBoost`, bis zu 3 pro Tag, `adBoostsPerDay`), auch über der Grenze von 75 %. Er gilt für eine Runde,
    gewonnen oder verloren, und das Rad zeigt genau die Chance, die gewürfelt wird.

## Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- | --- |
| Standard Chest | Shop (26.000), Werbung (3/Tag), Mastery Stufe I, Daily Shift | 70 % | 22 % | 7 % | 1 % |
| Premium Chest | Shop (52.000), Mastery Stufe II und III | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt Chest | Mastery "Crime Fighter" (Takedowns) | 50 % | 30 % | 15 % | 5 % |
| Event Chest | Jede geschaffte Daily Shift; 15 % Chance nach jeder geschafften Schicht mit City Event (`eventChestChance`). Enthält in der Hälfte der Fälle das Saison-Item, bis man es hat | 40 % | 35 % | 20 % | 5 % |

**Der Fund in der Standard Chest (Leo, 01.10.2026):** Jede Standard Chest enthält mit **1 zu 500
(0,2 %)** den **Classic** (Oldtimer, unten bei den Fahrzeugtypen), solange man ihn nicht hat. Er
ersetzt dann das gezogene Item; die Seltenheit wird vorher wie immer gezogen, die Pity zählt
unverändert. Der Wurf kommt als letzter aus dem Seed, alle anderen Ergebnisse bleiben gleich.
Er ist das einzige Honour, das Glück ist, und in keiner anderen Truhe. Die Chance steht im
Chest-Sheet bei den anderen Odds (`chestFinds`, Quelle `{ kind: 'find' }` in `core/loot.ts`).

Innerhalb einer Seltenheit ist jedes Item gleich wahrscheinlich.

## Casino (Shop · Casino)

Seit 28.09.2026 (Leo): Geld **und** Skins lassen sich verspielen. Nur Spielgeld, kein Echtgeld.
Code: `Web/src/core/casino.ts` (Regeln), `Web/src/present/casino.ts` (Darstellung), Werte in
`Web/src/core/config.ts` (Block „Casino“). Prüfung: `npm run sim:casino`.

**Fair gebaut:**

- Jedes Ergebnis kommt aus einem eigenen, gesäten Zufallsstrom pro Karriere (`casinoSeed`, `casinoRounds`).
- Der Einsatz wird abgezogen und der Stand gespeichert, **bevor** etwas enthüllt wird. Neu laden würfelt nicht neu.
- Eine abgebrochene Crash-Fahrt (Seite geschlossen) gibt den Einsatz zurück. Den Shop während
  einer Fahrt verlassen kassiert zum aktuellen Multiplikator.
- Chancen, Gewinntabelle und Rückzahlquote stehen im Sheet hinter „Odds“, die letzten Runden als Verlauf.
- Beinahe-Gewinne passieren nur, wenn die Walzen sie wirklich liefern. Keine gezinkten Walzen,
  keine „Hol’s dir zurück“-Texte, keine Timer. Jede Enthüllung ist per Tipp überspringbar.
- Jeder Gewinn zahlt mindestens das Doppelte des Einsatzes (kein „Gewinn“, der eigentlich ein Verlust ist).
- **Inszenierung ändert nie das Ergebnis** (28.09.2026): Crash heizt sich in Stufen auf (ab 2× Speed-Lines,
  ab 5× Nitro und glühender Rand, ab 10× Danger Zone), dazu ein Motor-Riser und ein Herzschlag. Der Crash
  knallt (Hitstop, Explosion, roter Blitz). Wer bis 0,35 s vor dem Crash aussteigt, bekommt „Clutch
  Cash-out“, und nur dann wird der Crash-Punkt nach dem Ausstieg gezeigt. Bei den Slots kriecht Walze 3
  nur dann Symbol für Symbol heran, wenn Walze 1 und 2 schon gleich sind; die Stopps stehen da längst
  fest. Die Upgrade-Nadel kriecht immer zur **echten** Landestelle; liegt diese wirklich an einer Kante
  der Gewinnzone (Abstand unter 3,5 %), dauert das Auslaufen länger. Eine Nadel, die immer knapp an der
  Kante landet, gibt es nicht: Das wäre ein vorgetäuschter Beinahe-Gewinn.
- „Today“ zeigt ehrlich den Saldo des Tages aus Crash und Slots.

| Spiel | Regel | Rückzahlung |
| --- | --- | --- |
| **Crash** | Multiplikator e^(0,18·t); Crash-Punkt vorab gezogen, P(≥ m) = 0,96 / m, gedeckelt bei 100×; 4,95 % crashen sofort bei 1,00× | **96 %** für jedes Ziel |
| **Slots** | 3 Walzen à 20 gleich wahrscheinliche Stopps (Streifen `slotStrip`) | **95,45 %** exakt, Gewinn in 1 von 4,7 Spins |
| **Skin-Upgrade** | 1–5 Truhen-Skins (Car/Map) auf einen fehlenden, seltener als alle Einsätze; Chance = Einsatzwert / Zielwert × 0,95, höchstens 75 %; mit Werbung-Boost +10 Punkte (nicht auf CrazyGames) | **95 %** (bis zur Obergrenze); mit Boost mehr, bewusst: freiwillig gegen eine Werbung, sichtbar im Rad |
| **Roundabout Roulette** (06.10.2026) | Ring mit 20 Ausfahrten (je eine pro Stopp von `slotStrip`); Wette auf einen Fahrzeugtyp, Auszahlung (1 − 0,05) / Anteil der Ausfahrten (Car 3,17× … Boss, Ambulance, Transporter 19×); die Ausfahrt wird vorab gezogen, die Fahrt ist Inszenierung | **95 %** für jede Wette |
| **Scratch Card** (06.10.2026) | 9 Felder, drei gleiche gewinnen; Preis 1.000, Gewinne 2× (21,5 %) · 5× (3,6 %) · 10× (1,3 %) · 25× (0,36 %) · 100× (0,04 %) · 500× (0,01 %), zusammen jede vierte Karte; sonst zeigt kein Feld mehr als zweimal. Karten kauft man im Casino, jeder dritte Tag der Daily-Streak schenkt eine (höchstens 30 in der Hand); die Karte wird beim Rubbeln gezogen und vor der Enthüllung bezahlt | **92 %** exakt (leicht knapper als die anderen: die Streak verschenkt Karten; auf 92 % angehoben, weil 85 % und nur jede sechste Karte zu knapp wirkten) |
| **Doppelt oder nichts** | Nach jedem Gewinn, freiwillig: faire Münze, genau 50 %, höchstens 5× in Folge | 100 % |

Slots-Gewinntabelle (×Einsatz): drei Boss 500 · Transporter 150 · Ambulance 100 · Sports car 40 ·
Van 15 · Compact 10 · Car 6 · zwei Bosse irgendwo 10 · erste zwei Walzen gleich 2.

Skin-Wert fürs Upgrade (`skinValue`): Common 1.000 · Rare 3.000 · Epic 9.000 · Legendary 30.000.
Setzbar sind nur Car und Map Skins aus Truhen, keine Fahrzeugtypen (sie ändern den Verkehr),
keine Serien-, Saison- oder Ehren-Items. Eingesetzte Skins sind in jedem Fall weg: getauscht
gegen das Ziel oder verloren. Sie verschwinden aus Sammlung und Fahrbahn. Abgeschlossene
Alben bleiben abgeschlossen, ihre Prämie gibt es nicht zweimal.

## Sammlung im Shop

Die Collection hat seit 01.10.2026 **vier Regale** (Chips unter dem Segmented Control, vorher
acht): **Cars** (Car Skins aus Truhen, nach Seltenheit unter Überschriften Common · Rare · Epic ·
Legendary, dann Vehicles und Seasons), **Maps**, **Honours** (Legendary Shifts, Prestige, Elite,
Feats, Hall of Fame und die Daily-Serie) und **Pass**. Das Raster scrollt (4 Spalten), die Chips
und Überschriften zeigen den Fortschritt (z. B. `3/10`). Code: `shelfItems` in `Web/src/present/shop.ts`.

## Car Skins (39)

Lackierung der normalen Autos im Level. Mit Streifen: zwei dünne Rennstreifen über
Motorhaube, Dach und Heck. **Zweifarbig:** das Dach von der Windschutzscheibe bis zur
Heckscheibe in einer zweiten Farbe (nur auf normalen Autos und den Fahrzeugtypen, nie auf
Polizei, Verbrecher, Transporter, Lkw). Mit Effekt: **Shiny** – ein Lichtstreif läuft immer
wieder über das Auto; **Glitter** – kleine Funkeln blitzen auf. Mit Reduce Motion ohne
Effekt-Animation.

| Item | ID | Seltenheit | Aussehen |
| --- | --- | --- | --- |
| Racing Red | `racingRed` | Common | kräftiges Rot |
| Midnight | `midnight` | Common | sehr dunkles Nachtblau |
| Mint | `mint` | Common | helles Mint |
| Pearl | `pearl` | Common | Perlweiß |
| Olive | `olive` | Common | Olivgrün |
| Coral | `coral` | Common | Koralle |
| Sunset | `sunset` | Rare | warmes Orange |
| Ice | `ice` | Rare | eisiges Hellblau |
| Rose | `rose` | Rare | Rosé |
| Lime | `lime` | Rare | Limettengrün |
| Copper | `copper` | Rare | Kupfer |
| Red Stripe | `redStripe` | Rare | Rot mit weißen Streifen |
| Pearl Shine | `pearlShine` | Rare | Perlweiß, **Shiny** |
| Carbon | `carbon` | Epic | fast schwarz |
| Black & Gold | `blackGold` | Epic | Carbon mit goldenen Streifen |
| Night Mint | `nightMint` | Epic | Graphit mit Mint-Streifen |
| Tiger | `tiger` | Epic | Orange mit schwarzen Streifen |
| Chrome | `chrome` | Epic | Chrom-Silber, **Shiny** |
| Starlight | `starlight` | Epic | Nachtblau, **Glitter** |
| Gold | `gold` | Legendary | Gold |
| Royal | `royal` | Legendary | Perlweiß mit goldenen Streifen |
| Lagoon | `lagoon` | Legendary | Lagunen-Türkis mit goldenen Streifen |
| Diamond | `diamond` | Legendary | Eisblau, **Shiny + Glitter** |
| Holo | `holo` | Legendary | Holo-Flieder mit Mint-Streifen, **Shiny** |
| Lemon | `lemon` | Common | Zitronengelb |
| Plum | `plum` | Common | Pflaume |
| Fern | `fern` | Common | Farngrün |
| Latte | `latte` | Common | Milchkaffee |
| Teal | `teal` | Rare | Petrol |
| Sky Top | `sky` | Rare | Himmelblau, Dach perlweiß |
| Cherry Top | `cherry` | Rare | Kirschrot, Dach perlweiß |
| Mocha Cream | `mocha` | Rare | Mokkabraun, Dach cremeweiß |
| Panda | `panda` | Epic | Perlweiß, Dach schwarz |
| Hanami | `hanami` | Epic | Zartrosa, Dach perlweiß, **Glitter** |
| Volcano | `volcano` | Epic | Carbon mit Glut-Streifen, **Glitter** |
| Ocean | `ocean` | Epic | Tiefseeblau mit weißen Streifen, **Shiny** |
| Koi | `koi` | Legendary | Perlweiß, Dach Koi-Orange, goldene Streifen, **Shiny** |
| Obsidian | `obsidian` | Legendary | Tiefschwarz, **Shiny + Glitter** |
| Ruby | `ruby` | Legendary | Rubinrot mit goldenen Streifen, **Glitter** |

## Nur über Daily-Serie und Saison (7)

Nie in normalen Truhen-Pools (`CosmeticSource`, Entscheidung Leo 25.09.2026). In der Sammlung
sichtbar, mit dem Hinweis, wie man sie bekommt.

| Item | ID | Seltenheit | Woher | Aussehen |
| --- | --- | --- | --- | --- |
| Bronze Badge | `streakBronze` | Rare | Daily Shift 7 Tage in Folge gespielt | Bronze |
| Silver Badge | `streakSilver` | Epic | 14 Tage in Folge | Silber, **Shiny** |
| Gold Laurel | `streakGold` | Legendary | 30 Tage in Folge | Gold mit grünem Lorbeer-Streifen, **Shiny + Glitter** |
| Frost | `frost` | Epic | Event Chest im Winter (Dez–Feb) | Eisweiß, **Glitter** |
| Blossom | `blossom` | Epic | Event Chest im Frühling (Mär–Mai) | Blütenrosa mit weißem Streifen |
| Sunburst | `sunburst` | Epic | Event Chest im Sommer (Jun–Aug) | Sonnengelb mit Orange-Streifen |
| Pumpkin | `pumpkin` | Epic | Event Chest im Herbst (Sep–Nov) | Kürbisorange mit schwarzem Streifen |

## Nur über Legendary Shifts, Prestige und die Elite-Leiste (24, Regal „Honours“, die Maps auch im Regal „Maps“)

Seit 28.09.2026, Elite-Items seit 29.09.2026. Nie in Truhen, eigenes Regal im Shop. Einzige
Ausnahme seit 01.10.2026: der **Classic** (Fahrzeugtyp, Legendary), ein seltener Fund in der
Standard Chest (oben, „Truhen“). Er steht im Regal „Honours“, zählt aber nicht zum Album
„Honours“: Das Album belohnt Taten, nicht Glück.

| Name | ID | Seltenheit | Wie | Look |
| --- | --- | --- | --- | --- |
| Laurel | `laurel` | Rare | 1. Legendary Shift geschafft | Lorbeergrün, Goldstreifen, glänzend |
| Crown | `crown` | Epic | 5 Legendary Shifts | Bordeaux, Goldstreifen, glänzend + Glitzer |
| Phoenix | `phoenix` | Legendary | 15 Legendary Shifts | Feuerorange, heller Streifen, glänzend + Glitzer |
| Silver Star | `starSilver` | Epic | Prestige ★1 | Silber, weißer Streifen, glänzend |
| Gold Star | `starGold` | Epic | Prestige ★2 | Gold, schwarzer Streifen, glänzend + Glitzer |
| Iris Star | `starIris` | Legendary | Prestige ★3 | Holo, Goldstreifen, glänzend + Glitzer |
| Big Screen | `bigScreen` | Legendary | Prestige ★5 | Map Skin: statt der Stadt das eigene Bild oder Video (Upload nur Bilder; Link: YouTube, Bild, Videodatei), gedämpft hinter dem Ring |
| Nova | `nova` | Legendary | Prestige ★10 (Feat) | Perlweiß, Goldstreifen; Effekt: weiß-goldenes Glühen, vier kreisende Strahlen |
| Gilded City | `gilded` | Legendary | Prestige ★15 (Feat) | Map Skin: Nachtstadt in Blattgold, Gold-Obelisk mit vier Brunnen, Goldstaub |
| Singularity | `singularity` | Legendary | Prestige ★20 (Feat) | Obsidian, violetter Streifen; Effekt: dunkler Schlund, kreisende Feuerscheibe, einfallende Funken |
| Zenith Crown | `zenith` | Legendary | Elite 75 (Feat) | Nachtblau, Goldstreifen; Effekt: kreisende Lichtkrone, aufsteigende Funken |
| Event Horizon | `eventHorizon` | Legendary | Elite 100 (Feat) | Map Skin: Schwarzes Loch mit Akkretionsscheibe, Sterne, treibende Felsen |
| Undying Flame | `undying` | Legendary | 50 Legendary Shifts (Feat) | Carbon, blauer Streifen; Effekt: blau-weißes Feuer, das nie ausgeht |
| Steel Chevron | `eliteSteel` | Rare | Elite 5 | Chrom, Goldstreifen, glänzend |
| Blaze Chevron | `eliteBlaze` | Epic | Elite 15 | Nachtblau, Flammenstreifen, glänzend |
| Jade Chevron | `eliteJade` | Epic | Elite 25 | Lagune, Perlstreifen, glänzend |
| Black Aurum | `eliteAurum` | Legendary | Elite 35 | Obsidian, Goldstreifen, glänzend + Glitzer |
| Halo | `eliteHalo` | Legendary | Elite 45 | Eisweiß, Goldstreifen, glänzend + Glitzer |

**Mehr Honours (Leo, 06.10.2026)**, nie in Truhen, die Maps zugleich Feats:

| Name | ID | Seltenheit | Wie | Look |
| --- | --- | --- | --- | --- |
| Chrono | `chrono` | Legendary | Elite 55 | Chrom, hellblauer Streifen, glänzend + Glitzer; Effekt: vier Echos des Autos, Uhr auf dem Dach, ein Funke als Sekundenzeiger |
| Biolume | `biolume` | Legendary | Elite 65 | Lagune, Streifen in Plankton-Grün, glänzend; Effekt: leuchtende Punkte auf der Haube, Plankton-Spur, kreisende Funken |
| Dragonfire | `dragon` | Legendary | 30 Legendary Shifts | Rubinrot, Goldstreifen, glänzend + Glitzer; Effekt: Schuppen, zwei goldene Hörner, Flammenspur |
| Glowtide | `glowtide` | Legendary | Elite 85 (Feat) | Map Skin: nächtliche Küste mit leuchtendem Plankton, Gezeitenlinien, Tidepool mit pulsierender Qualle, Leuchttang |
| Moonmirror | `moonmirror` | Legendary | Prestige ★25 (Feat) | Map Skin: Salzsee unter Sternen, Kruste in Sechsecken, Mondsichel mit Spiegelbild im Rundbecken, Sternschnuppen |

Spielstände, die einen dieser Meilensteine schon hinter sich haben, bekommen das Item beim Laden (`storage/save.ts`), außer Feats, deren Ziel noch offen ist.

Kein Elite-Item ist ganz gold lackiert: Gold am ganzen Auto bleibt dem Jackpot-Transporter
vorbehalten (Fahrzeugfarben sind Spielinformation).

## Saison-Pass und Ruhmeshalle (Leo, 30.09.2026, `core/seasonPass.ts`)

- **Saison-Pass** (Progress → Today, ab Level 15): 150.000 Spielgeld pro Saison, nie Echtgeld.
  Jede Schicht bringt dieselben XP wie die Elite-Leiste; 120 XP pro Stufe, 12 Stufen:
  Standard, 5.000, **Skin 1**, Standard, 10.000, Premium, Event, **Skin 2**, 20.000, Premium,
  30.000, **Skin 3**. Die vier Saisons (Dezember zählt zum nächsten Winter) kommen jedes Jahr
  wieder, also auch ihre Skins; ein schon besessener Skin zahlt sein Duplikat-Geld.
- **Pass-Skins mit Effekten** (Regal „Pass“, Album „Season Pass“ 60.000, nicht im Casino):

| Saison | Stufe 3 (Epic) | Stufe 8 (Legendary) | Stufe 12 (Legendary) |
|---|---|---|---|
| Winter | Blizzard (Schneespur) | Northern Lights (Polarlicht-Unterboden) | Glacier (kreisende Eissplitter) |
| Frühling | Petal Storm (Blütenblätter) | Rainbow Road (Regenbogen-Lack) | Bloom Glow (pulsierendes Rosa) |
| Sommer | Solar Flare (Flammenspur) | Neon Wave (Neon-Unterboden) | Lava Core (glühende Risse) |
| Herbst | Ghost Rider (flackernd, Nachbilder) | Harvest Moon (Glut und Laub) | Thunderbolt (Blitze) |

- **Ruhmeshalle** (Records → Elite, sobald die Elite-Leiste offen ist): 250.000. Eine goldene
  Wand auf der Insel mit einem Stern pro Prestige-Rang, eine Plakette pro Rang (Datum, Elite,
  Bosse, Legendary Shifts) und der Skin **Hall of Famer** (Lorbeer-Aura, Regal „Honours“).
  Effekte laufen nur auf intakten Autos; Reduce Motion zeigt ein stehendes Bild.

## Elite-Leiste und Titel

Seit 29.09.2026 (`Web/src/core/elite.ts`, Werte in `config.ts`). Level 50 öffnet die Leiste,
Prestige behält sie. Nur Aussehen, Titel und Truhen, nie ein Vorteil auf der Straße.

- **Elite XP pro Schicht:** 10 für eine geschaffte Schicht, 1 je Perfect Input und Tight
  Fit (auch in einer verlorenen Schicht), je 10 für einen gestellten Boss und eine geschaffte
  Legendary Shift. Mayhem und Trials zählen nicht.
- **Elite-Level:** Level 50 ist Elite 1; progressiv (03.10.2026): Elite 1→2 braucht 60 XP, jedes weitere Level 4 XP mehr (`eliteXpPerLevel`, `eliteXpGrowth`). Jedes Elite-Level
  zahlt eine Standard Chest, jedes zehnte eine Premium Chest.
- **Meilensteine** (alle fünf bis Elite 50): Titel bei 1, 10, 20, 30, 40, 50; Lackierungen
  bei 5, 15, 25, 35, 45 (Tabelle oben).
- **In der Welt:** goldener Innenrand auf der Mittelinsel, je 10 Elite-Level ein goldener
  Punkt bei der eigenen Spur (höchstens fünf); die Level-Anzeige oben wird golden.
- **Titel** hängen an Taten, die der Spielstand belegt: die sechs Elite-Titel, *Precision
  Driver*, *Combo Master*, *Close Call Artist* (Mastery ganz), *Syndicate Breaker* (alle
  Bosse), *Night Owl* / *Storm Chaser* (Trials Blackout / Storm Watch), *Legend Hunter*
  (15 Legendary Shifts), *Star Driver* (Prestige ★3). Der erste verdiente Titel wird
  getragen, jeder andere lässt sich im Elite-Sheet antippen.
- **Ort:** Progress → Records, Elite-Karte oben. Ihr Sheet zeigt Leiste, Titel und
  Prestige (der Prestige-Knopf fragt zweimal).

## Endgame-Items (02.10.2026)

Nie in Truhen, Regal „Honours“, zählen zum Album „Honours“ (dort jetzt 29 Items).

| Name | ID | Seltenheit | Wie | Look |
| --- | --- | --- | --- | --- |
| Quasar | `quasar` | Epic | Prestige ★4 | Obsidian, violetter Streifen, glänzend |
| Prism | `prism` | Legendary | Prestige ★7 | Holo, Perlstreifen, glänzend + Glitzer |
| Meteor | `meteor` | Legendary | Prestige ★9 | Carbon, Flammenstreifen, Glut-Effekt |
| Eclipse | `eclipse` | Legendary | Prestige ★12 | Nachtblau, Goldstreifen, Lichtkrone |
| Nebula | `nebula` | Legendary | Prestige ★14 | Pflaume, violetter Streifen, Polarlicht |
| Comet | `comet` | Legendary | Prestige ★17 | Eisblau, blauer Streifen, Schneespur |
| Starforge | `starforge` | Legendary | Prestige ★19 | Kupfer, Flammenstreifen, Flammen |
| Endurance | `endurance` | Epic | 250 Autos in einem Unlimited-Lauf | Chrom, Mint-Streifen, glänzend |
| Overdrive | `overdrive` | Legendary | 500 Autos in einem Unlimited-Lauf | Obsidian, Mint-Streifen, Neon |
| Infinity | `infinity` | Legendary | 1.000 Autos in einem Unlimited-Lauf | Perlweiß, Regenbogen |

Titel ohne Skin: ★6 Road Warden, ★8 Gridlord, ★11 Ringbearer, ★13 Unstoppable, ★16 Timekeeper, ★18 Paragon, ★25 Mythic, ★30 Ring Eternal; dazu Mastermind (alle Mastery-Ziele auf V), Summit (Aufstiegs-Trial ★10) und Syndicate's End (alle acht Bosse).

## Tour-Skins (Leo, 07.10.2026, `core/tours.ts`)

Nur an den Stopps 3, 5 und 7 einer Tour, nie in Truhen. Eine verpasste Tour kommt nächstes Jahr wieder. Regal „Honours“, eigenes Album „Tours“ (30.000, alle sechs); das Honours-Album verlangt sie nicht.

| Skin | Tour | Seltenheit | Aussehen |
|---|---|---|---|
| Jack-o'-Lantern | Haunted Ring · Stopp 3 | Rare | Kürbisorange, schwarzer Streifen, Glitzer |
| Witching Hour | Haunted Ring · Stopp 5 | Epic | Pflaume mit grünem Streifen, Aurora-Effekt |
| Wraith | Haunted Ring · Stopp 7 (Phantom) | Legendary | Mitternacht, blauer Streifen, Geister-Effekt |
| Candy Cane | Winter Lights · Stopp 3 | Rare | Rot mit weißem Streifen, Glanz |
| Snow Globe | Winter Lights · Stopp 5 | Epic | Eisblau, Schneespur, Glitzer |
| Midnight Sleigh | Winter Lights · Stopp 7 (Convoy) | Legendary | Rubinrot mit Gold, Lichtkrone |

## Alben

Ein vollständiger Satz zahlt einmal Geld und legt einen Rahmen in seiner Farbe um den
Kreisverkehr (der wertvollste abgeschlossene zählt). Fortschritt im Shop unter Collection.

| Album | Inhalt | Belohnung |
| --- | --- | --- |
| Maps | alle 21 Map Skins aus Truhen | 10.000 |
| Commons / Rares / Epics / Legends | alle Car Skins dieser Seltenheit aus Truhen | 5.000 / 10.000 / 20.000 / 40.000 |
| Seasons | alle 4 Saison-Items | 30.000 |
| Loyalty | alle 3 Serien-Items | 20.000 |
| Honours | alle 29 Ehren-Items: Legendary Shifts, Prestige, Elite, Feats, Ruhmeshalle, Unlimited-Meilensteine (ohne den Classic) | 50.000 |

## Feats (Leo, 01.10.2026, `core/feats.ts`)

Die schwersten Taten im Spiel, unter Progress → Goals (nach Trials und Mastery).
Nie Glück, nie kaufbar, keine neue Seltenheit in den Truhen: jede Feat ist ein langer Weg
(Prestige-Ränge, Elite-Leiste, Legendary Shifts) und zahlt ein eigenes Item, oft dazu einen Titel
(*Ascended* ★10, *Eternal* ★20, *Grandmaster* Elite 75, *Centurion* Elite 100, *Immortal*
50 Legendary Shifts). Die Belohnung ist sichtbar, bevor man sie hat: Name, Bild, Ziel und
Fortschritt. Ausgezahlt wird dort, wo die Tat passiert (`Careers.prestige`, `recordElite`,
`completeLegendary`); ein Spielstand, der schon weiter ist, bekommt sie beim Laden.

## Map Skins (21)

Tönen die Mittelinsel des Kreisverkehrs mit einem Ring in der Skin-Farbe, färben den Boden
der Stadt außerhalb des Kreisverkehrs und bringen eigene
Details mit (`MapTheme`, Entscheidung Leo 25.09.2026). **Jede Map säumt ihre Straßen**
(Alleen an beiden Seiten jedes Arms); die Häuser lassen die Alleen frei.

**Tag und Nacht (Leo, 29.09.2026: „die Maps wirken traurig“):** Maps, die in der Sonne spielen
(`DAYLIGHT` in `mapThemes.ts`: Sand, Forest, Autumn, Sakura, Meadow, Tropic, Snowfall, Vineyard,
Red Canyon, Highlands, Beach, Savanna, Rainforest, Alps), haben einen hellen, satten Boden in der Farbe ihres Ortes –
hellgrüner Rasen in Sakura, knalliger Sand, Neuschnee – und Dächer in Tagesfarben (Ziegel,
Schiefer, Beton; unter Schnee weiß). Die Nacht-Maps (Dusk, Neon, Aurora, Ember, Cosmos, Harbour,
Mushroom Grove, Abyss, Lantern Festival, Crystal Cavern) bleiben dunkel, weil ihr Licht das Thema
ist. **Straße, Mittelinsel und HUD bleiben auf jeder Map dunkel**, damit Autos und Text gleich
gut lesbar sind. Die Bodentextur ist auf hellen Böden schwächer (sonst wirkt sie wie Schmutz).

- **Sand** Dünen, Kakteen, eine **Oase** mit zwei Palmen · **Forest** Moos, Tannen, eine
  **Blockhütte mit flackerndem Lagerfeuer** · **Autumn** Laub, Herbstbäume, fallende Blätter,
  ein **Kürbisfeld** mit Heuballen · **Neon** Lichtraster, Leuchtpfosten, ein **Platz mit
  drehenden Lichtringen** · **Dusk** Laternen an den Straßen, ein **Brunnen** mit vier Lampen ·
  **Aurora** Polarlicht, verschneite Tannen, ein **Iglu** mit Eisloch · **Ember** glühende
  Risse, Felsen, ein **Krater** mit atmender Lava.
- **Sakura** (Japan, Leo 25.09.2026): Kirschbaum-Alleen mit Steinlaternen (tōrō) in warmem
  Licht, Kirschbäume in voller Blüte (Kronen in drei Rosatönen), ein **Koi-Teich** mit
  Steinrand, Seerosen, schwimmenden Kois, Trittsteinen und **Torii**, eine geharkte
  **Zen-Kiesinsel** mit drei bemoosten Steinen, Blütenteppich am Boden und **Blüten, die
  durch die Luft wehen** (in Böen, taumelnd).
- **Meadow** Frühlingswiese mit Wildblumen, blühende Büsche, **Windmühle** mit drehenden
  Flügeln neben einem Tulpenfeld in bunten Reihen, **Schmetterlinge**.
- **Tropic** Dschungelgrün, Palmen-Alleen, Hibiskus, eine **Lagune** mit Steg und
  Palmeninsel, auf dem Wasser spielt das Licht.
- **Beach** (Leo, 29.09.2026) heißer Sand mit Flutlinien, Muscheln und Seesternen, Palmen und
  Sonnenschirme an den Straßen, Sandburgen, eine **türkise Bucht** mit Brandung, Bojen, Surfbrett
  und **Rettungsturm**, **Möwen** ziehen mit ihren Schatten drüber.
- **Natur-Maps (Leo, 06.10.2026):** **Savanna** goldenes Dürregras, Wildpfade, Akazien mit langem Schatten, Termitenhügel, ein **Wasserloch** mit trinkenden Elefanten und weidenden Antilopen, Staub und ziehende Wolkenschatten · **Rainforest** dunkler Urwaldboden mit Farnen und Blüten, Sonnenstrahlen, die wandern, Riesenblätter, ein **Gumpen unter einem Wasserfall** mit Seerosen und Nebel, fallende Blätter und Schmetterlinge · **Alps** Bergwiese mit Geröll, Altschneeflecken, Enzian und Edelweiß, Tannen, kleine Gipfel, ein **Gipfel von oben** (Flächen von links oben beleuchtet) mit ziehender Wolke, Schneegestöber und Wolkenschatten.
- **Snowfall** verschneite Tannen und warme Laternen, Schneemänner, Schlittenspuren, ein
  **zugefrorener Teich** mit Kufenspuren und zwei Eisläufern, **Schneefall**.
- **Cosmos** Tiefraum mit Nebeln und funkelnden Sternen, kleine Planeten, Leuchtbaken an den
  Straßen, ein **Ringplanet mit umlaufendem Mond**, **Sternschnuppen**.
- **Neu (Leo, 29.09.2026):** **Harbour** nasser Kai, Containerstapel, Poller und warme
  Hafenlaternen, ein **Hafenbecken mit schaukelndem Boot und Kran** · **Vineyard** Weinfelder aus
  Erde und Rebzeilen mit Trauben (an den Straßen ausgerichtet, überlappen sich nie und lassen
  Straßen, Häuser und Villa frei), Zypressen mit langen Schatten, Olivenbäume, eine **Villa mit Ziegeldach** und
  warmem Hof · **Mushroom Grove** Moos und leuchtende Pilze, ein **Hexenring um einen
  leuchtenden Teich**, aufsteigende Sporen · **Abyss** Meeresgrund mit Sandrippeln und
  Lichtspiel, Korallenfächer und Anemonen, ein **Wrack mit funkelnder Truhe**, Quallen und
  aufsteigende Blasen.
- **Noch vier (Leo, 29.09.2026):** **Red Canyon** Sanddünen, ein ausgetrocknetes Flussbett,
  Felsnasen aus Schichtgestein und Yucca-Palmen, ein **Felsbogen mit Lagerfeuer**, der Staub,
  der über den Rand weht · **Highlands** Moorpfützen, Heide in dicken Matten, Moos und
  Menhire, ein **Steinkreis um einen Bergsee** mit Nebel darin und treibende Heideblüten ·
  **Lantern Festival** ein nächtliches Fest: Papierlaternen an den Straßen, Stände mit
  gestreiftem Dach, ein **Podium mit großer Papiertrommel**, von der Funken steigen, und
  **Himmelslaternen** steigen auf · **Crystal Cavern** eine Tropfsteinhöhle: Risse von Licht im
  Fels, Kristallbüschel und Stalagmiten, ein **Geode aus violetten Prismen um einen leuchtenden
  Pool**, aus dem Strahlen drehen, und Staub, der aufblitzt.
- **Ohne Map Skin** stehen echte Bäume an der Stadt (Krone aus Lappen in drei Grüntönen,
  Licht von oben links, Schatten; Spielerwunsch 29.09.2026); Autumn nutzt dieselbe Form.

Das Herzstück jeder Map liegt an der freien Stelle über dem Ring, so
weit weg von allen Armen wie möglich; ist kein Platz, fehlt es. Was durch die Luft fliegt,
ist klein, blass und liegt unter dem HUD. **Reduce Motion:** nichts fliegt, Kois, Mühle,
Mond und Sterne stehen still. Die Uhr dafür (`sceneTime`) läuft mit dem Spiel und fängt bei
einer neuen Schicht nicht neu an.

| Item | ID | Seltenheit | Aussehen |
| --- | --- | --- | --- |
| Dusk | `dusk` | Common | Abendviolett |
| Sand | `sand` | Common | Sand |
| Neon | `neon` | Rare | Neon-Türkis |
| Forest | `forest` | Rare | Waldgrün |
| Autumn | `autumn` | Epic | Herbstorange |
| Sakura | `sakura` | Epic | Kirschblütenrosa |
| Aurora | `aurora` | Legendary | Polarlichtgrün |
| Ember | `ember` | Legendary | Glut-Orange |
| Meadow | `meadow` | Common | Butterblumengelb |
| Tropic | `tropic` | Rare | Lagunentürkis |
| Snowfall | `snowfall` | Epic | Schneeweiß |
| Cosmos | `cosmos` | Legendary | Sternenlicht |
| Harbour | `harbour` | Common | Hafenlicht-Orange |
| Vineyard | `vineyard` | Rare | Traubenviolett |
| Mushroom Grove | `grove` | Epic | Pilzleuchten-Türkis |
| Abyss | `abyss` | Legendary | Tiefseeblau |
| Red Canyon | `canyon` | Common | Kanyon-Orange |
| Highlands | `highland` | Rare | Heide-Violett |
| Lantern Festival | `lanterns` | Epic | Laternengold |
| Crystal Cavern | `crystal` | Legendary | Kristallviolett |
| Beach | `beach` | Common | Meerestürkis |
| Savanna | `savanna` | Rare | Savannen-Orange |
| Rainforest | `rainforest` | Epic | Urwaldgrün |
| Alps | `alps` | Epic | Gletscherblau |

## Fahrzeugtypen (3)

Jeder freigeschaltete Typ taucht gelegentlich in der eigenen Schlange auf (ein Zufallswurf
für alle Typen; mit nur dem Sportwagen bleibt jede Schlange wie vorher). Anders, nicht besser:
was leichter zu platzieren ist, ist schwerer zu timen und umgekehrt. Werte in `Web/src/core/config.ts`.

| Item | ID | Seltenheit | Eigenschaften |
| --- | --- | --- | --- |
| Compact | `compact` | Rare | 12 %: sehr kurz (18 statt 24), leicht (0,7), fädelt 15 % **langsamer** ein |
| Sports Car | `sportsCar` | Epic | 15 %: kürzer (21 statt 24), leichter (0,8), fädelt 20 % schneller ein – braucht also ein anderes Timing |
| Van | `van` | Epic | 12 %: lang (29 statt 24), schwer (1,5), fädelt 10 % schneller ein; Windschutzscheibe weit vorn |
| Classic | `classic` | Legendary (Honour) | 10 %: fährt wie ein Auto, etwas länger (25) und schwerer (1,1); lange Motorhaube, Kabine weit hinten, Chromstoßstangen über die ganze Breite, Lack Ochsenblut. Nur als Fund in der Standard Chest (1 zu 500) |

Der Classic steht nicht im Regal „Cars“, sondern unter „Honours“ (Leo, 01.10.2026).

## Verteilung

| Seltenheit | Car Skins | Map Skins | Typen | Summe |
| --- | --- | --- | --- | --- |
| Common | 10 | 6 | – | 16 |
| Rare | 11 | 5 | 1 | 17 |
| Epic | 10 | 5 | 2 | 17 |
| Legendary | 8 | 5 | – | 13 |
| **Summe** | **39** | **21** | **3** | **63** |

Dazu die 7 Items aus Daily-Serie und Saison: 70 insgesamt.

## Ideen für später (noch nicht im Spiel)

- **Muster-Skins**: Karo, Camouflage.
- **Map Skins**: andere Markierungsfarben.
- **Hupe/Sound-Skins** (rein kosmetisch).
