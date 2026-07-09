import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import {
  createBlankCustomRoomTemplate,
  saveCustomRoomTemplate,
  useCustomRoomTemplates,
} from "../lib/customRoomTemplates";
import { roomTemplates } from "../lib/roomTemplates";

const allTemplatesFilter = "All";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
}

export function TemplatesPage() {
  const customTemplates = useCustomRoomTemplates();
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState(allTemplatesFilter);
  const [customName, setCustomName] = useState("");
  const [customVertical, setCustomVertical] = useState("Custom");
  const [customScale, setCustomScale] = useState("Custom");
  const [customApplication, setCustomApplication] = useState("");
  const [customSummary, setCustomSummary] = useState("");
  const [createdTemplatePath, setCreatedTemplatePath] = useState("");

  const availableTemplates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const verticals = useMemo(
    () => [allTemplatesFilter, ...uniqueSorted(availableTemplates.map((template) => template.vertical))],
    [availableTemplates],
  );

  const filteredTemplates = useMemo(() => {
    const search = query.trim().toLowerCase();

    return availableTemplates.filter((template) => {
      const verticalMatch = vertical === allTemplatesFilter || template.vertical === vertical;
      const searchableText = [
        template.name,
        template.vertical,
        template.scale,
        template.summary,
        template.application,
        template.customerNarrative,
        template.architecture,
        ...template.bom.flatMap((row) => [row.sku, row.description, row.role]),
      ].join(" ").toLowerCase();

      return verticalMatch && (!search || searchableText.includes(search));
    });
  }, [availableTemplates, query, vertical]);

  const hasActiveFilters = query.trim() || vertical !== allTemplatesFilter;

  function resetFilters() {
    setQuery("");
    setVertical(allTemplatesFilter);
  }

  function createCustomTemplate() {
    const template = createBlankCustomRoomTemplate({
      name: customName,
      vertical: customVertical,
      scale: customScale,
      application: customApplication,
      summary: customSummary,
    });
    const savedTemplate = saveCustomRoomTemplate(template, { id: template.id });

    setCustomName("");
    setCustomVertical("Custom");
    setCustomScale("Custom");
    setCustomApplication("");
    setCustomSummary("");
    setCreatedTemplatePath(`${routeCatalogByKey.templates.path}/${savedTemplate.id}`);
    setQuery(savedTemplate.name);
    setVertical(allTemplatesFilter);
  }

  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">
      <header className="wm-page-header wm-template-hero">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <h1 className="wm-page-title">Room and application templates</h1>
          <p className="wm-copy">
            Start from a known room archetype, filter by vertical, then review the BOM-backed template before proposal work.
          </p>
        </div>
      </header>

      <section className="wm-section-card wm-template-filter-panel" aria-label="Template filters">
        <label className="wm-field wm-template-search">
          Search templates
          <input
            className="wm-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, vertical, SKU or application"
          />
        </label>

        <div className="wm-template-filter-group" aria-label="Vertical filter">
          <span className="wm-template-filter-label">Vertical</span>
          <div className="wm-template-filter-strip">
            {verticals.map((item) => (
              <button
                key={item}
                type="button"
                className={`wm-filter-chip${item === vertical ? " is-active" : ""}`}
                onClick={() => setVertical(item)}
                aria-pressed={item === vertical}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        
      </section>

      <section className="wm-section-card wm-custom-template-panel" aria-label="Create custom room template">
        <div className="wm-custom-template-copy">
          <p className="wm-template-kicker wm-ui-kicker">Custom templates</p>
          <h2 className="wm-section-title">Create your own room template</h2>
          <p className="wm-copy">
            Save a reusable starting point for rooms Wingman does not already cover. Add the detailed BOM after opening the new template.
          </p>
        </div>

        <div className="wm-custom-template-grid">
          <label className="wm-field">
            Template name
            <input
              className="wm-input"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="e.g. Council chamber hybrid meeting"
            />
          </label>
          <label className="wm-field">
            Vertical
            <input
              className="wm-input"
              value={customVertical}
              onChange={(event) => setCustomVertical(event.target.value)}
              placeholder="Custom"
            />
          </label>
          <label className="wm-field">
            Scale
            <input
              className="wm-input"
              value={customScale}
              onChange={(event) => setCustomScale(event.target.value)}
              placeholder="Custom"
            />
          </label>
          <label className="wm-field wm-custom-template-wide">
            Application
            <input
              className="wm-input"
              value={customApplication}
              onChange={(event) => setCustomApplication(event.target.value)}
              placeholder="What this room is used for"
            />
          </label>
          <label className="wm-field wm-custom-template-wide">
            Summary
            <input
              className="wm-input"
              value={customSummary}
              onChange={(event) => setCustomSummary(event.target.value)}
              placeholder="Short reusable design intent"
            />
          </label>
        </div>

        <div className="wm-template-actions wm-action-row">
          <button type="button" className="wm-button wm-button-primary" onClick={createCustomTemplate} disabled={!customName.trim()}>
            Create template
          </button>
          {createdTemplatePath ? (
            <Link className="wm-button wm-button-secondary" to={createdTemplatePath}>
              Open new template
            </Link>
          ) : null}
        </div>
      </section>

      <section className="wm-template-results-header wm-section-card">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Template library</p>
          <h2 className="wm-section-title">{filteredTemplates.length} of {availableTemplates.length} templates</h2>
          {customTemplates.length ? (
            <p className="wm-copy">{customTemplates.length} custom template{customTemplates.length === 1 ? "" : "s"} saved in this browser.</p>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <button type="button" className="wm-button wm-button-secondary" onClick={resetFilters}>
            Reset filters
          </button>
        ) : null}
      </section>

      <section className="wm-section wm-template-card-grid" aria-label="Room templates">
        {filteredTemplates.map((template) => {
          const isCustomTemplate = "customTemplate" in template;

          return (
          <article key={template.id} className="wm-action-card wm-template-card" data-custom-template={isCustomTemplate ? "true" : undefined}>
            <div className="wm-template-card-top">
              {isCustomTemplate ? <span className="wm-badge wm-template-custom-badge">Custom</span> : null}
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

      {filteredTemplates.length === 0 ? (
        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">Nothing matches those filters</h2>
          <p className="wm-copy">Adjust the search or vertical filter to show more room archetypes.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;

