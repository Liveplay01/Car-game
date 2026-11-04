# UPDATEIDEEN – UX-Audit Roundabout Timing

Stand: 04.11.2026. Nur Schwächen, nach Priorität sortiert. Noch nichts davon ist gebaut.

Getestet im Dev-Server mit Echtzeit-Taps und Screenshots (390 × 844, `?demo&level=1/4/20`).

Belege:

- **[live]**: im Browser gesehen oder gemessen.
- **[Code]**: aus dem Code abgeleitet, nicht live nachgestellt.

Feste Entscheidungen bleiben unangetastet: Fail-Pause, „Wenige Meldungen“, höchstens drei Vollbild-Momente, keine Pflichtwerbung.

**Nicht geprüft:**

- Haptik und Klang (Desktop-Browser ohne Vibration, Ton nicht beurteilt)
- echtes Handy
- Truhe öffnen (Bilder aufgenommen, nicht ausgewertet)
- Collection, Casino, Settings im Detail, Mafia, Club
- Crew und Ränge mit Server (lief ohne Ranglisten-Dienst)

---

## P0: Direkt beheben

**[Retry] -> Ein Tipp in den ersten 0,4 s nach dem Ergebnis geht verloren. Danach passiert nichts: Das Spiel blieb in 5 von 5 Läufen über 3,5 s auf dem Ergebnis stehen, bis ein zweiter Tipp kam. Wer genau im Moment des Verlierens neu starten will, trifft genau dieses Fenster. [live, `session.ts:1974-1979`] -> Taps ab Beginn des Ergebnisses puffern: `resultAge >= inputLock` als Bedingung für `startBuffered` streichen. Die Pause bleibt 1,2 s lang, nur der Tipp zählt. Den Schutz vor versehentlichem Neustart übernimmt die Pause selbst.**

**[Retry, Stabilität] -> Jeder gepufferte Neustart wirft einen Fehler: `Cannot read properties of undefined (reading 'result')`. `startOrCatchUp` in `session.ts:1679` wechselt den Bildschirm, Zeile 1682 liest danach `this.screen.summary`. TypeScript merkt das nicht, weil die Eingrenzung über den Methodenaufruf bestehen bleibt. Der Rest des Frames fällt aus, genau beim Schichtstart. Außerdem landet der Fehler vermutlich als Rauschen im `/admin` unter „Errors“ (`ui/errors.ts`). [live reproduziert, `session.ts:1679-1682`] -> Den `moneyLanded`-Block vor den Puffer-Block ziehen oder `this.screen.k === 'result'` erneut prüfen. Dazu ein `npm run e2e`-Test: Tipp in der Pause, keine `pageerror`.**

---

## P1: Starker Hebel

### Ablauf Start, Spiel, Game Over, Retry

**[Retry] -> Vom Tod bis zur Spielbereitschaft vergehen auf Level 1 rund 2,0–2,2 s (Tod bis Ergebnis 1,4–1,6 s, dazu die Pause). Nur die 1,2 s Pause sind eine Entscheidung, die 1,4–1,6 s davor zählen beim Warten mit. Neue Spieler sterben am häufigsten und warten deshalb am längsten: Die kurze Pause (0,6 s) greift erst ab der dritten Niederlage in Folge. [live] -> Die Pause bleibt, aber die Zeit vor dem Ergebnis auf etwa 0,8 s kürzen, sobald der Crash lesbar ist. Die Physik läuft dahinter weiter.**

**[Fail-Pause] -> Während der Pause zeigt nichts, dass ein Tipp ankommt oder wann es weitergeht. Der Ring ist dunkelrot und leer. Spieler tippen und sehen keine Reaktion. [live] -> Stilles Signal in der Welt: Der Inselring füllt sich über die Pausenzeit. Ein gepufferter Tipp lässt ihn kurz aufleuchten, mit leichter Haptik. Kein Text.**

**[Ergebnis] -> Das Geld zählt 1,55 s hoch (0,35 s Verzögerung, 1,2 s Zählen), erst danach kommt der Bezahlt-Klang. Wer nach einem Sieg sofort neu startet, verlässt den Ergebnis-Bildschirm vorher und bekommt den Abschluss nie, obwohl er das häufigste Verhalten ist. [Code, `session.ts:1682`] -> Beim Verlassen den Zähler sofort auf den Endwert springen lassen und den Klang kurz abspielen, sodass der Lohn immer landet.**

### Informationsarchitektur

**[Game-Tab] -> Der Bereitschaftsbildschirm trägt ab Level 20 zu viel gleichzeitig: Top-Karte mit Tagesschicht und Autozahl, Neuheit „NEU · NACHT“ mit Seitenpunkten, zwei Inselsymbole mit Punkten, „Tippe zum Starten“, „Tägliche Schicht wartet“, Truhen-Pille, Einstellungen-Pille und Tab-Markierungen. Der einzige Hauptzweck (Tippen) konkurriert mit acht Anlässen. [live, Level 20] -> Maximal eine Aufforderung außerhalb des Rings gleichzeitig, nach fester Reihenfolge. Inselsymbole ohne eigene Punkte. „Tägliche Schicht wartet“ entfällt, wenn die Top-Karte schon „Tagesschicht“ sagt.**

**[Game-Tab] -> Die Einstellungen stehen als große Pille mit Neu-Punkt im Daumenbereich, direkt unter der wertvollsten Pille (Truhen). Sie werden selten gebraucht, haben aber dasselbe Gewicht. [live] -> Auf ein reines Icon verkleinern, in die Top-Karte oder eine Ecke legen. Den Punkt nur bei echter Neuerung zeigen.**

**[Bauen] -> Alle Upgrades stehen als gleichwertiges Raster aus Karten. Bei 50.250 Geld sagt nichts, was sich jetzt lohnt. Die Kaufentscheidung kostet Lesezeit und Scrollen. [live, Level 20] -> Oben eine einzige Empfehlung: das günstigste bezahlbare Upgrade mit spürbarer Wirkung, ein Tipp zum Kauf. Das Raster bleibt darunter. Nicht Bezahlbares deutlich abdunkeln.**

**[Social, offline] -> „Crews und Ränge brauchen den Online-Dienst, mit dem diese Kopie des Spiels nicht verbunden ist.“ ist Technik-Sprache, gefolgt von einer fast leeren Seite ohne Handlung. [live, ohne Server] -> Klartext („Gerade keine Verbindung“) und ein „Erneut versuchen“. Vor dem Bau den echten Offline-Fall auf dem Handy nachstellen.**

### Effekte und Belohnung

Der Abschnitt „Effekte überarbeiten“ unten gehört ebenfalls hierher, an erster Stelle der Auftrag-Effekt.

**[Belohnungs-Hierarchie] -> Der geschaffte Auftrag (billig, täglich) bekommt dieselbe Bühne wie ein Level-5-Meilenstein: `addRays`, Konfetti und Ringe mit `power: 1.2`. Der Abstand zwischen klein und groß fehlt, dadurch wirken auch echte Meilensteine weniger. Eine Niederlage ist zudem deutlich leiser als eine Kleinigkeit. [live] -> Feste Leiter festlegen und dokumentieren: **klein** in der Karte, **mittel** am Ring, **groß** als Vollbild. Vollbild nur für die drei erlaubten Momente (`DECISIONS.md`).**

**[Meldungen] -> Nach einem Ergebnis können drei Zeilen plus „mehr“ in der Warteschlange stehen. Das ergibt rechnerisch etwa 8,7 s (3,5 + 2,6 + 2,6), also fast die Hälfte der nächsten 20-s-Schicht. Das Museum kam im Test erst bei ~4,2 s, als das Bild schon woanders war. [Code für die Summe, live fürs Museum] -> Nur eine Zeile pro Ergebnis, der Rest sammelt sich als stiller Punkt am jeweiligen Tab. Nachrichten mit Beginn der nächsten Schicht verwerfen.**

---

## P2: Feinschliff und Bindung

**[Ergebnis, Fail] -> „GAME OVER / FAIL“ sagt nur, dass es vorbei ist, nicht wie knapp es war. Der stärkste Grund für „noch einmal“ bleibt ungenutzt. [live] -> Eine Zeile auf der Top-Karte: „Noch 3 Autos“. Sie ersetzt Text, statt welchen hinzuzufügen.**

**[Aufträge] -> Die Zeile im Progress-Tab wechselt ohne Übergang auf „Fertig ✓“ (`progress.ts`, `addQuest`). Das Abhaken selbst, der befriedigendste Moment, findet nie auf dem Bildschirm statt, wo der Auftrag steht. [Code] -> Beim ersten Öffnen danach den Haken einzeichnen (etwa 200 ms, ease-out), die Belohnung fliegt zum Kontostand. Nur einmal pro Auftrag.**

**[Geld] -> Die Top-Karte zählt das Geld hoch, aber ohne Bezug zum Ziel. Hohe Kontostände fühlen sich ab Level 20 belanglos an. [live, Level 20] -> Beim Hochzählen kurz zeigen, was jetzt neu erreichbar ist: das Symbol des nächsten Upgrades oder die Truhe, einmal und ohne Text.**

**[Wiederkehr] -> Der Grund für den nächsten Besuch steht nicht auf dem Ergebnis. Tagesserie und Gratis-Truhe liegen in anderen Tabs. [Code, Vermutung] -> Beim letzten Ergebnis des Tages eine einzige Zeile: „Morgen: Tag 8“. Vorher prüfen, ob Umami den Abbruch nach Tag 2 überhaupt zeigt.**

**[Barrierefreiheit] -> Vollbild-Effekte stapeln sechs Farbtöne, Konfetti und Ringe über dem Hinweistext. „Tippe für Level 5“ liegt im Strahlenfeld. Reduce Motion ist gelöst, der Kontrast bei voller Bewegung nicht. [live] -> Hinweise erst nach dem Abklingen zeigen oder eine Fläche dahinter legen.**

---

## Effekte überarbeiten

### 1. Auftrag geschafft (zuerst)

**Heute [live, Level 4]:** Vollbild-Strahlen in sechs Farbtönen, Konfetti, Ringe, gelber Titel „3 AUFTRÄGE GESCHAFFT“. Die wichtigste Zahl („+388“) erscheint erst nach ~0,7 s. „Tippe für Level 5“ liegt mitten in den Strahlen, das Museum folgt bei ~4,2 s als zweiter Kanal. Dazu kommt ein Regelbruch: Das ist ein vierter Vollbild-Moment (`DECISIONS.md`, „Nur drei Vollbild-Momente“), seit `challengeBurst` in `session.ts` ~3418.

**Neu, ohne Vollbild, in der Top-Karte:**

| Zeit | Was passiert |
| --- | --- |
| 0 ms | Eine kompakte Zeile fährt in der Karte aus: Häkchen, Auftragstitel, „+130“. Die Zahl ist sofort da. |
| 0–200 ms | Das Häkchen zeichnet sich (Strich-Animation, ease-out), leichte Haptik. |
| 200–600 ms | 6–10 Münzen fliegen von der Zeile zum Kontostand. Mit jedem Treffer tickt die Zahl, mit kleinem Pop am Ziel. |
| je weiterer Auftrag | 120 ms versetzt. Bei drei Aufträgen zählt die Zeile hoch („3/3“), keine drei Banner. |
| alle Aufträge des Tages | Einmal ein goldener Lichtlauf um den Inselring. Das bleibt der größte Ausschlag, immer noch kein Vollbild. |
| Reduce Motion | Nur die Zeile mit Häkchen, Zahl sofort. |

Umsetzung: `challengeBurst` entfällt und damit `kind: 'challenge'` im `BurstKind`. Vorhandenes wiederverwenden: Top-Karte, `pops.money`, `roll`.

### 2. Weitere Effekte

| Effekt | Schwäche heute | Neue Richtung |
| --- | --- | --- |
| **Fail-Moment** [live] | Karte, roter Ring, Trümmer und „−60/−120“ laufen ohne Rangfolge; die leere Pause wirkt wie ein Hänger. | Klarer Dreischritt: Treffer (kurzer Zeitlupen-Moment der Physik, ohne Freeze), roter Ring läuft einmal um, Karte fällt mit kurzem Nachfedern. Abzüge nacheinander, dann Füllring der Pause. |
| **Serien-Burst** [Code] | Farbe `hazard` bei `power: 1.5`: eine Warnfarbe für einen rein positiven Moment, Farbrolle passt nicht. | Eigene Rollenfarbe, zum Beispiel Flamme als Form mit Zahl statt Rays. |
| **Rays allgemein** [Code] | `JUICE` nutzt sechs Farbtöne, unabhängig vom Anlass; dieselbe Figur bei Truhe, Auftrag, Serie und Meilenstein. | Pro Anlass nur ein Farbton plus Weiß. Regenbogen allein für den seltensten Fund reserviert. |
| **Museum** [live] | Kommt als späte Textzeile, wenn die Aufmerksamkeit schon weg ist. | Nur ein stiller Punkt am Tab, der Text erst im Museum selbst. |
| **Doppel-Auszahlung** (Münzregen) [Code, nicht live gesehen] | Vollbild für eine Handlung, die der Spieler selbst per Anzeige gewählt hat; Münzen landen nicht sichtbar auf dem Konto. | Münzen fliegen zum Kontostand, Zahl tickt mit. Vor dem Bau live ansehen. |

---

## Verweise

Bewusst nicht doppelt: Offene Inhaltsideen (Challenge-Builder, seltene Momente, Wachstum, Anti-Cheat) stehen in [IDEA.md](IDEA.md).
