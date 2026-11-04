import type { DiscoveryAnswers } from "./discoveryTypes";

const UNKNOWN = "To confirm during the site survey.";
const BY_OTHERS = "by-others";

const fields = [
  { id: "site-access-constraints", group: "environment", label: "Access and installation arrangements", plainLabel: "When can installers get in, and are there access rules?", placeholder: "e.g. out-of-hours work, security sign-in, lift booking, heritage or fire rules" },
  { id: "site-wall-construction", group: "environment", label: "Walls and fixing surfaces", plainLabel: "What are the walls made of, and where could a screen be fixed?", placeholder: "e.g. solid masonry wall; suitable fixing point still needs checking" },
  { id: "site-floor-construction", group: "environment", label: "Floor construction", plainLabel: "What is the floor like, and can cables pass through it?", placeholder: "e.g. raised access floor, concrete slab, floor boxes, carpet or underfloor heating" },
  { id: "site-ceiling-construction", group: "environment", label: "Ceiling construction and overhead access", plainLabel: "What is above the room, and can installers reach it?", placeholder: "e.g. suspended ceiling with accessible tiles; confirm structure above" },
  { id: "site-cable-route", group: "environment", label: "Cable routes and containment", plainLabel: "Where could cables run, and are cable trays or conduits already there?", placeholder: "e.g. table to front wall through floor boxes; tray above ceiling; route not surveyed" },
  { id: "site-first-fix-cabling", group: "environment", label: "First-fix cabling", plainLabel: "Have any cables or pathways already been installed?", placeholder: "e.g. conduit installed from table to display wall; cable type and termination to confirm" },
  { id: "site-power-rack", group: "environment", label: "Power and equipment space", plainLabel: "Where are power and a place for the AV equipment?", placeholder: "e.g. power at each display and a ventilated cupboard for the rack" },
  { id: "site-lighting-acoustics", group: "lighting", label: "Noise and room acoustics", plainLabel: "Is the room noisy or echoey?", placeholder: "e.g. clear speech at present; HVAC noise; strong echo during calls" },
  { id: "site-lighting-provision", group: "lighting", label: "Lighting provision", plainLabel: "Can the lights or blinds change for presentations or video calls?", placeholder: "e.g. dimmable lighting, window blinds, daylight on the screen, lighting control by others" },
] as const;

export function DiscoverySiteConditions({
  answers,
  onChange,
  compact = false,
  plainLanguage = false,
  area = "environment",
  hideHeader = false,
}: {
  answers: DiscoveryAnswers;
  onChange: (updater: (previous: DiscoveryAnswers) => DiscoveryAnswers) => void;
  compact?: boolean;
  plainLanguage?: boolean;
  area?: "environment" | "lighting" | "all";
  hideHeader?: boolean;
}) {
  const update = (id: string, value: string) => onChange(previous => ({ ...previous, [id]: value }));
  const toggleUnknown = (id: string, isUnknown: boolean) => onChange(previous => ({
    ...previous,
    [id]: isUnknown ? "" : UNKNOWN,
    [`${id}-responsibility`]: isUnknown ? previous[`${id}-responsibility`] : "",
  }));
  const toggleResponsibility = (id: string, byOthers: boolean) => onChange(previous => ({
    ...previous,
    [id]: previous[id] === UNKNOWN ? "" : previous[id],
    [`${id}-responsibility`]: byOthers ? "" : BY_OTHERS,
  }));
  return <section className={`wm-site-conditions ${compact ? "is-compact" : ""}`} aria-label="Room and site conditions">
    {!hideHeader && <header><h3>{plainLanguage ? (area === "lighting" ? "Lighting and room sound" : "The room and the building") : (area === "lighting" ? "Lighting provision and acoustics" : "Environment and installation")}</h3><p>{plainLanguage ? "Share what you know. Leave it open if it is undecided, or mark it as work another contractor will do." : "Capture room construction, access, infrastructure and first-fix responsibilities. Unknowns stay visible for the site survey."}</p></header>}
    <div className="wm-site-conditions-grid">
      {fields.filter(field => area === "all" || field.group === area).map(field => {
        const value = String(answers[field.id] || "");
        const unknown = value === UNKNOWN;
        const byOthers = answers[`${field.id}-responsibility`] === BY_OTHERS;
        return <div className="wm-site-condition" key={field.id}>
          <label htmlFor={field.id}>{plainLanguage && "plainLabel" in field ? field.plainLabel : field.label}
            <textarea id={field.id} value={unknown ? "" : value} placeholder={field.placeholder}
              onChange={event => update(field.id, event.target.value)} disabled={unknown} />
          </label>
          <button type="button" className="wm-site-condition-unknown" aria-pressed={unknown}
            onClick={() => toggleUnknown(field.id, unknown)}>
            {unknown ? "Not known · marked for site survey" : "Not known"}
          </button>
          <button type="button" className="wm-site-condition-unknown" aria-pressed={byOthers}
            onClick={() => toggleResponsibility(field.id, byOthers)}>
            {byOthers ? "By others · responsibility recorded" : "By others"}
          </button>
        </div>;
      })}
    </div>
  </section>;
}

export const DISCOVERY_SITE_UNKNOWN = UNKNOWN;
