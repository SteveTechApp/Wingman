# Wingman Operations Runbook

Operational procedures for running Wingman in production: secrets, key rotation,
storage, monitoring, incident response, and the outstanding security hardening item (CSRF).

This complements `DEPLOYMENT.md` (how to deploy) and `SUPABASE_SETUP.md` (database setup).

---

## 1. Environment & Secrets

All secrets are supplied via environment variables — **never commit a populated `.env`**.
Use the host's secret manager (the platform's "secrets"/"variables" settings, or a vault).

### Required for production

| Variable | Purpose |
|----------|---------|
| `NODE_ENV=production` | Enables secure defaults (secure cookies, storage fail-closed). |
| `SUPABASE_URL` | Supabase project URL (production storage). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access. **High-privilege — protect closely.** |
| `WINGMAN_STORAGE_MODE=supabase-tables` | Forces normalized production database storage (not the file store). |
| `WINGMAN_SESSION_COOKIE_SECURE=true` | HTTPS-only session cookies (default true when `NODE_ENV=production`). |
| `WINGMAN_CORS_ALLOW_ORIGIN` | The exact front-end origin, e.g. `https://wingman.example.com`. Never `*` in production. |

### Optional / feature-dependent

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Reserved for model-backed agent features; the active Guru route remains locally derived until that integration is promoted. |
| `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` | Live competitor web look-up. Feature degrades gracefully if absent. |
| `GURU_GEMINI_MODEL` | Override the Guru model (default `gemini-2.5-flash`). |
| `WINGMAN_AGENT_TIMEOUT_MS` | Model call timeout (default 45000). |
| `WINGMAN_AGENT_FORCE_MOCK` | Forces locally-derived answers in the separate model-backed agent implementation. Leave false if that implementation is promoted. |
| `LOOKUP_RATE_LIMIT_MAX_REQUESTS` / `LOOKUP_RATE_LIMIT_WINDOW_MS` | Competitor look-up rate limiting. |

A full annotated list lives in `.env.example`.

### Pre-launch secret checklist

- [ ] `NODE_ENV=production` is set.
- [ ] The approved Guru operating mode is recorded: locally derived, or a separately tested model-backed integration.
- [ ] `WINGMAN_CORS_ALLOW_ORIGIN` is a specific HTTPS origin, not `*`.
- [ ] No `.env` file with real secrets is committed (`git ls-files | grep -i env` returns only `.env.example`).
- [ ] Supabase service-role key is stored only in the secret manager.

---

## 2. API Key Rotation

Rotate keys on a fixed schedule (recommended every 90 days) and immediately on any
suspected exposure.

### Gemini API key
1. Create a new key in Google AI Studio / Google Cloud.
2. Update `GEMINI_API_KEY` in the secret manager.
3. Redeploy (or restart) the server so it picks up the new value.
4. Confirm the separately tested model-backed agent returns live answers without fallback warnings.
5. Revoke the old key.

### Supabase service-role key
1. In Supabase: Project Settings → API → roll the `service_role` key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in the secret manager.
3. Redeploy/restart; confirm projects load and save.
4. The old key is invalidated automatically on roll.

### Google Custom Search key
1. Roll the key in Google Cloud Console.
2. Update `GOOGLE_CSE_API_KEY`; redeploy.
3. Confirm competitor live look-up still resolves; revoke old key.

> Rotation requires a restart/redeploy because keys are read at process start.
> Schedule rotations during a low-traffic window.

---

## 3. Storage Operations

Wingman supports a file store (development) and Supabase (production), selected by
`WINGMAN_STORAGE_MODE` (`auto` | `file` | `supabase` | `supabase-tables`).

- **Production should run `supabase-tables`.** In production, storage is **fail-closed**: if Supabase
  is unreachable, writes fail loudly rather than silently falling back to the file store.
- **Backups:** Supabase provides automated backups; verify the retention setting meets your
  needs and test a restore before launch.
- **Migration from file store:** apply `server/migrations/001_initial_schema.sql` (and, for
  databases provisioned before the RLS policy role-scoping fix, also
  `server/migrations/002_scope_service_role_policies.sql`), import existing file-store data,
  then verify row counts and a sample project before switching `WINGMAN_STORAGE_MODE` to
  `supabase-tables`. Keep the file-store JSON as a backup.

---

## 4. Monitoring & Logging

- **Health checks:** point the platform's uptime monitor at the server health endpoint
  (see `DEPLOYMENT.md`). Alert if it fails 2 consecutive checks.
- **Error rate:** watch server logs for `[guruAgent] Gemini call failed` (degraded AI),
  storage errors, and 5xx responses. Alert on a sustained spike.
- **Key signals to track:** request error rate, agent fallback count (when model-backed agents are enabled), auth failure rate,
  competitor look-up rate-limit rejections.
- **Log hygiene:** never log secrets, full session tokens, or full customer briefs.

### Structured server logs

`server/wingman-app-store.mjs` emits one JSON line per notable event, so logs are greppable and
parseable by any aggregator. Level is controlled by `WINGMAN_LOG_LEVEL` (`debug` / `info` /
`warn` / `error`, default `info`).

| Event | Level | Meaning |
|---|---|---|
| `storage.mode.resolved` | info | Emitted once at startup. **Check this first in any storage incident** - it records which mode the instance actually landed on. |
| `auth.login.succeeded` | info | Successful sign-in. |
| `auth.login.failed` | warn | Bad credentials. Does not record whether the account exists, to avoid an enumeration oracle. |
| `auth.login.rate_limited` | warn | Sign-in rate limit tripped. A sustained run suggests credential stuffing. |
| `auth.signup.rate_limited` | warn | Sign-up rate limit tripped. |
| `storage.upsert.failed` | error | **A write was accepted by the UI and not persisted.** Always investigate. |
| `storage.delete.failed` | error | A delete did not apply. |

Email addresses are never logged. The `account` field is a short salted digest plus the domain, so
repeated failures against one account can be correlated without writing the address to disk.

### Client runtime errors

The browser reports uncaught errors and rejected promises to `POST /api/wingman/telemetry`
(`src/wingman2/lib/runtimeTelemetry.ts`). Read them back with `GET /api/wingman/telemetry`.

Reporting is best-effort by design: it is capped per session, de-duplicates repeats within a
10-second window so a render loop cannot flood the backend, and silently does nothing for a
signed-out user (the endpoint requires a session). **Absence of telemetry is therefore not
evidence of absence of errors** - an unauthenticated crash produces none.

### Known constraint: rate limiting is per-instance

Auth and look-up rate limits are held in an in-process `Map`. They reset on restart or redeploy,
and do not coordinate across instances. This is acceptable for the current single-instance
deployment. **Before scaling beyond one instance, move the limiter to Supabase or Redis** - with
N instances the effective limit becomes N times the configured value.

---

## 5. Incident Response

| Symptom | Likely cause | First action |
|---------|--------------|--------------|
| A model-backed agent returns derived answers | Bad/expired `GEMINI_API_KEY`, or `FORCE_MOCK=true` | Check logs for the fallback warning; verify key and `FORCE_MOCK`. |
| Projects won't save | Supabase unreachable / bad service-role key | Check Supabase status; verify key; check storage fail-closed logs. |
| Login fails over HTTPS | Cookie `Secure` mismatch / wrong CORS origin | Verify `WINGMAN_SESSION_COOKIE_SECURE` and `WINGMAN_CORS_ALLOW_ORIGIN`. |
| CORS errors in browser | `WINGMAN_CORS_ALLOW_ORIGIN` doesn't match front-end origin | Set it to the exact origin and redeploy. |
| Competitor look-up empty | Missing/expired Google CSE key | Confirm key/quota; feature degrades gracefully without it. |

---

## 6. Rollback

1. Identify the last known-good release/tag.
2. Redeploy that image/build via the CI/CD pipeline (or `docker compose` with the prior tag).
3. If a schema migration was involved, restore the matching Supabase backup **before**
   pointing traffic back.
4. Verify the core Discovery → Proposal flow, then re-open to users.

> Rehearse this once against staging before launch so the steps are proven.

---

## 7. CSRF Protection (implemented, dark — enable after testing)

Defence in depth on top of the production `SameSite=Strict` session cookie (which already
blocks cross-site cookie use). A stateless **double-submit** CSRF layer is implemented in
`server/security/csrf.mjs` and wired into the API request handler:

- `GET /api/csrf` issues a random token in a readable `wingman_csrf` cookie and returns it.
- State-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) must echo that token in the
  `X-CSRF-Token` header; the server checks header == cookie (timing-safe).

**It is OFF by default** (`enforceCsrf` returns true unless `WINGMAN_CSRF_ENFORCE=true`), so
shipping it changes no behaviour until you enable it.

The SPA is already wired: `installCsrfFetch()` (in `src/main.tsx`, from
`src/wingman2/api/csrf.ts`) wraps `window.fetch` so every mutating `/api/*` call fetches the
token once from `/api/csrf` and sends it as `X-CSRF-Token`. While the server guard is off the
header is simply ignored, so nothing changes until you enable it.

To turn it on:

1. Set `WINGMAN_CSRF_ENFORCE=true` in staging.
2. Test the full login → save-project cycle and confirm normal use still works.
3. Confirm a mutating request sent **without** the header (e.g. via curl) is rejected with 403.
4. Set `WINGMAN_CSRF_ENFORCE=true` in production.

Exempt paths (token bootstrap / unauthenticated entry): `/api/csrf`,
`/api/wingman/auth/login`, `/api/wingman/auth/signup`.

---

## 8. Migrating the file store to Supabase (one-off)

The dev/file store lives at `data/runtime/wingman-app-db.json` (collections: users/members,
workspaces, sessions, projects, invitations, audit, telemetry). To move to production storage:

1. Provision the Supabase project and apply `server/migrations/001_initial_schema.sql` (plus
   `server/migrations/002_scope_service_role_policies.sql` if the database predates the RLS
   policy role-scoping fix).
2. Set the `SUPABASE_*` env (URL, service-role key, table names from `.env.example`).
3. **Back up** `data/runtime/wingman-app-db.json` (older installations may still use `data/wingman-app-db.json`).
4. Bring the app up once with `WINGMAN_STORAGE_MODE=supabase-tables`. The app-store reads Supabase
   as the source of truth; seed it by re-creating the workspace/owner via signup, or import
   the JSON rows into the matching tables with the Supabase SQL editor / `supabase` CLI.
5. Verify: row counts per table match, and a sample project loads and saves.
6. Keep the JSON backup until the migration is confirmed in production.

> Do not run a bulk importer blind against production — verify against staging first.

---

## Quick reference — verification before any deploy

Run on the build machine:

```
npm run verify
npm run test
```

`verify` runs source validation, type-checking, the production build, and the data/workflow/UI guards.
Both must pass clean before promoting a build.
