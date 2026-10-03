// Product Call Cards sales-helper copy. Given a product view-model, this builds
// the salesperson-facing "how to sell" guidance: role classification, plain
// role naming, real-world jobs, spec watch-outs, fit line, use/avoid triggers,
// proof points and discovery questions. Extracted verbatim from
// ProductCallCardsPage.tsx and locked by
// productCallCardSalesHelper.characterization.test.ts.

import type {
  ProductCard,
  ProductSalesHelperCopy,
  ProductSalesHelperRole,
} from "./productCallCardTypes";
import { cleanText, unique } from "./productCallCardText";

export function productRoleForSalesHelper(product: ProductCard): ProductSalesHelperRole {
  const sku = product.sku.toUpperCase();
  const text = `${product.sku} ${product.name} ${product.family} ${product.category} ${product.description} ${product.fit} ${product.tags.join(" ")}`.toLowerCase();
  const familyText = `${product.name} ${product.family} ${product.category} ${product.tags.join(" ")}`.toLowerCase();

  if (sku === "NHD-0401-MV") {
    return "multiview";
  }

  if (sku.startsWith("SW-0204-VW") || sku.startsWith("SW-0206-VW")) {
    return "videoWall";
  }

  if (sku.startsWith("AMP-")) {
    return "audio";
  }

  if (sku.startsWith("NHD-")) {
    return "networkhd";
  }

  if (sku.startsWith("MX-") || sku.startsWith("MXV-")) {
    return "matrix";
  }

  if (sku.startsWith("SW-")) {
    return "presentation";
  }

  if (sku.startsWith("APO-")) {
    return "uc";
  }

  if (sku.startsWith("EX-") || sku.startsWith("RX-") || sku.startsWith("TX-")) {
    return "extender";
  }

  if (sku.startsWith("CAM-")) {
    return "camera";
  }

  if (sku.startsWith("SYN-")) {
    return "control";
  }

  if (/\b(video wall|videowall|wall processor)\b/.test(text)) {
    return "videoWall";
  }

  if (/\b(multiview|multi-view|quad view)\b/.test(text)) {
    return "multiview";
  }

  if (/\b(networkhd|avoip|av-over-ip|encoder|decoder|transceiver)\b/.test(text)) {
    return "networkhd";
  }

  if (/\b(matrix|routed switching)\b/.test(familyText)) {
    return "matrix";
  }

  if (/\b(presentation|usb-c|wireless presentation|switcher|byod)\b/.test(familyText)) {
    return "presentation";
  }

  if (/\b(uc|byom|video bar|soundbar|conference|speakerphone)\b/.test(familyText)) {
    return "uc";
  }

  if (/\b(extender|extension|hdbaset|hdbt|transmitter|receiver)\b/.test(familyText)) {
    return "extender";
  }

  if (/\b(camera|ptz|ndi)\b/.test(familyText)) {
    return "camera";
  }

  if (/\b(control|touch panel|controller|relay|gpio)\b/.test(familyText)) {
    return "control";
  }

  if (/\b(audio|amplifier|dante|aes67|speaker|dsp)\b/.test(familyText)) {
    return "audio";
  }

  if (/\b(cable|mount|bracket|psu|power supply|accessory|dongle)\b/.test(familyText)) {
    return "accessory";
  }

  return "general";
}

function firstSentence(value: string): string {
  const clean = cleanText(value).replace(/\s+/g, " ");

  if (!clean) {
    return "";
  }

  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : clean;
}

function usefulProductLine(value: string): string {
  const sentence = firstSentence(value);

  if (!sentence) {
    return "";
  }

  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function roleName(role: ProductSalesHelperRole, product: ProductCard): string {
  switch (role) {
    case "audio":
      return "an audio amplifier or audio integration product";
    case "networkhd":
      return "a NetworkHD AV-over-IP product";
    case "matrix":
      return "a fixed video routing product";
    case "presentation":
      return "a room presentation switcher";
    case "uc":
      return "a UC and BYOD collaboration product";
    case "extender":
      return "a point-to-point signal extension product";
    case "camera":
      return "a meeting-room camera product";
    case "videoWall":
      return "a video-wall processing product";
    case "multiview":
      return "a multiview processing product";
    case "control":
      return "a room-control product";
    case "accessory":
      return "a supporting accessory or service part";
    default:
      return `a ${product.family.toLowerCase()} product`;
  }
}

function roleJobLine(role: ProductSalesHelperRole): string {
  switch (role) {
    case "audio":
      return "turning the room's audio requirement into the right speaker load, zones, sources and control path.";
    case "networkhd":
      return "moving video, USB, audio or control across a managed AV network when the system needs to scale beyond a fixed switch.";
    case "matrix":
      return "routing several sources to several displays from a known rack-and-room layout.";
    case "presentation":
      return "letting users connect laptops, cast wirelessly, pick the right source and get content onto the display without designing a whole matrix or AV-over-IP system.";
    case "uc":
      return "making the room usable for calls by joining camera, microphone, speaker and laptop or room-computer workflows.";
    case "extender":
      return "getting one source to one display over distance while carrying the required control, audio, USB or network pass-through.";
    case "camera":
      return "capturing the room properly for conferencing, teaching, streaming or recording.";
    case "videoWall":
      return "turning multiple screens or a processor input into the display canvas the customer expects.";
    case "multiview":
      return "showing several live sources together on one output for monitoring, teaching, production or confidence viewing.";
    case "control":
      return "giving staff a repeatable room action instead of a pile of remotes and manual device settings.";
    case "accessory":
      return "making the parent system installable, serviceable or complete.";
    default:
      return "matching the product family to the real room problem before a quote is written.";
  }
}

function roleFitTrigger(role: ProductSalesHelperRole): string {
  switch (role) {
    case "audio":
      return "speaker coverage, amplifier loading, source selection or audio-zone control is part of the outcome";
    case "networkhd":
      return "sources and displays are spread out, expected to grow, or need flexible routing through a managed network";
    case "matrix":
      return "the source and display count is known and a fixed rack-based router is simpler than AV-over-IP";
    case "presentation":
      return "the room is really about easy laptop, wireless or USB-C presentation for everyday users";
    case "uc":
      return "meetings, BYOD/BYOM conferencing or room PC connectivity are central to the brief";
    case "extender":
      return "a source and display are in different locations and the cable path must carry more than a short HDMI lead can handle";
    case "camera":
      return "the quality of the far-end meeting view, teaching capture or stream depends on the camera choice";
    case "videoWall":
      return "the customer is asking for one image, repeatable layouts or multiple sources across a display wall";
    case "multiview":
      return "operators need to see multiple sources at the same time on one screen";
    case "control":
      return "the sale needs a simple user action such as present, call, source select, room on or room off";
    case "accessory":
      return "the main product cannot be installed or used correctly without the supporting part";
    default:
      return "the room problem maps to this product family after the dependencies are checked";
  }
}

function roleRealWorldJobs(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "Drive the loudspeakers or audio zone the rest of the room depends on.",
        "Translate speaker quantity, impedance or 70V/100V taps into a quoteable amplifier choice.",
        "Confirm whether the room needs simple audio, DSP integration, Dante/AES67, mute control or remote level control.",
      ];
    case "networkhd":
      return [
        "Put AV sources and displays onto the network so routing can be changed without rewiring the building.",
        "Support larger or growing systems where fixed input/output counts would become restrictive.",
        "Expose the network design questions early: switches, controller, VLANs, bandwidth, latency and who owns configuration.",
      ];
    case "matrix":
      return [
        "Take several sources in the rack and route them to several known displays.",
        "Keep a contained room, bar, venue or house system simpler than a networked AV design.",
        "Bring HDBaseT receiver, distance, audio breakout and control requirements into the quote conversation.",
      ];
    case "presentation":
      return [
        "Give users a reliable way to connect laptops by HDMI, USB-C, wireless sharing or a mix.",
        "Keep the room focused on presenting content rather than multi-room routing.",
        "Find out whether this is presentation-only, BYOD/BYOM conferencing, or a room that also needs a camera and USB path.",
      ];
    case "uc":
      return [
        "Connect the camera, microphone, speaker and host computer path so meetings actually work in the room.",
        "Clarify whether people bring a laptop, use a room PC, use Teams/Zoom hardware or mix operating modes.",
        "Check USB version, host location, cable distance and certified-platform expectations before quote.",
      ];
    case "extender":
      return [
        "Move HDMI or AV signals between a source and display when a direct cable is not practical.",
        "Carry the supporting signals the room needs, such as IR, RS-232, Ethernet, USB, audio or power.",
        "Validate the transmitter/receiver pairing and cable path before treating it as a simple add-on.",
      ];
    case "camera":
      return [
        "Frame the room so remote participants or viewers can actually see the people or content that matters.",
        "Match the camera output to the rest of the system: USB, HDMI, NDI or a bridge/switcher input.",
        "Confirm room size, mounting position, field of view and whether tracking or PTZ presets are needed.",
      ];
    case "videoWall":
      return [
        "Create the display canvas, layout presets or per-screen content the customer expects from the wall.",
        "Separate video-wall processing from basic source switching early in the conversation.",
        "Confirm wall size, source count, aspect ratio, bezel/LED processor behaviour and control method.",
      ];
    case "multiview":
      return [
        "Show several sources on one screen at the same time for monitoring or confidence viewing.",
        "Clarify whether the customer needs fixed layouts, live layout changes or simply multiple outputs.",
        "Confirm where the multiview output goes: display, projector, recorder, streamer or LED processor.",
      ];
    case "control":
      return [
        "Turn the room into simple repeatable actions rather than manual source, display and audio steps.",
        "Identify which devices need IP, RS-232, IR, relay or GPIO control.",
        "Confirm who will configure, maintain and support the control interface after install.",
      ];
    case "accessory":
      return [
        "Complete the parent system with the correct cable, mount, power supply, dongle or service part.",
        "Prevent small compatibility misses from becoming install-day problems.",
        "Confirm the exact host product and install condition before quoting it alone.",
      ];
    default:
      return [
        "Use the SKU as a direction, then translate the room problem into source, display, audio, USB, control and network requirements.",
        "Check the product's role in the full system before treating it as a standalone answer.",
        "Use the technical detail tab to catch missing datasheet items before quote.",
      ];
  }
}

function roleUseWhen(role: ProductSalesHelperRole, product: ProductCard): string[] {
  switch (role) {
    case "audio":
      return [
        "The brief mentions speakers, ceiling audio, background music, paging, classroom voice reinforcement or meeting-room audio.",
        "You can confirm speaker type, total load, zone count and the source feeding the amplifier.",
        "Control expectations are clear enough to quote: front-panel, IP, RS-232, GPIO, DSP or touch-panel.",
      ];
    case "networkhd":
      return [
        "The system needs flexible source-to-display routing across rooms, floors or future phases.",
        "The network owner can confirm switch model, bandwidth, VLAN/QoS plan and controller placement.",
        "The brief includes functions such as USB, video wall, multiview, Dante, low latency or central control.",
      ];
    case "matrix":
      return [
        "The number of sources and displays is known and unlikely to change significantly.",
        "A rack-based router with dedicated outputs is easier for the customer than a networked AV system.",
        "Cable distances, HDBaseT receivers and control paths can be confirmed before quote.",
      ];
    case "presentation":
      return [
        "The customer needs an easy front-of-room experience for guest laptops or local room sources.",
        "Wired, USB-C, HDMI or wireless sharing is part of the day-to-day user workflow.",
        "The room does not need a full matrix or NetworkHD design just to solve the presentation problem.",
      ];
    case "uc":
      return [
        "The sale is about real meetings, not only showing laptop content on a display.",
        "Camera, microphone, speaker and host-computer ownership can be mapped clearly.",
        "The customer can state whether the room is BYOD, BYOM, room PC, appliance-based or mixed mode.",
      ];
    case "extender":
      return [
        "There is a clear source-to-display cable path that is too long or too awkward for direct HDMI.",
        "The install needs supporting functions such as USB, Ethernet, IR, RS-232, PoH/PoE or audio return.",
        "The transmitter, receiver and cable category can be confirmed as a matched path.",
      ];
    case "camera":
      return [
        "The meeting or teaching experience depends on how well the room is seen by remote participants.",
        "The required output format and host device are known.",
        "Mounting position, viewing angle and control/tracking expectations are part of the brief.",
      ];
    case "videoWall":
      return [
        "The customer is asking for a display wall, canvas, presets or source layouts across multiple screens.",
        "Wall size, source count and control expectations are known enough to validate the processor path.",
        "A dedicated wall processor is a cleaner fit than forcing the job through a simple switcher.",
      ];
    case "multiview":
      return [
        "A user needs to monitor several sources at the same time on one display.",
        "The multiview output destination and layout expectations are clear.",
        "The customer is not really asking for independent routed outputs or a full video wall.",
      ];
    case "control":
      return [
        "The room needs a repeatable user interface for source select, display power, audio level or room mode.",
        "The controlled devices and protocols are known.",
        "Someone can own configuration, updates and support after installation.",
      ];
    case "accessory":
      return [
        "The parent product and compatibility path are known.",
        "The accessory solves a specific install, service, power, mounting or connection need.",
        "It is being quoted with the main system rather than sold as a vague catch-all item.",
      ];
    default:
      return [
        `The requirement genuinely maps to ${product.family} rather than a neighbouring product family.`,
        "The source, display, USB, audio, control and network dependencies have been checked.",
        "The customer can explain the real user workflow, not just a requested part number.",
      ];
  }
}

function roleAvoidWhen(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "Speaker impedance, tap settings, zone count or total load are unknown.",
        "The room needs DSP, conferencing echo cancellation or certified UC audio that this SKU does not provide by itself.",
      ];
    case "networkhd":
      return [
        "The network cannot be specified, configured or owned by the AV team or IT partner.",
        "The job is a small fixed I/O room where a matrix, extender or presentation switcher is cleaner.",
      ];
    case "matrix":
      return [
        "The source/display count is likely to change or the customer wants flexible routing across many rooms.",
        "The customer actually needs AV-over-IP features such as scalable routing, video wall zones or network distribution.",
      ];
    case "presentation":
      return [
        "The requirement is really a certified UC appliance, room video bar or managed Teams/Zoom room.",
        "The customer needs multi-room routing, independent display routing or a large distributed system.",
      ];
    case "uc":
      return [
        "The job is only laptop-to-screen presentation with no camera, microphone or call workflow.",
        "Platform certification, USB cable distance or host ownership cannot be confirmed.",
      ];
    case "extender":
      return [
        "The customer needs many-to-many routing rather than one source to one display.",
        "Cable distance, cable quality or transmitter/receiver pairing is uncertain.",
      ];
    case "camera":
      return [
        "The room already has an approved camera path and this SKU is being added only because the word conferencing appears.",
        "Mounting, field of view, output type or host integration are unknown.",
      ];
    case "videoWall":
      return [
        "The customer only needs one display or mirrored displays.",
        "The required layouts, canvas size or source count are not understood.",
      ];
    case "multiview":
      return [
        "The customer needs independent outputs rather than several sources on one output.",
        "The destination device, layout or control expectation is unknown.",
      ];
    case "control":
      return [
        "Nobody has identified the controlled devices or supported control protocols.",
        "The customer needs custom automation beyond the product or project scope.",
      ];
    case "accessory":
      return [
        "The parent SKU or compatibility path is not known.",
        "It is being used to answer the main system requirement instead of completing a known design.",
      ];
    default:
      return [
        "The SKU is only being chosen because it sounds close to the requirement.",
        "The technical detail panel is missing the values the quote depends on.",
      ];
  }
}

function roleDiscoveryQuestions(role: ProductSalesHelperRole): string[] {
  switch (role) {
    case "audio":
      return [
        "What speaker type and quantity are we driving, and is it Low Z, 70V/100V or mixed?",
        "How many audio zones are required, and do they need independent level or source control?",
        "What is feeding the amplifier: HDMI audio, analogue, DSP, Dante/AES67 or a microphone system?",
      ];
    case "networkhd":
      return [
        "How many sources and displays are needed now, and what growth should we design for?",
        "Who owns the network switch configuration, VLANs, bandwidth and controller placement?",
        "Do they need USB, video wall, multiview, Dante, low latency or control integration?",
      ];
    case "matrix":
      return [
        "How many independent sources and displays are required, not including local monitor loops?",
        "Which displays are local HDMI and which need HDBaseT receivers or longer cable runs?",
        "What control method does the customer expect: front panel, IR, RS-232, IP or touch panel?",
      ];
    case "presentation":
      return [
        "How do users connect in a normal week: HDMI, USB-C, wireless, guest laptop, room PC or all of these?",
        "Is this room presentation-only, or does it also need BYOD/BYOM conferencing with camera and USB devices?",
        "How many displays are in the room, and do outputs need to mirror or behave independently?",
        "Does IT allow wireless sharing, and are there required wireless platforms or network policies?",
      ];
    case "uc":
      return [
        "Is the customer bringing a laptop, using a room PC, using a Teams/Zoom appliance or mixing workflows?",
        "Where are the camera, microphone, speaker and USB host located?",
        "What USB version and cable distance does the room need?",
        "Is platform certification or managed-room behaviour required?",
      ];
    case "extender":
      return [
        "What source is being extended to what display, and how far apart are they?",
        "What else must travel with video: USB, IR, RS-232, Ethernet, audio or power?",
        "What cable type and condition is available in the route?",
      ];
    case "camera":
      return [
        "How large is the room and where will the camera be mounted?",
        "What output does the host system need: USB, HDMI, NDI or another bridge path?",
        "Do they need PTZ presets, speaker tracking, auto-framing or a fixed shot?",
      ];
    case "videoWall":
      return [
        "What is the wall size, display type and aspect ratio?",
        "Do they need one full image, fixed presets, multiple sources or per-screen content?",
        "How will the wall be controlled day to day?",
      ];
    case "multiview":
      return [
        "How many sources need to be visible on one screen at the same time?",
        "Does the operator need fixed layouts or live layout changes?",
        "Where does the multiview output go: monitor, projector, recorder, streamer or processor?",
      ];
    case "control":
      return [
        "Which devices need to be controlled and by what protocols?",
        "What actions should the operator see: present, call, source select, room on/off or presets?",
        "Who will configure and support the system after handover?",
      ];
    case "accessory":
      return [
        "Which parent SKU is this accessory being used with?",
        "What exact function is it completing: power, mounting, cable, USB, service access or adapter?",
        "Is the required length, connector, region or compatibility confirmed?",
      ];
    default:
      return [
        "What real room problem is this SKU solving?",
        "How many sources, displays and users are involved?",
        "Is USB, audio, control, network or platform certification part of the requirement?",
      ];
  }
}

function roleProofPoints(role: ProductSalesHelperRole, product: ProductCard): string[] {
  switch (role) {
    case "presentation":
      return [
        "Keeps the sale anchored on user workflow: connect, present, share, leave.",
        "Useful when the room needs presentation switching without the cost or complexity of full routing infrastructure.",
      ];
    case "uc":
      return [
        "Keeps camera, audio and USB ownership in the conversation instead of only counting HDMI inputs.",
        "Helps separate a real collaboration room from a presentation-only room.",
      ];
    case "networkhd":
      return [
        "Scales better than fixed I/O when the project needs flexible routing or future expansion.",
        "Forces the network and controller dependencies to be qualified before quote.",
      ];
    case "matrix":
      return [
        "A strong direction when the system has known fixed I/O and a clear rack-to-display topology.",
        "Keeps the install understandable for contained spaces that do not need networked AV.",
      ];
    case "audio":
      return [
        "Makes the quote depend on real speaker load and source/control requirements, not guesswork.",
        "Helps catch 70V/100V, Low Z and zone-count mistakes before install.",
      ];
    case "extender":
      return [
        "Good fit when the job is distance and signal transport rather than source routing.",
        "The right questions quickly reveal whether USB, control, power or audio pass-through changes the SKU choice.",
      ];
    case "camera":
      return [
        "Keeps the discussion tied to room coverage and host compatibility.",
        "Avoids selling a camera before field of view, mounting and output path are understood.",
      ];
    case "videoWall":
      return [
        "Moves the conversation from screen count to canvas, layouts, source count and control.",
        "Helps avoid under-specifying a wall with a simple switcher.",
      ];
    case "multiview":
      return [
        "Clear fit when the application needs simultaneous monitoring on one output.",
        "Separates multiview from independent routed outputs or video-wall processing.",
      ];
    case "control":
      return [
        "Turns a technical pile of devices into simple repeatable room actions.",
        "Forces device protocol and support ownership to be confirmed.",
      ];
    case "accessory":
      return [
        "Reduces install friction by checking compatibility with the parent SKU.",
        "Keeps accessories attached to a real system need rather than quoted in isolation.",
      ];
    default:
      return [
        `Treat ${product.sku} as a direction until the application and dependencies are confirmed.`,
        "The strongest sales proof is the fit between the SKU, the room workflow and the missing technical checks.",
      ];
  }
}

function roleSpecificationWatchOuts(
  role: ProductSalesHelperRole,
  productChecks: string[],
): string[] {
  const generalChecks = [
    ...productChecks,
    "If the detail panel does not show the values the quote depends on, treat that as a datasheet check before committing the SKU.",
  ];

  switch (role) {
    case "presentation":
      return unique([
        "Confirm actual input mix, wireless policy, USB path, display output behaviour and whether conferencing is part of the same room.",
        "Do not assume a presentation switcher replaces a UC appliance, matrix or NetworkHD design.",
        ...generalChecks,
      ]);
    case "uc":
      return unique([
        "Confirm host mode, USB version, cable distance, camera/mic/speaker ownership and platform certification expectations.",
        "Do not quote from the word conferencing alone; map the complete BYOD/BYOM or room-PC workflow.",
        ...generalChecks,
      ]);
    case "networkhd":
      return unique([
        "Confirm series compatibility, controller, switch model, bandwidth/VLAN design, latency and any USB/Dante/video-wall requirements.",
        "Do not mix NetworkHD series or assume the customer's existing network is ready without evidence.",
        ...generalChecks,
      ]);
    case "matrix":
      return unique([
        "Confirm true independent source/display count, HDBaseT receiver need, distance, audio breakout and control method.",
        "Do not count mirrored or local monitor outputs as independent routed outputs.",
        ...generalChecks,
      ]);
    case "audio":
      return unique([
        "Confirm speaker type, impedance/tap settings, total load, zones, source type and control requirement.",
        "Do not quote power output without matching it to the loudspeaker load and install topology.",
        ...generalChecks,
      ]);
    case "extender":
      return unique([
        "Confirm transmitter/receiver pairing, cable category, distance, resolution, power method and required pass-through signals.",
        "Do not treat every extender as interchangeable; USB, control, Ethernet and audio support vary by SKU.",
        ...generalChecks,
      ]);
    case "camera":
      return unique([
        "Confirm output type, host compatibility, room size, mounting position, field of view, tracking and control expectations.",
        "Do not quote the camera without knowing how it lands in the meeting, AV or streaming chain.",
        ...generalChecks,
      ]);
    case "videoWall":
      return unique([
        "Confirm wall size, canvas/layouts, source count, display/LED processor behaviour, scaling and control.",
        "Do not assume a video wall means simple mirrored outputs.",
        ...generalChecks,
      ]);
    case "multiview":
      return unique([
        "Confirm input count, output destination, layout control and whether the customer actually needs independent routed outputs instead.",
        "Do not confuse multiview monitoring with matrix routing or video-wall processing.",
        ...generalChecks,
      ]);
    case "control":
      return unique([
        "Confirm device protocols, required user actions, configuration ownership and support responsibility.",
        "Do not quote control until the controlled devices and desired room states are known.",
        ...generalChecks,
      ]);
    case "accessory":
      return unique([
        "Confirm parent SKU compatibility, exact connector/region/length/mounting need and whether it is included elsewhere.",
        "Do not let an accessory stand in for the main system solution.",
        ...generalChecks,
      ]);
    default:
      return unique(generalChecks);
  }
}

export function buildProductSalesHelperCopy(
  product: ProductCard,
  knownApplication: string,
  productChecks: string[],
): ProductSalesHelperCopy {
  const role = productRoleForSalesHelper(product);
  const application = cleanText(knownApplication) || "this opportunity";
  const plainDescription =
    usefulProductLine(product.description) ||
    usefulProductLine(product.fit) ||
    `${product.sku} is a ${product.family.toLowerCase()} product direction.`;
  const fitLine =
    usefulProductLine(product.fit) ||
    usefulProductLine(product.openingLine) ||
    plainDescription;
  const roleQuestions = roleDiscoveryQuestions(role);
  const discoveryQuestions = unique([
    ...(product.questions || []),
    ...roleQuestions,
    ...productChecks,
  ]).slice(0, 7);
  const firstQuestion =
    discoveryQuestions[0] ||
    "What does the room need to do on a normal day?";

  return {
    whatItDoes: `${product.sku} is ${roleName(role, product)}. ${plainDescription} In salesperson terms, it is there for ${roleJobLine(role)}`,
    realWorldJobs: unique([
      ...roleRealWorldJobs(role),
      `In the product record, the useful starting point is: ${fitLine}`,
    ]).slice(0, 4),
    specWatchOuts: roleSpecificationWatchOuts(role, productChecks).slice(0, 5),
    fitHere: `${product.sku} fits ${application} when ${roleFitTrigger(role)}. ${fitLine} Treat it as a strong direction, not a final quote line, until the checks below are answered.`,
    useWhen: roleUseWhen(role, product).slice(0, 4),
    avoidWhen: roleAvoidWhen(role).slice(0, 3),
    sayThis: `${usefulProductLine(product.openingLine) || fitLine} Then qualify it plainly: "${firstQuestion}"`,
    proofPoints: unique([
      ...roleProofPoints(role, product),
      ...(product.proofPoints || []),
    ]).slice(0, 5),
    discoveryQuestions,
  };
}
