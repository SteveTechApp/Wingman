# Render stand-up runbook: Blueprint launch to verified staging

Exact procedure for standing the Wingman staging deployment up from the
committed Blueprint — every click, every secret, and the verification that
makes the result "verified staging" rather than "a URL that opens".

Ground truth: [`render.yaml`](../render.yaml) (both services, region
`frankfurt`, `autoDeploy: false`), [`docs/OPERATIONS.md`](OPERATIONS.md)
(secrets, rotation, monitoring), [`docs/SUPABASE_SETUP.md`](SUPABASE_SETUP.md)
(database provisioning), [`docs/LAUNCH_DECISION_BRIEF.md`](LAUNCH_DECISION_BRIEF.md)
(plan/region decisions). After this runbook, day-2 operations live in
OPERATIONS.md — this document ends at a verified, monitored staging.

## 0. Prerequisites (before opening Render)

- [ ] GitHub access to the Wingman repo — Render deploys from it via OAuth.
- [ ] A Render account (the Render dashboard org that will own the services).
- [ ] A Supabase account (one project per environment; do not reuse the local
      dev project).
- [ ] `npm run verify` green on the commit you will deploy (OPERATIONS.md
      quick reference). Note the commit hash — you will match it on screen.
- [ ] A Gemini API key with a quota cap set, per the launch brief decision
      (the Blueprint wires `GEMINI_API_KEY`; without a value the service still
      boots and the Guru runs locally derived).
- [ ] 30–45 minutes; both Render services build Docker images from scratch on
      first deploy.

## 1. Provision Supabase (10 min)

Do this first: the Render creation dialog asks for the Supabase credentials.

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Name: `wingman-staging` (or your convention). **Database password**:
   generate, and store it in the password manager now — it is shown once.
   **Region: West EU (London)** or the region closest to your users —
   Frankfurt Render + a same-region database keeps sync latency low.
   Plan: Free works for staging; the launch brief recommends Pro (~$25/mo)
   for anything holding pilot data.
3. Wait for provisioning (~2 min).
4. Apply the schema: **SQL Editor** → **New query** → paste the full contents
   of [`server/migrations/001_initial_schema.sql`](../server/migrations/001_initial_schema.sql)
   → **Run**. On a fresh database, `002_scope_service_role_policies.sql` is
   already included — running it again is a safe no-op if unsure.
5. Collect credentials: **Project Settings** (gear) → **API** → copy
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role key** → this is `SUPABASE_SERVICE_ROLE_KEY`
     (**high-privilege — it bypasses RLS. It goes only into Render's secret
     store, never into git, chat, or a screenshot.**)

## 2. Launch the Blueprint in Render (15 min)

1. Render dashboard → **New +** → **Blueprint**.
2. Select the Wingman repository and the branch (`main` for staging).
   Authorize Render's GitHub app if prompted.
3. Render reads `render.yaml` and shows the two services it will create:
   `wingman` (frontend, Dockerfile, health `/`) and `wingman-api`
   (Dockerfile.server, health `/api/ready`), region **Frankfurt**.
4. **Enter the `sync: false` secrets when prompted** — the Blueprint marks
   these as "set manually", and creation cannot complete without values:

   | Service | Variable | Value |
   |---|---|---|
   | wingman-api | `SUPABASE_URL` | from §1 step 5 |
   | wingman-api | `SUPABASE_SERVICE_ROLE_KEY` | from §1 step 5 |
   | wingman-api | `GEMINI_API_KEY` | the quota-capped key (or a placeholder like `SET-ME` to be replaced in §3 — the service boots either way) |

5. **Decision point — plan.** The Blueprint commits `plan: free` for both
   services. Free web services spin down after ~15 minutes idle and cold-start
   on the next request, which breaks in-flight sessions and makes monitoring
   noisy. The launch brief recommends **Starter** for any environment a human
   will use. If approved, change both services to Starter here (or afterwards
   in each service's **Settings → Instance Type**; a plan change redeploys).
6. **Confirm region** is Frankfurt (matches the database region choice; the
   launch brief asks to confirm this explicitly). Change now if not — region
   is fixed at creation.
7. Click **Apply Services** (labelled **Apply** in some dashboard versions).
   Render creates both services and starts the first builds. Expect the first
   deploy of each to take several minutes (Docker build from scratch).

> `autoDeploy: false` is deliberate: nothing deploys unless a human clicks
> **Manual Deploy → Deploy latest commit**. Every later update follows §5.

## 3. Secrets and environment verification (5 min)

Open each service → **Environment** in the left sidebar and verify against
this table (it is the Blueprint plus what the code reads). Change nothing that
is already correct; the cross-service values are wired by Render.

| Service | Variable | Expected |
|---|---|---|
| wingman-api | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | real values from §1 (masked) |
| wingman-api | `GEMINI_API_KEY` | real key (replace the §2 placeholder here if used) |
| wingman-api | `WINGMAN_STORAGE_MODE` | `supabase-tables` |
| wingman-api | `WINGMAN_STORAGE_FAIL_CLOSED` | `true` — a Supabase outage fails loudly, never silently falls back to a file store |
| wingman-api | `WINGMAN_CORS_ALLOW_ORIGIN` | auto-wired to the frontend's `RENDER_EXTERNAL_URL` — do not overwrite by hand |
| wingman-api | `WINGMAN_SESSION_COOKIE_SECURE` / `WINGMAN_SESSION_COOKIE_SAMESITE` | `true` / `Strict` |
| wingman-api | `WINGMAN_CSRF_ENFORCE` | `true` — CSRF enforcement is ON from first boot; §6 step 7 proves it |
| wingman-api | `NODE_ENV` | `production` |
| wingman (frontend) | `BACKEND_HOST` / `BACKEND_PORT` | auto-wired from wingman-api |
| wingman (frontend) | `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC` | `true` — cross-device project sync (Drill D of the offline UAT needs it) |
| wingman (frontend) | `VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP` | `false` — live web lookup stays off |

Any edit here triggers a redeploy of that service — batch your changes.

Secret hygiene check (OPERATIONS.md pre-launch list): `git ls-files | grep -i env`
must return only `.env.example`. No secret from this section belongs anywhere
except Render's Environment tab and the Supabase dashboard.

## 4. First boot and the one log line that matters

1. When both deploys finish, note the URLs: `https://wingman-…onrender.com`
   (frontend) and `https://wingman-api-…onrender.com` (backend).
2. wingman-api → **Logs** tab: filter for `storage.mode.resolved`. This is the
   first thing to check in any storage incident (OPERATIONS.md §4). Expected:
   `"configured":"supabase-tables","resolved":"supabase-tables","failClosed":true`.
   If `resolved` shows anything else, stop and fix §3 before continuing —
   with fail-closed you would instead see write failures, not silent loss.
3. wingman-api → **Events** tab: confirm the deploy commit hash matches the
   commit you verified in §0.

## 5. Verified staging (the acceptance checks)

Run these in order; each has a pass condition. Do not invite users before all
of them pass. `<api>` is the backend URL, `<app>` the frontend URL.

1. **Liveness** — `curl https://<api>/api/health` →
   `{"status":"ok","timestamp":…,"version":…}` (HTTP 200).
2. **Readiness incl. storage** — `curl https://<api>/api/ready` →
   `{"ready":true,"timestamp":…,"storageMode":"supabase-tables"}` (HTTP 200).
   A 503 here means the server cannot reach Supabase: check the project is not
   paused and the credentials in §3.
3. **Frontend serves the app** — open `<app>` in a browser: the Wingman UI
   loads with no console errors. The footer/version shows the deployed commit.
4. **Write path** — sign up a staging workspace owner through the UI
   (or `curl -X POST https://<api>/api/wingman/auth/signup -H "Content-Type: application/json" -d '{"name":…,"company":…,"email":…,"password":…}'`).
   Then confirm in Supabase **Table Editor** that rows appeared in
   `wingman_users` and `wingman_workspaces` — this proves the write path
   reaches the database, not just an in-process store.
5. **Session + project round trip** — sign in, create a project, edit it,
   reload the page: the project survives (server-authoritative round trip).
   Sign in on a second browser profile: the project is there too.
6. **CSRF proof (enforcement is already on)** —
   - Browser flow: log in and save a project normally. The SPA's fetch wrapper
     bootstraps `/api/csrf` automatically; normal use must work unaided.
   - Negative test: with a signed-in session cookie, send a state-changing
     request without the header —
     `curl -X POST https://<api>/api/wingman/site-survey/sync -H "Content-Type: application/json" -b "wingman_session=<cookie>" -d '{}'`
     → expect **403** (CSRF rejection). A 401 instead means the cookie was
     stale — the app keeps one active session per account, so re-copy a fresh
     one from the browser. Signup/login are exempt paths, so the negative
     test must target an authenticated mutating route.
7. **Telemetry readback** — `curl https://<api>/api/wingman/telemetry` with a
   session cookie → returns recorded client errors (empty is fine; a 401 means
   the cookie was not sent).
8. **Cross-check the known constraint** — rate limiting is per-instance
   (in-process). One instance of each service exists at this tier; note this
   in the handover (§7) so nobody scales out without reading OPERATIONS.md §4.

Record: URLs, commit hash, `storage.mode.resolved` line, and the §5 pass
states — this record is the staging entry in the launch checklist §4.

## 6. Uptime monitoring (5 min)

Render's own health checks (`healthCheckPath`) gate **deploys**, not uptime
alerting — wire an external monitor for that.

1. **Render notifications**: project → **Notifications** → connect email/Slack
   and enable **Deploy failed** and **Deploy live** events. This catches build
   and boot failures immediately.
2. **External uptime monitor** (UptimeRobot, Better Stack, or equivalent — a
   free tier suffices):
   - Monitor 1: `https://<api>/api/ready`, interval 5 min, keyword/string
     match `"ready":true`. This is the right target: it fails when the server
     is down **or** storage is unreachable, which is the alert that matters.
     (The decision brief's "wire monitoring to `/api/health`" is superseded
     here: `/api/ready` is a superset — same liveness plus storage readiness —
     and it is the Blueprint's own `healthCheckPath`.)
   - Monitor 2: `https://<app>/` (HTTP 200) — catches frontend-only outages.
3. **Alert rule** (OPERATIONS.md §4): page/alert after **2 consecutive failed
   checks** — one blip is a deploy or a network hiccup, two is an outage.
4. Verify the monitors are green, then kill nothing: the monitor's own first
   alert storm is the usual misconfiguration (wrong keyword, HTTP vs HTTPS).

## 7. Handover state (what exists after this runbook)

| Artifact | Where |
|---|---|
| Frontend URL, backend URL | from §5; also the CORS source of truth |
| Deployed commit | §0 hash == §4 Events tab |
| Secrets | Render Environment tabs + Supabase dashboard only; database password in the password manager |
| Monitoring | Render notifications + two external monitors, 2-fail alert rule |
| Staging record | §5 pass states, filed with the launch checklist |

Day-2 procedures, all in OPERATIONS.md: key rotation every 90 days (§2),
storage/backup operations (§3), log signals and per-instance rate-limit
constraint (§4), incident response (§5), **rehearse rollback once against this
staging** (§6), CSRF enablement history (§7 — already on here), file-store
migration (§8 — not needed for a fresh staging database).

Launch-checklist items this runbook closes: §4 Production Infrastructure
(Supabase provisioned + schema applied, secrets in the host secret manager,
Blueprint services healthy, health check wired to an uptime monitor) and the
staging prerequisites for §3 Feature Smoke and §7 User Acceptance.

## 8. Troubleshooting (the failures this stand-up actually produces)

| Symptom | Cause | Fix |
|---|---|---|
| `storage.mode.resolved` shows `resolved":"file"` (or a warning) | Supabase credentials missing/wrong at boot | Re-check §3 values; redeploy. With `FAIL_CLOSED=true` writes will also fail loudly — fix before proceeding. |
| `/api/ready` 503 `storage is not ready` | Supabase unreachable or project paused | Supabase dashboard: unpause (free projects pause after inactivity); re-check URL/key; redeploy. |
| First deploy fails on the frontend | Docker build cache cold / build error | Read the build log; verify locally with `npm run build` on the same commit. |
| Frontend loads but API calls fail (CORS) | `WINGMAN_CORS_ALLOW_ORIGIN` overwritten by hand | Restore the auto-wired `fromService` value (§3); redeploy. |
| Login works over HTTP but not HTTPS, or cookies vanish | Cookie flags / origin mismatch | Verify `WINGMAN_SESSION_COOKIE_SECURE=true`, `SameSite=Strict`, and that you are on the exact HTTPS external URL. |
| A save silently disappears | You are NOT on this deployment (fail-closed forbids it) — or the payload hit the 1 MiB body cap | Check `/api/health/details` and the `storage.upsert.failed` error log; see ADR-0001 §1.3 payload ceiling. |
| Free plan: the app is slow on first request after idle | Instance spun down | Expected on `free`; upgrade to Starter (§2 step 5) for anything user-facing. |
| Mutating API calls 403 in the browser after a new deploy | CSRF cookie/token mismatch after a session change | Sign out/in (rebootstraps `/api/csrf`); if persistent, compare `/api/csrf` response with the `X-CSRF-Token` the SPA sends. |
