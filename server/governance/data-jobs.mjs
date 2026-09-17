import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RUNTIME_DATA_DIR } from "../catalog/files.mjs";

export class DataJobError extends Error {
  constructor(message, { statusCode = 400, code = "invalid_job" } = {}) {
    super(message);
    this.name = "DataJobError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const clone = (value) => structuredClone(value);
const text = (value) => String(value ?? "").trim();

function requireAdmin(actor) {
  if (!actor?.user) throw new DataJobError("Authentication required.", { statusCode: 401, code: "unauthenticated" });
  if (!actor.permissions?.canManageWorkspace) throw new DataJobError("Workspace administrator access is required.", { statusCode: 403, code: "forbidden" });
}

function recordsFromInput(input) {
  if (Array.isArray(input?.records)) return clone(input.records);
  if (text(input?.format).toLowerCase() !== "json" || typeof input?.source !== "string") {
    throw new DataJobError("Import must contain a records array or JSON source.", { code: "malformed_import" });
  }
  try {
    const parsed = JSON.parse(input.source);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed;
  } catch {
    throw new DataJobError("Import JSON must be an array of product records.", { code: "malformed_import" });
  }
}

function schemaFindings(records) {
  const findings = [];
  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      findings.push({ severity: "error", record: index + 1, message: "Record must be an object." });
      return;
    }
    for (const field of ["brand", "sku", "name", "family", "category"]) {
      if (!text(record[field])) findings.push({ severity: "error", record: index + 1, field, message: `${field} is required.` });
    }
  });
  return findings;
}

function duplicateFindings(records) {
  const seen = new Set();
  const findings = [];
  records.forEach((record, index) => {
    const key = `${text(record?.brand).toLowerCase()}::${text(record?.sku).toLowerCase()}`;
    if (key !== "::" && seen.has(key)) findings.push({ severity: "error", record: index + 1, field: "sku", message: "Manufacturer and SKU must be unique." });
    seen.add(key);
  });
  return findings;
}

export const DATA_JOB_CHECKS = Object.freeze({
  "catalog-schema": schemaFindings,
  "duplicate-products": duplicateFindings,
  "publish-readiness": (records) => schemaFindings(records).concat(records.flatMap((record, index) =>
    ["live", "review"].includes(text(record?.lifecycle)) && !Array.isArray(record?.evidence)
      ? [{ severity: "error", record: index + 1, field: "evidence", message: "Publishable records require evidence." }]
      : [])),
});

async function appendDataJobAuditEvent(event) {
  await fs.mkdir(RUNTIME_DATA_DIR, { recursive: true });
  await fs.appendFile(path.join(RUNTIME_DATA_DIR, "data-job-audit.jsonl"), `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
}

export function createDataJobService({ checks = DATA_JOB_CHECKS, appendAuditEvent = appendDataJobAuditEvent } = {}) {
  const jobs = new Map();
  const keys = new Map();

  async function execute(kind, input, actor, selectedChecks) {
    requireAdmin(actor);
    const idempotencyKey = text(input?.idempotencyKey);
    if (!idempotencyKey) throw new DataJobError("An idempotency key is required.", { code: "missing_idempotency_key" });
    const scopeKey = `${text(actor.workspace?.id)}:${kind}:${idempotencyKey}`;
    const existingId = keys.get(scopeKey);
    if (existingId) return clone(jobs.get(existingId));
    const records = recordsFromInput(input);
    const names = selectedChecks ?? Object.keys(checks);
    for (const name of names) {
      if (!Object.hasOwn(checks, name)) throw new DataJobError(`Unknown governed check: ${name}`, { code: "unknown_check" });
    }
    const startedAt = new Date().toISOString();
    const findings = names.flatMap((name) => checks[name](clone(records)).map((finding) => ({ check: name, ...finding })));
    const job = {
      ok: findings.every((finding) => finding.severity !== "error"),
      jobId: randomUUID(), state: findings.some((finding) => finding.severity === "error") ? "failed" : "completed",
      findings, executedChecks: [...names], startedAt, completedAt: new Date().toISOString(),
    };
    jobs.set(job.jobId, clone(job));
    keys.set(scopeKey, job.jobId);
    await appendAuditEvent(Object.freeze({
      id: randomUUID(), action: `data-job.${kind}`, jobId: job.jobId,
      actorId: text(actor.user.id), actorEmail: text(actor.user.email), workspaceId: text(actor.workspace?.id),
      occurredAt: job.completedAt, outcome: job.state, findingCount: findings.length,
    }));
    return clone(job);
  }

  return Object.freeze({
    validate: (input, actor) => execute("validate", input, actor),
    runAffectedChecks: (input, actor) => execute("affected-checks", input, actor, Array.isArray(input?.checks) ? input.checks : Object.keys(checks)),
    get: (jobId) => jobs.has(jobId) ? clone(jobs.get(jobId)) : null,
  });
}

export const dataJobService = createDataJobService();

async function handle(kind, req, res, url, { sendJson, parseJsonBody, getRequestAuth }) {
  try {
    const actor = await getRequestAuth(req, url);
    const body = await parseJsonBody(req);
    const result = kind === "validate" ? await dataJobService.validate(body, actor) : await dataJobService.runAffectedChecks(body, actor);
    sendJson(res, 200, result);
  } catch (error) {
    const status = error instanceof DataJobError ? error.statusCode : error?.statusCode === 413 ? 413 : 500;
    sendJson(res, status, { ok: false, error: status === 500 ? "Governed data job failed." : error.message, code: error.code });
  }
}

export const handleDataValidationPost = (req, res, url, helpers) => handle("validate", req, res, url, helpers);
export const handleAffectedChecksPost = (req, res, url, helpers) => handle("affected-checks", req, res, url, helpers);
