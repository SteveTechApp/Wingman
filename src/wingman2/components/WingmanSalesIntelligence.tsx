import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Lightbulb,
  MessageCircleQuestion,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

export type WingmanJourneyStage =
  | "Discovery"
  | "Qualification"
  | "Solution Design"
  | "Comparison"
  | "Proposal"
  | "Close";

type JourneyItem = {
  label: WingmanJourneyStage;
  helper: string;
  path: string;
};

const journeyItems: JourneyItem[] = [
  {
    label: "Discovery",
    helper: "Capture customer outcome and room evidence.",
    path: routeCatalogByKey.discovery.path,
  },
  {
    label: "Qualification",
    helper: "Check project confidence, blockers and next question.",
    path: routeCatalogByKey.callCards.path,
  },
  {
    label: "Solution Design",
    helper: "Translate the requirement into a product path.",
    path: routeCatalogByKey.finder.path,
  },
  {
    label: "Comparison",
    helper: "Position WyreStorm against known alternatives.",
    path: routeCatalogByKey.compare.path,
  },
  {
    label: "Proposal",
    helper: "Turn the selected direction into customer-safe wording.",
    path: routeCatalogByKey.proposal.path,
  },
  {
    label: "Close",
    helper: "Keep the opportunity moving with risks and actions visible.",
    path: routeCatalogByKey.projects.path,
  },
];

function stageIndex(activeStage: WingmanJourneyStage) {
  return Math.max(0, journeyItems.findIndex((item) => item.label === activeStage));
}

export function JourneyProgress({
  activeStage,
  compact = false,
}: {
  activeStage: WingmanJourneyStage;
  compact?: boolean;
}) {
  const activeIndex = stageIndex(activeStage);

  return (
    <nav className="wm-journey-progress" data-compact={compact ? "true" : "false"} aria-label="Wingman journey progress">
      {journeyItems.map((item, index) => {
        const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "future";

        return (
          <Link key={item.label} to={item.path} className="wm-journey-step" data-state={state} title={item.helper}>
            <span className="wm-journey-step-node">{state === "complete" ? <CheckCircle2 size={14} /> : index + 1}</span>
            <span className="wm-journey-step-copy">
              <strong>{item.label}</strong>
              {!compact ? <small>{item.helper}</small> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WingmanAIRail({
  customerType = "Sales user / distributor",
  confidence = "Medium",
  likelyObjection = "Customer may ask why WyreStorm is safer than an adjacent known product.",
  salesAngle = "Lead with application fit, then confirm signal path, USB, audio, control and support risk.",
  nextAction = "Capture one missing requirement before choosing a final product direction.",
  evidence = [],
  children,
}: {
  customerType?: string;
  confidence?: string;
  likelyObjection?: string;
  salesAngle?: string;
  nextAction?: string;
  evidence?: string[];
  children?: ReactNode;
}) {
  const visibleEvidence = evidence.length
    ? evidence
    : ["Application", "Source/display behaviour", "USB ownership", "Distance", "Quote risk"];

  return (
    <aside className="wm-ai-rail" aria-label="Wingman AI guidance rail">
      <div className="wm-ai-rail-header">
        <span className="wm-ai-rail-orb">
          <Sparkles size={18} />
        </span>
        <div>
          <p>Wingman AI Rail</p>
          <h2>Live sales guidance</h2>
        </div>
      </div>

      <div className="wm-ai-rail-card wm-ai-rail-card-emphasis">
        <span>Customer type</span>
        <strong>{customerType}</strong>
      </div>

      <div className="wm-ai-rail-grid">
        <div className="wm-ai-rail-mini">
          <Target size={16} />
          <span>Confidence</span>
          <strong>{confidence}</strong>
        </div>
        <div className="wm-ai-rail-mini">
          <ShieldCheck size={16} />
          <span>Readiness</span>
          <strong>{confidence === "High" ? "Demo safe" : "Needs evidence"}</strong>
        </div>
      </div>

      <div className="wm-ai-rail-card">
        <div className="wm-ai-rail-card-title">
          <MessageCircleQuestion size={16} />
          <span>Likely objection</span>
        </div>
        <p>{likelyObjection}</p>
      </div>

      <div className="wm-ai-rail-card">
        <div className="wm-ai-rail-card-title">
          <Lightbulb size={16} />
          <span>Recommended sales angle</span>
        </div>
        <p>{salesAngle}</p>
      </div>

      <div className="wm-ai-rail-card">
        <div className="wm-ai-rail-card-title">
          <Zap size={16} />
          <span>Suggested next action</span>
        </div>
        <p>{nextAction}</p>
      </div>

      <div className="wm-ai-evidence-list">
        <span>Evidence still visible</span>
        <div>
          {visibleEvidence.map((item) => (
            <small key={item}>{item}</small>
          ))}
        </div>
      </div>

      {children}
    </aside>
  );
}

export function OpportunitySignalCard({
  icon,
  label,
  value,
  helper,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="wm-opportunity-signal-card">
      <span className="wm-opportunity-signal-icon">{icon ?? <Radar size={18} />}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

export function SignalPathNavigator({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) {
  return (
    <div className="wm-signal-path-navigator" aria-label="AV signal path navigator">
      {items.map((item, index) => (
        <article key={item.label}>
          <span>
            {index === 0 ? <Compass size={16} /> : index === items.length - 1 ? <Target size={16} /> : <Route size={16} />}
          </span>
          <div>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </div>
          {index < items.length - 1 ? <ArrowRight className="wm-signal-path-arrow" size={16} /> : null}
        </article>
      ))}
    </div>
  );
}
