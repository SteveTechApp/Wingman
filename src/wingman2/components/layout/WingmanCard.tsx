import type { ReactNode } from "react";

type WingmanCardProps = {
  title?: string;
  subtitle?: string;
  meta?: string;
  children?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  className?: string;
};

export function WingmanCard({
  title,
  subtitle,
  meta,
  children,
  actions,
  selected = false,
  className = ""
}: WingmanCardProps) {
  const classes = ["wm-card", selected ? "wm-card--selected" : "", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {meta ? <p className="wm-card__meta">{meta}</p> : null}
      {title ? <h3>{title}</h3> : null}
      {subtitle ? <p className="wm-card__subtitle">{subtitle}</p> : null}
      {children ? <div className="wm-card__body">{children}</div> : null}
      {actions ? <div className="wm-card__actions">{actions}</div> : null}
    </article>
  );
}