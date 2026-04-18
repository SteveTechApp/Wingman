import type { CSSProperties, ReactNode } from "react";

type PageFrameProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  maxWidth?: number | string;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
};

type PageSectionProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanPageFrame({
  eyebrow,
  title,
  subtitle,
  actions,
  stats,
  aside,
  children,
  maxWidth = 1720,
  className,
  bodyClassName,
  contentClassName,
}: PageFrameProps) {
  const style = {
    "--wm-page-max-width": typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
  } as CSSProperties;

  return (
    <div className={cx("wm-page-frame", className)} style={style}>
      <div className="wm-page-frame__inner">
        <header className="wm-page-frame__header">
          <div className="wm-page-frame__header-main">
            {eyebrow ? <div className="wm-page-frame__eyebrow">{eyebrow}</div> : null}
            <div className="wm-page-frame__title">{title}</div>
            {subtitle ? <div className="wm-page-frame__subtitle">{subtitle}</div> : null}
          </div>

          {actions ? <div className="wm-page-frame__actions">{actions}</div> : null}
        </header>

        {stats ? <div className="wm-page-frame__stats">{stats}</div> : null}

        <div className={cx("wm-page-frame__body", bodyClassName)}>
          <main className={cx("wm-page-frame__content", contentClassName)}>{children}</main>
          {aside ? <aside className="wm-page-frame__aside">{aside}</aside> : null}
        </div>
      </div>
    </div>
  );
}

export function WingmanPageSection({
  title,
  subtitle,
  actions,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cx("wm-page-section", className)}>
      {title || subtitle || actions ? (
        <div className="wm-page-section__header">
          <div className="wm-page-section__heading">
            {title ? <div className="wm-page-section__title">{title}</div> : null}
            {subtitle ? <div className="wm-page-section__subtitle">{subtitle}</div> : null}
          </div>

          {actions ? <div className="wm-page-section__actions">{actions}</div> : null}
        </div>
      ) : null}

      <div className="wm-page-section__body">{children}</div>
    </section>
  );
}