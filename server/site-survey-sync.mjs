import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RUNTIME_DATA_DIR } from "./catalog/files.mjs";
import { writeJsonFileAtomic } from "./atomic-json-file.mjs";
import { getWingmanRequestAuth } from "./wingman-app-store.mjs";

const STORE_FILE = path.join(RUNTIME_DATA_DIR, "site-survey-sync.json");
let lockTail = Promise.resolve();

function withLock(work) {
  const run = lockTail.then(work, work);
  lockTail = run.then(() => undefined, () => undefined);
  return run;
}

function fingerprint(edits) {
  return crypto.createHash("sha256").update(JSON.stringify(edits ?? {})).digest("hex");
}

async function readStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

export function decideSurveySync(current, payload, serverTimestamp = new Date().toISOString()) {
  const incomingHash = fingerprint(payload.edits);
  if (current && current.hash === incomingHash) {
    return { outcome: "synced", record: current, idempotent: true };
  }
  if (current && payload.baseServerTimestamp !== current.serverTimestamp) {
    return { outcome: "conflict", record: current, idempotent: false };
  }
  return {
    outcome: "synced",
    idempotent: false,
    record: { edits: payload.edits, hash: incomingHash, serverTimestamp },
  };
}

function nextServerTimestamp(current) {
  const now = new Date().toISOString();
  if (!current || now > current.serverTimestamp) return now;
  return new Date(Date.parse(current.serverTimestamp) + 1).toISOString();
}

function keyFor(workspaceId, projectId) {
  return `${workspaceId}:${projectId}`;
}

async function requireEditor(req, res, url, sendJson) {
  const auth = await getWingmanRequestAuth(req, url);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, outcome: "error", error: auth.error });
    return null;
  }
  if (!auth.permissions.canEditProjects) {
    sendJson(res, 403, { ok: false, outcome: "error", error: "This workspace role is read-only for site survey changes." });
    return null;
  }
  return auth;
}

export async function handleSiteSurveySyncPost(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireEditor(req, res, url, sendJson);
  if (!auth) return;
  let payload;
  try { payload = await parseJsonBody(req); } catch {
    sendJson(res, 400, { ok: false, outcome: "error", error: "Invalid JSON body." });
    return;
  }
  const projectId = String(payload?.projectId ?? "").trim();
  if (!projectId || !payload?.edits || typeof payload.edits !== "object" || Array.isArray(payload.edits)) {
    sendJson(res, 400, { ok: false, outcome: "error", error: "projectId and edits are required." });
    return;
  }
  await withLock(async () => {
    const store = await readStore();
    const key = keyFor(auth.workspace.id, projectId);
    const decision = decideSurveySync(store[key], payload, nextServerTimestamp(store[key]));
    if (decision.outcome === "conflict") {
      sendJson(res, 409, { ok: false, outcome: "conflict", error: "The server revision is newer. Local changes were preserved.", serverTimestamp: decision.record.serverTimestamp, edits: decision.record.edits });
      return;
    }
    if (!decision.idempotent) {
      store[key] = decision.record;
      await writeJsonFileAtomic(STORE_FILE, store);
    }
    sendJson(res, 200, { ok: true, outcome: "synced", serverTimestamp: decision.record.serverTimestamp, idempotent: decision.idempotent });
  });
}

export async function handleSiteSurveySyncGet(req, res, url, { sendJson }) {
  const auth = await requireEditor(req, res, url, sendJson);
  if (!auth) return;
  const projectId = String(url.searchParams.get("projectId") ?? "").trim();
  if (!projectId) {
    sendJson(res, 400, { ok: false, outcome: "error", error: "projectId is required." });
    return;
  }
  const store = await readStore();
  const record = store[keyFor(auth.workspace.id, projectId)];
  sendJson(res, 200, record ? { ok: true, edits: record.edits, serverTimestamp: record.serverTimestamp } : { ok: true });
}
