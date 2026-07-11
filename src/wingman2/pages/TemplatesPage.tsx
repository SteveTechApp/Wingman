import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { createBlankCustomRoomTemplate, saveCustomRoomTemplate, useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates } from "../lib/roomTemplates";

const allTemplatesFilter = "All";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
}

export function TemplatesPage() {
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState(allTemplatesFilter);
  const customTemplates = useCustomRoomTemplates();
  const [showCustomTemplate, setShowCustomTemplate] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateVertical, setNewTemplateVertical] = useState("");
  const [newTemplateApplication, setNewTemplateApplication] = useState("");
  const [newTemplateScale, setNewTemplateScale] = useState("");
  const [newTemplateSummary, setNewTemplateSummary] = useState("");

  const allTemplates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);

  const verticals = useMemo(
    () => [allTemplatesFilter, ...uniqueSorted(allTemplates.map((template) => template.vertical))],
    [allTemplates],
  );

  const filteredTemplates = useMemo(() => {
    const search = query.trim().toLowerCase();

    return allTemplates.filter((template) => {
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
      ]
        .join(" ")
        .toLowerCase();

      return verticalMatch && (!search || searchableText.includes(search));
    });
  }, [allTemplates, query, vertical]);

  const hasActiveFilters = query.trim() || vertical !== allTemplatesFilter;

  function resetFilters() {
    setQuery("");
    setVertical(allTemplatesFilter);
  }

  function createTemplateFromScratch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTemplateName.trim()) {
      return;
    }

    const created = createBlankCustomRoomTemplate({
      name: newTemplateName,
      vertical: newTemplateVertical,
      application: newTemplateApplication,
      scale: newTemplateScale,
      summary: newTemplateSummary,
    });

    saveCustomRoomTemplate(created, { id: created.id });

    setNewTemplateName("");
    setNewTemplateVertical("");
    setNewTemplateApplication("");
    setNewTemplateScale("");
    setNewTemplateSummary("");    setShowCustomTemplate(false);

  }

  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">
      <header className="wm-page-header wm-template-hero wm-template-products-style-header">
        <div className="wm-template-products-style-copy">
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <p className="wm-copy">
            Start from a complete governed room solution, filter by vertical, then review the VERIFIED BOM and application-led proposal content.
          </p>
        </div>

        <h1 className="wm-page-title wm-template-products-style-title">Templates</h1>
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

        <div className="wm-template-filter-actions">
          {customTemplates.length > 0 ? (
            <span className="wm-template-custom-count">
              {customTemplates.length} custom
            </span>
          ) : null}

          <button
            type="button"
            className="wm-button wm-button-secondary"
            onClick={() => setShowCustomTemplate((current) => !current)}
            aria-expanded={showCustomTemplate}
            aria-controls="custom-template-panel"
          >
            {showCustomTemplate ? "Close custom template" : "Create custom template"}
          </button>
        </div>
      </section>

      {showCustomTemplate ? (
        <section
          id="custom-template-panel"
          className="wm-section-card wm-template-create-panel wm-template-create-panel-collapsible"
          aria-label="Create a custom template"
        >
          <div className="wm-template-create-heading">
            <div>
              <p className="wm-template-kicker wm-ui-kicker">Optional</p>
              <h2 className="wm-section-title">Create a custom template</h2>
              <p className="wm-copy">
                Create a reusable starting point only when none of the governed templates fit the opportunity.
              </p>
            </div>

            <button
              type="button"
              className="wm-button wm-button-ghost"
              onClick={() => setShowCustomTemplate(false)}
            >
              Cancel
            </button>
          </div>

          <form className="wm-template-create-form wm-template-create-form-compact" onSubmit={createTemplateFromScratch}>
            <label className="wm-field wm-template-create-name">
              Name
              <input
                className="wm-input"
                type="text"
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="e.g. Council chamber custom room"
                required
                autoFocus
              />
            </label>

            <label className="wm-field">
              Vertical
              <input
                className="wm-input"
                type="text"
                value={newTemplateVertical}
                onChange={(event) => setNewTemplateVertical(event.target.value)}
                placeholder="e.g. Government"
              />
            </label>

            <label className="wm-field">
              Application
              <input
                className="wm-input"
                type="text"
                value={newTemplateApplication}
                onChange={(event) => setNewTemplateApplication(event.target.value)}
                placeholder="e.g. Hybrid civic meetings"
              />
            </label>

            <label className="wm-field">
              Scale
              <input
                className="wm-input"
                type="text"
                value={newTemplateScale}
                onChange={(event) => setNewTemplateScale(event.target.value)}
                placeholder="e.g. Custom"
              />
            </label>

            <label className="wm-field wm-template-create-summary">
              Summary
              <textarea
                className="wm-input"
                value={newTemplateSummary}
                onChange={(event) => setNewTemplateSummary(event.target.value)}
                placeholder="Short description of this room design starting point."
                rows={2}
              />
            </label>

            <div className="wm-template-create-actions">
              <button type="submit" className="wm-button wm-button-primary">
                Create template
              </button>
              <button
                type="button"
                className="wm-button wm-button-secondary"
                onClick={() => setShowCustomTemplate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="wm-template-results-header wm-section-card">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Template library</p>
          <h2 className="wm-section-title">
            {filteredTemplates.length} of {allTemplates.length} templates
          </h2>
        </div>

        {hasActiveFilters ? (
          <button type="button" className="wm-button wm-button-secondary" onClick={resetFilters}>
            Reset filters
          </button>
        ) : null}
      </section>

      <section className="wm-section wm-template-card-grid" aria-label="Room templates">
        {filteredTemplates.map((template) => (
          <article key={template.id} className="wm-action-card wm-template-card">
            <div className="wm-template-card-top">
              {"customTemplate" in template && template.customTemplate ? <span className="wm-badge">Custom</span> : null}
              <span className="wm-badge">{template.vertical}</span>
              <span className="wm-badge">{template.scale}</span>
              {template.verification?.status ? <span className="wm-badge">VERIFIED</span> : null}
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
          <h2 className="wm-section-title">Nothing matches those filters</h2>
          <p className="wm-copy">Adjust the search or vertical filter to show more room archetypes.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
