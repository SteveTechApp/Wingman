import React from "react";
import { WM, pageBackgroundStyle } from "./wmTokens";

type WmPageProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function WmPage(props: WmPageProps) {
  const { title, subtitle, eyebrow, actions, children } = props;

  return (
    <div style={pageBackgroundStyle()}>
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: `${WM.spacing.xl}px ${WM.spacing.xl}px ${WM.spacing.xxl}px`,
          display: "grid",
          gap: WM.spacing.xl
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: WM.spacing.lg,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            {eyebrow ? (
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: WM.color.textMute
                }}
              >
                {eyebrow}
              </div>
            ) : null}

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: "-0.03em"
              }}
            >
              {title}
            </h1>

            {subtitle ? (
              <p
                style={{
                  margin: 0,
                  maxWidth: 920,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: WM.color.textSoft
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
        </header>

        {children}
      </div>
    </div>
  );
}