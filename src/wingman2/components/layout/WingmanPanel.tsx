import type { ReactNode } from "react";

type WingmanPanelTone = "default" | "muted" | "accent";

type WingmanPanelProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: WingmanPanelTone;
};

export function WingmanPanel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  tone = "default"
}: WingmanPanelProps) {
  const classes = ["wm-panel", `wm-panel--${tone}`, className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {title || subtitle || actions ? (
        <div className="wm-panel__head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="wm-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="wm-panel__body">{children}</div>
    </section>
  );
}