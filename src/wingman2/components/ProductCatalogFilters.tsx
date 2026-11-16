import { useMemo } from "react";
import {
  buildFacetIndex,
  type CatalogFilterState,
  type CatalogProduct,
  type CatalogRole,
  type CatalogTechnology,
} from "../../features/catalog/catalogIntelligence";
import { ProductFilterPanel, ProductSearchField } from "./ProductWorkspaceChrome";

const humanize = (value: string) => value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const roleLabels: Record<CatalogRole, string> = {
  "room-core": "Room core",
  "video-bar": "Video bar",
  "presentation-switcher": "Presentation switcher",
  "matrix-switcher": "Matrix switcher",
  "wireless-casting-host": "Wireless casting host",
  "wireless-casting-dongle": "Wireless casting dongle",
  "av-over-ip-encoder": "AV over IP encoder",
  "av-over-ip-decoder": "AV over IP decoder",
  "av-over-ip-transceiver": "AV over IP transceiver",
  "video-wall-processor": "Video wall processor",
  "multiview-processor": "Multiview processor",
  "usb-peripheral-host": "USB peripheral host",
  "uc-endpoint": "UC endpoint",
  accessory: "Accessory",
  cable: "Cable",
  camera: "Camera product",
  "audio-endpoint": "Audio endpoint",
  controller: "Control interface",
  "distribution-amplifier": "Distribution amplifier",
  extender: "Extender",
  "network-switch": "Network switch",
  "signal-processor": "Signal processor",
  splitter: "Splitter",
};

const technologyLabels: Record<CatalogTechnology, string> = {
  camera: "Camera support",
  speaker: "Speaker support",
  microphone: "Microphone support",
  hdmi: "HDMI",
  "hdmi-2.0": "HDMI 2.0",
  "usb-c": "USB-C",
  usb: "USB",
  "usb-2.0": "USB 2.0",
  "usb-3.0": "USB 3.0",
  kvm: "KVM (support)",
  "wireless-casting": "Wireless casting",
  hdbaset: "HDBaseT",
  "hdbaset-3.0": "HDBaseT 3.0",
  networkhd: "NetworkHD",
  dante: "Dante",
  multiview: "Multiview support",
  "video-wall-processing": "Video wall processing",
  "dual-display": "Dual display",
  "1gbe": "1GbE",
  ndi: "NDI",
  "led-processing": "LED processing",
  "10gb": "10 GbE",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`wm-catalog-chip ${active ? "is-active" : ""}`}>
      {label}
    </button>
  );
}

function FacetGroup<T extends string>({
  title,
  description,
  className,
  options,
  selected,
  onToggle,
  format = humanize,
}: {
  title: string;
  description: string;
  className?: string;
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  format?: (value: T) => string;
}) {
  if (!options.length) return null;
  const orderedOptions = [...options].sort((left, right) =>
    format(left).localeCompare(format(right), undefined, { sensitivity: "base", numeric: true }),
  );

  return (
    <div className={`wm-catalog-facet-group${className ? ` ${className}` : ""}`}>
      <div className="grid gap-1">
        <span className="wm-catalog-facet-label">{title}</span>
        <p className="m-0 text-xs leading-5 wm-ui-copy">{description}</p>
      </div>
      <div className="wm-catalog-chip-row">
        {orderedOptions.map((option) => (
          <Chip key={option} label={format(option)} active={selected.includes(option)} onClick={() => onToggle(option)} />
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`wm-catalog-chip ${active ? "is-active" : ""}`}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}

export function ProductCatalogFilters({
  catalog,
  state,
  onChange,
  searchPlaceholder = "Search by SKU, name, application — e.g. NHD-500, UC, video wall, Dante",
}: {
  catalog: CatalogProduct[];
  state: CatalogFilterState;
  onChange: (patch: Partial<CatalogFilterState>) => void;
  searchPlaceholder?: string;
}) {
  const facets = useMemo(() => buildFacetIndex(catalog), [catalog]);
  const toggles = [
    { label: "Hide end-of-life", active: state.excludeEolSoon, onClick: () => onChange({ excludeEolSoon: !state.excludeEolSoon }) },
    { label: "Include accessories", active: state.includeAccessories, onClick: () => onChange({ includeAccessories: !state.includeAccessories }) },
    {
      label: state.matchMode === "filter" ? "Strict filter" : "Smart find",
      active: state.matchMode === "filter",
      onClick: () => onChange({ matchMode: state.matchMode === "filter" ? "find" : "filter" }),
    },
    { label: "Standalone only", active: state.standaloneOnly, onClick: () => onChange({ standaloneOnly: !state.standaloneOnly }) },
  ].sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base", numeric: true }));

  return (
    <ProductFilterPanel>
      <ProductSearchField value={state.search} onChange={(search) => onChange({ search })} placeholder={searchPlaceholder} />
      <div className="wm-catalog-chip-row wm-catalog-toggle-row">
        {toggles.map((item) => <Toggle key={item.label} {...item} />)}
      </div>
      <div className="wm-catalog-facets">
        <FacetGroup
          title="Product area"
          description="Broad system areas; products may belong to more than one."
          options={facets.families}
          selected={state.families}
          onToggle={(value) => onChange({ families: toggle(state.families, value) })}
        />
        <FacetGroup
          title="Product role"
          description="The kind of job the product performs in a system."
          options={facets.roles}
          selected={state.roles}
          onToggle={(value) => onChange({ roles: toggle(state.roles, value) })}
          format={(value) => roleLabels[value as CatalogRole] ?? humanize(value)}
        />
        <FacetGroup
          title="Features & connections"
          description="What the product supports, such as HDBaseT, USB-C or Dante."
          className="wm-catalog-features-facet"
          options={facets.technologies.filter((technology) => technology !== "usb")}
          selected={state.technologies}
          onToggle={(value) => onChange({ technologies: toggle(state.technologies, value) })}
          format={(value) => technologyLabels[value as CatalogTechnology] ?? humanize(value)}
        />
      </div>
    </ProductFilterPanel>
  );
}
