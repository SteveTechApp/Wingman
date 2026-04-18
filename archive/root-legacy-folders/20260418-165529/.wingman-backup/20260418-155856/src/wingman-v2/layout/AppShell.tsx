import type { ReactNode } from "react";
import {
  ClipboardList,
  FileText,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  Scale,
  Search,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

type AppShellProps = {
  children?: ReactNode;
};

const navItems = [
  { to: "/wingman/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wingman/projects", label: "Project Management", icon: FolderKanban },
  { to: "/wingman/discovery", label: "Discovery", icon: ClipboardList },
  { to: "/wingman/finder", label: "Product Finder", icon: Search },
  { to: "/wingman/compare", label: "Competitor Compare", icon: Scale },
  { to: "/wingman/templates", label: "Room Templates", icon: LayoutTemplate },
  { to: "/wingman/ingest", label: "Document Ingest", icon: FileUp },
  { to: "/wingman/proposal", label: "Proposal Builder", icon: FileText },
  { to: "/wingman/support", label: "Support", icon: LifeBuoy },
];

export function AppShell({ children }: AppShellProps) {
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
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
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
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

export default AppShell;
