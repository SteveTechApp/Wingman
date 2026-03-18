[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = if ($Start) { (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while ($true) {
    if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { throw "Could not find package.json" }
    $dir = $parent
  }
}

function Save-Utf8NoBom($path,$content){
  [System.IO.File]::WriteAllText($path,$content,[System.Text.UTF8Encoding]::new($false))
}

$repo = Find-RepoRoot -Start $Root
$path = Join-Path $repo "src\features\compare\CompetitorComparePage.tsx"

if (!(Test-Path $path)) { throw "File not found: $path" }

$t = Get-Content $path -Raw

# -------------------------------------------------
# 1. Add page container (center + max width)
# -------------------------------------------------
$t = $t -replace '<div className="wm-page">', @'
<div className="wm-page">
  <div style={{
    maxWidth: 1480,
    margin: "0 auto",
    width: "100%"
  }}>
'@

$t = $t -replace '</div>\s*</div>\s*$', @'
  </div>
</div>
'@

# -------------------------------------------------
# 2. Convert search card → toolbar feel
# -------------------------------------------------
$t = $t -replace '<div className="wm-card" style=\{\{ padding: 10 \}\}>', @'
<div style={{
  display: "grid",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)"
}}>
'@

# -------------------------------------------------
# 3. Make right column sticky + lighter
# -------------------------------------------------
$t = $t -replace '<div style=\{\{ display: "grid", gap: 10 \}\}>', @'
<div style={{
  display: "grid",
  gap: 10,
  alignContent: "start",
  position: "sticky",
  top: 20
}}>
'@

# -------------------------------------------------
# 4. Reduce right panel visual weight
# -------------------------------------------------
$t = $t -replace 'CompetitorLookupStatusPanel', @'
<div style={{ opacity: 0.85 }}>
  <CompetitorLookupStatusPanel
'@

$t = $t -replace 'emptyText="No compare activity yet."\s*/>', @'
emptyText="No compare activity yet."
  />
</div>
'@

# -------------------------------------------------
# 5. Make results card visually dominant
# -------------------------------------------------
$t = $t -replace '<div className="wm-card" style=\{\{ padding: 10 \}\}>\s*<CompetitorCompareResultsPanel', @'
<div className="wm-card" style={{
  padding: 12,
  border: "1px solid rgba(92,225,230,0.18)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.25)"
}}>
  <CompetitorCompareResultsPanel
'@

# -------------------------------------------------
# 6. Slightly de-emphasize manual panel
# -------------------------------------------------
$t = $t -replace '<div className="wm-card" style=\{\{ padding: 10 \}\}>', @'
<div className="wm-card" style={{
  padding: 10,
  opacity: 0.92
}}>
'@

Save-Utf8NoBom $path $t

Write-Host ""
Write-Host "PASS 2 COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "npm run dev"