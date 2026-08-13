# =====================================================================
# Wingman - Unblock Data Manager Data in LOCAL DEVELOPMENT only
#
# Purpose:
#   Allow the Admin Data Manager to read/write governed product data
#   when running Wingman locally.
#
# Safety:
#   - Production authentication MUST remain unchanged
#   - Bypass applies only to Data Manager/product-intelligence endpoints
#   - Does not switch branches
#   - Does not commit or push
#   - Creates backups
#   - Runs typecheck/tests/build afterwards
# =====================================================================

$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Step($Message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

# ---------------------------------------------------------------------
# 1. OPEN REPOSITORY
# ---------------------------------------------------------------------

Step "1. Opening Wingman repository"

Set-Location $Repo

if (-not (Test-Path ".git")) {
    throw "Wingman Git repository not found at $Repo"
}

git status -sb

Write-Host ""
Write-Host "Current branch:" -ForegroundColor Cyan
git branch --show-current

# ---------------------------------------------------------------------
# 2. CHECK CODEX
# ---------------------------------------------------------------------

Step "2. Checking Codex CLI"

$codex = Get-Command codex -ErrorAction SilentlyContinue

if (-not $codex) {
    throw @"
Codex CLI is not available in this PowerShell session.

Install/check it with:

npm install -g @openai/codex@latest
codex --version
"@
}

codex --version

# ---------------------------------------------------------------------
# 3. FIND RELEVANT SERVER FILES
# ---------------------------------------------------------------------

Step "3. Locating Data Manager authentication code"

Write-Host "Searching for authentication and product-intelligence endpoints..."

$searchResults = Get-ChildItem `
    -Path $Repo `
    -Recurse `
    -File `
    -Include *.mjs,*.js,*.ts,*.tsx `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\build\\"
    } |
    Select-String `
        -Pattern "Authentication required|product-intelligence|canManageWorkspace|admin/data-manager" `
        -ErrorAction SilentlyContinue

$searchResults |
    Select-Object Path, LineNumber, Line |
    Format-Table -AutoSize

# ---------------------------------------------------------------------
# 4. BACK UP LIKELY SERVER FILE
# ---------------------------------------------------------------------

Step "4. Creating backup"

$ProductStore = Join-Path $Repo "server\product-intelligence-store.mjs"

if (Test-Path $ProductStore) {

    $backup = "$ProductStore.$Timestamp.bak"

    Copy-Item `
        -LiteralPath $ProductStore `
        -Destination $backup `
        -Force

    Write-Host "Backup created:" -ForegroundColor Green
    Write-Host $backup
}
else {
    Write-Host "product-intelligence-store.mjs not found; Codex will inspect the actual server implementation." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
# 5. CREATE FOCUSED IMPLEMENTATION BRIEF
# ---------------------------------------------------------------------

Step "5. Preparing local-development authentication fix"

$BriefDir = Join-Path $Repo ".wingman-work"
$BriefFile = Join-Path $BriefDir "local-data-manager-api-unblock.md"

New-Item -ItemType Directory -Force -Path $BriefDir | Out-Null

$brief = @'
# Wingman Local Data Manager API Authentication Fix

The Admin Data Manager UI is now accessible in local development.

Current visible problem:

- Data Manager loads
- It displays "0 records"
- It displays "Authentication required."

The front-end development-only admin bypass already works.

The remaining problem is backend/API authentication.

## Objective

Allow the Data Manager product-intelligence API to read and write records
while running LOCAL DEVELOPMENT ONLY.

Production authentication and authorisation must remain unchanged.

## Inspect first

Identify:

1. Which endpoint DataManagerPage uses to load product data.
2. Which endpoint saves product changes.
3. Where "Authentication required." is generated.
4. How server/product-intelligence-store.mjs is mounted.
5. Existing request authentication/session middleware.
6. How NODE_ENV / development mode is currently detected by the server.

Do not guess endpoint names.

## Required implementation

Create a narrowly-scoped development bypass.

Conceptually:

const isDevelopment =
  process.env.NODE_ENV !== "production";

const allowLocalDataManager =
  isDevelopment &&
  request is for the governed Data Manager/product-intelligence
  administration endpoints;

Then:

if (!allowLocalDataManager) {
   preserve the existing authentication/admin checks exactly;
}

## Critical safety requirements

DO NOT:

- disable authentication globally;
- bypass authentication for Projects;
- bypass authentication for Documents;
- bypass normal user APIs;
- bypass authentication in production;
- remove existing admin permission checks;
- hard-code a user email;
- hard-code an admin password;
- expose a public unauthenticated production write endpoint;
- change unrelated authentication/session behaviour.

The bypass must only apply to the Data Manager/product-intelligence
maintenance API during development.

## Local request identity

If the endpoint requires an actor/user object for audit fields,
supply a clearly labelled DEVELOPMENT identity only when running locally,
for example:

{
  id: "local-development-admin",
  name: "Local Development Admin",
  role: "admin"
}

Do not use that identity in production.

## Data source

The page must load the SAME governed product intelligence source already
used by Wingman.

Do not create sample products merely to make the screen populate.

Do not create a second product database.

The Data Manager must expose the existing product records.

## Persistence

Existing save/update operations must continue to use the current
product-intelligence persistence layer.

Do not replace persistence with browser localStorage.

## Expected result

When running:

npm run dev

and opening:

/wingman/admin/data-manager

the page should load the actual existing Wingman product records rather
than:

0 records
Authentication required.

Editing/saving a product locally should use the existing governed
product persistence mechanism.

## Tests

Add or update tests proving:

1. development Data Manager API access succeeds;
2. production unauthenticated Data Manager access is rejected;
3. unrelated unauthenticated API endpoints remain protected;
4. existing authenticated behaviour still works.

## Validation

Run:

npm run typecheck
npm test
npm run build

If npm run verify exists, run it too.

Fix any errors introduced by this pass.

## Restrictions

Do not:
- switch branches;
- commit;
- push;
- modify .git;
- redesign DataManagerPage;
- make unrelated UI changes.

Finish with a concise summary showing:
- API route changed;
- authentication guard changed;
- development condition used;
- data source used;
- tests added/changed;
- validation results.
'@

Set-Content `
    -LiteralPath $BriefFile `
    -Value $brief `
    -Encoding utf8

Write-Host "Brief created:" -ForegroundColor Green
Write-Host $BriefFile

# ---------------------------------------------------------------------
# 6. RUN CODEX
# ---------------------------------------------------------------------

Step "6. Applying development-only Data Manager API fix"

$prompt = @"
You are working in:

$Repo

Read and implement:

$BriefFile

Important:
- inspect the current server/auth architecture first;
- do not switch branches;
- do not commit;
- do not push;
- do not modify .git;
- production authentication must remain protected;
- the development bypass must be limited to Data Manager/product-intelligence administration endpoints;
- use the existing governed product data source;
- run validation before finishing.
"@

codex exec $prompt

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Codex failed. No automatic rollback has been performed." -ForegroundColor Red
    Write-Host "Review git status before continuing." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

# ---------------------------------------------------------------------
# 7. VALIDATION
# ---------------------------------------------------------------------

Step "7. Running typecheck"

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

Step "8. Running tests"

npm test -- --run

if ($LASTEXITCODE -ne 0) {
    throw "Tests failed."
}

Step "9. Running build"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

# Run verify if available
$package = Get-Content package.json -Raw | ConvertFrom-Json

if ($package.scripts.verify) {

    Step "10. Running full Wingman verification"

    npm run verify

    if ($LASTEXITCODE -ne 0) {
        throw "npm run verify failed."
    }
}

# ---------------------------------------------------------------------
# 8. REVIEW
# ---------------------------------------------------------------------

Step "11. Completed - review changes"

git status -sb

Write-Host ""
Write-Host "Changed tracked files:" -ForegroundColor Cyan
git diff --name-status

Write-Host ""
Write-Host "Diff summary:" -ForegroundColor Cyan
git diff --stat

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "LOCAL DATA MANAGER API PASS COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Now restart Wingman:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Then refresh:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  http://127.0.0.1:3000/wingman/admin/data-manager"
Write-Host ""
Write-Host "Expected:"
Write-Host "  - Actual product records instead of 0 records"
Write-Host "  - No 'Authentication required' message"
Write-Host "  - Product editing available"
Write-Host ""
Write-Host "Do NOT commit until the Data Manager has been tested." -ForegroundColor Yellow