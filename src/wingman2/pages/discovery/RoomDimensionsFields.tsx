import type { DiscoveryAnswers } from "./discoveryTypes";

type Props = {
  answers: DiscoveryAnswers;
  onChange: (update: (previous: DiscoveryAnswers) => DiscoveryAnswers) => void;
  idPrefix: string;
};

const DIMENSIONS = [
  { id: "room-length", label: "Length (m)" },
  { id: "room-width", label: "Width (m)" },
  { id: "room-height", label: "Height (m)" },
] as const;

export function RoomDimensionsFields({ answers, onChange, idPrefix }: Props) {
  const layout = String(answers["room-layout"] || answers["room-dimensions"] || "");
  const update = (id: string, value: string) => onChange(previous => {
    const current = { ...previous };
    const preservedLayout = id === "room-layout" ? value : String(previous["room-layout"] || previous["room-dimensions"] || "");
    delete current["room-dimensions"];
    return { ...current, "room-layout": preservedLayout, [id]: value };
  });

  return <div className="wm-room-dimensions-capture">
    <div className="wm-room-dimensions-fields">
      {DIMENSIONS.map(dimension => <label key={dimension.id} htmlFor={`${idPrefix}-${dimension.id}`}>
        {dimension.label}
        <input id={`${idPrefix}-${dimension.id}`} type="number" min="0" step="0.01"
          value={String(answers[dimension.id] || "")}
          onChange={event => update(dimension.id, event.target.value)} />
      </label>)}
    </div>
    <label htmlFor={`${idPrefix}-room-layout`}>Seating and layout
      <textarea id={`${idPrefix}-room-layout`} value={layout}
        placeholder="e.g. 24 seats around a table, rows facing the lectern"
        onChange={event => update("room-layout", event.target.value)} />
    </label>
  </div>;
}

export function roomDimensionsSummary(answers: DiscoveryAnswers): string {
  const dimensions = DIMENSIONS
    .map(dimension => [dimension.label.replace(/ \(m\)$/, ""), String(answers[dimension.id] || "").trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value} m`);
  const legacyOrLayout = String(answers["room-layout"] || answers["room-dimensions"] || "").trim();
  if (!dimensions.length) return legacyOrLayout;
  return [...dimensions, ...(legacyOrLayout ? [`Room notes: ${legacyOrLayout}`] : [])].join(" · ");
}
