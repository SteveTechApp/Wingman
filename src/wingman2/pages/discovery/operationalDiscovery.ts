import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";
import { generateProjectTopologyFromDiscovery, type ProjectTopology } from "../../lib/projectTopology";
import type { DiscoveryNotes } from "./discoveryTypes";
import { getFullDiscoveryOptions, getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { wmDiscoveryAnswerToText, wmDiscoveryFilterUnifiedCommsQuestions, wmDiscoveryNormaliseAnswerList, wmDiscoveryToggleMultiSelectAnswer } from "./discoveryAnswerUtils";

const wording: Record<string, [string, string]> = {
  opportunity: ["What will people do in this space?", "Choose the closest everyday use. Your market and room type give Wingman the context."],
  scale: ["How big is the space people will use?", "Record length, width and ceiling height separately, then describe the seating and layout."],
  sources: ["How many things will people want to show?", "Count laptops, room computers, television feeds and content players that may be connected."],
  "source-connection": ["How will people get video sources into this room?", "First separate installed equipment, devices people bring, and network video. The next questions capture source types, positions and how users choose them."],
  "primary-display": ["What are the room's main displays or projection surfaces?", "Choose the primary arrangement first. Repeater screens are captured separately."],
  displays: ["How many video feed endpoints are needed in total?", "Count every primary and repeater feed. A video wall or blended projection surface may use one processor feed."],
  "repeater-displays": ["How many extra screens should repeat or extend the main viewing area?", "Choose none, a range, or leave the count open for the room survey."],
  "display-behaviour": ["How should the primary and repeater displays behave?", "Choose mirrored content, independent routes, wall processing or multiview. For repeaters, select overflow or room-wide visibility when either applies."],
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
  audio: ["Where should the room's sound come out?", "Pick the closest answer. Speaker type, loudness and separate mixes are asked next, and only if the room needs its own sound."],
  "audio-route": ["Where does the sound come from, and where should it go?", "Think about a video on the screen: which box takes its sound and sends it to the room, the call, a recording or the building audio network?"],
  "audio-zones": ["Do different areas need their own sound and volume?", "Name the areas and explain whether they ever join into one larger room."],
  "audio-programme": ["What listening experience do you want?", "Clear speech, background music, films and live performances need different speaker systems."],
  "room-acoustics": ["What does the room sound like today?", "Is speech clear, is there an echo, or is there distracting background noise?"],
  control: ["How should people choose sources and operate the room?", "Say who operates it and where: at the screen, wall keypad, touch panel, app or central control desk. Explain whether different screens can show different sources, or whether operation is automatic."],
  "network-path": ["Who will look after connections between rooms?", "Ask the IT team whether existing building connections can carry the pictures. It is fine to leave this open."],
  "locations-connections": ["Where are the sources, displays and connection points?", "Choose every applicable position: central communications rack, room rack, cupboard, lectern, table, display, another room or building, or AV network. Add source-to-display routes and approximate distances; exact measurements can wait for the site survey."],
  commissioning: ["What should be checked and handed over when the room is ready?", "Choose the tests, training or records the customer expects. If another contractor is responsible, say so."],
  "avoip-profile": ["What matters most when sharing pictures across the site?", "Describe readable detail, responsiveness and how many different pictures people need at once."],
  "source-device-workflows": ["What kinds of sources must the room support?", "Select devices and feeds, including existing customer equipment. Add quantity, connector and position details in the note or room layout."],
  "wireless-presentation-operation": ["How should wireless sharing work?", "Who can share, who approves it, and should several people appear at once?"],
  "multiview-destination": ["Who needs to see several pictures together?", "Identify each screen or audience that needs a combined view."],
  "multiview-operation": ["How should someone arrange those pictures?", "Fixed layouts, presets, or an operator changing the layout during use?"],
  "video-wall-technology": ["What kind of large display is planned?", "A group of separate screens or one continuous LED surface? Leave the technology open if undecided."],
  "video-wall-purpose": ["What should the large display show?", "One large picture, several pictures, live monitoring or scheduled information?"],
};
const optionWording: Record<string, string> = {
  "single-large-flat-panel": "One large flat panel display",
  "dual-large-flat-panels": "Two large flat panel displays",
  "three-large-flat-panels": "Three large flat panel displays",
  "single-projector": "One projector",
  "dual-projectors": "Two projectors",
  "lcd-video-wall": "LCD video wall",
  "led-video-wall": "LED video wall",
  "other-primary-display": "Another primary display arrangement",
  "unknown-primary-display": "Not yet confirmed — primary display",
  "no-repeater-displays": "No repeater screens",
  "one-two-repeater-displays": "1–2 repeater screens",
  "three-four-repeater-displays": "3–4 repeater screens",
  "five-eight-repeater-displays": "5–8 repeater screens",
  "nine-plus-repeater-displays": "9+ repeater screens",
  "unknown-repeater-displays": "Not yet confirmed — repeater count",
  "overflow-viewing": "Repeater screens for overflow seating",
  "room-wide-visibility": "Repeat the primary picture for room-wide visibility",
  "4k60-standard": "Sharp detail on modern screens", "1080p-standard-hdmi": "Everyday presentations and video",
  "4k-dci-resolution": "Cinema or production-grade 4K detail",
  "8k-resolution": "Exceptional detail on very large or close-viewed screens",
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
  "room-audio": "Through room speakers", "display-audio": "From the screens' own speakers",
  "dante-network-audio": "Through the building's audio network", "no-room-audio": "No separate room sound",
  "extract-at-source": "The player itself has a sound output", "extract-at-switcher": "The video box separates the sound",
  "extract-at-display": "The screen sends the sound on", "route-to-room-amplifier": "The room speakers and amplifier play it",
  "route-to-uc-host": "The meeting computer joins with it", "route-to-recorder": "A recorder or stream captures it",
  "route-to-dante": "It joins the building audio network", "route-to-display-speakers": "Only the screen's own speakers play it",
  "no-programme-audio-route": "No other device carries programme sound", "unknown-audio-route": "Not known yet",
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
  "commissioning-functional-test": "Check that every screen, camera, speaker and room control works",
  "commissioning-acceptance-criteria": "The customer needs to test and sign off the finished room",
  "commissioning-user-training": "Show everyday users how to use the room",
  "commissioning-operator-training": "Train the people who support or operate the system",
  "commissioning-as-built-records": "Hand over drawings, settings and connection records",
  "commissioning-by-others": "Another contractor will test and hand over the system",
  "commissioning-unknown": "Not known yet — confirm before handover",
};
export function operationalQuestion(question: DiscoveryQuestion): DiscoveryQuestion {
  const copy = wording[question.id];
  const byOthersRoute = question.id === "audio-route" && question.options.length > 0
    && question.options.every((option) => option.value.startsWith("switcher-feed-"));
  return { ...question, question: byOthersRoute ? "What audio feed should the video switching provide to the separate audio system?" : copy?.[0] || question.question,
    prompt: byOthersRoute ? "Audio design is by others. Confirm only the feed the video system must hand over; add the receiving location or interface in the optional note if known." : copy?.[1] || question.prompt,
    options: question.options.map(option => ({ ...option, label: optionWording[option.value] || option.label })) };
}
export function updateOperationalAnswer(previous: DiscoveryAnswers, question: DiscoveryQuestion, value: string): DiscoveryAnswers {
  const next: DiscoveryAnswers = { ...previous, [question.id]: question.selectionMode === "multiple"
    ? wmDiscoveryToggleMultiSelectAnswer(question, previous[question.id], value) : value };
  if (question.id === "audio") {
    const wasByOthers = [previous.audio].flat().includes("audio-by-others");
    const isByOthers = [next.audio].flat().includes("audio-by-others");
    if (wasByOthers !== isByOthers) delete next["audio-route"];
  }
  if (question.id === "sources") delete next["source-count-exact"];
  if (question.id === "displays") delete next["display-count-exact"];
  let visibleQuestions = wmDiscoveryFilterUnifiedCommsQuestions(getVisibleDiscoveryQuestions(wmDiscoveryAnswerToText(next.opportunity), next), next);
  const visibleDisplayBehaviour = visibleQuestions.find(row => row.id === "display-behaviour");
  if (visibleDisplayBehaviour) {
    const selected = wmDiscoveryNormaliseAnswerList(next["display-behaviour"]);
    const stillAvailable = selected.filter(value => visibleDisplayBehaviour.options.some(option => option.value === value));
    if (stillAvailable.length !== selected.length) {
      next["display-behaviour"] = stillAvailable;
      visibleQuestions = wmDiscoveryFilterUnifiedCommsQuestions(getVisibleDiscoveryQuestions(wmDiscoveryAnswerToText(next.opportunity), next), next);
    }
  }
  const visible = new Set(visibleQuestions.map(row => row.id));
  for (const key of Object.keys(next)) if (getFullDiscoveryOptions(key).length && !visible.has(key)) delete next[key];
  return next;
}
export function refreshRoomLayout(answers: DiscoveryAnswers, notes: DiscoveryNotes, existing: ProjectTopology): ProjectTopology {
  const generated = generateProjectTopologyFromDiscovery({ answers, notes, application: wmDiscoveryAnswerToText(answers.opportunity) });
  const retained = existing.devices.filter(device => !device.generatedByDiscovery && (device.sku || device.status === "confirmed"));
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
  return topology.devices.map(device => {
    const identity = [device.manufacturer, device.sku].filter(Boolean).join(" ") || device.name;
    const ports = device.ports?.length
      ? device.ports.map(port => `${port.direction}: ${port.name}${port.connector ? ` (${port.connector})` : " (connector / protocol to confirm)"}${port.services.length ? ` [${port.services.join(" + ")}]` : " [services to confirm]"}${port.status === "unknown" ? " — to confirm" : port.status === "assumed" ? " — assumed, validate" : ""}`).join("; ")
      : "interfaces not captured";
    const owner = device.ownership === "unassigned" ? "owner to assign" : device.ownership === "third-party" ? "customer / third-party" : device.ownership === "wyrestorm" ? "WyreStorm" : device.thirdParty ? "customer / third-party" : "owner not recorded";
    return `${device.quantity} × ${identity} — ${device.signalRole || device.category}, ${topology.locations.find(location => location.id === device.locationId)?.name || "Location to confirm"}; ${owner}; ${device.status === "confirmed" ? "recorded as confirmed" : "suitability to confirm"}; interfaces: ${ports}${device.notes ? `. ${device.notes.replaceAll("\n", "; ")}` : ""}`;
  });
}

export function roomTemplateEquipment(topology: ProjectTopology): import('../../lib/customRoomTemplates').CreateCustomRoomTemplateInput['bom'] {
  return topology.devices.map(device => ({
    id: device.id, sku: device.ownership === "unassigned" ? "TBC" : device.thirdParty ? `BY-OTHERS-${device.id}` : device.sku || 'CUSTOM',
    description: device.name, role: device.category, qty: device.quantity, type: 'Validate',
    status: 'validate', manufacturer: device.manufacturer, model: device.sku,
    productRelationship: device.productRelationship,
    evidence: device.notes || 'Selected during Discovery; specifications require review.',
    notes: `Location: ${topology.locations.find(location => location.id === device.locationId)?.name || 'To confirm'}. ${device.notes || ''}`,
    owner: device.ownership === "unassigned" ? "to-confirm" : device.ownership === "third-party" || device.thirdParty ? 'integrator' : 'wyrestorm',
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
