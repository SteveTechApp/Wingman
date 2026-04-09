Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

$routesPath = "src\AppRoutes.tsx"
$reportPath = "C:\Users\steve\wingman\_AUDITS\wingman-feature-audit.txt"

$routesRaw = Get-Content $routesPath -Raw

function Test-RouteDeclaration {
  param(
    [string]$Route
  )

  $patterns = New-Object System.Collections.Generic.List[string]
  $patterns.Add(('path\s*=\s*"{0}"' -f [regex]::Escape($Route)))

  if ($Route.StartsWith("/app/")) {
    $relativeRoute = $Route.Substring(5)
    $patterns.Add(('path\s*=\s*"{0}"' -f [regex]::Escape($relativeRoute)))
  }

  foreach ($pattern in $patterns) {
    if ($routesRaw -match $pattern) {
      return $true
    }
  }

  return $false
}

$expected = @(
  @{ Name = "PublicLandingPage"; File = "src\pages\PublicLandingPage.tsx"; Route = "/" },
  @{ Name = "LoginPage"; File = "src\pages\LoginPage.tsx"; Route = "/login" },
  @{ Name = "SignupPage"; File = "src\pages\SignupPage.tsx"; Route = "/signup" },
  @{ Name = "InviteAcceptancePage"; File = "src\pages\InviteAcceptancePage.tsx"; Route = "/invite" },
  @{ Name = "DashboardPage"; File = "src\features\dashboard\DashboardPage.tsx"; Route = "/app/dashboard" },
  @{ Name = "ProjectsPage"; File = "src\features\projects\ProjectsPage.tsx"; Route = "/app/projects" },
  @{ Name = "ProjectNewPage"; File = "src\features\projects\ProjectNewPage.tsx"; Route = "/app/projects/new" },
  @{ Name = "ProjectOverviewPage"; File = "src\pages\ProjectOverviewPage.tsx"; Route = "/app/projects/:id" },
  @{ Name = "ToolHubPage"; File = "src\features\tools\ToolHubPage.tsx"; Route = "/app/tools" },
  @{ Name = "AvNavigatorPage"; File = "src\features\navigator\AvNavigatorPage.tsx"; Route = "/app/tools/navigator" },
  @{ Name = "DiscoveryWizardPage"; File = "src\features\discovery\DiscoveryWizardPage.tsx"; Route = "/app/tools/discovery" },
  @{ Name = "CatalogPage"; File = "src\features\catalog\CatalogPage.tsx"; Route = "/app/tools/catalog" },
  @{ Name = "CompetitorComparePage"; File = "src\features\compare\CompetitorComparePage.tsx"; Route = "/app/tools/compare" },
  @{ Name = "GuruToolHostPage"; File = "src\features\ai\guru\GuruToolHostPage.tsx"; Route = "/app/tools/guru" },
  @{ Name = "SalesPositioningPage"; File = "src\features\sales\SalesPositioningPage.tsx"; Route = "/app/tools/sales" },
  @{ Name = "RoomWizardPage"; File = "src\features\room-wizard\RoomWizardPage.tsx"; Route = "/app/tools/room-wizard" },
  @{ Name = "ProposalBuilderPage"; File = "src\features\proposal\ProposalPage.tsx"; Route = "/app/tools/proposal" },
  @{ Name = "ImportIntakePage"; File = "src\features\import\ImportIntakePage.tsx"; Route = "/app/tools/import-intake" },
  @{ Name = "TrainingHubPage"; File = "src\features\training\TrainingHubPage.tsx"; Route = "/app/tools/training" },
  @{ Name = "VideoWallPlannerRebuild"; File = "src\features\misc\videoWall\VideoWallPlannerRebuild.tsx"; Route = "/app/tools/video-wall" },
  @{ Name = "TemplatesPage"; File = "src\features\templates\TemplatesPage.tsx"; Route = "/app/tools/templates" },
  @{ Name = "ProductIntelligencePage"; File = "src\features\support\ProductIntelligencePage.tsx"; Route = "/app/tools/product-intelligence" },
  @{ Name = "CompetitorLookupDiagnosticsPage"; File = "src\features\support\CompetitorLookupDiagnosticsPage.tsx"; Route = "/app/tools/competitor-lookup-diagnostics" }
)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Wingman Feature Audit")
$lines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$lines.Add("")
$lines.Add("Route coverage")
$lines.Add("")

foreach ($item in $expected) {
  $exists = Test-Path $item.File
  $routeFound = Test-RouteDeclaration -Route $item.Route
  $nameFound = $routesRaw.Contains($item.Name)

  $status = "MISSING"
  if ($exists -and $routeFound -and $nameFound) {
    $status = "WIRED"
  }

  if ($exists -and (-not $routeFound -or -not $nameFound)) {
    $status = "EXISTS_NOT_FULLY_WIRED"
  }

  $lines.Add(("{0} | {1} | {2}" -f $status.PadRight(24), $item.Route.PadRight(42), $item.File))
}

$supportFiles = @(
  "src\core\wingman\featureTone\FeatureToneBridge.tsx",
  "src\styles\wm-feature-glow.css",
  "src\styles\wm-feature-glow-authority.css",
  "src\styles\wm-feature-glow-system.css",
  "src\app\navigation\TopBar.tsx",
  "src\ui2\nav\MissionControlNav.tsx"
)

$legacyCandidates = @(
  "src\features\dashboard\dashboardAdaptive.ts",
  "src\features\discovery\discoveryAutoRoute.ts",
  "src\features\projects\wingmanProjectTags.ts",
  "src\features\templates\templateAutoRoute.ts",
  "src\features\ai\guru\GuruPanel.tsx",
  "src\styles\wm-feature-tab-authority.css",
  "src\styles\wm-global-density-scale.css",
  "src\styles\wm-dark-page-authority.css",
  "src\styles\wm-topbar.css"
)

$lines.Add("")
$lines.Add("Feature support files")
$lines.Add("")

foreach ($item in $supportFiles) {
  $state = "NOT_PRESENT"
  if (Test-Path $item) {
    $state = "PRESENT"
  }
  $lines.Add(("{0} | {1}" -f $state.PadRight(24), $item))
}

$lines.Add("")
$lines.Add("Legacy candidate files from earlier audit pass")
$lines.Add("")

foreach ($item in $legacyCandidates) {
  $state = "NOT_PRESENT"
  if (Test-Path $item) {
    $state = "PRESENT_NOT_CONFIRMED_ACTIVE"
  }
  $lines.Add(("{0} | {1}" -f $state.PadRight(30), $item))
}

$lines.Add("")
$lines.Add("Audit note: nested /app routes are treated as valid when declared relative to the /app parent route in AppRoutes.tsx.")

$reportDir = Split-Path $reportPath -Parent
if (-not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($reportPath, $lines, $utf8)

Write-Host "Audit written to $reportPath" -ForegroundColor Green
