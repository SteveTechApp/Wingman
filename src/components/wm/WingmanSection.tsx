import type { ReactNode } from "react";

type WingmanSectionProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  brand?: boolean;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function WingmanSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  brand = false,
  className,
}: WingmanSectionProps) {
  return (
    <section className={cx("wm-section", brand && "wm-panel--brand", className)}>
      <div className="wm-section__header">
        <div className="wm-section__heading">
          {eyebrow ? <p className="wm-section__eyebrow">{eyebrow}</p> : null}
          <h2 className="wm-section__title">{title}</h2>
          {description ? <p className="wm-section__description">{description}</p> : null}
        </div>

        {actions ? <div className="wm-section__actions">{actions}</div> : null}
      </div>

      <div className="wm-section__body">{children}</div>
    </section>
  );
}