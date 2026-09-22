# Idea.md – Car Circle-inspiriertes iOS-Spiel

Stand: 21.09.2026

## Inspiration

Ausgangspunkt ist das Browserspiel "Car Circle" (Shoom Games): One-Tap-Timing-
Spiel, bei dem man wartende Autos per Klick/Tap in einen rotierenden
Kreisverkehr einfädelt, ohne zu kollidieren. Keine Lenkung, kein Gas, keine
Bremse – die einzige Interaktion ist der Zeitpunkt des Tastendrucks.

## Kernkonzept (unsere Version)

- Gleiche Grundmechanik: Auto aus einer Warteschlange per Tap in einen
  rotierenden Kreisverkehr einfädeln, Kollision = Fehler.
- Zusätzlich zur reinen Einfädel-Mechanik gibt es aktive Sondertypen im
  Verkehr: Verbrecher-Bots, Geldtransporter und normale Trucks (siehe unten)
  – diese verlangen vom Spieler mehr als nur "sauber einfädeln".
- Gesammeltes Geld ist die zentrale Meta-Währung, mit der man sein eigenes
  Straßennetz im Editor erweitert und ausbaut (siehe "Wirtschaft &
  Meta-Progression").

## Rundenstruktur: Schicht statt Endlos-Loop (bestätigt)

- Statt unendlich langer Runden hat eine Standard-Runde ein klares
  Schicht-Ende (z. B. "Arbeitstag-Schicht: 2 Minuten").
- **Rush Hour** in den letzten ca. 20 Sekunden: Verkehr beschleunigt sich
  spürbar (z. B. +25%), die Musik zieht an (siehe Sound Design), und
  Belohnungen (Punkte, evtl. Zoll-/Transporter-Erträge) verdoppeln sich
  kurzzeitig. Erzeugt einen verlässlichen Spannungs-Peak kurz vor
  Rundenende statt eines gleichförmigen Verlaufs.
- Passt gut zum Cops-Thema (echte Schichtarbeit) und gibt jeder Runde einen
  klaren dramaturgischen Bogen: ruhiger Einstieg, steigende Komplexität
  durch Verbrecher/Transporter, Rush-Hour-Finale.

## Game-Over-Regeln: Hard Fail vs. Soft Fail (Empfehlung, noch zu entscheiden)

- **Bereits klar**: Entkommt ein Verbrecher-Pickup unerkannt (Zeitlimit
  überschritten), ist die Runde sofort vorbei (Hard Fail).
- **Offene Frage bisher**: Was passiert bei einer normalen Kollision
  zwischen zwei gewöhnlichen Autos?
- **Empfehlung**: Zweistufiges System statt eines reinen Hard-Fail-Modells:
  - Eine einzelne normale Kollision ist ein **Soft Fail**: Combo wird
    zurückgesetzt, kleiner Punktabzug in der Rundenbilanz – die Schicht
    läuft weiter.
  - Erst eine bestimmte Anzahl Kollisionen innerhalb einer Schicht (z. B.
    3 "Strikes") führt zum **Hard Fail** (Rundenabbruch).
  - Begründung: Bei einer 2-Minuten-Schicht mit vielen gleichzeitigen
    Systemen (Combo, Verbrecher, Transporter, Zoll) fühlt sich ein einzelner
    Patzer, der sofort die ganze Schicht beendet, überproportional hart an.
    Das Strike-System behält Spannung (Fehler kosten etwas, häufen sich
    gefährlich), ohne dass ein Wackler sofort 2 Minuten Fortschritt
    vernichtet.
  - Alternative, falls die "Car Circle"-typische Härte bewusst gewünscht
    ist: bei der klassischen Variante bleiben (jede Kollision = Hard Fail)
    und stattdessen die Schicht kürzer halten. Das ist letztlich eine
    Geschmacksfrage, die früh im Playtesting entschieden werden sollte.

## Combo-/Streak-System (Teil der Kernmechanik – bestätigt)

- Mehrere perfekte, knapp getimte Einfädelungen in Folge bauen einen Combo-
  Zähler auf.
- Der Combo-Zähler erhöht einen Punkte-Multiplikator (z. B. ab 5er-Streak
  x1,5, ab 10er-Streak x2 usw.).
- Eine Kollision oder eine "unsaubere" Einfädelung (zu knapp, ruckartig)
  setzt den Combo zurück.
- Visuelles/haptisches Feedback bei steigendem Combo (Screen-Glow,
  Haptik-Feedback, dezenter Sound).
- **Tight-Fit-Bonus (bestätigt)**: Wird ein Auto mit nur sehr knappem
  Abstand vor oder hinter einem anderen eingefädelt, ohne zu crashen, gibt
  es einen visuellen Swoosh-Effekt, ein scharfes, kurzes Haptik-Klicken
  (Taptic Engine) und doppelte Combo-Punkte für diese Einfädelung. Wichtig
  fürs Spielgefühl: riskantes, knappes Spielen muss sich lohnender und
  physisch besser anfühlen als vorsichtiges Spielen mit großem Abstand.

## Verbrecher-Bots & Polizei-Mechanik (bestätigt)

- Verbrecher-Bots haben einen festen, klar erkennbaren Fahrzeugtyp:
  **Pickup-Truck** – dadurch sofort optisch von normalem Verkehr, normalen
  Trucks und Geldtransportern unterscheidbar.
- Diese müssen aktiv gerammt/gecrasht werden – aber **nur mit einem
  Polizeiauto**, ein normales Auto reicht nicht.
- Zeitlimit: schafft man es nicht rechtzeitig, den Verbrecher-Pickup zu
  crashen, **verliert der Spieler die Runde**.
- Zweite, aktive Gefahrenquelle zusätzlich zur passiven Kollisionsvermeidung
  im Grundloop – Abwägung zwischen "sauber einfädeln" (Combo halten) und
  "Verbrecher jagen" (Rundenziel erfüllen).

### Design-Ideen zur Vertiefung dieser Mechanik

- **Telegraphing/Vorwarnung**: kurzes visuelles/akustisches Signal (z. B.
  "Wanted"-Banner, Sirene), bevor ein Verbrecher-Pickup auftaucht.
- **Panic-Button / "Einsatzfahrt" (bestätigt – löst das Warteschlangen-
  Problem)**: Taucht ein Verbrecher-Pickup auf, während vorne in der
  Warteschlange gerade nur normale Autos/ein Geldtransporter stehen, wäre
  der Spieler sonst chancenlos gegen das Zeitlimit. Ein Sondersignal-Button
  (Tap & Hold oder Quick-Swipe) schaltet die Warteschlange kurzzeitig auf
  "Einsatzfahrt": das nächste Fahrzeug wird zum Polizeiauto, oder wartende
  Fahrzeuge dürfen übersprungen werden. Kostet dafür einen Teil des
  aktuellen Combos oder eine "Blaulicht-Gebühr" in Ingame-Geld – erzeugt
  eine echte Sekundenentscheidung unter Druck, statt dass der Spieler durch
  reines Queue-Pech verliert. Damit ist auch die Frage "wie kommt der
  Spieler an das Polizeiauto" beantwortet: standardmäßig über die normale
  Warteschlange, im Notfall über diesen kostenpflichtigen Override.
- **Klare Trennung "guter" vs. "schlechter" Crash (bestätigt, konkretisiert)**:
  Beim Verbrecher-Takedown friert das Spiel für ca. 0,3 Sekunden in einem
  kurzen Cinematic-Slow-Mo ein, während stilisierte, flache Splitter-
  Partikel in Vektor-Optik fliegen (passt zum cleanen Look, keine
  realistischen/harten Trümmer-Effekte). Deutlich abgesetzt von der
  neutralen/negativen Präsentation eines normalen Unfalls.
- **Trade-off statt reinem Zusatzziel**: das Timing des Polizeiautos
  unterbricht kurz den normalen Einfädel-Rhythmus – echte Entscheidung
  zwischen Combo halten und Verbrecher jagen.
- **Eskalation/Wanted-Level** bei mehreren gleichzeitigen Verbrecher-Pickups
  in späteren, größeren Kreisverkehren.
- **Polizeiauto- und Spezialeinheiten-Skins** (Streife, SWAT, Interceptor) –
  Anknüpfung an das Lootbox-/Skin-System.

## Geldtransporter-Mechanik (bestätigt)

- Zusätzlich zu normalem Verkehr und Verbrecher-Pickups taucht **zufällig**
  ein Geldtransporter im Kreisverkehr auf.
- Ziel: Der Geldtransporter soll unbeschadet aus dem Kreisverkehr bzw. von
  der Karte herunterfahren – schafft er das, **bekommt der Spieler das
  Geld**.
- Zentrale Einschränkung: **Direkt vor oder hinter dem Geldtransporter darf
  kein Polizeiauto eingefädelt werden.** Landet ein Polizeiauto in einer
  dieser beiden Lücken, **nimmt die Polizei den Geldtransporter fest** – der
  Spieler bekommt in dem Fall kein Geld.
- In diese beiden kritischen Lücken sollte der Spieler stattdessen gezielt
  normale Autos einfädeln, um den Transporter "abzuschirmen".
- Zusätzlicher Konflikt zur Verbrecher-Mechanik: Polizeiautos werden
  gleichzeitig für die Verbrecherjagd gebraucht, dürfen aber nicht in der
  Nähe des Transporters landen – erfordert genaues Beobachten, wo sich beide
  gerade im Kreis befinden.
- **Implementierungs-Hinweis**: Position des Geldtransporters im Kreis muss
  jederzeit gut erkennbar sein (auffällige Farbe/Kennzeichnung).

### Weitere Ideen zum Geldtransporter

- **Doppel-Transporter-Events**: selten zwei Geldtransporter gleichzeitig für
  höheres Risiko/höhere Belohnung.
- **Eskortierender Verbrecher-Pickup**: versucht sich an den Transporter
  heranzufahren – Spieler muss ihn abfangen, ohne selbst zu nah an den
  Transporter zu geraten.
- **Transporter-Fluchtweg-Anzeige**: kurzer visueller Hinweis, an welcher
  Ausfahrt der Transporter die Karte verlassen wird.

## Zollstellen im Straßeneditor (bestätigt – passive Einnahmequelle)

- Im Straßeneditor (dort, wo auch die Map erweitert wird) können **Zoll-
  stellen** gekauft und auf bestimmten Straßen/Ausfahrten platziert werden.
- Jeder normale **Truck**, der durch eine Zollstelle fährt, zahlt automatisch
  eine Gebühr an den Spieler – eine **passive** Einnahmequelle, unabhängig
  vom aktiven Einfädel-Gameplay.
- Das ergänzt die aktiven Einnahmequellen (Rundenabschluss, gerettete
  Geldtransporter) um eine dritte, eher idle-artige Schiene: Geld läuft
  weiter auf, auch ohne perfektes Spiel in der jeweiligen Runde.
- Truck-Spawn-Wahrscheinlichkeit ist ebenfalls per Kauf erhöhbar (siehe
  Wahrscheinlichkeits-Upgrades) – macht Zollstellen mit steigendem Invest
  wertvoller, klassischer Idle-Upgrade-Loop.

### Weitere Ideen zu Zollstellen

- **Platzierung als Strategie**: manche Straßen/Ausfahrten haben von Natur
  aus mehr Truck-Verkehr – deren Zollstellen sind wertvoller, was der
  Kartenerweiterung eine zusätzliche taktische Ebene gibt (wo baue ich
  zuerst aus?).
- **Zollstellen-Upgrades**: höhere Gebühr pro Truck, oder Anzeige/Vorschau,
  wann der nächste Truck durchfährt.
- **Offline-Sammel-Mechanik**: Zolleinnahmen laufen auch auf, während man
  nicht spielt, und werden beim nächsten Öffnen der App "abgeholt" – passt
  gut zum bereits geplanten Daily-Login-Feature und gibt einen zusätzlichen
  Grund, täglich reinzuschauen.

## Risiko-Mechaniken: Wirtschaft schafft Gefahr (bestätigt)

Grundprinzip: Wirtschaftliche Upgrades (Zollstellen, mehr Trucks, größere
Map) sollen nicht nur "mehr Einnahmen" bedeuten, sondern jeweils eine echte
Kehrseite haben – sonst ist der Ausbau immer nur eine reine Vorteils-
Entscheidung statt einer strategischen Abwägung.

- **Zollstellen verursachen Stau (bestätigt)**: Jede gebaute Zollstelle
  bremst den Verkehr in ihrer Nähe ab. Dieser Stau kommt normalem Verkehr
  und der Polizei in die Quere – **Verbrecher-Pickups halten sich aber nicht
  an Regeln** und können den Stau ausnutzen, um schneller bzw. leichter zu
  entkommen (z. B. Lücken/Gegenspuren nutzen, die normale Autos und Polizei
  nicht nutzen dürfen).
  - Effekt: Mehr Zollstellen = mehr passives Einkommen, aber auch kürzere
    effektive Zeit, um Verbrecher rechtzeitig zu fassen, weil die Polizei
    selbst im eigenen Stau feststecken kann.
  - Das verzahnt Zollstellen, Verbrecher-Mechanik und die
    Wahrscheinlichkeits-Upgrades zu einem gemeinsamen Risiko/Ertrags-System,
    statt getrennte Feature-Inseln zu sein.

### Gefahrenstufe vor Rundenstart – "Push Your Luck" (bestätigt)

- Vor jeder Schicht wählt der Spieler zwischen "Normaler Dienst" und
  "Gefahrenstufe Hoch".
- Bei Gefahrenstufe Hoch: Zollstellen-Stau doppelt so stark, Verbrecher-
  Pickups ca. 20% schneller – dafür werden sämtliche Zolleinnahmen und
  Geldtransporter-Belohnungen in dieser Schicht verdreifacht.
- Gibt dem Spieler die Kontrolle darüber, wann er bewusst ins Risiko geht,
  statt dass Schwierigkeit nur passiv durch Map-Größe/Upgrades steigt –
  ergänzt die bereits bestätigten Risiko-Mechaniken um eine bewusste,
  session-basierte Entscheidung.

### Weitere Ideen für diese Risiko/Ertrags-Verzahnung

- **Verkehrsleitsystem-Upgrade**: eigenes, teures Upgrade, das den
  stauverursachenden Nebeneffekt von Zollstellen abschwächt – gibt Spielern
  eine Möglichkeit, das Risiko gezielt zurückzukaufen, statt es nur zu
  akzeptieren oder zu meiden.
  Trade-off: Investiere ich das Geld in mehr Zollstellen (mehr Ertrag, mehr
  Risiko), oder in ein Verkehrsleitsystem (weniger Risiko, kein Zusatzertrag)?
- **Verbrecher spawnen bevorzugt an stauigen Zollstraßen**: verstärkt den
  thematischen Zusammenhang – wo viel Verkehr steht, treiben sich auch mehr
  Verbrecher-Pickups herum.
- **Mehr Trucks = mehr Grundverkehr überall**: das Truck-Spawn-Upgrade (für
  mehr Zolleinnahmen) erhöht nicht nur den Verkehr an Zollstellen, sondern
  die allgemeine Fahrzeugdichte im Kreisverkehr – macht auch das normale
  Einfädeln/den Combo-Erhalt schwieriger, nicht nur die Verbrecherjagd.
  Damit wirkt sich praktisch jedes Wirtschafts-Upgrade auf die
  Kernschwierigkeit aus, nicht nur auf ein isoliertes System.
- **Sichtbare Warnung bei hohem Stau-Level**: z. B. ein UI-Indikator, der
  anzeigt, wie "gefährlich" die aktuelle Verkehrslage gerade ist (mehr
  Zollstellen aktiv = höheres Level) – hilft Spielern, die Konsequenz ihrer
  eigenen Ausbau-Entscheidungen einzuschätzen, bevor eine Runde eskaliert.
- **Maut-Ausweich-Verhalten**: Verbrecher-Pickups könnten zusätzlich
  versuchen, Zoll-Straßen gezielt zu meiden, wenn sie nicht gerade den Stau
  ausnutzen – kleiner thematischer Bonus, eher etwas für später, kein Muss
  für den MVP.

## Wirtschaft & Meta-Progression

**Geld verdienen:**

- Abschluss einer Runde (Grundbetrag für "geschafft").
- Erfolgreich entkommene Geldtransporter.
- Passive Zolleinnahmen von Trucks an gebauten Zollstellen.

**Geld ausgeben:**

- **Map-Erweiterung**: Mit Geld wird das eigene Straßennetz/die Karte im
  Editor vergrößert (neue Kreisverkehre/Kreuzungen, mehr Fläche, mehr Platz
  für Zollstellen).
  - Risk/Reward: Eine größere Karte spawnt automatisch **mehr Bots** – mehr
    normaler Verkehr, aber auch mehr Verbrecher-Pickups und mehr
    Geldtransporter-Gelegenheiten.
- **Wahrscheinlichkeits-Upgrades**: Geld verschiebt bestimmte Zufallswerte
  (siehe unten).
- **Zollstellen selbst** (Bau + Upgrades, siehe oben).

### Wahrscheinlichkeits-Upgrades (kaufbar)

- Spawn-Chance für Geldtransporter erhöhen (bestätigt).
- Spawn-Chance für normale **Trucks** erhöhen (bestätigt) – macht Zollstellen
  wertvoller, direkte Verzahnung der beiden neuen Systeme.
- Spawn-Chance für Verbrecher-Pickups **senken** – Gegenspieler zu den
  beiden Einkommens-Upgrades: mehr Sicherheit statt mehr Einkommen, echte
  strategische Entscheidung zwischen aggressiver Geldwirtschaft und
  entspannterem Spiel.
- Zeitlimit fürs Crashen von Verbrecher-Pickups leicht verlängern.
- Häufigkeit von zusätzlichen Polizeiautos in der Warteschlange erhöhen.
- Chance auf Doppel-Transporter-Events leicht erhöhen.
- Leichte Erhöhung der Seltenheits-Odds in Lootboxen als eigenständiges,
  separat kaufbares Upgrade ("Glücks-Bonus") – aktuelle Odds dabei immer
  transparent im Truhen-Screen anzeigen.

## Skins (nur über Lootboxen)

- Skins werden **ausschließlich über Lootboxen** freigeschaltet, nicht
  direkt per Fortschritt oder Ingame-Währungskauf.
- Fahrzeug-Skins, Polizeiauto-/Spezialeinheiten-Skins, Truck-Skins,
  Umgebungs-/Straßen-Skins – alle über das Lootbox-System.
- **Multiplayer-Skins**: Bestimmte (seltene) Skins schalten zusätzlich einen
  Multiplayer-Modus frei bzw. bringen ihn mit – starker Kaufanreiz.
  - **Zu beachten**: Sobald eine Lootbox nicht nur Kosmetik, sondern eine
    echte Funktion (Multiplayer-Zugang) freischaltet, wird das
    regulatorisch heikler als reine Kosmetik-Lootboxen (Belgien hat
    funktionale Lootboxen z. B. komplett verboten). Empfehlung: Multiplayer
    grundsätzlich mit einem Standard-Skin spielbar machen, nur exklusive
    kosmetische Multiplayer-Skins über Lootboxen anbieten.
- Seltenheitsstufen (Common/Rare/Epic/Legendary), dezent codiert über
  Rahmenfarben oder Glow-Effekte statt grelle Farben.
- **Geprüft, aktuell nicht empfohlen – passive Gameplay-Boni auf Skins**:
  Die Idee, Lootbox-Skins kleine passive Vorteile fürs Straßennetz zu geben
  (z. B. "Classic Police Skin" = 5% mehr Timing-Toleranz beim Ramm-Timing,
  "Tuning-Truck" = 10% mehr Zoll), macht das Sammeln zwar spürbar
  relevanter – kombiniert damit aber Glücks-Zufall direkt mit echter
  Spielstärke, nicht nur mit Kosmetik oder Zugang. Das ist eine strengere
  Form von genau dem Problem, das schon bei den Multiplayer-Skins notiert
  ist (siehe oben) – "zufällig erkaufte Vorteile" sind der klassische
  Auslöser für Pay-to-win-Kritik und verschärfen die
  Lootbox-Regulierungsfrage (Belgien etc.) zusätzlich, weil es hier nicht
  mehr nur um Zugang, sondern um direkten Spielvorteil geht. Es untergräbt
  außerdem den Skill-Anspruch des Spiels: Wer viel bezahlt hat, timt
  buchstäblich leichter als wer nicht bezahlt hat. Empfehlung: Skin-Boni,
  wenn überhaupt, nur rein kosmetisch halten, oder falls funktionale
  Synergien gewünscht sind, diese über deterministisch verdiente
  Meisterschafts-/Achievement-Systeme vergeben statt über Zufalls-Lootboxen.

## Lootbox-Typen (bestätigt: mehrere Arten)

- **Standard-Box**: verdienbar durch Spielfortschritt/Ingame-Währung,
  überwiegend Common/Rare-Inhalte.
- **Premium-Box**: nur gegen Echtgeld, bessere Odds für Epic/Legendary,
  inkl. Chance auf Multiplayer-Skins.
- **Event-Box**: zeitlich begrenzt, exklusive Themen-Skins.
- **Verbrecherjagd-Box** (optional): verdienbar über Erfolge in der
  Verbrecher-Mechanik, Fokus auf Polizei-/Spezialeinheiten-Skins.

Jede Box-Art braucht eine eigene, klar sichtbare Odds-Tabelle.

## Glücksbasierte Truhen – allgemeine Regeln (bestätigt)

- **Pity-System**: garantierter seltener Skin nach z. B. 20 Truhen ohne
  Treffer (gilt pro Box-Typ).
- **Odds-Transparenz**: Gewinnwahrscheinlichkeiten pro Box-Typ direkt im
  Truhen-Screen sichtbar, inkl. Anpassung bei aktiven Glücks-Bonus-Upgrades.
- **Zu beachten:**
  - Apples App Store Review Guidelines (3.1.1) verlangen diese
    Odds-Offenlegung bei Zufalls-Truhen ohnehin verpflichtend.
  - In Deutschland/EU können Zufallsmechaniken mit Geldeinsatz die
    Altersfreigabe (USK/PEGI) beeinflussen – bei der Multiplayer-Skin-Box
    besonders relevant, siehe Hinweis oben.

## Look & Feel

- Sehr clean, minimalistisch, Apple-artige Optik: viel Raum, reduzierte
  Farbpalette, hoher Kontrast.
- Dark Theme als Basis, dezente Akzentfarbe für wichtige Elemente.
- UI orientiert an Apples Human Interface Guidelines: große, klare
  Typografie, SF-Symbols-artige Icons, Feedback über Bewegung/Haptik.
- Animationen: durchgehend smooth, physically-based Easing (Spring-
  Animationen), keine harten Schnitte.
- Gesamteindruck: premium, ruhig, hochwertig.

### Sound Design & Dynamic Audio (bestätigt)

- Soundtrack baut sich dynamisch mit dem Combo-Multiplikator auf (z. B.
  zusätzliche Instrumente/Bässe ab 5x/10x Combo), statt eines statischen
  Loops.
- Beim Auftauchen eines Verbrecher-Pickups blendet die Musik in ein
  dezentes, pulsierendes Synthwave-Sirenensignal über.
- In der Rush-Hour-Phase (siehe Rundenstruktur) zieht der Musik-Beat
  zusätzlich an – Audio als aktives Spannungsmittel, nicht nur Ambiente.
- Technisch am ehesten über adaptive Audio-Layer (z. B. mehrere
  synchronisierte Stems, die je nach Spielzustand ein-/ausgeblendet werden)
  statt vorgerenderter, fester Musikstücke.

## Technik (entschieden, Details in FOUNDATION.md)

- **Swift** – nativ, bewusst kein Cross-Plattform-Framework und keine Engine.
- Spiellogik und Darstellungslogik liegen in einem plattformneutralen
  Swift-Paket. Es wird unter Windows entwickelt und dort in einem Testfenster
  gespielt. Der Mac wird nur zum Fertigmachen genutzt.
- iPhone-App: Spielszene (Kreisverkehr, Fahrzeuge, Timing) in SpriteKit,
  Menüs (Shop, Truhen, Straßeneditor/Stadt-Übersicht) in SwiftUI, Haptik über
  Core Haptics.
- Läuft auf jedem iPhone mit iOS 27. Sprache im Spiel: nur Englisch.
- Veröffentlichung weltweit über den App Store, die eigene Website ist die
  Startseite des Spiels (siehe PLAN.md).
- Mögliche native Anbindungen: GameKit (Leaderboards, Achievements,
  Multiplayer-Grundlage), CloudKit (Spielstand-Sync), StoreKit
  (In-App-Käufe/Premium-Boxen).

## Bestätigte nächste Features (zusätzlich zum Kernloop)

- **Combo-/Streak-System**
- **Verbrecher-Bots & Polizei-Mechanik** (Fahrzeugtyp: Pickup)
- **Geldtransporter-Mechanik** inkl. Polizei-Ausschlusszonen davor/dahinter
- **Zollstellen im Straßeneditor** als passive Einnahmequelle von Trucks,
  inkl. stauverursachendem Risiko, das Verbrechern das Entkommen erleichtert
- **Map-Erweiterung über Geld**, inkl. steigender Bot-Anzahl bei größerer Map
- **Wahrscheinlichkeits-Upgrades** (Transporter-, Truck- und
  Verbrecher-Spawns, Zeitlimit, Polizei-Häufigkeit, Glücks-Bonus)
- **Lootboxen in mehreren Varianten**, inkl. Pity-System und
  Odds-Transparenz pro Box-Typ
- **Skins ausschließlich über Lootboxen**, inkl. Multiplayer-Skins als
  Kaufanreiz (mit rechtlichem Hinweis oben)
- **Tägliche Login-Belohnungen / Streak-Kalender** (inkl. Abholen der
  Zolleinnahmen)
- **Season Pass** mit kostenlosem + Premium-Track
- **Apple-Ökosystem-Integration**: Home-Screen-Widget (Zolleinnahmen/
  Netzwerkstatus), Live Activity/Dynamic Island (aktive Verbrecherjagd/
  Geldtransporter), Apple-Watch-Companion-App, Siri Shortcuts, SharePlay/
  MultipeerConnectivity für lokales Multiplayer
- **Differenzierte Haptik-Muster** je Ereignis (Verbrecher gefasst,
  Geldtransporter gerettet, Truhe geöffnet, Kollision)
- **Inhaltliche Abwechslung**: Tag/Nacht-Zyklus bzw. Wetter,
  Krankenwagen/VIP-Konvoi (muss bevorzugt durchgelassen werden), temporäre
  Baustellen/Sperrungen, wöchentliches Boss-Event ("Kopf des Verbrechens")
- **Langzeit-Progression**: Perfect-Run-Bonus, Prestige-System nach voll
  ausgebauter Karte
- **Barrierefreiheit**: farbenblind-freundlicher Modus mit zusätzlichen
  Icons/Mustern statt reiner Farbcodierung für Fahrzeugtypen
- **Panic-Button/Einsatzfahrt** zur Polizeiauto-Priorisierung (inkl. Action-
  Button-Mapping auf unterstützten iPhones)
- **Tight-Fit-Bonus** für knappe, unfallfreie Einfädelungen
- **Rundenstruktur als Schicht** (fixe Länge, z. B. 2 Minuten) mit
  Rush-Hour-Finale in den letzten ~20 Sekunden
- **Gefahrenstufen-Wahl vor Rundenstart** ("Push Your Luck": mehr Risiko
  gegen dreifachen Ertrag)
- **Dynamisches Sound-Design**, das mit Combo und Rush-Hour mitwächst
- **Funktionales Wetter-/Tag-Nacht-System** (kleine Timing-Verschiebung,
  nicht nur optisch)

## Weitere Ideen für später (noch nicht final entschieden)

- **Tägliche/wöchentliche Challenges**: z. B. "Fasse 5 Verbrecher in einer
  Runde", "Bring 3 Geldtransporter sicher raus".
- **Leaderboards & Achievements über GameKit**, inkl. "Verbrecher gefasst",
  "Geldtransporter gerettet" und "Zolleinnahmen gesamt" als eigene Werte.
- **Zeitlich begrenzte Events**: saisonale Themes, Doppel-Punkte-Wochenenden.
- **Comeback-Mechaniken**: dezente Push-Notifications bei ungenutzten
  Truhen, wartendem Straßennetz oder vollen Zollstellen.
- **Social Sharing**: Replay-Clips von knappen Einfädelungen, Verbrecher-
  Takedowns oder geretteten Geldtransportern.
- **Asynchroner Freundevergleich**: Bestzeit/Highscore eines Freundes
  schlagen, statt Echtzeit-Multiplayer.
- **Spezialeinheiten/Power-ups** (SWAT-Van, Hubschrauber-Marker, Nagelband).

## Ökosystem-Integration, Abwechslung & Langzeit-Progression (bestätigt)

### Tiefere Apple-Ökosystem-Integration

Passt besonders gut zum Ziel "alles soll ins Apple-Ökosystem übergehen":

- **Home-Screen-Widget**: zeigt z. B. aktuell aufgelaufene Zolleinnahmen
  oder den Zustand des eigenen Straßennetzes, ohne die App zu öffnen.
- **Live Activity / Dynamic Island**: z. B. ein laufender Countdown, wenn
  gerade ein Verbrecher-Pickup gejagt werden muss, oder eine Live-Anzeige
  für einen aktiven Geldtransporter – Spannung auch außerhalb der App.
- **Apple Watch Companion-App**: schneller Blick auf Zolleinnahmen/
  Fortschritt, evtl. Haptik-Benachrichtigung bei besonderen Ereignissen.
- **Siri Shortcuts**: z. B. "Hey Siri, sammle meine Zolleinnahmen".
- **SharePlay oder MultipeerConnectivity** für lokales Multiplayer/Vergleich
  mit Freunden im selben Raum – ggf. einfachere/rechtlich unkompliziertere
  Alternative oder Ergänzung zum Lootbox-gebundenen Online-Multiplayer.
- **Action Button (iPhone 15 Pro / 16 Serie, bestätigt)**: direkt auf den
  Panic-Button/"Einsatzfahrt"-Befehl mappen (siehe Verbrecher-Mechanik) –
  fühlt sich für Besitzer dieser Geräte sehr haptisch/nativ an. Klassischer
  Fallback-Button in der UI bleibt für alle anderen Geräte selbstverständlich
  bestehen.
- **Idee mit Einschränkung – "Pendler-Modus"**: ein Widget-/Fokus-Zustand,
  der passive Zolleinnahmen erst meldet, wenn der Nutzer sein reales
  Fahrtziel erreicht hat. Thematisch nett (Zolleinnahmen spiegeln die echte
  Pendelfahrt), aber über CoreLocation umgesetzt wäre das eine Standort-
  Berechtigung, die für ein Casual-Spiel unverhältnismäßig wirkt (schlecht
  für Install-/Berechtigungs-Akzeptanz, potenziell auch für die
  App-Review-Begründung). Leichtere Alternative: die iOS **Focus-Status-API**
  nutzen, die nur meldet, ob z. B. der "Fahren"-Fokus aktiv ist – ganz ohne
  Standortzugriff. Deutlich schlankere Umsetzung derselben Grundidee.
- Durchgängige, unterschiedliche **Haptik-Muster** je Ereignis (Verbrecher
  gefasst, Geldtransporter gerettet, Truhe geöffnet, Kollision) statt nur
  eines generischen Feedbacks – verstärkt das "premium"-Gefühl spürbar.

### Inhaltliche Abwechslung ohne neue Kernsysteme

- **Tag/Nacht-Zyklus oder Wetter, funktional statt nur optisch (bestätigt,
  konkretisiert)**: Regen/Glatteis verändert leicht den Anhalteweg bzw. den
  Reaktionsabstand der KI-Fahrzeuge im Kreisverkehr – das Timing-Fenster für
  eine "perfekte Einfädelung" verschiebt sich dadurch rhythmisch über eine
  Schicht hinweg. Wichtig: Effekt bewusst klein/vorhersehbar halten, sonst
  wird das exakte Timing-Gameplay unfair statt nur abwechslungsreich. Passt
  gut zum Dark-Theme-Look, ohne neue Wirtschaftssysteme zu brauchen.
- **Mehrspurige Kreisverkehre – automatisch statt zusätzlicher Eingabe**:
  Spätere/größere Kreisverkehre bekommen eine Innen- und Außenspur (normale
  Autos außen, Geldtransporter innen, Verbrecher-Pickups versuchen von innen
  nach außen zu drängeln). Empfehlung zur Umsetzung: die Spurzuweisung
  automatisch nach Fahrzeugtyp steuern, statt vom Spieler ein zweites,
  separat getimtes Tippen pro Fahrzeug zu verlangen – sonst geht die
  namensgebende Stärke des Genres verloren, nämlich dass die gesamte
  Interaktion ein einziger, präzise getimter Tap bleibt. Die zweite Spur
  bringt dann visuelle/räumliche Komplexität (mehr im Blick zu behalten),
  ohne die Eingabe selbst zu verkomplizieren.
- **Zusätzliche Sonderfahrzeuge**: z. B. ein Krankenwagen/VIP-Konvoi, der
  nicht gejagt, sondern im Gegenteil **bevorzugt und ungehindert**
  durchgelassen werden muss – umgekehrte Variante der Verbrecher-Mechanik,
  gute Abwechslung mit wenig zusätzlichem System-Aufwand.
- **Temporäre Baustellen/Sperrungen**: zufällige, kurzzeitige
  Kapazitätsreduktion an einer Stelle im Kreisverkehr – Abwechslung
  innerhalb einer bestehenden Karte, unabhängig vom Zollstellen-Stau.
- **Wochen-Boss-Event**: ein selten auftauchender "Kopf des Verbrechens" -
  Fahrzeug, das schwerer zu fassen ist (z. B. muss zweimal gerammt werden
  oder erfordert zwei Polizeiautos gleichzeitig), mit eigener, exklusiver
  Belohnung – guter wöchentlicher Wiederkehr-Anreiz zusätzlich zu Season Pass
  und Daily-Login.

### Langzeit-Progression

- **Perfect-Run-Bonus**: zusätzliche Belohnung (Lootbox-Fragmente/Bonus-
  Geld), wenn eine Runde ganz ohne Beinahe-Kollisionen oder Combo-Verlust
  abgeschlossen wird – belohnt Skill zusätzlich zum reinen Punktesammeln.
- **Prestige-System**: sobald die eigene Karte voll ausgebaut ist, optionaler
  Reset gegen einen dauerhaften Bonus (z. B. permanenter Multiplikator) –
  klassischer Kniff aus Idle-/Incremental-Games, um auch erfahrene Spieler
  langfristig zu halten.

### Barrierefreiheit (bestätigt)

- Da sich sehr viel über **Fahrzeugtyp-Erkennung per Farbe/Form**
  entscheidet (Verbrecher-Pickup, Geldtransporter, Polizei, normale Trucks),
  lohnt sich früh ein **farbenblind-freundlicher Modus** (zusätzliche Icons/
  Muster statt nur Farbcodierung) – sonst wird das Spiel für einen Teil der
  Zielgruppe unnötig schwer bis unfair. Passt außerdem gut zum sonst schon
  sehr durchdachten, cleanen Apple-Anspruch (Apple legt in den HIG selbst
  großen Wert auf Barrierefreiheit).

### Offene Design-Frage: Werbung ja/nein?

- Bisher ist keine klassische Werbung (Rewarded Ads, Interstitials) geplant
  – passt grundsätzlich gut zum "premium"-Anspruch, viele hochwertig wirkende
  Casual-Spiele verzichten bewusst auf Werbung und monetarisieren nur über
  Lootboxen/Season Pass. Falls doch gewünscht, würde sich am ehesten ein
  optionaler "Rewarded Ad für einen Weiterspiel-Versuch nach Rundenverlust"
  anbieten – sollte aber bewusst entschieden werden, da es dem
  "premium, clean"-Gefühl potenziell widerspricht.

## Offene Punkte

- [ ] Genauer Scope der ersten spielbaren Version (MVP): Kernloop +
      Combo-System + Verbrecher-Mechanik + einfache Meta-Progression?
      Geldtransporter, Zollstellen und Lootboxen evtl. erst in Version 2?
- [ ] Anzahl und Art der Kreisverkehr-Typen für den Start
- [ ] Konkrete Combo-Schwellenwerte und Multiplikatoren
- [ ] Wie oft/nach welcher Logik erscheinen Verbrecher-Pickups, wie streng
      ist das Zeitlimit?
- [ ] Wie kommt der Spieler an das Polizeiauto (immer verfügbar vs.
      Cooldown vs. begrenzte Anzahl pro Runde)?
- [ ] Wie wird die Position des Geldtransporters im Kreis visuell klar genug
      dargestellt, damit die "keine Polizei davor/dahinter"-Regel fair
      spielbar ist?
- [ ] Wie viele Zollstellen darf man maximal bauen, und wie skaliert die
      Gebühr pro Truck mit Upgrades?
- [ ] Wie stark/sichtbar soll der Stau-Effekt der Zollstellen konkret
      ausfallen, und wie teuer soll das Verkehrsleitsystem-Gegen-Upgrade
      sein, damit das Risiko spürbar, aber nicht frustrierend wird?
- [ ] Genaue Kosten/Skalierung der Map-Erweiterung und der
      Wahrscheinlichkeits-Upgrades
- [ ] Odds und Preise der einzelnen Lootbox-Typen
- [ ] Wie genau funktioniert der Multiplayer-Modus technisch (Echtzeit vs.
      asynchroner Vergleich)
