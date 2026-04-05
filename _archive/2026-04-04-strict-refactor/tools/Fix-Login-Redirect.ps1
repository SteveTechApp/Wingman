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

$content = @'
import { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { routeMap, normalizeAppRoute } from "@/core/wingman/routeMap";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = normalizeAppRoute(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
      routeMap.app.dashboard,
  );

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    navigate(redirectTo, { replace: true });
  }

  return (
    <form onSubmit={handleLogin}>
      <h1>Login</h1>
      <button type="submit">Sign in</button>
    </form>
  );
}
'@

Save-Utf8NoBom -RelativePath "src\pages\LoginPage.tsx" -Content $content