# UI.md – Apple‑Native HUD Specification für **Car Game**

---

## 1. Kern‑Visuelle Architektur (Apple Look & Feel)

**Design‑Philosophie** – Klarheit, Rücksicht und Tiefe (HIG). Das UI ist ein **transparenter Lens** über dem eigentlichen Spiel‑Content.

### Materialien & Transparenz
- Keine dunklen, festen Rechtecke.
- SwiftUI‑Materialien: `ultraThinMaterial`, `thinMaterial`, `regularMaterial`.
- Runde Formen: `Capsule()`, `RoundedRectangle(cornerRadius: 20, style: .continuous)`.

### Typografie
- Systemschrift: `Font.system(...)`.
- Monospaced‑Digits für Punkte/Zähler: `.monospacedDigit()`.
- Runde Schrift für spielerische Elemente: `.rounded`.
- Hierarchie: `.headline`, `.subheadline`.
- **Dynamic Type** unterstützt.

### Icons
- Nur **SF Symbols 5+** (z. B. `pause.fill`, `arrow.counterclockwise`, `gearshape.fill`, `trophy.fill`).
- Symbol‑Effekte: `.symbolEffect(.bounce)` bei Interaktion.

---

## 2. Layout & Plattform‑Integration

### Layout‑Constraints
- Kritische Bedienelemente **nicht** im Safe‑Area‑Bereich (Dynamic Island, Home‑Indicator, Notch).
- `.safeAreaInset()` und `.ignoresSafeArea()` konsequent nutzen.
- HUD‑Elemente in adaptiven Stacks (`HStack`, `VStack`) verpackt in Material‑Capsules.

### System‑Komponenten (SwiftUI)
| Bedarf | SwiftUI‑Komponente |
|--------|--------------------|
| Navigation / Menüs | `NavigationStack`, `.sheet(isPresented:)`, `.confirmationDialog`, `Menu` |
| Buttons, Toggles, Slider, Picker | `Button`, `Toggle`, `Slider`, `Picker` – mit `PickerStyle.segmented` oder `.menu` |
| Modal‑Overlay für Pause‑Menu | `.sheet` mit `presentationDetents`, `presentationBackground(.ultraThinMaterial)`, `presentationCornerRadius(28)` |
| Tab‑Bar (Hauptnavigation) | `TabView` mit `.tabItem { Image(systemName: …); Text(…) }` |

---

## 3. Native Apple‑Ecosystem‑Integration

### Game Center
- `GKAccessPoint` für schnellen Profil‑/Leaderboard‑Zugriff.
- Öffnen von `GKLeaderboardViewController` & `GKAchievementViewController`.

### Haptics & Audio
- UI‑Interaktionen mit `UIImpactFeedbackGenerator` / `UINotificationFeedbackGenerator` oder **CoreHaptics**.
- Respektiere System‑Sound‑ und Mute‑Schalter, Audio über `AVAudioSession`.

### Controller & Accessibility
- Unterstützung von `GameController` (`GCController`).
- Vollständige VoiceOver‑Labels & Hints für jedes benutzerdefinierte SwiftUI‑Element.

---

## 4. Spiel‑Spezifische UI‑Beispiele & Use‑Cases

### 4.1 Haupt‑Navigation (Tab‑Bar)
```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            GameView()          // Spiel‑Screen (HUD)
                .tabItem { Image(systemName: "car.fill"); Text("Spiel") }
            StreetBuilderView() // zukünftiger Editor
                .tabItem { Image(systemName: "map.fill"); Text("Strecke") }
            ShopView()          // Upgrades/Shop
                .tabItem { Image(systemName: "bag.fill"); Text("Shop") }
            SettingsView()      // Settings
                .tabItem { Image(systemName: "gearshape.fill"); Text("Einstellungen") }
        }
        .accentColor(.accentColor) // einheitliche Akzentfarbe aus Theme.swift
    }
}
```
**Use‑Case:** Der Spieler kann jederzeit zwischen Spiel, Street‑Builder, Shop und Settings wechseln, ohne das aktuelle Spiel zu verlassen – Tab‑Bar ist immer im Safe‑Area‑Bottom‑Inset und respektiert die Home‑Indicator‑Zone.

### 4.2 HUD‑Overlay (im Spiel)
Der HUD ist exakt das Beispiel aus der ursprünglichen Spezifikation, jedoch mit **Bindings** zu `GamePresentation.HUD`:
```swift
struct GameHUDView: View {
    @ObservedObject var hud = HUD.shared   // singleton for live data

    var body: some View {
        ZStack {
            // Gameplay‑Layer (SpriteKit) – bleibt unverändert
            Color.black.ignoresSafeArea()

            VStack {
                // Top‑Bar mit Score, Timer, Strikes
                HStack {
                    // Score‑Capsule (links)
                    HStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                        Text("\(hud.score)")
                            .font(.system(.title3, design: .rounded, weight: .bold))
                            .monospacedDigit()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())

                    Spacer()

                    // Timer (Mitte)
                    Text(hud.timeRemaining)
                        .font(.system(.title3, design: .rounded, weight: .semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())

                    Spacer()

                    // Strikes (rechts)
                    HStack(spacing: 4) {
                        ForEach(0..<hud.strikes, id: \_.self) { _ in
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.red)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                }
                .padding(.horizontal)
                .padding(.top, 8)

                Spacer()

                // Bottom‑Bar – Game‑Center & Pause‑Button
                HStack {
                    Button { hud.showGameCenter.toggle() } label: {
                        Image(systemName: "trophy.fill")
                            .font(.body.weight(.semibold))
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    Spacer()
                    Button { hud.isPaused.toggle() } label: {
                        Image(systemName: hud.isPaused ? "play.fill" : "pause.fill")
                            .font(.body.weight(.semibold))
                            .padding(12)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }
        }
        .sheet(isPresented: $hud.isPaused) {
            PauseMenuView(isPaused: $hud.isPaused)
                .presentationDetents([.medium])
                .presentationBackground(.ultraThinMaterial)
                .presentationCornerRadius(28)
        }
    }
}
```
**Use‑Case:** Während einer Schicht kann der Spieler Score, Timer und Strikes im Blick behalten, jederzeit den Game‑Center‑Leaderboard öffnen oder das Spiel pausieren – alles in nativen, translucenten Materialien.

### 4.3 Pause‑Menu (Native Sheet)
```swift
struct PauseMenuView: View {
    @Binding var isPaused: Bool
    var body: some View {
        VStack(spacing: 20) {
            Text("Spiel Pausiert")
                .font(.system(.title2, design: .rounded, weight: .bold))
            VStack(spacing: 12) {
                Button { isPaused = false } label: {
                    Label("Fortsetzen", systemImage: "play.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .foregroundStyle(.white)
                }
                Button(role: .destructive) { /* Quit Action */ } label: {
                    Label("Beenden", systemImage: "xmark.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            .padding(.horizontal)
        }
        .padding()
    }
}
```
**Use‑Case:** Durch das native `.sheet` wird das Pause‑Menu als Modal‑Overlay angezeigt, das automatisch im Safe‑Area‑Mitte erscheint und mit `presentationDetents([.medium])` eine halb‑hohe Karte simuliert.

### 4.4 Ergebnis‑Banner (In‑Scene‑Overlay)

> **Stand 25.09.2026:** ersetzt. Das Ergebnis steht in der normalen oberen Karte (gleiche
> Größe), die Levelzahl rollt weiter, und nach einem kurzen Nachklang wird es von selbst zum
> Wartebildschirm der nächsten Schicht (`ResultBanner`, ROADMAP.md "Eine Stadt, ein Ring").
> Der Code unten ist der alte Entwurf.
Im `GamePresentation.RenderList` wird ein **Banner** erzeugt, sobald die Schicht endet. Beispiel‑Implementation (aus `HUD.swift`):
```swift
func addResultBanner(to list: inout RenderList, summary: ShiftSummary) {
    let viewport = list.camera.viewport
    let width = viewport.x * 0.9
    let center = Vec2(viewport.x/2, viewport.y * 0.25)
    // Hintergrund‑Plate
    list.add(.roundedRect(center: center, size: Vec2(width, 120), cornerRadius: 20, rotation: 0),
                color: .regularMaterial,
                space: .screen,
                id: .resultBanner)
    // Titel (GAME OVER / SHIFT COMPLETE)
    let title = summary.result.isSuccess ? "SHIFT COMPLETE" : "GAME OVER"
    list.add(.text(title, position: center + Vec2(0, -30), size: 48, alignment: .center, weight: .bold),
                color: .primary, space: .screen, id: .resultTitle)
    // Punkte
    list.add(.text("\(summary.result.points) Punkte", position: center + Vec2(0, 20), size: 36, weight: .regular),
                color: .secondary, space: .screen, id: .resultScore)
    // Optional: New Highscore‑Badge
    if summary.isNewHighscore {
        list.add(.text("NEW HIGHSCORE!", position: center + Vec2(0, 60), size: 20, weight: .semibold),
                    color: .accent, space: .screen, id: .newBadge)
    }
}
```
**Use‑Case:** Keine zusätzliche Menü‑Schicht – das Ergebnis erscheint direkt im Spiel‑Scene‑Graph, ein Tap irgendwo startet die nächste Schicht.

### 4.5 Einstellungen‑Screen (Native Form)
Der Settings‑Screen wird aus `ScreenFlow` generiert und in der App als SwiftUI‑Form dargestellt:
```swift
struct SettingsView: View {
    @ObservedObject var save = SaveStore.shared
    var body: some View {
        Form {
            Toggle(isOn: $save.settings.sound) { Label("Sound", systemImage: "speaker.wave.2.fill") }
            Toggle(isOn: $save.settings.haptics) { Label("Haptics", systemImage: "hand.tap.fill") }
            Picker("Reduce Motion", selection: $save.settings.reduceMotion) {
                Text("Off").tag(ReduceMotion.off)
                Text("Auto").tag(ReduceMotion.auto)
                Text("On").tag(ReduceMotion.on)
            }
            .pickerStyle(.segmented)
        }
        .navigationTitle("Einstellungen")
    }
}
```
**Use‑Case:** Vollständig native Form‑Elemente, sofortige System‑Integration (VoiceOver, Dynamic Type, Dark‑Mode‑Support).

---

### 4.6 Game‑Tab vor der Schicht (M5, M8)

Kein Startmenü: Der Kreisverkehr läuft, oben ein schmales Band, in der Inselmitte der Prompt.

```
┌──────────────────────────────┐
│           LEVEL 14           │  .title2.bold, Akzentfarbe
│           23 cars            │  .title3
│  [ Normal duty | High alert ]│  Picker(.segmented), High Alert rot + "×3 pay"
│  Highscore 48,200 · 19,240 ▣ │  .footnote, .secondary
│                              │
│      Heavy Rain · Roadworks  │  Ankündigung (M8), gelb, nur wenn etwas ansteht
│         Tap to start         │  atmet sanft (nicht mit Reduce Motion)
└──────────────────────────────┘
```

- Wetter und City Event stehen **vor** der Schicht da (Anticipation), nie als Sheet.
- `ScreenContent`/`ReadyBanner` liefert alle Texte (`Strings.Ready.conditions`).

### 4.7 Upgrades‑Tab (M5, M7)

`ScrollView` mit `LazyVGrid` (2 Spalten), je Karte: gezeichnetes Bild, Name, Stufenpunkte, Preis.
Ein Tap öffnet unten die Details (`.sheet` mit `presentationDetents([.height(160)])`), ein
Doppel‑Tap kauft.

- **Insurance** und **Robbery Insurance** erscheinen erst **ab Level 20** (`Upgrade.available`),
  dann mit einer kurzen Einblendung "New: Insurance" als Badge auf dem Tab (`.badge`).
- Gesamtwirkung als Text: "45 % covered", bei Stufe 7 "FULL COVERAGE".
- Kauf: Karte federt (`.spring`), Kontostand zählt herunter (`contentTransition(.numericText())`).
  Fehlt Geld: Karte wackelt, Preis rot. Reduce Motion: nur Farbe und Deckkraft.

### 4.8 Street Builder (M5, M9)

Oben die Karte des Kreisverkehrs, unten eine Palette mit vier Karten (2 × 2):
**New arm · Toll Booth · Speed Camera · Tow Depot**, darunter die Details.

- Ziehen und Ablegen (`.draggable` / `.dropDestination`): Arme rasten an freien Arm‑Plätzen
  am Rand ein, Module an den **Modulplätzen auf dem Ring** (belegter Platz = gelber Ring,
  "wird getauscht").
- Doppel‑Tap auf das abgelegte Teil baut, ein Tap nimmt es weg.
- Erfolg: `sensoryFeedback(.success)`, Hinweis "Tow Depot built on the ring".

### 4.9 Shop‑Tab: Truhen & Sammlung (M10)

`List` mit zwei Sections, alles nativ:

```
Section "Chests"                         (nur wenn welche warten)
  ▸ Standard Chest            [Open]     .borderedProminent
    Common 70 % · Rare 22 % · Epic 7 % · Legendary 1 %   (.caption, immer sichtbar)
  ▸ Criminal Hunt Chest       [Open]
Section "Collection"
  ▸ Sunset       Rare car skin          [On] / [Wear]
  ▸ Neon         Rare map skin          [Wear]
  ▸ Sports Car   Epic vehicle type      Unlocked
Footer: "Epic or better within 7 chests"   (Pity sichtbar)
```

- Öffnen: kurze, dezente Animation (Rahmen in Seltenheitsfarbe, leichter Glow,
  `symbolEffect(.bounce)` auf `gift.fill`), Haptik `chest.ahap`. **Keine** Casino‑Effekte.
- Duplikat: "Duplicate: Mint · +250 cash".
- Kein Kauf mit Echtgeld in v1.0; die Odds stehen immer neben der Truhe.
- Leer: `ContentUnavailableView("No chests yet", systemImage: "gift", description: "Master the game to earn chests: perfect merges, takedowns, long chains.")`

### 4.10 Mastery‑Toast (M10)

Kein eigener Screen. Nach dem Schichtende oben ein kurzer Toast (Capsule, `.thinMaterial`,
3,5 s): "MASTERY COMPLETE · Perfect Timing I · CHEST EARNED". Tap darauf öffnet den Shop.
Nie während einer laufenden Schicht.

### 4.11 Ergebnis ab Level 20 (M7)

Im Ergebnis‑Banner (4.4) eine zusätzliche Zeile über dem Prompt, nur wenn etwas anfiel:
"CRASH COST −120 cash" bzw. "LOSS −350 cash" (rot) oder
"FULL COVERAGE · 120 cash paid by insurance" (grau). Der Übergang zur nächsten Schicht
bleibt flüssig: kein Freeze, kein Replay, keine zusätzliche Einblendung.

### 4.12 Einstellungen, Ergänzung (M11)

Im `Form` (4.5) unter Reduce Motion:
- `Toggle("Vehicle labels")` – kleine Textlabels POLICE / CRIMINAL / SECURED an
  Sonderfahrzeugen, damit Farbe nie die einzige Information ist.

---

## 5. Referenzen & Quellen
- **Apple HIG – Games** – <https://developer.apple.com/design/human-interface-guidelines/designing-for-games>
- **Materials** – <https://developer.apple.com/design/human-interface-guidelines/materials>
- **SF Symbols** – <https://developer.apple.com/sf-symbols/>
- **GameKit** – <https://developer.apple.com/documentation/gamekit>

---

*Dieses Dokument definiert sämtliche UI‑Komponenten für das **Car Game**. Alle neuen UI‑Entwicklungen müssen diese Vorgaben einhalten.*
