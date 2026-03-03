$ErrorActionPreference = "Stop"
$Root = "C:\Users\steve\wingman"
Set-Location $Root

function Write-Utf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Backup-File([string]$path) {
  if (!(Test-Path $path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item $path "$path.bak_$stamp" -Force
}

# 1) Fix bad nav route in ProjectOverviewPage.tsx
$page = "$Root\src\pages\ProjectOverviewPage.tsx"
if (!(Test-Path $page)) { throw "Not found: $page" }

Backup-File $page
$txt = Get-Content $page -Raw -Encoding UTF8
$txt2 = $txt.Replace('nav("/app/app/projects")','nav("/app/projects")')

if ($txt2 -ne $txt) {
  Write-Utf8NoBom $page $txt2
  Write-Host "✔ Fixed nav route in ProjectOverviewPage.tsx"
} else {
  Write-Host "ℹ No nav('/app/app/projects') found (maybe already fixed)."
}

# 2) Create shim for src/state/app/projectsStore.ts expected by other imports
$shimPath = "$Root\src\state\app\projectsStore.ts"
if (Test-Path $shimPath) {
  Write-Host "ℹ Shim already exists: $shimPath"
} else {
  $shim = @"
export * from "@/state/projectsStore";
export { default } from "@/state/projectsStore";
"@
  Write-Utf8NoBom $shimPath $shim
  Write-Host "✔ Created shim: src/state/app/projectsStore.ts -> re-export from @/state/projectsStore"
}

Write-Host ""
Write-Host "Next:"
Write-Host "  npm run build"
