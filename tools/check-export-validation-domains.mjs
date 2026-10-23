import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Export-validation domain guard.
 *
 * `validateProposalExport` answers in domains — reach, power, chain, lifecycle,
 * discovery, transport, survey, currency — and each domain is a promise that
 * some check looked at the design. A check that ships without a test is a
 * promise nobody has watched being kept: the currency warning is the shape of
 * it, a new domain added to the registry and asserted nowhere.
 *
 * So the gate asks each registered domain for its proof:
 *
 * - the domain is registered (`EXPORT_VALIDATION_DOMAINS` in
 *   `proposalExportValidation.ts`), and the blocker type is derived from that
 *   list, so a new check cannot name a domain the guard never asks about;
 * - some check in the module produces it (a registry entry nobody can raise is
 *   not coverage, it is a placeholder);
 * - a test reads `.domain` off a produced entry and names the domain, which is
 *   what "a test covers it" means in practice — the check ran, produced an
 *   entry, and the test looked at which domain it came from.
 *
 * A domain that cannot be proven yet is recorded in
 * `tools/wingman-export-validation-domains.json` with the reason, and the gate
 * refuses that allowance once a test does cover the domain, so the file only
 * ratchets down. It prints what is still unproven on every run rather than
 * letting an exemption go quiet.
 *
 * Usage:
 *   node tools/check-export-validation-domains.mjs
 */

export const EXPORT_VALIDATION_MODULE = "src/wingman2/lib/proposalExportValidation.ts";
export const EXPORT_VALIDATION_DOMAIN_ALLOWANCE = "tools/wingman-export-validation-domains.json";

const REGISTRY_PATTERN = /EXPORT_VALIDATION_DOMAINS\s*=\s*\[([\s\S]*?)\]\s*as const/;
const DERIVED_TYPE_PATTERN = /ExportValidationDomain\s*=\s*\(typeof EXPORT_VALIDATION_DOMAINS\)\[number\]/;
const BLOCKER_FIELD_PATTERN = /domain:\s*ExportValidationDomain/;
const PRODUCED_PATTERN = /\bdomain:\s*(["'])([^"'`\n]+)\1/g;
const STATEMENT_PATTERN = /[;]/;
// Only a test of this module can prove one of its domains: a `.domain` read in
// some other suite is reading some other record's domain.
const MODULE_IMPORT_PATTERN = /from\s+["'`][^"'`]*proposalExportValidation["'`]/;

function quoted(value) {
  return `"${value}"`;
}

/** Domains the module registers as the full set of checks it can raise. */
export function registeredDomains(source) {
  const registry = REGISTRY_PATTERN.exec(source);
  if (!registry) return [];
  return [...registry[1].matchAll(/(["'])([^"'`\n]+)\1/g)].map((match) => match[2]);
}

/** Domains a check in the module actually attaches to an entry. */
export function producedDomains(source) {
  return [...source.matchAll(PRODUCED_PATTERN)].map((match) => match[2]);
}

/**
 * Splits a file at statement boundaries (`;`), keeping the offset of each one.
 * An assertion can span several lines, so the unit is the statement, not the
 * line: `expect(entry.domain)` on one line and the expected value on the next
 * still read the domain together.
 */
function statements(source) {
  const output = [];
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (!STATEMENT_PATTERN.test(source[index])) continue;
    output.push({ text: source.slice(start, index), offset: start });
    start = index + 1;
  }
  if (start < source.length) output.push({ text: source.slice(start), offset: start });
  return output;
}

function lineOf(source, offset) {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

/**
 * Where each domain is proven: a statement that reads a produced entry's
 * `domain` and names that domain.
 *
 * Reading `.domain` is what ties the literal to a produced entry rather than to
 * a comment or a fixture, so a test that merely spells out "currency" somewhere
 * does not count.
 */
export function observedDomains(tests) {
  const found = new Map();
  for (const { file, source } of tests) {
    for (const statement of statements(source)) {
      const read = statement.text.indexOf(".domain");
      if (read === -1) continue;
      for (const literal of statement.text.matchAll(/(["'])([^"'`\n]+)\1/g)) {
        if (found.has(literal[2])) continue;
        found.set(literal[2], `${file}:${lineOf(source, statement.offset + read)}`);
      }
    }
  }
  return found;
}

/**
 * The guard itself, over sources already read from disk, so it can be tested
 * without a fixture tree.
 */
export function auditExportValidationDomains({ moduleSource, tests, allowance }) {
  const errors = [];
  const registered = registeredDomains(moduleSource);
  const produced = new Set(producedDomains(moduleSource));
  const observed = observedDomains(tests.filter((test) => MODULE_IMPORT_PATTERN.test(test.source)));

  if (registered.length === 0) {
    errors.push(
      `${EXPORT_VALIDATION_MODULE} has no EXPORT_VALIDATION_DOMAINS registry, so there is nothing to hold to a test.`,
    );
    return { errors, registered, observed, unproven: [] };
  }

  // A check can only be asked for its test if the registry is the one place the
  // domain list lives: a hand-written union would let a domain in through the
  // type without the guard ever naming it.
  if (!DERIVED_TYPE_PATTERN.test(moduleSource)) {
    errors.push(
      "the domain type must be derived from the registry (ExportValidationDomain = (typeof EXPORT_VALIDATION_DOMAINS)[number]), or a check can name a domain the guard never asks about.",
    );
  }
  if (!BLOCKER_FIELD_PATTERN.test(moduleSource)) {
    errors.push("ExportValidationBlocker.domain must be typed as ExportValidationDomain, not as its own union.");
  }

  const duplicates = registered.filter((domain, index) => registered.indexOf(domain) !== index);
  for (const domain of new Set(duplicates)) {
    errors.push(`the registry lists ${quoted(domain)} more than once.`);
  }

  for (const domain of [...produced].sort()) {
    if (!registered.includes(domain)) {
      errors.push(
        `a check attaches ${quoted(domain)}, which is not in EXPORT_VALIDATION_DOMAINS — register it so the guard asks it for a test.`,
      );
    }
  }
  for (const domain of registered) {
    if (!produced.has(domain)) {
      errors.push(
        `the registry lists ${quoted(domain)} but no check produces it — a domain nobody can raise is not coverage.`,
      );
    }
  }

  const allowed = new Map();
  for (const entry of allowance?.unproven ?? []) {
    const domain = String(entry?.domain ?? "");
    const reason = String(entry?.reason ?? "").trim();
    if (!domain) {
      errors.push("an unproven allowance entry names no domain.");
      continue;
    }
    if (!registered.includes(domain)) {
      errors.push(
        `the allowance records ${quoted(domain)} as unproven, but no such domain is registered — drop the stale entry.`,
      );
      continue;
    }
    if (observed.has(domain)) {
      errors.push(
        `the allowance records ${quoted(domain)} as unproven, but ${observed.get(domain)} now proves it — drop the entry.`,
      );
      continue;
    }
    if (!reason) {
      errors.push(`the allowance for ${quoted(domain)} gives no reason.`);
      continue;
    }
    allowed.set(domain, reason);
  }

  const unproven = [];
  for (const domain of registered) {
    if (observed.has(domain)) continue;
    if (allowed.has(domain)) {
      unproven.push({ domain, reason: allowed.get(domain) });
      continue;
    }
    errors.push(
      `no test covers ${quoted(domain)}: add a test importing proposalExportValidation that reads \`.domain\` off an entry this check produced, or record the domain as unproven in ${EXPORT_VALIDATION_DOMAIN_ALLOWANCE} with the reason.`,
    );
  }

  return { errors, registered, observed, unproven };
}

function testFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
        continue;
      }
      if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, "src"));
  return files;
}

export function runExportValidationDomainGate({ root = process.cwd(), log = console.log, error = console.error } = {}) {
  const modulePath = path.join(root, EXPORT_VALIDATION_MODULE);
  if (!fs.existsSync(modulePath)) {
    error(`[export-validation-domains] Missing ${EXPORT_VALIDATION_MODULE}.`);
    return 1;
  }

  const allowancePath = path.join(root, EXPORT_VALIDATION_DOMAIN_ALLOWANCE);
  let allowance = { unproven: [] };
  if (fs.existsSync(allowancePath)) {
    try {
      allowance = JSON.parse(fs.readFileSync(allowancePath, "utf8"));
    } catch (caught) {
      error(`[export-validation-domains] ${EXPORT_VALIDATION_DOMAIN_ALLOWANCE} is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`);
      return 1;
    }
  }

  const tests = testFiles(root).map((file) => ({
    file: path.relative(root, file).split(path.sep).join("/"),
    source: fs.readFileSync(file, "utf8"),
  }));

  const { errors, registered, observed, unproven } = auditExportValidationDomains({
    moduleSource: fs.readFileSync(modulePath, "utf8"),
    tests,
    allowance,
  });

  unproven.forEach(({ domain, reason }) => {
    log(`[export-validation-domains] UNPROVEN ${quoted(domain)}: ${reason}`);
  });

  if (errors.length > 0) {
    error("[export-validation-domains] FAILED. Export-validation domains without proof:");
    errors.forEach((failure) => error(`- ${failure}`));
    return 1;
  }

  const proven = registered.filter((domain) => observed.has(domain)).length;
  log(
    `[export-validation-domains] OK. ${registered.length} domain${registered.length === 1 ? "" : "s"}: ${proven} proven by a test, ${unproven.length} recorded as unproven.`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runExportValidationDomainGate());
}
