import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";
import { generateProjectTopologyFromDiscovery, type ProjectTopology } from "../../lib/projectTopology";
import type { DiscoveryNotes } from "./discoveryTypes";
import { getFullDiscoveryOptions, getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { wmDiscoveryAnswerToText, wmDiscoveryFilterUnifiedCommsQuestions, wmDiscoveryToggleMultiSelectAnswer } from "./discoveryAnswerUtils";

const wording: Record<string, [string, string]> = {
  opportunity: ["What will people do in this space?", "Choose the closest everyday use. Your market and room type give Wingman the context."],
  scale: ["How big is the space people will use?", "Describe the number of people, seating and approximate room dimensions in your notes."],
  sources: ["How many things will people want to show?", "Count laptops, room computers, television feeds and content players that may be connected."],
  "source-connection": ["Will people bring their own devices, use room equipment, or both?", "We will check the actual connectors when choosing equipment."],
  displays: ["How many places need a picture?", "Include the main screen, presenter confidence screens and any overflow areas."],
  "display-behaviour": ["What should people see on each screen?", "The same picture everywhere is simpler than choosing a different picture for each screen."],
  "signal-standard": ["What kind of picture does the room need?", "If the screen models are not known, leave the picture specification for review."],
  "uc-purpose": ["Who needs to join, watch or listen from somewhere else?", "Choose all the ways people will use cameras or microphones."],
  "uc-platform": ["How will people start a video call?", "Will they bring a laptop or use a dedicated room meeting system?"],
  "mtr-av-integration": ["What should the room meeting system share with the other screens?", "Should it send pictures, receive presentations, or work separately?"],
  "uc-camera": ["How should remote viewers see the people in the room?", "Describe presenter movement and seating. The installer can choose the camera connection later."],
  "uc-camera-count": ["How many different camera views are needed?", "Think about the presenter, audience and any demonstration area."],
  "uc-camera-routing": ["Where should the camera pictures appear?", "In the call, on room screens, in a recording, or several of these?"],
  "uc-multi-camera-path": ["Has a camera system already been chosen?", "If not, leave camera transport for the designer. Multiple views need a way to select or combine them."],
  "uc-microphones": ["Where will people speak from?", "Seated at a table, walking around, at a lectern or throughout the audience?"],
  "uc-microphone-count": ["How many speaking positions need their own microphone?", "Describe how many people need to be heard at once."],
  "uc-microphone-connection": ["Are there existing microphones to connect?", "If you do not know their connections, record the models or leave this for review."],
  "uc-audio-processing": ["Should speech reach people in the room as well as people on a call?", "A designer must check echo control, microphone mixing and the speaker feed."],
  usb: ["What should a laptop be able to use in the room?", "Sharing pictures, using the room camera and microphones, or controlling a remote computer?"],
  audio: ["What sound should people hear?", "Think about videos, music, presenter speech and people joining a call."],
  "audio-zones": ["Do different areas need their own sound and volume?", "Name the areas and explain whether they ever join into one larger room."],
  "audio-programme": ["What listening experience do you want?", "Clear speech, background music, films and live performances need different speaker systems."],
  "room-acoustics": ["What does the room sound like today?", "Is speech clear, is there an echo, or is there distracting background noise?"],
  control: ["How should someone start and operate the room?", "Imagine a first-time visitor: what should happen when they arrive, connect and finish?"],
  "network-path": ["Who will look after connections between rooms?", "Ask the IT team whether existing building connections can carry the pictures. It is fine to leave this open."],
  "avoip-profile": ["What matters most when sharing pictures across the site?", "Describe readable detail, responsiveness and how many different pictures people need at once."],
  "source-device-workflows": ["What will people connect or watch?", "Select the actual devices and activities rather than cable types."],
  "wireless-presentation-operation": ["How should wireless sharing work?", "Who can share, who approves it, and should several people appear at once?"],
  "multiview-destination": ["Who needs to see several pictures together?", "Identify each screen or audience that needs a combined view."],
  "multiview-operation": ["How should someone arrange those pictures?", "Fixed layouts, presets, or an operator changing the layout during use?"],
  "video-wall-technology": ["What kind of large display is planned?", "A group of separate screens or one continuous LED surface? Leave the technology open if undecided."],
  "video-wall-purpose": ["What should the large display show?", "One large picture, several pictures, live monitoring or scheduled information?"],
};
const optionWording: Record<string, string> = {
  "4k60-standard": "Sharp detail on modern screens", "1080p-standard-hdmi": "Everyday presentations and video",
  "4k60-hdr-hdcp": "Premium film playback and colour", "legacy-edid-risk": "A mix of older and newer screens",
  "byom-user-laptop": "Join using the visitor's laptop", "microsoft-teams-room": "A dedicated Microsoft Teams room",
  "zoom-room": "A dedicated Zoom room", "room-pc-conferencing": "Join using the room computer",
  "fixed-usb-camera": "One fixed camera view", "usb-ptz-camera": "A camera that can turn and zoom, connected to the call computer",
  "hdmi-ptz-camera": "A camera that can turn and zoom, also feeding the room video system",
  "ndi-network-camera": "Cameras shared over the building network",
  "simple-auto": "Start automatically or with one button", "front-panel-remote": "Use a handheld remote or equipment buttons",
  "touch-panel": "Use a simple room touch screen", "software-app-control": "Use an app or browser",
  "third-party-control": "Use our preferred room control system",
  "corporate-av-vlan": "IT will provide connections on the organisation's network",
  "dedicated-av-lan": "The AV installer will provide a separate network",
  "no-network-distribution": "Everything stays within local cable routes",
  "room-audio": "Sound through room speakers", "display-audio": "Sound from the screen's own speakers",
  "no-room-audio": "No separate room sound system", "stereo-low-impedance": "Left and right speakers for music or video",
  "multichannel-audio": "Surround sound for film playback", "distributed-70v-100v": "Speech or background music across a large area",
  "separate-programme-voice": "Presenter speech and programme sound need separate control",
  "analogue-audio-override": "A separate fallback or announcement feed", "digital-audio-interface": "An existing digital sound system",
  "dante-network-audio": "Sound shared through an existing audio network",
  "dsp-aec-automix": "Several microphones on a call, with echo control and automatic mixing",
  "local-voice-reinforcement": "Amplify the presenter's voice in the room",
  "independent-record-mix": "Recording needs its own sound mix",
  "audio-bridge-usb-dante-analogue": "Connect existing room sound to the call or recording system",
  "multiple-audio-zones": "Different areas need different sound", "operator-audio-control": "A technician will mix or mute microphones",
  "usb-microphone-path": "Microphones connect directly to the meeting computer",
  "analogue-microphone-path": "Microphones connect to a separate audio mixer",
  "analogue-line-level-path": "An existing mixer provides the microphone sound",
  "phantom-powered-microphone": "Existing microphones need power from their mixer",
  "digital-audio-microphone-path": "An existing digital mixer provides sound",
  "dante-microphone-path": "Microphones use the building's audio network",
  "proprietary-network-microphone": "Microphones belong to an existing branded system",
  "byod-byom": "A visitor's laptop uses the room camera and microphones",
  "room-pc-uc": "The room meeting system uses the camera and microphones",
  "switchable-host-usb": "Switch between the room system and a visitor's laptop",
  "room-host-usb2": "Everyday call, touch screen, keyboard or mouse connections",
  "usb3-high-bandwidth-path": "High-detail cameras or capture equipment need a faster connection",
  "usb-extension-required": "The camera or other device is far from its computer",
};
export function operationalQuestion(question: DiscoveryQuestion): DiscoveryQuestion {
  const copy = wording[question.id];
  return { ...question, question: copy?.[0] || question.question, prompt: copy?.[1] || question.prompt,
    options: question.options.map(option => ({ ...option, label: optionWording[option.value] || option.label })) };
}
export function updateOperationalAnswer(previous: DiscoveryAnswers, question: DiscoveryQuestion, value: string): DiscoveryAnswers {
  const next: DiscoveryAnswers = { ...previous, [question.id]: question.selectionMode === "multiple"
    ? wmDiscoveryToggleMultiSelectAnswer(question, previous[question.id], value) : value };
  if (question.id === "sources") delete next["source-count-exact"];
  if (question.id === "displays") delete next["display-count-exact"];
  const visible = new Set(wmDiscoveryFilterUnifiedCommsQuestions(getVisibleDiscoveryQuestions(wmDiscoveryAnswerToText(next.opportunity), next), next).map(row => row.id));
  for (const key of Object.keys(next)) if (getFullDiscoveryOptions(key).length && !visible.has(key)) delete next[key];
  return next;
}
export function refreshRoomLayout(answers: DiscoveryAnswers, notes: DiscoveryNotes, existing: ProjectTopology): ProjectTopology {
  const generated = generateProjectTopologyFromDiscovery({ answers, notes, application: wmDiscoveryAnswerToText(answers.opportunity) });
  const retained = existing.devices.filter(device => device.sku || device.status === "confirmed");
  const retainedIds = new Set(retained.map(device => device.id));
  const locations = generated.locations.map(location => existing.locations.find(row => row.id === location.id) || location);
  for (const location of existing.locations) if (!locations.some(row => row.id === location.id)) locations.push(location);
  return { ...generated, locations, devices: [...generated.devices.filter(device => !retainedIds.has(device.id)), ...retained],
    connections: generated.connections.map(connection => {
      const previous = existing.connections.find(row => row.id === connection.id && row.fromDeviceId === connection.fromDeviceId && row.toDeviceId === connection.toDeviceId);
      return previous ? { ...connection, lengthMode: previous.lengthMode, lengthMetres: previous.lengthMetres } : connection;
    }) };
}
export function supportingRoomScope(answers: DiscoveryAnswers, topology: ProjectTopology): string[] {
  const contains = (id: string, value: string) => [answers[id]].flat().includes(value);
  const scopes = ["Displays or projectors: model, image size, viewing distance and mounting",
    "Cabling and adapters: connectors, route lengths, wall plates and containment",
    "Mounting, rack space and power: fixing surfaces, access, ventilation and power outlets"];
  if (answers.audio && !contains("audio", "no-room-audio")) scopes.push("Speakers, amplification and audio processing: coverage, listening areas and signal compatibility");
  if (answers["uc-purpose"] && !contains("uc-purpose", "no-uc")) scopes.push("Cameras and microphones: coverage, mounting, meeting host, recording and audio paths");
  if (answers.control) scopes.push("Room control: start-up, source selection, volume, shutdown and integration");
  if (contains("network-path", "corporate-av-vlan") || contains("network-path", "dedicated-av-lan")) scopes.push("Network switching: AV capacity, power, configuration and IT ownership");
  if (contains("display-behaviour", "video-wall-or-processor-feed")) scopes.push("Video wall: screen layout, processor, mounting, calibration and service access");
  scopes.push(...topology.devices.flatMap(device => device.notes?.split("\n").filter(line => line.startsWith("Accessories / dependencies:")) || []));
  return scopes;
}
export function roomEquipmentSchedule(topology: ProjectTopology): string[] {
  return topology.devices.map(device => `${device.quantity} × ${device.manufacturer || "Manufacturer to select"} ${device.sku || device.name} — ${device.category}, ${topology.locations.find(location => location.id === device.locationId)?.name || "Location to confirm"}; ${device.status === "confirmed" ? "recorded as confirmed" : "suitability to confirm"}${device.notes ? `. ${device.notes.replaceAll("\n", "; ")}` : ""}`);
}

export function roomTemplateEquipment(topology: ProjectTopology): import('../../lib/customRoomTemplates').CreateCustomRoomTemplateInput['bom'] {
  return topology.devices.map(device => ({
    id: device.id, sku: device.thirdParty ? `BY-OTHERS-${device.id}` : device.sku || 'CUSTOM',
    description: device.name, role: device.category, qty: device.quantity, type: 'Validate',
    status: 'validate', manufacturer: device.manufacturer, model: device.sku,
    productRelationship: device.productRelationship,
    evidence: device.notes || 'Selected during Discovery; specifications require review.',
    notes: `Location: ${topology.locations.find(location => location.id === device.locationId)?.name || 'To confirm'}. ${device.notes || ''}`,
    owner: device.thirdParty ? 'integrator' : 'wyrestorm',
  }));
}

/** Merge newly generated topology rows into a template BOM without losing its researched SKU evidence. */
export function mergeRoomTemplateEquipment(
  existing: import('../../lib/roomTemplates').TemplateBomRow[] = [],
  generated: import('../../lib/customRoomTemplates').CreateCustomRoomTemplateInput['bom'] = [],
): import('../../lib/roomTemplates').TemplateBomRow[] {
  const byId = new Map((generated ?? []).map(row => [row.id, row]));
  const merged = existing.map(row => {
    const next = byId.get(row.id);
    if (!next) return { ...row };
    byId.delete(row.id);
    return {
      ...row,
      sku: next.sku || row.sku,
      description: next.description || row.description,
      role: next.role || row.role,
      qty: next.qty,
      manufacturer: next.manufacturer || row.manufacturer,
      model: next.model || row.model,
      owner: next.owner || row.owner,
      productRelationship: next.productRelationship || row.productRelationship,
      evidence: row.evidence || next.evidence,
      notes: [row.notes, next.notes].filter(Boolean).join(" "),
    };
  });
  return [...merged, ...byId.values()];
}
