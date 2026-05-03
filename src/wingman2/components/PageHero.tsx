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
    "wm-micro-hero-action",
    variant === "secondary" ? "wm-micro-hero-action-secondary" : "wm-micro-hero-action-primary",
  ].join(" ");
}

export function PageHero({ eyebrow, title, actions }: PageHeroProps) {
  return (
    <section className="wm-micro-page-hero" aria-label={`${eyebrow}: ${title}`} title={title}>
      <div className="wm-micro-page-hero-copy">
        <p className="wm-micro-page-kicker">{eyebrow}</p>
        <h1 className="wm-micro-page-title">{title}</h1>
      </div>

      {actions?.length ? (
        <div className="wm-micro-page-actions">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to} className={actionClass(action.variant)}>
                {action.label}
                <ArrowRight className="wm-micro-action-icon" />
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={actionClass(action.variant)}
              >
                {action.label}
                <ArrowRight className="wm-micro-action-icon" />
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}