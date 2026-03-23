import * as React from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  minHeight?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  minHeight = 152,
  children,
  style,
}: PageHeaderProps) {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight,
        borderRadius: 24,
        padding: "20px 22px 22px 22px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(110, 160, 255, 0.1), transparent 30%), linear-gradient(180deg, rgba(24,24,31,0.84) 0%, rgba(15,15,21,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 32px rgba(0,0,0,0.14)",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(110deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 36%, rgba(118,128,255,0.08) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 860,
          display: "grid",
          gap: 12,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "rgba(211, 206, 224, 0.66)",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 2.6vw, 38px)",
            lineHeight: 1.06,
            fontWeight: 620,
            letterSpacing: "-0.03em",
            color: "#f5f2fa",
          }}
        >
          {title}
        </h1>

        {description ? (
          <div
            style={{
              margin: 0,
              maxWidth: 680,
              fontSize: 14,
              lineHeight: 1.5,
              color: "rgba(229, 225, 237, 0.72)",
            }}
          >
            {description}
          </div>
        ) : null}

        {children ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              paddingTop: 2,
            }}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
