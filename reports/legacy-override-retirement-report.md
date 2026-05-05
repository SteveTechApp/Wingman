# Wingman Legacy Override Retirement Report

Generated: 2026-05-05T08:35:08.427Z

## Recommended retirement order

| Priority | Risk | Category | File | Lines | !important | Route | Shell | Main | Recommendation |
|---|---:|---|---|---:|---:|---:|---:|---:|---|
| high | 269 | density-duplicate | `src/wingman2/styles/legacy-overrides/019-balanced-compact-app-headers.css` | 217 | 119 | 0 | 0 | 1 | High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives. |
| high | 262 | density-duplicate | `src/wingman2/styles/legacy-overrides/015-declutter-guidance-popovers.css` | 265 | 120 | 0 | 0 | 0 | High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives. |
| high | 240 | density-duplicate | `src/wingman2/styles/legacy-overrides/006-wingman-compact-page-length.css` | 338 | 106 | 0 | 0 | 2 | High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives. |
| high | 178 | density-duplicate | `src/wingman2/styles/legacy-overrides/014-prominent-card-buttons.css` | 197 | 89 | 0 | 0 | 0 | High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives. |
| high | 100 | density-duplicate | `src/wingman2/styles/legacy-overrides/008-compact-sidebar-tooltips.css` | 89 | 47 | 0 | 0 | 0 | High-priority retirement candidate. Likely superseded by wingman-density-governance.css and shared layout primitives. |
| medium | 424 | finder-route | `src/wingman2/styles/legacy-overrides/021-product-finder-surface-hierarchy.css` | 157 | 41 | 41 | 25 | 0 | Retire only after FinderPage is migrated onto shared layout primitives. |
| medium | 54 | brand-logo | `src/wingman2/styles/legacy-overrides/002-logo-sizing-fix.css` | 57 | 23 | 0 | 0 | 0 | Candidate to retire after verifying logo size and sidebar branding are handled by wm-logo-scale, wm-brand-reset and authority CSS. |
| medium | 38 | brand-logo | `src/wingman2/styles/legacy-overrides/003-wingman-logo-svg-fix.css` | 39 | 15 | 0 | 0 | 0 | Candidate to retire after verifying logo size and sidebar branding are handled by wm-logo-scale, wm-brand-reset and authority CSS. |
| medium | 38 | brand-logo | `src/wingman2/styles/legacy-overrides/004-real-wingman-logo.css` | 39 | 15 | 0 | 0 | 0 | Candidate to retire after verifying logo size and sidebar branding are handled by wm-logo-scale, wm-brand-reset and authority CSS. |
| medium | 28 | brand-logo | `src/wingman2/styles/legacy-overrides/001-logo-reinstate.css` | 90 | 14 | 0 | 0 | 0 | Candidate to retire after verifying logo size and sidebar branding are handled by wm-logo-scale, wm-brand-reset and authority CSS. |
| high-risk-later | 593 | global-design-pass | `src/wingman2/styles/legacy-overrides/018-new-wingman-design-pass.css` | 626 | 265 | 0 | 3 | 2 | Do not delete in one go. Split or retire selectors in small groups after page migration. |
| high-risk-later | 488 | global-design-pass | `src/wingman2/styles/legacy-overrides/017-workflow-clarity-pass.css` | 447 | 223 | 0 | 0 | 0 | Do not delete in one go. Split or retire selectors in small groups after page migration. |
| low | 180 | compare-route | `src/wingman2/styles/legacy-overrides/010-compare-swot-engine.css` | 363 | 50 | 0 | 0 | 0 | Retire only after ComparePage is migrated onto shared layout primitives. |
| low | 116 | compare-route | `src/wingman2/styles/legacy-overrides/009-compare-accuracy-contrast-fix.css` | 95 | 30 | 0 | 0 | 0 | Retire only after ComparePage is migrated onto shared layout primitives. |
| low | 94 | discovery-route | `src/wingman2/styles/legacy-overrides/020-discovery-application-step-restore.css` | 115 | 47 | 0 | 0 | 0 | Retire only after DiscoveryPage and SourceDeviceCollator styling are reviewed. |
| low | 84 | compare-route | `src/wingman2/styles/legacy-overrides/011-compare-simplified-view.css` | 132 | 41 | 0 | 0 | 0 | Retire only after ComparePage is migrated onto shared layout primitives. |
| low | 46 | shell | `src/wingman2/styles/legacy-overrides/007-mobile-shade-desktop-fix.css` | 52 | 22 | 0 | 0 | 0 | Inspect manually before changing. |
| low | 8 | guru | `src/wingman2/styles/legacy-overrides/005-guru-chat-refresh.css` | 332 | 3 | 0 | 0 | 0 | Retire only after Guru drawer/FAB visual checks pass. |
| low | 2 | call-cards-route | `src/wingman2/styles/legacy-overrides/012-call-cards-starter-visuals.css` | 30 | 1 | 0 | 0 | 0 | Inspect manually before changing. |
| low | 0 | templates-route | `src/wingman2/styles/legacy-overrides/016-visual-templates-landing.css` | 270 | 0 | 0 | 0 | 0 | Retire only after TemplatesPage and TemplateReviewPage are migrated. |
| keep | 2 | safe-hide-rule | `src/wingman2/styles/legacy-overrides/013-hide-development-notes-ui.css` | 28 | 1 | 0 | 0 | 0 | Keep for now unless the hidden UI no longer exists. |

## Practical rule

Do not delete global design-pass files first. Retire density duplicates and route-specific files only after their pages have been migrated to shared layout primitives.

First candidates to test are usually:

- compact page length
- declutter guidance popovers
- prominent card buttons
- duplicated logo fixes