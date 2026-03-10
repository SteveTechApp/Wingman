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
          right: 18,
          bottom: 16,
          zIndex: 5000,
          minWidth: 104,
          height: 44,
          padding: "0 16px",
          borderRadius: 999,
          border: "1px solid rgba(101,232,255,0.18)",
          background: "linear-gradient(90deg, #1aa58f, #1b8d78)",
          color: "#eef5ff",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 0.3,
          boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
          cursor: "pointer",
        }}
      >
        GURU
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 70,
            width: 360,
            maxWidth: "calc(100vw - 24px)",
            height: 520,
            maxHeight: "calc(100vh - 110px)",
            borderRadius: 18,
            border: "1px solid rgba(101,232,255,0.18)",
            background: "linear-gradient(180deg, rgba(7,13,22,0.98), rgba(10,18,30,0.98))",
            boxShadow: "0 20px 56px rgba(0,0,0,0.38)",
            zIndex: 5001,
            overflow: "hidden",
            display: "grid",
            gridTemplateRows: "56px 1fr",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: "#eef6ff",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            <span>Guru</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                appearance: "none",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "#eef6ff",
                borderRadius: 10,
                width: 34,
                height: 34,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: 14, color: "rgba(226,235,244,0.84)", fontSize: 13, lineHeight: 1.6 }}>
            Guru panel ready.
          </div>
        </div>
      ) : null}
    </>
  );
}