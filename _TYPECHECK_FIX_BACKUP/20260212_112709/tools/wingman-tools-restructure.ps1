param(
  [switch]$Apply,
  [switch]$DryRun,
  [string]$Root = ".",
  [string]$Src = "src",
  [string]$Reports = "_REPORTS",
  [string]$Stamp = (Get-Date -Format "yyyyMMdd_HHmmss")
)

# Keep this script simple and robust (avoid -f format with JSX braces)
$ErrorActionPreference = "Stop"

function Backup-File([string]$Path) { if (Test-Path $Path) { Copy-Item $Path "$Path.bak_$Stamp" -Force } }
function Ensure-Dir([string]$p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

$srcRoot = Join-Path $Root $Src
if (!(Test-Path $srcRoot)) { throw "Not found: $srcRoot (run from repo root)" }
Ensure-Dir (Join-Path $Root $Reports)

function PageExists([string]$fileName) { Test-Path (Join-Path (Join-Path $srcRoot "pages") $fileName) }

$pages = @{
  "ToolHubPage"="ToolHubPage.tsx"
  "PublicLandingPage"="PublicLandingPage.tsx"
  "NotFoundPage"="NotFoundPage.tsx"
  "DashboardPage"="DashboardPage.tsx"
  "ProjectsPage"="ProjectsPage.tsx"
  "ProjectOverviewPage"="ProjectOverviewPage.tsx"
  "ImportIntakePage"="ImportIntakePage.tsx"
  "ComparisonPage"="ComparisonPage.tsx"
  "CompetitorComparisonPage"="CompetitorComparisonPage.tsx"
  "AnalyticsPage"="AnalyticsPage.tsx"
  "ProposalDisplay"="ProposalDisplay.tsx"
  "TrainingPage"="TrainingPage.tsx"
  "CustomerDiscoveryWizard"="CustomerDiscoveryWizard.tsx"
  "GuidedProjectWizard"="GuidedProjectWizard.tsx"
  "RoomEditorEntry"="RoomEditorEntry.tsx"
  "VideoWallPage"="VideoWallPage.tsx"
  "TemplateBrowserScreen"="TemplateBrowserScreen.tsx"
  "QuickQuestionPage"="QuickQuestionPage.tsx"
  "AgentInputForm"="AgentInputForm.tsx"
  "DesignCoPilot"="DesignCoPilot.tsx"
}

$legacyRedirects = @(
  @{ path="toolhub";            to="/app/toolhub" }
  @{ path="tools";              to="/app/toolhub" }
  @{ path="compare";            to="/app/tools/compare" }
  @{ path="competitor-compare"; to="/app/tools/competitor-compare" }
  @{ path="competitor";         to="/app/tools/competitor-compare" }
  @{ path="dashboard";          to="/app/dashboard" }
  @{ path="projects";           to="/app/projects" }
  @{ path="import";             to="/app/import" }
)

$coreRoutes = @(
  @{ kind="index" }
  @{ kind="redirect"; path="app"; redirect="/app/dashboard" }
  @{ kind="page"; path="app/dashboard"; comp="DashboardPage" }
  @{ kind="page"; path="app/projects"; comp="ProjectsPage" }
  @{ kind="page"; path="app/projects/:id"; comp="ProjectOverviewPage" }
  @{ kind="page"; path="app/import"; comp="ImportIntakePage" }
  @{ kind="page"; path="app/toolhub"; comp="ToolHubPage" }
)

$toolRoutes = @(
  @{ kind="page"; path="app/tools/compare";            comp="ComparisonPage" }
  @{ kind="page"; path="app/tools/competitor-compare"; comp="CompetitorComparisonPage" }
  @{ kind="page"; path="app/tools/analytics";          comp="AnalyticsPage" }
  @{ kind="page"; path="app/tools/proposal";           comp="ProposalDisplay" }
  @{ kind="page"; path="app/tools/training";           comp="TrainingPage" }
  @{ kind="page"; path="app/tools/discovery";          comp="CustomerDiscoveryWizard" }
  @{ kind="page"; path="app/tools/guided-project";     comp="GuidedProjectWizard" }
  @{ kind="page"; path="app/tools/room";               comp="RoomEditorEntry" }
  @{ kind="page"; path="app/tools/videowall";          comp="VideoWallPage" }
  @{ kind="page"; path="app/tools/templates";          comp="TemplateBrowserScreen" }
  @{ kind="page"; path="app/tools/ask";                comp="QuickQuestionPage" }
  @{ kind="page"; path="app/tools/agent";              comp="AgentInputForm" }
  @{ kind="page"; path="app/tools/copilot";            comp="DesignCoPilot" }
)

$appRoutesPath = Join-Path $srcRoot "AppRoutes.tsx"
if (!(Test-Path $appRoutesPath)) { throw "Not found: $appRoutesPath" }

# Lazy imports only for pages that exist
$imports = New-Object System.Collections.Generic.List[string]
function AddLazy([string]$comp) {
  if (!$pages.ContainsKey($comp)) { return }
  $file = $pages[$comp]
  if (!(PageExists $file)) { return }
  $imports.Add("const $comp = lazy(() => import(`"@/pages/$file`"));" ) | Out-Null
}

foreach ($c in @(
  "PublicLandingPage","NotFoundPage","ToolHubPage","DashboardPage","ProjectsPage","ProjectOverviewPage","ImportIntakePage",
  "ComparisonPage","CompetitorComparisonPage","AnalyticsPage","ProposalDisplay","TrainingPage","CustomerDiscoveryWizard",
  "GuidedProjectWizard","RoomEditorEntry","VideoWallPage","TemplateBrowserScreen","QuickQuestionPage","AgentInputForm","DesignCoPilot"
)) { AddLazy $c }

function RouteBlock($r) {
  if ($r.kind -eq "index") {
    if ($pages.ContainsKey("PublicLandingPage") -and (PageExists $pages["PublicLandingPage"])) {
      return '        <Route index element={<PublicLandingPage />} />'
    }
    return '        <Route index element={<Navigate to="/app/dashboard" replace />} />'
  }

  if ($r.kind -eq "redirect") {
    return '        <Route path="' + $r.path + '" element={<Navigate to="' + $r.redirect + '" replace />} />'
  }

  if ($r.kind -eq "page") {
    if ($r.comp -and $pages.ContainsKey($r.comp) -and (PageExists $pages[$r.comp])) {
      return @"
        <Route
          path="$($r.path)"
          element={
            <RequireAuth>
              <$($r.comp) />
            </RequireAuth>
          }
        />
"@.TrimEnd()
    }
  }

  return $null
}

# Build route blocks without -f
$coreLines  = @()
foreach ($r in $coreRoutes) { $b = RouteBlock $r; if ($b) { $coreLines += $b } }

$legacyLines = @()
foreach ($lr in $legacyRedirects) {
  $legacyLines += ('        <Route path="' + $lr.path + '" element={<Navigate to="' + $lr.to + '" replace />} />')
}

$toolLines = @()
foreach ($tr in $toolRoutes) { $b = RouteBlock $tr; if ($b) { $toolLines += $b } }

$importsBlock = ($imports -join "`n")
$coreBlock    = ($coreLines -join "`n")
$legacyBlock  = ($legacyLines -join "`n")
$toolsBlock   = ($toolLines -join "`n")

$router = @"
import React, { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/layout/AppShell";
import RequireAuth from "@/auth/RequireAuth";

$importsBlock

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
$coreBlock

        {/* Legacy redirects */}
$legacyBlock

        {/* Tools */}
$toolsBlock

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
"@

if ($Apply) {
  Backup-File $appRoutesPath
  [System.IO.File]::WriteAllText($appRoutesPath, $router, [System.Text.UTF8Encoding]::new($false))
}

# Rewrite old links to canonical tool routes
$rewrites = [ordered]@{
  "/compare"             = "/app/tools/compare"
  "/competitor-compare"  = "/app/tools/competitor-compare"
  "/competitor"          = "/app/tools/competitor-compare"
  "/tools"               = "/app/toolhub"
  "/toolhub"             = "/app/toolhub"
  "/dashboard"           = "/app/dashboard"
  "/projects"            = "/app/projects"
  "/import"              = "/app/import"
}

$attrPattern = '(?<attr>\b(to|href)\s*=\s*)(?<q>["''])(?<val>[^"'']+)(\k<q>)'
$targets = Get-ChildItem $srcRoot -Recurse -File -Include *.ts,*.tsx

$log = New-Object System.Collections.Generic.List[object]
foreach ($f in $targets) {
  $txt = Get-Content $f.FullName -Raw
  $new = [regex]::Replace($txt, $attrPattern, {
    param($m)
    $attr = $m.Groups["attr"].Value
    $q    = $m.Groups["q"].Value
    $val  = $m.Groups["val"].Value

    if ($val -match '^(https?:|mailto:|tel:|#|//)') { return $m.Value }
    if ($val -match '^\{.*\}$') { return $m.Value }

    if ($rewrites.Contains($val)) {
      $rep = $rewrites[$val]
      if ($rep -ne $val) { $log.Add([pscustomobject]@{ File=$f.FullName; From=$val; To=$rep }) | Out-Null }
      return ($attr + $q + $rep + $q)
    }
    return $m.Value
  })

  if ($new -ne $txt -and $Apply) {
    Backup-File $f.FullName
    [System.IO.File]::WriteAllText($f.FullName, $new, [System.Text.UTF8Encoding]::new($false))
  }
}

$report = Join-Path (Join-Path $Root $Reports) ("tools_restructure_{0}.csv" -f $Stamp)
$log | Export-Csv -NoTypeInformation -Encoding UTF8 $report

Write-Host "Tools restructure complete."
Write-Host "AppRoutes updated: $Apply"
Write-Host "Rewrite changes: $($log.Count)"
Write-Host "Report: $report"
if ($DryRun -and $log.Count -gt 0) { $log | Select-Object -First 30 | Format-Table -AutoSize }
