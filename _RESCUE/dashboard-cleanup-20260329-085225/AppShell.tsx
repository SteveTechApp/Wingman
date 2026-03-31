import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import FloatingGuru from "@/features/guru/FloatingGuru";

export default function AppShell() {
  return (
    <div className="wm-shell-root" data-shell="wingman">
      <TopBar />

      <div className="wm-shell-grid">
        <aside className="wm-shell-nav-column">
          <MissionControlNav />
        </aside>

        <main className="wm-app-main">
          <Outlet />
        </main>
      </div>

      <FloatingGuru />
    </div>
  );
}
