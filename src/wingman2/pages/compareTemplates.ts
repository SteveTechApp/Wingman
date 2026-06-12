export type ComparePriority =
  | "blocking"
  | "core"
  | "integration"
  | "install"
  | "useful_extra";

export type CompareFieldType =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "port_count"
  | "standard"
  | "version";

export type CompareTechnologyType =
  | "presentation_switcher"
  | "matrix_switcher"
  | "hdbaset_extender"
  | "avoip_endpoint"
  | "avoip_controller"
  | "multiview_processor"
  | "video_wall_processor"
  | "usb_uc_device";

export type CompareTemplateField = {
  id: string;
  label: string;
  priority: ComparePriority;
  fieldType: CompareFieldType;
  expectedForType: string;
  whyItMatters: string;
  blocksRecommendation: boolean;
  inferredWhenMissing?: string;
};

export const compareTechnologyLabels: Record<CompareTechnologyType, string> = {
  presentation_switcher: "Presentation switcher",
  matrix_switcher: "Matrix switcher",
  hdbaset_extender: "HDBaseT extender",
  avoip_endpoint: "AVoIP encoder / decoder",
  avoip_controller: "AVoIP controller",
  multiview_processor: "Multiview processor",
  video_wall_processor: "Video wall processor",
  usb_uc_device: "USB / UC device"
};

export const comparePriorityLabels: Record<ComparePriority, string> = {
  blocking: "Blocking",
  core: "Core",
  integration: "Integration",
  install: "Install",
  useful_extra: "Useful extra"
};

export const comparePriorityOrder: ComparePriority[] = [
  "blocking",
  "core",
  "integration",
  "install",
  "useful_extra"
];

function field(
  id: string,
  label: string,
  priority: ComparePriority,
  fieldType: CompareFieldType,
  expectedForType: string,
  whyItMatters: string,
  blocksRecommendation = false,
  inferredWhenMissing?: string
): CompareTemplateField {
  return {
    id,
    label,
    priority,
    fieldType,
    expectedForType,
    whyItMatters,
    blocksRecommendation,
    inferredWhenMissing
  };
}

const videoFormatFields: CompareTemplateField[] = [
  field(
    "max_resolution",
    "Maximum resolution",
    "blocking",
    "standard",
    "Confirmed maximum supported video format",
    "A product that cannot pass the required format is not a safe equivalent.",
    true,
    "Sometimes inferred from 4K30, 4K60, 4:4:4, HDR or product family text."
  ),
  field(
    "chroma",
    "Chroma support",
    "core",
    "standard",
    "4:4:4, 4:2:2 or 4:2:0",
    "Chroma matters for PC text clarity, education displays and technical sources."
  ),
  field(
    "hdr",
    "HDR support",
    "core",
    "boolean",
    "HDR10 / HLG / Dolby Vision if required",
    "HDR mismatch may affect premium displays, signage and hospitality applications."
  ),
  field(
    "hdcp",
    "HDCP version",
    "core",
    "version",
    "HDCP 2.2 or HDCP 2.3 for protected 4K content",
    "Protected content may fail if the HDCP path is not compatible."
  )
];

const controlFields: CompareTemplateField[] = [
  field(
    "lan_control",
    "LAN / API control",
    "integration",
    "boolean",
    "IP control, web GUI or documented API",
    "Important for managed rooms and third-party control systems."
  ),
  field(
    "rs232",
    "RS-232",
    "integration",
    "boolean",
    "Serial control or serial pass-through",
    "Common control requirement for displays, projectors and control systems."
  ),
  field(
    "ir",
    "IR",
    "integration",
    "boolean",
    "IR input/output or pass-through where required",
    "Useful for legacy display and source control."
  ),
  field(
    "cec",
    "CEC",
    "useful_extra",
    "boolean",
    "CEC display/source control where supported",
    "Useful for simpler room control but rarely a direct blocker."
  )
];

const installFields: CompareTemplateField[] = [
  field(
    "power",
    "Power method",
    "install",
    "enum",
    "External PSU, PoE, PoE+, PoH or internal PSU",
    "Power method affects installation cost, rack design and display-end cabling."
  ),
  field(
    "mounting",
    "Mounting / form factor",
    "install",
    "enum",
    "Rack, wall plate, box endpoint, card frame or display-side device",
    "The correct form factor avoids installation surprises."
  ),
  field(
    "included_accessories",
    "Included accessories",
    "install",
    "text",
    "Receivers, PSUs, brackets, antennas or adapters if supplied",
    "Kits and standalone products should not be compared as if they include the same parts."
  )
];

export const compareTemplates: Record<CompareTechnologyType, CompareTemplateField[]> = {
  presentation_switcher: [
    field("technology_type", "Technology type", "blocking", "enum", "Presentation switcher / room switcher", "Prevents comparing different product classes.", true),
    field("product_role", "Product role", "blocking", "enum", "Switcher, transmitter, hybrid switcher or room hub", "Role mismatch changes the system architecture.", true),
    field("hdmi_inputs", "HDMI inputs", "blocking", "port_count", "Count of usable HDMI inputs", "Input count is normally a hard requirement.", true, "May be inferred from SKU patterns such as SW-620 or matrix-style codes."),
    field("usb_c_inputs", "USB-C inputs", "blocking", "port_count", "USB-C inputs with DP Alt Mode if required", "USB-C support is often central to BYOD rooms.", true),
    field("hdmi_outputs", "HDMI outputs", "blocking", "port_count", "Count of HDMI outputs; mirrored or independent", "Output count controls display support.", true),
    field("hdbaset_outputs", "HDBaseT outputs", "blocking", "port_count", "HDBaseT output count and version", "Required where the display is remote from the switching device.", true),
    ...videoFormatFields,
    field("scaling", "Scaling", "core", "boolean", "Output scaling or format management", "Useful when displays or projectors have mixed resolutions."),
    field("autoswitching", "Auto-switching", "core", "boolean", "Auto input detection / switching", "A common meeting-room usability requirement."),
    field("usb_hosts", "USB host ports", "core", "port_count", "Laptop-side host connections", "Required for BYOD/BYOM host selection."),
    field("usb_devices", "USB device ports", "core", "port_count", "Camera, mic, speakerphone or touch device ports", "USB device capacity affects meeting-room usability."),
    field("usb_version", "USB version", "blocking", "standard", "USB 2.0 or USB 3.x transport", "USB 3.x requirements must not be met with a USB 2.0-only product.", true),
    field("audio_deembed", "Audio de-embedding", "integration", "boolean", "Analogue or digital audio output", "Needed for DSP, amplifier or assisted-listening integration."),
    field("mic_input", "Mic input", "integration", "boolean", "Mic input or audio input if required", "Useful in simpler rooms without a separate DSP."),
    field("amplifier", "Amplifier", "integration", "boolean", "Built-in amplifier if required", "Can remove the need for an additional amplifier."),
    field("wireless_casting", "Wireless casting", "useful_extra", "boolean", "Built-in or accessory-based AirPlay / Miracast / casting", "Useful customer feature, but should be separated from core switching."),
    ...controlFields,
    ...installFields
  ],

  matrix_switcher: [
    field("technology_type", "Technology type", "blocking", "enum", "Matrix switcher", "Prevents comparing a matrix with an extender, scaler or AVoIP endpoint.", true),
    field("product_role", "Product role", "blocking", "enum", "Matrix chassis or fixed matrix", "Matrix products should be compared by switching role and I/O size.", true),
    field("input_count", "Inputs", "blocking", "port_count", "Total switchable source inputs", "Input count is a primary matrix requirement.", true, "Often inferred from MX-0808 style SKU patterns."),
    field("output_count", "Outputs", "blocking", "port_count", "Total switchable outputs", "Output count is a primary matrix requirement.", true, "Often inferred from MX-0808 style SKU patterns."),
    field("input_type", "Input signal type", "blocking", "enum", "HDMI, HDBaseT, card input or mixed input", "Wrong signal type can make the match unsafe.", true),
    field("output_type", "Output signal type", "blocking", "enum", "HDMI, HDBaseT, mirrored HDMI, card output or mixed output", "Wrong output type can make the match unsafe.", true),
    ...videoFormatFields,
    field("scaling", "Scaling", "core", "boolean", "Matrix or output scaling where required", "Useful where displays have mixed capabilities."),
    field("audio_matrixing", "Audio matrixing", "core", "boolean", "Audio routing, breakaway or matrix audio", "Important in commercial systems with external audio routing."),
    field("audio_deembed", "Audio de-embedding", "integration", "boolean", "Analogue, digital, balanced or unbalanced audio outputs", "Needed for DSP and amplifier integration."),
    field("edid_management", "EDID management", "core", "boolean", "EDID copy, preset or management", "EDID handling reduces source/display compatibility issues."),
    ...controlFields,
    ...installFields
  ],

  hdbaset_extender: [
    field("technology_type", "Technology type", "blocking", "enum", "HDBaseT extender", "Prevents comparing an extender with AVoIP or matrix switching.", true),
    field("product_role", "Product role", "blocking", "enum", "Transmitter, receiver or extender kit", "TX/RX role mismatch is a blocking issue.", true),
    field("hdbaset_version", "HDBaseT version", "blocking", "standard", "HDBaseT 1.0, 2.0 or 3.0", "Version affects bandwidth, USB support and system expectations.", true),
    field("video_input", "Video input", "blocking", "port_count", "HDMI or USB-C input count on transmitter", "Source-side input must match the competitor device.", true),
    field("video_output", "Video output", "blocking", "port_count", "HDMI output count on receiver or loop output", "Display-side output must match the requirement.", true),
    field("distance", "Transmission distance", "blocking", "standard", "Required cable distance at target video format", "Distance mismatch can make the product unusable.", true),
    ...videoFormatFields,
    field("usb_version", "USB transport", "blocking", "standard", "USB 2.0 or USB 3.x if required", "USB class is often a hard requirement for cameras and peripherals.", true),
    field("ethernet_passthrough", "Ethernet pass-through", "integration", "boolean", "LAN pass-through if required", "Useful when the remote display or device needs LAN."),
    field("audio_deembed", "Audio de-embedding", "integration", "boolean", "Audio extraction at TX or RX", "Needed for DSP or display-side audio."),
    ...controlFields,
    ...installFields
  ],

  avoip_endpoint: [
    field("technology_type", "Technology type", "blocking", "enum", "AVoIP endpoint", "Prevents comparing AVoIP with matrix or HDBaseT unless architecture is intentionally changing.", true),
    field("product_role", "Product role", "blocking", "enum", "Encoder, decoder or transceiver", "Encoder/decoder role mismatch is a blocking issue.", true),
    field("avoip_family", "AVoIP platform / family", "blocking", "standard", "NetworkHD series or equivalent AVoIP platform", "AVoIP families should not be assumed interoperable.", true),
    field("network_speed", "Network speed", "blocking", "standard", "1GbE or 10GbE", "Network speed changes switch requirements and compatibility.", true),
    field("codec", "Codec / transport", "blocking", "standard", "H.264, H.265, JPEG2000, JPEG XS, SDVoE or similar", "Codec affects latency, quality and network requirements.", true),
    field("video_input", "Video input", "blocking", "port_count", "HDMI, USB-C, SDI, NDI or other source input", "Input type and count must match the source requirement.", true),
    field("video_output", "Video output", "blocking", "port_count", "HDMI output, loop output or decoder output", "Output type and count must match the display requirement.", true),
    ...videoFormatFields,
    field("controller_required", "Controller required", "core", "boolean", "Controller, management server or software requirement", "A controller dependency changes system design and cost."),
    field("usb_version", "USB / KVM", "core", "standard", "USB 2.0, USB 3.x or no USB", "Important for KVM, meeting rooms and control workflows."),
    field("video_wall", "Video wall support", "useful_extra", "boolean", "Native or controller-based video wall support", "Useful for signage and large-format deployments."),
    field("multiview", "Multiview support", "useful_extra", "boolean", "Native or external multiview support", "Only relevant where multiple sources need one output canvas."),
    field("audio_deembed", "Audio handling", "integration", "boolean", "HDMI audio, analogue audio, Dante or AES67", "Audio support can be decisive in installed AV systems."),
    field("dante_aes67", "Dante / AES67", "integration", "boolean", "Dante or AES67 audio support", "Important where the project uses networked audio."),
    ...controlFields,
    ...installFields
  ],

  avoip_controller: [
    field("technology_type", "Technology type", "blocking", "enum", "AVoIP controller", "Prevents comparing a controller with an endpoint.", true),
    field("product_role", "Product role", "blocking", "enum", "Controller / management appliance", "Controller role must match the system requirement.", true),
    field("supported_family", "Supported AVoIP family", "blocking", "standard", "Supported encoder/decoder series", "Controllers must match the endpoint family.", true),
    field("endpoint_capacity", "Endpoint capacity", "blocking", "number", "Maximum supported endpoints", "Large systems need enough endpoint capacity.", true),
    field("control_interface", "Control interface", "core", "standard", "Web GUI, API, drivers or control protocol", "Defines integration and commissioning workflow."),
    field("failover", "Failover / redundancy", "useful_extra", "boolean", "Redundancy if supported", "Useful in larger mission-critical systems."),
    field("third_party_control", "Third-party control", "integration", "boolean", "Control system drivers or API", "Important when integrating with room control."),
    ...installFields
  ],

  multiview_processor: [
    field("technology_type", "Technology type", "blocking", "enum", "Multiview processor", "Prevents confusing multiview with simple multi-output switching.", true),
    field("product_role", "Product role", "blocking", "enum", "Multiview processor / decoder / compositor", "The product must create a multi-source canvas.", true),
    field("source_count", "Visible source count", "blocking", "port_count", "Number of simultaneous sources visible on one output", "This is the core multiview requirement.", true),
    field("output_count", "Outputs", "blocking", "port_count", "Number of HDMI/network outputs", "Output count affects display and distribution design.", true),
    field("layout_presets", "Layouts / presets", "core", "boolean", "Preset layouts, custom layouts or windowing", "Defines how useful the multiview is in live applications."),
    ...videoFormatFields,
    field("input_type", "Input type", "blocking", "enum", "HDMI, AVoIP stream, NDI or mixed", "Wrong input type can make the product unusable.", true),
    field("audio_follow", "Audio follow / audio select", "core", "boolean", "Audio selection or audio follow video", "Important when the multiview output carries audio."),
    ...controlFields,
    ...installFields
  ],

  video_wall_processor: [
    field("technology_type", "Technology type", "blocking", "enum", "Video wall processor", "Prevents comparing video wall processing with ordinary switching.", true),
    field("product_role", "Product role", "blocking", "enum", "Video wall processor / wall controller", "Must support wall layout creation.", true),
    field("wall_layout", "Wall layout", "blocking", "standard", "2x2, 3x3, custom LCD or LED processor workflow", "Wall layout is a primary requirement.", true),
    field("input_count", "Inputs", "blocking", "port_count", "Number of available sources", "Source count controls wall flexibility.", true),
    field("output_count", "Outputs", "blocking", "port_count", "Number of wall outputs or processor feeds", "Output count controls supported wall size.", true),
    field("led_processor_fit", "LED processor fit", "core", "boolean", "Can feed Novastar / LED processor workflow where required", "LED wall workflows are not the same as LCD video walls."),
    ...videoFormatFields,
    field("scaling", "Scaling", "blocking", "boolean", "Scaling and wall mapping support", "Video wall products normally require scaling/mapping.", true),
    field("bezel_compensation", "Bezel compensation", "core", "boolean", "Bezel compensation where LCD wall requires it", "Important for LCD wall visual alignment."),
    field("windowing", "Windowing / source positioning", "core", "boolean", "Windowing, PIP or custom source placement", "Important for control rooms and flexible wall layouts."),
    ...controlFields,
    ...installFields
  ],

  usb_uc_device: [
    field("technology_type", "Technology type", "blocking", "enum", "USB / UC device", "Prevents comparing UC peripherals with video-only switching.", true),
    field("product_role", "Product role", "blocking", "enum", "Camera, bridge, hub, soundbar, speakerphone or UC interface", "Role mismatch changes the meeting-room design.", true),
    field("usb_version", "USB version", "blocking", "standard", "USB 2.0 or USB 3.x", "USB 3.x camera workflows must not be matched with USB 2.0-only products.", true),
    field("usb_hosts", "USB host ports", "blocking", "port_count", "Number of computer/laptop host ports", "Host count affects BYOD/BYOM use.", true),
    field("usb_devices", "USB device ports", "blocking", "port_count", "Number of connected USB peripheral ports", "Device count affects camera, mic, touch and speakerphone support.", true),
    field("camera_support", "Camera support", "core", "boolean", "USB camera, PTZ, NDI or bridge support", "Cameras are often the main reason for the product."),
    field("audio_support", "Audio support", "core", "boolean", "Speaker, mic, line audio or bridge audio", "UC audio mismatch creates user experience problems."),
    field("video_support", "Video support", "core", "boolean", "HDMI/USB-C video if the product also handles presentation", "Some UC products also handle AV presentation."),
    field("power_delivery", "USB-C power delivery", "useful_extra", "boolean", "Laptop charging where supported", "Useful for BYOD rooms, but not always a blocker."),
    ...controlFields,
    ...installFields
  ]
};