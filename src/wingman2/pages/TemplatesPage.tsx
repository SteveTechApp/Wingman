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
    <main className="wm-templates-page wm-ui-page wingman-page-host" data-wingman-page="templates">
      <section className="wm-template-hero wm-ui-hero wingman-surface wm-ui-section">
        <div>
          <p className="wm-template-kicker wm-ui-kicker wm-ui-copy">Wingman / Templates</p>
          <h1 className="wm-ui-title">Start with a proven room design.</h1>
          <p className="wm-ui-copy">
            Choose the closest room or application, then adjust the products and quantities for the customer.
          </p>
        </div>
      </section>

      <section className="wm-template-filter-panel wm-ui-section wingman-surface wm-ui-card">
        <label className="wm-template-search wm-ui-form-field wm-ui-card">
          <span>Search templates</span>
          <input
            className="wm-ui-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, application or product..."
          />
        </label>
      </section>

      <section className="wm-template-results-header wm-ui-section wm-ui-card-header">
        <h2 className="wm-ui-title">Template Library</h2>
      </section>

      <section className="wm-template-card-grid wm-ui-grid wm-ui-section wm-ui-card">
        {filteredTemplates.map((template) => (
          <article key={template.id} className="wm-template-card wm-ui-card wingman-surface">
            <div className="wm-template-card-top wm-ui-card">
              <span>{template.vertical}</span>
              <span>{template.scale}</span>
            </div>

            <h3 className="wm-ui-title">{template.name}</h3>
            <p className="wm-template-summary wm-ui-copy wm-ui-card">{template.summary}</p>
            <p className="wm-template-direction wm-ui-copy">{template.application}</p>

            <div className="wm-template-actions wm-ui-action-row wm-ui-card">
              <Link
                className="wm-ui-button wm-ui-button-forward"
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
        <section className="wm-ui-card wm-ui-section" aria-live="polite">
          <h2 className="wm-ui-title">No matching template</h2>
          <p className="wm-ui-copy">Try a room type, application or product name.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
