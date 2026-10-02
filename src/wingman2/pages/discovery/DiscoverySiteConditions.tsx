import type { DiscoveryAnswers } from "./discoveryTypes";

const UNKNOWN = "To confirm during the site survey.";

const fields = [
  { id: "site-wall-construction", label: "Walls and fixing surfaces", placeholder: "e.g. masonry front wall; confirm a safe display fixing point" },
  { id: "site-ceiling-construction", label: "Ceiling and overhead access", placeholder: "e.g. suspended ceiling with accessible tiles; structure above to confirm" },
  { id: "site-cable-route", label: "Cable routes and containment", placeholder: "e.g. table to front wall through floor boxes; route length not surveyed" },
  { id: "site-power-rack", label: "Power and equipment space", placeholder: "e.g. power at display and a ventilated cupboard for the rack" },
  { id: "site-lighting-acoustics", label: "Lighting, noise and room sound", placeholder: "e.g. daylight on the screen; echo during calls; HVAC noise" },
  { id: "site-access-constraints", label: "Access and site restrictions", placeholder: "e.g. out-of-hours installation, secure access, heritage or fire rules" },
] as const;

export function DiscoverySiteConditions({
  answers,
  onChange,
  compact = false,
}: {
  answers: DiscoveryAnswers;
  onChange: (updater: (previous: DiscoveryAnswers) => DiscoveryAnswers) => void;
  compact?: boolean;
}) {
  const update = (id: string, value: string) => onChange(previous => ({ ...previous, [id]: value }));
  return <section className={`wm-site-conditions ${compact ? "is-compact" : ""}`} aria-label="Room and site conditions">
    <header><h3>Room and site conditions</h3><p>Capture what is known about the building. Anything not surveyed can stay open.</p></header>
    <div className="wm-site-conditions-grid">
      {fields.map(field => {
        const value = String(answers[field.id] || "");
        const unknown = value === UNKNOWN;
        return <div className="wm-site-condition" key={field.id}>
          <label htmlFor={field.id}>{field.label}
            <textarea id={field.id} value={unknown ? "" : value} placeholder={field.placeholder}
              onChange={event => update(field.id, event.target.value)} disabled={unknown} />
          </label>
          <button type="button" className="wm-site-condition-unknown" aria-pressed={unknown}
            onClick={() => update(field.id, unknown ? "" : UNKNOWN)}>
            {unknown ? "Marked for site survey" : "Not known yet"}
          </button>
        </div>;
      })}
    </div>
  </section>;
}

export const DISCOVERY_SITE_UNKNOWN = UNKNOWN;
