import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  FileText,
  LayoutTemplate,
  Network,
  Radar,
  ScanSearch,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  label: string;
  route: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { label: "Discovery", route: "/app/tools/discovery", icon: ScanSearch },
  { label: "Room Definition", route: "/app/tools/room-wizard", icon: LayoutTemplate },
  { label: "Tech Selection", route: "/app/tools/navigator", icon: Radar },
  { label: "Product Selection", route: "/app/tools/catalog", icon: Boxes },
  { label: "System Architecture", route: "/app/dashboard", icon: Network },
  { label: "Bill of Materials", route: "/app/tools/proposal", icon: ClipboardList },
  { label: "Proposal Output", route: "/app/tools/proposal", icon: FileText },
];

export default function MissionControlNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="wm-reference-nav" aria-label="Wingman workflow">
      {items.map((item) => {
        const active =
          location.pathname === item.route ||
          location.pathname.startsWith(item.route + "/");
        const Icon = item.icon;

        return (
          <button
            key={item.route + item.label}
            type="button"
            className={`wm-reference-nav__item${active ? " wm-reference-nav__item--active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => navigate(item.route)}
          >
            <span className="wm-reference-nav__item-icon">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className="wm-reference-nav__item-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
