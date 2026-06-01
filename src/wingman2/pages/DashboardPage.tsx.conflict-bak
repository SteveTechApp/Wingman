import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  FileUp,
  GitCompare,
  LayoutTemplate,
  Network,
  PackageSearch,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  JourneyProgress,
  OpportunitySignalCard,
  SignalPathNavigator,
  WingmanAIRail,
} from "../components/WingmanSalesIntelligence";

type DashboardAction = {
  title: string;
  description: string;
  path: string;
  icon: typeof ClipboardList;
  tone: "blue" | "slate" | "violet" | "emerald";
  badge: string;
};

const primaryActions: DashboardAction[] = [
  {
    title: "Start Discovery",
    description: "Run a guided customer conversation and capture the room, workflow, source, display, USB, audio and control evidence.",
    path: routeCatalogByKey.discovery.path,
    icon: ClipboardList,
    tone: "blue",
    badge: "Ask this first",
  },
  {
    title: "Build Product Direction",
    description: "Move from captured requirements into the right WyreStorm product path before opening a pitch or proposal.",
    path: routeCatalogByKey.finder.path,
    icon: PackageSearch,
    tone: "emerald",
    badge: "Solution universe",
  },
  {
    title: "Compare Competitor SKU",
    description: "Position WyreStorm against a known alternative without treating competitor products as quote-line items.",
    path: routeCatalogByKey.compare.path,
    icon: GitCompare,
    tone: "violet",
    badge: "Objection support",
  },
  {
    title: "Open Proposal Path",
    description: "Turn the recommended direction into customer-safe wording with assumptions, risks and missing information visible.",
    path: routeCatalogByKey.proposal.path,
    icon: FileText,
    tone: "slate",
    badge: "Customer safe",
  },
];

const supportActions: DashboardAction[] = [
  {
    title: "Browse Room Templates",
    description: "Start from a familiar room or vertical and refine the system design.",
    path: routeCatalogByKey.templates.path,
    icon: LayoutTemplate,
    tone: "emerald",
    badge: "Template path",
  },
  {
    title: "Upload Customer Files",
    description: "Bring in notes, schedules or tender text and convert them into useful project data.",
    path: routeCatalogByKey.ingest.path,
    icon: FileUp,
    tone: "blue",
    badge: "Ingest evidence",
  },
  {
    title: "Product Pitch",
    description: "Create an outcome-led product crib sheet rather than a simple product-facts page.",
    path: routeCatalogByKey.productPitch.path,
    icon: Sparkles,
    tone: "violet",
    badge: "Sales story",
  },
  {
    title: "Product Intelligence",
    description: "Review the knowledge base that feeds Finder, Compare, Product Pitch and Proposal.",
    path: routeCatalogByKey.intelligence.path,
    icon: Network,
    tone: "slate",
    badge: "Knowledge galaxy",
  },
];

function DashboardCard({ action, compact = false }: { action: DashboardAction; compact?: boolean }) {
  const Icon = action.icon;

  return (
    <Link className={`wm-dashboard-card wm-dashboard-card-${action.tone}`} to={action.path}>
      <span className="wm-dashboard-card-icon">
        <Icon size={compact ? 18 : 22} strokeWidth={1.9} />
      </span>

      <span className="wm-dashboard-card-copy">
        <small>{action.badge}</small>
        <strong>{action.title}</strong>
        <span>{action.description}</span>
      </span>

      <span className="wm-dashboard-card-arrow">
        <ArrowRight size={18} strokeWidth={1.9} />
      </span>
    </Link>
  );
}

export function DashboardPage() {
  return (
    <main className="wm-dashboard-page wm-opportunity-navigator-page">
      <section className="wm-opportunity-navigator-shell" aria-labelledby="wingman-dashboard-title">
        <div className="wm-opportunity-main">
          <section className="wm-opportunity-hero">
            <div className="wm-opportunity-hero-copy">
              <p className="wm-dashboard-eyebrow">WyreStorm Wingman</p>
              <h1 id="wingman-dashboard-title">Opportunity Navigator</h1>
              <span>
                Start from the customer conversation, not a product list. Wingman guides the user from discovery evidence to product direction, comparison support, proposal wording and project momentum.
              </span>
            </div>

            <div className="wm-opportunity-hero-actions">
              <Link to={routeCatalogByKey.discovery.path}>Start live discovery</Link>
              <Link to={routeCatalogByKey.compare.path}>Compare competitor SKU</Link>
            </div>
          </section>

          <JourneyProgress activeStage="Discovery" />

          <section className="wm-opportunity-radar" aria-labelledby="wingman-radar-title">
            <div className="wm-opportunity-section-head">
              <div>
                <p className="wm-dashboard-eyebrow">Opportunity readiness</p>
                <h2 id="wingman-radar-title">Discovery radar</h2>
              </div>
              <span>Use this as the live sales-flight check before quoting.</span>
            </div>

            <div className="wm-opportunity-signal-grid">
              <OpportunitySignalCard
                icon={<Radar size={18} />}
                label="Readiness"
                value="54%"
                helper="Enough to guide the next question, not enough to quote unchecked."
              />
              <OpportunitySignalCard
                icon={<Target size={18} />}
                label="Product fit"
                value="Direction first"
                helper="Select architecture before committing to a lead SKU."
              />
              <OpportunitySignalCard
                icon={<ShieldCheck size={18} />}
                label="Quote safety"
                value="Review required"
                helper="Keep dependencies, USB path, network and display behaviour visible."
              />
              <OpportunitySignalCard
                icon={<BarChart3 size={18} />}
                label="Momentum"
                value="Next action clear"
                helper="Start Discovery or Compare depending on the customer trigger."
              />
            </div>
          </section>

          <SignalPathNavigator
            items={[
              {
                label: "Customer wording",
                value: "Application and outcome",
                helper: "What does the room need to let people do?",
              },
              {
                label: "AV evidence",
                value: "Video, USB, audio, control",
                helper: "Capture only the signal paths that change the design.",
              },
              {
                label: "Product direction",
                value: "Matrix, HDBaseT, AVoIP, UC, wall",
                helper: "Choose the architecture before the SKU.",
              },
              {
                label: "Proposal output",
                value: "Customer-safe wording",
                helper: "Show assumptions and missing information.",
              },
            ]}
          />

          <section className="wm-dashboard-section" aria-labelledby="wingman-next-move-title">
            <div className="wm-dashboard-section-heading wm-opportunity-section-head">
              <div>
                <p className="wm-dashboard-eyebrow">Choose the next move</p>
                <h2 id="wingman-next-move-title">What should Wingman guide now?</h2>
              </div>
            </div>

            <div className="wm-dashboard-grid wm-opportunity-action-grid">
              {primaryActions.map((action) => (
                <DashboardCard key={action.path} action={action} />
              ))}
            </div>
          </section>

          <section className="wm-dashboard-section" aria-labelledby="wingman-support-paths-title">
            <div className="wm-dashboard-section-heading wm-opportunity-section-head">
              <div>
                <p className="wm-dashboard-eyebrow">Supporting intelligence</p>
                <h2 id="wingman-support-paths-title">Open the right support workspace</h2>
              </div>
            </div>

            <div className="wm-dashboard-grid wm-dashboard-grid-compact">
              {supportActions.map((action) => (
                <DashboardCard key={action.path} action={action} compact />
              ))}
            </div>
          </section>
        </div>

        <WingmanAIRail
          customerType="Distributor or sales-led opportunity"
          confidence="Medium"
          likelyObjection="The customer may already know a competitor product or assume WyreStorm is only an AVoIP brand."
          salesAngle="Lead with the use case, then show the right WyreStorm architecture: simple room core, HDBaseT, matrix, NetworkHD, wall processing or UC workflow."
          nextAction="Start Discovery for unknown requirements, or Compare when the customer gives a competitor SKU first."
          evidence={["Application", "Display behaviour", "USB ownership", "Signal distance", "Supportable product path"]}
        />
      </section>
    </main>
  );
}

export default DashboardPage;
