import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { routeCatalog } from "../app/routeCatalog";
import { WingmanGuruDrawer } from "../components/WingmanGuruDrawer";
import { WingmanGuruFab } from "../components/WingmanGuruFab";

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="wingman-shell">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-3xl wingman-panel p-5 lg:block">
          <div className="border-b border-white/10 pb-5">
            <p className="wingman-kicker">WyreStorm</p>
            <h1 className="wingman-display mt-2 text-4xl text-white">Wingman</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Fast pre-sales technical assistant for distributor sales teams.
            </p>
          </div>

          <nav className="mt-5 space-y-2">
            {routeCatalog.map(({ path, navLabel, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "border-orange-400/50 bg-orange-500/12 text-orange-100 shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_0_30px_rgba(251,146,60,0.24)]"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{navLabel}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 rounded-3xl wingman-panel p-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="wingman-kicker">WyreStorm</p>
                <p className="mt-1 text-lg font-semibold text-white">Wingman navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen((current) => !current)}
                className="rounded-full border border-white/15 bg-white/5 p-3 text-white transition hover:bg-white/10"
                aria-label={mobileNavOpen ? "Close Wingman navigation" : "Open Wingman navigation"}
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {mobileNavOpen ? (
              <nav className="mt-4 grid gap-2">
                {routeCatalog.map(({ path, navLabel, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      [
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all",
                        isActive
                          ? "border-orange-400/50 bg-orange-500/12 text-orange-100"
                          : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
                      ].join(" ")
                    }
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {navLabel}
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Open</span>
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>

          {children ?? <Outlet />}
        </main>
      </div>

      <WingmanGuruFab open={guruOpen} onClick={() => setGuruOpen((current) => !current)} />
      <WingmanGuruDrawer open={guruOpen} onClose={() => setGuruOpen(false)} />
    </div>
  );
}

export default AppShell;
