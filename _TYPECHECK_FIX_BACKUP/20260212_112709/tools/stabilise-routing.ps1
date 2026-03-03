$ErrorActionPreference = "Stop"

$Root = "C:\Users\steve\wingman"
if (!(Test-Path "$Root\package.json")) { throw "Repo root not found: $Root" }
Set-Location $Root

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupRoot = Join-Path $Root ("_ROUTING_BACKUP\" + $Stamp)
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

function Backup-File([string]$file) {
  if (!(Test-Path $file)) { return }
  $rel = $file.Substring($Root.Length).TrimStart("\","/")
  $dest = Join-Path $BackupRoot $rel
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -Force $file $dest
}

function Write-Utf8NoBom([string]$file, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($file, $text, $enc)
}

Write-Host ""
Write-Host "== Wingman routing stabilisation ==" -ForegroundColor Cyan
Write-Host ("Root: " + $Root)
Write-Host ("Backup: " + $BackupRoot)

# -----------------------------
# 1) Replace src\AppRoutes.tsx
# -----------------------------
$routesFile = Join-Path $Root "src\AppRoutes.tsx"
if (!(Test-Path $routesFile)) { throw "Missing: src\AppRoutes.tsx" }
Backup-File $routesFile

# Canonical routing: public at /, auth app under /app, tools under /app/tools
$routesTsx = @"
import React, { lazy } from ""react"";
import { Navigate, Route, Routes } from ""react-router-dom"";

import AppShell from ""@/layout/AppShell"";
import RequireAuth from ""@/auth/RequireAuth"";

const PublicLandingPage = lazy(() => import(""@/pages/PublicLandingPage""));
const LoginPage = lazy(() => import(""@/pages/LoginPage""));
const SignupPage = lazy(() => import(""@/pages/SignupPage""));
const WelcomeScreen = lazy(() => import(""@/pages/WelcomeScreen""));
const NotFoundPage = lazy(() => import(""@/pages/NotFoundPage""));

const DashboardPage = lazy(() => import(""@/pages/DashboardPage""));
const ProjectsPage = lazy(() => import(""@/pages/ProjectsPage""));
const ProjectOverviewPage = lazy(() => import(""@/pages/ProjectOverviewPage""));
const ProjectSetupScreen = lazy(() => import(""@/pages/ProjectSetupScreen""));

const ImportIntakePage = lazy(() => import(""@/pages/ImportIntakePage""));
const SurveyImportPage = lazy(() => import(""@/pages/SurveyImportPage""));

const ToolHubPage = lazy(() => import(""@/pages/ToolHubPage""));
const WorkspaceHomePage = lazy(() => import(""@/pages/WorkspaceHomePage""));

const RoomEditorEntry = lazy(() => import(""@/pages/RoomEditorEntry""));
const VideoWallPage = lazy(() => import(""@/pages/VideoWallPage""));
const TemplateBrowserScreen = lazy(() => import(""@/pages/TemplateBrowserScreen""));
const ProposalDisplay = lazy(() => import(""@/pages/ProposalDisplay""));
const TrainingPage = lazy(() => import(""@/pages/TrainingPage""));
const VideoGeneratorPage = lazy(() => import(""@/pages/VideoGeneratorPage""));
const AnalyticsPage = lazy(() => import(""@/pages/AnalyticsPage""));

const ComparisonPage = lazy(() => import(""@/pages/ComparisonPage""));
const CompetitorComparisonPage = lazy(() => import(""@/pages/CompetitorComparisonPage""));

const DesignCoPilot = lazy(() => import(""@/pages/DesignCoPilot""));
const AgentInputForm = lazy(() => import(""@/pages/AgentInputForm""));
const QuickQuestionPage = lazy(() => import(""@/pages/QuickQuestionPage""));

const CustomerDiscoveryWizard = lazy(() => import(""@/pages/CustomerDiscoveryWizard""));
const GuidedProjectWizard = lazy(() => import(""@/pages/GuidedProjectWizard""));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path=""/"" element={<PublicLandingPage />} />
      <Route path=""/welcome"" element={<WelcomeScreen />} />
      <Route path=""/login"" element={<LoginPage />} />
      <Route path=""/signup"" element={<SignupPage />} />

      {/* Legacy redirects (keep old links working) */}
      <Route path=""/dashboard"" element={<Navigate to=""/app/dashboard"" replace />} />
      <Route path=""/projects"" element={<Navigate to=""/app/projects"" replace />} />
      <Route path=""/import"" element={<Navigate to=""/app/import"" replace />} />
      <Route path=""/toolhub"" element={<Navigate to=""/app/toolhub"" replace />} />
      <Route path=""/workspace"" element={<Navigate to=""/app/workspace"" replace />} />

      <Route path=""/app/compare"" element={<Navigate to=""/app/tools/compare"" replace />} />
      <Route path=""/app/competitor-compare"" element={<Navigate to=""/app/tools/competitor-compare"" replace />} />

      {/* Handle legacy no-leading-slash tool links like tools/room */}
      <Route path=""tools/*"" element={<Navigate to=""/app/toolhub"" replace />} />

      {/* Authenticated App */}
      <Route
        path=""/app""
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to=""/app/dashboard"" replace />} />

        {/* Core */}
        <Route path=""dashboard"" element={<DashboardPage />} />
        <Route path=""projects"" element={<ProjectsPage />} />
        <Route path=""projects/:id"" element={<ProjectOverviewPage />} />
        <Route path=""setup"" element={<ProjectSetupScreen />} />

        <Route path=""import"" element={<ImportIntakePage />} />
        <Route path=""survey-import"" element={<SurveyImportPage />} />

        <Route path=""toolhub"" element={<ToolHubPage />} />
        <Route path=""workspace"" element={<WorkspaceHomePage />} />

        {/* Tools / Wizards / Helpers */}
        <Route path=""tools/room"" element={<RoomEditorEntry />} />
        <Route path=""tools/videowall"" element={<VideoWallPage />} />
        <Route path=""tools/templates"" element={<TemplateBrowserScreen />} />
        <Route path=""tools/proposal"" element={<ProposalDisplay />} />
        <Route path=""tools/training"" element={<TrainingPage />} />
        <Route path=""tools/video-generator"" element={<VideoGeneratorPage />} />
        <Route path=""tools/analytics"" element={<AnalyticsPage />} />

        <Route path=""tools/compare"" element={<ComparisonPage />} />
        <Route path=""tools/competitor-compare"" element={<CompetitorComparisonPage />} />

        <Route path=""tools/copilot"" element={<DesignCoPilot />} />
        <Route path=""tools/agent"" element={<AgentInputForm />} />
        <Route path=""tools/ask"" element={<QuickQuestionPage />} />

        <Route path=""tools/discovery"" element={<CustomerDiscoveryWizard />} />
        <Route path=""tools/guided-project"" element={<GuidedProjectWizard />} />

        {/* Safety redirects inside /app */}
        <Route path=""compare"" element={<Navigate to=""/app/tools/compare"" replace />} />
        <Route path=""competitor-compare"" element={<Navigate to=""/app/tools/competitor-compare"" replace />} />

        <Route path=""*"" element={<NotFoundPage />} />
      </Route>

      <Route path=""*"" element={<NotFoundPage />} />
    </Routes>
  );
}
"@

Write-Utf8NoBom $routesFile $routesTsx
Write-Host "Updated: src\AppRoutes.tsx" -ForegroundColor Green

# -----------------------------
# 2) Rewrite link targets across src\
# -----------------------------
$map = [ordered]@{
  "/dashboard" = "/app/dashboard"
  "/projects"  = "/app/projects"
  "/import"    = "/app/import"
  "/toolhub"   = "/app/toolhub"
  "/workspace" = "/app/workspace"
  "/app/compare" = "/app/tools/compare"
  "/app/competitor-compare" = "/app/tools/competitor-compare"
}

function Canonicalize-Path([string]$p) {
  if ([string]::IsNullOrWhiteSpace($p)) { return $p }
  if ($p -match "^(https?:)?//") { return $p }
  if ($p.StartsWith("#")) { return $p }
  $base = $p.Split("?")[0].Split("#")[0]
  if ($map.Contains($base)) {
    return $p.Replace($base, $map[$base])
  }
  # handle bare words used as routes e.g. "dashboard"
  switch ($base) {
    "dashboard" { return $p.Replace($base, "/app/dashboard") }
    "projects"  { return $p.Replace($base, "/app/projects") }
    "import"    { return $p.Replace($base, "/app/import") }
    "toolhub"   { return $p.Replace($base, "/app/toolhub") }
    "workspace" { return $p.Replace($base, "/app/workspace") }
    default {}
  }
  # handle tools without leading slash: tools/x -> /app/tools/x
  if ($base -match "^tools/") {
    return $p.Replace($base, ("/app/" + $base))
  }
  return $p
}

$files = Get-ChildItem (Join-Path $Root "src") -Recurse -File -Include *.tsx,*.ts
$changed = New-Object System.Collections.Generic.List[string]

# Replace only quoted literal paths in to="..." / to='...' / navigate("...")
$rx = [regex]'(?:(?:\bto\s*=\s*)(?:"([^"]+)"|''([^'']+)''))|(?:navigate\(\s*(?:"([^"]+)"|''([^'']+)''))'

foreach ($f in $files) {
  $orig = Get-Content $f.FullName -Raw
  $txt = $orig

  $txt2 = $rx.Replace($txt, {
    param($m)
    $v = $m.Groups[1].Value
    if (-not $v) { $v = $m.Groups[2].Value }
    if (-not $v) { $v = $m.Groups[3].Value }
    if (-not $v) { $v = $m.Groups[4].Value }
    $newv = Canonicalize-Path $v
    if ($m.Value -match "to\s*=\s*`"") { return $m.Value.Replace($v, $newv) }
    if ($m.Value -match "to\s*=\s*''") { return $m.Value.Replace($v, $newv) }
    if ($m.Value -match "navigate\(") { return $m.Value.Replace($v, $newv) }
    return $m.Value
  })

  if ($txt2 -ne $orig) {
    Backup-File $f.FullName
    Write-Utf8NoBom $f.FullName $txt2
    $changed.Add($f.FullName.Substring($Root.Length+1))
  }
}

$reportPath = Join-Path $BackupRoot "_ROUTING_STABILISE_REPORT.txt"
$report = @()
$report += "Backup: $BackupRoot"
$report += "Updated: src\AppRoutes.tsx"
$report += "Files rewritten: $($changed.Count)"
$report += ""
$report += ($changed | Sort-Object)
Write-Utf8NoBom $reportPath (($report -join "`r`n") + "`r`n")

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
Write-Host ("Report: " + $reportPath) -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"
