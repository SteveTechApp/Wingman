import { describe, expect, it } from "vitest";
import {
  applyAllowlist,
  collectPostgrestReadViolations,
  scanSourceForUnboundedReads,
} from "./check-postgrest-reads.mjs";

function violationsFor(source) {
  return scanSourceForUnboundedReads(source, "fixture.mjs");
}

describe("supabase-js chain scanning", () => {
  it("flags a full-table select with no bound", () => {
    const violations = violationsFor(`const { data } = await client.from("wingman_users").select("*");`);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: "supabase-js", file: "fixture.mjs" });
  });

  it("flags a chain whose only modifiers are order (sort is not a bound)", () => {
    const violations = violationsFor(
      `const rows = await client.from("events").select("*").order("event_ts", { ascending: false });`,
    );
    expect(violations).toHaveLength(1);
  });

  it("passes .limit() and .range()", () => {
    expect(
      violationsFor(`await client.from("events").select("*").order("ts").limit(50);`),
    ).toHaveLength(0);
    expect(
      violationsFor(`await client.from("events").select("*").range(0, 999);`),
    ).toHaveLength(0);
  });

  it("passes a head-only exact count (zero rows transferred)", () => {
    expect(
      violationsFor(`const { count } = await client.from("t").select("id", { head: true, count: "exact" });`),
    ).toHaveLength(0);
  });

  it("passes single-row terminators", () => {
    expect(violationsFor(`await client.from("t").select("*").eq("id", id).maybeSingle();`)).toHaveLength(0);
    expect(violationsFor(`await client.from("t").select("*").limit(1).single();`)).toHaveLength(0);
  });

  it("passes a select carrying any filter predicate", () => {
    expect(violationsFor(`await client.from("t").select("*").lt("ts", iso);`)).toHaveLength(0);
    expect(violationsFor(`await client.from("t").select("*").in("id", ids);`)).toHaveLength(0);
  });

  it("ignores non-select chains (writes without returning)", () => {
    expect(violationsFor(`await client.from("t").upsert(row, { onConflict: "id" });`)).toHaveLength(0);
    expect(violationsFor(`await client.from("t").delete().neq("id", "");`)).toHaveLength(0);
  });

  it("ignores matches on comment lines", () => {
    const source = [
      '// const { data } = await client.from("t").select("*");',
      "/*",
      ' * await client.from("t").select("*");',
      " */",
      "const ok = true;",
    ].join("\n");
    expect(violationsFor(source)).toHaveLength(0);
  });
});

describe("raw PostgREST fetch scanning", () => {
  it("flags a bare GET to rest/v1 with no query bound", () => {
    const violations = violationsFor("const r = await fetch(`${url}/rest/v1/wingman_audit_events`, { headers: ANON });");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe("rest-fetch");
  });

  it("passes limit= and filter-predicate URLs", () => {
    expect(
      violationsFor("await fetch(`${url}/rest/v1/t?select=id&limit=1`, { headers: H });"),
    ).toHaveLength(0);
    expect(
      violationsFor("await fetch(`${url}/rest/v1/t?id=eq.${id}&select=id`, { headers: H });"),
    ).toHaveLength(0);
  });

  it("skips write methods even without a bound", () => {
    expect(
      violationsFor(`await fetch(\`\${url}/rest/v1/t\`, { method: "POST", body: "{}" });`),
    ).toHaveLength(0);
    expect(
      violationsFor(`await fetch(\`\${url}/rest/v1/t?id=eq.x\`, { method: "DELETE", headers: H });`),
    ).toHaveLength(0);
  });

  it("ignores fetches to non-PostgREST URLs", () => {
    expect(violationsFor(`await fetch("https://api.osv.dev/v1/querybatch", { method: "POST" });`)).toHaveLength(0);
  });
});

describe("allowlist", () => {
  it("exempts exactly the allowlisted files, with justification required", () => {
    const violations = [
      { file: "tools/verify-supabase-rls.mjs", line: 1, kind: "rest-fetch", snippet: "..." },
      { file: "server/new-store.mjs", line: 2, kind: "supabase-js", snippet: "..." },
    ];
    const kept = applyAllowlist(violations);
    expect(kept.map((violation) => violation.file)).toEqual(["server/new-store.mjs"]);
  });
});

describe("clean posture of the real tree", () => {
  it("finds no unbounded PostgREST reads in server/ or tools/ as committed", () => {
    expect(collectPostgrestReadViolations()).toEqual([]);
  });
});
