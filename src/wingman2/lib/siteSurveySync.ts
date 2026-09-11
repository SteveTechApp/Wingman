/**
 * Site Survey Sync — pushes site survey edits to the backend and polls for
 * updates so field tech changes appear on the rep dashboard in real-time.
 *
 * Uses the existing project backend sync infrastructure with a dedicated
 * endpoint for site survey edits.
 */

import { getProjectEdits, saveSyncedProjectEdits, type SurveyProjectEdits } from "./siteSurveyStorage";

const SURVEY_SYNC_ENDPOINT = "/api/wingman/site-survey/sync";
const SURVEY_SYNC_POLL_INTERVAL_MS = 5_000; // 5 seconds
const SURVEY_SYNC_DEBOUNCE_MS = 1_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedAt: string | null = null;
let editedListener: (() => void) | null = null;

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type SurveySyncStatus = {
  state: "idle" | "syncing" | "synced" | "error" | "offline";
  message: string;
  lastSyncedAt: string | null;
  pendingChanges: number;
};

export type SurveySyncPayload = {
  projectId: string;
  edits: SurveyProjectEdits;
  clientTimestamp: string;
  baseServerTimestamp?: string;
};

export type SurveySyncResponse = {
  ok: boolean;
  edits?: SurveyProjectEdits;
  serverTimestamp?: string;
  error?: string;
  outcome?: "synced" | "conflict" | "error";
};

export type SurveySyncResult = {
  outcome: "synced" | "conflict" | "error";
  serverTimestamp?: string;
  error?: string;
};

/* ──────────────────────────────────────────────
   Status tracking
   ────────────────────────────────────────────── */

let currentStatus: SurveySyncStatus = {
  state: "idle",
  message: "Not synced",
  lastSyncedAt: null,
  pendingChanges: 0,
};

let statusListeners: Array<(status: SurveySyncStatus) => void> = [];

export function onSyncStatusChange(listener: (status: SurveySyncStatus) => void): () => void {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

function updateStatus(update: Partial<SurveySyncStatus>) {
  currentStatus = { ...currentStatus, ...update };
  for (const listener of statusListeners) {
    listener(currentStatus);
  }
}

export function getSyncStatus(): SurveySyncStatus {
  return currentStatus;
}

/* ──────────────────────────────────────────────
   Sync to backend
   ────────────────────────────────────────────── */

export async function pushEditsToBackend(projectId: string): Promise<SurveySyncResult> {
  const edits = getProjectEdits(projectId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    updateStatus({ state: "offline", message: "Offline — changes remain on this device" });
    return { outcome: "error", error: "offline" };
  }

  try {
    updateStatus({ state: "syncing", message: "Syncing edits to server..." });

    const payload: SurveySyncPayload = {
      projectId,
      edits,
      clientTimestamp: new Date().toISOString(),
      baseServerTimestamp: edits.serverTimestamp,
    };

    const response = await fetch(SURVEY_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 409) {
      const conflict = await response.json().catch(() => ({})) as SurveySyncResponse;
      updateStatus({ state: "error", message: "Sync conflict — local changes were preserved" });
      return { outcome: "conflict", serverTimestamp: conflict.serverTimestamp, error: conflict.error };
    }
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result: SurveySyncResponse = await response.json();

    if (result.ok && result.outcome !== "conflict") {
      lastSyncedAt = result.serverTimestamp ?? new Date().toISOString();
      const acknowledged = saveSyncedProjectEdits(edits, lastSyncedAt);
      if (!acknowledged) {
        updateStatus({ state: "syncing", message: "A newer local change is waiting to sync" });
        return { outcome: "error", serverTimestamp: lastSyncedAt, error: "newer-local-edit" };
      }
      updateStatus({
        state: "synced",
        message: "Edits synced to server",
        lastSyncedAt,
        pendingChanges: 0,
      });
      return { outcome: "synced", serverTimestamp: lastSyncedAt };
    } else if (result.outcome === "conflict") {
      updateStatus({ state: "error", message: "Sync conflict — local changes were preserved" });
      return { outcome: "conflict", serverTimestamp: result.serverTimestamp, error: result.error };
    } else {
      throw new Error(result.error || "Sync failed");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("[siteSurveySync] pushEditsToBackend failed:", message);
    updateStatus({
      state: "error",
      message: `Sync failed: ${message}`,
    });
    return { outcome: "error", error: message };
  }
}

function scheduleSync(projectId: string) {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    pushEditsToBackend(projectId);
  }, SURVEY_SYNC_DEBOUNCE_MS);
}

/* ──────────────────────────────────────────────
   Poll for updates
   ────────────────────────────────────────────── */

async function pollForUpdates(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SURVEY_SYNC_ENDPOINT}?projectId=${encodeURIComponent(projectId)}&since=${encodeURIComponent(lastSyncedAt ?? "")}`,
      {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!response.ok) {
      return false;
    }

    const result: SurveySyncResponse = await response.json();

    if (result.ok && result.edits && result.serverTimestamp) {
      // Check if server has newer data
      const serverTime = new Date(result.serverTimestamp).getTime();
      const localEdits = getProjectEdits(projectId);
      const localTime = new Date(localEdits.lastModified).getTime();

      if (serverTime > localTime) {
        if (!localEdits.synced) {
          updateStatus({ state: "error", message: "Sync conflict — local changes were preserved" });
          return false;
        }
        // Server has newer data - merge
        saveSyncedProjectEdits({
          ...result.edits,
          projectId,
          lastModified: result.serverTimestamp,
          synced: true,
        }, result.serverTimestamp);

        lastSyncedAt = result.serverTimestamp;
        updateStatus({
          state: "synced",
          message: "Received updates from server",
          lastSyncedAt,
        });

        // Dispatch event for UI to re-render
        window.dispatchEvent(new CustomEvent("wingman:survey-sync-update", {
          detail: { projectId },
        }));

        return true;
      }
    }

    return false;
  } catch {
    // Polling errors are silent - will retry on next interval
    return false;
  }
}

/* ──────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────── */

/**
 * Start real-time sync for a project.
 * Pushes local edits and polls for server updates.
 */
export function startSurveySync(projectId: string): void {
  stopSurveySync();

  updateStatus({
    state: "idle",
    message: "Starting sync...",
    lastSyncedAt: null,
  });

  // Initial push
  pushEditsToBackend(projectId);

  // Start polling
  pollTimer = setInterval(() => {
    pollForUpdates(projectId);
  }, SURVEY_SYNC_POLL_INTERVAL_MS);

  // Listen for local changes to trigger sync
  editedListener = () => scheduleSync(projectId);
  window.addEventListener("wingman:survey-edited", editedListener);

  updateStatus({ state: "syncing", message: "Checking for saved changes" });
}

/**
 * Stop real-time sync.
 */
export function stopSurveySync(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (editedListener) {
    window.removeEventListener("wingman:survey-edited", editedListener);
    editedListener = null;
  }
}

/**
 * Manually trigger a sync push.
 */
export function manualSync(projectId: string): Promise<SurveySyncResult> {
  return pushEditsToBackend(projectId);
}

/**
 * Notify sync system of a local edit.
 */
export function notifyEdit(projectId: string): void {
  const edits = getProjectEdits(projectId);
  const pendingCount = Object.keys(edits.cableEdits).length +
    Object.keys(edits.deviceEdits).length +
    Object.keys(edits.locationEdits).length;

  updateStatus({
    state: "syncing",
    message: "Change detected, syncing...",
    pendingChanges: pendingCount,
  });

  scheduleSync(projectId);
}
