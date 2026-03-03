[CmdletBinding()]
param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if(-not $Apply){ throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start)
  $d = if($Start -and (Test-Path $Start)){ (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while($true){
    if(Test-Path (Join-Path $d "package.json")){ return $d }
    $p = Split-Path $d -Parent
    if([string]::IsNullOrWhiteSpace($p) -or $p -eq $d){
      throw "Could not locate repo root."
    }
    $d = $p
  }
}

function Write-Text([string]$Path,[string]$Text){
  $dir = Split-Path $Path -Parent
  if($dir -and !(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path,[string]$RescueRoot,[string]$RepoRoot){
  if(!(Test-Path $Path)){ return }
  $rel = $Path.Substring($RepoRoot.Length).TrimStart("\","/")
  $dest = Join-Path $RescueRoot $rel
  $dir = Split-Path $dest -Parent
  if(!(Test-Path $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Copy-Item -Force -Path $Path -Destination $dest
}

$repo = Find-RepoRoot -Start $Root
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $repo "_RESCUE\PublicLandingSimplify_$stamp"
New-Item -ItemType Directory -Force -Path $rescue | Out-Null

$pagePath = Join-Path $repo "src\pages\public\PublicLandingPage.tsx"
if(!(Test-Path $pagePath)){
  throw "Missing: $pagePath"
}

Backup-File -Path $pagePath -RescueRoot $rescue -RepoRoot $repo

$newPage = @'
import React from "react";
import { useNavigate } from "react-router-dom";

function CtaButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary ? "wm-btn wm-btn-primary" : "wm-btn"}
      style={{
        height: 42,
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

function ValueCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      className="wm-hover-lift"
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(77,183,255,0.28)",
          background: "rgba(77,183,255,0.12)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {number}
      </div>
      <div style={{ marginTop: 12, fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const nav = useNavigate();

  return (
    <div
      className="wm-page wm-animate-in"
      style={{
        width: "100%",
        maxWidth: 1320,
        margin: "0 auto",
        padding: "28px 20px 36px",
        display: "grid",
        gap: 24,
      }}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <div
          className="wm-card"
          style={{
            padding: 24,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.04) 100%)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.84)",
            }}
          >
            WyreStorm Wingman
          </div>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: 34,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              fontWeight: 900,
            }}
          >
            The faster way to turn AV requirements into the right WyreStorm solution.
          </h1>

          <div
            style={{
              marginTop: 14,
              maxWidth: 760,
              fontSize: 16,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.88)",
            }}
          >
            Wingman helps sales and pre-sales teams move from customer need to recommended design path, product direction, and quote-ready workflow without needing deep engineering knowledge.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <CtaButton label="Open Dashboard" primary onClick={() => nav("/app/dashboard")} />
            <CtaButton label="Explore Catalog" onClick={() => nav("/app/tools/catalog")} />
            <CtaButton label="About Wingman" onClick={() => nav("/about")} />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[
              "Sales-first workflow",
              "Faster design starting point",
              "Competitor comparison",
              "Proposal handoff support",
            ].map((item) => (
              <span
                key={item}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.035)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div
          className="wm-card"
          style={{
            padding: 22,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.045)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>What Wingman helps you do</div>

          <ValueCard
            title="Start in the right place"
            text="Choose the best path for the opportunity: brief-led, template-led, competitor-led, or guided assistance."
          />
          <ValueCard
            title="Reduce technical dependency"
            text="Help sales users move forward without needing to rely on engineering for every first-step decision."
          />
          <ValueCard
            title="Convert faster"
            text="Move into Room Wizard, Proposal Builder, Competitor Compare, and Guru with a clearer workflow."
          />
        </div>
      </section>

      <section
        className="wm-card"
        style={{
          padding: 22,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.045)",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>How Wingman works</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
            A clearer three-step story that explains the product in plain English.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <StepCard
            number="1"
            title="Capture the requirement"
            text="Start from the brief, a room type, or a competitor reference to frame the opportunity correctly."
          />
          <StepCard
            number="2"
            title="Choose the right workflow"
            text="Use Templates, Room Wizard, Catalog, or Guru to narrow the design direction quickly."
          />
          <StepCard
            number="3"
            title="Move into delivery"
            text="Hand off into Proposal Builder and the rest of the app with more confidence and less rework."
          />
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        <ValueCard
          title="For sales"
          text="Find the right starting point faster, qualify opportunities better, and avoid getting lost in technical detail."
        />
        <ValueCard
          title="For pre-sales"
          text="Reduce repetitive guidance by steering users into stronger self-service paths and clearer design workflows."
        />
        <ValueCard
          title="For WyreStorm"
          text="Improve internal consistency, accelerate solution discovery, and make product selection easier to scale."
        />
      </section>
    </div>
  );
}
'@

Write-Text -Path $pagePath -Text $newPage

Write-Host ""
Write-Host "== Public landing page simplified ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "File:   $pagePath"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Replaced the landing page with a simpler purpose-led layout"
Write-Host " - Clearer value proposition"
Write-Host " - Fewer sections, less noise"
Write-Host " - Stronger call-to-action path into the app"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Refresh http://localhost:3000/"
