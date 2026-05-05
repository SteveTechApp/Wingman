import type { ReactNode } from "react";

type WingmanFilterBarProps = {
  children: ReactNode;
  title?: string;
  className?: string;
};

export function WingmanFilterBar({
  children,
  title,
  className = ""
}: WingmanFilterBarProps) {
  const classes = ["wm-filter-bar", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {title ? <p className="wm-filter-bar__title">{title}</p> : null}
      <div className="wm-filter-bar__controls">{children}</div>
    </section>
  );
}