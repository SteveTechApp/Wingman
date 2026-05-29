import {
  classifyWingmanProduct,
  type WingmanProductClass,
  type WingmanProductLike,
} from "../lib/productClassification";

export type SalesAudience = "endUser" | "dealer" | "consultant" | "distributorSales";

export type ProductSalesKnowledgeProduct = WingmanProductLike & {
  title?: string;
  summary?: string;
  features?: string[];
  tags?: string[];
};

export type ProductDiagramNode = {
  label: string;
  title: string;
  detail: string;
  tone: "source" | "core" | "transport" | "display" | "usb" | "audio" | "control" | "other";
};

export type ProductCableLegend = {
  label: string;
  cable: string;
  note: string;
  tone: "video" | "network" | "usb" | "audio" | "control" | "other";
};

export type ProductSalesKnowledge = {
  productClass: WingmanProductClass | "default";
  plainEnglishName: string;
  whatItIs: string;
  whereItSits: string;
  howItWorks: string;
  specialFeatures: string[];
  worksWith: string[];
  commonUseCases: string[];
  discoveryQuestions: string[];
  doNotUseWhen: string[];
  pitch: Record<SalesAudience, string>;
  companionProducts: string[];
  byOthersChecklist: string[];
  diagram: {
    title: string;
    nodes: ProductDiagramNode[];
    cableLegend: ProductCableLegend[];
  };
};

export type ResolvedProductSalesKnowledge = ProductSalesKnowledge & {
  sku: string;
  productName: string;
  classLabel: string;
  featureHints: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function productName(product: ProductSalesKnowledgeProduct) {
  return clean(product.title || product.name || product.summary || product.sku || "WyreStorm product");
}

function commonCableLegend(): ProductCableLegend[] {
  return [
    {
      label: "Source to WyreStorm",
      cable: "HDMI, USB-C, network, camera or audio connection as required",
      note: "Confirm the actual source connector, content resolution, HDCP requirement and source location.",
      tone: "video",
    },
    {
      label: "WyreStorm to output",
      cable: "HDMI, HDBaseT, network decoder output, audio or USB path",
      note: "Confirm where the display, processor, DSP, USB device or endpoint is physically installed.",
      tone: "video",
    },
    {
      label: "Control / management",
      cable: "LAN, RS-232, IR, relay or third-party control path",
      note: "Confirm who operates the system and whether presets need to hide the engineering complexity.",
      tone: "control",
    },
  ];
}

function sourceNode(detail = "Laptop, room PC, signage player, media player, camera or local AV source."): ProductDiagramNode {
  return {
    label: "1",
    title: "Source side",
    detail,
    tone: "source",
  };
}

function displayNode(detail = "Room display, projector, LED processor, LCD wall, confidence monitor or output zone."): ProductDiagramNode {
  return {
    label: "4",
    title: "Display / output side",
    detail,
    tone: "display",
  };
}

const knowledgeByClass: Partial<Record<WingmanProductClass | "default", ProductSalesKnowledge>> = {
  "presentation-switcher": {
    productClass: "presentation-switcher",
    plainEnglishName: "Room presentation switcher",
    whatItIs:
      "A room presentation switcher is the local hub for a meeting room, classroom or training space. It lets the user connect room sources such as USB-C laptops, HDMI laptops, room PCs and sometimes wireless presentation, then sends the selected source to the room display or projector.",
    whereItSits:
      "Usually at the lectern, credenza, table box, rack or behind the front-of-room display. The correct location depends on where the laptop connects, where the display is mounted and where any USB camera, soundbar or touch display returns to the host.",
    howItWorks:
      "The switcher selects between local inputs, manages the output path to the display, and may also handle USB, scaling, MST dual-display, audio de-embedding or HDBaseT extension depending on the model.",
    specialFeatures: [
      "Can simplify a room where users bring laptops and expect one easy connection.",
      "Some models support USB-C, HDMI, dual display / MST, HDBaseT output, scaling or room-control handoff.",
      "Correct choice depends heavily on where the USB host and display are located.",
    ],
    worksWith: ["Room displays", "projectors", "USB cameras", "soundbars", "touch displays", "room PCs", "DSPs", "table boxes", "control systems"],
    commonUseCases: ["Meeting rooms", "classrooms", "training rooms", "boardrooms", "huddle rooms", "seminar rooms"],
    discoveryQuestions: [
      "Where will the user plug in: table, lectern, wall plate, floor box or display?",
      "Does the laptop need access to a USB camera, soundbar, speakerphone or touch display?",
      "Is this one display, dual display, MST or a display plus confidence monitor?",
      "Is wireless casting required as well as wired HDMI or USB-C?",
      "Is the equipment local to the room or does the display path need HDBaseT extension?",
    ],
    doNotUseWhen: [
      "Do not sell it as a matrix when several sources must route independently to several displays or rooms.",
      "Do not use it where only a point-to-point signal extension is required; that is normally an extender conversation.",
      "Do not assume USB follows video unless the product specifically supports the required USB topology.",
    ],
    pitch: {
      endUser:
        "This gives users one simple place to connect and present. They do not need to understand the AV system; they connect their laptop and the room display, camera and audio behave as expected.",
      dealer:
        "Treat this as the room input hub. Check table-to-display cable routes, USB host location, display count and whether the room needs wired, wireless or BYOD operation before choosing the model.",
      consultant:
        "Validate input count, output count, EDID, scaling, MST, USB speed, USB routing, HDBaseT path, control handoff and audio integration before specifying.",
      distributorSales:
        "This is a strong attach when the dealer is buying displays, UC bars or interactive panels. Ask where the laptop connects and whether the customer expects camera/audio to work from their own device.",
    },
    companionProducts: ["IDB-300 table box", "USB extenders", "HDBaseT receivers", "Apollo / UC products", "display control", "DSP by others"],
    byOthersChecklist: ["Display or projector", "mount", "USB camera or soundbar", "DSP/mics/speakers", "control panel", "table box", "rack/power/cabling"],
    diagram: {
      title: "Presentation switcher in a room",
      nodes: [
        sourceNode("USB-C laptop, HDMI laptop, room PC or wireless presentation source at the table or lectern."),
        {
          label: "2",
          title: "Presentation switcher",
          detail: "Selects the room source, may manage USB, scaling, MST, audio and display output.",
          tone: "core",
        },
        {
          label: "3",
          title: "Room connection path",
          detail: "Local HDMI, HDBaseT, USB return, audio handoff or control connection depending on room layout.",
          tone: "transport",
        },
        displayNode("Front-of-room display, projector, touch display, confidence monitor or dual-display pair."),
      ],
      cableLegend: [
        ...commonCableLegend(),
        {
          label: "USB return",
          cable: "USB-C, USB-A/B or USB extension",
          note: "Needed for BYOD, camera, speakerphone or interactive touch workflows.",
          tone: "usb",
        },
      ],
    },
  },

  "hdmi-switcher": {
    productClass: "hdmi-switcher",
    plainEnglishName: "HDMI switcher",
    whatItIs:
      "An HDMI switcher selects between multiple local HDMI sources and sends one selected source to a display or downstream AV device.",
    whereItSits:
      "Usually close to the display, source equipment, rack, lectern or furniture position where the sources are located.",
    howItWorks:
      "Several HDMI inputs feed the switcher. The selected input is sent to the output. Some models may include scaling, audio handling or control.",
    specialFeatures: ["Simpler than a matrix", "Useful when one display needs several local source options", "Often controlled by button, remote, serial or IP depending on model"],
    worksWith: ["HDMI laptops", "room PCs", "media players", "displays", "projectors", "control systems"],
    commonUseCases: ["Small meeting rooms", "training rooms", "reception displays", "local source selection"],
    discoveryQuestions: [
      "How many HDMI sources need to connect?",
      "Is there one display or more than one output?",
      "Is USB-C, wireless casting or USB required, or is this HDMI-only?",
      "How will the user select the source?",
    ],
    doNotUseWhen: [
      "Do not use as a distribution amplifier; a switcher selects one input rather than duplicating one source.",
      "Do not use as a matrix if different displays need different sources at the same time.",
    ],
    pitch: {
      endUser: "This gives the room a simple way to choose between several HDMI sources without swapping cables.",
      dealer: "Confirm source count, control method, output distance and whether the customer actually needs USB-C or presentation features instead.",
      consultant: "Validate input/output count, resolution, HDCP, EDID, control and whether scaling/audio handling is required.",
      distributorSales: "Use this when the customer says they keep swapping HDMI leads or need a simple source selector for one screen.",
    },
    companionProducts: ["HDMI cables", "HDBaseT extender if the display is remote", "control keypad or third-party control", "display by others"],
    byOthersChecklist: ["Display", "mount", "source devices", "control method", "rack/furniture position", "power"],
    diagram: {
      title: "HDMI switcher path",
      nodes: [
        sourceNode("Multiple local HDMI sources such as laptop, PC, media player or set-top box."),
        {
          label: "2",
          title: "HDMI switcher",
          detail: "Selects which HDMI source is sent to the output.",
          tone: "core",
        },
        displayNode("Single display, projector or downstream extension path."),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "matrix-switch": {
    productClass: "matrix-switch",
    plainEnglishName: "Matrix switch",
    whatItIs:
      "A matrix switch routes multiple sources to multiple displays. It is used when different screens, zones or rooms may need different source content at the same time.",
    whereItSits:
      "Normally in a rack, comms room, AV cupboard or central equipment location where sources and display cable routes can be managed.",
    howItWorks:
      "Each source connects to an input. Each display or zone connects to an output. The matrix decides which input is routed to each output.",
    specialFeatures: [
      "Correct choice for fixed multi-input / multi-output routing.",
      "Can support scaling, audio breakaway, HDBaseT outputs, seamless switching or control depending on model.",
      "More structured than an extender; less flexible than AVoIP for large expanding estates.",
    ],
    worksWith: ["Media players", "set-top boxes", "PCs", "displays", "projectors", "HDBaseT receivers", "control systems", "audio systems"],
    commonUseCases: ["Pubs and bars", "hospitality venues", "boardrooms", "training suites", "retail displays", "education spaces"],
    discoveryQuestions: [
      "How many sources and how many displays are needed now?",
      "Will different displays need different sources at the same time?",
      "Are the displays local HDMI or remote HDBaseT?",
      "Does audio follow video, break away by zone, or go to a separate DSP/PA?",
      "How will staff or users control presets?",
    ],
    doNotUseWhen: [
      "Do not use a splitter/distribution amplifier where the customer actually needs independent routing.",
      "Do not use a matrix for a single point-to-point extension job.",
      "Do not use a fixed matrix if the customer expects easy expansion across many rooms; consider AVoIP.",
    ],
    pitch: {
      endUser:
        "This lets the customer decide which source appears on each screen, so different areas can show different content without rewiring.",
      dealer:
        "Start by counting sources and screens. Then check distance, cable type, audio zoning and control presets before choosing the matrix size.",
      consultant:
        "Validate I/O, bandwidth, HDCP, EDID, scaling, output transport, audio handling, control protocol, failover and rack/cable topology.",
      distributorSales:
        "This is the conversation when a customer has several boxes and several screens. Ask: do all screens show the same thing, or does each screen need its own source?",
    },
    companionProducts: ["HDBaseT receivers", "control processor", "touch panel/keypad", "audio DSP/PA by others", "rack/power/cabling"],
    byOthersChecklist: ["Displays", "source devices", "audio system", "control UI", "rack", "power", "UPS", "cable containment"],
    diagram: {
      title: "Matrix routing system",
      nodes: [
        sourceNode("Several sources such as Sky/IPTV boxes, PCs, signage players or media players."),
        {
          label: "2",
          title: "Matrix switch",
          detail: "Routes any suitable source input to any suitable display or zone output.",
          tone: "core",
        },
        {
          label: "3",
          title: "Output transport",
          detail: "HDMI or HDBaseT output paths depending on distance and product model.",
          tone: "transport",
        },
        displayNode("Multiple displays or zones, each able to show the required routed source."),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "signal-extender-kit": {
    productClass: "signal-extender-kit",
    plainEnglishName: "Signal extender kit",
    whatItIs:
      "An extender kit moves a signal from one location to another, usually from a source position to a display position. It normally solves distance, not switching.",
    whereItSits:
      "One end sits near the source, the other near the display. The cable path between them is normally category cable, fibre or active optical HDMI depending on product type.",
    howItWorks:
      "The transmitter takes the source signal, sends it over the installed cable route, and the receiver rebuilds the signal at the display end.",
    specialFeatures: [
      "Use when HDMI distance is too long for a standard passive cable.",
      "Some models also carry USB, IR, RS-232, Ethernet or audio.",
      "Cable quality and installed route distance are critical.",
    ],
    worksWith: ["HDMI sources", "USB hosts", "displays", "projectors", "touch displays", "cameras", "control systems"],
    commonUseCases: ["Meeting rooms", "classrooms", "huddle rooms", "lecture rooms", "digital signage", "display extension"],
    discoveryQuestions: [
      "What is the real installed cable route length?",
      "What cable type is installed and is it certified?",
      "Is USB needed for camera, soundbar, touch or KVM?",
      "Is control needed: IR, RS-232 or IP?",
      "Is this one source to one display, or is switching/routing also required?",
    ],
    doNotUseWhen: [
      "Do not sell an extender kit as a switcher. It normally moves one signal from A to B.",
      "Do not use it to solve multi-source / multi-display routing.",
      "Do not ignore cable quality, patch panels and route length.",
    ],
    pitch: {
      endUser: "This lets the source equipment stay in the right place while the display can be installed where the room needs it.",
      dealer: "Treat this as a cable-route problem first. Confirm distance, cable, USB, control and resolution before selecting the extender.",
      consultant: "Validate transport class, bandwidth, HDCP, cable standard, USB speed, control channels, PoH/PoC and installed route quality.",
      distributorSales: "When the dealer says the HDMI lead is too long or unreliable, ask distance, cable type, resolution and whether USB needs to travel too.",
    },
    companionProducts: ["Table/lectern input plates", "USB extenders", "display mounts", "category cable by others", "control system"],
    byOthersChecklist: ["Source device", "display", "mount", "installed cable route", "patching", "power", "USB devices"],
    diagram: {
      title: "Point-to-point extension",
      nodes: [
        sourceNode("Laptop, room PC, signage player, camera or other local source."),
        {
          label: "2",
          title: "Transmitter side",
          detail: "Converts the local signal for the extension path.",
          tone: "core",
        },
        {
          label: "3",
          title: "Cable route",
          detail: "Category cable, fibre or active optical path across the installed route.",
          tone: "transport",
        },
        displayNode("Receiver side connects to the display, projector or endpoint device."),
      ],
      cableLegend: [
        ...commonCableLegend(),
        {
          label: "Extension cable",
          cable: "Cat cable, fibre or active optical HDMI",
          note: "Confirm installed length, termination quality, patching and whether USB/control are required.",
          tone: "network",
        },
      ],
    },
  },

  transmitter: {
    productClass: "transmitter",
    plainEnglishName: "Transmitter",
    whatItIs:
      "A transmitter is the source-side half of an extension system. It takes a local source signal and sends it to a receiver or compatible downstream device.",
    whereItSits: "At the source position: table, lectern, wall plate, rack, source shelf or local equipment area.",
    howItWorks: "It accepts the source connection and sends it over HDBaseT, network, fibre or another supported transport path.",
    specialFeatures: ["Source-side product", "Often paired with a matching receiver", "May include USB, control or audio depending on model"],
    worksWith: ["Receivers", "displays", "matrices", "USB devices", "control systems"],
    commonUseCases: ["Remote input points", "lecterns", "table inputs", "source-side extension"],
    discoveryQuestions: ["What source connects here?", "What receiver or matrix does it feed?", "What distance and cable type is required?", "Is USB/control/audio needed?"],
    doNotUseWhen: ["Do not sell a transmitter as a complete extender unless the receive side is included.", "Do not treat a transmitter as a switcher or display endpoint."],
    pitch: {
      endUser: "This is the source-side connection point that lets equipment be located away from the display.",
      dealer: "Confirm the matching receiver or compatible matrix input before quoting.",
      consultant: "Validate transmitter/receiver compatibility, cable path, bandwidth and auxiliary channels.",
      distributorSales: "Ask what it connects to at the far end; transmitter-only quotes often miss the receiver.",
    },
    companionProducts: ["Receiver", "matrix input", "category cable", "USB devices", "control system"],
    byOthersChecklist: ["Source", "rack/furniture", "cabling", "far-end receiver", "display"],
    diagram: {
      title: "Transmitter-side extension",
      nodes: [sourceNode(), { label: "2", title: "Transmitter", detail: "Source-side interface for the extension path.", tone: "core" }, { label: "3", title: "Cable path", detail: "HDBaseT, network, fibre or supported transport.", tone: "transport" }, displayNode("Receiver or compatible input at the far end.")],
      cableLegend: commonCableLegend(),
    },
  },

  receiver: {
    productClass: "receiver",
    plainEnglishName: "Receiver",
    whatItIs:
      "A receiver is the display-side half of an extension system. It rebuilds a transported signal and outputs it to the display or endpoint.",
    whereItSits: "Behind the display, above a projector, at a display wall, in a credenza, or at the far end of an extension path.",
    howItWorks: "It receives the transported signal from a transmitter, matrix or compatible source-side device and outputs to HDMI, USB, audio or control as supported.",
    specialFeatures: ["Display-side product", "Requires a compatible source-side device", "May support USB, control, audio or scaling depending on model"],
    worksWith: ["Transmitters", "matrix outputs", "displays", "projectors", "USB peripherals", "control systems"],
    commonUseCases: ["Remote displays", "projectors", "touch displays", "receiver-side extension"],
    discoveryQuestions: ["What source-side product feeds this receiver?", "What display input is required?", "Is USB/control/audio needed at the display end?", "How is the receiver powered?"],
    doNotUseWhen: ["Do not sell a receiver as a complete solution without the source-side product.", "Do not treat a receiver as an encoder or source device."],
    pitch: {
      endUser: "This is the display-side device that lets the screen be installed away from the source equipment.",
      dealer: "Check compatibility with the transmitter or matrix and make sure display-side power/mounting is planned.",
      consultant: "Validate transport compatibility, output format, EDID, control, USB and power method.",
      distributorSales: "Ask what is feeding it. Receiver-only conversations usually need a transmitter or matrix output too.",
    },
    companionProducts: ["Transmitter", "HDBaseT matrix", "display", "mount", "power"],
    byOthersChecklist: ["Display", "mount", "power", "installed cable", "source-side device"],
    diagram: {
      title: "Receiver-side extension",
      nodes: [sourceNode("Transmitter, matrix output or compatible source-side device."), { label: "2", title: "Cable path", detail: "HDBaseT, network, fibre or supported transport.", tone: "transport" }, { label: "3", title: "Receiver", detail: "Rebuilds the signal at the display side.", tone: "core" }, displayNode()],
      cableLegend: commonCableLegend(),
    },
  },

  "distribution-amplifier": {
    productClass: "distribution-amplifier",
    plainEnglishName: "Distribution amplifier / splitter",
    whatItIs:
      "A distribution amplifier, often called a splitter, takes one source and sends the same content to multiple outputs. It is not a matrix because it does not let each output choose a different source.",
    whereItSits: "Usually near the source equipment or rack where one signal needs to be duplicated to several displays.",
    howItWorks: "One input is copied to multiple outputs. All connected displays normally receive the same source signal.",
    specialFeatures: ["Simple way to duplicate one source", "Useful for signage, monitor feeds or repeat displays", "Should not be confused with matrix routing"],
    worksWith: ["One HDMI source", "multiple displays", "signage players", "confidence monitors", "preview displays"],
    commonUseCases: ["Retail signage", "reception screens", "training room repeater displays", "simple monitor duplication"],
    discoveryQuestions: ["Is every screen showing the same source?", "How many displays need the duplicated feed?", "Are the displays the same resolution?", "How far away are the displays?"],
    doNotUseWhen: [
      "Do not use where each display needs a different source.",
      "Do not use where the customer needs switching between several inputs.",
      "Do not describe it as a matrix.",
    ],
    pitch: {
      endUser: "This is the simple option when several screens all need to show the same thing.",
      dealer: "Confirm that all displays genuinely need identical content; otherwise move the conversation to matrix or AVoIP.",
      consultant: "Validate output count, resolution, EDID, HDCP, cable lengths and whether downstream extension is needed.",
      distributorSales: "If the customer says splitter, clarify whether they mean same image everywhere or independent routing.",
    },
    companionProducts: ["HDMI cables", "HDBaseT extenders for remote displays", "displays by others", "mounts by others"],
    byOthersChecklist: ["Displays", "mounts", "source device", "long cable paths", "power"],
    diagram: {
      title: "Distribution amplifier / splitter",
      nodes: [
        sourceNode("One source, such as signage player, PC or set-top box."),
        { label: "2", title: "Distribution amplifier", detail: "Duplicates the same source to multiple outputs.", tone: "core" },
        displayNode("Multiple displays showing the same content."),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "avoip-encoder": {
    productClass: "avoip-encoder",
    plainEnglishName: "AV-over-IP encoder",
    whatItIs:
      "An encoder is the source-side device in an AV-over-IP system. It converts a source signal into a network stream so it can be routed to decoders around the building.",
    whereItSits: "At the source, rack, lectern, media player, camera output or source equipment position.",
    howItWorks: "The source connects to the encoder. The encoder connects to the AV network. Decoders subscribe to that stream and output it to displays.",
    specialFeatures: ["Source-side AVoIP endpoint", "Supports flexible routing when paired with decoders and a controller", "Network design matters"],
    worksWith: ["NetworkHD controller", "managed network switch", "AVoIP decoders", "sources", "multiview processors"],
    commonUseCases: ["Campus AV", "hospitality", "retail signage", "education", "control rooms", "large venues"],
    discoveryQuestions: ["What source does this encode?", "How many displays need access to it?", "Is the AV network approved?", "Is latency/image quality critical?", "Is USB or Dante required?"],
    doNotUseWhen: ["Do not sell an encoder as a decoder.", "Do not quote AVoIP without checking the network switch and control layer.", "Do not use where a simple point-to-point extender is enough and budget is tight."],
    pitch: {
      endUser: "This puts a source onto the AV network so it can be shown wherever the system allows.",
      dealer: "Count sources separately from displays. Encoders live at sources; decoders live at displays.",
      consultant: "Validate codec family, latency, bandwidth, multicast, VLAN, control, USB, audio and switch specification.",
      distributorSales: "When the customer wants flexible routing or future expansion, ask how many sources and how many displays, then separate encoder and decoder counts.",
    },
    companionProducts: ["AVoIP decoder", "NetworkHD controller", "approved network switch", "decoders", "multiview", "control UI"],
    byOthersChecklist: ["Network switch", "VLAN/multicast setup", "source devices", "rack/power", "cabling"],
    diagram: {
      title: "AVoIP source-side encoder",
      nodes: [
        sourceNode("Source device such as PC, signage player, camera, IPTV box or presentation output."),
        { label: "2", title: "AV-over-IP encoder", detail: "Places the source onto the AV network.", tone: "core" },
        { label: "3", title: "Managed AV network", detail: "Switching, VLAN/multicast and control infrastructure.", tone: "transport" },
        displayNode("AVoIP decoder at each display or processing endpoint."),
      ],
      cableLegend: [
        ...commonCableLegend(),
        {
          label: "AV network",
          cable: "Category cable, fibre, 1G or 10G depending on NetworkHD family",
          note: "Confirm switch model, VLAN, multicast, bandwidth and commissioning access.",
          tone: "network",
        },
      ],
    },
  },

  "avoip-decoder": {
    productClass: "avoip-decoder",
    plainEnglishName: "AV-over-IP decoder",
    whatItIs:
      "A decoder is the display-side device in an AV-over-IP system. It receives a network AV stream and outputs it to a display, projector or processor.",
    whereItSits: "Behind the display, above a projector, in a rack feeding a processor, or wherever a network stream needs to become HDMI again.",
    howItWorks: "The decoder subscribes to the chosen encoder stream under controller command and outputs the selected content to the display.",
    specialFeatures: ["Display-side AVoIP endpoint", "Can support routed displays, video walls or source switching depending on the system", "Requires encoder/controller/network"],
    worksWith: ["AVoIP encoders", "NetworkHD controller", "managed switch", "displays", "video walls", "multiview systems"],
    commonUseCases: ["Distributed display systems", "hospitality venues", "education estates", "control rooms", "retail signage"],
    discoveryQuestions: ["Which display does this feed?", "What source streams must it access?", "Is video wall, multiview or USB required?", "Is the network approved?"],
    doNotUseWhen: ["Do not sell a decoder as an encoder.", "Do not quote decoder-only systems without source-side encoders and controller.", "Do not ignore network requirements."],
    pitch: {
      endUser: "This lets any approved networked source appear on the display without running every source cable to that screen.",
      dealer: "Decoders are counted by display/output position. Make sure source encoders, controller and switch are included.",
      consultant: "Validate endpoint family, stream compatibility, resolution, latency, wall/multiview mode, USB/audio and network design.",
      distributorSales: "Ask how many screens need to receive content; that usually gives the decoder count.",
    },
    companionProducts: ["AVoIP encoder", "NetworkHD controller", "managed switch", "display", "mount"],
    byOthersChecklist: ["Display", "mount", "network point", "PoE/power", "switch configuration"],
    diagram: {
      title: "AVoIP display-side decoder",
      nodes: [
        sourceNode("Encoder streams already available on the AV network."),
        { label: "2", title: "Managed AV network", detail: "Carries source streams and controller commands.", tone: "transport" },
        { label: "3", title: "AV-over-IP decoder", detail: "Receives the selected stream and outputs to the display.", tone: "core" },
        displayNode(),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "avoip-transceiver": {
    productClass: "avoip-transceiver",
    plainEnglishName: "AV-over-IP transceiver",
    whatItIs:
      "A transceiver can operate as part of a flexible AV-over-IP endpoint architecture, depending on model and configuration.",
    whereItSits: "At a source or display position depending on how the system is configured.",
    howItWorks: "It participates in the AV network as an endpoint and is controlled through the AV-over-IP platform.",
    specialFeatures: ["Flexible endpoint role", "Useful in routed AV systems", "Network design and configuration are critical"],
    worksWith: ["AV network", "controller", "sources", "displays", "switches"],
    commonUseCases: ["Large routed AV systems", "flexible venues", "control rooms", "education estates"],
    discoveryQuestions: ["Is this endpoint source-side or display-side?", "Which NetworkHD family is being used?", "What switch and network topology are approved?"],
    doNotUseWhen: ["Do not mix endpoint families without confirming compatibility.", "Do not quote without the controller and network design."],
    pitch: {
      endUser: "This gives the system flexible networked AV endpoints that can support routed source/display behaviour.",
      dealer: "Confirm endpoint role, switch specification and system family before quoting.",
      consultant: "Validate codec, bandwidth, latency, endpoint mode, control, multicast and network infrastructure.",
      distributorSales: "Ask whether each endpoint is at a source or display, then check the NetworkHD family.",
    },
    companionProducts: ["Controller", "network switch", "source/display devices", "control UI"],
    byOthersChecklist: ["Network switch", "VLAN", "rack", "power", "display/source devices"],
    diagram: {
      title: "AVoIP transceiver endpoint",
      nodes: [sourceNode("Source or display-side endpoint depending on configuration."), { label: "2", title: "Transceiver", detail: "Flexible AV-over-IP endpoint in the routed AV network.", tone: "core" }, { label: "3", title: "AV network", detail: "Managed switch and controller-defined routing.", tone: "transport" }, displayNode()],
      cableLegend: commonCableLegend(),
    },
  },

  "video-wall-processor": {
    productClass: "video-wall-processor",
    plainEnglishName: "Video wall processor",
    whatItIs:
      "A video wall processor takes one or more sources and creates the required output layout for a group of displays or an LED processor.",
    whereItSits: "Usually in the rack or near the wall processor/display infrastructure, between sources and the wall outputs.",
    howItWorks: "It processes the source image and maps it to the required display outputs, wall layout or processor input.",
    specialFeatures: ["Used when the wall needs layout/canvas processing", "Can be simpler than AVoIP for fixed LCD walls", "Wall behaviour must be defined before quoting"],
    worksWith: ["LCD video walls", "LED processors", "sources", "matrix systems", "AVoIP systems", "control systems"],
    commonUseCases: ["Retail feature walls", "lobbies", "control rooms", "venues", "hospitality feature displays"],
    discoveryQuestions: ["What is the wall layout: 2x2, 3x3, 4x4 or custom?", "Is it LCD or LED?", "Full canvas, per-display content or mixed layouts?", "How many sources are shown at once?", "Is flexible routing needed or fixed processing?"],
    doNotUseWhen: ["Do not assume AVoIP is always better for a video wall.", "Do not use a simple splitter where wall processing is required.", "Do not quote before confirming wall layout and source behaviour."],
    pitch: {
      endUser: "This makes the wall behave as one professional visual surface rather than a group of unrelated screens.",
      dealer: "Get wall size, source count, display model and required behaviour before choosing between processor and AVoIP.",
      consultant: "Validate canvas mapping, bezel compensation, output resolution, source windows, scaling, latency and control.",
      distributorSales: "When a customer says video wall, ask: one big image, different content per screen, or several sources on one wall?",
    },
    companionProducts: ["Matrix switch", "AVoIP endpoints", "control system", "displays/LED processor by others"],
    byOthersChecklist: ["Displays or LED processor", "mounting", "wall structure", "content source", "calibration", "control"],
    diagram: {
      title: "Dedicated video wall processing",
      nodes: [
        sourceNode("One or more wall sources such as PC, signage player, media player or matrix output."),
        { label: "2", title: "Video wall processor", detail: "Processes and maps source content to the wall outputs.", tone: "core" },
        { label: "3", title: "Wall output paths", detail: "HDMI outputs to displays or LED processor inputs.", tone: "transport" },
        displayNode("LCD wall, LED processor or feature display canvas."),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "multiview-processor": {
    productClass: "multiview-processor",
    plainEnglishName: "Multiview processor",
    whatItIs:
      "A multiview processor creates one output image made from multiple source windows. It is not the same as simply having multiple HDMI outputs.",
    whereItSits: "Usually between multiple sources/network streams and a single monitor, confidence display, operator display or preview screen.",
    howItWorks: "It combines several source views into one composed output so the user can see multiple feeds at the same time.",
    specialFeatures: ["Shows multiple sources on one screen", "Useful for monitoring and preview", "Must not be confused with multi-output routing"],
    worksWith: ["AVoIP systems", "matrix outputs", "operator monitors", "preview displays", "control rooms"],
    commonUseCases: ["Control rooms", "sports bars", "lecture capture", "operator preview", "source monitoring"],
    discoveryQuestions: ["How many source windows need to be visible at once?", "Is the output one monitor or a wall?", "Are layouts fixed or user-selectable?", "What resolution is required?"],
    doNotUseWhen: ["Do not use when the customer simply needs several independent display outputs.", "Do not call multi-output products multiview unless one output shows multiple sources."],
    pitch: {
      endUser: "This lets users see several important sources on one screen at the same time.",
      dealer: "Confirm number of windows, source types, layout presets and where the multiview output is displayed.",
      consultant: "Validate source count, output resolution, layout control, latency and system compatibility.",
      distributorSales: "Ask whether they need many screens or one screen showing many sources. That determines routing versus multiview.",
    },
    companionProducts: ["AVoIP endpoints", "matrix switch", "operator display", "control UI"],
    byOthersChecklist: ["Monitor/display", "mount", "control method", "source devices", "network or matrix feed"],
    diagram: {
      title: "Multiview on one output",
      nodes: [
        sourceNode("Several source feeds or network streams."),
        { label: "2", title: "Multiview processor", detail: "Combines sources into windows on one composed output.", tone: "core" },
        displayNode("Single monitor or display showing multiple source windows."),
      ],
      cableLegend: commonCableLegend(),
    },
  },

  "uc-room-core": {
    productClass: "uc-room-core",
    plainEnglishName: "Unified communications room core",
    whatItIs:
      "A UC room core brings camera, microphone, speaker and presentation functions together so a user can run a video meeting or share content easily.",
    whereItSits: "Usually at the front of the room, display position, credenza, table or meeting-room equipment location.",
    howItWorks: "It connects the room display, camera/audio functions and user device or room PC into a simpler meeting workflow.",
    specialFeatures: ["Supports meeting-room workflows", "May combine camera, speaker, microphone, presentation and wireless casting", "User experience matters more than raw routing"],
    worksWith: ["Displays", "laptops", "room PCs", "Teams/Zoom platforms", "USB peripherals", "microphones", "DSPs"],
    commonUseCases: ["Huddle rooms", "small meeting rooms", "hotel meeting rooms", "telemedicine rooms", "BYOD spaces"],
    discoveryQuestions: ["Is the host a laptop, room PC or Teams/Zoom appliance?", "Where are users seated?", "Is the room small enough for built-in camera/audio?", "Is wireless casting required?", "Does the customer have IT/security restrictions?"],
    doNotUseWhen: ["Do not use where the room needs complex multi-source routing.", "Do not assume it replaces a DSP in larger rooms.", "Do not ignore USB host location."],
    pitch: {
      endUser: "This makes the room easier to use for video meetings and presentation without asking users to understand the AV system.",
      dealer: "Confirm platform, laptop/room-PC workflow, display location, table size, camera view and audio coverage.",
      consultant: "Validate USB topology, camera field of view, audio pickup, platform compatibility, control and IT policy.",
      distributorSales: "This is a good attach to displays and meeting-room furniture. Ask whether users bring their own laptop or use a room PC.",
    },
    companionProducts: ["Display", "expansion microphone", "table box", "USB extender", "room PC by others"],
    byOthersChecklist: ["Display", "mount", "meeting platform", "room PC/laptop", "network", "table power", "acoustics"],
    diagram: {
      title: "UC room core",
      nodes: [
        sourceNode("Laptop, room PC or meeting appliance."),
        { label: "2", title: "UC room core", detail: "Handles camera, audio, presentation and meeting-room connection workflow.", tone: "core" },
        { label: "3", title: "USB / AV path", detail: "Carries camera, audio, video and presentation links.", tone: "usb" },
        displayNode("Room display, camera view, speaker/mic path and user-facing meeting output."),
      ],
      cableLegend: [
        ...commonCableLegend(),
        {
          label: "UC path",
          cable: "USB, HDMI, USB-C, LAN or wireless casting",
          note: "Confirm host device and approved meeting platform.",
          tone: "usb",
        },
      ],
    },
  },

  "wireless-presentation": {
    productClass: "wireless-presentation",
    plainEnglishName: "Wireless presentation system",
    whatItIs:
      "A wireless presentation system lets users share content without plugging in a video cable, typically using AirPlay, Miracast, app-based sharing or a wireless dongle workflow.",
    whereItSits: "Normally connected to the display or room presentation system, with network access validated by IT.",
    howItWorks: "The user's device sends content wirelessly to the receiver/system, which outputs to the display or room AV path.",
    specialFeatures: ["Reduces cable clutter", "Useful for guest presentation", "IT policy and network design are essential"],
    worksWith: ["Displays", "presentation switchers", "laptops", "mobile devices", "UC systems", "guest networks"],
    commonUseCases: ["Meeting rooms", "classrooms", "training rooms", "hospitality meeting rooms"],
    discoveryQuestions: ["Which devices need to cast?", "Is AirPlay/Miracast required?", "Is guest network access allowed?", "Is USB/BYOD required as well as content sharing?"],
    doNotUseWhen: ["Do not assume wireless is allowed on every corporate network.", "Do not use when guaranteed zero-latency video is required."],
    pitch: {
      endUser: "This lets people share content quickly without hunting for the right cable.",
      dealer: "Confirm the IT policy, guest access and whether wireless conferencing is needed, not just screen sharing.",
      consultant: "Validate protocols, network segmentation, security, latency, resolution and USB/BYOD requirements.",
      distributorSales: "Ask whether users currently struggle with cables or visitors need to present from their own device.",
    },
    companionProducts: ["Presentation switcher", "display", "network by others", "USB devices if BYOD"],
    byOthersChecklist: ["Network access", "display", "IT approval", "guest policy", "device support"],
    diagram: {
      title: "Wireless presentation in a room",
      nodes: [sourceNode("Laptop, tablet or phone using wireless sharing."), { label: "2", title: "Wireless presentation system", detail: "Receives the wireless share and outputs to the room AV path.", tone: "core" }, displayNode()],
      cableLegend: commonCableLegend(),
    },
  },

  camera: {
    productClass: "camera",
    plainEnglishName: "Camera",
    whatItIs:
      "A camera captures the room, presenter, audience or subject and feeds conferencing, recording, streaming or production systems.",
    whereItSits: "Mounted at the front of room, rear of room, ceiling, wall, lectern, stage or clinical/teaching position depending on the shot required.",
    howItWorks: "The camera outputs video over HDMI, USB, SDI, NDI or network depending on model and workflow.",
    specialFeatures: ["PTZ control may allow presets", "NDI models can enter network video workflows", "Field of view and mounting height are critical"],
    worksWith: ["Camera bridges", "UC systems", "recorders", "streaming encoders", "NetworkHD/NDI workflows", "control systems"],
    commonUseCases: ["Lecture capture", "hybrid meetings", "training", "telemedicine", "worship", "events"],
    discoveryQuestions: ["What must the camera see?", "Is this for conferencing, recording, streaming or observation?", "Who controls camera presets?", "What output format is required?", "Is privacy approval needed?"],
    doNotUseWhen: ["Do not choose camera location before confirming field of view.", "Do not assume USB is enough for long cable routes or production workflows."],
    pitch: {
      endUser: "This gives remote viewers or recording systems a clear view of the room or presenter.",
      dealer: "Confirm viewing angle, mounting, control, cable route, output format and platform before selecting the camera.",
      consultant: "Validate lens/FOV, PTZ control, output format, latency, power, mounting, privacy and network policy.",
      distributorSales: "Ask what the camera needs to show and where the video is going: Teams, Zoom, recorder, NDI, bridge or display.",
    },
    companionProducts: ["Camera bridge", "USB extender", "NDI bridge", "control panel", "capture/recording system by others"],
    byOthersChecklist: ["Mount", "cable path", "privacy signage", "recording platform", "network", "power"],
    diagram: {
      title: "Camera workflow",
      nodes: [sourceNode("Room or presenter view captured by the camera."), { label: "2", title: "Camera", detail: "Outputs video to conferencing, capture, bridge or network workflow.", tone: "core" }, { label: "3", title: "Video / control path", detail: "USB, HDMI, LAN, NDI or control connection.", tone: "transport" }, displayNode("Meeting platform, recorder, bridge, network stream or monitor.")],
      cableLegend: commonCableLegend(),
    },
  },

  "camera-bridge": {
    productClass: "camera-bridge",
    plainEnglishName: "Camera bridge / mixer",
    whatItIs:
      "A camera bridge takes one or more camera/source feeds and presents them to a conferencing, capture or streaming workflow in the required format.",
    whereItSits: "Usually in the rack, lectern, production position or near the room PC/USB host.",
    howItWorks: "Camera and source feeds connect into the bridge; the bridge outputs the selected/composed feed over USB, HDMI, NDI or network depending on model.",
    specialFeatures: ["Can simplify multi-camera rooms", "Useful when the meeting platform only accepts one USB video feed", "Camera/source count must be checked"],
    worksWith: ["PTZ cameras", "room PCs", "USB hosts", "recorders", "streaming systems", "NDI workflows"],
    commonUseCases: ["Training rooms", "lecture capture", "council rooms", "worship", "simulation labs"],
    discoveryQuestions: ["How many cameras?", "Does the platform need USB, HDMI or NDI?", "Is switching or composition required?", "Who controls the camera/source selection?"],
    doNotUseWhen: ["Do not use when one simple webcam already covers the room.", "Do not assume it solves audio; audio may still require DSP."],
    pitch: {
      endUser: "This lets a more capable camera setup behave like one manageable video source for meetings or recording.",
      dealer: "Confirm camera count, host platform, output type and control method.",
      consultant: "Validate source formats, output format, switching/composition, latency, control and USB/network topology.",
      distributorSales: "When the customer wants more than one camera into Teams/Zoom/recording, this is the bridge conversation.",
    },
    companionProducts: ["PTZ cameras", "USB extender", "room PC", "capture/recording platform", "control UI"],
    byOthersChecklist: ["Camera mounts", "network", "recording platform", "audio DSP", "operator control"],
    diagram: {
      title: "Camera bridge workflow",
      nodes: [sourceNode("Multiple cameras or video sources."), { label: "2", title: "Camera bridge", detail: "Selects, mixes or converts camera/source feeds for the platform.", tone: "core" }, { label: "3", title: "Output to host", detail: "USB, HDMI, NDI or network output.", tone: "transport" }, displayNode("Room PC, Teams/Zoom, recorder, streamer or preview monitor.")],
      cableLegend: commonCableLegend(),
    },
  },

  "audio-amplifier": {
    productClass: "audio-amplifier",
    plainEnglishName: "Audio amplifier",
    whatItIs: "An audio amplifier powers loudspeakers and may include network audio or control features depending on the model.",
    whereItSits: "Usually in the rack, ceiling service space, AV cupboard or local room equipment position.",
    howItWorks: "Audio signal enters the amplifier; the amplifier drives speaker outputs.",
    specialFeatures: ["Can support installed room audio", "Dante/network audio may simplify DSP integration", "Speaker load and room size matter"],
    worksWith: ["DSPs", "speakers", "Dante systems", "presentation switchers", "matrix/AVoIP systems"],
    commonUseCases: ["Classrooms", "meeting rooms", "training rooms", "hospitality", "retail audio"],
    discoveryQuestions: ["How many speakers?", "What speaker impedance/power is required?", "Is Dante required?", "Is DSP separate or built in?", "Where is the rack/power?"],
    doNotUseWhen: ["Do not quote without speaker count/load.", "Do not assume it replaces a DSP where microphones and echo cancellation are required."],
    pitch: {
      endUser: "This provides reliable installed-room sound rather than relying on display speakers.",
      dealer: "Confirm speaker count, power, DSP/audio source and rack location.",
      consultant: "Validate power, impedance, channel count, DSP, Dante, control and thermal/rack requirements.",
      distributorSales: "Ask whether the customer needs proper room audio, not just the TV speakers.",
    },
    companionProducts: ["DSP", "speakers", "Dante network", "microphones", "control system"],
    byOthersChecklist: ["Speakers", "speaker cable", "DSP", "microphones", "rack", "power"],
    diagram: {
      title: "Installed audio amplifier",
      nodes: [sourceNode("Audio source, DSP, Dante stream or AV system audio output."), { label: "2", title: "Audio amplifier", detail: "Amplifies audio for installed speakers.", tone: "audio" }, displayNode("Loudspeakers or room audio zones.")],
      cableLegend: commonCableLegend(),
    },
  },

  "audio-dsp": {
    productClass: "audio-dsp",
    plainEnglishName: "Audio DSP",
    whatItIs: "An audio DSP processes microphones, speakers, program audio, conferencing audio and room audio logic.",
    whereItSits: "Normally in the rack or AV cupboard with microphone, speaker and network audio cabling.",
    howItWorks: "Audio inputs feed the DSP; the DSP mixes, processes and routes audio to amplifiers, speakers, conferencing systems or network audio.",
    specialFeatures: ["Handles real audio system behaviour", "Important for conferencing, microphones and echo control", "Commissioning matters"],
    worksWith: ["Microphones", "amplifiers", "speakers", "Dante", "UC systems", "control"],
    commonUseCases: ["Boardrooms", "lecture rooms", "training rooms", "council rooms", "large meeting rooms"],
    discoveryQuestions: ["How many microphones?", "Is conferencing audio required?", "Is Dante needed?", "Who commissions DSP?", "How many speaker zones?"],
    doNotUseWhen: ["Do not treat a switcher audio output as a complete audio system.", "Do not ignore acoustic treatment and microphone placement."],
    pitch: {
      endUser: "This makes the room audio behave properly for speech, microphones and meetings.",
      dealer: "Confirm mic count, speaker zones, conferencing platform and commissioning scope.",
      consultant: "Validate AEC, routing, Dante, I/O, gain structure, control and commissioning ownership.",
      distributorSales: "When microphones or conferencing audio are involved, ask whether a DSP has been included.",
    },
    companionProducts: ["Microphones", "amplifier", "speakers", "UC system", "control UI"],
    byOthersChecklist: ["Mic cabling", "speaker cable", "commissioning", "acoustic treatment", "rack"],
    diagram: {
      title: "Audio DSP path",
      nodes: [sourceNode("Microphones, program audio, conferencing audio or Dante streams."), { label: "2", title: "Audio DSP", detail: "Processes and routes audio for the room.", tone: "audio" }, displayNode("Amplifier, speakers, conferencing platform or audio zones.")],
      cableLegend: commonCableLegend(),
    },
  },

  "control-interface": {
    productClass: "control-interface",
    plainEnglishName: "Control interface",
    whatItIs:
      "A control interface gives users or the AV system a way to trigger room actions such as source selection, display power, presets or device control.",
    whereItSits: "At the table, wall, lectern, rack or touch panel position depending on who operates the room.",
    howItWorks: "The control interface sends commands by IP, RS-232, IR, relay or a platform-specific control path.",
    specialFeatures: ["Turns technical routing into simple user actions", "Can reduce support calls", "Needs clear preset design"],
    worksWith: ["Displays", "switchers", "matrices", "AVoIP systems", "projectors", "relays", "third-party control"],
    commonUseCases: ["Meeting rooms", "classrooms", "hospitality venues", "training rooms"],
    discoveryQuestions: ["Who operates the system?", "What actions need one-button control?", "What devices need power/source/volume control?", "Is third-party control involved?"],
    doNotUseWhen: ["Do not add control without defining user presets.", "Do not assume every device supports the same control method."],
    pitch: {
      endUser: "This makes the room easier to operate by turning technical functions into simple buttons or presets.",
      dealer: "Define the user actions first, then map them to device control.",
      consultant: "Validate control protocols, command set, feedback, network access and commissioning responsibility.",
      distributorSales: "Ask how the user changes source, turns the display on and resets the room.",
    },
    companionProducts: ["Switchers", "matrices", "AVoIP controller", "displays", "projectors"],
    byOthersChecklist: ["Control programming", "network", "device command list", "user training"],
    diagram: {
      title: "Room control path",
      nodes: [sourceNode("User button press, touch action or preset request."), { label: "2", title: "Control interface", detail: "Turns user action into device commands.", tone: "control" }, { label: "3", title: "Controlled devices", detail: "Display, switcher, matrix, projector, relay or AVoIP preset.", tone: "core" }],
      cableLegend: commonCableLegend(),
    },
  },

  cable: {
    productClass: "cable",
    plainEnglishName: "Cable / active optical cable",
    whatItIs:
      "A cable is a signal path component, not a switching or processing product. It connects one device to another and should only appear when cabling is specifically being discussed.",
    whereItSits: "Between source and display, source and switcher, switcher and display, rack and display, or other device-to-device locations.",
    howItWorks: "It carries the supported signal over the rated distance and bandwidth.",
    specialFeatures: ["Some cables support longer HDMI runs", "Active optical cables can solve certain long direct HDMI routes", "Route length and bend radius matter"],
    worksWith: ["Sources", "displays", "switchers", "matrices", "processors", "extenders"],
    commonUseCases: ["Device interconnect", "direct display feed", "rack patching", "short local connections"],
    discoveryQuestions: ["What two devices are being connected?", "What is the cable length?", "What resolution/bandwidth is required?", "Is the route suitable for active optical cable?"],
    doNotUseWhen: ["Do not show cables as switchers, matrices or extenders.", "Do not use a cable result to answer a product-class selection unless cable was requested."],
    pitch: {
      endUser: "This is the physical link between two devices. It does not add switching, routing or processing.",
      dealer: "Confirm length, bandwidth, connector, route and installation method.",
      consultant: "Validate bandwidth, directionality, bend radius, pulling method, power requirements and serviceability.",
      distributorSales: "Only discuss cables once the active hardware path is understood.",
    },
    companionProducts: ["Active hardware", "displays", "sources", "mounts"],
    byOthersChecklist: ["Containment", "pulling route", "labour", "labelling", "spares"],
    diagram: {
      title: "Cable as point-to-point link",
      nodes: [sourceNode("Device A."), { label: "2", title: "Cable", detail: "Carries the signal only. No switching, routing or processing.", tone: "transport" }, displayNode("Device B.")],
      cableLegend: commonCableLegend(),
    },
  },

  accessory: {
    productClass: "accessory",
    plainEnglishName: "Accessory",
    whatItIs:
      "An accessory supports the main AV system but is not usually the core product that solves the signal path.",
    whereItSits: "Wherever the main product requires mounting, power, rack fitting, adaptation or installation support.",
    howItWorks: "It supports installation, physical fit, power or usability rather than defining the signal architecture.",
    specialFeatures: ["Useful as an attach item", "Should not replace the main product recommendation", "Often project-dependent"],
    worksWith: ["Main WyreStorm hardware", "racks", "mounts", "installation accessories"],
    commonUseCases: ["Mounting", "power", "adapters", "spares", "installation support"],
    discoveryQuestions: ["What main product does this support?", "Is it required for mounting, rack, power or installation?", "Is it optional or essential?"],
    doNotUseWhen: ["Do not show accessories as primary product recommendations.", "Do not let accessories appear unless requested or attached to a main product."],
    pitch: {
      endUser: "This supports the installation rather than being the main AV solution.",
      dealer: "Attach only after the main signal path is selected.",
      consultant: "Confirm compatibility, installation method and support role.",
      distributorSales: "Use accessories as follow-up checks, not as the first recommendation.",
    },
    companionProducts: ["Main hardware", "rack", "mounting", "power"],
    byOthersChecklist: ["Installation labour", "rack layout", "cable schedule", "labelling"],
    diagram: {
      title: "Accessory support role",
      nodes: [sourceNode("Main AV product or system."), { label: "2", title: "Accessory", detail: "Supports fit, mounting, power or installation.", tone: "other" }, displayNode("Complete installed system.")],
      cableLegend: commonCableLegend(),
    },
  },

  default: {
    productClass: "default",
    plainEnglishName: "WyreStorm AV product",
    whatItIs:
      "A professional AV building block. Confirm the product class before pitching so the user understands whether it is a switcher, extender, matrix, endpoint, processor, camera, audio device, cable or accessory.",
    whereItSits:
      "Its position depends on product class. Establish whether it belongs at the source, display, rack, network, table, lectern, front-of-room or control position.",
    howItWorks:
      "Use the product classification, connectors, I/O count and feature set to explain how it moves, switches, processes, controls or supports the signal path.",
    specialFeatures: ["Clarify product class first", "Confirm signal path", "Validate companion equipment"],
    worksWith: ["Sources", "displays", "network", "audio", "control", "installation infrastructure"],
    commonUseCases: ["Professional AV systems"],
    discoveryQuestions: ["What is the product class?", "Where does it sit?", "What connects to each side?", "What is the customer trying to achieve?"],
    doNotUseWhen: ["Do not pitch before confirming product role and system position."],
    pitch: {
      endUser: "This is part of the AV system. The benefit depends on where it sits and what signal problem it solves.",
      dealer: "Classify the product first, then confirm source side, output side and companion equipment.",
      consultant: "Validate I/O, signal format, transport, control, audio, USB and system topology.",
      distributorSales: "Ask what the customer needs the product to do before quoting a SKU.",
    },
    companionProducts: ["Displays", "sources", "mounts", "rack", "power", "cables", "control"],
    byOthersChecklist: ["Displays", "mounts", "source equipment", "cabling", "power", "installation labour"],
    diagram: {
      title: "Generic AV product position",
      nodes: [sourceNode(), { label: "2", title: "WyreStorm product", detail: "Switches, extends, processes, routes or supports the AV signal path.", tone: "core" }, displayNode()],
      cableLegend: commonCableLegend(),
    },
  },
};

function featureHints(product: ProductSalesKnowledgeProduct) {
  const profile = classifyWingmanProduct(product);
  const hints: string[] = [];

  if (profile.features.mst) hints.push("MST / dual-display capability should be explained as a specific meeting-room feature, not just another output.");
  if (profile.features.wirelessCasting) hints.push("Wireless casting is a user-experience feature; confirm AirPlay, Miracast, app or dongle workflow.");
  if (profile.features.multiview) hints.push("Multiview means multiple source windows on one output, not simply several outputs.");
  if (profile.features.videoWall) hints.push("Video wall processing needs wall size, layout and canvas behaviour before quoting.");
  if (profile.features.kvm) hints.push("KVM means USB/device control matters; confirm host and peripheral locations.");
  if (profile.features.usb3) hints.push("USB 3.x can matter for cameras and capture devices; check bandwidth before promising BYOD behaviour.");
  if (profile.features.usb2 && !profile.features.usb3) hints.push("USB 2.0 may be fine for HID and many conference devices, but validate camera bandwidth.");
  if (profile.features.dante) hints.push("Dante/AES67 should involve the audio/network stakeholder before the proposal is issued.");
  if (profile.features.audioDeEmbed) hints.push("Audio de-embedding can help feed DSP, PA or local amplification, but confirm whether audio follows video.");
  if (profile.features.ir || profile.features.rs232 || profile.features.ipControl) hints.push("Control features should be turned into user presets, not exposed as technical jargon.");

  return hints.slice(0, 5);
}

export function getProductSalesKnowledge(product: ProductSalesKnowledgeProduct): ResolvedProductSalesKnowledge {
  const profile = classifyWingmanProduct(product);
  const base = knowledgeByClass[profile.productClass] ?? knowledgeByClass.default!;

  return {
    ...base,
    sku: clean(product.sku),
    productName: productName(product),
    classLabel: profile.salesType,
    featureHints: featureHints(product),
  };
}

export function productSalesOneLine(product: ProductSalesKnowledgeProduct) {
  const knowledge = getProductSalesKnowledge(product);
  return `${knowledge.classLabel}: ${knowledge.whatItIs}`;
}