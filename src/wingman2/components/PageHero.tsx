import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type PageHeroAction = {
  label: string;
  to?: string;
  onClick?: () => void;
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  nextMove: string;
  actions?: PageHeroAction[];
};

// Every hero action inherits the panel's button styling: the old primary and
// secondary modifier classes never had a rule, so they only split the markup.

export function PageHero({ title, purpose, nextMove, actions }: PageHeroProps) {
  return (
    <section
      className="wm-page-hero wingman-page-hero wingman-panel"
    >
      <div>
        <h1 className="wingman-display">{title}</h1>
        <details className="wingman-page-help"><summary>About this page</summary><p>{purpose}</p><p>{nextMove}</p></details>
      </div>

      {actions?.length ? (
        <div>
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to} className="wingman-hero-action">
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="wingman-hero-action"
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
