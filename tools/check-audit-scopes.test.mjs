import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runAuditScopeGate } from "./check-audit-scopes.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandboxes = [];

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "audit-scopes-"));
  sandboxes.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

const PANEL = "src/wingman2/components/AuditLogPanel.tsx";

function panel(scopes, { labels = scopes, extra = "" } = {}) {
  return `
export const AUDIT_SCOPES = [
${scopes.map((scope) => `  "${scope}",`).join("\n")}
] as const;

export const SCOPE_CONFIG = {
${labels.map((scope) => `  ${/^[a-z]+$/.test(scope) ? scope : `"${scope}"`}: { icon: Monitor, label: "${scope}", color: "#22d3ee" },`).join("\n")}
${extra}
};
`;
}

function entry(scope, extra = "") {
  return `const audit = { id: "a1", action: "some-action", detail: "Something happened", scope: "${scope}", severity: "info", actorName: "Wingman user", createdAt: "2026-10-20T00:00:00.000Z" ${extra} };\n`;
}

describe("audit scope gate", () => {
  it("passes when every written scope has a label", () => {
    const root = sandbox({
      [PANEL]: panel(["videowall", "proposal"]),
      "src/features/commands/a.ts": entry("videowall") + entry("proposal"),
    });

    expect(runAuditScopeGate(root)).toEqual([]);
  });

  it("fails a trail entry whose scope has no label, naming the file and line", () => {
    const root = sandbox({
      [PANEL]: panel(["videowall"]),
      "src/features/commands/a.ts": entry("videowall") + entry("design-project"),
    });

    const errors = runAuditScopeGate(root);
    expect(errors).toHaveLength(1);
    // The line number is where the entry sits, so the fix is a click away.
    expect(errors[0]).toContain("src/features/commands/a.ts:2");
    expect(errors[0]).toContain('audit scope "design-project" is not in AUDIT_SCOPES');
  });

  it("fails a listed scope that the map never gave a label and icon", () => {
    const root = sandbox({
      [PANEL]: panel(["videowall", "bom"], { labels: ["videowall"] }),
      "src/features/commands/a.ts": entry("videowall"),
    });

    const errors = runAuditScopeGate(root);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"bom" has no label and icon in SCOPE_CONFIG');
  });

  it("does not read another record's scope as an audit entry", () => {
    const root = sandbox({
      [PANEL]: panel(["videowall"]),
      // Recommendation feedback has a scope and no actor; an integrity rule has
      // a scope and no action. Neither is a trail entry.
      "src/features/commands/b.ts": 'const feedback = { scope: "bom", rating: "wrong-fit" };\nconst rule = { scope: "declining", title: "Conflicting scope" };\n',
    });

    expect(runAuditScopeGate(root)).toEqual([]);
  });

  it("fails a scope listed twice", () => {
    const root = sandbox({
      [PANEL]: panel(["videowall", "videowall"]),
      "src/features/commands/a.ts": entry("videowall"),
    });

    const errors = runAuditScopeGate(root);
    expect(errors.some((error) => error.includes('"videowall" is listed more than once'))).toBe(true);
  });

  it("holds this checkout to the rule", () => {
    // The gate's own subject: the app may not write a scope the panel cannot
    // name, and this repository is the first file set it has to pass.
    expect(runAuditScopeGate(projectRoot)).toEqual([]);
  });
});
