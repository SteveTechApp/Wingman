[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = ""
  if ($Start) {
    $dir = (Resolve-Path $Start).Path
  }
  if (-not $dir) {
    $dir = (Get-Location).Path
  }

  while ($true) {
    if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { throw "Could not find package.json from $dir" }
    $dir = $parent
  }
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $folder = Split-Path $Path -Parent
  if ($folder -and -not (Test-Path $folder)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.File]::ReadAllText($Path)
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
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item $Path $dest -Force
}

function Convert-ToAsciiSafeText {
  param([Parameter(Mandatory = $true)][string]$Text)

  $map = [ordered]@{
    ([string][char]0x2018) = "'"
    ([string][char]0x2019) = "'"
    ([string][char]0x201C) = '"'
    ([string][char]0x201D) = '"'
    ([string][char]0x2013) = "-"
    ([string][char]0x2014) = "-"
    ([string][char]0x2022) = "-"
    ([string][char]0x00A0) = " "
    ([string][char]0xFFFD) = ""
  }

  foreach ($key in $map.Keys) {
    $Text = $Text.Replace($key, $map[$key])
  }

  $regexReplacements = @(
    @{ Pattern = [regex]::Escape([string]([char]0x00C2)); Value = ""  }
    @{ Pattern = [regex]::Escape([string]([char]0x00A0)); Value = " " }
  )

  foreach ($item in $regexReplacements) {
    $Text = [regex]::Replace($Text, $item.Pattern, $item.Value)
  }

  return $Text
}

function Replace-OnceOrThrow {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$Replacement,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $rx = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $rx.IsMatch($Text)) {
    throw "Could not find pattern: $Label"
  }

  return $rx.Replace($Text, $Replacement, 1)
}

function Find-FirstFileContaining {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string[]]$Needles
  )

  $files = Get-ChildItem $BasePath -Recurse -Include *.ts,*.tsx -File
  foreach ($file in $files) {
    $raw = Read-Text $file.FullName
    $allFound = $true
    foreach ($needle in $Needles) {
      if ($raw -notmatch [regex]::Escape($needle)) {
        $allFound = $false
      }
    }
    if ($allFound) { return $file.FullName }
  }

  return $null
}

$repoRoot = Find-RepoRoot -Start $Root
$srcRoot = Join-Path $repoRoot "src"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot "_RESCUE\tier-ui-refresh-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$pagePath = Find-FirstFileContaining -BasePath $srcRoot -Needles @(
  "What you get in this tier",
  "Core credibility",
  "Room assumptions"
)

if (-not $pagePath) {
  throw "Could not find the tier page. Search text not found."
}

$dataCandidates = @(
  (Join-Path $repoRoot "src\features\catalog\catalogue.data.ts"),
  (Join-Path $repoRoot "src\features\catalog\catalog.data.ts"),
  (Join-Path $repoRoot "src\features\catalog\catalogIntelligence.ts"),
  (Join-Path $repoRoot "src\features\misc\templates.data.ts"),
  (Join-Path $repoRoot "src\features\misc\catalogue.data.ts")
) | Where-Object { Test-Path $_ }

Backup-File -Path $pagePath -RepoRoot $repoRoot -BackupRoot $backupRoot
foreach ($dataPath in $dataCandidates) {
  Backup-File -Path $dataPath -RepoRoot $repoRoot -BackupRoot $backupRoot
}

$page = Read-Text $pagePath
$page = Convert-ToAsciiSafeText $page

if ($page -notmatch "const TIER_THEME") {
  $themeBlock = @'
const TIER_THEME: Record<string, {
  accent: string;
  border: string;
  panelBg: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  tick: string;
  tickBg: string;
  numberBg: string;
  numberText: string;
}> = {
  bronze: {
    accent: "#c78a4a",
    border: "rgba(199,138,74,0.34)",
    panelBg: "linear-gradient(180deg, rgba(199,138,74,0.14), rgba(199,138,74,0.05))",
    glow: "0 18px 40px rgba(199,138,74,0.14)",
    badgeBg: "rgba(199,138,74,0.18)",
    badgeText: "#f2c08d",
    tick: "#4ade80",
    tickBg: "rgba(34,197,94,0.14)",
    numberBg: "rgba(199,138,74,0.18)",
    numberText: "#f2c08d"
  },
  silver: {
    accent: "#94a3b8",
    border: "rgba(148,163,184,0.32)",
    panelBg: "linear-gradient(180deg, rgba(148,163,184,0.14), rgba(148,163,184,0.05))",
    glow: "0 18px 40px rgba(148,163,184,0.12)",
    badgeBg: "rgba(148,163,184,0.18)",
    badgeText: "#dce5ef",
    tick: "#4ade80",
    tickBg: "rgba(34,197,94,0.14)",
    numberBg: "rgba(148,163,184,0.18)",
    numberText: "#dce5ef"
  },
  gold: {
    accent: "#d4af37",
    border: "rgba(212,175,55,0.34)",
    panelBg: "linear-gradient(180deg, rgba(212,175,55,0.16), rgba(212,175,55,0.05))",
    glow: "0 18px 40px rgba(212,175,55,0.14)",
    badgeBg: "rgba(212,175,55,0.18)",
    badgeText: "#ffe8a1",
    tick: "#4ade80",
    tickBg: "rgba(34,197,94,0.14)",
    numberBg: "rgba(212,175,55,0.18)",
    numberText: "#ffe8a1"
  }
};

function getTierTheme(label: string) {
  const key = String(label || "").trim().toLowerCase();
  if (key === "gold") return TIER_THEME.gold;
  if (key === "silver") return TIER_THEME.silver;
  return TIER_THEME.bronze;
}

function tierAssumptions(items: string[]) {
  return items.slice(0, 3).map((item, index) => {
    const text = String(item || "").trim();
    if (index === 0) return "Built for long daily runtime with simple operation.";
    if (index === 1) return "Prioritises reliability, simple control, and easy support.";
    if (index === 2) return "Suitable for repeatable rollout across similar rooms.";
    return text;
  });
}
'@

  $page = Replace-OnceOrThrow `
    -Text $page `
    -Pattern '(import[\s\S]*?;\s*)' `
    -Replacement ('$1' + "`r`n" + $themeBlock + "`r`n") `
    -Label "insert tier theme block after imports"
}

if ($page -match 'const\s+tierProfile\s*=') {
  if ($page -notmatch 'const tierTheme = getTierTheme') {
    $page = [regex]::Replace(
      $page,
      '(const\s+tierProfile\s*=\s*[^;]+;)',
      '$1' + "`r`n" + '  const tierTheme = getTierTheme(tierProfile.label);',
      1
    )
  }
}

$page = $page.Replace("What you get in this tier", "What you get")
$page = $page.Replace("Core credibility", "Core strengths")

$page = $page.Replace(
  "Assumes the display system runs for long periods and must stay operationally simple.",
  "Built for long daily runtime with simple operation."
)
$page = $page.Replace(
  "Assumes content reliability, basic control, and serviceable topology matter more than niche features.",
  "Prioritises reliability, simple control, and easy support."
)
$page = $page.Replace(
  "Assumes the customer may standardise this pattern across additional spaces or screens.",
  "Suitable for repeatable rollout across similar rooms."
)
$page = $page.Replace(
  "Do not compromise uptime or basic routing integrity for cosmetic savings.",
  "Protect uptime and routing integrity before cosmetic savings."
)

if ($page -match 'style=\{\{[\s\S]*?padding:\s*24') {
  $page = $page -replace 'padding:\s*24', 'padding: 18'
}
if ($page -match 'style=\{\{[\s\S]*?padding:\s*20') {
  $page = $page -replace 'padding:\s*20', 'padding: 16'
}
$page = $page -replace 'rgba\(255,255,255,0\.92\)', 'rgba(255,255,255,0.96)'
$page = $page -replace 'rgba\(255,255,255,0\.84\)', 'rgba(255,255,255,0.78)'
$page = $page -replace 'rgba\(255,255,255,0\.72\)', 'rgba(255,255,255,0.66)'
$page = $page -replace 'border:\s*"1px solid rgba\(255,255,255,0\.0?8\)"', 'border: "1px solid rgba(255,255,255,0.06)"'

if ($page -notmatch 'tierTheme\.panelBg') {
  $page = $page -replace 'background:\s*"linear-gradient\([^"]+\)"', 'background: tierTheme.panelBg'
}

if ($page -notmatch 'tierTheme\.border') {
  $page = $page -replace 'border:\s*"1px solid rgba\([^"]+\)"', 'border: `1px solid ${tierTheme.border}`'
}

if ($page -notmatch 'tierTheme\.glow') {
  $page = $page -replace 'boxShadow:\s*"[^"]+"', 'boxShadow: tierTheme.glow'
}

$greenTickHelper = @'
function renderGreenTickItem(text: string, index: number, tierTheme: ReturnType<typeof getTierTheme>) {
  return (
    <div
      key={`${index}-${text}`}
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start"
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: tierTheme.tickBg,
          color: tierTheme.tick,
          fontSize: 12,
          fontWeight: 900,
          marginTop: 2
        }}
      >
        âœ“
      </div>
      <div style={{ lineHeight: 1.45 }}>
        {text}
      </div>
    </div>
  );
}

function renderNumberedAssumption(text: string, index: number, tierTheme: ReturnType<typeof getTierTheme>) {
  return (
    <div
      key={`${index}-${text}`}
      style={{
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start"
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: tierTheme.numberBg,
          color: tierTheme.numberText,
          fontSize: 12,
          fontWeight: 900,
          marginTop: 1
        }}
      >
        {index + 1}
      </div>
      <div style={{ lineHeight: 1.45 }}>
        {text}
      </div>
    </div>
  );
}
'@

if ($page -notmatch 'renderGreenTickItem') {
  $page = Replace-OnceOrThrow `
    -Text $page `
    -Pattern '(function\s+getTierTheme[\s\S]*?\r?\n\})' `
    -Replacement ('$1' + "`r`n`r`n" + $greenTickHelper) `
    -Label "insert list render helpers"
}

$page = $page -replace '\{tierProfile\.benefits\.map\(\(item,\s*index\)\s*=>\s*\([\s\S]*?\)\)\}', '{tierProfile.benefits.map((item, index) => renderGreenTickItem(item, index, tierTheme))}'
$page = $page -replace '\{tierProfile\.credibility\.map\(\(item,\s*index\)\s*=>\s*\([\s\S]*?\)\)\}', '{tierProfile.credibility.map((item, index) => renderGreenTickItem(item, index, tierTheme))}'
$page = $page -replace '\{tierProfile\.assumptions\.map\(\(item,\s*index\)\s*=>\s*\([\s\S]*?\)\)\}', '{tierAssumptions(tierProfile.assumptions).map((item, index) => renderNumberedAssumption(item, index, tierTheme))}'

foreach ($dataPath in $dataCandidates) {
  $data = Read-Text $dataPath
  $data = Convert-ToAsciiSafeText $data

  $data = $data.Replace("Assumes the display system runs for long periods and must stay operationally simple.", "Built for long daily runtime with simple operation.")
  $data = $data.Replace("Assumes content reliability, basic control, and serviceable topology matter more than niche features.", "Prioritises reliability, simple control, and easy support.")
  $data = $data.Replace("Assumes the customer may standardise this pattern across additional spaces or screens.", "Suitable for repeatable rollout across similar rooms.")
  $data = $data.Replace("Do not compromise uptime or basic routing integrity for cosmetic savings.", "Protect uptime and routing integrity before cosmetic savings.")

  Save-Utf8NoBom -Path $dataPath -Content $data
}

Save-Utf8NoBom -Path $pagePath -Content $page

Write-Host ""
Write-Host "Patched tier page:" -ForegroundColor Green
Write-Host "  $pagePath" -ForegroundColor Green
Write-Host ""
Write-Host "Sanitised data files:" -ForegroundColor Green
foreach ($dataPath in $dataCandidates) {
  Write-Host "  $dataPath" -ForegroundColor Green
}
Write-Host ""
Write-Host "Backup folder:" -ForegroundColor Yellow
Write-Host "  $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"