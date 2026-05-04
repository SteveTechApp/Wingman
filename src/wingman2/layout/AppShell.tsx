import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Headphones, Menu, MessageSquareText, Plus, RotateCcw, Search, Settings, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { routeByPath, routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { WingmanGuruDrawer } from "../components/WingmanGuruDrawer";
import { WingmanGuruFab } from "../components/WingmanGuruFab";
import { clearActiveProject } from "../data/projectStore";
type AppShellProps = {
  children?: ReactNode;
};

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
  "wingman-finder-draft",
  "wingman-room-draft",
  "wingman-brief-draft",
];

const primaryNavKeys: WingmanRouteKey[] = [
  "dashboard",
  "discovery",
  "finder",
  "templates",
  "compare",
  "videowall",
  "salesHelper",
  "proposal",
];

const secondaryNavKeys: WingmanRouteKey[] = [
  "projects",
  "ingest",
  "productFamilies",
  "productPitch",
  "callCards",
  "support",
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
    compare: "Competitor Compare",
    proposal: "Proposal",
    projects: "Projects",
    salesHelper: "Sales Language",
    videowall: "Video Wall",
    productFamilies: "Product Families",
    productPitch: "Product Pitch",
  };

  return compactLabels[key] ?? navLabel;
}

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageResetVersion, setPageResetVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);
  const activeLabel = activeRoute?.label ?? "Dashboard";
  const activeSummary = activeRoute?.summary ?? "WyreStorm technical sales workspace.";
  const primaryNav = useMemo(() => primaryNavKeys.map((key) => routeCatalogByKey[key]), []);
  const secondaryNav = useMemo(() => secondaryNavKeys.map((key) => routeCatalogByKey[key]), []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    function handleOpenGuru() {
      setGuruOpen(true);
    }

    window.addEventListener("wingman:open-guru", handleOpenGuru);

    return () => {
      window.removeEventListener("wingman:open-guru", handleOpenGuru);
    };
  }, []);


  function handleClearCurrentProject() {
    clearStoredProjectContext();
    setGuruOpen(false);
    setPageResetVersion((current) => current + 1);
    window.setTimeout(resetMainScrollPosition, 0);
  }

  function handleNewProject() {
    clearStoredProjectContext();
    setPageResetVersion((current) => current + 1);
    navigate(routeCatalogByKey.projects.path);
    window.setTimeout(resetMainScrollPosition, 0);
  }

  return (
    <div className="wingman-shell wingman-authority-shell">
      <aside className="wingman-sidebar" data-mobile-open={mobileNavOpen ? "true" : "false"}>
        <div className="wingman-brand wingman-brand-logo-only">
          <img src="/wingman-logo.png" alt="WyreStorm Wingman" className="wingman-brand-image" decoding="async" />
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
              <span className="wingman-nav-tooltip" role="tooltip">{summary}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="wingman-nav wingman-nav-secondary" aria-label="Wingman secondary navigation">
          {secondaryNav.map(({ path, navLabel, icon: Icon, summary, key }) => (
            <NavLink
              key={path}
              to={path}
              title={summary}
              aria-label={`${navLabel}: ${summary}`}
              className={({ isActive }) =>
                ["wingman-nav-link", "wingman-nav-link-secondary", isActive ? "wingman-nav-link-active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <Icon className="wingman-nav-icon" />
              <span className="wingman-nav-copy">
                <span>{navDisplayLabel(key, navLabel)}</span>
              </span>
              <span className="wingman-nav-tooltip" role="tooltip">{summary}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="wingman-expert-handoff-card" onClick={() => setGuruOpen(true)}>
          <Headphones className="wingman-expert-handoff-icon" />
          <span>
            <strong>Expert handoff</strong>
            <small>Get WyreStorm support</small>
          </span>
        </button>

        <button type="button" className="wingman-settings-link" onClick={() => setGuruOpen(true)}>
          <Settings className="wingman-nav-icon" />
          <span>Settings</span>
        </button>
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

          <div className="wingman-topbar-title wm-balanced-topbar-title" title={`${activeLabel}: ${activeSummary}`}>
            <p>Good morning, Wingman</p>
            <span>{activeLabel}: {activeSummary}</span>
          </div>

          <label className="wingman-command-search">
            <Search className="wingman-command-search-icon" />
            <input type="search" placeholder="Search projects, rooms, products..." aria-label="Search projects, rooms, products" />
            <kbd>Ctrl K</kbd>
          </label>

          <button type="button" className="wingman-new-project-button" onClick={handleNewProject}>
            <Plus className="h-4 w-4" />
            <span>New Project</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <button type="button" className="wingman-topbar-icon-button" onClick={() => setGuruOpen(true)} aria-label="Open messages">
            <MessageSquareText className="h-4 w-4" />
          </button>

          <button type="button" className="wingman-topbar-icon-button" onClick={handleClearCurrentProject} aria-label="Reset current project">
            <RotateCcw className="h-4 w-4" />
          </button>

          <button type="button" className="wingman-topbar-icon-button wingman-topbar-icon-button-alert" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>

          <button type="button" className="wingman-user-avatar" onClick={() => setGuruOpen(true)} aria-label="Open Wingman expert support">
            WM
          </button>
        </header>

        <main className="wingman-app-main">
          <div className="wingman-page-host" key={`${location.pathname}-${pageResetVersion}`}>
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      <WingmanGuruFab open={guruOpen} onClick={() => setGuruOpen((current) => !current)} />
      <WingmanGuruDrawer open={guruOpen} onClose={() => setGuruOpen(false)} />
    </div>
  );
}

export default AppShell;
