
export type ImportIntent = "room" | "product";

export type ExtractedRequirements = {
  intent: ImportIntent;
  summary: string[];

  roomType?: string;
  displays?: number;
  endpoints?: number;

  byodUsbC?: boolean;
  resolution?: "1080p" | "4K" | "4K60" | "unknown";
  distanceHint?: "short" | "medium" | "long" | "unknown";
  switchingNeeded?: boolean;

  notes: string[];
};

function pickRoomType(t: string): string | undefined {
  const s = t.toLowerCase();
  if (s.includes("boardroom")) return "Boardroom";
  if (s.includes("classroom") || s.includes("lecture")) return "Education space";
  if (s.includes("training")) return "Training room";
  if (s.includes("huddle")) return "Huddle room";
  if (s.includes("auditorium")) return "Auditorium";
  if (s.includes("divisible")) return "Divisible room";
  if (s.includes("sports bar") || s.includes("bar") || s.includes("hospitality")) return "Hospitality venue";
  return undefined;
}

function inferIntent(raw: string, roomType?: string, displays?: number, endpoints?: number, switchingNeeded?: boolean): ImportIntent {
  const s = (raw || "").toLowerCase();

  // Room signals
  const roomWords =
    s.includes("room") ||
    s.includes("space") ||
    s.includes("boardroom") ||
    s.includes("classroom") ||
    s.includes("auditorium") ||
    s.includes("training room") ||
    s.includes("meeting room") ||
    s.includes("divisible");

  const systemWords =
    s.includes("av system") ||
    s.includes("full solution") ||
    s.includes("complete solution") ||
    s.includes("scope of works") ||
    s.includes("tender") ||
    s.includes("rfq") ||
    s.includes("proposal") ||
    s.includes("project");

  const multiCount = (typeof displays === "number" && displays >= 2) || (typeof endpoints === "number" && endpoints >= 4) || !!switchingNeeded;

  // Product signals
  const productWords =
    s.includes("need a") ||
    s.includes("looking for") ||
    s.includes("single") ||
    s.includes("replacement") ||
    s.includes("part number") ||
    s.includes("sku") ||
    s.includes("model");

  const deviceWords =
    s.includes("encoder") ||
    s.includes("decoder") ||
    s.includes("extender") ||
    s.includes("transmitter") ||
    s.includes("receiver") ||
    s.includes("switcher") ||
    s.includes("matrix") ||
    s.includes("splitter") ||
    s.includes("scaler");

  // Decision
  if (roomType || roomWords || systemWords || multiCount) return "room";
  if (productWords || deviceWords) return "product";

  // Default: if it's ambiguous, assume product search (less prescriptive)
  return "product";
}

export function extractRequirements(rawText: string): ExtractedRequirements {
  const t = (rawText || "").trim();
  const s = t.toLowerCase();

  const displays = (() => {
    const m = s.match(/(\d+)\s*(displays|screens|tvs|monitors|projectors)/);
    if (m) return Number(m[1]);
    if (s.includes("dual display") || s.includes("two displays")) return 2;
    return undefined;
  })();

  const endpoints = (() => {
    const m = s.match(/(\d+)\s*(endpoints|receivers|decoders|rooms|zones)/);
    if (m) return Number(m[1]);
    return undefined;
  })();

  const byodUsbC =
    s.includes("usb-c") ||
    s.includes("usbc") ||
    s.includes("byod") ||
    s.includes("byom") ||
    s.includes("bring your own");

  const resolution = (() => {
    if (s.includes("4k60") || s.includes("4k 60") || s.includes("60hz")) return "4K60";
    if (s.includes("4k") || s.includes("uhd")) return "4K";
    if (s.includes("1080") || s.includes("full hd")) return "1080p";
    return "unknown";
  })();

  const distanceHint = (() => {
    if (s.match(/\b(80|100|120|150)\s*m\b/) || s.includes("long distance") || s.includes("campus")) return "long";
    if (s.match(/\b(30|40|50|60)\s*m\b/) || s.includes("across the building")) return "medium";
    if (s.includes("same room") || s.includes("short run")) return "short";
    return "unknown";
  })();

  const switchingNeeded =
    s.includes("matrix") ||
    s.includes("switch") ||
    s.includes("switching") ||
    s.includes("multiple sources") ||
    s.includes("select between");

  const roomType = pickRoomType(t);
  const intent = inferIntent(t, roomType, displays, endpoints, switchingNeeded);

  const summary: string[] = [];
  summary.push("Intent: " + (intent === "room" ? "Room solution" : "Individual product"));
  if (roomType) summary.push("Space: " + roomType);
  if (typeof displays === "number") summary.push("Displays: " + displays);
  if (typeof endpoints === "number") summary.push("Endpoints: " + endpoints);
  if (byodUsbC) summary.push("USB-C / BYOD present");
  if (resolution !== "unknown") summary.push("Resolution: " + resolution);
  if (distanceHint !== "unknown") summary.push("Distance: " + distanceHint);
  if (switchingNeeded) summary.push("Switching required");

  const notes: string[] = [];
  if (!t) notes.push("No text provided.");
  if (intent === "room") {
    if (!roomType) notes.push("Room type not detected (boardroom/classroom/etc).");
    if (!displays) notes.push("No explicit display count detected.");
    if (!endpoints) notes.push("No explicit endpoint count detected.");
  } else {
    notes.push("Product mode: tiering is suppressed. Results are ranked matches.");
  }
  if (resolution === "unknown") notes.push("No explicit resolution requirement detected.");

  return {
    intent,
    summary,
    roomType,
    displays,
    endpoints,
    byodUsbC,
    resolution,
    distanceHint,
    switchingNeeded,
    notes
  };
}



