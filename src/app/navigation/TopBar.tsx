import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useBoundActiveProjectName } from "@/core/wingman/storeBridge";
import { brand } from "@/branding/brand";

function LogoMark() {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div className="wm-topbar__wordmark">
        <div className="wm-topbar__wordmark-main">WyreStorm</div>
        <div className="wm-topbar__wordmark-sub">Wingman</div>
      </div>
    );
  }

  return (
    <img
      src={brand.logo}
      alt={brand.fullName}
      onError={() => setFailed(true)}
      className="wm-topbar__logo"
    />
  );
}

type TopBarProps = {
  showMobileMenu?: boolean;
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
  onOpenCommandPalette?: () => void;
};

export default function TopBar({
  showMobileMenu = false,
  mobileNavOpen = false,
  onToggleMobileNav,
  onOpenCommandPalette,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectName = useBoundActiveProjectName();

  const navItems = [
    { label: "Home", to: WM_ROUTES.dashboard },
    { label: "Projects", to: WM_ROUTES.projects },
    { label: "Tools", to: WM_ROUTES.tools },
  ];

  return (
    <header
      className="wm-topbar"
      
    >
      <div className="wm-topbar__brand-row">
        {showMobileMenu ? (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="wm-topbar__menu-btn"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => navigate(WM_ROUTES.dashboard)}
          className="wm-topbar__brand-btn"
          title="Go to Dashboard"
          
        >
          <LogoMark />
        </button>
      </div>

      <div
        className="wm-input-shell wm-topbar__project-pill"
        title={`Active project: ${activeProjectName}`}
        aria-label={`Active project: ${activeProjectName}`}
        
      >
        <strong
          className="wm-topbar__project-text"
        >
          {activeProjectName}
        </strong>
      </div>

      <div className="wm-topbar__actions">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="wm-btn-nav wm-topbar__command-btn"
          aria-label="Open command palette"
          
        >
          <Search size={14} />
          <span>Quick Find</span>
          {!showMobileMenu ? <kbd className="wm-topbar__command-kbd">Ctrl+K</kbd> : null}
        </button>

        {!showMobileMenu
          ? navItems.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`wm-btn-nav${active ? " is-active" : ""}`}
                  
                >
                  {item.label}
                </button>
              );
            })
          : null}

        <button
          type="button"
          onClick={() => navigate(WM_ROUTES.newProject)}
          className="wm-btn-nav wm-btn-nav--primary"
          
        >
          + New Project
        </button>
      </div>
    </header>
  );
}
