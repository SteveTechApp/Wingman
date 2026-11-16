import type { DiscoveryAnswers } from "./discoveryTypes";

const UNKNOWN = "To confirm during the site survey.";
const BY_OTHERS = "By others.";
const BY_OTHERS_DETAILS = "By others: ";

const fields = [
  { id: "site-overall-construction", label: "Overall building construction", placeholder: "e.g. reinforced concrete frame, steel frame, timber frame, masonry or heritage construction" },
  { id: "site-room-structure", label: "Room structure and fixing support", placeholder: "e.g. structural walls, columns, beams or roof structure; load capacity to confirm" },
  { id: "site-floor-type", label: "Floor type", placeholder: "e.g. raised access floor, solid concrete slab, timber floor or suspended floor" },
  { id: "site-ceiling-type", label: "Ceiling type", placeholder: "e.g. suspended tile, plasterboard, exposed soffit or open structure" },
  { id: "site-wall-construction", label: "Walls and fixing surfaces", placeholder: "e.g. masonry front wall; confirm a safe display fixing point" },
  { id: "site-ceiling-construction", label: "Ceiling construction and overhead access", placeholder: "e.g. accessible tiles below concrete slab; access and fixing points to confirm" },
  { id: "site-containment-type", label: "Containment types", placeholder: "e.g. cable tray, conduit, trunking, floor boxes, underfloor route or ceiling void" },
  { id: "site-cable-route", label: "Cable routes and route constraints", placeholder: "e.g. table to front wall through floor boxes; route length not surveyed" },
  { id: "site-power-rack", label: "Power and equipment space", placeholder: "e.g. power at display and a ventilated cupboard for the rack" },
  { id: "site-lighting-acoustics", label: "Lighting, noise and room sound", placeholder: "e.g. daylight on the screen; echo during calls; HVAC noise" },
  { id: "site-access-constraints", label: "Access and site restrictions", placeholder: "e.g. out-of-hours installation, secure access, heritage or fire rules" },
] as const;
export const DISCOVERY_SITE_CONDITION_COUNT = fields.length;

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
        const byOthers = value === BY_OTHERS || value.startsWith(BY_OTHERS_DETAILS);
        const detail = value.startsWith(BY_OTHERS_DETAILS) ? value.slice(BY_OTHERS_DETAILS.length) : byOthers ? "" : value;
        return <div className="wm-site-condition" key={field.id}>
          <label htmlFor={field.id}>{field.label}
            <textarea id={field.id} value={unknown ? "" : detail} placeholder={field.placeholder}
              onChange={event => {
                const nextDetail = event.target.value;
                update(field.id, byOthers ? nextDetail.trim() ? `${BY_OTHERS_DETAILS}${nextDetail}` : BY_OTHERS : nextDetail);
              }} disabled={unknown} />
          </label>
          <div className="wm-site-condition-status" role="group" aria-label={`${field.label} status`}>
            <button type="button" className="wm-site-condition-unknown" aria-pressed={unknown}
              onClick={() => update(field.id, unknown ? "" : UNKNOWN)}>
              {unknown ? "Marked for site survey" : "Not known yet"}
            </button>
            <button type="button" aria-pressed={byOthers}
              onClick={() => update(field.id, byOthers ? "" : BY_OTHERS)}>
              By others
            </button>
          </div>
        </div>;
      })}
    </div>
  </section>;
}

export const DISCOVERY_SITE_UNKNOWN = UNKNOWN;
export const DISCOVERY_SITE_BY_OTHERS = BY_OTHERS;
