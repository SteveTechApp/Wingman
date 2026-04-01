Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location).Path $Path }
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Ensure-Dir {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

Set-Location C:\Users\steve\wingman

$root = (Get-Location).Path
$scriptsDir = Join-Path $root "scripts"
$hooksDir = Join-Path $root ".githooks"
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$workDir = Join-Path $root "_WORK"
$packagePath = Join-Path $root "package.json"

foreach ($dir in @($scriptsDir, $hooksDir, $auditDir, $rescueDir, $workDir)) {
  Ensure-Dir -Path $dir
}

if (-not (Test-Path $packagePath)) {
  throw "package.json not found at $packagePath"
}

$repoHealth = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)
  Write-Host "FAIL: $Message" -ForegroundColor Red
  $script:HasFailure = $true
}

function Pass {
  param([string]$Message)
  Write-Host "OK: $Message" -ForegroundColor Green
}

$script:HasFailure = $false
$root = (Get-Location).Path

Write-Section "Git status"
git status --short

Write-Section "Typecheck"
npm run typecheck
if ($LASTEXITCODE -ne 0) {
  Fail "Typecheck failed"
} else {
  Pass "Typecheck passed"
}

Write-Section "Build"
npm run build
if ($LASTEXITCODE -ne 0) {
  Fail "Build failed"
} else {
  Pass "Build passed"
}

Write-Section "Route check"
$pkgPath = Join-Path $root "package.json"
$pkgText = Get-Content $pkgPath -Raw
if ($pkgText -match '"check:routes"\s*:') {
  npm run check:routes
  if ($LASTEXITCODE -ne 0) {
    Fail "Route check failed"
  } else {
    Pass "Route check passed"
  }
} else {
  Pass "Route check script not present, skipped"
}

Write-Section "Nested duplicate project check"
$nestedPackage = Join-Path $root "wingman\package.json"
if (Test-Path $nestedPackage) {
  Fail "Nested duplicate app detected at wingman\package.json"
} else {
  Pass "No nested duplicate app detected"
}

Write-Section "Result"
if ($script:HasFailure) {
  Write-Host "Repo health check completed with failures." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Repo health check passed." -ForegroundColor Green
  exit 0
}
'@
Save-Utf8NoBom -Path (Join-Path $scriptsDir "repo-health.ps1") -Content $repoHealth

$safeEdit = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][string]$SourcePath,
  [switch]$SkipBuild,
  [switch]$SkipTypecheck,
  [switch]$SkipRouteCheck
)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location).Path $Path }
  $dir = Split-Path $fullPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Get-Stamp { Get-Date -Format "yyyyMMdd-HHmmss" }

$root = (Get-Location).Path
$targetFull = Join-Path $root $TargetPath
$sourceFull = Join-Path $root $SourcePath
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$stamp = Get-Stamp
$leaf = Split-Path $targetFull -Leaf
$logPath = Join-Path $auditDir ("safe-edit-{0}-{1}.log" -f $stamp, $leaf)
$backupPath = Join-Path $rescueDir ("{0}.{1}.bak" -f $leaf, $stamp)

if (-not (Test-Path $targetFull)) { throw "Target file not found: $targetFull" }
if (-not (Test-Path $sourceFull)) { throw "Source file not found: $sourceFull" }

Copy-Item -Force $targetFull $backupPath
Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup created: $backupPath"

$newContent = Get-Content $sourceFull -Raw
Save-Utf8NoBom -Path $targetFull -Content $newContent

try {
  if (-not $SkipTypecheck) {
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
  }

  if (-not $SkipBuild) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
  }

  if (-not $SkipRouteCheck) {
    $pkgText = Get-Content (Join-Path $root "package.json") -Raw
    if ($pkgText -match '"check:routes"\s*:') {
      npm run check:routes
      if ($LASTEXITCODE -ne 0) { throw "Route check failed" }
    }
  }

  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] SAFE EDIT PASSED"
  Write-Host "Safe edit passed." -ForegroundColor Green
}
catch {
  Copy-Item -Force $backupPath $targetFull
  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ROLLBACK: $($_.Exception.Message)"
  Write-Host "Safe edit rolled back." -ForegroundColor Yellow
  throw
}
'@
Save-Utf8NoBom -Path (Join-Path $scriptsDir "safe-edit.ps1") -Content $safeEdit

$safeReplace = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][string]$Pattern,
  [Parameter(Mandatory = $true)][string]$Replacement,
  [switch]$Regex,
  [switch]$Multiple,
  [switch]$SkipBuild,
  [switch]$SkipTypecheck,
  [switch]$SkipRouteCheck
)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location).Path $Path }
  $dir = Split-Path $fullPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

function Get-Stamp { Get-Date -Format "yyyyMMdd-HHmmss" }

$root = (Get-Location).Path
$targetFull = Join-Path $root $TargetPath
$auditDir = Join-Path $root "_AUDITS"
$rescueDir = Join-Path $root "_RESCUE"
$stamp = Get-Stamp
$leaf = Split-Path $targetFull -Leaf
$logPath = Join-Path $auditDir ("safe-replace-{0}-{1}.log" -f $stamp, $leaf)
$backupPath = Join-Path $rescueDir ("{0}.{1}.bak" -f $leaf, $stamp)

if (-not (Test-Path $targetFull)) { throw "Target file not found: $targetFull" }

$original = Get-Content $targetFull -Raw
Copy-Item -Force $targetFull $backupPath

if ($Regex) {
  if ($Multiple) {
    $updated = [regex]::Replace($original, $Pattern, $Replacement)
  } else {
    $updated = [regex]::Replace($original, $Pattern, $Replacement, 1)
  }
} else {
  if ($Multiple) {
    $updated = $original.Replace($Pattern, $Replacement)
  } else {
    $index = $original.IndexOf($Pattern)
    if ($index -lt 0) { throw "Pattern not found." }
    $updated = $original.Substring(0, $index) + $Replacement + $original.Substring($index + $Pattern.Length)
  }
}

if ($updated -eq $original) {
  throw "No change was made."
}

Save-Utf8NoBom -Path $targetFull -Content $updated

try {
  if (-not $SkipTypecheck) {
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed" }
  }

  if (-not $SkipBuild) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
  }

  if (-not $SkipRouteCheck) {
    $pkgText = Get-Content (Join-Path $root "package.json") -Raw
    if ($pkgText -match '"check:routes"\s*:') {
      npm run check:routes
      if ($LASTEXITCODE -ne 0) { throw "Route check failed" }
    }
  }

  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] SAFE REPLACE PASSED"
  Write-Host "Safe replace passed." -ForegroundColor Green
}
catch {
  Copy-Item -Force $backupPath $targetFull
  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ROLLBACK: $($_.Exception.Message)"
  Write-Host "Safe replace rolled back." -ForegroundColor Yellow
  throw
}
'@
Save-Utf8NoBom -Path (Join-Path $scriptsDir "safe-replace.ps1") -Content $safeReplace

$preCommit = @'
#!/usr/bin/env sh
echo "Wingman pre-commit..."

npm run precommit:check
if [ $? -ne 0 ]; then
  echo "Commit blocked (typecheck/build failed)"
  exit 1
fi

npm run repo:health
if [ $? -ne 0 ]; then
  echo "Commit blocked (repo health failed)"
  exit 1
fi

echo "All checks passed."
exit 0
'@
Save-Utf8NoBom -Path (Join-Path $hooksDir "pre-commit") -Content $preCommit

$content = @'
{
  "name": "wyrestorm-wingman",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.typecheck.json --noEmit",
    "check:routes": "node tools/route-smoke-check.mjs",
    "verify": "npm run typecheck && npm run build && npm run check:routes",
    "repo:health": "powershell -ExecutionPolicy Bypass -File ./scripts/repo-health.ps1",
    "precommit:check": "npm run typecheck && npm run build",
    "safe:install": "powershell -ExecutionPolicy Bypass -File ./scripts/install-wingman-hardening.ps1",
    "safe:verify": "npm run typecheck && npm run build && npm run check:routes"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "lucide-react": "^0.511.0",
    "mammoth": "^1.12.0",
    "pdfjs-dist": "^4.10.38",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vite": "^8.0.3"
  }
}
'@
Save-Utf8NoBom -Path $packagePath -Content $content

git config core.hooksPath .githooks

Write-Host ""
Write-Host "Wingman hardening installed successfully." -ForegroundColor Green
Write-Host "Next:"
Write-Host "  npm run"
Write-Host "  npm run repo:health"