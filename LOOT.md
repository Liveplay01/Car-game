# LOOT.md – Was in den Truhen steckt

Stand: 25.09.2026 · Code: `Game/Sources/GameCore/Chests.swift` (Katalog, Odds, Pity),
`Game/Sources/GamePresentation/CityLayer.swift` (`Skins`: Farben, Streifen, Dächer, Effekte),
`Game/Sources/GamePresentation/MapThemes.swift` (was eine Map in der Stadt zeigt),
Namen in `Strings.Shop.item`. Wird ein Item ergänzt, gehört es in alle und hierher.

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
- **Pity:** Spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic.
- **Duplikate** werden zu Geld: Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000.
- **Kein Echtgeld.** Der Store ist entfernt (Leo, 28.09.2026). Geld und Truhen gibt es nur im
  Spiel, solange das Casino existiert, ist keine Währung kaufbar ([MONETIZATION.md](MONETIZATION.md)).
  Standard-Truhe **26.000**, Premium-Truhe **52.000** Ingame-Geld (seit 25.09.2026 alles Kaufbare +30 %)
  (`standardChestPrice`, `premiumChestPrice`).
- **Werbung:** Eine Standard-Truhe gibt es auch für eine angesehene Werbung, bis zu
  **3 pro Tag** (`adChestsPerDay`). Im Testfenster läuft eine 3-Sekunden-Platzhalter-Werbung;
  die App bindet später einen Werbe-Anbieter über `AdProviding` an.

## Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- | --- |
| Standard Chest | Shop (26.000), Werbung (3/Tag), Mastery Stufe I, Daily Shift | 70 % | 22 % | 7 % | 1 % |
| Premium Chest | Shop (52.000), Mastery Stufe II und III | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt Chest | Mastery "Crime Fighter" (Takedowns) | 50 % | 30 % | 15 % | 5 % |
| Event Chest | Jede geschaffte Daily Shift; 15 % Chance nach jeder geschafften Schicht mit City Event (`eventChestChance`). Enthält in der Hälfte der Fälle das Saison-Item, bis man es hat | 40 % | 35 % | 20 % | 5 % |

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
| **Skin-Upgrade** | 1–5 Truhen-Skins (Car/Map) auf einen fehlenden, seltener als alle Einsätze; Chance = Einsatzwert / Zielwert × 0,95, höchstens 75 % | **95 %** (bis zur Obergrenze) |
| **Doppelt oder nichts** | Nach jedem Gewinn, freiwillig: faire Münze, genau 50 %, höchstens 5× in Folge | 100 % |

Slots-Gewinntabelle (×Einsatz): drei Boss 500 · Transporter 150 · Ambulance 100 · Sports car 40 ·
Van 15 · Compact 10 · Car 6 · zwei Bosse irgendwo 10 · erste zwei Walzen gleich 2.

Skin-Wert fürs Upgrade (`skinValue`): Common 1.000 · Rare 3.000 · Epic 9.000 · Legendary 30.000.
Setzbar sind nur Car und Map Skins aus Truhen, keine Fahrzeugtypen (sie ändern den Verkehr),
keine Serien-, Saison- oder Ehren-Items. Eingesetzte Skins sind in jedem Fall weg: getauscht
gegen das Ziel oder verloren. Sie verschwinden aus Sammlung und Fahrbahn. Abgeschlossene
Alben bleiben abgeschlossen, ihre Prämie gibt es nicht zweimal.

## Sammlung im Shop

Die Collection ist in **Regale** geteilt (Chips unter dem Segmented Control): Common, Rare,
Epic, Legend (Car Skins aus Truhen nach Seltenheit), Maps und Special (Fahrzeugtypen,
Serien- und Saison-Items). Jedes Regal zeigt höchstens 12 Items (4 × 3), die Chips zeigen
den Fortschritt (z. B. `3/10`). Kommen Items dazu, darf kein Regal über 12 wachsen
(Test `everyItemSitsOnOneShelfAndEveryShelfFits`).

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

## Nur über Legendary Shifts, Prestige und die Elite-Leiste (11, Regal „Honours“)

Seit 28.09.2026, Elite-Items seit 29.09.2026. Nie in Truhen, eigenes Regal im Shop.

| Name | ID | Seltenheit | Wie | Look |
| --- | --- | --- | --- | --- |
| Laurel | `laurel` | Rare | 1. Legendary Shift geschafft | Lorbeergrün, Goldstreifen, glänzend |
| Crown | `crown` | Epic | 5 Legendary Shifts | Bordeaux, Goldstreifen, glänzend + Glitzer |
| Phoenix | `phoenix` | Legendary | 15 Legendary Shifts | Feuerorange, heller Streifen, glänzend + Glitzer |
| Silver Star | `starSilver` | Epic | Prestige ★1 | Silber, weißer Streifen, glänzend |
| Gold Star | `starGold` | Epic | Prestige ★2 | Gold, schwarzer Streifen, glänzend + Glitzer |
| Iris Star | `starIris` | Legendary | Prestige ★3 | Holo, Goldstreifen, glänzend + Glitzer |
| Steel Chevron | `eliteSteel` | Rare | Elite 5 | Chrom, Goldstreifen, glänzend |
| Blaze Chevron | `eliteBlaze` | Epic | Elite 15 | Nachtblau, Flammenstreifen, glänzend |
| Jade Chevron | `eliteJade` | Epic | Elite 25 | Lagune, Perlstreifen, glänzend |
| Black Aurum | `eliteAurum` | Legendary | Elite 35 | Obsidian, Goldstreifen, glänzend + Glitzer |
| Halo | `eliteHalo` | Legendary | Elite 45 | Eisweiß, Goldstreifen, glänzend + Glitzer |

Kein Elite-Item ist ganz gold lackiert: Gold am ganzen Auto bleibt dem Jackpot-Transporter
vorbehalten (Fahrzeugfarben sind Spielinformation).

## Elite-Leiste und Titel

Seit 29.09.2026 (`Web/src/core/elite.ts`, Werte in `config.ts`). Level 50 öffnet die Leiste,
Prestige behält sie. Nur Aussehen, Titel und Truhen, nie ein Vorteil auf der Straße.

- **Elite XP pro Schicht:** 10 für eine geschaffte Schicht, 1 je Perfect Input und Tight
  Fit (auch in einer verlorenen Schicht), je 10 für einen gestellten Boss und eine geschaffte
  Legendary Shift. Mayhem und Trials zählen nicht.
- **Elite-Level:** Level 50 ist Elite 1, danach alle 100 XP eins mehr. Jedes Elite-Level
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

## Alben

Ein vollständiger Satz zahlt einmal Geld und legt einen Rahmen in seiner Farbe um den
Kreisverkehr (der wertvollste abgeschlossene zählt). Fortschritt im Shop unter Collection.

| Album | Inhalt | Belohnung |
| --- | --- | --- |
| Maps | alle 12 Map Skins aus Truhen | 10.000 |
| Commons / Rares / Epics / Legends | alle Car Skins dieser Seltenheit aus Truhen | 5.000 / 10.000 / 20.000 / 40.000 |
| Seasons | alle 4 Saison-Items | 30.000 |
| Loyalty | alle 3 Serien-Items | 20.000 |
| Honours | alle 11 Legendary-, Prestige- und Elite-Items | 50.000 |

## Map Skins (12)

Tönen die Mittelinsel des Kreisverkehrs mit einem Ring in der Skin-Farbe, färben den Boden
der Stadt außerhalb des Kreisverkehrs (dunkel, damit alles lesbar bleibt) und bringen eigene
Details mit (`MapTheme`, Entscheidung Leo 25.09.2026). **Jede Map säumt ihre Straßen**
(Alleen an beiden Seiten jedes Arms); die Häuser lassen die Alleen frei.

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
- **Meadow** Wildblumen, blühende Büsche, **Windmühle** mit drehenden Flügeln neben einem
  Tulpenfeld in bunten Reihen, **Glühwürmchen**.
- **Tropic** Palmen-Alleen, Muscheln, Sonnenschirme, eine **Lagune** mit Steg und
  Palmeninsel, auf dem Wasser spielt das Licht.
- **Snowfall** verschneite Tannen und warme Laternen, Schneemänner, Schlittenspuren, ein
  **zugefrorener Teich** mit Kufenspuren und zwei Eisläufern, **Schneefall**.
- **Cosmos** Tiefraum mit Nebeln und funkelnden Sternen, kleine Planeten, Leuchtbaken an den
  Straßen, ein **Ringplanet mit umlaufendem Mond**, **Sternschnuppen**.

Das Herzstück jeder Map liegt an der freien Stelle über dem Ring, so
weit weg von allen Armen wie möglich; ist kein Platz, fehlt es. Was durch die Luft fliegt,
ist klein, blass und liegt unter dem HUD. **Reduce Motion:** nichts fliegt, Kois, Mühle,
Mond und Sterne stehen still. Die Uhr dafür (`sceneTime`) läuft mit dem Spiel und fängt bei
einer neuen Schicht nicht neu an. Testfenster: `--map sakura` zeigt eine Map, ohne sie
anzulegen; `--shelf maps` öffnet die Sammlung auf einem Regal.

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

## Fahrzeugtypen (3)

Jeder freigeschaltete Typ taucht gelegentlich in der eigenen Schlange auf (ein Zufallswurf
für alle Typen; mit nur dem Sportwagen bleibt jede Schlange wie vorher). Anders, nicht besser:
was leichter zu platzieren ist, ist schwerer zu timen und umgekehrt. Werte in `Config.swift`.

| Item | ID | Seltenheit | Eigenschaften |
| --- | --- | --- | --- |
| Compact | `compact` | Rare | 12 %: sehr kurz (18 statt 24), leicht (0,7), fädelt 15 % **langsamer** ein |
| Sports Car | `sportsCar` | Epic | 15 %: kürzer (21 statt 24), leichter (0,8), fädelt 20 % schneller ein – braucht also ein anderes Timing |
| Van | `van` | Epic | 12 %: lang (29 statt 24), schwer (1,5), fädelt 10 % schneller ein; Windschutzscheibe weit vorn |

## Verteilung

| Seltenheit | Car Skins | Map Skins | Typen | Summe |
| --- | --- | --- | --- | --- |
| Common | 10 | 3 | – | 13 |
| Rare | 11 | 3 | 1 | 15 |
| Epic | 10 | 3 | 2 | 15 |
| Legendary | 8 | 3 | – | 11 |
| **Summe** | **39** | **12** | **3** | **54** |

Dazu die 7 Items aus Daily-Serie und Saison: 61 insgesamt.

## Ideen für später (noch nicht im Spiel)

- **Weitere Fahrzeugtypen** mit fairen Eigenschaften: Oldtimer (wie ein Auto, eigene Form).
- **Muster-Skins**: Karo, Camouflage.
- **Map Skins**: andere Markierungsfarben.
- **Hupe/Sound-Skins** (rein kosmetisch).
