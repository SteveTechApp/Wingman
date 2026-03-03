[CmdletBinding()]
param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

if(-not $Apply){
  throw "Run with -Apply to apply the Sales P1 uplift."
}

function Find-RepoRoot {
  param([string]$Start)

  if($Start -and (Test-Path $Start)){
    $d = (Resolve-Path $Start).Path
  } else {
    $d = (Get-Location).Path
  }

  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root. Pass -Root C:\Users\steve\wingman or run from the repo root."
    }
    $d = $p
  }
}

function New-RescueFolder {
  param([string]$RepoRoot)
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $rescue = Join-Path $RepoRoot "_RESCUE\SalesP1Uplift_$stamp"
  New-Item -ItemType Directory -Force -Path $rescue | Out-Null
  return $rescue
}

function Read-Text {
  param([string]$Path)
  try {
    return [System.IO.File]::ReadAllText($Path)
  } catch {
    return ""
  }
}

function Write-Text {
  param(
    [string]$Path,
    [string]$Text
  )
  $dir = Split-Path $Path -Parent
  if($dir -and !(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File {
  param(
    [string]$Path,
    [string]$RescueRoot,
    [string]$RepoRoot
  )
  if(!(Test-Path $Path)){ return }
  $relative = $Path.Substring($RepoRoot.Length).TrimStart("\","/")
  $dest = Join-Path $RescueRoot $relative
  $destDir = Split-Path $dest -Parent
  if(!(Test-Path $destDir)){
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item -Force -Path $Path -Destination $dest
}

function Get-Files {
  param(
    [string]$Path,
    [string[]]$Include = @("*")
  )
  if(!(Test-Path $Path)){ return @() }
  return @(Get-ChildItem -Path $Path -Recurse -File -Include $Include -ErrorAction SilentlyContinue)
}

function Normalize-Route {
  param([string]$PathValue)
  if([string]::IsNullOrWhiteSpace($PathValue)){ return "" }
  $p = $PathValue.Trim()
  if($p.StartsWith("/")){ return $p }
  return "/$p"
}

function Get-RouteMap {
  param([string]$RepoRoot)

  $routeFile = Join-Path $RepoRoot "src\AppRoutes.tsx"
  if(!(Test-Path $routeFile)){
    $routeFile = @(Get-Files -Path (Join-Path $RepoRoot "src") -Include @("AppRoutes.tsx","routes.tsx","router.tsx") | Select-Object -First 1 -ExpandProperty FullName)
  }

  $paths = @()
  if($routeFile -and (Test-Path $routeFile)){
    $text = Read-Text $routeFile
    $rx = [regex]::new('path\s*=\s*"([^"]+)"|path:\s*"([^"]+)"')
    foreach($m in $rx.Matches($text)){
      $value = if($m.Groups[1].Value){ $m.Groups[1].Value } else { $m.Groups[2].Value }
      $n = Normalize-Route $value
      if($n){ $paths += $n }
    }
    $paths = @($paths | Select-Object -Unique)
  }

  function Pick([string[]]$Candidates, [string]$Fallback){
    foreach($c in $Candidates){
      $hit = @($paths | Where-Object { $_ -match $c } | Select-Object -First 1)
      if($hit.Count -gt 0){ return $hit[0] }
    }
    return $Fallback
  }

  $toolhub = Pick @('toolhub','/app/tools$','/tools$','/app/tools/') "/app"
  $projects = Pick @('project') $toolhub
  $intake = Pick @('import','survey','intake') $projects
  $wizard = Pick @('template','wizard','room') $toolhub
  $competitor = Pick @('compet','compare','replace','match') $toolhub
  $proposal = Pick @('proposal','quote','bom','pricing') $toolhub
  $guru = Pick @('guru','assistant') $toolhub

  return [pscustomobject]@{
    routeFile = $routeFile
    allPaths = $paths
    toolhub = $toolhub
    projects = $projects
    intake = $intake
    wizard = $wizard
    competitor = $competitor
    proposal = $proposal
    guru = $guru
  }
}

function Get-PreferredFile {
  param(
    [string]$RepoRoot,
    [string[]]$PreferredRelativePaths,
    [string[]]$SearchPatterns
  )

  foreach($rel in $PreferredRelativePaths){
    $candidate = Join-Path $RepoRoot $rel
    if(Test-Path $candidate){ return $candidate }
  }

  $src = Join-Path $RepoRoot "src"
  $files = @()
  foreach($pat in $SearchPatterns){
    $files += Get-Files -Path $src -Include @($pat)
  }
  $files = @($files | Sort-Object FullName -Unique)

  if($files.Count -eq 0){ return "" }

  return ($files | Sort-Object @{Expression={$_.FullName.Length}} | Select-Object -First 1 -ExpandProperty FullName)
}

function Add-ImportLine {
  param(
    [string]$Text,
    [string]$ImportLine
  )

  if($Text -match [regex]::Escape($ImportLine)){ return $Text }

  $rx = [regex]::new('^import .+?;\s*$', [System.Text.RegularExpressions.RegexOptions]::Multiline)
  $matches = $rx.Matches($Text)
  if($matches.Count -gt 0){
    $last = $matches[$matches.Count - 1]
    return $Text.Insert($last.Index + $last.Length, "`r`n$ImportLine")
  }

  return "$ImportLine`r`n$Text"
}

function Inject-ComponentAfterRootTag {
  param(
    [string]$Text,
    [string]$Snippet
  )

  if($Text -match [regex]::Escape($Snippet.Trim())) {
    return [pscustomobject]@{ changed = $false; text = $Text; reason = "Snippet already present." }
  }

  $patterns = @(
    'return\s*\(\s*<([A-Za-z][A-Za-z0-9]*)\b([^>]*)>',
    'return\s*\(\s*<([A-Za-z][A-Za-z0-9]*)\b([^>]*)\/>'
  )

  foreach($p in $patterns){
    $rx = [regex]::new($p, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $m = $rx.Match($Text)
    if($m.Success){
      $anchor = $m.Value
      if($anchor.EndsWith("/>")){
        continue
      }
      $replacement = $anchor + "`r`n      $Snippet"
      $newText = $Text.Remove($m.Index, $m.Length).Insert($m.Index, $replacement)
      return [pscustomobject]@{ changed = $true; text = $newText; reason = "Injected after first return root tag." }
    }
  }

  $fallbackRx = [regex]::new('<main\b[^>]*>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $fallback = $fallbackRx.Match($Text)
  if($fallback.Success){
    $anchor = $fallback.Value
    $replacement = $anchor + "`r`n      $Snippet"
    $newText = $Text.Remove($fallback.Index, $fallback.Length).Insert($fallback.Index, $replacement)
    return [pscustomobject]@{ changed = $true; text = $newText; reason = "Injected after <main>." }
  }

  return [pscustomobject]@{ changed = $false; text = $Text; reason = "Could not find a safe injection point." }
}

function Set-FileIfChanged {
  param(
    [string]$Path,
    [string]$NewText,
    [string]$CurrentText,
    [string]$RescueRoot,
    [string]$RepoRoot
  )

  if($NewText -eq $CurrentText){
    return $false
  }

  Backup-File -Path $Path -RescueRoot $RescueRoot -RepoRoot $RepoRoot
  Write-Text -Path $Path -Text $NewText
  return $true
}

$repo = Find-RepoRoot -Start $Root
$rescue = New-RescueFolder -RepoRoot $repo
$routes = Get-RouteMap -RepoRoot $repo
$docsDir = Join-Path $repo "docs"
$dataDir = Join-Path $repo "src\data"

New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$dashboardPath = Get-PreferredFile -RepoRoot $repo `
  -PreferredRelativePaths @(
    "src\features\dashboard\DashboardPage.tsx",
    "src\app\pages\DashboardPage.tsx",
    "src\pages\DashboardPage.tsx"
  ) `
  -SearchPatterns @("DashboardPage.tsx","*Dashboard*.tsx")

$proposalPath = Get-PreferredFile -RepoRoot $repo `
  -PreferredRelativePaths @(
    "src\features\proposal\ProposalPage.tsx",
    "src\features\quote\QuotePage.tsx",
    "src\app\pages\ProposalPage.tsx",
    "src\app\pages\QuotePage.tsx"
  ) `
  -SearchPatterns @("*Proposal*Page.tsx","*Quote*Page.tsx","*BOM*Page.tsx","*Proposal*.tsx","*Quote*.tsx","*BOM*.tsx")

$changed = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

$starterJourneys = @(
  @{
    id = "new-opportunity"
    label = "Start New Opportunity"
    salesLabel = "Capture the customer need"
    description = "Collect the minimum details needed to recommend a safe first solution."
    route = $routes.intake
    status = "Draft"
    why = "Best for first calls and early qualification."
  },
  @{
    id = "competitor-match"
    label = "Match Competitor SKU"
    salesLabel = "Find a like-for-like starting point"
    description = "Translate a competitor part into a comparable Wingman-aligned direction."
    route = $routes.competitor
    status = "Review Needed"
    why = "Best when the customer already has a competing part number."
  },
  @{
    id = "build-room"
    label = "Build Room System"
    salesLabel = "Create a guided room solution"
    description = "Use templates and room logic to recommend the right system shape."
    route = $routes.wizard
    status = "Commercial Ready"
    why = "Best for repeatable meeting room and learning space designs."
  },
  @{
    id = "quote-pack"
    label = "Create Quote Pack"
    salesLabel = "Prepare a customer-safe summary"
    description = "Turn the selected system into a BOM-led handoff with assumptions and exclusions."
    route = $routes.proposal
    status = "Engineering Review Required"
    why = "Best before customer issue or internal approval."
  },
  @{
    id = "ask-wingman"
    label = "Ask Wingman"
    salesLabel = "Get guided sales help"
    description = "Use the assistant for product direction, positioning, and next-step guidance."
    route = $routes.guru
    status = "Review Needed"
    why = "Best when you need a quick second opinion."
  }
)

$salesLanguage = @(
  @{
    technical = "Competitor Compare"
    sales = "Find Replacement / Match Competitor"
    help = "Use this when the customer references another brand or an existing installed part."
  },
  @{
    technical = "Room Wizard"
    sales = "Build a Room System"
    help = "Use this when you know the room type but not the full technical design."
  },
  @{
    technical = "BOM / Export"
    sales = "Create Quote Pack"
    help = "Use this when you need a sales-safe summary for handoff, pricing, or proposal drafting."
  },
  @{
    technical = "Guru"
    sales = "Ask Wingman"
    help = "Use this when you need guided advice in plain English."
  }
)

$readinessModel = @{
  statuses = @("Draft","Review Needed","Commercial Ready","Engineering Review Required")
  checklist = @(
    @{ key = "bomSummary"; label = "BOM summary present"; required = $true },
    @{ key = "assumptions"; label = "Assumptions stated"; required = $true },
    @{ key = "exclusions"; label = "Exclusions stated"; required = $true },
    @{ key = "commercialNotes"; label = "Commercial notes added"; required = $true },
    @{ key = "nextStep"; label = "Next step is obvious"; required = $true }
  )
}

$journeysPath = Join-Path $dataDir "sales-starter-journeys.json"
$languagePath = Join-Path $dataDir "sales-language-map.json"
$readinessPath = Join-Path $dataDir "sales-readiness-model.json"

foreach($pair in @(
  @{ path = $journeysPath; content = ($starterJourneys | ConvertTo-Json -Depth 6) },
  @{ path = $languagePath; content = ($salesLanguage | ConvertTo-Json -Depth 6) },
  @{ path = $readinessPath; content = ($readinessModel | ConvertTo-Json -Depth 6) }
)){
  $current = if(Test-Path $pair.path){ Read-Text $pair.path } else { "" }
  if(Set-FileIfChanged -Path $pair.path -NewText $pair.content -CurrentText $current -RescueRoot $rescue -RepoRoot $repo){
    $changed.Add($pair.path)
  }
}

if($dashboardPath){
  $dashboardDir = Split-Path $dashboardPath -Parent
  $salesActionStripPath = Join-Path $dashboardDir "SalesActionStrip.tsx"

  $salesActionStrip = @"
import React from "react";
import { useNavigate } from "react-router-dom";

type SalesStatus = "Draft" | "Review Needed" | "Commercial Ready" | "Engineering Review Required";

type ActionItem = {
  id: string;
  label: string;
  salesLabel: string;
  description: string;
  status: SalesStatus;
  to: string;
  why: string;
};

function badgeStyle(status: SalesStatus): React.CSSProperties {
  switch (status) {
    case "Commercial Ready":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(16,185,129,0.45)",
        background: "rgba(16,185,129,0.10)",
        color: "inherit",
      };
    case "Engineering Review Required":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(244,63,94,0.45)",
        background: "rgba(244,63,94,0.10)",
        color: "inherit",
      };
    case "Review Needed":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(245,158,11,0.45)",
        background: "rgba(245,158,11,0.10)",
        color: "inherit",
      };
    default:
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(148,163,184,0.45)",
        background: "rgba(148,163,184,0.10)",
        color: "inherit",
      };
  }
}

export default function SalesActionStrip() {
  const navigate = useNavigate();

  const items: ActionItem[] = [
    {
      id: "new-opportunity",
      label: "Start New Opportunity",
      salesLabel: "Capture the customer need",
      description: "Collect the minimum information needed before choosing products.",
      status: "Draft",
      to: "@@ROUTE_INTAKE@@",
      why: "Best for first conversations and early qualification.",
    },
    {
      id: "competitor-match",
      label: "Match Competitor SKU",
      salesLabel: "Find a like-for-like starting point",
      description: "Translate a competing part number into a practical Wingman-aligned direction.",
      status: "Review Needed",
      to: "@@ROUTE_COMPETITOR@@",
      why: "Best when the customer already has a competing part in mind.",
    },
    {
      id: "build-room",
      label: "Build Room System",
      salesLabel: "Create a guided room solution",
      description: "Use templates to build a working first-pass design without deep technical steps.",
      status: "Commercial Ready",
      to: "@@ROUTE_WIZARD@@",
      why: "Best for meeting rooms, learning spaces, and repeatable designs.",
    },
    {
      id: "quote-pack",
      label: "Create Quote Pack",
      salesLabel: "Prepare a customer-safe summary",
      description: "Move from design intent to BOM summary, assumptions, and exclusions.",
      status: "Engineering Review Required",
      to: "@@ROUTE_PROPOSAL@@",
      why: "Best before sending anything externally or for internal pricing handoff.",
    },
    {
      id: "ask-wingman",
      label: "Ask Wingman",
      salesLabel: "Get guided sales help",
      description: "Use the assistant for product direction, positioning, and confidence checks.",
      status: "Review Needed",
      to: "@@ROUTE_GURU@@",
      why: "Best when you need a plain-English second opinion.",
    },
  ];

  return (
    <section
      data-wm-sales-strip="1"
      style={{
        margin: "0 0 18px 0",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Start with the outcome</div>
          <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4 }}>
            Designed for non-technical sales users: choose the customer task first, then let Wingman guide the detail.
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Sales-safe confidence labels are shown on each action.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.to)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
            }}
            title={item.description}
            aria-label={item.label}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{item.label}</div>
              <span style={badgeStyle(item.status)}>{item.status}</span>
            </div>

            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{item.salesLabel}</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 10 }}>{item.description}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>{item.why}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
"@

  $salesActionStrip = $salesActionStrip.Replace("@@ROUTE_INTAKE@@", $routes.intake)
  $salesActionStrip = $salesActionStrip.Replace("@@ROUTE_COMPETITOR@@", $routes.competitor)
  $salesActionStrip = $salesActionStrip.Replace("@@ROUTE_WIZARD@@", $routes.wizard)
  $salesActionStrip = $salesActionStrip.Replace("@@ROUTE_PROPOSAL@@", $routes.proposal)
  $salesActionStrip = $salesActionStrip.Replace("@@ROUTE_GURU@@", $routes.guru)

  $currentStrip = if(Test-Path $salesActionStripPath){ Read-Text $salesActionStripPath } else { "" }
  if(Set-FileIfChanged -Path $salesActionStripPath -NewText $salesActionStrip -CurrentText $currentStrip -RescueRoot $rescue -RepoRoot $repo){
    $changed.Add($salesActionStripPath)
  }

  $dashboardCurrent = Read-Text $dashboardPath
  $dashboardNew = Add-ImportLine -Text $dashboardCurrent -ImportLine 'import SalesActionStrip from "./SalesActionStrip";'
  $inject = Inject-ComponentAfterRootTag -Text $dashboardNew -Snippet '<SalesActionStrip />'
  $dashboardNew = $inject.text

  if(Set-FileIfChanged -Path $dashboardPath -NewText $dashboardNew -CurrentText $dashboardCurrent -RescueRoot $rescue -RepoRoot $repo){
    $changed.Add($dashboardPath)
  } else {
    $skipped.Add("Dashboard patch: $($inject.reason)")
  }
} else {
  $skipped.Add("DashboardPage.tsx not found. No dashboard injection applied.")
}

if($proposalPath){
  $proposalDir = Split-Path $proposalPath -Parent
  $proposalPanelPath = Join-Path $proposalDir "ProposalHandoffPanel.tsx"

  $proposalPanel = @"
import React from "react";

const checks = [
  "BOM summary is visible",
  "Commercial assumptions are stated",
  "Scope exclusions are explicit",
  "Internal review path is clear",
  "The next customer-safe step is obvious",
];

export default function ProposalHandoffPanel() {
  return (
    <section
      data-wm-proposal-handoff="1"
      style={{
        margin: "0 0 18px 0",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>Quote pack handoff</div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
        Use this section as a commercial readiness gate before sending or pricing.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {checks.map((item) => (
          <div
            key={item}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
"@

  $proposalCurrentPanel = if(Test-Path $proposalPanelPath){ Read-Text $proposalPanelPath } else { "" }
  if(Set-FileIfChanged -Path $proposalPanelPath -NewText $proposalPanel -CurrentText $proposalCurrentPanel -RescueRoot $rescue -RepoRoot $repo){
    $changed.Add($proposalPanelPath)
  }

  $proposalCurrent = Read-Text $proposalPath
  $proposalNew = Add-ImportLine -Text $proposalCurrent -ImportLine 'import ProposalHandoffPanel from "./ProposalHandoffPanel";'
  $injectProposal = Inject-ComponentAfterRootTag -Text $proposalNew -Snippet '<ProposalHandoffPanel />'
  $proposalNew = $injectProposal.text

  if(Set-FileIfChanged -Path $proposalPath -NewText $proposalNew -CurrentText $proposalCurrent -RescueRoot $rescue -RepoRoot $repo){
    $changed.Add($proposalPath)
  } else {
    $skipped.Add("Proposal patch: $($injectProposal.reason)")
  }
} else {
  $skipped.Add("Proposal/Quote/BOM page not found. No proposal injection applied.")
}

$notes = New-Object System.Text.StringBuilder
[void]$notes.AppendLine("# Wingman Sales P1 Uplift")
[void]$notes.AppendLine("")
[void]$notes.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Goal")
[void]$notes.AppendLine("Implements the audit P1 layer with low-risk, additive changes:")
[void]$notes.AppendLine("- Guided first-run action strip")
[void]$notes.AppendLine("- Plain-English sales language map")
[void]$notes.AppendLine("- Confidence status model")
[void]$notes.AppendLine("- Proposal handoff checklist panel")
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Route Inference")
[void]$notes.AppendLine("- Route file: $($routes.routeFile)")
[void]$notes.AppendLine("- Intake: $($routes.intake)")
[void]$notes.AppendLine("- Competitor: $($routes.competitor)")
[void]$notes.AppendLine("- Wizard: $($routes.wizard)")
[void]$notes.AppendLine("- Proposal: $($routes.proposal)")
[void]$notes.AppendLine("- Guru: $($routes.guru)")
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Files Changed")
if($changed.Count -eq 0){
  [void]$notes.AppendLine("- None")
} else {
  foreach($c in $changed){ [void]$notes.AppendLine("- $c") }
}
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Skipped / Manual Check")
if($skipped.Count -eq 0){
  [void]$notes.AppendLine("- None")
} else {
  foreach($s in $skipped){ [void]$notes.AppendLine("- $s") }
}
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Manual Validation")
[void]$notes.AppendLine("1. Open the dashboard and confirm the new sales action strip appears at the top.")
[void]$notes.AppendLine("2. Click each action card and confirm the inferred route is correct.")
[void]$notes.AppendLine("3. Open the proposal/quote page and confirm the handoff panel appears at the top.")
[void]$notes.AppendLine("4. Run typecheck and dev server.")
[void]$notes.AppendLine("")
[void]$notes.AppendLine("## Note")
[void]$notes.AppendLine("This pass is intentionally additive. It avoids large layout rewrites and focuses on guiding sales users into the right flow.")

$notesPath = Join-Path $docsDir "sales-p1-implementation-notes.md"
Write-Text -Path $notesPath -Text $notes.ToString()

Write-Host ""
Write-Host "== Wingman Sales P1 Uplift ==" -ForegroundColor Cyan
Write-Host "Repo: $repo"
Write-Host "Backup: $rescue"
Write-Host "Notes: $notesPath"
Write-Host ""
Write-Host "Route file: $($routes.routeFile)"
Write-Host "Inferred routes:"
Write-Host " - Intake:     $($routes.intake)"
Write-Host " - Competitor: $($routes.competitor)"
Write-Host " - Wizard:     $($routes.wizard)"
Write-Host " - Proposal:   $($routes.proposal)"
Write-Host " - Guru:       $($routes.guru)"
Write-Host ""

if($changed.Count -gt 0){
  Write-Host "Changed files:" -ForegroundColor Yellow
  foreach($c in $changed){ Write-Host " - $c" }
} else {
  Write-Host "No file changes were necessary." -ForegroundColor Yellow
}

if($skipped.Count -gt 0){
  Write-Host ""
  Write-Host "Skipped / manual review:" -ForegroundColor DarkYellow
  foreach($s in $skipped){ Write-Host " - $s" }
}

Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Review docs\sales-p1-implementation-notes.md"

if(-not $Apply){
  Write-Host ""
  Write-Host "This script writes additive files and patches by default. Use -Apply to confirm intent." -ForegroundColor DarkGray
}
