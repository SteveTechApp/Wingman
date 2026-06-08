param(
  [switch]$Apply,
  [switch]$RemoveDependencies,
  [switch]$ForceTracked
)

$ErrorActionPreference = "Stop"

$Repo = "C:\Users\Steve\Wingman"
$Stamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
$ArchiveRoot = Join-Path (Split-Path $Repo -Parent) "Wingman-archive\repo-cleanup-$Stamp"
$ManifestDir = Join-Path $Repo "docs"
$ManifestPath = Join-Path $ManifestDir "repo-cleanup-manifest-$Stamp.md"

Set-Location $Repo

$Lines = New-Object System.Collections.Generic.List[string]

function Write-Log {
  param([string]$Message)

  $Lines.Add($Message) | Out-Null
  Write-Host $Message
}

function Test-GitTracked {
  param([string]$RelativePath)

  $TrackedOutput = git ls-files -- "$RelativePath" 2>$null

  if ($TrackedOutput) {
    return $true
  }

  return $false
}

function Add-GitIgnoreLine {
  param([string]$Line)

  $GitIgnore = Join-Path $Repo ".gitignore"

  if (!(Test-Path $GitIgnore)) {
    if ($Apply) {
      New-Item -ItemType File -Path $GitIgnore -Force | Out-Null
    }
  }

  if (!(Test-Path $GitIgnore)) {
    return
  }

  $Existing = Get-Content $GitIgnore -ErrorAction SilentlyContinue

  if ($Existing -contains $Line) {
    return
  }

  if ($Apply) {
    Add-Content -Path $GitIgnore -Value $Line
  }
}

$Candidates = @(
  [pscustomobject]@{
    Path = "backups"
    Action = "Archive"
    Reason = "Historical backup folders should be outside the active app root."
  },
  [pscustomobject]@{
    Path = "reports"
    Action = "Archive"
    Reason = "Generated audits and reports should be outside the active repo root."
  },
  [pscustomobject]@{
    Path = "dist"
    Action = "Archive"
    Reason = "Vite build output should be regenerated, not maintained manually."
  },
  [pscustomobject]@{
    Path = "WyreStorm Wingman"
    Action = "Archive"
    Reason = "Likely duplicate or old exported project folder."
  },
  [pscustomobject]@{
    Path = "node_modules"
    Action = "RemoveDependency"
    Reason = "Dependencies should be restored with npm install."
  },
  [pscustomobject]@{
    Path = "server\node_modules"
    Action = "RemoveDependency"
    Reason = "Nested dependencies should be restored separately if needed."
  }
)

$IgnoreLines = @(
  "node_modules/",
  "server/node_modules/",
  "dist/",
  "reports/",
  "backups/",
  ".vite/",
  ".vite-temp/",
  "*.log"
)

Write-Log "# Wingman repo cleanup manifest"
Write-Log ""
Write-Log "Generated: $Stamp"
Write-Log "Repo: $Repo"
Write-Log "Archive: $ArchiveRoot"
Write-Log "Apply: $Apply"
Write-Log "RemoveDependencies: $RemoveDependencies"
Write-Log ""
Write-Log "## Candidate actions"
Write-Log ""

foreach ($Candidate in $Candidates) {
  $RelativePath = $Candidate.Path
  $FullPath = Join-Path $Repo $RelativePath

  if (!(Test-Path $FullPath)) {
    Write-Log "- SKIP: $RelativePath - not found"
    continue
  }

  $Tracked = Test-GitTracked -RelativePath $RelativePath

  if ($Tracked -and !$ForceTracked) {
    Write-Log "- SKIP TRACKED: $RelativePath - tracked by git; rerun with -ForceTracked only after checking it is safe"
    continue
  }

  if ($Candidate.Action -eq "Archive") {
    $Destination = Join-Path $ArchiveRoot $RelativePath

    Write-Log "- ARCHIVE: $RelativePath -> $Destination - $($Candidate.Reason)"

    if ($Apply) {
      New-Item -ItemType Directory -Path (Split-Path $Destination -Parent) -Force | Out-Null
      Move-Item -Path $FullPath -Destination $Destination -Force
    }

    continue
  }

  if ($Candidate.Action -eq "RemoveDependency") {
    if (!$RemoveDependencies) {
      Write-Log "- SKIP DEPENDENCY: $RelativePath - add -RemoveDependencies to delete"
      continue
    }

    Write-Log "- REMOVE: $RelativePath - $($Candidate.Reason)"

    if ($Apply) {
      Remove-Item -Path $FullPath -Recurse -Force
    }

    continue
  }
}

Write-Log ""
Write-Log "## .gitignore checks"
Write-Log ""

foreach ($Line in $IgnoreLines) {
  Write-Log "- Ensure ignore rule: $Line"
  Add-GitIgnoreLine -Line $Line
}

Write-Log ""
Write-Log "## Next audit command"
Write-Log ""
Write-Log "Run this before moving old source folders:"
Write-Log "rg -n `"src/(components|features|styles)|../components|../features|../styles|server/server`" src server tools package.json tsconfig*.json vite.config.*"
Write-Log ""

if ($Apply) {
  New-Item -ItemType Directory -Path $ManifestDir -Force | Out-Null
  $Lines | Set-Content -Path $ManifestPath -Encoding UTF8
  Write-Host ""
  Write-Host "Manifest written:"
  Write-Host $ManifestPath
}

if (!$Apply) {
  Write-Host ""
  Write-Host "Dry run only. Apply with:"
  Write-Host "powershell -ExecutionPolicy Bypass -File .\Clean-Wingman-Repo.ps1 -Apply"
  Write-Host ""
  Write-Host "Apply and remove dependency folders with:"
  Write-Host "powershell -ExecutionPolicy Bypass -File .\Clean-Wingman-Repo.ps1 -Apply -RemoveDependencies"
}

Write-Host ""
Write-Host "Done."
