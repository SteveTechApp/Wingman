import * as React from "react";
import type {
  CatalogueStatus,
  CatalogueTechnology,
} from "./catalogue.types";
import "./catalogue2.css";

type CatalogueFiltersProps = {
  technologyOptions: CatalogueTechnology[];
  categoryOptions: string[];
  featureOptions: string[];
  statusOptions: CatalogueStatus[];
  selectedTechnology: CatalogueTechnology[];
  selectedCategory: string[];
  selectedFeatures: string[];
  selectedStatus: CatalogueStatus[];
  onToggleTechnology: (value: CatalogueTechnology) => void;
  onToggleCategory: (value: string) => void;
  onToggleFeature: (value: string) => void;
  onToggleStatus: (value: CatalogueStatus) => void;
  onClear: () => void;
};

type RenderCheckProps = {
  value: string;
  active: boolean;
  onClick: () => void;
};

type FilterSectionProps = {
  title: string;
  sectionKey: string;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionKey: string) => void;
  children: React.ReactNode;
};

const DEFAULT_OPEN_SECTIONS: Record<string, boolean> = {
  technology: true,
  category: true,
  features: false,
  lifecycle: false,
};

function cleanFilterLabel(value: string): string {
  const v = String(value || "").trim();

  if (v === "Videowall") return "Video Wall";
  if (v === "Zoom certified") return "Zoom Certified";
  if (v === "ZOOM Certification") return "Zoom Certified";
  if (v === "Web-UI") return "Web UI";
  if (v === "WEB GUI and RS232 control") return "Web GUI and RS232 Control";

  return v
    .replace(/Ã.+$/g, "")
    .replace(/Â/g, "")
    .replace(/â.+$/g, "")
    .trim();
}

function RenderCheck({ value, active, onClick }: RenderCheckProps) {
  return (
    <button
      type="button"
      className={active ? "wm-cat2__check is-active" : "wm-cat2__check"}
      onClick={onClick}
    >
      <span className="wm-cat2__check-box">{active ? "✓" : ""}</span>
      <span>{cleanFilterLabel(value)}</span>
    </button>
  );
}

function FilterSection({
  title,
  sectionKey,
  openSections,
  onToggleSection,
  children,
}: FilterSectionProps) {
  const isOpen = !!openSections[sectionKey];

  return (
    <section className="wm-cat2__filter-group">
      <button
        type="button"
        className="wm-cat2__filter-toggle"
        onClick={() => onToggleSection(sectionKey)}
        aria-expanded={isOpen}
        aria-controls={"section-" + sectionKey}
      >
        <span>{title}</span>
        <span
          className={
            isOpen
              ? "wm-cat2__filter-chevron is-open"
              : "wm-cat2__filter-chevron"
          }
        >
          v
        </span>
      </button>

      {isOpen ? (
        <div id={"section-" + sectionKey} className="wm-cat2__check-list">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export default function CatalogueFilters(props: CatalogueFiltersProps) {
  const [openSections, setOpenSections] =
    React.useState<Record<string, boolean>>(DEFAULT_OPEN_SECTIONS);

  function toggleSection(sectionKey: string) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  function expandAll() {
    setOpenSections({
      technology: true,
      category: true,
      features: true,
      lifecycle: true,
    });
  }

  function collapseAll() {
    setOpenSections({
      technology: false,
      category: false,
      features: false,
      lifecycle: false,
    });
  }

  return (
    <aside className="wm-work-card wm-cat2__filters">
      <div className="wm-cat2__filters-top">
        <h2>Filters</h2>
        <button type="button" className="wm-cat2__clear" onClick={props.onClear}>
          Clear all
        </button>
      </div>

      <div className="wm-cat2__filters-actions">
        <button
          type="button"
          className="wm-cat2__filters-action"
          onClick={expandAll}
        >
          Expand all
        </button>
        <button
          type="button"
          className="wm-cat2__filters-action"
          onClick={collapseAll}
        >
          Collapse all
        </button>
      </div>

      <FilterSection
        title="Technology Type"
        sectionKey="technology"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        {props.technologyOptions.map((item) => (
          <RenderCheck
            key={"technology-" + item}
            value={item}
            active={props.selectedTechnology.includes(item)}
            onClick={() => props.onToggleTechnology(item)}
          />
        ))}
      </FilterSection>

      <FilterSection
        title="Category"
        sectionKey="category"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        {props.categoryOptions.map((item) => (
          <RenderCheck
            key={"category-" + item}
            value={item}
            active={props.selectedCategory.includes(item)}
            onClick={() => props.onToggleCategory(item)}
          />
        ))}
      </FilterSection>

      <FilterSection
        title="Feature Tags"
        sectionKey="features"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        {props.featureOptions.map((item) => (
          <RenderCheck
            key={"feature-" + item}
            value={item}
            active={props.selectedFeatures.includes(item)}
            onClick={() => props.onToggleFeature(item)}
          />
        ))}
      </FilterSection>

      <FilterSection
        title="Lifecycle"
        sectionKey="lifecycle"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        {props.statusOptions.map((item) => (
          <RenderCheck
            key={"status-" + item}
            value={item}
            active={props.selectedStatus.includes(item)}
            onClick={() => props.onToggleStatus(item)}
          />
        ))}
      </FilterSection>
    </aside>
  );
}
