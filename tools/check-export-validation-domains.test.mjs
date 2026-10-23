import { describe, expect, it } from "vitest";
import { auditExportValidationDomains } from "./check-export-validation-domains.mjs";

function moduleSource({
  registry = ['"alpha"', '"beta"'],
  produced = ['"alpha"', '"beta"'],
  derivedType = true,
} = {}) {
  return `
export const EXPORT_VALIDATION_DOMAINS = [
  ${registry.join(", ")}
] as const;

export type ExportValidationDomain = ${derivedType ? "(typeof EXPORT_VALIDATION_DOMAINS)[number]" : '"alpha" | "beta"'};

export type ExportValidationBlocker = {
  id: string;
  domain: ExportValidationDomain;
};

function alphaCheck() { return { domain: ${produced[0] ?? '"alpha"'} }; }
function betaCheck() { return { domain: ${produced[1] ?? '"alpha"'} }; }
`;
}

const importing = `import { validateProposalExport } from "./proposalExportValidation";\n`;

const proveBoth = [
  {
    file: "src/alpha.test.ts",
    source: `${importing}it("alpha", () => { expect(entry.domain).toBe("alpha"); });`,
  },
  {
    file: "src/beta.test.ts",
    source: `${importing}it("beta", () => { expect(result.warnings[0].domain).toBe("beta"); });`,
  },
];

const audit = (overrides = {}) =>
  auditExportValidationDomains({ moduleSource: moduleSource(), tests: proveBoth, allowance: null, ...overrides });

describe("export-validation domain guard", () => {
  it("passes when every registered domain has a test that reads its domain", () => {
    const result = audit();

    expect(result.errors).toEqual([]);
    expect(result.unproven).toEqual([]);
    expect(result.observed.get("alpha")).toBe("src/alpha.test.ts:2");
    expect(result.observed.get("beta")).toBe("src/beta.test.ts:2");
  });

  it("fails a registered domain that no test observes", () => {
    const result = audit({ tests: proveBoth.slice(0, 1) });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('no test covers "beta"');
  });

  it("does not count a `.domain` read in a test that never imports the module", () => {
    const result = audit({
      tests: [
        proveBoth[0],
        { file: "src/other.test.ts", source: `it("other", () => { expect(record.domain).toBe("beta"); });` },
      ],
    });

    expect(result.errors[0]).toContain('no test covers "beta"');
  });

  it("does not count a test that names the domain without reading a produced entry", () => {
    const result = audit({
      tests: [
        proveBoth[0],
        { file: "src/beta.test.ts", source: `it("beta", () => { expect("beta").toBe("beta"); });` },
      ],
    });

    expect(result.errors[0]).toContain('no test covers "beta"');
  });

  it("counts an assertion split across lines, because the statement is the unit", () => {
    const result = audit({
      tests: [
        proveBoth[0],
        {
          file: "src/beta.test.ts",
          source: `${importing}it("beta", () => {
  expect(
    result.warnings[0].domain,
  ).toBe("beta");
});`,
        },
      ],
    });

    expect(result.errors).toEqual([]);
  });

  it("accepts an allowance for a domain that cannot be proven, and reports it", () => {
    const result = audit({
      tests: proveBoth.slice(0, 1),
      allowance: { unproven: [{ domain: "beta", reason: "the check cannot fire yet" }] },
    });

    expect(result.errors).toEqual([]);
    expect(result.unproven).toEqual([{ domain: "beta", reason: "the check cannot fire yet" }]);
  });

  it("refuses an allowance whose domain a test now covers", () => {
    const result = audit({ allowance: { unproven: [{ domain: "beta", reason: "no longer true" }] } });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('records "beta" as unproven, but src/beta.test.ts:2 now proves it');
  });

  it("refuses an allowance that names no registered domain", () => {
    const result = audit({ allowance: { unproven: [{ domain: "gamma", reason: "gone" }] } });

    expect(result.errors.some((error) => error.includes('records "gamma" as unproven, but no such domain is registered'))).toBe(true);
  });

  it("refuses an allowance without a reason", () => {
    const result = audit({
      tests: proveBoth.slice(0, 1),
      allowance: { unproven: [{ domain: "beta", reason: "  " }] },
    });

    expect(result.errors[0]).toContain('the allowance for "beta" gives no reason');
  });

  it("fails a check whose domain is not registered", () => {
    const result = audit({ moduleSource: moduleSource({ produced: ['"alpha"', '"gamma"'] }) });

    expect(result.errors.some((error) => error.includes('a check attaches "gamma"'))).toBe(true);
  });

  it("fails a registered domain that no check produces", () => {
    const result = audit({ moduleSource: moduleSource({ registry: ['"alpha"', '"beta"', '"gamma"'], produced: ['"alpha"', '"beta"'] }) });

    expect(result.errors.some((error) => error.includes('the registry lists "gamma" but no check produces it'))).toBe(true);
  });

  it("fails when the domain type is a hand-written union instead of the registry", () => {
    const result = audit({ moduleSource: moduleSource({ derivedType: false }) });

    expect(result.errors.some((error) => error.includes("domain type must be derived from the registry"))).toBe(true);
  });

  it("fails a duplicate registry entry", () => {
    const result = audit({ moduleSource: moduleSource({ registry: ['"alpha"', '"beta"', '"beta"'] }) });

    expect(result.errors.some((error) => error.includes('lists "beta" more than once'))).toBe(true);
  });

  it("fails when there is no registry to hold to a test", () => {
    const result = audit({ moduleSource: "export type ExportValidationBlocker = { domain: string };" });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("no EXPORT_VALIDATION_DOMAINS registry");
  });
});
