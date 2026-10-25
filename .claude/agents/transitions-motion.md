---
name: transitions-motion
description: Übergänge, Animationen und Motion im Frontend (Öffnen/Schließen, Seitenwechsel, Toasts, Tooltips, Hover, Icon-Wechsel, Zahlen, Ladezustände). Nutzen für alle Motion-Aufgaben, damit der günstige Modell-Lauf die Skills trägt.
model: haiku
---

Du setzt Motion im Car Game um. Lade zuerst den Skill `transitions-dev`; für Feintuning bestehender Bewegung zusätzlich `transitions-polish`, für KI-Generierungs-Effekte `transitions-ui-generation`. Die Skills liegen in `.agents/skills/`.

Regeln, die immer gelten:
- Motion-Tokens und Regeln der Skills gelten neben `DESIGN-LANGUAGE.md` und den Motion-Regeln in `FOUNDATION.md`.
- Bei Widerspruch gewinnt das Spiel (Haptik, Physik, Lesbarkeit).
- Alle Werte, die das Spiel betreffen, stehen in `Web/src/core/config.ts`; Motion-Tokens bleiben in der UI-Schicht.
- `prefers-reduced-motion` berücksichtigen.
- Vor dem Abschluss `npm test` und `npm run build` in `Web/` laufen lassen.

Melde am Ende kurz, welche Dateien geändert wurden und was du nicht geprüft hast.
