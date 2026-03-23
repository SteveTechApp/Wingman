import React from "react";
import { WM, interactiveCardStyle, primaryButtonStyle, secondaryButtonStyle } from "./wmTokens";

type WmActionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  active?: boolean;
  meta?: string[];
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
};

export default function WmActionCard(props: WmActionCardProps) {
  const {
    eyebrow,
    title,
    description,
    active,
    meta,
    primaryLabel,
    secondaryLabel,
    onPrimaryClick,
    onSecondaryClick
  } = props;

  return (
    <article
      style={{
        ...interactiveCardStyle(active),
        padding: WM.spacing.lg,
        display: "grid",
        gap: WM.spacing.md,
        transform: active ? "translateY(-2px)" : "translateY(0)"
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

        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em" }}>
          {title}
        </div>

        {description ? (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: WM.color.textSoft }}>
            {description}
          </div>
        ) : null}
      </div>

      {Array.isArray(meta) && meta.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {meta.map((item) => (
            <span
              key={item}
              style={{
                borderRadius: WM.radius.pill,
                border: `1px solid ${WM.color.line}`,
                background: WM.color.panelSoft,
                padding: "6px 10px",
                fontSize: 12,
                color: WM.color.textSoft
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {(primaryLabel || secondaryLabel) ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {primaryLabel ? (
            <button type="button" style={primaryButtonStyle()} onClick={onPrimaryClick}>
              {primaryLabel}
            </button>
          ) : null}

          {secondaryLabel ? (
            <button type="button" style={secondaryButtonStyle()} onClick={onSecondaryClick}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}