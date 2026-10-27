# Neuer Play-Store-Build

Sammelliste für den nächsten Build der Android-App (Trusted Web Activity, Paket
`dev.gustaff.roundabout`). Die App ist nur eine Hülle um `https://game.timing.love/?googleplaystore`:
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

### 2. Crew-Links öffnen die App (seit 18.10.2026)

Der Einladungslink einer Crew liegt auf der Adresse des Spiels (`https://game.timing.love/k/CODE?by=…`), damit
Android ihn der App gibt statt dem Browser. Der Wrapper verknüpft den ganzen Host (`assetlinks.json`); trotzdem prüfen:

- [ ] Im Wrapper (Manifest der Android-App): der Intent-Filter mit `autoVerify` deckt den Pfad `/k/` ab (`pathPrefix="/"`,
      kein engerer Pfad), sonst fehlt die Zeile für `/k/`.
- [ ] Testen: Crew-Link in einem Chat auf dem Handy antippen → die App öffnet sich, Social → Crew zeigt die Einladung.

### 3. Store-Eintrag: Screenshots und Barrierefreiheit (seit 22.10.2026, Feedback der Tester)

Kein Wrapper-Build nötig, aber der Eintrag in der Play Console wird beim nächsten Release gleich mit erneuert.
Die Tester fanden die Screenshots zu schlicht („basic mobile screenshots“).

- [ ] Neuer Screenshot-Satz (1080×1920, 6–8 Bilder), je mit kurzer Textzeile oben: Timing am Kreisel,
      Polizei-Verfolgung, Daily und Serie, Unlimited und Mayhem, Multiplayer, Bosse, Sammlung und Skins,
      Street Builder. Action-Szenen statt Menüs (knappe Rettungen, Verfolgung). Aufnahmen über
      `Marketing/trailer/capture`, Texte mit den Skills `aso` und `copywriting`. Alte Bilder in `Marketing/` ersetzen.
- [ ] Barrierefreiheit in der Beschreibung nennen: Reduce Motion (folgt dem System), Large Text, Linkshänder-Modus,
      Fahrzeug-Beschriftungen, Haptik abschaltbar, Tastatursteuerung, Farbe nie das einzige Signal.

### 4. Viertes Shortcut: Ranks (seit 27.10.2026)

`Web/public/manifest.webmanifest` hat jetzt vier `shortcuts` (Daily, Unlimited, Multiplayer, Ranks; mehr erlaubt Android nicht).
Der Wrapper übernimmt sie nur beim Bauen. Widgets gibt es nicht (Entscheidung Leo, 27.10.2026): stattdessen lassen sich die
Shortcuts per Langdruck als Icon auf den Homescreen ziehen.

- [ ] Beim Bauen: PWABuilder liest das Manifest neu (Web vorher deployt), bei Bubblewrap `bubblewrap update`
      mit frischem Manifest, damit der vierte Eintrag in der App landet.
- [ ] Testen: Langdruck auf das App-Icon zeigt vier Einträge, „Ranks“ öffnet Social → Ranks.

### 5. Neue Adresse game.timing.love (seit 27.10.2026)

Die App öffnet ab diesem Build `https://game.timing.love/?googleplaystore` statt `game.gustaff.dev`. `assetlinks.json`
liegt dort schon (gleiche Fingerabdrücke). Folgen, die kein Code lösen kann:

- **Spielstand liegt pro Adresse.** Wer die alte App-Version mit Fortschritt hat, startet nach dem Update bei null.
  Vorher in der alten App Cloud-Sync einschalten und den Sync-Code notieren, dann in der neuen App „Restore“.
- Push-Abos hängen an der Adresse: Notifications müssen einmal neu eingeschaltet werden.
- Coolify, Server-Dienst: `CORS_ORIGINS` und `GAME_URL` um `https://game.timing.love` ergänzen (die alte Adresse
  vorerst behalten), sonst blockt der Browser die Ranglisten-Anfragen und Einladungslinks zeigen auf die alte Adresse.
- AdSense: `timing.love` unter Sites eintragen, `https://timing.love/ads.txt` muss die Publisher-Zeile haben.
- Umami: Website-Domain prüfen, falls dort eine Domain eingetragen ist.
- Die alte Adresse nicht abschalten, sondern auf `game.timing.love` weiterleiten (Pfad und Query behalten).

### Texte für den Release (Vorschlag)

Versionshinweise (Play Console, kurz):

```
<de-DE>
Neu: Ranks als viertes App-Shortcut (Langdruck auf das Icon), Benachrichtigungen, Crew-Links öffnen direkt die App, Museum-Regale mit Feier, viele Verbesserungen.
</de-DE>
<en-US>
New: Ranks as a fourth app shortcut (long-press the icon), notifications, crew links open the app directly, Museum shelves with a celebration, many improvements.
</en-US>
```

Barrierefreiheit (Absatz für die Store-Beschreibung, Englisch):

```
Made to be played by everyone: Reduce Motion (follows your system setting), Large Text, a left-handed mode, text labels on every vehicle, haptics you can switch off, full keyboard control, and colour is never the only signal.
```

## So geht der Build

### Vorbereitung

1. Alle Web-Änderungen sind deployt (die App lädt immer die Live-Seite).
2. Den **Upload-Schlüssel** bereitlegen (Keystore-Datei + Passwörter), mit dem die App das erste Mal
   gebaut wurde. **Nie einen neuen Schlüssel erzeugen**: Play nimmt nur Builds mit demselben Upload-Schlüssel an.
3. In der Play Console die aktuelle **Versionsnummer** (version code) nachsehen: der neue Build bekommt +1.

### Mit PWABuilder

1. https://www.pwabuilder.com öffnen, `https://game.timing.love` eingeben, *Package for stores* → **Android**.
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
