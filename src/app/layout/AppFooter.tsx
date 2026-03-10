import React from "react";
import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="wm-footer">
      <div className="wm-footer__inner">
        <div className="wm-footer__brand">WyreStorm Wingman</div>

        <nav className="wm-footer__links" aria-label="Footer links">
          <Link className="wm-footer__link" to="/app/tools/runtime-diagnostics">
            Runtime Support
          </Link>
          <Link className="wm-footer__link" to="/app/tools/competitor-lookup-diagnostics">
            Lookup Support
          </Link>
          <span className="wm-footer__link">Contact</span>
          <span className="wm-footer__link">Privacy</span>
          <span className="wm-footer__link">Terms</span>
        </nav>
      </div>

      <div className="wm-footer__copy">Copyright 2026 WyreStorm</div>
    </footer>
  );
}
