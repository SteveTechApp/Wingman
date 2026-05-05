import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type PageHeroAction = {
  label: string;
  to?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  nextMove: string;
  actions?: PageHeroAction[];
};

function actionClass(variant: PageHeroAction["variant"]) {
  return [
    "wm-balanced-hero-action",
    variant === "secondary" ? "wm-balanced-hero-action-secondary" : "wm-balanced-hero-action-primary",
  ].join(" ");
}

export function PageHero({ eyebrow, title, purpose, actions }: PageHeroProps) {
  return (
    <section className="wm-balanced-page-hero wingman-panel" aria-label={`${eyebrow}: ${title}`}>
      <div className="wm-balanced-hero-copy">
        <p className="wm-balanced-hero-kicker">{eyebrow}</p>
        <h1 className="wm-balanced-hero-title">{title}</h1>
        <p className="wm-balanced-hero-purpose">{purpose}</p>
      </div>

      {actions?.length ? (
        <div className="wm-balanced-hero-actions">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to} className={actionClass(action.variant)}>
                {action.label}
                <ArrowRight className="wm-balanced-hero-action-icon" />
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={actionClass(action.variant)}
              >
                {action.label}
                <ArrowRight className="wm-balanced-hero-action-icon" />
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
