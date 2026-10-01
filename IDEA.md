# Idea.md – offene Ideen

Stand: 29.09.2026

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

## Später: Backend über Coolify (Leo, 29.09.2026: verschoben)

Das Spiel bleibt offline-first; ein Backend ist ein Zusatz, der ausfallen darf. Noch offen, in
empfohlener Reihenfolge: (1) Analytics und Fehlerberichte (Umami/Plausible, GlitchTip als
Coolify-Dienste, kein eigener Code); (2) Daily-Bestenliste mit Replay-Prüfung (Seed + Taps,
`core/` läuft in Node; macht die Ranglisten fälschungssicher). Geld und Truhen bleiben lokal,
die Casino-Regel gilt weiter.

**Stand 01.10.2026:** Der Dienst in `Server/` (läuft auf `api-game.gustaff.dev`) kann: Spieler mit
Namen, Bestenlisten Shift-Level und Unlimited, **Freunde-Board** (Freundescode),
**Cloud-Spielstand per Sync-Code** (Settings → Cloud sync), **TURN-Zugänge** für den
Multiplayer (Cloudflare, braucht `CF_TURN_KEY_ID` und `CF_TURN_API_TOKEN` in Coolify, siehe
Server/README) und **Kurzlinks mit Vorschaubild** für Challenges (`/c/…`). Einen eigenen PeerJS-Server gibt es bewusst nicht: der öffentliche Broker reicht
nur Raumcodes weiter, das Netzproblem löst das Relay.

---

## Später: Konto mit Nutzername und Passwort (Leo, 30.09.2026)

Idee: Wer will, legt ein Konto an (nur Nutzername und Passwort, **keine E-Mail**); der Spielstand
liegt dann im Backend und folgt dem Spieler auf jedes Gerät. Ohne Konto bleibt alles lokal, das Konto
ist ein Zusatz, der ausfallen darf.

- **Größe:** ein Stand ist 1,3 KB (neu) bis etwa 22 KB (Level 120, alles gesammelt); 100.000 Spieler
  sind rund 1 GB. SQLite genügt.
- **Ohne E-Mail gibt es keine „Passwort vergessen“-Funktion.** Vergessenes Passwort = Konto weg, das muss
  beim Anlegen klar stehen. Mildern: Cloud sync per Code bleibt, dazu ein einmaliger **Wiederherstellungs-
  schlüssel** beim Anlegen, den der Spieler sich notiert.
- **Passwörter** nur als Argon2- oder bcrypt-Hash speichern, Anmeldeversuche begrenzen, Nutzername
  eindeutig und ohne Beleidigungen (Namensfilter wie beim Multiplayer).
- **Abgleich:** beim Anmelden vergleichen, was lokal und im Konto liegt. Ist der Stand auf beiden Seiten
  verschieden, fragen („Dieses Gerät: Level 42 · Konto: Level 57“) statt still zu überschreiben.
  Speichern nach jeder Schicht; das Spiel bleibt offline spielbar und gleicht später ab.
- **Rechtliches:** Nutzername, Passwort-Hash und Spielstand sind Daten auf dem Server: Absatz in
  `Web/src/present/legal.ts` und neues `LEGAL_UPDATED`, dazu eine Funktion „Konto löschen“.
- **Regeln:** Vorher muss „Kein Backend, keine Datenbank, keine API“ aus den festen Entscheidungen in
  CLAUDE.md. Geld und Truhen bleiben lokal berechnet; ein Konto schützt nur vor Verlust, nicht vor
  Manipulation (die Bestenliste mit Replay-Prüfung aus dem Backend-Plan ist die Stelle dafür).
- **Aufwand:** etwa 2 bis 3 Tage plus Pflege als zweiter Dienst bei Coolify.

Gut befunden (Leo, 30.09.2026), kommen in jedem Fall mit: **Wiederherstellungsschlüssel** beim Anlegen
und **Passwort nur als Hash** mit Begrenzung der Anmeldeversuche. Ebenfalls festgehalten:

- **Abgleich mit Nachfrage** statt stillem Überschreiben, und **Offline bleibt spielbar**: Speichern
  lokal wie bisher, das Konto gleicht danach ab; fällt der Server aus, läuft das Spiel trotzdem.
- **Datenschutz-Absatz und „Konto löschen“** sind Pflicht, sobald Nutzername, Passwort-Hash und
  Spielstand auf dem Server liegen.
- **Grenzen:** das Konto schützt vor Verlust, nicht vor Manipulation; ein zweiter Dienst mit Datenbank
  und Sicherung bei Coolify; vergessenes Passwort ohne Schlüssel bedeutet verlorenes Konto.
- **Der Sync-Code ist gebaut** (01.10.2026, Settings → Cloud sync): kein Name, kein Passwort, Abgleich mit
  Nachfrage, Löschen für alle Geräte. Ein Konto mit Nutzername und Passwort lohnt nur noch, wenn der Code
  nicht reicht (z. B. Wiederherstellung ohne Code). Auf CrazyGames gilt weiter deren Login (`?crazygames`).

---

## Offen: Inhaltliche Abwechslung

- Ghost Racing über Challenge-Links (Leo, 28.09.2026: erstmal nicht).

Diese Inhalte dürfen die Kernmechanik nicht mit Sonderregeln überladen.

