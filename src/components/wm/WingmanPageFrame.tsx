import type { ReactNode } from "react";

type WingmanPageFrameProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
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
  toolbar,
  children,
  className,
}: WingmanPageFrameProps) {
  return (
    <div className={cx("wm-page-frame", className)}>
      <header className="wm-page-header">
        <div className="wm-page-header__top">
          <div className="wm-stack-sm">
            {eyebrow ? <div className="wm-page-header__eyebrow">{eyebrow}</div> : null}
            <div className="wm-stack-xs">
              <h1 className="wm-page-title">{title}</h1>
              {subtitle ? <p className="wm-page-subtitle">{subtitle}</p> : null}
            </div>
          </div>

          {actions ? <div className="wm-page-header__actions">{actions}</div> : null}
        </div>

        {toolbar ? <div className="wm-page-toolbar">{toolbar}</div> : null}
      </header>

      {children}
    </div>
  );
}