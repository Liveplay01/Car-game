# Idea.md – offene Ideen

Stand: 11.11.2026

Diese Datei enthält nur Ideen, die **noch nicht umgesetzt** sind. Was gebaut ist, steht in
[Spiel.md](Spiel.md) und [FOUNDATION.md](FOUNDATION.md), die Zahlen in `Web/src/core/config.ts`.
Gestrichene Ideen werden hier ebenfalls entfernt.

Die Spielidee in einem Satz: Autos per Tap in einen rotierenden Kreisverkehr einfädeln
(inspiriert von "Car Circle"), mit Polizei, Verbrechern, Geldtransportern, Wetter und
einer Stadt, die mit dem Spieler wächst.

---

## Designprinzipien (bleiben gültig)

1. **One Tap, sofortiges Feedback.** Jeder Tap fühlt sich unmittelbar und physisch an.
2. **Skill statt Zufall.** Situationen lesen und durch Timing lösen.
3. **Anticipation statt Überraschung.** Wichtiges wird rechtzeitig angekündigt.
4. **Positive Präzision.** Perfect Input, Tight Fit, Near Miss und Perfect Chain fühlen sich besonders gut an.
5. **Sonderfahrzeuge verändern Entscheidungen**, ohne den Kernloop zu ersetzen.
6. **Physik vermittelt Gewicht.**
7. **Economy bleibt unterstützend** und überdeckt nie die One-Tap-Mechanik.
8. **Die Stadt wächst sichtbar.**
9. **Cosmetics bleiben Cosmetics.** Skins geben keine Gameplay-Boni.
10. **Kein Feature-Bloat.** Neues fügt sich möglichst unsichtbar in den Spielfluss ein.
11. **Der Schichtwechsel bleibt flüssig.** Kein Freeze, kein Replay, keine Einblendung
    zwischen zwei Schichten (Highlight/Replay wurde deshalb gestrichen).
12. **Die Welt ist die Oberfläche** (Leo, 25.09.2026). Neues wird zuerst am Kreisverkehr
    gezeigt (Inselrand, Lichtsignale, Farbe), erst dann als klassische Anzeige. Keine Beschriftung,
    wo die Farbe am Ring schon alles sagt.
    Räumlich, aber leise: Tiefe durch Schatten und kleine Staffelung, kein 3D.
13. **Eine Stadt, mehrere Perspektiven.** Die Tabs sind Blicke auf dieselbe laufende Stadt,
    kein Menü über einem angehaltenen Spiel. Der Ring hört nie auf.

---

## Aus der Langzeit-Liste (Leo, 07.10.2026)

Gebaut: Touren (Haunted Ring, Winter Lights, Blossom Run, Sunset Boulevard), Saison-Regeln, Achievements (Mutator des Tages und Chill sind am 18.10. wieder entfernt).
Offen:

- **Challenge-Builder:** Wetter, Boss, Autozahl und Level selbst einstellen und als Link teilen (kein Freitext, keine Moderation).

---

## Wachstum: mehr Spieler erreichen (Leo, 04.10.2026)

Gebaut ist die Einladung per Link (beide bekommen bei Level 5 eine Chest). Was darüber hinaus am meisten
bringen dürfte, grob nach Aufwand und Wirkung:

1. **Ein Discord für das Spiel.** Der Discord-Webhook für „Build with us“ existiert; ein Discord, in dem
   Patch Notes erscheinen (aus `/changelog.json`), macht daraus einen Ort.
2. **Landeseiten für Suchbegriffe** auf timing.love: „Car Circle Alternative“, „Kreisverkehr Spiel“, „One-Tap-Spiel
   im Browser“. Das Museum liefert schon Text zu Bossen und Wetter; kurze Anleitungsseiten dazu ziehen Suchende an.
3. **Web Push für die Daily** („Neue Daily: Marathon“). Wirkt auf Wiederkehr, nicht auf Neue; braucht einen
   Push-Dienst im Server und einen Absatz in `legal.ts`. Erst wenn die Zahlen aus Umami zeigen, dass
   Spieler nach Tag 2 gehen.

Die Zahlen kommen aus Umami (Ereignisse `tutorial-done` und `shift` mit Modus, Level und Ausgang): wo Neue
aussteigen, entscheidet, welcher Punkt hier als Nächstes dran ist.

---

## Offener Bug: Geld zurückspulen über die Cloud-Kopie (Leo, 12.10.2026)

**Problem:** Der Spielstand ist die Quelle des Geldes, jede ältere Kopie (Cloud, Export/Import, zweites Gerät) ist ein Rückspulpunkt. Wer sich im Casino freiwillig verliert und dann einen alten Stand lädt, behält das Geld und kann das beliebig wiederholen (gemeldet von einem Spieler: Cloud-Sync entkoppeln, All-in verlieren, Code wieder eintippen).

**Schon gefixt (12.10.2026, `net/cloud.ts`):** Ein Code, den dieses Gerät beendet hat, spult nicht mehr zurück, solange die Cloud-Kopie unverändert ist (`rememberStopped`, `connectCloud`).

**Noch offen:** Export/Import, ein zweites Gerät, das die Cloud-Version zwischendurch ändert, und der Weg über DevTools.

**Lösung (nicht gebaut): Casino-Konto auf dem Server.**
1. Vor jeder Runde meldet das Spiel den Einsatz an den Server (`POST /v1/casino/bet`), der ihn sofort als Minus bucht; nach der Runde meldet es die Auszahlung (Plus). Eine nie gemeldete Wette zählt als verloren.
2. Der Server führt pro Spieler einen Saldo (Summe aller Gewinne und Verluste), nie zurückgesetzt.
3. Der Spielstand trägt den Saldo-Stand vom letzten Speichern. Beim Laden eines älteren Stands (Cloud, Import, anderes Gerät): `Geld += Serversaldo − gespeicherter Saldo`, mindestens 0.
4. Das Casino lässt Einsätze nur mit Server-Konto und Netz zu (sonst ließe sich offline verlieren, ohne es zu melden).
- Neues Server-Modul `Server/src/modules/casino` (Tabelle, Plausibilitätsgrenzen, Tests), Feld im Spielstand, Netzaufruf in `present/casinoFlow.ts`, Datenschutz in `legal.ts` (`LEGAL_UPDATED`), README.
- **Entscheidung nötig:** bricht die Regel „Geld wird lokal berechnet“ für das Casino, und das Casino ist dann nicht mehr offline spielbar.
- **Bleibt offen auch danach:** ein neues anonymes Konto mit altem Export (ohne echte Konten nicht zu verhindern; Mindest-Kontoalter fürs Casino würde es mühsamer machen) und Fälschen mit dem Schlüssel aus dem Bundle.

## Später: Neu-Punkte außerhalb der Segmente (Leo, 15.10.2026)

Das Neu-System (`present/news.ts`, Punkt am Tab und Segment, Marker am Element) kennt nur Progress, Shop und Social.
Neues auf dem Game-Tab (Heat-Pille, neuer Modus), in den Settings oder im Build-Tab hat keinen Platz für den Punkt.
Erst bauen, wenn eine konkrete Neuerung es braucht: dann steht fest, wo der Punkt hin soll.

## Weitere seltene Momente (Claude, 23.10.2026)

Wie die Entenfamilie (`core/ducks.ts`, etwa eine Schicht von 500): keine Punkte, keine Meldung, nur etwas, das man
weitererzählt. Was die Straße verändert, gehört in `core/` und darf nur aus dem Seed kommen (nie aus einem Strom, den
der Verkehr nutzt), damit Replays und Ranglisten gleich bleiben; was nur aussieht, gehört nach `present/`.
Gebaut am 04.11.2026 (Ballon, Hochzeitsauto, Sternschnuppe: `present/skyMoments.ts`, ab Prestige ★5 oder 30 Tagen Serie); die übrigen kommen mit derselben Schwelle.

- **Der Geburtstag:** Am Geburtstag des Spielers (falls er ihn im Konto angibt) trägt ein Auto in seiner Schlange
  Luftballons am Dach. Bräuchte ein neues, freiwilliges Feld; nur mit Zustimmung.
- **Die Katze auf der Insel:** Auf der Mittelinsel liegt eine Katze in der Sonne, steht nach einer Weile auf und geht.
  Nur Optik, nie bei Nacht.
- **Der Oldtimer-Korso:** Drei Oldtimer hintereinander, die eine Ehrenrunde drehen. Wie die Enten aus dem Seed, ohne
  Punkte, aber auf dem Ring: bräuchte dieselbe Absicherung wie der Hochzeitskorso.
- **Das Streifenwagen-Eis:** Ein Polizeiauto hält kurz an der Bushaltestelle der Schulweg-Schicht, ein Eiswagen steht
  daneben. Nur Optik.

## Anti-Cheat (Claude, 03.11.2026)

Umgesetzt am 04.11.2026: Replay-Prüfung für Unlimited und Daily, Flaggen im `/admin`, Casino-Zuwachs-Flagge und Tap-Verteilung (siehe Server/README.md, „Anti-cheat“).
Offen, grob nach Nutzen:

1. **Replay für Boss Rush und Shift-Level.** Gleiches Verfahren; Boss Rush braucht frische Welten und Aufnahme.
2. **Setup beweisen.** Level und Upgrades im Beweis sind selbst gemeldet; ein Server-Seed (Token mit Startzeit) oder die Cloud-Kopie könnte sie prüfen.
3. **Quarantäne (Shadow-Ban).** Geflaggte Scores sieht nur der Einreicher, bis ein Admin sie prüft.
4. **Siegel härten.** Schlüssel pro Installation, Zähler gegen Zurückspielen; Cloud-Sync-Sprünge prüfen (hängt mit „Geld zurückspulen über die Cloud-Kopie“ zusammen).
5. **Multiplayer.** Zustands-Hashes vergleichen; bei Abweichung zählt die Runde nicht.
6. **Melden.** „Melden“ an Bestenlisteneinträgen, später rückwirkende Prüfung gespeicherter Replays.


## Content-Ideen (Claude, 11.11.2026)

Aus einer Design-Runde am 11.11.2026. Contraflow ist gebaut (ab Prestige ★8, `contraflow*` in `config.ts`).
Doppel-Legendary gibt es schon seit 19.10.2026 (`legendaryExtraRanks`, `drawLegendaryExtra` in `core/levels.ts`).
Offen, grob nach Nutzen:

- **Goldene Lücke** (Aufwand S): Aus einem eigenen Seed-Strom (nie dem Verkehrsstrom) markiert das Spiel ab und zu eine
  Lücke zwischen zwei KI-Autos mit goldenem Schimmer auf dem Asphalt. Wer genau dort einfädelt, bekommt doppelte Punkte
  und +1 Kette. Die markierte Lücke ist oft eng, und wer auf sie wartet, bekommt mehr Verkehr. Anders als Critical Merge
  eine Entscheidung vor dem Tap, angezeigt nur durch die Welt. Prüfen: Der vorsichtige Bot ignoriert sie und crasht nicht
  öfter; ein gieriger Bot zeigt das Risiko. Einordnen in die Einstiegsleiter um Level 8. Offen: Zusammenspiel mit Critical Merge.
- **Rivale der Woche** (Aufwand S): Aus Freunden oder der Rangliste ein Spieler knapp über dir; wer seinen
  Unlimited-Rekord schlägt, bekommt eine Truhe. Ranglisten und der Push „überholt“ gibt es schon. Zielt auf die Wiederkehr nach Tag 2.
- **Ampel-Arm „Green Wave“** (City Event, Aufwand S–M): Eine KI-Zufahrt bekommt eine Ampel und schickt ihren Verkehr
  in Pulks, in festem Takt; die Phase leuchtet am Inselrand. Man tippt in die Pause zwischen zwei Pulks. Regeln bleiben
  gleich, nur die Lücken ändern sich. Braucht Museumseintrag, Icon, Briefing.
- **Knoten (Lücken-Rätsel)** (Aufwand M): Eine eingefrorene Situation mit drei eigenen Autos; Ziel: alle in einer
  Ringrunde einfädeln, Sterne nach Präzision. Ein Generator in `core/` sucht Seeds, die der vorsichtige Bot nur mit genau
  einem Timing-Fenster löst: 20 Rätsel pro Woche ohne Handarbeit. Trägt sich auf der Trial-Infrastruktur.
- **Gauntlet** (ab ★1, Aufwand M): Ein Leben, Schichten mit je 5 Autos, jede Stufe bringt die nächste Mechanik der
  Leiter (Polizei, Lkw, Regen, Krankenwagen, Boss, Nacht …). Zeigt in etwa 6 Minuten die ganze Welt; feste Leiter, also
  vergleichbar auf einer Rangliste.
- **Doppel-Legendary-Belohnung** (Aufwand S): Ein eigener Skin nach 10 geschafften Schichten mit zwei Legendary-Regeln.
- **Melodie-Sets** (Aufwand M): Die Merge-Noten mit anderen Instrumenten oder Tonleitern (Marimba, Glocken, Synth),
  freigeschaltet über Mastery-Stufen. Klänge per Python-Script wie die Casino-Sounds. Kein Vorteil auf der Straße.
- **Spurmuster** (Aufwand S): Kosmetik für die Reifenspuren nach einer gekonnten Einfädelung (Chevron, Punkte,
  Flammenrand). Nur Muster, keine Signalfarben: Fahrzeugfarben sind Spielinformation.
- **Stadtchronik** (Aufwand S–M): Am Saisonende eine Karte zum Teilen: geschickte Autos, Wracks, längste Kette,
  Lieblingswetter, gestellte Bosse. Daten liegen in `Career.stats`.
