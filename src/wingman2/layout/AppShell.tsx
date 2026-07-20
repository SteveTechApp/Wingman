import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Menu, Plus, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  consolidatedPrimaryNavKeys,
  routeByPath,
  routeCatalog,
  routeCatalogByKey,
  type WingmanRouteKey,
} from "../app/routeCatalog";
import { WingmanGuruFab } from "../components/WingmanGuruFab";
import { WingmanViewportFitControl } from "../components/WingmanViewportFitControl";
import { clearActiveProject } from "../data/projectStore";
import { useWingmanLanguage } from "../data/wingmanLanguage";
import wingmanBrandLogo from "../../assets/branding/wingman-brand-logo.png";

const WingmanGuruDrawer = lazy(() => import("../components/WingmanGuruDrawer"));

type AppShellProps = {
  children?: ReactNode;
};

type GuruSupportCue = {
  label: string;
  summary: string;
  prompts: string[];
};

const routeClassNames = routeCatalog.map((route) => `wm-route-${route.segment}`);

const storedProjectKeys = [
  "wingman-current-project",
  "wingman-current-project-id",
  "wingman-active-project",
  "wingman-active-project-id",
  "wingman-project-context",
  "wingman-workflow-context",
  "wingman-discovery-brief",
  "wingman-proposal-draft",
];

const transientStoragePrefixes = [
  "wingman-current-",
  "wingman-active-",
  "wingman-workflow-",
  "wingman-discovery-",
  "wingman-proposal-draft",
  "wingman-room-draft",
  "wingman-brief-draft",
];

const preservedStorageKeys = [
  "wingman-project-store-v1",
  "wingman-project-product-selections-v1",
  "wingman-guru-local-memory-v1",
  "wingman-guru-glossary-v1",
];

function shouldRemoveTransientKey(key: string) {
  if (storedProjectKeys.includes(key)) {
    return true;
  }

  if (preservedStorageKeys.includes(key)) {
    return false;
  }

  return transientStoragePrefixes.some((prefix) => key.startsWith(prefix));
}

function removeTransientStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => Boolean(key),
  );

  keys.forEach((key) => {
    if (shouldRemoveTransientKey(key)) {
      storage.removeItem(key);
    }
  });
}

function clearStoredProjectContext() {
  if (typeof window === "undefined") {
    return;
  }

  removeTransientStorage(window.localStorage);
  removeTransientStorage(window.sessionStorage);
  clearActiveProject();

  window.dispatchEvent(new CustomEvent("wingman:project-context-cleared"));
  window.dispatchEvent(new CustomEvent("wingman:page-reset-requested"));
}

function resetMainScrollPosition() {
  if (typeof window === "undefined") {
    return;
  }

  const main = window.document.querySelector(".wingman-app-main");

  if (main instanceof HTMLElement) {
    main.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

function navDisplayLabel(key: WingmanRouteKey, navLabel: string) {
  const compactLabels: Partial<Record<WingmanRouteKey, string>> = {
    profile: "Settings",
  };

  return compactLabels[key] ?? navLabel;
}

const GURU_SUPPORT_BY_ROUTE: Partial<Record<WingmanRouteKey, GuruSupportCue>> = {
  discovery: {
    label: "Discovery help ready",
    summary: "Guru can help turn messy customer language into room purpose, signal flow, distance, USB and quote-risk questions.",
    prompts: [
      "Help me turn this customer requirement into a discovery checklist.",
      "What should I confirm before I quote this room?",
      "What architecture questions matter most here?",
    ],
  },
  recommendations: {
    label: "Recommendation guidance ready",
    summary: "Guru can explain what a product actually does in a system, where it fits, and what should be confirmed before it is shortlisted.",
    prompts: [
      "Explain where this WyreStorm product fits in a real system.",
      "What should I avoid saying about this product?",
      "What dependencies should I confirm before adding it to a project?",
    ],
  },
  productFamilies: {
    label: "Architecture help ready",
    summary: "Guru can explain why a family fits, what problem it solves, and what would push the answer toward a different WyreStorm path.",
    prompts: [
      "Explain when I should use this product family.",
      "What customer wording usually points to this architecture?",
      "What would rule this family out?",
    ],
  },
  productPitch: {
    label: "Sales talk-track ready",
    summary: "Guru can help with customer-safe wording, internal caution notes, objections and the next discovery question.",
    prompts: [
      "Give me a safer customer talk track for this product.",
      "What should I not promise yet?",
      "What question should I ask next before quote?",
    ],
  },
  compare: {
    label: "Compare help ready",
    summary: "Guru can explain what the competitor product appears to be, why the WyreStorm direction was chosen, and what still needs checking before quote.",
    prompts: [
      "Explain this competitor product in plain English.",
      "Why did Wingman choose this WyreStorm direction?",
      "What must I confirm before treating this as a replacement?",
    ],
  },
  proposal: {
    label: "Proposal checks ready",
    summary: "Guru can surface assumptions, missing facts, dependency checks and safer wording before the quote leaves the building.",
    prompts: [
      "What assumptions should stay visible in this proposal?",
      "What quote blockers should I call out internally?",
      "Give me a safer external summary for this proposal.",
    ],
  },
  salesHelper: {
    label: "Conversation help ready",
    summary: "Guru can support the current sales conversation with next questions, AV terminology help and commercial framing.",
    prompts: [
      "What should I ask next in this conversation?",
      "Explain this AV term simply for a salesperson.",
      "What product direction should I explore from this requirement?",
    ],
  },
  visualStudio: {
    label: "Diagram help ready",
    summary: "Guru can explain what the system diagram means, what assumptions it is making, and what should be verified against the live design.",
    prompts: [
      "Explain this diagram in plain English.",
      "What assumptions is this diagram making?",
      "What should I verify before sharing this drawing?",
    ],
  },
};

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [guruSeedPrompt, setGuruSeedPrompt] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageResetVersion, setPageResetVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { uiText } = useWingmanLanguage();

  const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);
  const activeLabel = activeRoute?.label ?? "Home";
  const activeSummary = activeRoute?.summary ?? "WyreStorm technical sales workspace.";
  const activeRouteClass = activeRoute ? `wm-route-${activeRoute.segment}` : "wm-route-dashboard";
  const guruSupportCue = activeRoute ? GURU_SUPPORT_BY_ROUTE[activeRoute.key] : undefined;
  const primaryNav = useMemo(() => consolidatedPrimaryNavKeys.map((key) => routeCatalogByKey[key]), []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.remove(...routeClassNames);
    root.classList.add(activeRouteClass);
    root.dataset.wingmanRoute = activeRoute?.key ?? "dashboard";

    return () => {
      root.classList.remove(...routeClassNames);
      delete root.dataset.wingmanRoute;
    };
  }, [activeRoute?.key, activeRouteClass]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOpenGuru(event: Event) {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      const nextPrompt = typeof customEvent.detail?.prompt === "string" ? customEvent.detail.prompt.trim() : "";

      if (nextPrompt) {
        setGuruSeedPrompt(nextPrompt);
      }

      setGuruOpen(true);
    }

    window.addEventListener("wingman:open-guru", handleOpenGuru);

    return () => {
      window.removeEventListener("wingman:open-guru", handleOpenGuru);
    };
  }, []);

  function handleNewProject() {
    clearStoredProjectContext();
    setPageResetVersion((current) => current + 1);
    navigate(routeCatalogByKey.projects.path);
    window.setTimeout(resetMainScrollPosition, 0);
  }

  return (
    <div className={`wingman-shell wingman-authority-shell ${activeRouteClass}`}>
      <aside className="wingman-sidebar" data-mobile-open={mobileNavOpen ? "true" : "false"}>
        <div className="wingman-brand wingman-brand-logo-only">
          <img
            src={wingmanBrandLogo}
            alt="WyreStorm Wingman"
            className="wingman-brand-image"
            width={280}
            height={92}
            decoding="async"
            loading="eager"
          />
        </div>

        <nav className="wingman-nav" aria-label="Wingman navigation">
          {primaryNav.map(({ path, navLabel, icon: Icon, summary, key }) => (
            <NavLink
              key={path}
              to={path}
              title={summary}
              aria-label={`${navLabel}: ${summary}`}
              className={({ isActive }) =>
                ["wingman-nav-link", isActive ? "wingman-nav-link-active" : ""].filter(Boolean).join(" ")
              }
            >
              <Icon className="wingman-nav-icon" />
              <span className="wingman-nav-copy">
                <span>{navDisplayLabel(key, navLabel)}</span>
              </span>
              <span className="wingman-nav-tooltip" role="tooltip">
                {summary}
              </span>
            </NavLink>
          ))}
        </nav>

      </aside>

      <div
        className="wingman-mobile-shade"
        data-mobile-open={mobileNavOpen ? "true" : "false"}
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="wingman-workspace">
        <header className="wingman-topbar wm-balanced-topbar">
          <button
            type="button"
            className="wingman-mobile-nav-button"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-label={mobileNavOpen ? "Close Wingman navigation" : "Open Wingman navigation"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div
            className="wingman-topbar-title wm-balanced-topbar-title"
            data-wingman-page-header="true"
            title={`${activeLabel}: ${activeSummary}`}
          >
            <strong className="wingman-topbar-page-label">{activeLabel}</strong>
            <span className="wingman-topbar-page-summary">{activeSummary}</span>
          </div>

          <WingmanViewportFitControl />
          <button type="button" className="wingman-new-project-button" onClick={handleNewProject} aria-label="Create new Wingman project">
            <Plus className="h-4 w-4" />
            <span>{uiText.newProject}</span>
          </button>
        </header>

        <main className="wingman-app-main">
          <div
            data-wingman-visual-root="true"
            data-wingman-page-style="governed"
            data-wingman-page-key={activeRoute?.key ?? "dashboard"}
            className="wingman-page-host wm-app-page-frame"
            key={`${location.pathname}-${pageResetVersion}`}
          >
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      <WingmanGuruFab
        open={guruOpen}
        onClick={() => setGuruOpen((current) => !current)}
        hasContextualTransfer={Boolean(guruSupportCue)}
      />
      {guruOpen && (
        <Suspense fallback={null}>
          <WingmanGuruDrawer
            open={guruOpen}
            onClose={() => setGuruOpen(false)}
            contextLabel={activeLabel}
            contextSummary={activeSummary}
            supportCue={guruSupportCue}
            seedPrompt={guruSeedPrompt}
            onSeedHandled={() => setGuruSeedPrompt(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default AppShell;
