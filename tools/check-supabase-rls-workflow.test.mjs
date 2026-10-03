import { describe, expect, it } from "vitest";
import {
  collectE2eSmokeHermeticityProblems,
  collectSupabaseRlsWorkflowProblems,
  checkSupabaseRlsWorkflowFiles,
  E2E_SMOKE_HERMETICITY_MARKERS,
} from "./check-supabase-rls-workflow.mjs";

// Minimal stand-ins for .github/workflows/supabase-rls.yml and its two callers.
function cleanReusableWorkflow() {
  return [
    "name: Supabase live gates (RLS sentinel + migration parity)",
    "on:",
    "  workflow_call:",
    "    inputs:",
    "      require_secrets:",
    "        required: false",
    "        type: boolean",
    "        default: false",
    "",
    "jobs:",
    "  supabase-rls:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Verify secrets are configured",
    "        id: secrets",
    "        env:",
    "          REQUIRE_SECRETS: ${{ inputs.require_secrets }}",
    "        run: |",
    '          if [ -z "${{ secrets.SUPABASE_URL }}" ] || [ -z "${{ secrets.SUPABASE_ANON_KEY }}" ]; then',
    '            if [ "$REQUIRE_SECRETS" = "true" ]; then',
    '              echo "::error::Supabase secrets are unavailable and require_secrets is set."',
    "              exit 1",
    "            fi",
    '            echo "skipped=true" >> "$GITHUB_OUTPUT"',
    '          elif [ -z "${{ secrets.SUPABASE_SECRET_KEY }}" ]; then',
    "            exit 1",
    "          else",
    '            echo "skipped=false" >> "$GITHUB_OUTPUT"',
    "          fi",
    "",
    "      - name: Verify live RLS posture (sentinel probe)",
    "        if: steps.secrets.outputs.skipped == 'false'",
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
    "        env:",
    "          REQUIRE_SECRETS: ${{ inputs.require_secrets }}",
    "        run: |",
    '          if [ -z "${{ secrets.SUPABASE_URL }}" ]; then',
    '            if [ "$REQUIRE_SECRETS" = "true" ]; then',
    '              echo "::error::SUPABASE_URL is unavailable and require_secrets is set."',
    "              exit 1",
    "            fi",
    '            echo "skipped=true" >> "$GITHUB_OUTPUT"',
    '          elif [ -z "${{ secrets.SUPABASE_ACCESS_TOKEN }}" ]; then',
    "            exit 1",
    "          else",
    '            echo "skipped=false" >> "$GITHUB_OUTPUT"',
    "          fi",
    "",
    "      - name: Verify live schema matches migration files",
    "        if: steps.token.outputs.skipped == 'false'",
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

function cleanNightlyCaller(name = "supabase-rls-nightly.yml") {
  return [
    "on:",
    "  schedule:",
    "    - cron: '30 3 * * *'",
    "jobs:",
    "  supabase-gates:",
    "    name: Supabase live gates",
    "    uses: ./.github/workflows/supabase-rls.yml",
    "    with:",
    "      require_secrets: true",
    "    secrets: inherit",
    "",
  ].join("\n");
}

function problemsFor({
  reusable = cleanReusableWorkflow(),
  callers = [
    { file: "ci.yml", text: cleanCaller() },
    { file: "supabase-rls-nightly.yml", text: cleanNightlyCaller(), scheduled: true },
  ],
} = {}) {
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
    expect(problemsFor()).toEqual([]);
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

  it("fails when a gate loses every failing branch (partial setup or required secrets)", () => {
    // With require_secrets the gates carry TWO loud branches (the required-
    // secrets failure and the partial-setup failure). Removing every exit
    // must trip the no-failing-branch check for either job.
    const reusable = cleanReusableWorkflow().split("            exit 1").join('            echo "continuing"');
    expectProblemMatching(problemsFor({ reusable }), /no failing branch/);
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

  it("fails when the live step is no longer gated on the secrets check", () => {
    const reusable = cleanReusableWorkflow().replace(
      "        if: steps.secrets.outputs.skipped == 'false'",
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
    const callers = [{ file: "nightly", text: "jobs: {}", scheduled: true }];
    expectProblemMatching(problemsFor({ callers }), /no longer references the reusable Supabase RLS workflow/);
  });

  it("fails when the tool invocation is removed from the reusable workflow", () => {
    const reusable = cleanReusableWorkflow().replace("run: node tools/verify-supabase-rls.mjs", "run: echo nothing");
    expectProblemMatching(problemsFor({ reusable }), /no longer runs tools\/verify-supabase-rls\.mjs/);
  });
});

describe("scheduled callers must demand their secrets (require_secrets)", () => {
  it("fails when the nightly caller omits require_secrets: true", () => {
    // The exact regression this blocks: a scheduled live gate whose secrets
    // vanish silently skips to green on every future night.
    const callers = [
      { file: "ci.yml", text: cleanCaller() },
      { file: "supabase-rls-nightly.yml", text: cleanNightlyCaller().replace("      require_secrets: true\n", ""), scheduled: true },
    ];
    expectProblemMatching(
      problemsFor({ callers }),
      /scheduled caller but does not set `require_secrets: true`/,
    );
  });

  it("passes when the scheduled caller demands the secrets", () => {
    expect(problemsFor()).toEqual([]);
  });

  it("does not demand require_secrets from push/PR callers (fork PRs must still skip)", () => {
    const callers = [{ file: "ci.yml", text: cleanCaller() }];
    expect(problemsFor({ callers })).toEqual([]);
  });
});

describe("the reusable gates must honor require_secrets", () => {
  it("fails when a gate stops reading the require_secrets input (caller pin goes inert)", () => {
    const reusable = cleanReusableWorkflow()
      .split("        env:\n          REQUIRE_SECRETS: ${{ inputs.require_secrets }}\n        run: |")
      .join("        run: |");
    expectProblemMatching(
      problemsFor({ reusable }),
      /RLS sentinel secrets gate no longer reads the require_secrets input/,
    );
  });

  it("fails when a gate drops the loud REQUIRE_SECRETS branch (silent skip returns)", () => {
    const reusable = cleanReusableWorkflow()
      .split('            if [ "$REQUIRE_SECRETS" = "true" ]; then\n              echo "::error::Supabase secrets are unavailable and require_secrets is set."\n              exit 1\n            fi\n')
      .join("");
    expectProblemMatching(
      problemsFor({ reusable }),
      /RLS sentinel secrets gate no longer fails loudly when require_secrets is set/,
    );
  });
});

describe("collectE2eSmokeHermeticityProblems", () => {
  function smokeCiYml(stepBody = "        run: npm run check:e2e-smoke\n") {
    return [
      "jobs:",
      "  smoke:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - name: Run end-to-end smoke check",
      stepBody,
      "",
      "  audit:",
      "    steps:",
      "      - run: npm run check:dependency-audit",
      "",
    ].join("\n");
  }
  const hermeticTool = `const x = 1;\n      WINGMAN_STORAGE_MODE: "file",\n`;

  it("passes the hermetic shape: smoke runs the check with no Supabase secrets", () => {
    expect(collectE2eSmokeHermeticityProblems({ ciYml: smokeCiYml(), smokeTool: hermeticTool })).toEqual([]);
  });

  it("fails when CI no longer runs the e2e smoke check at all", () => {
    const problems = collectE2eSmokeHermeticityProblems({
      ciYml: smokeCiYml().replace("npm run check:e2e-smoke", "npm run build"),
      smokeTool: hermeticTool,
    });
    expectProblemMatching(problems, /no longer runs the e2e smoke check/);
  });

  it("fails when the smoke step grows a Supabase secret reference (fork-PR silent skip)", () => {
    const problems = collectE2eSmokeHermeticityProblems({
      ciYml: smokeCiYml(
        "        run: npm run check:e2e-smoke\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n",
      ),
      smokeTool: hermeticTool,
    });
    expectProblemMatching(problems, /smoke step references SUPABASE_URL/);
  });

  it("fails when the smoke tool drops the file-mode storage pin", () => {
    for (const marker of E2E_SMOKE_HERMETICITY_MARKERS) {
      const problems = collectE2eSmokeHermeticityProblems({
        ciYml: smokeCiYml(),
        smokeTool: hermeticTool.replace(marker, "WINGMAN_STORAGE_MODE: process.env.WINGMAN_STORAGE_MODE"),
      });
      expectProblemMatching(problems, new RegExp(`no longer pins ${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  });
});

describe("checkSupabaseRlsWorkflowFiles (real files)", () => {
  it("passes the committed supabase-rls.yml wiring, the nightly require_secrets pin, and the hermetic smoke", () => {
    expect(checkSupabaseRlsWorkflowFiles()).toEqual([]);
  });
});
