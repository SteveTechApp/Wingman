import React from "react";
import { WM, sectionPanelStyle } from "./wmTokens";

type WmSectionProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function WmSection(props: WmSectionProps) {
  const { title, subtitle, actions, children } = props;

  return (
    <section
      style={{
        ...sectionPanelStyle(),
        padding: WM.spacing.lg,
        display: "grid",
        gap: WM.spacing.lg
      }}
    >
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
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.15,
              letterSpacing: "-0.02em"
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: WM.color.textSoft
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>

      <div style={{ display: "grid", gap: WM.spacing.md }}>
        {children}
      </div>
    </section>
  );
}