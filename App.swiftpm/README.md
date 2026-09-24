# App.swiftpm – die iPhone/iPad-App

Wird in **Swift Playgrounds auf dem iPad** geöffnet (Phase 2, ROADMAP.md M12). Hängt per
lokalem Pfad von `../Game` ab; unter Windows wird hier nichts gebaut.

## Erster Start auf dem iPad

1. Repo auf dem iPad holen (Working Copy o. ä.), Ordner `App.swiftpm` in Swift Playgrounds öffnen.
2. Playgrounds lädt die Pakete (Game lokal, Google Mobile Ads aus dem Netz).
3. ▶︎ Ausführen. Die App startet im Hochformat mit dem gleichen Spiel wie im Testfenster.

## Wenn es hakt

- **"Package cannot be resolved" für Google Mobile Ads:** In `Package.swift` die Zeile mit
  `swift-package-manager-google-mobile-ads` und das Produkt `GoogleMobileAds` löschen. Die App
  baut dann ohne Werbung; "Watch ad" spielt die Platzhalter-Werbung.
- **`../Game` wird nicht gefunden:** Playgrounds öffnet das Paket evtl. ohne den Ordner
  daneben. Dann das ganze Repo als Ordner öffnen bzw. `Game` neben `App.swiftpm` behalten.
- **Kein Ton:** Stummschalter/Lautstärke; Assets fehlen → unter Windows
  `powershell -File sync-app-assets.ps1` im Repo ausführen und neu synchronisieren.

## Werbung (Google AdMob)

Eingetragen sind Googles **Test-IDs** (App-ID in `AdMob-Info.plist`, Rewarded-Einheit in
`Ads.swift`). Vor dem App Store: AdMob-Konto anlegen, echte IDs eintragen, App-Store-
Datenschutzangaben um Werbe-/Tracking-Daten ergänzen, Datenschutzerklärung nennt AdMob.

## Was hier liegt

| Datei | Aufgabe |
| --- | --- |
| `CarGameApp.swift` | App-Einstieg |
| `GameModel.swift` | hält die `GameSession`, taktet sie mit dem Display |
| `GameCanvas.swift` | zeichnet die Render-Liste (SwiftUI Canvas) |
| `Input.swift` | Touch → Spielaktionen (wie die Maus im Testfenster) |
| `Overlays.swift` | native Buttons (Dispatch, High Alert, Daily, Einstellungen-Sheet) |
| `Platform.swift` | Spielstand, Seeds, Sound, Haptik, Musik |
| `Ads.swift` | Rewarded Ads über AdMob, Tracking-Abfrage |
| `Resources/` | Sounds, Haptik-Muster, Musik (Kopie aus `Assets/`, `sync-app-assets.ps1`) |
