import { Outlet } from "react-router-dom";

export default function PublicShell() {
  return (
    <div className="ws-app wm-density-compact" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(5, 11, 26, 0.88)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="wm-container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 58 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>WyreStorm Wingman</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="wm-btn" type="button" style={{ fontSize: 12, padding: "7px 12px" }}>
              Language EN
            </button>
            <span style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 12px", fontSize: 12, opacity: 0.9 }}>Theme: Dark</span>
            <span style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 12px", fontSize: 12, opacity: 0.9 }}>Steve</span>
            <button className="wm-btn" type="button" style={{ fontSize: 12, padding: "7px 12px" }}>
              Profile
            </button>
          </div>
        </div>
      </header>

      <main className="ws-page wm-density-compact wm-container wm-page" style={{ flex: 1, display: "grid" }}>
        <Outlet />
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(5, 11, 26, 0.82)" }}>
        <div
          className="wm-container"
          style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}
        >
          <div style={{ opacity: 0.8 }}>WyreStorm Wingman Build 2026.02</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
            <a href="#">WyreStorm Corporate</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
