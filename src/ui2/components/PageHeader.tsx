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
  minHeight = 180,
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
        padding: "28px 32px 32px 32px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background:
          "linear-gradient(90deg, rgba(17,56,84,0.96) 0%, rgba(0,24,58,0.98) 42%, rgba(4,37,66,0.95) 100%)",
        border: "1px solid rgba(118, 190, 255, 0.16)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(73,164,255,0.10) 0%, rgba(0,0,0,0) 30%, rgba(57,177,255,0.08) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 980,
          display: "grid",
          gap: 14,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 800,
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(32px, 3.2vw, 52px)",
            lineHeight: 1.06,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          {title}
        </h1>

        {description ? (
          <div
            style={{
              margin: 0,
              maxWidth: 940,
              fontSize: 15,
              lineHeight: 1.6,
              color: "rgba(230,238,248,0.88)",
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
              gap: 12,
              paddingTop: 4,
            }}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}