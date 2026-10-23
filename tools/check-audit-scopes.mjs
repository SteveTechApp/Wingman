import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Audit-scope guard.
 *
 * Every audit entry names a scope, and `AuditLogPanel` turns that key into the
 * label and icon a reader sees. A scope the panel does not know falls back to
 * the raw key and a clock — which is fine for data written by an older version,
 * and wrong for a trail type this code just invented: "design-project" printed
 * at a reader is a stored key wearing a heading.
 *
 * So the panel owns the list (`AUDIT_SCOPES`) and this gate holds every scope
 * the app writes to it:
 *
 * - the list is read from the panel, so there is one place to add a scope;
 * - every `scope: "…"` written on an audit entry (an object that also names an
 *   `action` and an `actorName`, which is what `ProjectAuditEntry` requires) has
 *   to be in that list;
 * - each listed scope has a label and an icon in `SCOPE_CONFIG`, so the map
 *   cannot fall behind the list even when the typecheck is not the tool running.
 *
 * The scan reads string literals. A scope built from a variable is outside its
 * reach — and that is the one case the runtime fallback still covers, because
 * the code cannot prove what a variable holds.
 *
 * Usage:
 *   node tools/check-audit-scopes.mjs
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const AUDIT_PANEL_SOURCE = "src/wingman2/components/AuditLogPanel.tsx";

const SCOPES_PATTERN = /AUDIT_SCOPES\s*=\s*\[([\s\S]*?)\]\s*as const/;
const SCOPE_LITERAL = /\bscope:\s*(["'`])([^"'`\n]+)\1/g;
/** How far from a `scope:` literal its entry's other fields may sit. */
const ENTRY_WINDOW = 900;
const SCAN_ROOTS = ["src"];
const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".freebuff", "dist", "coverage", "data"]);

/** The scopes the panel gives a label to, in source order. */
export function labelledScopes(source) {
  const list = SCOPES_PATTERN.exec(source);
  if (!list) return [];
  return [...list[1].matchAll(/(["'])([^"'\n]+)\1/g)].map((match) => match[2]);
}

/** True when the panel's map still answers a scope with a label and an icon. */
export function scopeHasLabel(source, scope) {
  const key = /^[a-z]+$/.test(scope) ? scope : `"${scope}"`;
  return new RegExp(`\\n\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*\\{ icon: [A-Z]`).test(source);
}

/**
 * The scopes written on audit entries in one source file, with where they are.
 *
 * The entry is recognised by what `ProjectAuditEntry` requires beside the scope:
 * an action and an actor name. A `scope:` on some other record (recommendation
 * feedback, a decision-integrity rule, a governed profile group) has neither,
 * so it is not mistaken for a trail entry.
 */
export function auditScopeLiterals(source) {
  const found = [];
  for (const match of source.matchAll(SCOPE_LITERAL)) {
    const at = match.index ?? 0;
    const window = source.slice(Math.max(0, at - ENTRY_WINDOW), at + ENTRY_WINDOW);
    if (!/\bactorName\b/.test(window) || !/\baction\b/.test(window)) continue;
    found.push({ scope: match[2], line: source.slice(0, at).split("\n").length });
  }
  return found;
}

function sourceFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(path.join(directory, entry.name));
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/\.(test|spec)\.[cm]?tsx?$/.test(entry.name)) continue;
      files.push(path.join(directory, entry.name));
    }
  };
  for (const relative of SCAN_ROOTS) {
    const absolute = path.join(root, relative);
    if (fs.existsSync(absolute)) walk(absolute);
  }
  return files;
}

/** Runs the guard over a checkout. Returns the messages that block the commit. */
export function runAuditScopeGate(root = projectRoot) {
  const errors = [];
  const panelPath = path.join(root, AUDIT_PANEL_SOURCE);
  if (!fs.existsSync(panelPath)) {
    return [`Audit panel missing: ${AUDIT_PANEL_SOURCE}`];
  }
  const panel = fs.readFileSync(panelPath, "utf8");
  const labelled = labelledScopes(panel);
  if (!labelled.length) {
    return [`${AUDIT_PANEL_SOURCE} has no AUDIT_SCOPES list.`];
  }

  const duplicates = labelled.filter((scope, index) => labelled.indexOf(scope) !== index);
  for (const scope of new Set(duplicates)) {
    errors.push(`${AUDIT_PANEL_SOURCE}: "${scope}" is listed more than once.`);
  }

  for (const scope of labelled) {
    if (!scopeHasLabel(panel, scope)) {
      errors.push(
        `${AUDIT_PANEL_SOURCE}: "${scope}" has no label and icon in SCOPE_CONFIG, so its trail entries would print the raw key.`,
      );
    }
  }

  const known = new Set(labelled);
  for (const file of sourceFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    for (const entry of auditScopeLiterals(source)) {
      if (known.has(entry.scope)) continue;
      errors.push(
        `${path.relative(root, file).replace(/\\/g, "/")}:${entry.line}: audit scope "${entry.scope}" is not in AUDIT_SCOPES — add it to ${AUDIT_PANEL_SOURCE} with a label and an icon.`,
      );
    }
  }

  return errors;
}

function main() {
  const errors = runAuditScopeGate(projectRoot);
  if (errors.length) {
    console.error("[audit-scopes] FAILED. An audit trail would print a scope key instead of a label:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log("[audit-scopes] Every audit scope the app writes has a label and an icon.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
