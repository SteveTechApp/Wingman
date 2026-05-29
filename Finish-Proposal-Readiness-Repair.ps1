$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Save-Utf8NoBom {
  param([string]$Path, [string]$Content)
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

$root = (Get-Location).Path
$salesPath = Join-Path $root "src\wingman2\lib\salesReadiness.ts"
$proposalPath = Join-Path $root "src\wingman2\pages\ProposalPage.tsx"
$exportPath = Join-Path $root "src\wingman2\lib\proposalExport.ts"

Write-Step "Checking files"

foreach ($path in @($salesPath, $proposalPath, $exportPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($path in @($salesPath, $proposalPath, $exportPath)) {
  Backup-File $path
}

Write-Step "Fixing SalesMotionType if Product gap was introduced"

$sales = Get-Content -LiteralPath $salesPath -Raw
$sales = $sales -replace "`r`n", "`n"

$sales = $sales.Replace(
  'export type SalesMotionType = "Competitor replacement" | "Outcome SKU" | "Room/tender BOM";',
  'export type SalesMotionType = "Product gap" | "Competitor replacement" | "Outcome SKU" | "Room/tender BOM";'
)

if ($sales -notmatch "noCoreProductSelected") {
  Write-Host "Warning: salesReadiness.ts does not appear to contain the no-core-product readiness logic yet." -ForegroundColor Yellow
  Write-Host "The previous script may have stopped before applying the sales logic." -ForegroundColor Yellow
}

Save-Utf8NoBom -Path $salesPath -Content $sales

Write-Step "Finishing Proposal page readiness gating"

$proposal = Get-Content -LiteralPath $proposalPath -Raw
$proposal = $proposal -replace "`r`n", "`n"

if ($proposal -notmatch "const hasCoreProducts = context\.products\.length > 0") {
  $proposal = $proposal.Replace(
    '  const proposal = useMemo(',
@'
  const hasCoreProducts = context.products.length > 0;
  const readinessLabel = !hasCoreProducts
    ? "Not proposal ready"
    : salesReadiness.reviewRequired
      ? "Review required"
      : "Proposal draft readiness";
  const readinessMessage = !hasCoreProducts
    ? "Discovery is saved, but no WyreStorm core products have been selected. Open Product Finder and add the recommended product path before export."
    : salesReadiness.reviewRequired
      ? "Resolve validate items before this is treated as customer-ready."
      : "Suitable for proposal drafting after final validation checks.";

  const proposal = useMemo(
'@
  )
}

$proposal = [regex]::Replace(
  $proposal,
  'salesReadiness\.reviewRequired\s*\?\s*"border-amber-200 bg-amber-50 text-amber-950"\s*:\s*"border-emerald-200 bg-emerald-50 text-emerald-950"',
@'
!hasCoreProducts
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : salesReadiness.reviewRequired
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950"
'@
)

$proposal = [regex]::Replace(
  $proposal,
  '\{salesReadiness\.reviewRequired \? "Review required" : "Proposal draft readiness"\}',
  '{readinessLabel}'
)

$proposal = [regex]::Replace(
  $proposal,
  '\{salesReadiness\.reviewRequired\s*\?\s*"Resolve validate items before this is treated as customer-ready\."\s*:\s*"Suitable for proposal drafting after final validation checks\."\}',
  '{readinessMessage}'
)

$proposal = [regex]::Replace(
  $proposal,
  'No product shortlist has been carried into the proposal yet\. Add products from Finder before customer export\.',
  'No WyreStorm product has been selected yet. Open Product Finder, choose the core product path, and add it to this project before exporting a customer proposal.'
)

$proposal = [regex]::Replace(
  $proposal,
  'No WyreStorm BOM items are selected yet\.?',
  'No WyreStorm BOM items are selected yet. Open Product Finder and add the required products before exporting.'
)

if ($proposal -notmatch "Open Product Finder and add the required products before exporting") {
  Write-Host "Warning: empty BOM text was not found. This is safe if it was already changed manually." -ForegroundColor Yellow
}

Save-Utf8NoBom -Path $proposalPath -Content $proposal

Write-Step "Finishing exported proposal warning"

$export = Get-Content -LiteralPath $exportPath -Raw
$export = $export -replace "`r`n", "`n"

if ($export -notmatch "const hasCoreProducts = proposal\.products\.length > 0") {
  $export = $export.Replace(
    '  const assumptions = proposal.assumptions.length',
@'
  const hasCoreProducts = proposal.products.length > 0;
  const readinessNotice = hasCoreProducts
    ? "This proposal draft includes selected WyreStorm products. Validate final product specifications, accessories and dependencies before issue."
    : "This export is a discovery/design brief only. No WyreStorm core products have been selected, so it must not be issued as a customer BOM.";

  const assumptions = proposal.assumptions.length
'@
  )
}

if ($export -notmatch "readinessNotice") {
  throw "Could not add readinessNotice to proposal export."
}

if ($export -notmatch '\$\{escapeHtml\(readinessNotice\)\}') {
  $export = $export.Replace(
    '<div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>',
    '<div class="notice">${escapeHtml(readinessNotice)}</div>' + "`n" + '  <div class="notice">Competitor products are excluded from this proposal and BOM unless a comparison-only output is explicitly requested.</div>'
  )
}

Save-Utf8NoBom -Path $exportPath -Content $export

Write-Step "Running validation"

npm run typecheck
npm run build

Write-Host ""
Write-Host "Proposal readiness repair finished." -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:"
Write-Host "- No selected products = Not proposal ready"
Write-Host "- Low readiness score"
Write-Host "- Product Finder is the next action"
Write-Host "- Empty/TBC-only BOM should not appear customer-ready"