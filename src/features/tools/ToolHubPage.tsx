import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

type ToolTile = {
  title: string;
  subtitle: string;
  route: string;
  group: "quick" | "workflow";
  badge: string;
  tooltip: string;
};

const tiles: ToolTile[] = [
  {
    title: "AI Guru Expert",
    subtitle: "Immediate technical and product support",
    route: "/app/tools/guru",
    group: "quick",
    badge: "Fast help",
    tooltip: "Best for immediate advice during a live sales conversation, technical clarification, feature explanation or commercial positioning.",
  },
  {
    title: "Product Finder",
    subtitle: "Find and narrow the right WyreStorm SKU",
    route: "/app/tools/catalog",
    group: "quick",
    badge: "Quick tool",
    tooltip: "Best for locating the correct product family, endpoint type and SKU based on the application and technical requirement.",
  },
  {
    title: "AV Navigator",
    subtitle: "Architecture and transport guidance",
    route: "/app/tools/navigator",
    group: "quick",
    badge: "Decision aid",
    tooltip: "Best for deciding which system architecture fits the application before narrowing down actual products.",
  },
  {
    title: "Competitor Compare",
    subtitle: "Position WyreStorm against competitor references",
    route: "/app/tools/compare",
    group: "quick",
    badge: "Sales support",
    tooltip: "Best for handling competitive conversations when a customer asks for an equivalent or comparison against another manufacturer.",
  },
  {
    title: "Discovery Wizard",
    subtitle: "Capture requirement inputs properly",
    route: "/app/tools/discovery",
    group: "workflow",
    badge: "Stage 1",
    tooltip: "Best for structured requirement gathering before product selection or proposal creation begins.",
  },
  {
    title: "Proposal Builder",
    subtitle: "Create architecture and commercial output",
    route: "/app/tools/proposal",
    group: "workflow",
    badge: "Stage 2",
    tooltip: "Best for turning approved selections into a presentable solution summary, architecture narrative and bill of materials.",
  },
  {
    title: "Templates",
    subtitle: "Start from structured reference systems",
    route: "/app/tools/templates",
    group: "workflow",
    badge: "Accelerator",
    tooltip: "Best when the application is similar to a common reference design and you want to accelerate the design process.",
  },
  {
    title: "Import Intake",
    subtitle: "Bring customer notes into Wingman",
    route: "/app/tools/import-intake",
    group: "workflow",
    badge: "Intake",
    tooltip: "Best when the customer has already given scope notes, a brief, or imported documentation that needs structuring.",
  },
];

type TooltipTileProps = {
  tile: ToolTile;
  onOpen: (route: string) => void;
  style: CSSProperties;
};

function TooltipTile({ tile, onOpen, style }: TooltipTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(tile.route)}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div style={badgeStyle}>{tile.badge}</div>
      <div style={tileTitleStyle}>{tile.title}</div>
      <div style={tileBodyStyle}>{tile.subtitle}</div>

      <div style={tooltipWrapStyle}>
        <div
          style={{
            ...tooltipStyle,
            ...(hovered ? tooltipVisibleStyle : tooltipHiddenStyle),
          }}
        >
          {tile.tooltip}
        </div>
      </div>
    </button>
  );
}

export default function ToolHubPage() {
  const navigate = useNavigate();

  const quickTools = tiles.filter((tile) => tile.group === "quick");
  const workflowTools = tiles.filter((tile) => tile.group === "workflow");

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Wingman Tool Hub</div>
          <h1 style={titleStyle}>Choose the right mode of work</h1>
          <div style={bodyStyle}>
            Wingman now separates quick sales assistance from structured design and proposal workflows.
          </div>
        </div>
      </section>

      <div style={splitStyle}>
        <section style={quickPanelStyle}>
          <div style={panelHeadStyle}>
            <div>
              <div style={sectionEyebrowStyle}>Quick Reference</div>
              <div style={sectionTitleStyle}>In-the-moment sales tools</div>
            </div>
            <div style={panelNoteStyle}>Use when you need an answer, product or recommendation quickly.</div>
          </div>

          <div style={tileGridStyle}>
            {quickTools.map((tile) => (
              <TooltipTile
                key={tile.title}
                tile={tile}
                onOpen={(route) => navigate(route)}
                style={{ ...tileStyle, ...quickTileStyle }}
              />
            ))}
          </div>
        </section>

        <section style={workflowPanelStyle}>
          <div style={panelHeadStyle}>
            <div>
              <div style={sectionEyebrowStyle}>Formal Workflow</div>
              <div style={sectionTitleStyle}>Design and proposal tools</div>
            </div>
            <div style={panelNoteStyle}>Use when the project needs capture, structure and customer-facing output.</div>
          </div>

          <div style={tileGridStyle}>
            {workflowTools.map((tile) => (
              <TooltipTile
                key={tile.title}
                tile={tile}
                onOpen={(route) => navigate(route)}
                style={{ ...tileStyle, ...workflowTileStyle }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 12,
  maxWidth: 1720,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
};

const heroStyle: CSSProperties = {
  borderRadius: 18,
  padding: 18,
  border: "1px solid rgba(96,165,250,0.20)",
  background: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.88))",
  boxShadow: "0 18px 40px rgba(2,8,23,0.24)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.74,
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 30,
  lineHeight: 1.05,
  fontWeight: 900,
};

const bodyStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 14,
  lineHeight: 1.5,
  opacity: 0.88,
};

const splitStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const basePanelStyle: CSSProperties = {
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 12,
  boxShadow: "0 18px 36px rgba(2,8,23,0.18)",
};

const quickPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(14,165,233,0.24)",
  background: "linear-gradient(180deg, rgba(11,42,63,0.82), rgba(11,24,37,0.94))",
};

const workflowPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(20,184,166,0.24)",
  background: "linear-gradient(180deg, rgba(7,44,46,0.84), rgba(10,27,34,0.94))",
};

const panelHeadStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 10,
};

const sectionEyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.76,
  fontWeight: 800,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.2,
};

const panelNoteStyle: CSSProperties = {
  maxWidth: 240,
  textAlign: "right",
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.78,
};

const tileGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const tileStyle: CSSProperties = {
  textAlign: "left",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 8,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(2,8,23,0.16)",
  position: "relative",
  overflow: "visible",
};

const quickTileStyle: CSSProperties = {
  border: "1px solid rgba(59,130,246,0.24)",
  background: "linear-gradient(180deg, rgba(8,53,72,0.82), rgba(10,25,34,0.94))",
};

const workflowTileStyle: CSSProperties = {
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(180deg, rgba(12,61,36,0.84), rgba(9,27,19,0.94))",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const tileTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.2,
};

const tileBodyStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  opacity: 0.88,
};

const tooltipWrapStyle: CSSProperties = {
  position: "relative",
  height: 0,
};

const tooltipStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 10,
  zIndex: 20,
  width: "100%",
  borderRadius: 12,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.45,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(15,23,42,0.98))",
  boxShadow: "0 16px 30px rgba(2,8,23,0.36)",
  pointerEvents: "none",
};

const tooltipVisibleStyle: CSSProperties = {
  opacity: 1,
};

const tooltipHiddenStyle: CSSProperties = {
  opacity: 0,
};