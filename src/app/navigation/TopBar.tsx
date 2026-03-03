import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UiScaleControl from "@/ui2/controls/UiScaleControl";

type Props = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function Btn({
  children,
  onClick,
  subtle,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  subtle?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={subtle ? "wm-topbar-btn wm-topbar-btn--subtle" : "wm-topbar-btn"}
      style={{
        minHeight: 40,
        padding: "0 12px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

export default function TopBar({ onToggleNav }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  const isDashboard =
    loc.pathname === "/app" ||
    loc.pathname === "/app/" ||
    loc.pathname.startsWith("/app/dashboard");

  const canGoBack = !isDashboard;

  return (
    <header
      className="wm-topbar wm-topbar--engineering"
      style={{
        minHeight: 72,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div
        className="wm-topbar-cluster wm-topbar-cluster--left"
        style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}
      >
        <Btn subtle title="Toggle navigation" onClick={onToggleNav}>
          <span className="wm-topbar-icon" style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
        </Btn>

        <button
          type="button"
          onClick={() => nav("/app/dashboard")}
          title="Go to Dashboard"
          className="wm-topbar-brandlink"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            minHeight: 52,
            padding: "0 4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <img
            src="/heroLogo.png"
            alt="WyreStorm Wingman"
            className="wm-topbar-brandlogo"
            style={{
              maxHeight: 46,
              width: "auto",
              height: "auto",
              display: "block",
            }}
          />
          <div className="wm-topbar-brandtext" style={{ lineHeight: 1.05 }}>
            <div className="wm-topbar-brandtitle" style={{ fontSize: 18, fontWeight: 800 }}>
              Wingman
            </div>
            <div className="wm-topbar-brandsub" style={{ fontSize: 13, opacity: 0.84 }}>
              Sales &amp; Pre-Sales Toolkit
            </div>
          </div>
        </button>

        {canGoBack ? (
          <div className="wm-topbar-backwrap">
            <Btn subtle title="Back" onClick={() => nav(-1)}>
              <span className="wm-topbar-icon" style={{ fontSize: 16, lineHeight: 1 }}>←</span>
              Back
            </Btn>
          </div>
        ) : null}
      </div>

      <div
        className="wm-topbar-cluster wm-topbar-cluster--right"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <UiScaleControl />
      </div>
    </header>
  );
}