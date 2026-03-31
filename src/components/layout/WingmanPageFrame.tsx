import type { PropsWithChildren, ReactNode } from "react";

type WingmanPageFrameProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
}>;

export function WingmanPageFrame({
  eyebrow,
  title,
  description,
  actions,
  stats,
  children,
}: WingmanPageFrameProps) {
  return (
    <div className="wm-frame">
      <section className="wm-frame__hero">
        <div className="wm-frame__hero-main">
          {eyebrow ? <div className="wm-frame__eyebrow">{eyebrow}</div> : null}
          <h1 className="wm-frame__title">{title}</h1>
          {description ? <p className="wm-frame__description">{description}</p> : null}
        </div>

        {actions ? <div className="wm-frame__actions">{actions}</div> : null}
      </section>

      {stats ? <section className="wm-frame__stats">{stats}</section> : null}

      <div className="wm-frame__body">
        {children}
      </div>
    </div>
  );
}

type WingmanSectionProps = PropsWithChildren<{
  title?: string;
  description?: string;
  actions?: ReactNode;
}>;

export function WingmanSection({
  title,
  description,
  actions,
  children,
}: WingmanSectionProps) {
  return (
    <section className="wm-block">
      {(title || description || actions) ? (
        <div className="wm-block__header">
          <div className="wm-block__header-copy">
            {title ? <h2 className="wm-block__title">{title}</h2> : null}
            {description ? <p className="wm-block__description">{description}</p> : null}
          </div>
          {actions ? <div className="wm-block__actions">{actions}</div> : null}
        </div>
      ) : null}

      <div className="wm-block__body">{children}</div>
    </section>
  );
}

type WingmanStatProps = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
};

export function WingmanStat({ label, value, meta }: WingmanStatProps) {
  return (
    <div className="wm-stat-card">
      <div className="wm-stat-card__label">{label}</div>
      <div className="wm-stat-card__value">{value}</div>
      {meta ? <div className="wm-stat-card__meta">{meta}</div> : null}
    </div>
  );
}
