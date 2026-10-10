# Neuer Play-Store-Build

Sammelliste für den nächsten Build der Android-App (Trusted Web Activity, Paket
`dev.gustaff.roundabout`). Die App ist nur eine Hülle um `https://game.gustaff.dev/?googleplaystore`:
**jedes Web-Deployment ist sofort in der App**, ohne neuen Build. Einen neuen Build braucht es nur, wenn
sich die Hülle ändert. Solche Punkte sammeln sich hier, gebaut wird, wenn genug zusammengekommen ist.

## Was einen neuen Build braucht

- Optionen des Wrappers (z. B. Benachrichtigungen weiterreichen)
- App-Name, Icon, Splash-Farbe, Ausrichtung, Start-URL
- `shortcuts` im Manifest (`Web/public/manifest.webmanifest`): der Wrapper übernimmt sie nur beim Bauen
- Eine neue Android-Berechtigung

Alles andere (Spiel, Texte, Server, Datenschutzseite) kommt mit dem normalen Deployment.

## Offene Punkte

### 1. Benachrichtigungen (seit 08.10.2026)

Das Spiel schickt Web-Push über den Ranglisten-Dienst (Web/README.md, „Notifications“). In der App kommen
sie nur an, wenn der Wrapper sie an Android weiterreicht.

- [ ] Vorher: Server hat `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in Coolify, und
      https://api-game.gustaff.dev/v1/push/key antwortet mit `{"key":"B…"}`
- [ ] Im Wrapper „Notification delegation“ einschalten (PWABuilder) bzw. `"enableNotifications": true`
      (Bubblewrap, `twa-manifest.json`)
- [ ] Play Console → App-Inhalte → Datensicherheit: „Geräte- oder andere IDs“ ergänzen
      (wird erhoben, Zweck: App-Funktionen, optional für den Nutzer). Die Push-Adresse zählt dazu.
- [ ] Testen auf dem Handy: Settings → Account → Notifications einschalten → Android fragt (ab Android 13) nach der
      Erlaubnis → Schalter bleibt an. Ein Tipp auf eine Benachrichtigung öffnet die App, nicht Chrome.

## So geht der Build

### Vorbereitung

1. Alle Web-Änderungen sind deployt (die App lädt immer die Live-Seite).
2. Den **Upload-Schlüssel** bereitlegen (Keystore-Datei + Passwörter), mit dem die App das erste Mal
   gebaut wurde. **Nie einen neuen Schlüssel erzeugen**: Play nimmt nur Builds mit demselben Upload-Schlüssel an.
3. In der Play Console die aktuelle **Versionsnummer** (version code) nachsehen: der neue Build bekommt +1.

### Mit PWABuilder

1. https://www.pwabuilder.com öffnen, `https://game.gustaff.dev` eingeben, *Package for stores* → **Android**.
2. Optionen prüfen bzw. setzen:
   - Package ID: `dev.gustaff.roundabout` (nie ändern)
   - App name / Short name: Roundabout Timing / RAT
   - Version code: alter Wert + 1, Version name z. B. `1.1.0`
   - Start URL: `/?googleplaystore`
   - Display: Fullscreen, Orientation: Portrait
   - Die Optionen aus den offenen Punkten oben (z. B. Notification delegation)
   - Signing key: **Use mine** → den vorhandenen Upload-Keystore hochladen
3. *Generate* und das ZIP laden. Darin: die `.aab`-Datei und eine `assetlinks.json`.
4. Die Fingerabdrücke in dieser `assetlinks.json` mit `Web/public/.well-known/assetlinks.json` vergleichen.
   Gleich: nichts tun. Anders: Fehler beim Schlüssel, nicht hochladen, erst klären.

### Oder mit Bubblewrap

```powershell
bubblewrap update      # liest twa-manifest.json, nimmt die Version + 1
bubblewrap build       # fragt nach den Keystore-Passwörtern, baut app-release-bundle.aab
```

Die Optionen aus den offenen Punkten vorher in `twa-manifest.json` eintragen.

### Hochladen

1. Play Console → Roundabout Timing → **Test und Veröffentlichung** → den Track wählen
   (zuerst *Geschlossener Test* oder *Interner Test*, dann *Produktion*) → **Neuen Release erstellen**.
2. Die `.aab` hochladen, Versionshinweise schreiben (Deutsch und Englisch, kurz: was neu ist).
3. Falls ein Punkt oben es verlangt: Datensicherheit bzw. Berechtigungen in den App-Inhalten anpassen.
4. Release prüfen und einführen.

### Nach dem Release

- [ ] Auf einem echten Handy aus dem Play Store installieren bzw. aktualisieren.
- [ ] Keine Adressleiste oben (sonst stimmt `assetlinks.json` nicht).
- [ ] Zurück-Taste schließt Sheets, beendet nicht sofort die App.
- [ ] Jeden erledigten Punkt oben einmal ausprobieren.
- [ ] Erledigte Punkte aus „Offene Punkte“ löschen und unten mit Datum eintragen.

## Erledigt

(noch nichts seit der ersten Veröffentlichung)
