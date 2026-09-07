import { describe, expect, it } from "vitest";
import { postgresArrayIncludes, queryRowsFromBody } from "./check-migration-live-state.mjs";

// Pins queryRowsFromBody to the ACTUAL response shapes of the Supabase
// Management API:
//   - /database/query/read-only (what the tool calls) returns the BARE SELECT
//     rows directly: [{ col: value, ... }, ...] or [] for an empty result.
//   - the sibling /database/query endpoint returns one ENVELOPE per
//     statement: [{ type: 'SELECT', rows: [...], ... }, ...].
// This regression test exists because 301ff764 shipped a parser that only
// understood the envelope shape and silently coerced every bare-rows response
// into [] - so a perfectly healthy schema read as 98 drifts. The tool could
// never catch it in CI because the token gate ran before the probe; a live run
// with a real token did.
describe("queryRowsFromBody", () => {
  it("passes bare row arrays through unchanged (read-only endpoint shape)", () => {
    const rows = [
      { tablename: "wingman_app_state" },
      { tablename: "wingman_users" },
    ];
    expect(queryRowsFromBody(rows)).toEqual(rows);
  });

  it("passes a single bare row object through", () => {
    const rows = [{ tablename: "wingman_sessions" }];
    expect(queryRowsFromBody(rows)).toEqual(rows);
  });

  it("returns [] for an empty result set (still an array)", () => {
    expect(queryRowsFromBody([])).toEqual([]);
  });

  it("flattens envelope-shaped responses (non-read-only endpoint shape)", () => {
    const body = [
      { type: "SELECT", rows: [{ count: 12 }] },
      { type: "SELECT", rows: [{ count: 0 }] },
    ];
    expect(queryRowsFromBody(body)).toEqual([{ count: 12 }, { count: 0 }]);
  });

  it("handles a single statement envelope", () => {
    const body = [{ type: "SELECT", rows: [{ x: 1 }] }];
    expect(queryRowsFromBody(body)).toEqual([{ x: 1 }]);
  });

  it("accepts a top-level object carrying rows", () => {
    const body = { rows: [{ x: 1 }], type: "SELECT" };
    expect(queryRowsFromBody(body)).toEqual([{ x: 1 }]);
  });

  it("throws on an unrecognized shape instead of silently returning []", () => {
    // An unrecognized shape must NEVER read as "no rows": the old parser's
    // silent [] made every expected object absent and reported total drift.
    expect(() => queryRowsFromBody({ message: "boom" })).toThrow(/Unexpected response shape/);
    expect(() => queryRowsFromBody("not json")).toThrow(/Unexpected response shape/);
    expect(() => queryRowsFromBody(null)).toThrow(/Unexpected response shape/);
  });

  it("distinguishes a bare scalar row from an envelope (column named type)", () => {
    // A SELECT that returns a column literally named `type` with a string
    // value and a column named `rows` would look envelope-ish only if `rows`
    // is an ARRAY; a scalar `rows` value must not be misclassified.
    const body = [{ type: "SELECT", rows: "not-an-array" }];
    expect(queryRowsFromBody(body)).toEqual(body);
  });
});

describe("postgresArrayIncludes", () => {
  it("accepts the PostgreSQL text representation returned for pg_policies.roles", () => {
    expect(postgresArrayIncludes("{service_role}", "service_role")).toBe(true);
  });

  it("also accepts decoded arrays", () => {
    expect(postgresArrayIncludes(["authenticated", "service_role"], "service_role")).toBe(true);
  });

  it("rejects missing roles and unexpected values", () => {
    expect(postgresArrayIncludes("{authenticated}", "service_role")).toBe(false);
    expect(postgresArrayIncludes(null, "service_role")).toBe(false);
  });
});
