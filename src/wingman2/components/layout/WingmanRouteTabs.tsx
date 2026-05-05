import type { ReactNode } from "react";

type WingmanRouteTab = {
  key: string;
  label: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
};

type WingmanRouteTabsProps = {
  tabs: WingmanRouteTab[];
  className?: string;
};

export function WingmanRouteTabs({ tabs, className = "" }: WingmanRouteTabsProps) {
  const classes = ["wm-route-tabs-clean", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label="Wingman page sections">
      {tabs.map((tab) => {
        const content: ReactNode = (
          <>
            <span>{tab.label}</span>
            {tab.description ? <small>{tab.description}</small> : null}
          </>
        );

        if (tab.href) {
          return (
            <a
              key={tab.key}
              href={tab.href}
              className={tab.active ? "is-active" : ""}
              aria-current={tab.active ? "page" : undefined}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={tab.key}
            type="button"
            className={tab.active ? "is-active" : ""}
            aria-pressed={tab.active}
            onClick={tab.onClick}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}