<#
.SYNOPSIS
  Installs the Wingman redesign theme CSS into the local Wingman repository.

.DESCRIPTION
  - Backs up src/main.tsx and any existing wingman-redesign-theme.css
  - Writes src/wingman2/styles/wingman-redesign-theme.css from the embedded CSS payload
  - Ensures src/main.tsx imports the redesign CSS immediately after wingman-style-stack.css
  - Runs npm validation: npm run verify if available, otherwise typecheck + build if available

.USAGE
  Run from the Wingman repo root:
    powershell -ExecutionPolicy Bypass -File .\install-wingman-redesign-theme.ps1

  Optional commit after validation:
    powershell -ExecutionPolicy Bypass -File .\install-wingman-redesign-theme.ps1 -Commit -Push
#>

param(
  [switch]$SkipValidation,
  [switch]$Commit,
  [switch]$Push
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Warn([string]$Message) {
  Write-Host "WARNING: $Message" -ForegroundColor Yellow
}

function Fail([string]$Message) {
  throw $Message
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Get-PackageScripts([string]$PackageJsonPath) {
  if (!(Test-Path $PackageJsonPath)) { return @() }
  $Package = Get-Content -Raw -Path $PackageJsonPath | ConvertFrom-Json
  if ($null -eq $Package.scripts) { return @() }
  return @($Package.scripts.PSObject.Properties.Name)
}

$Root = (Get-Location).Path
$PackageJson = Join-Path $Root "package.json"
$MainPath = Join-Path $Root "src\main.tsx"
$StylesDir = Join-Path $Root "src\wingman2\styles"
$BaseCssPath = Join-Path $StylesDir "wingman-style-stack.css"
$ThemeCssPath = Join-Path $StylesDir "wingman-redesign-theme.css"

Step "Checking Wingman repo"
if (!(Test-Path $PackageJson)) { Fail "package.json not found. Run this from the Wingman repo root, for example: C:\Users\steve\wingman" }
if (!(Test-Path $MainPath)) { Fail "src\main.tsx not found. Run this from the Wingman repo root." }
if (!(Test-Path $StylesDir)) { Fail "src\wingman2\styles not found. The expected Wingman style folder is missing." }
if (!(Test-Path $BaseCssPath)) { Warn "src\wingman2\styles\wingman-style-stack.css was not found. The installer will still add the redesign import, but check src/main.tsx manually afterwards." }

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "_wingman_backup_redesign_install_$Timestamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Step "Backing up current files"
Copy-Item -Path $MainPath -Destination (Join-Path $BackupDir "main.tsx") -Force
if (Test-Path $ThemeCssPath) {
  Copy-Item -Path $ThemeCssPath -Destination (Join-Path $BackupDir "wingman-redesign-theme.css") -Force
}
Write-Host "Backup folder: $BackupDir"

Step "Writing redesign CSS"
$Payload = @'
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
'@
$Payload = ($Payload -replace "\s", "")
$CompressedBytes = [Convert]::FromBase64String($Payload)
$InputStream = New-Object System.IO.MemoryStream(,$CompressedBytes)
$GzipStream = New-Object System.IO.Compression.GZipStream($InputStream, [System.IO.Compression.CompressionMode]::Decompress)
$OutputStream = New-Object System.IO.MemoryStream
$GzipStream.CopyTo($OutputStream)
$GzipStream.Dispose()
$InputStream.Dispose()
$CssText = [System.Text.Encoding]::UTF8.GetString($OutputStream.ToArray())
$OutputStream.Dispose()
Write-Utf8NoBom -Path $ThemeCssPath -Text $CssText
Write-Host "Wrote: $ThemeCssPath"

Step "Wiring CSS import in src/main.tsx"
$Main = [System.IO.File]::ReadAllText($MainPath)
$Newline = if ($Main -match "`r`n") { "`r`n" } else { "`n" }
$ThemeImport = 'import "./wingman2/styles/wingman-redesign-theme.css";'
$StackImportPattern = '(?m)^\s*import\s+["'']\.\/wingman2\/styles\/wingman-style-stack\.css["''];?\s*$'
$ThemeImportPattern = '(?m)^\s*import\s+["'']\.\/wingman2\/styles\/wingman-redesign-theme\.css["''];?\s*\r?\n?'

# Remove any existing redesign import first so the operation is repeatable.
$Main = [regex]::Replace($Main, $ThemeImportPattern, '')

if ([regex]::IsMatch($Main, $StackImportPattern)) {
  $Main = [regex]::Replace($Main, $StackImportPattern, { param($m) $m.Value.TrimEnd() + $Newline + $ThemeImport }, 1)
} else {
  Warn "Could not find the wingman-style-stack.css import. Adding both CSS imports near the top of src/main.tsx."
  $StackImport = 'import "./wingman2/styles/wingman-style-stack.css";'
  $Main = $StackImport + $Newline + $ThemeImport + $Newline + $Main
}

Write-Utf8NoBom -Path $MainPath -Text $Main
Write-Host "Updated: $MainPath"

Step "Checking installed import"
$CheckMain = Get-Content -Raw -Path $MainPath
if ($CheckMain -notmatch [regex]::Escape($ThemeImport)) {
  Fail "Install failed: redesign CSS import not found in src/main.tsx. Backup is in $BackupDir"
}

$ImportOrderCheck = $CheckMain -replace "`r`n", "`n"
$ExpectedOrder = 'import "./wingman2/styles/wingman-style-stack.css";' + "`n" + $ThemeImport
if ($ImportOrderCheck -notlike "*$ExpectedOrder*") {
  Warn "The redesign import is present, but not immediately after wingman-style-stack.css. Review src/main.tsx import order."
} else {
  Write-Host "Import order OK: redesign CSS loads after wingman-style-stack.css"
}

Step "Git status before validation"
git status --short

if (!$SkipValidation) {
  Step "Running validation"
  $Scripts = Get-PackageScripts -PackageJsonPath $PackageJson

  if ($Scripts -contains "verify") {
    npm run verify
  } else {
    if ($Scripts -contains "typecheck") { npm run typecheck } else { Warn "No npm run typecheck script found." }
    if ($Scripts -contains "build") { npm run build } else { Warn "No npm run build script found." }
  }
}

Step "Installed files"
Write-Host "CSS:  src\wingman2\styles\wingman-redesign-theme.css"
Write-Host "Main: src\main.tsx"
Write-Host "Backup: $BackupDir"

Step "Git diff summary"
git diff --stat

git status --short

if ($Commit) {
  Step "Committing changes"
  git add src/main.tsx src/wingman2/styles/wingman-redesign-theme.css
  git commit -m "Install Wingman redesign theme"

  if ($Push) {
    Step "Pushing current branch"
    $Branch = (git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($Branch)) { Fail "Could not determine current branch for push." }
    git push origin $Branch
  }
} else {
  Write-Host "`nNot committed. To commit after reviewing:" -ForegroundColor Yellow
  Write-Host "  git add src/main.tsx src/wingman2/styles/wingman-redesign-theme.css"
  Write-Host "  git commit -m \"Install Wingman redesign theme\""
  Write-Host "  git push origin (git branch --show-current)"
}

Write-Host "`nDone." -ForegroundColor Green
