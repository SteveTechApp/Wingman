import * as React from "react";
import type {
  CatalogueFilterGroup,
  CatalogueStatus,
  CatalogueTechnology,
} from "./catalogue.types";
import "./catalogue2.css";

type CatalogueFiltersProps = {
  technologyOptions: CatalogueTechnology[];
  productTypeOptions: string[];
  subTypeGroups: CatalogueFilterGroup[];
  featureGroups: CatalogueFilterGroup[];
  statusOptions: CatalogueStatus[];
  selectedTechnology: CatalogueTechnology[];
  selectedProductTypes: string[];
  selectedSubTypes: string[];
  selectedFeatures: string[];
  selectedStatus: CatalogueStatus[];
  onToggleTechnology: (value: CatalogueTechnology) => void;
  onToggleProductType: (value: string) => void;
  onToggleSubType: (value: string) => void;
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

type FilterClusterListProps = {
  groups: CatalogueFilterGroup[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  emptyMessage: string;
  keyPrefix: string;
};

const DEFAULT_OPEN_SECTIONS: Record<string, boolean> = {
  technology: true,
  productType: true,
  subType: true,
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
    .replace(/Ãƒ.+$/g, "")
    .replace(/Ã‚/g, "")
    .replace(/Ã¢.+$/g, "")
    .trim();
}

function RenderCheck({ value, active, onClick }: RenderCheckProps) {
  return (
    <button
      type="button"
      className={active ? "wm-cat2__check is-active" : "wm-cat2__check"}
      onClick={onClick}
    >
      <span className="wm-cat2__check-box">{active ? "âœ“" : ""}</span>
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

function FilterClusterList({
  groups,
  selectedValues,
  onToggle,
  emptyMessage,
  keyPrefix,
}: FilterClusterListProps) {
  if (groups.length === 0) {
    return <p className="wm-cat2__facet-empty">{emptyMessage}</p>;
  }

  return (
    <div className="wm-cat2__facet-clusters">
      {groups.map((group) => (
        <div key={group.key} className="wm-cat2__facet-cluster">
          <div className="wm-cat2__facet-copy">
            <p className="wm-cat2__facet-title">{group.title}</p>
            {group.subtitle ? <p className="wm-cat2__facet-subtitle">{group.subtitle}</p> : null}
          </div>

          <div className="wm-cat2__check-list">
            {group.items.map((item) => (
              <RenderCheck
                key={`${keyPrefix}-${group.key}-${item}`}
                value={item}
                active={selectedValues.includes(item)}
                onClick={() => onToggle(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
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
      productType: true,
      subType: true,
      features: true,
      lifecycle: true,
    });
  }

  function collapseAll() {
    setOpenSections({
      technology: false,
      productType: false,
      subType: false,
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
        title="Technology / Capability"
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
        title="Technology Filters"
        sectionKey="productType"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        {props.productTypeOptions.map((item) => (
          <RenderCheck
            key={"product-type-" + item}
            value={item}
            active={props.selectedProductTypes.includes(item)}
            onClick={() => props.onToggleProductType(item)}
          />
        ))}
      </FilterSection>

      <FilterSection
        title="Detail Filters"
        sectionKey="subType"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        <FilterClusterList
          groups={props.subTypeGroups}
          selectedValues={props.selectedSubTypes}
          onToggle={props.onToggleSubType}
          emptyMessage="No additional detail filters are available for the current selection."
          keyPrefix="subtype"
        />
      </FilterSection>

      <FilterSection
        title="Feature Tags"
        sectionKey="features"
        openSections={openSections}
        onToggleSection={toggleSection}
      >
        <FilterClusterList
          groups={props.featureGroups}
          selectedValues={props.selectedFeatures}
          onToggle={props.onToggleFeature}
          emptyMessage="No feature tags are available for the current selection."
          keyPrefix="feature"
        />
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
