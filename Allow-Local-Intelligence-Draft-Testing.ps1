$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Backup-File {
  param([string]$Path)

  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $Path -Destination "$Path.bak-$stamp" -Force
    Write-Host "Backup created: $Path.bak-$stamp" -ForegroundColor DarkGray
  }
}

function Replace-Required {
  param(
    [string]$Content,
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  if (-not $Content.Contains($Old)) {
    throw "Could not find route auth block for: $Label"
  }

  return $Content.Replace($Old, $New)
}

$serverPath = ".\server\competitor-lookup-server.mjs"

Write-Step "Checking backend server file"

if (-not (Test-Path $serverPath)) {
  throw "Missing file: $serverPath"
}

Backup-File $serverPath

$server = Get-Content -LiteralPath $serverPath -Raw
$server = $server -replace "`r`n", "`n"

Write-Step "Adding localhost-only intelligence draft bypass helper"

if ($server -notmatch "function allowLocalIntelligenceDraftBypass") {
  $helper = @'

function allowLocalIntelligenceDraftBypass(req) {
  const enabled = !["0", "false", "off", "no"].includes(
    String(process.env.WINGMAN_ALLOW_LOCAL_INTELLIGENCE_DRAFT_BYPASS ?? "true").trim().toLowerCase()
  );

  if (!enabled) {
    return false;
  }

  const remoteAddress = String(req.socket?.remoteAddress || "");
  const host = String(req.headers?.host || "").toLowerCase();

  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("localhost:")
  );
}

'@

  $server = $server.Replace("const server = http.createServer(async (req, res) => {", $helper + "const server = http.createServer(async (req, res) => {")
}

Write-Step "Rewiring only the new intelligence draft routes"

$server = Replace-Required `
  -Content $server `
  -Label "GET /api/intelligence/drafts" `
  -Old @'
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence drafts are restricted to workspace admins.",
    }))) return;
'@ `
  -New @'
    if (!allowLocalIntelligenceDraftBypass(req) && !(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence drafts are restricted to workspace admins.",
    }))) return;
'@

$server = Replace-Required `
  -Content $server `
  -Label "POST /api/intelligence/build-competitor" `
  -Old @'
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor intelligence build requires an authenticated Wingman workspace session.",
    }))) return;
'@ `
  -New @'
    if (!allowLocalIntelligenceDraftBypass(req) && !(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor intelligence build requires an authenticated Wingman workspace session.",
    }))) return;
'@

$server = Replace-Required `
  -Content $server `
  -Label "POST /api/intelligence/build-wyrestorm" `
  -Old @'
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "WyreStorm intelligence build requires an authenticated Wingman workspace session.",
    }))) return;
'@ `
  -New @'
    if (!allowLocalIntelligenceDraftBypass(req) && !(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "WyreStorm intelligence build requires an authenticated Wingman workspace session.",
    }))) return;
'@

$server = Replace-Required `
  -Content $server `
  -Label "POST /api/intelligence/drafts/status" `
  -Old @'
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence draft approval is restricted to workspace admins.",
    }))) return;
'@ `
  -New @'
    if (!allowLocalIntelligenceDraftBypass(req) && !(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence draft approval is restricted to workspace admins.",
    }))) return;
'@

Save-Utf8NoBom -Path $serverPath -Content $server

Write-Step "Validating server syntax"

node --check .\server\competitor-lookup-server.mjs
npm run typecheck

Write-Host ""
Write-Host "Local PowerShell testing is now allowed for intelligence draft endpoints." -ForegroundColor Green
Write-Host "Restart the backend server before retesting." -ForegroundColor Yellow