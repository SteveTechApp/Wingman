Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param([string]$Path,[string]$Content)
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path,$Content,$utf8)
}

function Backup($p){
  if(!(Test-Path $p)){return}
  $r="$root\_RESCUE"
  if(!(Test-Path $r)){mkdir $r|Out-Null}
  $t=Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $p "$r\$t-$(Split-Path $p -Leaf).bak"
}

# ------------------------------------------------------------
# 1. CREATE UNIFIED TOOL FRAME
# ------------------------------------------------------------
$framePath = "$root\src\components\layout\WingmanToolFrame.tsx"

$frame = @'
import { ReactNode } from "react";
import GlowGuide from "@/ui2/page/GlowGuide";

type Props = {
  title: string;
  subtitle: string;
  steps: { title: string; copy: string }[];
  children: ReactNode;
};

export default function WingmanToolFrame({
  title,
  subtitle,
  steps,
  children,
}: Props) {
  return (
    <div className="wm-fit-page">

      {/* HERO */}
      <section className="wm-surface-card wm-fit-page__hero">
        <div style={{ display: "grid", gap: 8 }}>
          <div className="wm-page-kicker">Tool</div>
          <div className="wm-page-title">{title}</div>
          <div className="wm-page-copy">{subtitle}</div>
        </div>

        <GlowGuide
          title="How to use this"
          activeIndex={0}
          steps={steps}
        />
      </section>

      {/* BODY */}
      <section className="wm-fit-page__body wm-grid-2">
        {children}
      </section>

    </div>
  );
}
'@

Save-Utf8NoBom $framePath $frame

# ------------------------------------------------------------
# 2. PATCH DISCOVERY PAGE (STRUCTURE ONLY)
# ------------------------------------------------------------
$discPath = "$root\src\features\discovery\DiscoveryWizardPage.tsx"

if(Test-Path $discPath){
  Backup $discPath
  $disc = Get-Content $discPath -Raw

  if($disc -notmatch "WingmanToolFrame"){
    $disc = $disc -replace 'export default function DiscoveryWizardPage\(\) \{',
@'
import WingmanToolFrame from "@/components/layout/WingmanToolFrame";

export default function DiscoveryWizardPage() {
'@
  }

  # wrap return
  $disc = $disc -replace 'return \(\s*<div className="wm-fit-page[^>]*>',
@'
return (
  <WingmanToolFrame
    title="Discovery"
    subtitle="Capture requirements before selecting products."
    steps={[
      { title: "Capture inputs", copy: "Define sources, displays and environment." },
      { title: "Validate direction", copy: "Confirm architecture direction." },
      { title: "Move forward", copy: "Continue to the correct tool." },
    ]}
  >
'@

  $disc = $disc -replace '</div>\s*\);\s*\}', @'
  </WingmanToolFrame>
);
}
'@

  Save-Utf8NoBom $discPath $disc
}

# ------------------------------------------------------------
# 3. PATCH PROPOSAL PAGE
# ------------------------------------------------------------
$propPath = "$root\src\features\proposal\ProposalPage.tsx"

if(Test-Path $propPath){
  Backup $propPath
  $p = Get-Content $propPath -Raw

  if($p -notmatch "WingmanToolFrame"){
    $p = $p -replace 'export default function ProposalPage\(\) \{',
@'
import WingmanToolFrame from "@/components/layout/WingmanToolFrame";

export default function ProposalPage() {
'@
  }

  $p = $p -replace 'return \(\s*<div className="wm-fit-page[^>]*>',
@'
return (
  <WingmanToolFrame
    title="Proposal Builder"
    subtitle="Turn system design into customer-ready output."
    steps={[
      { title: "Set context", copy: "Project and customer framing." },
      { title: "Select tier", copy: "Define solution level." },
      { title: "Review output", copy: "Validate BOM and summary." },
    ]}
  >
'@

  $p = $p -replace '</div>\s*\);\s*\}', @'
  </WingmanToolFrame>
);
}
'@

  Save-Utf8NoBom $propPath $p
}

# ------------------------------------------------------------
# 4. PATCH VIDEO WALL PAGE
# ------------------------------------------------------------
$vwPath = "$root\src\features\misc\videoWall\VideoWallPlannerRebuild.tsx"

if(Test-Path $vwPath){
  Backup $vwPath
  $vw = Get-Content $vwPath -Raw

  if($vw -notmatch "WingmanToolFrame"){
    $vw = $vw -replace 'export default function VideoWallPlannerRebuild\(\) \{',
@'
import WingmanToolFrame from "@/components/layout/WingmanToolFrame";

export default function VideoWallPlannerRebuild() {
'@
  }

  $vw = $vw -replace 'return \(\s*<div className="wm-fit-page[^>]*>',
@'
return (
  <WingmanToolFrame
    title="Video Wall Planner"
    subtitle="Define wall behaviour before choosing hardware."
    steps={[
      { title: "Define wall", copy: "Size, type and sources." },
      { title: "Validate behaviour", copy: "Single canvas vs multiview." },
      { title: "Confirm approach", copy: "Processor vs AVoIP." },
    ]}
  >
'@

  $vw = $vw -replace '</div>\s*\);\s*\}', @'
  </WingmanToolFrame>
);
}
'@

  Save-Utf8NoBom $vwPath $vw
}

Write-Host ""
Write-Host "Tool system installed."
Write-Host "Run:"
Write-Host "npm run typecheck"
Write-Host "npm run dev"