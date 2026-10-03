import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveLiveResearchReview,
  fetchLiveResearchReviewQueue,
  rejectLiveResearchReview,
  type LiveResearchReviewRecord,
  type LiveResearchReviewStatus,
} from "../../api/wingmanApi";
import type { ProductIntelligenceRecord } from "../../data/productIntelligenceRepository";

function sameProduct(
  record: ProductIntelligenceRecord,
  discovery: LiveResearchReviewRecord,
): boolean {
  return (
    record.vendorType === "competitor" &&
    record.brand.trim().toLowerCase() === discovery.manufacturer.trim().toLowerCase() &&
    record.sku.trim().toUpperCase() === discovery.sku.trim().toUpperCase()
  );
}

function existingTechnology(record?: ProductIntelligenceRecord) {
  return record?.productTruth?.technology;
}

function factsFor(
  discovery: LiveResearchReviewRecord,
  existing?: ProductIntelligenceRecord,
) {
  const researchedTechnology = discovery.technologyProfile;
  const existingTech = existingTechnology(existing);

  return [
    {
      label: "Product class",
      existing: existing?.category || "Not stored",
      researched: discovery.category || "Needs review",
    },
    {
      label: "Role",
      existing: existing?.productTruth?.identity?.role || "Not stored",
      researched: discovery.role || "Needs review",
    },
    {
      label: "Canonical transport",
      existing:
        existingTech?.canonicalTransport ||
        String(existing?.transport || "Not stored"),
      researched:
        researchedTechnology?.canonicalTransport ||
        discovery.transport ||
        "Needs review",
    },
    {
      label: "Vendor technology",
      existing: existingTech?.vendorTechnology || "Not stored",
      researched: researchedTechnology?.vendorTechnology || "Not resolved",
    },
    {
      label: "Network class",
      existing:
        existingTech?.networkClass ||
        existing?.productTruth?.transport?.networkClass ||
        "Not stored",
      researched: researchedTechnology?.networkClass || "Not resolved",
    },
    {
      label: "Codec / standard",
      existing:
        existingTech?.codecStandard ||
        existingTech?.codecName ||
        "Not stored",
      researched:
        researchedTechnology?.codecStandard ||
        researchedTechnology?.codecName ||
        "Not resolved",
    },
  ];
}

function statusLabel(value: LiveResearchReviewStatus) {
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending review";
}

export function LiveResearchReviewQueue({
  existingRecords,
  reviewer,
  onPromoted,
}: {
  existingRecords: ProductIntelligenceRecord[];
  reviewer: string;
  onPromoted: () => Promise<void> | void;
}) {
  const [records, setRecords] = useState<LiveResearchReviewRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | LiveResearchReviewStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchLiveResearchReviewQueue();
      if (!response.ok) {
        throw new Error(response.error || "Unable to load live research review queue.");
      }
      setRecords(response.records ?? []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load live research review queue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      records.filter(
        (record) =>
          statusFilter === "all" || record.reviewStatus === statusFilter,
      ),
    [records, statusFilter],
  );

  async function approve(record: LiveResearchReviewRecord) {
    if (!reviewer.trim()) {
      setMessage("A reviewer identity is required before approval.");
      return;
    }
    if (!record.sourceUrl) {
      setMessage(`${record.sku} has no source URL. Review the discovery before approval.`);
      return;
    }

    setBusyId(record.id);
    try {
      const response = await approveLiveResearchReview({
        id: record.id,
        reviewer,
        sourceUrl: record.sourceUrl,
      });

      if (!response.ok) {
        throw new Error(response.error || "Live research approval failed.");
      }

      await onPromoted();
      await load();
      setMessage(
        `${record.manufacturer} ${record.sku} was promoted to approved competitor intelligence. No equivalence decision was created.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Live research approval failed.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function reject(record: LiveResearchReviewRecord) {
    if (!reviewer.trim()) {
      setMessage("A reviewer identity is required before rejection.");
      return;
    }

    setBusyId(record.id);
    try {
      const response = await rejectLiveResearchReview({
        id: record.id,
        reviewer,
        notes: "Rejected from Data Manager live research review.",
      });

      if (!response.ok) {
        throw new Error(response.error || "Live research rejection failed.");
      }

      await load();
      setMessage(`${record.manufacturer} ${record.sku} was rejected.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Live research rejection failed.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="wm-section-card" aria-labelledby="live-research-review-title">
      <header className="wm-data-quality-heading">
        <div>
          <p className="wm-ui-kicker">Competitor governance</p>
          <h2 id="live-research-review-title">Live Research Review</h2>
          <p>
            Review products discovered automatically by Compare before promoting
            them into approved competitor intelligence.
          </p>
        </div>
        <div className="wm-data-row-actions">
          <select
            aria-label="Live research status filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | LiveResearchReviewStatus,
              )
            }
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All discoveries</option>
          </select>
          <button className="wm-button wm-button-secondary" type="button" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {loading ? <p>Loading live research discoveries...</p> : null}
      {!loading && visible.length === 0 ? (
        <p>No live research records match this filter.</p>
      ) : null}

      <div className="wm-data-table-scroll">
        {visible.map((record) => {
          const existing = existingRecords.find((item) =>
            sameProduct(item, record),
          );
          const facts = factsFor(record, existing);
          const busy = busyId === record.id;

          return (
            <article
              key={record.id}
              className="wm-section-card"
              data-live-research-review={record.reviewStatus}
            >
              <header className="wm-data-table-card">
                <div>
                  <span
                    className={`wm-status ${
                      record.reviewStatus === "approved"
                        ? "is-confirmed"
                        : "is-validate"
                    }`}
                  >
                    {statusLabel(record.reviewStatus)}
                  </span>
                  <h3>{record.manufacturer} {record.sku}</h3>
                  <p>{record.title || record.summary || "Researched competitor product"}</p>
                </div>
                <div>
                  <strong>Researched WyreStorm direction</strong>
                  <p>
                    {record.bestMatch?.sku || "No safe candidate"}{" "}
                    {record.bestMatch?.matchType ? `- ${record.bestMatch.matchType}` : ""}
                  </p>
                  <small>
                    {record.bestMatch?.readiness?.summary ||
                      record.bestMatch?.summary ||
                      "Review required."}
                  </small>
                </div>
              </header>

              <details>
                <summary>Compare researched data with existing record</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Datapoint</th>
                      <th>Existing</th>
                      <th>Researched</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.map((fact) => (
                      <tr key={fact.label}>
                        <th>{fact.label}</th>
                        <td>{fact.existing}</td>
                        <td>{fact.researched}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  <strong>Source:</strong>{" "}
                  {record.sourceUrl ? (
                    <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                      Open researched source
                    </a>
                  ) : (
                    "No reviewable source URL"
                  )}
                </p>
                <p>
                  <strong>Important:</strong> approving this record approves the
                  competitor product data only. It does not approve the proposed
                  WyreStorm equivalence.
                </p>
              </details>

              {record.reviewStatus === "pending" ? (
                <div className="wm-data-row-actions">
                  <button
                    className="wm-button wm-button-primary"
                    type="button"
                    disabled={busy || !record.sourceUrl}
                    onClick={() => void approve(record)}
                  >
                    {busy ? "Saving..." : "Approve & use in Compare"}
                  </button>
                  <button
                    className="wm-button wm-button-secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => void reject(record)}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <p>
                  Reviewed by {record.reviewedBy || "unknown reviewer"}
                  {record.reviewedAt
                    ? ` on ${new Date(record.reviewedAt).toLocaleDateString()}`
                    : ""}.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {message ? <p className="wm-data-message" role="status">{message}</p> : null}
    </section>
  );
}