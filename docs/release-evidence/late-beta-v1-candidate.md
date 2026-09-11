# Late-beta v1 candidate evidence

## Task 6 — responsive and offline reconnect (2026-09-11)

Command: `node tools/run-windows-critical-e2e.mjs --offline`

Result: 4 passed, 0 failed (Chromium, retries disabled). The runner used isolated API/UI ports 8903/4193, separate process logs, and confirmed both ports were free after Windows `Stop-Process` cleanup. The HTML report is at `playwright-report/offline-reconnect/index.html`.

Responsive critical-path command: `node tools/run-windows-critical-e2e.mjs --responsive`

Result: 16 passed, 0 failed (8 tablet + 8 mobile, retries disabled). The report is at `playwright-report/windows-critical/index.html`.

| Device / viewport | Workflow | Transition | Result | Evidence | Residual issue |
| --- | --- | --- | --- | --- | --- |
| Desktop 1280x800 + tablet 768x1024 touch | Same site-survey project; cable length and confirmation | Tablet online → offline edit → desktop update → tablet reconnect | PASS: real authenticated API returns an explicit conflict; tablet length 42 m and dirty state retained while server remains at desktop length 18 m; retry based on the current server revision succeeds and GET confirms 42 m | `e2e/offline-reconnect.spec.ts`; HTML report | The current auth policy maintains one active session per account, so the test re-authenticates each device before its online operation. |
| Mobile 390x844 touch | Dashboard, Discovery, Compare, Templates, Proposal and populated Site Survey Checklist | Online | PASS: loaded, proposal advanced to the populated checklist, and no document-level horizontal overflow | `test-results/offline-reconnect-responsive-UAT-mobile-chromium/mobile-*.png` | None observed. |
| Tablet 768x1024 touch | Dashboard, Discovery, Compare, Templates, Proposal and populated Site Survey Checklist | Online | PASS: loaded, proposal advanced to the populated checklist, and no document-level horizontal overflow | `test-results/offline-reconnect-responsive-UAT-tablet-chromium/tablet-*.png` | None observed. |
| Desktop 1280x800 | Dashboard, Discovery, Compare, Templates, Proposal and populated Site Survey Checklist | Online | PASS: loaded, proposal advanced to the populated checklist, and no document-level horizontal overflow | `test-results/offline-reconnect-responsive-UAT-desktop-chromium/desktop-*.png` | Reference viewport only; release requirement focuses on mobile/tablet. |

Focused unit command: `npx vitest run src/wingman2/lib/siteSurveyStorage.test.ts src/wingman2/lib/siteSurveySync.test.ts`

Result: 28 passed, 0 failed. Coverage includes offline save, failed upload, server-newer conflict, repeated acknowledged replay, and a late acknowledgement racing a newer local edit.

## Task 7 — proposal screen, DOCX and PDF parity (2026-09-11)

Command: `npm run check:proposal-output-parity`

Result: PASS. The canonical Northstar Operations Room fixture was generated once and used for the screen HTML, formatted DOCX, and Chromium print PDF. Eleven content markers and the quantities for `NHD-600-TX` (2), `NHD-600-RX` (4), and `NHD-CTL-PRO-V2` (1) agree across all three outputs. The focused DOCX suite passed 7 tests; the Chromium parity test passed without retries.

Artifacts: `docs/release-evidence/proposal-output-parity/latest/` contains the screen HTML and full-page PNG, DOCX and extracted Word text, PDF and extracted PDF text, plus the normalized manifest. Chromium PDF pages were rendered at 144 DPI to `pdf-pages/`.

Visual review: all nine PDF page PNGs and the full screen capture were inspected. No horizontal clipping, table overflow, broken image scaling, missing content, or out-of-order headings were observed. Tables split at row boundaries and retain their headers; the long disclaimer continues legibly onto the next page. The final PDF page has substantial unused space after the safety summary, but no content is missing or obscured.

DOCX render status: semantic Word XML parity passed, but page-image sign-off remains blocked on this host. The mandated bundled `render_docx.py` was used and reported `LibreOffice soffice.exe was not found on PATH`; the workspace runtime inventory contains bundled Python, Node, and Poppler but no bundled LibreOffice executable. A desktop Office/LibreOffice installation was deliberately not used. DOCX visual sign-off therefore remains a Task 9 release-decision item.

Legacy real-flow command: `node tools/e2e-proposal-docx-check.mjs`

Result: NO-GO for that older helper. The browser reached a 100% captured Discovery, added six selections, and priced all 14 BOM rows, but the current technical assurance gate correctly prevented export because the helper did not prove managed AV-network infrastructure and retained estimated/site-confirmation items. The new canonical parity gate remains green; the legacy helper must be updated to resolve the strengthened release gate before the overall release decision.

## Task 9 — release gate and decision (2026-09-11)

**Decision: NO-GO.** The functional, data, recommendation, compile, unit, browser, offline-sync, and semantic proposal-parity checks are green, but the complete release gate fails the unchanged size ratchet. DOCX page-image sign-off is also unavailable in the mandated bundled runtime, and the legacy authenticated proposal-export helper remains incompatible with the strengthened assurance gate. These are classified release blockers rather than waived failures.

Candidate commit: `26f7efde5f95e4ea93fb650052bbb2058420b243` (working tree contains the uncommitted Tasks 1–9 changes). Exact final `git status --short` output is preserved in `docs/release-evidence/task9-git-status.txt`; the commit hash is also preserved in `docs/release-evidence/task9-commit.txt`.

### Automated gate results

| Gate | Result | Exact count / note | Log |
| --- | --- | --- | --- |
| `npm run verify:data` | PASS | 4/4 technical-data files (18 tests), 1/1 story file (6 tests), 3/3 lifecycle files (22 tests), 1/1 fingerprint file (11 tests); 55 templates; 314 classified products; semantic integrity clean | `task9-verify-data.log` |
| `npm run check:wingman-recommendation-scenarios` | PASS | 11 scenario-contract records inspected; 8/8 blind scenarios passed through the shared Recommendations boundary; 314 products loaded | `task9-recommendation-scenarios.log` |
| `npm run test:recommendation-scenarios` | PASS | 3/3 files, 96/96 tests | `task9-recommendation-tests.log` |
| `npm run typecheck` | PASS | Strict `tsconfig.typecheck.json`; no diagnostics | `task9-typecheck.log` |
| `npm run lint` | PASS with classified warnings | 0 errors, 35 warnings; orphan check reached all 170 modules | `task9-lint.log` |
| `npm run test` | PASS | 318/318 files, 2,426/2,426 tests, 0 skipped; jsdom emitted known non-fatal navigation diagnostics | `task9-test.log` |
| `npm run build` | PASS with reporting warnings | 2,645 modules transformed; two chunks above the non-strict 850 kB target and one ineffective dynamic-import warning | `task9-build.log` |
| `npm run test:e2e:windows-critical` | PASS | 24/24, retries disabled: 8 desktop + 8 tablet + 8 mobile critical workflows | `task9-windows-critical.log` |
| `npx playwright test e2e/offline-reconnect.spec.ts` | FAIL (invocation defect) | 16/16 connection-refused failures because the literal plan command starts no UI/API and expands the spec over all four configured projects | `task9-offline-reconnect.log` |
| `node tools/run-windows-critical-e2e.mjs --offline` | PASS | 4/4 Chromium tests, retries disabled; isolated UI/API ports and cleanup | `task9-offline-reconnect-isolated.log` |
| `npm run check:proposal-output-parity` | PASS (semantic/browser) | 7/7 DOCX unit tests; 1/1 Chromium flow; 11 markers and 3 SKU quantities agree | `task9-proposal-parity.log` |
| `npm run verify` | FAIL | `verify:fast` passed (2,426 tests); `verify:build` stopped at size budgets, so later data/contract/visual phases were not reached in this invocation | `task9-verify.log` |

### Browser/device matrix

| Project | Viewport | Touch/mobile | Workflows | Result |
| --- | --- | --- | --- | --- |
| `windows-critical-desktop` | 1280×800 | no / no | Dashboard, Discovery, Recommendations, Compare, Battle Cards, Templates, Proposal, Product Call Cards | 8/8 PASS |
| `windows-critical-tablet` | 768×1024 | yes / no | same eight workflows | 8/8 PASS |
| `windows-critical-mobile` | 390×844 | yes / yes | same eight workflows | 8/8 PASS |
| `chromium` offline suite | desktop 1280×800 plus tablet 768×1024; responsive mobile/tablet/desktop contexts | mixed | conflict-preserving reconnect and responsive UAT | 4/4 PASS via isolated runner |

### Warnings and classified residuals

- Technical-data confirmation aging: 90 unconfirmed profiles, with 3 beyond the 14-day warning threshold and 0 beyond the 30-day failure threshold (`APO-COM-MIC`, `APO-VX20-MNT`, `CAB-HAOC-20`).
- AVoIP governance: 27 competitor records require network-speed review; the governance gate still passed.
- Lint: 35 pre-existing/non-blocking warnings, 0 errors.
- Build reporting: `wm-competitor-registry` 854.43 kB and `wm-proposal-generation` 1,335.49 kB exceed the advisory 850 kB target; `visionAttachments.ts` has an ineffective dynamic import.
- Skips: none in the current full Vitest run or the recorded Playwright runs.
- Template source/display ratio warnings: 0 across all 55 templates.
- Connector semantics: clean across governed authority and published derivatives.

### Release blockers

1. The unchanged size-budget ratchet fails for `chunk:project-workflow`: measured 249.30 kB, allowed 248.15 kB after tolerance, 1.15 kB over.
2. The unchanged size-budget ratchet fails for `source:discovery-page`: measured 72.86 kB, allowed 72.72 kB after tolerance, 0.14 kB over.
3. DOCX visual sign-off cannot be completed: bundled `render_docx.py` reports that `soffice.exe` is not on PATH, and the workspace dependency inventory contains no bundled LibreOffice. No desktop-office workaround was used. The latest parity directory therefore contains semantic DOCX text but no DOCX page PNGs.
4. `node tools/e2e-proposal-docx-check.mjs` remains blocked by the strengthened technical-assurance requirements and does not complete a real-flow export.
5. The plan’s literal standalone offline Playwright invocation is not self-contained; the isolated runner passes, but the documented release command itself must be corrected or wrapped before a reproducible GO.

### Generated artifacts

- `docs/release-evidence/proposal-output-parity/latest/proposal-screen.html`
- `docs/release-evidence/proposal-output-parity/latest/proposal-screen.png`
- `docs/release-evidence/proposal-output-parity/latest/proposal.docx`
- `docs/release-evidence/proposal-output-parity/latest/proposal-docx.txt`
- `docs/release-evidence/proposal-output-parity/latest/proposal.pdf`
- `docs/release-evidence/proposal-output-parity/latest/proposal-pdf.txt`
- `docs/release-evidence/proposal-output-parity/latest/manifest.json`
- `playwright-report/windows-critical/index.html`
- `playwright-report/offline-reconnect/index.html`

No size/style baseline or ratchet was raised, and no commit was created.
