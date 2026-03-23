import React from "react";
import { WM } from "./wmTokens";

type WmChipTone = "default" | "primary" | "success" | "warning" | "gold" | "danger";

type WmChipProps = {
  label: string;
  tone?: WmChipTone;
};

function toneStyles(tone: WmChipTone): React.CSSProperties {
  switch (tone) {
    case "primary":
      return {
        borderColor: "rgba(66,182,255,0.30)",
        background: "rgba(66,182,255,0.14)",
        color: WM.color.text
      };
    case "success":
      return {
        borderColor: "rgba(61,220,151,0.30)",
        background: "rgba(61,220,151,0.14)",
        color: WM.color.text
      };
    case "warning":
      return {
        borderColor: "rgba(255,191,71,0.30)",
        background: "rgba(255,191,71,0.14)",
        color: WM.color.text
      };
    case "gold":
      return {
        borderColor: "rgba(214,178,94,0.30)",
        background: "rgba(214,178,94,0.14)",
        color: WM.color.text
      };
    case "danger":
      return {
        borderColor: "rgba(255,107,107,0.30)",
        background: "rgba(255,107,107,0.14)",
        color: WM.color.text
      };
    default:
      return {
        borderColor: WM.color.line,
        background: WM.color.panelSoft,
        color: WM.color.textSoft
      };
  }
}

export default function WmChip(props: WmChipProps) {
  const { label, tone = "default" } = props;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        border: "1px solid",
        borderRadius: WM.radius.pill,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        ...toneStyles(tone)
      }}
    >
      {label}
    </span>
  );
}