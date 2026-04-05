import "./topbar-logo-boost.css";
import { Bell, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import brandLogo from "@/assets/branding/wingman-brand-logo.png";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const pageLabel = (() => {
    const path = location.pathname || "";
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/projects")) return "Projects";
    if (path.includes("/proposal")) return "Proposal";
    if (path.includes("/catalog")) return "Catalogue";
    if (path.includes("/video-wall")) return "Video Wall";
    if (path.includes("/discovery")) return "Discovery";
    if (path.includes("/training")) return "Training Hub";
    if (path.includes("/guru")) return "Guru";
    return "Workspace";
  })();

  return (
    <header className="wm-topbar">
      <div className="wm-topbar-left">
        <button
          type="button"
          className="wm-topbar__brand"
          onClick={() => navigate("/app/dashboard")}
          aria-label="Go to dashboard"
        >
          <img
            src={brandLogo}
            alt="Wingman"
            className="wm-topbar__brand-logo wm-topbar-logo-boost"
            draggable={false}
          />
        </button>
      </div>

      <div className="wm-topbar-center">
        <div className="wm-topbar-page-pill">{pageLabel}</div>
      </div>

      <div className="wm-topbar-right">
        <button type="button" className="wm-topbar__iconButton" aria-label="Search">
          <Search size={16} />
        </button>

        <button type="button" className="wm-topbar__iconButton" aria-label="Notifications">
          <Bell size={16} />
        </button>

        <div className="wm-topbar__theme">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}