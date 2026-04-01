Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman
$root = (Get-Location).Path

function Save {
  param($p,$c)
  $full = Join-Path $root $p
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full,$c,$utf8)
}

# -----------------------------
# 1. FORCE CORRECT WINGMAN LOGO
# -----------------------------
@'
import { Link } from "react-router-dom";

export default function WingmanBrand() {
  return (
    <Link to="/app/dashboard" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src="/wingman-logo-compact.png"
        alt="Wingman"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          objectFit: "contain"
        }}
      />
      <div>
        <div style={{ fontWeight: 600, color: "white" }}>Wingman</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Clear inputs, live outputs, and visual decision support.
        </div>
      </div>
    </Link>
  );
}
'@ | % { Save "src\app\branding\WingmanBrand.tsx" $_ }

# -----------------------------
# 2. DRAGGABLE FLOATING GURU BUTTON
# -----------------------------
@'
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./guru-fab.css";

export default function GuruFab() {
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const onMouseDown = (e: any) => {
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      ox: pos.x,
      oy: pos.y,
    };

    const move = (m: any) => {
      setPos({
        x: drag.current.ox + (m.clientX - drag.current.x),
        y: drag.current.oy + (m.clientY - drag.current.y),
      });
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      className="guru-fab"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onMouseDown={onMouseDown}
      onDoubleClick={() => navigate(WM_ROUTES.GURU)}
    >
      <img src="/wingman-logo-compact.png" />
      <span>Guru</span>
    </div>
  );
}
'@ | % { Save "src\features\ai\guru\GuruFab.tsx" $_ }

# -----------------------------
# 3. CLEAN CSS (SMALL + MOVABLE)
# -----------------------------
@'
.guru-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  background: #020617;
  border: 1px solid rgba(96,165,250,0.3);
  color: white;
  cursor: grab;
  user-select: none;
}

.guru-fab:active {
  cursor: grabbing;
}

.guru-fab img {
  width: 22px;
  height: 22px;
}
'@ | % { Save "src\features\ai\guru\guru-fab.css" $_ }

Write-Host ""
Write-Host "FIXED:" -ForegroundColor Green
Write-Host "- Wingman logo restored"
Write-Host "- Guru button draggable"
Write-Host "- Double click opens Guru"
Write-Host ""
Write-Host "Run:"
Write-Host "npm run repo:health"