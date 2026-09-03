# Supabase Secrets Configuration Drill

How to diagnose the repository's Supabase secret configuration **without** a
failing push or a red nightly run. This complements `SUPABASE_SETUP.md`
(setup + nightly runbook) and `OPERATIONS.md` (production secrets policy).

---

## Why this drill exists

The Supabase live gates (`supabase-rls.yml`) deliberately fail loudly on a
*partial* secret setup — e.g. `SUPABASE_URL` present but
`SUPABASE_SECRET_KEY` missing — because a degraded sentinel probe cannot
prove RLS protection. That is the right behavior for a gate, but it means
the first symptom of a misconfiguration is a **red run**. Scheduled nightly
runs fail even louder (`require_secrets: true`) when secrets disappear
entirely.

When you need to check the configuration *before* it costs a red run — after
rotating keys, renaming a secret, moving repositories, or onboarding a new
staging project — use the drill below. It is **diagnostic only**: it never
fails a build, never reads secret values, and makes no network calls.

## The four secrets and who consumes them

| Secret | Consumed by | Missing → gate behavior |
|---|---|---|
| `SUPABASE_URL` | Both live jobs | Skip on push/PR; **loud failure** on the scheduled nightly (`require_secrets: true`) |
| `SUPABASE_ANON_KEY` | RLS sentinel probe (public-key exposure test) | Same as above (the gate keys off the URL+anon pair) |
| `SUPABASE_SECRET_KEY` | RLS sentinel seed (service-role marker rows) | **Partial setup → `supabase-rls` job fails** on every run |
| `SUPABASE_ACCESS_TOKEN` | Migration-parity check (Management API) | **Partial setup → `migration-live` job fails** on every run |

All four live under **GitHub repository → Settings → Secrets and variables →
Actions**. Fork PRs never receive any of them; an all-absent report on a
fork run is expected, not a defect.

## Running the drill

### From the Actions tab (primary)

1. Open the repository on GitHub → **Actions** tab.
2. Select **"Supabase secrets drill (diagnostic)"** in the workflow list.
3. Click **Run workflow** (defaults are fine; leave "write summary" enabled).
4. Open the run. The job log prints the report, and with the summary option
   the same report renders on the run's **Summary** page.

The report lists each secret as `configured` or `ABSENT`, classifies the
overall setup, and states exactly what each live gate will do in that state.

### From a local shell (simulating states)

```bash
node tools/check-supabase-secret-config.mjs
# Unclassified env → reports every secret ABSENT, state "unconfigured".

SUPABASE_URL=https://yourproject.supabase.co \
SUPABASE_ANON_KEY=anon \
node tools/check-supabase-secret-config.mjs
# Partial state: shows the supabase-rls job would FAIL without SECRET_KEY.
```

Never paste real secret values into the environment when simulating — the
tool reads presence only, so any non-empty placeholder works.

## Reading the report

| Classification | Meaning | What the live gates will do |
|---|---|---|
| `fully configured` | All four secrets visible | Both live jobs run in full mode |
| `partial (...)` | URL+anon pair present, a required second secret missing | The affected job **fails** with the remediation copy |
| `unconfigured` | URL or anon key absent | Push/PR runs skip; the nightly **fails loudly** (`require_secrets: true`) |

## Common scenarios

- **After rotating `SUPABASE_SECRET_KEY`** (e.g. Supabase dashboard key
  rollover): run the drill. `configured` for all four means the next nightly
  will run normally; no red run needed to find out.
- **After renaming or accidentally deleting a secret**: the drill shows
  exactly which one is `ABSENT` and which gate will fail, without burning a
  scheduled run to discover it.
- **Onboarding a new staging project**: add the secrets, run the drill, and
  the report should read `fully configured` before the next push or night.
- **Fork PR showing every secret ABSENT**: expected behavior — GitHub never
  exposes secrets to fork runs. Not a misconfiguration.

## Boundary of the drill

The drill checks **presence and classification only**. It does not validate
that the values are correct (e.g. that the URL points at the intended
project) — the live gates do that: `verify-supabase-rls.mjs` probes the real
database, `check-migration-live-state.mjs` reads the real schema, and CI's
`supabase-rls-selfcheck` job fails on a partial setup. Those are gates by
design; this drill is the read-only companion that keeps their failures from
being the *first* signal.
