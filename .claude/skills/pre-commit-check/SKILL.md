---
name: pre-commit-check
description: Vor jedem Commit: Tests und Build grün prüfen (Web, Server bei Änderungen).
disable-model-invocation: true
---

Ausführen, Fehler melden, nichts reparieren ohne Auftrag:

1. `cd Web; npm test; npm run build`
2. Wenn `Server/` geändert: `cd Server; npm test; npm run typecheck`
3. Ergebnis je Schritt in einer Zeile: grün oder Fehler mit exakter Meldung.
