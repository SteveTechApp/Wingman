import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  consolidatedPrimaryNavKeys,
  routeByPath,
  routeCatalog,
  routeCatalogByKey,
  type WingmanRouteKey,
} from "../app/routeCatalog";
import { WingmanGuruDrawer } from "../components/WingmanGuruDrawer";
import { WingmanGuruFab } from "../components/WingmanGuruFab";
import { clearActiveProject } from "../data/projectStore";
import { useWingmanLanguage } from "../data/wingmanLanguage";
import { useWingmanProfile } from "../data/wingmanProfile";
import wingmanBrandLogo from "../../assets/branding/wingman-brand-logo.png";

type AppShellProps = {
  children?: ReactNode;
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

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageResetVersion, setPageResetVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { uiText } = useWingmanLanguage();
  const { profile } = useWingmanProfile();

  const activeRoute = useMemo(() => routeByPath(location.pathname), [location.pathname]);
  const activeLabel = activeRoute?.label ?? "Home";
  const activeSummary = activeRoute?.summary ?? "WyreStorm technical sales workspace.";
  const activeRouteClass = activeRoute ? `wm-route-${activeRoute.segment}` : "wm-route-dashboard";
  const primaryNav = useMemo(() => consolidatedPrimaryNavKeys.map((key) => routeCatalogByKey[key]), []);
  const topbarGreeting = useMemo(() => {
    const displayName = profile.userName.trim() || profile.reportPreparedBy.trim() || "Wingman";

    return uiText.goodMorning.includes("Wingman")
      ? uiText.goodMorning.replace("Wingman", displayName)
      : `${uiText.goodMorning}, ${displayName}`;
  }, [profile.reportPreparedBy, profile.userName, uiText.goodMorning]);

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
    function handleOpenGuru() {
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

          <div className="wingman-topbar-title wm-balanced-topbar-title" title={`${activeLabel}: ${activeSummary}`}>
            <p>{topbarGreeting}</p>
            <span>
              {activeLabel}: {activeSummary}
            </span>
          </div>

          <button type="button" className="wingman-new-project-button" onClick={handleNewProject}>
            <Plus className="h-4 w-4" />
            <span>{uiText.newProject}</span>
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
