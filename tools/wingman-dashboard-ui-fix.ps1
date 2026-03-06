param(
    [switch]$Apply
)

$repo = Get-Location
$src = Join-Path $repo "src"

Write-Host ""
Write-Host "Wingman Dashboard UI Fix Audit" -ForegroundColor Cyan

# Files we expect
$topbar = Get-ChildItem -Recurse -Path $src -Filter TopBar.tsx | Select-Object -First 1
$nav = Get-ChildItem -Recurse -Path $src -Filter MissionControlNav.tsx | Select-Object -First 1
$dashboard = Get-ChildItem -Recurse -Path $src -Filter DashboardPage.tsx | Select-Object -First 1

Write-Host ""
Write-Host "TopBar:" $topbar.FullName
Write-Host "Nav:" $nav.FullName
Write-Host "Dashboard:" $dashboard.FullName

if(!$Apply){
    Write-Host ""
    Write-Host "Run with -Apply to implement fixes." -ForegroundColor Yellow
    exit
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\DashboardUIFix_$timestamp"
New-Item $rescue -ItemType Directory | Out-Null

Copy-Item $topbar.FullName $rescue
Copy-Item $nav.FullName $rescue
Copy-Item $dashboard.FullName $rescue

Write-Host ""
Write-Host "Backup created:" $rescue -ForegroundColor Green

# ------------------------------------------------
# Fix TopBar Logo
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
          style={{ height: 36 }}
        />
        <div className="wm-topbar-title">
          <strong>Wingman</strong>
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
# Restyle Left Navigation
# ------------------------------------------------

$navCode = @'
import React from "react";
import { Link } from "react-router-dom";

export default function MissionControlNav() {
  return (
    <div className="wm-nav">

      <div className="wm-nav-section">
        <div className="wm-nav-title">Workspace</div>
        <Link to="/app/dashboard">Dashboard</Link>
        <Link to="/app/projects">Projects</Link>
      </div>

      <div className="wm-nav-section">
        <div className="wm-nav-title">Core Tools</div>
        <Link to="/app/tools/discovery">Discovery</Link>
        <Link to="/app/tools/room-wizard">Room Wizard</Link>
        <Link to="/app/tools/catalog">Product Catalog</Link>
        <Link to="/app/tools/proposal">Proposal Builder</Link>
      </div>

      <div className="wm-nav-section">
        <div className="wm-nav-title">More</div>
        <Link to="/app/tools">Tool Hub</Link>
        <Link to="/app/import">Import Intake</Link>
      </div>

    </div>
  );
}
'@

Set-Content $nav.FullName $navCode

# ------------------------------------------------
# Add Delete button to recent projects
# ------------------------------------------------

$dashboardContent = Get-Content $dashboard.FullName -Raw

if($dashboardContent -notmatch "Delete"){
    $dashboardContent = $dashboardContent -replace "Open</button>",
        "Open</button><button className='wm-btn-danger'>Delete</button>"
}

Set-Content $dashboard.FullName $dashboardContent

Write-Host ""
Write-Host "Dashboard UI updates applied." -ForegroundColor Green
Write-Host "Refresh the browser to view changes."