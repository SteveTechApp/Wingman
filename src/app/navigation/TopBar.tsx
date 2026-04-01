import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import WingmanBrand from "@/app/branding/WingmanBrand";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/app/dashboard": {
    title: "Mission Control",
    subtitle: "Clear inputs, live outputs, and visual decision support.",
  },
  "/app/projects": {
    title: "Projects",
    subtitle: "Active work, recent proposals, and next actions.",
  },
  "/app/tools": {
    title: "Tools",
    subtitle: "Compact workspace with visible input, output, and guidance.",
  },
  "/app/tools/guru": {
    title: "Guru",
    subtitle: "Question on the left. Answer on the right.",
  },
};

export default function TopBar() {
  const location = useLocation();

  const meta = useMemo(() => {
    return (
      titleMap[location.pathname] ?? {
        title: "Wingman Workspace",
        subtitle: "Clear inputs, live outputs, and visual decision support.",
      }
    );
  }, [location.pathname]);

  return (
    <header className="wm-topbar wm-topbar--compact">
      <div className="wm-topbar__brand-slot">
        <WingmanBrand compact={false} subtitle={meta.subtitle} />
      </div>

      <div className="wm-topbar__heading">
        <div className="wm-topbar__kicker">Workspace</div>
        <h1 className="wm-topbar__title">{meta.title}</h1>
      </div>
    </header>
  );
}