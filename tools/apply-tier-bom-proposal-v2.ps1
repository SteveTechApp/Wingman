Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\steve\wingman"
$proposalPath = Join-Path $projectRoot "src\features\proposal\ProposalPage.tsx"
$rescueDir = Join-Path $projectRoot "_RESCUE"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  if (-not (Test-Path $rescueDir)) {
    New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $name = Split-Path $Path -Leaf
  $dest = Join-Path $rescueDir "$stamp-$name.bak"
  Copy-Item $Path $dest -Force
  Write-Host "Backup created: $dest"
}

if (-not (Test-Path $proposalPath)) {
  throw "Proposal page not found: $proposalPath"
}

Backup-File -Path $proposalPath
$content = Get-Content $proposalPath -Raw

# 1. Import
if ($content -notmatch 'buildTieredBom') {
  if ($content -match 'import\s+\{\s*loadActiveProjectSnapshot\s*\}\s+from\s+"@/app/logic/wingmanProjectState";') {
    $content = $content -replace 'import\s+\{\s*loadActiveProjectSnapshot\s*\}\s+from\s+"@/app/logic/wingmanProjectState";', @'
import { loadActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";
import { buildTieredBom } from "@/app/logic/wingmanBomBuilder";
'@
  } else {
    throw "Could not find import anchor for loadActiveProjectSnapshot"
  }
}

# 2. Tier state
if ($content -notmatch 'const \[tier,\s*setTier\]') {
  if ($content -match 'const \[scopeSummary,\s*setScopeSummary\]\s*=\s*useState\(""\);') {
    $content = $content -replace 'const \[scopeSummary,\s*setScopeSummary\]\s*=\s*useState\(""\);', @'
const [scopeSummary, setScopeSummary] = useState("");
const [tier, setTier] = useState<"Bronze" | "Silver" | "Gold">("Silver");
'@
  } else {
    throw "Could not find scopeSummary state anchor"
  }
}

# 3. tieredBom memo
if ($content -notmatch 'const tieredBom = useMemo') {
  if ($content -match 'const executiveSummary = useMemo\(\(\) => \{') {
    $content = $content -replace 'const executiveSummary = useMemo\(\(\) => \{', @'
const tieredBom = useMemo(() => {
  if (!snapshot) return [];

  return buildTieredBom(
    snapshot.decision.architecture,
    tier,
    {
      sources: snapshot.project.discovery.sources,
      displays: snapshot.project.discovery.displays,
    }
  );
}, [snapshot, tier]);

const executiveSummary = useMemo(() => {
'@
  } else {
    throw "Could not find executiveSummary anchor"
  }
}

# 4. Tier selector UI
if ($content -notmatch 'Solution tier') {
  $tierSelector = @'
          <div className="wm-surface-card--soft" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>Solution tier</div>
            <div className="wm-toolbar-row">
              {["Bronze", "Silver", "Gold"].map((t) => {
                const active = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`wm-chip${active ? " wm-chip--active" : ""}`}
                    onClick={() => setTier(t as "Bronze" | "Silver" | "Gold")}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
'@

  $settingsBlockPattern = '(?s)(<aside\b[^>]*>.*?<div className="wm-section-title">.*?Proposal settings.*?</div>.*?</div>)'
  if ([regex]::IsMatch($content, $settingsBlockPattern)) {
    $content = [regex]::Replace($content, $settingsBlockPattern, "`$1`r`n$tierSelector", 1)
  } else {
    throw "Could not find Proposal settings block in aside"
  }
}

# 5. Tier BOM block
if ($content -notmatch 'Tier BOM \(\{tier\}\)') {
  $tierBomBlock = @'
            <article className="wm-product-card">
              <div className="wm-product-card__sku">Tier BOM ({tier})</div>

              <div style={{ display: "grid", gap: 8 }}>
                {tieredBom.length > 0 ? (
                  tieredBom.map((item, i) => (
                    <div
                      key={`${item.sku}-${i}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 80px 120px",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#ffffff" }}>{item.sku}</div>
                      <div style={{ color: "rgba(226,232,240,0.86)" }}>Qty {item.qty}</div>
                      <div style={{ color: "rgba(226,232,240,0.72)" }}>{item.role}</div>
                    </div>
                  ))
                ) : (
                  <div className="wm-product-card__copy" style={{ marginBottom: 0 }}>
                    No tier BOM is available until a saved recommendation exists.
                  </div>
                )}
              </div>
            </article>
'@

  $starterBomPattern = '(?s)(<article className="wm-product-card">\s*<div className="wm-product-card__sku">Starter BOM</div>)'
  $savedRecommendationPattern = '(?s)(<article className="wm-product-card">\s*<div className="wm-product-card__sku">Saved recommendation</div>)'

  if ([regex]::IsMatch($content, $starterBomPattern)) {
    $content = [regex]::Replace($content, $starterBomPattern, "$tierBomBlock`r`n`$1", 1)
  }
  elseif ([regex]::IsMatch($content, $savedRecommendationPattern)) {
    $content = [regex]::Replace($content, $savedRecommendationPattern, "$tierBomBlock`r`n`$1", 1)
  }
  else {
    throw "Could not find BOM insertion anchor"
  }
}

Save-Utf8NoBom -Path $proposalPath -Content $content

Write-Host ""
Write-Host "ProposalPage.tsx updated successfully."
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"