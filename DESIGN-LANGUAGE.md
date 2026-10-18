# Design Language – Car Game

Die gesammelte Design-Sprache des Spiels: Markenpersönlichkeit, Farbrollen, Design-Prinzipien,
Motion- und Haptik-Regeln, Barrierefreiheit. Vorher verteilt über `Web/PRODUCT.md` und
`FOUNDATION.md`; dort steht jetzt nur noch ein Verweis hierher. Spielregeln mit Zahlen bleiben
in `FOUNDATION.md`, Zielgruppe und Produktzweck in `Web/PRODUCT.md`.

---

## Brand Personality

Calm, precise, satisfying. A dark night-time city (sunny map skins bring daylight around it),
a clean dark road, one amber accent (street-lamp #ffb703) for the interface and coin gold for
what the player earns. The juice is in the moment (Tight Fit, takedown, crash), not in the chrome.

### Colour roles (Leo, 16.10.2026)

Off the road every state speaks one grammar (`--state-*` in `ui/shell.css`, the same tokens on the canvas):

- **Amber** (`accent`): what runs, grows or wants a tap. A bar filling, a lot you lead, a button, a link.
- **Gold** (`coin`, `--money`): what is earned. Money, a goal reached, a tier passed, a lot won, a "Done ✓".
- **Red** (`destructive`): immediate danger, a loss, or an irreversible action. Never ambient pressure,
  engagement urgency or a countdown that the player cannot meaningfully answer.
- **Muted**: what waits or is open.

On the road the Ring Signals keep their own colours (`FOUNDATION.md`, "Der Ring als Signalspur"); green belongs
to the player there. No feature brings its own status colours (blue, teal, violet): rarity and player colours
mean rarity and players, nothing else.

Every progress bar is one part (`present/meter.ts`, `.club-bar`): 6 px, round ends, a track of `controlFill`.
It glides to where it grew since it was last seen, a light runs along it when it is nearly full, and a goal
reached sends one gold wave out from its card, like a payout on the ring.

### Actions

A tap selects or opens; a labelled button in the sheet buys, builds or removes. Only what cannot be undone
(tearing down, prestige, deleting) asks twice, on the same button with a new label. No hidden double taps.

## Anti-references

Casino-style mobile games (flashing banners, fake urgency, coin showers on every screen),
neon arcade clutter, cartoon UI chrome. Also: vehicle colours used as UI colours.

The Casino in the Shop (since 28.09.2026) is the one exception to "no casino look", like the
chest opening: its wins may be loud, but only inside it. It stays honest: odds and returns
one tap away, a real history, every win at least
double the stake, reveals that skip on a tap, no timers, no "win it back", nothing pointing
the player into it from elsewhere, and play money only (no currency can be bought).

## Design Idea

The game should feel like a precise, perfectly tuned machine, and keep its charm as a car and
roundabout game. The modern, Apple-like look is the base: clear, calm, high-quality, smooth.
On top of it sit deliberate playful details like the Ring Signals, which turn game events into
feedback that is beautiful and understood at once.

Every movement, display and interaction flows into the next. Feedback arrives at exactly the
right moment, transitions feel inevitable, and effects feel earned. Precision comes not from
more decoration but from everything interlocking.

The rule: modern and restrained in tone, playful and alive in feedback, always fluid in
motion, clear in function. Every new UI idea must make the game clearer or more satisfying
*and* fit the overall look and the car game.

Controls use familiar gestures and clear cause and effect, so every action is learned fast and
soon feels self-evident: intuitive, fluid, no unnecessary thinking.

## Design Principles

1. The scene is the product: UI floats over it only where needed and never covers the road.
2. Native feel over invention: tab bar, grouped lists, sheets, switches, segmented controls
   as iOS players know them.
3. The more often an event happens, the less animation it gets (see "Motion- und Haptik-Regeln" below).
4. Vehicle types are told apart by shape, colour and symbol, so colour blindness is covered.
5. Fair and exact: taps count at the moment of the touch; same seed and taps, same result.

## Accessibility & Inclusion

WCAG AA contrast for text, 44 px touch targets, keyboard play (Space, Enter, D, Esc),
visible focus, a live region for results, and feedback that never depends on colour, sound or vibration alone.
Every gameplay signal therefore has at least one other cue: shape, symbol, placement, text, animation or
sound. This includes Ring Signals, danger states, goals and multiplayer seats.

**Canvas readability:** HUD, notices and vehicle labels meet AA contrast on every map, weather state and
camera vignette. They keep a readable scrim or outline where the scene is variable, preserve their contrast
when Large Text is on, and never sit below a visual effect that matters to the next tap.

**Motion, input and performance:** Reduce Motion defaults to **System** (and follows
`prefers-reduced-motion`); players can explicitly choose On or Off. It removes shake, zoom, slow-mo and
flying parts. A slow device is offered Reduce Motion once; Battery Saver may lower frame rate and visual
detail, but never input accuracy, game speed or the information needed for the next decision. Left-handed
controls, vehicle labels and Large Text are first-class settings, not alternate designs.

---

## Design-Grundsätze (UI)

- **Dark Theme** mit Farben als Tokens nach Rollen: background, surface (Straße),
  primary (Text), muted, accent, destructive. Sie stehen in
  `Web/src/present/theme.ts` und als CSS-Variablen in `Web/src/ui/shell.css`.
- **Fahrzeugfarben sind Spielinformation und für die UI tabu.** Die Akzentfarbe
  darf nie wie ein Fahrzeugtyp aussehen (Polizei, Pickup, Transporter).
- **Fahrzeugtypen sind immer über Farbe, Form und Symbol erkennbar.** Damit ist
  Farbenblind-Tauglichkeit Standard und kein Extra.
- **Schrift:** die Systemschrift (auf Apple-Geräten SF Pro). Zahlen mit gleich breiten
  Ziffern, damit Punkte und Zähler nicht zittern. **Overpass** ist ausschließlich die Display-Schrift:
  für Titel, große Zahlen und kurze, verdiente Spielmomente. Lesetext, Einstellungen, Listen und längere
  Erklärungen bleiben in der Systemschrift.
- **Glas-Effekt sparsam**, nur für schwebende Bedienelemente über der Szene, nie über
  der Fahrbahn.
- **Touch:** Die ganze Spielfläche ist Tap-Zone. Buttons haben mindestens 44 px.
- **Native App-Anmutung:** Tab-Bar, gruppierte Listen, Sheets, Schalter und Segmented
  Controls, wie man sie von iOS kennt. Eigenes Design nur für die Spielszene selbst
  (Render-Liste).
- **So wenig Bewegung für den Daumen wie möglich:** Nach einer Schicht geht es mit
  einem Tap weiter, ohne einen Button suchen zu müssen.

## Motion- und Haptik-Regeln

Nach Emil Kowalski: Je häufiger ein Ereignis, desto weniger Animation. Für Haptik
gilt dasselbe. Die Bild-Spalte steckt in `Web/src/present/`, die Haptik-Spalte in
`Web/src/audio/` (nur wo der Browser vibrieren kann; auf iPhones kann er es nicht).

| Ereignis | Häufigkeit | Bild | Haptik |
| --- | --- | --- | --- |
| Tap → Auto fährt los | 15× pro Schicht, oft kurz hintereinander | sofort, keine Animation davor | keine (die Bewegung ist das Feedback) |
| Sauber eingefädelt | sehr oft | kein Text | feinster Klick, nur allein im Frame; im Flow tiefer und weicher wie alle Einfädel-Muster |
| Tight Fit | oft | Swoosh + kurzes "TIGHT!" (von 0,9 auf 1 skaliert mit Einblendung, < 250 ms, ease-out); seit 08.10.2026 ein Halt von 30 ms und ein Anlehnen der Kamera von 0,8 % zum Auto (in 70 ms weich hin, 0,26 s zurück; nie in einem Frame, das zuckte), auf Geräten ohne Vibration ×1,6 | ein scharfer Transient |
| Critical Merge, oberste Combo-Stufe | gelegentlich | Halt von 60 ms; der Critical zusätzlich Anlehnen 2,5 % (gleiche Kurve) | eigenes Muster |
| Flow | pro Serie | Ringglühen in drei Stufen (alle 5 Einfädelungen im Flow heller, jedes gesendete Auto pulst es kurz) | weicher |
| Neue Combo-Stufe | gelegentlich | Spring auf dem Multiplikator (Dauer 0,35 s, Bounce 0,2), Glow | Doppel-Tick |
| Crash | gelegentlich | Wracks mit Beulen, abreißende Teile, Splitter, Funken, Rauch; bei harten Treffern (≈ jeder 4.) Feuerball und Brand; Shake je nach Aufprallstärke, seit 08.10.2026 in Flugrichtung der Wracks (Stoß längs, wenig quer). Wracks und Rauch liegen unter dem Verkehr, damit keine Lücke verdeckt wird | kräftiger Stoß + kurzes Rumpeln, nur beim eigenen Crash |
| Rush Hour beginnt | 1× pro Schicht | Zustandswechsel am Auto-Zähler (Akzent-Pill) | ansteigendes Muster |
| Slow-Mo | beim Verbrecher-Takedown und beim Crash, der die Schicht beendet (0,2× für 0,45 s; die Kamera lehnt sich 8 % zum Aufprall, beim Takedown 5 %, danach 5 % Zurücktreten). Seit 08.10.2026 auch 0,5× für höchstens 0,9 s mit 6 % Blick darauf, wenn das letzte Auto einer Schicht dicht neben anderem Verkehr einfädelt (dann ist kein Tap mehr offen) | nie für häufige Ereignisse (Ausnahme seit 08.10.2026: der kurze Halt beim Tight Fit, kürzer als ein Blinzeln) | eigenes Muster |
| Spannung (08.10.2026, `present/cameraFx.ts`) | Zustand, pro Schicht | Rush Hour (steigt mit jedem Auto), letztes Auto, Verbrecher (Boss stärker), Militär-Truck, oberste Combo-Stufe, Unlimited nach Dauer: die Kamera lehnt sich bis 4 % vor, **Drehpunkt ist die Haltelinie**, damit die Lücken stillstehen; die Ränder dunkeln ab (Vignette bis 30 % auf hellen, 50 % auf dunklen Karten, unter dem HUD). Geschafft: die Spannung fällt schnell, die Kamera atmet 2 % aus. Nie in Chill und im Tutorial. Die Spannung rastet auf Stufen ein, damit der Boden gebacken bleibt | keine |
| Menüs (Sheets, Tabs) | selten | ≤ 250 ms, `cubic-bezier(0.23, 1, 0.32, 1)`; Knöpfe geben beim Drücken leicht nach | nur bei Bestätigungen |

**Reduce Motion** ist eine Einstellung und folgt standardmäßig der des Systems
(`prefers-reduced-motion`). Sie entfernt Shake, Zoom, Slow-Mo und fliegende Teile. Ein-
und Ausblenden sowie Farbwechsel bleiben, weil sie Information tragen; auch die Vignette der
Spannung bleibt (sie ist eine Blende), sie trägt dann die Spannung allein.

### Kamera als Lesbarkeit, nicht als Dekoration

Die Kamera verstärkt ausschließlich einen bereits klaren Spielmoment. Sie bewegt nie die Haltelinie,
die nächste Lücke oder einen tappbaren Bereich aus dem Blick; ihr Drehpunkt bleibt daher die Haltelinie.
Ein Impuls beginnt erst mit seinem Ereignis, ist vor dem nächsten entscheidenden Tap wieder ruhig und
verändert weder Eingabezeit noch Simulation. In jedem Kameramoment bleiben Verkehr, HUD und die
nächste Entscheidung lesbar. Ohne Motion werden dieselben Zustände über Ring, Vignette, Sound und
Text vermittelt, nie nur über Zoom oder Shake.

### Intensität nach Modus

Alle Modi teilen dieselbe ruhige Nachtstadt, die Farbrollen und die präzise Eingabe. Sie unterscheiden
sich nur darin, wie viel Energie ein Moment verdient:

- **Shift:** die Referenz. Ruhig lesen, präzise einfädeln; Tight Fits, Combo-Stufen, Takedowns und
  Crashes sind kurze, klar abgegrenzte Höhepunkte.
- **Unlimited:** Spannung wächst langsam mit Dauer und Dichte, nie durch hektische UI. Marken und
  Rekorde fühlen sich verdient an, danach kehrt das Bild sofort zur lesbaren Straße zurück.
- **Mayhem:** Explosionen und Ketten sind hier das Ziel, dürfen aber weder die nächste Einfahrt noch den
  Zustand der Kette verdecken. Die Action ist lokal, lesbar und nach der Kette wieder still.
- **Multiplayer:** Spielerfarben bedeuten ausschließlich Sitz und Zugehörigkeit. Status bleibt die
  gemeinsame Amber-/Gold-/Rot-Grammatik; Ergebnisse zeigen immer Name, Rang und Symbol zusätzlich zur
  Farbe.
- **Build, Progress und Shop:** ruhige Arbeitsflächen über derselben Stadt. Truhen und Casino dürfen
  beim tatsächlichen Reveal laut sein, bleiben aber lokal, ehrlich und frei von Druck oder Animationen,
  die zu einem weiteren Einsatz drängen.

Nach jedem Höhepunkt gibt es vor der nächsten Entscheidung einen ruhigen, lesbaren Zustand.

---

## Systemische Konsistenz & Komponenten-Disziplin

Jede DOM-Fläche baut auf denselben Bausteinen der Shell auf (`ui/shell.css`), damit Höhen, Radien und Abstände
im ganzen Spiel gleich bleiben:

- **Maße:** Touch-Ziele mindestens 44 px (`--touch-min`). Abstände nur `--s1` bis `--s7` (4, 8, 12, 16, 24, 32, 48 px),
  Radien `--r-row` (14 px) und `--r-sheet` (24 px), dazu die Safe-Area-Tokens und die festen Pill-Maße. Ein neuer Wert
  braucht einen gemeinsamen, wiederverwendbaren Zweck; keine Inline-Styles, keine Sondergrößen pro Screen.
- **Tab-Bar als Dock (Leo, 16.10.2026):** eine schwebende Kapsel über der Szene, höchstens 440 px breit und mittig,
  mit `--dock-gap` über der Safe Area. Sie streckt sich nie über einen Desktop oder ein iPad. `--tabbar-h` ist der Platz,
  den sie beansprucht (Dock und Abstand), alles darüber richtet sich danach.
- **Aktionen:** *Primary* in voller Akzentfarbe für die eine Hauptaktion einer Ansicht; *Secondary/Ghost* auf `surface`
  oder `muted` für Begleitendes; *Destructive* in Rot nur für Unwiderrufliches, mit Bestätigung auf demselben Knopf
  (siehe „Actions“).
- **Punkte und Badges:** Ein Punkt am Tab, Segment oder Knopf heißt „hier wartet etwas auf einen Tap“ und ist Amber,
  nie Rot (Farbrollen).

---

## Audio, Kamera-Motion & Technische Präzision

- **Haptik-Ersatz auf iOS:** Der Browser auf iPhones kann nicht vibrieren. Dort tragen Klang und Kamera das Gefühl:
  kurze Transienten beim Einfädeln, das Anlehnen beim Tight Fit (ohne Vibration ×1,6) und beim Critical Merge. Es gilt
  dieselbe Regel wie oben: je häufiger das Ereignis, desto leiser die Antwort.
- **Performance vor Dekor:** Die Spielschleife und die Eingabe stehen über jedem Effekt. DOM-Übergänge bewegen nur
  `transform` und `opacity`. Auf schwachen Geräten bietet das Spiel einmal Reduce Motion an; der Akkusparmodus senkt
  Bildrate und Details, nie Eingabegenauigkeit oder Spieltempo.
- **Schichtwechsel ohne Ergebnis-Screen:** Das Ergebnis steht in der oberen Karte und in der Insel, der Ring schickt
  einen Lichtlauf herum, der Verkehr fährt weiter. Es gibt keinen „Weiter“-Knopf: ein Tap irgendwo startet die nächste
  Schicht (nach einer verlorenen erst nach der Fail-Pause, `ResultBanner.breath`). Was danach kommt, gleitet von selbst
  in den Wartebildschirm (Spiel.md, „Fließender Schichtwechsel“).
- **Die Insel bleibt frei:** Vor dem Start steht dort nur, was die nächste Schicht betrifft (Aufforderung, Bedingungen,
  eine Neuigkeit zum Verkehr). Aufträge, Ziele und Fortschritt gehören in den Fortschritt-Tab, nicht in die Mitte.
- **Kontrast auf jeder Karte:** HUD, Hinweise und Fahrzeugnamen behalten auf jeder Karte, bei jedem Wetter und unter der
  Spannungs-Vignette AA-Kontrast, über eine Scrim-Fläche oder Kontur, wo die Szene wechselt (siehe „Canvas readability“).
  `npm run e2e` prüft das über die Karten und Wetterlagen.
