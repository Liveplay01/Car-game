# Copies the game's assets into the iPad app (App.swiftpm must be self-contained on the iPad).
# Run after SoundMaker or after changing a haptic pattern:
#   powershell -File sync-app-assets.ps1
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($folder in @("Sounds", "Haptics", "Music")) {
    $from = Join-Path $root "Assets\$folder"
    $to = Join-Path $root "App.swiftpm\Resources\$folder"
    if (-not (Test-Path $from)) { Write-Host "missing: $from (Music: cd TestWindow; swift run SoundMaker)"; continue }
    New-Item -ItemType Directory -Force $to | Out-Null
    Remove-Item (Join-Path $to "*") -Force -ErrorAction SilentlyContinue
    Copy-Item (Join-Path $from "*") $to
    Write-Host ("{0}: {1} files" -f $folder, (Get-ChildItem $to).Count)
}
