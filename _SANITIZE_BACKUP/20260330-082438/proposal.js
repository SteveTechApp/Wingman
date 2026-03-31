export function buildBom(context) {
  const rows = [];
  const topology = context.topology || "AVoIP";
  const displays = Number(context.displayCount || 3);
  const sources = Number(context.sourceCount || 2);
  const usb = context.usbMode === "host-device";
  const audio = context.audioMode || "dsp";
  const control = context.controlMode !== "none";
  const switched = context.switchType !== "none";

  if (topology === "AVoIP") {
    rows.push(["WyreStorm Source Hub", "WyreStorm Apollo VX20", 1]);
    rows.push(["WyreStorm Encoder TX", "WyreStorm NHD-400-TX", sources]);
    rows.push(["WyreStorm Decoder RX", "WyreStorm NHD-400-RX", displays]);
    if (switched) rows.push(["Netgear AV Line Switch", "Netgear AV Line M4250 series", 1]);
  }

  if (topology === "Matrix") {
    rows.push(["WyreStorm Source Devices", "WyreStorm source family", sources]);
    rows.push(["WyreStorm Matrix Core", "WyreStorm matrix family", 1]);
  }

  if (topology === "Extender") {
    rows.push(["WyreStorm Source Hub", "WyreStorm Apollo VX20", 1]);
    rows.push(["WyreStorm Extender / TX-RX chain", "WyreStorm extender family", 1]);
    if (switched) rows.push(["Netgear AV Line Switch", "Netgear AV Line managed switch", 1]);
  }

  rows.push(["Hi-Sense Displays", "Hi-Sense display family", displays]);
  if (usb) rows.push(["WyreStorm USB-capable signal path", "WyreStorm USB-enabled AV endpoints", 1]);
  if (audio === "dsp") rows.push(["Generic DSP/Mixer", "Generic DSP/Mixer", 1]);
  if (audio === "amp") rows.push(["Generic 100V line amplifier", "4/6/8 channel 100V line amp", 1]);
  if (audio !== "embedded") rows.push(["Speaker Circuit", "100V line loudspeakers", 2]);
  if (control) rows.push(["3rd party control", "3rd party control", 1]);
  rows.push(["Structured cabling", "HDMI / CAT / USB to suit site conditions", Math.max(1, displays)]);

  return rows;
}

export function validateContext(context) {
  const issues = [];
  const topology = context.topology || "AVoIP";
  const distance = Number(context.distance || 0);
  const video = context.videoFormat || "4k60-444";

  if (topology === "AVoIP" && context.switchType !== "poe-managed") {
    issues.push({
      level: "error",
      title: "AVoIP requires managed switching",
      detail: "Wingman expects Netgear AV Line managed switching for multicast, VLAN, and QoS stability."
    });
  }

  if (topology === "Extender" && video === "4k60-444" && distance > 40) {
    issues.push({
      level: "warn",
      title: "Long-distance 4K60 4:4:4 risk",
      detail: "At longer copper distances, compression, DSC, reduced chroma, or alternate transport may be needed."
    });
  }

  if (topology === "Extender" && distance > 100) {
    issues.push({
      level: "error",
      title: "Copper distance exceeds 100m guideline",
      detail: `Current distance is ${distance}m.`
    });
  }

  if (topology === "Matrix" && context.usbMode === "host-device") {
    issues.push({
      level: "warn",
      title: "USB path needs separate architecture",
      detail: "HDMI matrix switching alone does not guarantee host/device USB workflow."
    });
  }

  if ((topology === "AVoIP" || topology === "Matrix") && context.controlMode === "none") {
    issues.push({
      level: "warn",
      title: "No control layer selected",
      detail: "Large rooms often still need control orchestration for displays, switching, or automation."
    });
  }

  if (!issues.length) {
    issues.push({
      level: "ok",
      title: "No major conflicts detected",
      detail: "Current configuration is internally consistent under Wingman prototype rules."
    });
  }

  return issues;
}

export function generateProposalText(context) {
  const topology = context.topology || "AVoIP";
  const competitor = context.competitor || "Blustream";
  const roomName = context.roomName || "Primary Room";

  const usbLine =
    context.usbMode === "host-device"
      ? "USB host/device support is included where required."
      : "USB transport is not part of the current brief.";

  const audioLine =
    context.audioMode === "embedded"
      ? "Audio is retained as embedded programme audio only."
      : context.audioMode === "amp"
        ? "Audio is distributed via a generic 100V line amplifier and loudspeaker circuit."
        : "Audio is processed via a Generic DSP/Mixer before distribution to the speaker circuit.";

  return `${roomName} is designed around a ${topology} architecture using a WyreStorm-first AV backbone, Netgear AV Line switching where network transport is required, Hi-Sense display technology, and an open control strategy through 3rd party control.

Design intent
This proposal is structured as a design and BOM solution rather than a price-led response. The system is intended to deliver a consistent, manufacturer-backed AV workflow without unnecessarily locking the project into a control-first ecosystem. ${usbLine} ${audioLine}

Why WyreStorm
WyreStorm is positioned here as the true AV transport manufacturer at the core of the solution. Rather than forcing a single ecosystem to own every layer of the room, Wingman keeps the AV backbone on WyreStorm, the switching layer on Netgear AV Line, the display layer on Hi-Sense, and control intentionally open.

Competitive positioning against ${competitor}
The comparison should be framed by transport role, endpoint behaviour, USB expectations, deployment complexity, and support accountability — not by badge familiarity alone.

Deliverable scope
The generated BOM is restricted to approved delivery brands and categories only: WyreStorm for core AV, Netgear AV Line for switching, Hi-Sense for display, Generic DSP/Mixer or Generic 100V line amplifier for audio, and 3rd party control.`;
}