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

function clearStoredProjectContext() {
  if (typeof window === "undefined") {
    return;
  }

  storedProjectKeys.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });

  window.dispatchEvent(new CustomEvent("wingman:project-context-cleared"));
}

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);
  const activeLabel = activeRoute?.label ?? "Dashboard";
  const activeSummary = activeRoute?.summary ?? "WyreStorm technical sales workspace.";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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
              className={({ isActive }) =>
                ["wingman-nav-link", isActive ? "wingman-nav-link-active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <Icon className="wingman-nav-icon" />
              <span className="wingman-nav-copy">
                <span>{navLabel}</span>
                <small>{summary}</small>
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

          <button type="button" className="wingman-clear-project-button" onClick={clearStoredProjectContext}>
            <RotateCcw className="h-4 w-4" />
            Clear current project
          </button>
        </header>

        <main className="wingman-app-main">
          <div className="wingman-page-host">{children ?? <Outlet />}</div>
        </main>
      </div>

      <WingmanGuruFab open={guruOpen} onClick={() => setGuruOpen((current) => !current)} />
      <WingmanGuruDrawer open={guruOpen} onClose={() => setGuruOpen(false)} />
    </div>
  );
}

export default AppShell;