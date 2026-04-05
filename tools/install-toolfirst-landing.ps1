Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = Join-Path (Get-Location).Path $Path
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

$tsx = @'
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  LayoutGrid,
  MonitorSmartphone,
} from "lucide-react";
import "@/styles/public-landing-toolfirst.css";

const workflow = [
  {
    step: "01",
    title: "Discover",
    text: "Capture sources, displays, distance, control, USB and application constraints before selecting hardware.",
    href: "/app/tools/discovery",
    icon: ClipboardList,
  },
  {
    step: "02",
    title: "Design",
    text: "Move into the right WyreStorm architecture path: extender, matrix, AVoIP or video wall.",
    href: "/app/tools/catalog",
    icon: Layers3,
  },
  {
    step: "03",
    title: "Deliver",
    text: "Generate a cleaner proposal-ready output with supporting technical rationale.",
    href: "/app/tools/proposal",
    icon: FileText,
  },
];

const quickTools = [
  {
    title: "Discovery Wizard",
    text: "Start a new opportunity and structure the brief properly.",
    href: "/app/tools/discovery",
  },
  {
    title: "Catalogue",
    text: "Review product families and recommended solution paths.",
    href: "/app/tools/catalog",
  },
  {
    title: "Proposal Builder",
    text: "Turn technical direction into customer-facing output.",
    href: "/app/tools/proposal",
  },
  {
    title: "Video Wall Planner",
    text: "Model wall layouts and hardware approach.",
    href: "/app/tools/video-wall",
  },
];

const proofPoints = [
  "Faster qualification for non-engineering sales users",
  "More consistent architecture selection across the team",
  "Cleaner handoff from requirement to proposal output",
];

export default function PublicLandingPage() {
  return (
    <main className="wm-public">
      <section className="wm-public-shell">
        <header className="wm-public-topbar">
          <div className="wm-public-brand">
            <img
              src="/WyreStorm-Wingman-logo.png"
              alt="WyreStorm Wingman"
              className="wm-public-brand-logo"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
              }}
            />
            <div className="wm-public-brand-copy">
              <span className="wm-public-eyebrow">WyreStorm Wingman</span>
              <strong>Sales enablement for real AV projects</strong>
            </div>
          </div>

          <div className="wm-public-topbar-actions">
            <Link to="/login" className="wm-public-btn wm-public-btn-ghost">
              Log in
            </Link>
            <Link to="/signup" className="wm-public-btn wm-public-btn-primary">
              Open Wingman
            </Link>
          </div>
        </header>

        <section className="wm-public-hero">
          <div className="wm-public-hero-main">
            <div className="wm-public-kicker">
              <LayoutGrid size={15} />
              <span>Tool-first workflow</span>
            </div>

            <h1 className="wm-public-title">
              Move from AV requirement
              <br />
              to product recommendation
              <br />
              with less guesswork.
            </h1>

            <p className="wm-public-subtitle">
              Wingman helps sales and pre-sales teams structure the brief, select
              the correct WyreStorm path, and produce cleaner proposal-ready output
              without needing full integration-level knowledge at the first step.
            </p>

            <div className="wm-public-cta-row">
              <Link to="/signup" className="wm-public-btn wm-public-btn-primary">
                Start in Wingman
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="wm-public-btn wm-public-btn-ghost">
                Existing user login
              </Link>
            </div>

            <div className="wm-public-proof">
              {proofPoints.map((item) => (
                <div key={item} className="wm-public-proof-item">
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="wm-public-guru">
            <div className="wm-public-guru-head">
              <div className="wm-public-guru-badge">
                <img src="/guru.png" alt="Wingman Guru" className="wm-public-guru-mark" />
                <span>Guru Assistance</span>
              </div>
              <span className="wm-public-status">Ready</span>
            </div>

            <h2>Guided help before the product choice</h2>
            <p>
              Guru helps users identify missing requirements, challenge the wrong
              architecture early, and improve technical consistency before proposal
              generation.
            </p>

            <div className="wm-public-guru-prompts">
              <div className="wm-public-prompt">
                “Is this application better suited to matrix switching or AVoIP?”
              </div>
              <div className="wm-public-prompt">
                “What is still missing from this customer brief?”
              </div>
              <div className="wm-public-prompt">
                “What WyreStorm path fits this video wall requirement?”
              </div>
            </div>

            <Link to="/app/tools/guru" className="wm-public-btn wm-public-btn-guru">
              <Bot size={16} />
              Open Guru
            </Link>
          </aside>
        </section>

        <section className="wm-public-workflow">
          <div className="wm-public-section-head">
            <span className="wm-public-section-label">Core workflow</span>
            <h2>Start with the brief. Then move into the right tool.</h2>
          </div>

          <div className="wm-public-workflow-grid">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="wm-public-workflow-card">
                  <div className="wm-public-workflow-top">
                    <div className="wm-public-step-chip">{item.step}</div>
                    <div className="wm-public-workflow-icon">
                      <Icon size={18} />
                    </div>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.text}</p>

                  <Link to={item.href} className="wm-public-inline-link">
                    Open {item.title}
                    <ArrowRight size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="wm-public-tools">
          <div className="wm-public-section-head">
            <span className="wm-public-section-label">Key tools</span>
            <h2>Jump straight into the area you need.</h2>
          </div>

          <div className="wm-public-tools-grid">
            {quickTools.map((tool) => (
              <Link key={tool.title} to={tool.href} className="wm-public-tool-card">
                <div className="wm-public-tool-top">
                  <strong>{tool.title}</strong>
                  <ArrowRight size={16} />
                </div>
                <p>{tool.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="wm-public-footer-band">
          <div className="wm-public-footer-copy">
            <div className="wm-public-footer-icon">
              <MonitorSmartphone size={18} />
            </div>
            <div>
              <strong>Built for practical sales support</strong>
              <p>
                Wingman is designed to reduce friction between opportunity intake,
                technical direction and proposal output.
              </p>
            </div>
          </div>

          <div className="wm-public-footer-actions">
            <Link to="/signup" className="wm-public-btn wm-public-btn-primary">
              Create account
            </Link>
            <Link to="/login" className="wm-public-btn wm-public-btn-ghost">
              Sign in
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
'@

$css = @'
.wm-public {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 22%),
    linear-gradient(180deg, #020817 0%, #071326 100%);
  color: #e8eef8;
}

.wm-public-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.wm-public-topbar,
.wm-public-hero-main,
.wm-public-guru,
.wm-public-workflow-card,
.wm-public-tool-card,
.wm-public-footer-band {
  border: 1px solid rgba(148, 163, 184, 0.14);
  background:
    linear-gradient(180deg, rgba(10, 20, 40, 0.9), rgba(4, 11, 24, 0.96));
  box-shadow:
    0 16px 40px rgba(2, 8, 23, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  border-radius: 24px;
}

.wm-public-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
}

.wm-public-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.wm-public-brand-logo {
  width: auto;
  max-width: 250px;
  height: 62px;
  object-fit: contain;
  display: block;
}

.wm-public-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wm-public-brand-copy strong {
  color: #f8fbff;
  font-size: 0.95rem;
  line-height: 1.2;
}

.wm-public-eyebrow,
.wm-public-section-label {
  color: #7dd3fc;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.wm-public-topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wm-public-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.82fr);
  gap: 18px;
  align-items: stretch;
}

.wm-public-hero-main,
.wm-public-guru {
  position: relative;
  overflow: hidden;
}

.wm-public-hero-main {
  padding: 26px;
}

.wm-public-guru {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wm-public-hero-main::before,
.wm-public-guru::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 32%),
    radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.08), transparent 24%);
}

.wm-public-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(96, 165, 250, 0.18);
  color: #cfe4ff;
  font-size: 0.76rem;
  font-weight: 700;
}

.wm-public-title {
  margin: 16px 0 12px;
  color: #f8fbff;
  font-size: clamp(2.35rem, 4vw, 3.55rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  font-weight: 850;
  max-width: 760px;
}

.wm-public-subtitle {
  max-width: 690px;
  margin: 0 0 18px;
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.98rem;
  line-height: 1.62;
}

.wm-public-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.wm-public-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 700;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.wm-public-btn:hover {
  transform: translateY(-1px);
}

.wm-public-btn-primary {
  color: #07111f;
  background: linear-gradient(135deg, #93c5fd, #38bdf8);
}

.wm-public-btn-ghost {
  color: #dce8fb;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.wm-public-btn-guru {
  width: 100%;
  color: #eef6ff;
  background: linear-gradient(135deg, rgba(29, 78, 216, 0.55), rgba(8, 47, 73, 0.92));
  border: 1px solid rgba(96, 165, 250, 0.2);
}

.wm-public-proof {
  display: grid;
  gap: 10px;
}

.wm-public-proof-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #dce8fb;
  font-size: 0.9rem;
}

.wm-public-proof-item svg {
  color: #7dd3fc;
  flex: 0 0 auto;
}

.wm-public-guru-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.wm-public-guru-badge,
.wm-public-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.wm-public-guru-badge {
  color: #eaf4ff;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(96, 165, 250, 0.18);
}

.wm-public-status {
  color: #dcfce7;
  background: rgba(20, 83, 45, 0.28);
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.wm-public-guru-mark {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}

.wm-public-guru h2 {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.15;
  font-weight: 800;
  color: #f8fbff;
}

.wm-public-guru p {
  margin: 0;
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.92rem;
  line-height: 1.58;
}

.wm-public-guru-prompts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wm-public-prompt {
  padding: 12px 13px;
  border-radius: 14px;
  color: #dce9fb;
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(148, 163, 184, 0.12);
  font-size: 0.85rem;
  line-height: 1.45;
}

.wm-public-workflow,
.wm-public-tools {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wm-public-section-head h2 {
  margin: 4px 0 0;
  color: #f8fbff;
  font-size: 1.22rem;
  font-weight: 800;
}

.wm-public-workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.wm-public-workflow-card {
  padding: 16px;
}

.wm-public-workflow-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.wm-public-step-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #38bdf8);
  color: #f8fbff;
  font-size: 0.9rem;
  font-weight: 800;
}

.wm-public-workflow-icon,
.wm-public-footer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: #dce8fb;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.28), rgba(15, 23, 42, 0.88));
  border: 1px solid rgba(96, 165, 250, 0.18);
}

.wm-public-workflow-card h3 {
  margin: 0 0 8px;
  color: #f8fbff;
  font-size: 1rem;
  font-weight: 800;
}

.wm-public-workflow-card p,
.wm-public-tool-card p,
.wm-public-footer-copy p {
  margin: 0;
  color: rgba(226, 232, 240, 0.76);
  font-size: 0.88rem;
  line-height: 1.56;
}

.wm-public-inline-link {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #8fd1ff;
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
}

.wm-public-tools-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.wm-public-tool-card {
  padding: 16px;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.wm-public-tool-card:hover,
.wm-public-workflow-card:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.22);
}

.wm-public-tool-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.wm-public-tool-top strong,
.wm-public-footer-copy strong {
  color: #f8fbff;
  font-size: 0.95rem;
}

.wm-public-footer-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
}

.wm-public-footer-copy {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.wm-public-footer-copy p {
  margin-top: 4px;
  max-width: 620px;
}

.wm-public-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 1180px) {
  .wm-public-hero,
  .wm-public-workflow-grid {
    grid-template-columns: 1fr;
  }

  .wm-public-tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .wm-public-shell {
    padding: 12px;
    gap: 14px;
  }

  .wm-public-topbar,
  .wm-public-footer-band {
    flex-direction: column;
    align-items: stretch;
  }

  .wm-public-brand {
    flex-direction: column;
    align-items: flex-start;
  }

  .wm-public-brand-logo {
    max-width: 220px;
    height: auto;
  }

  .wm-public-title {
    font-size: 2rem;
  }

  .wm-public-tools-grid {
    grid-template-columns: 1fr;
  }

  .wm-public-footer-actions,
  .wm-public-topbar-actions,
  .wm-public-cta-row {
    flex-direction: column;
  }

  .wm-public-btn {
    width: 100%;
  }
}
'@

Save-Utf8NoBom "src\pages\PublicLandingPage.tsx" $tsx
Save-Utf8NoBom "src\styles\public-landing-toolfirst.css" $css

Write-Host "Tool-first landing page installed."
Write-Host "Now run:"
Write-Host "npm run typecheck"
Write-Host "npm run dev"