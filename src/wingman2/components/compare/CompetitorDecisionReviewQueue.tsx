/**
 * CompetitorDecisionReviewQueue - the governed approval desk for the Compare
 * page, mirroring the WyreStorm profile confirmation flow on the dashboard.
 *
 * Lists the ledger's pending-review competitor decisions, sorted by what reps
 * actually face first (recommendation-bearing decisions, then the wireless /
 * matrix / AVoIP lead classes). Approving a row records the reviewer + evidence
 * URL and flips the decision to `approved` in the governed ledger via the
 * server endpoint - the same permission gate (canManageWorkspace) the profile
 * confirmation desk uses. Reps without that permission see the queue read-only.
 */

import { useEffect, useState } from "react";
import {
  approveCompetitorDecision,
  fetchCompetitorDecisionQueue,
  getWingmanSession,
  type CompetitorDecisionQueueItem,
  type CompetitorDecisionQueueResponse,
} from "../../api/wingmanApi";
import { governedDecisionLabel } from "../../lib/governedCompareRuntime";
import type { CompetitorMatchDecision } from "../../lib/competitorMatchDecisionLedger";

/** Label lookup without fabricating a whole decision object. */
function decisionLabel(decisionType: string): string {
  return governedDecisionLabel({ decisionType } as CompetitorMatchDecision);
}

type DecisionTone = "good" | "partial" | "alternative" | "review" | "reject";

function decisionTone(decisionType: string): DecisionTone {
  if (decisionType === "confirmed-equivalent") return "good";
  if (decisionType === "closest-technical-match") return "partial";
  if (decisionType === "architecture-alternative") return "alternative";
  if (decisionType === "no-suitable-match") return "reject";
  return "review";
}

function decisionIcon(decisionType: string): string {
  if (decisionType === "confirmed-equivalent") return "✓";
  if (decisionType === "closest-technical-match") return "≈";
  if (decisionType === "architecture-alternative") return "⇄";
  if (decisionType === "no-suitable-match") return "×";
  return "!";
}

function isEvidenceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function fingerprintLine(item: CompetitorDecisionQueueItem): string {
  const parts = [
    item.productClass || "Unknown class",
    item.endpointRole || "unknown role",
    item.transportClass || "unknown transport",
  ];
  if (item.maxResolution) parts.push(item.maxResolution);
  if (item.inputCount != null || item.routedOutputCount != null) {
    parts.push(`${item.inputCount ?? "?"} in / ${item.routedOutputCount ?? "?"} out`);
  }
  return parts.join(" · ");
}

function QueueRow({
  item,
  canApprove,
  onApproved,
}: {
  item: CompetitorDecisionQueueItem;
  canApprove: boolean;
  onApproved: (item: CompetitorDecisionQueueItem, reviewer: string, reviewedAt?: string) => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function approve(): Promise<void> {
    const reviewerName = reviewer.trim();
    if (!reviewerName) {
      setMessage("Enter the reviewer name before approving this decision.");
      return;
    }
    if (!isEvidenceUrl(evidenceUrl.trim())) {
      setMessage("Add a valid manufacturer or datasheet source URL.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await approveCompetitorDecision({
        competitorManufacturer: item.competitorManufacturer,
        competitorSku: item.competitorSku,
        reviewer: reviewerName,
        evidenceUrl: evidenceUrl.trim(),
      });
      if (!result.ok) {
        setMessage(result.error || "Approval failed.");
        setSaving(false);
        return;
      }
      onApproved(item, reviewerName, result.reviewedAt);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval failed.");
      setSaving(false);
    }
  }

  return (
    <li className="wm-decision-queue__row" data-review-status="pending">
      <div className="wm-decision-queue__head">
        <strong className="wm-decision-queue__identity">
          {item.competitorManufacturer} {item.competitorSku}
        </strong>          <span
            className={`compare-decision-button compare-decision-button--${decisionTone(item.decisionType)} is-selected`}
          >
            <span className="compare-decision-icon" aria-hidden="true">
              {decisionIcon(item.decisionType)}
            </span>
            {decisionLabel(item.decisionType)}
          </span>
        {item.lead ? <span className="wm-decision-queue__lead">Lead class</span> : null}
        <span className="wm-decision-queue__recommendation">
          {item.wyrestormSku ? `→ ${item.wyrestormSku}` : "No recommendation"}
        </span>
      </div>
      <p className="wm-decision-queue__fingerprint">{fingerprintLine(item)}</p>
      {canApprove ? (
        <>
          <div className="wm-decision-queue__actions">
            <label className="wm-field wm-decision-queue__field">
              Reviewer
              <input
                className="wm-input"
                value={reviewer}
                onChange={(event) => {
                  setReviewer(event.target.value);
                  setMessage("");
                }}
                placeholder="Name of technical reviewer"
              />
            </label>
            <label className="wm-field wm-decision-queue__field">
              Manufacturer or datasheet source
              <input
                className="wm-input"
                value={evidenceUrl}
                onChange={(event) => {
                  setEvidenceUrl(event.target.value);
                  setMessage("");
                }}
                placeholder="https://manufacturer.example/product"
              />
            </label>
            <button
              type="button"
              className="compare-native-secondary-action wm-ui-button wm-ui-button-primary"
              disabled={saving}
              onClick={approve}
            >
              {saving ? "Approving…" : "Approve decision"}
            </button>
          </div>
          {message ? <p className="wm-decision-queue__message">{message}</p> : null}
        </>
      ) : (
        <p className="wm-decision-queue__message">
          Approval is restricted to workspace admins - read-only queue.
        </p>
      )}
    </li>
  );
}

export function CompetitorDecisionReviewQueue({
  onApprovalRecorded,
}: {
  /** Called after an approval is recorded so the Compare page can refresh its
   *  promoted ledger decisions and reorder results immediately. */
  onApprovalRecorded?: () => void;
}) {
  const [queue, setQueue] = useState<CompetitorDecisionQueueItem[]>([]);
  const [counts, setCounts] = useState<{ pending: number; approved: number }>({
    pending: 0,
    approved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canApprove, setCanApprove] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [recentlyApproved, setRecentlyApproved] = useState<
    Array<{ competitorManufacturer: string; competitorSku: string; reviewer: string }>
  >([]);

  useEffect(() => {
    let active = true;
    getWingmanSession()
      .then((response) => {
        if (!active) return;
        const session = response.session;
        setCanApprove(
          Boolean(
            session?.permissions?.canManageWorkspace ||
              ["admin", "owner"].includes(String(session?.workspaceRole ?? "").toLowerCase()),
          ),
        );
        setSessionReady(true);
      })
      .catch(() => {
        if (active) setSessionReady(true);
      });
    fetchCompetitorDecisionQueue(100)
      .then((response: CompetitorDecisionQueueResponse) => {
        if (!active) return;
        if (!response.ok) {
          setError(response.error || "Could not load the decision review queue.");
        } else {
          setQueue(response.queue ?? []);
          setCounts({
            pending: response.pending ?? 0,
            approved: response.approved ?? 0,
          });
        }
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Could not load the decision review queue.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleApproved(
    item: CompetitorDecisionQueueItem,
    reviewer: string,
    _reviewedAt?: string,
  ): void {
    setQueue((current) =>
      current.filter(
        (candidate) =>
          !(
            candidate.competitorManufacturer.toLowerCase() ===
              item.competitorManufacturer.toLowerCase() &&
            candidate.competitorSku.toUpperCase() === item.competitorSku.toUpperCase()
          ),
      ),
    );
    setCounts((current) => ({
      pending: Math.max(0, current.pending - 1),
      approved: current.approved + 1,
    }));
    setRecentlyApproved((current) => [
      {
        competitorManufacturer: item.competitorManufacturer,
        competitorSku: item.competitorSku,
        reviewer,
      },
      ...current,
    ]);
    onApprovalRecorded?.();
  }

  return (
    <section
      className="wm-decision-queue wm-ui-section wm-ui-card"
      aria-label="Competitor decision review queue"
    >
      <header className="wm-decision-queue__header">
        <h3 className="wm-ui-title">Competitor decision review queue</h3>
        <p className="wm-ui-copy">
          The governed ledger's pending decisions, sorted by what reps face first:
          recommendation-bearing decisions, then wireless / matrix / AVoIP leads. Approving
          records the reviewer and evidence in the ledger.
        </p>
      </header>

      {!sessionReady || loading ? (
        <p className="wm-ui-copy" aria-live="polite">
          Loading the decision review queue…
        </p>
      ) : error ? (
        <p className="wm-decision-queue__message" role="alert">
          {error}
        </p>
      ) : (
        <>
          <p className="wm-decision-queue__counts" aria-live="polite">
            {counts.pending} pending · {counts.approved} approved
          </p>
          {recentlyApproved.length > 0 ? (
            <p className="wm-decision-queue__message wm-decision-queue__message--ok" aria-live="polite">
              Approved just now:{" "}
              {recentlyApproved
                .map(
                  (entry) =>
                    `${entry.competitorManufacturer} ${entry.competitorSku} (${entry.reviewer})`,
                )
                .join(", ")}{" "}
              - recorded in the governed ledger.
            </p>
          ) : null}
          {queue.length === 0 ? (
            <p className="wm-decision-queue__message wm-decision-queue__message--ok">
              All pending decisions approved - every compare recommendation is human-reviewed.
            </p>
          ) : (
            <ol className="wm-decision-queue__list">
              {queue.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  canApprove={canApprove && sessionReady}
                  onApproved={handleApproved}
                />
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
