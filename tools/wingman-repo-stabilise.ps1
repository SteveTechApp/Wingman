param(
  [switch]$Apply,
  [string]$StartDir = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path $Path -Parent
  if ($dir) { Ensure-Dir $dir }
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

if (!(Test-Path $StartDir)) { throw "StartDir not found: $StartDir" }

# Find repo root by locating src\main.tsx
$main = Get-ChildItem $StartDir -Recurse -File -Filter "main.tsx" -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match '\\src\\main\.tsx$' } |
  Sort-Object FullName |
  Select-Object -First 1

if (-not $main) {
  throw "Could not find src\main.tsx under: $StartDir. Your project may not be Vite/React structure."
}

$repoRoot = (Split-Path (Split-Path $main.FullName -Parent) -Parent)  # ...\src -> repo root
Write-Host "Detected RepoRoot: $repoRoot"

if (!(Test-Path (Join-Path $repoRoot "package.json"))) {
  Write-Host "WARNING: package.json not found at detected root; continuing anyway."
}

$toolsDir   = Join-Path $repoRoot "tools"
$reportsDir = Join-Path $repoRoot "_REPORTS"
$archiveDir = Join-Path $repoRoot "_ARCHIVE"
Ensure-Dir $toolsDir
Ensure-Dir $reportsDir
Ensure-Dir $archiveDir

# Detect stray scripts in common locations
$possibleStrayDirs = @(
  "C:\Users\steve\tools",
  "C:\Users\steve\Documents\tools",
  "C:\tools"
) | Where-Object { Test-Path $_ }

$stray = @()
foreach ($d in $possibleStrayDirs) {
  $stray += Get-ChildItem $d -File -Filter "wingman-*.ps1" -ErrorAction SilentlyContinue
}

$movePlan = @()
foreach ($f in $stray) {
  $dest = Join-Path $toolsDir $f.Name
  $movePlan += [pscustomobject]@{ From=$f.FullName; To=$dest; ExistsInRepo=(Test-Path $dest) }
}

# Write report
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$report = Join-Path $reportsDir ("repo_stabilise_{0}.md" -f $stamp)
$md = @()
$md += "# Wingman Repo Stabilisation"
$md += ""
$md += ("Timestamp: {0}" -f $stamp)
$md += ("RepoRoot: {0}" -f $repoRoot)
$md += ""
$md += "## Folders ensured"
$md += ("- tools: {0}" -f $toolsDir)
$md += ("- _REPORTS: {0}" -f $reportsDir)
$md += ("- _ARCHIVE: {0}" -f $archiveDir)
$md += ""
$md += "## Stray scripts detected"
if ($movePlan.Count -eq 0) {
  $md += "None found."
} else {
  foreach ($m in $movePlan) {
    $md += ("- {0} -> {1} (exists in repo: {2})" -f $m.From, $m.To, $m.ExistsInRepo)
  }
}
Write-Utf8NoBom $report ($md -join "`r`n")

# Install wrapper (optional)
$wrapperPath = Join-Path $toolsDir "run-wingman-tool.ps1"
$wrapper = @"
param(
  [Parameter(Mandatory=`$true)][string]`$ScriptName,
  [string]`$RepoRoot = `"$repoRoot`",
  [string[]]`$Args
)
`$ErrorActionPreference = `"Stop`"

`$toolsDir = Join-Path `$RepoRoot `"tools`"
`$sn = `$ScriptName.Trim()
if (`$sn -notmatch '\.ps1$') { `$sn = `$sn + '.ps1' }
`$sn = (`$sn -replace '^\.\\tools\\','') -replace '^tools\\',''
`$scriptPath = Join-Path `$toolsDir `$sn
if (!(Test-Path `$scriptPath)) { throw `"Tool not found: `$scriptPath`" }

Push-Location `$RepoRoot
try {
  & pwsh -NoProfile -ExecutionPolicy Bypass -File `$scriptPath @Args
} finally {
  Pop-Location
}
"@

if ($Apply) {
  foreach ($m in $movePlan) {
    if (Test-Path $m.To) { Copy-Item $m.To ($m.To + ".bak_" + $stamp) -Force }
    Ensure-Dir (Split-Path $m.To -Parent)
    Move-Item $m.From $m.To -Force
  }
  Write-Utf8NoBom $wrapperPath $wrapper
  Write-Host "✔ Applied. Report: $report"
  Write-Host "✔ Wrapper: $wrapperPath"
} else {
  Write-Host "Dry run only. Report: $report"
  if ($movePlan.Count -gt 0) { $movePlan | Format-Table -AutoSize }
  Write-Host "Re-run with -Apply to move scripts + install wrapper."
}
