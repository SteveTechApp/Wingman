export type ProductRole =
  | "camera"
  | "audio"
  | "avoip"
  | "matrix"
  | "multiview"
  | "videoWall"
  | "presentation"
  | "extension"
  | "wireless"
  | "general";

export type ProductSpec = {
  sku: string;
  name: string;
  family: string;
  category: string;
  productType: string;
  description: string;
  purpose: string;
  summary: string;
  keyFeatures: string[];
  applications: string[];
  ioSummary: string[];
  video: string[];
  audio: string[];
  usb: string[];
  network: string[];
  control: string[];
  power: string[];
  physical: string[];
  checks: string[];
  related: string[];
};

export type ProductNarrative = {
  role: ProductRole;
  headline: string;
  whatItIs: string;
  customerChallenge: string;
  whyItHelps: string;
  whyCustomerCares: string;
  useWhen: string;
  avoidIf: string;
  suggestedWording: string;
  demoPrompt: string;
  askNow: string[];
  diagramSource: string;
  diagramOutput: string;
  visualPrompt: string;
};

const genericWords = new Set([
  "product reference",
  "product selection",
  "sku lookup",
  "compatibility",
  "product",
  "wyrestorm",
  "application",
  "sales",
  "solution",
  "room",
  "system",
  "meeting room",
  "classroom"
]);

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  return "";
}

export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toList).map((item) => item.trim()).filter(Boolean);

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;|\|/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = toText(value);
  return text ? [text] : [];
}

export function cleanUsefulList(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const item = value.replace(/\s+/g, " ").trim();
    const key = item.toLowerCase();

    if (!item) continue;
    if (item.length < 3) continue;
    if (genericWords.has(key)) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
}

function firstText(source: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const text = toText(source[key]);
    if (text) return text;
  }

  return fallback;
}

function firstList(source: Record<string, unknown>, keys: string[], fallback: string[]): string[] {
  for (const key of keys) {
    const values = toList(source[key]);
    if (values.length) return cleanUsefulList(values, fallback.length || 8);
  }

  return fallback;
}

export function extractRawProducts(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  const root = asRecord(data);
  const likelyKeys = ["products", "items", "records", "index", "data", "productIntelligence"];

  for (const key of likelyKeys) {
    const candidate = root[key];

    if (Array.isArray(candidate)) return candidate;

    const nested = asRecord(candidate);
    const values = Object.values(nested);

    if (values.length) return values;
  }

  return Object.values(root);
}

export function normaliseProductRecord(entry: unknown, index: number): ProductSpec | null {
  const source = asRecord(entry);
  if (!Object.keys(source).length) return null;

  const sku = firstText(source, ["sku", "SKU", "model", "partNumber", "productSku", "productCode"], `PRODUCT-${index + 1}`);
  const name = firstText(source, ["name", "title", "productName", "modelName", "shortName"], sku);
  const family = firstText(source, ["family", "series", "range", "productFamily"], "WyreStorm");
  const category = firstText(source, ["category", "productCategory", "type", "application"], "Product");
  const productType = firstText(source, ["productType", "type", "hardwareType", "commercialRole"], category);
  const description = firstText(source, ["description", "summary", "overview", "shortDescription"], "Product description not yet available.");
  const purpose = firstText(source, ["purpose", "salientPoint", "headline", "positioning"], description);
  const summary = firstText(source, ["plainEnglishSummary", "salesSummary", "summary", "description"], purpose);

  return {
    sku,
    name,
    family,
    category,
    productType,
    description,
    purpose,
    summary,
    keyFeatures: firstList(source, ["keyFeatures", "features", "majorFeatures", "featureSummary", "capabilities"], ["Key features not yet fully confirmed in the product intelligence record."]),
    applications: firstList(source, ["applications", "useCases", "applicationFit", "verticals", "rooms", "bestFor"], ["Application fit not yet classified."]),
    ioSummary: firstList(source, ["ioSummary", "iOSummary", "inputsOutputs", "ports", "connectivity", "connections"], ["I/O details are not yet confirmed in the product intelligence record."]),
    video: firstList(source, ["video", "videoInputs", "videoOutputs", "resolution", "hdmi", "hdbaset", "ndi", "avoip"], ["Video specification not yet confirmed in the product intelligence record."]),
    audio: firstList(source, ["audio", "audioInputs", "audioOutputs", "dante", "dsp", "amplifier"], ["Audio specification not yet confirmed or not applicable."]),
    usb: firstList(source, ["usb", "usbInputs", "usbOutputs", "usbC", "host", "device"], ["USB requirement not yet confirmed or not applicable."]),
    network: firstList(source, ["network", "ethernet", "lan", "poe", "poh", "ip"], ["Network requirement not yet confirmed or not applicable."]),
    control: firstList(source, ["control", "rs232", "ir", "cec", "api", "gpio", "relay"], ["Control requirement not yet confirmed or not applicable."]),
    power: firstList(source, ["power", "psu", "consumption", "mains"], ["Power detail must be confirmed from current datasheet."]),
    physical: firstList(source, ["physical", "dimensions", "mounting", "rack", "formFactor", "weight"], ["Physical details must be confirmed from current datasheet."]),
    checks: firstList(source, ["checks", "beforeRecommending", "beforeQuoting", "whatToCheck", "designChecks"], ["Confirm source count, display count, signal type, distance, USB, audio, control, network and power requirements."]),
    related: firstList(source, ["related", "relatedProducts", "alternatives", "companionProducts"], [])
  };
}

export function productText(product: ProductSpec) {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.productType,
    product.description,
    product.purpose,
    product.summary,
    ...product.keyFeatures,
    ...product.applications,
    ...product.ioSummary,
    ...product.video,
    ...product.audio,
    ...product.usb,
    ...product.network,
    ...product.control
  ].join(" ").toLowerCase();
}

export function inferProductRole(product: ProductSpec): ProductRole {
  const text = productText(product);

  if (text.includes("ptz") || text.includes("camera") || text.includes("ndi")) return "camera";
  if (text.includes("amplifier") || text.includes("dante") || text.includes("dsp") || text.includes("speaker")) return "audio";
  if (text.includes("multiview") || text.includes("multi-view") || text.includes("quad")) return "multiview";
  if (text.includes("video wall") || text.includes("videowall") || text.includes("led wall")) return "videoWall";
  if (text.includes("networkhd") || text.includes("avoip") || text.includes("av over ip") || text.includes("encoder") || text.includes("decoder")) return "avoip";
  if (text.includes("matrix")) return "matrix";
  if (text.includes("presentation") || text.includes("usb-c") || text.includes("byod") || text.includes("byom")) return "presentation";
  if (text.includes("hdbaset") || text.includes("extender") || text.includes("transmitter") || text.includes("receiver")) return "extension";
  if (text.includes("wireless") || text.includes("airplay") || text.includes("miracast")) return "wireless";

  return "general";
}

function firstMeaningful(values: string[], fallback: string) {
  const useful = cleanUsefulList(values, 1);
  return useful[0] || fallback;
}

export function buildProductNarrative(product: ProductSpec): ProductNarrative {
  const role = inferProductRole(product);
  const mainApplication = firstMeaningful(product.applications, "the right room or system workflow");
  const mainFeature = firstMeaningful(product.keyFeatures, product.productType);
  const whatItIs = `${product.sku} is a ${product.productType.toLowerCase()} for ${mainApplication.toLowerCase()}.`;

  if (role === "camera") {
    return {
      role,
      headline: "Use this when a basic webcam is not enough.",
      whatItIs,
      customerChallenge: "The customer needs better room coverage, zoom, framing or capture flexibility than a fixed USB webcam can provide.",
      whyItHelps: `${product.sku} gives the design a controllable camera path that can support conferencing, capture, streaming or network video depending on how the room is being used.`,
      whyCustomerCares: "It helps the room feel more professional on calls and gives the system designer more ways to route or capture the camera image.",
      useWhen: "Use it where camera position, zoom, presets, NDI, HDMI or USB connection options matter.",
      avoidIf: "Avoid leading with this if the requirement is only a small personal webcam or if the customer has not confirmed camera location and host connection.",
      suggestedWording: `${product.sku} is a flexible PTZ camera option when the customer needs better room coverage and more connection flexibility than a standard webcam.`,
      demoPrompt: "Suggest a camera demo or evaluation when the customer needs to see the difference between fixed framing and PTZ room coverage.",
      askNow: ["Where will the camera be mounted?", "Is the camera feeding USB, HDMI, NDI or more than one workflow?", "Who controls presets or camera movement?", "What microphone and speaker path is being used?"],
      diagramSource: "Presenter / room participants",
      diagramOutput: "UC host, HDMI system or NDI network",
      visualPrompt: `Create a realistic meeting or teaching space showing ${product.sku} as a PTZ camera mounted with clear sightlines to the participants, with a display, table, room PC or BYOD laptop and simple AV cabling shown conceptually.`
    };
  }

  if (role === "audio") {
    return {
      role,
      headline: "Use this when audio needs proper amplification and network-aware integration.",
      whatItIs,
      customerChallenge: "The customer needs room audio that is reliable, controllable and suitable for the space rather than relying on display speakers or ad-hoc amplification.",
      whyItHelps: `${product.sku} supports a cleaner audio design by combining amplification, processing and integration points that can sit inside a wider AV system.`,
      whyCustomerCares: "It helps make speech, programme audio and room reinforcement easier to manage and more professional for everyday users.",
      useWhen: `Use it where ${mainFeature.toLowerCase()} is relevant and the room needs installed audio rather than simple display audio.`,
      avoidIf: "Avoid positioning it before confirming speaker load, room size, Dante/network requirements and who is responsible for audio tuning.",
      suggestedWording: `${product.sku} is best explained as the audio part of the system that helps make the room sound right, not just another accessory in the rack.`,
      demoPrompt: "Suggest a demo or evaluation where the customer is concerned about clarity, coverage, audio consistency or Dante integration.",
      askNow: ["What speakers are being driven?", "Is Dante or network audio required?", "Who will configure or tune the audio?", "Is this for speech, programme audio or both?"],
      diagramSource: "Audio source / DSP / Dante network",
      diagramOutput: "Room speakers / audio zones",
      visualPrompt: `Create a realistic meeting, classroom or hospitality room showing installed loudspeakers connected to ${product.sku}, with a rack or local equipment position and a simple network/audio path shown conceptually.`
    };
  }

  if (role === "avoip") {
    return {
      role,
      headline: "Use this when the system needs flexible AV routing over the network.",
      whatItIs,
      customerChallenge: "The customer needs sources and displays to work across rooms, zones or a larger site without being limited by a fixed local matrix.",
      whyItHelps: `${product.sku} sits in a NetworkHD-style architecture where endpoints, switching and network planning define the system shape.`,
      whyCustomerCares: "It helps support future expansion, flexible routing and distributed AV where a simple point-to-point connection is not enough.",
      useWhen: "Use it where source/display count, distance, flexibility or site-wide routing justifies AV-over-IP.",
      avoidIf: "Avoid using AVoIP as the default answer for a small local room unless routing, scale or future flexibility makes it necessary.",
      suggestedWording: `${product.sku} is part of a flexible networked AV route when the customer needs more than simple local switching.`,
      demoPrompt: "Suggest a demo where the customer needs to understand routing flexibility, multiview, endpoint behaviour or networked control.",
      askNow: ["How many sources and displays are required?", "Is the AV network already planned?", "Is this 1GbE or 10GbE?", "What latency and quality level is acceptable?"],
      diagramSource: "Sources / encoders",
      diagramOutput: "Network switch / decoders / displays",
      visualPrompt: `Create a clean AV-over-IP system visual showing source devices, ${product.sku}, network switch, controller and displays across multiple room zones.`
    };
  }

  if (role === "multiview") {
    return {
      role,
      headline: "Use this when the customer needs several sources visible at the same time.",
      whatItIs,
      customerChallenge: "The customer does not just need to switch sources; they need to see multiple sources together on one output canvas.",
      whyItHelps: `${product.sku} helps create a combined view so a display, processor or monitoring point can show more than one source at once.`,
      whyCustomerCares: "It makes the display more useful for monitoring, sports, signage, operations or teaching workflows.",
      useWhen: "Use it where multiview is the requirement. Multiple outputs alone does not mean multiview.",
      avoidIf: "Avoid it when the customer simply needs routing to several displays rather than multiple sources on one screen.",
      suggestedWording: `${product.sku} is for showing multiple sources together on one screen, which is different from simply routing one source to one display.`,
      demoPrompt: "Suggest a demo where the customer needs to see layout behaviour, quad view, source composition or processor feed behaviour.",
      askNow: ["How many sources need to be visible at once?", "What layout is required?", "What display or processor receives the output?", "Is this monitoring, signage, teaching or hospitality?"],
      diagramSource: "Multiple HDMI / AV sources",
      diagramOutput: "Single multiview display or processor feed",
      visualPrompt: `Create a realistic room visual showing ${product.sku} feeding a display that shows multiple sources on one screen, suitable for a sports bar, teaching space or control room.`
    };
  }

  if (role === "videoWall") {
    return {
      role,
      headline: "Use this when the customer needs a clear wall-processing path.",
      whatItIs,
      customerChallenge: "The customer needs content to appear correctly across an LCD or LED wall, and the sales user must understand whether this is fixed wall processing or flexible routing.",
      whyItHelps: `${product.sku} helps define the wall behaviour before the design jumps to AVoIP or matrix switching.`,
      whyCustomerCares: "It reduces confusion around wall layout, source behaviour and processor input expectations.",
      useWhen: "Use it where wall layout, source behaviour and display/processor type are central to the requirement.",
      avoidIf: "Avoid finalising the product until wall type, resolution, layout, source behaviour and processor path are confirmed.",
      suggestedWording: `${product.sku} is a wall-processing option when the customer needs a defined way to feed and manage a display wall.`,
      demoPrompt: "Suggest a demo or proof-of-concept where the customer needs to confirm wall layouts, source behaviour or processor integration.",
      askNow: ["Is the wall LCD or LED?", "What is the wall layout?", "How many sources feed the wall?", "Does the wall need one canvas, separate windows or multiview?"],
      diagramSource: "Sources / signage / media players",
      diagramOutput: "LCD wall or LED processor",
      visualPrompt: `Create a realistic visual of an AV room or hospitality space with a display wall fed by ${product.sku}, showing sources and a simple processor path conceptually.`
    };
  }

  if (role === "presentation") {
    return {
      role,
      headline: "Use this when the room needs a simple, user-friendly presentation core.",
      whatItIs,
      customerChallenge: "The customer needs users to connect laptops or room sources without turning the room into a complicated AV system.",
      whyItHelps: `${product.sku} helps centralise the presentation workflow so source selection, display output and any USB/BYOD requirements are easier to explain.`,
      whyCustomerCares: "It can make the room easier to use and reduce support calls.",
      useWhen: "Use it where laptop input, local switching, display output and user experience are the main concerns.",
      avoidIf: "Avoid it where the real requirement is large-scale routing, complex AV-over-IP or specialist video-wall processing.",
      suggestedWording: `${product.sku} is a room-friendly presentation product for customers who want a cleaner way to connect and present.`,
      demoPrompt: "Suggest a demo where the customer wants to test ease of use, source switching or BYOD/BYOM behaviour.",
      askNow: ["How many laptop/source positions are needed?", "Is USB-C required?", "How many displays are in the room?", "Does USB need to follow the selected source?"],
      diagramSource: "Laptop / room source",
      diagramOutput: "Display / projector / UC path",
      visualPrompt: `Create a realistic meeting room showing ${product.sku} as the presentation core between laptops, a room display and any USB or conferencing devices.`
    };
  }

  if (role === "extension") {
    return {
      role,
      headline: "Use this when the main problem is distance or cable path.",
      whatItIs,
      customerChallenge: "The customer needs a signal to travel reliably from source to display without assuming a short HDMI cable will work.",
      whyItHelps: `${product.sku} gives the system a defined extension or transport path that can be checked against distance, resolution and USB needs.`,
      whyCustomerCares: "It makes the installation more predictable and reduces signal-risk surprises.",
      useWhen: "Use it where distance, cable type or remote display/source locations drive the product choice.",
      avoidIf: "Avoid it if the customer actually needs switching, matrix routing, multiview or AV-over-IP flexibility.",
      suggestedWording: `${product.sku} is the transport part of the design, used where the signal path needs to cover distance reliably.`,
      demoPrompt: "Suggest evaluation where cable length, resolution, USB or installation conditions are uncertain.",
      askNow: ["What is the cable distance?", "What cable type is already installed?", "Is USB required?", "What resolution and refresh rate must be supported?"],
      diagramSource: "Source device",
      diagramOutput: "Remote display / projector",
      visualPrompt: `Create a simple room or classroom visual showing ${product.sku} extending AV from a source location to a remote display or projector.`
    };
  }

  return {
    role,
    headline: "Use this when the product role matches the customer's real requirement.",
    whatItIs,
    customerChallenge: "The customer needs a product that solves the actual room or system problem, not just a part number.",
    whyItHelps: `${product.sku} may fit when the application, I/O, signal path and install conditions match its role.`,
    whyCustomerCares: "It gives the customer a clearer reason to consider the product and gives the salesperson a safer way to position it.",
    useWhen: `Use it where ${product.purpose.toLowerCase()}`,
    avoidIf: "Avoid making a firm recommendation until the application, signal path, I/O, distance and control requirements are confirmed.",
    suggestedWording: `${product.sku} is worth considering where the customer requirement matches its core role: ${product.purpose}`,
    demoPrompt: "Suggest a demo or evaluation where the customer needs confidence before choosing the product.",
    askNow: ["What job does the customer expect this product to do?", "What sources and displays are involved?", "Are USB, audio, network or control requirements important?", "What would make the customer confident enough to proceed?"],
    diagramSource: "Customer source / system input",
    diagramOutput: "Display / room system / destination",
    visualPrompt: `Create a realistic AV room concept showing ${product.sku} used in context with labelled source, WyreStorm device, display, network/control and any TBC devices.`
  };
}