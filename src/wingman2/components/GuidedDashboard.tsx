import { ArrowRight, Search, Zap, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { useProjectStore } from "../data/projectStore";
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
  },
  {
    title: "Compare a competitor",
    description:
      "Enter a competitor SKU or paste a product name. Wingman finds the closest WyreStorm match and shows what to check before quoting.",
    icon: ArrowLeftRight,
    to: routeCatalogByKey.compare.path,
    accent: "amber",
    placeholder: "e.g. Lightware MMX8X8-HDMI-4K-A",
  },
  {
    title: "Decode a request",
    description:
      "Paste an email, RFQ, BOM or rough notes. Wingman extracts the requirements, flags unknowns and suggests what to do next.",
    icon: Zap,
    to: routeCatalogByKey.ingest.path,
    accent: "violet",
    placeholder: "e.g. Customer email about a 12-room classroom rollout",
  },
];

function JourneyCard({ card }: { card: JourneyCard }) {
  const Icon = card.icon;

  return (
    <Link
      to={card.to}
      className={`wm-guided-journey wm-polish-card wm-polish-${card.accent}`}
    >
      <div className="wm-guided-journey-icon">
        <Icon size={28} />
      </div>
      <div className="wm-guided-journey-copy">
        <h3>{card.title}</h3>
        <p>{card.description}</p>
        <span className="wm-guided-journey-cta">
          Get started <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent projects strip                                              */
/* ------------------------------------------------------------------ */

function RecentProjects() {
  const { projects } = useProjectStore();
  if (projects.length === 0) return null;

  const recent = projects.slice(0, 3);

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
/*  Hint footer                                                        */
/* ------------------------------------------------------------------ */

function GuidedHint() {
  return (
    <footer className="wm-guided-hint">
      <p>
        Not sure where to start?{" "}
        <strong>Discovery</strong> is the best first step for most situations.
        Wingman will walk you through it.
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Guided Dashboard                                                   */
/* ------------------------------------------------------------------ */

export function GuidedDashboard() {
  return (
    <main
      className="wm-guided-dashboard wm-page wm-polish-shell"
      data-wingman-page="guided-home"
      aria-label="Wingman guided home"
    >
      <header className="wm-guided-hero">
        <h1>What can Wingman help you with?</h1>
        <p>Pick a starting point — Wingman will guide you from there.</p>
      </header>

      <section className="wm-guided-journeys" aria-label="Quick start">
        {journeys.map((card) => (
          <JourneyCard key={card.title} card={card} />
        ))}
      </section>

      <RecentProjects />
      <GuidedHint />
    </main>
  );
}

export default GuidedDashboard;
