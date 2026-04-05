import "./mission-control-nav.css";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Boxes,
  FileInput,
  Grid2x2,
  LayoutPanelTop,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";

type NavItem = {
  label: string;
  route: string;
  icon: typeof LayoutPanelTop;
};

const navItems: NavItem[] = [
  { label: "Tool Hub", route: "/app/tools", icon: LayoutPanelTop },
  { label: "Catalogue", route: "/app/tools/catalog", icon: Grid2x2 },
  { label: "Competitor Compare", route: "/app/tools/compare", icon: Trophy },
  { label: "Video Wall", route: "/app/tools/video-wall", icon: Boxes },
  { label: "Import Customer Brief", route: "/app/tools/import-intake", icon: FileInput },
  { label: "Product Intelligence", route: "/app/tools/product-intelligence", icon: ShieldCheck },
  { label: "Sales Positioning", route: "/app/tools/sales-positioning", icon: Sparkles },
  { label: "Training Hub", route: "/app/tools/training", icon: BookOpen },
  { label: "Guru", route: "/app/tools/guru", icon: Wand2 },
];

export default function MissionControlNav() {
  return (
    <nav className="wm-mission-control" aria-label="Primary">
      <div className="wm-mission-control__row">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.route}
              to={item.route}
              className={({ isActive }) =>
                "wm-mission-control__link" + (isActive ? " is-active" : "")
              }
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="wm-mission-control__status">
        <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
        <span>Wingman assistant ready</span>
      </div>
    </nav>
  );
}