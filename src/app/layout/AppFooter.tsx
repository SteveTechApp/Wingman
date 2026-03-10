import React from "react";
import { APP_BUILD_CHANNEL, APP_VERSION_LABEL, CORPORATE_LINKS } from "@/app/layout/footerConfig";

export default function AppFooter() {
  const year = new Date().getFullYear();
  const splitIndex = Math.ceil(CORPORATE_LINKS.length / 2);
  const linkRows = [
    CORPORATE_LINKS.slice(0, splitIndex),
    CORPORATE_LINKS.slice(splitIndex),
  ].filter((row) => row.length > 0);

  return (
    <footer className="wm-footer wm-footer--corporate">
      <div className="wm-footer__row">
        <div className="wm-footer__brandblock">
          <div className="wm-footer__brand">WyreStorm Wingman</div>
          <div className="wm-footer__meta">Sales engineering workspace · {APP_VERSION_LABEL} · {APP_BUILD_CHANNEL}</div>
        </div>

        <nav className="wm-footer__links" aria-label="Footer links">
          {linkRows.map((row, rowIndex) => (
            <div key={`footer-row-${rowIndex}`} className="wm-footer__links-row">
              {row.map((item) => (
                <a
                  key={item.href}
                  className="wm-footer__link"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="wm-footer__copy">Copyright {year} WyreStorm Technologies</div>
      </div>
    </footer>
  );
}
