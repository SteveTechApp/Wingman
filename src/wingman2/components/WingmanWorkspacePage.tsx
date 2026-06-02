import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export type WingmanWorkspacePageProps = {
  badge: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  after?: ReactNode;
  actions?: ReactNode;
  context?: ReactNode;
};

export function WingmanWorkspacePage({
  badge,
  title,
  subtitle,
  children,
  after,
  actions,
  context,
}: WingmanWorkspacePageProps) {
  return (
    <main className="wm20-page wm-ui-page" data-wingman-ui-system="workspace" data-wingman-short-workflow="true">

      <section className="wm20-panel wm-ui-shell">
        <header className="wm-ui-header">
          <div className="wm-ui-header-copy">
            <div className="wm20-badge wm-ui-badge">
              <Sparkles size={16} />
              {badge}
            </div>

            <h1>{title}</h1>
            <p className="wm20-subtitle">{subtitle}</p>
          </div>

          {actions ? <div className="wm-ui-actions">{actions}</div> : null}
        </header>

        {context ? <div className="wm-ui-context">{context}</div> : null}

        <div className="wm-ui-content" data-wingman-primary-workflow="true">
          {children}
        </div>
      </section>

      {after ? (
        <section className="wm-ui-after" data-wingman-support-details="true">
          <details className="wm-guided-support-details">
            <summary>
              <span>Need more detail?</span>
              <strong>Show supporting design reasoning, warnings and evidence</strong>
            </summary>

            <div className="wm-guided-support-body">{after}</div>
          </details>
        </section>
      ) : null}
    </main>
  );
}

export default WingmanWorkspacePage;