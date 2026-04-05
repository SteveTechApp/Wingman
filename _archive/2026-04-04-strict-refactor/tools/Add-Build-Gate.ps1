Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory=$true)][string]$RelativePath,
    [Parameter(Mandatory=$true)][string]$Content
  )

  $root = (Get-Location).Path
  $full = Join-Path $root $RelativePath
  $dir = Split-Path $full -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescue = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescue)) {
    New-Item -ItemType Directory -Force -Path $rescue | Out-Null
  }

  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $full (Join-Path $rescue "$safe.$stamp.bak") -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full, $Content, $utf8)
  Write-Host "Written: $RelativePath" -ForegroundColor Green
}

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

if (-not $packageJson.scripts) {
  $packageJson | Add-Member -NotePropertyName scripts -NotePropertyValue (@{})
}

$packageJson.scripts | Add-Member -Force -NotePropertyName "check:routes" -NotePropertyValue "node tools/route-smoke-check.mjs"
$packageJson.scripts | Add-Member -Force -NotePropertyName "verify" -NotePropertyValue "npm run typecheck && npm run build && npm run check:routes"

$routeSmoke = @'
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeMapPath = path.join(root, "src", "core", "wingman", "routeMap.ts");

const content = fs.readFileSync(routeMapPath, "utf8");

if (!content.includes("/app/dashboard")) {
  throw new Error("routeMap.ts missing /app/dashboard");
}

if (content.includes("/wingman/")) {
  throw new Error("Legacy /wingman/ routes still present in routeMap.ts");
}

console.log("Route smoke check passed");
'@

Save-Utf8NoBom -RelativePath "tools\route-smoke-check.mjs" -Content $routeSmoke
Save-Utf8NoBom -RelativePath "package.json" -Content ($packageJson | ConvertTo-Json -Depth 20)