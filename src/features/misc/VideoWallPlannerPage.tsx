import React, { useMemo, useState } from "react";

import VideoWallSolutionShell, {
  type VideoWallTabKey,
} from "@/features/misc/videoWall/VideoWallSolutionShell";

type WallType = "lcd" | "led";
type LedStrategy = "single-source" | "wyrestorm-preprocessed" | "processor-multisource";
type LedProcessorClass = "single-input" | "multi-input";
type LedResolutionMode = "1080p" | "4k" | "custom";
type LcdDriveMode = "av-over-ip" | "processor" | "matrix-scaler";

type Recommendation = {
  title: string;
  family: string;
  products: string[];
  summary: string;
  reasons: string[];
  caution?: string;
};

type StarterBomLine = {
  item: string;
  qty: number;
  role: string;
  note?: string;
};

type PreviewWindow = {
  label: string;
  left: string;
  top: string;
  width: string;
  height: string;
};

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  padding: 20,
  background:
    "linear-gradient(180deg, rgba(7,13,24,0.98) 0%, rgba(13,23,39,0.98) 100%)",
  color: "#EAF2FF",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 1480,
  margin: "0 auto",
  display: "grid",
  gap: 16,
};

const heroStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 20,
  border: "1px solid rgba(90,140,200,0.25)",
  background:
    "linear-gradient(135deg, rgba(24,38,62,0.96) 0%, rgba(13,21,34,0.98) 100%)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background: "rgba(13,20,31,0.92)",
  border: "1px solid rgba(105,135,175,0.18)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.85fr)",
  alignItems: "start",
};

const tileRowStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const mutedStyle: React.CSSProperties = {
  color: "rgba(222,235,255,0.72)",
  fontSize: 14,
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.7,
  color: "rgba(180,205,236,0.82)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(114,151,201,0.24)",
  background: "rgba(24,34,49,0.95)",
  color: "#EEF4FF",
  padding: "11px 12px",
  outline: "none",
  fontSize: 14,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(35,78,138,0.34)",
  color: "#CFE4FF",
  border: "1px solid rgba(102,154,227,0.22)",
  fontSize: 12,
  fontWeight: 700,
};

const recommendationCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  background:
    "linear-gradient(180deg, rgba(17,30,52,0.98) 0%, rgba(12,18,31,0.98) 100%)",
  border: "1px solid rgba(96,146,221,0.28)",
  boxShadow: "0 16px 36px rgba(0,0,0,0.26)",
};

const controlSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(93, 144, 208, 0.18)",
  background: "linear-gradient(180deg, rgba(8, 19, 38, 0.94) 0%, rgba(5, 14, 28, 0.98) 100%)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(198, 220, 255, 0.76)",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
  color: "rgba(214, 228, 255, 0.68)",
};

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(101, 150, 214, 0.16)",
  background: "linear-gradient(180deg, rgba(9, 21, 42, 0.88) 0%, rgba(6, 15, 30, 0.96) 100%)",
};

const panelHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(180, 210, 255, 0.76)",
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#ffffff",
  lineHeight: 1.1,
};

const panelBodyTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "rgba(222, 234, 255, 0.78)",
};

const previewSurfaceStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(108, 163, 235, 0.2)",
  background:
    "radial-gradient(circle at top left, rgba(72, 146, 255, 0.18) 0%, transparent 32%), linear-gradient(180deg, rgba(10, 27, 54, 0.96) 0%, rgba(3, 11, 24, 1) 100%)",
  minHeight: 360,
};

const previewCaptionStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "rgba(208, 224, 255, 0.74)",
};

const canvasGridStyle: React.CSSProperties = {
  position: "absolute",
  inset: 18,
  display: "grid",
  gap: 8,
};

const canvasCellStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(134, 183, 249, 0.18)",
  background:
    "linear-gradient(180deg, rgba(46, 92, 158, 0.24) 0%, rgba(16, 34, 63, 0.18) 100%)",
};

const ledSurfaceFrameStyle: React.CSSProperties = {
  position: "absolute",
  inset: 18,
  borderRadius: 18,
  border: "1px solid rgba(117, 168, 234, 0.22)",
  background:
    "linear-gradient(180deg, rgba(11, 23, 44, 0.94) 0%, rgba(4, 11, 24, 0.98) 100%)",
  overflow: "hidden",
};

const ledWindowStyle = (window: PreviewWindow): React.CSSProperties => ({
  position: "absolute",
  left: window.left,
  top: window.top,
  width: window.width,
  height: window.height,
  borderRadius: 14,
  border: "1px solid rgba(134, 197, 255, 0.28)",
  background:
    "linear-gradient(180deg, rgba(37, 104, 184, 0.42) 0%, rgba(17, 44, 88, 0.68) 100%)",
});

const ledWindowLabelStyle: React.CSSProperties = {
  position: "absolute",
  left: 10,
  top: 10,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(236, 244, 255, 0.9)",
};

function TileButton(props: {
  active: boolean;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
}) {
  const { active, title, subtitle, accent, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        borderRadius: 18,
        padding: 16,
        cursor: "pointer",
        border: active
          ? "1px solid rgba(126,180,255,0.55)"
          : "1px solid rgba(115,138,170,0.18)",
        background: active
          ? "linear-gradient(180deg, rgba(28,48,78,0.98) 0%, rgba(17,31,55,0.98) 100%)"
          : "linear-gradient(180deg, rgba(18,27,41,0.98) 0%, rgba(12,18,29,0.98) 100%)",
        boxShadow: active
          ? "0 0 0 1px rgba(80,140,235,0.18) inset, 0 14px 32px rgba(0,0,0,0.25)"
          : "0 10px 24px rgba(0,0,0,0.18)",
        color: "#EEF5FF",
        minHeight: 128,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: accent,
          boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
        }}
      />
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      <div style={{ ...mutedStyle, fontSize: 13 }}>{subtitle}</div>
    </button>
  );
}

function ChoiceCard(props: {
  active: boolean;
  title: string;
  description: string;
  footer?: string;
  onClick: () => void;
}) {
  const { active, title, description, footer, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: 14,
        cursor: "pointer",
        border: active
          ? "1px solid rgba(111,175,255,0.55)"
          : "1px solid rgba(103,128,160,0.18)",
        background: active
          ? "linear-gradient(180deg, rgba(28,48,78,0.92) 0%, rgba(17,31,55,0.92) 100%)"
          : "rgba(17,25,38,0.92)",
        color: "#EEF4FF",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
      <div style={{ ...mutedStyle, fontSize: 13 }}>{description}</div>
      {footer ? (
        <div style={{ color: "#A9CCFF", fontSize: 12, fontWeight: 700 }}>{footer}</div>
      ) : null}
    </button>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, onChange } = props;

  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        style={inputStyle}
      />
    </label>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { label, value, onChange, placeholder } = props;

  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const { label, value, options, onChange } = props;

  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function parsePositiveInt(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function buildLedRecommendation(input: {
  strategy: LedStrategy;
  processorClass: LedProcessorClass;
  targetWidthPx: number;
  targetHeightPx: number;
  sourceCount: number;
}): Recommendation {
  const { strategy, processorClass, targetWidthPx, targetHeightPx, sourceCount } = input;

  const longEdge = Math.max(targetWidthPx, targetHeightPx);
  const isVeryWideCanvas = longEdge >= 5000;
  const isLargeCanvas = longEdge >= 3800;

  if (strategy === "single-source") {
    if (isVeryWideCanvas) {
      return {
        title: "LED canvas with scalable AVoIP distribution",
        family: "WyreStorm NetworkHD 500 Series",
        products: ["NHD-500 Series", "LED processor with single HDMI input"],
        summary:
          "Use NetworkHD 500 Series as the primary signal architecture and feed a standard LED controller with a prepared canvas output.",
        reasons: [
          "Suitable where the LED wall is effectively one large destination fed from a single prepared program output.",
          "Supports custom LED resolutions up to 8000 pixels, which is useful for wider direct-view LED canvases.",
          "Keeps the LED controller requirement simpler while preserving routing flexibility upstream.",
        ],
        caution:
          "Confirm exact LED controller acceptance resolution and processor scaling limits before final BOM issue.",
      };
    }

    return {
      title: "Single-source LED workflow",
      family: "WyreStorm front-end + standard LED controller",
      products: ["NHD-500 Series", "or MX-0812-SCL", "LED processor with single HDMI input"],
      summary:
        "Best for presentation, signage, or one primary live canvas where a single source or switched program feed drives the LED processor.",
      reasons: [
        "Simpler operator workflow.",
        "Lower LED processor cost than multi-input processor architectures.",
        "Good fit where layouts do not need to be generated inside the LED processor.",
      ],
      caution:
        "If customer expects live PIP / multiview changes, move to a multiview-driven or processor-driven design.",
    };
  }

  if (strategy === "wyrestorm-preprocessed") {
    if (isLargeCanvas || sourceCount >= 4) {
      return {
        title: "Pre-processed multi-source LED workflow",
        family: "WyreStorm multiview before LED processor",
        products: ["NHD-150-RX", "NHD-600-TRX", "NHD-500 Series", "single-input LED processor"],
        summary:
          "Use WyreStorm multiview decoding upstream, then feed a standard single-input LED processor with a ready-made composition.",
        reasons: [
          "Avoids moving into expensive multi-input LED processor classes too early.",
          "Gives better AV system flexibility for multi-source switching and layout control.",
          "Useful where customer wants several active sources but remains cost-sensitive.",
        ],
        caution:
          "Validate whether the selected multiview output and LED processor can both accept the final target canvas cleanly.",
      };
    }

    return {
      title: "Cost-aware multi-source LED workflow",
      family: "WyreStorm multiview-led strategy",
      products: ["NHD-150-RX", "or NHD-600-TRX", "single-input LED processor"],
      summary:
        "Use WyreStorm to create the layout before the LED processor. This is often the best value option for 2–4 source LED applications.",
      reasons: [
        "Keeps the LED controller simpler and cheaper.",
        "Layout intelligence lives in the AV system, not only inside the processor.",
        "Better alignment for projects where switching and source management matter.",
      ],
      caution:
        "Document who controls layout changes: AV UI, room control, or processor front-end.",
    };
  }

  if (processorClass === "multi-input") {
    return {
      title: "Processor-led multi-source LED workflow",
      family: "Advanced multi-input LED processor",
      products: ["Multi-input LED processor", "WyreStorm switching front-end where needed"],
      summary:
        "Use a multi-input LED processor where the customer wants the wall processor itself to manage live sources, PIP, and layout presets.",
      reasons: [
        "Cleaner all-in-one operator story at the LED processor layer.",
        "Good fit for premium environments requiring frequent layout changes at processor level.",
        "Can reduce dependence on separate multiview hardware in some designs.",
      ],
      caution:
        "Usually the highest-cost route. Compare carefully against a WyreStorm multiview front-end.",
    };
  }

  return {
    title: "Processor-driven LED workflow",
    family: "Dedicated LED processor architecture",
    products: ["Single or multi-input LED processor", "WyreStorm source management as required"],
    summary:
      "Use a processor-centric design where the LED wall technology choice is the main driver and source composition remains tightly coupled to the processor.",
    reasons: [
      "Useful when the LED vendor workflow is already fixed.",
      "Can simplify handover where LED specialist controls the wall processor.",
      "Appropriate when AV system is mainly source handoff and switching.",
    ],
    caution:
      "Be clear where scaling, composition, preset recall, and source failover are handled.",
  };
}

function buildLcdRecommendation(input: {
  driveMode: LcdDriveMode;
  rows: number;
  cols: number;
  sourceCount: number;
}): Recommendation {
  const { driveMode, rows, cols, sourceCount } = input;
  const totalDisplays = rows * cols;

  if (driveMode === "av-over-ip") {
    return {
      title: "LCD video wall via AVoIP",
      family: "WyreStorm NetworkHD",
      products: ["NetworkHD encoders", "NetworkHD decoders", "NHD-400-TX/RX or project-specific family"],
      summary:
        "Use AVoIP where the wall needs flexible routing, easy scaling, distributed sources, or future expansion.",
      reasons: [
        "Best for larger or more flexible systems.",
        "Strong fit where multiple sources or rooms are involved.",
        "Good long-term scalability for changing campus or enterprise needs.",
      ],
      caution:
        totalDisplays > 9
          ? "Confirm network design, multicast behaviour, and control strategy for larger walls."
          : "Confirm decoder count and source concurrency against final layout intent.",
    };
  }

  if (driveMode === "processor") {
    return {
      title: "LCD video wall via dedicated processor",
      family: "WyreStorm SW-0206-VW",
      products: ["SW-0206-VW"],
      summary:
        "Use a dedicated video wall processor for straightforward tiled display walls and localised processing workflows.",
      reasons: [
        "Clear appliance-style solution.",
        "Good where the project does not require full AVoIP architecture.",
        "Practical for simpler fixed-room installations.",
      ],
      caution:
        "Confirm wall size, rotation, splice mode, and source switching expectations before final recommendation.",
    };
  }

  return {
    title: "Scaled matrix-driven LCD wall",
    family: "WyreStorm matrix + scaling",
    products: ["MX-0812-SCL", "MX-0808-SCL", "project-fit matrix scaler"],
    summary:
      "Use matrix-scaler architecture where the system needs controlled source distribution and scaled presentation outputs without full networked AVoIP.",
    reasons: [
      "Good for fixed-architecture projects.",
      "Useful when multiple sources feed wall and local displays together.",
      "Can be a strong middle-ground between processor-only and AVoIP.",
    ],
    caution:
      sourceCount >= 4
        ? "Review source concurrency and layout expectations. Multiview may be preferable in some workflows."
        : "Check whether the customer may later need more routing flexibility than a fixed matrix provides.",
  };
}

function buildStarterBom(input: {
  wallType: WallType;
  lcdRows: number;
  lcdCols: number;
  lcdSourceCount: number;
  lcdDriveMode: LcdDriveMode;
  ledCanvasLabel: string;
  ledPixelPitch: string;
  ledSourceCount: number;
  ledStrategy: LedStrategy;
  ledProcessorClass: LedProcessorClass;
}): StarterBomLine[] {
  if (input.wallType === "lcd") {
    const displayCount = input.lcdRows * input.lcdCols;
    const commonLines: StarterBomLine[] = [
      {
        item: "Commercial display panels",
        qty: displayCount,
        role: "Wall displays",
        note: `${input.lcdRows} x ${input.lcdCols} wall layout.`,
      },
      {
        item: "Display wall mounts / structure",
        qty: displayCount,
        role: "Mounting",
      },
    ];

    if (input.lcdDriveMode === "av-over-ip") {
      return [
        {
          item: "WyreStorm NetworkHD encoders",
          qty: input.lcdSourceCount,
          role: "Source inputs",
        },
        {
          item: "WyreStorm NetworkHD decoders",
          qty: displayCount,
          role: "Display endpoints",
        },
        {
          item: "Managed AV over IP switch",
          qty: 1,
          role: "Network core",
          note: "Size ports, multicast, and uplinks for the wall traffic.",
        },
        ...commonLines,
      ];
    }

    if (input.lcdDriveMode === "processor") {
      return [
        {
          item: "SW-0206-VW video wall processor",
          qty: 1,
          role: "Wall processing",
        },
        {
          item: "Source handoff switcher",
          qty: input.lcdSourceCount > 1 ? 1 : 0,
          role: "Source selection",
          note: "Only needed when several local inputs must be switched ahead of the wall.",
        },
        ...commonLines,
      ].filter((line) => line.qty > 0);
    }

    return [
      {
        item: "Matrix scaler / switcher",
        qty: 1,
        role: "Routing core",
      },
      {
        item: "Scaled wall outputs",
        qty: displayCount,
        role: "Wall feeds",
      },
      ...commonLines,
    ];
  }

  const commonLedLines: StarterBomLine[] = [
    {
      item: "LED wall package",
      qty: 1,
      role: "Display package",
      note: `Match ${input.ledCanvasLabel} canvas at ${input.ledPixelPitch || "target"} mm pitch.`,
    },
    {
      item: "Source feeds / encoders",
      qty: input.ledSourceCount,
      role: "Active source inputs",
    },
  ];

  if (input.ledStrategy === "single-source") {
    return [
      {
        item:
          input.ledCanvasLabel.includes("5,")
            ? "WyreStorm NetworkHD 500 Series source path"
            : "WyreStorm switching or matrix front-end",
        qty: 1,
        role: "Prepared wall feed",
      },
      {
        item: "LED processor with single HDMI input",
        qty: 1,
        role: "Wall processor",
      },
      ...commonLedLines,
    ];
  }

  if (input.ledStrategy === "wyrestorm-preprocessed") {
    return [
      {
        item: "WyreStorm multiview / composition stage",
        qty: 1,
        role: "Source composition",
        note: "Build the live wall layout before the LED processor.",
      },
      {
        item: "LED processor with single HDMI input",
        qty: 1,
        role: "Wall processor",
      },
      ...commonLedLines,
    ];
  }

  return [
    {
      item:
        input.ledProcessorClass === "multi-input"
          ? "Multi-input LED processor"
          : "LED processor",
      qty: 1,
      role: "Wall processor",
    },
    {
      item: "WyreStorm source handoff / switching",
      qty: input.ledSourceCount > 1 ? 1 : 0,
      role: "Source handoff",
    },
    ...commonLedLines,
  ].filter((line) => line.qty > 0);
}

function buildLedPreviewWindows(strategy: LedStrategy, sourceCount: number): PreviewWindow[] {
  const visibleSources = Math.max(1, Math.min(sourceCount, 4));

  if (strategy === "single-source") {
    return [{ label: "Program", left: "7%", top: "10%", width: "86%", height: "80%" }];
  }

  if (strategy === "wyrestorm-preprocessed") {
    if (visibleSources <= 2) {
      return [
        { label: "Source 1", left: "7%", top: "12%", width: "40%", height: "72%" },
        { label: "Source 2", left: "53%", top: "12%", width: "40%", height: "72%" },
      ];
    }

    return [
      { label: "Source 1", left: "7%", top: "10%", width: "40%", height: "34%" },
      { label: "Source 2", left: "53%", top: "10%", width: "40%", height: "34%" },
      { label: "Source 3", left: "7%", top: "52%", width: "40%", height: "34%" },
      { label: visibleSources === 4 ? "Source 4" : "Program", left: "53%", top: "52%", width: "40%", height: "34%" },
    ];
  }

  return [
    { label: "Primary", left: "7%", top: "10%", width: "56%", height: "80%" },
    { label: "Source 2", left: "68%", top: "10%", width: "24%", height: "22%" },
    { label: "Source 3", left: "68%", top: "39%", width: "24%", height: "22%" },
    { label: visibleSources >= 4 ? "Source 4" : "Preset", left: "68%", top: "68%", width: "24%", height: "22%" },
  ];
}

function SnapshotMetric(props: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(106, 152, 214, 0.16)",
        background: "rgba(7, 18, 36, 0.82)",
      }}
    >
      <div style={labelStyle}>{props.label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
        {props.value}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(214, 228, 255, 0.68)" }}>
        {props.detail}
      </div>
    </div>
  );
}

function BomRow(props: StarterBomLine) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "start",
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(106, 155, 218, 0.14)",
        background: "rgba(9, 19, 35, 0.88)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>{props.item}</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: "rgba(174, 206, 255, 0.72)" }}>
          {props.role}
        </div>
        {props.note ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(214, 228, 255, 0.68)" }}>
            {props.note}
          </div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#ffffff",
          borderRadius: 999,
          padding: "6px 10px",
          background: "rgba(31, 71, 124, 0.46)",
          border: "1px solid rgba(122, 176, 247, 0.22)",
        }}
      >
        Qty {props.qty}
      </div>
    </div>
  );
}

function SignalStageCard(props: { title: string; value: string; detail: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(104, 150, 212, 0.16)",
        background: "rgba(9, 19, 35, 0.84)",
      }}
    >
      <div style={labelStyle}>{props.title}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff" }}>{props.value}</div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(214, 228, 255, 0.68)" }}>
        {props.detail}
      </div>
    </div>
  );
}

export default function VideoWallPlannerPage() {
  const [wallType, setWallType] = useState<WallType>("led");
  const [activeTab, setActiveTab] = useState<VideoWallTabKey>("bom");

  const [lcdRows, setLcdRows] = useState(2);
  const [lcdCols, setLcdCols] = useState(2);
  const [lcdSourceCount, setLcdSourceCount] = useState(2);
  const [lcdDriveMode, setLcdDriveMode] = useState<LcdDriveMode>("av-over-ip");

  const [ledResolutionMode, setLedResolutionMode] = useState<LedResolutionMode>("4k");
  const [ledCustomWidth, setLedCustomWidth] = useState("5120");
  const [ledCustomHeight, setLedCustomHeight] = useState("1080");
  const [ledAspect, setLedAspect] = useState("16:9");
  const [ledPixelPitch, setLedPixelPitch] = useState("1.5");
  const [ledSourceCount, setLedSourceCount] = useState(3);
  const [ledStrategy, setLedStrategy] = useState<LedStrategy>("wyrestorm-preprocessed");
  const [ledProcessorClass, setLedProcessorClass] =
    useState<LedProcessorClass>("single-input");
  const [ledNotes, setLedNotes] = useState("");

  const ledCanvas = useMemo(() => {
    if (ledResolutionMode === "1080p") {
      return { width: 1920, height: 1080, label: "1920 × 1080" };
    }

    if (ledResolutionMode === "4k") {
      return { width: 3840, height: 2160, label: "3840 × 2160" };
    }

    const width = parsePositiveInt(ledCustomWidth, 5120);
    const height = parsePositiveInt(ledCustomHeight, 1080);

    return {
      width,
      height,
      label: width.toLocaleString() + " × " + height.toLocaleString(),
    };
  }, [ledResolutionMode, ledCustomHeight, ledCustomWidth]);

  const ledRecommendation = useMemo(
    () =>
      buildLedRecommendation({
        strategy: ledStrategy,
        processorClass: ledProcessorClass,
        targetWidthPx: ledCanvas.width,
        targetHeightPx: ledCanvas.height,
        sourceCount: ledSourceCount,
      }),
    [ledCanvas.height, ledCanvas.width, ledProcessorClass, ledSourceCount, ledStrategy]
  );

  const lcdRecommendation = useMemo(
    () =>
      buildLcdRecommendation({
        driveMode: lcdDriveMode,
        rows: lcdRows,
        cols: lcdCols,
        sourceCount: lcdSourceCount,
      }),
    [lcdCols, lcdDriveMode, lcdRows, lcdSourceCount]
  );

  const activeRecommendation = wallType === "led" ? ledRecommendation : lcdRecommendation;
  const lcdDisplayCount = lcdRows * lcdCols;
  const starterBom = buildStarterBom({
    wallType,
    lcdRows,
    lcdCols,
    lcdSourceCount,
    lcdDriveMode,
    ledCanvasLabel: ledCanvas.label,
    ledPixelPitch,
    ledSourceCount,
    ledStrategy,
    ledProcessorClass,
  });
  const bomPreviewLines = starterBom.slice(0, 5);
  const bomOverflowCount = Math.max(0, starterBom.length - bomPreviewLines.length);
  const totalBomUnits = starterBom.reduce((sum, line) => sum + line.qty, 0);
  const activeSourceCount = wallType === "lcd" ? lcdSourceCount : ledSourceCount;
  const lcdRouteLabel =
    lcdDriveMode === "av-over-ip"
      ? "AV over IP"
      : lcdDriveMode === "processor"
        ? "Dedicated processor"
        : "Matrix scaler";
  const ledRouteLabel =
    ledStrategy === "single-source"
      ? "Single source"
      : ledStrategy === "wyrestorm-preprocessed"
        ? "WyreStorm pre-processed"
        : "Processor multisource";
  const processorLabel =
    ledProcessorClass === "multi-input" ? "Multi-input processor" : "Single-input processor";
  const wallFormatValue = wallType === "lcd" ? `${lcdRows} x ${lcdCols}` : ledCanvas.label;
  const previewSummary =
    wallType === "lcd"
      ? `${lcdRows} x ${lcdCols} wall driven through ${lcdRouteLabel.toLowerCase()}.`
      : `${ledCanvas.label} LED canvas with ${ledRouteLabel.toLowerCase()} routing.`;
  const previewWindows = buildLedPreviewWindows(ledStrategy, ledSourceCount);
  const supportItems = wallType === "lcd"
    ? [
        `Recommended family: ${activeRecommendation.family}.`,
        ...activeRecommendation.reasons,
        activeRecommendation.caution ??
          "Confirm wall size, source concurrency, and control strategy before pricing is locked.",
      ]
    : [
        `Recommended family: ${activeRecommendation.family}.`,
        ...activeRecommendation.reasons,
        activeRecommendation.caution ??
          "Confirm canvas size, processor acceptance, and control ownership before final sign-off.",
        ledNotes
          ? `Designer note: ${ledNotes}`
          : "Designer note space is available for customer-specific layout or cost guidance.",
      ];
  const signalStages = wallType === "lcd"
    ? [
        {
          title: "Sources",
          value: `${lcdSourceCount} active source${lcdSourceCount === 1 ? "" : "s"}`,
          detail: "Inputs that can be routed to the wall.",
        },
        {
          title: "Core route",
          value: lcdRouteLabel,
          detail: activeRecommendation.family,
        },
        {
          title: "Wall outputs",
          value: `${lcdDisplayCount} display feed${lcdDisplayCount === 1 ? "" : "s"}`,
          detail: `${lcdRows} x ${lcdCols} tiled wall layout.`,
        },
      ]
    : [
        {
          title: "Sources",
          value: `${ledSourceCount} live source${ledSourceCount === 1 ? "" : "s"}`,
          detail: "Live content feeding the LED canvas.",
        },
        {
          title: "Composition",
          value: ledRouteLabel,
          detail:
            ledStrategy === "processor-multisource"
              ? "Layouts happen at the LED processor."
              : "Layouts are prepared before the LED processor.",
        },
        {
          title: "Processor",
          value: processorLabel,
          detail: activeRecommendation.family,
        },
      ];
  let tabContent: React.ReactNode;

  if (activeTab === "signal") {
    tabContent = (
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {signalStages.map((stage) => (
            <SignalStageCard key={stage.title} {...stage} />
          ))}
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(104, 150, 212, 0.16)",
            background: "rgba(8, 18, 34, 0.82)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "rgba(224, 236, 255, 0.82)",
          }}
        >
          <strong style={{ color: "#ffffff" }}>Selected products / families</strong>
          <div style={{ marginTop: 6 }}>{activeRecommendation.products.join(" / ")}</div>
        </div>
      </div>
    );
  } else if (activeTab === "technical") {
    tabContent = (
      <div style={{ display: "grid", gap: 10 }}>
        {supportItems.map((item, index) => (
          <div
            key={`${item}-${index}`}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(104, 150, 212, 0.16)",
              background: "rgba(8, 18, 34, 0.82)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "rgba(224, 236, 255, 0.82)",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    );
  } else {
    tabContent = (
      <div style={{ display: "grid", gap: 10 }}>
        {starterBom.map((line, index) => (
          <BomRow key={`${line.item}-${index}`} {...line} />
        ))}
      </div>
    );
  }

  const actionButtonStyle: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid rgba(118, 176, 247, 0.24)",
    background: "rgba(17, 43, 79, 0.9)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    padding: "10px 14px",
    cursor: "pointer",
  };
  const controls = (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={controlSectionStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={sectionTitleStyle}>Wall Type</h2>
          <p style={sectionSubtitleStyle}>
            Start with the wall technology, then tune the live design beside it.
          </p>
        </div>
        <div style={tileRowStyle}>
          <TileButton
            active={wallType === "lcd"}
            title="LCD Video Wall"
            subtitle="Panel wall with rows, columns, and tiled outputs."
            accent="linear-gradient(135deg, rgba(58,123,213,0.95) 0%, rgba(32,79,150,0.95) 100%)"
            onClick={() => setWallType("lcd")}
          />
          <TileButton
            active={wallType === "led"}
            title="LED Wall"
            subtitle="Direct-view canvas with processor and composition decisions."
            accent="linear-gradient(135deg, rgba(38,183,120,0.95) 0%, rgba(23,116,76,0.95) 100%)"
            onClick={() => setWallType("led")}
          />
        </div>
      </section>

      {wallType === "lcd" ? (
        <>
          <section style={controlSectionStyle}>
            <h2 style={sectionTitleStyle}>Wall Layout</h2>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              }}
            >
              <NumberField label="Rows" value={lcdRows} min={1} max={8} onChange={setLcdRows} />
              <NumberField label="Columns" value={lcdCols} min={1} max={8} onChange={setLcdCols} />
              <NumberField
                label="Sources"
                value={lcdSourceCount}
                min={1}
                max={16}
                onChange={setLcdSourceCount}
              />
            </div>
          </section>

          <section style={controlSectionStyle}>
            <h2 style={sectionTitleStyle}>Drive Path</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <ChoiceCard
                active={lcdDriveMode === "av-over-ip"}
                title="AV over IP"
                description="Best when the wall is part of a wider routed AV system."
                onClick={() => setLcdDriveMode("av-over-ip")}
              />
              <ChoiceCard
                active={lcdDriveMode === "processor"}
                title="Dedicated processor"
                description="Contained local wall workflow with a fixed-format processor."
                onClick={() => setLcdDriveMode("processor")}
              />
              <ChoiceCard
                active={lcdDriveMode === "matrix-scaler"}
                title="Matrix scaler"
                description="Controlled routing with scaled outputs and no full AVoIP layer."
                onClick={() => setLcdDriveMode("matrix-scaler")}
              />
            </div>
          </section>
        </>
      ) : (
        <>
          <section style={controlSectionStyle}>
            <h2 style={sectionTitleStyle}>Canvas</h2>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              }}
            >
              <SelectField
                label="Resolution"
                value={ledResolutionMode}
                onChange={(value) => setLedResolutionMode(value as LedResolutionMode)}
                options={[
                  { value: "1080p", label: "1920 × 1080" },
                  { value: "4k", label: "3840 × 2160" },
                  { value: "custom", label: "Custom" },
                ]}
              />
              <TextField label="Aspect ratio" value={ledAspect} onChange={setLedAspect} placeholder="16:9" />
              <TextField
                label="Pixel pitch (mm)"
                value={ledPixelPitch}
                onChange={setLedPixelPitch}
                placeholder="1.5"
              />
            </div>

            {ledResolutionMode === "custom" ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <TextField
                  label="Custom width (px)"
                  value={ledCustomWidth}
                  onChange={setLedCustomWidth}
                  placeholder="5120"
                />
                <TextField
                  label="Custom height (px)"
                  value={ledCustomHeight}
                  onChange={setLedCustomHeight}
                  placeholder="1080"
                />
              </div>
            ) : null}
          </section>

          <section style={controlSectionStyle}>
            <h2 style={sectionTitleStyle}>Content Route</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <ChoiceCard
                active={ledStrategy === "single-source"}
                title="Single source"
                description="One prepared wall feed into the LED processor."
                onClick={() => setLedStrategy("single-source")}
              />
              <ChoiceCard
                active={ledStrategy === "wyrestorm-preprocessed"}
                title="WyreStorm pre-processed"
                description="Build the layout in the AV system, then feed one stable canvas."
                onClick={() => setLedStrategy("wyrestorm-preprocessed")}
              />
              <ChoiceCard
                active={ledStrategy === "processor-multisource"}
                title="Processor multisource"
                description="Let the LED processor handle multiple live sources and presets."
                onClick={() => setLedStrategy("processor-multisource")}
              />
            </div>
          </section>

          <section style={controlSectionStyle}>
            <h2 style={sectionTitleStyle}>Processor And Source Load</h2>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <NumberField
                label="Active sources"
                value={ledSourceCount}
                min={1}
                max={12}
                onChange={setLedSourceCount}
              />
              <SelectField
                label="Processor class"
                value={ledProcessorClass}
                onChange={(value) => setLedProcessorClass(value as LedProcessorClass)}
                options={[
                  { value: "single-input", label: "Single-input" },
                  { value: "multi-input", label: "Multi-input" },
                ]}
              />
            </div>
            <TextField
              label="Designer notes"
              value={ledNotes}
              onChange={setLedNotes}
              placeholder="Optional customer-specific note"
            />
          </section>
        </>
      )}
    </div>
  );
  const preview = (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        <SnapshotMetric
          label="Wall format"
          value={wallFormatValue}
          detail={
            wallType === "lcd"
              ? `${lcdDisplayCount} display${lcdDisplayCount === 1 ? "" : "s"} in the wall.`
              : `${ledAspect || "Custom"} canvas at ${ledPixelPitch || "target"} mm pitch.`
          }
        />
        <SnapshotMetric
          label="Live sources"
          value={`${activeSourceCount}`}
          detail={
            activeSourceCount === 1
              ? "One active source in the design."
              : `${activeSourceCount} active sources in the design.`
          }
        />
        <SnapshotMetric
          label="Route"
          value={wallType === "lcd" ? lcdRouteLabel : ledRouteLabel}
          detail={wallType === "lcd" ? activeRecommendation.family : processorLabel}
        />
        <SnapshotMetric
          label="Starter BOM"
          value={`${starterBom.length} lines`}
          detail={`${totalBomUnits} total unit${totalBomUnits === 1 ? "" : "s"} in the current starter stack.`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.95fr)",
          alignItems: "start",
        }}
      >
        <section style={panelStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={panelHeadingStyle}>Wall Preview</h2>
            <h3 style={panelTitleStyle}>{wallType === "lcd" ? "Physical wall shape" : "Canvas layout"}</h3>
            <p style={panelBodyTextStyle}>{previewSummary}</p>
          </div>

          {wallType === "lcd" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  ...previewSurfaceStyle,
                  aspectRatio: `${lcdCols * 16} / ${lcdRows * 9}`,
                }}
              >
                <div
                  style={{
                    ...canvasGridStyle,
                    gridTemplateColumns: `repeat(${lcdCols}, 1fr)`,
                    gridTemplateRows: `repeat(${lcdRows}, 1fr)`,
                  }}
                >
                  {Array.from({ length: lcdDisplayCount }).map((_, index) => (
                    <div key={index} style={canvasCellStyle} />
                  ))}
                </div>
              </div>
              <div style={previewCaptionStyle}>
                Physical wall shown as {lcdRows} x {lcdCols} panels using the {lcdRouteLabel.toLowerCase()} path.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  ...previewSurfaceStyle,
                  aspectRatio: ledAspect.includes(":") ? ledAspect.replace(":", " / ") : "16 / 9",
                }}
              >
                <div style={ledSurfaceFrameStyle}>
                  {previewWindows.map((window) => (
                    <div key={window.label} style={ledWindowStyle(window)}>
                      <div style={ledWindowLabelStyle}>{window.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={previewCaptionStyle}>
                Canvas preview for {ledCanvas.label} with {ledRouteLabel.toLowerCase()} routing on a {processorLabel.toLowerCase()}.
              </div>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={panelHeadingStyle}>Starter BOM</h2>
            <h3 style={panelTitleStyle}>{starterBom.length} line item{starterBom.length === 1 ? "" : "s"}</h3>
            <p style={panelBodyTextStyle}>
              Keep the priceable stack visible while the wall design is being tuned.
            </p>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {bomPreviewLines.map((line, index) => (
              <BomRow key={`${line.item}-${index}`} {...line} />
            ))}
          </div>

          {bomOverflowCount > 0 ? (
            <div style={previewCaptionStyle}>
              + {bomOverflowCount} more line item{bomOverflowCount === 1 ? "" : "s"} in BOM Details.
            </div>
          ) : null}

          <button type="button" style={actionButtonStyle} onClick={() => setActiveTab("bom")}>
            Open BOM details
          </button>
        </section>
      </div>
    </div>
  );
  const useModernLayout = true as boolean;

  if (useModernLayout) {
    return (
      <div data-wm-flow-ignore="true">
        <VideoWallSolutionShell
          title="Video Wall Designer"
          subtitle="Keep the live wall controls, preview, and starter BOM in view. Open Supporting Info only when you need the longer guidance."
          recommendationTitle={activeRecommendation.title}
          recommendationSummary={activeRecommendation.summary}
          recommendationMeta={
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              }}
            >
              <SnapshotMetric
                label="Recommended family"
                value={activeRecommendation.family}
                detail={wallType === "lcd" ? "Current LCD route." : "Current LED route."}
              />
              <SnapshotMetric
                label="Wall type"
                value={wallType === "lcd" ? "LCD" : "LED"}
                detail={previewSummary}
              />
            </div>
          }
          recommendationWhy={
            <div style={{ display: "grid", gap: 10 }}>
              {activeRecommendation.reasons.slice(0, 2).map((reason, index) => (
                <div
                  key={`${reason}-${index}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(104, 150, 212, 0.16)",
                    background: "rgba(8, 18, 34, 0.82)",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "rgba(224, 236, 255, 0.82)",
                  }}
                >
                  {reason}
                </div>
              ))}
            </div>
          }
          recommendationActions={
            <>
              <button type="button" style={actionButtonStyle} onClick={() => setActiveTab("bom")}>
                BOM details
              </button>
              <button type="button" style={actionButtonStyle} onClick={() => setActiveTab("technical")}>
                Supporting info
              </button>
            </>
          }
          controls={controls}
          preview={preview}
          tabs={[
            { key: "bom", label: "BOM Details" },
            { key: "signal", label: "Signal Route" },
            { key: "technical", label: "Supporting Info" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabContent={tabContent}
          rightRail={
            activeRecommendation.caution ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(104, 150, 212, 0.16)",
                  background: "rgba(8, 18, 34, 0.82)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "rgba(224, 236, 255, 0.82)",
                }}
              >
                <strong style={{ color: "#ffffff" }}>Validation and follow-up</strong>
                <div style={{ marginTop: 6 }}>{activeRecommendation.caution}</div>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="wm-page" style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroStyle}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <span style={badgeStyle}>Step 1 • Wall Type</span>
              <span style={{ ...mutedStyle, fontSize: 13 }}>
                Split LCD and LED into separate workflows so the page reflects real AV design logic.
              </span>
            </div>

            <div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>
                Video Wall Planner
              </div>
              <div style={{ ...mutedStyle, marginTop: 8, maxWidth: 940 }}>
                LED walls are processor- and canvas-driven. LCD walls are array- and display-driven.
                This page now separates those workflows so users can choose architecture before being
                overwhelmed by technical detail.
              </div>
            </div>

            <div style={tileRowStyle}>
              <TileButton
                active={wallType === "lcd"}
                title="LCD Video Wall"
                subtitle="Panel-based wall with rows, columns, bezels, and conventional wall-processing choices."
                accent="linear-gradient(135deg, rgba(58,123,213,0.95) 0%, rgba(32,79,150,0.95) 100%)"
                onClick={() => setWallType("lcd")}
              />
              <TileButton
                active={wallType === "led"}
                title="LED Wall"
                subtitle="Direct-view LED workflow based on canvas resolution, content strategy, and processor design."
                accent="linear-gradient(135deg, rgba(38,183,120,0.95) 0%, rgba(23,116,76,0.95) 100%)"
                onClick={() => setWallType("led")}
              />
            </div>
          </div>
        </section>

        <div style={gridStyle}>
          <div style={{ display: "grid", gap: 16 }}>
            {wallType === "lcd" ? (
              <>
                <section style={sectionStyle}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Step 2 • LCD physical layout</div>
                    <div style={mutedStyle}>
                      Use the classic LCD workflow for tiled display walls, bezel-managed presentation walls,
                      and display-array based recommendations.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <NumberField label="Rows" value={lcdRows} min={1} max={8} onChange={setLcdRows} />
                    <NumberField label="Columns" value={lcdCols} min={1} max={8} onChange={setLcdCols} />
                    <NumberField
                      label="Active sources"
                      value={lcdSourceCount}
                      min={1}
                      max={16}
                      onChange={setLcdSourceCount}
                    />
                  </div>
                </section>

                <section style={sectionStyle}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Step 3 • LCD signal architecture</div>
                    <div style={mutedStyle}>
                      Choose the most suitable architecture for routing, scaling, and wall processing.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <ChoiceCard
                      active={lcdDriveMode === "av-over-ip"}
                      title="AV over IP"
                      description="Best for flexible routing, larger systems, distributed sources, and long-term scalability."
                      footer="Recommended where the wall is part of a wider AV distribution system."
                      onClick={() => setLcdDriveMode("av-over-ip")}
                    />
                    <ChoiceCard
                      active={lcdDriveMode === "processor"}
                      title="Dedicated video wall processor"
                      description="A more appliance-like workflow for fixed walls and local wall processing."
                      footer="Strong fit for straightforward room-based wall installations."
                      onClick={() => setLcdDriveMode("processor")}
                    />
                    <ChoiceCard
                      active={lcdDriveMode === "matrix-scaler"}
                      title="Matrix scaler"
                      description="Middle-ground architecture for fixed source/display relationships without full AVoIP complexity."
                      footer="Useful when matrix routing and scaled outputs are the main requirement."
                      onClick={() => setLcdDriveMode("matrix-scaler")}
                    />
                  </div>
                </section>
              </>
            ) : (
              <>
                <section style={sectionStyle}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Step 2 • LED canvas definition</div>
                    <div style={mutedStyle}>
                      LED walls should be defined by target canvas, aspect ratio, and pitch rather than rows and
                      columns of displays.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <SelectField
                      label="Target resolution"
                      value={ledResolutionMode}
                      onChange={(value) => setLedResolutionMode(value as LedResolutionMode)}
                      options={[
                        { value: "1080p", label: "1920 × 1080" },
                        { value: "4k", label: "3840 × 2160" },
                        { value: "custom", label: "Custom" },
                      ]}
                    />
                    <TextField label="Aspect ratio" value={ledAspect} onChange={setLedAspect} placeholder="16:9" />
                    <TextField
                      label="Pixel pitch (mm)"
                      value={ledPixelPitch}
                      onChange={setLedPixelPitch}
                      placeholder="1.5"
                    />
                  </div>

                  {ledResolutionMode === "custom" ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        marginTop: 12,
                      }}
                    >
                      <TextField
                        label="Custom width (px)"
                        value={ledCustomWidth}
                        onChange={setLedCustomWidth}
                        placeholder="5120"
                      />
                      <TextField
                        label="Custom height (px)"
                        value={ledCustomHeight}
                        onChange={setLedCustomHeight}
                        placeholder="1080"
                      />
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 14,
                      borderRadius: 14,
                      padding: 14,
                      background: "rgba(23,34,51,0.96)",
                      border: "1px solid rgba(107,150,211,0.18)",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#D6E8FF" }}>
                      Canvas summary
                    </div>
                    <div style={mutedStyle}>
                      Target canvas: <strong style={{ color: "#FFFFFF" }}>{ledCanvas.label}</strong> • Aspect ratio{" "}
                      <strong style={{ color: "#FFFFFF" }}>{ledAspect || "not set"}</strong> • Pixel pitch{" "}
                      <strong style={{ color: "#FFFFFF" }}>{ledPixelPitch || "not set"}</strong> mm
                    </div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>
                      Note: WyreStorm NetworkHD 500 Series should be considered for custom LED resolutions up to
                      8000 pixels where the wider canvas and system architecture justify it.
                    </div>
                  </div>
                </section>

                <section style={sectionStyle}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Step 3 • LED content strategy</div>
                    <div style={mutedStyle}>
                      This is the key LED decision. Decide whether the wall processor receives one prepared program feed
                      or whether source composition happens inside the processor.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <ChoiceCard
                      active={ledStrategy === "single-source"}
                      title="Single source into LED processor"
                      description="Use one HDMI feed into the LED processor for signage, presentation, or one program output."
                      footer="Lowest complexity at the processor layer."
                      onClick={() => setLedStrategy("single-source")}
                    />
                    <ChoiceCard
                      active={ledStrategy === "wyrestorm-preprocessed"}
                      title="Multi-source, pre-processed by WyreStorm"
                      description="Use WyreStorm switching or multiview first, then send one prepared output into the LED processor."
                      footer="Best value route for many multi-source LED systems."
                      onClick={() => setLedStrategy("wyrestorm-preprocessed")}
                    />
                    <ChoiceCard
                      active={ledStrategy === "processor-multisource"}
                      title="Multi-source inside LED processor"
                      description="Use a more advanced processor that directly accepts multiple sources and manages layouts internally."
                      footer="Premium route with cleaner all-in-one processor behaviour."
                      onClick={() => setLedStrategy("processor-multisource")}
                    />
                  </div>
                </section>

                <section style={sectionStyle}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Step 4 • Processor class and source load</div>
                    <div style={mutedStyle}>
                      Use this to explain trade-offs to the customer before final product recommendation.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <NumberField
                      label="Active sources"
                      value={ledSourceCount}
                      min={1}
                      max={12}
                      onChange={setLedSourceCount}
                    />
                    <SelectField
                      label="LED processor class"
                      value={ledProcessorClass}
                      onChange={(value) => setLedProcessorClass(value as LedProcessorClass)}
                      options={[
                        { value: "single-input", label: "Single HDMI input processor" },
                        { value: "multi-input", label: "Multi-input processor" },
                      ]}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 14,
                        padding: 14,
                        background: "rgba(18,28,41,0.96)",
                        border: "1px solid rgba(102,130,162,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Typical lower-cost route</div>
                      <div style={mutedStyle}>
                        Single-input LED processor + WyreStorm front-end switching or multiview.
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        padding: 14,
                        background: "rgba(18,28,41,0.96)",
                        border: "1px solid rgba(102,130,162,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Typical premium route</div>
                      <div style={mutedStyle}>
                        Multi-input LED processor with direct source layouts managed at processor level.
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <TextField
                      label="Designer notes"
                      value={ledNotes}
                      onChange={setLedNotes}
                      placeholder="Example: customer wants 3 live sources visible at once, prefers lower processor cost."
                    />
                  </div>
                </section>
              </>
            )}
          </div>

          <aside style={{ display: "grid", gap: 16 }}>
            <section style={recommendationCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={badgeStyle}>Recommendation</span>
                  <span style={badgeStyle}>
                    {wallType === "led" ? "LED workflow" : "LCD workflow"}
                  </span>
                </div>

                <div style={{ fontSize: 22, fontWeight: 900 }}>{activeRecommendation.title}</div>
                <div style={{ color: "#A7CCFF", fontWeight: 800 }}>
                  Recommended family: {activeRecommendation.family}
                </div>
                <div style={mutedStyle}>{activeRecommendation.summary}</div>

                <div
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(14,22,37,0.94)",
                    border: "1px solid rgba(95,129,172,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Suggested products / families</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {activeRecommendation.products.map((item) => (
                      <div
                        key={item}
                        style={{
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: "rgba(25,38,58,0.96)",
                          border: "1px solid rgba(101,138,189,0.18)",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(14,22,37,0.94)",
                    border: "1px solid rgba(95,129,172,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Why this fits</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {activeRecommendation.reasons.map((reason, index) => (
                      <div key={index} style={{ ...mutedStyle, fontSize: 13 }}>
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>

                {activeRecommendation.caution ? (
                  <div
                    style={{
                      borderRadius: 14,
                      padding: 14,
                      background: "rgba(59,34,16,0.64)",
                      border: "1px solid rgba(234,164,77,0.22)",
                      color: "#FFE8C2",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Validation note:</strong> {activeRecommendation.caution}
                  </div>
                ) : null}
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Consultant guidance</div>

                {wallType === "led" ? (
                  <>
                    <div style={mutedStyle}>
                      LED recommendation should be based on:
                    </div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• target canvas resolution</div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• source count and source layout expectations</div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• whether composition happens before or inside the processor</div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• cost sensitivity versus operator simplicity</div>

                    <div
                      style={{
                        marginTop: 6,
                        borderRadius: 12,
                        padding: 12,
                        background: "rgba(18,28,41,0.96)",
                        border: "1px solid rgba(97,131,173,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Novastar / LED processor research prompts</div>
                      <div style={{ ...mutedStyle, fontSize: 13 }}>
                        Add a later knowledge panel that compares:
                      </div>
                      <div style={{ ...mutedStyle, fontSize: 13 }}>• single-input vs multi-input processor classes</div>
                      <div style={{ ...mutedStyle, fontSize: 13 }}>• accepted input resolutions and custom canvas behaviour</div>
                      <div style={{ ...mutedStyle, fontSize: 13 }}>• preset recall and PIP / multiview capabilities</div>
                      <div style={{ ...mutedStyle, fontSize: 13 }}>• whether using WyreStorm multiview reduces processor spend</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={mutedStyle}>
                      LCD workflow remains useful where the project is based around tiled flat panels and familiar wall
                      formats such as 2×2, 3×3, and 4×4.
                    </div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• AVoIP for flexibility and future scale</div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• processor for simpler dedicated wall systems</div>
                    <div style={{ ...mutedStyle, fontSize: 13 }}>• matrix scaler for fixed and controlled source routing</div>
                  </>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
