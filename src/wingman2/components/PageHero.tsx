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
    "wingman-hero-action",
    variant === "secondary" ? "wingman-hero-action-secondary" : "wingman-hero-action-primary",
  ].join(" ");
}

export function PageHero({ eyebrow, title, purpose, nextMove, actions }: PageHeroProps) {
  return (
    <section className="wingman-page-hero wingman-page-hero-compact wingman-panel wingman-grid" aria-describedby="wingman-page-purpose">
      <div className="wingman-hero-copy">
        <p className="wingman-kicker">{eyebrow}</p>
        <h1 className="wingman-display">{title}</h1>
        <p id="wingman-page-purpose" className="wingman-hero-purpose">
          {purpose}
        </p>
        <p className="sr-only">Next move: {nextMove}</p>
      </div>

      {actions?.length ? (
        <div className="wingman-hero-actions">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to} className={actionClass(action.variant)}>
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={actionClass(action.variant)}
              >
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
