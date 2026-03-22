import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function VideoWallStepSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section
      style={{
        border: "1px solid rgba(100,180,255,0.16)",
        background: "rgba(8,18,35,0.7)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          background: "rgba(12,27,52,0.88)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          display: "grid",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(167,201,255,0.76)", fontWeight: 800 }}>
          Step
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
        {subtitle ? (
          <span style={{ fontSize: 12, color: "rgba(220,233,255,0.74)", lineHeight: 1.4 }}>{subtitle}</span>
        ) : null}
      </button>

      {open ? (
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}