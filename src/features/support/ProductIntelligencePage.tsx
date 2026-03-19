import * as React from "react";
import {
  Archive,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  XCircle,
} from "lucide-react";

type RemoteRecord = Record<string, unknown>;

type StatusTone = "approved" | "draft" | "expired" | "flagged" | "archived" | "unknown";

type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  vendor: string;
  vendorType: string;
  family: string;
  group: string;
  category: string;
  subcategory: string;
  classificationSource: string;
  approvalStatus: string;
  confidence: number | null;
  evidenceEntries: number | null;
  lastCaptured: string;
  lastReviewed: string;
  sourceLink: string;
  summary: string;
  archived: boolean;
  flagged: boolean;
};

type SortMode = "sku" | "family" | "status" | "confidence";

type HealthSummary = {
  visibleRecords: number;
  approved: number;
  openFlags: number;
  archived: number;
  highConfidence: number;
  manualOverrides: number;
  matchingTotal: number;
  endpointStatus: string;
};


function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function buildProductIntelligenceEndpoint(): string {
  const explicit = tidy(import.meta.env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT);
  if (explicit) return explicit.replace(/\/$/, "");

  const competitor = tidy(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT);
  if (competitor) {
    try {
      const parsed = new URL(competitor);
      const cleanPath = parsed.pathname.replace(/\/$/, "");
      parsed.pathname = cleanPath.endsWith("/api/competitor-lookup")
        ? cleanPath.replace(/\/api\/competitor-lookup$/, "/api/product-intelligence")
        : "/api/product-intelligence";
      return parsed.toString().replace(/\/$/, "");
    } catch {
    }
  }

  return "http://127.0.0.1:8787/api/product-intelligence";
}

const PRODUCT_INTELLIGENCE_ENDPOINT = buildProductIntelligenceEndpoint();
const STATUS_ORDER: Record<string, number> = {
  approved: 0,
  draft: 1,
  pending: 2,
  flagged: 3,
  expired: 4,
  archived: 5,
  unknown: 6,
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "y";
  }
  return false;
}

function titleCase(value: string): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function firstNonEmpty(record: RemoteRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return fallback;
}

function firstNumber(record: RemoteRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstBool(record: RemoteRecord, keys: string[]): boolean {
  for (const key of keys) {
    if (key in record) return asBool(record[key]);
  }
  return false;
}

function truncate(value: string, max = 180): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

function detectSummary(record: RemoteRecord): string {
  const direct = firstNonEmpty(record, [
    "summary",
    "description",
    "notes",
    "overview",
    "reason",
    "commentary",
    "supportingText",
  ]);

  if (direct) return direct;

  const family = firstNonEmpty(record, ["family"]);
  const category = firstNonEmpty(record, ["category"]);
  const subcategory = firstNonEmpty(record, ["subcategory"]);
  const group = firstNonEmpty(record, ["group"]);

  const parts = [family, category, subcategory, group].filter(Boolean);
  return parts.length ? parts.join(" / ") : "No product summary available.";
}

function normaliseRecord(input: RemoteRecord, index: number): ProductRecord {
  const approvalStatus =
    firstNonEmpty(input, ["approvalStatus", "status", "state", "reviewStatus"], "unknown").toLowerCase();

  const sourceLink = firstNonEmpty(input, ["sourceLink", "sourceUrl", "url", "link"]);
  const summary = truncate(detectSummary(input), 220);

  return {
    id: firstNonEmpty(input, ["id", "_id", "recordId", "sku"], `record-${index + 1}`),
    sku: firstNonEmpty(input, ["sku", "partNumber", "model", "code"], `RECORD-${index + 1}`),
    name: firstNonEmpty(input, ["name", "title", "productName"], "Unnamed record"),
    vendor: firstNonEmpty(input, ["vendor", "brand", "manufacturer"], "Unknown"),
    vendorType: firstNonEmpty(input, ["vendorType", "vendor_type", "sourceVendorType"], "Unknown"),
    family: firstNonEmpty(input, ["family"], "Unassigned"),
    group: firstNonEmpty(input, ["group"], "Unassigned"),
    category: firstNonEmpty(input, ["category"], "Unassigned"),
    subcategory: firstNonEmpty(input, ["subcategory"], "Unassigned"),
    classificationSource: firstNonEmpty(input, ["classificationSource", "sourceType", "source"], "source"),
    approvalStatus,
    confidence: firstNumber(input, ["confidence", "score", "matchConfidence"]),
    evidenceEntries: firstNumber(input, ["evidenceEntries", "evidenceCount", "evidence"]),
    lastCaptured: firstNonEmpty(input, ["lastCaptured", "capturedAt", "updatedAt"], "-"),
    lastReviewed: firstNonEmpty(input, ["lastReviewed", "reviewedAt"], "-"),
    sourceLink,
    summary,
    archived: firstBool(input, ["archived", "isArchived"]),
    flagged: firstBool(input, ["flagged", "hasFlag", "reviewFlag"]),
  };
}

function statusTone(record: ProductRecord): StatusTone {
  if (record.archived) return "archived";
  if (record.flagged) return "flagged";

  const status = record.approvalStatus.toLowerCase();
  if (status.includes("approve")) return "approved";
  if (status.includes("draft")) return "draft";
  if (status.includes("expire")) return "expired";
  if (status.includes("flag")) return "flagged";
  if (status.includes("archive")) return "archived";
  return "unknown";
}

function toneStyles(tone: StatusTone): React.CSSProperties {
  switch (tone) {
    case "approved":
      return {
        color: "#bbf7d0",
        border: "1px solid rgba(34,197,94,0.24)",
        background: "rgba(34,197,94,0.12)",
      };
    case "draft":
      return {
        color: "#bfdbfe",
        border: "1px solid rgba(59,130,246,0.24)",
        background: "rgba(59,130,246,0.12)",
      };
    case "expired":
      return {
        color: "#fed7aa",
        border: "1px solid rgba(249,115,22,0.24)",
        background: "rgba(249,115,22,0.12)",
      };
    case "flagged":
      return {
        color: "#fecaca",
        border: "1px solid rgba(239,68,68,0.24)",
        background: "rgba(239,68,68,0.12)",
      };
    case "archived":
      return {
        color: "#e2e8f0",
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(148,163,184,0.12)",
      };
    default:
      return {
        color: "#cbd5e1",
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(255,255,255,0.04)",
      };
  }
}

function pillBase(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}

function smallLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.86)",
  };
}

function metricCard(label: string, value: string | number, tone?: "good" | "warning" | "neutral") {
  let valueColor = "#f8fafc";
  if (tone === "good") valueColor = "#86efac";
  if (tone === "warning") valueColor = "#fdba74";

  return (
    <div
      key={label}
      style={{
        minHeight: 84,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        padding: 14,
        display: "grid",
        gap: 8,
        alignContent: "start",
      }}
    >
      <div style={smallLabelStyle()}>{label}</div>
      <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 900, color: valueColor }}>{value}</div>
    </div>
  );
}

function ProductCard(props: {
  item: ProductRecord;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { item, expanded, onToggle } = props;
  const tone = statusTone(item);

  return (
    <article
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(3,18,24,0.98), rgba(4,13,18,0.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...pillBase(), ...toneStyles(tone) }}>{titleCase(item.approvalStatus || "unknown")}</span>
              <span
                style={{
                  ...pillBase(),
                  color: "#d1fae5",
                  border: "1px solid rgba(16,185,129,0.20)",
                  background: "rgba(16,185,129,0.08)",
                }}
              >
                {item.group}
              </span>
              <span
                style={{
                  ...pillBase(),
                  color: "#dbeafe",
                  border: "1px solid rgba(59,130,246,0.20)",
                  background: "rgba(59,130,246,0.08)",
                }}
              >
                {item.family}
              </span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: "#5eead4" }}>{item.sku}</div>
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15, color: "#f8fafc" }}>{item.name}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(226,232,240,0.78)" }}>{item.summary}</div>
          </div>

          <button
            type="button"
            onClick={() => onToggle(item.id)}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#e2e8f0",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            title={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown
              size={16}
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 140ms ease",
              }}
            />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={smallLabelStyle()}>Category</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{item.category}</div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={smallLabelStyle()}>Subcategory</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{item.subcategory}</div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={smallLabelStyle()}>Vendor</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{item.vendor}</div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={smallLabelStyle()}>Confidence</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>
              {item.confidence === null ? "-" : item.confidence.toFixed(2)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              ...pillBase(),
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Evidence {item.evidenceEntries ?? 0}
          </span>

          <span
            style={{
              ...pillBase(),
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {item.vendorType}
          </span>

          <span
            style={{
              ...pillBase(),
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {item.classificationSource}
          </span>

          {item.flagged ? (
            <span
              style={{
                ...pillBase(),
                color: "#fecaca",
                border: "1px solid rgba(239,68,68,0.22)",
                background: "rgba(239,68,68,0.10)",
              }}
            >
              <ShieldAlert size={13} />
              Review
            </span>
          ) : null}

          {item.archived ? (
            <span
              style={{
                ...pillBase(),
                color: "#e2e8f0",
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(148,163,184,0.10)",
              }}
            >
              <Archive size={13} />
              Archived
            </span>
          ) : null}
        </div>

        {expanded ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={smallLabelStyle()}>Last captured</div>
                <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.lastCaptured}</div>
              </div>

              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={smallLabelStyle()}>Last reviewed</div>
                <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.lastReviewed}</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <button
                type="button"
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#e2e8f0",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>

              <button
                type="button"
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(34,197,94,0.22)",
                  background: "rgba(34,197,94,0.10)",
                  color: "#bbf7d0",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Mark approved
              </button>

              <button
                type="button"
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(59,130,246,0.22)",
                  background: "rgba(59,130,246,0.10)",
                  color: "#bfdbfe",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Mark draft
              </button>

              <button
                type="button"
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.22)",
                  background: "rgba(239,68,68,0.10)",
                  color: "#fecaca",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Flag issue
              </button>

              {item.sourceLink ? (
                <a
                  href={item.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#e2e8f0",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={14} />
                  Source
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ProductIntelligencePage() {
  const [records, setRecords] = React.useState<ProductRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [viewFilter, setViewFilter] = React.useState("active");
  const [sortMode, setSortMode] = React.useState<SortMode>("sku");
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const loadRecords = React.useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const candidateUrls = [
        `PRODUCT_INTELLIGENCE_ENDPOINT`,
        "http://127.0.0.1:8787/api/product-intelligence",
        "http://127.0.0.1:8787/api/product-intelligence/records",
        "http://127.0.0.1:8787/api/wingman/catalog/product-intelligence",
        "http://127.0.0.1:8787/api/wingman/support/product-intelligence"
      ];

      let response: Response | null = null;
      let lastError = "";

      for (const url of candidateUrls) {
        try {
          const attempt = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (attempt.ok) {
            response = attempt;
            break;
          }

          lastError = `Request failed: ${attempt.status} for ${url}`;
        } catch (err) {
          lastError = err instanceof Error ? err.message : `Request failed for ${url}`;
        }
      }

      if (!response) {
        throw new Error(lastError || "No product intelligence endpoint responded.");
      }

      const raw = (await response.json()) as unknown;

      let list: RemoteRecord[] = [];

      if (Array.isArray(raw)) {
        list = raw as RemoteRecord[];
      } else if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.records)) list = obj.records as RemoteRecord[];
        else if (Array.isArray(obj.items)) list = obj.items as RemoteRecord[];
        else if (Array.isArray(obj.results)) list = obj.results as RemoteRecord[];
        else if (Array.isArray(obj.data)) list = obj.data as RemoteRecord[];
      }

      const normalised = list.map((item, index) => normaliseRecord(item, index));
      setRecords(normalised);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load product intelligence records.";
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRecords(false);
  }, [loadRecords]);

  const vendors = React.useMemo(() => {
    return ["all", ...Array.from(new Set(records.map((r) => r.vendor).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  }, [records]);

  const statuses = React.useMemo(() => {
    return ["all", ...Array.from(new Set(records.map((r) => r.approvalStatus).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  }, [records]);

  const hasActiveFilters = React.useMemo(() => {
    return (
      search.trim().length > 0 ||
      statusFilter !== "all" ||
      vendorFilter !== "all" ||
      viewFilter !== "active"
    );
  }, [search, statusFilter, vendorFilter, viewFilter]);

  const filtered = React.useMemo(() => {
    if (!hasActiveFilters) {
      return [];
    }

    const q = search.trim().toLowerCase();

    let list = records.filter((item) => {
      const matchesSearch =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subcategory.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || item.approvalStatus === statusFilter;
      const matchesVendor = vendorFilter === "all" || item.vendor === vendorFilter;
      const matchesView =
        viewFilter === "all" ||
        (viewFilter === "active" && !item.archived) ||
        (viewFilter === "archived" && item.archived) ||
        (viewFilter === "review" && item.flagged);

      return matchesSearch && matchesStatus && matchesVendor && matchesView;
    });

    list = [...list].sort((a, b) => {
      if (sortMode === "family") {
        return a.family.localeCompare(b.family) || a.sku.localeCompare(b.sku);
      }

      if (sortMode === "status") {
        const aRank = STATUS_ORDER[a.approvalStatus] ?? STATUS_ORDER.unknown;
        const bRank = STATUS_ORDER[b.approvalStatus] ?? STATUS_ORDER.unknown;
        return aRank - bRank || a.sku.localeCompare(b.sku);
      }

      if (sortMode === "confidence") {
        const aVal = a.confidence ?? -1;
        const bVal = b.confidence ?? -1;
        return bVal - aVal || a.sku.localeCompare(b.sku);
      }

      return a.sku.localeCompare(b.sku);
    });

    return list;
  }, [records, search, statusFilter, vendorFilter, viewFilter, sortMode, hasActiveFilters]);

  const health = React.useMemo<HealthSummary>(() => {
    const approved = records.filter((r) => statusTone(r) === "approved").length;
    const openFlags = records.filter((r) => r.flagged).length;
    const archived = records.filter((r) => r.archived).length;
    const highConfidence = records.filter((r) => (r.confidence ?? 0) >= 0.85).length;
    const manualOverrides = records.filter((r) => r.classificationSource.toLowerCase().includes("manual")).length;

    return {
      visibleRecords: filtered.length,
      approved,
      openFlags,
      archived,
      highConfidence,
      manualOverrides,
      matchingTotal: records.length,
      endpointStatus: error ? "Offline" : "Online",
    };
  }, [records, filtered, error]);

  function toggleExpanded(id: string) {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function cycleSort() {
    setSortMode((current) => {
      if (current === "sku") return "family";
      if (current === "family") return "status";
      if (current === "status") return "confidence";
      return "sku";
    });
  }

  return (
    <div
      className="wm-page"
      style={{
        display: "grid",
        gap: 18,
      }}
    >
      <section
        className="wm-card"
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(135deg, rgba(4,24,34,0.98), rgba(3,16,24,0.98))",
          boxShadow: "0 22px 48px rgba(0,0,0,0.18)",
          padding: 18,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5eead4" }}>
              Product intelligence
            </div>
            <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 900, color: "#f8fafc" }}>
              Compact review workspace
            </div>
            <div style={{ maxWidth: 900, fontSize: 14, lineHeight: 1.55, color: "rgba(226,232,240,0.76)" }}>
              Lighter record browsing, smaller cards, stronger field grouping, and progressive detail expansion instead of full-width maintenance walls.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void loadRecords(true)}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.05)",
                color: "#f8fafc",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} className={refreshing ? "wm-spin" : ""} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>

            <button
              type="button"
              onClick={cycleSort}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.05)",
                color: "#f8fafc",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <ArrowUpDown size={15} />
              Sort: {sortMode}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          }}
        >
          {metricCard("Endpoint status", health.endpointStatus, health.endpointStatus === "Online" ? "good" : "warning")}
          {metricCard("Visible records", health.visibleRecords)}
          {metricCard("Approved", health.approved, "good")}
          {metricCard("Open flags", health.openFlags, health.openFlags > 0 ? "warning" : "neutral")}
          {metricCard("Archived", health.archived)}
          {metricCard("High confidence", health.highConfidence)}
          {metricCard("Manual overrides", health.manualOverrides)}
          {metricCard("Matching total", health.matchingTotal)}
        </div>
      </section>

      <section
        className="wm-card"
        style={{
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(3,14,20,0.92)",
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f8fafc", fontWeight: 900 }}>
          <SlidersHorizontal size={16} />
          Filters
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(240px, 2fr) repeat(3, minmax(160px, 1fr))",
          }}
        >
          <label
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
            }}
          >
            <Search size={16} color="#5eead4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, SKU, family, group, category..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f8fafc",
                fontSize: 14,
              }}
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              padding: "0 14px",
            }}
          >
            {statuses.map((status) => (
              <option key={status} value={status} style={{ background: "#07141a", color: "#f8fafc" }}>
                {status === "all" ? "All statuses" : titleCase(status)}
              </option>
            ))}
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              padding: "0 14px",
            }}
          >
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor} style={{ background: "#07141a", color: "#f8fafc" }}>
                {vendor === "all" ? "All vendors" : vendor}
              </option>
            ))}
          </select>

          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value)}
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              padding: "0 14px",
            }}
          >
            <option value="active" style={{ background: "#07141a", color: "#f8fafc" }}>Active</option>
            <option value="all" style={{ background: "#07141a", color: "#f8fafc" }}>All records</option>
            <option value="review" style={{ background: "#07141a", color: "#f8fafc" }}>Review queue</option>
            <option value="archived" style={{ background: "#07141a", color: "#f8fafc" }}>Archived</option>
          </select>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              ...pillBase(),
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Filter size={13} />
            {filtered.length} shown
          </span>

          <span
            style={{
              ...pillBase(),
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Tag size={13} />
            {statusFilter === "all" ? "All statuses" : titleCase(statusFilter)}
          </span>
        </div>
      </section>

      {error ? (
        <section
          className="wm-card"
          style={{
            borderRadius: 18,
            border: "1px solid rgba(239,68,68,0.18)",
            background: "rgba(127,29,29,0.18)",
            padding: 16,
            color: "#fecaca",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <XCircle size={18} />
          {error}
        </section>
      ) : null}

      {loading ? (
        <section
          className="wm-card"
          style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(3,14,20,0.92)",
            padding: 18,
            color: "#cbd5e1",
          }}
        >
          Loading product intelligence records...
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          }}
        >
          {filtered.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              expanded={!!expanded[item.id]}
              onToggle={toggleExpanded}
            />
          ))}
        </section>
      )}

      {!loading && !error && !hasActiveFilters ? (
        <section
          className="wm-card"
          style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(3,14,20,0.92)",
            padding: 24,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc" }}>
            Start with a filter or search
          </div>
          <div style={{ fontSize: 14, color: "rgba(226,232,240,0.74)", maxWidth: 720, lineHeight: 1.55 }}>
            No product cards are shown by default. Enter a SKU, brand, family, group, or category, or change one of the filters to begin narrowing the records.
          </div>
        </section>
      ) : null}

      {!loading && !error && hasActiveFilters && filtered.length === 0 ? (
        <section
          className="wm-card"
          style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(3,14,20,0.92)",
            padding: 20,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc" }}>No records match the current filters</div>
          <div style={{ fontSize: 14, color: "rgba(226,232,240,0.74)" }}>
            Adjust the search term, status, vendor, or view filter.
          </div>
        </section>
      ) : null}
    </div>
  );
}