import * as React from "react";

import { Link, Outlet, useLocation } from "react-router-dom";
import { APP_BUILD_CHANNEL, APP_VERSION_LABEL, CORPORATE_LINKS } from "@/app/layout/footerConfig";

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
    color: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
    border: active
      ? "1px solid rgba(96,165,250,0.28)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.03)",
    whiteSpace: "nowrap",
  };
}

function footerLinkStyle(): React.CSSProperties {
  return {
    color: "rgba(255,255,255,0.78)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

export default function PublicShell() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  const isLogin = path.includes("/login");
  const isSignup = path.includes("/signup");

  return (
    <div
      className="ws-app wm-density-compact"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        className="wm-topbar"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(5, 11, 26, 0.88)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="wm-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minHeight: 56,
          }}
        >
          <Link
            to="/"
            aria-label="Go to public landing page"
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            WyreStorm
          </Link>

          <nav
            aria-label="Public navigation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "nowrap",
              justifyContent: "flex-end",
            }}
          >
            <Link to="/login" style={navLinkStyle(isLogin)}>
              Login
            </Link>

            <Link
              to="/signup"
              style={{
                ...navLinkStyle(isSignup),
                border: "1px solid rgba(96,165,250,0.30)",
                background:
                  "linear-gradient(180deg, rgba(59,130,246,0.16), rgba(59,130,246,0.08))",
                color: "rgba(255,255,255,0.96)",
              }}
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main
        className="ws-page wm-density-compact wm-container wm-page"
        style={{ flex: 1, display: "grid" }}
      >
        <Outlet />
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(5, 11, 26, 0.82)",
        }}
      >
        <div
          className="wm-container"
          style={{
            minHeight: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 12,
            paddingTop: 6,
            paddingBottom: 6,
            flexWrap: "nowrap",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              opacity: 0.8,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            WyreStorm Wingman {APP_VERSION_LABEL} / {APP_BUILD_CHANNEL}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              justifyContent: "flex-end",
              flexWrap: "nowrap",
              whiteSpace: "nowrap",
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {CORPORATE_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={footerLinkStyle()}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
