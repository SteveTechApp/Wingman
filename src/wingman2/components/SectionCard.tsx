import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-surface rounded-3xl p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="wingman-kicker">Wingman workspace</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  );
}
