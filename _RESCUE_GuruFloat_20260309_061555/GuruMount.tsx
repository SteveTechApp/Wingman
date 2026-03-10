import * as React from "react";

export default function GuruMount() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open Guru"
        onClick={() => setOpen((v) => !v)}
        className="wm-btn wm-btn-primary"
        style={{
          position: "fixed",
          right: 18,
          bottom: 16,
          zIndex: 5000,
          minWidth: 108,
          height: 40,
          padding: "0 16px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 0.3,
          boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
        }}
      >
        GURU
      </button>

      {open ? (
        <div
          className="wm-panel"
          style={{
            position: "fixed",
            right: 18,
            bottom: 64,
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            height: 540,
            maxHeight: "calc(100vh - 100px)",
            zIndex: 5001,
            overflow: "hidden",
            display: "grid",
            gridTemplateRows: "52px 1fr 62px",
            padding: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              borderBottom: "1px solid var(--wm-border)",
            }}
          >
            <div className="wm-title-lg">Guru</div>
            <button
              type="button"
              className="wm-btn"
              style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="wm-scrollbar-thin" style={{ overflow: "auto", padding: 12, display: "grid", gap: 8 }}>
            <div className="wm-card">
              <div className="wm-title-lg">How Guru should behave</div>
              <div className="wm-body" style={{ marginTop: 6 }}>
                Guru should support selection, explain product fit, and help guide users into the right workflow.
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-title-lg">Suggested prompt starters</div>
              <div className="wm-grid" style={{ marginTop: 6, gap: 6 }}>
                <button type="button" className="wm-btn" style={{ textAlign: "left" }}>Recommend products for a boardroom</button>
                <button type="button" className="wm-btn" style={{ textAlign: "left" }}>Compare HDBaseT vs AVoIP</button>
                <button type="button" className="wm-btn" style={{ textAlign: "left" }}>Suggest a video wall architecture</button>
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-body">
                Guru panel ready for conversation UI integration.
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--wm-border)", padding: 10, display: "grid", gap: 8 }}>
            <div
              className="wm-panel-soft"
              style={{
                height: 40,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                color: "var(--wm-text-3)",
              }}
            >
              Ask Guru a question...
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}