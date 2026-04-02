import {
  ArrowRight,
  BarChart3,
  Brain,
  FileUp,
  LayoutPanelTop,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./wingman-dashboard.css";

type QuickAction = {
  title: string;
  detail: string;
  route: string;
  icon: typeof Sparkles;
};

type SignalCard = {
  label: string;
  value: string;
  note: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Open Tool Hub",
    detail: "Jump into the full Wingman tool board and start from the correct workspace.",
    route: "/app/tools",
    icon: LayoutPanelTop,
  },
  {
    title: "Import Customer Brief",
    detail: "Turn rough customer requirements into a structured working brief.",
    route: "/app/tools/import-intake",
    icon: FileUp,
  },
  {
    title: "Product Intelligence",
    detail: "Review enriched technical guidance, match notes, and evidence.",
    route: "/app/tools/product-intelligence",
    icon: Brain,
  },
  {
    title: "Guru",
    detail: "Ask for solution direction, architecture support, or sales guidance.",
    route: "/app/tools/guru",
    icon: Wand2,
  },
];

const signals: SignalCard[] = [
  {
    label: "Architecture Ready",
    value: "AVoIP / Matrix / Video Wall",
    note: "Start from the correct transport strategy before selecting product families.",
  },
  {
    label: "Sales Support",
    value: "Positioning + Compare",
    note: "Support commercial decisions with competitor mapping and value framing.",
  },
  {
    label: "Knowledge Access",
    value: "Training + Guru",
    note: "Give less technical users a guided path into product and application decisions.",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-dashboard-page">
      <section className="wm-dashboard-hero">
        <div className="wm-dashboard-hero__content">
          <div className="wm-dashboard-hero__eyebrow">Wingman Workspace</div>
          <h1 className="wm-dashboard-hero__title">
            Sales engineering support, product guidance, and workflow tools in one system.
          </h1>
          <p className="wm-dashboard-hero__subtitle">
            Use Wingman to qualify opportunities, compare solutions, build video wall ideas,
            import customer briefs, and support consistent WyreStorm recommendations.
          </p>

          <div className="wm-dashboard-hero__actions">
            <button
              type="button"
              className="wm-dashboard-button wm-dashboard-button--primary"
              onClick={() => navigate("/app/tools")}
            >
              <span>Open Tool Hub</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="wm-dashboard-button wm-dashboard-button--secondary"
              onClick={() => navigate("/app/tools/import-intake")}
            >
              <span>Import Brief</span>
            </button>
          </div>
        </div>

        <div className="wm-dashboard-hero__side">
          <div className="wm-dashboard-glassCard">
            <div className="wm-dashboard-glassCard__label">Workspace Focus</div>
            <div className="wm-dashboard-glassCard__value">Pre-sales acceleration</div>
            <p className="wm-dashboard-glassCard__text">
              Structure decisions, reduce ad-hoc support load, and guide sales users toward
              better-fit WyreStorm solutions.
            </p>
          </div>

          <div className="wm-dashboard-miniGrid">
            <div className="wm-dashboard-miniCard">
              <Sparkles size={16} />
              <span>Guided workflows</span>
            </div>
            <div className="wm-dashboard-miniCard">
              <BarChart3 size={16} />
              <span>Better qualification</span>
            </div>
            <div className="wm-dashboard-miniCard">
              <ShieldCheck size={16} />
              <span>More consistent positioning</span>
            </div>
            <div className="wm-dashboard-miniCard">
              <Trophy size={16} />
              <span>Competitive support</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-dashboard-section">
        <div className="wm-dashboard-section__header">
          <div>
            <div className="wm-dashboard-section__eyebrow">Start here</div>
            <h2 className="wm-dashboard-section__title">Core actions</h2>
          </div>
        </div>

        <div className="wm-dashboard-actionGrid">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                type="button"
                className="wm-dashboard-actionCard"
                onClick={() => navigate(item.route)}
              >
                <div className="wm-dashboard-actionCard__icon">
                  <Icon size={18} strokeWidth={1.9} />
                </div>

                <div className="wm-dashboard-actionCard__body">
                  <h3 className="wm-dashboard-actionCard__title">{item.title}</h3>
                  <p className="wm-dashboard-actionCard__detail">{item.detail}</p>
                </div>

                <div className="wm-dashboard-actionCard__footer">
                  <span>Open</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="wm-dashboard-section">
        <div className="wm-dashboard-section__header">
          <div>
            <div className="wm-dashboard-section__eyebrow">Wingman value</div>
            <h2 className="wm-dashboard-section__title">Operating signals</h2>
          </div>
        </div>

        <div className="wm-dashboard-signalGrid">
          {signals.map((item) => (
            <article key={item.label} className="wm-dashboard-signalCard">
              <div className="wm-dashboard-signalCard__label">{item.label}</div>
              <div className="wm-dashboard-signalCard__value">{item.value}</div>
              <p className="wm-dashboard-signalCard__note">{item.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}