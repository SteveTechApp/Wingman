param(
  [switch]$Apply,
  [switch]$DryRun,
  [switch]$UpdateAppRoutes,
  [string]$Root = ".",
  [string]$Src = "src",
  [string]$ReportDir = "_REPORTS",
  [string]$Stamp = (Get-Date -Format "yyyyMMdd_HHmmss")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Backup-File([string]$Path) {
  if (!(Test-Path $Path)) { return }
  $bak = "$Path.bak_$Stamp"
  Copy-Item $Path $bak -Force
}

function Ensure-Dir([string]$Path) {
  if (!(Test-Path $Path)) { New-Item -ItemType Directory -Force -Path $Path | Out-Null }
}

# Canonical route policy:
# - Public: "/"
# - Authenticated: "/app/..."
# - Legacy top-level routes redirect into "/app/..."
$routeMap = [ordered]@{
  "/"                    = "/"
  "/app"                 = "/app"
  "/dashboard"           = "/app/dashboard"
  "/projects"            = "/app/projects"
  "/import"              = "/app/import"
  "/toolhub"             = "/app/toolhub"
  "/tools"               = "/app/tools"
  "/compare"             = "/app/compare"
  "/competitor"          = "/app/competitor"
  "/competitor-compare"  = "/app/competitor-compare"

  # common bad forms (missing leading slash)
  "app"                  = "/app"
  "app/dashboard"        = "/app/dashboard"
  "app/projects"         = "/app/projects"
  "app/import"           = "/app/import"
  "app/toolhub"          = "/app/toolhub"
  "app/tools"            = "/app/tools"
  "app/compare"          = "/app/compare"
  "app/competitor"       = "/app/competitor"
  "app/competitor-compare" = "/app/competitor-compare"
}

# If you already have /app/xyz everywhere, this keeps them stable.
# But it also normalises *top-level* /xyz to /app/xyz.

Ensure-Dir (Join-Path $Root $ReportDir)

$srcRoot = Join-Path $Root $Src
if (!(Test-Path $srcRoot)) { throw "Not found: $srcRoot (run from repo root or pass -Root)" }

$targets = Get-ChildItem $srcRoot -Recurse -File -Include *.ts,*.tsx

$changes = New-Object System.Collections.Generic.List[object]

# Replace only inside quoted attribute values: to="..." to='...' href="..." href='...'
# This avoids clobbering unrelated strings where possible.
$attrPattern = '(?<attr>\b(to|href)\s*=\s*)(?<q>["''])(?<val>[^"'']+)(\k<q>)'

foreach ($f in $targets) {
  $path = $f.FullName
  $txt = Get-Content $path -Raw

  $new = [regex]::Replace($txt, $attrPattern, {
    param($m)
    $attr = $m.Groups["attr"].Value
    $q    = $m.Groups["q"].Value
    $val  = $m.Groups["val"].Value

    # ignore external links, mailto, hash-only, protocol-relative, templated URLs
    if ($val -match '^(https?:|mailto:|tel:|#|//)') { return $m.Value }
    if ($val -match '^\{.*\}$') { return $m.Value } # to={...}

    $norm = $val

    # apply route map on exact match first
    if ($routeMap.Contains($norm)) {
      $rep = $routeMap[$norm]
      if ($rep -ne $val) {
        $changes.Add([pscustomobject]@{
          File = $path
          Kind = "attr"
          From = $val
          To   = $rep
        }) | Out-Null
      }
      return ($attr + $q + $rep + $q)
    }

    # If it already starts with /app/, keep it.
    if ($norm -like "/app/*" -or $norm -eq "/app") { return $m.Value }

    # If it starts with / and matches any legacy top-level key, rewrite.
    if ($norm -like "/*" -and $routeMap.Contains($norm)) {
      $rep = $routeMap[$norm]
      if ($rep -ne $val) {
        $changes.Add([pscustomobject]@{
          File = $path
          Kind = "attr"
          From = $val
          To   = $rep
        }) | Out-Null
      }
      return ($attr + $q + $rep + $q)
    }

    return $m.Value
  })

  if ($new -ne $txt) {
    if ($Apply) {
      Backup-File $path
      [System.IO.File]::WriteAllText($path, $new, [System.Text.UTF8Encoding]::new($false))
    }
  }
}

# Optional: enforce a clean AppRoutes.tsx with redirects
if ($UpdateAppRoutes) {
  $appRoutes = Join-Path $srcRoot "AppRoutes.tsx"
  if (!(Test-Path $appRoutes)) { throw "Not found: $appRoutes" }

  $router = @"
import React, { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/layout/AppShell";
import RequireAuth from "@/auth/RequireAuth";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProjectOverviewPage = lazy(() => import("@/pages/ProjectOverviewPage"));
const ImportIntakePage = lazy(() => import("@/pages/ImportIntakePage"));
const ToolHubPage = lazy(() => import("@/pages/ToolHubPage"));
const ComparisonPage = lazy(() => import("@/pages/ComparisonPage"));
const CompetitorComparisonPage = lazy(() => import("@/pages/CompetitorComparisonPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public */}
        <Route index element={<PublicLandingPage />} />

        {/* Legacy top-level redirects */}
        <Route path="dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="import" element={<Navigate to="/app/import" replace />} />
        <Route path="toolhub" element={<Navigate to="/app/toolhub" replace />} />
        <Route path="tools" element={<Navigate to="/app/tools" replace />} />
        <Route path="compare" element={<Navigate to="/app/compare" replace />} />
        <Route path="competitor" element={<Navigate to="/app/competitor" replace />} />
        <Route path="competitor-compare" element={<Navigate to="/app/competitor-compare" replace />} />

        {/* Authenticated */}
        <Route
          path="app"
          element={
            <RequireAuth>
              <Navigate to="/app/dashboard" replace />
            </RequireAuth>
          }
        />
        <Route
          path="app/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="app/projects"
          element={
            <RequireAuth>
              <ProjectsPage />
            </RequireAuth>
          }
        />
        <Route
          path="app/projects/:id"
          element={
            <RequireAuth>
              <ProjectOverviewPage />
            </RequireAuth>
          }
        />
        <Route
          path="app/import"
          element={
            <RequireAuth>
              <ImportIntakePage />
            </RequireAuth>
          }
        />
        <Route
          path="app/toolhub"
          element={
            <RequireAuth>
              <ToolHubPage />
            </RequireAuth>
          }
        />
        <Route
          path="app/tools"
          element={
            <RequireAuth>
              <Navigate to="/app/toolhub" replace />
            </RequireAuth>
          }
        />

        {/* Tool routes (simple, flat for now) */}
        <Route
          path="app/compare"
          element={
            <RequireAuth>
              <ComparisonPage />
            </RequireAuth>
          }
        />
        <Route
          path="app/competitor-compare"
          element={
            <RequireAuth>
              <CompetitorComparisonPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
"@

  if ($Apply) {
    Backup-File $appRoutes
    [System.IO.File]::WriteAllText($appRoutes, $router, [System.Text.UTF8Encoding]::new($false))
  } else {
    $changes.Add([pscustomobject]@{ File = $appRoutes; Kind="AppRoutes"; From="(current)"; To="(template would be written)" }) | Out-Null
  }
}

# Write report
$report = Join-Path (Join-Path $Root $ReportDir) ("route_cleanup_report_{0}.csv" -f $Stamp)
$changes | Export-Csv -NoTypeInformation -Encoding UTF8 $report

Write-Host "Route clean-up complete."
Write-Host ("Apply mode: {0}" -f ($Apply.IsPresent))
Write-Host ("Changes logged: {0}" -f $changes.Count)
Write-Host ("Report: {0}" -f $report)

if ($DryRun -and $changes.Count -gt 0) {
  Write-Host "`nTop 25 changes:"
  $changes | Select-Object -First 25 | Format-Table -AutoSize
}
