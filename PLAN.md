# Car Game – Build- & Release-Plan

Stand: 21.09.2026 (aktualisiert)

## Ziel

Ein Kreisverkehr-Timing-Spiel fürs iPhone ([IDEA.md](IDEA.md)), nativ in **Swift**,
das wir **weltweit veröffentlichen**. Installiert wird über den App Store, die
eigene Website ist die Startseite des Spiels.

## Technik (entschieden)

- **Swift, für alles:** Spiellogik, Testfenster, iPhone-App. Kein
  Cross-Plattform-Framework, keine Engine.
- **iPhone-App:** SwiftUI für die Menüs, SpriteKit für die Spielszene, Core Haptics.
- **Läuft auf jedem iPhone mit iOS 27** (ab iPhone 11 / SE 2. Gen.), im Hochformat.
- **Spielsprache:** nur Englisch.
- **Kein GitHub:** Das Projekt liegt lokal.

Details stehen in [FOUNDATION.md](FOUNDATION.md), die Meilensteine in [ROADMAP.md](ROADMAP.md).

## Phase 1 – Entwicklung & Testen auf Windows

- **Hier passiert fast die ganze Arbeit:** Spiellogik, alle Features, Balancing,
  Look & Feel, Sounds und Haptik-Muster.
- Swift läuft unter Windows (Swift-Toolchain + VS Code).
- Gespielt wird in einem **Testfenster** mit einfachen Formen. Maus oder
  Leertaste ersetzen den Finger.
- Kein Mac, kein iPhone und kein Apple-Account nötig.
- Roadmap: **M0–M6**.

## Phase 2 – Fertigstellung auf dem Mac

- **Der Mac (wird angeschafft) dient nur zum Fertigmachen:** Xcode-Projekt,
  iPhone-Anbindung (Touch, Haptik, Ton, Menüs), Tests auf echten Geräten, Signieren.
- **Voraussetzung:** Apple Silicon und macOS 26.6 oder neuer, weil Xcode 27 sonst
  nicht läuft.
- Der Projektordner zieht dafür einmal auf den Mac um.
- **Zum Testen auf dem eigenen iPhone reicht die kostenlose Apple-ID.** Die App
  läuft dann jeweils 7 Tage und wird danach einfach neu aus Xcode gestartet.
- Roadmap: **M7**.

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
- Roadmap: **M8**.

## Offene Punkte

- [x] Engine → Swift, nativ
- [x] Spielkonzept → One-Tap-Kreisverkehr ([IDEA.md](IDEA.md))
- [x] Steuerung → ein Tap, Hochformat, einhändig
- [x] Umfang der ersten Version → [ROADMAP.md](ROADMAP.md)
- [x] Grafikstil → flache Vektorformen, Dark Theme; Platzhalter zuerst
- [ ] Geldmodell: komplett kostenlos, oder später Lootboxen/Season Pass mit
      Echtgeld? Das bräuchte In-App-Käufe und eine rechtliche Prüfung, betrifft
      aber erst die Zeit nach v1.0.
