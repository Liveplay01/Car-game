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
- **Kein Echtgeld in v1.0.** Standard-Truhe **26.000**, Premium-Truhe **52.000** Ingame-Geld (seit 25.09.2026 alles Kaufbare +30 %)
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

## Alben

Ein vollständiger Satz zahlt einmal Geld und legt einen Rahmen in seiner Farbe um den
Kreisverkehr (der wertvollste abgeschlossene zählt). Fortschritt im Shop unter Collection.

| Album | Inhalt | Belohnung |
| --- | --- | --- |
| Maps | alle 12 Map Skins aus Truhen | 10.000 |
| Commons / Rares / Epics / Legends | alle Car Skins dieser Seltenheit aus Truhen | 5.000 / 10.000 / 20.000 / 40.000 |
| Seasons | alle 4 Saison-Items | 30.000 |
| Loyalty | alle 3 Serien-Items | 20.000 |

## Map Skins (12)

Tönen die Mittelinsel des Kreisverkehrs mit einem Ring in der Skin-Farbe, färben den Boden
der Stadt außerhalb des Kreisverkehrs (dunkel, damit alles lesbar bleibt) und bringen eigene
Details mit (`MapTheme`, Entscheidung Leo 25.09.2026). **Jede Map säumt ihre Straßen**
(Alleen an beiden Seiten jedes Arms); die Häuser lassen die Alleen frei.

- **Sand** Dünen und Kakteen · **Forest** Moos und Tannen · **Autumn** Laub, Herbstbäume und
  fallende Blätter · **Neon** Lichtraster und Leuchtpfosten · **Dusk** Laternen an den
  Straßen · **Aurora** Polarlicht und verschneite Tannen · **Ember** glühende Risse und Felsen.
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

Das Herzstück (Teich, Lagune, Mühle, Planet) liegt an der freien Stelle über dem Ring, so
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
- **Map Skins**: andere Markierungsfarben; Herzstücke auch für die älteren Maps.
- **Hupe/Sound-Skins** (rein kosmetisch).
