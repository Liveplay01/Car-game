# LOOT.md – Was in den Truhen steckt

Stand: 24.09.2026 · Code: `Game/Sources/GameCore/Chests.swift` (Katalog, Odds, Pity),
`Game/Sources/GamePresentation/CityLayer.swift` (`Skins`: Farben und Streifen),
Namen in `Strings.Shop.item`. Wird ein Item ergänzt, gehört es in alle drei und hierher.

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

## Car Skins (24)

Lackierung der normalen Autos im Level. Mit Streifen: zwei dünne Rennstreifen über
Motorhaube, Dach und Heck. Mit Effekt: **Shiny** – ein Lichtstreif läuft immer wieder über
das Auto; **Glitter** – kleine Funkeln blitzen auf. Mit Reduce Motion ohne Effekt-Animation.

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
| Maps | alle 8 Map Skins aus Truhen | 10.000 |
| Commons / Rares / Epics / Legends | alle Car Skins dieser Seltenheit aus Truhen | 5.000 / 10.000 / 20.000 / 40.000 |
| Seasons | alle 4 Saison-Items | 30.000 |
| Loyalty | alle 3 Serien-Items | 20.000 |

## Map Skins (8)

Tönen die Mittelinsel des Kreisverkehrs mit einem Ring in der Skin-Farbe, färben den Boden
der Stadt außerhalb des Kreisverkehrs (dunkel, damit alles lesbar bleibt) und bringen eigene
Details mit (`MapTheme`, Entscheidung Leo 25.09.2026): Sand Dünen und Kakteen, Forest Moos
und Tannen, Autumn Laub und Herbstbäume, Sakura Blütenblätter und Kirschbäume, Neon ein
Lichtraster und Leuchtpfosten, Dusk Laternen, Aurora Polarlicht und verschneite Tannen,
Ember glühende Risse und Felsen. Testfenster: `--map sand` zeigt eine Map, ohne sie anzulegen.

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

## Fahrzeugtypen (1)

| Item | ID | Seltenheit | Eigenschaften |
| --- | --- | --- | --- |
| Sports Car | `sportsCar` | Epic | taucht ab dann gelegentlich (15 %) in der eigenen Schlange auf: kürzer (21 statt 24), leichter (0,8), fädelt 20 % schneller ein – braucht also ein anderes Timing |

## Verteilung

| Seltenheit | Car Skins | Map Skins | Typen | Summe |
| --- | --- | --- | --- | --- |
| Common | 6 | 2 | – | 8 |
| Rare | 7 | 2 | – | 9 |
| Epic | 6 | 2 | 1 | 9 |
| Legendary | 5 | 2 | – | 7 |
| **Summe** | **24** | **8** | **1** | **33** |

## Ideen für später (noch nicht im Spiel)

- **Weitere Fahrzeugtypen** mit fairen Eigenschaften: Kleinwagen (sehr kurz, langsamer
  beim Einfädeln), Van (lang, schwer), Oldtimer (wie ein Auto, eigene Form).
- **Muster-Skins**: Karo, Camouflage, zweifarbig geteilt.
- **Event-Skins** für die Event Chest (z. B. Winter, Halloween), nur zeitlich begrenzt.
- **Map Skins mit Details**: Bäume/Beleuchtung auf der Insel, andere Markierungsfarben.
- **Hupe/Sound-Skins** (rein kosmetisch).
