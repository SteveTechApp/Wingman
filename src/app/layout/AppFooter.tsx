import React from "react";
import { Link } from "react-router-dom";

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="wm-footer">
      <div className="wm-footer__row">
        <div className="wm-footer__brandblock">
          <div className="wm-footer__brand">WyreStorm Wingman</div>
          <div className="wm-footer__meta">Sales engineering workspace</div>
        </div>

        <nav className="wm-footer__links" aria-label="Footer links">
          <Link className="wm-footer__link" to="/app/tools/runtime-diagnostics">
            Runtime Support
          </Link>
          <Link className="wm-footer__link" to="/app/tools/competitor-lookup-diagnostics">
            Lookup Support
          </Link>
          <span className="wm-footer__text">Contact</span>
          <span className="wm-footer__text">Privacy</span>
          <span className="wm-footer__text">Terms</span>
        </nav>

        <div className="wm-footer__copy">Copyright {year} WyreStorm</div>
      </div>
    </footer>
  );
}
