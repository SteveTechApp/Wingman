import { useState } from "react";
import { HardDrive } from "lucide-react";
import {
  carriedRetiredStorageReclaim,
  clearCarriedRetiredStorageReclaim,
  reclaimedStorageNote,
} from "../lib/retiredStorage";

/**
 * The space a previous load's boot sweeps took back from this browser.
 *
 * Two sweeps give space back at boot — `sweepRetiredStorage` removes stores no
 * build reads any more, and `sweepWebhookHistory` clears delivered CRM bodies and
 * trims the send history — and both report into one place, so this strip is where
 * a rep learns the whole of it rather than the share that happened to be largest.
 * The number is the one part of a sweep a rep can check: storage that came back is
 * exactly the thing a rep suspects is still sitting in their browser, so it is
 * worth one sentence. It is not a warning and not a task, which is why it is a
 * strip rather than a card, and why it carries no link anywhere; where the send
 * history gave some of the space back, the sentence points at the panel that
 * already names the sends it had to trim.
 *
 * Read once per load from the value `main.tsx` lifted out of storage before its
 * own sweeps ran, not from storage itself: that ordering is what makes the note
 * about a *previous* load, so a rep reads it on the visit after the sweep and
 * never on a visit where the reclamation is still the one being counted. The
 * figure is already out of storage by then, so dismissing it hides the only copy
 * and a reload cannot print the same space again.
 */
export function RetiredStorageNote() {
  const report = carriedRetiredStorageReclaim();
  const [dismissed, setDismissed] = useState(false);

  if (!report || dismissed) return null;

  return (
    <div className="wm-storage-reclaim" role="status" data-testid="storage-reclaim-note">
      <div className="wm-storage-reclaim-inner">
        <HardDrive className="wm-storage-reclaim-icon h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{reclaimedStorageNote(report.bytes, report.webhookBytes)}</span>
        <button
          type="button"
          className="wm-storage-reclaim-dismiss"
          onClick={() => {
            clearCarriedRetiredStorageReclaim();
            setDismissed(true);
          }}
          data-testid="storage-reclaim-dismiss"
          aria-label="Dismiss the note about browser storage this load took back"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
