import type { ReactNode } from "react";

type WingmanPageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  support?: ReactNode;
  className?: string;
};

export function WingmanPageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  support,
  className = ""
}: WingmanPageHeroProps) {
  const classes = ["wm-page-hero", className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <div className="wm-page-hero__copy">
        {eyebrow ? <p className="wm-page-hero__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="wm-page-hero__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="wm-page-hero__actions">{actions}</div> : null}
      {support ? <div className="wm-page-hero__support">{support}</div> : null}
    </header>
  );
}