import * as React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import GuruFab from "@/features/ai/guru/GuruFab";
import GuruHelperWindow from "@/features/ai/guru/GuruHelperWindow";

export default function AppShell() {
  const [guruOpen, setGuruOpen] = React.useState(false);
  const [guruMinimized, setGuruMinimized] = React.useState(false);

  const handleToggleGuru = React.useCallback(() => {
    if (!guruOpen) {
      setGuruOpen(true);
      setGuruMinimized(false);
      return;
    }

    if (guruMinimized) {
      setGuruMinimized(false);
      return;
    }

    setGuruMinimized(true);
  }, [guruOpen, guruMinimized]);

  return (
    <div className="wm-shell-root">
      <TopBar />

      <div className="wm-shell-grid">
        <aside className="wm-shell-nav-column">
          <MissionControlNav />
        </aside>

        <main className="wm-app-main">
          <Outlet />
        </main>
      </div>

      <GuruHelperWindow
        open={guruOpen}
        minimized={guruMinimized}
        onClose={() => {
          setGuruOpen(false);
          setGuruMinimized(false);
        }}
        onMinimize={() => {
          setGuruOpen(true);
          setGuruMinimized(true);
        }}
      />

      <GuruFab
        open={guruOpen}
        minimized={guruMinimized}
        onToggle={handleToggleGuru}
      />
    </div>
  );
}