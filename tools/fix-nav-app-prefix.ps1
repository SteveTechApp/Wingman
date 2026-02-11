Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Set-Location .. | Out-Null

$targets = @(
  "src/app/navigation/CategoryMenu.tsx",
  "src/app/navigation/SideNav.tsx",
  "src/app/navigation/TopBar.tsx"
)

function Backup-File($path) {
  if (!(Test-Path $path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

foreach ($f in $targets) {
  if (!(Test-Path $f)) { Write-Host "Skip (not found): $f"; continue }
  Backup-File $f
  $txt = Get-Content $f -Raw

  # Replace "/app/<route>" -> "/<route>"
  $txt2 = $txt `
    -replace '"/app/dashboard"', '"/dashboard"' `
    -replace '"/app/projects"', '"/projects"' `
    -replace '"/app/import"', '"/import"' `
    -replace '"/app/toolhub"', '"/toolhub"' `
    -replace '"/app/competitor-compare"', '"/competitor-compare"'

  if ($txt2 -ne $txt) {
    [System.IO.File]::WriteAllText((Resolve-Path $f), $txt2, [System.Text.UTF8Encoding]::new($false))
    Write-Host "✔ Updated: $f"
  } else {
    Write-Host "No changes: $f"
  }
}

Write-Host "`nNow run: npm run dev  (and click through the nav)"
