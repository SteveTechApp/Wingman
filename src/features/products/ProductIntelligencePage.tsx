import React from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
  Square,
  CheckSquare,
} from "lucide-react";

type ProductStatus = "New" | "Core" | "Flagship" | "Essentials";

type ProductRecord = {
  sku: string;
  name: string;
  family: string;
  status: ProductStatus;
  summary: string;
  bestFor: string;
  video: string;
  io: string;
  transport: string;
  usb: string;
  audio: string;
  control: string;
  tags: string[];
};

const seedProducts: ProductRecord[] = [
  {
    sku: "APO-210-UC",
    name: "Apollo collaborative switcher",
    family: "Presentation / UC",
    status: "Flagship",
    summary: "Presentation and UC hub with USB-C, HDMI, HDBaseT output, mics and speaker integration.",
    bestFor: "Hybrid meeting rooms",
    video: "4K presentation",
    io: "USB-C + HDMI",
    transport: "HDBaseT out",
    usb: "USB host + device",
    audio: "Integrated speaker + mics",
    control: "App / network / room control",
    tags: ["USB-C", "UC", "Wireless", "Collaboration", "HDBaseT"],
  },
  {
    sku: "APO-DG1",
    name: "Apollo wireless casting dongle",
    family: "Presentation / UC",
    status: "Core",
    summary: "Compact wireless casting dongle for quick presentation sharing.",
    bestFor: "Small meeting spaces",
    video: "1080p",
    io: "USB-C",
    transport: "Wireless",
    usb: "USB-C device",
    audio: "Embedded",
    control: "Buttonless / simple pairing",
    tags: ["Wireless", "Casting", "USB-C"],
  },
  {
    sku: "APO-DG2",
    name: "Apollo 4K casting and conferencing dongle",
    family: "Presentation / UC",
    status: "New",
    summary: "4K wireless presentation and conferencing endpoint for cleaner table connectivity.",
    bestFor: "Premium collaboration rooms",
    video: "4K",
    io: "USB-C",
    transport: "Wireless",
    usb: "USB-C device",
    audio: "Embedded",
    control: "App assisted",
    tags: ["4K", "Wireless", "UC", "USB-C"],
  },
  {
    sku: "NHD-110-TX",
    name: "NetworkHD encoder",
    family: "AVoIP",
    status: "Core",
    summary: "AV over IP transmitter for scalable source distribution over network infrastructure.",
    bestFor: "Multi-room AV distribution",
    video: "4K",
    io: "1 in / network out",
    transport: "1G AVoIP",
    usb: "No USB",
    audio: "Embedded audio",
    control: "Network / API / controller",
    tags: ["AVoIP", "Encoder", "Network", "Scalable"],
  },
  {
    sku: "NHD-110-RX",
    name: "NetworkHD decoder",
    family: "AVoIP",
    status: "Core",
    summary: "NetworkHD receiver for display endpoints in scalable AV over IP deployments.",
    bestFor: "Classrooms and campus distribution",
    video: "4K",
    io: "Network in / HDMI out",
    transport: "1G AVoIP",
    usb: "No USB",
    audio: "Embedded audio",
    control: "Network / API / controller",
    tags: ["AVoIP", "Decoder", "Endpoint", "Display"],
  },
  {
    sku: "MX-0808-H2A",
    name: "8x8 matrix switcher",
    family: "Matrix",
    status: "Flagship",
    summary: "Central matrix for routing multiple sources to multiple displays with pro audio support.",
    bestFor: "Boardrooms and divisible rooms",
    video: "4K60",
    io: "8x8",
    transport: "Direct matrix",
    usb: "No USB",
    audio: "Analog / de-embed",
    control: "LAN / RS-232 / IR",
    tags: ["Matrix", "4K60", "Boardroom", "Routing"],
  },
  {
    sku: "SW-640L-TX-W",
    name: "presentation switcher transmitter",
    family: "HDBaseT",
    status: "Core",
    summary: "Wallplate-style presentation switcher and extender transmitter for simpler room inputs.",
    bestFor: "Training and teaching spaces",
    video: "4K",
    io: "Multi-input",
    transport: "HDBaseT",
    usb: "USB extension",
    audio: "Embedded + local breakaway",
    control: "LAN / RS-232 / CEC",
    tags: ["HDBaseT", "Switcher", "Wallplate", "USB"],
  },
  {
    sku: "EX-70-G2",
    name: "HDBaseT extender set",
    family: "HDBaseT",
    status: "Essentials",
    summary: "Straightforward point-to-point extension for reliable long-distance HDMI transport.",
    bestFor: "Simple extension jobs",
    video: "4K",
    io: "Tx / Rx set",
    transport: "70m HDBaseT",
    usb: "No USB",
    audio: "Embedded",
    control: "IR / RS-232",
    tags: ["Extender", "70m", "HDBaseT", "Value"],
  },
  {
    sku: "AMP-260-DNT",
    name: "network amplifier with Dante",
    family: "Audio",
    status: "New",
    summary: "Network amplifier with DSP and Dante connectivity for distributed audio projects.",
    bestFor: "Education and commercial audio zones",
    video: "Audio product",
    io: "Dante / speaker out",
    transport: "Network audio",
    usb: "No USB",
    audio: "Dante + DSP",
    control: "Network / DSP control",
    tags: ["Audio", "Dante", "Amplifier", "DSP"],
  },
  {
    sku: "APO-COM-MIC",
    name: "Apollo companion microphone",
    family: "Presentation / UC",
    status: "Essentials",
    summary: "Table companion mic that extends pickup coverage for Apollo room systems.",
    bestFor: "Medium meeting rooms",
    video: "Accessory",
    io: "Mini USB",
    transport: "Local peripheral",
    usb: "USB accessory",
    audio: "Microphone expansion",
    control: "Host managed",
    tags: ["Accessory", "Microphone", "UC"],
  },
  {
    sku: "APO-DG-DOCK",
    name: "Apollo dongle dock",
    family: "Accessories",
    status: "Essentials",
    summary: "Docking cradle for Apollo casting dongles to improve room readiness and storage.",
    bestFor: "Managed collaboration spaces",
    video: "Accessory",
    io: "Dock interface",
    transport: "Local accessory",
    usb: "USB support",
    audio: "N/A",
    control: "None",
    tags: ["Accessory", "Dock", "Wireless"],
  },
  {
    sku: "NHD-400-TX",
    name: "higher-performance AVoIP encoder",
    family: "AVoIP",
    status: "Flagship",
    summary: "Higher-end encoder for more demanding distributed AV environments.",
    bestFor: "Control rooms and premium multi-display systems",
    video: "4K60",
    io: "1 in / network out",
    transport: "AVoIP",
    usb: "USB support",
    audio: "Embedded audio",
    control: "Network / API / controller",
    tags: ["AVoIP", "4K60", "Premium", "USB"],
  },
];

type SortMode = "sku" | "family" | "status";

const statusRank: Record<ProductStatus, number> = {
  Flagship: 0,
  New: 1,
  Core: 2,
  Essentials: 3,
};

const familyOptions = ["All", ...Array.from(new Set(seedProducts.map((p) => p.family)))];
const tagOptions = [
  "All",
  "4K",
  "4K60",
  "AVoIP",
  "HDBaseT",
  "Wireless",
  "USB",
  "UC",
  "Dante",
  "Matrix",
  "Accessory",
];

function badgeStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 11,
    color: "rgba(220,252,231,0.9)",
    lineHeight: 1.2,
    whiteSpace: "nowrap" as const,
  };
}

function statusStyle(status: ProductStatus): React.CSSProperties {
  const map: Record<ProductStatus, React.CSSProperties> = {
    New: {
      background: "rgba(16,185,129,0.14)",
      color: "#a7f3d0",
      border: "1px solid rgba(16,185,129,0.28)",
    },
    Core: {
      background: "rgba(59,130,246,0.14)",
      color: "#bfdbfe",
      border: "1px solid rgba(59,130,246,0.28)",
    },
    Flagship: {
      background: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.28)",
    },
    Essentials: {
      background: "rgba(148,163,184,0.14)",
      color: "#e2e8f0",
      border: "1px solid rgba(148,163,184,0.24)",
    },
  };

  return {
    ...badgeStyle(),
    ...map[status],
  };
}

function ProductCard(props: {
  item: ProductRecord;
  compact: boolean;
  selected: boolean;
  onToggleCompare: (sku: string) => void;
}) {
  const { item, compact, selected, onToggleCompare } = props;

  const specPills = [
    item.video,
    item.io,
    item.transport,
    item.usb,
    item.audio,
    item.control,
  ];

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(5,20,22,0.96), rgba(3,12,14,0.96))",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
          padding: compact ? 14 : 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <span style={badgeStyle()}>{item.family}</span>
              <span style={statusStyle(item.status)}>{item.status}</span>
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#34d399",
                marginBottom: 6,
              }}
            >
              {item.sku}
            </div>

            <div
              style={{
                fontSize: compact ? 16 : 18,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#f8fafc",
              }}
            >
              {item.name}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleCompare(item.sku)}
            title={selected ? "Remove from compare" : "Add to compare"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: selected ? "1px solid rgba(52,211,153,0.5)" : "1px solid rgba(255,255,255,0.08)",
              background: selected ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
              display: "grid",
              placeItems: "center",
              color: selected ? "#86efac" : "rgba(255,255,255,0.7)",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {selected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.45,
            color: "rgba(226,232,240,0.82)",
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {item.summary}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(148,163,184,0.85)",
              fontWeight: 700,
            }}
          >
            Quick spec
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {specPills.map((spec) => (
              <span key={spec} style={badgeStyle()}>
                {spec}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.85)", fontWeight: 700 }}>
            Best fit
          </div>
          <div style={{ fontSize: 13, color: "#e2e8f0" }}>{item.bestFor}</div>
        </div>

        <details
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 12,
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              color: "#cbd5e1",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <span>Details</span>
            <ChevronDown size={15} />
          </summary>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Video</div>
              <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.video}</div>
            </div>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Transport</div>
              <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.transport}</div>
            </div>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>USB</div>
              <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.usb}</div>
            </div>
            <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.85)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Audio / Control</div>
              <div style={{ fontSize: 13, color: "#f8fafc" }}>{item.audio} • {item.control}</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default function ProductIntelligencePage() {
  const [query, setQuery] = React.useState("");
  const [family, setFamily] = React.useState("All");
  const [tag, setTag] = React.useState("All");
  const [compact, setCompact] = React.useState(true);
  const [sort, setSort] = React.useState<SortMode>("sku");
  const [selected, setSelected] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = seedProducts.filter((item) => {
      const matchesQuery =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesFamily = family === "All" || item.family === family;
      const matchesTag = tag === "All" || item.tags.includes(tag) || item.summary.includes(tag) || item.usb.includes(tag) || item.transport.includes(tag);

      return matchesQuery && matchesFamily && matchesTag;
    });

    const sorted = [...list];

    sorted.sort((a, b) => {
      if (sort === "family") {
        return a.family.localeCompare(b.family) || a.sku.localeCompare(b.sku);
      }

      if (sort === "status") {
        return statusRank[a.status] - statusRank[b.status] || a.sku.localeCompare(b.sku);
      }

      return a.sku.localeCompare(b.sku);
    });

    return sorted;
  }, [query, family, tag, sort]);

  const compared = React.useMemo(() => {
    return seedProducts.filter((item) => selected.includes(item.sku));
  }, [selected]);

  function toggleCompare(sku: string) {
    setSelected((current) => {
      if (current.includes(sku)) {
        return current.filter((x) => x !== sku);
      }

      if (current.length >= 3) {
        return [...current.slice(1), sku];
      }

      return [...current, sku];
    });
  }

  return (
    <div className="wm-page" style={{ display: "grid", gap: 16 }}>
      <div
        className="wm-card"
        style={{
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(135deg, rgba(3,22,24,0.98), rgba(5,35,34,0.96))",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6ee7b7", fontWeight: 800 }}>
              Product intelligence
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05, color: "#f8fafc" }}>
              Faster product scanning. Cleaner decisions.
            </div>
            <div style={{ maxWidth: 900, fontSize: 14, lineHeight: 1.5, color: "rgba(226,232,240,0.78)" }}>
              Compact cards, clearer separation, lighter summaries, and details only when needed.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setCompact(true)}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: compact ? "1px solid rgba(52,211,153,0.45)" : "1px solid rgba(255,255,255,0.08)",
                background: compact ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                color: "#e2e8f0",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Grid3X3 size={15} />
              Compact
            </button>

            <button
              type="button"
              onClick={() => setCompact(false)}
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: compact ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(52,211,153,0.45)",
                background: compact ? "rgba(255,255,255,0.03)" : "rgba(16,185,129,0.12)",
                color: "#e2e8f0",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <List size={15} />
              Detailed
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(260px, 2fr) repeat(3, minmax(160px, 1fr))",
          }}
        >
          <label
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Search size={16} color="#86efac" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, product name, family, or capability"
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
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            style={{
              height: 46,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
            }}
          >
            {familyOptions.map((option) => (
              <option key={option} value={option} style={{ background: "#071417", color: "#f8fafc" }}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            style={{
              height: 46,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
            }}
          >
            {tagOptions.map((option) => (
              <option key={option} value={option} style={{ background: "#071417", color: "#f8fafc" }}>
                {option}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSort((current) => {
                if (current === "sku") return "family";
                if (current === "family") return "status";
                return "sku";
              });
            }}
            style={{
              height: 46,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <ArrowUpDown size={15} />
            Sort: {sort}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "280px minmax(0, 1fr)",
          alignItems: "start",
        }}
      >
        <aside
          className="wm-card"
          style={{
            position: "sticky",
            top: 16,
            display: "grid",
            gap: 14,
            padding: 16,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(4,16,18,0.9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f8fafc", fontWeight: 800 }}>
            <SlidersHorizontal size={16} />
            Filters
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.8)", fontWeight: 700 }}>
              Family
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {familyOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFamily(option)}
                  style={{
                    ...badgeStyle(),
                    cursor: "pointer",
                    background: family === option ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)",
                    border: family === option ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.8)", fontWeight: 700 }}>
              Quick capability
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tagOptions.filter((x) => x !== "All").map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTag(option)}
                  style={{
                    ...badgeStyle(),
                    cursor: "pointer",
                    background: tag === option ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.04)",
                    border: tag === option ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.8)", fontWeight: 700 }}>
              Results
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#f8fafc", lineHeight: 1 }}>{filtered.length}</div>
            <div style={{ fontSize: 13, color: "rgba(226,232,240,0.78)" }}>
              Cleaner compact cards with inline detail expansion.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFamily("All");
              setTag("All");
              setSort("sku");
              setSelected([]);
            }}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#e2e8f0",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Reset filters
          </button>
        </aside>

        <div style={{ display: "grid", gap: 16 }}>
          {compared.length > 0 ? (
            <div
              className="wm-card"
              style={{
                display: "grid",
                gap: 12,
                padding: 16,
                borderRadius: 20,
                border: "1px solid rgba(16,185,129,0.22)",
                background: "linear-gradient(180deg, rgba(5,24,21,0.98), rgba(3,14,13,0.98))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6ee7b7", fontWeight: 800 }}>
                    Compare tray
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                    {compared.length} product{compared.length === 1 ? "" : "s"} selected
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected([])}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  Clear compare
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: `repeat(${Math.max(compared.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {compared.map((item) => (
                  <div
                    key={item.sku}
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6ee7b7", fontWeight: 800 }}>
                      {item.sku}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "rgba(226,232,240,0.82)" }}>{item.family}</div>
                    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: "#cbd5e1" }}>Video: {item.video}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1" }}>Transport: {item.transport}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1" }}>USB: {item.usb}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1" }}>Audio: {item.audio}</div>
                      <div style={{ fontSize: 12, color: "#cbd5e1" }}>Best fit: {item.bestFor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: compact
                ? "repeat(auto-fill, minmax(290px, 1fr))"
                : "repeat(auto-fill, minmax(360px, 1fr))",
            }}
          >
            {filtered.map((item) => (
              <ProductCard
                key={item.sku}
                item={item}
                compact={compact}
                selected={selected.includes(item.sku)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}