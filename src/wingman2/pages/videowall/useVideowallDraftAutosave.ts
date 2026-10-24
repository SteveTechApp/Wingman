import { useEffect, useRef, useState } from "react";
import { rememberVideowallDraft, storedVideowallDraftUpdatedAt } from "../../lib/videowallDraft";
import type { WallRequirements } from "../../lib/videowallOptions";
import type { WallStartingPointOrigin } from "../../lib/wallStartingPointOrigin";

/**
 * Keep the wall the rep is building on this browser as they edit it, rather than
 * only when Save is pressed: a reload has to reopen the wall nobody saved yet,
 * survey cells and all.
 *
 * The first pass writes nothing, because it is the design that was just
 * restored. A shared link's wall is the sender's, so arriving on one must not
 * replace this browser's own draft until the recipient actually changes it.
 *
 * Returns when the draft was last written, which the builder compares with the
 * project's saved wall. The stamp is state rather than a storage read during
 * render so the line reporting it moves on the same edit that moves the draft.
 *
 * It lives beside the builder view instead of in the page entry so the entry
 * stays inside the architecture line allowance.
 */
export function useVideowallDraftAutosave(
  requirements: WallRequirements,
  selectedId: string,
  startingPoint: WallStartingPointOrigin | null,
) {
  const edited = useRef(false);
  // What a reload would reopen: a draft from an earlier visit counts, so the
  // status is already honest on the first paint.
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => storedVideowallDraftUpdatedAt());
  useEffect(() => {
    if (!edited.current) {
      edited.current = true;
      return;
    }
    const writtenAt = rememberVideowallDraft({ requirements, selectedId, startingPoint });
    if (writtenAt) setDraftSavedAt(writtenAt);
  }, [requirements, selectedId, startingPoint]);
  return draftSavedAt;
}
