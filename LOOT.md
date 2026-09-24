# LOOT.md – Was in den Truhen steckt

Stand: 24.09.2026 · Code: `Game/Sources/GameCore/Chests.swift` (Katalog, Odds, Pity),
`Game/Sources/GamePresentation/CityLayer.swift` (`Skins`: Farben und Streifen),
Namen in `Strings.Shop.item`. Wird ein Item ergänzt, gehört es in alle drei und hierher.

## Regeln

- **Nur Aussehen.** Kein Skin gibt einen Spielvorteil. Ein Fahrzeugtyp hat eigene, faire
  Eigenschaften (anders, nicht besser).
- **Sonderfahrzeuge bleiben erkennbar.** Skins tragen nur die **eigenen normalen Autos**
  des Spielers (und den Sportwagen). Polizei, Verbrecher-Pickup, Geldtransporter und der
  KI-Verkehr behalten immer ihr Aussehen, denn ihre Farbe ist Spielinformation.
  Deshalb gibt es keine Skins in Polizeiblau oder Verbrecher-Violett.
- **Odds sind immer sichtbar**, direkt neben der Truhe im Shop.
- **Pity:** Spätestens die 10. Truhe in Folge ohne Epic ist mindestens Epic.
- **Duplikate** werden zu Geld: Common 250 · Rare 600 · Epic 1.500 · Legendary 4.000.
- **Kein Echtgeld in v1.0.** Die Standard-Truhe kostet 5.000 Ingame-Geld
  (`standardChestPrice`), alle anderen werden verdient.

## Truhen

| Truhe | Woher | Common | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- | --- |
| Standard Chest | Shop (5.000), Mastery Stufe I, Daily Shift | 70 % | 22 % | 7 % | 1 % |
| Premium Chest | Mastery Stufe II und III | 35 % | 35 % | 22 % | 8 % |
| Criminal Hunt Chest | Mastery "Crime Fighter" (Takedowns) | 50 % | 30 % | 15 % | 5 % |
| Event Chest | City-/Saison-Events (nach v1.0) | 40 % | 35 % | 20 % | 5 % |

Innerhalb einer Seltenheit ist jedes Item gleich wahrscheinlich.

## Car Skins (19)

Lackierung der eigenen Autos in der Schlange. Mit Streifen: zwei dünne Rennstreifen über
Motorhaube, Dach und Heck.

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
| Carbon | `carbon` | Epic | fast schwarz |
| Black & Gold | `blackGold` | Epic | Carbon mit goldenen Streifen |
| Night Mint | `nightMint` | Epic | Graphit mit Mint-Streifen |
| Tiger | `tiger` | Epic | Orange mit schwarzen Streifen |
| Gold | `gold` | Legendary | Gold |
| Royal | `royal` | Legendary | Perlweiß mit goldenen Streifen |
| Lagoon | `lagoon` | Legendary | Lagunen-Türkis mit goldenen Streifen |

## Map Skins (8)

Tönen die Mittelinsel des Kreisverkehrs mit einem Ring in der Skin-Farbe.

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
| Rare | 6 | 2 | – | 8 |
| Epic | 4 | 2 | 1 | 7 |
| Legendary | 3 | 2 | – | 5 |
| **Summe** | **19** | **8** | **1** | **28** |

## Ideen für später (noch nicht im Spiel)

- **Weitere Fahrzeugtypen** mit fairen Eigenschaften: Kleinwagen (sehr kurz, langsamer
  beim Einfädeln), Van (lang, schwer), Oldtimer (wie ein Auto, eigene Form).
- **Muster-Skins**: Karo, Camouflage, zweifarbig geteilt.
- **Event-Skins** für die Event Chest (z. B. Winter, Halloween), nur zeitlich begrenzt.
- **Map Skins mit Details**: Bäume/Beleuchtung auf der Insel, andere Markierungsfarben.
- **Hupe/Sound-Skins** (rein kosmetisch).
