Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "C:\Users\steve\wingman"

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
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $rescueDir = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescueDir)) {
    New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $leaf = Split-Path $Path -Leaf
  $dest = Join-Path $rescueDir "$stamp-$leaf.bak"
  Copy-Item $Path $dest -Force
  Write-Host "Backup created: $dest"
}

# ------------------------------------------------------------
# 1. Create shell polish stylesheet
# ------------------------------------------------------------
$cssPath = Join-Path $root "src\styles\wm-shell-polish-pass.css"

$cssContent = @'
:root {
  --wm-shell-bg: linear-gradient(180deg, #07111d 0%, #0b1726 100%);
  --wm-shell-panel: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.78));
  --wm-shell-soft: rgba(255, 255, 255, 0.04);
  --wm-shell-border: rgba(148, 163, 184, 0.14);
  --wm-shell-border-strong: rgba(96, 165, 250, 0.24);
  --wm-shell-text: #f8fbff;
  --wm-shell-text-soft: rgba(226, 232, 240, 0.76);
  --wm-shell-blue: #93c5fd;
  --wm-shell-radius-lg: 20px;
  --wm-shell-radius-md: 14px;
  --wm-shell-shadow-lg: 0 18px 36px rgba(2, 8, 23, 0.16);
  --wm-shell-shadow-md: 0 12px 24px rgba(2, 8, 23, 0.12);
}

html, body, #root {
  min-height: 100%;
}

body {
  background: var(--wm-shell-bg);
}

.wm-shell-root,
.wm-app-shell,
.wm-page,
.wm-fit-page {
  color: var(--wm-shell-text);
}

.wm-shell-root {
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.10), transparent 22%),
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.08), transparent 18%),
    var(--wm-shell-bg);
}

.wm-topbar,
header.wm-topbar {
  min-height: 92px !important;
  height: 92px !important;
  padding: 0 22px !important;
  background:
    linear-gradient(180deg, rgba(5, 17, 31, 0.98), rgba(8, 20, 36, 0.92)) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
  box-shadow: 0 10px 26px rgba(2, 8, 23, 0.18);
  backdrop-filter: blur(10px);
}

.wm-topbar img {
  height: 72px !important;
  max-height: 72px !important;
}

.wm-nav,
.wm-shell-content > nav,
.wm-shell-content aside,
.wm-shell-content > div:first-child {
  background:
    linear-gradient(180deg, rgba(9, 18, 33, 0.96), rgba(11, 22, 39, 0.90)) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.wm-nav {
  padding: 18px 14px;
  display: grid;
  gap: 16px;
}

.wm-nav__section {
  display: grid;
  gap: 8px;
}

.wm-nav__title {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--wm-shell-blue);
  opacity: 0.95;
  padding: 0 8px;
}

.wm-nav__items {
  display: grid;
  gap: 6px;
}

.wm-nav__item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--wm-shell-text-soft);
  font-weight: 700;
  text-align: left;
  transition: all 120ms ease;
}

.wm-nav__item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(148, 163, 184, 0.10);
  transform: translateY(-1px);
}

.wm-nav__item--active {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.22), rgba(14, 165, 233, 0.10));
  border-color: rgba(96, 165, 250, 0.28);
  box-shadow: 0 8px 18px rgba(30, 64, 175, 0.14);
}

.wm-fit-page,
.wm-page {
  padding-bottom: 24px;
}

.wm-fit-page__hero,
.wm-surface-card,
.wm-work-card,
.wm-product-card,
.wm-section,
.wm-hero {
  border-radius: var(--wm-shell-radius-lg);
  border: 1px solid var(--wm-shell-border);
  background: var(--wm-shell-panel);
  box-shadow: var(--wm-shell-shadow-md);
}

.wm-surface-card--soft {
  border-radius: var(--wm-shell-radius-md);
  border: 1px solid rgba(148, 163, 184, 0.10);
  background: var(--wm-shell-soft);
}

.wm-fit-page__hero,
.wm-section,
.wm-hero {
  padding: 20px;
}

.wm-page-kicker,
.wm-kicker,
.wm-product-card__sku,
.wm-section-title {
  color: var(--wm-shell-blue);
}

.wm-page-title,
.wm-title-xl {
  font-size: clamp(1.8rem, 2.5vw, 2.5rem);
  line-height: 1.02;
  font-weight: 900;
  color: #ffffff;
}

.wm-page-copy,
.wm-body,
.wm-body-sm,
.wm-product-card__copy {
  color: var(--wm-shell-text-soft);
  line-height: 1.55;
}

.wm-section-title,
.wm-product-card__title {
  font-weight: 800;
  color: #ffffff;
}

.wm-toolbar-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.wm-chip,
.wm-btn,
.wm-btn-primary,
.wm-btn-secondary,
.wm-pill-button {
  border-radius: 12px;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.wm-chip,
.wm-btn-secondary,
.wm-btn,
.wm-pill-button {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #ffffff;
}

.wm-chip,
.wm-pill-button {
  padding: 8px 12px;
  font-weight: 700;
}

.wm-btn,
.wm-btn-secondary,
.wm-btn-primary {
  padding: 10px 14px;
  font-weight: 800;
}

.wm-btn-primary,
.wm-pill-button--active {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.92), rgba(29, 78, 216, 0.94));
  border-color: rgba(96, 165, 250, 0.26);
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(29, 78, 216, 0.16);
}

.wm-chip--active {
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.22), rgba(14, 165, 233, 0.10));
  border-color: rgba(96, 165, 250, 0.28);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(30, 64, 175, 0.12);
}

.wm-chip:hover,
.wm-btn:hover,
.wm-btn-primary:hover,
.wm-btn-secondary:hover,
.wm-pill-button:hover {
  transform: translateY(-1px);
}

.wm-input-dark,
.wm-select-dark,
.wm-textarea-dark,
.wm-input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 8, 23, 0.42);
  color: #ffffff;
  padding: 10px 12px;
  outline: none;
}

.wm-input-dark:focus,
.wm-select-dark:focus,
.wm-textarea-dark:focus,
.wm-input:focus {
  border-color: var(--wm-shell-border-strong);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.wm-grid-cards,
.wm-grid-3,
.wm-grid-2,
.wm-split-columns {
  gap: 16px;
}

.wm-bom-grid {
  display: grid;
  gap: 10px;
}

.wm-bom-row {
  display: grid;
  grid-template-columns: 180px 80px 140px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.10);
  align-items: start;
}

.wm-projects-page__row,
.wm-dashboard-empty,
.wm-summary-row {
  border-radius: 14px;
}

@media (max-width: 1100px) {
  .wm-fit-page__hero,
  .wm-grid-2,
  .wm-split-columns {
    grid-template-columns: 1fr !important;
  }

  .wm-bom-row {
    grid-template-columns: 1fr;
  }

  .wm-topbar,
  header.wm-topbar {
    min-height: 84px !important;
    height: 84px !important;
  }

  .wm-topbar img {
    height: 62px !important;
    max-height: 62px !important;
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $cssContent

# ------------------------------------------------------------
# 2. Import stylesheet in main.tsx
# ------------------------------------------------------------
$mainPath = Join-Path $root "src\main.tsx"
if (Test-Path $mainPath) {
  Backup-File -Path $mainPath
  $mainContent = Get-Content $mainPath -Raw

  if ($mainContent -notmatch 'wm-shell-polish-pass\.css') {
    if ($mainContent -match 'import\s+"\.\/styles\/app\.css";') {
      $mainContent = $mainContent -replace 'import\s+"\.\/styles\/app\.css";', @'
import "./styles/app.css";
import "./styles/wm-shell-polish-pass.css";
'@
    }
    elseif ($mainContent -match "import './styles/app\.css';") {
      $mainContent = $mainContent -replace "import './styles/app\.css';", @"
import './styles/app.css';
import './styles/wm-shell-polish-pass.css';
"@
    } else {
      throw "Could not find app.css import in src\main.tsx"
    }

    Save-Utf8NoBom -Path $mainPath -Content $mainContent
  }
}

# ------------------------------------------------------------
# 3. Sales intelligence helper
# ------------------------------------------------------------
$logicPath = Join-Path $root "src\app\logic\wingmanSalesIntelligence.ts"

$logicContent = @'
import type { WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";
import type { WingmanTier } from "@/app/logic/wingmanBomBuilder";

export type WingmanSalesIntelligence = {
  whyThisSolution: string[];
  whyThisTier: string[];
  whyWyreStorm: string[];
  confirmBeforeQuote: string[];
  upsellPath: string[];
};

export function buildWingmanSalesIntelligence(
  snapshot: WingmanActiveProjectSnapshot,
  tier: WingmanTier
): WingmanSalesIntelligence {
  const d = snapshot.project.discovery;
  const architecture = snapshot.decision.architecture;

  const whyThisSolution: string[] = [];
  const whyThisTier: string[] = [];
  const whyWyreStorm: string[] = [];
  const confirmBeforeQuote: string[] = [];
  const upsellPath: string[] = [];

  if (architecture.includes("AV over IP")) {
    whyThisSolution.push("Flexible routing is justified because the application is no longer a simple fixed room.");
    whyThisSolution.push("AVoIP supports future growth, display expansion and more adaptable signal distribution.");
    if (d.videoWall || d.advancedMultiview) {
      whyThisSolution.push("The application benefits from scalable distribution for video wall or multiview behaviour.");
    }
    whyWyreStorm.push("WyreStorm provides a practical AVoIP path without forcing unnecessary enterprise complexity.");
    whyWyreStorm.push("NetworkHD supports strong image quality, scalability and commercial practicality.");
    confirmBeforeQuote.push("Confirm managed network readiness and whether an AV VLAN is available.");
  }

  if (architecture.includes("Video Wall")) {
    whyThisSolution.push("The design is being driven by the display canvas and content behaviour, not just source switching.");
    whyWyreStorm.push("WyreStorm supports both processor-led and more scalable wall strategies depending on the application.");
    confirmBeforeQuote.push("Confirm wall layout, content format and whether the wall is fixed or dynamically managed.");
  }

  if (architecture.includes("Matrix")) {
    whyThisSolution.push("A matrix-style architecture is more appropriate than AVoIP where routing is structured and predictable.");
    whyThisSolution.push("This keeps the room commercially efficient without overspecifying the system.");
    whyWyreStorm.push("WyreStorm presentation switching products give a strong balance of room features and system simplicity.");
  }

  if (architecture.includes("HDBaseT")) {
    whyThisSolution.push("Distance is materially affecting the design, making structured extension the correct fit.");
    whyWyreStorm.push("WyreStorm offers practical transport options aligned to real installation constraints.");
  }

  if (tier === "Bronze") {
    whyThisTier.push("Bronze keeps the BOM practical and commercially lean for cost-sensitive opportunities.");
    whyThisTier.push("This tier is best where the customer needs reliable function without premium extras.");
    upsellPath.push("Move to Silver when control, collaboration or system completeness become more important.");
  }

  if (tier === "Silver") {
    whyThisTier.push("Silver is the balanced recommendation for most opportunities.");
    whyThisTier.push("It improves usability and completeness without forcing unnecessary cost.");
    upsellPath.push("Move to Gold where flexibility, user experience or future expansion are a stronger priority.");
  }

  if (tier === "Gold") {
    whyThisTier.push("Gold is appropriate where user experience, flexibility and long-term scalability matter.");
    whyThisTier.push("This tier suits premium rooms, advanced workflows and future-ready positioning.");
    upsellPath.push("Gold already reflects the stronger architecture path, so upsell should focus on peripherals and service value.");
  }

  if (d.distanceM && d.distanceM > 30) {
    confirmBeforeQuote.push("Validate the real cable path and infrastructure quality because distance is a material factor.");
  }

  if (d.usbRequired || d.hybridMeeting) {
    whyWyreStorm.push("WyreStorm can keep USB, collaboration and AV switching in a more coherent room story.");
    confirmBeforeQuote.push("Confirm conferencing workflow, USB device needs and user control expectations.");
  }

  if (d.sources >= 4 || d.displays >= 4) {
    confirmBeforeQuote.push("Confirm actual routing behaviour so the architecture is justified by workflow, not just quantity.");
  }

  if (d.futureExpansion) {
    whyThisSolution.push("Future expansion is already part of the project logic, so the recommendation avoids short-term box selling.");
  }

  if (whyWyreStorm.length === 0) {
    whyWyreStorm.push("WyreStorm provides a practical single-vendor path across switching, transport, control and display workflows.");
  }

  return {
    whyThisSolution,
    whyThisTier,
    whyWyreStorm,
    confirmBeforeQuote,
    upsellPath,
  };
}
'@

Save-Utf8NoBom -Path $logicPath -Content $logicContent

Write-Host ""
Write-Host "Installed shell polish pass and sales intelligence foundation."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"