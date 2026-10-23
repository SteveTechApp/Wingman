import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  showHelp?: boolean;
  /**
   * DOM id and focus target when a link names this panel. The card is then a
   * labelled region that can take focus, so a deep link lands inside the panel
   * instead of at the top of the page.
   */
  anchorId?: string;
};

export function SectionCard({ title, subtitle, children, rightSlot, showHelp = true, anchorId }: SectionCardProps) {
  return (
    <section
      id={anchorId}
      tabIndex={anchorId ? -1 : undefined}
      aria-label={anchorId ? title : undefined}
      className="wingman-section-card wingman-surface"
      data-wm-card-level="standard"
    >
      <header className="wingman-section-card-header">
        <div>
          <div className="wingman-section-card-title-row">
            <div>
              <h2>{title}</h2>
            </div>
            {subtitle && showHelp ? (
              <details className="wingman-section-help">
                <summary aria-label={`About ${title}`}>
                  <HelpCircle className="h-4 w-4" />
                </summary>
                <div>
                  <p>{subtitle}</p>
                </div>
              </details>
            ) : null}
          </div>
        </div>

        {rightSlot ? <div>{rightSlot}</div> : null}
      </header>

      <div className="wingman-section-card-body">{children}</div>
    </section>
  );
}
