import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Brain,
  FileUp,
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
  icon: typeof Grid2x2;
};

const items: NavItem[] = [
  { label: "Tool Hub", route: "/app/tools", icon: LayoutPanelTop },
  { label: "Catalogue", route: "/app/tools/catalog", icon: Grid2x2 },
  { label: "Competitor Compare", route: "/app/tools/compare", icon: Trophy },
  { label: "Video Wall", route: "/app/tools/video-wall", icon: LayoutPanelTop },
  { label: "Import Customer Brief", route: "/app/tools/import-intake", icon: FileUp },
  { label: "Product Intelligence", route: "/app/tools/product-intelligence", icon: Brain },
  { label: "Sales Positioning", route: "/app/tools/sales", icon: ShieldCheck },
  { label: "Training Hub", route: "/app/tools/training", icon: BookOpen },
  { label: "Guru", route: "/app/tools/guru", icon: Wand2 },
];

export default function MissionControlNav() {
  return (
    <aside className="wm-sidebar" aria-label="Primary navigation">
      <div className="wm-sidebar__inner">
        <div className="wm-sidebar__sectionLabel">Workspace</div>

        <nav className="wm-sidebar__nav">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.route}
                to={item.route}
                end={item.route === "/app/tools"}
                className={({ isActive }) =>
                  isActive ? "wm-sidebar__link wm-sidebar__link--active" : "wm-sidebar__link"
                }
              >
                <span className="wm-sidebar__icon">
                  <Icon size={16} strokeWidth={1.9} />
                </span>
                <span className="wm-sidebar__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="wm-sidebar__footer">
          <div className="wm-sidebar__helper">
            <Sparkles size={14} />
            <span>Wingman assistant ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
