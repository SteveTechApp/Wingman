[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Find-RepoRoot {
  param([string]$Start)
  $d = if($Start){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root. Run from your Wingman repo or pass -Root."
    }
    $d = $p
  }
}

function New-RescueFolder {
  param([string]$RepoRoot)
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $rescue = Join-Path $RepoRoot "_RESCUE\SalesReadinessAudit_$stamp"
  New-Item -ItemType Directory -Force -Path $rescue | Out-Null
  return $rescue
}

function Get-FilesSafe {
  param(
    [string]$Path,
    [string[]]$Include = @("*")
  )
  if(!(Test-Path $Path)){ return @() }
  return @(Get-ChildItem -Path $Path -Recurse -File -Include $Include -ErrorAction SilentlyContinue)
}

function Read-FileText {
  param([string]$Path)
  try {
    return [System.IO.File]::ReadAllText($Path)
  } catch {
    return ""
  }
}

function Count-Matches {
  param(
    [string]$Text,
    [string]$Pattern
  )
  if([string]::IsNullOrWhiteSpace($Text)){ return 0 }
  return ([regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
}

function Find-MatchingFiles {
  param(
    [System.IO.FileInfo[]]$Files,
    [string[]]$Patterns
  )
  $hits = New-Object System.Collections.Generic.List[System.IO.FileInfo]
  foreach($f in $Files){
    foreach($p in $Patterns){
      if($f.Name -match $p -or $f.FullName -match $p){
        $hits.Add($f)
        break
      }
    }
  }
  return @($hits | Sort-Object FullName -Unique)
}

function Measure-Feature {
  param(
    [string]$Name,
    [string]$AudienceFit,
    [string]$BusinessValue,
    [string[]]$FilePatterns,
    [System.IO.FileInfo[]]$CodeFiles,
    [System.IO.FileInfo[]]$DataFiles
  )

  $codeHits = Find-MatchingFiles -Files $CodeFiles -Patterns $FilePatterns
  $dataHits = Find-MatchingFiles -Files $DataFiles -Patterns $FilePatterns

  $score = 0
  if($codeHits.Count -ge 1){ $score += 35 }
  if($codeHits.Count -ge 2){ $score += 10 }
  if($dataHits.Count -ge 1){ $score += 15 }

  $signalText = ""
  foreach($f in $codeHits | Select-Object -First 8){
    $signalText += "`n" + (Read-FileText $f.FullName)
  }

  $uxSignals = 0
  $uxSignals += Count-Matches $signalText "loading|spinner|skeleton"
  $uxSignals += Count-Matches $signalText "empty state|no results|no items|nothing yet"
  $uxSignals += Count-Matches $signalText "help|tooltip|hint|learn more|how it works"
  $uxSignals += Count-Matches $signalText "search|filter|recent|favorite|pinned"
  $uxSignals += Count-Matches $signalText "save|export|download|quote|proposal"

  if($uxSignals -ge 3){ $score += 10 }
  if($uxSignals -ge 8){ $score += 10 }

  $readiness =
    if($score -ge 80){ "High" }
    elseif($score -ge 60){ "Medium-High" }
    elseif($score -ge 40){ "Medium" }
    elseif($score -ge 20){ "Low-Medium" }
    else { "Low" }

  $risk =
    if($score -lt 20){ "Not visibly implemented or too incomplete to trust" }
    elseif($score -lt 40){ "Visible but likely fragmented or thin" }
    elseif($score -lt 60){ "Useful foundation, still needs guidance and polish" }
    elseif($score -lt 80){ "Commercially useful with targeted UX refinement" }
    else { "Near-ready, mainly polish and data hardening" }

  return [pscustomobject]@{
    Name = $Name
    AudienceFit = $AudienceFit
    BusinessValue = $BusinessValue
    CodeFiles = $codeHits.Count
    DataFiles = $dataHits.Count
    Score = $score
    Readiness = $readiness
    Risk = $risk
    ExampleFiles = @($codeHits | Select-Object -First 5 -ExpandProperty FullName)
  }
}

function Get-UXSignals {
  param([System.IO.FileInfo[]]$CodeFiles)

  $aggregate = [pscustomobject]@{
    Search = 0
    EmptyStates = 0
    HelpText = 0
    LoadingStates = 0
    SaveExport = 0
    LocalStorage = 0
    RecentPinned = 0
    Onboarding = 0
  }

  foreach($f in $CodeFiles){
    $t = Read-FileText $f.FullName
    if(!$t){ continue }

    $aggregate.Search      += Count-Matches $t "search|filter|find"
    $aggregate.EmptyStates += Count-Matches $t "no results|no items|nothing yet|empty"
    $aggregate.HelpText    += Count-Matches $t "help|tooltip|hint|learn more|guide"
    $aggregate.LoadingStates += Count-Matches $t "loading|spinner|skeleton|busy"
    $aggregate.SaveExport  += Count-Matches $t "save|export|download|print|pdf"
    $aggregate.LocalStorage += Count-Matches $t "localStorage"
    $aggregate.RecentPinned += Count-Matches $t "recent|pinned|favorite"
    $aggregate.Onboarding  += Count-Matches $t "welcome|getting started|quick start|checklist|wizard"
  }

  return $aggregate
}

function New-BacklogItem {
  param(
    [string]$Priority,
    [string]$Feature,
    [string]$Problem,
    [string]$Recommendation,
    [string]$BusinessImpact,
    [string]$Effort
  )
  return [pscustomobject]@{
    priority = $Priority
    feature = $Feature
    problem = $Problem
    recommendation = $Recommendation
    businessImpact = $BusinessImpact
    effort = $Effort
  }
}

$repo = Find-RepoRoot -Start $Root
$rescue = New-RescueFolder -RepoRoot $repo
$docsDir = Join-Path $repo "docs"
New-Item -ItemType Directory -Force -Path $docsDir | Out-Null

$codeFiles = Get-FilesSafe -Path (Join-Path $repo "src") -Include @("*.ts","*.tsx","*.js","*.jsx","*.css","*.json")
$dataFiles = Get-FilesSafe -Path (Join-Path $repo "src\data") -Include @("*.json","*.ts","*.tsx")
$routeFile = @(Get-FilesSafe -Path (Join-Path $repo "src") -Include @("AppRoutes.tsx","routes.tsx","router.tsx") | Select-Object -First 1)

$features = @(
  (Measure-Feature -Name "Public Landing & Auth" -AudienceFit "High" -BusinessValue "High" -FilePatterns @("PublicLanding","Login","Signup","Auth","About") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Dashboard / Home" -AudienceFit "High" -BusinessValue "High" -FilePatterns @("Dashboard","HomePage","MissionControl") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Projects Workspace" -AudienceFit "High" -BusinessValue "High" -FilePatterns @("Project","Projects") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Survey / Intake Import" -AudienceFit "Medium-High" -BusinessValue "High" -FilePatterns @("ImportIntake","Survey","Intake") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Room Wizard / Templates" -AudienceFit "Very High" -BusinessValue "Very High" -FilePatterns @("RoomWizard","Template","templateCatalog","RoomType","RoomTemplate") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Competitor Compare" -AudienceFit "High" -BusinessValue "Very High" -FilePatterns @("Competitor","Compare","catalog\.competitor","competitors") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Proposal / BOM / Quote" -AudienceFit "Very High" -BusinessValue "Very High" -FilePatterns @("Proposal","BOM","Quote","Quotation","Export") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Video Wall / LED Tools" -AudienceFit "Medium" -BusinessValue "Medium-High" -FilePatterns @("VideoWall","Videowall","LED","Novastar") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Guru / AI Assistant" -AudienceFit "High" -BusinessValue "Very High" -FilePatterns @("Guru","Assistant","Gemini","OpenAI","AI") -CodeFiles $codeFiles -DataFiles $dataFiles),
  (Measure-Feature -Name "Training / Guidance Layer" -AudienceFit "Very High" -BusinessValue "High" -FilePatterns @("Guide","Checklist","Training","Learn","Playbook","Help") -CodeFiles $codeFiles -DataFiles $dataFiles)
)

$ux = Get-UXSignals -CodeFiles $codeFiles

$avgScore = [math]::Round((($features | Measure-Object -Property Score -Average).Average), 1)
$overall =
  if($avgScore -ge 80){ "High" }
  elseif($avgScore -ge 60){ "Medium-High" }
  elseif($avgScore -ge 40){ "Medium" }
  elseif($avgScore -ge 20){ "Low-Medium" }
  else { "Low" }

$backlog = @()

$backlog += New-BacklogItem -Priority "P1" -Feature "First-run experience" `
  -Problem "A non-technical salesperson needs a clear starting path, not a tool list." `
  -Recommendation "Add a single guided home action strip: Start New Opportunity, Match Competitor SKU, Build Room System, Generate Proposal, Ask Guru." `
  -BusinessImpact "Reduces confusion and speeds first-value time." `
  -Effort "Medium"

$backlog += New-BacklogItem -Priority "P1" -Feature "Sales language layer" `
  -Problem "Engineering terms can feel intimidating and reduce trust." `
  -Recommendation "Add plain-English labels beside technical labels, with concise why-it-matters helper text for each tool and key field." `
  -BusinessImpact "Improves adoption by sales and distribution users." `
  -Effort "Low-Medium"

$backlog += New-BacklogItem -Priority "P1" -Feature "Confidence outputs" `
  -Problem "Sales users need to know whether a recommendation is safe to send to a customer." `
  -Recommendation "Add confidence badges: Draft, Review Needed, Commercial Ready, Engineering Review Required." `
  -BusinessImpact "Reduces accidental overselling and internal rework." `
  -Effort "Low"

$backlog += New-BacklogItem -Priority "P1" -Feature "Proposal handoff" `
  -Problem "The app must convert work into a usable quote/proposal outcome." `
  -Recommendation "Ensure every design flow ends with BOM summary, assumptions, exclusions, and a clean export path." `
  -BusinessImpact "Direct commercial value and easier handoff." `
  -Effort "Medium"

$backlog += New-BacklogItem -Priority "P2" -Feature "Guided qualification" `
  -Problem "Salespeople often do not know which technical details matter early." `
  -Recommendation "Add a client brief checklist with required, recommended, and optional questions before design starts." `
  -BusinessImpact "Higher quality inputs and fewer revisions." `
  -Effort "Medium"

$backlog += New-BacklogItem -Priority "P2" -Feature "Saved playbooks" `
  -Problem "Repeatable sales scenarios should be reusable." `
  -Recommendation "Create saved system recipes by room type, vertical, and budget band." `
  -BusinessImpact "Faster turnaround on common jobs." `
  -Effort "Medium"

$backlog += New-BacklogItem -Priority "P2" -Feature "Objection handling" `
  -Problem "Competitor comparison needs commercial talk-tracks, not only technical comparison." `
  -Recommendation "Add 'How to position against X' notes with value statements, risks, and migration tips." `
  -BusinessImpact "Improves win rate in early sales calls." `
  -Effort "Low-Medium"

$backlog += New-BacklogItem -Priority "P3" -Feature "Manager visibility" `
  -Problem "Leadership needs to know whether the tool is being used and where users struggle." `
  -Recommendation "Add usage analytics for completed journeys, abandoned flows, and most-used tools." `
  -BusinessImpact "Supports roadmap prioritisation." `
  -Effort "Medium-High"

$strengths = @(
  "Broad feature ambition aligned to real pre-sales workflows.",
  "High commercial potential where template-driven design feeds proposal output.",
  "Strong value in competitor comparison and AI-assisted guidance when data quality is high.",
  "Brand-led UI direction can create trust if simplified for first-time users."
)

$risks = @(
  "Feature breadth can overwhelm a non-technical salesperson without a guided start point.",
  "Inconsistent page layout, spacing, or duplicate navigation reduces confidence.",
  "Tools may feel engineering-led unless framed as outcomes rather than technical functions.",
  "AI/Guru value depends on grounded catalog, rules, and commercial messaging."
)

$routeSummary = "No route file detected."
if($routeFile.Count -gt 0){
  $routeText = Read-FileText $routeFile[0].FullName
  $routeCount = Count-Matches $routeText "path\s*=|path:"
  $lazyCount  = Count-Matches $routeText "lazy\s*\("
  $routeSummary = "Route file: {0} | Approx routes: {1} | Lazy imports: {2}" -f $routeFile[0].FullName, $routeCount, $lazyCount
}

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("# Wingman Salesperson Readiness Audit")
[void]$md.AppendLine("")
[void]$md.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Scope")
[void]$md.AppendLine("This report evaluates Wingman from the perspective of a non-technical salesperson. It focuses on usability, confidence, commercial outcomes, and feature readiness.")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Repo Signals")
[void]$md.AppendLine("- Repo root: `$repo")
[void]$md.AppendLine("- Code files scanned: $($codeFiles.Count)")
[void]$md.AppendLine("- Data files scanned: $($dataFiles.Count)")
[void]$md.AppendLine("- $routeSummary")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Overall Readiness")
[void]$md.AppendLine("- Average feature score: **$avgScore / 100**")
[void]$md.AppendLine("- Overall readiness: **$overall**")
[void]$md.AppendLine("")
[void]$md.AppendLine("## What a Non-Technical Salesperson Needs")
[void]$md.AppendLine("1. A clear starting point.")
[void]$md.AppendLine("2. Plain-English guidance.")
[void]$md.AppendLine("3. Confidence that outputs are safe to share.")
[void]$md.AppendLine("4. A fast path from enquiry to recommendation to proposal.")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Strengths")
foreach($s in $strengths){ [void]$md.AppendLine("- $s") }
[void]$md.AppendLine("")
[void]$md.AppendLine("## Current Risks")
foreach($r in $risks){ [void]$md.AppendLine("- $r") }
[void]$md.AppendLine("")
[void]$md.AppendLine("## Feature Readiness")
[void]$md.AppendLine("| Feature | Audience Fit | Business Value | Code Files | Data Files | Score | Readiness | Primary Risk |")
[void]$md.AppendLine("|---|---|---:|---:|---:|---:|---|---|")
foreach($f in $features | Sort-Object Score -Descending){
  [void]$md.AppendLine("| $($f.Name) | $($f.AudienceFit) | $($f.BusinessValue) | $($f.CodeFiles) | $($f.DataFiles) | $($f.Score) | $($f.Readiness) | $($f.Risk) |")
}
[void]$md.AppendLine("")
[void]$md.AppendLine("## UX Support Signals")
[void]$md.AppendLine("| Signal | Approx Hits | Interpretation |")
[void]$md.AppendLine("|---|---:|---|")
[void]$md.AppendLine("| Search / Filter | $($ux.Search) | Helps sales users find products and options faster |")
[void]$md.AppendLine("| Empty states | $($ux.EmptyStates) | Indicates how well blank/first-run cases are handled |")
[void]$md.AppendLine("| Help / Tooltips | $($ux.HelpText) | Indicates explainability for non-technical users |")
[void]$md.AppendLine("| Loading states | $($ux.LoadingStates) | Improves perceived reliability during waits |")
[void]$md.AppendLine("| Save / Export | $($ux.SaveExport) | Shows whether outputs can become usable customer deliverables |")
[void]$md.AppendLine("| Local storage usage | $($ux.LocalStorage) | Supports continuity and preference retention |")
[void]$md.AppendLine("| Recent / Pinned | $($ux.RecentPinned) | Useful for repeat actions and high-frequency tasks |")
[void]$md.AppendLine("| Onboarding signals | $($ux.Onboarding) | Shows how much first-run support exists |")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Priority Recommendations")
foreach($b in $backlog){
  [void]$md.AppendLine("### $($b.priority) - $($b.feature)")
  [void]$md.AppendLine("- Problem: $($b.problem)")
  [void]$md.AppendLine("- Recommendation: $($b.recommendation)")
  [void]$md.AppendLine("- Business impact: $($b.businessImpact)")
  [void]$md.AppendLine("- Effort: $($b.effort)")
  [void]$md.AppendLine("")
}
[void]$md.AppendLine("## Recommended Feature Framing")
[void]$md.AppendLine("- **Start New Opportunity** instead of a generic dashboard card.")
[void]$md.AppendLine("- **Find Replacement / Match Competitor** instead of technical compare wording.")
[void]$md.AppendLine("- **Build a Room System** instead of wizard-heavy engineering language.")
[void]$md.AppendLine("- **Create Quote Pack** instead of BOM/export-only wording.")
[void]$md.AppendLine("- **Ask Wingman** for the AI assistant, positioned as a guided sales coach.")
[void]$md.AppendLine("")
[void]$md.AppendLine("## Commercial Readiness Gate")
[void]$md.AppendLine("Before a feature is considered sales-ready, it should meet all of the following:")
[void]$md.AppendLine("1. Clear purpose in plain English.")
[void]$md.AppendLine("2. Guided minimum input set.")
[void]$md.AppendLine("3. Trusted output with assumptions and warnings.")
[void]$md.AppendLine("4. Export or handoff path.")
[void]$md.AppendLine("5. Obvious next step.")
[void]$md.AppendLine("")

$auditPath = Join-Path $docsDir "sales-readiness-audit.md"
[System.IO.File]::WriteAllText($auditPath, $md.ToString(), [System.Text.UTF8Encoding]::new($false))

$backlogPath = Join-Path $docsDir "sales-readiness-backlog.json"
$backlog | ConvertTo-Json -Depth 5 | Set-Content -Path $backlogPath -Encoding utf8

if($Apply){
  $salesDataDir = Join-Path $repo "src\data"
  New-Item -ItemType Directory -Force -Path $salesDataDir | Out-Null

  $starterJourneys = @(
    @{
      id = "new-opportunity"
      label = "Start New Opportunity"
      description = "Capture the minimum commercial and technical facts needed to recommend a solution."
      steps = @("Customer type","Room type","Primary use","Sources","Displays","Control needs","Budget band","Output")
    },
    @{
      id = "competitor-match"
      label = "Find Replacement / Match Competitor"
      description = "Translate a competitor part into a suitable Wingman-aligned recommendation."
      steps = @("Competitor brand","Competitor SKU","Core function","Critical ports","Commercial notes","Recommendation")
    },
    @{
      id = "quick-quote"
      label = "Create Quote Pack"
      description = "Turn a selected design into a sales-safe summary with assumptions and exclusions."
      steps = @("System selected","Add ancillaries","Commercial assumptions","Exclusions","Export")
    }
  )

  $starterPath = Join-Path $salesDataDir "sales-starter-journeys.json"
  $starterJourneys | ConvertTo-Json -Depth 6 | Set-Content -Path $starterPath -Encoding utf8

  $readinessModel = @{
    statuses = @("Draft","Review Needed","Commercial Ready","Engineering Review Required")
    rules = @(
      @{ key = "hasAssumptions"; required = $true },
      @{ key = "hasExclusions"; required = $true },
      @{ key = "hasCommercialSummary"; required = $true },
      @{ key = "hasExportPath"; required = $true }
    )
  }

  $readinessPath = Join-Path $salesDataDir "sales-readiness-model.json"
  $readinessModel | ConvertTo-Json -Depth 6 | Set-Content -Path $readinessPath -Encoding utf8
}

Write-Host ""
Write-Host "== Wingman Salesperson Readiness Audit ==" -ForegroundColor Cyan
Write-Host "Repo: $repo"
Write-Host "Backup: $rescue"
Write-Host "Audit: $auditPath"
Write-Host "Backlog: $backlogPath"
if($Apply){
  Write-Host "Scaffolded: src\data\sales-starter-journeys.json"
  Write-Host "Scaffolded: src\data\sales-readiness-model.json"
}
Write-Host ""
Write-Host "Overall readiness: $overall ($avgScore / 100)" -ForegroundColor Yellow
Write-Host "Top features by current signal:"
$features | Sort-Object Score -Descending | Select-Object -First 5 | ForEach-Object {
  Write-Host (" - {0}: {1} ({2}/100)" -f $_.Name, $_.Readiness, $_.Score)
}
Write-Host ""
Write-Host "Next:"
Write-Host "1. Open docs\sales-readiness-audit.md"
Write-Host "2. Review docs\sales-readiness-backlog.json"
Write-Host "3. Use the P1 items as the next UI implementation phase"
