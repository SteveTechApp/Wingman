export type NormalizedIoPortGroup = {
  type?: string;
  count?: number | null;
  label?: string;
  confidence?: string;
};

export type NormalizedIoProfile = {
  version?: number;
  headline?: {
    inputs?: number | null;
    outputs?: number | null;
    label?: string;
    confidence?: string;
  };
  videoInputs?: NormalizedIoPortGroup[];
  videoOutputs?: NormalizedIoPortGroup[];
  usb?: NormalizedIoPortGroup[];
  audio?: NormalizedIoPortGroup[];
  networkControl?: NormalizedIoPortGroup[];
  notes?: string[];
  rawPorts?: Record<string, unknown>;
};
export type CompetitorLookupRecord = {
  brand?: string;
  sku?: string;
  name?: string;
  sourceUrl?: string;
  summary?: string;
  description?: string;
  category?: string;
};

export type CompetitorLookupResponse = {
  ok: boolean;
  mode?: string;
  query?: string;
  record?: CompetitorLookupRecord;
  warnings?: string[];
  fetchedAt?: string;
};

export type CompetitorMatchCandidate = {
  sku?: string;
  name?: string;
  match_score?: number;
  match_type?: string;
  confidence?: string;
  confidence_score?: number;
  io_coverage?: number;
  feature_coverage?: number;
  resolvedUrl?: string;
  summary?: string;
  ioProfile?: NormalizedIoProfile;
  comparison_rows?: Array<{
    label?: string;
    competitor?: string;
    wyrestorm?: string;
    verdict?: string;
  }>;
  readiness?: {
    status?: string;
    summary?: string;
    blockers?: string[];
    warnings?: string[];
    strengths?: string[];
    nextActions?: string[];
    reviewRequired?: boolean;
  };
  breakdown?: Record<string, number>;
};

export type CompetitorMatchResponse = {
  ok: boolean;
  fetchedAt?: string;
  competitor_lookup_mode?: string;
  competitor_product?: {
    manufacturer?: string;
    model?: string;
    title?: string;
    category?: string;
    summary?: string;
    resolvedUrl?: string;
  };
  best_match?: CompetitorMatchCandidate | null;
  alternatives?: CompetitorMatchCandidate[];
  resolved_competitor_url?: string;
  compare_quality?: unknown;
  compare_readiness?: CompetitorMatchCandidate["readiness"] | null;
};

export type WingmanWorkspaceSession = {
  mode?: string;
  issuedAt?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    company?: string;
    role?: string;
  };
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
    tier?: string;
    memberCount?: number;
  };
  workspaceRole?: string;
  permissions?: Record<string, boolean>;
};

export type WingmanSessionResponse = {
  ok: boolean;
  session?: WingmanWorkspaceSession;
};

export class WingmanApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WingmanApiError";
    this.status = status;
  }
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getWingmanJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Request failed with status ${response.status}.`;
    throw new WingmanApiError(message, response.status);
  }

  return payload as T;
}

export async function postWingmanJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Request failed with status ${response.status}.`;
    throw new WingmanApiError(message, response.status);
  }

  return payload as T;
}

export function runCompetitorLookup(input: { brand: string; sku: string; query?: string }) {
  const query = input.query || [input.brand, input.sku].filter(Boolean).join(" ");

  return postWingmanJson<CompetitorLookupResponse>("/api/wingman/competitor-lookup", {
    brand: input.brand,
    sku: input.sku,
    query,
  });
}

export function runCompetitorMatch(input: { manufacturer: string; model: string; productUrl?: string }) {
  return postWingmanJson<CompetitorMatchResponse>("/api/competitor/resolveMatch", {
    manufacturer: input.manufacturer,
    model: input.model,
    productUrl: input.productUrl || "",
  });
}

export type VisionContextAttachmentKind = "room_photo" | "schematic_diagram" | "unclear";

export type VisionContextResult = {
  visionVersion?: string;
  attachmentKind?: VisionContextAttachmentKind;
  summary?: string;
  roomObservations?: string[];
  visibleEquipment?: string[];
  layoutNotes?: string[];
  confidence?: number;
};

export type VisionContextResponse = {
  ok: boolean;
  phase?: string;
  data?: VisionContextResult;
};

export function runVisionContextAnalysis(input: { fileName: string; mimeType: string; base64Data: string; hint?: string }) {
  return postWingmanJson<VisionContextResponse>("/api/wingman/agents/vision-context", input);
}

export function getWingmanSession() {
  return getWingmanJson<WingmanSessionResponse>("/api/wingman/auth/session");
}

export function signUpWingmanWorkspace(input: { name: string; company: string; email: string; password: string }) {
  return postWingmanJson<WingmanSessionResponse>("/api/wingman/auth/signup", input);
}

export function loginWingmanWorkspace(input: { email: string; password: string }) {
  return postWingmanJson<WingmanSessionResponse>("/api/wingman/auth/login", input);
}

export function logoutWingmanWorkspace() {
  return postWingmanJson<{ ok: boolean }>("/api/wingman/auth/logout", {});
}
