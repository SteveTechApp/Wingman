import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveProject, type StoredProject } from "@/features/projects/projectStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

function pageLabel(pathname: string): string {
  if (pathname.startsWith("/app/dashboard")) return "Dashboard";
  if (pathname.startsWith("/app/projects")) return "Projects";
  if (pathname.startsWith("/app/tools/discovery")) return "Guided Project";
  if (pathname.startsWith("/app/tools/templates")) return "Templates";
  if (pathname.startsWith("/app/tools/catalog")) return "Catalog";
  if (pathname.startsWith("/app/tools/proposal")) return "Proposal Builder";
  if (pathname.startsWith("/app/tools")) return "Tool Hub";
  if (pathname.startsWith("/app/import")) return "Import Intake";
  return "Wingman";
}

function projectSummary(project?: StoredProject): string {
  if (!project) return "No active project selected.";
  return [
    `Project: ${project.name || "Untitled Project"}`,
    `Customer: ${project.customer || "Not set"}`,
    `Site: ${project.site || "Not set"}`,
    `Room: ${project.roomName || "Not set"}`,
    `Stage: ${project.stage || "Discovery"}`,
    `Status: ${project.status || "Draft"}`,
    `Notes: ${project.notes || "No notes"}`,
    `Catalog SKUs: ${project.catalog?.skus?.length ?? 0}`,
    `Proposal Tier: ${project.proposal?.selectedTier ?? "None"}`,
  ].join("\n");
}

function buildSuggestions(currentPage: string, project?: StoredProject): string[] {
  const base = [
    "What should I do next on this project?",
    "Summarise the current project for a sales handover.",
    "Recommend the next best Wingman tool to use.",
    "Suggest a WyreStorm starting point for this project.",
  ];

  if (currentPage === "Dashboard") {
    base.unshift("Review this dashboard context and tell me the best next action.");
  }

  if (currentPage === "Projects") {
    base.unshift("Summarise the selected project and identify missing information.");
  }

  if (currentPage === "Guided Project") {
    base.unshift("Review the guided project context and tell me what physical or workflow inputs are still missing.");
  }

  if (currentPage === "Templates") {
    base.unshift("Recommend Bronze, Silver, and Gold template directions for this opportunity.");
  }

  if (currentPage === "Catalog") {
    base.unshift("Based on the current project, suggest the most relevant product families.");
  }

  if (currentPage === "Proposal Builder") {
    base.unshift("Summarise this project in proposal-ready language.");
  }

  if (project?.discovery?.recommendedFamilies?.length) {
    base.push(`Explain why ${project.discovery.recommendedFamilies.join(", ")} may be suitable for this project.`);
  }

  return base.slice(0, 6);
}

function buildPrompt(page: string, project: StoredProject | undefined, suggestion: string): string {
  return [
    "You are Wingman Guru, an AV sales and design assistant for WyreStorm.",
    "",
    `Current page: ${page}`,
    "",
    "Current project context:",
    projectSummary(project),
    "",
    "User request:",
    suggestion,
    "",
    "Respond in practical sales-and-design language. Focus on next steps, product direction, and any missing project information.",
  ].join("\n");
}

export default function GuruPanel({ open, onClose }: Props) {
  const nav = useNavigate();
  const loc = useLocation();
  const currentPage = pageLabel(loc.pathname);
  const [project, setProject] = React.useState<StoredProject | undefined>(() => getActiveProject());
  const [draft, setDraft] = React.useState<string>("");
  const [copied, setCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    setProject(getActiveProject());
  }, [loc.pathname, open]);

  const suggestions = React.useMemo(
    () => buildSuggestions(currentPage, project),
    [currentPage, project]
  );

  React.useEffect(() => {
    if (!draft && suggestions[0]) {
      setDraft(buildPrompt(currentPage, project, suggestions[0]));
    }
  }, [currentPage, draft, project, suggestions]);

  const applySuggestion = (suggestion: string) => {
    setDraft(buildPrompt(currentPage, project, suggestion));
    setCopied(false);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {open ? <div className="wm-guru-backdrop" onClick={onClose} /> : null}

      <aside className={open ? "wm-guru-panel is-open" : "wm-guru-panel"} aria-label="Guru assistant panel">
        <div className="wm-guru-panel__header">
          <div>
            <div className="wm-guru-panel__eyebrow">Guru</div>
            <div className="wm-guru-panel__title">AV AI helper</div>
            <div className="wm-guru-panel__subtitle">{currentPage}</div>
          </div>

          <button
            type="button"
            className="wm-guru-panel__close"
            onClick={onClose}
            aria-label="Close Guru assistant"
            title="Close Guru assistant"
          >
            ×
          </button>
        </div>

        <div className="wm-guru-panel__section">
          <div className="wm-guru-panel__sectiontitle">Active project</div>
          <div className="wm-guru-context">
            <div className="wm-guru-context__name">{project?.name ?? "No active project"}</div>
            <div className="wm-guru-context__meta">
              <span className="wm-chip">Stage: {project?.stage ?? "Discovery"}</span>
              <span className="wm-chip">Status: {project?.status ?? "Draft"}</span>
            </div>
            <div className="wm-guru-context__body">
              {project
                ? `${project.customer || "No customer"} • ${project.site || "No site"} • ${project.roomName || "No room"}`
                : "Open or create a project to give Guru better context."}
            </div>
          </div>
        </div>

        <div className="wm-guru-panel__section">
          <div className="wm-guru-panel__sectiontitle">Suggested prompts</div>
          <div className="wm-guru-suggestions">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="wm-guru-suggestion"
                onClick={() => applySuggestion(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="wm-guru-panel__section">
          <div className="wm-guru-panel__sectiontitle">Prompt builder</div>
          <textarea
            className="wm-guru-panel__textarea"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setCopied(false);
            }}
          />
        </div>

        <div className="wm-guru-panel__actions">
          <button type="button" className="wm-btn wm-btn--primary" onClick={copyPrompt}>
            {copied ? "Copied" : "Copy Prompt"}
          </button>

          <button
            type="button"
            className="wm-btn wm-btn--ghost"
            onClick={() => nav("/app/tools")}
          >
            Open Tool Hub
          </button>

          <button
            type="button"
            className="wm-btn wm-btn--ghost"
            onClick={() => {
              const next = suggestions[0] ?? "What should I do next on this project?";
              setDraft(buildPrompt(currentPage, project, next));
            }}
          >
            Reset
          </button>
        </div>
      </aside>
    </>
  );
}
