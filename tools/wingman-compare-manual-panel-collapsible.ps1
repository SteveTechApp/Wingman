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
    if ($parent -eq $dir) { throw "Could not find package.json from $dir" }
    $dir = $parent
  }
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  [System.IO.File]::ReadAllText($Path)
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )
  $relative = $Path.Substring($RepoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $Path $dest -Force
}

$repoRoot = Find-RepoRoot -Start $Root
$path = Join-Path $repoRoot "src\features\compare\CompetitorComparePage.tsx"
if (-not (Test-Path $path)) { throw "File not found: $path" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot "_RESCUE\compare-manual-panel-collapsible-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
Backup-File -Path $path -RepoRoot $repoRoot -BackupRoot $backupRoot

$t = Read-Text $path
$original = $t

# 1) Add local state if missing
if ($t -notmatch 'manualPanelOpen') {
  $anchor = '  const [saveMessage, setSaveMessage] = React.useState("");'
  $insert = @'
  const [saveMessage, setSaveMessage] = React.useState("");
  const [manualPanelOpen, setManualPanelOpen] = React.useState(false);
'@
  if ($t.Contains($anchor)) {
    $t = $t.Replace($anchor, $insert)
  } else {
    throw "Could not find saveMessage state anchor."
  }
}

# 2) Replace the existing manual panel card block
$oldBlock = @'
            <div className="wm-card" style={{ padding: 14 }}>
              <CompetitorManualComparisonPanel
                brand={brand}
                query={sku}
                selectedCandidate={selectedCandidate}
                selectedOption={selectedOption}
                saveMessage={saveMessage}
                feedbackSummary={feedbackSummary}
                onSave={handleSaveManual}
                onDelete={handleDeleteManual}
              />
            </div>
'@

$newBlock = @'
            <div className="wm-card" style={{ padding: 14 }}>
              <button
                type="button"
                onClick={() => setManualPanelOpen((current) => !current)}
                aria-expanded={manualPanelOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "0 0 2px 0",
                  margin: 0,
                  border: "none",
                  background: "transparent",
                  color: "#eef5ff",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "grid", gap: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    Manual fallback mapping
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.62)",
                      lineHeight: 1.35,
                    }}
                  >
                    Save or remove local override mappings when the automatic match needs help.
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {manualPanelOpen ? "-" : "+"}
                </div>
              </button>

              {manualPanelOpen ? (
                <div style={{ marginTop: 12 }}>
                  <CompetitorManualComparisonPanel
                    brand={brand}
                    query={sku}
                    selectedCandidate={selectedCandidate}
                    selectedOption={selectedOption}
                    saveMessage={saveMessage}
                    feedbackSummary={feedbackSummary}
                    onSave={handleSaveManual}
                    onDelete={handleDeleteManual}
                  />
                </div>
              ) : null}
            </div>
'@

if ($t.Contains($oldBlock)) {
  $t = $t.Replace($oldBlock, $newBlock)
} else {
  throw "Could not find the existing manual comparison panel block."
}

if ($t -eq $original) {
  Write-Host "No changes made." -ForegroundColor Yellow
  exit 0
}

Save-Utf8NoBom -Path $path -Content $t

Write-Host ""
Write-Host "Patched:" -ForegroundColor Green
Write-Host "  $path" -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host "  $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"