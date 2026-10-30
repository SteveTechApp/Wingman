# Backend API

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- `resolveMatch` / `liveLookup` return HTTP 200 with `{ok:false, error}` when
  no match is found — no-match is a business outcome, not a 400. The
  permission gate (401) fires before handler status logic, so handler changes
  never affect the 401 contract.
- `/api/compare/match` and `/api/compare/analyze` are dead endpoints (no
  callers in `src/`); they use the standard `{ok:true, ...}` / `{ok:false,
  error}` envelope and remain protected by API contract tests. The historical
  Express-style `createCompareRoutes` export has been retired.
- `resolveMatch` rarely returns the `ok:false` branch in practice: unknown
  models still resolve `ok:true` via synthetic fallback. Force the failure
  branch by importing `resolveCompetitorMatch` directly with empty
  manufacturer/model.
- `parseJsonBody` enforces `MAX_JSON_BODY_BYTES` (413); a CSRF double-submit
  guard exists but is inert until `WINGMAN_CSRF_ENFORCE=true`.
- A development server holds a real workspace session instead of a browser-side
  stand-in. `POST /api/wingman/auth/dev-session`
  (`handleWingmanAuthDevSessionPost`) creates one fixed local owner
  (`dev@wingman.local`, workspace `Wingman Local`) in the API's own store and
  answers with the ordinary `wingman_session` cookie, so dev project sync runs
  through the real endpoints and lands in `data/runtime`. It refuses a
  production process, a process whose storage mode is not `file` (a dev server
  pointed at a shared database must not seed an account into it) and a request
  that did not arrive from this machine, so the permission is the
  environment's, never the request's. Settings → Workspace offers
  `workspace-local-dev-sign-in` only under `import.meta.env.DEV`; choosing it
  writes `wingman:development-workspace`, and `restoreDevelopmentWorkspace`
  (`main.tsx`, before the first project hydrate) restores the session on a
  later load whose cookie has expired. A browser that never chose it — a
  Playwright spec, the e2e smoke check — is left signed out, which is why the
  choice is remembered rather than made on every load. Signing out forgets it,
  or a reload would sign the rep back in. Nothing fakes a session in the
  browser any more: the `installWingmanLocalSessionFallback` fetch shim is
  gone, and `.env.example` ships
  `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=true` so a fresh checkout that
  copies it to `.env` syncs in dev; the dev workspace above is the way in, and
  a browser that has not chosen it keeps the local-mode message. A production
  build keeps the flag in `.env.production.example`, and the local (untracked)
  `.env` can still set it either way.
- `/api/wingman/agents/wall-survey-scan` reads a photographed measurement
  worksheet. It requires `links` (the printed rows) as well as the image, so a
  transcription can only name links the design has; the client re-checks that
  and reports unread rows by id instead of clearing runs. It needs
  `GEMINI_API_KEY` (mock mode is explicit-only) and returns an empty scan with
  confidence 0 when the model call fails, rather than invented metres. The
  builder's development switch (`videowall-survey-photo-mock`, rendered only
  when `import.meta.env.DEV`) sends `mock: true`, and the agent answers it with
  the same `deriveWallSurveyScan` sample, whose summary says the development
  sample was asked for rather than blaming a missing key. That permission is
  the server's `NODE_ENV`, never the request alone: `getAgentConfig().requestMock`
  is false in production and the agent refuses so a deployed server can never
  let a browser swap a transcription for sample data.
- `/api/wingman/agents/vision-context` — the site-photo reader — carries the
  same switch: `SiteSurveyPhotoCapture` renders `site-survey-photo-mock` only
  when `import.meta.env.DEV`, and `analyzeSiteSurveyPhoto(file, { mock })`
  threads it into BOTH reads it makes (the attachment context and the
  structured site-survey extraction), or a walkthrough would mix a sample with
  a model. The agent answers `deriveVisionContext({ requested: true })` on a
  development server and refuses in production with the wall reader's rule. Its
  sample is shaped like a real answer — attachment kind, observations,
  locations, equipment, cables and the room notes — because the checklist
  reviews and applies it, not just prints it; the unrequested fallback stays
  the empty "unclear" context, which is what an explicit
  `WINGMAN_AGENT_FORCE_MOCK` server still answers (that mode wins over the
  switch, as it does for the worksheet reader).
