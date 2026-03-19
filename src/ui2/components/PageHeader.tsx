import * as React from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  right?: React.ReactNode; // optional extra right-side content
  className?: string;
};

export default function PageHeader({ title, subtitle, actions, right, className }: Props) {
  return (
    <div className={["wm-pagehead", "wm-page-intro", className].filter(Boolean).join(" ")}>
      <div className="wm-pagehead__left wm-page-intro__main">
        <div className="wm-h1 wm-page-intro__title">{title}</div>
        {subtitle ? <div className="wm-lead wm-page-intro__copy">{subtitle}</div> : null}
      </div>

      {(actions || right) ? (
        <div className="wm-pagehead__actions wm-page-intro__actions">
          {actions}
          {right}
        </div>
      ) : null}
    </div>
  );
}
