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
$builderPath = ".\server\intelligence\auto-draft-builder.mjs"

Write-Step "Checking backend files"

if (-not (Test-Path $serverPath)) {
  throw "Missing file: $serverPath"
}

if (-not (Test-Path $builderPath)) {
  throw "Missing file: $builderPath. Run Add-Automatic-Product-Intelligence-Draft-Builder.ps1 first."
}

Backup-File $serverPath

$server = Get-Content -LiteralPath $serverPath -Raw
$server = $server -replace "`r`n", "`n"

Write-Step "Ensuring auto-draft builder imports exist"

if ($server -notmatch "auto-draft-builder\.mjs") {
  $importBlock = @'
import {
  handleIntelligenceDraftBuildCompetitorPost,
  handleIntelligenceDraftBuildWyrestormPost,
  handleIntelligenceDraftsGet,
  handleIntelligenceDraftStatusPost,
} from "./intelligence/auto-draft-builder.mjs";
'@

  $server = $importBlock + "`n" + $server
}

Write-Step "Adding local-only route helper"

$helperBlock = @'

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

if ($server -notmatch "function allowLocalIntelligenceDraftBypass") {
  $server = $server.Replace(
    "const server = http.createServer(async (req, res) => {",
    $helperBlock + "const server = http.createServer(async (req, res) => {"
  )
}

if ($server -notmatch "function allowLocalIntelligenceDraftBypass") {
  throw "Could not insert allowLocalIntelligenceDraftBypass helper."
}

Write-Step "Adding direct localhost test routes before protected routes"

$routeBlock = @'

  if (allowLocalIntelligenceDraftBypass(req, url)) {
    if (method === "GET" && url.pathname === "/api/intelligence/drafts") {
      await runProtectedRoute(res, () => handleIntelligenceDraftsGet(req, res, url, { sendJson }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/build-competitor") {
      await runProtectedRoute(res, () => handleIntelligenceDraftBuildCompetitorPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/build-wyrestorm") {
      await runProtectedRoute(res, () => handleIntelligenceDraftBuildWyrestormPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/drafts/status") {
      await runProtectedRoute(res, () => handleIntelligenceDraftStatusPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }
  }

'@

if ($server -notmatch "allowLocalIntelligenceDraftBypass\(req, url\)\)\s*\{[\s\S]*?handleIntelligenceDraftBuildCompetitorPost") {
  $pattern = '(const url = new URL\(req\.url \|\| "/"[\s\S]*?\);\n)'
  $server = [regex]::Replace($server, $pattern, '$1' + $routeBlock, 1)
}

if ($server -notmatch "handleIntelligenceDraftBuildCompetitorPost\(req, res, url, \{ sendJson, parseJsonBody \}\)") {
  throw "Could not insert direct local test route block."
}

Save-Utf8NoBom -Path $serverPath -Content $server

Write-Step "Validating backend syntax"

node --check .\server\intelligence\auto-draft-builder.mjs
node --check .\server\competitor-lookup-server.mjs
npm run typecheck

Write-Host ""
Write-Host "Direct localhost test routes added for intelligence draft builder." -ForegroundColor Green
Write-Host "Restart npm run server:dev before retesting." -ForegroundColor Yellow