const fs = require("fs");

const path = "src/wingman2/pages/TemplatesPage.tsx";
let text = fs.readFileSync(path, "utf8");

function fail(message) {
  throw new Error(message);
}

function replaceRequired(search, replacement, label) {
  if (!text.includes(search)) {
    fail(`Missing expected source for ${label}`);
  }
  text = text.replace(search, replacement);
}

replaceRequired(
  `import { roomTemplates } from "../lib/roomTemplates";`,
  `import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";`,
  "roomTemplates import"
);

replaceRequired(
  `import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";

export function TemplatesPage() {`,
  `import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";

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

export function TemplatesPage() {`,
  "helper block"
);

const oldLogic = `export function TemplatesPage() {
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
  }, [query]);`;

const newLogic = `export function TemplatesPage() {
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
  };`;

replaceRequired(oldLogic, newLogic, "TemplatesPage state and filtering");

const oldFilterPanel = `      <section className="wm-section-card wm-template-filter-panel">
        <label className="wm-field wm-template-search">
          <span>Search templates</span>
          <input
            className="wm-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, application or product..."
          />
        </label>
      </section>`;

const newFilterPanel = `      <section className="wm-section-card wm-template-filter-panel">
        <div className="grid gap-4">
          <label className="wm-field wm-template-search">
            <span>Search templates</span>
            <input
              className="wm-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search room, application or product..."
            />
          </label>

          <div className="grid gap-3" aria-label="Template market and vertical filters">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="wm-template-kicker">Market / vertical</p>
                <button type="button" className="wm-button wm-button-secondary" onClick={clearFilters}>
                  Reset filters
                </button>
              </div>

              <div className="wm-action-row">
                {visibleVerticals.map((vertical) => (
                  <button
                    key={vertical}
                    type="button"
                    aria-pressed={activeVertical === vertical}
                    onClick={() => setActiveVertical(vertical)}
                    className={activeVertical === vertical ? "wm-button wm-button-primary" : "wm-button wm-button-secondary"}
                  >
                    {vertical}
                    <span className="wm-badge">{verticalCounts[vertical] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="wm-template-kicker">Application</p>
              <div className="wm-action-row">
                <button
                  type="button"
                  aria-pressed={activeApplication === "All"}
                  onClick={() => setActiveApplication("All")}
                  className={activeApplication === "All" ? "wm-button wm-button-primary" : "wm-button wm-button-secondary"}
                >
                  All
                  <span className="wm-badge">{applicationCounts.All}</span>
                </button>

                {visibleApplicationFilters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    aria-pressed={activeApplication === filter.label}
                    onClick={() => setActiveApplication(filter.label)}
                    className={activeApplication === filter.label ? "wm-button wm-button-primary" : "wm-button wm-button-secondary"}
                  >
                    {filter.label}
                    <span className="wm-badge">{applicationCounts[filter.label] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>`;

replaceRequired(oldFilterPanel, newFilterPanel, "filter panel");

replaceRequired(
  `      <section className="wm-page-header wm-template-results-header">
        <h2 className="wm-section-title">Template Library</h2>
      </section>`,
  `      <section className="wm-page-header wm-template-results-header">
        <div>
          <h2 className="wm-section-title">Template Library</h2>
          <p className="wm-copy">
            Showing {filteredTemplates.length} of {roomTemplates.length} templates
            {activeVertical !== "All" ? \` in \${activeVertical}\` : ""}
            {activeApplication !== "All" ? \` for \${activeApplication.toLowerCase()}\` : ""}.
          </p>
        </div>
      </section>`,
  "results header"
);

replaceRequired(
  `        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">No matching template</h2>
          <p className="wm-copy">Try a room type, application or product name.</p>
        </section>`,
  `        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">No matching template</h2>
          <p className="wm-copy">Try another market, vertical, application, room type or product name.</p>
          <button type="button" className="wm-button wm-button-primary" onClick={clearFilters}>
            Reset filters
          </button>
        </section>`,
  "empty state"
);

for (const marker of ["<<<<<<<", "=======", ">>>>>>>"]) {
  if (text.includes(marker)) {
    fail("Conflict marker found: " + marker);
  }
}

fs.writeFileSync(path, text, "utf8");
console.log("Templates market/application filters applied.");