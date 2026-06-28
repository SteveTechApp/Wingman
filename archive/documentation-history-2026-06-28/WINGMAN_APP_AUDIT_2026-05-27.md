# Wingman App Audit - 2026-05-27

## Current Position

Wingman has been consolidated back into a single active app surface. The restored shell brings back the Wingman sidebar menu, secondary workflow navigation, topbar search/actions, and route-aware styling without relying on DOM patch installers or emergency CSS imports.

The active runtime now enters through `src/main.tsx`, mounts `src/wingman2/app/WingmanApp.tsx`, and uses `src/wingman2/styles/wingman-style-stack.css` as the authoritative style entry. Legacy archive trees, one-off restore scripts, ignored backups, and stale styling shims have been removed from the working app.

## Restored And Consolidated

- Restored the Wingman menu layout with primary tools, secondary workflow links, settings access, language profile controls, project actions, and the expert handoff card.
- Reconnected the production entrypoint to the canonical Wingman style stack instead of temporary patch imports.
- Kept route-specific styling through React route metadata and document route attributes.
- Restored Discovery live-call guidance markers, application-specific question strategy, current model summary, and full-model view.
- Preserved the live-call Call Cards, Discovery, Finder, Compare, Proposal, Sales Helper, Templates, Product Family, Product Pitch, and Video Wall routes.
- Removed legacy archive code and backup artifacts that were no longer part of the build or route graph.
- Cleared lint warnings in active app/server files after the consolidation pass.

## UI Structure Audit

- Navigation is back to a stable app shell: sidebar for workflow switching, topbar for workspace actions, content region for the active tool.
- App layout no longer depends on source-time DOM installer utilities for route flags, dashboard theming, or call-card overlays.
- The current shell keeps desktop density while retaining the mobile menu path.
- Discovery now has an explicit live-call question strategy so reps can ask the next useful question without exposing the whole model by default.
- The CSS is functional and centralized in `wingman-style-stack.css`, but it remains large and still contains historical patch blocks. The next structural cleanup should extract common shell, toolbar, model-panel, chip-group, and action-row components before further CSS deletion.

## Performance Audit

- Production build completed in about 1.4s with 1667 transformed modules.
- Main CSS bundle: `index` 99.64 kB, 18.07 kB gzip.
- Main app JS bundle: `index` 47.84 kB, 16.14 kB gzip.
- Largest lazy/browser chunks remain document-processing libraries:
  - `mammoth.browser` 491.70 kB, 118.82 kB gzip.
  - `pdf` 373.76 kB, 111.82 kB gzip.
  - `pdf.worker` 2.35 MB raw worker asset.
- Route chunks are acceptably split: Discovery 20.62 kB, Compare 54.12 kB, Finder 71.11 kB, Sales Helper 36.35 kB, Call Cards 29.18 kB.
- Recommendation: keep PDF/DOCX extraction behind lazy routes and avoid importing document extraction helpers into shared shell or dashboard code.

## Remaining Risks

1. Client-side persistence is still the main operational risk. Project state needs durable backend autosave, user identity, and recovery before heavier live usage.
2. CSS is centralized but not yet componentized. It is no longer broken, but it should be reduced into reusable component styles.
3. Product intelligence remains large and should keep a strict generated-artifact policy.
4. Proposal output still needs lifecycle, availability, dependency, and commercial review gates before quote-ready use.
5. Accessibility still needs a focused pass for keyboard flow, focus management, and drawer behaviour.

## Verification Run

- `npm run verify`
- `npm run lint`
- `npm run check:browser`

All checks passed. The browser smoke verified the built app pages and project detail route in a real browser.
