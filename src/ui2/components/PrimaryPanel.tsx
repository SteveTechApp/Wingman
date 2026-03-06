import * as React from "react";

type PrimaryPanelProps = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

export default function PrimaryPanel({
  title,
  subtitle,
  right,
  children,
}: PrimaryPanelProps) {
  return (
    <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
      {title || subtitle || right ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            {title ? (
              <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
            ) : null}

            {subtitle ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.80)",
                  lineHeight: 1.45,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          {right ? <div>{right}</div> : null}
        </div>
      ) : null}

      <div style={{ marginTop: title || subtitle || right ? 14 : 0 }}>
        {children}
      </div>
    </section>
  );
}