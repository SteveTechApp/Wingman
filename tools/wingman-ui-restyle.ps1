param(
    [switch]$Apply
)

$repo = Get-Location
$src = Join-Path $repo "src"

Write-Host ""
Write-Host "Wingman UI Restyle Audit" -ForegroundColor Cyan

$topbar = Get-ChildItem $src -Recurse -Filter TopBar.tsx | Select-Object -First 1
$nav = Get-ChildItem $src -Recurse -Filter MissionControlNav.tsx | Select-Object -First 1
$dashboard = Get-ChildItem $src -Recurse -Filter DashboardPage.tsx | Select-Object -First 1

Write-Host ""
Write-Host "TopBar:" $topbar.FullName
Write-Host "Workspace Nav:" $nav.FullName
Write-Host "Dashboard:" $dashboard.FullName

if(!$Apply){
    Write-Host ""
    Write-Host "Run with -Apply to implement the layout updates." -ForegroundColor Yellow
    exit
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\UIRestyle_$timestamp"
New-Item $rescue -ItemType Directory | Out-Null

Copy-Item $topbar.FullName $rescue
Copy-Item $nav.FullName $rescue
Copy-Item $dashboard.FullName $rescue

Write-Host "Backup saved to $rescue"

# ------------------------------------------------
# Replace TopBar with cleaner layout
# ------------------------------------------------

$topbarCode = @'
import React from "react";
import { useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/hero-logo.png";

export default function TopBar() {

  const nav = useNavigate();

  return (
    <div className="wm-topbar">

      <div className="wm-topbar-left">
        <img
          src={heroLogo}
          alt="WyreStorm Wingman"
          className="wm-logo"
        />
        <div className="wm-title">
          Wingman
          <span>Pre-sales workflow and proposal platform</span>
        </div>
      </div>

      <div className="wm-topbar-nav">
        <button onClick={()=>nav("/app/dashboard")}>Dashboard</button>
        <button onClick={()=>nav("/app/projects")}>Projects</button>
        <button onClick={()=>nav("/app/tools")}>Tools</button>
      </div>

      <div className="wm-topbar-right">
        <button onClick={()=>nav("/")}>Home</button>
      </div>

    </div>
  );
}
'@

Set-Content $topbar.FullName $topbarCode

# ------------------------------------------------
# Improve Workspace Navigation structure
# ------------------------------------------------

$navCode = @'
import React from "react";
import { Link } from "react-router-dom";

export default function MissionControlNav() {

  return (
    <aside className="wm-sidebar">

      <section>
        <div className="wm-nav-section">Workspace</div>
        <Link to="/app/dashboard">Dashboard</Link>
        <Link to="/app/projects">Projects</Link>
      </section>

      <section>
        <div className="wm-nav-section">Core Tools</div>
        <Link to="/app/tools/discovery">Discovery</Link>
        <Link to="/app/tools/room-wizard">Room Wizard</Link>
        <Link to="/app/tools/catalog">Product Catalog</Link>
        <Link to="/app/tools/proposal">Proposal Builder</Link>
      </section>

      <section>
        <div className="wm-nav-section">More</div>
        <Link to="/app/tools">Tool Hub</Link>
        <Link to="/app/import">Import Intake</Link>
      </section>

    </aside>
  );
}
'@

Set-Content $nav.FullName $navCode

# ------------------------------------------------
# Add icon button beside Recent Projects
# ------------------------------------------------

$content = Get-Content $dashboard.FullName -Raw

if($content -notmatch "deleteProject"){

$content = $content -replace 'Open</button>',
'Open</button>
<button className="wm-icon-btn" title="Delete Project">🗑</button>'
}

Set-Content $dashboard.FullName $content

Write-Host ""
Write-Host "Wingman UI restyle applied." -ForegroundColor Green
Write-Host "Refresh the browser to view changes."