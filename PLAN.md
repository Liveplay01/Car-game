# Car Game – Build- & Release-Plan

Stand: 23.09.2026 (aktualisiert)

## Ziel

Ein Kreisverkehr-Timing-Spiel fürs iPhone ([IDEA.md](IDEA.md)), nativ in **Swift**,
das wir **weltweit veröffentlichen**. Installiert wird über den App Store, die
eigene Website ist die Startseite des Spiels.

## Technik (entschieden)

- **Swift, für alles:** Spiellogik, Testfenster, iPhone-App. Kein
  Cross-Plattform-Framework, keine Engine.
- **iPhone-App:** SwiftUI für die Menüs, SpriteKit für die Spielszene, Core Haptics.
- **Läuft auf jedem iPhone ab iOS 26** (ab iPhone 11 / SE 2. Gen.), im Hochformat.
- **Spielsprache:** nur Englisch.
- **GitHub erst ab Phase 2:** dann nur als privater Sync-Kanal zwischen Windows
  und iPad (Remote `origin` ist bereits eingerichtet), kein Branch-/PR-Workflow.

Details stehen in [FOUNDATION.md](FOUNDATION.md), die Meilensteine in [ROADMAP.md](ROADMAP.md).

## Phase 1 – Entwicklung & Testen auf Windows

- **Hier passiert fast die ganze Arbeit:** Spiellogik, alle Features, Balancing,
  Look & Feel, Sounds und Haptik-Muster.
- Swift läuft unter Windows (Swift-Toolchain + VS Code).
- Gespielt wird in einem **Testfenster** mit einfachen Formen. Maus oder
  Leertaste ersetzen den Finger.
- Kein Mac, kein iPhone und kein Apple-Account nötig.
- Roadmap: **M0–M11**.

## Phase 2 – Fertigstellung auf dem iPad (Swift Playgrounds)

- **Kein Mac nötig:** Swift Playgrounds auf dem iPad unterstützt vollwertige
  SwiftUI-App-Projekte (`.swiftpm`) mit echtem Zugriff auf iOS-APIs (SpriteKit,
  Core Haptics, AVFoundation) – Touch, Haptik, Ton, Menüs entstehen und laufen
  direkt auf dem Gerät.
- **Sync über GitHub:** Windows pusht auf den bestehenden Remote (`origin` →
  github.com/Liveplay01/Car-game, Repo auf privat stellen), das iPad zieht sich
  den Stand über eine Git-App (z. B. Working Copy) oder Playgrounds' eigenen
  Repo-Import. Kein Kollaborations-Workflow – nur Sync für ein Ein-Personen-Projekt.
- **Projektstruktur:** `App.swiftpm/` liegt als eigener Ordner neben `Game/` im
  selben Repo und hängt per lokalem Pfad von `Game/` ab, das dadurch unverändert
  unter Windows weiterbaut und -testet.
- **Zum Testen reicht die kostenlose Apple-ID**, kein bezahlter Account nötig,
  solange nur auf dem eigenen Gerät getestet wird.
- **Offen, in M12 zu klären** (siehe [ROADMAP.md](ROADMAP.md)): ob ein iPad allein
  für iPhone-genaues Touch-/Haptik-/Bildschirmgrößen-Testing reicht oder
  zusätzlich ein echtes iPhone nötig ist, ob die lokale Pfad-Abhängigkeit auf
  `Game/` in Playgrounds sauber auflöst, und ob sich M13 (App-Store-Einreichung)
  direkt vom iPad aus erledigen lässt oder Xcode am Ende doch nötig wird.
- Roadmap: **M12**.

## Phase 3 – Veröffentlichung

**Wichtig:** Eine iPhone-App lässt sich nicht weltweit über die eigene Website zum
Download anbieten.

- **EU:** Download direkt von einer Website ("Web Distribution") ist nur für
  Entwickler freigegeben, die Apples Kriterien erfüllen, ab 01.10.2026 zum
  Beispiel eine Finanzbewertung durch Dun & Bradstreet, eine Finanzprüfung,
  Investoren oder Nonprofit-Status. Dazu kommt Apples Prüfung (Notarisierung), und
  es gilt nur für Nutzer in der EU.
- **Japan:** nur über alternative App-Marktplätze, nicht direkt von einer Website.
- **Rest der Welt:** nur über den App Store.

**Unser Weg:**

- **App Store, weltweit.** Das braucht das Apple Developer Program (99 $/Jahr).
  Das Spiel selbst kann kostenlos sein.
- **Deine Website ist die Startseite des Spiels:** Landing Page mit
  App-Store-Link, dazu Datenschutzerklärung und Support-Seite. Beides verlangt Apple.
- **Vorab-Tests über TestFlight:** Ein öffentlicher Einladungslink auf deiner
  Website erreicht bis zu 10.000 Tester, bevor das Spiel im Store ist.
- **Updates** laufen danach ebenfalls über den App Store.
- Roadmap: **M13**.

## Offene Punkte

- [x] Engine → Swift, nativ
- [x] Spielkonzept → One-Tap-Kreisverkehr ([IDEA.md](IDEA.md))
- [x] Steuerung → ein Tap, Hochformat, einhändig
- [x] Umfang der ersten Version → [ROADMAP.md](ROADMAP.md)
- [x] Grafikstil → flache Vektorformen, Dark Theme; Platzhalter zuerst
- [x] Testgerät für Phase 2 → iPad mit Swift Playgrounds statt Mac (23.09.2026,
      siehe ROADMAP.md)
- [ ] Geldmodell: komplett kostenlos, oder später Lootboxen/Season Pass mit
      Echtgeld? Das bräuchte In-App-Käufe und eine rechtliche Prüfung, betrifft
      aber erst die Zeit nach v1.0.
