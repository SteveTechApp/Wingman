import React from "react";

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="wm-app-footer">
      <div className="wm-app-footer__inner">
        <div className="wm-app-footer__left">
          <span className="wm-app-footer__brand">WyreStorm Wingman</span>
          <span className="wm-app-footer__sep">•</span>
          <span className="wm-app-footer__text">Sales and design workspace</span>
        </div>

        <div className="wm-app-footer__right">
          <span className="wm-app-footer__text">© {year} WyreStorm</span>
        </div>
      </div>
    </footer>
  );
}