param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

if (-not (Test-Path $Root)) {
  throw "Root path not found: $Root"
}

$appShellPath = Join-Path $Root "src\app\shell\AppShell.tsx"
$floatingGuruPath = Join-Path $Root "src\features\guru\FloatingGuru.tsx"
$mainPath = Join-Path $Root "src\main.tsx"
$cssPath = Join-Path $Root "src\styles\wm-shell-normalize.css"

$appShellContent = @'
import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import FloatingGuru from "@/features/guru/FloatingGuru";

export default function AppShell() {
  return (
    <div className="wm-shell-root" data-shell="wingman">
      <TopBar />

      <div className="wm-shell-body">
        <aside className="wm-shell-sidebar">
          <MissionControlNav />
        </aside>

        <main className="wm-shell-main">
          <div className="wm-shell-main__viewport">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingGuru />
    </div>
  );
}
'@

$floatingGuruContent = @'
import { useState } from "react";

export default function FloatingGuru() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="wm-guru-backdrop"
          aria-label="Close Guru"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside className={`wm-guru-drawer${open ? " wm-guru-drawer--open" : ""}`}>
        <div className="wm-guru-drawer__topbar">
          <div className="wm-guru-drawer__title-wrap">
            <div className="wm-guru-drawer__eyebrow">Assistant</div>
            <div className="wm-guru-drawer__title">Guru Assistant</div>
          </div>

          <div className="wm-guru-drawer__actions">
            <button
              type="button"
              className="wm-guru-drawer__close"
              aria-label="Close Guru"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>

        <div className="wm-guru-drawer__body">
          <div className="wm-guru-panel">
            <div className="wm-guru-panel__intro">
              WyreStorm-focused product and application support.
            </div>

            <label className="wm-guru-panel__label">Ask Guru</label>
            <textarea
              className="wm-guru-panel__input"
              placeholder="Ask a WyreStorm or AV design question"
              defaultValue="Which presentation switchers support AirPlay?"
            />

            <div className="wm-guru-panel__toolbar">
              <button type="button" className="wm-guru-panel__primary">
                Ask Guru
              </button>
            </div>

            <div className="wm-guru-panel__output">
              Ask Guru to generate an answer. It will appear here.
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className={`wm-floating-guru-logo${open ? " wm-floating-guru-logo--active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Open Guru"
        title="Open Guru"
      >
        <span className="wm-floating-guru-logo__core">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </span>
      </button>
    </>
  );
}
'@

$cssContent = @'
/* ========================================
   WINGMAN SHELL NORMALISE
======================================== */

.wm-shell-root {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  display: grid;
  grid-template-rows: 72px 1fr;
  overflow: hidden;
  background: linear-gradient(180deg, #03101f 0%, #07182c 55%, #0a1f39 100%);
  color: #f8fafc;
}

.wm-shell-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 196px 1fr;
  overflow: hidden;
}

.wm-shell-sidebar {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid rgba(148, 163, 184, 0.08);
  background: linear-gradient(180deg, rgba(2, 8, 23, 0.28), rgba(2, 8, 23, 0.10));
}

.wm-shell-main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 14px;
}

.wm-shell-main__viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.wm-shell-main__viewport > * {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

/* Guru */

.wm-guru-backdrop {
  position: fixed;
  inset: 0;
  z-index: 119;
  border: 0;
  background: rgba(2, 8, 23, 0.24);
  backdrop-filter: blur(2px);
}

.wm-guru-drawer {
  position: fixed;
  top: 86px;
  right: 18px;
  width: min(560px, calc(100vw - 240px));
  height: min(520px, calc(100vh - 120px));
  z-index: 120;
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 24px;
  border: 1px solid rgba(249, 115, 22, 0.36);
  background:
    radial-gradient(circle at top right, rgba(251, 146, 60, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(21, 12, 8, 0.97), rgba(10, 12, 22, 0.96));
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(249, 115, 22, 0.08),
    0 0 36px rgba(249, 115, 22, 0.16);
  overflow: hidden;
  transform: translateY(10px) scale(0.98);
  opacity: 0;
  pointer-events: none;
  transition: transform 160ms ease, opacity 160ms ease;
}

.wm-guru-drawer--open {
  transform: translateY(0) scale(1);
  opacity: 1;
  pointer-events: auto;
}

.wm-guru-drawer__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(249, 115, 22, 0.16);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.14), rgba(249, 115, 22, 0.06));
}

.wm-guru-drawer__title-wrap {
  display: grid;
  gap: 2px;
}

.wm-guru-drawer__eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #fdba74;
}

.wm-guru-drawer__title {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.wm-guru-drawer__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wm-guru-drawer__close {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  color: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.wm-guru-drawer__body {
  min-height: 0;
  overflow: auto;
  padding: 0;
}

.wm-guru-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  color: #f8fafc;
}

.wm-guru-panel__intro,
.wm-guru-panel__output {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(226,232,240,0.72);
}

.wm-guru-panel__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #cbd5e1;
}

.wm-guru-panel__input {
  width: 100%;
  min-height: 88px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid rgba(249,115,22,0.14);
  background: rgba(2,8,23,0.46);
  color: #fff;
  padding: 14px;
  font: inherit;
}

.wm-guru-panel__input::placeholder {
  color: rgba(226,232,240,0.44);
}

.wm-guru-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-panel__primary {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 12px 22px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.wm-guru-panel__output {
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(148,163,184,0.10);
  background: rgba(255,255,255,0.03);
  padding: 12px;
}

.wm-floating-guru-logo {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 121;
  width: 60px;
  height: 60px;
  border-radius: 999px;
  border: 1px solid rgba(249,115,22,0.34);
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow:
    0 18px 36px rgba(0,0,0,0.32),
    0 0 28px rgba(249,115,22,0.22);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.wm-floating-guru-logo:hover {
  transform: translateY(-2px) scale(1.03);
}

.wm-floating-guru-logo--active {
  box-shadow:
    0 18px 36px rgba(0,0,0,0.36),
    0 0 36px rgba(249,115,22,0.36);
}

.wm-floating-guru-logo__core {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.18);
  color: #fff;
}

.wm-floating-guru-logo__core svg {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
}

@media (max-width: 1180px) {
  .wm-shell-body {
    grid-template-columns: 180px 1fr;
  }

  .wm-guru-drawer {
    top: 82px;
    right: 12px;
    width: min(520px, calc(100vw - 210px));
    height: min(500px, calc(100vh - 110px));
  }
}

@media (max-width: 900px) {
  .wm-guru-drawer {
    right: 10px;
    width: calc(100vw - 20px);
    height: min(500px, calc(100vh - 100px));
  }
}
'@

Save-Utf8NoBom -Path $appShellPath -Content $appShellContent
Save-Utf8NoBom -Path $floatingGuruPath -Content $floatingGuruContent
Save-Utf8NoBom -Path $cssPath -Content $cssContent

if (Test-Path $mainPath) {
  $main = Get-Content -Path $mainPath -Raw
  if ($main -notmatch 'import "@/styles/wm-shell-normalize.css";') {
    $main = 'import "@/styles/wm-shell-normalize.css";' + "`r`n" + $main
    Save-Utf8NoBom -Path $mainPath -Content $main
  }
}

Write-Host "Repaired AppShell, FloatingGuru, and wm-shell-normalize.css" -ForegroundColor Green
Write-Host "AppRoutes.tsx was left unchanged." -ForegroundColor Cyan