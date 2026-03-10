# PowerShell (Windows): Apply Mechanicus patches over original OpenClaw
param(
    [string]$OpenClawDir = "openclaw",  # Path to local original OpenClaw repo
    [switch]$FreshBase  # Reset to official/main first
)

$PatchDir = "patches"
$OfficialRemote = "https://github.com/openclaw/openclaw.git"

if (!(Test-Path $OpenClawDir)) {
    Write-Host "Cloning original OpenClaw to $OpenClawDir..." -ForegroundColor Green
    git clone $OfficialRemote $OpenClawDir
}

Push-Location $OpenClawDir

if ($FreshBase) {
    Write-Host "Resetting to official/main (overwrites local changes)..." -ForegroundColor Yellow
    git remote add official $OfficialRemote 2>$null
    git fetch official
    git checkout main
    git reset --hard official/main
}

Write-Host "Applying Mechanicus patches..." -ForegroundColor Green
git am ..\$PatchDir\*.patch
if ($LASTEXITCODE -ne 0) {
    Write-Host "Conflicts! Resolve: edit files, git add ., git am --continue" -ForegroundColor Red
    Pop-Location
    pause
    exit 1
}

Write-Host "Installing deps..." -ForegroundColor Green
pnpm install

Write-Host "Done! Mechanicus ready. Run: pnpm openclaw" -ForegroundColor Green
Pop-Location
pause