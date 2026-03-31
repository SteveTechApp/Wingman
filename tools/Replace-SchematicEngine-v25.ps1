Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $root = (Get-Location).Path
  $fullPath = Join-Path $root $RelativePath
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $rescueRoot = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescueRoot)) {
    New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null
  }

  if (Test-Path $fullPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safeName = $RelativePath -replace '[\\/:*?"<>|]', '_'
    Copy-Item $fullPath (Join-Path $rescueRoot "$safeName.$stamp.bak") -Force
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
  Write-Host "Written: $RelativePath" -ForegroundColor Green
}

$tsx = @'
import { useMemo, useState } from "react";
import "./wm-architecture-canvas.css";

type Mode = "avoip" | "matrix";

type Props = {
  title?: string;
  mode?: Mode;
  sourceCount?: number;
  displayCount?: number;
  distanceLabel?: string;
  primarySku?: string;
  secondarySku?: string;
  status?: string;
};

type ProductRecommendation = {
  sku: string;
  name: string;
  reason: string;
  qty: number;
  role: string;
};

type BomItem = {
  sku: string;
  description: string;
  qty: number;
};

type ValidationState = "idle" | "ok" | "warn" | "error";

export default function DashboardArchitectureCanvas({
  title = "AVoIP Network Layout",
  mode = "avoip",
  sourceCount = 4,
  displayCount = 6,
  distanceLabel = "50m validated",
  primarySku = "NHD-400-TX",
  secondarySku = "NHD-400-RX",
  status = "Ready for proposal",
}: Props) {
  const [activeMode, setActiveMode] = useState<Mode>(mode);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<string, string[]>>({});

  const sources = useMemo(
    () => Array.from({ length: sourceCount }, (_, index) => `S${index + 1}`),
    [sourceCount],
  );

  const displays = useMemo(
    () => Array.from({ length: displayCount }, (_, index) => `D${index + 1}`),
    [displayCount],
  );

  function toggleRoute(sourceId: string, displayId: string) {
    setRoutes((previous) => {
      const current = previous[sourceId] ?? [];

      if (current.includes(displayId)) {
        return {
          ...previous,
          [sourceId]: current.filter((item) => item !== displayId),
        };
      }

      if (activeMode === "matrix") {
        return {
          ...previous,
          [sourceId]: [displayId],
        };
      }

      return {
        ...previous,
        [sourceId]: [...current, displayId],
      };
    });
  }

  const flattenedRoutes = useMemo(
    () =>
      Object.entries(routes).flatMap(([sourceId, displayIds]) =>
        displayIds.map((displayId) => ({
          id: `${sourceId}-${displayId}`,
          sourceId,
          displayId,
        })),
      ),
    [routes],
  );

  const numericDistance = useMemo(() => {
    const parsed = parseInt(distanceLabel, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [distanceLabel]);

  const validation = useMemo(() => {
    const routeCount = flattenedRoutes.length;

    if (routeCount === 0) {
      return {
        state: "idle" as ValidationState,
        title: "No routing configured",
        detail: "Select a source, then click one or more displays to create routes.",
      };
    }

    if (activeMode === "matrix") {
      const oversubscribed = Object.values(routes).some((assignedDisplays) => assignedDisplays.length > 1);
      if (oversubscribed) {
        return {
          state: "error" as ValidationState,
          title: "Matrix rule violated",
          detail: "Matrix mode only allows one display assignment per source.",
        };
      }
    }

    if (numericDistance > 70) {
      return {
        state: "warn" as ValidationState,
        title: "Distance warning",
        detail: "Cable distance may require extender or topology review before BOM lock.",
      };
    }

    return {
      state: "ok" as ValidationState,
      title: "System valid",
      detail: "Topology, route count, and current distance are within expected limits.",
    };
  }, [activeMode, flattenedRoutes.length, numericDistance, routes]);

  const recommendations = useMemo<ProductRecommendation[]>(() => {
    if (activeMode === "matrix") {
      return [
        {
          sku: "MX-0808-H2A-MK2",
          name: "8x8 HDMI Matrix",
          reason: "Best fit when direct source-to-display routing is preferred.",
          qty: 1,
          role: "Core switcher",
        },
        {
          sku: "EX-70-H2C",
          name: "HDBaseT / HDMI Extension",
          reason: numericDistance > 40 ? "Supports longer display runs cleanly." : "Useful where local extension is still required.",
          qty: Math.max(displayCount, 1),
          role: "Display path",
        },
        {
          sku: "NHD-CTL-PRO",
          name: "System Controller",
          reason: "Adds presets, control handoff, and cleaner user operation.",
          qty: 1,
          role: "Control",
        },
      ];
    }

    return [
      {
        sku: primarySku || "NHD-400-TX",
        name: "AVoIP Encoder",
        reason: "Recommended transmitter layer for source ingestion into the network.",
        qty: Math.max(sourceCount, 1),
        role: "Source encoding",
      },
      {
        sku: secondarySku || "NHD-400-RX",
        name: "AVoIP Decoder",
        reason: "Recommended receiver layer for each display endpoint.",
        qty: Math.max(displayCount, 1),
        role: "Display decoding",
      },
      {
        sku: "SW-100-08P",
        name: "Managed PoE Network Switch",
        reason: "Supports AVoIP distribution and endpoint control.",
        qty: 1,
        role: "Core switching",
      },
      {
        sku: "NHD-CTL-PRO",
        name: "System Controller",
        reason: "Adds automation, presets, and recall across the topology.",
        qty: 1,
        role: "Control",
      },
    ];
  }, [activeMode, displayCount, numericDistance, primarySku, secondarySku, sourceCount]);

  const bomItems = useMemo<BomItem[]>(() => {
    const items = recommendations.map((item) => ({
      sku: item.sku,
      description: `${item.name} (${item.role})`,
      qty: item.qty,
    }));

    if (numericDistance > 70 && activeMode === "avoip") {
      items.push({
        sku: "CAB-10G-CAT6A",
        description: "10G-rated category cable set",
        qty: Math.max(displayCount + sourceCount, 1),
      });
    }

    if (flattenedRoutes.length > 0) {
      items.push({
        sku: "SYS-PROGRAM",
        description: "Programming / commissioning allowance",
        qty: 1,
      });
    }

    return items;
  }, [recommendations, numericDistance, activeMode, displayCount, sourceCount, flattenedRoutes.length]);

  const totals = useMemo(() => {
    return {
      routeCount: flattenedRoutes.length,
      sourceCount,
      displayCount,
      bomLines: bomItems.length,
    };
  }, [bomItems.length, displayCount, flattenedRoutes.length, sourceCount]);

  return (
    <div className="wm-arch">
      <div className="wm-arch__header">
        <div className="wm-arch__title-group">
          <div className="wm-arch__eyebrow">Architecture Layout</div>
          <h3 className="wm-arch__title">{title}</h3>
        </div>

        <div className="wm-arch__controls">
          <button
            type="button"
            className={activeMode === "avoip" ? "active" : ""}
            onClick={() => setActiveMode("avoip")}
          >
            AVoIP
          </button>
          <button
            type="button"
            className={activeMode === "matrix" ? "active" : ""}
            onClick={() => setActiveMode("matrix")}
          >
            Matrix
          </button>
        </div>

        <div className={`wm-arch__status wm-arch__status--${validation.state}`}>
          {validation.title}
        </div>
      </div>

      <div className="wm-arch__stats">
        <div className="wm-arch__stat-card">
          <span>Sources</span>
          <strong>{totals.sourceCount}</strong>
        </div>
        <div className="wm-arch__stat-card">
          <span>Displays</span>
          <strong>{totals.displayCount}</strong>
        </div>
        <div className="wm-arch__stat-card">
          <span>Routes</span>
          <strong>{totals.routeCount}</strong>
        </div>
        <div className="wm-arch__stat-card">
          <span>BOM lines</span>
          <strong>{totals.bomLines}</strong>
        </div>
      </div>

      <div className="wm-arch__meta-row">
        <div className="wm-arch__meta-card">
          <strong>Validation</strong>
          <span>{validation.detail}</span>
          <span>Distance: {distanceLabel}</span>
          <span>Status: {status}</span>
        </div>

        <div className="wm-arch__meta-card">
          <strong>Commercial summary</strong>
          <span>Mode: {activeMode.toUpperCase()}</span>
          <span>Recommended BOM generated from current topology.</span>
          <span>Use this panel to explain why the architecture is being proposed.</span>
        </div>
      </div>

      <div className="wm-arch__diagram">
        <div className="wm-arch__lane">
          <div className="wm-arch__lane-title">Sources</div>
          <div className="wm-arch__stack">
            {sources.map((sourceId) => (
              <button
                key={sourceId}
                type="button"
                className={`wm-node wm-node--source${selectedSourceId === sourceId ? " is-active" : ""}`}
                onClick={() => setSelectedSourceId(sourceId)}
              >
                {sourceId}
              </button>
            ))}
          </div>
        </div>

        <div className="wm-arch__lane wm-arch__lane--core">
          <div className="wm-arch__core-row">
            <div className="wm-node wm-node--core">TX</div>
            <div className="wm-node wm-node--core">Switch</div>
            <div className="wm-node wm-node--core">RX</div>
          </div>

          <div className="wm-arch__routing-panel">
            <div className="wm-arch__routing-title">
              {selectedSourceId ? `Assigning ${selectedSourceId}` : "Select a source"}
            </div>

            {flattenedRoutes.length === 0 ? (
              <div className="wm-empty">
                <strong>No topology yet</strong>
                <span>Adjust sources / displays to generate routing</span>
              </div>
            ) : (
              <div className="wm-routing-list">
                {flattenedRoutes.map((route) => (
                  <div key={route.id} className="wm-link">
                    {route.sourceId} → {route.displayId}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="wm-arch__lane">
          <div className="wm-arch__lane-title">Displays</div>
          <div className="wm-arch__stack">
            {displays.map((displayId) => {
              const assigned =
                selectedSourceId !== null && (routes[selectedSourceId] ?? []).includes(displayId);

              return (
                <button
                  key={displayId}
                  type="button"
                  className={`wm-node wm-node--display${assigned ? " is-active" : ""}`}
                  onClick={() => {
                    if (!selectedSourceId) return;
                    toggleRoute(selectedSourceId, displayId);
                  }}
                >
                  {displayId}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="wm-arch__commercial-grid">
        <section className="wm-arch__panel">
          <div className="wm-arch__panel-title">Recommended products</div>
          <div className="wm-product-list">
            {recommendations.map((item) => (
              <article key={`${item.sku}-${item.role}`} className="wm-product-card">
                <div className="wm-product-card__top">
                  <strong>{item.sku}</strong>
                  <span>x{item.qty}</span>
                </div>
                <div className="wm-product-card__name">{item.name}</div>
                <div className="wm-product-card__role">{item.role}</div>
                <p>{item.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wm-arch__panel">
          <div className="wm-arch__panel-title">BOM preview</div>
          <div className="wm-bom-list">
            {bomItems.map((item) => (
              <div key={`${item.sku}-${item.description}`} className="wm-bom-row">
                <div>
                  <strong>{item.sku}</strong>
                  <span>{item.description}</span>
                </div>
                <b>{item.qty}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="wm-arch__footer">
        <div className="wm-arch__footer-meta">
          <div>Distance: {distanceLabel}</div>
          <div>Status: {status}</div>
          <div>Mode: {activeMode.toUpperCase()}</div>
        </div>

        <button type="button" className="wm-arch__bom-button">
          Generate Bill of Materials
        </button>
      </div>
    </div>
  );
}
'@

$css = @'
.wm-arch {
  display: grid;
  gap: 16px;
  width: 100%;
  color: #e8eefc;
}

.wm-arch__header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wm-arch__title-group {
  display: grid;
  gap: 4px;
}

.wm-arch__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #83aaf0;
}

.wm-arch__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #f8fbff;
}

.wm-arch__controls {
  display: flex;
  gap: 8px;
}

.wm-arch__controls button {
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: #d7e6ff;
  font-size: 12px;
  cursor: pointer;
}

.wm-arch__controls button.active {
  background: rgba(59,130,246,0.2);
  border-color: rgba(59,130,246,0.4);
  color: #f8fbff;
}

.wm-arch__status {
  margin-left: auto;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
}

.wm-arch__status--ok {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
}

.wm-arch__status--warn {
  background: rgba(245,158,11,0.15);
  color: #fbbf24;
}

.wm-arch__status--error {
  background: rgba(239,68,68,0.15);
  color: #f87171;
}

.wm-arch__status--idle {
  background: rgba(148,163,184,0.14);
  color: #cbd5e1;
}

.wm-arch__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.wm-arch__stat-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}

.wm-arch__stat-card span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ab0d1;
}

.wm-arch__stat-card strong {
  font-size: 24px;
  color: #f8fbff;
}

.wm-arch__meta-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wm-arch__meta-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}

.wm-arch__meta-card strong {
  font-size: 13px;
  color: #f8fbff;
}

.wm-arch__meta-card span {
  font-size: 12px;
  color: #b4c4df;
}

.wm-arch__diagram {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 180px;
  gap: 20px;
  min-height: 360px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.06);
  background:
    radial-gradient(circle at 30% 30%, rgba(37,99,235,0.12), transparent 22%),
    radial-gradient(circle at 78% 25%, rgba(124,58,237,0.10), transparent 22%),
    linear-gradient(180deg, rgba(6,13,26,0.96), rgba(3,9,21,0.99));
}

.wm-arch__lane {
  display: grid;
  align-content: start;
  gap: 12px;
}

.wm-arch__lane--core {
  grid-template-rows: auto 1fr;
}

.wm-arch__lane-title {
  font-size: 12px;
  font-weight: 800;
  color: #dbe8ff;
}

.wm-arch__stack {
  display: grid;
  gap: 10px;
}

.wm-arch__core-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.wm-arch__routing-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}

.wm-arch__routing-title {
  font-size: 13px;
  font-weight: 700;
  color: #f5f9ff;
}

.wm-routing-list {
  display: grid;
  gap: 6px;
}

.wm-empty {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px dashed rgba(255,255,255,0.1);
}

.wm-empty strong {
  font-size: 13px;
  color: #f8fbff;
}

.wm-empty span {
  font-size: 12px;
  color: #9eb1cf;
}

.wm-node {
  min-height: 54px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background:
    linear-gradient(180deg, rgba(58,68,84,0.95), rgba(24,30,40,0.98));
  color: #f3f8ff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow:
    0 8px 18px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

.wm-node--core {
  background:
    linear-gradient(180deg, rgba(42,65,110,0.95), rgba(18,32,58,0.98));
}

.wm-node.is-active {
  border-color: rgba(59,130,246,0.45);
  box-shadow:
    0 0 0 1px rgba(59,130,246,0.18),
    0 12px 24px rgba(37,99,235,0.18);
}

.wm-link {
  font-size: 12px;
  opacity: 0.9;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.14);
  color: #bfdbfe;
}

.wm-arch__commercial-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wm-arch__panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}

.wm-arch__panel-title {
  font-size: 13px;
  font-weight: 800;
  color: #f8fbff;
}

.wm-product-list,
.wm-bom-list {
  display: grid;
  gap: 10px;
}

.wm-product-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.025);
}

.wm-product-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.wm-product-card__top strong {
  color: #f8fbff;
}

.wm-product-card__top span {
  font-size: 12px;
  color: #a7f3d0;
}

.wm-product-card__name {
  font-size: 13px;
  font-weight: 700;
  color: #dbe8ff;
}

.wm-product-card__role {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8db3e8;
}

.wm-product-card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #b4c4df;
}

.wm-bom-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.025);
}

.wm-bom-row div {
  display: grid;
  gap: 4px;
}

.wm-bom-row strong {
  color: #f8fbff;
}

.wm-bom-row span {
  font-size: 12px;
  color: #b4c4df;
}

.wm-bom-row b {
  color: #dbe8ff;
}

.wm-arch__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.wm-arch__footer-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #a8bbd8;
}

.wm-arch__bom-button {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid rgba(59,130,246,0.25);
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(37,99,235,0.18);
}

@media (max-width: 1200px) {
  .wm-arch__stats,
  .wm-arch__meta-row,
  .wm-arch__commercial-grid,
  .wm-arch__diagram {
    grid-template-columns: 1fr;
  }

  .wm-arch__core-row {
    grid-template-columns: 1fr;
  }

  .wm-arch__header,
  .wm-arch__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .wm-arch__status {
    margin-left: 0;
  }
}
'@

Save-Utf8NoBom -RelativePath "src\features\dashboard\components\DashboardArchitectureCanvas.tsx" -Content $tsx
Save-Utf8NoBom -RelativePath "src\features\dashboard\components\wm-architecture-canvas.css" -Content $css

npm run typecheck