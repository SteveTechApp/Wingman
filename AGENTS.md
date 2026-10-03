# AGENTS.md

Durable, non-obvious knowledge for working in this repo. Facts recoverable
from the code or docs are not repeated here.

## Worktree & dev workflow

- File tools resolve paths from the thread worktree (`.freebuff/worktrees/<id>/`);
  main-checkout paths error as "file does not exist". Edit in the worktree,
  then `cp` changed files to the main checkout (`C:/Users/steve/wingman`) and
  keep both byte-identical. Copying main→worktree after an edit silently
  discards the edit — diff the two files after any sync. The file tool also
  resolves `/tmp/...` to `C:\tmp\` on this Windows setup.
- Git Bash `kill` cannot terminate Windows-native node processes: the old
  server survives, the new one hits EADDRINUSE, and curl keeps hitting the
  STALE code — verification silently passes against old behavior. Kill with
  `powershell -Command "Stop-Process -Id <pid> -Force"` and confirm the port
  freed via netstat.
- `npm run dev` (via `tools/start-wingman-dev.mjs`) starts BOTH the UI (3000)
  and the API (8787) and aborts entirely if 8787 is already bound. The
  competitor-lookup server (`server/competitor-lookup-server.mjs`) often holds
  8787 already — to serve just the UI run `node node_modules/vite/bin/vite.js`
  from the main checkout.
- On Windows, start preview servers with the PowerShell `Start-Process`
  recipe and stdout/stderr to DIFFERENT log files. `register_preview` with
  `replace: true` stops the previously registered server first.
- When a preview screenshot fails with "produced no frames" or the webview
  detaches, DOM-level verification via `preview_evaluate` still works — use it
  as the fallback instead of assuming the page is broken.

## Typecheck & tests

- `tsc --noEmit` with the default `tsconfig.json` only checks `src/main.tsx`
  — a false green. The real gate is `npx tsc --noEmit -p
  tsconfig.typecheck.json` (all of `wingman2/**`, strict).
- Server tests (`server/**/*.test.mjs`) import `@vitest/runner` and MUST run
  via `npx vitest run server/...`. Raw `node --test` on them fails with
  "Cannot read properties of undefined (reading 'config')" — misleading;
  it is a harness mismatch, not a test failure.
- To exercise authenticated API branches end-to-end, boot
  `server/competitor-lookup-server.mjs` from the WORKTREE on a test PORT: the
  file-mode store then writes only to the worktree's gitignored
  `data/runtime/`, keeping main's data clean. Sign up a throwaway workspace
  (`/api/wingman/auth/signup`) and reuse its session cookie.

## Quality gates & ratchets

- The pre-commit hook runs the full verify chain (fast, build, data, contract,
  visual). Two debt-ratchets block commits even when everything is green:
  size budgets (`tools/wingman-size-budgets.json`) and style-drift
  (`tools/wingman-style-drift-baseline.json`). Raising either requires the
  documented exception process in `docs/SIZE_BUDGETS.md`.
- `check:style-drift-baseline` counts every CSS rule block whose selector
  matches page/compare patterns (e.g. `html[data-wingman-route="compare"] ...`)
  as one "pageSection" — adding N such rules raises the baseline by ~N.
- `check:sales-facing-language` scans ALL source, including test comments and
  CSS comments, not just UI copy. Developer wording such as "demoted",
  "confusing", "has moved into", "workflow consolidated" fails
  `verify:contract` wherever it appears.
- `npm run build` (data gen + `vite build`) runs WITHOUT the size-budget and
  style-drift ratchets — those only fire inside `verify:build` /
  `verify:visual`. Use plain `build` to verify compilation without ratchet
  noise.

## Compare feature

- `CompareConfidenceTier` (tones from `compareVerdictTier`) is the single
  source of truth for verdict tone. Surfaces must derive color/emphasis from
  the chip's tone (CSS via `:has(.compare-confidence-tier--X)`), never from
  the status class: "Evidence pending" pairs with status class `no-match`
  but must stay amber.
- The verdict-lead status class lives on the SECTION; the banner is the header
  element inside it. CSS matching both needs a descendant selector
  (`.compare-verdict-lead--X .compare-verdict-lead__banner`), not a compound.
- Compare/verdict styling lives in `wingman-workflow-theme.css` scoped under
  `html[data-wingman-route="compare"]`.

## Backend API (`server/`)

- `resolveMatch` / `liveLookup` return HTTP 200 with `{ok:false, error}` when
  no match is found — no-match is a business outcome, not a 400. The
  permission gate (401) fires before handler status logic, so handler changes
  never affect the 401 contract.
- `/api/compare/match` and `/api/compare/analyze` are dead endpoints (no
  callers in `src/`); they use the standard `{ok:true, ...}` / `{ok:false,
  error}` envelope. `server/competitor/match-engine.mjs` ALSO defines an
  Express-style `createCompareRoutes` router with duplicate `/api/compare/*`
  handlers — it is never mounted; only `compareCompetitor` is imported.
- `resolveMatch` rarely returns the `ok:false` branch in practice: unknown
  models still resolve `ok:true` via synthetic fallback. Force the failure
  branch by importing `resolveCompetitorMatch` directly with empty
  manufacturer/model.
- `parseJsonBody` enforces `MAX_JSON_BODY_BYTES` (413); a CSRF double-submit
  guard exists but is inert until `WINGMAN_CSRF_ENFORCE=true`.
