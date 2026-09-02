import { describe, expect, it } from "vitest";
import {
  collectSupabaseRlsWorkflowProblems,
  checkSupabaseRlsWorkflowFiles,
} from "./check-supabase-rls-workflow.mjs";

// Minimal stand-ins for .github/workflows/supabase-rls.yml and its two callers.
function cleanReusableWorkflow() {
  return [
    "name: Supabase live gates (RLS sentinel + migration parity)",
    "on:",
    "  workflow_call:",
    "",
    "jobs:",
    "  supabase-rls:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Verify secrets are configured",
    "        id: secrets",
    "        run: |",
    '          if [ -z "${{ secrets.SUPABASE_URL }}" ] || [ -z "${{ secrets.SUPABASE_ANON_KEY }}" ]; then',
    '            echo "skipped=true" >> "$GITHUB_OUTPUT"',
    '          elif [ -z "${{ secrets.SUPABASE_SECRET_KEY }}" ]; then',
    "            exit 1",
    "          else",
    '            echo "skipped=false" >> "$GITHUB_OUTPUT"',
    "          fi",
    "",
    "      - name: Verify live RLS posture (sentinel probe)",
    '        if: steps.secrets.outputs.skipped == \'false\'',
    "        run: node tools/verify-supabase-rls.mjs",
    "        env:",
    "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}",
    "          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}",
    "          SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}",
    "",
    "  migration-live:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Verify access token is configured",
    "        id: token",
    "        run: |",
    '          if [ -z "${{ secrets.SUPABASE_URL }}" ]; then',
    '            echo "skipped=true" >> "$GITHUB_OUTPUT"',
    '          elif [ -z "${{ secrets.SUPABASE_ACCESS_TOKEN }}" ]; then',
    "            exit 1",
    "          else",
    '            echo "skipped=false" >> "$GITHUB_OUTPUT"',
    "          fi",
    "",
    "      - name: Verify live schema matches migration files",
    '        if: steps.token.outputs.skipped == \'false\'',
    "        run: node tools/check-migration-live-state.mjs",
    "        env:",
    "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}",
    "          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}",
    "",
  ].join("\n");
}

function cleanCaller(name = "ci.yml") {
  return [
    "jobs:",
    "  supabase-rls:",
    "    name: Supabase RLS (live, sentinel)",
    "    uses: ./.github/workflows/supabase-rls.yml",
    "    secrets: inherit",
    "",
  ].join("\n");
}

function problemsFor({ reusable = cleanReusableWorkflow(), callers = [{ file: "ci.yml", text: cleanCaller() }] } = {}) {
  return collectSupabaseRlsWorkflowProblems({ reusable, callers });
}

const expectProblemMatching = (problems, pattern) => {
  expect(problems.length).toBeGreaterThan(0);
  expect(problems.some((problem) => pattern.test(problem))).toBe(true);
};

describe("collectSupabaseRlsWorkflowProblems", () => {
  it("passes clean wiring: all three secrets referenced, mapped, gated, and inherited", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("passes when the nightly caller is checked alongside ci.yml", () => {
    const callers = [
      { file: "ci.yml", text: cleanCaller("ci.yml") },
      { file: "supabase-rls-nightly.yml", text: cleanCaller("supabase-rls-nightly.yml") },
    ];
    expect(problemsFor({ callers })).toEqual([]);
  });

  it("fails when the SUPABASE_SECRET_KEY env mapping is dropped from the live step", () => {
    const reusable = cleanReusableWorkflow().replace(
      "          SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}",
      "",
    );
    expectProblemMatching(
      problemsFor({ reusable }),
      /env no longer maps SUPABASE_SECRET_KEY/,
    );
  });

  it("fails when the secrets gate stops referencing a secret", () => {
    // Strip BOTH references (gate check + env mapping): a secret that only
    // exists in the env block is wired but never gate-checked, and one that
    // only exists in the gate is never passed to the tool - either way the
    // wiring is incomplete.
    const reusable = cleanReusableWorkflow()
      .split(' || [ -z "${{ secrets.SUPABASE_ANON_KEY }}" ];')
      .join("")
      .split("SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}")
      .join("");
    expectProblemMatching(
      problemsFor({ reusable }),
      /secrets gate no longer references SUPABASE_ANON_KEY|env no longer maps SUPABASE_ANON_KEY/,
    );
  });

  it("fails when a secret is removed from the gate but kept in the env mapping (scope regression)", () => {
    // P2: a whole-file search for "secrets.SUPABASE_ANON_KEY" still finds the
    // env mapping below the tool line, so removing the gate reference alone
    // used to pass silently - the exact regression this scoped check blocks.
    const reusable = cleanReusableWorkflow().split(
      ' || [ -z "${{ secrets.SUPABASE_ANON_KEY }}" ];',
    ).join("");
    expectProblemMatching(
      problemsFor({ reusable }),
      /RLS sentinel secrets gate no longer references SUPABASE_ANON_KEY/,
    );
  });

  it("passes when a secret lives in the RLS job's env without polluting the migration job's gate", () => {
    // The migration-parity gate needs URL + ACCESS_TOKEN only; SUPABASE_ANON_KEY
    // / SUPABASE_SECRET_KEY appear later in the file (RLS env). The scoped gate
    // search must not be fooled by those - and it must not demand RLS secrets
    // inside the migration gate either.
    const callers = [
      { file: "ci.yml", text: cleanCaller("ci.yml") },
      { file: "supabase-rls-nightly.yml", text: cleanCaller("supabase-rls-nightly.yml") },
    ];
    expect(problemsFor({ callers })).toEqual([]);
  });

  it("fails when the migration-live env mapping for SUPABASE_ACCESS_TOKEN is dropped", () => {
    const reusable = cleanReusableWorkflow().replace(
      "          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n",
      "",
    );
    expectProblemMatching(
      problemsFor({ reusable }),
      /migration-parity live step env no longer maps SUPABASE_ACCESS_TOKEN/,
    );
  });

  it("fails when the migration-live tool invocation is removed", () => {
    const reusable = cleanReusableWorkflow().replace(
      "        run: node tools/check-migration-live-state.mjs",
      "        run: echo nothing",
    );
    expectProblemMatching(
      problemsFor({ reusable }),
      /migration-parity job no longer runs tools\/check-migration-live-state\.mjs/,
    );
  });

  it("fails when the migration-live gate loses its partial-setup exit branch", () => {
    const reusable = cleanReusableWorkflow().split(
      '          elif [ -z "${{ secrets.SUPABASE_ACCESS_TOKEN }}" ]; then\n            exit 1',
    ).join(
      '          else',
    );
    expectProblemMatching(
      problemsFor({ reusable }),
      /migration-parity secrets gate has no failing branch/,
    );
  });

  it("fails when the migration-live live step is no longer gated on its token check", () => {
    const reusable = cleanReusableWorkflow().replace(
      "        if: steps.token.outputs.skipped == 'false'",
      "",
    );
    expectProblemMatching(
      problemsFor({ reusable }),
      /migration-parity live step is no longer gated on the secrets check/,
    );
  });

  it("fails when the partial-setup branch no longer exits non-zero", () => {
    const reusable = cleanReusableWorkflow().replace("            exit 1", '            echo "note: continuing in read-only mode"');
    expectProblemMatching(problemsFor({ reusable }), /no failing branch/);
  });

  it("fails when the live step is no longer gated on the secrets check", () => {
    const reusable = cleanReusableWorkflow().replace(
      '        if: steps.secrets.outputs.skipped == \'false\'',
      "",
    );
    expectProblemMatching(problemsFor({ reusable }), /no longer gated on the secrets check/);
  });

  it("fails when the live step has no env block at all", () => {
    const reusable = cleanReusableWorkflow()
      .split("\n")
      .filter((line) => !line.includes("env:") && !line.includes("${{ secrets."))
      .join("\n");
    expectProblemMatching(problemsFor({ reusable }), /live step has no env block/);
  });

  it("fails when a caller stops passing secrets: inherit", () => {
    const callers = [{ file: "ci.yml", text: cleanCaller().replace("    secrets: inherit", "") }];
    expectProblemMatching(problemsFor({ callers }), /without `secrets: inherit`/);
  });

  it("fails when a caller stops referencing the reusable workflow", () => {
    const callers = [{ file: "nightly", text: "jobs: {}" }];
    expectProblemMatching(problemsFor({ callers }), /no longer references the reusable Supabase RLS workflow/);
  });

  it("fails when the tool invocation is removed from the reusable workflow", () => {
    const reusable = cleanReusableWorkflow().replace("run: node tools/verify-supabase-rls.mjs", "run: echo nothing");
    expectProblemMatching(problemsFor({ reusable }), /no longer runs tools\/verify-supabase-rls\.mjs/);
  });
});

describe("checkSupabaseRlsWorkflowFiles (real files)", () => {
  it("passes the committed supabase-rls.yml wiring and both callers", () => {
    expect(checkSupabaseRlsWorkflowFiles()).toEqual([]);
  });
});
