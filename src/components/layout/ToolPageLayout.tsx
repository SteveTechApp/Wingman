import React from "react";

type ToolPageLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function ToolPageLayout({ title, subtitle, children }: ToolPageLayoutProps) {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">{title}</div>
          <div className="wm-page-sub">{subtitle}</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        {children}
      </div>
    </div>
  );
}
