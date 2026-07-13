import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-section-card wingman-surface" data-wm-card-level="standard">
      <header className="wingman-section-card-header">
        <div>
          <p className="wingman-kicker">Wingman workspace</p>
          <div className="wingman-section-card-title-row">
            <div>
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            {subtitle ? (
              <details className="wingman-section-help">
                <summary aria-label={`About ${title}`}>
                  <HelpCircle className="h-4 w-4" />
                </summary>
                <div className="wingman-section-help-popover">
                  <p>{subtitle}</p>
                </div>
              </details>
            ) : null}
          </div>
        </div>

        {rightSlot ? <div className="wingman-section-card-actions">{rightSlot}</div> : null}
      </header>

      <div className="wingman-section-card-body">{children}</div>
    </section>
  );
}
