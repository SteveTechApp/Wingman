import { useState } from "react";
import { History, ChevronDown, ChevronRight, RotateCcw, GitCompare, Plus, Minus, ArrowRight, Clock, FileText, Package } from "lucide-react";
import {
  restoreProposalVersion,
  type StoredProposalVersion,
  type StoredProjectProposal,
} from "../data/projectStore";
import { diffProposals, type ProposalDiffResult } from "../lib/proposalDiff";

type Props = {
  versions: StoredProposalVersion[];
  currentProposal: StoredProjectProposal | null;
  onRestore?: () => void;
};

// ─── Diff Entry Icon ──────────────────────────────────────────────────────────

function DiffEntryIcon({ field }: { field: string }) {
  if (field.startsWith("products")) return <Package size={12} aria-hidden="true" />;
  if (field === "title" || field === "summary") return <FileText size={12} aria-hidden="true" />;
  return <ArrowRight size={12} aria-hidden="true" />;
}

// ─── Version Timeline Dot ─────────────────────────────────────────────────────

function VersionTimelineDot({ isLatest, hasChanges }: { isLatest: boolean; hasChanges: boolean }) {
  return (
    <div className="wm-version-timeline-dot-wrapper">
      <div
        className={`wm-version-timeline-dot ${isLatest ? "wm-version-timeline-dot--latest" : ""} ${hasChanges ? "wm-version-timeline-dot--changed" : ""}`}
      />
      {!isLatest && <div className="wm-version-timeline-line" />}
    </div>
  );
}

export function ProposalVersionHistory({ versions, currentProposal, onRestore }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [diff, setDiff] = useState<ProposalDiffResult | null>(null);
  const [viewMode, setViewMode] = useState<"inline" | "side-by-side">("inline");

  if (!versions.length) {
    return (
      <div className="wm-version-history wm-version-history--empty">
        <History size={18} className="opacity-40" aria-hidden="true" />
        <span className="text-sm opacity-60">No version history yet. Versions are saved automatically when the proposal changes significantly.</span>
      </div>
    );
  }

  function handleCompare(versionIndex: number) {
    const version = versions[versionIndex];
    if (!currentProposal) return;
    const result = diffProposals(version.proposal, currentProposal);
    setCompareIndex(versionIndex);
    setDiff(result);
  }

  function handleRestore(versionId: string) {
    const ok = restoreProposalVersion(versionId);
    if (ok && onRestore) onRestore();
  }

  return (
    <div className="wm-version-history">
      <button
        type="button"
        className="wm-version-history-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <History size={16} aria-hidden="true" />
        <span className="font-black">Version history</span>
        <span className="opacity-50 text-xs">({versions.length} version{versions.length !== 1 ? "s" : ""})</span>
      </button>

      {expanded && (
        <div className="wm-version-history-panel">
          {/* View mode toggle */}
          <div className="wm-version-history-controls">
            <div className="wm-version-history-view-toggle">
              <button
                type="button"
                className={`wm-version-history-view-btn ${viewMode === "inline" ? "wm-version-history-view-btn--active" : ""}`}
                onClick={() => setViewMode("inline")}
              >
                Inline
              </button>
              <button
                type="button"
                className={`wm-version-history-view-btn ${viewMode === "side-by-side" ? "wm-version-history-view-btn--active" : ""}`}
                onClick={() => setViewMode("side-by-side")}
              >
                Side by side
              </button>
            </div>
            <span className="wm-version-history-count">
              {versions.length} version{versions.length !== 1 ? "s" : ""} saved
            </span>
          </div>

          <div className="wm-version-history-list">
            {versions.map((version, index) => (
              <div key={version.id} className="wm-version-history-item">
                {/* Timeline indicator */}
                <VersionTimelineDot
                  isLatest={index === versions.length - 1}
                  hasChanges={compareIndex === index && diff?.hasChanges === true}
                />

                <div className="wm-version-history-item-content">
                  <div className="wm-version-history-item-header">
                    <div className="wm-version-history-item-meta">
                      <span className="font-bold text-sm">{version.label}</span>
                      <div className="wm-version-history-item-details">
                        <span className="wm-version-history-item-detail">
                          <Clock size={11} aria-hidden="true" />
                          {new Date(version.savedAt).toLocaleString()}
                        </span>
                        <span className="wm-version-history-item-detail">
                          <Package size={11} aria-hidden="true" />
                          {version.proposal.products.length} product{version.proposal.products.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="wm-version-history-item-actions">
                      <button
                        type="button"
                        className={`wm-ui-button wm-ui-button-secondary text-xs ${compareIndex === index ? "is-active" : ""}`}
                        onClick={() => handleCompare(index)}
                      >
                        <GitCompare size={12} aria-hidden="true" /> Compare
                      </button>
                      <button
                        type="button"
                        className="wm-ui-button wm-ui-button-secondary text-xs"
                        onClick={() => handleRestore(version.id)}
                      >
                        <RotateCcw size={12} aria-hidden="true" /> Restore
                      </button>
                    </div>
                  </div>

                  {/* Diff panel for this version vs current */}
                  {compareIndex === index && diff && (
                    <div className={`wm-version-diff-panel ${viewMode === "side-by-side" ? "wm-version-diff-panel--side-by-side" : ""}`}>
                      {diff.hasChanges ? (
                        <>
                          <div className="wm-version-diff-summary">
                            <div className="wm-version-diff-summary-stats">
                              {diff.addedSkus.length > 0 && (
                                <span className="wm-version-diff-stat wm-version-diff-stat--added">
                                  <Plus size={12} aria-hidden="true" /> +{diff.addedSkus.length} product{diff.addedSkus.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {diff.removedSkus.length > 0 && (
                                <span className="wm-version-diff-stat wm-version-diff-stat--removed">
                                  <Minus size={12} aria-hidden="true" /> -{diff.removedSkus.length} product{diff.removedSkus.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <span className="wm-version-diff-summary-text">{diff.summary}</span>
                          </div>

                          {viewMode === "inline" ? (
                            <ul className="wm-version-diff-list">
                              {diff.entries.map((entry, i) => (
                                <li key={`${entry.field}-${i}`} className="wm-version-diff-entry">
                                  <div className="wm-version-diff-entry-header">
                                    <DiffEntryIcon field={entry.field} />
                                    <span className="wm-version-diff-field">{entry.field}</span>
                                  </div>
                                  <span className="wm-version-diff-desc">{entry.description}</span>
                                  <div className="wm-version-diff-values">
                                    {entry.oldValue && entry.oldValue.length < 200 && (
                                      <div className="wm-version-diff-old">
                                        <Minus size={10} aria-hidden="true" /> {entry.oldValue}
                                      </div>
                                    )}
                                    {entry.newValue && entry.newValue.length < 200 && (
                                      <div className="wm-version-diff-new">
                                        <Plus size={10} aria-hidden="true" /> {entry.newValue}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="wm-version-diff-side-by-side">
                              <div className="wm-version-diff-column wm-version-diff-column--old">
                                <div className="wm-version-diff-column-header">Previous (v{version.versionNumber})</div>
                                {diff.entries.map((entry, i) => (
                                  <div key={`old-${i}`} className="wm-version-diff-side-entry">
                                    <span className="wm-version-diff-side-field">{entry.field}</span>
                                    {entry.oldValue && entry.oldValue.length < 200 && (
                                      <span className="wm-version-diff-side-value wm-version-diff-side-value--old">{entry.oldValue}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="wm-version-diff-column wm-version-diff-column--new">
                                <div className="wm-version-diff-column-header">Current</div>
                                {diff.entries.map((entry, i) => (
                                  <div key={`new-${i}`} className="wm-version-diff-side-entry">
                                    <span className="wm-version-diff-side-field">{entry.field}</span>
                                    {entry.newValue && entry.newValue.length < 200 && (
                                      <span className="wm-version-diff-side-value wm-version-diff-side-value--new">{entry.newValue}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* SKU badges */}
                          {diff.addedSkus.length > 0 && (
                            <div className="wm-version-diff-skus">
                              <span className="wm-version-diff-skus-label wm-version-diff-skus-label--added">
                                <Plus size={12} aria-hidden="true" /> Added
                              </span>
                              <div className="wm-version-diff-sku-list">
                                {diff.addedSkus.map((sku) => (
                                  <span key={sku} className="wm-version-diff-sku wm-version-diff-sku--added">{sku}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {diff.removedSkus.length > 0 && (
                            <div className="wm-version-diff-skus">
                              <span className="wm-version-diff-skus-label wm-version-diff-skus-label--removed">
                                <Minus size={12} aria-hidden="true" /> Removed
                              </span>
                              <div className="wm-version-diff-sku-list">
                                {diff.removedSkus.map((sku) => (
                                  <span key={sku} className="wm-version-diff-sku wm-version-diff-sku--removed">{sku}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="wm-version-diff-empty">
                          <span className="text-xs opacity-60">No differences found between this version and the current proposal.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
