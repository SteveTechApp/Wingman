# =====================================================================
# Wingman - Local Development Data Manager Admin Access
#
# Purpose:
# - Allow Data Manager access in local Vite development mode only
# - Preserve production admin/owner permission checks
# - Apply the same DEV bypass to the page gate and sidebar visibility
# - Back up files before editing
# - Run typecheck and build afterwards
#
# Run from:
#   C:\Users\steve\wingman
# =====================================================================

$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$DataManagerPage = Join-Path $Repo "src\wingman2\pages\DataManagerPage.tsx"
$AppShell = Join-Path $Repo "src\wingman2\layout\AppShell.tsx"

function Step($Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

Step "1. Opening Wingman repository"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman Git repository not found at $Repo"
}

git status -sb

Step "2. Checking required files"

foreach ($file in @($DataManagerPage, $AppShell)) {
    if (-not (Test-Path $file)) {
        throw "Required file not found: $file"
    }
}

Write-Host "Required files found." -ForegroundColor Green

Step "3. Creating backups"

Copy-Item `
    -LiteralPath $DataManagerPage `
    -Destination "$DataManagerPage.$Timestamp.bak" `
    -Force

Copy-Item `
    -LiteralPath $AppShell `
    -Destination "$AppShell.$Timestamp.bak" `
    -Force

Write-Host "Backups created:" -ForegroundColor Green
Write-Host "$DataManagerPage.$Timestamp.bak"
Write-Host "$AppShell.$Timestamp.bak"

Step "4. Updating Data Manager page access"

$dataManagerContent = Get-Content -LiteralPath $DataManagerPage -Raw

# Expected existing helper:
#
# const isAdminSession = (session: WingmanWorkspaceSession | null) =>
#   Boolean(
#     session?.permissions?.canManageWorkspace ||
#     [session?.workspaceRole, session?.user?.role].some((role) =>
#       ["admin", "owner"].includes(String(role).toLowerCase())
#     )
#   );

$oldAdminPattern = '(?s)const isAdminSession = \(session: WingmanWorkspaceSession \| null\) =>\s*Boolean\(\s*session\?\.permissions\?\.canManageWorkspace \|\|\s*\[session\?\.workspaceRole, session\?\.user\?\.role\]\.some\(\(role\) =>\s*\["admin", "owner"\]\.includes\(String\(role\)\.toLowerCase\(\)\)\s*\)\s*\);'

$newAdminHelper = @'
const isAdminSession = (session: WingmanWorkspaceSession | null) =>
  import.meta.env.DEV ||
  Boolean(
    session?.permissions?.canManageWorkspace ||
    [session?.workspaceRole, session?.user?.role].some((role) =>
      ["admin", "owner"].includes(String(role).toLowerCase())
    )
  );
'@

if ($dataManagerContent -match 'import\.meta\.env\.DEV') {
    Write-Host "DataManagerPage already contains a DEV access rule. No change required." -ForegroundColor Yellow
}
elseif ($dataManagerContent -match $oldAdminPattern) {

    $dataManagerContent = [regex]::Replace(
        $dataManagerContent,
        $oldAdminPattern,
        $newAdminHelper,
        1
    )

    Set-Content `
        -LiteralPath $DataManagerPage `
        -Value $dataManagerContent `
        -Encoding utf8

    Write-Host "Development-only Data Manager access added." -ForegroundColor Green
}
else {
    throw @"
Could not safely locate the expected isAdminSession helper in:

$DataManagerPage

No blind replacement has been performed.
Restore is not required because this file was not changed.
"@
}

Step "5. Updating sidebar Data Manager visibility"

$appShellContent = Get-Content -LiteralPath $AppShell -Raw

# We only want to affect the variable controlling Data Manager visibility.
# Typical implementation:
#
# const canManageData = ...
#
# Replace its value with:
#
# const canManageData =
#   import.meta.env.DEV ||
#   <existing permission expression>;

if ($appShellContent -match 'const canManageData\s*=\s*import\.meta\.env\.DEV\s*\|\|') {

    Write-Host "AppShell already contains the DEV Data Manager visibility bypass." -ForegroundColor Yellow
}
else {

    $canManagePattern = '(?s)const canManageData\s*=\s*(.*?);'

    $match = [regex]::Match($appShellContent, $canManagePattern)

    if (-not $match.Success) {
        throw @"
Could not safely locate:

const canManageData = ...

inside:
$AppShell

DataManagerPage was updated, but AppShell was not.
Use the backup if you want to revert:
$DataManagerPage.$Timestamp.bak
"@
    }

    $existingExpression = $match.Groups[1].Value.Trim()

    $replacement = @"
const canManageData =
  import.meta.env.DEV ||
  $existingExpression;
"@

    $appShellContent = [regex]::Replace(
        $appShellContent,
        $canManagePattern,
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($m)
            return $replacement
        },
        1
    )

    Set-Content `
        -LiteralPath $AppShell `
        -Value $appShellContent `
        -Encoding utf8

    Write-Host "Development-only sidebar visibility added." -ForegroundColor Green
}

Step "6. Showing relevant changes"

git diff -- `
    src/wingman2/pages/DataManagerPage.tsx `
    src/wingman2/layout/AppShell.tsx

Step "7. Running TypeScript validation"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TYPECHECK FAILED." -ForegroundColor Red
    Write-Host "Backups are available at:" -ForegroundColor Yellow
    Write-Host "$DataManagerPage.$Timestamp.bak"
    Write-Host "$AppShell.$Timestamp.bak"
    exit $LASTEXITCODE
}

Step "8. Running production build"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED." -ForegroundColor Red
    Write-Host "Backups are available at:" -ForegroundColor Yellow
    Write-Host "$DataManagerPage.$Timestamp.bak"
    Write-Host "$AppShell.$Timestamp.bak"
    exit $LASTEXITCODE
}

Step "9. Finished"

git status -sb

Write-Host ""
Write-Host "Local Data Manager development access is now enabled." -ForegroundColor Green
Write-Host ""
Write-Host "Production access remains governed by the existing admin/owner checks."
Write-Host ""
Write-Host "Start Wingman with:"
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open:"
Write-Host "  http://127.0.0.1:3000/wingman/admin/data-manager" -ForegroundColor Cyan
Write-Host ""
Write-Host "Do not commit until you have tested the Data Manager page."