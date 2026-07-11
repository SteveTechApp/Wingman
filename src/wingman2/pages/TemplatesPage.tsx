import { useMemo } from "react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates } from "../lib/roomTemplates";

export function TemplatesPage() {
  const customTemplates = useCustomRoomTemplates();
  const availableTemplates = useMemo(
    () => [...customTemplates, ...roomTemplates],
    [customTemplates],
  );

  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">
      <header className="wm-page-header wm-template-hero">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <h1 className="wm-page-title">Room and application templates</h1>
          <p className="wm-copy">
            Browse known room archetypes, expand a card for more detail, or reopen a room design saved as a reusable template.
          </p>
        </div>
      </header>

      <section className="wm-template-results-header wm-section-card">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Template library</p>
          <h2 className="wm-section-title">{availableTemplates.length} templates</h2>
          {customTemplates.length > 0 ? (
            <p className="wm-copy">{customTemplates.length} saved custom template{customTemplates.length === 1 ? "" : "s"} included.</p>
          ) : null}
        </div>
      </section>

      <section className="wm-section wm-template-card-grid" aria-label="Room templates">
        {availableTemplates.map((template) => {
          const isCustom = "customTemplate" in template && template.customTemplate === true;

          return (
            <article key={template.id} className="wm-action-card wm-template-card">
              <div className="wm-template-card-top">
                {isCustom ? <span className="wm-badge">Saved template</span> : null}
                <span className="wm-badge">{template.vertical}</span>
                <span className="wm-badge">{template.scale}</span>
              </div>

              <h3 className="wm-card-title">{template.name}</h3>
              <p className="wm-copy wm-template-summary">{template.summary}</p>
              <p className="wm-copy wm-template-direction">{template.application}</p>

              <div className="wm-template-actions wm-action-row">
                <Link
                  className="wm-button wm-button-primary"
                  to={`${routeCatalogByKey.templates.path}/${template.id}`}
                  data-template-build-pack="true"
                >
                  Review template
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
