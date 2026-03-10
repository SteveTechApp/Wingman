import * as React from "react";

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open Guru"
        title="Open Guru"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 5000,
          minWidth: 128,
          height: 48,
          padding: "0 18px",
          borderRadius: 999,
          border: "1px solid rgba(255,196,120,0.70)",
          background: "linear-gradient(90deg, #ffcf8a, #ff9526)",
          color: "#241506",
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: "0.08em",
          cursor: "pointer",
          boxShadow: "0 12px 30px rgba(255,145,31,0.42), 0 0 0 1px rgba(255,220,168,0.16) inset",
          userSelect: "none"
        }}
      >
        GURU
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 82,
            zIndex: 5000,
            width: 320,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 18,
            border: "1px solid rgba(88,138,194,0.18)",
            background: "linear-gradient(180deg, rgba(8,23,44,0.98), rgba(6,19,36,0.98))",
            boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(88,138,194,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div>
              <div style={{ color: "#f4f8ff", fontWeight: 800, fontSize: 14, letterSpacing: "0.06em" }}>
                GURU
              </div>
              <div style={{ color: "rgba(209,224,241,0.72)", fontSize: 12 }}>
                Wingman assistant
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid rgba(98,154,212,0.18)",
                background: "rgba(13,31,57,0.9)",
                color: "#eaf4ff",
                borderRadius: 10,
                minWidth: 32,
                height: 32,
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 16 }}>
            <div
              style={{
                border: "1px solid rgba(90,150,210,0.16)",
                background: "linear-gradient(180deg, rgba(12,34,58,0.84), rgba(8,24,43,0.92))",
                borderRadius: 14,
                padding: 14
              }}
            >
              <div style={{ color: "#f4f8ff", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Ask Guru
              </div>
              <div style={{ color: "rgba(209,224,241,0.74)", fontSize: 13, lineHeight: 1.5 }}>
                Use Guru for guided product selection, discovery support, room design help, and proposal guidance.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}