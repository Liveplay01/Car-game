@echo off
REM Doppelklick auf diese Datei, um das Testfenster zu starten.
REM Erster Start dauert länger (raylib wird kompiliert).

setlocal
set ROOT=%~dp0

echo Starte TestWindow...
echo Ordner: %ROOT%

cd /d "%ROOT%"
swift run -c release TestWindow