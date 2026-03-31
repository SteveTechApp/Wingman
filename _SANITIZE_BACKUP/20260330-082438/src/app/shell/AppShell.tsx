import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

export default function AppShell() {
  return (
    <div className="wm-reference-shell">
      <TopBar />

      <div className="wm-reference-shell__body">
        <aside className="wm-reference-shell__nav">
          <MissionControlNav />
        </aside>

        <main className="wm-reference-shell__main">
          <div className="wm-reference-shell__stage">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
