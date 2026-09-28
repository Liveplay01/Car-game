# MONETIZATION.md – In-App-Käufe und Werbung

> **Pausiert seit 27.09.2026:** Beschreibt In-App-Käufe und Werbung der iOS-App. Die Web-Version hat keine Werbung und keine Käufe.
>
> **Store entfernt (Leo, 28.09.2026):** Die Web-Version hatte zwischenzeitlich einen Platzhalter-Store
> (Geldpakete, Truhen, No Ads, Cash Boost). Er ist samt Cash Boost und Free-Cash-Werbung gelöscht; an
> seiner Stelle steht das Casino ([LOOT.md](LOOT.md), Casino). **Solange das Casino existiert, gibt es
> keine kaufbare Währung und keine Truhen gegen Echtgeld** – sonst wäre es echtes Glücksspiel. Übrig
> ist nur die Platzhalter-Werbetruhe (3 pro Tag).

Stand: 26.09.2026 · Alles hier ist **Platzhalter**: Produkte, Preise und Mengen sind
Startwerte (`Config.swift`, `Store.swift`), bis die Produkte in App Store Connect angelegt
sind. Truhen-Inhalte und Odds stehen in [LOOT.md](LOOT.md).

## Grundsätze

- **Nur freiwillig.** Werbung sieht nur, wer sie antippt (Rewarded Ads). Keine
  Interstitials, keine Banner: Eine Schicht dauert ~20 Sekunden und geht ohne Pause in die
  nächste über. Jede Unterbrechung dazwischen würde genau diesen Fluss zerstören.
- **Nichts Spielentscheidendes nur gegen Geld.** Alles, was man kaufen kann, lässt sich
  auch erspielen (Geld, Truhen). Einzige Ausnahme ist der Cash Boost, und der gibt nur
  mehr Geld, keinen Vorteil im Verkehr.
- **Odds bleiben sichtbar**, auch bei gekauften Truhen (App Store 3.1.1).

## Umgesetzt (Platzhalter)

Der Shop hat einen dritten Bereich **Store** (Chests · Collection · Store).

| Angebot | Art | Inhalt | Platzhalter-Preis |
| --- | --- | --- | --- |
| Starter Pack | einmalig | 30.000 Geld, 1 Premium- und 2 Standard-Truhen | $1.99 |
| Pile of Cash | Verbrauchsgut | 25.000 Geld | $0.99 |
| Bag of Cash | Verbrauchsgut | 90.000 Geld | $2.99 |
| Vault of Cash | Verbrauchsgut | 240.000 Geld | $6.99 |
| 3 Premium Chests | Verbrauchsgut | 3 Premium-Truhen | $3.99 |
| No Ads | einmalig | Werbe-Belohnungen ohne Werbung (Tageslimits bleiben) | $3.99 |
| Cash Boost | einmalig | +50 % Geld aus jeder Schicht (`cashBoostPay`) | $4.99 |

**Rewarded Ads**, bei No Ads kommt die Belohnung sofort:

| Belohnung | Wo | Limit |
| --- | --- | --- |
| Standard-Truhe | Shop · Chests | 3 pro Tag (`adChestsPerDay`) |
| Free Cash: 2.000 + 250 pro Level | Shop · Store | 3 pro Tag (`adCashPerDay`) |

**Technik:**

- `GameCore/Store.swift`: `StoreProduct` mit den Produkt-IDs `cargame.*`.
  `Career.applyPurchase` bucht einen Kauf, `restorePurchases` stellt Käufe wieder her,
  `rewardAd(_:)` zahlt Werbe-Belohnungen.
- Einmal-Käufe liegen im Spielstand (`Career.purchases`). Die App soll sie später bei
  jedem Start mit StoreKit abgleichen.
- `Purchasing` in `GamePresentation/Platform.swift` ist die Schnittstelle, über die die
  App StoreKit anbindet. Ohne Anbindung läuft ein Platzhalter-Kauf: Ein Sheet mit Name
  und Preis erscheint, nach 1,2 s ist die Ware da. Es wird kein Geld abgebucht.
- Werbung läuft über `AdProviding` (AdMob, siehe CLAUDE.md), im Testfenster als
  3-Sekunden-Platzhalter.

## Vor der Veröffentlichung offen

1. **StoreKit-2-Adapter** in `App.swiftpm`: Er erfüllt `Purchasing`, lädt die Preise,
   kauft, prüft Transaktionen und stellt Käufe wieder her. Bis dahin verschenkt die App
   die Platzhalter-Käufe. **Das darf nicht in den App Store.**
2. **Produkte in App Store Connect** mit genau diesen IDs anlegen, echte Preisstufen
   wählen.
3. **Rechtliche Prüfung der Premium-Truhen gegen Echtgeld** (Lootboxen: Belgien und
   Niederlande, Altersfreigabe). Notfalls das Angebot dort ausblenden.
4. **Datenschutzangaben** um Käufe ergänzen. AdMob und die ATT-Abfrage stehen schon
   in CLAUDE.md.
5. **Balancing:** `Sim --career` mit Cash Boost laufen lassen. Die Geldpakete gegen die
   Upgrade-Preise prüfen, damit ein Kauf spürbar, aber nicht spielentscheidend ist.

## Weitere Möglichkeiten, noch nicht gebaut

- **Season Pass** (eine kostenlose und eine bezahlte Spur mit Belohnungen). Passt zu den
  Event-Truhen und Saisons, braucht aber eine eigene Fortschrittsspur.
- **Direkt kaufbare Skins** (Bundles ohne Zufall). Rechtlich einfacher als Lootboxen.
- **Quest nachwürfeln per Werbung** (eine Tages-Challenge tauschen), passt auf den neuen
  Progress-Tab.
- **Doppeltes Schichtgeld per Werbung** direkt nach der Schicht. Der häufigste
  Hypercasual-Trick, verworfen: Er bräuchte einen Knopf im Ergebnis, und das Ergebnis
  soll mit einem Tap überall in die nächste Schicht führen.
- **Abo** (z. B. monatlich Truhen und No Ads). Für ein Offline-Spiel dieser Größe eher
  abschreckend.
