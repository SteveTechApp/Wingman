export type GuruProjectSnapshot = {
  projectName?: string;
  customerName?: string;
  application?: string;
  roomType?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  architecture?: string;
  controlRequired?: boolean;
  usbRequired?: boolean;
  audioNotes?: string;
  selectedProducts?: string[];
  proposalNotes?: string;
};

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (v === "true" || v === "yes") return true;
    if (v === "false" || v === "no") return false;
  }
  return undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function coerceSnapshot(input: unknown): GuruProjectSnapshot | undefined {
  if (!input || typeof input !== "object") return undefined;
  const data = input as Record<string, unknown>;

  const snapshot: GuruProjectSnapshot = {
    projectName:
      typeof data.projectName === "string" ? data.projectName :
      typeof data.name === "string" ? data.name :
      typeof data.project_title === "string" ? data.project_title :
      undefined,

    customerName:
      typeof data.customerName === "string" ? data.customerName :
      typeof data.customer === "string" ? data.customer :
      undefined,

    application:
      typeof data.application === "string" ? data.application :
      typeof data.applicationType === "string" ? data.applicationType :
      typeof data.useCase === "string" ? data.useCase :
      undefined,

    roomType:
      typeof data.roomType === "string" ? data.roomType :
      typeof data.room === "string" ? data.room :
      undefined,

    sourceCount:
      parseNumber(data.sourceCount) ??
      parseNumber(data.sources) ??
      parseNumber(data.source_count),

    displayCount:
      parseNumber(data.displayCount) ??
      parseNumber(data.displays) ??
      parseNumber(data.display_count),

    distanceM:
      parseNumber(data.distanceM) ??
      parseNumber(data.distance) ??
      parseNumber(data.maxDistanceM) ??
      parseNumber(data.max_distance_m),

    architecture:
      typeof data.architecture === "string" ? data.architecture :
      typeof data.solutionType === "string" ? data.solutionType :
      typeof data.topology === "string" ? data.topology :
      undefined,

    controlRequired:
      parseBoolean(data.controlRequired) ??
      parseBoolean(data.control) ??
      parseBoolean(data.requiresControl),

    usbRequired:
      parseBoolean(data.usbRequired) ??
      parseBoolean(data.usb) ??
      parseBoolean(data.requiresUsb),

    audioNotes:
      typeof data.audioNotes === "string" ? data.audioNotes :
      typeof data.audio === "string" ? data.audio :
      undefined,

    selectedProducts:
      parseStringArray(data.selectedProducts) ??
      parseStringArray(data.products) ??
      parseStringArray(data.skus),

    proposalNotes:
      typeof data.proposalNotes === "string" ? data.proposalNotes :
      typeof data.notes === "string" ? data.notes :
      undefined,
  };

  const hasAnyValue = Object.values(snapshot).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });

  return hasAnyValue ? snapshot : undefined;
}

function collectCandidates(): unknown[] {
  if (typeof window === "undefined") return [];

  const storageKeys = [
    "wingman.currentProject",
    "wingman.project.current",
    "wingman.activeProject",
    "wm.activeProject",
    "wm.currentProject",
    "currentProject",
    "activeProject",
  ];

  const candidates: unknown[] = [];

  for (const key of storageKeys) {
    candidates.push(safeJsonParse(window.sessionStorage.getItem(key)));
    candidates.push(safeJsonParse(window.localStorage.getItem(key)));
  }

  const win = window as unknown as {
    __WINGMAN_ACTIVE_PROJECT__?: unknown;
    __WM_ACTIVE_PROJECT__?: unknown;
  };

  candidates.push(win.__WINGMAN_ACTIVE_PROJECT__);
  candidates.push(win.__WM_ACTIVE_PROJECT__);

  return candidates;
}

export function getGuruProjectSnapshot(): GuruProjectSnapshot | undefined {
  const candidates = collectCandidates();

  for (const candidate of candidates) {
    const snapshot = coerceSnapshot(candidate);
    if (snapshot) return snapshot;
  }

  return undefined;
}

export function buildGuruInputFromProject(
  brief: string,
  snapshot?: GuruProjectSnapshot,
): string {
  const lines: string[] = [];

  if (brief.trim()) {
    lines.push(brief.trim());
  }

  if (!snapshot) {
    return lines.join(". ");
  }

  if (snapshot.projectName) lines.push("Project " + snapshot.projectName);
  if (snapshot.customerName) lines.push("Customer " + snapshot.customerName);
  if (snapshot.application) lines.push("Application " + snapshot.application);
  if (snapshot.roomType) lines.push("Room type " + snapshot.roomType);
  if (snapshot.sourceCount !== undefined) lines.push(String(snapshot.sourceCount) + " sources");
  if (snapshot.displayCount !== undefined) lines.push(String(snapshot.displayCount) + " displays");
  if (snapshot.distanceM !== undefined) lines.push(String(snapshot.distanceM) + "m max distance");
  if (snapshot.architecture) lines.push("Architecture " + snapshot.architecture);
  if (snapshot.controlRequired === true) lines.push("Control required");
  if (snapshot.usbRequired === true) lines.push("USB required");
  if (snapshot.audioNotes) lines.push("Audio " + snapshot.audioNotes);
  if (snapshot.selectedProducts && snapshot.selectedProducts.length > 0) {
    lines.push("Selected products " + snapshot.selectedProducts.join(", "));
  }
  if (snapshot.proposalNotes) lines.push("Proposal notes " + snapshot.proposalNotes);

  return lines.join(". ");
}