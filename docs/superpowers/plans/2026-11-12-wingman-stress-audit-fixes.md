# Wingman Stress Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Correct the Product Finder match evidence and project scoping defects, then restore the audit and typecheck gates that exposed stale assumptions or compile errors.

**Architecture:** Keep Product Finder function matches grounded in product-specific evidence, and separate transport evidence from numeric cable distance. Resolve every Recommendations Discovery read and correction against the active project; make resume/edit links carry that project ID. Update verification checks to inspect the current extraction and API implementations, and include Product Finder in the route inventory.

**Tech Stack:** TypeScript, React, Vite, Node.js verification scripts, JSON route audit.

**Spec:** Stress audit findings in the active Codex conversation; invariants in `AGENTS.md` and `docs/PURPOSE.md`.

## Global Constraints

- Edit in `.freebuff/worktrees/product-finder`, then copy changed files to `C:/Users/steve/wingman` and confirm byte equality.
- Project Finder requirements rank only when governed product records provide matching evidence; unsupported details remain checks.
- Recommendation Resolve routes to the governed Discovery question for the same project.
- Keep verification changes aligned with the implementations and route manifest rather than preserving obsolete markers.
- Do not alter product records or broaden fit claims to make checks pass.

---

### Task 1: Product Finder evidence matching

**Files:**
- Modify `src/wingman2/pages/productFinder/productFinderRanking.ts`
- Modify `src/wingman2/pages/productFinder/productFinderWorkflows.ts`

- [x] Remove generic USB, camera, conference, and USB-C terms from the USB/KVM function evidence; retain explicit KVM, switching, extension, and host/device transport phrases.
- [x] Remove HDBaseT from the medium-distance evidence terms. Numeric distance claims must be supported by a product-specific distance value.

### Task 2: Project-scoped Discovery handoffs and corrections

**Files:**
- Modify `src/wingman2/components/ProjectGalleryCard.tsx`
- Modify `src/wingman2/pages/RecommendationsPage.tsx`

- [x] Use `discoveryResumeUrl(project.id)` for the gallery resume action.
- [x] Derive the Recommendations snapshot from the latest snapshot only when it belongs to `activeProject.id`; otherwise reconstruct from that project's stored brief.
- [x] Use that scoped snapshot for answerable-check detection, drift/stranded checks, and cleanup writes; pass the same project ID to `discoveryQuestionUrl`.

### Task 3: Align verification gates with shipped implementations

**Files:**
- Modify `tools/workflow-integration-check.mjs`
- Modify `tools/wingman-stress-check.mjs`
- Modify `src/wingman2/content/feature-audit.json`

- [x] Assert the current PDF module path and the actual JSZip DOCX extraction path.
- [x] Exclude documentation and generated runtime snapshots from the incorrect-SKU data scan; check API credential inclusion at the shared CSRF/API boundary.
- [x] Add the `productFinder` manifest route to the feature audit with its user-facing purpose and remaining work.

### Task 4: Resolve compiler findings

**Files:**
- Modify the source or type fixture responsible for each current `npm run typecheck` error.

- [x] Run the full typecheck and fix every reported source and test type error without weakening compiler options.
- [x] Re-run `npm run check:routes`, `npm run check:workflow`, and `npm run check:stress:strict` to confirm the repaired gates.
- [x] Sync every changed file to the main checkout and verify the copies are byte-identical.
