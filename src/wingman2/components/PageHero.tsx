import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type PageHeroAction = {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
};

type PageHeroProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  nextMove: string;
  actions?: PageHeroAction[];
};

export function PageHero({ eyebrow, title, purpose, nextMove, actions }: PageHeroProps) {
  return (
    <div className="mb-8 rounded-3xl wingman-panel wingman-grid p-8 lg:p-10">
      <p className="wingman-kicker">{eyebrow}</p>

      <h1 className="wingman-display mt-3 max-w-5xl text-4xl font-medium text-white lg:text-6xl">
        {title}
      </h1>

      <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{purpose}</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-sm font-medium text-slate-100">
          <span className="mr-2 uppercase tracking-[0.18em] text-slate-400">Next move</span>
          {nextMove}
        </p>
      </div>

      {actions?.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                action.variant === "secondary"
                  ? "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
                  : "bg-orange-400 text-slate-950 hover:bg-orange-300",
              ].join(" ")}
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
