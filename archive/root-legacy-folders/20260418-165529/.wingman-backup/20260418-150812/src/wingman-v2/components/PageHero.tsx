type PageHeroProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  nextMove: string;
};

export function PageHero({ eyebrow, title, purpose, nextMove }: PageHeroProps) {
  return (
    <div className="mb-8 rounded-3xl wingman-panel wingman-grid p-8 lg:p-10">
      <p className="wingman-kicker">{eyebrow}</p>

      <h1 className="wingman-display mt-3 max-w-5xl text-4xl font-medium text-white lg:text-6xl">
        {title}
      </h1>

      <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
        {purpose}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-sm font-medium text-slate-100">
          <span className="mr-2 uppercase tracking-[0.18em] text-slate-400">Next move</span>
          {nextMove}
        </p>
      </div>
    </div>
  );
}