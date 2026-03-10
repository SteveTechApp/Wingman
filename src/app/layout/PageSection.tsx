import * as React from "react";

type PageSectionProps = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
};

export default function PageSection({
  title,
  subtitle,
  right,
  children,
  compact = false,
}: PageSectionProps) {
  return (
    <section className={"wm-section" + (compact ? " wm-section--compact" : "")}>
      {(title || subtitle || right) ? (
        <div className="wm-section__head">
          <div className="wm-section__titles">
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {right ? <div className="wm-section__right">{right}</div> : null}
        </div>
      ) : null}
      <div className="wm-section__body">{children}</div>
    </section>
  );
}