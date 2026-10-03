import { describe, expect, it, vi } from "vitest";
import { DataJobError, createDataJobService } from "./data-jobs.mjs";

const actor = { user: { id: "admin-1", email: "admin@example.com" }, workspace: { id: "workspace-1" }, permissions: { canManageWorkspace: true } };

describe("governed data jobs", () => {
  it("rejects a malformed validation import", async () => {
    const service = createDataJobService();
    await expect(service.validate({ source: "not-json", format: "json", idempotencyKey: "bad-1" }, actor))
      .rejects.toMatchObject({ statusCode: 400, code: "malformed_import" });
  });

  it("requires an authenticated workspace administrator", async () => {
    const service = createDataJobService();
    await expect(service.validate({ records: [], idempotencyKey: "auth-1" }, null))
      .rejects.toBeInstanceOf(DataJobError);
    await expect(service.validate({ records: [], idempotencyKey: "auth-2" }, { user: { id: "member-1" }, permissions: { canManageWorkspace: false } }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("executes only named affected checks", async () => {
    const catalogSchema = vi.fn(() => []);
    const service = createDataJobService({ checks: { "catalog-schema": catalogSchema } });
    const result = await service.runAffectedChecks({ records: [], checks: ["catalog-schema"], idempotencyKey: "checks-1" }, actor);
    expect(catalogSchema).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, state: "completed", executedChecks: ["catalog-schema"] });
    await expect(service.runAffectedChecks({ records: [], checks: ["rm -rf /"], idempotencyKey: "checks-2" }, actor))
      .rejects.toMatchObject({ statusCode: 400, code: "unknown_check" });
  });

  it("returns immutable snapshots and reuses duplicate idempotency submissions", async () => {
    const audit = [];
    const service = createDataJobService({ appendAuditEvent: (event) => audit.push(event) });
    const input = { records: [], idempotencyKey: "same-key" };
    const first = await service.validate(input, actor);
    first.findings.push({ severity: "error", message: "tamper" });
    const second = await service.validate(input, actor);
    expect(second.jobId).toBe(first.jobId);
    expect(second.findings).toEqual([]);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "data-job.validate", actorId: "admin-1", workspaceId: "workspace-1" });
  });
});
