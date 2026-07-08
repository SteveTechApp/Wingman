import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { roomTemplates } from "../lib/roomTemplates";

export function TemplatesPage() {
  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">

      <section className="wm-section wm-template-card-grid">
        {roomTemplates.map((template) => (
          <article key={template.id} className="wm-action-card wm-template-card">
            <div className="wm-template-card-top">
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
        ))}
      </section>

      {roomTemplates.length === 0 ? (
        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">No templates available</h2>
          <p className="wm-copy">Check back once room templates are published.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
