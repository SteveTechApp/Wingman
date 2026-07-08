import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { routeCatalogByKey } from "../app/routeCatalog";
import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";

type ApplicationFilter = {
  label: string;
  terms: string[];
};

const applicationFilters: ApplicationFilter[] = [
  { label: "Meeting Rooms", terms: ["meeting", "boardroom", "huddle", "training", "seminar"] },
  { label: "Classrooms", terms: ["classroom", "teaching", "learning", "school hall", "active learning"] },
  { label: "Lecture Theatres", terms: ["lecture", "capture", "theatre"] },
  { label: "Video Walls", terms: ["video wall", "videowall", "wall", "led", "lcd", "feature wall"] },
  { label: "Sports Bars", terms: ["sports bar", "pub", "bar", "casino", "bingo", "stadium"] },
  { label: "Signage", terms: ["signage", "display", "reception", "town hall", "concourse", "status"] },
  { label: "Control Rooms", terms: ["control room", "command", "security", "situation", "operations"] },
  { label: "Event Spaces", terms: ["ballroom", "divisible", "event", "venue", "worship", "stage"] },
];

function normaliseText(value: string) {
  return value.trim().toLowerCase();
}

function templateSearchText(template: RoomTemplate) {
  return [
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
    .toLowerCase();
}

function applicationMatches(template: RoomTemplate, filter: ApplicationFilter) {
  const text = templateSearchText(template);
  return filter.terms.some((term) => text.includes(term));
}

export function TemplatesPage() {
  const [query, setQuery] = useState("");
  const [activeVertical, setActiveVertical] = useState("All");
  const [activeApplication, setActiveApplication] = useState("All");

  const visibleVerticals = useMemo(
    () => roomTemplateVerticals.filter((vertical) => vertical === "All" || roomTemplates.some((template) => template.vertical === vertical)),
    [],
  );

  const visibleApplicationFilters = useMemo(
    () => applicationFilters.filter((filter) => roomTemplates.some((template) => applicationMatches(template, filter))),
    [],
  );

  const verticalCounts = useMemo(() => {
    const counts: Record<string, number> = { All: roomTemplates.length };

    roomTemplates.forEach((template) => {
      counts[template.vertical] = (counts[template.vertical] ?? 0) + 1;
    });

    return counts;
  }, []);

  const applicationCounts = useMemo(() => {
    const counts: Record<string, number> = { All: roomTemplates.length };

    applicationFilters.forEach((filter) => {
      counts[filter.label] = roomTemplates.filter((template) => applicationMatches(template, filter)).length;
    });

    return counts;
  }, []);

  const filteredTemplates = useMemo(() => {
    const search = normaliseText(query);

    return roomTemplates.filter((template) => {
      const verticalMatches = activeVertical === "All" || template.vertical === activeVertical;
      const selectedApplication = applicationFilters.find((filter) => filter.label === activeApplication);
      const applicationFilterMatches =
        activeApplication === "All" || (selectedApplication ? applicationMatches(template, selectedApplication) : true);
      const queryMatches = !search || templateSearchText(template).includes(search);

      return verticalMatches && applicationFilterMatches && queryMatches;
    });
  }, [activeApplication, activeVertical, query]);

  const clearFilters = () => {
    setQuery("");
    setActiveVertical("All");
    setActiveApplication("All");
  };

  return (
    <main className="wm-templates-page wm-page wingman-page-host" data-wingman-page="templates">

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
          <p className="wm-copy">Try another market, vertical, application, room type or product name.</p>
          <button type="button" className="wm-button wm-button-primary" onClick={clearFilters}>
            Reset filters
          </button>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
