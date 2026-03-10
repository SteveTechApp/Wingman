import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  LayoutTemplate,
  Boxes,
  FileText,
  Briefcase,
  FolderOpen,
  MonitorSmartphone,
} from "lucide-react";

const workflow = [
  {
    step: "01",
    title: "Discovery",
    description:
      "Capture application, display count, source requirements, cable distance, USB, control, and commercial priorities before solution building begins.",
    Icon: ClipboardList,
  },
  {
    step: "02",
    title: "Architecture",
    description:
      "Guide users toward the right WyreStorm approach, including HDBaseT, AVoIP, matrix workflows, USB extension, and video wall direction.",
    Icon: LayoutTemplate,
  },
  {
    step: "03",
    title: "Products",
    description:
      "Turn the chosen architecture into recommended WyreStorm platforms, building blocks, and practical product selections.",
    Icon: Boxes,
  },
  {
    step: "04",
    title: "Proposal",
    description:
      "Move from system logic into proposal-ready output with commercial consistency and clearer sales support.",
    Icon: FileText,
  },
];

const capabilities = [
  {
    title: "Sales tools",
    description:
      "Support less technical sales users with guided workflows, structured toolsets, and clearer starting points for conversations and proposals.",
    Icon: Briefcase,
  },
  {
    title: "Build projects",
    description:
      "Create and structure projects from blank starts, customer requirements, room templates, and guided workflow steps.",
    Icon: FolderOpen,
  },
  {
    title: "System design guidance",
    description:
      "Help users move from requirements into architecture, product direction, and BOM thinking with more consistency.",
    Icon: MonitorSmartphone,
  },
];

export default function AboutWingmanPage() {
  return (
    <div className="wm-page">
      <section className="wm-section">
        <div className="wm-grid" style={{ gap: 16 }}>
          <div className="wm-kicker">About Wingman</div>

          <div className="wm-title-xl" style={{ maxWidth: 900 }}>
            Wingman is WyreStorm’s guided sales and project-building workspace.
          </div>

          <div className="wm-body" style={{ maxWidth: 940 }}>
            It is designed to help sales and pre-sales users capture requirements, choose the right solution path,
            build projects more consistently, and move opportunities toward proposal-ready output using practical
            WyreStorm sales tools and guided workflows.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Link to="/app/projects/new" className="wm-btn wm-btn-primary">
              Build a New Project
            </Link>
            <Link to="/app/tools/discovery" className="wm-btn">
              Open Sales Tools
            </Link>
            <Link to="/app/dashboard" className="wm-btn">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>What Wingman helps you do</h2>
            <p>Wingman supports both practical sales activity and structured project development.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {capabilities.map(({ title, description, Icon }) => (
            <article key={title} className="wm-dashboard-card">
              <div className="wm-dashboard-card__top">
                <div className="wm-dashboard-card__icon">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="wm-title-lg" style={{ fontSize: 20 }}>{title}</div>
              <div className="wm-body">{description}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>How Wingman works</h2>
            <p>Use the workflow in sequence so sales logic, design logic, and project output stay aligned.</p>
          </div>
        </div>

        <div className="wm-grid-cards">
          {workflow.map(({ step, title, description, Icon }) => (
            <article key={step} className="wm-dashboard-card">
              <div className="wm-dashboard-card__top">
                <div className="wm-dashboard-card__icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="wm-kicker">Step {step}</div>
              </div>

              <div className="wm-title-lg" style={{ fontSize: 20 }}>{title}</div>
              <div className="wm-body">{description}</div>
            </article>
          ))}
        </div>

        <div className="wm-body" style={{ marginTop: 18, maxWidth: 980 }}>
          Start with the application, move into architecture, then product selection, and only then move toward
          proposal output. This makes Wingman useful both as a sales support platform and as a practical project-building tool.
        </div>
      </section>

      <section className="wm-section">
        <Link to="/app/dashboard" className="wm-btn">
          Return to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}