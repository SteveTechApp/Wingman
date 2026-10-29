import { useEffect, useState } from "react";
import { History } from "lucide-react";
import {
  acknowledgeWebhookHistoryDrops,
  droppedSendsNote,
  readWebhookHistoryDrops,
  type CrmWebhookHistoryDrops,
} from "../lib/crmWebhook";

/**
 * What a boot sweep dropped from this browser's CRM send history, wherever a rep
 * meets the news.
 *
 * Two surfaces print it, because the note answers a question a rep asks in two
 * places: the CRM panel, where the send list is, and the project record's
 * activity log, which is where someone who never opens that panel reviews what
 * happened to their room. It was the panel's alone, so a rep who never opened the
 * panel kept the biggest rows in their storage and never learned why the list
 * looked short — which is the opposite of what the note is for.
 *
 * One wording (`droppedSendsNote`), one look (`.wm-crm-webhook-drops`) and one
 * dismissal: `Dismiss` calls the same `acknowledgeWebhookHistoryDrops` the panel
 * used to call, so reading it on either surface settles it for both. It reads on
 * mount rather than announcing itself at boot, because the count is storage and
 * outlives the load that dropped the rows: a load that dropped a row says so
 * once, not on every load.
 */
export function WebhookDropsNote() {
  const [dropped, setDropped] = useState<CrmWebhookHistoryDrops | null>(null);

  useEffect(() => {
    setDropped(readWebhookHistoryDrops());
  }, []);

  if (!dropped) return null;

  return (
    <div className="wm-crm-webhook-drops" data-testid="crm-webhook-history-drops">
      <History size={14} className="text-cyan-300 flex-shrink-0" aria-hidden="true" />
      <span className="text-xs text-white/70">{droppedSendsNote(dropped.droppedRows)}</span>
      <button
        type="button"
        className="wm-ui-button wm-ui-button-secondary text-[10px] ml-auto"
        onClick={() => {
          acknowledgeWebhookHistoryDrops();
          setDropped(null);
        }}
        data-testid="crm-webhook-history-drops-dismiss"
        aria-label="Dismiss the note about sends this browser dropped"
      >
        Dismiss
      </button>
    </div>
  );
}
