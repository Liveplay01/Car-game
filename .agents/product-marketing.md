# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-22

Entwurf aus dem Repo (CLAUDE.md, Web/PRODUCT.md, DESIGN-LANGUAGE.md, Website-Quelltext). Was nicht belegt ist, steht als **Offen** und ist von Leo zu füllen. Nichts hier erfinden: keine Spielerzahlen, keine Bewertungen, keine Zitate ohne Beleg.

## Product Overview
**One-liner:** Roundabout Timing: das One-Tap-Kreisverkehrsspiel, gratis im Browser.
**What it does:** Autos kreisen auf einem Kreisverkehr, ein Tap schickt das eigene Auto in eine Lücke. Gutes Timing bringt Punkte und Combo, schlechtes einen Crash mit echter Physik. Eine Schicht dauert etwa 20 Sekunden.
**Product category:** Hyper-Casual-Timing-Spiel / Browserspiel (Suchbegriffe laut Website: roundabout game, one tap game, timing game, traffic game).
**Product type:** Browserspiel als PWA (Handy und Desktop), auch als Google-Play-App (Trusted Web Activity, geschlossener Test bis etwa 28.10.2026). Kurzname RAT.
**Business model:** Gratis. Kein Echtgeld-Shop, keine kaufbare Währung. Einzige Werbung: freiwillige Rewarded Ads auf Tap. Truhen und Casino laufen mit Spielgeld.

## Target Audience
**Target companies:** nicht zutreffend (B2C).
**Decision-makers:** der Spieler selbst.
**Primary use case:** Kurze Pausen (Bus, Warteschlange), einhändig am Handy, ab und zu am Desktop.
**Jobs to be done:**
- Eine schnelle Runde spielen, die sich fair und lernbar anfühlt.
- Einen Grund haben, morgen wiederzukommen (Level, Upgrades, Truhen, Daily-Serie).
- Sich mit anderen messen (Ranglisten, Crews, Challenges, Multiplayer).
**Use cases:**
- Tägliche Schicht mit Serie, Karriere bis Level 50, danach Prestige.
- Unlimited und Mayhem zum Rekordjagen.
- Challenge-Link an Freunde schicken.

## Personas
Nicht zutreffend (B2C, ein Käufer, kein Einkaufsgremium). **Offen:** gibt es belegte Spielergruppen (Gelegenheitsspieler, Rekordjäger, Sammler)? Die Umami-Kanäle (tab/app/play) und `visit` liefern dafür Anhaltspunkte.

## Problems & Pain Points
**Core problem:** Kurze Spiele mit unfairem oder zufälligem Gefühl, Werbung, die den Spielfluss zerschneidet, und Fortschritt, der an Konten oder Käufe gebunden ist.
**Why alternatives fall short:** Offen (Wettbewerber nie untersucht; "Car Circle" ist die Inspiration laut CLAUDE.md, nicht verglichen).
**What it costs them:** Offen.
**Emotional tension:** Offen. Beleg aus den Daten: neue Spieler gehen nach Sekunden, ohne Sieg kommen 8 % zurück, mit 3 und mehr Siegen 22 % (Umami, Oktober 2026).

## Competitive Landscape
**Direct:** Car Circle (Vorbild, **Offen:** Vergleich), andere One-Tap-Timing-Spiele im Browser.
**Secondary:** Hyper-Casual-Spiele auf CrazyGames, itch.io und im Play Store.
**Indirect:** Social-Feeds in kurzen Pausen.

## Differentiation
**Key differentiators:**
- Crashes sind echte Physik, keine geskripteten Animationen.
- Fester 120-Hz-Takt, gleicher Seed und gleiche Taps ergeben das gleiche Ergebnis (Replays, faire Ranglisten).
- Läuft ohne Konto und offline, Spielstand liegt lokal im Browser.
- Gratis ohne kaufbare Währung, Chancen in Truhen und Casino sind sichtbar und ehrlich.
- Ein Spielerkonto ist optional, kein Pflicht-Login.
- Wachsende Inhalte: Bosse, Wetter, Stadtereignisse, Museum, Skins mit eigener Karosserie.
**How we do it differently:** Präzision und Ruhe statt Casino-Optik (siehe DESIGN-LANGUAGE.md, Anti-References).
**Why that's better:** Offen (nur mit Spielerbeleg behaupten).
**Why customers choose us:** Offen.

## Objections
| Objection | Response |
|-----------|----------|
| "Noch ein Handyspiel voller Werbung" | Keine Pflicht-, Midgame- oder Banner-Werbung. Rewarded Ads nur auf Tap und nur bezahlt, wenn zu Ende gesehen. |
| "Muss ich mich anmelden?" | Nein. Ein Name ist optional, der Spielstand läuft ohne Konto. |
| "Kann ich Geld ausgeben?" | Nein, es gibt keine kaufbare Währung. |
| "Verliere ich meinen Fortschritt?" | Spielstand liegt lokal, optionaler Cloud-Sync per geheimem Sync-Code. |

**Anti-persona:** Wer ein Casino-Spiel mit Kaufdruck und Dauerreizen sucht.

## Switching Dynamics
**Push:** Offen (Spielerstimmen fehlen).
**Pull:** Ein Tap, 20 Sekunden, sofort verständlich, gratis im Browser.
**Habit:** Gewohnte Handyspiele mit Konto und Fortschritt dort.
**Anxiety:** Fortschritt nur lokal (Gerätewechsel, gelöschte Browserdaten), deshalb Cloud-Sync und der Hinweis darauf.

## Customer Language
**How they describe the problem:** **Offen.** Quellen: Build-with-us-Meldungen (`/admin`), Play-Store-Rezensionen nach dem Test, Discord.
**How they describe us:** **Offen.**
**Words to use:** shift, gap, merge, combo, Tight Fit, crew, chest, daily streak.
**Words to avoid:** Casino-Vokabular im Marketing (jackpot, bet big), "free coins", künstliche Dringlichkeit.
**Glossary:**
| Term | Meaning |
|------|---------|
| Shift | Eine Runde (etwa 20 s) |
| Tight Fit | Sehr knappe Lücke, doppelte Punkte |
| Daily | Tägliche Schicht mit Serie und eigener Rangliste |
| Crew | Gruppe bis 20 Spieler mit Wochen-Liga |
| Prestige | Neustart nach Level 50 mit Rang und neuen Inhalten |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Calm | Ruhiger, klarer Ton | Langweilig | "Tap when you see a gap." (Website) |
| Precise | Konkrete Zahlen und Regeln | Technisch überladen | "Free chest tomorrow · in 13 h" |
| Satisfying | Belohnung im Moment | Dauerjubel, Konfetti überall | Juice im Spiel, nicht im Text |
| Honest | Chancen sichtbar, nichts versteckt | Verkaufsdruck | Truhen-Chancen in LOOT.md |

**Tone by context:**
- Support: freundlich, direkt, support@timing.love.
- Launch: konkret, was ist neu, kein Superlativ (Patch Notes: Englisch, für Spieler geschrieben).
- Errors: sachlich, mit nächstem Schritt.
- Sales: entfällt (kein Verkauf).
- Social: kurz, das Spiel zeigen statt erklären (Reels siehe Marketing/).
**Terms we own:** "one tap", "perfect timing".
**Never use (and why):** Fake-Urgency, "limited time" ohne echtes Ende, Casino-Sprache. Das widerspricht der Design-Sprache und dem Ruf als faires Spiel.

## Proof Points
**Metrics:** **Offen.** Belegbar und öffentlich: Anzahl Skins, Bosse, Karten aus `/data/*.json`; Tages-Bestzeit aus der öffentlichen Rangliste. Keine Spielerzahlen nennen, bevor sie belegt sind.
**Customers:** nicht zutreffend.
**Testimonials:** **Offen.** Keine vorhanden.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Echte Physik | Crash-Engine in `core/crash.ts` |
| Fair und ehrlich | Chancen offen, keine kaufbare Währung |
| Gratis, kein Konto | Spielbar ohne Anmeldung, Datenschutzerklärung nennt nur Umami |

## Goals
**Business goal:** **Offen.** Laut Daten ist Wiederkehr das Problem (Tag-1-Bindung), nicht die Reichweite.
**Conversion action:** Erste Schicht gewinnen, dann die Frage "Weg zurück" (installieren oder Benachrichtigungen) und die Daily-Serie.
**Current metrics:** Umami (Instanz `analytics.kestrel.nrw`), Kanäle tab/app/play. Der geschlossene Play-Test zählt als eigener Kanal und muss herausgerechnet werden.

## Learnings
- 2026-10-22: Befund aus dem Skill-Review. Ein frischer Spieler sieht auf dem ersten Bildschirm nichts außer dem Spiel, die Truhen-Pille erscheint erst nach dem ersten Sieg. Der Demo-Modus (`?demo`) füllt Geld und Truhen vor und taugt nicht, um den Erstbesuch zu beurteilen.

## Changelog
- v1 (2026-10-22): Erstentwurf aus dem Repo, offene Felder markiert.
