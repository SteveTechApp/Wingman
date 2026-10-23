import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { projectAnchorHref, projectAnchors } from "../../lib/projectAnchors";

/** How long the button keeps its outcome before returning to its prompt. */
const COPIED_MS = 2400;

type CopyState = "idle" | "copied" | "failed";

/**
 * Copy this panel's address, so a rep can send a colleague to the panel they are
 * reading rather than to the top of a long project page.
 *
 * The address comes from the anchor registry — the same one the page reads its
 * own hash back through — so this action can only copy a link the page can
 * actually open, and a panel the registry does not know gets no action at all.
 * It is copied as an absolute address, not a path: the paste target is usually
 * chat or email, where "/wingman/projects/…" points nowhere.
 *
 * The button names the panel it copies. Several panels can sit in one section,
 * and a row of controls all called "Copy link" would be indistinguishable
 * destinations to anyone using a screen reader. The outcome is the button's own
 * name instead of a live region: the page already has one status region (the
 * save confirmation), and a second would leave "which status?" to the reader.
 *
 * `compact` drops the visible words for a row of chips, where the control sits
 * beside the thing it copies; `label` renames what the address is called when
 * the address belongs to a section rather than the panel it opens — the address
 * itself always comes from the registry, so the two can never disagree.
 */
export function CopyPanelLink({ projectId, anchorId, compact = false, label }: {
  projectId: string;
  anchorId: string;
  /** Icon-only, for a row of chips rather than a panel header. */
  compact?: boolean;
  /** What this address is called, when the caller is naming a section. */
  label?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = projectAnchors.find((item) => item.id === anchorId) ?? null;
  const href = projectAnchorHref(projectId, anchorId);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // A panel with no address is not something to offer: the page cannot open it.
  if (!anchor || !href) return null;

  function settle(next: CopyState) {
    if (timer.current) clearTimeout(timer.current);
    setState(next);
    timer.current = setTimeout(() => setState("idle"), COPIED_MS);
  }

  const copy = async () => {
    try {
      // The registry stores a path; a shared link has to stand on its own.
      await navigator.clipboard.writeText(new URL(href, window.location.href).href);
      settle("copied");
    } catch {
      // A browser that refuses the clipboard (an insecure context, a denied
      // permission) says so here rather than looking as though it worked.
      settle("failed");
    }
  };

  const target = label ?? anchor.label;
  const name = state === "copied"
    ? `Link to ${target} copied`
    : state === "failed"
      ? `Could not copy the link to ${target}`
      : `Copy link to ${target}`;

  return (
    <button
      type="button"
      className="wm-project-panel-link"
      data-copy-state={state}
      aria-label={name}
      title={name}
      onClick={() => void copy()}
    >
      {state === "copied" ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {compact ? null : <span aria-hidden="true">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy link"}</span>}
    </button>
  );
}
