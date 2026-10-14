import { useState } from "react";
import { getFullDiscoveryOptions } from "../discovery/discoveryQuestions";
import type { StoredRequirementRecord } from "../../data/projectStore";

const discoveryQuestionByRequirement: Record<string, string> = {
  application: "opportunity", "room-size": "scale", "source-count": "sources",
  "source-connections": "source-connection", "display-count": "displays",
  "display-behaviour": "display-behaviour", "usb-transport": "usb",
  network: "network-path", audio: "audio", control: "control",
};

export function RequirementAnswerInput({ item, onUpdate }: {
  item: StoredRequirementRecord; onUpdate: (id: string, patch: Partial<StoredRequirementRecord>) => void;
}) {
  const options = getFullDiscoveryOptions(discoveryQuestionByRequirement[item.id] ?? item.id);
  const matched = options.find((option) => option.label === item.value || option.value === item.value);
  const unknown = !item.value.trim() || ["not confirmed", "unknown"].includes(item.value.toLowerCase());
  const [custom, setCustom] = useState(false);
  const selected = custom ? "__custom" : matched?.value ?? (unknown ? "__unknown" : "__custom");
  const helpId = item.whyItMatters ? `requirement-help-${item.id}` : undefined;
  return <>
    <select id={`requirement-${item.id}`} aria-label={item.label} aria-describedby={helpId} value={selected} onChange={(event) => {
      const value = event.target.value;
      setCustom(value === "__custom");
      if (value === "__custom") return;
      onUpdate(item.id, { value: value === "__unknown" ? "Not confirmed" : options.find((option) => option.value === value)!.label });
    }}>
      <option value="__unknown">Not confirmed</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      <option value="__custom">Custom answer…</option>
    </select>
    {selected === "__custom" && <label className="wm-requirement-custom"><span>Custom answer</span><textarea aria-label={`Custom answer for ${item.label}`} aria-describedby={helpId} placeholder="Enter the customer's requirement" value={unknown ? "" : item.value} onChange={(event) => onUpdate(item.id, { value: event.target.value })} /></label>}
  </>;
}
