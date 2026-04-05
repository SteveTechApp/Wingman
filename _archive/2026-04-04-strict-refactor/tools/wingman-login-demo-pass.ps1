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

$loginPagePath  = "C:\Users\steve\wingman\src\pages\LoginPage.tsx"
$authContextPath = "C:\Users\steve\wingman\src\auth\AuthContext.tsx"

Backup-IfExists $loginPagePath
Backup-IfExists $authContextPath

# -------------------------------------------------------------------
# 1) Replace LoginPage.tsx
# -------------------------------------------------------------------
$loginContent = @'
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const DEMO_AUTH_KEY = "wm_demo_auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("name@company.com");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      localStorage.setItem(
        DEMO_AUTH_KEY,
        JSON.stringify({
          mode: "authenticated",
          source: "login",
          email,
          name: "Wingman User",
          company: "Demo Workspace",
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}

    navigate("/app/dashboard");
  }

  function handleDemoMode() {
    try {
      localStorage.setItem(
        DEMO_AUTH_KEY,
        JSON.stringify({
          mode: "demo",
          source: "demo-button",
          email: "demo@wingman.local",
          name: "Demo User",
          company: "WyreStorm Demo",
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}

    navigate("/app/dashboard");
  }

  return (
    <div className="wm-login-page">
      <style>
        {`
          .wm-login-page {
            height: 100vh;
            max-height: 100vh;
            overflow: hidden;
            background:
              radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 24%),
              radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 22%),
              linear-gradient(180deg, #071224 0%, #0b1730 52%, #10203f 100%);
            color: #e5edf7;
          }

          .wm-login-page *,
          .wm-login-page *::before,
          .wm-login-page *::after {
            box-sizing: border-box;
          }

          .wm-login-page__root {
            width: 100%;
            height: 100%;
            padding: clamp(14px, 2vh, 24px);
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          .wm-login-page__card {
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

          .wm-login-page__head {
            display: grid;
            gap: 8px;
          }

          .wm-login-page__eyebrow {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #7dd3fc;
          }

          .wm-login-page__title {
            margin: 0;
            font-size: clamp(1.55rem, 2.2vw, 2.2rem);
            line-height: 1.05;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: #f8fbff;
          }

          .wm-login-page__copy {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #a8bbd5;
          }

          .wm-login-page__form {
            display: grid;
            gap: 12px;
          }

          .wm-login-page__field {
            display: grid;
            gap: 6px;
          }

          .wm-login-page__label {
            font-size: 12px;
            font-weight: 600;
            color: #a8bbd5;
          }

          .wm-login-page__input {
            width: 100%;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(148,163,184,0.18);
            background: rgba(2,6,23,0.38);
            color: #e5edf7;
            padding: 0 14px;
            outline: none;
          }

          .wm-login-page__input::placeholder {
            color: #89a0bf;
          }

          .wm-login-page__input:focus {
            border-color: rgba(56,189,248,0.48);
            box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
          }

          .wm-login-page__actions {
            display: grid;
            gap: 10px;
          }

          .wm-login-page__primary,
          .wm-login-page__secondary {
            width: 100%;
            height: 46px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .wm-login-page__primary {
            background: linear-gradient(135deg, #2563eb, #38bdf8);
            color: white;
            box-shadow: 0 14px 28px rgba(37,99,235,0.24);
          }

          .wm-login-page__secondary {
            background: rgba(255,255,255,0.06);
            color: #e5edf7;
            border: 1px solid rgba(148,163,184,0.18);
          }

          .wm-login-page__links {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
          }

          .wm-login-page__links a {
            color: #7dd3fc;
            text-decoration: none;
            font-weight: 600;
          }

          @media (max-height: 760px) {
            .wm-login-page__card {
              gap: 14px;
              padding: 18px;
            }

            .wm-login-page__input {
              height: 40px;
            }

            .wm-login-page__primary,
            .wm-login-page__secondary {
              height: 42px;
            }
          }
        `}
      </style>

      <main className="wm-login-page__root">
        <section className="wm-login-page__card">
          <div className="wm-login-page__head">
            <div className="wm-login-page__eyebrow">Welcome back</div>
            <h1 className="wm-login-page__title">Resume your Wingman workspace.</h1>
            <p className="wm-login-page__copy">
              Sign in to access saved projects, workflow history, and proposal-ready tools.
            </p>
          </div>

          <form className="wm-login-page__form" onSubmit={handleSubmit}>
            <div className="wm-login-page__field">
              <label className="wm-login-page__label" htmlFor="email">Email</label>
              <input
                id="email"
                className="wm-login-page__input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
              />
            </div>

            <div className="wm-login-page__field">
              <label className="wm-login-page__label" htmlFor="password">Password</label>
              <input
                id="password"
                className="wm-login-page__input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <div className="wm-login-page__actions">
              <button type="submit" className="wm-login-page__primary">
                Sign in
              </button>

              <button
                type="button"
                className="wm-login-page__secondary"
                onClick={handleDemoMode}
              >
                Continue in Demo Mode
              </button>
            </div>
          </form>

          <div className="wm-login-page__links">
            <Link to="/">Back to site</Link>
            <Link to="/signup">Create account</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $loginPagePath -Content $loginContent
Write-Host "Replaced LoginPage.tsx"

# -------------------------------------------------------------------
# 2) Patch AuthContext.tsx so demo mode counts as authenticated
# -------------------------------------------------------------------
if (Test-Path $authContextPath) {
  $auth = Get-Content $authContextPath -Raw

  if ($auth -notmatch 'wm_demo_auth') {
    $auth = 'const DEMO_AUTH_KEY = "wm_demo_auth";' + [Environment]::NewLine + $auth
  }

  if ($auth -notmatch 'readDemoAuth') {
    $helper = @'

function readDemoAuth() {
  try {
    const raw = localStorage.getItem(DEMO_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

'@
    $auth = $helper + $auth
  }

  $patterns = @(
    'const\s+initialAuth\s*=\s*[^;]+;',
    'const\s*\[\s*auth\s*,\s*setAuth\s*\]\s*=\s*useState\((.*?)\);',
    'const\s*\[\s*authState\s*,\s*setAuthState\s*\]\s*=\s*useState\((.*?)\);'
  )

  foreach ($pattern in $patterns) {
    if ($auth -match $pattern) {
      $auth = [regex]::Replace(
        $auth,
        $pattern,
        {
          param($m)
          $line = $m.Value
          if ($line -match 'readDemoAuth\(\)') { return $line }

          if ($line -match 'useState\(') {
            return $line -replace 'useState\((.*?)\)', 'useState(() => readDemoAuth() ?? $1)'
          }

          return $line -replace '=\s*([^;]+);', '= readDemoAuth() ?? $1;'
        },
        [System.Text.RegularExpressions.RegexOptions]::Singleline
      )
    }
  }

  $logoutPatterns = @(
    'function\s+logout\s*\(\s*\)\s*\{',
    'const\s+logout\s*=\s*\(\s*\)\s*=>\s*\{'
  )

  foreach ($pattern in $logoutPatterns) {
    if ($auth -match $pattern -and $auth -notmatch 'localStorage\.removeItem\(DEMO_AUTH_KEY\)') {
      $auth = [regex]::Replace(
        $auth,
        $pattern,
        '$0' + [Environment]::NewLine + '  try { localStorage.removeItem(DEMO_AUTH_KEY); } catch {}',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
      )
      break
    }
  }

  Save-Utf8NoBom -Path $authContextPath -Content $auth
  Write-Host "Patched AuthContext.tsx for demo auth"
}
else {
  Write-Warning "AuthContext.tsx not found. Login page was updated, but auth bypass patch was skipped."
}

Write-Host ""
Write-Host "Done."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"