/**
 * What the app can honestly say about where a wall on screen lives.
 *
 * The builder writes a draft to this browser on every edit, and saves to the
 * project when the rep presses Save. Those two copies drift apart the moment an
 * edit lands, and the rep cannot see which one a reload would reopen — so this
 * answer is stated in one small line rather than inferred from the Save button.
 *
 * Both the builder and the project's saved-wall panel read it, so a rep coming
 * back to the project still learns that the builder holds newer work.
 */

export type WallDraftStatus = {
  state: "draft-ahead" | "draft-only";
  /** The sentence the builder prints; it names both copies and what to do. */
  text: string;
};

/**
 * The status of the local draft against the project's saved wall, or null when
 * there is nothing to say — no draft to reopen, or the project already holds
 * everything the draft does.
 *
 * A draft stamped exactly at the project's save time is not behind: saving
 * writes both, and the project's stamp is the later of the two.
 */
export function wallDraftStatus(args: {
  /** When this browser last wrote the draft. */
  draftSavedAt?: string | null;
  /** When the current project last saved a wall, when it has one. */
  projectSavedAt?: string | null;
  /** The project the draft says it belongs to, when it says. */
  draftProjectId?: string | null;
  /**
   * The project whose saved wall is being read. A surface that asks about one
   * named project only speaks for the draft that names it: another project's
   * work in this browser is not this project's copy falling behind, and a draft
   * that names nobody cannot be claimed by a project it never belonged to.
   */
  projectId?: string | null;
}): WallDraftStatus | null {
  const draftAt = args.draftSavedAt ? Date.parse(args.draftSavedAt) : NaN;
  if (!Number.isFinite(draftAt)) return null;
  if (args.projectId && args.draftProjectId !== args.projectId) return null;

  const projectAt = args.projectSavedAt ? Date.parse(args.projectSavedAt) : NaN;
  if (!Number.isFinite(projectAt)) {
    return {
      state: "draft-only",
      text: "Draft saved in this browser — the project has no copy yet. A reload is safe; save to add it to the project.",
    };
  }
  if (draftAt <= projectAt) return null;

  return {
    state: "draft-ahead",
    text: "Draft saved in this browser — the project copy is behind. A reload is safe; save to update the project.",
  };
}
