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
    <div className={["wm-pagehead", className].filter(Boolean).join(" ")}>
      <div className="wm-pagehead__left">
        <div className="wm-h1">{title}</div>
        {subtitle ? <div className="wm-lead">{subtitle}</div> : null}
      </div>

      {(actions || right) ? (
        <div className="wm-pagehead__actions">
          {actions}
          {right}
        </div>
      ) : null}
    </div>
  );
}