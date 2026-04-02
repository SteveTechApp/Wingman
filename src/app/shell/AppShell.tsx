import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";

export default function AppShell() {
  return (
    <div className="wm-shell-root">
      <TopBar />
      <div className="wm-shell-body">
        <MissionControlNav />
        <main className="wm-main" role="main">
          <div className="wm-main__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}