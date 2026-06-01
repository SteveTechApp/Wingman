#requires -version 5.1
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==> Installing Wingman runtime density controller" -ForegroundColor Cyan
Write-Host ""

$Root = Get-Location
$PackageJson = Join-Path $Root "package.json"

if (!(Test-Path $PackageJson)) {
    Write-Host "ERROR: package.json was not found. Run this from the Wingman project root." -ForegroundColor Red
    exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root "backups\runtime-density-controller-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Backup-File {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    if (!(Test-Path $Path)) {
        return
    }

    $resolved = Resolve-Path $Path
    $relative = $resolved.Path.Substring($Root.Path.Length).TrimStart('\')
    $backupPath = Join-Path $BackupDir $relative
    $backupFolder = Split-Path $backupPath -Parent

    New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
    Copy-Item -Path $Path -Destination $backupPath -Force
}

function Save-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $folder = Split-Path $Path -Parent
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Backup-File -Path $Path

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Save-Utf8NoBomNoBackup {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Content
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Append-TextIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Needle,

        [Parameter(Mandatory = $true)]
        [string] $AppendText
    )

    if (!(Test-Path $Path)) {
        return
    }

    $content = Get-Content -Path $Path -Raw

    if ($content.Contains($Needle)) {
        Write-Host "Runtime density CSS already installed." -ForegroundColor DarkGray
        return
    }

    Backup-File -Path $Path

    $updated = $content.TrimEnd() + "`r`n`r`n" + $AppendText.Trim() + "`r`n"
    Save-Utf8NoBomNoBackup -Path $Path -Content $updated
}

$ControllerPath = Join-Path $Root "src\wingman2\components\WingmanRuntimeDensityController.tsx"
$MainPath = Join-Path $Root "src\main.tsx"

if (!(Test-Path $MainPath)) {
    Write-Host "ERROR: src\main.tsx was not found." -ForegroundColor Red
    exit 1
}

Write-Host "==> Writing runtime density controller" -ForegroundColor Cyan

Save-Utf8NoBom -Path $ControllerPath -Content @'
import { useEffect } from "react";

function setImportant(element: HTMLElement, property: string, value: string): void {
  element.style.setProperty(property, value, "important");
}

function isInsideSidebar(element: Element): boolean {
  return Boolean(
    element.closest("aside") ||
      element.closest("nav[aria-label*='navigation' i]") ||
      element.closest("[class*='sidebar' i]")
  );
}

function findUsefulPanel(start: HTMLElement): HTMLElement {
  let current: HTMLElement | null = start;
  let best = start;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || current === document.body) {
      break;
    }

    const rect = current.getBoundingClientRect();

    if (rect.width > 520 && rect.height > 70 && !isInsideSidebar(current)) {
      best = current;
    }

    current = current.parentElement;
  }

  return best;
}

function markHeroPanels(): void {
  const headings = Array.from(document.querySelectorAll("h1")) as HTMLElement[];

  headings.forEach((heading) => {
    if (isInsideSidebar(heading)) {
      return;
    }

    const text = heading.textContent?.trim().toLowerCase() ?? "";

    if (!text) {
      return;
    }

    const looksLikeWingmanHero =
      text.includes("choose a room template") ||
      text.includes("opportunity navigator") ||
      text.includes("find the right") ||
      text.includes("proposal") ||
      text.includes("competitor") ||
      text.includes("video wall") ||
      text.includes("product pitch") ||
      text.includes("visual studio") ||
      text.includes("discovery");

    if (!looksLikeWingmanHero) {
      return;
    }

    const panel = findUsefulPanel(heading);
    panel.classList.add("wm-runtime-hero-compact");

    setImportant(panel, "min-height", "0");
    setImportant(panel, "max-height", "88px");
    setImportant(panel, "padding", "12px 18px");
    setImportant(panel, "margin-top", "6px");
    setImportant(panel, "margin-bottom", "10px");
    setImportant(panel, "overflow", "hidden");
    setImportant(panel, "border-radius", "18px");

    setImportant(heading, "font-size", "clamp(1.45rem, 2.15vw, 2.25rem)");
    setImportant(heading, "line-height", "0.98");
    setImportant(heading, "margin", "0");

    const paragraphs = Array.from(panel.querySelectorAll("p")) as HTMLElement[];
    paragraphs.forEach((paragraph) => {
      setImportant(paragraph, "display", "none");
    });
  });
}

function markWorkspacePanels(): void {
  const candidates = Array.from(document.querySelectorAll("h1,h2,h3,p,span")) as HTMLElement[];

  candidates.forEach((candidate) => {
    if (isInsideSidebar(candidate)) {
      return;
    }

    const text = candidate.textContent?.trim().toLowerCase() ?? "";

    const looksLikeWorkspace =
      text.includes("wingman workspace") ||
      text === "choose a room template" ||
      text === "guided product finder" ||
      text.includes("all templates") ||
      text.includes("search templates");

    if (!looksLikeWorkspace) {
      return;
    }

    const panel = findUsefulPanel(candidate);
    panel.classList.add("wm-runtime-workspace-compact");

    setImportant(panel, "margin-top", "8px");
    setImportant(panel, "padding", "10px");
    setImportant(panel, "border-radius", "18px");
    setImportant(panel, "min-height", "calc(100vh - 292px)");
  });
}

function releaseTemplateResultArea(): void {
  const path = window.location.pathname.toLowerCase();

  if (!path.includes("/wingman/templates")) {
    return;
  }

  document.body.classList.add("wm-runtime-template-density");

  const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];
  const searchInput = inputs.find((input) => {
    const placeholder = input.placeholder.toLowerCase();
    return placeholder.includes("search") && placeholder.includes("template");
  });

  if (!searchInput) {
    return;
  }

  setImportant(searchInput, "height", "30px");
  setImportant(searchInput, "min-height", "30px");
  setImportant(searchInput, "padding-top", "4px");
  setImportant(searchInput, "padding-bottom", "4px");

  const searchPanel = findUsefulPanel(searchInput);
  searchPanel.classList.add("wm-runtime-template-panel");
  setImportant(searchPanel, "min-height", "calc(100vh - 300px)");
  setImportant(searchPanel, "max-height", "none");
  setImportant(searchPanel, "overflow", "visible");

  const descendants = Array.from(searchPanel.querySelectorAll("div,section,article")) as HTMLElement[];

  descendants.forEach((element) => {
    const rect = element.getBoundingClientRect();

    if (rect.height > 120 || element.scrollHeight > rect.height + 20) {
      setImportant(element, "max-height", "none");
    }

    const overflowY = window.getComputedStyle(element).overflowY;

    if (overflowY === "auto" || overflowY === "scroll") {
      setImportant(element, "overflow-y", "visible");
    }
  });

  const cards = Array.from(searchPanel.querySelectorAll("article, [class*='card' i], [class*='template' i]")) as HTMLElement[];

  cards.forEach((card) => {
    if (card === searchPanel) {
      return;
    }

    const rect = card.getBoundingClientRect();

    if (rect.width < 220 || rect.height < 80) {
      return;
    }

    card.classList.add("wm-runtime-template-card");
    setImportant(card, "min-height", "0");
    setImportant(card, "border-radius", "14px");
  });

  const images = Array.from(searchPanel.querySelectorAll("img")) as HTMLImageElement[];

  images.forEach((image) => {
    setImportant(image, "max-height", "118px");
    setImportant(image, "object-fit", "cover");
  });
}

function compactSidebar(): void {
  const sidebar = document.querySelector("aside") as HTMLElement | null;

  if (!sidebar) {
    return;
  }

  sidebar.classList.add("wm-runtime-sidebar-compact");

  const navItems = Array.from(sidebar.querySelectorAll("a,button")) as HTMLElement[];

  navItems.forEach((item) => {
    setImportant(item, "min-height", "32px");
    setImportant(item, "padding-top", "6px");
    setImportant(item, "padding-bottom", "6px");
  });

  const images = Array.from(sidebar.querySelectorAll("img")) as HTMLImageElement[];

  images.forEach((image) => {
    setImportant(image, "max-height", "58px");
    setImportant(image, "object-fit", "contain");
  });
}

function applyWingmanRuntimeDensity(): void {
  document.body.classList.add("wm-runtime-density-active");

  markHeroPanels();
  markWorkspacePanels();
  releaseTemplateResultArea();
  compactSidebar();
}

export default function WingmanRuntimeDensityController() {
  useEffect(() => {
    applyWingmanRuntimeDensity();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyWingmanRuntimeDensity);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("resize", applyWingmanRuntimeDensity);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyWingmanRuntimeDensity);
    };
  }, []);

  return null;
}
'@

Write-Host "==> Mounting runtime density controller in src\main.tsx" -ForegroundColor Cyan

Backup-File -Path $MainPath

$main = Get-Content -Path $MainPath -Raw

if (!$main.Contains("WingmanRuntimeDensityController")) {
    $main = 'import WingmanRuntimeDensityController from "./wingman2/components/WingmanRuntimeDensityController";' + "`r`n" + $main
}

if (!$main.Contains("<WingmanRuntimeDensityController />")) {
    if ($main.Contains("<App />")) {
        $main = $main.Replace("<App />", "<>`r`n      <App />`r`n      <WingmanRuntimeDensityController />`r`n    </>")
    }
}

if (!$main.Contains("<WingmanRuntimeDensityController />")) {
    Write-Host "ERROR: Could not automatically mount WingmanRuntimeDensityController in src\main.tsx." -ForegroundColor Red
    Write-Host "Send me the contents of src\main.tsx and I will patch it precisely." -ForegroundColor Yellow
    exit 1
}

Save-Utf8NoBomNoBackup -Path $MainPath -Content $main

Write-Host "==> Adding runtime density CSS" -ForegroundColor Cyan

$CssCandidates = @(
    "src\wingman2\styles\wingman.css",
    "src\wingman2\styles\wingman2.css",
    "src\index.css",
    "src\main.css",
    "src\App.css"
)

$CssPath = $null

foreach ($candidate in $CssCandidates) {
    $full = Join-Path $Root $candidate

    if (Test-Path $full) {
        $CssPath = $full
        break
    }
}

if ($null -eq $CssPath) {
    Write-Host "ERROR: Could not find the active Wingman CSS file." -ForegroundColor Red
    exit 1
}

Append-TextIfMissing -Path $CssPath -Needle "/* WINGMAN RUNTIME DENSITY CONTROLLER START */" -AppendText @'
/* WINGMAN RUNTIME DENSITY CONTROLLER START */

body.wm-runtime-density-active .wm-audience-coaching-panel,
body.wm-runtime-density-active .wm-force-utility-dock,
body.wm-runtime-density-active .wm-header-dock,
body.wm-runtime-density-active .wm-topbar-utility-actions {
  display: none !important;
}

body.wm-runtime-density-active .wm-runtime-hero-compact {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
}

body.wm-runtime-density-active .wm-runtime-hero-compact h1 {
  max-width: 760px !important;
}

body.wm-runtime-density-active .wm-runtime-hero-compact a,
body.wm-runtime-density-active .wm-runtime-hero-compact button {
  min-height: 28px !important;
  padding: 5px 11px !important;
  font-size: 0.74rem !important;
  border-radius: 999px !important;
}

body.wm-runtime-density-active .wm-runtime-hero-compact article {
  min-height: 0 !important;
  padding: 7px 10px !important;
  border-radius: 12px !important;
}

body.wm-runtime-density-active .wm-runtime-workspace-compact {
  width: 100% !important;
}

body.wm-runtime-template-density .wm-runtime-template-panel {
  display: block !important;
}

body.wm-runtime-template-density .wm-runtime-template-panel input {
  margin-bottom: 4px !important;
}

body.wm-runtime-template-density .wm-runtime-template-card {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08) !important;
}

/* On template pages, use more of the available vertical space. */
body.wm-runtime-template-density main {
  padding-bottom: 16px !important;
}

/* Keep the Guru button, but prevent it from blocking the working grid. */
body.wm-runtime-density-active [class*="guru" i],
body.wm-runtime-density-active [class*="Guru"],
body.wm-runtime-density-active button[aria-label*="Guru"],
body.wm-runtime-density-active button[title*="Guru"] {
  z-index: 2400 !important;
}

/* WINGMAN RUNTIME DENSITY CONTROLLER END */
'@

Write-Host ""
Write-Host "==> Running typecheck" -ForegroundColor Cyan
npm run typecheck

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Typecheck failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Running build" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Backups are here:" -ForegroundColor Yellow
    Write-Host $BackupDir -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==> Wingman runtime density controller installed successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Cyan
Write-Host "- Room Templates hero should visibly shrink."
Write-Host "- Workspace panel should use more vertical space."
Write-Host "- Template cards should have more room above the fold."
Write-Host "- Sidebar spacing should tighten slightly."
Write-Host ""
Write-Host "Backups saved to:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""