import "@/features/ai/guru/guru-shared.css";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  Sparkles,
  Workflow,
} from "lucide-react";
import "./wingman-dashboard.css";

type WorkflowStep = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
};

const workflowSteps: WorkflowStep[] = [
  {
    title: "Discovery",
    subtitle: "Capture application need",
    description:
      "Set the room, counts, distance, and the few inputs that change the design.",
    href: "/app/tools/discovery",
    icon: ClipboardList,
  },
  {
    title: "Design",
    subtitle: "Select the right architecture",
    description:
      "Turn the brief into the right WyreStorm architecture and product path.",
    href: "/app/tools/catalog",
    icon: Layers3,
  },
  {
    title: "Proposal",
    subtitle: "Turn design into output",
    description:
      "Convert the design into a customer-facing output and handoff.",
    href: "/app/tools/proposal",
    icon: FileText,
  },
];

const quickActions = [
  {
    title: "Start Discovery",
    text: "Start a clean room and requirements capture.",
    href: "/app/tools/discovery",
  },
  {
    title: "Open Catalogue",
    text: "Review families and recommended solution paths.",
    href: "/app/tools/catalog",
  },
  {
    title: "Build Proposal",
    text: "Turn the current design into customer output.",
    href: "/app/tools/proposal",
  },
  {
    title: "Video Wall Planner",
    text: "Model wall layouts and hardware strategy.",
    href: "/app/tools/video-wall",
  },
];

const intelligenceChecks = [
  "Transport path aligns to source-to-display distance",
  "Architecture choice reflects complexity and expansion potential",
  "Control and USB considerations are surfaced early",
  "Proposal handoff follows from validated technical logic",
];

export default function DashboardPage() {
  return (
    <div className="wm-page-shell wm-dashboard">
      <header className="wm-page-header">
        <div className="wm-page-kicker">
          <Sparkles size={14} />
          <span>WyreStorm Wingman</span>
        </div>
      </header>

      <section className="wm-section wm-dashboard-hero">
        <div className="wm-dashboard-hero-main">
          <h1 className="wm-page-title wm-dashboard-title">
            Start the next AV project and keep the technical path grounded.
          </h1>

          <p className="wm-page-subtitle wm-dashboard-subtitle">
            Discovery, design, and proposal stay connected so the important inputs and recommendations do not get lost.
          </p>

          <div className="wm-page-actions wm-dashboard-hero-actions">
            <Link to="/app/tools/discovery" className="wm-btn wm-btn-primary">
              Start a new discovery
              <ArrowRight size={16} />
            </Link>

            <Link to="/app/tools" className="wm-btn wm-btn-secondary">
              Open tool hub
            </Link>
          </div>

          <div className="wm-dashboard-workflow-strip">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="wm-workflow-step">
                  <div className="wm-workflow-step-head">
                    <div className="wm-workflow-icon">
                      <Icon size={18} />
                    </div>

                    <div>
                      <div className="wm-workflow-title">{step.title}</div>
                      <div className="wm-workflow-subtitle">{step.subtitle}</div>
                    </div>
                  </div>

                  <p className="wm-workflow-description">{step.description}</p>

                  <Link to={step.href} className="wm-inline-link">
                    Open {step.title}
                    <ArrowRight size={14} />
                  </Link>

                  {index < workflowSteps.length - 1 ? (
                    <div className="wm-workflow-connector" aria-hidden="true" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="wm-dashboard-guru-panel">
          <div className="wm-dashboard-guru-top">
            <div className="wm-dashboard-guru-badge">
              <img src="/guru.png" alt="Wingman Guru" className="wm-guru-mark" />
              <span>Guru Guidance</span>
            </div>

            <div className="wm-dashboard-guru-status">
              <CheckCircle2 size={14} />
              <span>Ready</span>
            </div>
          </div>

          <div className="wm-dashboard-guru-body">
            <h2>Check the decision before you lock the hardware</h2>

            <p>
              Use Guru to validate direction, surface missing requirements, and reduce avoidable design errors.
            </p>

            <div className="wm-dashboard-guru-prompts">
              <div className="wm-dashboard-prompt">
                Should this application use matrix switching or AVoIP?
              </div>
              <div className="wm-dashboard-prompt">
                What information is still missing from this brief?
              </div>
              <div className="wm-dashboard-prompt">
                What is the best WyreStorm path for a 3x3 video wall?
              </div>
            </div>

            <Link to="/app/tools/guru" className="wm-btn wm-btn-guru">
              <img src="/guru.png" alt="" className="wm-guru-mark" />
              Open Guru
            </Link>
          </div>
        </aside>
      </section>

      <section className="wm-page-grid wm-page-grid--2 wm-dashboard-grid">
        <div className="wm-card wm-dashboard-card wm-dashboard-card-wide">
            <div className="wm-card-header">
              <div className="wm-card-icon">
                <Workflow size={18} />
              </div>
              <div>
                <h3>Operational flow</h3>
                <p>Stay aligned from brief to proposal.</p>
              </div>
            </div>

          <div className="wm-check-list">
            {intelligenceChecks.map((item) => (
              <div key={item} className="wm-check-row">
                <CheckCircle2 size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="wm-card wm-dashboard-card">
            <div className="wm-card-header">
              <div className="wm-card-icon">
                <Layers3 size={18} />
              </div>
              <div>
                <h3>Current focus</h3>
                <p>Most teams start in discovery.</p>
              </div>
            </div>

          <div className="wm-focus-stack">
            <Link to="/app/tools/discovery" className="wm-focus-item">
              <strong>New opportunity intake</strong>
              <span>Structure the requirement before selecting products.</span>
            </Link>

            <Link to="/app/tools/catalog" className="wm-focus-item">
              <strong>Architecture alignment</strong>
              <span>Match requirement to the correct WyreStorm solution path.</span>
            </Link>

            <Link to="/app/tools/proposal" className="wm-focus-item">
              <strong>Commercial output</strong>
              <span>Move technical logic into a usable proposal flow.</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="wm-section wm-dashboard-actions">
        <div className="wm-section-header wm-section-heading">
          <div>
            <h2 className="wm-section-title">Quick actions</h2>
            <p className="wm-section-copy">
              Open the next workspace directly.
            </p>
          </div>
        </div>

        <div className="wm-page-grid wm-page-grid--4 wm-action-grid">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href} className="wm-action-card">
              <div className="wm-action-card-top">
                <span>{action.title}</span>
                <ArrowRight size={16} />
              </div>
              <p>{action.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
