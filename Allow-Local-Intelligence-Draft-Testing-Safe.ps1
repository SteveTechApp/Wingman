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

$serverPath = ".\server\competitor-lookup-server.mjs"

Write-Step "Checking backend server file"

if (-not (Test-Path $serverPath)) {
  throw "Missing file: $serverPath"
}

Backup-File $serverPath

$server = Get-Content -LiteralPath $serverPath -Raw
$server = $server -replace "`r`n", "`n"

Write-Step "Adding localhost-only bypass helper"

$helper = @'

function allowLocalIntelligenceDraftBypass(req, url) {
  const enabled = !["0", "false", "off", "no"].includes(
    String(process.env.WINGMAN_ALLOW_LOCAL_INTELLIGENCE_DRAFT_BYPASS ?? "true").trim().toLowerCase()
  );

  if (!enabled) {
    return false;
  }

  const pathname = String(url?.pathname || "");
  const allowedPath = [
    "/api/intelligence/drafts",
    "/api/intelligence/build-competitor",
    "/api/intelligence/build-wyrestorm",
    "/api/intelligence/drafts/status"
  ].includes(pathname);

  if (!allowedPath) {
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

if ($server -match "function allowLocalIntelligenceDraftBypass\(req, url\)[\s\S]*?\n\}") {
  $server = [regex]::Replace(
    $server,
    "function allowLocalIntelligenceDraftBypass\(req, url\)[\s\S]*?\n\}",
    $helper.Trim(),
    1
  )
}

if ($server -notmatch "function allowLocalIntelligenceDraftBypass") {
  $server = $server.Replace(
    "async function requireWingmanPermission(req, res, url, {",
    $helper + "async function requireWingmanPermission(req, res, url, {"
  )
}

if ($server -notmatch "function allowLocalIntelligenceDraftBypass") {
  throw "Could not insert local intelligence bypass helper."
}

Write-Step "Adding bypass inside shared permission check"

$bypass = @'
  if (allowLocalIntelligenceDraftBypass(req, url)) {
    return {
      ok: true,
      user: {
        id: "local-intelligence-dev",
        email: "local-dev@wingman.local",
        role: "local-dev"
      },
      permissions: {
        canManageWorkspace: true,
        canViewDiagnostics: true,
        canUseProjects: true,
        canEditProjects: true
      }
    };
  }

'@

if ($server -notmatch "local-intelligence-dev") {
  $server = $server.Replace(
    "async function requireWingmanPermission(req, res, url, {
  permission,
  deniedMessage,
} = {}) {
  let auth = null;",
    "async function requireWingmanPermission(req, res, url, {
  permission,
  deniedMessage,
} = {}) {
$bypass  let auth = null;"
  )
}

if ($server -notmatch "local-intelligence-dev") {
  throw "Could not add local intelligence bypass inside requireWingmanPermission."
}

Save-Utf8NoBom -Path $serverPath -Content $server

Write-Step "Validating backend syntax"

node --check .\server\competitor-lookup-server.mjs
node --check .\server\intelligence\auto-draft-builder.mjs
npm run typecheck

Write-Host ""
Write-Host "Local PowerShell testing is now allowed for the new intelligence draft endpoints." -ForegroundColor Green
Write-Host "Restart the backend server before retesting." -ForegroundColor Yellow