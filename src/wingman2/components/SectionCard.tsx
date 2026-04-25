import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-section-card wingman-surface">
      <header className="wingman-section-card-header">
        <div>
          <p className="wingman-kicker">Wingman workspace</p>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        {rightSlot ? <div className="wingman-section-card-actions">{rightSlot}</div> : null}
      </header>

      <div className="wingman-section-card-body">{children}</div>
    </section>
  );
}