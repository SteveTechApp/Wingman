import type React from "react";

export const WM = {
  color: {
    bgTop: "#0b1220",
    bgBottom: "#101a2b",
    panel: "rgba(13, 21, 37, 0.86)",
    panelAlt: "rgba(18, 28, 47, 0.92)",
    panelSoft: "rgba(255,255,255,0.03)",
    line: "rgba(160, 190, 255, 0.14)",
    lineStrong: "rgba(88, 177, 255, 0.34)",
    text: "#edf4ff",
    textSoft: "rgba(237, 244, 255, 0.78)",
    textMute: "rgba(237, 244, 255, 0.56)",
    primary: "#42b6ff",
    primaryStrong: "#1e8fff",
    primarySoft: "rgba(66, 182, 255, 0.18)",
    success: "#3ddc97",
    warning: "#ffbf47",
    danger: "#ff6b6b",
    gold: "#d6b25e",
    purple: "#8a7dff",
    teal: "#37d5d6"
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999
  },
  shadow: {
    soft: "0 10px 28px rgba(0,0,0,0.18)",
    card: "0 14px 36px rgba(0,0,0,0.24)",
    lift: "0 18px 42px rgba(0,0,0,0.30)"
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32
  }
} as const;

export function pageBackgroundStyle(): React.CSSProperties {
  return {
    minHeight: "100%",
    background:
      "radial-gradient(circle at top right, rgba(66,182,255,0.10), transparent 24%), " +
      "radial-gradient(circle at top left, rgba(138,125,255,0.08), transparent 22%), " +
      `linear-gradient(180deg, ${WM.color.bgTop} 0%, ${WM.color.bgBottom} 100%)`,
    color: WM.color.text
  };
}

export function glassPanelStyle(): React.CSSProperties {
  return {
    background: WM.color.panel,
    border: `1px solid ${WM.color.line}`,
    borderRadius: WM.radius.xl,
    boxShadow: WM.shadow.card,
    backdropFilter: "blur(12px)"
  };
}

export function sectionPanelStyle(): React.CSSProperties {
  return {
    background: WM.color.panelAlt,
    border: `1px solid ${WM.color.line}`,
    borderRadius: WM.radius.lg,
    boxShadow: WM.shadow.soft
  };
}

export function interactiveCardStyle(active?: boolean): React.CSSProperties {
  return {
    background: active
      ? "linear-gradient(180deg, rgba(23,51,86,0.96), rgba(13,29,51,0.96))"
      : "linear-gradient(180deg, rgba(18,27,45,0.94), rgba(10,17,31,0.94))",
    border: `1px solid ${active ? WM.color.lineStrong : WM.color.line}`,
    borderRadius: WM.radius.lg,
    boxShadow: active ? WM.shadow.lift : WM.shadow.soft,
    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease"
  };
}

export function primaryButtonStyle(): React.CSSProperties {
  return {
    appearance: "none",
    border: "none",
    borderRadius: WM.radius.md,
    background: `linear-gradient(180deg, ${WM.color.primary}, ${WM.color.primaryStrong})`,
    color: "#06111f",
    fontWeight: 800,
    padding: "10px 14px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(30,143,255,0.24)"
  };
}

export function secondaryButtonStyle(): React.CSSProperties {
  return {
    appearance: "none",
    border: `1px solid ${WM.color.line}`,
    borderRadius: WM.radius.md,
    background: "rgba(255,255,255,0.03)",
    color: WM.color.text,
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer"
  };
}