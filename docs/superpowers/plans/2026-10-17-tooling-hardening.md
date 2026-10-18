# Tooling Hardening Implementation Plan

**Goal:** Complete the queued discovery, CSS health, advisory and test reliability work while preserving checkout content.

**Architecture:** Keep runtime health probes and source guards as independent tools. Pin browser interactions to semantic IDs on the owning components. Preserve existing pending changes before extending CI.

**Tech Stack:** Vite, Tailwind v4, React, TypeScript, Vitest, Playwright, GitHub Actions, PowerShell.

**Spec:** User's queued work in this chat.

## Constraints

- Edit this worktree and synchronize changed files to the main checkout with hash verification.
- Preserve dirty and ignored content before removing any worktree; retain active worktrees.
- Do not stop a process without identifying its owning session.
- Run the real strict typecheck and the requested verification lanes; record failures honestly.
- Advisory email remains opt-in through repository variables and SMTP secrets.

## Tasks

- [x] Inventory current main, pending changes, worktrees and processes; create `codex/queued-tooling-hardening`.
- [ ] Add CSS compilation probe and compiled Tailwind guard; test failed CSS responses and missing utilities.
- [ ] Replace discovery browser copy locators with component test IDs; enforce with an AST-based guard and regression fixtures.
- [ ] Isolate Playwright snapshots by project and freeze proposal parity reference/date.
- [ ] Review and test pending alert collector and transient-spawn code; extend characterization, rehearsal and CI checks.
- [ ] Generate a divergent-file report and preserve cleanup candidates before deleting any trees.
- [ ] Run fast/build/data/contract lanes, publish a PR and dispatch the advisory workflow where GitHub permits it.

## Verification commands

```powershell
npx tsc --noEmit -p tsconfig.typecheck.json
npm run verify:fast
npm run verify:build
npm run verify:data
npm run verify:contract
node tools/e2e-smoke-check.mjs
```

Each task's tests belong alongside its tool. Regression fixtures must exercise both accepted and rejected inputs, including a successful HTML fallback that must not pass the CSS probe.

## Review outcome — 2026-10-18

CSS health, compiled utilities, discovery locators, shared spawn handling,
proposal reference dates, and output parity were verified and committed in
e2207d44 (with baseline-path repairs in e9fa0514).

Advisory collection now rejects unresolved OSV assessments and invalid npm
reports. A CLI regression fixture verifies exit 2 and the unresolved package
details. Docker startup explicitly selects the tracked Compose file and passes
the same ports used by its health probes. YAML parsing and mocked Docker wiring
are checked; a live container build is not verified because Docker is absent.
Email delivery requires explicit repository configuration and was not exercised.
No worktree removal, workflow dispatch, or external notifications were performed.
