# Android – die Play-Store-App mit AdMob

Diese App (Paket `dev.gustaff.roundabout`) zeigt das Spiel `https://game.timing.love/?googleplaystore` in einer WebView
und spielt AdMobs Rewarded-Anzeige ab. Sie ersetzt die bisherige Trusted Web Activity, weil AdMob ein natives SDK ist,
das eine TWA nicht laden kann. Stand: 14.11.2026, noch nie gebaut und getestet.

## Wie Spiel und App zusammenarbeiten

- Die App gibt der Seite `window.AndroidAds` (`isReady()`, `show()`). `Web/src/ui/admob.ts` erkennt das.
- Nur dann zeigt `Web/src/ui/shell.ts` die Anzeigen-Angebote ohne `?werbung`. Ohne die App (Website, CrazyGames, itch.io,
  alte Play-App) ändert sich nichts.
- Die App antwortet auf `show()` genau einmal über `window.onAdMobResult('watched' | 'dismissed' | 'unavailable')`.
  Bezahlt wird nur bei `watched`, also nachdem die Prämie wirklich verdient wurde.
- IDs: App `ca-app-pub-8814590710596560~8823532214` (`AndroidManifest.xml`), Anzeigenblock
  `ca-app-pub-8814590710596560/9161251590` (Release-Build). Der Debug-Build nutzt Googles Test-Block. **Nie eigene echte
  Anzeigen anklicken**, das verbieten die AdMob-Richtlinien.
- Beim Start fragt die App per UMP nach der Einwilligung, wo das Gesetz es verlangt (EWR, UK).

## Was zu tun ist, bis die App im Play Store ist

1. **Android Studio** installieren und den Ordner `Android/` öffnen. Gradle und SDK lädt es selbst. Gibt es Build-Fehler,
   die Meldung weitergeben: die App wurde noch nie gebaut.
2. **Debug-Version aufs Handy** (USB, „Run“). Prüfen: Anzeige antippen, Test-Anzeige läuft, die Belohnung kommt erst nach
   dem Ende, Schließen zahlt nichts. Außerdem Zurück-Taste, Crew-Link (`/k/…`) und Vollbild prüfen.
3. **`versionCode`** in `Android/app/build.gradle.kts` über den Wert in der Play Console setzen (steht auf 2).
4. **Spieler vorwarnen:** Die App hat einen eigenen Speicher, anders als Chrome. Wer von der alten App kommt, startet bei
   null, außer er schaltet vorher Cloud-Sync ein, notiert den Sync-Code und stellt in der neuen App mit „Restore“ wieder her.
5. **Datenschutz** (`Web/src/present/legal.ts`): „Advertising“ (in der App AdMob statt Applixir, Google erhält Geräte- und
   Werbe-ID) und „The Google Play app“ (öffnet nicht mehr Chrome) anpassen, `LEGAL_UPDATED` setzen. **Erst deployen, wenn die
   App im Store ist**, sonst steht Falsches auf der Live-Seite. Dazu einen Patch-Notes-Eintrag.
6. **AdMob:** die App in AdMob mit dem Play-Eintrag verknüpfen. Neue Apps zeigen echte Anzeigen oft erst nach einer Prüfung.
   `https://timing.love/app-ads.txt` hat die Publisher-Zeile schon (`Web/public/app-ads.txt`).
7. **Play Console:** Datensicherheit ergänzen (Werbe-ID, Gerätekennungen, Zweck Werbung), „Enthält Werbung“ auf Ja.
8. **Release-Build:** Build → Generate Signed Bundle, **derselbe Upload-Schlüssel wie bisher** (nie einen neuen erzeugen,
   sonst nimmt Play den Build nicht an). Die `.aab` zuerst im Internen Test hochladen, dann in die Produktion.
9. Beim Test prüfen, dass Crew-Links die App öffnen. `Web/public/.well-known/assetlinks.json` bleibt gültig (gleicher
   Paketname und Schlüssel).

## Folgen, die du kennen musst

- **Benachrichtigungen entfallen.** Web Push läuft in einer WebView nicht. Punkt 1 in `NEW-PLAYSTORE-BUILD.md` gilt für
  diese App nicht mehr, bis es eine native Lösung gibt.
- **Offen:** EWR-Nutzer müssen ihre Werbe-Einwilligung später ändern können. Dafür fehlt noch ein Eintrag in den Settings
  (UMP `showPrivacyOptionsForm`, über eine weitere Brücke).
- Die AdMob-Regel gegen Anzeigen in Apps, die Nutzern Vergütung für das Ansehen versprechen, nennt Rewarded-Anzeigen nicht
  als Ausnahme. Das Spiel zahlt nur In-Game-Prämien (Truhe, Upgrade-Schritt), keine Geldwerte; das entspricht den
  Rewarded-Regeln. Bei Zweifeln den AdMob-Support fragen.

## Andere Werbenetzwerke (z. B. GameDistribution)

Die Seite ist dieselbe in der Website, in der App und in der alten Play-App. Ein Werbe-Skript, das im Spiel lädt, läuft
also auch in der WebView-App und in der alten TWA. Vor dem Einbau in der Publisher-Vereinbarung des Anbieters prüfen, ob
Android-Apps und WebViews erlaubt sind. Im Code trennen `inPlayStore` und `admobOn` die Kanäle.
