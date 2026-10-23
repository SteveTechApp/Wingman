import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import type { TemplatePreIssueStage, TemplatePreIssueStageKey } from "../lib/templatePreIssue";
import { templatePreIssueStageSearch } from "../lib/templatePreIssuePass";

/**
 * The pre-issue walk as four named readings: blockers, unpriced lines,
 * assumptions, then issue. The rail is also the way back — a rep who wants to
 * reprice after reading the caveats clicks the stage instead of walking forward
 * again — and each step carries what it still holds, so the shape of the review
 * is visible without opening every one.
 */
export function TemplatePreIssueRail({ stage, stages, onStage }: {
  stage: TemplatePreIssueStageKey;
  stages: TemplatePreIssueStage[];
  onStage: (stage: TemplatePreIssueStageKey) => void;
}) {
  return (
    <nav className="wm-preissue-rail" aria-label="Pre-issue checks">
      {stages.map((item, index) => (
        <button
          key={item.key}
          type="button"
          className={`wm-preissue-step${stage === item.key ? " is-active" : ""}${item.open ? " is-open" : ""}`}
          data-testid={`template-preissue-${item.key}`}
          aria-pressed={stage === item.key}
          onClick={() => onStage(item.key)}
        >
          <span className="wm-preissue-step-number" aria-hidden="true">{index + 1}</span>
          <span className="wm-preissue-step-copy">
            <strong>{item.label}</strong>
            <small>{item.status}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}

/** How long the share action keeps its outcome before returning to its prompt. */
const COPIED_MS = 2400;

type CopyState = "idle" | "copied" | "failed";

/**
 * Share the reading on screen, from the rail it is read on.
 *
 * The walk writes its stage into the address as the rep moves, but the stage it
 * opens on is deliberately not written — opening the walk is not a choice — so
 * the address bar is not always the link a rep means to send. This composes the
 * link from the page the rail sits on and the stage the rail is showing, through
 * the same `templatePreIssueStageSearch` the moves write, so the link opens the
 * reading the sender was looking at and keeps any other parameter the page
 * carries.
 *
 * The button names the stage it copies. A row of controls all reading "Copy
 * link" would be indistinguishable destinations to a screen reader, and the
 * stage is what the address actually names. The outcome is the button's own
 * name rather than a live region: the page's status line belongs to the walk,
 * and a browser that refuses the clipboard says so on the control that failed.
 */
export function TemplatePreIssueShare({ stage, stages }: {
  stage: TemplatePreIssueStageKey;
  stages: TemplatePreIssueStage[];
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const label = stages.find((item) => item.key === stage)?.label ?? stage;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function settle(next: CopyState) {
    if (timer.current) clearTimeout(timer.current);
    setState(next);
    timer.current = setTimeout(() => setState("idle"), COPIED_MS);
  }

  const copy = async () => {
    // An absolute address: the paste target is usually chat or email.
    const address = new URL(
      `${location.pathname}?${templatePreIssueStageSearch(location.search, stage)}`,
      window.location.origin,
    ).href;
    try {
      await navigator.clipboard.writeText(address);
      settle("copied");
    } catch {
      settle("failed");
    }
  };

  const name = state === "copied"
    ? `Link to the ${label} stage copied`
    : state === "failed"
      ? `Could not copy the link to the ${label} stage`
      : `Copy link to the ${label} stage`;

  return (
    <button
      type="button"
      className="wm-preissue-share"
      data-copy-state={state}
      data-testid="template-preissue-share"
      aria-label={name}
      title={name}
      onClick={() => void copy()}
    >
      {state === "copied" ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      <span aria-hidden="true">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}
      </span>
    </button>
  );
}

/** Step forward or back without leaving the walk. */
export function TemplatePreIssueNav({ back, next, onBack, onNext }: {
  back?: string;
  next?: string;
  onBack?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="wm-preissue-nav">
      {onBack && back ? (
        <button type="button" className="wm-button wm-button-secondary" onClick={onBack}>
          Back to {back}
        </button>
      ) : <span aria-hidden="true" />}
      {onNext && next ? (
        <button type="button" className="wm-button is-primary" onClick={onNext}>
          Continue to {next}
        </button>
      ) : null}
    </div>
  );
}
