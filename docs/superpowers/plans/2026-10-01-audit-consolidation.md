# Wingman Audit Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Reduce runtime loading and maintenance overhead while retaining governed decisions, publication parity and offline project editing.

**Architecture:** Keep existing feature interfaces and decision logic. Separate authenticated network traffic from public offline assets, separate source maintenance from artefact generation, and remove presentation/check duplication with regression coverage.

**Tech Stack:** React, TypeScript, Vite, Vitest, Node.js.

**Spec:** Wingman audit of 1 October 2026, checkout `20e0839e`.

## Global Constraints

- Preserve evidence gates, candidate eligibility, persisted project compatibility and export parity.
- Keep legacy URL redirects; remove redundant registrations only.
- No new dependencies or relaxed size/style baselines.
- Work in this isolated checkout; preserve existing main-checkout edits when synchronising.
- External device UAT and authenticated staging measurements require the actual target and human evidence; never manufacture them.

## Task 1: Authenticated cache isolation

Files: `public/sw.js`, `src/__tests__/serviceWorkerCacheIsolation.test.ts`, `vite.config.ts`.

- [x] Exercise API requests with an existing cached response and an unavailable network; ensure no private cache fallback occurs.
- [x] Bypass service-worker caching for API and cross-origin requests; purge obsolete Wingman caches only.
- [x] Preserve static offline delivery; version the service worker in the configured build output.
- [x] Run the cache regressions and production build.

## Task 2: Deterministic test/bootstrap generation

Files: `tools/build-product-data-sources.mjs`, `tools/vitest-global-setup.mjs`, `package.json`, generator tests.

- [x] Add `--canonical-only` generation that writes only the ignored canonical store.
- [x] Bootstrap tests through that path without invoking source repairs.
- [x] Separate normal bundle compilation from explicit data maintenance; test source immutability.

## Task 3: Remove obsolete Compare and route scaffolding

Files: Compare wrapper/bridge tests, route registry, candidate/output guard tools, navigation checks.

- [x] Retain Compare and Battle Cards routing tests; remove dummy handler assertions.
- [x] Validate candidate interactions through existing rendered regression suites; scan live output for language contracts.
- [x] Remove excluded lazy registrations while retaining embedded page consumers and URL redirects.
- [x] Execute route, navigation, Compare and contract checks.

## Task 4: Catalogue loading and bundle costs

Files: product cache, generated catalogue tools, Vite splitting, size budgets.

- [x] Preserve all candidate technical evidence; bound concurrent detail requests and share full-record hydration across consumers.
- [x] Locate project-core chunk dependency weight and move action-specific/generated data into appropriate chunks.
- [x] Remove ineffective dynamic import; record before/after bundle bytes and lower budgets where justified.
- [x] Exercise detail failures/retries and decision parity regressions.

## Task 5: Runtime presentation and style cleanup

Files: startup DOM helpers, their React consumers, route styles.

- [x] Coalesce DOM scans and skip unrelated routes; move obsolete helpers out of startup when current React behaviour supersedes them.
- [x] Remove proven unused route CSS with selector/route evidence, preserving themes, responsive states and confidence tones.
- [x] Run style, UI, accessibility and visual checks applicable to each change.

## Task 6: Verification and operations

Files: package scripts, AGENTS guidance, consolidation status document.

- [x] Run each shared dashboard checker once in aggregate verification.
- [x] Improve runtime reachability roots without counting retired page implementations as independent application entry points.
- [x] Update stale workflow notes and record remaining measured-work prerequisites.
- [x] Run typecheck, lint, full tests and required verify lanes; inspect resulting tracked changes.
- [x] Synchronise only reviewed changes to main with a three-way merge where main has existing edits; verify byte identity.

Execution uses this existing isolated worktree and available local tools. No commit or deployment is part of this request.

## Completion evidence

See `docs/AUDIT_IMPLEMENTATION_2026-10-01.md` for measurements, verification and the recommendations that require subsequent profiling or decision-parity work. Browser workflows were updated to exercise the current market-first Discovery flow and paginated template library.
