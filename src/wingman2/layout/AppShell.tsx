import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Menu, RotateCcw, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { routeByPath, routeCatalog } from "../app/routeCatalog";
import { WingmanGuruDrawer } from "../components/WingmanGuruDrawer";
import { WingmanGuruFab } from "../components/WingmanGuruFab";

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

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageResetVersion, setPageResetVersion] = useState(0);
  const location = useLocation();

  const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);
  const activeLabel = activeRoute?.label ?? "Dashboard";
  const activeSummary = activeRoute?.summary ?? "WyreStorm technical sales workspace.";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  function handleClearCurrentProject() {
    clearStoredProjectContext();
    setGuruOpen(false);
    setPageResetVersion((current) => current + 1);
    window.setTimeout(resetMainScrollPosition, 0);
  }

  return (
    <div className="wingman-shell wingman-authority-shell">
      <aside className="wingman-sidebar" data-mobile-open={mobileNavOpen ? "true" : "false"}>
        <div className="wingman-brand wingman-brand-logo-only">
          <img src="/wingman-logo.png" alt="WyreStorm Wingman" className="wingman-brand-image" />
        </div>

        <nav className="wingman-nav" aria-label="Wingman navigation">
          {routeCatalog.map(({ path, navLabel, icon: Icon, summary }) => (
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
                  <span>{navLabel}</span>
                </span>
                <span className="wingman-nav-tooltip" role="tooltip">{summary}</span>
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
        <header className="wingman-topbar">
          <button
            type="button"
            className="wingman-mobile-nav-button"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-label={mobileNavOpen ? "Close Wingman navigation" : "Open Wingman navigation"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="wingman-topbar-title">
            <p>{activeLabel}</p>
            <span>{activeSummary}</span>
          </div>

          <button type="button" className="wingman-clear-project-button" onClick={handleClearCurrentProject}>
            <RotateCcw className="h-4 w-4" />
            Clear current project
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