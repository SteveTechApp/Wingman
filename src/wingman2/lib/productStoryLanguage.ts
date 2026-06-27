export type ProductStory = {
  sku: string;
  family: string;
  productRole: string;
  whatItIs: string;
  problemSolved: string;
  whyUseful: string;
  applicationFit: string;
  keyFeatures: string[];
  technicalNotes: string[];
  validationQuestions: string[];
  quoteSafetyNotes: string[];
  salesTalkTrack: string;
};

type StoryInput = Partial<ProductStory> & {
  sku: string;
};

const PRODUCT_SKU_PATTERN =
  /\b(?:NHD|MX|SW|APO|SYN|CAM|CAB|CON|EXP|EXT|EX|TX|RX|USB|HDBT|HDMI)[A-Z0-9]*-[A-Z0-9-]+\b/i;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normaliseProductSku(value: string): string {
  return cleanText(value).toUpperCase();
}

function story(input: StoryInput): ProductStory {
  return {
    sku: normaliseProductSku(input.sku),
    family: input.family || "WyreStorm",
    productRole: input.productRole || "WyreStorm product",
    whatItIs: input.whatItIs || "A WyreStorm product used as part of an AV signal management system.",
    problemSolved:
      input.problemSolved ||
      "Helps solve a defined AV signal path requirement, but the exact application should be checked before quoting.",
    whyUseful:
      input.whyUseful ||
      "Useful when the product role matches the source, display, distance, control, USB, audio or network requirement.",
    applicationFit:
      input.applicationFit ||
      "Use where the application requirements match the product family and signal path.",
    keyFeatures: input.keyFeatures || [],
    technicalNotes: input.technicalNotes || [],
    validationQuestions: input.validationQuestions || [
      "What source and display count is required?",
      "What resolution and refresh rate must be supported?",
      "Are USB, audio, control or network requirements involved?",
    ],
    quoteSafetyNotes: input.quoteSafetyNotes || [
      "Confirm the current datasheet and required accessories before quoting.",
    ],
    salesTalkTrack:
      input.salesTalkTrack ||
      "Position this product by explaining the customer problem first, then the product role in the signal path.",
  };
}

const EXPLICIT_PRODUCT_STORIES: Record<string, ProductStory> = {
  "NHD-124-TX": story({
    sku: "NHD-124-TX",
    family: "NetworkHD 100",
    productRole: "NetworkHD 100 HDMI encoder / transmitter",
    whatItIs:
      "An HDMI encoder used to put a local HDMI source onto a NetworkHD 100 AV-over-IP system.",
    problemSolved:
      "Solves the problem of a source being locked to one display or one fixed matrix input. It allows that source to be routed across the network to one display, several displays or a wider distributed AV system.",
    whyUseful:
      "Useful when a customer needs flexible source routing without running a separate HDMI cable path from every source to every display.",
    applicationFit:
      "Good fit for hospitality, signage, education and multi-display systems where NetworkHD 100 is the correct architecture.",
    keyFeatures: [
      "NetworkHD 100 source-side endpoint",
      "HDMI source input into AV-over-IP",
      "Designed for flexible 4K distribution workflows",
      "Part of a controlled NetworkHD system",
    ],
    technicalNotes: [
      "Use with compatible NetworkHD 100 receivers/decoders.",
      "NetworkHD systems require the correct NetworkHD controller for routing and management.",
      "Confirm switch/network suitability, multicast handling and system design before quoting.",
    ],
    validationQuestions: [
      "How many HDMI sources need to be encoded?",
      "How many displays need access to each source?",
      "Is the network owned or approved for AV-over-IP traffic?",
      "Is multiview required, or simple one-source-per-display routing?",
    ],
    quoteSafetyNotes: [
      "Do not quote transmitters alone unless receiver count, controller and network requirements are confirmed.",
    ],
    salesTalkTrack:
      "Use the NHD-124-TX when the conversation moves from a simple HDMI feed to a flexible AV-over-IP system. It is the source-side device that lets the system distribute and route HDMI content over the network.",
  }),

  "NHD-120-RX": story({
    sku: "NHD-120-RX",
    family: "NetworkHD 100",
    productRole: "NetworkHD 100 HDMI decoder / receiver",
    whatItIs:
      "A display-side decoder that receives a NetworkHD 100 AV-over-IP stream and outputs it as HDMI to the display.",
    problemSolved:
      "Solves the display-end part of a distributed AV system by turning the network stream back into a usable HDMI signal.",
    whyUseful:
      "Useful where displays are spread around a venue and need to show content from central or remote HDMI sources.",
    applicationFit:
      "Good fit for hospitality, education, signage and distributed display systems using NetworkHD 100.",
    keyFeatures: [
      "NetworkHD 100 display-side endpoint",
      "Receives AV-over-IP content and outputs HDMI",
      "Supports flexible source-to-display routing within a NetworkHD 100 design",
    ],
    technicalNotes: [
      "Use with compatible NetworkHD 100 transmitters/encoders.",
      "Confirm controller and network design before quoting.",
    ],
    validationQuestions: [
      "How many displays require a receiver?",
      "Are any displays part of a video wall or multiview workflow?",
      "What resolution does each display need?",
    ],
    quoteSafetyNotes: [
      "Receiver quantity must match the display architecture, not just the number of rooms.",
    ],
    salesTalkTrack:
      "Explain this as the display-end box in a NetworkHD 100 system. The transmitter gets the source onto the network; the receiver gets it back out to the screen.",
  }),

  "NHD-150-RX": story({
    sku: "NHD-150-RX",
    family: "NetworkHD 100",
    productRole: "NetworkHD 100 multiview decoder",
    whatItIs:
      "A NetworkHD 100 receiver/decoder with multiview capability, used when one display needs to show more than one source at the same time.",
    problemSolved:
      "Solves the need for source monitoring or combined layouts on a single display without adding a separate external multiview processor.",
    whyUseful:
      "Useful for bars, control positions, monitoring screens, teaching spaces and operator displays where several sources need to be visible together.",
    applicationFit:
      "Best suited to NetworkHD 100 systems that need a cost-effective multiview display output as part of a wider AV-over-IP system.",
    keyFeatures: [
      "NetworkHD 100 multiview receiver/decoder role",
      "Displays multiple sources on one output canvas",
      "Useful for monitoring and mixed-source display layouts",
      "Works within a NetworkHD 100 system design",
    ],
    technicalNotes: [
      "Multiview means multiple source images shown simultaneously on one output canvas.",
      "Do not confuse multiview with simply having multiple HDMI outputs.",
      "Confirm supported layout requirements and source count before quoting.",
    ],
    validationQuestions: [
      "How many sources need to be visible at the same time?",
      "Is the output for monitoring, customer display, signage or operator use?",
      "Are fixed layouts acceptable or does the user need flexible layouts?",
    ],
    quoteSafetyNotes: [
      "Confirm exact multiview behaviour and supported layouts before final system design.",
    ],
    salesTalkTrack:
      "Position the NHD-150-RX when the customer says they need to see several sources on one screen. It is not just another receiver; it adds a specific multiview role inside the NetworkHD 100 architecture.",
  }),

  "NHD-128-NDI-BRG": story({
    sku: "NHD-128-NDI-BRG",
    family: "NetworkHD 100 / NDI bridge",
    productRole: "NDI bridge for NetworkHD 100 workflows",
    whatItIs:
      "A bridge product used to bring NDI-style source workflows into a NetworkHD 100 AV-over-IP environment.",
    problemSolved:
      "Solves the gap between camera/production-style IP video workflows and a NetworkHD distribution system.",
    whyUseful:
      "Useful when cameras, production sources, streaming feeds or monitoring outputs need to become part of a wider AV distribution workflow.",
    applicationFit:
      "Good fit for education, lecture capture, production-style rooms, houses of worship and event spaces where NDI and AV distribution overlap.",
    keyFeatures: [
      "Bridge role between NDI workflows and NetworkHD 100",
      "Useful for camera/source integration",
      "Supports mixed AV and production-style signal requirements",
    ],
    technicalNotes: [
      "Confirm whether the source workflow is NDI, H.265, HDMI, USB, streaming or recording.",
      "Confirm how the final output needs to be displayed or distributed.",
    ],
    validationQuestions: [
      "Is the camera/source output NDI, HDMI, USB or another format?",
      "Does the customer need HDMI output, NetworkHD distribution, streaming or recording?",
      "Is the network already handling NDI traffic?",
    ],
    quoteSafetyNotes: [
      "Do not assume every camera workflow is the same. Confirm source format and destination format.",
    ],
    salesTalkTrack:
      "Use this where the customer has camera or NDI content that needs to appear inside the AV distribution system rather than staying isolated on a production network.",
  }),

  "NHD-128-NDI-TRX": story({
    sku: "NHD-128-NDI-TRX",
    family: "NetworkHD 100 / NDI bridge",
    productRole: "NDI / H.265 transceiver bridge for NetworkHD 100 workflows",
    whatItIs:
      "A bridge point for bringing NDI or H.265 source workflows into NetworkHD 100-style AV distribution.",
    problemSolved:
      "Solves the problem of camera, streaming or production-style IP content needing to be displayed, monitored or distributed through an AV system.",
    whyUseful:
      "Useful when the project has both AV distribution needs and IP-camera or NDI-style workflow needs.",
    applicationFit:
      "Good fit for teaching, lecture capture, production support, event spaces and monitoring applications.",
    keyFeatures: [
      "NDI / H.265 bridge workflow",
      "Useful with NetworkHD 100 multiview and distribution designs",
      "Helps combine camera and data-source content into AV workflows",
    ],
    technicalNotes: [
      "Check the required source and destination formats.",
      "Confirm whether the intended output is HDMI, NetworkHD, NDI, streaming or recording.",
    ],
    validationQuestions: [
      "What camera or IP video format is being used?",
      "Is the output required on a local display, multiview display, stream, recording or AV-over-IP system?",
      "Who owns and manages the network?",
    ],
    quoteSafetyNotes: [
      "Treat this as a workflow bridge, not a generic receiver/transmitter replacement.",
    ],
    salesTalkTrack:
      "Position this when the customer’s requirement crosses between AV distribution and camera/IP video workflows. It helps make those two worlds work together.",
  }),

  "NHD-500-TX": story({
    sku: "NHD-500-TX",
    family: "NetworkHD 500",
    productRole: "NetworkHD 500 encoder / transmitter",
    whatItIs:
      "A premium NetworkHD 500 source-side encoder for higher-quality 4K AV-over-IP distribution.",
    problemSolved:
      "Solves the need to route higher-quality HDMI sources across a flexible AV-over-IP system where image quality, low latency and system performance matter.",
    whyUseful:
      "Useful where a basic low-bandwidth AV-over-IP approach is not enough for the room or application expectation.",
    applicationFit:
      "Good fit for higher education, professional meeting rooms, command spaces and higher-performance distributed AV systems.",
    keyFeatures: [
      "NetworkHD 500 source-side endpoint",
      "Premium 4K60 4:4:4 AV-over-IP family positioning",
      "Low-latency workflow relevance",
      "Useful where USB and professional audio workflows may matter",
    ],
    technicalNotes: [
      "Use only within a compatible NetworkHD 500 design.",
      "NetworkHD 100, 500 and 600 are separate system families and should not be treated as interchangeable endpoint ranges.",
      "Confirm USB, audio and control requirements before product selection.",
    ],
    validationQuestions: [
      "Is 4K60 4:4:4 required?",
      "Is USB transport required for conferencing, KVM or touch?",
      "Is Dante or professional audio integration required?",
      "Is the network designed and approved for this AV-over-IP system?",
    ],
    quoteSafetyNotes: [
      "Confirm encoder, decoder, controller, switch and USB/audio requirements together.",
    ],
    salesTalkTrack:
      "Use NetworkHD 500 when the conversation moves beyond basic distribution and the customer needs a more professional 1GbE AV-over-IP platform with stronger image quality and system capability.",
  }),

  "NHD-500-DNT-TX": story({
    sku: "NHD-500-DNT-TX",
    family: "NetworkHD 500",
    productRole: "NetworkHD 500 encoder with Dante-oriented audio workflow relevance",
    whatItIs:
      "A NetworkHD 500 transmitter for projects where HDMI video distribution and professional networked audio need to be considered together.",
    problemSolved:
      "Solves the common design problem where video is handled in one system and room audio is handled separately with no clear bridge between them.",
    whyUseful:
      "Useful in teaching rooms, divisible spaces, conferencing environments and professional AV systems where embedded HDMI audio and networked audio workflows affect the system design.",
    applicationFit:
      "Good fit where NetworkHD 500 is already the right video architecture and the project also has a meaningful audio-distribution or Dante-style requirement.",
    keyFeatures: [
      "NetworkHD 500 source-side endpoint",
      "Designed for professional AV-over-IP system design",
      "Relevant where video and networked audio workflows need coordination",
      "Useful for systems where audio is not just display-speaker audio",
    ],
    technicalNotes: [
      "Confirm exact Dante/audio workflow against the current datasheet before quoting.",
      "Check whether the audio need is embedded HDMI audio, de-embedded audio, DSP feed, Dante/network audio or room reinforcement.",
      "Confirm matching NetworkHD 500 receivers, controller and network design.",
    ],
    validationQuestions: [
      "Is the audio staying with the display or feeding a DSP/audio system?",
      "Is Dante specifically required or only useful as an option?",
      "Does the room need microphones, conferencing audio or programme audio?",
      "How many source-side audio feeds need to be handled?",
    ],
    quoteSafetyNotes: [
      "Do not sell the Dante/audio angle unless the project actually has an audio workflow that benefits from it.",
      "Confirm current datasheet details before quoting the audio feature set.",
    ],
    salesTalkTrack:
      "Position this when the project is not just about moving pictures. If the customer also needs professional audio handling, this gives the salesperson a stronger reason to discuss NetworkHD 500 rather than a simpler distribution product.",
  }),

  "NHD-500-RX": story({
    sku: "NHD-500-RX",
    family: "NetworkHD 500",
    productRole: "NetworkHD 500 decoder / receiver",
    whatItIs:
      "A display-side receiver for NetworkHD 500 systems, used to turn routed AV-over-IP content back into HDMI at the screen.",
    problemSolved:
      "Solves the display-end requirement in a higher-quality NetworkHD 500 distribution system.",
    whyUseful:
      "Useful when displays need access to premium NetworkHD 500 source streams with the right image quality and system performance.",
    applicationFit:
      "Good fit for teaching rooms, professional meeting rooms, distributed signage/control displays and higher-performance AV-over-IP deployments.",
    keyFeatures: [
      "NetworkHD 500 display-side endpoint",
      "Receives compatible NetworkHD 500 streams",
      "Part of premium 4K AV-over-IP system design",
    ],
    technicalNotes: [
      "Use with compatible NetworkHD 500 transmitters and controller.",
      "Confirm USB, audio, control and network switch requirements.",
    ],
    validationQuestions: [
      "How many displays need NetworkHD 500 decoding?",
      "Do any displays need USB return, touch, KVM or conferencing support?",
      "Is each display showing one source, a wall layout or monitored content?",
    ],
    quoteSafetyNotes: [
      "Receiver count must be based on the display architecture and user workflow.",
    ],
    salesTalkTrack:
      "Explain this as the display-end of NetworkHD 500. The transmitter puts content on the network; this device gets that content back out to the display.",
  }),

  "NHD-500-IW-TX": story({
    sku: "NHD-500-IW-TX",
    family: "NetworkHD 500",
    productRole: "NetworkHD 500 in-wall transmitter",
    whatItIs:
      "An in-wall source input point for NetworkHD 500 systems, designed for clean room-facing installation.",
    problemSolved:
      "Solves the problem of needing a professional wall, lectern or local input position without leaving a loose box or exposed source connection in the room.",
    whyUseful:
      "Useful in classrooms, meeting rooms and presentation spaces where source inputs need to be accessible but tidy.",
    applicationFit:
      "Good fit for user-facing input points in teaching spaces, boardrooms, meeting rooms and presentation areas using NetworkHD 500.",
    keyFeatures: [
      "NetworkHD 500 source-side input point",
      "In-wall form factor",
      "Useful for clean user-facing installation",
      "Supports source input as part of a wider AV-over-IP system",
    ],
    technicalNotes: [
      "Confirm back-box, cable path and installation requirements.",
      "Confirm matching NetworkHD 500 receiver/controller/network design.",
    ],
    validationQuestions: [
      "Where does the user plug in?",
      "Is the input position wall-mounted, lectern-mounted or rack-mounted?",
      "Does the input need USB-C, HDMI, USB or audio support?",
    ],
    quoteSafetyNotes: [
      "Confirm physical installation requirements as well as AV signal requirements.",
    ],
    salesTalkTrack:
      "Use this when the room needs a polished input position. It is not just a transmitter; it is the user-facing connection point for a NetworkHD 500 room.",
  }),

  "NHD-CTL-PRO": story({
    sku: "NHD-CTL-PRO",
    family: "NetworkHD control",
    productRole: "NetworkHD system controller",
    whatItIs:
      "The controller used to manage and route compatible NetworkHD AV-over-IP systems.",
    problemSolved:
      "Solves the control and routing layer of a NetworkHD system. Without the controller, the endpoints are not a complete managed AV-over-IP solution.",
    whyUseful:
      "Useful because it turns a collection of transmitters and receivers into a controllable system.",
    applicationFit:
      "Required or expected in NetworkHD system designs where routing, management and control are needed.",
    keyFeatures: [
      "NetworkHD system control role",
      "Routing and management layer",
      "Core system component rather than a decorative accessory",
    ],
    technicalNotes: [
      "Confirm controller model suitability for the selected NetworkHD family and system size.",
      "Confirm third-party control or user interface requirements.",
    ],
    validationQuestions: [
      "Which NetworkHD family is being used?",
      "How many endpoints are in the system?",
      "How will the user control routing?",
      "Is third-party control involved?",
    ],
    quoteSafetyNotes: [
      "Do not treat the NetworkHD controller as optional unless the system design explicitly supports that.",
    ],
    salesTalkTrack:
      "Position this as the system brain. Transmitters and receivers move the AV signals; the controller lets the system behave like a usable routed AV platform.",
  }),

  "NHD-CTL-PRO-V2": story({
    sku: "NHD-CTL-PRO-V2",
    family: "NetworkHD control",
    productRole: "NetworkHD system controller",
    whatItIs:
      "The controller used to manage and route compatible NetworkHD AV-over-IP systems.",
    problemSolved:
      "Solves the control and routing layer of a NetworkHD system. Without the controller, the endpoints are not a complete managed AV-over-IP solution.",
    whyUseful:
      "Useful because it turns a collection of transmitters and receivers into a controllable system.",
    applicationFit:
      "Required or expected in NetworkHD system designs where routing, management and control are needed.",
    keyFeatures: [
      "NetworkHD system control role",
      "Routing and management layer",
      "Core system component rather than a decorative accessory",
    ],
    technicalNotes: [
      "Confirm controller model suitability for the selected NetworkHD family and system size.",
      "Confirm third-party control or user interface requirements.",
    ],
    validationQuestions: [
      "Which NetworkHD family is being used?",
      "How many endpoints are in the system?",
      "How will the user control routing?",
      "Is third-party control involved?",
    ],
    quoteSafetyNotes: [
      "Do not treat the NetworkHD controller as optional unless the system design explicitly supports that.",
    ],
    salesTalkTrack:
      "Position this as the system brain. Transmitters and receivers move the AV signals; the controller lets the system behave like a usable routed AV platform.",
  }),

  "NHD-600-TRX": story({
    sku: "NHD-600-TRX",
    family: "NetworkHD 600",
    productRole: "NetworkHD 600 10G transceiver endpoint",
    whatItIs:
      "A high-performance 10G NetworkHD 600 endpoint used in lossless, zero-latency AV-over-IP designs.",
    problemSolved:
      "Solves demanding AV-over-IP requirements where image quality, timing and latency are more important than lowest-cost distribution.",
    whyUseful:
      "Useful when a customer needs the highest-performance NetworkHD architecture, especially where visual quality and responsiveness are critical.",
    applicationFit:
      "Good fit for premium collaboration, control, medical, command, higher-performance display, production and mission-critical AV environments where 10G infrastructure is justified.",
    keyFeatures: [
      "NetworkHD 600 10G endpoint",
      "Transceiver role within the system architecture",
      "Lossless / zero-latency family positioning",
      "Suitable where performance is the main driver",
    ],
    technicalNotes: [
      "Requires correct 10G network design and compatible switching.",
      "Do not mix NetworkHD 600 endpoints with 100 or 500 series endpoints as if they are interchangeable.",
      "Confirm encoder/decoder role, endpoint count, optics/cabling and switch requirements before quoting.",
    ],
    validationQuestions: [
      "Is zero-latency or lossless performance genuinely required?",
      "Is 10G switching available and approved?",
      "How many endpoints are needed?",
      "Are there distance, fibre or rack-location requirements?",
    ],
    quoteSafetyNotes: [
      "Confirm network infrastructure and system architecture before presenting this as a quote-ready design.",
    ],
    salesTalkTrack:
      "Use NetworkHD 600 when the customer cannot compromise on quality or latency. It is the performance-led AVoIP option, not the cost-led option.",
  }),

  "NHD-0401-MV": story({
    sku: "NHD-0401-MV",
    family: "Multiview / NetworkHD workflow support",
    productRole: "Four-input multiview processor",
    whatItIs:
      "A four-input multiview processor used to show multiple sources together on one output canvas.",
    problemSolved:
      "Solves the need to combine several HDMI/source views into one display output for monitoring, presentation or processor-feed workflows.",
    whyUseful:
      "Useful when the customer wants one screen to show several sources at once, or when a combined output needs to feed another device such as an LED processor.",
    applicationFit:
      "Good fit for monitoring displays, operator positions, presentation confidence screens, control rooms and LED/processor feed workflows.",
    keyFeatures: [
      "Four-input multiview role",
      "Single output canvas",
      "Useful alongside NetworkHD 500 discussions and standalone multiview needs",
      "Supports source-combination workflows rather than simple switching only",
    ],
    technicalNotes: [
      "Multiview means multiple sources visible simultaneously on one output canvas.",
      "Confirm source count, layout expectations and output destination.",
      "Do not confuse this product with a simple multi-output switcher.",
    ],
    validationQuestions: [
      "How many sources need to appear together?",
      "Is the output going to a display, capture device or LED processor?",
      "Are fixed layouts acceptable?",
      "Does the user need switching, multiview or both?",
    ],
    quoteSafetyNotes: [
      "Confirm required multiview layout and output format before quoting.",
    ],
    salesTalkTrack:
      "Position this when the customer needs to see or present several sources together. It gives the salesperson a simple way to explain multiview without confusing it with matrix switching.",
  }),
};

function inferNetworkHdStory(sku: string): ProductStory | null {
  if (!sku.startsWith("NHD-")) {
    return null;
  }

  if (sku.includes("600")) {
    return story({
      sku,
      family: "NetworkHD 600",
      productRole: "High-performance 10G NetworkHD endpoint or accessory",
      whatItIs:
        "A NetworkHD 600 product used in high-performance 10G AV-over-IP system designs.",
      problemSolved:
        "Solves demanding AV-over-IP requirements where lossless quality, zero-latency behaviour or premium transport performance is required.",
      whyUseful:
        "Useful when the customer needs the performance benefits of NetworkHD 600 rather than a lower-cost or lower-bandwidth AV-over-IP architecture.",
      applicationFit:
        "Best suited to premium AV-over-IP applications where 10G infrastructure, image quality and latency matter.",
      keyFeatures: [
        "NetworkHD 600 family role",
        "10G AV-over-IP architecture",
        "Performance-led positioning",
      ],
      technicalNotes: [
        "Confirm exact endpoint/accessory role from the datasheet.",
        "Confirm 10G switch, fibre/copper, controller and endpoint requirements.",
      ],
      validationQuestions: [
        "Is the project driven by latency, image quality or network performance?",
        "Is 10G infrastructure available?",
        "How many endpoints are required?",
      ],
      quoteSafetyNotes: [
        "Do not quote NetworkHD 600 until the network design and endpoint roles are confirmed.",
      ],
      salesTalkTrack:
        "Explain NetworkHD 600 as the performance-led AVoIP family. Use it where quality and latency justify the 10G architecture.",
    });
  }

  if (sku.includes("500")) {
    return story({
      sku,
      family: "NetworkHD 500",
      productRole: "Premium NetworkHD 500 AV-over-IP component",
      whatItIs:
        "A NetworkHD 500 product used in premium 1GbE AV-over-IP systems where image quality, low latency and professional AV workflows matter.",
      problemSolved:
        "Solves flexible routing requirements where a simple HDMI matrix or basic AV-over-IP system is not the right fit.",
      whyUseful:
        "Useful when the customer needs stronger 4K system capability, USB workflow relevance or professional AV integration.",
      applicationFit:
        "Good fit for higher education, meeting rooms, professional AV spaces and more demanding distributed AV systems.",
      keyFeatures: [
        "NetworkHD 500 family role",
        "Premium 4K AV-over-IP positioning",
        "Low-latency workflow relevance",
        "Useful where USB/audio/control requirements may matter",
      ],
      technicalNotes: [
        "Confirm the exact SKU role: transmitter, receiver, in-wall input, audio variant, USB or accessory.",
        "NetworkHD 500 endpoints must be designed as a compatible system.",
      ],
      validationQuestions: [
        "Is 4K60 4:4:4 required?",
        "Is USB transport required?",
        "Is Dante or professional audio relevant?",
        "What controller and switch design is being used?",
      ],
      quoteSafetyNotes: [
        "Confirm endpoint role, controller and network design before quoting.",
      ],
      salesTalkTrack:
        "Use NetworkHD 500 when the project needs more than basic distribution. It is the stronger professional AVoIP conversation.",
    });
  }

  if (sku.includes("150")) {
    return EXPLICIT_PRODUCT_STORIES["NHD-150-RX"];
  }

  return story({
    sku,
    family: "NetworkHD 100",
    productRole: "Cost-effective NetworkHD 100 AV-over-IP component",
    whatItIs:
      "A NetworkHD 100 product used in cost-effective, low-bandwidth AV-over-IP distribution systems.",
    problemSolved:
      "Solves the need to distribute and route AV sources flexibly where a fixed matrix or point-to-point extender design becomes limiting.",
    whyUseful:
      "Useful for multi-display systems where expansion, flexible routing and practical cost control matter.",
    applicationFit:
      "Good fit for hospitality, signage, education and distributed AV systems where NetworkHD 100 is the right performance level.",
    keyFeatures: [
      "NetworkHD 100 family role",
      "Cost-effective AV-over-IP positioning",
      "Useful for flexible 4K distribution",
      "Suitable for scalable source/display routing",
    ],
    technicalNotes: [
      "Confirm exact SKU role: transmitter, receiver, multiview, bridge or accessory.",
      "NetworkHD systems require correct controller and network design.",
    ],
    validationQuestions: [
      "How many sources and displays are required?",
      "Is multiview needed?",
      "Does the network support AV-over-IP requirements?",
      "Is this a fixed system or likely to expand?",
    ],
    quoteSafetyNotes: [
      "Confirm transmitters, receivers, controller and network requirements before quoting.",
    ],
    salesTalkTrack:
      "Position NetworkHD 100 as the practical AVoIP choice when the customer needs flexible distribution without jumping straight to the highest-performance platform.",
  });
}

function inferMatrixStory(sku: string): ProductStory | null {
  if (!sku.startsWith("MX-")) {
    return null;
  }

  return story({
    sku,
    family: "Matrix switching",
    productRole: "Fixed I/O matrix switching product",
    whatItIs:
      "A matrix switching product used when several sources need to be routed to several displays in a defined local or building system.",
    problemSolved:
      "Solves the problem of needing controlled source-to-display routing without necessarily moving to a full AV-over-IP architecture.",
    whyUseful:
      "Useful when the source and display count is known, the system is relatively fixed, and a matrix is simpler or better value than AV-over-IP.",
    applicationFit:
      "Good fit for boardrooms, teaching rooms, hospitality zones, smaller multi-display systems and contained installations.",
    keyFeatures: [
      "Fixed source/display routing",
      "Simpler architecture than AVoIP where I/O is known",
      "Useful for local switching and routed AV systems",
    ],
    technicalNotes: [
      "Check routed outputs separately from mirrored, loop, local monitor or auxiliary outputs.",
      "Confirm whether scaling, HDBaseT, audio, USB, control or multiview is required.",
    ],
    validationQuestions: [
      "How many independent sources and independent display outputs are required?",
      "Are any HDMI outputs mirrored rather than routed?",
      "Are HDBaseT receivers included or required?",
      "Is the system likely to expand beyond the matrix size?",
    ],
    quoteSafetyNotes: [
      "Do not count mirrored outputs as independent matrix outputs.",
    ],
    salesTalkTrack:
      "Use a matrix when the customer needs controlled routing but not the complexity of a full networked AV system.",
  });
}

function inferSwitcherStory(sku: string): ProductStory | null {
  if (!sku.startsWith("SW-")) {
    return null;
  }

  if (sku.includes("VW")) {
    return story({
      sku,
      family: "Video wall processing",
      productRole: "Dedicated video wall processor",
      whatItIs:
        "A dedicated processor used where displays need to operate as a video wall or where one processed output workflow is required.",
      problemSolved:
        "Solves video wall processing without automatically needing a full AV-over-IP wall architecture.",
      whyUseful:
        "Useful when the customer needs a specific wall behaviour, preset wall processing or a processor feed rather than full many-to-many AV routing.",
      applicationFit:
        "Good fit for LCD wall processing, display wall workflows and LED/processor feed conversations where a dedicated processor is simpler.",
      keyFeatures: [
        "Dedicated video wall processing role",
        "Alternative to AVoIP wall design where appropriate",
        "Useful where wall behaviour matters more than full routing flexibility",
      ],
      technicalNotes: [
        "Confirm wall layout, source count and whether the wall is LCD or LED.",
        "For LED, confirm the Novastar or LED processor input requirement.",
      ],
      validationQuestions: [
        "Is the wall LCD or LED?",
        "Is the requirement full canvas, preset layouts, signage, multiview or per-display content?",
        "How many sources need to feed the wall?",
      ],
      quoteSafetyNotes: [
        "Do not assume AV-over-IP is the best video wall answer until the wall behaviour is confirmed.",
      ],
      salesTalkTrack:
        "Position this when the customer needs wall processing, not necessarily a whole networked AV system.",
    });
  }

  return story({
    sku,
    family: "Presentation switching",
    productRole: "Presentation switcher / room input product",
    whatItIs:
      "A switching product used to manage local room inputs such as HDMI, USB-C, wireless presentation or meeting-room sources.",
    problemSolved:
      "Solves the room-level problem of users needing a simple way to connect, present and route content without a complex rack-based system.",
    whyUseful:
      "Useful in meeting rooms and classrooms where ease of use, local input access and conferencing/presentation workflows matter.",
    applicationFit:
      "Good fit for classrooms, huddle rooms, meeting spaces, training rooms and local presentation systems.",
    keyFeatures: [
      "Room-level source switching",
      "Useful for presentation and collaboration workflows",
      "Can reduce user confusion at the table or lectern",
    ],
    technicalNotes: [
      "Confirm HDMI, USB-C, wireless, USB device and audio requirements.",
      "Check whether the room is presentation-only, BYOD or BYOM.",
    ],
    validationQuestions: [
      "What devices do users bring into the room?",
      "Is conferencing required or just presentation?",
      "Are cameras, microphones, speakerphones or touch displays involved?",
    ],
    quoteSafetyNotes: [
      "Do not recommend presentation switching alone where USB/camera/microphone transport is required but unconfirmed.",
    ],
    salesTalkTrack:
      "Position this around the user experience: how people enter the room, connect their device and start presenting or meeting.",
  });
}

function inferApoStory(sku: string): ProductStory | null {
  if (!sku.startsWith("APO-")) {
    return null;
  }

  return story({
    sku,
    family: "Apollo / UC and collaboration",
    productRole: "UC, BYOD or collaboration product",
    whatItIs:
      "A collaboration product used to support meeting-room presentation, conferencing, audio/video or BYOD workflows.",
    problemSolved:
      "Solves the meeting-room problem of users needing simple connection, camera/audio access or wireless presentation without complicated room operation.",
    whyUseful:
      "Useful where the customer cares more about the meeting experience than traditional AV routing.",
    applicationFit:
      "Good fit for huddle rooms, meeting rooms, training spaces and BYOD/BYOM collaboration environments.",
    keyFeatures: [
      "Collaboration-led product role",
      "Useful in meeting-room and UC workflows",
      "Supports simpler user operation",
    ],
    technicalNotes: [
      "Confirm whether the room is BYOD, BYOM, room PC or UC appliance based.",
      "Check camera, microphone, speaker and USB ownership.",
    ],
    validationQuestions: [
      "Is the user bringing a laptop?",
      "Which meeting platform is being used?",
      "Where are the camera, microphone and speaker located?",
    ],
    quoteSafetyNotes: [
      "Do not assume a UC workflow without confirming USB and audio device requirements.",
    ],
    salesTalkTrack:
      "Sell this around the meeting experience: less friction when users connect, present and join calls.",
  });
}

function inferCameraStory(sku: string): ProductStory | null {
  if (!sku.startsWith("CAM-") && !sku.includes("CAM")) {
    return null;
  }

  return story({
    sku,
    family: "Camera and capture",
    productRole: "Camera / capture workflow product",
    whatItIs:
      "A camera or camera-workflow product used where video capture, conferencing, streaming, lecture capture or production-style viewing is required.",
    problemSolved:
      "Solves the need to capture people, presenters or room activity and make that video available to the required destination.",
    whyUseful:
      "Useful where the AV system is not just displaying content but also needs to capture or send video from the room.",
    applicationFit:
      "Good fit for meeting rooms, teaching spaces, lecture capture, event spaces and NDI/camera workflows.",
    keyFeatures: [
      "Camera/capture workflow role",
      "Relevant to conferencing, streaming, recording or monitoring",
      "Can form part of USB, HDMI, NDI or AV-over-IP workflows depending on model",
    ],
    technicalNotes: [
      "Confirm whether the camera output is USB, HDMI, NDI or another format.",
      "Confirm whether the destination is a PC, codec, stream, recorder, display or AV-over-IP system.",
    ],
    validationQuestions: [
      "What is the camera output format?",
      "Where does the camera feed need to go?",
      "Is PTZ control required?",
      "Is the workflow conferencing, streaming, recording or live display?",
    ],
    quoteSafetyNotes: [
      "Do not assume the camera signal path. Confirm output format and destination.",
    ],
    salesTalkTrack:
      "Use this when the room needs to send video out, not just show content in. Start with where the camera feed has to go.",
  });
}

function inferControlStory(sku: string): ProductStory | null {
  if (!sku.startsWith("SYN-")) {
    return null;
  }

  return story({
    sku,
    family: "Control",
    productRole: "Room or device control product",
    whatItIs:
      "A control product used to give users a simpler way to operate AV devices or room functions.",
    problemSolved:
      "Solves the problem of users needing to operate several devices without understanding the technical signal path.",
    whyUseful:
      "Useful where a technically correct AV system still needs a simple user interface.",
    applicationFit:
      "Good fit for meeting rooms, teaching rooms, signage/control positions and simple device-control applications.",
    keyFeatures: [
      "User control role",
      "Simplifies room operation",
      "Useful where consistent operation matters",
    ],
    technicalNotes: [
      "Confirm what devices need to be controlled and which protocols are available.",
      "Check whether third-party control is already present.",
    ],
    validationQuestions: [
      "What does the user need to press?",
      "Which devices need control?",
      "Is control IP, RS-232, IR or relay/contact based?",
    ],
    quoteSafetyNotes: [
      "Do not quote control without confirming device controllability and required user actions.",
    ],
    salesTalkTrack:
      "Position this as the simple front end for the user. It helps the system feel easier to operate.",
  });
}

export function extractLikelyProductSku(text: string): string | null {
  const match = cleanText(text).match(PRODUCT_SKU_PATTERN);

  if (!match) {
    return null;
  }

  return normaliseProductSku(match[0]);
}

export function getProductStoryForSku(skuValue: string | null | undefined): ProductStory | null {
  if (!skuValue) {
    return null;
  }

  const sku = normaliseProductSku(skuValue);

  if (EXPLICIT_PRODUCT_STORIES[sku]) {
    return EXPLICIT_PRODUCT_STORIES[sku];
  }

  const networkHd = inferNetworkHdStory(sku);

  if (networkHd) {
    return networkHd;
  }

  const matrix = inferMatrixStory(sku);

  if (matrix) {
    return matrix;
  }

  const switcher = inferSwitcherStory(sku);

  if (switcher) {
    return switcher;
  }

  const apo = inferApoStory(sku);

  if (apo) {
    return apo;
  }

  const camera = inferCameraStory(sku);

  if (camera) {
    return camera;
  }

  const control = inferControlStory(sku);

  if (control) {
    return control;
  }

  return story({ sku });
}

export function getProductStoryForText(text: string): ProductStory | null {
  const sku = extractLikelyProductSku(text);

  if (!sku) {
    return null;
  }

  return getProductStoryForSku(sku);
}

export function buildProductStorySummary(storyValue: ProductStory): string {
  return `${storyValue.productRole}. ${storyValue.problemSolved}`;
}

export function getKnownProductStorySkus(): string[] {
  return Object.keys(EXPLICIT_PRODUCT_STORIES).sort();
}