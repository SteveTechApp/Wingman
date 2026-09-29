# Focused Wingman workflows implementation plan

> For agentic workers: execute this plan task-by-task, reviewing each completed workflow before continuing.

**Goal:** Reduce text overload throughout Wingman and replace long mixed-purpose pages with focused, navigable screens.
**Architecture:** Shared headers display the title and useful actions; section help stays on demand. A reusable URL-backed workflow navigator renders one content group at a time, preserving query parameters, browser history and project state. Existing interview/wizard flows stay intact.
**Tech Stack:** React, TypeScript, React Router, existing Wingman CSS, Vitest and Playwright.
**Spec:** The customer's 28 September request: review all pages, remove non-essential copy, support AV newcomers, and use separate workflow pages rather than long vertical scrolling.

## Constraints
- Keep actionable quote blockers, errors, form labels, evidence and legal content available.
- Preserve saved projects, exports and all existing workflow actions.
- Reuse current branding; reduce repeated headings, generic guidance and duplicate navigation.
- Review every route in route-manifest.json and dynamic project/template/product routes; record the outcome.

## Tasks
- [ ] Simplify PageHero, SectionCard, AppShell summaries and FeatureJourneyStrip. Keep optional help accessible by keyboard.
- [ ] Add URL-backed workflow navigation with labelled current page, browser back/forward, previous/next and focus management. Test navigation and state retention.
- [ ] Restructure ProjectDetailPage: Overview is a result plus next action; Requirements, Products, Evidence, Conversations, History, Handoff and Audit have dedicated screens. Preserve the existing one-at-a-time blocker review and history deep links.
- [ ] Page long settings and visual-design/setup surfaces. Simplify already-staged Recommendations, Discovery, Ingest, Proposal and Compare without duplicating their controls.
- [ ] Audit catalogue, libraries, dashboards and remaining tools: concise entry copy, bounded lists where needed, detail on demand. Keep legal terms intact.
- [ ] Verify the complete route inventory in a browser, with representative saved projects and mobile widths. Record word counts/scroll depth and exceptions; run focused regression tests, typecheck, architecture, style and required commit checks.
- [ ] Commit and push the completed change; retain existing protected-branch checks.
