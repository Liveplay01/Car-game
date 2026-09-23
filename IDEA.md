# Idea.md – Car Circle-inspiriertes iOS-Spiel

Stand: 23.09.2026

## Inspiration

Ausgangspunkt ist das Browserspiel "Car Circle" (Shoom Games): One-Tap-Timing-Spiel, bei dem man wartende Autos per Klick/Tap in einen rotierenden Kreisverkehr einfädelt, ohne zu kollidieren. Keine Lenkung, kein Gas, keine Bremse – die einzige Interaktion ist der Zeitpunkt des Tastendrucks.

## Kernkonzept (unsere Version)

- Gleiche Grundmechanik: Auto aus einer Warteschlange per Tap in einen rotierenden Kreisverkehr einfädeln, Kollision = Fehler.
- Die Kernmechanik bleibt bewusst extrem einfach: **ein Tap, ein Timing, eine unmittelbare physische Reaktion**.
- Zusätzlich zur reinen Einfädel-Mechanik gibt es aktive Sondertypen im Verkehr: Verbrecher-Pickups, Geldtransporter und Trucks – diese verlangen vom Spieler mehr als nur "sauber einfädeln".
- Fahrzeugtypen besitzen eigene Gameplay-Eigenschaften. Ein Fahrzeugtyp ist dabei von seinem kosmetischen Skin getrennt.
- Gesammeltes Geld ist die zentrale Meta-Währung, mit der man sein eigenes Straßennetz im Editor erweitert und ausbaut.
- Die Stadt entwickelt sich sichtbar mit dem Fortschritt des Spielers.
- Der Spielfluss soll sich jederzeit clean, smooth und hochwertig anfühlen. Das Spiel soll nicht durch viele Menüs und Subsysteme überladen werden.
- Die eigentliche Herausforderung bleibt Timing, Verkehrslesen, Combo-Aufbau, Sonderfahrzeuge und die Reaktion auf eskalierende Situationen.

---

## Rundenstruktur: Schicht statt Endlos-Loop (bestätigt)

- Eine Standard-Schicht besteht aus einer festen Anzahl von Fahrzeugen, z. B. **15 Fahrzeuge**.
- Eine Schicht dauert ungefähr **2 Minuten**.
- Es gibt keine klassische Uhr, die permanent herunterzählt. Der Spieler konzentriert sich auf den Verkehrsfluss.
- Die Schwierigkeit steigt innerhalb der Schicht kontrolliert an.
- Die letzten ca. 4 Fahrzeuge bilden die **Rush Hour**.
- Während der Rush Hour:
  - Verkehr wird schneller.
  - Verkehrsdichte steigt.
  - Punkte-/Belohnungsmultiplikatoren können erhöht werden.
  - Musik und audiovisuelle Spannung ziehen an.
- Die Rush Hour soll einen klaren Spannungs-Peak kurz vor Schichtende erzeugen.
- Jede erfolgreich abgeschlossene Schicht führt zum nächsten Level.
- Eine verlorene Schicht wird wiederholt.
- Das Ziel ist ein klarer dramaturgischer Bogen:
  - ruhiger Einstieg
  - zunehmende Verkehrsdichte
  - Sonderfahrzeuge
  - steigende Geschwindigkeit
  - Rush-Hour-Finale
  - kurze Schichtwechsel-Animation
  - nächstes Level

---

## Difficulty Curve (bestätigt)

Die Schwierigkeit soll bewusst nur über **drei Hauptachsen** wachsen:

1. **Mehr Geschwindigkeit**
2. **Höhere Verkehrsdichte**
3. **Schlechtere bzw. häufigere Wetterereignisse**

Keine zusätzliche permanente Difficulty-Achse durch immer kompliziertere Sonderregeln.

Neue Inhalte dürfen zwar im Verlauf des Spiels auftauchen, aber die eigentliche Skalierung des normalen Verkehrs basiert ausschließlich auf:

- Speed
- Density
- Weather

Beispielhafte Entwicklung:

- frühe Level:
  - niedrige Geschwindigkeit
  - wenige Fahrzeuge
  - gutes Wetter
- mittlere Level:
  - höhere Geschwindigkeit
  - dichterer Verkehr
  - gelegentlicher Regen
- spätere Level:
  - sehr schnelle Fahrzeuge
  - hohe Verkehrsdichte
  - häufiger Regen / schlechte Sicht / stärkere Wetterereignisse

Die konkreten Zahlen werden später im Playtesting festgelegt.

---

## Game-Over-Regeln

### Hard Fail

Folgende Situationen beenden die Schicht sofort:

- Ein Verbrecher-Pickup entkommt.
- Ein normaler Verkehrsunfall zwischen Fahrzeugen passiert.
- Andere explizit als Hard Fail definierte kritische Ereignisse.

Eine normale Kollision soll bewusst weiterhin Gewicht haben. Das Spiel soll nicht durch ein großzügiges Strike-System seine klare One-Tap-Spannung verlieren.

### Polizei-Crash

Ein Crash eines Polizeifahrzeugs ist ein separater Fehlerzustand.

- Polizei-Crash zählt als Soft Fail.
- Es gibt weiterhin mehrere erlaubte Polizei-Crashs innerhalb einer Schicht.
- Standardmäßig sind **3 Polizei-Crashs** erlaubt.
- Der eigentliche Verbrecher muss trotzdem rechtzeitig gefasst werden.

### Chain Crashes

Wenn mehrere Fahrzeuge durch einen Unfall mitgerissen werden, sollen daraus nicht automatisch mehrere separate Strikes entstehen.

Die Unfallbewertung basiert auf dem ursprünglichen Ereignis und nicht auf jedem einzelnen Folgefahrzeug.

---

# Perfect Inputs / Game Feel

Die Qualität des Taps selbst ist ein zentraler Bestandteil des Spiels.

Ein Tap soll sich nicht wie ein UI-Klick anfühlen, sondern wie eine physische Handlung.

## Grundprinzip

**Input → sofortige physische Reaktion → sichtbare Präzision → Feedback**

- praktisch keine wahrnehmbare Input-Latenz
- Fahrzeug reagiert unmittelbar auf den Tap
- Beschleunigung wirkt physisch und nicht wie ein einfacher Positionssprung
- minimale Bewegungsantwort direkt nach dem Input
- saubere, kontrollierte Beschleunigung
- kein unnötiges UI-Feedback zwischen Tap und Fahrzeugbewegung

## Perfect Input

Bei besonders präzisem Timing:

- sehr kurze visuelle Präzisionsreaktion
- kleines, hochwertiges Sound-Feedback
- kurzer, präziser Haptik-Impuls
- Score-Feedback leicht verzögert, damit die physische Bewegung zuerst wahrgenommen wird

Der wichtigste Reward ist nicht die Zahl auf dem Bildschirm.

**Die Bewegung des Fahrzeugs selbst muss sich wie die Belohnung anfühlen.**

---

# Combo / Streak-System

Mehrere gute Einfädelungen in Folge bauen einen Combo-Zähler auf.

### Combo-Stufen

- 0–4 → ×1
- 5–9 → ×1,5
- 10–19 → ×2
- 20+ → ×3

Die genauen Werte bleiben tuningfähig.

### Combo-Aufbau

- saubere Einfädelung → +1 Combo
- Tight Fit → +2 Combo
- Crash / unsaubere Einfädelung → Combo wird zurückgesetzt
- Sonderereignisse wie ein erfolgreicher Takedown sollen den Combo nicht zurücksetzen

### Feedback

Mit steigendem Combo werden Feedback und Audio subtil intensiver:

- stärkerer Sound-Layer
- präzisere Haptik
- dezenter Ring-Glow
- zunehmende musikalische Intensität

Das Feedback darf niemals den Verkehrsfluss überdecken.

---

# Tight Fit

Wird ein Auto mit extrem knappem Abstand vor oder hinter einem anderen eingefädelt, ohne zu crashen, entsteht ein **Tight Fit**.

- Abstand unter einem definierten Zeit-/Positionsschwellwert
- hoher Präzisionscharakter
- visueller Swoosh
- kurzer, scharfer Haptik-Impuls
- hochwertiges, kurzes Audio
- **200 Punkte × aktuellem Multiplikator**
- **+2 Combo**

Ein Tight Fit soll sich riskanter und deutlich befriedigender anfühlen als ein gewöhnliches sauberes Einfädeln.

---

# Near Miss

Near Miss ist eine eigene Feedback-Ebene zwischen normalem sauberem Fahren und Tight Fit.

Ein Near Miss entsteht, wenn zwei Fahrzeuge sich extrem knapp verfehlen, aber kein Tight-Fit-Kriterium erfüllt wird.

Feedback:

- kurzer Swoosh
- dezente Haptik
- kleines visuelles Feedback
- kleiner Punktebonus
- Combo bleibt erhalten

Near Miss darf kein großes Popup erzeugen.

Es soll eher das Gefühl vermitteln:

> "Das war knapp."

Tight Fit bleibt die deutlich stärkere und präzisere Variante.

---

# Perfect Chain

Zusätzlich zum normalen Combo gibt es eine interne Bewertung der **Qualität der aufeinanderfolgenden Aktionen**.

Die Perfect Chain verfolgt beispielsweise:

- Perfect Inputs
- Tight Fits
- Near Misses
- besonders saubere Einfädelungen
- erfolgreiche Sonderaktionen

Eine lange Perfect Chain erzeugt zunehmend stärkeres Feedback.

Sie ist kein separater Spielmodus und kein zusätzlicher Bildschirm.

Sie läuft direkt im normalen Spielfluss.

---

# Flow State

Bei sehr langen hochwertigen Sequenzen kann das Spiel subtil in einen **Flow State** wechseln.

Der Flow State ist kein separater Modus und kein UI-Screen.

Er wird ausschließlich über Feedback vermittelt:

- Musik wird rhythmisch dichter
- Perfect-Input-Sounds werden etwas stärker hervorgehoben
- Haptik wird minimal präziser/intensiver
- Ring-Glow wird subtil stärker
- erfolgreiche Aktionen wirken etwas unmittelbarer

Der Flow State endet bei:

- Crash
- größerem Timing-Fehler
- Verlust der relevanten Chain

Der Spieler soll den Flow spüren, ohne dass das Spiel ihm ständig sagt:

> "Du bist gerade im Flow."

---

# Anticipation / Lesen des Verkehrs

Ein zentraler Skill soll nicht nur das Reagieren, sondern das **vorausschauende Lesen** des Verkehrs sein.

Der Spieler soll kommende Situationen früh erkennen können.

Dafür werden Ereignisse subtil angekündigt:

- Fahrzeugtyp ist früh erkennbar
- Police-Status ist sichtbar
- Criminal wird klar telegraphiert
- Money Transporter wird als SECURED erkennbar
- Countdown wird rechtzeitig angekündigt
- relevante kommende Fahrzeuge werden durch Form, Farbe oder Bewegung lesbar

Das Spiel soll niemals absichtlich Informationen verstecken, die für eine faire Timing-Entscheidung notwendig sind.

Skill entsteht dadurch, dass der Spieler aus dem sichtbaren Verkehrsbild eine mentale Planung aufbaut.

---

# Verbrecher-Bots & Polizei-Mechanik

- Verbrecher-Bots haben einen klar erkennbaren Fahrzeugtyp:
  **Pickup-Truck**.
- Der Pickup ist optisch sofort von normalen Autos, Trucks und Geldtransportern unterscheidbar.
- Der Pickup kann nur durch ein **Polizeiauto** gestoppt werden.
- Ein normales Auto kann den Verbrecher nicht erfolgreich stoppen.
- Das Polizeiauto muss den Pickup aktiv rammen.
- Der Verbrecher hat ein Zeitlimit.
- Entkommt der Verbrecher, ist die Schicht verloren.
- Ein erfolgreicher Takedown ist ein positives Ereignis und kein normaler Unfall.

### Verbrecher-Parameter

- Pickup-Masse: ca. **2,5× eines normalen Fahrzeugs**
- Polizei folgt beim Takedown direkt hinter dem Pickup
- Polizeifahrzeug bewegt sich beim Takedown mit erhöhter Geschwindigkeit, z. B. ×1,4
- Takedown-Belohnung:
  **1000 Punkte × aktueller Multiplikator × Rush-Hour-Faktor**
- Nach erfolgreichem Takedown bleibt der Combo erhalten.
- Kurzes Slow-Motion-Fenster von ca. **0,3 Sekunden**.

---

# Verbrecher-Telegraphing

Der Spieler soll einen Criminal nicht überraschend aus dem Nichts bekommen.

Vor bzw. während des Auftauchens:

- WANTED-Hinweis
- Sirene
- pulsierender visueller Marker
- klar erkennbare Pickup-Silhouette
- Countdown

Ca. 2 Sekunden vor einer kritischen Phase kann die Warnung stärker werden:

- WANTED
- Sirenenimpuls
- pulsierender Bereich

Das Ziel ist **Anticipation statt Überraschung**.

---

# Panic Button / Einsatzfahrt

Wenn ein Verbrecher erscheint, aber sich gerade kein Polizeiauto in einer sinnvollen Position der Warteschlange befindet, braucht der Spieler eine faire Notfallmöglichkeit.

Der Panic Button:

- verwandelt das nächste geeignete Fahrzeug in ein Polizeiauto
- kostet einen Teil des aktuellen Combos
- reduziert den aktuellen Combo beispielsweise um die Hälfte
- darf nicht zu einem normalen kostenlosen Shortcut werden

Die Entscheidung lautet:

> Combo retten oder Verbrecher rechtzeitig fangen?

Der Panic Button ist damit ein echtes Risk/Reward-Element.

---

# Takedown – Soft-Body-Deformation

Die vorhandene Physik mit Starrkörper-Impulsen, Reifenreibung und abreißenden Teilen bleibt bestehen.

Für den Takedown kommt zusätzlich eine **leichte visuelle Soft-Body-Deformation** hinzu.

Ziel ist nicht, eine vollständige Soft-Body-Physik für jedes Fahrzeug zu simulieren.

Stattdessen gibt es eine visuelle Deformationsschicht über der bestehenden Physik.

## Ablauf eines Takedowns

### 0–30 ms – Impact

- Polizei trifft Pickup.
- bestehender Starrkörper-Impuls wird ausgelöst
- Reifen reagieren auf die Kollision
- sofortiger kurzer physischer Kontaktimpuls

### 30–120 ms – Deformation

Die Karosserie des Pickups gibt sichtbar nach.

Die Deformation hängt ab von:

- Aufprallrichtung
- Aufprallwinkel
- Geschwindigkeit
- berechneter Kollisionsenergie
- getroffener Fahrzeugzone

Mögliche Deformationsbereiche:

- Front
- Heck
- Seite
- Ecke

### Danach – Rückfederung

Die Karosserie federt leicht zurück.

Dabei bleibt eine kleine Restdeformation sichtbar, damit der Takedown nicht wie eine rein temporäre Animation aussieht.

## Physischer Eindruck

Der 2,5× schwerere Pickup soll sich deutlich anders verhalten als ein normales Auto:

- Polizei wird stärker zurückgedrückt
- Pickup bewegt sich weniger stark durch den direkten Impuls
- Pickup dreht bzw. verschiebt sich
- Karosserie gibt sichtbar nach
- Teile können sich lösen
- Reifen reagieren auf den Aufprall

Die visuelle Wucht muss zur Masse passen.

## Feedback

Takedown kombiniert:

- Soft-Body-Deformation
- Starrkörper-Impuls
- Reifenreaktion
- abreißende Teile
- kurze Haptik
- Kollisionssound
- Metall-/Karosserie-Sound
- Reifen-/Rutsch-Sound
- 0,3 Sekunden Slow Motion
- sehr subtilen Kameraimpuls

Kein aggressives Screen Shake.

## Ideale Takedown-Sequenz

**Polizei → Kontakt → Impact → Karosserie gibt nach → Haptik/Sound → Slow-Mo → Pickup dreht → Teil löst sich → Splitter → TAKEDOWN → Punkte → normale Geschwindigkeit**

Das soll einer der befriedigendsten Momente des Spiels sein.

---

# Geldtransporter-Mechanik

- Zusätzlich zu normalem Verkehr und Verbrecher-Pickups taucht zufällig ein Geldtransporter auf.
- Ziel: Der Geldtransporter soll unbeschadet aus dem Kreisverkehr bzw. von der Karte herunterfahren.
- Schafft er es, erhält der Spieler Geld.
- Der Transporter ist eindeutig als **SECURED** gekennzeichnet.

### Kritische Zonen

Direkt vor und hinter dem Geldtransporter darf kein Polizeiauto eingefädelt werden.

Stattdessen sollen normale Fahrzeuge die kritischen Bereiche abschirmen können.

- normales Auto in kritischer Zone → Schutz
- Schutz kann einen kleinen Bonus geben
- Polizeiauto in kritischer Zone → Transporter verliert die Belohnung
- Transporter-Crash → keine Auszahlung

### Countdown

- Money Transporter besitzt ein eigenes Zeitfenster
- ca. 10 Sekunden als Ausgangswert
- rechtzeitige Rettung führt zur Auszahlung
- wenn der Transporter das letzte Fahrzeug der Schicht ist, kann die Auszahlung direkt beim Schichtabschluss erfolgen

---

# Fahrzeugtypen und Skins

Fahrzeugtyp und Skin werden strikt voneinander getrennt.

## Fahrzeugtyp

Ein Fahrzeugtyp besitzt Gameplay-Eigenschaften.

Beispiele:

### Sports Car

- schnell
- kurz
- geringere Masse
- reagiert unmittelbar

### Truck

- langsamer
- länger
- schwerer
- verändert die verfügbare Lücke stärker

### Pickup

- schwer
- 2,5× Masse
- Criminal-spezifische Eigenschaften

Weitere Fahrzeugtypen können später hinzukommen.

## Skin

Ein Skin verändert ausschließlich:

- Farbe
- Formdetails
- Lackierung
- visuelle Materialien
- kosmetische Elemente

Ein Skin darf **keine Gameplay-Boni** geben.

Beispiel:

> Sports Car + Red Racing Skin

und

> Sports Car + Midnight Skin

sind spielerisch identisch.

Dadurch können neue Vehicle Types und neue Car Skins gemeinsam in Truhen vorkommen, ohne Pay-to-Win zu erzeugen.

---

# Zollstellen im Straßeneditor

Im Straßeneditor können Zollstellen gekauft und an bestimmten Straßen/Ausfahrten platziert werden.

- Jeder normale Truck, der durch eine Zollstelle fährt, zahlt automatisch eine Gebühr.
- Zoll ist eine passive Einnahmequelle.
- Mehr Truck-Verkehr kann durch Upgrades erzeugt werden.
- Die Position einer Zollstelle beeinflusst ihren Wert.

Zollstellen besitzen gleichzeitig einen spielerischen Nachteil:

- Verkehr wird in ihrer Umgebung langsamer.
- Polizei wird ebenfalls behindert.
- dadurch können Criminals schwieriger zu fangen sein.

Zoll ist damit nicht nur ein passives Einkommen, sondern Teil des Risiko-/Ertrags-Systems.

---

# Abschlepp-Depot – neues Street-Editor-Modul

Das **Abschlepp-Depot** ist ein weiteres kaufbares Modul im Street Editor.

## Gameplay-Effekt

Wracks werden innerhalb der Zone des Abschlepp-Depots:

**30 % schneller entfernt.**

Dadurch:

- bleibt eine Unfallstelle kürzer aktiv
- wird der Verkehrsfluss schneller wiederhergestellt
- reduziert sich die Zeit, in der ein Wrack den Kreisverkehr beeinflusst

## Visuelle Darstellung

Das Depot soll tatsächlich in der Stadt sichtbar sein.

Mögliche Darstellung:

- kleiner eingezäunter Hof
- Abschleppwagen
- abgestellte beschädigte Fahrzeuge
- kleine Halle oder Werkstattcontainer
- Zufahrt vom Straßennetz

Nach einem Crash kann ein Abschleppwagen sichtbar aus dem Depot kommen und das Wrack entfernen.

Die Animation bleibt kurz und darf den Spielfluss nicht unterbrechen.

Das Depot ist damit Teil der **City Evolution** und nicht nur ein abstrakter Zahlenbonus.

---

# Risiko-Mechaniken: Wirtschaft schafft Gefahr

Grundprinzip:

Wirtschaftliche Upgrades sollen nicht ausschließlich Vorteile erzeugen.

Beispiele:

- mehr Zollstellen → mehr Geld, aber mehr Stau
- mehr Trucks → mehr Einnahmen, aber dichterer Verkehr
- größere Map → mehr Möglichkeiten, aber mehr Verkehr
- höhere Wirtschaft → mehr aktive Situationen

Die Risiken müssen aber immer lesbar und fair bleiben.

---

# Gefahrenstufe vor Rundenstart

Vor einer Schicht kann zwischen unterschiedlichen Einsatzbedingungen gewählt werden.

Eine High-Alert-Variante kann beispielsweise:

- höhere Verkehrsdichte
- höhere Geschwindigkeit
- häufigere Criminals
- kürzere Sonderfahrzeug-Countdowns

bieten und dafür höhere Belohnungen vergeben.

Die genauen Werte werden im Balancing festgelegt.

Die Gefahrenstufe soll kein eigener permanenter Difficulty-Parameter sein, sondern eine optionale **Risk/Reward-Entscheidung vor einer Schicht**.

---

# City Evolution

Der Straßeneditor soll langfristig nicht nur Zahlenwerte verändern.

Die Stadt soll sichtbar wachsen.

Mögliche Entwicklung:

- neue Straßen
- neue Kreisverkehre
- zusätzliche Ausfahrten
- Gebäude
- Zollstellen
- Abschlepp-Depots
- Verkehrsinfrastruktur
- dekorative Stadtobjekte

Der Spieler soll beim Blick auf seine Stadt erkennen können:

> Diese Stadt ist durch mein Spielen gewachsen.

Die Entwicklung bleibt visuell clean und minimalistisch.

---

# City Events

City Events sind zeitlich begrenzte Ereignisse, die tatsächlich Einfluss auf den Verkehr haben.

Mögliche Events:

- Baustelle
- temporäre Straßensperrung
- Konzert
- Parade
- Polizeiaktion
- Unfallstelle
- VIP-Verkehr
- besondere Verkehrssituation

Events sollen nicht nur als Dekoration erscheinen.

Sie verändern tatsächlich:

- Verkehrsfluss
- Dichte
- verfügbare Lücken
- Fahrzeugverteilung
- relevante Timing-Situationen

Events werden aber so gestaltet, dass sie weiterhin in die drei zentralen Difficulty-Achsen passen:

- Speed
- Density
- Weather

---

# Weather

Wetter ist nicht nur ein Partikeleffekt.

Es beeinflusst den Spielfluss und die Lesbarkeit.

Mögliche Wetterstufen:

### Clear

- normale Bedingungen

### Light Rain

- leichter Regen
- dezente visuelle Veränderung
- leichte Veränderung des Verkehrsgefühls

### Heavy Rain

- schlechtere Sicht
- stärkerer atmosphärischer Effekt
- höhere Schwierigkeit

### Storm

- stärkere Wettereffekte
- höhere Verkehrsdichte bzw. ungünstigere Verkehrssituationen
- deutlich intensiveres Audio

### Extreme Weather

Für spätere Level können seltene stärkere Wetterereignisse auftreten.

Wetter bleibt trotzdem fair:

- wichtige Fahrzeuge müssen weiterhin eindeutig erkennbar sein
- Warnungen dürfen nicht durch Effekte verdeckt werden
- Farben/Icons ergänzen die visuelle Lesbarkeit

---

# Crash-Economy ab Level 20

Bis einschließlich Level 19 bleiben normale Crashs wirtschaftlich kostenlos.

**Ab Level 20** bekommen Crashs erstmals eine kleine finanzielle Konsequenz.

Ziel:

- kein harter Frust
- aber spätere Fehler haben eine kleine wirtschaftliche Bedeutung
- Spieler wird langsam vom reinen Score-Spiel in die langfristige Economy geführt

Crash-Kosten sollen bewusst klein bleiben.

Mögliche Kategorien:

- kleiner Fahrzeugcrash → kleine Reparatur-/Bergungskosten
- größerer Unfall → höhere Kosten
- schwere Kollision → entsprechend höhere Kosten

Die genauen Beträge werden im Balancing festgelegt.

Ein Crash darf niemals so teuer sein, dass der Spieler Angst bekommt, neue Mechaniken auszuprobieren.

---

# Insurance

Mit Einführung der Crash-Kosten ab Level 20 wird ein neues Upgrade freigeschaltet:

**Insurance**

Insurance reduziert die Kosten eines Crashs prozentual.

Beispielhafte Upgrade-Stufen:

- Insurance I → 15 % Ersparnis
- Insurance II → 30 %
- Insurance III → 45 %
- Insurance IV → 60 %
- Insurance V → 75 %
- Insurance VI → 90 %
- Insurance VII → 100 %

Die konkreten Stufen und Werte sind noch Balancing-Thema.

Bei 100 %:

> Crash Cost: $120  
> Insurance: FULL COVERAGE  
> You Pay: $0

Insurance ist ein normales Progressions-Upgrade und benötigt kein eigenes komplexes Menü.

---

# Financial Loss bei entkommenen Verbrechern

Ein entkommener Criminal bleibt weiterhin ein Hard Fail.

Zusätzlich verursacht ein entkommener Verbrecher ab dem entsprechenden Progressionspunkt einen kleinen finanziellen Schaden.

Beispiel:

> CRIMINAL ESCAPED  
> SHIFT LOST  
> LOSS: −$350

Die Höhe des Schadens muss im Verhältnis zum normalen Einkommen klein bleiben.

Der Spieler verliert dadurch:

1. die aktuelle Schicht
2. einen kleinen Betrag an Geld

Der finanzielle Schaden soll die Bedeutung eines Criminals erhöhen, aber nicht den gesamten Fortschritt zerstören.

---

# Robbery Insurance

Für finanzielle Schäden durch entkommene Verbrecher gibt es eine separate Versicherung:

**Robbery Insurance**

Sie reduziert den finanziellen Schaden eines entkommenen Criminals prozentual.

Beispielhafte Stufen:

- Robbery Insurance I → 15 % Ersparnis
- Robbery Insurance II → 30 %
- Robbery Insurance III → 45 %
- Robbery Insurance IV → 60 %
- Robbery Insurance V → 75 %
- Robbery Insurance VI → 90 %
- Robbery Insurance VII → 100 %

Damit gibt es zwei klar getrennte Systeme:

| Versicherung | Schützt vor |
|---|---|
| Insurance | Crash-/Unfallkosten |
| Robbery Insurance | finanziellen Schäden durch entkommene Criminals |

Beide bleiben normale Upgrades innerhalb des bestehenden Progressionssystems.

---

# Wirtschaft & Meta-Progression

## Geld verdienen

Geld kommt aus:

- Abschluss einer Schicht
- erfolgreich geretteten Geldtransportern
- Abschirmung von Geldtransportern
- passiven Zolleinnahmen
- weiteren späteren City-/Event-Rewards

## Geld ausgeben

Geld wird ausgegeben für:

- Map-Erweiterung
- neue Straßen
- neue Kreisverkehre
- Zollstellen
- Abschlepp-Depot
- Wahrscheinlichkeits-/Progressions-Upgrades
- Insurance
- Robbery Insurance
- kosmetische Inhalte bzw. entsprechende Shop-Systeme

---

# Map-Erweiterung

Das eigene Straßennetz wird schrittweise erweitert.

Beispielsweise:

- 4 Straßenarme
- 5 Straßenarme
- 6 Straßenarme
- 7 Straßenarme
- 8 Straßenarme

Die Kosten steigen mit jeder Erweiterung.

Eine größere Karte bedeutet gleichzeitig:

- mehr Verkehrsfläche
- mehr Fahrzeuge
- mehr Möglichkeiten
- mehr Sonderfahrzeug-Situationen

Die Map-Erweiterung soll daher nicht nur ein visueller Fortschritt sein.

---

# Wahrscheinlichkeits-Upgrades

Kaufbare Upgrades können bestimmte Spawn-Wahrscheinlichkeiten beeinflussen.

Mögliche Upgrades:

- Spawn-Chance Geldtransporter erhöhen
- Spawn-Chance Trucks erhöhen
- Spawn-Chance Criminals reduzieren
- Zeitlimit für Criminal-Takedowns leicht erhöhen
- Häufigkeit zusätzlicher Polizeiautos erhöhen
- Chance auf Doppel-Transporter-Events erhöhen

Die Upgrades verändern nicht die drei zentralen Difficulty-Achsen des normalen Verkehrs.

---

# Mastery / Achievements

Mastery läuft **unsichtbar im Hintergrund**.

Es gibt keinen separaten großen Mastery-Screen, der den Spieler ständig aus dem Spielfluss herausreißt.

Das System verfolgt automatisch besondere Leistungen.

Beispiele:

- bestimmte Anzahl Perfect Inputs
- lange Perfect Chains
- bestimmte Anzahl Tight Fits
- erfolgreiche Takedowns
- bestimmte Anzahl geretteter Geldtransporter
- besonders lange Combos
- spezielle Schichtleistungen

Wenn eine Mastery abgeschlossen wird:

1. kurze Toast-/Notification
2. kurze Bestätigung
3. automatisch eine kostenlose Truhe als Belohnung

Beispiel:

> MASTERY COMPLETE  
> Perfect Timing  
> CHEST EARNED

Die Truhe erscheint anschließend automatisch als verfügbar im Shop.

---

# Mastery-Truhen

Der Schwierigkeitsgrad der Mastery bestimmt die Qualität der verdienten Truhe.

Beispielsweise:

- normale Mastery → Standard Chest
- schwierige Mastery → bessere Chest
- sehr schwierige Mastery → hochwertige Chest

Die konkrete Anzahl der Chest-Tiers bleibt offen.

Wichtig:

**Mastery wird nicht zu einem separaten Progressionsspiel innerhalb des Spiels.**

Es ist ein unsichtbarer Hintergrundmechanismus, der gute Spieler automatisch belohnt.

---

# Lootboxen / Truhen

Truhen enthalten ausschließlich:

- **Map Skins**
- **Car Skins**
- **Vehicle Types**

Keine Truhe enthält:

- Gameplay-Boni
- Timing-Boni
- zusätzliche Schadensresistenz
- bessere Versicherung
- höhere Einnahmen
- bessere Spawn-Wahrscheinlichkeiten
- Multiplayer-Zugang

Ein Vehicle Type darf Gameplay-Eigenschaften besitzen, weil er selbst ein Fahrzeugtyp ist.

Ein Skin bleibt dagegen rein kosmetisch.

---

# Truhen-Typen

Mögliche Truhen:

### Standard Chest

Normale Belohnung.

### Premium Chest

Hochwertigere kosmetische Inhalte.

### Event Chest

Zeitlich begrenzte Themeninhalte.

### Criminal Hunt Chest

Belohnung für spezielle Criminal-/Police-Masteries.

Alle Truhen bleiben kosmetisch bzw. enthalten freischaltbare Fahrzeugtypen.

---

# Lootbox-Regeln

- Odds müssen transparent sein.
- Keine Gameplay-Boni.
- Keine funktionalen Freischaltungen aus Zufallsboxen.
- Pity-System kann eingesetzt werden.
- Seltenheiten:
  - Common
  - Rare
  - Epic
  - Legendary

Die Darstellung bleibt dezent und Apple-artig:

- Rahmen
- Glow
- Typografie
- Animation

Keine übermäßig grellen Casino-Effekte.

---

# Replay / Highlight

Es gibt **keinen separaten Replay-Screen**.

Stattdessen wird beim Schichtwechsel automatisch ein kurzer Highlight-Moment gezeigt.

Das Spiel wählt beispielsweise:

1. erfolgreichsten Takedown
2. längsten Tight Fit
3. längste Perfect Chain
4. besten Near Miss
5. sonst letzten interessanten Moment

Dieser Moment wird direkt in die **Schichtwechsel-Animation** eingebettet.

Beispiel:

> SHIFT COMPLETE

→ kurzer Freeze  
→ Highlight des besten Moments  
→ Score  
→ Money  
→ Level Up  
→ nächste Schicht

Das Replay soll dadurch wie ein Teil des Spiels wirken und nicht wie ein zusätzliches Feature-Menü.

---

# Apple-Ökosystem-Integration

## Home-Screen Widget

Das Widget zeigt nur kompakte Informationen.

Mögliche Inhalte:

- aktuelles Level
- Daily Shift
- Highscore / Personal Best
- verfügbare Truhe
- Stadt-/Netzwerkstatus
- relevante passive Einnahmen

Das Widget soll nicht versuchen, das gesamte Spiel abzubilden.

---

# Live Activity / Dynamic Island

Live Activity wird nur bei tatsächlich relevanten laufenden Situationen verwendet.

Mögliche Inhalte:

- aktive Criminal-Jagd
- aktiver Geldtransporter
- besonderer zeitlich begrenzter Zustand

Keine permanente Live Activity während jeder normalen Schicht.

Die Information soll auch außerhalb des Spiels nützlich sein.

---

# Action Button

Falls das Gerät einen Action Button unterstützt:

Mögliche Funktion:

**Start Shift / Daily Shift**

Optional kann der Action Button abhängig vom aktuellen Spielzustand die relevanteste schnelle Aktion auslösen.

Die Funktion soll bewusst einfach bleiben.

---

# Look & Feel

- Sehr clean
- minimalistisch
- Apple-artige Optik
- viel Raum
- reduzierte Farbpalette
- hoher Kontrast
- Dark Theme als Basis
- dezente Akzentfarben
- klare Typografie
- SF Pro / systemnahe Typografie
- SF-Symbols-artige Icons
- Feedback über Bewegung, Sound und Haptik
- keine unnötigen Popups
- keine überladenen HUD-Elemente

Animationen:

- smooth
- physisch wirkend
- Spring-Easing
- keine harten Schnitte
- möglichst direkte Verbindung zwischen Input und Bewegung

---

# Fahrzeugdarstellung

Fahrzeugfarben und Formen vermitteln Gameplay-Information.

Beispiele:

- Criminal → eindeutig erkennbarer Pickup / violette Kennzeichnung
- Police → Police-Livery / Blaulicht
- Money Transporter → SECURED-Kennzeichnung
- Truck → klar erkennbare größere Fahrzeugform
- normale Fahrzeuge → reduzierte neutrale Darstellung

Farben allein dürfen nicht die einzige Informationsquelle sein.

Zusätzliche Formen, Icons oder Muster unterstützen die Erkennung.

---

# Sound Design & Dynamic Audio

Sound ist ein aktiver Teil des Game Feel.

## Combo

Mit steigender Combo:

- zusätzliche Audio-Layer
- stärkere rhythmische Elemente
- subtiler Bass
- mehr musikalische Spannung

## Criminal

Beim Auftauchen eines Criminals:

- Sirenenimpuls
- pulsierendes Audio
- WANTED-Warnung

## Rush Hour

Während Rush Hour:

- Beat wird intensiver
- Audio-Layer verdichten sich
- Spannung steigt

## Perfect Input

- kurzer hochwertiger Sound
- keine langen UI-Sounds

## Tight Fit

- kurzer Swoosh
- präziser Impact-Sound

## Takedown

Mehrere Audio-Layer:

- Kontakt
- Metall
- Deformation
- Reifen
- abreißende Teile
- Takedown-Signatur

Technisch bevorzugt:

- adaptive Audio-Layer
- synchronisierte Stems
- abhängig vom Game State ein-/ausblenden

---

# Haptik

Unterschiedliche Ereignisse bekommen unterschiedliche Haptik.

Beispiele:

- Perfect Input → kurzer präziser Impuls
- Tight Fit → scharfer kurzer Impuls
- Near Miss → dezenter Impuls
- Criminal entdeckt → kurzer Warnimpuls
- Takedown → stärkerer, kurzer Impact
- Crash → negativer / schwererer Impuls
- Geldtransporter gerettet → positives Feedback
- Truhe geöffnet → hochwertiges Reward-Feedback

Haptik wird dynamisch anhand der Situation skaliert, insbesondere beim Takedown.

---

# Accessibility

Farben dürfen nicht die einzige Informationsquelle sein.

Farben werden ergänzt durch:

- Icons
- Formen
- Muster
- Animationen
- Textlabels bei wichtigen Sonderfahrzeugen

Reduce Motion wird berücksichtigt.

Wenn Reduce Motion aktiviert ist:

- weniger Kameraimpuls
- reduzierte Deformationsanimationen
- reduzierte Screen-Animationen
- Informationen bleiben vollständig erhalten

---

# Technik

- Swift – nativ
- kein Cross-Platform-Framework
- keine externe Game Engine
- Spiellogik und Darstellungslogik liegen in einem plattformneutralen Swift-Paket
- Entwicklung/Tests können unter Windows stattfinden
- iPhone/iPad-Umsetzung nativ

## iPhone-App

- SpriteKit für die eigentliche Spielszene
- SwiftUI für:
  - Menüs
  - Shop
  - Truhen
  - Straßeneditor
  - Stadtübersicht
  - Progressionsansichten
- Core Haptics für Haptik
- AVAudioEngine für adaptive Audio-Layer
- GameKit für:
  - Leaderboards
  - Achievements
- CloudKit für Spielstand-Sync
- StoreKit für optionale Käufe

## GameCore

Die Spiellogik bleibt deterministisch und unabhängig von der Darstellung.

Sie verwaltet unter anderem:

- World State
- Vehicle State
- Traffic
- Police
- Criminals
- Money Transporters
- Collision
- Scoring
- Combo
- Mastery
- Economy
- Weather
- City Events

Die Präsentation erhält daraus Render-/Feedback-Daten.

---

# Inhaltliche Abwechslung

Spätere Inhalte können zusätzliche Situationen erzeugen.

Mögliche Kandidaten:

- Krankenwagen
- VIP-Konvoi
- Baustellen
- temporäre Sperrungen
- besondere Polizeioperationen
- Boss-Event / Kopf des Verbrechens
- weitere Vehicle Types

Diese Inhalte dürfen die Kernmechanik nicht mit unnötigen Sonderregeln überladen.

---

# Offene Punkte

- [ ] Exakte Levelkurve für Speed, Density und Weather
- [ ] Exakte Rush-Hour-Werte
- [ ] Exakte Kosten der Map-Erweiterungen
- [ ] Exakte Kosten der Zollstellen
- [ ] Maximalzahl von Zollstellen
- [ ] Exakte Abschlepp-Depot-Kosten
- [ ] Exakte Wirkung der 30-%-Wrackentfernung im Playtesting
- [ ] Exakte Crash-Kosten ab Level 20
- [ ] Ab welchem Level genau der finanzielle Criminal-Schaden zusätzlich zum Hard Fail aktiviert wird
- [ ] Exakte Schadenshöhe eines entkommenen Criminals
- [ ] Exakte Insurance-Stufen und Prozentwerte
- [ ] Exakte Robbery-Insurance-Stufen und Prozentwerte
- [ ] Exakte Fahrzeugtypen und ihre Gameplay-Parameter
- [ ] Exakte Lootbox-/Chest-Odds
- [ ] Anzahl der Chest-Tiers für Mastery
- [ ] Pity-System und konkrete Schwellenwerte
- [ ] Exakte Wetterparameter
- [ ] Exakte City-Event-Häufigkeit
- [ ] Blaulicht auf dem Boden: weicher roter/blauer Lichtschein unter und neben dem Polizeiauto
- [ ] Warnung im Innenteil: Criminal/Transporter als Ring auf der Mittelinsel statt nur an der Zufahrt
- [ ] Saubere Transporter-/Criminal-State-Übertragung beim Schichtwechsel
- [ ] Weitere Balancing-Tests ab Level 10+
- [ ] Multiplayer bleibt eine spätere Option und ist nicht Bestandteil des aktuellen Kernsystems

---

# Designprinzipien

Das Spiel soll trotz langfristiger Progression einfach verständlich bleiben.

Die wichtigsten Prinzipien:

### 1. One Tap, sofortiges Feedback

Jeder Tap muss sich unmittelbar und physisch anfühlen.

### 2. Skill statt Zufall

Der Spieler soll Situationen lesen und durch Timing lösen können.

### 3. Anticipation statt Überraschung

Wichtige Ereignisse werden rechtzeitig und elegant angekündigt.

### 4. Positive Präzision

Perfect Input, Tight Fit, Near Miss und Perfect Chain sollen sich außergewöhnlich gut anfühlen.

### 5. Sonderfahrzeuge verändern Entscheidungen

Criminal und Money Transporter erzeugen echte Prioritäten, ohne den Kernloop zu ersetzen.

### 6. Physik muss Gewicht vermitteln

Insbesondere beim Takedown müssen Masse, Impuls, Reifen, Deformation und abreißende Teile glaubwürdig zusammenwirken.

### 7. Economy bleibt unterstützend

Geld, Upgrades, Insurance und City Evolution geben langfristige Ziele, dürfen aber niemals die eigentliche One-Tap-Mechanik überdecken.

### 8. Stadt wächst sichtbar

Der Spieler soll seinen Fortschritt in der Welt erkennen.

### 9. Cosmetics bleiben Cosmetics

Skins geben keine Gameplay-Boni.

### 10. Keine Feature-Bloat

Mastery, Replay, Widget, Live Activity und andere Systeme sollen sich möglichst unsichtbar in den bestehenden Spielfluss integrieren.

Das zentrale Gefühl des Spiels bleibt:

**Tap → Bewegung → Timing → Präzision → Flow → nächste Situation.**