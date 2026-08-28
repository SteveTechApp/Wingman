import type { Ref } from "react";

// Optional client/project details form shown under the Discovery hero. Purely
// presentational: it renders the current field values and reports changes back
// to the page, which owns the state. Extracted verbatim from DiscoveryPage.tsx.

type DiscoveryClientDetailsPanelProps = {
  clientName: string;
  onClientNameChange: (value: string) => void;
  contactName: string;
  onContactNameChange: (value: string) => void;
  siteName: string;
  onSiteNameChange: (value: string) => void;
  budgetLevel: string;
  onBudgetLevelChange: (value: string) => void;
  budgetInputRef: Ref<HTMLSelectElement>;
  timeline: string;
  onTimelineChange: (value: string) => void;
};

export function DiscoveryClientDetailsPanel({
  clientName,
  onClientNameChange,
  contactName,
  onContactNameChange,
  siteName,
  onSiteNameChange,
  budgetLevel,
  onBudgetLevelChange,
  budgetInputRef,
  timeline,
  onTimelineChange,
}: DiscoveryClientDetailsPanelProps) {
  return (
    <details className="wm-discovery-client-panel wm-ui-card">
      <summary>Client &amp; project details (optional)</summary>
      <p className="wm-discovery-client-panel-intro wm-ui-copy">
        Not required to proceed — add these whenever they come up in the conversation. They travel with the brief
        into the proposal.
      </p>
      <div className="wm-discovery-client-grid">
        <label>
          Client / company name
          <input
            className="wm-ui-input"
            type="text"
            autoComplete="off"
            value={clientName}
            onChange={(event) => onClientNameChange(event.target.value)}
            placeholder="e.g. Northfield Council"
          />
        </label>
        <label>
          Contact name
          <input
            className="wm-ui-input"
            type="text"
            autoComplete="off"
            value={contactName}
            onChange={(event) => onContactNameChange(event.target.value)}
            placeholder="e.g. Priya Shah, Facilities"
          />
        </label>
        <label>
          Site / project name
          <input
            className="wm-ui-input"
            type="text"
            autoComplete="off"
            value={siteName}
            onChange={(event) => onSiteNameChange(event.target.value)}
            placeholder="e.g. Main chamber, Level 2"
          />
        </label>
        <label>
          Budget sensitivity
          <select
            ref={budgetInputRef}
            className="wm-ui-input"
            value={budgetLevel}
            onChange={(event) => onBudgetLevelChange(event.target.value)}
          >
            <option value="">Not discussed yet</option>
            <option value="cost-sensitive">Cost-sensitive — value engineering matters</option>
            <option value="mid-market">Mid-market — balanced cost and quality</option>
            <option value="premium">Premium — quality and performance lead</option>
          </select>
        </label>
        <label>
          Timeline
          <select
            className="wm-ui-input"
            value={timeline}
            onChange={(event) => onTimelineChange(event.target.value)}
          >
            <option value="">Not yet known</option>
            <option value="urgent">Urgent — needed within weeks</option>
            <option value="this-quarter">This quarter</option>
            <option value="exploring">Exploring options</option>
          </select>
        </label>
      </div>
    </details>
  );
}
