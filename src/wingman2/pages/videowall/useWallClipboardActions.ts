import { getCurrentWorkflowProject } from "../../features/projects";
import type { WallDecision } from "../../lib/videowallDecision";
import type { WallOption, WallRequirements } from "../../lib/videowallOptions";
import type { WallReviewStageKey } from "../../lib/videowallWizard";
import { wallDesignClipboard } from "../../lib/wallDesignClipboard";
import { WALL_SHARE_COPY_FAILED, wallShareClipboard, wallShareNote, wallShareSearch } from "../../lib/wallShareLink";

/**
 * The two ways a rep takes a design out of the builder: the summary as text, and
 * the wall as an address.
 *
 * Both are clipboard work with a message back, so they live beside the builder
 * view instead of inside the page entry, which has a line budget. The text is
 * the same one the screen shows, and the address is the one the page keeps in
 * the address bar plus the chosen design — pasting it reopens this reading.
 */
export function useWallClipboardActions(args: {
  requirements: WallRequirements;
  /** The design as it would be ordered, build included. */
  selected: WallOption | null;
  decision: WallDecision;
  /** The design the rep picked, when it is not the recommendation. */
  pickedId: string | null;
  /** That design's title, so the confirmation names what the link carries. */
  pickedTitle: string | null;
  pass: WallReviewStageKey;
  pathname: string;
  search: string;
  resolutionText: string;
  canvasRationale: string;
  transportHeadline: string;
  transportFlags: string[];
  surveyWarning: string | null;
  concernChecks: string[];
  onMessage: (message: string) => void;
}) {
  /** The design as plain text, ready to paste into an email or a ticket. */
  async function copy() {
    const { selected, onMessage } = args;
    if (!selected) return;
    const text = wallDesignClipboard({
      requirements: args.requirements,
      option: selected,
      decision: args.decision,
      resolutionText: args.resolutionText,
      canvasRationale: args.canvasRationale,
      transportHeadline: args.transportHeadline,
      transportFlags: args.transportFlags,
      surveyWarning: args.surveyWarning,
      concernChecks: args.concernChecks,
    });
    try {
      await navigator.clipboard.writeText(text);
      onMessage("Design summary copied.");
    } catch {
      onMessage("Clipboard access is unavailable. Select the design text and copy it manually.");
    }
  }

  /** The wall, the pass and the chosen design as an address, plus what travelled. */
  async function copyLink() {
    const { requirements, pass, onMessage } = args;
    try {
      const search = wallShareSearch(args.search, requirements, pass, args.pickedId);
      // An absolute address: the paste target is usually chat or email.
      const address = new URL(`${args.pathname}?${search.toString()}`, window.location.origin).href;
      // The clipboard gets the sentence as well as the address, so a paste into
      // chat names whose wall it is and which panel it opens.
      await navigator.clipboard.writeText(wallShareClipboard({
        project: getCurrentWorkflowProject()?.name ?? null,
        requirements,
        pass,
        address,
      }));
      onMessage(wallShareNote(requirements, pass, args.pickedTitle));
    } catch {
      onMessage(WALL_SHARE_COPY_FAILED);
    }
  }

  return { copy, copyLink };
}
