import * as React from "react";

type PageFrameProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageFrame({
  title,
  subtitle,
  actions,
  aside,
  children,
}: PageFrameProps) {
  return (
    <div className="wm-page">
      <div className="wm-page__header">
        <div className="wm-page__heading">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="wm-page__actions">{actions}</div> : null}
      </div>

      {aside ? <div className="wm-page__aside">{aside}</div> : null}

      <div className="wm-page__body">{children}</div>
    </div>
  );
}