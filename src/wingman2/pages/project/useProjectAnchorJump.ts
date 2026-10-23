import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { rowAnchorId } from "../../lib/anchorIds";
import {
  projectAnchorTargetFromHash,
  type ProjectAnchorTarget,
} from "../../lib/projectAnchors";

/** How long a landing waits for the panel to render, at one frame per look. */
const LANDING_LOOKS = 90;

/**
 * The page's reader for its own address: a hash names a panel, the panel names
 * its section, and the section is opened before the panel is focused.
 *
 * A link can arrive before the section is on screen — the panel does not exist
 * until its section renders, and the project itself may still be loading — so
 * the target is held and the panel looked for again rather than dropped. The
 * landing happens once per hash: clicking another section afterwards must not
 * pull the reader back, and the hash is dropped when they do move on, so the
 * address keeps naming the panel that is actually on screen rather than one a
 * reload would jump to.
 *
 * When the hash names a row inside the panel, the row is what the reader is
 * taken to and the panel is what takes focus: a table row cannot hold focus,
 * and the panel is what a screen reader reads from. A row that is no longer in
 * the table lands on its panel instead of failing — the review may have been
 * replaced since the link was copied.
 */
export function useProjectAnchorJump(section: string, openSection: (section: string) => void) {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const [target, setTarget] = useState<ProjectAnchorTarget | null>(null);
  const [landedHash, setLandedHash] = useState<string | null>(null);
  const arrived = useRef(false);

  useEffect(() => {
    if (!hash || landedHash === hash) return;
    const next = projectAnchorTargetFromHash(hash);
    // A hash this page does not render is left to the browser: it may name
    // something a previous route owned.
    if (!next) return;
    setLandedHash(hash);
    // Only a link that disagrees with the address writes one: arriving on the
    // section that already holds the panel must not add a history entry.
    if (section !== next.anchor.section) openSection(next.anchor.section);
    setTarget(next);
  }, [hash, landedHash, section, openSection]);

  useEffect(() => {
    if (!target) {
      arrived.current = false;
      return;
    }
    if (section !== target.anchor.section) {
      // Before the section renders, the mismatch is the landing itself; after
      // it, the reader has chosen to leave the panel behind.
      if (arrived.current) setTarget(null);
      return;
    }
    arrived.current = true;
    let frame = 0;
    let looks = 0;
    const land = () => {
      const panel = document.getElementById(target.anchor.id);
      if (!panel) {
        if (looks++ < LANDING_LOOKS) frame = requestAnimationFrame(land);
        return;
      }
      const row = target.rowId ? document.getElementById(rowAnchorId(target.anchor.id, target.rowId)) : null;
      (row ?? panel).scrollIntoView?.({ block: "center" });
      // The panel carries tabIndex={-1} so a deep link can put the reader inside
      // it instead of at the top of the page.
      panel.focus({ preventScroll: true });
      setTarget(null);
    };
    land();
    return () => cancelAnimationFrame(frame);
  }, [target, section]);

  useEffect(() => {
    if (!hash || landedHash !== hash || target) return;
    const next = projectAnchorTargetFromHash(hash);
    // The query is written out again rather than omitted: a partial path would
    // replace the whole search, taking the section with it.
    if (next && next.anchor.section !== section) navigate({ pathname, search, hash: "" }, { replace: true });
  }, [hash, pathname, search, landedHash, section, target, navigate]);
}
