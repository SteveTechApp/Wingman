import { useMemo, useState, type CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import {
  Bot,
  Boxes,
  ClipboardList,
  FileText,
  FolderKanban,
  GitCompareArrows,
  LayoutTemplate,
  Network,
  ScanSearch,
  Upload,
  WandSparkles,
} from "lucide-react";

type NavTone = "quick" | "workflow" | "output";

type NavItemModel = {
  label: string;
  to: string;
  icon: typeof Bot;
  tooltip: string;
  tone: NavTone;
};

type NavSectionModel = {
  title: string;
  tone: NavTone;
  items: NavItemModel[];
};

const SECTIONS: NavSectionModel[] = [
  {
    title: "Quick Reference",
    tone: "quick",
    items: [
      {
        label: "AI Guru Expert",
        to: "/app/tools/guru",
        icon: Bot,
        tone: "quick",
        tooltip: "Immediate product, application and positioning guidance for live sales conversations.",
      },
      {
        label: "Product Finder",
        to: "/app/tools/catalog",
        icon: ScanSearch,
        tone: "quick",
        tooltip: "Find the right WyreStorm SKU, narrow endpoint choices and pass the result into downstream tools.",
      },
      {
        label: "AV Navigator",
        to: "/app/tools/navigator",
        icon: Network,
        tone: "quick",
        tooltip: "Use guided architecture thinking to decide whether the project suits extender, matrix, AV over IP or another transport path.",
      },
      {
        label: "Competitor Compare",
        to: "/app/tools/compare",
        icon: GitCompareArrows,
        tone: "quick",
        tooltip: "Compare competitor products and position the closest WyreStorm alternative.",
      },
    ],
  },
  {
    title: "Workflows",
    tone: "workflow",
    items: [
      {
        label: "Discovery Wizard",
        to: "/app/tools/discovery",
        icon: ClipboardList,
        tone: "workflow",
        tooltip: "Capture room type, source count, display count, USB, audio and control requirements properly.",
      },
      {
        label: "Templates",
        to: "/app/tools/templates",
        icon: LayoutTemplate,
        tone: "workflow",
        tooltip: "Start from structured reference systems such as Bronze, Silver and Gold style solution patterns.",
      },
      {
        label: "Import Intake",
        to: "/app/tools/import-intake",
        icon: Upload,
        tone: "workflow",
        tooltip: "Turn customer notes, documents and requirement text into structured project input.",
      },
      {
        label: "Tool Hub",
        to: "/app/tools",
        icon: WandSparkles,
        tone: "workflow",
        tooltip: "Browse all Wingman tools by purpose and working mode.",
      },
    ],
  },
  {
    title: "Project Outputs",
    tone: "output",
    items: [
      {
        label: "Projects",
        to: "/app/projects",
        icon: FolderKanban,
        tone: "output",
        tooltip: "Open saved projects, continue prior work and manage project context.",
      },
      {
        label: "Proposal Builder",
        to: "/app/tools/proposal",
        icon: FileText,
        tone: "output",
        tooltip: "Turn product and requirement selections into solution narrative, architecture and BOM output.",
      },
      {
        label: "System Templates",
        to: "/app/tools/templates",
        icon: Boxes,
        tone: "output",
        tooltip: "Reuse structured system patterns and accelerate repeatable proposal work.",
      },
    ],
  },
];

function getActiveProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

type NavItemProps = {
  item: NavItemModel;
};

function NavItem({ item }: NavItemProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <div style={navItemWrapStyle}>
      <NavLink
        to={item.to}
        end={item.to === "/app/tools" || item.to === "/app/projects"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        style={({ isActive }) => ({
          ...navItemBaseStyle,
          ...toneLinkStyle(item.tone),
          ...(isActive ? navItemActiveStyle : null),
        })}
      >
        <span style={iconWrapStyle}>
          <Icon size={16} />
        </span>
        <span style={labelStyle}>{item.label}</span>
      </NavLink>

      <div
        style={{
          ...tooltipStyle,
          ...(hovered ? tooltipVisibleStyle : tooltipHiddenStyle),
        }}
      >
        {item.tooltip}
      </div>
    </div>
  );
}

export default function MissionControlNav() {
  const projectName = useMemo(() => getActiveProjectName(), []);

  return (
    <aside style={shellStyle} aria-label="Wingman navigation">
      <div style={projectPanelStyle}>
        <div style={projectEyebrowStyle}>Active Project</div>
        <div style={projectNameStyle}>{projectName}</div>
        <div style={projectSubtleStyle}>
          Quick tools support live selling. Workflow tools build structured outputs.
        </div>
      </div>

      <nav style={navStyle}>
        {SECTIONS.map((section) => (
          <section key={section.title} style={{ ...sectionStyle, ...toneSectionStyle(section.tone) }}>
            <div style={sectionTitleStyle}>{section.title}</div>
            <div style={sectionItemsStyle}>
              {section.items.map((item) => (
                <NavItem key={`${section.title}-${item.label}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}

function toneSectionStyle(tone: NavTone): CSSProperties {
  if (tone === "quick") {
    return {
      border: "1px solid rgba(14,165,233,0.18)",
      background: "linear-gradient(180deg, rgba(8,40,59,0.52), rgba(8,18,28,0.74))",
    };
  }

  if (tone === "workflow") {
    return {
      border: "1px solid rgba(20,184,166,0.18)",
      background: "linear-gradient(180deg, rgba(8,54,48,0.52), rgba(8,23,22,0.74))",
    };
  }

  return {
    border: "1px solid rgba(245,158,11,0.18)",
    background: "linear-gradient(180deg, rgba(62,43,10,0.50), rgba(28,20,9,0.74))",
  };
}

function toneLinkStyle(tone: NavTone): CSSProperties {
  if (tone === "quick") {
    return {
      border: "1px solid rgba(59,130,246,0.10)",
      background: "rgba(8,18,28,0.34)",
    };
  }

  if (tone === "workflow") {
    return {
      border: "1px solid rgba(16,185,129,0.10)",
      background: "rgba(8,22,20,0.34)",
    };
  }

  return {
    border: "1px solid rgba(245,158,11,0.10)",
    background: "rgba(28,20,9,0.34)",
  };
}

const shellStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  padding: 10,
  color: "var(--wm-text, #e5eef8)",
  position: "relative",
  overflow: "visible",
  zIndex: 20,
};

const projectPanelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  borderRadius: 16,
  padding: 12,
  border: "1px solid rgba(96,165,250,0.18)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.98))",
  boxShadow: "0 12px 26px rgba(2,8,23,0.18)",
};

const projectEyebrowStyle: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  opacity: 0.72,
  fontWeight: 800,
};

const projectNameStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  lineHeight: 1.2,
};

const projectSubtleStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.76,
};

const navStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  overflow: "visible",
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  borderRadius: 16,
  padding: 10,
  boxShadow: "0 10px 20px rgba(2,8,23,0.14)",
  overflow: "visible",
  position: "relative",
  zIndex: 1,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.8,
  fontWeight: 900,
  padding: "0 2px",
};

const sectionItemsStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  overflow: "visible",
};

const navItemWrapStyle: CSSProperties = {
  position: "relative",
  overflow: "visible",
  zIndex: 2,
};

const navItemBaseStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  alignItems: "center",
  gap: 8,
  minHeight: 42,
  padding: "8px 10px",
  borderRadius: 12,
  textDecoration: "none",
  color: "inherit",
  fontSize: 13,
  fontWeight: 700,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
};

const navItemActiveStyle: CSSProperties = {
  outline: "1px solid rgba(249,115,22,0.30)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.18), rgba(124,45,18,0.18))",
};

const iconWrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
};

const labelStyle: CSSProperties = {
  lineHeight: 1.2,
};

const tooltipStyle: CSSProperties = {
  position: "absolute",
  left: "calc(100% + 8px)",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 9999,
  width: 260,
  borderRadius: 12,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.45,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(15,23,42,1))",
  boxShadow: "0 18px 34px rgba(2,8,23,0.42)",
  pointerEvents: "none",
};

const tooltipVisibleStyle: CSSProperties = {
  opacity: 1,
};

const tooltipHiddenStyle: CSSProperties = {
  opacity: 0,
};