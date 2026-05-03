import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-section-card wingman-surface wm-micro-section-card">
      <header className="wm-micro-section-card-header">
        <h2 title={title}>{title}</h2>
        {rightSlot ? <div className="wm-micro-section-card-actions">{rightSlot}</div> : null}
      </header>

      <div className="wm-micro-section-card-body">{children}</div>
    </section>
  );
}