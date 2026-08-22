import type { CapabilityState, ConnectionItem, SpecCapabilities, SpecConnections, SpecSheet } from "../../lib/compareSpecEngine";

export type BattleStat = { label: string; value: string; highlight?: "win" | "lose" | "draw" | null; hint?: string; matters?: string };
export type BattleCardFamily = "switcher-matrix" | "avoip-endpoint" | "extender-hdbaset" | "distribution" | "wireless-uc" | "video-processing" | "specialist";
type ConnectionKey = keyof SpecConnections;
type CapabilityKey = keyof SpecCapabilities;
export type BattleCardSection = { key: string; label: string; connections?: ConnectionItem[]; facts?: Array<{ label: string; value: string; state?: CapabilityState }> };
export type BattleCardLayout = { family: BattleCardFamily; label: string; sections: BattleCardSection[] };

const EMPTY_CONNECTIONS: SpecConnections = { videoInputs: [], videoOutputs: [], usb: [], network: [], audioInputs: [], audioOutputs: [], control: [] };
const EMPTY_CAPABILITIES: SpecCapabilities = { wirelessCasting: null, byom: null, multiview: null, scaling: null, videoWall: null, kvm: null };
const CONNECTION_LABELS: Record<ConnectionKey, string> = { videoInputs: "Video inputs", videoOutputs: "Video outputs", usb: "USB / peripherals", network: "Network", audioInputs: "Audio inputs", audioOutputs: "Audio outputs", control: "Control" };
const CAPABILITY_LABELS: Record<CapabilityKey, string> = { wirelessCasting: "Wireless casting", byom: "BYOM", multiview: "Multiview", scaling: "Scaling", videoWall: "Video wall", kvm: "KVM" };

export function battleCardFamily(sheet: Pick<SpecSheet, "specClass">): BattleCardFamily {
  switch (sheet.specClass) {
    case "MATRIX": case "PRESENTATION": return "switcher-matrix";
    case "AVOIP": return "avoip-endpoint";
    case "HDBASET": case "EXTENDER": case "USB_EXTENSION": return "extender-hdbaset";
    case "DISTRIBUTION": return "distribution";
    case "WIRELESS_PRESENTATION": return "wireless-uc";
    case "VIDEO_WALL": case "MULTIVIEW": return "video-processing";
    default: return "specialist";
  }
}

const FAMILY_LABEL: Record<BattleCardFamily, string> = { "switcher-matrix": "Switcher / matrix", "avoip-endpoint": "AV-over-IP endpoint", "extender-hdbaset": "Extender / HDBaseT", distribution: "Distribution", "wireless-uc": "Wireless / UC", "video-processing": "Video processing", specialist: "Specialist device" };
const CONNECTION_PRIORITY: Record<BattleCardFamily, ConnectionKey[]> = {
  "switcher-matrix": ["videoInputs", "videoOutputs", "usb", "audioInputs", "audioOutputs", "network", "control"],
  "avoip-endpoint": ["videoInputs", "videoOutputs", "network", "usb", "audioInputs", "audioOutputs", "control"],
  "extender-hdbaset": ["videoInputs", "usb", "control", "network", "videoOutputs", "audioInputs", "audioOutputs"],
  distribution: ["videoInputs", "videoOutputs", "audioInputs", "audioOutputs"],
  "wireless-uc": ["videoInputs", "usb", "network", "videoOutputs", "audioInputs", "audioOutputs", "control"],
  "video-processing": ["videoInputs", "videoOutputs", "network", "control", "audioInputs", "audioOutputs"],
  specialist: ["videoInputs", "videoOutputs", "usb", "network", "audioInputs", "audioOutputs", "control"],
};
const CAPABILITY_PRIORITY: Record<BattleCardFamily, CapabilityKey[]> = {
  "switcher-matrix": ["scaling", "multiview", "wirelessCasting", "kvm"], "avoip-endpoint": ["kvm", "scaling", "videoWall", "multiview"],
  "extender-hdbaset": ["kvm", "scaling"], distribution: ["scaling"], "wireless-uc": ["wirelessCasting", "byom", "kvm"],
  "video-processing": ["multiview", "scaling", "videoWall"], specialist: [],
};

function stateLabel(state: CapabilityState): string {
  if (state === true) return "Supported";
  if (state === false) return "Not supported";
  if (state === "not-applicable") return "Not applicable";
  return "Not verified";
}

function performanceFacts(sheet: SpecSheet): Array<{ label: string; value: string }> {
  return [
    { label: "Max video", value: sheet.maxResolutionLabel }, { label: "Transport", value: sheet.transportLabel },
    { label: "HDBaseT generation", value: /hdbaset\s*([0-9.]+)/i.exec(sheet.transportLabel)?.[0] ?? "" },
    { label: "Reach", value: sheet.distanceM == null ? "" : `${sheet.distanceM}m` },
    { label: "Bandwidth", value: sheet.bandwidthGbps == null ? "" : `${sheet.bandwidthGbps}Gbps` }, { label: "Power", value: sheet.poe },
  ].filter((fact) => fact.value);
}

export function buildBattleCardLayout(sheet: SpecSheet, counterpart?: SpecSheet): BattleCardLayout {
  const family = battleCardFamily(sheet);
  const connections = sheet.connections ?? EMPTY_CONNECTIONS;
  const otherConnections = counterpart?.connections ?? EMPTY_CONNECTIONS;
  const capabilities = sheet.capabilities ?? EMPTY_CAPABILITIES;
  const otherCapabilities = counterpart?.capabilities ?? EMPTY_CAPABILITIES;
  const sections: BattleCardSection[] = [];
  for (const key of CONNECTION_PRIORITY[family]) {
    if (!connections[key].length && !otherConnections[key].length) continue;
    sections.push({ key, label: CONNECTION_LABELS[key], connections: connections[key] });
  }
  const capabilityFacts = CAPABILITY_PRIORITY[family].filter((key) => capabilities[key] !== null || otherCapabilities[key] !== null)
    .map((key) => ({ label: CAPABILITY_LABELS[key], value: stateLabel(capabilities[key]), state: capabilities[key] }));
  if (capabilityFacts.length) sections.push({ key: "capabilities", label: "Capabilities", facts: capabilityFacts });
  const performance = performanceFacts(sheet);
  if (performance.length) sections.push({ key: "performance", label: "Performance", facts: performance });
  return { family, label: FAMILY_LABEL[family], sections };
}

/** Retained for callers while the UI uses structured layouts. */
export function buildBattleStats(): BattleStat[] { return []; }
const roleLabel = (role: SpecSheet["role"]) => role === "unknown" ? "Role not verified" : role.replace(/-/g, " ");

export function BattleCard({ sheet, counterpart, accent, bestFor, footnote }: { sheet: SpecSheet; counterpart?: SpecSheet; stats?: BattleStat[]; accent: "wyrestorm" | "competitor"; bestFor?: string; footnote?: string }) {
  const layout = buildBattleCardLayout(sheet, counterpart);
  return <article className={`wm-battle-card wm-battle-card--${accent} wm-battle-card--${layout.family}`} aria-label={`${sheet.brand} ${sheet.sku} product card`}>
    <div className="wm-battle-card__frame">
      <header className="wm-battle-card__identity"><div><p className="wm-battle-card__brand">{sheet.brand}</p><h3>{sheet.sku}</h3><p className="wm-battle-card__identity-meta">{layout.label} · {roleLabel(sheet.role)}</p></div>{sheet.imageUrl ? <img src={sheet.imageUrl} alt="" loading="lazy" /> : null}</header>
      {bestFor ? <p className="wm-battle-card__best-for">{bestFor}</p> : null}
      <div className="wm-battle-card__sections">{layout.sections.map((section) => <section className="wm-battle-card__section" key={section.key} aria-label={section.label}>
        <h4>{section.label}</h4>
        {section.connections ? (section.connections.length ? <ul className="wm-battle-card__connections">{section.connections.map((item, index) => <li key={`${item.type}-${index}`}><strong>{item.type}</strong><span>×{item.count}</span>{item.detail ? <small>{item.detail}</small> : null}</li>)}</ul> : <p className="wm-battle-card__evidence-state">Not verified</p>) : null}
        {section.facts ? <dl className="wm-battle-card__facts">{section.facts.map((fact) => <div key={fact.label} data-state={fact.state === null ? "unverified" : String(fact.state)}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
      </section>)}</div>
      {footnote ? <footer className="wm-battle-card__footnote">{footnote}</footer> : null}
    </div>
  </article>;
}
export default BattleCard;
