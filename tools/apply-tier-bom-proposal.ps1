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

function Add-ImportIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Content,
    [Parameter(Mandatory = $true)][string]$ImportLine,
    [Parameter(Mandatory = $true)][string]$AnchorLine
  )

  if ($Content.Contains($ImportLine)) {
    return $Content
  }

  if (-not $Content.Contains($AnchorLine)) {
    throw "Import anchor not found: $AnchorLine"
  }

  return $Content.Replace($AnchorLine, "$AnchorLine`r`n$ImportLine")
}

function Add-TextAfterIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Content,
    [Parameter(Mandatory = $true)][string]$Anchor,
    [Parameter(Mandatory = $true)][string]$TextToInsert,
    [Parameter(Mandatory = $true)][string]$PresenceCheck
  )

  if ($Content.Contains($PresenceCheck)) {
    return $Content
  }

  if (-not $Content.Contains($Anchor)) {
    throw "Anchor not found: $Anchor"
  }

  return $Content.Replace($Anchor, "$Anchor`r`n$TextToInsert")
}

if (-not (Test-Path $proposalPath)) {
  throw "Proposal page not found: $proposalPath"
}

Backup-File -Path $proposalPath

$content = Get-Content $proposalPath -Raw

# ------------------------------------------------------------
# Step 2: import buildTieredBom
# ------------------------------------------------------------
$content = Add-ImportIfMissing `
  -Content $content `
  -ImportLine 'import { buildTieredBom } from "@/app/logic/wingmanBomBuilder";' `
  -AnchorLine 'import { loadActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";'

# ------------------------------------------------------------
# Step 2: add tier state
# ------------------------------------------------------------
$content = Add-TextAfterIfMissing `
  -Content $content `
  -Anchor '  const [scopeSummary, setScopeSummary] = useState("");' `
  -TextToInsert '  const [tier, setTier] = useState<"Bronze" | "Silver" | "Gold">("Silver");' `
  -PresenceCheck 'const [tier, setTier] = useState<"Bronze" | "Silver" | "Gold">("Silver");'

# ------------------------------------------------------------
# Step 2: add tieredBom memo
# ------------------------------------------------------------
$tierMemo = @'
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
'@

$content = Add-TextAfterIfMissing `
  -Content $content `
  -Anchor '  const executiveSummary = useMemo(() => {' `
  -TextToInsert $tierMemo `
  -PresenceCheck 'const tieredBom = useMemo(() => {'

# ------------------------------------------------------------
# Step 3: add tier selector UI
# ------------------------------------------------------------
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

$content = Add-TextAfterIfMissing `
  -Content $content `
  -Anchor '          <div className="wm-surface-card--soft" style={{ padding: 12 }}>' `
  -TextToInsert $tierSelector `
  -PresenceCheck 'Solution tier'

# ------------------------------------------------------------
# Step 4: insert tier BOM block before first snapshot BOM or fallback card
# ------------------------------------------------------------
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

if (-not $content.Contains('Tier BOM ({tier})')) {
  $anchor1 = '<article className="wm-product-card">' + "`r`n" + '                  <div className="wm-product-card__sku">Starter BOM</div>'
  $anchor2 = '<article className="wm-product-card">' + "`r`n" + '                <div className="wm-product-card__sku">Saved recommendation</div>'

  if ($content.Contains($anchor1)) {
    $content = $content.Replace($anchor1, $tierBomBlock + $anchor1)
  }
  elseif ($content.Contains($anchor2)) {
    $content = $content.Replace($anchor2, $tierBomBlock + $anchor2)
  }
  else {
    throw "Could not find a safe BOM insertion anchor in ProposalPage.tsx"
  }
}

Save-Utf8NoBom -Path $proposalPath -Content $content

Write-Host ""
Write-Host "ProposalPage.tsx updated successfully."
Write-Host "Next:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"