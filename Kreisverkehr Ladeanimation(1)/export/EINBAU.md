# Boot-Zoom einbauen

`Web/src/present/bootZoom.ts` an dieselbe Stelle im Repo kopieren. Keine Abhängigkeiten, kein Inline-Script (CSP bleibt unverändert).

## 1. `Web/index.html`

Im `.boot`-Block das Lade-SVG des Rings ausblenden, sobald der Zoom läuft (die No-JS-/20-s-Fehlermeldung bleibt als Rückfall erhalten):

```css
.boot.zoom { padding: 0; }
.boot.zoom > svg, .boot.zoom .boot-fail { display: none; }
```

## 2. `Web/src/main.ts`

```ts
import { BootZoom } from './present/bootZoom';

// direkt nach `const boot = document.getElementById('boot');`
const zoom = boot && !firstVisit ? new BootZoom(boot) : null;   // Erstbesuch behält die Lektion
if (zoom) boot!.classList.add('zoom');
```

In `bootFailed()` am Anfang:

```ts
if (zoom) { zoom.fail(S.shell.bootTitle, S.shell.bootBody, S.shell.bootRetry); return; }
```

(`firstVisit` muss dafür vor `bootFailed` berechnet werden, oder `zoom` als `let` anlegen und nach der `firstVisit`-Zeile zuweisen.)

Statt des Ausblendens am Ende:

```ts
gameLoaded();
// …
if (zoom) await zoom.ready({ night: shell.game.config.night });   // Lampen oder Sonnenaufgang
if (boot && (bootDemo === null || bootDemo === 'learn')) {
  boot.classList.add('gone');
  window.setTimeout(() => { boot.hidden = true; zoom?.destroy(); }, 450);
}
```

`night` ist der Zustand, den der Spielstand verlangt – den richtigen Wert aus eurer Konfiguration einsetzen (z. B. Nacht-Schicht oder dunkle Karte = `true`, Tageskarte = `false`).

## Optional: echter Fortschritt

`zoom.progress(0…1)` aufrufen, z. B. aus `shell.preload()`. Ohne Aufrufe läuft der Zoom von selbst asymptotisch weiter und landet, sobald `ready()` kommt.

## Zeiten

- Mindestflug 1,2 s (`BootZoom.minFlight`), sonst so lang wie das Laden
- Nach `ready()`: Landung ≈ 0,4 s, Enthüllung 1,6 s (Nacht) / 2,6 s (Tag), dann blendet der Boot-Screen über die echte Szene aus
- Reduce Motion: keine Drehung, kein Nachfedern, Lampen blenden nur auf
