import { useMemo, useState } from "react";
import { ChevronDown, CheckCircle2, CircleHelp } from "lucide-react";

import { RequirementAnswerInput } from "./RequirementAnswerInput";
import type { StoredRequirementRecord, StoredRequirementStatus } from "../../data/projectStore";
import { requirementReadiness } from "../../lib/projectRequirements";

const categoryOrder = ["ARCHITECTURE", "APPLICATION", "DISPLAYS", "DISPLAY BEHAVIOUR", "SOURCES", "SIGNAL TYPE", "USB", "AUDIO", "INFRASTRUCTURE", "CONTROL", "NETWORK", "BUDGET", "TIMELINE"];
const statuses: StoredRequirementStatus[] = ["confirmed", "review", "unknown"];
const statusLabel = (status: StoredRequirementStatus) => status === "confirmed" ? "Confirmed" : status === "unknown" ? "Unknown" : "Needs review";

export function RequirementsAccordion({ requirements, onUpdate }: {
  requirements: StoredRequirementRecord[];
  onUpdate: (id: string, patch: Partial<StoredRequirementRecord>) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = requirements.find((item) => item.status !== "confirmed") ?? requirements[0];
    return new Set(first ? [first.category || "Other"] : []);
  });
  const groups = Array.from(requirements.reduce((map, item) => {
    const category = item.category || "Other";
    map.set(category, [...(map.get(category) ?? []), item]);
    return map;
  }, new Map<string, StoredRequirementRecord[]>())).sort(([a], [b]) => {
    const rank = (category: string) => {
      const index = categoryOrder.indexOf(category.toUpperCase());
      return index < 0 ? categoryOrder.length : index;
    };
    return rank(a) - rank(b);
  });
  // Readiness summary (Ready %, confirmed/review/unknown counts). This display
  // used to live in ProjectDetailPage's overview strip; it rides with the
  // accordion so the readiness numbers always sit next to the editable
  // requirement statuses they summarise.
  const readiness = useMemo(() => requirementReadiness(requirements), [requirements]);

  if (!groups.length) return <div className="rounded-2xl border p-6 text-sm wm-ui-card wm-ui-copy">No requirements captured yet. Run Discovery to populate the requirement record.</div>;

  return <div className="wm-requirements-editor">
    <div className="wm-requirements-summary" data-testid="requirements-readiness">
      <div className="wm-requirements-summary__score"><strong>{readiness.score}%</strong><span>Requirements confirmed</span></div>
      <progress max={100} value={readiness.score} aria-label="Requirements confirmed" />
      <div className="wm-requirements-summary__counts"><span><CheckCircle2 aria-hidden="true" />{readiness.confirmed} confirmed</span>{readiness.review > 0 && <span>{readiness.review} to review</span>}{readiness.unknown > 0 && <span><CircleHelp aria-hidden="true" />{readiness.unknown} unknown</span>}</div>
    </div>
    <p className="wm-requirements-guidance">Open a category to update the answers and mark what has been confirmed.</p>
    {groups.map(([category, items]) => {
      const expanded = open.has(category);
      const toggle = () => setOpen(new Set(expanded ? [] : [category]));
      const confirmed = items.filter((item) => item.status === "confirmed").length;
      return <div key={category} className="wm-requirement-group" data-expanded={expanded}>
        <button type="button" aria-expanded={expanded} onClick={toggle} className="wm-requirement-group__trigger">
          <span className="wm-requirement-group__title"><span className="wm-requirement-group__icon">{confirmed === items.length ? <CheckCircle2 aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}</span><span><strong>{category.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}</strong><small>{items.length} {items.length === 1 ? "requirement" : "requirements"}</small></span></span>
          <span className="wm-requirement-group__statuses">{statuses.map((status) => {
            const count = items.filter((item) => item.status === status).length;
            return count ? <span key={status} className={`wm-requirement-badge wm-requirement-badge--${status}`}>{count} {status === "review" ? "to review" : status}</span> : null;
          })}<ChevronDown className="wm-requirement-group__chevron" aria-hidden="true" /></span>
        </button>
        {expanded && <div className="wm-requirement-group__body">{items.map((item) => <div key={item.id} className="wm-requirement-field">
          <div className="wm-requirement-field__answer"><div className="wm-requirement-field__heading"><label htmlFor={`requirement-${item.id}`}>{item.label}</label><span>{item.source}</span></div>
            <RequirementAnswerInput item={item} onUpdate={onUpdate} />
            {item.whyItMatters && <p id={`requirement-help-${item.id}`}>{item.whyItMatters}</p>}
          </div>
          <label className="wm-requirement-field__status"><span>Confirmation</span><select data-status={item.status} value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value as StoredRequirementStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        </div>)}</div>}
      </div>;
    })}
  </div>;
}
