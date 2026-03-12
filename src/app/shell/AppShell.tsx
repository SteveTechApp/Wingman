import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import TopBar from "@/app/navigation/TopBar";
import WingmanCommandPalette from "@/app/navigation/WingmanCommandPalette";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import AppFooter from "@/app/layout/AppFooter";
import GuruFloatingHelper from "@/features/guru/GuruPage";

type ShellTone = {
  key: string;
  accentRgb: string;
  secondaryRgb: string;
  canvasFrom: string;
  canvasTo: string;
};

const DEFAULT_SHELL_TONE: ShellTone = {
  key: "default",
  accentRgb: "101, 185, 255",
  secondaryRgb: "90, 217, 184",
  canvasFrom: "#102436",
  canvasTo: "#0c1d2f",
};

function resolveShellTone(pathname: string): ShellTone {
  const normalized = pathname.toLowerCase();

  if (normalized.includes("/tools/import") || normalized.includes("/tools/import-intake")) {
    return {
      key: "import",
      accentRgb: "85, 199, 255",
      secondaryRgb: "95, 223, 194",
      canvasFrom: "#12283d",
      canvasTo: "#102236",
    };
  }

  if (normalized.includes("/tools/discovery")) {
    return {
      key: "discovery",
      accentRgb: "104, 220, 141",
      secondaryRgb: "90, 190, 255",
      canvasFrom: "#122d36",
      canvasTo: "#0f2231",
    };
  }

  if (normalized.includes("/tools/catalog")) {
    return {
      key: "catalog",
      accentRgb: "89, 168, 255",
      secondaryRgb: "114, 223, 255",
      canvasFrom: "#132740",
      canvasTo: "#0f2137",
    };
  }

  if (normalized.includes("/tools/compare")) {
    return {
      key: "compare",
      accentRgb: "255, 168, 96",
      secondaryRgb: "255, 115, 88",
      canvasFrom: "#2b2232",
      canvasTo: "#1f1c2b",
    };
  }

  if (normalized.includes("/tools/video-wall")) {
    return {
      key: "video-wall",
      accentRgb: "99, 206, 196",
      secondaryRgb: "109, 182, 255",
      canvasFrom: "#112a38",
      canvasTo: "#0f2232",
    };
  }

  if (normalized.includes("/tools/proposal")) {
    return {
      key: "proposal",
      accentRgb: "255, 177, 113",
      secondaryRgb: "255, 214, 128",
      canvasFrom: "#2b2633",
      canvasTo: "#211f2c",
    };
  }

  if (normalized.includes("/tools/product-intelligence")) {
    return {
      key: "product-intelligence",
      accentRgb: "127, 172, 255",
      secondaryRgb: "109, 223, 212",
      canvasFrom: "#17253c",
      canvasTo: "#131f31",
    };
  }

  if (normalized.includes("/tools/competitor-lookup-diagnostics")) {
    return {
      key: "lookup-admin",
      accentRgb: "252, 160, 95",
      secondaryRgb: "255, 203, 126",
      canvasFrom: "#302232",
      canvasTo: "#241f2d",
    };
  }

  if (normalized.includes("/tools/training")) {
    return {
      key: "training",
      accentRgb: "119, 202, 255",
      secondaryRgb: "141, 225, 158",
      canvasFrom: "#172d39",
      canvasTo: "#132632",
    };
  }

  if (normalized.includes("/tools") || normalized.includes("/dashboard")) {
    return {
      key: "workspace",
      accentRgb: "89, 190, 255",
      secondaryRgb: "102, 221, 185",
      canvasFrom: "#112739",
      canvasTo: "#0f2234",
    };
  }

  return DEFAULT_SHELL_TONE;
}

export default function AppShell() {
  const location = useLocation();
  const shellTone = React.useMemo(() => resolveShellTone(location.pathname), [location.pathname]);
  const shellToneStyle = React.useMemo(
    () =>
      ({
        "--wm-tool-accent-rgb": shellTone.accentRgb,
        "--wm-tool-secondary-rgb": shellTone.secondaryRgb,
        "--wm-tool-canvas-from": shellTone.canvasFrom,
        "--wm-tool-canvas-to": shellTone.canvasTo,
      }) as React.CSSProperties,
    [shellTone],
  );
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("wm_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      const matches = query.matches;
      setIsMobileViewport(matches);
      if (!matches) {
        setMobileNavOpen(false);
      }
    };

    apply();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", apply);
      return () => query.removeEventListener("change", apply);
    }

    query.addListener(apply);
    return () => query.removeListener(apply);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("wm_nav_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  React.useEffect(() => {
    if (isMobileViewport) {
      setMobileNavOpen(false);
    }
    setCommandPaletteOpen(false);
  }, [isMobileViewport, location.pathname]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((value) => !value);
        return;
      }

      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navCollapsed = isMobileViewport ? false : collapsed;

  return (
    <div className="wm-shell-root" data-wm-tone={shellTone.key} style={shellToneStyle}>
      <TopBar
        showMobileMenu={isMobileViewport}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((value) => !value)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <div className={`wm-shell-body${mobileNavOpen ? " is-mobile-nav-open" : ""}`}>
        <button
          type="button"
          className={`wm-shell-backdrop${mobileNavOpen ? " is-visible" : ""}`}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />

        <aside
          className={`wm-shell-nav${navCollapsed ? " is-collapsed" : ""}${mobileNavOpen ? " is-mobile-open" : ""}`}
        >
          <MissionControlNav
            collapsed={navCollapsed}
            onToggleCollapse={() => {
              if (isMobileViewport) {
                setMobileNavOpen(false);
                return;
              }
              setCollapsed((v) => !v);
            }}
          />
        </aside>

        <main className="wm-shell-main wm-scrollbar-thin">
          <div className="wm-shell-content">
            <Outlet />
          </div>
        </main>
      </div>

      <AppFooter />
      <GuruFloatingHelper />
      <WingmanCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
