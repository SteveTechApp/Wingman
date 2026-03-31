$ErrorActionPreference = "Stop"
Set-Location "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-IfExists {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $Path "$Path.bak.$stamp" -Force
  }
}

$landingPath = "C:\Users\steve\wingman\src\pages\PublicLandingPage.tsx"
$signupPath  = "C:\Users\steve\wingman\src\pages\SignupPage.tsx"

Backup-IfExists $landingPath
Backup-IfExists $signupPath

$landingContent = @'
import { Link } from "react-router-dom";

const primaryCta = "/login";
const secondaryCta = "/signup";

const valueCards = [
  {
    title: "Guide sales conversations",
    text: "Help sales teams move from requirement to the right WyreStorm approach faster.",
  },
  {
    title: "Build system confidence",
    text: "Turn application detail into practical recommendation logic and cleaner outputs.",
  },
  {
    title: "Reduce dependency",
    text: "Give less technical users a more self-serve path without losing structure.",
  },
];

const steps = [
  {
    k: "01",
    t: "Discover",
    d: "Capture the application clearly and structure the brief.",
  },
  {
    k: "02",
    t: "Recommend",
    d: "Match topology, features, and products with more confidence.",
  },
  {
    k: "03",
    t: "Deliver",
    d: "Support proposal-ready output with less internal back-and-forth.",
  },
];

export default function PublicLandingPage() {
  return (
    <div className="wm-public-landing-page">
      <style>
        {`
          .wm-public-landing-page {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
            background:
              radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 24%),
              radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 22%),
              linear-gradient(180deg, #071224 0%, #0b1730 52%, #10203f 100%);
            color: #e5edf7;
          }

          .wm-public-landing-page *,
          .wm-public-landing-page *::before,
          .wm-public-landing-page *::after {
            box-sizing: border-box;
          }

          .wm-public-landing-page__root {
            width: 100%;
            height: 100%;
            padding: clamp(12px, 1.5vw, 20px);
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          .wm-public-landing-page__shell {
            width: min(1120px, 100%);
            height: 100%;
            max-height: 100%;
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
            gap: clamp(12px, 1.2vw, 18px);
            align-items: stretch;
            overflow: hidden;
          }

          .wm-public-landing-page__panel {
            min-height: 0;
            overflow: hidden;
            border-radius: 24px;
            border: 1px solid rgba(148,163,184,0.16);
            backdrop-filter: blur(14px);
          }

          .wm-public-landing-page__panel--left {
            display: grid;
            grid-template-rows: auto auto auto 1fr;
            gap: clamp(10px, 1vh, 14px);
            padding: clamp(18px, 2vh, 28px);
            background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(15,23,42,0.62));
            box-shadow: 0 20px 60px rgba(2,8,23,0.32);
          }

          .wm-public-landing-page__panel--right {
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: clamp(10px, 1vh, 14px);
            padding: clamp(18px, 2vh, 26px);
            background: linear-gradient(180deg, rgba(5,18,43,0.92), rgba(11,32,71,0.86));
            box-shadow: 0 20px 60px rgba(2,8,23,0.34);
          }

          .wm-public-landing-page__brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            min-height: 32px;
          }

          .wm-public-landing-page__brand-mark {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, #2563eb, #38bdf8);
            box-shadow: 0 0 0 5px rgba(56,189,248,0.08);
          }

          .wm-public-landing-page__brand-label {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #7dd3fc;
          }

          .wm-public-landing-page__hero {
            display: grid;
            gap: 10px;
            align-content: start;
            min-height: 0;
          }

          .wm-public-landing-page__hero h1 {
            margin: 0;
            max-width: 720px;
            font-size: clamp(2rem, 3.8vw, 4.1rem);
            line-height: 0.98;
            letter-spacing: -0.05em;
            font-weight: 800;
            color: #f8fbff;
          }

          .wm-public-landing-page__hero p {
            margin: 0;
            max-width: 650px;
            font-size: clamp(0.95rem, 1vw, 1.05rem);
            line-height: 1.5;
            color: #a8bbd5;
          }

          .wm-public-landing-page__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
          }

          .wm-public-landing-page__btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 148px;
            height: 44px;
            padding: 0 18px;
            border-radius: 12px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            border: 1px solid rgba(148,163,184,0.16);
          }

          .wm-public-landing-page__btn--primary {
            background: linear-gradient(135deg, #2563eb, #38bdf8);
            color: white;
            box-shadow: 0 14px 28px rgba(37,99,235,0.24);
          }

          .wm-public-landing-page__btn--secondary {
            background: rgba(255,255,255,0.06);
            color: #e5edf7;
          }

          .wm-public-landing-page__cards {
            min-height: 0;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            align-content: start;
          }

          .wm-public-landing-page__card {
            min-height: 0;
            display: grid;
            align-content: start;
            gap: 8px;
            padding: 14px;
            border-radius: 18px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(148,163,184,0.12);
          }

          .wm-public-landing-page__card h2 {
            margin: 0;
            font-size: 15px;
            line-height: 1.2;
            font-weight: 700;
            color: #f8fbff;
          }

          .wm-public-landing-page__card p {
            margin: 0;
            font-size: 13px;
            line-height: 1.45;
            color: #a8bbd5;
          }

          .wm-public-landing-page__eyebrow {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #7dd3fc;
          }

          .wm-public-landing-page__right-head {
            display: grid;
            gap: 8px;
          }

          .wm-public-landing-page__right-head h2 {
            margin: 0;
            font-size: clamp(1.6rem, 2.2vw, 2.6rem);
            line-height: 1.05;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: #f8fbff;
          }

          .wm-public-landing-page__right-copy {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: rgba(226,232,240,0.78);
          }

          .wm-public-landing-page__steps {
            min-height: 0;
            display: grid;
            gap: 12px;
            align-content: start;
          }

          .wm-public-landing-page__step {
            min-height: 0;
            display: grid;
            grid-template-columns: 48px 1fr;
            gap: 14px;
            padding: 14px;
            border-radius: 18px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(148,163,184,0.14);
          }

          .wm-public-landing-page__step-num {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.95));
            color: white;
            font-size: 15px;
            font-weight: 800;
          }

          .wm-public-landing-page__step-body {
            min-width: 0;
            display: grid;
            gap: 6px;
          }

          .wm-public-landing-page__step-body h3 {
            margin: 0;
            font-size: 15px;
            line-height: 1.15;
            font-weight: 700;
            color: #f8fbff;
          }

          .wm-public-landing-page__step-body p {
            margin: 0;
            font-size: 13px;
            line-height: 1.45;
            color: rgba(226,232,240,0.78);
          }

          @media (max-height: 820px) {
            .wm-public-landing-page__panel--left,
            .wm-public-landing-page__panel--right {
              padding: 18px;
            }

            .wm-public-landing-page__hero h1 {
              font-size: clamp(1.75rem, 3vw, 3rem);
            }

            .wm-public-landing-page__cards {
              gap: 10px;
            }

            .wm-public-landing-page__card,
            .wm-public-landing-page__step {
              padding: 12px;
            }
          }

          @media (max-height: 740px) {
            .wm-public-landing-page__brand-label,
            .wm-public-landing-page__right-copy {
              display: none;
            }

            .wm-public-landing-page__hero h1 {
              font-size: clamp(1.55rem, 2.5vw, 2.4rem);
            }

            .wm-public-landing-page__btn {
              height: 40px;
              min-width: 138px;
            }

            .wm-public-landing-page__step {
              grid-template-columns: 40px 1fr;
              gap: 10px;
            }

            .wm-public-landing-page__step-num {
              width: 40px;
              height: 40px;
              border-radius: 12px;
            }
          }

          @media (max-width: 1080px) {
            .wm-public-landing-page {
              height: auto;
              max-height: none;
              min-height: 100vh;
              overflow: auto;
            }

            .wm-public-landing-page__root {
              height: auto;
              min-height: 100vh;
              overflow: visible;
            }

            .wm-public-landing-page__shell {
              height: auto;
              max-height: none;
              grid-template-columns: 1fr;
              overflow: visible;
            }
          }

          @media (max-width: 820px) {
            .wm-public-landing-page__cards {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <main className="wm-public-landing-page__root">
        <section className="wm-public-landing-page__shell">
          <article className="wm-public-landing-page__panel wm-public-landing-page__panel--left">
            <div className="wm-public-landing-page__brand">
              <span className="wm-public-landing-page__brand-mark" />
              <span className="wm-public-landing-page__brand-label">WyreStorm Wingman</span>
            </div>

            <div className="wm-public-landing-page__hero">
              <h1>AV sales enablement built to fit real-world projects.</h1>
              <p>
                Wingman helps sales and pre-sales teams qualify applications,
                recommend the right WyreStorm products, and move from discovery
                to proposal with less friction.
              </p>
            </div>

            <div className="wm-public-landing-page__actions">
              <Link to={primaryCta} className="wm-public-landing-page__btn wm-public-landing-page__btn--primary">
                Sign in
              </Link>
              <Link to={secondaryCta} className="wm-public-landing-page__btn wm-public-landing-page__btn--secondary">
                Create account
              </Link>
            </div>

            <div className="wm-public-landing-page__cards">
              {valueCards.map((card) => (
                <div key={card.title} className="wm-public-landing-page__card">
                  <h2>{card.title}</h2>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="wm-public-landing-page__panel wm-public-landing-page__panel--right">
            <div className="wm-public-landing-page__right-head">
              <div className="wm-public-landing-page__eyebrow">Why Wingman</div>
              <h2>A cleaner route from requirement to recommendation.</h2>
            </div>

            <p className="wm-public-landing-page__right-copy">
              Built for teams that need better technical consistency without
              forcing every user to be an integration specialist.
            </p>

            <div className="wm-public-landing-page__steps">
              {steps.map((step) => (
                <div key={step.k} className="wm-public-landing-page__step">
                  <div className="wm-public-landing-page__step-num">{step.k}</div>
                  <div className="wm-public-landing-page__step-body">
                    <h3>{step.t}</h3>
                    <p>{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
'@

$signupContent = @'
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Alex Smith");
  const [company, setCompany] = useState("Acme Ltd");
  const [email, setEmail] = useState("alex@acme.com");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate("/login");
  }

  return (
    <div className="wm-signup-page">
      <style>
        {`
          .wm-signup-page {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
            background:
              radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 24%),
              radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 22%),
              linear-gradient(180deg, #071224 0%, #0b1730 52%, #10203f 100%);
            color: #e5edf7;
          }

          .wm-signup-page *,
          .wm-signup-page *::before,
          .wm-signup-page *::after {
            box-sizing: border-box;
          }

          .wm-signup-page__root {
            width: 100%;
            height: 100%;
            padding: clamp(14px, 2vh, 24px);
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          .wm-signup-page__card {
            width: min(520px, 100%);
            display: grid;
            gap: 18px;
            padding: clamp(20px, 2.2vh, 28px);
            border-radius: 22px;
            background: linear-gradient(180deg, rgba(15,23,42,0.84), rgba(15,23,42,0.68));
            border: 1px solid rgba(148,163,184,0.18);
            box-shadow: 0 20px 60px rgba(2,8,23,0.34);
            backdrop-filter: blur(14px);
          }

          .wm-signup-page__head {
            display: grid;
            gap: 8px;
          }

          .wm-signup-page__eyebrow {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #7dd3fc;
          }

          .wm-signup-page__title {
            margin: 0;
            font-size: clamp(1.55rem, 2.2vw, 2.2rem);
            line-height: 1.05;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: #f8fbff;
          }

          .wm-signup-page__copy {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #a8bbd5;
          }

          .wm-signup-page__form {
            display: grid;
            gap: 12px;
          }

          .wm-signup-page__field {
            display: grid;
            gap: 6px;
          }

          .wm-signup-page__label {
            font-size: 12px;
            font-weight: 600;
            color: #a8bbd5;
          }

          .wm-signup-page__input {
            width: 100%;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(148,163,184,0.18);
            background: rgba(2,6,23,0.38);
            color: #e5edf7;
            padding: 0 14px;
            outline: none;
          }

          .wm-signup-page__input::placeholder {
            color: #89a0bf;
          }

          .wm-signup-page__input:focus {
            border-color: rgba(56,189,248,0.48);
            box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
          }

          .wm-signup-page__submit {
            width: 100%;
            height: 46px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #2563eb, #38bdf8);
            color: white;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 14px 28px rgba(37,99,235,0.24);
          }

          .wm-signup-page__links {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .wm-signup-page__links a {
            color: #7dd3fc;
            text-decoration: none;
            font-weight: 600;
          }

          @media (max-height: 760px) {
            .wm-signup-page__card {
              gap: 14px;
              padding: 18px;
            }

            .wm-signup-page__input {
              height: 40px;
            }

            .wm-signup-page__submit {
              height: 42px;
            }
          }
        `}
      </style>

      <main className="wm-signup-page__root">
        <section className="wm-signup-page__card">
          <div className="wm-signup-page__head">
            <div className="wm-signup-page__eyebrow">Create account</div>
            <h1 className="wm-signup-page__title">Set up your Wingman workspace.</h1>
            <p className="wm-signup-page__copy">
              Create an account for project history, saved workflows, and proposal-ready collaboration.
            </p>
          </div>

          <form className="wm-signup-page__form" onSubmit={handleSubmit}>
            <div className="wm-signup-page__field">
              <label className="wm-signup-page__label" htmlFor="name">Name</label>
              <input
                id="name"
                className="wm-signup-page__input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Smith"
              />
            </div>

            <div className="wm-signup-page__field">
              <label className="wm-signup-page__label" htmlFor="company">Company</label>
              <input
                id="company"
                className="wm-signup-page__input"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Acme Ltd"
              />
            </div>

            <div className="wm-signup-page__field">
              <label className="wm-signup-page__label" htmlFor="email">Email</label>
              <input
                id="email"
                className="wm-signup-page__input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@acme.com"
              />
            </div>

            <div className="wm-signup-page__field">
              <label className="wm-signup-page__label" htmlFor="password">Password</label>
              <input
                id="password"
                className="wm-signup-page__input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
              />
            </div>

            <button type="submit" className="wm-signup-page__submit">
              Create account
            </button>
          </form>

          <div className="wm-signup-page__links">
            <Link to="/">Back to site</Link>
            <Link to="/login">Already have an account?</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $landingPath -Content $landingContent
Write-Host "Replaced PublicLandingPage.tsx"

Save-Utf8NoBom -Path $signupPath -Content $signupContent
Write-Host "Replaced SignupPage.tsx"

Write-Host ""
Write-Host "Done."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"