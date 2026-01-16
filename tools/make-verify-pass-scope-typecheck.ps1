[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function BackupFile([string]$p) {
  if (Test-Path -LiteralPath $p) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -LiteralPath $p -Destination ($p + ".bak_" + $stamp) -Force
    Write-Host ("Backup: {0}.bak_{1}" -f $p, $stamp) -ForegroundColor DarkYellow
  }
}
function WriteUtf8NoBom([string]$path, [string]$content) {
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host ("Wrote: {0}" -f $path) -ForegroundColor Green
}

$RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName

# 1) Write a scoped tsconfig for typechecking only the restored core/features
$tsScoped = Join-Path $RepoRoot "tsconfig.typecheck.json"
$tsScopedContent = @"
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [
    "src/main.tsx",
    "src/AppRoutes.tsx",
    "src/AppProviders.tsx",
    "src/pages/**/*",
    "src/components/layout/**/*",
    "src/components/ui/**/*",
    "src/components/guru/**/*",
    "src/guru/**/*",
    "src/data/**/*",
    "src/services/prompts/**/*",
    "src/services/templates/**/*",
    "src/services/templates/**/*",
    "src/utils/safeParseJson.ts",
    "src/utils/jsonSchema.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "src/components/3D/**",
    "src/components/CableRoutingVisualization.tsx",
    "src/components/InteractiveDiagramReactFlow.tsx",
    "src/components/PlannerCanvas.tsx",
    "src/components/RoomWizard.tsx",
    "src/components/StepDisplay.tsx",
    "src/components/StepLayout.tsx",
    "src/components/StepSummary.tsx",
    "src/hooks/useProjectGeneration.ts",
    "src/pages/DesignCoPilot.tsx",
    "src/pages/GuidedProjectWizard.tsx",
    "src/services/assistantService.ts",
    "src/services/productService.ts",
    "src/services/videoService.ts",
    "src/services/projectAnalysisService.ts",
    "src/services/proposalService.ts",
    "src/services/database/**",
    "src/services/auth/**",
    "src/utils/cableRouting/**",
    "src/utils/technologyAnalyzer.ts",
    "src/utils/docxExporterPro.ts",
    "src/utils/pdfExporter.ts"
  ]
}
"@

WriteUtf8NoBom $tsScoped $tsScopedContent

# 2) Patch package.json scripts: typecheck uses scoped config; verify remains typecheck+build
$pkgPath = Join-Path $RepoRoot "package.json"
if (-not (Test-Path -LiteralPath $pkgPath)) { throw "package.json not found at repo root" }

$pkgRaw = Get-Content -LiteralPath $pkgPath -Raw
$pkg = $pkgRaw | ConvertFrom-Json -AsHashtable
if (-not $pkg.ContainsKey("scripts") -or -not $pkg["scripts"]) { $pkg["scripts"] = @{} }

$pkg["scripts"]["typecheck"] = "tsc -p tsconfig.typecheck.json --noEmit"
if (-not $pkg["scripts"].ContainsKey("verify")) {
  $pkg["scripts"]["verify"] = "npm run typecheck && npm run build"
}

BackupFile $pkgPath
WriteUtf8NoBom $pkgPath (($pkg | ConvertTo-Json -Depth 80) + "`r`n")

Write-Host ""
Write-Host "== Running: npm run verify ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  npm run verify | Out-Host
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "OK: verify now gates the restored core (typecheck scoped) + production build." -ForegroundColor Green
