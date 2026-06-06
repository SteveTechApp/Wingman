import { useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  useProductIntelligenceAdmin,
  type ProductIntelligenceRecord,
  type IntelligenceReviewStatus,
} from "../data/productIntelligenceAdmin";

const STATUS_LABELS: Record<IntelligenceReviewStatus, string> = {
  draft: "Draft",
  "needs-review": "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<IntelligenceReviewStatus, string> = {
  draft: "wm-status-draft",
  "needs-review": "wm-status-needs-review",
  approved: "wm-status-approved",
  rejected: "wm-status-rejected",
};

function RecordCard({ record }: { record: ProductIntelligenceRecord }) {
  const approvedSurfaces = Object.entries(record.approvedFor)
    .filter(([, approved]) => approved)
    .map(([surface]) => surface);

  return (
    <div className="wm-intelligence-card" data-source-type={record.sourceType}>
      <div className="wm-intelligence-card-header">
        <span className={`wm-intelligence-status ${STATUS_COLORS[record.reviewStatus]}`}>
          {STATUS_LABELS[record.reviewStatus]}
        </span>
        <span className="wm-intelligence-source-type">
          {record.sourceType === "wyrestorm" ? "WyreStorm" : "Competitor"}
        </span>
      </div>

      <div className="wm-intelligence-card-body">
        <strong className="wm-intelligence-sku">{record.sku}</strong>
        {record.productName && <span className="wm-intelligence-name">{record.productName}</span>}
        <span className="wm-intelligence-brand">{record.brand}</span>
      </div>

      <div className="wm-intelligence-card-meta">
        <span className="wm-intelligence-class">{record.productClass}</span>
        <span className="wm-intelligence-confidence">Confidence: {record.confidence}%</span>
      </div>

      {record.purpose && (
        <p className="wm-intelligence-purpose">{record.purpose}</p>
      )}

      {approvedSurfaces.length > 0 && (
        <div className="wm-intelligence-approved-for">
          <span>Approved for:</span>
          {approvedSurfaces.map((surface) => (
            <span key={surface} className="wm-intelligence-surface-tag">{surface}</span>
          ))}
        </div>
      )}

      {record.reviewNotes && (
        <p className="wm-intelligence-notes">{record.reviewNotes}</p>
      )}
    </div>
  );
}

export function IntelligencePage() {
  const { records, stats } = useProductIntelligenceAdmin();
  const [filterStatus, setFilterStatus] = useState<IntelligenceReviewStatus | "all">("all");
  const [filterSource, setFilterSource] = useState<"all" | "wyrestorm" | "competitor">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = records.filter((record) => {
    if (filterStatus !== "all" && record.reviewStatus !== filterStatus) return false;
    if (filterSource !== "all" && record.sourceType !== filterSource) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSku = record.sku.toLowerCase().includes(query);
      const matchesName = record.productName.toLowerCase().includes(query);
      const matchesBrand = record.brand.toLowerCase().includes(query);
      const matchesClass = record.productClass.toLowerCase().includes(query);
      if (!matchesSku && !matchesName && !matchesBrand && !matchesClass) return false;
    }
    return true;
  });

  return (
    <main className="wm-intelligence-page" data-wingman-page="intelligence">
      <section className="wm-page-hero wm-navhub-hero" aria-labelledby="wingman-intelligence-title">
        <p className="wm-navhub-eyebrow">Wingman / Learn</p>
        <h1 id="wingman-intelligence-title">Product Intelligence</h1>
        <p>
          Review and classify WyreStorm and competitor intelligence records.
          Intelligence data supports Finder, Compare, Proposal and Pitch surfaces.
        </p>
      </section>

      <section className="wm-intelligence-stats" aria-label="Intelligence statistics">
        <div className="wm-intelligence-stat">
          <span className="wm-intelligence-stat-value">{stats.total}</span>
          <span className="wm-intelligence-stat-label">Total Records</span>
        </div>
        <div className="wm-intelligence-stat">
          <span className="wm-intelligence-stat-value">{stats.wyrestorm}</span>
          <span className="wm-intelligence-stat-label">WyreStorm</span>
        </div>
        <div className="wm-intelligence-stat">
          <span className="wm-intelligence-stat-value">{stats.competitors}</span>
          <span className="wm-intelligence-stat-label">Competitors</span>
        </div>
        <div className="wm-intelligence-stat">
          <span className="wm-intelligence-stat-value">{stats.needsReview}</span>
          <span className="wm-intelligence-stat-label">Needs Review</span>
        </div>
        <div className="wm-intelligence-stat">
          <span className="wm-intelligence-stat-value">{stats.approved}</span>
          <span className="wm-intelligence-stat-label">Approved</span>
        </div>
      </section>

      <section className="wm-intelligence-filters" aria-label="Filter intelligence records">
        <div className="wm-intelligence-search">
          <input
            type="text"
            placeholder="Search SKU, name, brand or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="wm-intelligence-search-input"
          />
        </div>

        <div className="wm-intelligence-filter-group">
          <label htmlFor="filter-status">Status:</label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as IntelligenceReviewStatus | "all")}
            className="wm-intelligence-filter-select"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="needs-review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="wm-intelligence-filter-group">
          <label htmlFor="filter-source">Source:</label>
          <select
            id="filter-source"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as "all" | "wyrestorm" | "competitor")}
            className="wm-intelligence-filter-select"
          >
            <option value="all">All</option>
            <option value="wyrestorm">WyreStorm</option>
            <option value="competitor">Competitor</option>
          </select>
        </div>
      </section>

      <section className="wm-intelligence-records" aria-label="Intelligence records">
        {filteredRecords.length === 0 ? (
          <div className="wm-intelligence-empty">
            <p>No intelligence records match the current filters.</p>
            {records.length === 0 && (
              <p>
                Intelligence records are created when products are added through Finder, Compare, or Proposal workflows.
              </p>
            )}
          </div>
        ) : (
          <div className="wm-intelligence-grid">
            {filteredRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </section>

      <section className="wm-intelligence-related" aria-label="Related tools">
        <h2>Related Tools</h2>
        <div className="wm-navhub-secondary-grid">
          <Link to={routeCatalogByKey.finder.path} className="wm-navhub-card">
            <span>Product Finder</span>
            <strong>Find Products</strong>
            <p>Search the product intelligence index and move from requirement to shortlist.</p>
          </Link>
          <Link to={routeCatalogByKey.compare.path} className="wm-navhub-card">
            <span>Competitor Compare</span>
            <strong>Compare Products</strong>
            <p>Find WyreStorm replacements for competitor products with verdicts and caveats.</p>
          </Link>
          <Link to={routeCatalogByKey.glossary.path} className="wm-navhub-card">
            <span>AV Glossary</span>
            <strong>Learn Terms</strong>
            <p>Look up AV terms, acronyms and technologies in sales-friendly language.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

export const ProductIntelligencePage = IntelligencePage;

export default IntelligencePage;
