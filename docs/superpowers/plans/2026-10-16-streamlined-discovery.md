# Streamlined Discovery and Export Plan

**Goal:** Remove mandatory approval and repetitive confirmation steps, and collect essential room information together instead of a long interview.

**Architecture:** Keep recorded approval history for optional team review. Export eligibility follows actual technical and design blockers, independently of completion percentage, pricing completion and approval status. Preserve uncertain captured wording as notes. Add a compact essential capture surface using existing question visibility and answer update logic; retain detailed and voice tools.

**Validation:** Exercise export eligibility without approval, technical blockers, unstructured notes, compact capture editing and preservation of saved answers. Run focused tests, full typecheck/lint/test, build and existing workflow checks.

- [ ] Remove approval and confirmation gates from proposal exports and scoring.
- [ ] Make note-only discovery captures advisory rather than export blockers.
- [ ] Add a single-screen essential discovery form with optional detailed capture and no per-answer sign-off.
- [ ] Add regression tests, run checks and synchronize changed files while preserving concurrent edits.
- [ ] Publish and merge after GitHub checks pass.
