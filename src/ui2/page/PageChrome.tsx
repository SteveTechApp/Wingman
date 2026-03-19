import * as React from "react";

export function pageWrapStyle(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    minWidth: 0,
  };
}

export function stackStyle(gap = 14): React.CSSProperties {
  return {
    display: "grid",
    gap,
  };
}

export function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(18,32,49,0.86), rgba(13,24,39,0.9))",
    boxShadow: "0 14px 36px rgba(0,0,0,0.2)",
    padding: 18,
  };
}

export function sectionTitleStyle(): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 800,
    color: "rgba(255,255,255,0.96)",
    letterSpacing: "-0.02em",
  };
}

export function sectionTextStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.72)",
  };
}

export function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.94)",
    padding: "10px 12px",
    outline: "none",
    font: "inherit",
  };
}

export function textareaStyle(rows?: number): React.CSSProperties {
  return {
    width: "100%",
    minHeight: Math.max(110, (rows || 4) * 24),
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.94)",
    padding: "10px 12px",
    outline: "none",
    font: "inherit",
    resize: "vertical",
  };
}

export function fieldLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.62)",
    marginBottom: 6,
  };
}

export function PageHeader({
  eyebrow = "TOOL",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className="wm-hero wm-page-intro"
      style={{
        background:
          "linear-gradient(132deg, rgba(var(--wm-page-accent-rgb, 108,196,255),0.2) 0%, rgba(15,30,47,0.9) 38%, rgba(var(--wm-page-accent-rgb, 108,196,255),0.12) 100%)",
      }}
    >
      <div className="wm-page-intro__main">
        <div className="wm-page-eyebrow">{eyebrow}</div>
        <h1 className="wm-page-intro__title">{title}</h1>
        {description ? (
          <div className="wm-page-intro__copy">{description}</div>
        ) : null}
      </div>

      {actions ? (
        <div className="wm-page-intro__actions">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={fieldLabelStyle()}>{label}</div>
      {children}
    </label>
  );
}
