import type { CatalogProduct } from "@/catalog/types";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import type { StoredProject } from "@/features/projects/projectStore";
import {
  ROOM_TEMPLATE_LIBRARY,
  roomTemplateSearchBlob,
  type RoomTemplateScenario,
} from "@/features/templates/roomTemplateLibrary";

export type CatalogSolutionTrackId =
  | "presentation-byod"
  | "display-extension"
  | "matrix-routing"
  | "networked-distribution"
  | "usb-collaboration"
  | "video-wall";

export type CatalogSolutionTrack = {
  id: CatalogSolutionTrackId;
  title: string;
  summary: string;
  detail: string;
  families: string[];
  keywords: string[];
  nextRoute: string;
};

export type CatalogRecommendation = {
  product: CatalogProduct;
  score: number;
  reasons: string[];
  highlights: string[];
};

const FAMILY_ALIASES: Record<string, string[]> = {
  apollo: ["apollo", "presentation switcher", "switcher", "presentation", "conference"],
  hdbaset: ["hdbaset", "transmitter", "receiver", "extender", "tx", "rx", "70m", "100m"],
  avoip: ["avoip", "networkhd", "encoder", "decoder", "multicast", "10g", "1g", "sdvoe"],
  matrix: ["matrix", "seamless", "multiview", "switcher", "routing"],
  usbextension: ["usb extension", "usb", "byod", "byom", "camera sharing", "peripheral", "kvm"],
  videowall: ["video wall", "videowall", "canvas", "processor", "multiview", "wall"],
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe(values: unknown[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
}

function buildProjectSearchBlob(project?: StoredProject | null): string {
  if (!project) return "";

  return [
    project.name,
    project.customer,
    project.site,
    project.roomName,
    project.notes,
    project.discovery?.applicationType,
    project.discovery?.projectScope,
    project.discovery?.customerOutcome,
    project.discovery?.workflowTrack,
    project.discovery?.featureRequirements,
    project.template?.application,
    project.template?.summary,
    project.template?.solutionSummary,
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function buildProductBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.technology,
    product.topology,
    product.role,
    product.directionality,
    product.transport,
    product.outputBehavior,
    product.ioSummary,
    product.controlSummary,
    product.notes,
    ...(product.features || []),
    ...(product.normalizedTags || []),
    ...(product.control || []),
    ...(product.audio || []),
    ...(product.inputs || []).map((item) => item.type),
    ...(product.outputs || []).map((item) => item.type),
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function trackPriority(track: CatalogSolutionTrack, families: string[]): number {
  const normalizedFamilies = new Set(families.map((item) => normalizeKey(item)));
  let score = 0;

  for (const family of track.families) {
    if (normalizedFamilies.has(normalizeKey(family))) {
      score += 12;
    }
  }

  return score;
}

function matchesFamily(product: CatalogProduct, family: string): boolean {
  const blob = buildProductBlob(product);
  const aliases = FAMILY_ALIASES[normalizeKey(family)] || [family.toLowerCase()];
  return aliases.some((alias) => blob.includes(alias.toLowerCase()));
}

function matchesKeyword(blob: string, keyword: string): boolean {
  const query = keyword.toLowerCase();
  if (query.includes(" ")) return blob.includes(query);
  return tokenize(blob).includes(query) || blob.includes(query);
}

function formatPorts(ports?: Array<{ type: string; count: number }>, label?: "in" | "out"): string[] {
  return (ports || [])
    .map((port) => {
      const type = tidy(port.type);
      const count = Math.max(0, Number(port.count) || 0);
      if (!type || count <= 0) return "";
      return `${count}x ${type}${label ? ` ${label}` : ""}`;
    })
    .filter(Boolean);
}

function buildProductHighlights(product: CatalogProduct): string[] {
  const distance =
    Number(product.distance?.meters4k || 0) ||
    Number(product.distance?.meters1080p || 0) ||
    Number(product.distance?.meters || 0);

  return dedupe(
    [
      product.transport !== "Unknown" ? product.transport : "",
      product.video?.maxResolution,
      product.video?.bandwidthGbps ? `${product.video.bandwidthGbps}Gbps` : "",
      distance > 0 ? `${distance}m reach` : "",
      product.usb?.cameraSharing ? "Camera sharing" : "",
      product.usb?.peripheralSwitching ? "USB switching" : "",
      product.usb?.kvmSupport ? "KVM ready" : "",
      product.wireless?.wirelessPresentation ? "Wireless presentation" : "",
      product.wireless?.byod ? "BYOD" : "",
      product.wireless?.byom ? "BYOM" : "",
      product.integration?.lanControl ? "LAN control" : "",
      ...formatPorts(product.inputs, "in"),
      ...formatPorts(product.outputs, "out"),
      ...(product.features || []),
    ],
    6,
  );
}

export const CATALOG_SOLUTION_TRACKS: CatalogSolutionTrack[] = [
  {
    id: "presentation-byod",
    title: "Presentation and BYOD switching",
    summary: "Best when the room needs an easy front end for laptops, wireless share, and self-serve meetings.",
    detail: "This track prioritizes presentation switchers, collaboration-ready room hubs, and practical meeting-room signal flow.",
    families: ["Apollo", "USB Extension"],
    keywords: ["presentation", "switcher", "wireless presentation", "conference", "meeting room", "usb-c", "collaboration"],
    nextRoute: WM_ROUTES.roomWizard,
  },
  {
    id: "display-extension",
    title: "Display extension and room transport",
    summary: "Best for single-room display runs, projector feeds, and tidy point-to-point transport.",
    detail: "This track focuses on extending signals cleanly from source or rack to the main display position.",
    families: ["HDBaseT"],
    keywords: ["hdbaset", "extender", "transmitter", "receiver", "projector", "display transport", "long run"],
    nextRoute: WM_ROUTES.architecture,
  },
  {
    id: "matrix-routing",
    title: "Multi-source routing",
    summary: "Best when several sources need to reach more than one display with predictable switching.",
    detail: "This track is for boardrooms, divisible spaces, hospitality routing, and other many-source room layouts.",
    families: ["Matrix"],
    keywords: ["matrix", "routing", "multiview", "switching", "multi-source", "dual display"],
    nextRoute: WM_ROUTES.bom,
  },
  {
    id: "networked-distribution",
    title: "Scalable AV over IP",
    summary: "Best for larger venues, multi-zone systems, or any design that needs growth beyond a single room.",
    detail: "This track pushes toward scalable distribution, zone-aware routing, and more flexible venue architecture.",
    families: ["AVoIP"],
    keywords: ["avoip", "networkhd", "encoder", "decoder", "distribution", "zone", "venue", "multicast"],
    nextRoute: WM_ROUTES.architecture,
  },
  {
    id: "usb-collaboration",
    title: "USB cameras and peripherals",
    summary: "Best for UC rooms where the camera, microphone, and USB user journey matters as much as video transport.",
    detail: "This track highlights USB extension, host switching, and BYOM-friendly product paths.",
    families: ["USB Extension", "Apollo"],
    keywords: ["usb", "camera sharing", "peripheral", "byod", "byom", "kvm", "host"],
    nextRoute: WM_ROUTES.compare,
  },
  {
    id: "video-wall",
    title: "Video wall canvases",
    summary: "Best for operations, venue feature walls, and larger canvases where layout and scale drive the design.",
    detail: "This track is for video wall processors, wall-friendly distribution, and large-format control surfaces.",
    families: ["Video Wall", "AVoIP", "Matrix"],
    keywords: ["video wall", "videowall", "canvas", "multiview", "wall processor", "control room"],
    nextRoute: WM_ROUTES.videoWall,
  },
];

export const DEFAULT_CATALOG_ROOM_ID = ROOM_TEMPLATE_LIBRARY[0]?.id ?? "";

export function findCatalogRoomById(id?: string | null): RoomTemplateScenario | undefined {
  const key = tidy(id);
  if (!key) return undefined;
  return ROOM_TEMPLATE_LIBRARY.find((template) => template.id === key);
}

export function deriveRecommendedFamilies(
  project?: StoredProject | null,
  room?: RoomTemplateScenario | null,
): string[] {
  return dedupe([
    ...(room?.recommendedFamilies || []),
    ...(project?.template?.recommendedFamilies || []),
    ...(project?.discovery?.recommendedFamilies || []),
  ]);
}

export function findBestCatalogRoomForProject(
  project?: StoredProject | null,
): RoomTemplateScenario | undefined {
  if (!project) return undefined;

  const directMatch = findCatalogRoomById(project.template?.templateId);
  if (directMatch) return directMatch;

  const projectBlob = buildProjectSearchBlob(project);
  if (!projectBlob) return undefined;

  const projectFamilies = new Set(
    deriveRecommendedFamilies(project).map((item) => normalizeKey(item)),
  );

  let best: RoomTemplateScenario | undefined;
  let bestScore = 0;

  for (const room of ROOM_TEMPLATE_LIBRARY) {
    let score = 0;
    const roomBlob = roomTemplateSearchBlob(room);

    if (projectBlob.includes(room.roomType.toLowerCase())) score += 40;
    if (projectBlob.includes(room.vertical.toLowerCase())) score += 10;

    for (const family of room.recommendedFamilies) {
      if (projectFamilies.has(normalizeKey(family))) score += 14;
    }

    for (const token of tokenize(`${room.roomType} ${room.vertical} ${room.category} ${room.useCases.join(" ")}`)) {
      if (projectBlob.includes(token)) score += 2;
    }

    if (projectBlob.includes(roomBlob)) score += 12;

    if (score > bestScore) {
      bestScore = score;
      best = room;
    }
  }

  return bestScore > 0 ? best : undefined;
}

export function listCatalogTracks(
  room?: RoomTemplateScenario | null,
  project?: StoredProject | null,
): CatalogSolutionTrack[] {
  const recommendedFamilies = deriveRecommendedFamilies(project, room);
  return [...CATALOG_SOLUTION_TRACKS].sort((left, right) => (
    trackPriority(right, recommendedFamilies) - trackPriority(left, recommendedFamilies)
  ));
}

export function derivePreferredTrackId(
  room?: RoomTemplateScenario | null,
  project?: StoredProject | null,
): CatalogSolutionTrackId {
  return listCatalogTracks(room, project)[0]?.id || "presentation-byod";
}

export function recommendCatalogProducts(input: {
  products: CatalogProduct[];
  room?: RoomTemplateScenario | null;
  track?: CatalogSolutionTrack | null;
  project?: StoredProject | null;
  query?: string;
}): CatalogRecommendation[] {
  const room = input.room;
  const track = input.track;
  const query = tidy(input.query).toLowerCase();
  const roomFamilies = deriveRecommendedFamilies(input.project, room);
  const roomKeywords = dedupe([
    room?.roomType,
    room?.vertical,
    ...(room?.useCases || []),
    ...(room?.sourceTypes || []),
    ...(room?.outputTypes || []),
  ], 20);
  const requiredDistance = Number(input.project?.discovery?.cableDistanceM || 0);

  return input.products
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];
      const blob = buildProductBlob(product);

      for (const family of roomFamilies) {
        if (!matchesFamily(product, family)) continue;
        score += track?.families.includes(family) ? 28 : 18;
        reasons.push(`${family} fit`);
      }

      if (track) {
        for (const keyword of track.keywords) {
          if (!matchesKeyword(blob, keyword)) continue;
          score += keyword.includes(" ") ? 8 : 5;
        }

        if (track.keywords.some((keyword) => matchesKeyword(blob, keyword))) {
          reasons.push(track.title);
        }
      }

      for (const keyword of roomKeywords.slice(0, 10)) {
        if (!matchesKeyword(blob, keyword)) continue;
        score += 3;
      }

      if (requiredDistance > 0) {
        const availableDistance =
          Number(product.distance?.meters4k || 0) ||
          Number(product.distance?.meters1080p || 0) ||
          Number(product.distance?.meters || 0);
        if (availableDistance >= requiredDistance) {
          score += 12;
          reasons.push(`Distance suits ${requiredDistance}m`);
        }
      }

      if (room) {
        if (room.ioProfile.displayCount >= 4 && (matchesFamily(product, "Matrix") || matchesFamily(product, "AVoIP"))) {
          score += 8;
          reasons.push("Handles multi-display rooms");
        }

        if (room.ioProfile.sourceCount <= 3 && (matchesFamily(product, "Apollo") || matchesFamily(product, "HDBaseT"))) {
          score += 6;
          reasons.push("Right-sized for straightforward rooms");
        }
      }

      if (product.usb?.cameraSharing || product.usb?.peripheralSwitching || product.usb?.kvmSupport) {
        if ((track?.id === "usb-collaboration") || roomFamilies.some((family) => normalizeKey(family) === "usbextension")) {
          score += 8;
          reasons.push("Supports room USB workflow");
        }
      }

      if (query) {
        if (blob.includes(query)) {
          score += 14;
          reasons.push("Matches your search");
        } else {
          score -= 5;
        }
      }

      if (product.status === "active") score += 4;
      if (product.status === "legacy") score -= 18;

      return {
        product,
        score,
        reasons: dedupe(reasons, 4),
        highlights: buildProductHighlights(product),
      };
    })
    .filter((item) => item.score > (query ? 0 : 10))
    .sort((left, right) => (
      right.score - left.score ||
      right.reasons.length - left.reasons.length ||
      left.product.sku.localeCompare(right.product.sku)
    ));
}

export function summarizeCatalogProductIo(product: CatalogProduct): string {
  const io = dedupe([
    ...formatPorts(product.inputs, "in"),
    ...formatPorts(product.outputs, "out"),
  ], 4);

  return io.length > 0 ? io.join(" | ") : "I/O detail is still being expanded.";
}
