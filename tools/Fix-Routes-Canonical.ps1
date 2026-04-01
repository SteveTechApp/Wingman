Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory=$true)][string]$RelativePath,
    [Parameter(Mandatory=$true)][string]$Content
  )

  $root = (Get-Location).Path
  $full = Join-Path $root $RelativePath
  $dir = Split-Path $full -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescue = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescue)) {
    New-Item -ItemType Directory -Force -Path $rescue | Out-Null
  }

  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $full (Join-Path $rescue "$safe.$stamp.bak") -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full, $Content, $utf8)
  Write-Host "Written: $RelativePath" -ForegroundColor Green
}

$routeMap = @'
export const routeMap = {
  public: {
    landing: "/",
    login: "/login",
    signup: "/signup",
  },
  app: {
    dashboard: "/app/dashboard",
    projects: "/app/projects",
    projectNew: "/app/projects/new",

    tools: "/app/tools",
    discovery: "/app/tools/discovery",
    catalog: "/app/tools/catalog",
    catalogue: "/app/tools/catalog",
    proposal: "/app/tools/proposal",
    navigator: "/app/tools/navigator",
    compare: "/app/tools/compare",
    training: "/app/tools/training",
    templates: "/app/tools/templates",
    importIntake: "/app/tools/import-intake",
    videoWall: "/app/tools/video-wall",
    guru: "/app/tools/guru",
    sales: "/app/tools/sales",
    productIntelligence: "/app/tools/product-intelligence",
  },
} as const;

export type RouteMap = typeof routeMap;

export type AppRouteValue =
  | (typeof routeMap.public)[keyof typeof routeMap.public]
  | (typeof routeMap.app)[keyof typeof routeMap.app];

const legacyRouteRedirects: Record<string, AppRouteValue> = {
  "/wingman/dashboard": routeMap.app.dashboard,
  "/wingman/projects": routeMap.app.projects,
  "/wingman/tools": routeMap.app.tools,
  "/wingman/discovery": routeMap.app.discovery,
  "/wingman/catalog": routeMap.app.catalog,
  "/wingman/catalogue": routeMap.app.catalog,
  "/wingman/proposal": routeMap.app.proposal,
  "/wingman/navigator": routeMap.app.navigator,
  "/wingman/compare": routeMap.app.compare,
  "/wingman/training": routeMap.app.training,
  "/wingman/templates": routeMap.app.templates,
  "/wingman/import-intake": routeMap.app.importIntake,
  "/wingman/video-wall": routeMap.app.videoWall,
  "/wingman/guru": routeMap.app.guru,
  "/wingman/sales": routeMap.app.sales,
  "/wingman/product-intelligence": routeMap.app.productIntelligence,
};

export function normalizeAppRoute(input?: string | null): AppRouteValue {
  if (!input) return routeMap.app.dashboard;

  if (input in legacyRouteRedirects) {
    return legacyRouteRedirects[input];
  }

  const allRoutes = [
    ...Object.values(routeMap.public),
    ...Object.values(routeMap.app),
  ];

  if (allRoutes.includes(input as AppRouteValue)) {
    return input as AppRouteValue;
  }

  return routeMap.app.dashboard;
}
'@

Save-Utf8NoBom -RelativePath "src\core\wingman\routeMap.ts" -Content $routeMap