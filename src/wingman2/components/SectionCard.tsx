import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-section-card wingman-surface wm-balanced-section-card">
      <header className="wm-balanced-section-card-header">
        <div className="wm-balanced-section-card-copy">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        {rightSlot ? <div className="wm-balanced-section-card-actions">{rightSlot}</div> : null}
      </header>

      <div className="wm-balanced-section-card-body">{children}</div>
    </section>
  );
}
