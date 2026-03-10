import * as React from "react";

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open Guru"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 5000,
          width: 56,
          height: 56,
          borderRadius: 999,
          border: "1px solid rgba(101,232,255,0.18)",
          background: "linear-gradient(135deg, #19b6d3, #1b8d78)",
          color: "#eef5ff",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 12px 28px rgba(0,0,0,0.30)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.01em",
        }}
      >
        G
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 88,
            zIndex: 5001,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(8,22,42,0.98), rgba(6,16,30,0.98))",
            boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: "#eef5ff",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span>Guru</span>
            <button
              type="button"
              aria-label="Close Guru"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#eef5ff",
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              X
            </button>
          </div>

          <div
            style={{
              padding: 14,
              color: "rgba(226,236,255,0.84)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Guru assistant is ready.
          </div>
        </div>
      ) : null}
    </>
  );
}