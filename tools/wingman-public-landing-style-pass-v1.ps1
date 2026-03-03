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
$rescue = Join-Path $repo "_RESCUE\LandingStylePass_$stamp"
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
        height: 44,
        padding: "0 16px",
        fontSize: 14,
        fontWeight: 700,
        borderRadius: 12,
      }}
    >
      {label}
    </button>
  );
}

function GlassCard({
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
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.045) 100%)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 7, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.045)",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 }}>{label}</div>
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
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        padding: 18,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(77,183,255,0.32)",
          background: "rgba(77,183,255,0.16)",
          color: "rgba(255,255,255,0.96)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {number}
      </div>
      <div style={{ marginTop: 12, fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
        {text}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const nav = useNavigate();

  const pills = [
    "Sales-first workflow",
    "Competitor comparison",
    "Room design guidance",
    "Quote-ready handoff",
  ];

  return (
    <div
      className="wm-page wm-animate-in"
      style={{
        width: "100%",
        maxWidth: 1380,
        margin: "0 auto",
        padding: "30px 22px 40px",
        display: "grid",
        gap: 24,
      }}
    >
      <section
        className="wm-card"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 26,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.14)",
          background:
            "radial-gradient(circle at top right, rgba(77,183,255,0.18) 0%, rgba(77,183,255,0.02) 28%, rgba(255,255,255,0.04) 28%, rgba(255,255,255,0.03) 100%)",
          boxShadow: "0 22px 48px rgba(0,0,0,0.24)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(77,183,255,0.22) 0%, rgba(77,183,255,0.05) 45%, rgba(77,183,255,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <img
                src="/heroLogo.png"
                alt="WyreStorm Wingman"
                style={{
                  display: "block",
                  maxHeight: 64,
                  width: "auto",
                  height: "auto",
                  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))",
                }}
              />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.045)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                WyreStorm Wingman
              </div>
            </div>

            <h1
              style={{
                margin: "18px 0 0",
                fontSize: 38,
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                fontWeight: 900,
                maxWidth: 760,
              }}
            >
              Turn AV opportunities into the right WyreStorm path, faster.
            </h1>

            <div
              style={{
                marginTop: 16,
                maxWidth: 760,
                fontSize: 16,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Wingman helps sales and pre-sales teams move from customer requirement to design direction, product family, and next-step workflow without getting lost in engineering detail.
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
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {pills.map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
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
            style={{
              display: "grid",
              gap: 14,
              alignContent: "start",
            }}
          >
            <GlassCard
              title="Start in the right place"
              text="Use the right entry path for the opportunity: brief-led, template-led, competitor-led, or guided assistance."
            />
            <GlassCard
              title="Reduce dependency on engineering"
              text="Help sales users move forward with stronger first-step decisions before technical escalation is needed."
            />
            <GlassCard
              title="Move into delivery faster"
              text="Hand off into Room Wizard, Proposal Builder, Catalog, and Guru with a clearer workflow and less rework."
            />
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatTile value="1" label="clear starting point for the opportunity" />
        <StatTile value="3" label="simple steps from need to delivery" />
        <StatTile value="5+" label="guided workflow destinations inside the app" />
        <StatTile value="Less" label="dependency on technical interpretation for first-step action" />
      </section>

      <section
        className="wm-card"
        style={{
          padding: 22,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.04) 100%)",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>How Wingman works</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
            A cleaner explanation of what the product actually does.
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
            text="Use Templates, Catalog, Room Wizard, or Guru to narrow the design direction quickly."
          />
          <StepCard
            number="3"
            title="Move into delivery"
            text="Hand off into Proposal Builder and the wider app with more confidence and less back-and-forth."
          />
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 14,
        }}
      >
        <GlassCard
          title="For sales"
          text="Find the right starting point faster, qualify opportunities better, and avoid getting stuck in technical detail too early."
        />
        <GlassCard
          title="For pre-sales"
          text="Reduce repetitive first-step guidance by steering users into stronger self-service paths and clearer design workflows."
        />
        <GlassCard
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
Write-Host "== Public landing page style pass applied ==" -ForegroundColor Cyan
Write-Host "Repo:   $repo"
Write-Host "File:   $pagePath"
Write-Host "Backup: $rescue"
Write-Host ""
Write-Host "What changed:"
Write-Host " - Stronger branded hero"
Write-Host " - Better visual layering and gradients"
Write-Host " - Added stat strip for more visual interest"
Write-Host " - Improved cards and section styling"
Write-Host ""
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Refresh http://localhost:3000/"