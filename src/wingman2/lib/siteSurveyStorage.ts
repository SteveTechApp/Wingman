/**
 * Site Survey Storage — persists on-site survey edits in localStorage
 * so integrators can fill in cable lengths and checkboxes offline.
 *
 * Edits are keyed by project ID and sync back to the topology when online.
 */

const SURVEY_STORAGE_KEY = "wingman-site-survey-edits";

export type SurveyCableEdit = {
  cableId: string;
  actualLengthMetres?: number;
  confirmed: boolean;
  integratorNotes?: string;
};

export type SurveyDeviceEdit = {
  deviceId: string;
  verified: boolean;
  notes?: string;
};

export type SurveyLocationEdit = {
  locationId: string;
  notes?: string;
};

export type SurveyProjectEdits = {
  projectId: string;
  cableEdits: Record<string, SurveyCableEdit>;
  deviceEdits: Record<string, SurveyDeviceEdit>;
  locationEdits: Record<string, SurveyLocationEdit>;
  lastModified: string;
  synced: boolean;
};

/* ──────────────────────────────────────────────
   Read / write helpers
   ────────────────────────────────────────────── */

function readAllEdits(): Record<string, SurveyProjectEdits> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(SURVEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAllEdits(edits: Record<string, SurveyProjectEdits>): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(edits));
    // Dispatch event for sync module to pick up
    window.dispatchEvent(new CustomEvent("wingman:survey-edited"));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/* ──────────────────────────────────────────────
   Project-level accessors
   ────────────────────────────────────────────── */

export function getProjectEdits(projectId: string): SurveyProjectEdits {
  const all = readAllEdits();
  return all[projectId] ?? {
    projectId,
    cableEdits: {},
    deviceEdits: {},
    locationEdits: {},
    lastModified: new Date().toISOString(),
    synced: false,
  };
}

export function saveProjectEdits(edits: SurveyProjectEdits): void {
  const all = readAllEdits();
  all[edits.projectId] = {
    ...edits,
    lastModified: new Date().toISOString(),
    synced: false,
  };
  writeAllEdits(all);
}

/* ──────────────────────────────────────────────
   Cable edit operations
   ────────────────────────────────────────────── */

export function getCableEdit(projectId: string, cableId: string): SurveyCableEdit | null {
  const edits = getProjectEdits(projectId);
  return edits.cableEdits[cableId] ?? null;
}

export function setCableLength(
  projectId: string,
  cableId: string,
  actualLengthMetres: number | undefined,
): void {
  const edits = getProjectEdits(projectId);
  const existing = edits.cableEdits[cableId] ?? { cableId, confirmed: false };
  edits.cableEdits[cableId] = {
    ...existing,
    cableId,
    actualLengthMetres,
    confirmed: actualLengthMetres !== undefined,
  };
  saveProjectEdits(edits);
}

export function setCableConfirmed(projectId: string, cableId: string, confirmed: boolean): void {
  const edits = getProjectEdits(projectId);
  const existing = edits.cableEdits[cableId] ?? { cableId };
  edits.cableEdits[cableId] = {
    ...existing,
    cableId,
    confirmed,
  };
  saveProjectEdits(edits);
}

export function setCableNotes(projectId: string, cableId: string, notes: string): void {
  const edits = getProjectEdits(projectId);
  const existing = edits.cableEdits[cableId] ?? { cableId, confirmed: false };
  edits.cableEdits[cableId] = {
    ...existing,
    cableId,
    integratorNotes: notes,
  };
  saveProjectEdits(edits);
}

/* ──────────────────────────────────────────────
   Device edit operations
   ────────────────────────────────────────────── */

export function getDeviceEdit(projectId: string, deviceId: string): SurveyDeviceEdit | null {
  const edits = getProjectEdits(projectId);
  return edits.deviceEdits[deviceId] ?? null;
}

export function setDeviceVerified(projectId: string, deviceId: string, verified: boolean): void {
  const edits = getProjectEdits(projectId);
  edits.deviceEdits[deviceId] = {
    deviceId,
    verified,
    notes: edits.deviceEdits[deviceId]?.notes,
  };
  saveProjectEdits(edits);
}

/* ──────────────────────────────────────────────
   Location edit operations
   ────────────────────────────────────────────── */

export function getLocationEdit(projectId: string, locationId: string): SurveyLocationEdit | null {
  const edits = getProjectEdits(projectId);
  return edits.locationEdits[locationId] ?? null;
}

export function setLocationNotes(projectId: string, locationId: string, notes: string): void {
  const edits = getProjectEdits(projectId);
  edits.locationEdits[locationId] = {
    locationId,
    notes,
  };
  saveProjectEdits(edits);
}

/* ──────────────────────────────────────────────
   Summary helpers
   ────────────────────────────────────────────── */

export type SurveyProgress = {
  totalCables: number;
  confirmedCables: number;
  totalDevices: number;
  verifiedDevices: number;
  totalInstallItems: number;
  confirmedInstallItems: number;
  completionPercent: number;
};

/**
 * Survey progress across cable, device and (when the caller supplies the
 * checklist's install item ids) installation-detail confirmations. Install
 * items are tracked under their own key (see getInstallChecked); once the
 * caller passes the full list, unchecked install items count against the
 * completion percentage exactly like an unconfirmed cable does.
 */
export function getSurveyProgress(projectId: string, installItemIds?: string[]): SurveyProgress {
  const edits = getProjectEdits(projectId);
  const cableEntries = Object.values(edits.cableEdits);
  const deviceEntries = Object.values(edits.deviceEdits);

  const confirmedCables = cableEntries.filter((c) => c.confirmed).length;
  const verifiedDevices = deviceEntries.filter((d) => d.verified).length;

  const checkedInstall = new Set(getInstallChecked(projectId));
  const installIds = installItemIds ?? [];
  const confirmedInstallItems = installIds.filter((id) => checkedInstall.has(id)).length;

  const totalItems = cableEntries.length + deviceEntries.length + installIds.length;
  const completedItems = confirmedCables + verifiedDevices + confirmedInstallItems;
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalCables: cableEntries.length,
    confirmedCables,
    totalDevices: deviceEntries.length,
    verifiedDevices,
    totalInstallItems: installIds.length,
    confirmedInstallItems,
    completionPercent,
  };
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function clearProjectEdits(projectId: string): void {
  const all = readAllEdits();
  delete all[projectId];
  writeAllEdits(all);
}

/* ──────────────────────────────────────────────
   Installation-detail confirmation
   ──────────────────────────────────────────────

   The site-survey Installation Details checkboxes (mounting height, power at
   position, containment, rack position, …) are confirmed on site, not during
   discovery. They live under their own per-project key and dispatch the same
   wingman:survey-edited event as cable/device edits, so the proposal's
   needs-site-survey flag refreshes when a checkbox is toggled.
   ────────────────────────────────────────────── */

const INSTALL_CHECKED_KEY_PREFIX = "wingman:survey-install-checked:";

export function getInstallChecked(projectId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${INSTALL_CHECKED_KEY_PREFIX}${projectId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setInstallChecked(projectId: string, itemIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${INSTALL_CHECKED_KEY_PREFIX}${projectId}`,
      JSON.stringify(itemIds),
    );
    window.dispatchEvent(new CustomEvent("wingman:survey-edited"));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/* ──────────────────────────────────────────────
   Comparison mode utilities
   ────────────────────────────────────────────── */

export type CableComparisonStatus = "match" | "close" | "divergent" | "unmeasured";

export type CableComparison = {
  cableId: string;
  plannedMetres?: number;
  actualMetres?: number;
  varianceMetres: number;
  variancePercent: number;
  status: CableComparisonStatus;
};

export type ComparisonSummary = {
  totalCables: number;
  measured: number;
  matchCount: number;
  closeCount: number;
  divergentCount: number;
  unmeasuredCount: number;
  totalPlannedMetres: number;
  totalActualMetres: number;
  maxVariance: CableComparison | null;
};

/**
 * Classify cable variance into a visual status.
 * - match: within 10% or 1m (whichever is larger)
 * - close: within 20% or 3m
 * - divergent: more than 20% or 3m off
 * - unmeasured: no actual length entered
 */
function classifyVariance(planned?: number, actual?: number): CableComparisonStatus {
  if (actual === undefined || actual === null) return "unmeasured";
  if (planned === undefined || planned === null) return actual > 0 ? "divergent" : "match";

  const diff = Math.abs(actual - planned);
  const threshold10 = Math.max(planned * 0.1, 1);
  const threshold20 = Math.max(planned * 0.2, 3);

  if (diff <= threshold10) return "match";
  if (diff <= threshold20) return "close";
  return "divergent";
}

export function buildCableComparisons(
  projectId: string,
  cables: Array<{ id: string; lengthMetres?: number }>,
): CableComparison[] {
  const edits = getProjectEdits(projectId);

  return cables.map((cable) => {
    const edit = edits.cableEdits[cable.id];
    const planned = cable.lengthMetres;
    const actual = edit?.actualLengthMetres;
    const varianceMetres = actual !== undefined && planned !== undefined ? actual - planned : 0;
    const variancePercent = planned && planned > 0 && actual !== undefined
      ? Math.round(((actual - planned) / planned) * 100)
      : 0;
    const status = classifyVariance(planned, actual);

    return {
      cableId: cable.id,
      plannedMetres: planned,
      actualMetres: actual,
      varianceMetres,
      variancePercent,
      status,
    };
  });
}

export function buildComparisonSummary(comparisons: CableComparison[]): ComparisonSummary {
  let totalPlannedMetres = 0;
  let totalActualMetres = 0;
  let maxVariance: CableComparison | null = null;
  let maxVarianceAbs = 0;

  for (const c of comparisons) {
    if (c.plannedMetres) totalPlannedMetres += c.plannedMetres;
    if (c.actualMetres) totalActualMetres += c.actualMetres;

    const absVar = Math.abs(c.varianceMetres);
    if (absVar > maxVarianceAbs) {
      maxVarianceAbs = absVar;
      maxVariance = c;
    }
  }

  return {
    totalCables: comparisons.length,
    measured: comparisons.filter((c) => c.status !== "unmeasured").length,
    matchCount: comparisons.filter((c) => c.status === "match").length,
    closeCount: comparisons.filter((c) => c.status === "close").length,
    divergentCount: comparisons.filter((c) => c.status === "divergent").length,
    unmeasuredCount: comparisons.filter((c) => c.status === "unmeasured").length,
    totalPlannedMetres,
    totalActualMetres,
    maxVariance,
  };
}
