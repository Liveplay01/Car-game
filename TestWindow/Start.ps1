# Car Game - TestWindow starten
# Doppelklick auf diese Datei im Explorer, um das Testfenster zu starten.
# Oder: cd TestWindow; .\Start.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$testWindowRoot = $projectRoot  # TestWindow ist bereits die Wurzel

Write-Host "Starte TestWindow..." -ForegroundColor Cyan
Write-Host "Ordner: $testWindowRoot" -ForegroundColor DarkGray

# Erster Start dauert länger (raylib wird kompiliert)
& swift run -c release TestWindow