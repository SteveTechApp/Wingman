import * as React from "react";

type PageScaffoldProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
};

export default function PageScaffold({
  eyebrow,
  title,
  intro,
  children,
}: PageScaffoldProps) {
  return (
    <div className="wm-page wm-animate-in">
      <div className="wm-section-stack">
        <div className="wm-page-intro">
          <div className="wm-page-intro__main">
          {eyebrow ? <div className="wm-page-eyebrow">{eyebrow}</div> : null}

            <h1 className="wm-page-title">
            {title}
          </h1>

          {intro ? (
              <div className="wm-page-intro__copy">
              {intro}
              </div>
          ) : null}
        </div>
        </div>

        {children}
      </div>
    </div>
  );
}
