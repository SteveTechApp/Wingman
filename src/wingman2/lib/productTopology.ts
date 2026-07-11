import {
  productText,
  type ProductNarrative,
  type ProductSpec,
} from "./productStoryEngine";

export type ProductTopologySignal =
  | "video"
  | "network"
  | "usb"
  | "control"
  | "audio"
  | "power"
  | "capture";

export type ProductTopologyConfidence =
  | "verified"
  | "inferred"
  | "review-required";

export type ProductTopologyEndpoint = {
  tag: string;
  title: string;
  detail: string;
};

export type ProductTopologyEdge = {
  signal: ProductTopologySignal;
  label: string;
};

export type ProductTopologyBranch = ProductTopologyEndpoint & {
  slot: "top" | "bottom";
  signal: ProductTopologySignal;
  label: string;
};

export type ProductTopologyProfile = {
  sku: string;
  archetype: string;
  label: string;
  mode:
    | "av-over-ip"
    | "matrix"
    | "video-wall"
    | "uc-presentation"
    | "wireless"
    | "extension"
    | "usb"
    | "generic";
  confidence: ProductTopologyConfidence;
  renderable: boolean;
  summary: string;
  product: {
    tag: string;
    detail: string;
  };
  source: ProductTopologyEndpoint;
  output: ProductTopologyEndpoint;
  sourceEdge: ProductTopologyEdge;
  outputEdge: ProductTopologyEdge;
  branches: ProductTopologyBranch[];
  checks: string[];
  warnings: string[];
  evidence: string[];
};

function normaliseSku(value: string): string {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function endpointRole(sku: string): "tx" | "rx" | "trx" | null {
  const key = normaliseSku(sku);

  if (/TRX|TXRX/.test(key)) return "trx";
  if (/(^|-)TX($|-)/.test(key)) return "tx";
  if (/(^|-)RX($|-)/.test(key)) return "rx";

  return null;
}

function reviewProfile(
  product: ProductSpec,
  narrative: ProductNarrative,
  reason: string,
): ProductTopologyProfile {
  return {
    sku: product.sku,
    archetype: "review-required",
    label: "Topology needs verification",
    mode: "generic",
    confidence: "review-required",
    renderable: false,
    summary:
      "Wingman does not have enough governed connection data to draw this product safely.",
    product: {
      tag: "TBC",
      detail: product.productType || product.category || "Product role unverified",
    },
    source: {
      tag: "INPUT",
      title: narrative.diagramSource || "Source / input not verified",
      detail: "Confirm the connector, signal direction and host ownership.",
    },
    output: {
      tag: "OUTPUT",
      title: narrative.diagramOutput || "Destination not verified",
      detail: "Confirm the destination and required companion products.",
    },
    sourceEdge: { signal: "video", label: "Signal type TBC" },
    outputEdge: { signal: "video", label: "Signal type TBC" },
    branches: [],
    checks: [
      "Confirm whether this is a source-side, destination-side, processing, control or accessory product.",
      "Confirm every physical input and output used in the intended workflow.",
      "Confirm required companion products and whether the SKU can operate independently.",
    ],
    warnings: [reason],
    evidence: [],
  };
}

function halo90Profile(product: ProductSpec): ProductTopologyProfile {
  return {
    sku: product.sku,
    archetype: "uc-docking-speakerphone",
    label: "USB-C docking conference speakerphone",
    mode: "uc-presentation",
    confidence: "verified",
    renderable: true,
    summary:
      "HALO-90 is a tabletop conference speakerphone combined with a USB-C dock. It is not an amplifier, external DSP or speaker-zone processor.",
    product: {
      tag: "UC DOCK",
      detail: "Conference speakerphone + USB-C docking station",
    },
    source: {
      tag: "HOST",
      title: "Laptop / room PC",
      detail: "Single multifunction USB-C host connection",
    },
    output: {
      tag: "DISPLAY",
      title: "Room display",
      detail: "HDMI 2.0 or USB-C video output, up to 4K60",
    },
    sourceEdge: {
      signal: "usb",
      label: "USB-C: video, USB data, call audio & charging",
    },
    outputEdge: {
      signal: "video",
      label: "HDMI / USB-C display output",
    },
    branches: [
      {
        slot: "top",
        tag: "USB DEV",
        title: "USB peripherals",
        detail: "Camera, keyboard, mouse or storage via USB 3.2",
        signal: "usb",
        label: "USB 3.2 data",
      },
      {
        slot: "bottom",
        tag: "POWER",
        title: "USB-C power source",
        detail: "Up to 85W host charging when suitably powered",
        signal: "power",
        label: "USB-C power delivery",
      },
    ],
    checks: [
      "Confirm whether the display uses HDMI or USB-C video.",
      "Confirm the connected camera or peripheral bandwidth requirement.",
      "Confirm the USB-C power source is suitable when laptop charging is required.",
      "Resolve the lifecycle conflict before using HALO-90 in a new quotation.",
    ],
    warnings: [
      "The microphone array and loudspeaker are integrated into HALO-90; do not draw an external DSP, Dante network or speaker circuit unless the project explicitly includes one.",
      "The official WyreStorm product page currently places HALO-90 under discontinued products, while the imported local business list marks it active. Treat lifecycle as a conflict requiring review.",
    ],
    evidence: [
      "Official product description: professional USB-C docking conference speakerphone.",
      "Official I/O: USB-C host, HDMI and USB-C display outputs, USB 3.2 peripheral ports and USB-C power delivery.",
    ],
  };
}

function speakerphoneProfile(product: ProductSpec): ProductTopologyProfile {
  const bluetooth = normaliseSku(product.sku) === "HALO-60";

  return {
    sku: product.sku,
    archetype: "uc-speakerphone",
    label: "Conference speakerphone",
    mode: "uc-presentation",
    confidence: "inferred",
    renderable: true,
    summary:
      "This is a user-facing conference speakerphone. The microphone and loudspeaker are inside the product; it is not a rack amplifier or external speaker feed.",
    product: {
      tag: "UC AUDIO",
      detail: bluetooth
        ? "USB / Bluetooth conference speakerphone"
        : "USB conference speakerphone",
    },
    source: {
      tag: "HOST",
      title: bluetooth ? "Laptop / mobile device" : "Laptop / room PC",
      detail: bluetooth ? "USB or Bluetooth UC connection" : "USB UC connection",
    },
    output: {
      tag: "CALL",
      title: "Meeting participants",
      detail:
        "Integrated microphones capture the room; integrated speaker plays call audio",
    },
    sourceEdge: {
      signal: "usb",
      label: bluetooth ? "USB / Bluetooth call audio" : "USB call audio",
    },
    outputEdge: {
      signal: "audio",
      label: "Full-duplex room and call audio",
    },
    branches: [],
    checks: [
      "Confirm room size, pickup distance and participant count.",
      "Confirm wired USB or Bluetooth workflow.",
      "Confirm the selected UC host and operating-system compatibility.",
    ],
    warnings: [
      "Do not show external loudspeakers, Dante or DSP unless those products are separately specified.",
    ],
    evidence: ["HALO speakerphone family classification."],
  };
}

function videoBarProfile(product: ProductSpec): ProductTopologyProfile {
  return {
    sku: product.sku,
    archetype: "uc-video-bar",
    label: "All-in-one UC video bar",
    mode: "uc-presentation",
    confidence: "inferred",
    renderable: true,
    summary:
      "The video bar combines camera, microphones and loudspeakers at the display. The computer or BYOD host connects to the bar rather than to separate camera and audio devices.",
    product: {
      tag: "VIDEO BAR",
      detail: product.productType || "Camera + microphones + loudspeakers",
    },
    source: {
      tag: "HOST",
      title: "Laptop / room PC",
      detail: "USB host or supported conferencing connection",
    },
    output: {
      tag: "ROOM",
      title: "Display and remote meeting",
      detail: "Room video, microphone pickup and loudspeaker playback",
    },
    sourceEdge: {
      signal: "usb",
      label: "USB camera and call-audio path",
    },
    outputEdge: {
      signal: "capture",
      label: "Integrated camera, microphone & speaker",
    },
    branches: [
      {
        slot: "top",
        tag: "DISPLAY",
        title: "Room display",
        detail: "Presentation and far-end video",
        signal: "video",
        label: "Display video",
      },
    ],
    checks: [
      "Confirm USB host location and cable distance.",
      "Confirm display connection and room coverage.",
      "Confirm whether wireless presentation or a casting dongle is required.",
    ],
    warnings: [],
    evidence: ["HALO/APO video-bar family classification."],
  };
}

function apo210Profile(product: ProductSpec): ProductTopologyProfile {
  return {
    sku: product.sku,
    archetype: "uc-video-speakerphone-switcher",
    label: "Video-speakerphone room switcher",
    mode: "uc-presentation",
    confidence: "verified",
    renderable: true,
    summary:
      "APO-210-UC is a room UC device that combines conferencing audio and presentation switching. It is not an audio-only accessory.",
    product: {
      tag: "UC CORE",
      detail: "Video-speakerphone switcher",
    },
    source: {
      tag: "USER",
      title: "Laptop / room source",
      detail: "Presentation and conferencing host",
    },
    output: {
      tag: "ROOM",
      title: "Display and room meeting",
      detail: "Presentation video plus room call audio",
    },
    sourceEdge: {
      signal: "usb",
      label: "Presentation / USB host path",
    },
    outputEdge: {
      signal: "video",
      label: "Display and conferencing output",
    },
    branches: [
      {
        slot: "top",
        tag: "CAM",
        title: "Room camera",
        detail: "Supported PTZ or USB camera workflow",
        signal: "usb",
        label: "USB camera",
      },
      {
        slot: "bottom",
        tag: "UC AUDIO",
        title: "Integrated table audio",
        detail: "Microphone pickup and speakerphone playback",
        signal: "audio",
        label: "Call audio",
      },
    ],
    checks: [
      "Confirm the camera model and USB path.",
      "Confirm display connection and presentation inputs.",
      "Confirm the intended room size and pickup requirement.",
    ],
    warnings: [
      "Do not position APO-210-UC as compatible with APO-DG2; use an approved DG2 host such as APO-VX20-UC-V2 or a compatible -W switcher.",
    ],
    evidence: ["Governed Wingman APO-210-UC positioning."],
  };
}

function apoDg2Profile(product: ProductSpec): ProductTopologyProfile {
  return {
    sku: product.sku,
    archetype: "wireless-casting-companion",
    label: "Wireless casting companion dongle",
    mode: "wireless",
    confidence: "verified",
    renderable: true,
    summary:
      "APO-DG2 is the user-side casting dongle. It is not a complete wireless presentation system and must connect to a compatible WyreStorm receiver/base product.",
    product: {
      tag: "DONGLE",
      detail: "USB-C wireless casting companion",
    },
    source: {
      tag: "USER",
      title: "Laptop",
      detail: "USB-C connection to the casting dongle",
    },
    output: {
      tag: "RECEIVER",
      title: "Compatible WyreStorm host / base",
      detail: "APO-VX20-UC-V2 or compatible -W switcher",
    },
    sourceEdge: {
      signal: "usb",
      label: "USB-C user connection",
    },
    outputEdge: {
      signal: "network",
      label: "Wireless casting link",
    },
    branches: [
      {
        slot: "bottom",
        tag: "ROOM",
        title: "Display / UC room",
        detail: "Output is provided by the compatible host product",
        signal: "video",
        label: "Host product output",
      },
    ],
    checks: [
      "Include a compatible receiver/base product.",
      "Confirm whether the workflow is presentation-only or full wireless conferencing.",
      "Confirm the compatible host SKU before quoting.",
    ],
    warnings: [
      "Never present APO-DG2 as a standalone complete casting solution.",
    ],
    evidence: ["Governed Wingman APO-DG2 dependency rule."],
  };
}

function networkHdProfile(
  product: ProductSpec,
  narrative: ProductNarrative,
): ProductTopologyProfile {
  const sku = normaliseSku(product.sku);

  if (sku === "NHD-0401-MV") {
    return {
      sku: product.sku,
      archetype: "multiview-processor",
      label: "Four-input multiview processor",
      mode: "video-wall",
      confidence: "verified",
      renderable: true,
      summary:
        "This processor combines several source feeds into one composed output. It is not an encoder, decoder or matrix output stage.",
      product: { tag: "MULTIVIEW", detail: "Four sources to one composed output" },
      source: {
        tag: "INPUTS",
        title: "Up to four source feeds",
        detail: "HDMI or governed NetworkHD-fed source paths",
      },
      output: {
        tag: "OUTPUT",
        title: "Single composed display feed",
        detail: "Display, recorder, streamer or LED processor input",
      },
      sourceEdge: { signal: "video", label: "Multiple source inputs" },
      outputEdge: { signal: "video", label: "Composed HDMI output" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "Layout control",
          detail: "Window layouts and source selection",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm source count and input format.",
        "Confirm required layout behaviour.",
        "Confirm the output device and resolution.",
      ],
      warnings: ["Do not present this as a full matrix or general AVoIP endpoint."],
      evidence: ["Governed NHD-0401-MV product story."],
    };
  }

  if (sku === "NHD-150-RX") {
    return {
      sku: product.sku,
      archetype: "avoip-multiview-decoder",
      label: "NetworkHD 100 multiview decoder",
      mode: "av-over-ip",
      confidence: "verified",
      renderable: true,
      summary:
        "This receives NetworkHD 100 streams and creates one multiview output.",
      product: { tag: "MV RX", detail: "100-series multiview receiver" },
      source: {
        tag: "NETWORK",
        title: "NetworkHD 100 streams",
        detail: "Encoded sources from compatible 100-series transmitters",
      },
      output: {
        tag: "DISPLAY",
        title: "Single multiview display",
        detail: "Composed output showing several streams",
      },
      sourceEdge: { signal: "network", label: "NetworkHD 100 streams" },
      outputEdge: { signal: "video", label: "Multiview display output" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "NHD-CTL-PRO-V2",
          detail: "Routing, presets and system control",
          signal: "control",
          label: "NetworkHD control",
        },
      ],
      checks: [
        "Keep the design within NetworkHD 100.",
        "Confirm encoder count, network switch and controller.",
        "Confirm multiview layout expectations.",
      ],
      warnings: ["Do not mix this into NetworkHD 500 or 600 endpoint designs."],
      evidence: ["Governed NHD-150-RX product story."],
    };
  }

  if (sku === "NHD-USB-TRX") {
    return {
      sku: product.sku,
      archetype: "usb-over-ip-transceiver",
      label: "USB-over-IP transceiver",
      mode: "usb",
      confidence: "verified",
      renderable: true,
      summary:
        "This transports USB over the network independently of the main video path.",
      product: { tag: "USB IP", detail: "USB-over-IP endpoint" },
      source: {
        tag: "USB",
        title: "USB host or peripheral",
        detail: "Operating mode determines host/device side",
      },
      output: {
        tag: "NETWORK",
        title: "USB transport network",
        detail: "Paired USB-over-IP endpoint required",
      },
      sourceEdge: { signal: "usb", label: "USB host/device connection" },
      outputEdge: { signal: "network", label: "USB over IP" },
      branches: [],
      checks: [
        "Confirm host and peripheral sides.",
        "Confirm USB standard, device bandwidth and paired endpoint.",
      ],
      warnings: ["Do not use this as a video encoder or decoder."],
      evidence: ["NHD USB transceiver family classification."],
    };
  }

  const role = endpointRole(product.sku);
  const series = sku.match(/^NHD-(1|4|5|6)/)?.[1];
  const networkLabel = series === "6" ? "10GbE AV network" : "1GbE AV network";
  const seriesLabel =
    series === "1"
      ? "NetworkHD 100"
      : series === "4"
        ? "NetworkHD 400"
        : series === "5"
          ? "NetworkHD 500"
          : series === "6"
            ? "NetworkHD 600"
            : "NetworkHD";

  if (role === "tx") {
    return {
      sku: product.sku,
      archetype: "avoip-encoder",
      label: `${seriesLabel} source-side encoder`,
      mode: "av-over-ip",
      confidence: "inferred",
      renderable: true,
      summary:
        "The encoder sits beside the source and puts that source onto the matching NetworkHD network.",
      product: { tag: "ENCODER", detail: product.productType || `${seriesLabel} transmitter` },
      source: {
        tag: "SOURCE",
        title: "HDMI / local source",
        detail: "Media player, laptop, camera or room source",
      },
      output: {
        tag: "NETWORK",
        title: networkLabel,
        detail: "Routes to compatible same-series decoders",
      },
      sourceEdge: { signal: "video", label: "Local source input" },
      outputEdge: { signal: "network", label: `${seriesLabel} encoded stream` },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "NHD-CTL-PRO-V2",
          detail: "Routing and system control",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm the NetworkHD series and matching decoder family.",
        "Confirm network switch suitability and controller.",
        "Confirm source format, USB and audio requirements.",
      ],
      warnings: ["Never pair 1GbE NetworkHD endpoints with NetworkHD 600 10GbE endpoints."],
      evidence: [`SKU direction identifies a ${seriesLabel} transmitter.`],
    };
  }

  if (role === "rx") {
    return {
      sku: product.sku,
      archetype: "avoip-decoder",
      label: `${seriesLabel} display-side decoder`,
      mode: "av-over-ip",
      confidence: "inferred",
      renderable: true,
      summary:
        "The decoder sits beside the display and takes a compatible same-series stream off the NetworkHD network.",
      product: { tag: "DECODER", detail: product.productType || `${seriesLabel} receiver` },
      source: {
        tag: "NETWORK",
        title: networkLabel,
        detail: "Compatible same-series encoded stream",
      },
      output: {
        tag: "DISPLAY",
        title: "Display / projector / processor",
        detail: "Local display-side video output",
      },
      sourceEdge: { signal: "network", label: `${seriesLabel} stream` },
      outputEdge: { signal: "video", label: "Local display output" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "NHD-CTL-PRO-V2",
          detail: "Routing and system control",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm the NetworkHD series and matching encoder family.",
        "Confirm network switch suitability and controller.",
        "Confirm display format, scaling, USB and audio requirements.",
      ],
      warnings: ["A decoder must not be shown as a source-side transmitter."],
      evidence: [`SKU direction identifies a ${seriesLabel} receiver.`],
    };
  }

  if (role === "trx") {
    return {
      sku: product.sku,
      archetype: "avoip-transceiver",
      label: `${seriesLabel} transceiver`,
      mode: "av-over-ip",
      confidence: "inferred",
      renderable: true,
      summary:
        "The transceiver can be configured at a source or display edge. The actual mode must be confirmed before a final schematic is issued.",
      product: { tag: "TRX", detail: product.productType || `${seriesLabel} transceiver` },
      source: {
        tag: "EDGE",
        title: "Source or display endpoint",
        detail: "Configured operating mode determines signal direction",
      },
      output: {
        tag: "NETWORK",
        title: networkLabel,
        detail: "Compatible same-series AV-over-IP system",
      },
      sourceEdge: { signal: "video", label: "Encode or decode edge" },
      outputEdge: { signal: "network", label: `${seriesLabel} network link` },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "NHD-CTL-PRO-V2",
          detail: "Routing and operating-mode control",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm whether this unit is configured as encoder or decoder.",
        "Confirm network class, optics/copper path and controller.",
      ],
      warnings: [
        "Do not draw a transceiver as simultaneously transmitting and receiving unless the product workflow explicitly supports it.",
      ],
      evidence: [`SKU direction identifies a ${seriesLabel} transceiver.`],
    };
  }

  return reviewProfile(
    product,
    narrative,
    `The NetworkHD family is recognised, but ${product.sku} is not classified as a governed encoder, decoder, transceiver, multiview device or USB endpoint.`,
  );
}

export function buildProductTopologyProfile(
  product: ProductSpec,
  narrative: ProductNarrative,
): ProductTopologyProfile {
  const sku = normaliseSku(product.sku);
  const text = productText(product);

  if (sku === "HALO-90") return halo90Profile(product);
  if (/^HALO-(30|60|80)$/.test(sku)) return speakerphoneProfile(product);
  if (/^(HALO-VX10|APO-VX20)/.test(sku) || /\bvideo[\s-]?bar\b/.test(text)) {
    return videoBarProfile(product);
  }
  if (sku === "APO-210-UC") return apo210Profile(product);
  if (sku === "APO-DG2") return apoDg2Profile(product);

  if (/^NHD-/.test(sku) || text.includes("networkhd")) {
    return networkHdProfile(product, narrative);
  }

  if (hasAny(text, [/\bmultiview\b/, /\bmulti-view\b/])) {
    return {
      sku: product.sku,
      archetype: "multiview-processor",
      label: "Multiview processor",
      mode: "video-wall",
      confidence: "inferred",
      renderable: true,
      summary: "Several sources are composed into one display output.",
      product: { tag: "MULTIVIEW", detail: product.productType || "Multiview processor" },
      source: {
        tag: "INPUTS",
        title: "Multiple source feeds",
        detail: "Independent video sources",
      },
      output: {
        tag: "OUTPUT",
        title: "Single composed output",
        detail: "Display, recorder, streamer or processor",
      },
      sourceEdge: { signal: "video", label: "Multiple source inputs" },
      outputEdge: { signal: "video", label: "Composed output" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "Layout control",
          detail: "Window layouts and source selection",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm source count and layout behaviour.",
        "Confirm output resolution and destination.",
      ],
      warnings: ["Do not represent a multiview processor as a full matrix."],
      evidence: ["Product name/type identifies multiview processing."],
    };
  }

  if (hasAny(text, [/\bvideo wall\b/, /\bvideowall\b/, /\bled wall\b/])) {
    return {
      sku: product.sku,
      archetype: "video-wall-processor",
      label: "Video-wall processor",
      mode: "video-wall",
      confidence: "inferred",
      renderable: true,
      summary:
        "The processor shapes one or more sources into the required wall outputs.",
      product: { tag: "WALL", detail: product.productType || "Video-wall processor" },
      source: {
        tag: "SOURCES",
        title: "Wall content sources",
        detail: "HDMI, signage or routed source feeds",
      },
      output: {
        tag: "WALL",
        title: "LCD wall / LED processor",
        detail: "Per-display feeds or one processor input",
      },
      sourceEdge: { signal: "video", label: "Source feeds" },
      outputEdge: { signal: "video", label: "Wall outputs" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "Layout control",
          detail: "Presets, layouts and source selection",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm LCD or LED wall type.",
        "Confirm wall layout, source behaviour and output count.",
      ],
      warnings: [],
      evidence: ["Product name/type identifies video-wall processing."],
    };
  }

  if (text.includes("matrix")) {
    return {
      sku: product.sku,
      archetype: "matrix-switcher",
      label: "Fixed-I/O matrix switcher",
      mode: "matrix",
      confidence: "inferred",
      renderable: true,
      summary:
        "The matrix routes several sources independently to several outputs. Mirrored or loop outputs must not be counted as additional routed zones.",
      product: { tag: "MATRIX", detail: product.productType || "Matrix switcher" },
      source: {
        tag: "INPUTS",
        title: "Several AV sources",
        detail: "Known source count and connector types",
      },
      output: {
        tag: "OUTPUTS",
        title: "Independent display zones",
        detail: "Routed outputs only; mirrors and loops shown separately",
      },
      sourceEdge: { signal: "video", label: "Matrix inputs" },
      outputEdge: { signal: "video", label: "Independent routed outputs" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "Control / presets",
          detail: "Keypad, API, app or third-party control",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm independent routed input/output count.",
        "Separate mirrored, loop and local monitor outputs.",
        "Confirm HDMI/HDBaseT transport, distance and scaling.",
      ],
      warnings: [],
      evidence: ["Product name/type identifies matrix routing."],
    };
  }

  if (
    hasAny(text, [
      /\bpresentation switcher\b/,
      /\bswitching transmitter\b/,
      /\bbyod\b/,
      /\bbyom\b/,
      /\bconference room switcher\b/,
    ])
  ) {
    return {
      sku: product.sku,
      archetype: "presentation-switcher",
      label: "Presentation / room-core switcher",
      mode: "uc-presentation",
      confidence: "inferred",
      renderable: true,
      summary:
        "The room core accepts local user sources and sends the selected presentation or conferencing path to the display.",
      product: { tag: "ROOM CORE", detail: product.productType || "Presentation switcher" },
      source: {
        tag: "USER",
        title: "Laptop / room sources",
        detail: "USB-C, HDMI, wireless or room PC as supported",
      },
      output: {
        tag: "DISPLAY",
        title: "Room display / projector",
        detail: "Local or extended display output",
      },
      sourceEdge: { signal: "video", label: "Presentation inputs" },
      outputEdge: { signal: "video", label: "Selected display output" },
      branches: [
        {
          slot: "bottom",
          tag: "USB",
          title: "Room USB devices",
          detail: "Camera, microphone, touch or speakerphone where supported",
          signal: "usb",
          label: "USB host/device path",
        },
      ],
      checks: [
        "Confirm input count and connector types.",
        "Confirm display outputs, distance and receiver dependencies.",
        "Confirm USB host ownership and peripheral requirements.",
      ],
      warnings: [],
      evidence: ["Product name/type identifies presentation switching."],
    };
  }

  if (
    /^CAM-/.test(sku) ||
    /^FOCUS-/.test(sku) ||
    hasAny(text, [/\bptz\b/, /\bwebcam\b/, /\bcamera bridge\b/, /\bmulti-camera\b/])
  ) {
    const bridge = hasAny(text, [/\bcamera bridge\b/, /\bmulti-camera\b/, /\bbrg\b/]);

    return {
      sku: product.sku,
      archetype: bridge ? "camera-bridge" : "room-camera",
      label: bridge ? "Camera bridge / mixer" : "Room camera",
      mode: "usb",
      confidence: "inferred",
      renderable: true,
      summary: bridge
        ? "The bridge combines or converts camera/source feeds for a conferencing, recording or streaming host."
        : "The camera captures the room and sends video to the conferencing, recording or network-video host.",
      product: {
        tag: bridge ? "CAM BRIDGE" : "CAMERA",
        detail: product.productType || (bridge ? "Camera bridge" : "Room camera"),
      },
      source: bridge
        ? {
            tag: "CAMERAS",
            title: "Camera / room source feeds",
            detail: "Multiple source inputs where supported",
          }
        : {
            tag: "ROOM",
            title: "Presenter / participants",
            detail: "Camera field of view and room coverage",
          },
      output: {
        tag: "HOST",
        title: "UC host / recorder / network",
        detail: "USB, HDMI or NDI output as supported",
      },
      sourceEdge: {
        signal: bridge ? "video" : "capture",
        label: bridge ? "Camera/source inputs" : "Captured room view",
      },
      outputEdge: {
        signal: bridge && text.includes("ndi") ? "network" : "usb",
        label: "USB / HDMI / NDI output",
      },
      branches: [],
      checks: [
        "Confirm camera location, field of view and mounting.",
        "Confirm USB/HDMI/NDI output path and cable distance.",
        "Confirm who controls presets or source switching.",
      ],
      warnings: [],
      evidence: ["Camera family and product-description classification."],
    };
  }

  if (
    /^AMP-/.test(sku) ||
    hasAny(text, [/\bamplifier\b/, /\bpower amplifier\b/, /\bspeaker output\b/])
  ) {
    const dante = text.includes("dante");

    return {
      sku: product.sku,
      archetype: dante ? "network-amplifier" : "amplifier",
      label: dante ? "Dante / network amplifier" : "Audio amplifier",
      mode: "generic",
      confidence: "inferred",
      renderable: true,
      summary:
        "The amplifier receives line-level or network audio and drives installed loudspeakers. This topology is only used for genuine amplifier products.",
      product: {
        tag: "AMPLIFIER",
        detail: product.productType || "Installed audio amplifier",
      },
      source: {
        tag: "AUDIO IN",
        title: dante ? "DSP / Dante / line audio" : "DSP / line-level audio",
        detail: "Processed programme and speech audio",
      },
      output: {
        tag: "SPEAKERS",
        title: "Installed loudspeakers",
        detail: "Speaker circuits sized to the amplifier and room",
      },
      sourceEdge: {
        signal: dante ? "network" : "audio",
        label: dante ? "Dante / line audio" : "Line audio",
      },
      outputEdge: { signal: "audio", label: "Amplified speaker output" },
      branches: [
        {
          slot: "top",
          tag: "CONTROL",
          title: "Audio control / DSP setup",
          detail: "Levels, presets and system integration",
          signal: "control",
          label: "Control",
        },
      ],
      checks: [
        "Confirm loudspeaker load, impedance and required power.",
        "Confirm DSP and Dante/network responsibility.",
        "Confirm tuning and control requirements.",
      ],
      warnings: [],
      evidence: ["Amplifier-specific product classification."],
    };
  }

  if (
    /^EX/.test(sku) ||
    /^TX-/.test(sku) ||
    /^RX/.test(sku) ||
    hasAny(text, [/\bhdbaset\b/, /\bextender\b/, /\bextension\b/])
  ) {
    const direction = endpointRole(product.sku);

    if (direction === "tx") {
      return {
        sku: product.sku,
        archetype: "extension-transmitter",
        label: "Source-side extension transmitter",
        mode: "extension",
        confidence: "inferred",
        renderable: true,
        summary:
          "The transmitter sits at the source and requires a compatible receiver at the destination end.",
        product: { tag: "TX", detail: product.productType || "Extension transmitter" },
        source: {
          tag: "SOURCE",
          title: "Local AV / USB source",
          detail: "Source-side device or wall-plate connection",
        },
        output: {
          tag: "LINK",
          title: "Installed cable to matching receiver",
          detail: "Category or fibre transport path",
        },
        sourceEdge: { signal: "video", label: "Local source input" },
        outputEdge: { signal: "network", label: "Extension transport" },
        branches: [],
        checks: [
          "Include a compatible receiver.",
          "Confirm distance, cable type, resolution, power and USB/control needs.",
        ],
        warnings: [
          "Do not draw a transmitter as directly feeding the display without its receive stage.",
        ],
        evidence: ["SKU direction identifies a transmitter."],
      };
    }

    if (direction === "rx") {
      return {
        sku: product.sku,
        archetype: "extension-receiver",
        label: "Display-side extension receiver",
        mode: "extension",
        confidence: "inferred",
        renderable: true,
        summary:
          "The receiver sits beside the display and requires a compatible transmitter at the source end.",
        product: { tag: "RX", detail: product.productType || "Extension receiver" },
        source: {
          tag: "LINK",
          title: "Installed cable from matching transmitter",
          detail: "Category or fibre transport path",
        },
        output: {
          tag: "DISPLAY",
          title: "Remote display / projector",
          detail: "Display-side AV and supported USB/control outputs",
        },
        sourceEdge: { signal: "network", label: "Extension transport" },
        outputEdge: { signal: "video", label: "Display output" },
        branches: [],
        checks: [
          "Include a compatible transmitter.",
          "Confirm distance, cable type, resolution, power and USB/control needs.",
        ],
        warnings: [
          "Do not draw a receiver as accepting a local source directly.",
        ],
        evidence: ["SKU direction identifies a receiver."],
      };
    }

    return {
      sku: product.sku,
      archetype: "extension-kit",
      label: "Point-to-point extender / kit",
      mode: "extension",
      confidence: "inferred",
      renderable: true,
      summary:
        "The source and display are linked by a transmitter/receiver pair over the installed cable path.",
      product: { tag: "EXTENDER", detail: product.productType || "Extension kit" },
      source: {
        tag: "SOURCE",
        title: "Local AV / USB source",
        detail: "Source-side connection to the transmitter",
      },
      output: {
        tag: "DISPLAY",
        title: "Remote display / projector",
        detail: "Destination-side output from the receiver",
      },
      sourceEdge: { signal: "video", label: "Source into transmitter" },
      outputEdge: { signal: "video", label: "Receiver to display" },
      branches: [
        {
          slot: "bottom",
          tag: "CABLE",
          title: "Installed category / fibre link",
          detail: "Distance-rated transport between TX and RX",
          signal: "network",
          label: "Extension transport",
        },
      ],
      checks: [
        "Confirm the kit includes both transmitter and receiver.",
        "Confirm distance, cable type, resolution, USB, control and power.",
      ],
      warnings: [],
      evidence: ["Extender-family product classification."],
    };
  }

  if (hasAny(text, [/\bwireless\b/, /\bairplay\b/, /\bmiracast\b/, /\bcasting\b/])) {
    return {
      sku: product.sku,
      archetype: "wireless-presentation",
      label: "Wireless presentation system",
      mode: "wireless",
      confidence: "inferred",
      renderable: true,
      summary:
        "The product receives a supported wireless share and sends it to the room display. Wireless presentation and wireless conferencing must be distinguished.",
      product: { tag: "CAST", detail: product.productType || "Wireless presentation host" },
      source: {
        tag: "USER",
        title: "Laptop / tablet / phone",
        detail: "Supported wireless sharing method",
      },
      output: {
        tag: "DISPLAY",
        title: "Room display / presentation system",
        detail: "Local presentation output",
      },
      sourceEdge: { signal: "network", label: "Wireless cast" },
      outputEdge: { signal: "video", label: "Display output" },
      branches: [
        {
          slot: "top",
          tag: "IT",
          title: "Network / wireless policy",
          detail: "Guest access, AirPlay, Miracast and security",
          signal: "network",
          label: "Network policy",
        },
      ],
      checks: [
        "Confirm presentation-only or full conferencing requirement.",
        "Confirm network and guest-access policy.",
        "Confirm wired fallback and compatible casting dongles.",
      ],
      warnings: [],
      evidence: ["Wireless presentation keywords in product record."],
    };
  }

  return reviewProfile(
    product,
    narrative,
    `No governed topology rule matched ${product.sku}. Wingman has deliberately withheld a connection diagram rather than inventing ports, signal direction or companion products.`,
  );
}

export default buildProductTopologyProfile;
