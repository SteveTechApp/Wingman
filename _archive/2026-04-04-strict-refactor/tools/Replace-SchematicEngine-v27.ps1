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

$resolverTs = @'
export type CatalogueMode = "avoip" | "matrix" | "video-wall";

export type CatalogueProduct = {
  sku: string;
  name: string;
  category: string;
  tags?: string[];
};

export type ResolvedRecommendation = {
  sku: string;
  name: string;
  role: string;
  qty: number;
  reason: string;
  source: "catalogue" | "fallback";
};

export type ResolveInput = {
  mode: CatalogueMode;
  sourceCount: number;
  displayCount: number;
  distanceM: number;
  multiview: boolean;
};

const FALLBACK_PRODUCTS: CatalogueProduct[] = [
  { sku: "MX-0808-H2A-MK2", name: "8x8 HDMI Matrix", category: "matrix", tags: ["matrix", "switching"] },
  { sku: "EX-70-H2C", name: "70m HDMI Extender", category: "extender", tags: ["extension", "distance"] },
  { sku: "NHD-150-RX", name: "Multiview Decoder", category: "decoder", tags: ["avoip", "multiview"] },
  { sku: "NHD-120-series", name: "120 Series Encoder Family", category: "encoder", tags: ["avoip", "1g"] },
  { sku: "NHD-500-TX/RX v2", name: "500 Series JPEG2000 Endpoint", category: "endpoint", tags: ["avoip", "1g", "4k60"] },
  { sku: "NHD-500-E", name: "500 Series Lite Endpoint", category: "endpoint", tags: ["avoip", "cost-down"] },
  { sku: "NHD-500-IW-TX", name: "In-wall Encoder", category: "encoder", tags: ["avoip", "room-input"] },
  { sku: "NHD-600-TRX", name: "600 Series 10Gb Transceiver", category: "transceiver", tags: ["avoip", "10g", "premium"] },
  { sku: "NHD-600-TRXF", name: "600 Series Fiber Transceiver", category: "transceiver", tags: ["avoip", "10g", "fiber"] },
  { sku: "NHD-600-E-TX/RX", name: "600 Series 10Gb Endpoint", category: "endpoint", tags: ["avoip", "10g"] },
  { sku: "NHD-CTL-PRO", name: "System Controller", category: "control", tags: ["control", "automation"] },
  { sku: "SW-100-08P", name: "Managed PoE Network Switch", category: "switch", tags: ["network", "switch", "poe"] },
];

function normaliseProducts(raw: unknown): CatalogueProduct[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const sku =
        typeof record.sku === "string" ? record.sku :
        typeof record.id === "string" ? record.id :
        "";

      const name =
        typeof record.name === "string" ? record.name :
        typeof record.title === "string" ? record.title :
        sku;

      const category =
        typeof record.category === "string" ? record.category :
        typeof record.family === "string" ? record.family :
        "unknown";

      const tags = Array.isArray(record.tags)
        ? record.tags.filter((v): v is string => typeof v === "string")
        : [];

      if (!sku) return null;

      return { sku, name, category, tags };
    })
    .filter((item): item is CatalogueProduct => item !== null);
}

function matchesAny(product: CatalogueProduct, terms: string[]): boolean {
  const haystack = [
    product.sku,
    product.name,
    product.category,
    ...(product.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function pickFirst(products: CatalogueProduct[], terms: string[], fallbackSku: string): CatalogueProduct {
  return products.find((product) => matchesAny(product, terms))
    ?? FALLBACK_PRODUCTS.find((product) => product.sku === fallbackSku)
    ?? { sku: fallbackSku, name: fallbackSku, category: "fallback" };
}

function getCatalogueProducts(): CatalogueProduct[] {
  const globalAny = globalThis as Record<string, unknown>;
  const candidates = [
    globalAny.__WINGMAN_LOCAL_CATALOGUE__,
    globalAny.__WINGMAN_PRODUCT_CATALOGUE__,
    globalAny.__CATALOGUE_PRODUCTS__,
  ];

  for (const candidate of candidates) {
    const normalised = normaliseProducts(candidate);
    if (normalised.length > 0) return normalised;
  }

  return FALLBACK_PRODUCTS;
}

export function resolveCatalogueRecommendations(input: ResolveInput): ResolvedRecommendation[] {
  const products = getCatalogueProducts();
  const { mode, sourceCount, displayCount, distanceM, multiview } = input;

  if (mode === "matrix") {
    const matrixCore = pickFirst(products, ["mx-", "matrix"], "MX-0808-H2A-MK2");
    const extender = pickFirst(products, ["extender", "ex-70", "distance"], "EX-70-H2C");
    const controller = pickFirst(products, ["ctl", "control", "automation"], "NHD-CTL-PRO");

    return [
      {
        sku: matrixCore.sku,
        name: matrixCore.name,
        role: "Matrix core",
        qty: 1,
        reason: "Traditional direct routing path selected.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: extender.sku,
        name: extender.name,
        role: "Display extension",
        qty: distanceM > 20 ? Math.max(displayCount, 1) : 0,
        reason: "Used where display runs push beyond short local patch lengths.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: controller.sku,
        name: controller.name,
        role: "Control",
        qty: 1,
        reason: "Adds presets, recall, and cleaner user operation.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
    ].filter((item) => item.qty > 0);
  }

  if (mode === "video-wall" || distanceM > 100) {
    const trx = pickFirst(products, ["600-trx", "10g", "sdvoe"], "NHD-600-TRX");
    const trxf = pickFirst(products, ["trxf", "fiber"], "NHD-600-TRXF");
    const endpoint = pickFirst(products, ["600-e", "10g"], "NHD-600-E-TX/RX");

    return [
      {
        sku: trx.sku,
        name: trx.name,
        role: "Premium transport",
        qty: Math.max(sourceCount + displayCount, 2),
        reason: "Selected for premium video wall / long-reach transport.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: trxf.sku,
        name: trxf.name,
        role: "Fiber path",
        qty: distanceM > 100 ? Math.max(displayCount, 1) : 0,
        reason: "Use where the backbone or endpoint path needs fiber-class reach.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: endpoint.sku,
        name: endpoint.name,
        role: "10Gb endpoint",
        qty: displayCount >= 6 ? Math.max(displayCount, 1) : 0,
        reason: "Supports larger premium endpoint counts.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
    ].filter((item) => item.qty > 0);
  }

  if (multiview) {
    const mvRx = pickFirst(products, ["150-rx", "multiview"], "NHD-150-RX");
    const encoder = pickFirst(products, ["120", "encoder", "1g"], "NHD-120-series");
    const controller = pickFirst(products, ["ctl", "control"], "NHD-CTL-PRO");

    return [
      {
        sku: mvRx.sku,
        name: mvRx.name,
        role: "Multiview endpoint",
        qty: Math.max(displayCount, 1),
        reason: "Selected because the design pattern suggests multiview behaviour.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: encoder.sku,
        name: encoder.name,
        role: "Source encoding",
        qty: Math.max(sourceCount, 1),
        reason: "Provides the low-bandwidth source ecosystem for multiview workflows.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
      {
        sku: controller.sku,
        name: controller.name,
        role: "Control",
        qty: 1,
        reason: "Supports preset recall and routing control.",
        source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
      },
    ];
  }

  const endpoint = pickFirst(products, ["500", "j2k", "endpoint", "4k60"], "NHD-500-TX/RX v2");
  const lite = pickFirst(products, ["500-e", "cost-down"], "NHD-500-E");
  const iw = pickFirst(products, ["500-iw", "in-wall", "room-input"], "NHD-500-IW-TX");
  const switcher = pickFirst(products, ["switch", "network", "poe"], "SW-100-08P");
  const controller = pickFirst(products, ["ctl", "control"], "NHD-CTL-PRO");

  return [
    {
      sku: endpoint.sku,
      name: endpoint.name,
      role: "Main endpoint platform",
      qty: Math.max(sourceCount + displayCount, 2),
      reason: "General-purpose 1Gb 4K60 AVoIP recommendation.",
      source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
    },
    {
      sku: lite.sku,
      name: lite.name,
      role: "Cost-down endpoint",
      qty: displayCount >= 4 ? Math.max(displayCount, 1) : 0,
      reason: "Use where not every endpoint needs the full primary feature set.",
      source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
    },
    {
      sku: iw.sku,
      name: iw.name,
      role: "Room input plate",
      qty: sourceCount <= 3 ? Math.max(sourceCount, 1) : 0,
      reason: "Useful for podium, desk, and wall-plate source points.",
      source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
    },
    {
      sku: switcher.sku,
      name: switcher.name,
      role: "Network switch",
      qty: 1,
      reason: "Supports transport and endpoint control.",
      source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
    },
    {
      sku: controller.sku,
      name: controller.name,
      role: "Control",
      qty: 1,
      reason: "Adds automation and preset recall.",
      source: products === FALLBACK_PRODUCTS ? "fallback" : "catalogue",
    },
  ].filter((item) => item.qty > 0);
}
'@

$canvasTsx = @'
import { useMemo, useState } from "react";
import "./wm-architecture-canvas.css";
import { resolveCatalogueRecommendations, type CatalogueMode } from "@/features/dashboard/services/catalogueRecommendationResolver";

type Props = {
  title?: string;
  mode?: CatalogueMode;
  sourceCount?: number;
  displayCount?: number;
  distanceLabel?: string;
  primarySku?: string;
  secondarySku?: string;
  status?: string;
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
  const [activeMode, setActiveMode] = useState<CatalogueMode>(mode);
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
  const multiview = useMemo(() => titleSuggestsMultiview(title), [title]);

  const resolvedRecommendations = useMemo(() => {
    const items = resolveCatalogueRecommendations({
      mode: activeMode,
      sourceCount,
      displayCount,
      distanceM,
      multiview,
    });

    const pinned = [];

    if (primarySku) {
      pinned.push({
        sku: primarySku,
        name: "Primary selection override",
        role: "Pinned by dashboard",
        qty: 1,
        reason: "Explicitly passed from the dashboard.",
        source: "fallback" as const,
      });
    }

    if (secondarySku) {
      pinned.push({
        sku: secondarySku,
        name: "Secondary selection override",
        role: "Pinned by dashboard",
        qty: 1,
        reason: "Explicitly passed from the dashboard.",
        source: "fallback" as const,
      });
    }

    return [...pinned, ...items];
  }, [activeMode, sourceCount, displayCount, distanceM, multiview, primarySku, secondarySku]);

  const bomItems = useMemo<BomItem[]>(() => {
    const items: BomItem[] = resolvedRecommendations.map((item) => ({
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

    return items;
  }, [resolvedRecommendations, flattenedRoutes.length]);

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
        detail: "Current distance pushes this design toward premium 10Gb / fibre-class transport.",
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

  return (
    <div className="wm-arch">
      <div className="wm-arch__header">
        <div className="wm-arch__title-group">
          <div className="wm-arch__eyebrow">Architecture Layout</div>
          <h3 className="wm-arch__title">{title}</h3>
          <div className="wm-arch__headline">
            Catalogue-backed recommendation engine
          </div>
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

      <div className="wm-arch__meta-row">
        <div className="wm-arch__meta-card">
          <strong>Validation</strong>
          <span>{validation.detail}</span>
          <span>Distance: {distanceLabel}</span>
          <span>Status: {status}</span>
        </div>

        <div className="wm-arch__meta-card">
          <strong>Recommendation source</strong>
          <span>Products are resolved from the local catalogue resolver first.</span>
          <span>Fallbacks are only used where no catalogue match is available.</span>
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
            {resolvedRecommendations.map((item) => (
              <article key={`${item.sku}-${item.role}`} className="wm-product-card">
                <div className="wm-product-card__top">
                  <strong>{item.sku}</strong>
                  <span>x{item.qty}</span>
                </div>
                <div className="wm-product-card__name">{item.name}</div>
                <div className="wm-product-card__role">{item.role}</div>
                <div className="wm-product-card__source">{item.source === "catalogue" ? "Catalogue match" : "Fallback"}</div>
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
.wm-product-card__source {
  font-size: 11px;
  color: #8db3e8;
}
'@

Save-Utf8NoBom -RelativePath "src\features\dashboard\services\catalogueRecommendationResolver.ts" -Content $resolverTs
Save-Utf8NoBom -RelativePath "src\features\dashboard\components\DashboardArchitectureCanvas.tsx" -Content $canvasTsx

$cssPath = "src\features\dashboard\components\wm-architecture-canvas.css"
$existingCss = if (Test-Path $cssPath) { Get-Content $cssPath -Raw } else { "" }
if ($existingCss -notmatch [regex]::Escape(".wm-product-card__source")) {
  Save-Utf8NoBom -RelativePath $cssPath -Content ($existingCss + "`r`n" + $css)
}

npm run typecheck