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

type Mode = "avoip" | "matrix" | "video-wall";

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
  role: string;
  qty: number;
  reason: string;
  tier: "core" | "performance" | "multiview" | "infrastructure";
};

type BomItem = {
  sku: string;
  description: string;
  qty: number;
};

type ValidationState = "idle" | "ok" | "warn" | "error";

function parseDistanceMeters(label: string): number {
  const match = label.match(/(\d+)/);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}

function titleSuggestsMultiview(title: string): boolean {
  return /multiview|multi-view|operations|monitoring/i.test(title);
}

function titleSuggestsVideoWall(title: string): boolean {
  return /video wall|videowall|led/i.test(title);
}

function chooseAvoipProfile(
  title: string,
  sourceCount: number,
  displayCount: number,
  distanceM: number,
) {
  const multiview = titleSuggestsMultiview(title) || (sourceCount >= 4 && displayCount <= 2);
  const videoWall = titleSuggestsVideoWall(title) || displayCount >= 8;
  const premium10G = videoWall || distanceM > 100;

  if (premium10G) {
    return {
      key: "sdvoe-600",
      headline: "10Gb SDVoE / premium transport",
      recommendations: [
        {
          sku: "NHD-600-TRX",
          name: "10Gb SDVoE Transceiver",
          role: "Endpoint transport",
          qty: Math.max(sourceCount + displayCount, 2),
          reason: "Best fit for premium zero-latency 10Gb designs and large-format visual systems.",
          tier: "performance" as const,
        },
        {
          sku: "NHD-600-TRXF",
          name: "10Gb SDVoE Fiber Transceiver",
          role: "Long-reach / fiber endpoint",
          qty: distanceM > 100 ? Math.max(displayCount, 1) : 0,
          reason: "Add when long-reach or fiber transport is required.",
          tier: "infrastructure" as const,
        },
        {
          sku: "NHD-600-E-TX/RX",
          name: "10Gb SDVoE Encoder / Decoder",
          role: "Cost-optimised 10Gb endpoint",
          qty: displayCount >= 6 ? Math.max(displayCount, 1) : 0,
          reason: "Useful where a broader 10Gb design needs a more economical endpoint option.",
          tier: "performance" as const,
        },
      ],
    };
  }

  if (multiview) {
    return {
      key: "multiview-100",
      headline: "1Gb low-bandwidth multiview path",
      recommendations: [
        {
          sku: "NHD-150-RX",
          name: "Multiview Display Decoder",
          role: "Multiview endpoint",
          qty: Math.max(displayCount, 1),
          reason: "Use where several sources must be viewed together on one display.",
          tier: "multiview" as const,
        },
        {
          sku: "NHD-120 encoder family",
          name: "Low-bandwidth 120 Series Encoder",
          role: "Source encoding",
          qty: Math.max(sourceCount, 1),
          reason: "Compatible ecosystem for the NHD-150-RX multiview workflow.",
          tier: "core" as const,
        },
      ],
    };
  }

  return {
    key: "j2k-500",
    headline: "1Gb JPEG2000 4K60 path",
    recommendations: [
      {
        sku: "NHD-500-TX/RX v2",
        name: "4K60 JPEG2000 Encoder / Decoder",
        role: "Main endpoint platform",
        qty: Math.max(sourceCount + displayCount, 2),
        reason: "Best general-purpose 4K60 AVoIP recommendation for scalable commercial switching.",
        tier: "core" as const,
      },
      {
        sku: "NHD-500-E",
        name: "4K60 JPEG2000 Lite Endpoint",
        role: "Cost-down endpoint",
        qty: displayCount >= 4 ? Math.max(displayCount, 1) : 0,
        reason: "Useful where full 500-series functionality is not needed at every endpoint.",
        tier: "core" as const,
      },
      {
        sku: "NHD-500-IW-TX",
        name: "In-wall USB-C / HDMI Encoder",
        role: "Room input plate",
        qty: sourceCount <= 3 ? Math.max(sourceCount, 1) : 0,
        reason: "Strong fit for podium, desk, or wall-plate source presentation points.",
        tier: "infrastructure" as const,
      },
    ],
  };
}

function chooseMatrixProfile(sourceCount: number, displayCount: number, distanceM: number) {
  return {
    key: "matrix-hdmi",
    headline: "Direct matrix routing path",
    recommendations: [
      {
        sku: "MX-0808-H2A-MK2",
        name: "8x8 HDMI Matrix",
        role: "Matrix core",
        qty: 1,
        reason: "Strong fit for direct HDMI routing where a traditional matrix is preferred.",
        tier: "core" as const,
      },
      {
        sku: "EX-70-H2C",
        name: "70m HDMI Extender",
        role: "Display extension",
        qty: distanceM > 20 ? Math.max(displayCount, 1) : 0,
        reason: "Use where display runs extend beyond a short local HDMI patch length.",
        tier: "infrastructure" as const,
      },
      {
        sku: "Matrix audio / control allowance",
        name: "Audio / control support line",
        role: "System allowance",
        qty: Math.max(Math.min(sourceCount, displayCount), 1),
        reason: "Include budget line for control, audio return, and commissioning support.",
        tier: "infrastructure" as const,
      },
    ],
  };
}

export default function DashboardArchitectureCanvas({
  title = "AVoIP Network Layout",
  mode = "avoip",
  sourceCount = 4,
  displayCount = 6,
  distanceLabel = "50m validated",
  primarySku = "",
  secondarySku = "",
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

  const distanceM = useMemo(() => parseDistanceMeters(distanceLabel), [distanceLabel]);

  const profile = useMemo(() => {
    if (activeMode === "matrix") {
      return chooseMatrixProfile(sourceCount, displayCount, distanceM);
    }

    return chooseAvoipProfile(title, sourceCount, displayCount, distanceM);
  }, [activeMode, title, sourceCount, displayCount, distanceM]);

  const recommendations = useMemo<ProductRecommendation[]>(() => {
    const current = profile.recommendations.filter((item) => item.qty > 0);

    if (primarySku) {
      current.unshift({
        sku: primarySku,
        name: "Primary selection override",
        role: "Pinned by dashboard",
        qty: 1,
        reason: "Kept because the dashboard explicitly passed a primary SKU.",
        tier: "core",
      });
    }

    if (secondarySku) {
      current.push({
        sku: secondarySku,
        name: "Secondary selection override",
        role: "Pinned by dashboard",
        qty: 1,
        reason: "Kept because the dashboard explicitly passed a secondary SKU.",
        tier: "infrastructure",
      });
    }

    return current;
  }, [profile.recommendations, primarySku, secondarySku]);

  const bomItems = useMemo<BomItem[]>(() => {
    const items: BomItem[] = recommendations.map((item) => ({
      sku: item.sku,
      description: `${item.name} (${item.role})`,
      qty: item.qty,
    }));

    if (flattenedRoutes.length > 0) {
      items.push({
        sku: "COMMISSIONING",
        description: "Programming / setup / commissioning allowance",
        qty: 1,
      });
    }

    if (distanceM > 70 && activeMode !== "matrix") {
      items.push({
        sku: "10G / fibre infrastructure review",
        description: "Network backbone review for long-reach premium transport",
        qty: 1,
      });
    }

    return items;
  }, [recommendations, flattenedRoutes.length, distanceM, activeMode]);

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

    if (distanceM > 100 && activeMode !== "matrix") {
      return {
        state: "warn" as ValidationState,
        title: "Long-reach transport review",
        detail: "Current distance pushes this design toward 10Gb / fibre-class recommendations.",
      };
    }

    if (distanceM > 70) {
      return {
        state: "warn" as ValidationState,
        title: "Distance warning",
        detail: "Check extension / transport fit before freezing the BOM.",
      };
    }

    return {
      state: "ok" as ValidationState,
      title: "System valid",
      detail: "Topology, route count, and current distance are within expected limits.",
    };
  }, [activeMode, distanceM, flattenedRoutes.length, routes]);

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
          <div className="wm-arch__headline">{profile.headline}</div>
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
          <button
            type="button"
            className={activeMode === "video-wall" ? "active" : ""}
            onClick={() => setActiveMode("video-wall")}
          >
            Video Wall
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
          <strong>Recommendation logic</strong>
          <span>
            {activeMode === "matrix"
              ? "Traditional matrix path selected."
              : profile.key === "multiview-100"
                ? "Low-bandwidth multiview profile selected."
                : profile.key === "sdvoe-600"
                  ? "Premium 10Gb transport profile selected."
                  : "General-purpose 1Gb 4K60 AVoIP profile selected."}
          </span>
          <span>Current mode: {activeMode.toUpperCase()}</span>
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
            <div className="wm-node wm-node--core">
              {activeMode === "matrix" ? "Matrix Core" : "TX Layer"}
            </div>
            <div className="wm-node wm-node--core">
              {activeMode === "matrix" ? "Direct Routing" : "Network Switch"}
            </div>
            <div className="wm-node wm-node--core">
              {activeMode === "matrix" ? "Display Path" : "RX Layer"}
            </div>
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
              <article key={`${item.sku}-${item.role}`} className={`wm-product-card wm-product-card--${item.tier}`}>
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
  align-items: flex-start;
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

.wm-arch__headline {
  font-size: 12px;
  color: #a9bcda;
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

.wm-product-card--core {
  border-color: rgba(59,130,246,0.18);
}

.wm-product-card--performance {
  border-color: rgba(168,85,247,0.18);
}

.wm-product-card--multiview {
  border-color: rgba(16,185,129,0.18);
}

.wm-product-card--infrastructure {
  border-color: rgba(245,158,11,0.18);
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