@echo off
rem Startet das Testfenster: baut erst den aktuellen Stand (schnell, wenn nichts geaendert
rem wurde), dann oeffnet es das Spiel. Die Desktop-Verknuepfung "Car Game" zeigt hierher.
rem Startparameter werden durchgereicht, z. B.: "Spiel starten.cmd" --level 10
title Car Game
cd /d "%~dp0TestWindow"
tasklist /fi "imagename eq TestWindow.exe" | find /i "TestWindow.exe" >nul && (
    echo Das Spiel laeuft schon - schliess es, damit der neue Stand gebaut werden kann.
    timeout /t 4 >nul
    exit /b 0
)
echo Baue das Spiel ...
swift build -c release --product TestWindow >build.log 2>&1
if errorlevel 1 (
    type build.log
    echo.
    echo Der Build ist fehlgeschlagen. Details stehen oben und in TestWindow\build.log.
    pause
    exit /b 1
)
del build.log
start "" ".build\out\Products\Release-windows-x86_64\TestWindow.exe" %*
