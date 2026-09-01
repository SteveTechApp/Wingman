import { ArrowRight, Search, Zap, ArrowLeftRight, LayoutGrid, Sparkles, ChevronRight, LayoutList, LayoutDashboard } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useProjectStore } from "../data/projectStore";
import { useUiMode } from "../data/uiMode";
import { StatusChip } from "./StatusChip";
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
      "Tell Wingman about the room, the application or the problem. It asks a few questions and recommends the best WyreStorm product.",
    icon: Search,
    to: routeCatalogByKey.discovery.path,
    accent: "aqua",
    placeholder: "e.g. Boardroom with 2 displays, HDMI in, USB-C for laptop",
    step: "Start a guided interview",
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
      <div className="wm-guided-journey-icon-wrap">
        <div className="wm-guided-journey-icon">
          <Icon size={26} strokeWidth={1.8} />
        </div>
      </div>
      <div className="wm-guided-journey-copy">
        <div className="wm-guided-journey-step-label">{card.step}</div>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
        <span className="wm-guided-journey-cta">
          Get started <ArrowRight size={14} />
        </span>
      </div>
      <ChevronRight className="wm-guided-journey-chevron" size={18} />
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
      <h2>Continue your work</h2>
      <div className="wm-guided-recent-list">
        {recent.map((project) => {
          const resume = discoveryResumeInfo(project.discoveryBrief);
          const resumeInterview = resume && resume.hasContent && !resume.complete;
          const href = resumeInterview
            ? discoveryResumeUrl()
            : `${routeCatalogByKey.projects.path}/${project.id}`;

          return (
            <Link
              key={project.id}
              to={href}
              className="wm-guided-recent-card"
              onClick={() => setActiveProjectId(project.id)}
            >
              <StatusChip label={project.status} variant={project.status} />
              <strong>{project.name}</strong>
              <small>{project.stage}</small>
            </Link>
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
        <strong>Welcome to Wingman.</strong> Start with <strong>Discovery</strong> — answer a few questions about the room and Wingman recommends the right products.
        No technical knowledge needed.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Unlock full view — prompt when user has done enough                 */
/* ------------------------------------------------------------------ */

function UnlockFullView() {
  const { isGuided, toggleMode } = useUiMode();
  const { projects } = useProjectStore();

  if (!isGuided || projects.length < 2) return null;

  return (
    <div className="wm-guided-unlock-inline">
      <LayoutGrid size={14} />
      <span>Ready for more? <strong>Switch to Full view</strong> for templates, data management and all admin tools.</span>
      <button type="button" className="wm-button is-secondary wm-guided-unlock-btn" onClick={toggleMode}>
        Full view
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guided Dashboard                                                   */
/* ------------------------------------------------------------------ */

function JourneyListItem({ card, index }: { card: JourneyCard; index: number }) {
  const Icon = card.icon;

  return (
    <Link
      to={card.to}
      className={`wm-guided-journey-list wm-polish-card wm-polish-${card.accent}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="wm-guided-journey-list-icon">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="wm-guided-journey-list-copy">
        <strong>{card.title}</strong>
        <span>{card.description}</span>
      </div>
      <span className="wm-guided-journey-list-cta">
        Get started <ArrowRight size={13} />
      </span>
    </Link>
  );
}

const VIEW_PREF_KEY = "wingman-guided-view-v1";

function readViewPref(): boolean {
  try {
    return localStorage.getItem(VIEW_PREF_KEY) === "list";
  } catch {
    return false;
  }
}

function writeViewPref(compact: boolean) {
  try {
    localStorage.setItem(VIEW_PREF_KEY, compact ? "list" : "cards");
  } catch { /* ignore */ }
}

export function GuidedDashboard() {
  const [compact, setCompact] = useState(readViewPref);
  const toggleView = useCallback(() => {
    setCompact((c) => {
      writeViewPref(!c);
      return !c;
    });
  }, []);

  return (
    <main
      className="wm-guided-dashboard wm-page wm-polish-shell"
      data-wingman-page="guided-home"
      aria-label="Wingman guided home"
    >
      <header className="wm-guided-hero">
        <div className="wm-guided-hero-badge">Wingman</div>
        <h1>What can Wingman help you with?</h1>
        <p>Pick a starting point — Wingman will guide you from there.</p>
      </header>

      <OnboardingTip />

      <section className="wm-guided-journeys" aria-label="Quick start">
        <div className="wm-guided-journeys-header">
          <h2>Get started</h2>
          <button
            type="button"
            className="wm-guided-view-toggle"
            onClick={toggleView}
            title={compact ? "Switch to card view" : "Switch to compact list"}
            aria-label={compact ? "Switch to card view" : "Switch to compact list"}
          >
            {compact ? <LayoutDashboard size={14} /> : <LayoutList size={14} />}
          </button>
        </div>
        <div className={compact ? "wm-guided-journeys-list" : "wm-guided-journeys-cards"}>
          {journeys.map((card, index) =>
            compact ? (
              <JourneyListItem key={card.title} card={card} index={index} />
            ) : (
              <JourneyCard key={card.title} card={card} index={index} />
            ),
          )}
        </div>
      </section>

      <RecentProjects />
      <UnlockFullView />
    </main>
  );
}

export default GuidedDashboard;
