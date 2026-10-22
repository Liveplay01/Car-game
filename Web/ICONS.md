# Animierte Icons

Alle Icons der DOM-Oberfläche sind animiert (Leo, 20.10.2026) und liegen in `src/ui/animatedIcons.ts`. Diese Datei beschreibt, wie neue Icons gezeichnet und animiert werden, damit sie zu den vorhandenen passen. Lies zuerst `DESIGN-LANGUAGE.md` (Farbrollen, Motion-Regeln).

## Einbau im Spiel

- `ANIMATED_ICONS` (`ui/animatedIcons.ts`) hält je Icon einen SVG-String; `AnimatedIconId` ist der Schlüsseltyp. Die Markenlogos (TikTok, YouTube, Instagram, CrazyGames, Fandom) bleiben in `ui/icons.ts` und gehen über `icon(paths)`.
- `animatedIcon(id, 'play' | 'loop')` (`ui/dom.ts`) liefert das `<svg>`. Das CSS des Icons kommt einmal in den `<head>`, nicht in jede Kopie; Clip-IDs werden je Kopie umbenannt.
- `playIcon(svg)` startet die Bewegung neu. Tabs spielen ihr Icon, wenn sie gewählt werden (`Shell.syncChrome`); jedes andere Icon in einem Knopf, Link oder `summary` spielt unter Maus (Hover) und Finger (Druck) von selbst (`watchIconMoves`, einmal an der App), nie mitten in einem laufenden Durchgang.
- Geld im Text ist `coinMark(label)` (Klasse `.coin`, `shell.css`).
- Reduce Motion: `.app.reduce-motion .ai *{animation:none!important}` in `shell.css`; die Flammen laufen über SMIL, dort ruft `stillIcons()` `pauseAnimations()` auf.
- Die Canvas-Glyphen in `present/icons.ts` (Münze, Flamme, Pokal) bleiben gezeichnet.
- Ein neues Icon braucht: Eintrag in `ANIMATED_ICONS` (Vorlage unten), Aufruf mit `animatedIcon('<id>')`, Prüfung bei 24 px und 64 px.

## Stil

- **Raster:** `viewBox="0 0 24 24"`, Motiv mit etwa 2 px Rand. Bewegte Teile dürfen über den Rand hinausgehen (`overflow="visible"`).
- **Linien-Icons:** `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`. Formen weich, im Stil von SF Symbols, keine spitzen Ecken.
- **Farbige Icons** nur, wo die Farbe Information trägt, und nur mit Theme-Farben (`present/theme.ts`):
  - Coin: `coin #E3C15A`, Rand `#B8932F`, Prägung `coinInk #785C14`
  - Feuer: `fireOuter #FF7A3D`, `fireCore #FFE08A`, `fireDeep #C2362B`
  - Truhe: `--chest-body / --chest-lid / --chest-band`
  - Sirene: `lightRed #FF3B47`, `lightBlue #4FA3FF`
  - Akzent (Licht, Glühen): `accent #FFB703`
- Keine Fahrzeugfarben als UI-Farbe. Grün gehört dem Spieler (Combo).

## Animationsprinzip

**Das Icon bewegt sich selbst, nicht als Ganzes.** Jedes Icon wird in benannte Teile zerlegt (`<g class="lid">`, `<path class="ck">`), und jeder Teil macht die Bewegung, die das echte Ding machen würde:

| Ding | Bewegung |
| --- | --- |
| Flamme | Pfad morpht zwischen 3 Formen (SMIL `<animate attributeName="d">`), Kern schneller als Hülle, Funken steigen |
| Münze | Glanzstreifen per `clipPath` läuft diagonal über, danach Funkeln (keine Drehung) |
| Lenkrad, Zahnrad, Pfeile | Rotation um die echte Achse, mit Überschwingen |
| Deckel, Hut, Bügel | Rotation um das Scharnier (`transform-origin` an der Kante) |
| Glocke, Schild | Pendeln um den Aufhängepunkt, gedämpft |
| Haken, Wind | Strich zeichnet sich (`pathLength="1"`, `stroke-dasharray:1 1`, `stroke-dashoffset` 1 → 0) |
| Weiches (Tüte, Wolke, Figuren) | Squash & Stretch, `transform-origin` am Boden |

## Technische Regeln

- **Nur `transform`, `opacity`, `stroke-dashoffset`, `fill`** animieren. Für Formänderungen SMIL `d`-Morph (alle Zwischenformen mit identischer Befehlsfolge, nur `C`-Kurven).
- **Drehpunkt:**
  - `transform-box:fill-box` + Prozent-Origin für Teile, die um sich selbst drehen.
  - `transform-box:view-box` + `transform-origin:12px 12px` für eine feste Achse im Raster.
- **Präfixe:** Klasse `ai ai-<id>` am `<svg>`, Keyframes `ai<Id><Teil>`, Clip-IDs `ai<Id>Clip`. Die Styles liegen im SVG und gelten global, deshalb müssen alle Namen eindeutig sein.
- **Auslöser:** `.ai-<id>.play <teil>` und `.ai-<id>.loop <teil>` bekommen die gleiche `animation … both`. `.loop *` setzt `animation-iteration-count:infinite!important`. Das `!important` ist Pflicht, sonst gewinnt der spezifischere Shorthand und die Schleife läuft nur einmal.
- **Ruhezustand ohne Klasse = statisches Icon.** Elemente, die nur während der Animation auftauchen (Glühen, Funken, Münze), stehen im Grundzustand auf `opacity:0` bzw. `scale(0)`.
- **Timing:**
  - Dauer 0,7–2,6 s, die Bewegung liegt in den ersten 60–70 %, der Rest ist Ruhe. So kann dieselbe Keyframe-Folge auch loopen.
  - Easing `cubic-bezier(.23,1,.32,1)` für Federndes, `cubic-bezier(.45,0,.25,1)` für Drehungen.
- **Häufigkeit:** Je häufiger ein Ereignis, desto kürzer die Bewegung (DESIGN-LANGUAGE.md, Motion-Regeln). Dauerschleifen nur für Zustände, die „leben“ (Coin im HUD, Heat). Alles andere läuft einmal pro Ereignis.
- **Reduce Motion:** In jedem SVG `@media (prefers-reduced-motion:reduce){.ai-<id> *{animation:none!important}}`.

## Vorlage

```js
bell: wrap('bell',
  `.ai-bell .b{transform-box:view-box;transform-origin:12px 4px}` +
  on('bell', '.b', 'aiBeB', '1.4s', 'ease-in-out') +
  `@keyframes aiBeB{0%{transform:rotate(0)}10%{transform:rotate(18deg)}24%{transform:rotate(-16deg)}38%{transform:rotate(10deg)}52%{transform:rotate(-5deg)}64%,100%{transform:rotate(0)}}`,
  `<path d="M10 21h4"/><path class="b" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/>`),
```

`wrap(id, css, body)` baut das `<svg>` mit Grundattributen, Loop-Regel und Reduce-Motion-Regel. `on(id, selector, keyframe, dauer, easing, delay)` erzeugt die Regel für `.play` und `.loop`. Beide stehen oben in `animatedIcons.ts`.

## Checkliste für ein neues Icon

1. Statisch zeichnen: 24er-Raster, 1,8er-Strich, `currentColor`. Bei 24 px und bei 64 px prüfen.
2. In Teile zerlegen, die sich wie das echte Ding bewegen. Achse bzw. Scharnier bestimmen.
3. Keyframes schreiben: Bewegung vorne, Ruhe hinten, Endzustand = Grundzustand.
4. Ohne Klasse, mit `play` und mit `loop` testen. Der Loop darf am Übergang nicht springen.
5. Mit Reduce Motion testen: Das Icon muss statisch und vollständig sein.
6. In `ANIMATED_ICONS` eintragen und im Spiel unter Maus und Finger prüfen.

## Zustands-Icons (Wetter, Dunkelheit, Ereignisse, Fehlschläge, Straße)

Diese 27 Icons zeichnet das Spiel auf der Canvas (Museum, Zustands-Chips, Ergebniskarte, Website-SVGs), nicht als DOM. Quelle ist `icon/condition-icons.js` (Entwurf mit SVG und CSS-Keyframes). `node scripts/condition-icons.mjs` macht daraus `src/present/conditionIconData.ts` (nicht von Hand ändern); `present/conditionIcons.ts` zeichnet es über den Pen. Neuer Entwurf = Datei in `icon/` ersetzen, Skript ausführen, `npm test`.
