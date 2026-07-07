import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { roomTemplates } from "../lib/roomTemplates";

export function TemplatesPage() {
  const [query, setQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return roomTemplates;
    }

    return roomTemplates.filter((template) =>
      [
        template.name,
        template.vertical,
        template.application,
        template.scale,
        template.summary,
        template.customerNarrative,
        template.architecture,
        ...template.bom.flatMap((row) => [row.sku, row.description, row.role]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [query]);

  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">
      <section className="wm-template-hero wm-page-hero">
        <div>
          <p className="wm-template-kicker">Wingman / Templates</p>
          <h1 className="wm-page-title">Start with a proven room design.</h1>
          <p className="wm-copy">
            Choose the closest room or application, then adjust the products and quantities for the customer.
          </p>
        </div>
      </section>

      <section className="wm-section-card wm-template-filter-panel">
        <label className="wm-field wm-template-search">
          <span>Search templates</span>
          <input
            className="wm-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, application or product..."
          />
        </label>
      </section>

      <section className="wm-page-header wm-template-results-header">
        <h2 className="wm-section-title">Template Library</h2>
      </section>

      <section className="wm-section wm-template-card-grid">
        {filteredTemplates.map((template) => (
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

      {filteredTemplates.length === 0 ? (
        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">No matching template</h2>
          <p className="wm-copy">Try a room type, application or product name.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
