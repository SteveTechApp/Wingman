# Wingman - Stabilise for Production (System32-safe)
# Fixes common TS/TSX corruption patterns (""quotes"", literal \n insertions) + missing CSS import.
# Save to: C:\Users\steve\wingman\tools\wingman-stabilise-production.ps1
# Run: pwsh -NoProfile -ExecutionPolicy Bypass -File tools\wingman-stabilise-production.ps1

$ErrorActionPreference = "Stop"

# --- System32-safe root ---
$Root = "C:\Users\steve\wingman"
if (!(Test-Path (Join-Path $Root "package.json"))) { throw "Wingman root not found: $Root" }
Set-Location $Root

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $Root ("_STABILISE_BACKUP\" + $Stamp)
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File([string]$Path) {
  if (!(Test-Path $Path)) { return }
  $rel = $Path.Substring($Root.Length).TrimStart('\','/')
  $dest = Join-Path $BackupDir $rel
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item -Force $Path $dest
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Patch-TextFile([string]$Path, [scriptblock]$PatchFn) {
  if (!(Test-Path $Path)) { return $false }
  $txt = Get-Content $Path -Raw
  $new = & $PatchFn $txt
  if ($new -ne $txt) {
    Backup-File $Path
    Write-Utf8NoBom $Path $new
    return $true
  }
  return $false
}

Write-Host "Wingman Stabilise - $Stamp" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Backup: $BackupDir"
Write-Host ""

# ------------------------------------------------------------
# 1) Fix AppRoutes.tsx specific corruption (""quotes"" + literal \n + bad injected sequences)
# ------------------------------------------------------------
$AppRoutes = Join-Path $Root "src\AppRoutes.tsx"
$didRoutes = Patch-TextFile $AppRoutes {
  param($t)

  # Fix ""react"" style imports
  $t = [regex]::Replace($t, '(from\s+)""([^""]+)""', '$1"$2"')
  $t = [regex]::Replace($t, 'import\(\s*""([^""]+)""\s*\)', 'import("$1")')

  # Fix JSX attributes like path=""x"" to path="x"
  $t = [regex]::Replace($t, '=""([^""]*)""', '="$1"')

  # Fix any remaining doubled quotes that look like string literals ""something""
  $t = [regex]::Replace($t, '""([^""]+)""', '"$1"')

  # Convert literal "\nconst" sequences into actual newlines (this is what broke your build log)
  $t = $t -replace '\\n\s*(const\s+)', "`r`n`$1"

  # Remove accidental "/app/app/" duplication if present in Navigate targets (best-effort)
  $t = $t -replace 'to="/app/app/', 'to="/app/'
  $t = $t -replace 'path="/app/app/', 'path="/app/'

  return $t
}
Write-Host ("AppRoutes patched: " + $didRoutes)

# ------------------------------------------------------------
# 2) Repo-wide repair: fix ""quotes"" corruption in src/**/*.ts,tsx
#    (imports + JSX attributes; conservative patterns)
# ------------------------------------------------------------
$files = Get-ChildItem (Join-Path $Root "src") -Recurse -File -Include *.ts,*.tsx

$patchedCount = 0
foreach ($f in $files) {
  $p = $f.FullName
  $changed = Patch-TextFile $p {
    param($t)

    # Fix import lines: from ""@/x"" -> from "@/x"
    $t2 = [regex]::Replace($t, '(from\s+)""([^""]+)""', '$1"$2"')

    # Fix dynamic imports: import(""@/x"") -> import("@/x")
    $t2 = [regex]::Replace($t2, 'import\(\s*""([^""]+)""\s*\)', 'import("$1")')

    # Fix JSX/string attributes: href=""x"" / to=""x"" / className=""x"" etc -> ="x"
    $t2 = [regex]::Replace($t2, '=""([^""]*)""', '="$1"')

    # Fix the most common accidental doubled string literals ""text"" -> "text"
    # (conservative: only when the interior has no quotes)
    $t2 = [regex]::Replace($t2, '""([^""]+)""', '"$1"')

    return $t2
  }
  if ($changed) { $patchedCount++ }
}
Write-Host ("Patched TS/TSX files: " + $patchedCount)

# ------------------------------------------------------------
# 3) Fix missing CSS import ./styles/components.css (Vite build failure)
#    Option A: create the file so the import resolves.
# ------------------------------------------------------------
$componentsCss = Join-Path $Root "src\styles\components.css"
if (!(Test-Path $componentsCss)) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $componentsCss) | Out-Null
  Write-Utf8NoBom $componentsCss @"
/* Wingman components.css
   Exists to satisfy legacy import paths during stabilisation.
   You can later consolidate into globals.css / wingman-ui.css.
*/
"@
  Write-Host "Created: src/styles/components.css"
}

# Option B (also helpful): remove the bad import if it points somewhere else
# If your main.tsx imports a non-existent relative path, fix it to a valid one.
$MainTsx = Join-Path $Root "src\main.tsx"
$didMain = Patch-TextFile $MainTsx {
  param($t)

  # If it imports "./styles/components.css" but pathing differs, keep it valid:
  # - ensure it's exactly ./styles/components.css if present
  $t2 = $t

  # Normalise doubled quotes if present
  $t2 = [regex]::Replace($t2, '(from\s+)""([^""]+)""', '$1"$2"')
  $t2 = [regex]::Replace($t2, '""([^""]+)""', '"$1"')

  # If someone wrote import "./styles/components.css"; with broken quoting, normalise it
  $t2 = $t2 -replace 'import\s+["'']\./styles/components\.css["'']\s*;', 'import "./styles/components.css";'

  return $t2
}
Write-Host ("main.tsx patched: " + $didMain)

# ------------------------------------------------------------
# 4) Quick safety: ensure you’re not building from System32 by mistake
# ------------------------------------------------------------
if ((Get-Location).Path -ne $Root) {
  throw "Safety check failed: current path is not Root. Current: $((Get-Location).Path)"
}

# ------------------------------------------------------------
# 5) Install + typecheck + build
# ------------------------------------------------------------
Write-Host ""
Write-Host "== npm ci ==" -ForegroundColor Cyan
npm ci

Write-Host ""
Write-Host "== typecheck ==" -ForegroundColor Cyan
npm run typecheck

Write-Host ""
Write-Host "== build ==" -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "DONE. Backup: $BackupDir" -ForegroundColor Green
