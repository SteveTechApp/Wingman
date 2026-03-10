import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const TEMPLATES = [
  { name: "Corporate Meeting Room", market: "Corporate", tier: "Silver", fit: "Typical BYOD room" },
  { name: "Boardroom Premium", market: "Corporate", tier: "Gold", fit: "Larger executive spaces" },
  { name: "Classroom Standard", market: "Education", tier: "Silver", fit: "Teacher-led presentation rooms" },
  { name: "Reception Signage", market: "Hospitality", tier: "Bronze", fit: "Simple signage points" },
];

export default function TemplatesPage() {
  return (
    <PageFrame
      title="Templates"
      subtitle="Use standardised room and market templates to accelerate solution building."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">Manage Library</button>
          <button className="wm-btn-primary" type="button">Apply Template</button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Template Library</span>
            <h3>Start from a proven baseline</h3>
            <p>
              Templates should reduce design time and help less technical users move toward a valid solution quickly.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Usage Guidance</span>
            <h3>Compare before applying</h3>
            <p>
              Make the differences between room types, tiers, and market assumptions easy to scan.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Template Library"
        subtitle="Review templates by market, tier, and intended use."
      >
        <div className="wm-list">
          {TEMPLATES.map((template) => (
            <div key={template.name} className="wm-listItem">
              <div className="wm-listItem__body">
                <div className="wm-listItem__title">{template.name}</div>
                <div className="wm-listItem__meta">{template.fit}</div>
                <div className="wm-tagRow">
                  <span className="wm-tag">{template.market}</span>
                  <span className="wm-tag">{template.tier}</span>
                </div>
              </div>

              <div className="wm-right">
                <button className="wm-btn-secondary" type="button">Review</button>
                <button className="wm-btn-primary" type="button">Apply</button>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
    </PageFrame>
  );
}