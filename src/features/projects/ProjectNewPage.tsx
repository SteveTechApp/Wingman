import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileUp,
  FolderPlus,
  LayoutTemplate,
  Route,
  ScanSearch,
} from "lucide-react";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import { createProject } from "@/features/projects/projectStore";

type StartMethod = {
  id: string;
  title: string;
  description: string;
  helper: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const START_METHODS: StartMethod[] = [
  {
    id: "guided-project",
    title: "Guided Project",
    description: "Use a low-clutter guided decision tree to understand the room, the signal path, and the customer workflow.",
    helper: "Best for live discovery calls and early-stage qualification.",
    to: WM_ROUTES.discovery,
    Icon: Route,
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start from a proven room archetype and then tailor the solution for the opportunity.",
    helper: "Best for common room types and repeatable solutions.",
    to: WM_ROUTES.templates,
    Icon: LayoutTemplate,
  },
  {
    id: "import-brief",
    title: "Import Brief or Document",
    description: "Bring in a customer brief, tender notes, scope document, or email thread and let Wingman extract the important signals.",
    helper: "Best when the project already has written input material.",
    to: "/app/tools/import-intake?mode=document",
    Icon: FileUp,
  },
  {
    id: "import-diagram",
    title: "Import Diagram or Existing System",
    description: "Start from a customer sketch, signal flow, or existing system map and convert it into a guided project path.",
    helper: "Best when the physical flow already exists but needs translating into technology choices.",
    to: "/app/tools/import-intake?mode=diagram",
    Icon: ScanSearch,
  },
];

export default function ProjectNewPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");

  function createShell(methodTitle: string) {
    return createProject({
      name: name.trim() || `${methodTitle} Project`,
      customer: customer.trim(),
      site: site.trim(),
      roomName: name.trim() || "",
      stage: "Discovery",
      status: "Draft",
    });
  }

  function startWith(method: StartMethod) {
    createShell(method.title);
    nav(method.to);
  }

  function createBlankWorkspace() {
    const project = createShell("New");
    nav(`/app/projects/${encodeURIComponent(project.id)}`);
  }

  return (
    <div className="wm-page wm-project-new-page">
      <section className="wm-hero">
        <div className="wm-grid wm-project-new-page__hero">
          <div className="wm-kicker">Projects</div>
          <div className="wm-title-xl">Start New Project</div>
          <div className="wm-body-sm wm-page-subtitle-muted" style={{ maxWidth: 920 }}>
            Create the project shell once, then choose the best way to begin. Wingman should
            adapt to how the opportunity arrives, whether that is a guided conversation, a proven
            template, a customer brief, or an existing diagram.
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Opportunity details</h2>
            <p>Keep this light. Add just enough commercial context so the next workflow has a project to work from.</p>
          </div>
        </div>

        <div className="wm-project-new-page__form">
          <label className="wm-form-field">
            <span className="wm-form-label">Project name</span>
            <input
              className="wm-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boardroom Upgrade"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Customer</span>
            <input
              className="wm-form-input"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g. Acme Ltd"
            />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Site</span>
            <input
              className="wm-form-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. London HQ"
            />
          </label>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Choose how to start</h2>
            <p>Pick the method that matches the information you have today. You can always switch tools later.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {START_METHODS.map(({ id, title, description, helper, to, Icon }) => (
            <article
              key={id}
              className="wm-work-card"
              style={{
                display: "grid",
                gap: 14,
                alignContent: "start",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(92, 189, 222, 0.18)",
                  background: "linear-gradient(135deg, rgba(9,32,56,0.92), rgba(11,78,89,0.70))",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="wm-title-lg">{title}</div>
              <div className="wm-body">{description}</div>
              <div className="wm-body-sm" style={{ opacity: 0.72 }}>
                {helper}
              </div>

              <button
                type="button"
                className={`wm-btn${id === "guided-project" ? " wm-btn-primary" : ""}`}
                onClick={() => startWith({ id, title, description, helper, to, Icon })}
              >
                Start with {title}
              </button>
            </article>
          ))}

          <article className="wm-work-card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="wm-title-lg">Blank Workspace</div>
            <div className="wm-body">
              Create a project shell first and decide on the workflow later from the project page.
            </div>
            <div className="wm-body-sm" style={{ opacity: 0.72 }}>
              Best for admin setup or when the opportunity still needs triage.
            </div>
            <button type="button" className="wm-btn" onClick={createBlankWorkspace}>
              Create Blank Workspace
            </button>
          </article>
        </div>

        <div className="wm-actions-row" style={{ marginTop: 16 }}>
          <button type="button" className="wm-btn" onClick={() => nav(WM_ROUTES.projects)}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
