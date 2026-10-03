import { describe, expect, it } from "vitest";

import { SECRETS, classify } from "./check-supabase-secret-config.mjs";

// The drill's contract: its classification must mirror the live gates'
// decision tree in supabase-rls.yml (unconfigured -> skip / scheduled fail,
// partial -> gate failure, full -> run), and the tool itself must NEVER be
// wired as a gate - a drill that can fail would defeat its own purpose.
const FULL = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SECRET_KEY: "service-role",
  SUPABASE_ACCESS_TOKEN: "management-token",
};

describe("supabase secret configuration drill", () => {
  it("exposes exactly the four Supabase secrets the live gates consume", () => {
    expect(SECRETS.map(({ name }) => name).sort()).toEqual([
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_URL",
    ]);
  });

  it("classifies the fully configured state as full-mode runs", () => {
    const result = classify(FULL);
    expect(result.state).toMatch(/fully configured/);
    expect(result.gateOutcome).toMatch(/full mode/);
  });

  it("classifies the unconfigured state as skip (loud only on scheduled runs)", () => {
    const result = classify({});
    expect(result.state).toBe("unconfigured");
    expect(result.gateOutcome).toMatch(/SKIP/);
    expect(result.gateOutcome).toMatch(/FAILS LOUDLY/);
  });

  it("classifies a missing SUPABASE_SECRET_KEY as the RLS gate's partial-setup failure", () => {
    const { SUPABASE_SECRET_KEY, ...rest } = FULL;
    void SUPABASE_SECRET_KEY;
    const result = classify(rest);
    expect(result.state).toMatch(/partial/);
    expect(result.gateOutcome).toMatch(/supabase-rls job FAILS/);
    expect(result.gateOutcome).toMatch(/SUPABASE_SECRET_KEY/);
  });

  it("classifies a missing SUPABASE_ACCESS_TOKEN as the parity gate's partial-setup failure", () => {
    const { SUPABASE_ACCESS_TOKEN, ...rest } = FULL;
    void SUPABASE_ACCESS_TOKEN;
    const result = classify(rest);
    expect(result.state).toMatch(/partial/);
    expect(result.gateOutcome).toMatch(/migration-live job FAILS/);
    expect(result.gateOutcome).toMatch(/SUPABASE_ACCESS_TOKEN/);
  });

  it("treats an anon key without a URL as unconfigured (the gates require the pair)", () => {
    const result = classify({ SUPABASE_ANON_KEY: "anon" });
    expect(result.state).toBe("unconfigured");
  });
});
