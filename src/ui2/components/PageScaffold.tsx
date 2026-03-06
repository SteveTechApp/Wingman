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
    <div
      className="wm-page wm-animate-in"
      style={{
        width: "100%",
        maxWidth: "none",
        margin: 0,
        minWidth: 0,
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          {eyebrow ? <div className="wm-page-eyebrow">{eyebrow}</div> : null}

          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            {title}
          </h1>

          {intro ? (
            <div
              style={{
                maxWidth: 760,
                fontSize: 14,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.45,
              }}
            >
              {intro}
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
}