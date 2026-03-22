Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$target = "C:\Users\steve\wingman\tools\video-wall-next-pass.ps1"

if (-not (Test-Path $target)) {
  throw "Target script not found: $target"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "C:\Users\steve\wingman\_RESCUE\video-wall-next-pass-repair-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $target (Join-Path $backupDir "video-wall-next-pass.ps1.bak") -Force

$content = Get-Content $target -Raw

$fixedBlock = @'
$migrationGuide = @'
# Video Wall Planner - Return Migration

## Objective
Replace the current large return block inside VideoWallPlannerPage.tsx with the shell host block.

## File generated
- src/features/misc/videoWall/VideoWallShellHostBlock.tsx.txt

## Safer migration method

### 1. Open the page
src/features/misc/VideoWallPlannerPage.tsx

### 2. Open the host block
src/features/misc/videoWall/VideoWallShellHostBlock.tsx.txt

### 3. Replace only the main JSX return
Find the existing return ( for the main page component and replace that return block with the contents of the host block file.

### 4. Add the data-mapping constants above the return

const recommendedSolutionTitle = recommendation?.title ?? "Recommended video wall solution";
const recommendedSolutionSummary =
  recommendation?.summary ??
  "Wingman has selected the best-fit wall architecture based on scale, source flexibility and deployment intent.";

const recommendationReasons =
  recommendation?.reasons?.length
    ? recommendation.reasons
    : [
        `${rows}x${cols} wall format selected`,
        `${sourceCount} source${sourceCount === 1 ? "" : "s"} in scope`,
        "Architecture selected for fit, scalability and deployment simplicity",
      ];

const systemTypeLabel = recommendation?.architectureLabel ?? "AV architecture";
const complexityLabel = recommendation?.complexityLabel ?? "Medium";
const costBandLabel = recommendation?.costBandLabel ?? "Mid-range";
const useCaseLabel = recommendation?.useCaseLabel ?? "Corporate / signage";

const architectureAlternatives =
  recommendation?.alternatives?.length
    ? recommendation.alternatives
    : [
        {
          title: "Processor-based wall",
          summary: "Best for fixed-format deployments where full AVoIP flexibility is not required.",
        },
        {
          title: "Matrix-based distribution",
          summary: "Suitable for simpler systems, but less scalable for larger multi-source wall designs.",
        },
      ];

const previewTitle = `${rows} x ${cols} ${wallType === "led" ? "LED" : "LCD"} wall`;
const previewSubtitle = `${systemTypeLabel} • ${useCaseLabel}`;

## Section mapping

### renderWallFormatControls()
Move:
- wall type buttons
- rows / cols selectors
- bezel settings
- display size / preset controls

### renderContentControls()
Move:
- source count
- source profile
- multiview toggles
- content mode choices

### renderPerformanceControls()
Move:
- resolution selectors
- latency preference
- architecture preference
- wall strategy / addressed wall settings

### renderAdvancedControls()
Move:
- bandwidth modes
- detailed source device settings
- decoder / processor detail
- network assumptions

### renderWallPreview()
Move:
- the existing visual wall diagram
- the output tile grid
- any existing preview canvas or positioned outputs

### renderOverviewTab()
Move:
- recommendation summary cards
- system fit
- capability fit
- constraints / notes

### renderBomTab()
Move:
- starter BOM
- quantity lines
- accessories
- supporting hardware

### renderSignalTab()
Move:
- signal architecture explanation
- source-to-output strategy
- route / processor explanation

### renderTechnicalTab()
Move:
- engineering detail
- advanced assumptions
- technical caveats
- deployment notes

## After migration
Run:

npm run typecheck

## Best fix pattern
If a helper uses state from the page component, keep it as a nested function inside VideoWallPlannerPage.
'@
'@

$pattern = "(?ms)^\$migrationGuide\s*=\s*@'.*?(?=^\s*Save-Utf8NoBom\s+-Path\s+\$hostBlockPath)"

if ([regex]::IsMatch($content, $pattern)) {
  $content = [regex]::Replace($content, $pattern, $fixedBlock + "`r`n", 1)
} else {
  throw "Could not locate the broken `$migrationGuide block automatically."
}

Save-Utf8NoBom -Path $target -Content $content

Write-Host ""
Write-Host "Repair complete."
Write-Host "Backup saved to: $backupDir"
Write-Host "Fixed script: $target"
Write-Host ""
Write-Host "Now run:"
Write-Host "  .\tools\video-wall-next-pass.ps1"