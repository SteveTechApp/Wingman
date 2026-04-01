Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

Write-Host ""
Write-Host "Scanning for hardcoded routes..." -ForegroundColor Cyan

$files = Get-ChildItem -Recurse -Path .\src -File | Where-Object {
  $_.Extension -eq ".ts" -or $_.Extension -eq ".tsx"
}

$matches = @()

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  if ($content -match '"/app/') {
    $matches = @($matches) + @($file.FullName)
  }
}

$matches = $matches | Sort-Object -Unique

if (-not $matches -or $matches.Count -eq 0) {
  Write-Host "No hardcoded routes found." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "Found hardcoded routes in:" -ForegroundColor Yellow
$matches | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Auto-fixing..." -ForegroundColor Cyan

foreach ($filePath in $matches) {
  $text = Get-Content $filePath -Raw

  $text = $text -replace '"/app/dashboard"', 'WM_ROUTES.DASHBOARD'
  $text = $text -replace '"/app/projects/new"', 'WM_ROUTES.PROJECT_NEW'
  $text = $text -replace '"/app/projects"', 'WM_ROUTES.PROJECTS'
  $text = $text -replace '"/app/tools/discovery"', 'WM_ROUTES.DISCOVERY'
  $text = $text -replace '"/app/tools/catalog"', 'WM_ROUTES.CATALOG'
  $text = $text -replace '"/app/tools/proposal"', 'WM_ROUTES.PROPOSAL'
  $text = $text -replace '"/app/tools/navigator"', 'WM_ROUTES.NAVIGATOR'
  $text = $text -replace '"/app/tools/compare"', 'WM_ROUTES.COMPARE'
  $text = $text -replace '"/app/tools/training"', 'WM_ROUTES.TRAINING'
  $text = $text -replace '"/app/tools/templates"', 'WM_ROUTES.TEMPLATES'
  $text = $text -replace '"/app/tools/import-intake"', 'WM_ROUTES.IMPORT_INTAKE'
  $text = $text -replace '"/app/tools/video-wall"', 'WM_ROUTES.VIDEO_WALL'
  $text = $text -replace '"/app/tools/guru"', 'WM_ROUTES.GURU'
  $text = $text -replace '"/app/tools/sales"', 'WM_ROUTES.SALES'
  $text = $text -replace '"/app/tools/product-intelligence"', 'WM_ROUTES.PRODUCT_INTELLIGENCE'
  $text = $text -replace '"/app/tools/room-wizard"', 'WM_ROUTES.ROOM_WIZARD'
  $text = $text -replace '"/app/tools"', 'WM_ROUTES.TOOLS'

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($filePath, $text, $utf8)
}

Write-Host ""
Write-Host "Route enforcement complete." -ForegroundColor Green