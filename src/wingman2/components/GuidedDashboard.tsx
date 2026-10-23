import { ArrowRight, Search, Zap, ArrowLeftRight, Sparkles, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useProjectStore } from "../data/projectStore";
import { StatusChip } from "./StatusChip";
import { SurveyReviewChip } from "./SurveyReviewChip";
import { SurveyReconfirmAction } from "./SurveyReconfirmAction";
import { discoveryResumeInfo, discoveryResumeUrl } from "../lib/discoveryResume";
import { setActiveProjectId } from "../data/projectStore";

/* ------------------------------------------------------------------ */
/*  Journey cards — the three things a new user actually needs          */
/* ------------------------------------------------------------------ */

type JourneyCard = {
  title: string;
  description: string;
  icon: typeof Search;
  to: string;
  accent: string;
  placeholder: string;
  step: string;
};

const journeys: JourneyCard[] = [
  {
    title: "Discover",
    description:
      "Choose a room template, adjust its equipment and quantities, then save your project or build a proposal.",
    icon: Search,
    to: routeCatalogByKey.discovery.path,
    accent: "aqua",
    placeholder: "e.g. Boardroom with 2 displays, HDMI in, USB-C for laptop",
    step: "Choose and edit a room template",
  },
  {
    title: "Compare a competitor",
    description:
      "Enter a competitor SKU or paste a product name. Wingman finds the closest WyreStorm match and shows what to check before quoting.",
    icon: ArrowLeftRight,
    to: routeCatalogByKey.compare.path,
    accent: "amber",
    placeholder: "e.g. Lightware MMX8X8-HDMI-4K-A",
    step: "Find the WyreStorm alternative",
  },
  {
    title: "Decode a request",
    description:
      "Paste an email, RFQ, BOM or rough notes. Wingman extracts the requirements, flags unknowns and suggests what to do next.",
    icon: Zap,
    to: routeCatalogByKey.ingest.path,
    accent: "violet",
    placeholder: "e.g. Customer email about a 12-room classroom rollout",
    step: "Turn notes into requirements",
  },
];

function JourneyCard({ card, index }: { card: JourneyCard; index: number }) {
  const Icon = card.icon;

  return (
    <Link
      to={card.to}
      className={`wm-guided-journey wm-polish-card wm-polish-${card.accent}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div>
        <div className="wm-guided-journey-icon">
          <Icon size={26} strokeWidth={1.8} />
        </div>
      </div>
      <div className="wm-guided-journey-copy">
        <span className="wm-guided-card-number">0{index + 1}</span>
        <div className="wm-guided-journey-step-label">{card.step}</div>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
        <span className="wm-guided-journey-cta">
          Get started <ArrowRight size={14} />
        </span>
      </div>
      <ChevronRight size={18} />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent projects strip                                              */
/* ------------------------------------------------------------------ */

function RecentProjects() {
  const { projects } = useProjectStore();
  if (projects.length === 0) return null;

  const recent = projects.slice(0, 2);

  return (
    <section className="wm-guided-recent" aria-label="Continue where you left off">
      <div className="wm-guided-recent-heading">
        <span>In progress</span>
        <h2>Continue your work</h2>
      </div>
      <div className="wm-guided-recent-list">
        {recent.map((project) => {
          const resume = discoveryResumeInfo(project.discoveryBrief);
          const resumeInterview = resume && resume.hasContent && !resume.complete;
          const href = resumeInterview
            ? discoveryResumeUrl()
            : `${routeCatalogByKey.projects.path}/${project.id}`;

          return (
            <article key={project.id} className="wm-guided-recent-card">
              <StatusChip label={project.status} variant={project.status} />
              <span className="wm-guided-recent-copy">
                <strong>{project.name}</strong>
                <small>{project.stage}</small>
                <SurveyReviewChip project={project} className="mt-1 justify-self-start" />
                {/* The quiet card is also where an old reading is settled: the
                    action records today and the chip above it turns current,
                    without opening the wall. It sits above the card's own hit
                    area, like the chip, so a tap reaches it instead. */}
                <SurveyReconfirmAction project={project} className="wm-guided-recent-reconfirm" />
              </span>
              <ArrowRight size={16} aria-hidden="true" />
              {/* The card's destination lies under its content instead of around
                  it: the survey flag is a link of its own, and a control cannot
                  be nested inside another one. The flag sits above this hit area. */}
              <Link className="wm-guided-recent-hit" to={href} onClick={() => setActiveProjectId(project.id)} aria-label={`Open ${project.name}`} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding tip — contextual help for new users                      */
/* ------------------------------------------------------------------ */

function OnboardingTip() {
  const { projects } = useProjectStore();

  if (projects.length > 0) return null;

  return (
    <div className="wm-guided-tip" role="status">
      <Sparkles size={16} className="wm-guided-tip-icon" />
      <p>
        <strong>Welcome to Wingman.</strong> Start with <strong>Discovery</strong> — choose a room template and edit it to suit your customer.
        No technical knowledge needed.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Unlock full view — prompt when user has done enough                 */
/* ------------------------------------------------------------------ */

export function GuidedDashboard({ greeting, displayName }: { greeting: string; displayName: string }) {
  return (
    <main
      className="wm-guided-dashboard wm-page wm-polish-shell"
      data-wingman-page="guided-home"
      aria-label="Wingman guided home"
    >
      <header className="wm-guided-hero">
        <div className="wm-guided-hero-copy">
          <div className="wm-polish-eyebrow">WyreStorm sales intelligence</div>
          <h1>{greeting}{displayName ? `, ${displayName}` : ""}</h1>
          <p>What would you like to achieve today?</p>
          <Link className="wm-guided-primary-action" to={routeCatalogByKey.discovery.path}>
            Choose a room template <ArrowRight size={16} />
          </Link>
        </div>
        <aside className="wm-guided-hero-path" aria-label="What Wingman does next">
          <span className="wm-guided-hero-path-label">From template to proposal</span>
          <div><strong>Choose</strong><small>The closest room template</small></div>
          <div><strong>Edit</strong><small>Equipment, quantities and room scope</small></div>
          <div><strong>Save</strong><small>Your project and customer proposal</small></div>
        </aside>
      </header>

      <OnboardingTip />
      <Link className="wm-guided-primary-action" to={routeCatalogByKey.videowall.path}>Video wall builder <ArrowRight size={16} /></Link>

      <section className="wm-guided-journeys" aria-label="Quick start">
        <div className="wm-guided-journeys-header">
          <div><span>Choose your input</span><h2>How do you want to begin?</h2></div>
        </div>
        <div className="wm-guided-journeys-cards">
          {journeys.map((card, index) => <JourneyCard key={card.title} card={card} index={index} />)}
        </div>
      </section>

      <RecentProjects />
    </main>
  );
}

export default GuidedDashboard;
