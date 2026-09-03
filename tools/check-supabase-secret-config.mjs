#!/usr/bin/env node
// Supabase secrets configuration drill (diagnostic - NEVER a gate).
//
// Prints which of the four Supabase secrets are available in the current
// context and classifies the setup into the same states the live gates
// (supabase-rls.yml) will hit, so a misconfiguration is diagnosable from the
// Actions tab - via a workflow_dispatch run of
// .github/workflows/supabase-secret-drill.yml - without waiting for a
// failing push or a red nightly. It never makes network calls, never reads
// secret VALUES (only presence), and always exits 0: a missing secret here
// is a finding to READ, not a failure to gate on.
//
// Local usage:  node tools/check-supabase-secret-config.mjs
//   (with env vars set to simulate any state; no env = the unconfigured case)

const SECRETS = [
  { name: "SUPABASE_URL", neededBy: "both live jobs (RLS sentinel + migration parity)" },
  { name: "SUPABASE_ANON_KEY", neededBy: "the RLS sentinel probe (public-key exposure test)" },
  { name: "SUPABASE_SECRET_KEY", neededBy: "the RLS sentinel seed (service-role marker rows); partial setup = gate failure" },
  { name: "SUPABASE_ACCESS_TOKEN", neededBy: "the migration-parity check (Management API); partial setup = gate failure" },
];

function classify(available) {
  const url = available.SUPABASE_URL;
  const hasLivePair = url && available.SUPABASE_ANON_KEY;
  const hasSecretKey = available.SUPABASE_SECRET_KEY;
  const hasToken = available.SUPABASE_ACCESS_TOKEN;

  // Mirror the gates' own decision tree (supabase-rls.yml):
  //  - no URL/anon pair: skip (or loud failure on scheduled require_secrets runs)
  //  - pair without a required second secret: partial setup = gate failure
  //  - everything present: full mode
  if (!hasLivePair) {
    return {
      state: "unconfigured",
      gateOutcome:
        "Push/PR runs: both live jobs SKIP. Scheduled nightly: FAILS LOUDLY (require_secrets: true).",
    };
  }
  if (url && !hasSecretKey) {
    return {
      state: "partial (RLS sentinel cannot run in sentinel mode)",
      gateOutcome:
        "supabase-rls job FAILS: SUPABASE_SECRET_KEY is required for the live RLS check.",
    };
  }
  if (url && !hasToken) {
    return {
      state: "partial (migration parity cannot run)",
      gateOutcome:
        "migration-live job FAILS: SUPABASE_ACCESS_TOKEN is required for the live migration-parity check.",
    };
  }
  return {
    state: "fully configured",
    gateOutcome: "Both live jobs run in full mode (sentinel probe + migration parity).",
  };
}

function main() {
  const available = {};
  for (const { name } of SECRETS) {
    available[name] = Boolean(process.env[name]);
  }

  const { state, gateOutcome } = classify(available);

  console.log("[supabase-secret-drill] Supabase secrets configuration report");
  console.log("---------------------------------------------------------");
  for (const { name, neededBy } of SECRETS) {
    const status = available[name] ? "configured" : "ABSENT";
    console.log(`  ${name.padEnd(24)} ${status.padEnd(12)} needed by ${neededBy}`);
  }
  console.log("");
  console.log(`  Classification : ${state}`);
  console.log(`  Gate outcome   : ${gateOutcome}`);
  console.log("");
  console.log("  Remediation    : repository Settings > Secrets and variables > Actions.");
  console.log("  Drill semantics: diagnostic only - this report NEVER fails a build.");
  console.log("");

  const absent = SECRETS.filter(({ name }) => !available[name]).map(({ name }) => name);
  if (absent.length > 0) {
    console.log(
      `[supabase-secret-drill] Absent in this context: ${absent.join(", ")}. ` +
        "Note: fork PRs never receive secrets, so an ABSENT finding there is expected, not a defect.",
    );
  } else {
    console.log("[supabase-secret-drill] All four secrets are visible in this context - the live gates will run in full mode.");
  }
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main();
}
export { SECRETS, classify, main as printSecretConfigReport };
