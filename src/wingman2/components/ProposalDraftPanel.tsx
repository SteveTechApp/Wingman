import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { StoredProposalDraft } from "../data/projectStore";
import { SectionCard } from "./SectionCard";
import {
  PROJECTS_DARK_BUTTON_CLASS,
  PROJECTS_ICON_BUTTON_CLASS,
} from "./projectGalleryStyles";

/**
 * The proposal drafts that have not become projects yet.
 *
 * A draft is a customer document in progress rather than a room, so the list
 * sits beside the gallery instead of inside it: the store keeps one array, but
 * only projects are filtered, paged and owned. The delete confirmation belongs
 * to the tile it was clicked on (arm on the first click, disarm on blur), so the
 * list owns that state and the page hands it the store's actions.
 */
export function ProposalDraftPanel(props: {
  drafts: StoredProposalDraft[];
  onCopy: (draftId: string) => void;
  onDelete: (draftId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDeleteClick(draftId: string) {
    if (confirmDeleteId === draftId) {
      props.onDelete(draftId);
      setConfirmDeleteId(null);
      return;
    }

    setConfirmDeleteId(draftId);
  }

  return (
    <SectionCard
      title="Proposal-ready drafts"
      subtitle="Continue shaping your customer documents."
      showHelp={false}
    >
      {props.drafts.length ? (
        <div className="wm-project-draft-grid">
          {props.drafts.map((draft) => (
            <div key={draft.id} className="wm-project-draft-tile wm-ui-card">
              <div className="wm-draft-paper-icon" aria-hidden="true"><span /><span /><span /></div>
              <div className="wm-project-draft-main">
                <p className="wm-project-draft-customer wm-ui-copy">{draft.customer}</p>
                <h3 className="wm-project-draft-title wm-ui-title">{draft.name}</h3>
                <p className="wm-project-draft-state wm-ui-copy">{draft.state}</p>
              </div>

              <div className="wm-project-draft-actions">
                <Link
                  to={routeCatalogByKey.responsePack.path}
                  className={`wm-project-draft-open ${PROJECTS_DARK_BUTTON_CLASS}`}
                >
                  Open
                </Link>

                <button
                  className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-cyan-300 hover:bg-[#0d2133] hover:text-[#9ffcf4]`].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => props.onCopy(draft.id)}
                  title={`Copy ${draft.name}`}
                  aria-label={`Copy ${draft.name}`}
                >
                  <Copy className="h-4 w-4" />
                </button>

                <button
                  className={["wm-ui-button wm-ui-button-secondary", `${PROJECTS_ICON_BUTTON_CLASS} hover:border-[#ff8a8a] hover:bg-[#2a1020] hover:text-[#ff8a8a]`].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => handleDeleteClick(draft.id)}
                  onBlur={() => setConfirmDeleteId((current) => (current === draft.id ? null : current))}
                  title={confirmDeleteId === draft.id ? `Click again to permanently delete ${draft.name}` : `Delete ${draft.name}`}
                  aria-label={confirmDeleteId === draft.id ? `Confirm delete ${draft.name}` : `Delete ${draft.name}`}
                >
                  {confirmDeleteId === draft.id ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-8 text-center text-sm text-[#cfe6f7] wm-ui-card wm-ui-copy">
          No proposal drafts are currently listed. Use Reset sample store to restore the starter examples.
        </div>
      )}
    </SectionCard>
  );
}
