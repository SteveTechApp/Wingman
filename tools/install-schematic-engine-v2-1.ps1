Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [string]$RelativePath,
    [string]$Content
  )

  $root = (Get-Location).Path
  $full = Join-Path $root $RelativePath
  $dir = Split-Path $full -Parent

  if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  if (Test-Path $full) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $full "$root\_RESCUE\$safe.$stamp.bak" -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full, $Content, $utf8)

  Write-Host "Written: $RelativePath" -ForegroundColor Green
}

# =========================
# TSX (v2.1 ENGINE)
# =========================

$tsx = @'
import { useMemo, useState } from "react";
import "./DashboardArchitectureCanvas.css";

type NodeType = "source" | "core" | "rx" | "display";

type Node = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
};

type Link = {
  id: string;
  from: string;
  to: string;
};

const WIDTH = 1600;
const HEIGHT = 900;

function pos(x: number, y: number) {
  return {
    x: (x / 100) * WIDTH,
    y: (y / 100) * HEIGHT,
  };
}

function path(a: any, b: any) {
  const mid = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} L ${mid} ${a.y} L ${mid} ${b.y} L ${b.x} ${b.y}`;
}

export default function DashboardArchitectureCanvas() {
  const sourceCount = 4;
  const displayCount = 6;

  const nodes = useMemo(() => {
    const list: Node[] = [];

    // SOURCES
    for (let i = 0; i < sourceCount; i++) {
      list.push({
        id: `S${i+1}`,
        type: "source",
        x: 8,
        y: 20 + i * 12,
        label: `Source ${i+1}`,
      });
    }

    // CORE
    list.push({
      id: "CORE",
      type: "core",
      x: 40,
      y: 40,
      label: "NHD Core",
    });

    // RX
    list.push({
      id: "RX",
      type: "rx",
      x: 65,
      y: 40,
      label: "Receivers",
    });

    // DISPLAYS
    for (let i = 0; i < displayCount; i++) {
      list.push({
        id: `D${i+1}`,
        type: "display",
        x: 85,
        y: 18 + i * 10,
        label: `Display ${i+1}`,
      });
    }

    return list;
  }, []);

  const links = useMemo(() => {
    const list: Link[] = [];

    // sources → core
    for (let i = 0; i < sourceCount; i++) {
      list.push({
        id: `L-S${i+1}`,
        from: `S${i+1}`,
        to: "CORE",
      });
    }

    // core → rx
    list.push({
      id: "L-CORE-RX",
      from: "CORE",
      to: "RX",
    });

    // rx → displays
    for (let i = 0; i < displayCount; i++) {
      list.push({
        id: `L-RX-D${i+1}`,
        from: "RX",
        to: `D${i+1}`,
      });
    }

    return list;
  }, []);

  const [selected, setSelected] = useState<string | null>(null);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="se-shell">

      <div className="se-board">

        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="se-svg">

          {links.map(l => {
            const a = pos(nodeMap[l.from].x, nodeMap[l.from].y);
            const b = pos(nodeMap[l.to].x, nodeMap[l.to].y);

            const active =
              selected === l.from ||
              selected === l.to ||
              selected === l.id;

            return (
              <path
                key={l.id}
                d={path(a, b)}
                className={`se-line ${active ? "active" : ""}`}
                onClick={() => setSelected(l.id)}
              />
            );
          })}

        </svg>

        {nodes.map(n => {
          const active = selected === n.id;

          return (
            <div
              key={n.id}
              className={`se-node ${n.type} ${active ? "active" : ""}`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              onClick={() => setSelected(n.id)}
            >
              {n.label}
            </div>
          );
        })}
      </div>

      <div className="se-panel">
        {selected ? (
          <div>
            <strong>Selected:</strong> {selected}
          </div>
        ) : (
          <div>Select a source or display</div>
        )}
      </div>

    </div>
  );
}
'@

# =========================
# CSS
# =========================

$css = @'
.se-shell {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 16px;
}

.se-board {
  position: relative;
  height: 700px;
  background: #020617;
  border-radius: 20px;
  overflow: hidden;
}

.se-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.se-line {
  stroke: #64748b;
  stroke-width: 2;
  fill: none;
  cursor: pointer;
  opacity: 0.4;
}

.se-line.active {
  stroke: #3b82f6;
  opacity: 1;
  stroke-width: 3;
}

.se-node {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 8px 12px;
  background: #1e293b;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #334155;
}

.se-node.active {
  background: #3b82f6;
}

.se-node.source { background: #0f172a; }
.se-node.display { background: #020617; }
.se-node.core { background: #1e40af; }
.se-node.rx { background: #0ea5e9; }

.se-panel {
  background: #020617;
  border-radius: 16px;
  padding: 16px;
}
'@

Save-Utf8NoBom "src\features\dashboard\components\DashboardArchitectureCanvas.tsx" $tsx
Save-Utf8NoBom "src\features\dashboard\components\DashboardArchitectureCanvas.css" $css

npm run typecheck