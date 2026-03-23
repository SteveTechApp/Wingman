import React from "react";
import { WM, interactiveCardStyle } from "./wmTokens";

type WmCardProps = {
  title?: string;
  subtitle?: string;
  active?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function WmCard(props: WmCardProps) {
  const { title, subtitle, active, children, actions } = props;

  return (
    <article
      style={{
        ...interactiveCardStyle(active),
        padding: WM.spacing.lg,
        display: "grid",
        gap: WM.spacing.md
      }}
    >
      {(title || subtitle || actions) ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: WM.spacing.md,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            {title ? (
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div style={{ fontSize: 13, lineHeight: 1.55, color: WM.color.textSoft }}>
                {subtitle}
              </div>
            ) : null}
          </div>

          {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}

      {children}
    </article>
  );
}