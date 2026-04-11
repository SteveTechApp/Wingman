import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Bot,
  Boxes,
  BriefcaseBusiness,
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

import type { WorkspaceMeta } from "@/app/navigation/workspaceMeta";

type NavTone = "reference" | "workflow" | "proposal";

type NavItemModel = {
  label: string;
  to: string;
  icon: typeof Bot;
  title: string;
};

type NavSectionModel = {
  title: string;
  note: string;
  tone: NavTone;
  items: NavItemModel[];
};

const SECTIONS: NavSectionModel[] = [
  {
    title: "Reference",
    note: "",
    tone: "reference",
    items: [
      {
        label: "AI Guru",
        to: "/app/tools/guru",
        icon: Bot,
        title: "Immediate product, application, and sales support.",
      },
      {
        label: "Product Finder",
        to: "/app/tools/catalog",
        icon: ScanSearch,
        title: "Find the right WyreStorm SKU and move it into the workflow.",
      },
      {
        label: "AV Navigator",
        to: "/app/tools/navigator",
        icon: Network,
        title: "Decide the broad transport path quickly.",
      },
      {
        label: "Compare",
        to: "/app/tools/compare",
        icon: GitCompareArrows,
        title: "Match competitor products and position the fit.",
      },
      {
        label: "Sales",
        to: "/app/tools/sales",
        icon: BriefcaseBusiness,
        title: "Steer the conversation before it turns into proposal detail.",
      },
    ],
  },
  {
    title: "Build",
    note: "Capture scope, then shape the system.",
    tone: "workflow",
    items: [
      {
        label: "Discovery",
        to: "/app/tools/discovery",
        icon: ClipboardList,
        title: "Capture the few requirements that change the design.",
      },
      {
        label: "Templates",
        to: "/app/tools/templates",
        icon: LayoutTemplate,
        title: "Start from a proven room pattern.",
      },
      {
        label: "Import Intake",
        to: "/app/tools/import-intake",
        icon: Upload,
        title: "Pull external notes into a structured project start.",
      },
      {
        label: "Tool Hub",
        to: "/app/tools",
        icon: WandSparkles,
        title: "Browse the full working surface by purpose.",
      },
    ],
  },
  {
    title: "Output",
    note: "Keep work attached to the project record.",
    tone: "proposal",
    items: [
      {
        label: "Projects",
        to: "/app/projects",
        icon: FolderKanban,
        title: "Resume the right project without digging through tools.",
      },
      {
        label: "Proposal",
        to: "/app/tools/proposal",
        icon: FileText,
        title: "Turn the chosen path into a clean commercial pack.",
      },
      {
        label: "Systems",
        to: "/app/tools/templates",
        icon: Boxes,
        title: "Reuse structured solution patterns and outputs.",
      },
    ],
  },
];

function getActiveProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

type MissionControlNavProps = {
  meta: WorkspaceMeta;
};

export default function MissionControlNav({ meta }: MissionControlNavProps) {
  const projectName = useMemo(() => getActiveProjectName(), []);

  return (
    <div className="wm-nav" aria-label="Wingman navigation">
      <div className="wm-nav__context">
        <div className="wm-nav__context-head">
          <span className="wm-nav__context-kicker">Flight Deck</span>
          <span className="wm-nav__context-tone">{meta.label}</span>
        </div>
        <strong className="wm-nav__context-project">{projectName}</strong>
        <p className="wm-nav__context-copy">{meta.description}</p>
        <div className="wm-nav__flow">
          <span>Discovery</span>
          <span>Design</span>
          <span>Proposal</span>
        </div>
      </div>

      <nav className="wm-nav__sections">
        {SECTIONS.map((section) => (
          <section key={section.title} className="wm-nav__section" data-tone={section.tone}>
            <div className="wm-nav__section-head">
              <span className="wm-nav__section-title">{section.title}</span>
              <span className="wm-nav__section-note">{section.note}</span>
            </div>

            <div className="wm-nav__items">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={`${section.title}-${item.to}`}
                    to={item.to}
                    end={item.to === "/app/tools" || item.to === "/app/projects"}
                    className={({ isActive }) =>
                      isActive ? "wm-nav__item is-active" : "wm-nav__item"
                    }
                    title={item.title}
                  >
                    <span className="wm-nav__item-icon">
                      <Icon size={15} />
                    </span>
                    <span className="wm-nav__item-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
