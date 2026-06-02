import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as roomTemplatesModule from "../lib/roomTemplates";
import * as roomTemplatesExtraModule from "../lib/roomTemplatesExtra";

type TemplateRecord = Record<string, unknown>;

type NormalisedTemplate = {
  id: string;
  title: string;
  vertical: string;
  roomType: string;
  fit: string;
  description: string;
  complexity: string;
  sourceCount: string;
  displayCount: string;
  products: string[];
  tags: string[];
};

const fallbackTemplates: TemplateRecord[] = [
  {
    id: "meeting-room-small",
    title: "Small meeting room",
    vertical: "Corporate",
    roomType: "4-6 person room",
    fit: "Single display BYOD meeting space",
    description:
      "Fast starting point for smaller meeting rooms with one display, laptop input, USB collaboration and simple user operation.",
    complexity: "Low",
    sourceCount: "2-3",
    displayCount: "1",
    products: ["SW-220-TX-W", "APO-VX20-UC"],
    tags: ["BYOD", "USB", "Wireless", "Single display"],
  },
  {
    id: "boardroom-dual-display",
    title: "Dual display boardroom",
    vertical: "Corporate",
    roomType: "10-16 person room",
    fit: "Presentation plus conferencing with larger room confidence",
    description:
      "Structured starting point for boardrooms needing source switching, USB device routing, dual displays and stronger meeting room confidence.",
    complexity: "Medium",
    sourceCount: "4-6",
    displayCount: "2",
    products: ["SW-640-TX-W", "APO-210-UC"],
    tags: ["Dual display", "USB", "BYOM", "Boardroom"],
  },
  {
    id: "classroom-standard",
    title: "Standard classroom",
    vertical: "Education",
    roomType: "Teaching room",
    fit: "Lecturer source switching and display presentation",
    description:
      "Education template for teaching spaces with lecturer input, display output, simple control expectations and future-ready AV discussion points.",
    complexity: "Medium",
    sourceCount: "3-5",
    displayCount: "1-2",
    products: ["MX-0408-EDU", "SW-620-TX-W"],
    tags: ["Education", "Lectern", "Teaching", "Display"],
  },
  {
    id: "hospitality-sports-bar",
    title: "Sports bar distribution",
    vertical: "Hospitality",
    roomType: "Bar / venue",
    fit: "Multiple screens showing shared or routed sources",
    description:
      "Hospitality starting point for venues with multiple screens, source routing, match-day operation and upgrade path from matrix to AVoIP.",
    complexity: "Medium",
    sourceCount: "4-8",
    displayCount: "6+",
    products: ["MX-0808-KIT", "NHD-120", "NHD-CTL-PRO"],
    tags: ["Hospitality", "TV distribution", "Matrix", "AVoIP"],
  },
  {
    id: "video-wall-lcd",
    title: "LCD video wall",
    vertical: "Commercial",
    roomType: "2x2 / 3x3 display wall",
    fit: "Multi-screen visual impact with correct wall processing",
    description:
      "Template for LCD video wall conversations, including tile count, source count, bezel behaviour, processing and individual panel drive requirements.",
    complexity: "High",
    sourceCount: "1-4",
    displayCount: "4+",
    products: ["SW-0206-VW", "NHD-0401-MV", "NHD-150-RX"],
    tags: ["Video wall", "LCD", "Processing", "Multiview"],
  },
  {
    id: "av-over-ip-campus",
    title: "Campus AVoIP distribution",
    vertical: "Education",
    roomType: "Multi-room estate",
    fit: "Distributed sources and displays across rooms or buildings",
    description:
      "Starting point for larger NetworkHD designs where routing flexibility, network readiness, VLAN planning and decoder count matter.",
    complexity: "High",
    sourceCount: "8+",
    displayCount: "8+",
    products: ["NHD-500", "NHD-600", "NHD-CTL-PRO"],
    tags: ["AVoIP", "NetworkHD", "Campus", "Routing"],
  },
];

const isRecord = (value: unknown): value is TemplateRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readAny = (record: TemplateRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
};

const getText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
};

const safeSlug = (value: string, fallback: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (slug.length > 0) {
    return slug;
  }

  return fallback;
};

const toTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }

        if (isRecord(item)) {
          return getText(
            readAny(item, ["sku", "id", "title", "name", "label", "product"]),
            "",
          );
        }

        return "";
      })
      .filter((item) => item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (isRecord(value)) {
    return Object.values(value)
      .map((item) => getText(item, ""))
      .filter((item) => item.trim().length > 0);
  }

  return [];
};

const looksLikeTemplate = (record: TemplateRecord): boolean => {
  const title = getText(
    readAny(record, ["title", "name", "label", "roomType", "templateName"]),
    "",
  );

  const description = getText(
    readAny(record, ["description", "summary", "overview", "fit", "useCase"]),
    "",
  );

  const hasTemplateSignal =
    record.id !== undefined ||
    record.slug !== undefined ||
    record.vertical !== undefined ||
    record.category !== undefined ||
    record.roomType !== undefined ||
    record.products !== undefined ||
    record.tags !== undefined;

  return title.length > 0 && (description.length > 0 || hasTemplateSignal);
};

const collectTemplates = (value: unknown, depth = 0): TemplateRecord[] => {
  if (depth > 5) {
    return [];
  }

  if (Array.isArray(value)) {
    const records = value.filter(isRecord);
    const templates = records.filter(looksLikeTemplate);

    if (templates.length > 0) {
      return templates;
    }

    return value.flatMap((item) => collectTemplates(item, depth + 1));
  }

  if (isRecord(value)) {
    if (looksLikeTemplate(value)) {
      return [value];
    }

    return Object.values(value).flatMap((item) => collectTemplates(item, depth + 1));
  }

  return [];
};

const normaliseTemplate = (
  record: TemplateRecord,
  index: number,
): NormalisedTemplate => {
  const title = getText(
    readAny(record, ["title", "name", "label", "templateName", "roomType"]),
    `Template ${index + 1}`,
  );

  const vertical = getText(
    readAny(record, ["vertical", "category", "market", "sector", "segment"]),
    "General",
  );

  const roomType = getText(
    readAny(record, ["roomType", "room", "space", "layout", "application"]),
    "",
  );

  const fit = getText(
    readAny(record, [
      "fit",
      "bestFor",
      "useCase",
      "customerRequirement",
      "customerNeed",
      "applicationFit",
    ]),
    roomType || vertical,
  );

  const description = getText(
    readAny(record, ["description", "summary", "overview", "notes"]),
    "Reusable Wingman starting point for a customer conversation, discovery flow, product direction and proposal structure.",
  );

  const products = toTextList(
    readAny(record, [
      "products",
      "productSkus",
      "skus",
      "recommendedProducts",
      "equipment",
      "hardware",
    ]),
  ).slice(0, 5);

  const rawTags = [
    ...toTextList(readAny(record, ["tags", "keywords", "features"])),
    vertical,
    roomType,
  ].filter((item) => item.trim().length > 0);

  const tags = Array.from(new Set(rawTags)).slice(0, 6);

  const sourceCount = getText(
    readAny(record, ["sourceCount", "sources", "inputs", "inputCount"]),
    "Check",
  );

  const displayCount = getText(
    readAny(record, ["displayCount", "displays", "outputs", "outputCount"]),
    "Check",
  );

  const complexity = getText(
    readAny(record, ["complexity", "difficulty", "risk", "designComplexity"]),
    "Medium",
  );

  const explicitId = getText(readAny(record, ["id", "slug", "key"]), "");

  return {
    id: explicitId || safeSlug(title, `template-${index + 1}`),
    title,
    vertical,
    roomType,
    fit,
    description,
    complexity,
    sourceCount,
    displayCount,
    products,
    tags,
  };
};

const buildTemplateLibrary = (): NormalisedTemplate[] => {
  const importedTemplates = [
    ...collectTemplates(roomTemplatesModule as Record<string, unknown>),
    ...collectTemplates(roomTemplatesExtraModule as Record<string, unknown>),
  ];

  const sourceTemplates =
    importedTemplates.length > 0 ? importedTemplates : fallbackTemplates;

  const normalised = sourceTemplates.map(normaliseTemplate);
  const deduped = new Map<string, NormalisedTemplate>();

  for (const template of normalised) {
    const dedupeKey = `${template.id}-${template.title}`.toLowerCase();

    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, template);
    }
  }

  return Array.from(deduped.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
};

const TemplatesPage = () => {
  const templates = useMemo(() => buildTemplateLibrary(), []);
  const [query, setQuery] = useState("");
  const [activeVertical, setActiveVertical] = useState("All");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const verticals = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(templates.map((template) => template.vertical))).sort(),
    ];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesVertical =
        activeVertical === "All" || template.vertical === activeVertical;

      const searchable = [
        template.title,
        template.vertical,
        template.roomType,
        template.fit,
        template.description,
        ...template.products,
        ...template.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        normalisedQuery.length === 0 || searchable.includes(normalisedQuery);

      return matchesVertical && matchesQuery;
    });
  }, [activeVertical, query, templates]);

  const hasSearch = query.trim().length > 0;
  const showNameOnlyCards =
    activeVertical === "All" && !hasSearch && activeTemplateId === null;

  const activeTemplate = showNameOnlyCards
    ? null
    : templates.find((template) => template.id === activeTemplateId) ||
      filteredTemplates[0] ||
      templates[0];

  const highComplexityCount = templates.filter((template) =>
    template.complexity.toLowerCase().includes("high"),
  ).length;

  return (
        <main
      className={
        showNameOnlyCards
          ? "wm-page wm-template-library-page is-name-only-mode"
          : "wm-page wm-template-library-page"
      }
    >
      <header className="wm-page-header wm-template-library-header">
        <div>
          <p className="wm-section-kicker">Wingman template library</p>
          <h1 className="wm-page-title">Choose the right starting point faster</h1>
          <p className="wm-page-subtitle">
            Compact room and application templates for discovery, product direction
            and proposal preparation without scrolling through a long page.
          </p>
        </div>

        <div className="wm-template-library-header-actions">
          <Link className="wm-secondary-action" to="/wingman/discovery">
            Start discovery
          </Link>
          <Link className="wm-primary-action" to="/wingman/product-pitch">
            Product pitch
          </Link>
        </div>
      </header>

      <section className="wm-template-library-stats" aria-label="Template summary">
        <div className="wm-template-stat-card">
          <span>{templates.length}</span>
          <p>available templates</p>
        </div>
        <div className="wm-template-stat-card">
          <span>{verticals.length - 1}</span>
          <p>vertical groups</p>
        </div>
        <div className="wm-template-stat-card">
          <span>{highComplexityCount}</span>
          <p>high-complexity starts</p>
        </div>
        <div className="wm-template-stat-card">
          <span>{filteredTemplates.length}</span>
          <p>visible now</p>
        </div>
      </section>

      <section
        className={
          showNameOnlyCards
            ? "wm-template-library-workspace is-name-only-mode"
            : "wm-template-library-workspace"
        }
      >
        <aside className="wm-template-filter-panel" aria-label="Template filters">
          <div className="wm-template-filter-search">
            <label htmlFor="template-search">Find a template</label>
            <input
              id="template-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveTemplateId(null);
              }}
              placeholder="Search room, product, vertical..."
              type="search"
            />
          </div>

          <div className="wm-template-filter-list">
            <p className="wm-section-kicker">Application type</p>
            {verticals.map((vertical) => (
              <button
                className={
                  vertical === activeVertical
                    ? "wm-template-filter-button is-active"
                    : "wm-template-filter-button"
                }
                key={vertical}
                onClick={() => {
                  setActiveVertical(vertical);
                  setActiveTemplateId(null);
                }}
                type="button"
              >
                <span>{vertical}</span>
                <strong>
                  {vertical === "All"
                    ? templates.length
                    : templates.filter((template) => template.vertical === vertical)
                        .length}
                </strong>
              </button>
            ))}
          </div>
        </aside>

        <div className="wm-template-results-panel">
          <div className="wm-template-results-toolbar">
            <div>
              <p className="wm-section-kicker">Template results</p>
              <h2 className="wm-section-title">
                {showNameOnlyCards
                  ? `${filteredTemplates.length} templates`
                  : `${filteredTemplates.length} matching starting points`}
              </h2>
            </div>
            <button
              className="wm-secondary-action"
              onClick={() => {
                setQuery("");
                setActiveVertical("All");
              }}
              type="button"
            >
              Clear filters
            </button>
          </div>

          <div className="wm-template-card-grid">
            {filteredTemplates.map((template) => (
              <button
                className={[
                  "wm-template-card",
                  activeTemplate?.id === template.id ? "is-active" : "",
                  showNameOnlyCards ? "is-name-only" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${template.id}-${template.title}`}
                onClick={() => setActiveTemplateId(template.id)}
                type="button"
              >
                {showNameOnlyCards ? (
                  <h3>{template.title}</h3>
                ) : (
                  <>
                    <div className="wm-template-card-topline">
                      <span>{template.vertical}</span>
                      <strong>{template.complexity}</strong>
                    </div>

                    <h3>{template.title}</h3>
                    <p>{template.fit}</p>

                    <div className="wm-template-card-meta">
                      <span>Sources: {template.sourceCount}</span>
                      <span>Displays: {template.displayCount}</span>
                    </div>

                    <div className="wm-template-card-tags">
                      {template.tags.slice(0, 4).map((tag) => (
                        <span key={`${template.id}-${tag}`}>{tag}</span>
                      ))}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="wm-template-empty-state">
              <h3>No matching templates</h3>
              <p>
                Clear the filter or search for a broader room type such as meeting,
                classroom, hospitality, video wall or AVoIP.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="wm-template-preview-panel" aria-label="Selected template">
          {activeTemplate ? (
            <>
              <p className="wm-section-kicker">Selected template</p>
              <h2 className="wm-section-title">{activeTemplate.title}</h2>
              <p className="wm-template-preview-fit">{activeTemplate.fit}</p>
              <p>{activeTemplate.description}</p>

              <div className="wm-template-preview-grid">
                <div>
                  <span>Vertical</span>
                  <strong>{activeTemplate.vertical}</strong>
                </div>
                <div>
                  <span>Room</span>
                  <strong>{activeTemplate.roomType || "Check in discovery"}</strong>
                </div>
                <div>
                  <span>Sources</span>
                  <strong>{activeTemplate.sourceCount}</strong>
                </div>
                <div>
                  <span>Displays</span>
                  <strong>{activeTemplate.displayCount}</strong>
                </div>
              </div>

              <div className="wm-template-preview-products">
                <h3>Likely product conversation</h3>
                {activeTemplate.products.length > 0 ? (
                  <div>
                    {activeTemplate.products.map((product) => (
                      <span key={`${activeTemplate.id}-${product}`}>{product}</span>
                    ))}
                  </div>
                ) : (
                  <p>Use discovery to confirm the product route.</p>
                )}
              </div>

              <div className="wm-template-preview-actions">
                <Link
                  className="wm-primary-action"
                  to={`/wingman/discovery?template=${encodeURIComponent(
                    activeTemplate.id,
                  )}`}
                >
                  Use in discovery
                </Link>
                <Link
                  className="wm-secondary-action"
                  to={`/wingman/product-pitch?template=${encodeURIComponent(
                    activeTemplate.id,
                  )}`}
                >
                  Build pitch
                </Link>
              </div>
            </>
          ) : (
            <div className="wm-template-empty-state">
              <h3>No template selected</h3>
              <p>Select a template card to preview the application fit.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
};

export { TemplatesPage };
export default TemplatesPage;



