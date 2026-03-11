import React from "react";
import {
  APP_BUILD_CHANNEL,
  APP_VERSION_LABEL,
  CORPORATE_LINKS,
} from "@/app/layout/footerConfig";

export default function AppFooter() {
  const year = new Date().getFullYear();
  const releaseLabel = APP_BUILD_CHANNEL ? APP_BUILD_CHANNEL.toUpperCase() : "LIVE";
  const footerLinks = [...CORPORATE_LINKS];

  return (
    <footer className="wm-footer wm-footer--corporate">
      <div className="wm-app-footer__bar">
        <div className="wm-app-footer__brandline">
          <span className="wm-app-footer__brand">Wingman</span>
          <span className="wm-app-footer__sep" aria-hidden="true">•</span>
          <span>{releaseLabel}</span>
          <span className="wm-app-footer__sep" aria-hidden="true">•</span>
          <span>{APP_VERSION_LABEL}</span>
        </div>

        <nav className="wm-app-footer__links" aria-label="Footer links">
          {footerLinks.map((item, index) => (
            <React.Fragment key={item.href}>
              {index > 0 ? <span className="wm-app-footer__sep" aria-hidden="true">•</span> : null}
              <a
                className="wm-app-footer__link"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            </React.Fragment>
          ))}
        </nav>

        <div className="wm-app-footer__meta">
          <span>Copyright {year} WyreStorm Technologies</span>
          <span className="wm-app-footer__sep" aria-hidden="true">•</span>
          <span>Secure commercial workspace shell</span>
        </div>
      </div>
    </footer>
  );
}
