export type ProductStoryCompanion = {
  sku: string;
  reason: string;
};

export type ProductStory = {
  sku: string;
  plainEnglishName: string;
  family: string;
  category: string;
  productType: string;
  oneLinePosition: string;
  whatItIs: string;
  whatItDoes: string;
  customerProblem: string;
  salesTalkTrack: string;
  idealApplications: string[];
  worksWith: ProductStoryCompanion[];
  familyContext: string;
  whenToUse: string[];
  whenNotToUse: string[];
  discoveryQuestions: string[];
  quoteChecks: string[];
  customerSafeWording: string;
  internalRepGuidance: string;
  keyFeatures: string[];
  diagramSource?: string;
  diagramOutput?: string;
};

function normaliseStorySku(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export const PRODUCT_STORIES: ProductStory[] = [
  {
    sku: "NHD-0401-MV",
    plainEnglishName: "Four-input multiview processor",
    family: "Multiview / NetworkHD",
    category: "Multiview processor",
    productType: "4-input multiview processor",
    oneLinePosition: "NHD-0401-MV is the quick multiview answer when the customer needs up to four sources visible on one output.",
    whatItIs: "NHD-0401-MV is a four-input multiview processor that creates one composed HDMI output. It is used when the requirement is to see several sources at the same time, not simply to route one source to one display.",
    whatItDoes: "It lets a display, projector, recorder, streamer or LED processor receive one combined picture made from multiple sources. It is useful for monitoring, sports-bar screens, teaching rooms, control points and simple LED processor feeds.",
    customerProblem: "The customer has several things they want to see at once, but a normal switcher only lets them choose one source at a time.",
    salesTalkTrack: "Position it as the simple multiview conversation: four sources in, one useful combined output out. It is not a full matrix and it is not a full AVoIP system.",
    idealApplications: ["LED processor input", "Sports bar monitor", "Teaching-room source preview", "Control-room monitoring", "Streamer or recorder feed"],
    worksWith: [
      { sku: "NHD-500-TX", reason: "Use in NetworkHD 500 discussions where high-quality AVoIP sources need a dedicated multiview output path." },
      { sku: "NHD-500-RX", reason: "Use alongside 500-series endpoints when the design needs a composed monitor or processor feed." },
      { sku: "SW-0206-VW", reason: "Consider the dedicated video-wall processor where the requirement is wall processing rather than a simple four-source multiview output." }
    ],
    familyContext: "This is the standalone multiview processor conversation. In NetworkHD 100 systems, NHD-150-RX is the 100-series multiview decoder; in NetworkHD 500 discussions, NHD-0401-MV is the correct multiview processor SKU to consider.",
    whenToUse: ["Up to four sources need to be visible together.", "The output is one display, recorder, streamer or LED processor input.", "The customer needs a simple composed view rather than full routing flexibility."],
    whenNotToUse: ["Do not use it as a full matrix replacement.", "Do not use it where every display needs independent source routing.", "Do not confuse multiview with simply having multiple HDMI outputs."],
    discoveryQuestions: ["How many sources need to appear on the same screen at once?", "Does the output feed a display, recorder, streamer or LED processor?", "Do they need fixed layouts or live layout changes?", "Is this monitoring, signage, teaching or hospitality?"],
    quoteChecks: ["Confirm source count does not exceed four.", "Confirm output resolution and display/processor input expectations.", "Confirm control method and layout behaviour.", "Confirm whether matrix or AVoIP is actually required instead."],
    customerSafeWording: "Use NHD-0401-MV where the customer needs multiple sources shown together on one screen or processor input. It is the multiview tool, not a full routing system.",
    internalRepGuidance: "Lead with the phrase 'multiple sources on one output'. That prevents the common mistake of treating any multi-output product as multiview.",
    keyFeatures: ["Four-source multiview conversation", "Single composed HDMI output", "Useful with LED processor feeds", "Monitoring and confidence-viewing fit"],
    diagramSource: "Up to four HDMI sources",
    diagramOutput: "Single multiview display, recorder or LED processor"
  },
  {
    sku: "NHD-150-RX",
    plainEnglishName: "NetworkHD 100 multiview decoder",
    family: "NetworkHD 100",
    category: "AV-over-IP multiview decoder",
    productType: "NetworkHD 100-series multiview receiver",
    oneLinePosition: "NHD-150-RX is the NetworkHD 100 multiview receiver when several 100-series streams need to appear on one output.",
    whatItIs: "NHD-150-RX is a NetworkHD 100-series receiver/decoder used to create a multiview output from NetworkHD 100 streams.",
    whatItDoes: "It lets a 100-series AVoIP design show multiple encoded sources together on a single display output for monitoring, signage, teaching or hospitality use.",
    customerProblem: "The customer wants more than source-to-display routing; they want a single screen to show several active sources at once.",
    salesTalkTrack: "Position it as the multiview add-on inside a NetworkHD 100 design. Pair it with NHD-124-TX encoders and NHD-CTL-PRO control where a flexible 100-series multiview system is required.",
    idealApplications: ["NetworkHD 100 multiview", "Sports bar screen composition", "Lecture theatre source monitoring", "Signage and information display", "Control-room monitor"],
    worksWith: [
      { sku: "NHD-124-TX", reason: "Encodes source devices into the NetworkHD 100 system." },
      { sku: "NHD-CTL-PRO", reason: "Required controller for the NetworkHD system." },
      { sku: "NHD-120-RX", reason: "Use where a standard single-source NetworkHD 100 receiver output is required." }
    ],
    familyContext: "This belongs in the NetworkHD 100 conversation. Do not mix it into NetworkHD 500 or NetworkHD 600 endpoint designs.",
    whenToUse: ["The system is NetworkHD 100.", "Several sources need to appear together on one output.", "Bandwidth and cost position the project toward 100-series AVoIP."],
    whenNotToUse: ["Do not use it for NetworkHD 500 or 600 systems.", "Do not use it where a dedicated standalone four-input multiview processor is simpler.", "Do not use it if the customer only needs one source on one screen."],
    discoveryQuestions: ["Is the existing or proposed system NetworkHD 100?", "How many sources need to be visible at once?", "Is this for live viewing, signage, confidence monitoring or a processor feed?", "Who will control the layouts?"],
    quoteChecks: ["Include NHD-CTL-PRO.", "Confirm encoder count.", "Confirm network switch suitability.", "Confirm layout expectations before quoting."],
    customerSafeWording: "Use NHD-150-RX when a NetworkHD 100 system needs a multiview output instead of a normal single-source receiver output.",
    internalRepGuidance: "This is a 100-series multiview decoder. Keep it separate from the NHD-0401-MV story for NetworkHD 500 discussions.",
    keyFeatures: ["NetworkHD 100 multiview output", "Works with 100-series encoders", "Requires NetworkHD controller", "Useful for monitoring and signage"],
    diagramSource: "NetworkHD 100 encoders",
    diagramOutput: "Single multiview display output"
  },
  {
    sku: "NHD-124-TX",
    plainEnglishName: "NetworkHD 100 encoder",
    family: "NetworkHD 100",
    category: "AV-over-IP encoder",
    productType: "NetworkHD 100-series transmitter",
    oneLinePosition: "NHD-124-TX is the NetworkHD 100 source-side encoder for cost-effective flexible 4K distribution.",
    whatItIs: "NHD-124-TX is a NetworkHD 100-series transmitter that brings a source into a 100-series AVoIP system.",
    whatItDoes: "It encodes a source so it can be routed across the NetworkHD 100 network to compatible receivers or a multiview output.",
    customerProblem: "The customer needs flexible distribution without the cost or bandwidth profile of a premium AVoIP platform.",
    salesTalkTrack: "Use it when the conversation is a cost-effective 100-series AVoIP system. For multiview, pair the source encoders with NHD-150-RX and NHD-CTL-PRO.",
    idealApplications: ["Hospitality source distribution", "Signage", "Education", "Sports bar distribution", "Flexible 4K routing"],
    worksWith: [
      { sku: "NHD-150-RX", reason: "Creates a multiview output from NetworkHD 100 streams." },
      { sku: "NHD-120-RX", reason: "Receives a standard single-source 100-series output." },
      { sku: "NHD-CTL-PRO", reason: "Required controller for system routing and management." }
    ],
    familyContext: "NetworkHD 100 is the cost-effective, bandwidth-conscious AVoIP tier. Step to NetworkHD 500 for premium 4K60 4:4:4 JPEG-XS workflows or NetworkHD 600 for 10G uncompressed performance.",
    whenToUse: ["Flexible source distribution matters.", "The project benefits from 1GbE AVoIP economics.", "The content is suitable for the 100-series design path."],
    whenNotToUse: ["Do not use it in 500 or 600-series systems.", "Do not use it where 4K60 4:4:4 premium quality is the requirement.", "Do not use AVoIP where a small local matrix is simpler."],
    discoveryQuestions: ["How many sources need to be encoded?", "How many displays receive those sources?", "Is the network available and suitable?", "Is multiview required?"],
    quoteChecks: ["Include matching 100-series receivers.", "Include NHD-CTL-PRO.", "Confirm network switch and VLAN requirements.", "Confirm content type and latency expectations."],
    customerSafeWording: "Use NHD-124-TX as the source-side part of a NetworkHD 100 system where the customer needs flexible, cost-effective AV distribution.",
    internalRepGuidance: "Always describe TX as the source side. Check receiver count and controller before proposing.",
    keyFeatures: ["NetworkHD 100 source encoder", "Flexible AVoIP distribution", "Pairs with NHD-150-RX for multiview", "Requires NHD-CTL-PRO"],
    diagramSource: "HDMI source device",
    diagramOutput: "NetworkHD 100 network"
  },
  {
    sku: "NHD-CTL-PRO",
    plainEnglishName: "NetworkHD system controller",
    family: "NetworkHD",
    category: "System controller",
    productType: "NetworkHD controller",
    oneLinePosition: "NHD-CTL-PRO is the control and management dependency for NetworkHD systems.",
    whatItIs: "NHD-CTL-PRO is the controller used to manage compatible NetworkHD systems.",
    whatItDoes: "It provides the control layer for routing, system management and integration in NetworkHD architectures.",
    customerProblem: "The customer may think AVoIP is only encoders and decoders, but the system still needs a controller to manage routing and operation.",
    salesTalkTrack: "Position it as a required NetworkHD system dependency, not an optional accessory.",
    idealApplications: ["NetworkHD 100", "NetworkHD 500", "NetworkHD 600", "System routing", "AV-over-IP control"],
    worksWith: [
      { sku: "NHD-124-TX", reason: "Controls routing for 100-series encoders." },
      { sku: "NHD-500-TX", reason: "Controls routing for 500-series encoders." },
      { sku: "NHD-600-TRX", reason: "Controls routing for 600-series transceivers." }
    ],
    familyContext: "NetworkHD systems need the correct controller path. Keep series compatibility clear and do not imply cross-series endpoint interoperability.",
    whenToUse: ["Any proper NetworkHD system is being designed.", "Routing and control are required.", "The system needs a managed architecture rather than isolated point-to-point endpoints."],
    whenNotToUse: ["Do not position it as a source or receiver.", "Do not include it as a casual accessory without explaining its system role.", "Do not use it to suggest incompatible NetworkHD series can be mixed."],
    discoveryQuestions: ["Which NetworkHD series is being used?", "How will users control routing?", "Is third-party control integration required?", "Who will configure and maintain the system?"],
    quoteChecks: ["Confirm NetworkHD series.", "Confirm controller requirement.", "Confirm network topology.", "Confirm control UI or third-party control integration."],
    customerSafeWording: "NHD-CTL-PRO is the controller that allows the NetworkHD system to operate as a managed AV-over-IP system.",
    internalRepGuidance: "Treat it as a required dependency for NetworkHD proposals. Do not leave it out of the system story.",
    keyFeatures: ["NetworkHD control dependency", "Routing management", "System integration support", "Required architecture item"],
    diagramSource: "User control / control system",
    diagramOutput: "NetworkHD encoders and receivers"
  },
  {
    sku: "NHD-500-TX",
    plainEnglishName: "NetworkHD 500 encoder",
    family: "NetworkHD 500",
    category: "Premium 1GbE AV-over-IP",
    productType: "NetworkHD 500-series transmitter",
    oneLinePosition: "NHD-500-TX is the source-side encoder for premium 1GbE NetworkHD 500 systems.",
    whatItIs: "NHD-500-TX is the transmitter that brings a source into a NetworkHD 500 AV-over-IP system.",
    whatItDoes: "It supports the premium 500-series conversation: high-quality 4K distribution, flexible routing, low latency and stronger USB-led workflows than entry-level distribution systems.",
    customerProblem: "The customer needs flexible AV routing across rooms or a site, but still expects a professional 4K image and an integration-ready system.",
    salesTalkTrack: "Position NetworkHD 500 as the commercially practical premium AVoIP route for most 4K distribution projects. It is the step above basic low-bandwidth systems without jumping straight to 10G.",
    idealApplications: ["Higher education", "Corporate AV", "Multi-room distribution", "Training spaces", "Premium 4K AVoIP"],
    worksWith: [
      { sku: "NHD-500-RX", reason: "Receives the 500-series source stream at the display side." },
      { sku: "NHD-CTL-PRO", reason: "Required NetworkHD controller." },
      { sku: "NHD-0401-MV", reason: "Use where a 500-series discussion also needs a dedicated multiview output." }
    ],
    familyContext: "NetworkHD 500 is the premium 1GbE NetworkHD family. Step up to NetworkHD 600 when the project needs 10G uncompressed SDVoE performance; step down to NetworkHD 100 where budget and bandwidth matter more than premium 4K60 4:4:4 workflows.",
    whenToUse: ["Flexible routing across rooms or displays is required.", "The project needs a stronger 4K AVoIP story than basic H.264/H.265 distribution.", "USB or integration behaviour is part of the room requirement."],
    whenNotToUse: ["Do not use it for a simple one-source one-display extension job.", "Do not use it where the customer specifically needs 10G lossless zero-latency performance.", "Do not mix it with NetworkHD 100 or 600 endpoints in the same routing system."],
    discoveryQuestions: ["How many sources and displays are required?", "Is this one room, several rooms or a building-wide system?", "Is USB device transport needed?", "Who owns the network and switch configuration?"],
    quoteChecks: ["Include matching NHD-500-RX receivers.", "Include NHD-CTL-PRO.", "Confirm switch requirements and VLAN design.", "Confirm USB, audio, control and latency expectations."],
    customerSafeWording: "Use NetworkHD 500 when the customer needs flexible professional 4K AV-over-IP over 1GbE with a stronger quality and integration story than a basic distribution system.",
    internalRepGuidance: "NetworkHD 500 should be the default premium 1GbE AVoIP conversation before jumping to 600. Validate scale, USB, switching and network ownership.",
    keyFeatures: ["Premium 1GbE AVoIP", "4K distribution conversation", "Low-latency system path", "Strong USB and integration story"],
    diagramSource: "Source devices into NHD-500-TX",
    diagramOutput: "NetworkHD 500 network and receivers"
  },
  {
    sku: "NHD-500-RX",
    plainEnglishName: "NetworkHD 500 receiver",
    family: "NetworkHD 500",
    category: "Premium 1GbE AV-over-IP",
    productType: "NetworkHD 500-series receiver",
    oneLinePosition: "NHD-500-RX is the display-side receiver for premium 1GbE NetworkHD 500 systems.",
    whatItIs: "NHD-500-RX is the receiver/decoder used at the display side of a NetworkHD 500 system.",
    whatItDoes: "It receives NetworkHD 500 streams and supports the 500-series system story for high-quality routed AV distribution.",
    customerProblem: "The customer needs displays in different spaces to receive selected sources without being locked to a fixed matrix output.",
    salesTalkTrack: "Explain the TX/RX relationship clearly: source side uses TX, display side uses RX, and the system is controlled with NHD-CTL-PRO.",
    idealApplications: ["Display-side AVoIP receiver", "Multi-room AV", "Education displays", "Corporate displays", "Flexible 4K routing"],
    worksWith: [
      { sku: "NHD-500-TX", reason: "Encodes source devices into the 500-series system." },
      { sku: "NHD-CTL-PRO", reason: "Required NetworkHD controller." },
      { sku: "NHD-0401-MV", reason: "Use where a composed multiview output is also needed." }
    ],
    familyContext: "NetworkHD 500 endpoints must stay within the 500-series system. Do not position the receiver as cross-compatible with 100 or 600-series endpoints.",
    whenToUse: ["A display needs to receive flexible NetworkHD 500 routed content.", "A room or display zone is part of a wider 500-series AVoIP design.", "Premium 1GbE AVoIP is the correct architecture."],
    whenNotToUse: ["Do not use it as a transmitter/source-side device.", "Do not mix it into 100 or 600-series endpoint systems.", "Do not use AVoIP where a fixed local switcher is simpler."],
    discoveryQuestions: ["How many display locations need receivers?", "Do displays need USB, audio or control paths?", "Are receivers local to the displays or in a rack?", "How will users select sources?"],
    quoteChecks: ["Match receiver count to display zones.", "Include NHD-500-TX source encoders.", "Include NHD-CTL-PRO.", "Confirm network and switch design."],
    customerSafeWording: "Use NHD-500-RX at the display side of a NetworkHD 500 system where displays need flexible source selection over the AV network.",
    internalRepGuidance: "Keep TX/RX language simple for non-technical sales users. TX is source side; RX is display side.",
    keyFeatures: ["Display-side 500-series receiver", "Premium 1GbE AVoIP", "Flexible routed content", "Controller-managed system"],
    diagramSource: "NetworkHD 500 network",
    diagramOutput: "Display, projector or local AV destination"
  },
  {
    sku: "NHD-600-TRX",
    plainEnglishName: "NetworkHD 600 transceiver",
    family: "NetworkHD 600",
    category: "10G AV-over-IP",
    productType: "NetworkHD 600-series transceiver",
    oneLinePosition: "NHD-600-TRX is the high-performance 10G NetworkHD option where image quality and latency justify the step up.",
    whatItIs: "NHD-600-TRX is a NetworkHD 600 transceiver that can operate as transmit or receive in a 10G NetworkHD 600 system.",
    whatItDoes: "It supports the highest-performance NetworkHD conversation: uncompressed 10G AV-over-IP, extremely low latency and premium 4K distribution for demanding projects.",
    customerProblem: "The customer needs AVoIP flexibility but cannot accept the quality or latency compromises of lower-bandwidth systems.",
    salesTalkTrack: "Position NetworkHD 600 as the premium performance route, not the default AVoIP answer. Use it where 10G infrastructure and the application justify it.",
    idealApplications: ["Mission-critical AV", "High-performance 4K distribution", "Premium video walls", "Low-latency applications", "10G infrastructure projects"],
    worksWith: [
      { sku: "NHD-CTL-PRO", reason: "Required NetworkHD controller for system routing and management." },
      { sku: "NHD-500-TX", reason: "Commercial alternative where 1GbE premium AVoIP is sufficient and 10G is not justified." },
      { sku: "SW-0206-VW", reason: "Consider where a dedicated wall processor is cleaner than a 10G AVoIP wall design." }
    ],
    familyContext: "NetworkHD 600 is the 10G performance tier. NetworkHD 500 covers many premium commercial AVoIP jobs over 1GbE; NetworkHD 600 is for the projects that need the performance uplift.",
    whenToUse: ["The project has 10G network infrastructure or the budget to provide it.", "Latency and image quality are critical.", "The customer needs the highest-performance NetworkHD route."],
    whenNotToUse: ["Do not lead with 600 for ordinary distribution where 500 is commercially more practical.", "Do not use it on a 1GbE network.", "Do not mix it with 100 or 500-series endpoints in the same routing system."],
    discoveryQuestions: ["Is 10G switching available or being provided?", "Why is zero/ultra-low latency important in this project?", "Is this distribution, video wall, control room or high-value presentation?", "What content type drives the performance requirement?"],
    quoteChecks: ["Confirm 10G switch design.", "Include NHD-CTL-PRO.", "Confirm optics/cabling where required.", "Confirm whether 500-series would satisfy the requirement at lower complexity."],
    customerSafeWording: "Use NetworkHD 600 where the project genuinely needs 10G high-performance AV-over-IP and the infrastructure supports it.",
    internalRepGuidance: "Do not sell 600 as 'better therefore always right'. Sell it when performance, latency and network infrastructure make it the right architecture.",
    keyFeatures: ["10G NetworkHD tier", "High-performance AVoIP", "Transceiver role", "Premium low-latency system path"],
    diagramSource: "Source or display depending on TRX mode",
    diagramOutput: "10G NetworkHD switching fabric"
  },
  {
    sku: "APO-VX20-UC",
    plainEnglishName: "Apollo VX20 UC video bar",
    family: "Apollo / UC",
    category: "BYOD meeting room",
    productType: "All-in-one UC video bar",
    oneLinePosition: "APO-VX20-UC is the simple meeting-room conversation for camera, microphone and speaker audio in one device.",
    whatItIs: "APO-VX20-UC is an all-in-one UC video bar for small meeting rooms and collaboration spaces.",
    whatItDoes: "It gives the room a neater camera, microphone and speaker experience without turning a simple meeting space into a complex installed AV system.",
    customerProblem: "The customer wants video calls to feel better than a laptop webcam and speakers, but they do not want a complicated room system.",
    salesTalkTrack: "Lead with simplicity: one visible meeting-room device that improves the call experience. Add APO-DG2 when wireless presentation is part of the same conversation.",
    idealApplications: ["Huddle room", "Small meeting room", "BYOD room", "Collaboration space", "Simple UC upgrade"],
    worksWith: [
      { sku: "APO-DG2", reason: "Adds simple wireless presentation / casting to the meeting-room workflow." },
      { sku: "SW-620-TX-W", reason: "Use when the room needs more source switching or presentation inputs." },
      { sku: "SYN-TOUCH10", reason: "Use where simple room control or mode selection is required." }
    ],
    familyContext: "This is a meeting-room user-experience product. It is not a full control platform and not a complex DSP/camera installation.",
    whenToUse: ["The room is small to medium and needs a simple UC experience.", "BYOD/BYOM is the dominant workflow.", "The customer values low complexity and clean installation."],
    whenNotToUse: ["Do not use it where a large room needs separate microphones, speakers and camera coverage.", "Do not position it as a full Teams-certified room system unless certification is confirmed.", "Do not ignore USB host location and cable distance."],
    discoveryQuestions: ["How many people normally use the room?", "Is it BYOD, BYOM, room PC or mixed use?", "Do they also need wireless presentation?", "Where will the laptop or host device connect?"],
    quoteChecks: ["Confirm room size and coverage.", "Confirm USB path and host location.", "Confirm display connection workflow.", "Confirm whether APO-DG2 is needed for wireless presentation."],
    customerSafeWording: "Use APO-VX20-UC where the customer wants a simple, neat meeting-room video bar instead of separate camera, microphone and speaker devices.",
    internalRepGuidance: "This is often an easy attachment to display or meeting-room conversations. Ask the wireless presentation question early.",
    keyFeatures: ["All-in-one UC video bar", "Camera, microphone and speaker conversation", "Simple BYOD/BYOM fit", "Works with APO-DG2 for wireless presentation"],
    diagramSource: "BYOD laptop or room host",
    diagramOutput: "Display and UC call participants"
  },
  {
    sku: "APO-DG2",
    plainEnglishName: "Apollo wireless presentation dongle",
    family: "Apollo / UC",
    category: "Wireless presentation",
    productType: "USB-C wireless casting device",
    oneLinePosition: "APO-DG2 is the wireless presentation attachment when a simple meeting room also needs cable-free sharing.",
    whatItIs: "APO-DG2 is a wireless presentation device used to add a simple casting workflow to an Apollo meeting-room setup.",
    whatItDoes: "It helps users share content without relying only on fixed HDMI or USB-C cabling.",
    customerProblem: "The customer wants a cleaner way for visitors and laptop users to present in the room.",
    salesTalkTrack: "Attach it to the VX20 conversation where the customer wants a simple meeting room plus wireless presentation.",
    idealApplications: ["BYOD meeting rooms", "Visitor presentation", "Small collaboration rooms", "Cable-light presentation"],
    worksWith: [
      { sku: "APO-VX20-UC", reason: "Complements the UC video bar with wireless presentation." },
      { sku: "SW-620-TX-W", reason: "Use a switcher instead where the room needs more source management." }
    ],
    familyContext: "DG2 is part of the meeting-room experience conversation. It should be positioned as a workflow add-on, not as a full AV switching system.",
    whenToUse: ["Wireless presentation is requested.", "The customer wants a simple visitor-friendly workflow.", "The meeting room already has or is considering an Apollo UC path."],
    whenNotToUse: ["Do not use it where several fixed sources need managed switching.", "Do not use it as a substitute for a presentation switcher.", "Do not assume regional availability without checking."],
    discoveryQuestions: ["Do users want to present without plugging in?", "Are guests allowed on the network?", "Is this for laptops, mobile devices or both?", "Is there also a wired fallback path?"],
    quoteChecks: ["Confirm host/display workflow.", "Confirm wireless policy and network assumptions.", "Confirm region/availability.", "Confirm whether a switcher is a better fit."],
    customerSafeWording: "Use APO-DG2 where the room needs a simple wireless presentation path alongside the UC workflow.",
    internalRepGuidance: "Treat DG2 as a meeting-room attachment question: 'Do they also want wireless sharing?'",
    keyFeatures: ["Wireless presentation attachment", "USB-C casting conversation", "Visitor-friendly room workflow", "Pairs with APO-VX20-UC"],
    diagramSource: "Laptop or mobile user",
    diagramOutput: "Meeting-room display path"
  },
  {
    sku: "SYN-TOUCH10",
    plainEnglishName: "10-inch touch control panel",
    family: "SYN / Control",
    category: "Room control",
    productType: "Touch panel",
    oneLinePosition: "SYN-TOUCH10 is the simple control conversation when users need a clear room interface.",
    whatItIs: "SYN-TOUCH10 is a touch panel for simple room control and user operation.",
    whatItDoes: "It gives the user a clear interface for common room actions such as source selection, room modes or device control where supported by the system design.",
    customerProblem: "The room may technically work, but users need a simple way to operate it without knowing the AV system.",
    salesTalkTrack: "Position it as the user interface layer, not as a full control-platform promise. Tie it to the devices and actions that need controlling.",
    idealApplications: ["Meeting room control", "Teaching space control", "Presentation switcher operation", "Simple room mode selection"],
    worksWith: [
      { sku: "SW-620-TX-W", reason: "Good fit where a presentation switcher needs a cleaner user interface." },
      { sku: "SW-640-TX-W", reason: "Useful where a larger presentation switcher workflow needs simple front-end control." },
      { sku: "APO-VX20-UC", reason: "Can support a simpler room user-experience conversation where control is part of the requirement." }
    ],
    familyContext: "This is a simple room interface story. Do not position it as a Crestron/Extron-style full building control platform.",
    whenToUse: ["Users need a clear control interface.", "The room has source selection or modes that need simplifying.", "A presentation or UC workflow benefits from one front-end touch point."],
    whenNotToUse: ["Do not promise full bespoke control without confirming supported control methods.", "Do not treat it as the main AV signal product.", "Do not include it before understanding who configures and maintains it."],
    discoveryQuestions: ["What does the user need to control?", "Is source selection the main issue?", "Are display power, volume or room modes required?", "Who will configure and support the interface?"],
    quoteChecks: ["Confirm controllable devices.", "Confirm IP/RS-232/IR/control path.", "Confirm required UI actions.", "Confirm configuration responsibility."],
    customerSafeWording: "Use SYN-TOUCH10 where the customer needs a simple touch interface for the room workflow that has already been defined.",
    internalRepGuidance: "Sell it as user-experience support. Keep the control promise modest and verified.",
    keyFeatures: ["10-inch room touch interface", "Simple control conversation", "Useful with presentation switchers", "User-experience layer"],
    diagramSource: "User touch control",
    diagramOutput: "Room devices and source selection"
  },
  {
    sku: "SW-620-TX-W",
    plainEnglishName: "Wireless presentation switcher",
    family: "Presentation",
    category: "BYOD/BYOM presentation switcher",
    productType: "Wireless and wired presentation switcher",
    oneLinePosition: "SW-620-TX-W is the compact presentation-room core when the customer needs wired and wireless sharing.",
    whatItIs: "SW-620-TX-W is a presentation switcher for rooms where users need to connect laptops and present without building a full matrix or AVoIP system.",
    whatItDoes: "It centralises the local presentation workflow so wired sources, wireless presentation and room output behaviour are easier for the user to manage.",
    customerProblem: "Users need to present from different devices, but the room should stay simple.",
    salesTalkTrack: "Use it when the room is presentation-led. Add SYN-TOUCH10 where the user interface needs to be cleaner and more guided.",
    idealApplications: ["Meeting room", "Classroom", "Training room", "BYOD presentation", "Simple wireless presentation"],
    worksWith: [
      { sku: "SYN-TOUCH10", reason: "Adds a simple touch interface for room operation." },
      { sku: "APO-VX20-UC", reason: "Use where presentation and UC video-bar workflow are both required." },
      { sku: "SW-640-TX-W", reason: "Step up when more inputs or dual-output behaviour is needed." }
    ],
    familyContext: "This is a presentation switcher conversation, not a whole-building routing platform.",
    whenToUse: ["The room has local presentation sources.", "Wireless presentation is part of the requirement.", "The system should stay simpler than matrix or AVoIP."],
    whenNotToUse: ["Do not use it for many-room source routing.", "Do not use it where a large matrix or AVoIP system is required.", "Do not ignore USB/BYOM requirements."],
    discoveryQuestions: ["How many local sources are needed?", "Is wireless presentation required?", "Is the room also used for video calls?", "How many displays need outputs?"],
    quoteChecks: ["Confirm input count.", "Confirm wireless presentation workflow.", "Confirm USB/BYOM path.", "Confirm whether SYN-TOUCH10 should be included."],
    customerSafeWording: "Use SW-620-TX-W where the room needs a compact wired/wireless presentation core without the complexity of matrix or AVoIP.",
    internalRepGuidance: "Ask whether the room needs simple touch control; SYN-TOUCH10 is a natural attachment question.",
    keyFeatures: ["Presentation-led room core", "Wired and wireless sharing conversation", "Meeting and teaching room fit", "Pairs with SYN-TOUCH10"],
    diagramSource: "Laptop and room sources",
    diagramOutput: "Room display / presentation output"
  },
  {
    sku: "SW-640-TX-W",
    plainEnglishName: "Larger wireless presentation switcher",
    family: "Presentation",
    category: "BYOD/BYOM presentation switcher",
    productType: "Presentation switcher",
    oneLinePosition: "SW-640-TX-W is the step-up presentation switcher when the room needs more source capacity or output flexibility.",
    whatItIs: "SW-640-TX-W is a presentation switcher for more capable meeting, teaching and collaboration spaces.",
    whatItDoes: "It supports the local room presentation workflow where the customer needs more than the smaller switcher route.",
    customerProblem: "The customer has a presentation-led room but needs more flexibility than the entry presentation switcher conversation.",
    salesTalkTrack: "Position it as the step-up from SW-620-TX-W where input count, output behaviour or room complexity justifies it.",
    idealApplications: ["Larger meeting room", "Teaching room", "Training room", "Dual-output presentation", "BYOD/BYOM spaces"],
    worksWith: [
      { sku: "SYN-TOUCH10", reason: "Adds simple front-end control for a more capable room." },
      { sku: "APO-VX20-UC", reason: "Use where the room also needs a simple UC video bar." },
      { sku: "SW-620-TX-W", reason: "Use the smaller switcher where the room requirement is simpler." }
    ],
    familyContext: "This sits in the local presentation-switcher family. Use matrix or AVoIP when routing scale or distribution becomes the real requirement.",
    whenToUse: ["The room needs more input or output capability than the smaller switcher.", "The user still wants a local presentation-room workflow.", "Touch control or guided operation matters."],
    whenNotToUse: ["Do not use it as a substitute for multi-room routing.", "Do not use it where a fixed matrix or AVoIP is clearly the architecture.", "Do not skip display/output behaviour checks."],
    discoveryQuestions: ["How many sources need to connect?", "How many displays are in the room?", "Do outputs mirror or behave independently?", "Is BYOM/BYOD conferencing required?"],
    quoteChecks: ["Confirm input/output count.", "Confirm display behaviour.", "Confirm USB path.", "Confirm SYN-TOUCH10 attachment."],
    customerSafeWording: "Use SW-640-TX-W where the room is still a local presentation space, but needs more flexibility than the compact switcher route.",
    internalRepGuidance: "Use it as the step-up presentation answer before moving to matrix or AVoIP.",
    keyFeatures: ["Step-up presentation switcher", "Larger room workflow", "Source/output flexibility", "Pairs with SYN-TOUCH10"],
    diagramSource: "Multiple room sources",
    diagramOutput: "Room display outputs"
  },
  {
    sku: "SW-0206-VW",
    plainEnglishName: "Dedicated video-wall processor",
    family: "Video wall",
    category: "Dedicated wall processing",
    productType: "Video-wall processor",
    oneLinePosition: "SW-0206-VW is the dedicated non-AVoIP video-wall route when fixed wall processing is cleaner than networked routing.",
    whatItIs: "SW-0206-VW is a dedicated video-wall processor for applications where a processor is the right way to feed and manage the wall.",
    whatItDoes: "It gives the design a defined wall-processing path without automatically jumping to AV-over-IP.",
    customerProblem: "The customer needs a video wall to behave correctly, but the requirement may not justify the complexity of AVoIP.",
    salesTalkTrack: "Use it as the dedicated processor alternative to AVoIP wall designs. Clarify wall type, layout and source behaviour first.",
    idealApplications: ["LCD video wall", "LED processor input", "Hospitality wall", "Retail display wall", "Fixed layout wall"],
    worksWith: [
      { sku: "SW-0204-VW", reason: "Use for simpler preset-layout wall requirements." },
      { sku: "NHD-600-TRX", reason: "Consider where high-performance 10G AVoIP wall routing is required." },
      { sku: "NHD-0401-MV", reason: "Use where the requirement is a simple four-source multiview output rather than a wall processor." }
    ],
    familyContext: "A dedicated processor should always be considered alongside AVoIP wall options. AVoIP is not automatically the best answer.",
    whenToUse: ["Wall behaviour is defined and processor-led.", "The customer needs fixed or controlled wall layouts.", "A dedicated processor is simpler than networked routing."],
    whenNotToUse: ["Do not use it where the real requirement is flexible any-source-to-any-display routing across a site.", "Do not use it before confirming wall type and layout.", "Do not ignore LED processor requirements."],
    discoveryQuestions: ["Is this LCD or LED?", "How many displays or processor inputs are involved?", "Do they need full canvas, presets or per-display content?", "How many sources feed the wall?"],
    quoteChecks: ["Confirm wall layout.", "Confirm source count.", "Confirm output/processor input expectations.", "Compare dedicated processor versus AVoIP before proposing."],
    customerSafeWording: "Use SW-0206-VW when a dedicated video-wall processor gives the customer a cleaner answer than building the wall through AVoIP.",
    internalRepGuidance: "Ask wall behaviour questions first. Do not default to AVoIP.",
    keyFeatures: ["Dedicated non-AVoIP wall route", "Processor-led wall behaviour", "Alternative to AVoIP wall design", "LCD/LED discussion fit"],
    diagramSource: "Source devices",
    diagramOutput: "LCD wall or LED processor"
  },
  {
    sku: "SW-0204-VW",
    plainEnglishName: "Simple video-wall processor",
    family: "Video wall",
    category: "Preset wall processing",
    productType: "Video-wall processor",
    oneLinePosition: "SW-0204-VW is the simpler dedicated wall processor route for basic preset-layout walls.",
    whatItIs: "SW-0204-VW is a dedicated video-wall processor for simpler wall layouts and preset-style applications.",
    whatItDoes: "It provides a focused wall-processing route where the customer does not need a wider AVoIP architecture.",
    customerProblem: "The customer wants a basic video wall to work reliably without overcomplicating the system.",
    salesTalkTrack: "Position it as the simpler wall processor option. Step to SW-0206-VW or AVoIP where the requirement is more complex.",
    idealApplications: ["Basic LCD wall", "Preset wall layouts", "Small hospitality wall", "Simple display wall"],
    worksWith: [
      { sku: "SW-0206-VW", reason: "Step up for more capable dedicated wall processing." },
      { sku: "NHD-0401-MV", reason: "Use where the requirement is multiview rather than wall processing." }
    ],
    familyContext: "This is the simpler processor-led wall path. It should sit below SW-0206-VW in the story.",
    whenToUse: ["The wall requirement is basic.", "Preset layouts are sufficient.", "A dedicated processor is simpler than AVoIP."],
    whenNotToUse: ["Do not use it where complex wall behaviour is required.", "Do not use it for multi-room routing.", "Do not skip wall-layout confirmation."],
    discoveryQuestions: ["What is the wall layout?", "How many sources feed it?", "Are preset layouts enough?", "Is this LCD or LED?"],
    quoteChecks: ["Confirm wall size.", "Confirm layout behaviour.", "Confirm source count.", "Confirm whether SW-0206-VW is a better fit."],
    customerSafeWording: "Use SW-0204-VW for simpler video-wall jobs where basic dedicated processing is enough.",
    internalRepGuidance: "Keep the language simple: basic wall, preset behaviour, dedicated processor.",
    keyFeatures: ["Simple wall processor", "Preset-layout story", "Dedicated non-AVoIP route", "Entry wall-processing option"],
    diagramSource: "Source devices",
    diagramOutput: "Simple video wall"
  }
];

export const PRODUCT_STORY_BY_SKU: Record<string, ProductStory> = PRODUCT_STORIES.reduce(
  (accumulator, story) => {
    accumulator[normaliseStorySku(story.sku)] = story;
    return accumulator;
  },
  {} as Record<string, ProductStory>,
);

export function getProductStory(sku: string): ProductStory | undefined {
  return PRODUCT_STORY_BY_SKU[normaliseStorySku(sku)];
}

export function hasProductStory(sku: string): boolean {
  return Boolean(getProductStory(sku));
}

export function productStoryRelatedText(story: ProductStory): string[] {
  return story.worksWith.map((item) => `${item.sku}: ${item.reason}`);
}
